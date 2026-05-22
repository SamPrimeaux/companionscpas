// src/api/agentsam_api.js
// Companions of CPAS — Agent Sam API with tool loop
import { callAI, thompsonRoute, recordOutcome, syncToIAM, classifyIntent, MODELS } from './resolveModel.js';
import { AGENT_TOOLS, executeTool, modelSupportsTools, writeToolChain, resolveToolChain } from './agentsam_tools.js';

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status, headers: { "Content-Type": "application/json", ...headers }
  });
}

function sse(data, event = "message") {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

async function readJson(request) {
  try { return await request.json(); } catch { return {}; }
}

async function getRecentContext(env) {
  const [animals, apps, fosters] = await Promise.all([
    env.DB.prepare(`SELECT name, status, species, breed FROM animal_profiles WHERE tenant_id='tenant_companionscpas' ORDER BY updated_at DESC LIMIT 6`).all().catch(() => ({ results: [] })),
    env.DB.prepare(`SELECT first_name, last_name, review_status, submitted_at FROM cpas_foster_applications ORDER BY submitted_at DESC LIMIT 4`).all().catch(() => ({ results: [] })),
    env.DB.prepare(`SELECT f.foster_name, f.status, a.name AS animal_name FROM foster_records f LEFT JOIN animal_profiles a ON a.id=f.animal_id ORDER BY f.created_at DESC LIMIT 4`).all().catch(() => ({ results: [] })),
  ]);
  return { animals: animals.results||[], applications: apps.results||[], fosters: fosters.results||[] };
}

// ── Main route handler ────────────────────────────────────────────────────────

// ── Agent Sam KV helpers ───────────────────────────────────────
async function kvGetJson(env, key) {
  if (!env.CMS_CACHE) return null;
  try { return await env.CMS_CACHE.get(key, { type: "json" }); }
  catch { return null; }
}

async function kvPutJson(env, key, value, ttl = 60) {
  if (!env.CMS_CACHE) return;
  try {
    await env.CMS_CACHE.put(key, JSON.stringify(value), { expirationTtl: ttl });
  } catch {}
}

export async function agentsamRoutes(request, env, url, sessionUser = null) {
  const path = url.pathname;

  // GET /api/agentsam/bootstrap
  if (path === "/api/agentsam/bootstrap" && request.method === "GET") {
    const cacheKey = "agentsam:bootstrap:tenant_companionscpas:v1";
    const cached = await kvGetJson(env, cacheKey);
    if (cached) return json({ ...cached, cached: true });

    const [commands, models] = await Promise.all([
      env.DB.prepare(`SELECT command_key, command_name, command_category, description, safety_level FROM agentsam_commands WHERE tenant_id='tenant_companionscpas' AND is_enabled=1 ORDER BY sort_order ASC LIMIT 50`).all().catch(() => ({ results: [] })),
      env.DB.prepare(`SELECT model_key, display_name, provider, tier, routing_lane, is_enabled FROM agentsam_model_catalog WHERE is_active=1 ORDER BY tier ASC`).all().catch(() => ({ results: [] })),
    ]);

    const payload = {
      commands: commands.results || [],
      models: models.results || [],
      cached: false,
      cache_ttl_seconds: 60,
    };

    await kvPutJson(env, cacheKey, payload, 60);
    return json(payload);
  }

  // POST /api/agentsam/tool/approve — execute an approved write action
  if (path === "/api/agentsam/tool/approve" && request.method === "POST") {
    const body = await readJson(request);
    const { action_type, sql, section_id, field, proposed_value } = body;

    if (action_type === "db_write" && sql) {
      // Final hard check before executing
      const blocked = [/DROP/i, /TRUNCATE/i, /ALTER/i, /DELETE.*users/i];
      if (blocked.some(r => r.test(sql))) {
        return json({ error: "Blocked for safety." }, 403);
      }
      await env.DB.prepare(sql).run();
      return json({ success: true, message: "Done — database updated." });
    }

    if (action_type === "cms_edit" && section_id && field && proposed_value !== undefined) {
      // Read current content_json, patch the field, save draft
      const section = await env.DB.prepare(
        `SELECT content_json FROM cms_page_sections WHERE id=? LIMIT 1`
      ).bind(section_id).first().catch(() => null);

      let content = {};
      try { content = JSON.parse(section?.content_json || "{}"); } catch {}
      content[field] = proposed_value;

      await env.DB.prepare(
        `UPDATE cms_page_sections SET content_json=?, updated_at=datetime('now') WHERE id=?`
      ).bind(JSON.stringify(content), section_id).run();

      // Write revision
      await env.DB.prepare(
        `INSERT INTO cms_revisions (id, entity_type, entity_id, field_name, before_value, after_value, changed_by, created_at)
         VALUES (?,  'section', ?, ?, ?, ?, ?, datetime('now'))`
      ).bind(
        "rev_" + crypto.randomUUID().replace(/-/g,"").slice(0,16),
        section_id, field,
        section?.content_json || "{}",
        JSON.stringify(content),
        sessionUser?.id || "agentsam"
      ).run().catch(() => {});

      return json({ success: true, message: `Updated ${field} — saved as draft.` });
    }

    return json({ error: "Unknown action type." }, 400);
  }

  // POST /api/agentsam/chat — main SSE stream with tool loop
  if (path === "/api/agentsam/chat" && request.method === "POST") {
    const body      = await readJson(request);
    const prompt    = String(body.prompt || "").trim();
    const mode      = String(body.mode   || "auto");
    const routePath = String(body.route_path || "/dashboard");

    if (!prompt) return json({ error: "Prompt required" }, 400);

    const runId      = crypto.randomUUID();
    const sessionId  = body.session_id || crypto.randomUUID();
    const agentRunId = "ar_" + crypto.randomUUID().replace(/-/g,"").slice(0,16);
    const started    = Date.now();

    const stream = new ReadableStream({
      async start(controller) {
        const enc  = new TextEncoder();
        const send = (payload, event = "message") =>
          controller.enqueue(enc.encode(sse(payload, event)));

        let usedArm      = null;
        let usedModel    = null;
        let usedProvider = null;
        let answer       = "";
        let success      = false;
        let inputTokens  = 0;
        let outputTokens = 0;
        let callCostUsd  = 0;
        const pendingActions = [];

        try {
          send({ run_id: runId, status: "started", mode }, "status");
          send({ title: "Reading context", status: "running" }, "step");

          const userId = sessionUser?.id || sessionUser?.user_id || null;

          await env.DB.prepare(
            `INSERT OR IGNORE INTO agentsam_sessions (id, tenant_id, user_id, route_path, mode, updated_at) VALUES (?, 'tenant_companionscpas', ?, ?, ?, datetime('now'))`
          ).bind(sessionId, userId, routePath, mode).run().catch(() => {});

          await env.DB.prepare(
            `INSERT INTO agentsam_messages (id, session_id, tenant_id, role, content) VALUES (?, ?, 'tenant_companionscpas', 'user', ?)`
          ).bind(crypto.randomUUID(), sessionId, prompt).run().catch(() => {});

          await env.DB.prepare(
            `INSERT INTO agentsam_agent_run (id, tenant_id, user_id, session_id, status, mode, task_type, started_at) VALUES (?, 'tenant_companionscpas', ?, ?, 'running', ?, ?, datetime('now'))`
          ).bind(agentRunId, userId, sessionId, mode, classifyIntent(prompt, routePath)).run().catch(() => {});

          const taskType = classifyIntent(prompt, routePath);
          send({ title: `Routing (${taskType}/${mode})`, status: "running" }, "step");

          const arm    = await thompsonRoute(env, taskType, mode);
          usedArm      = arm.armId;
          usedModel    = arm.modelKey;
          usedProvider = arm.provider;

          // DB-driven intent rules — check agentsam_intent_rules for this prompt
          const intentRules = await env.DB.prepare(`
            SELECT required_tools, optional_tools, min_model_tier, force_tool_model
            FROM agentsam_intent_rules
            WHERE tenant_id='tenant_companionscpas'
              AND is_active=1
              AND ? REGEXP intent_pattern
            ORDER BY priority ASC LIMIT 1
          `).bind(prompt).first().catch(() => null);

          // Fallback: simple regex if REGEXP not supported
          const intentRulesFallback = !intentRules
            ? await (async () => {
                const rules = await env.DB.prepare(`
                  SELECT required_tools, optional_tools, min_model_tier, force_tool_model, intent_pattern
                  FROM agentsam_intent_rules
                  WHERE tenant_id='tenant_companionscpas' AND is_active=1
                  ORDER BY priority ASC
                `).all().catch(() => ({ results: [] }));
                const p = prompt.toLowerCase();
                return (rules.results||[]).find(r => {
                  try { return new RegExp(r.intent_pattern, 'i').test(p); } catch { return false; }
                }) || null;
              })()
            : null;

          const activeRule = intentRules || intentRulesFallback;

          // DB-driven model policy
          const modelPolicy = await env.DB.prepare(`
            SELECT min_tier, force_tool_capable, max_cost_per_call
            FROM agentsam_model_policy
            WHERE tenant_id='tenant_companionscpas'
              AND task_type=?
              AND (mode=? OR mode='any')
              AND is_active=1
            ORDER BY mode DESC LIMIT 1
          `).bind(taskType, mode).first().catch(() => null);

          const forceTools = activeRule?.force_tool_model || modelPolicy?.force_tool_capable || false;

          if (forceTools && !modelSupportsTools(usedModel)) {
            // Pick best tool-capable arm from DB — no hardcoded model strings
            const toolArms = await env.DB.prepare(`
              SELECT model_key, provider, id
              FROM agentsam_routing_arms
              WHERE workspace_id='ws_companionscpas'
                AND task_type=?
                AND is_eligible=1 AND is_paused=0 AND budget_exhausted=0
              ORDER BY (success_alpha / (success_alpha + success_beta)) DESC
              LIMIT 5
            `).bind(taskType).all().catch(() => ({ results: [] }));

            const toolArm = (toolArms.results || []).find(a => modelSupportsTools(a.model_key));
            const toolModel = toolArm?.model_key
              || (env.OPENAI_API_KEY ? "openai/gpt-5.4-nano" : "@cf/moonshotai/kimi-k2.6");

            console.log(`[agentsam] policy escalation: ${usedModel} → ${toolModel} (rule: ${activeRule?.intent_pattern||'model_policy'})`);
            usedModel    = toolModel;
            usedProvider = toolModel.startsWith("openai/") ? "openai"
                         : toolModel.startsWith("@cf/")   ? "workers_ai"
                         : toolModel.split("/")[0];
            usedArm      = toolArm?.id || null;
          }

          send({ title: `Selected model`, status: "running" }, "step");

          const context = await getRecentContext(env);
          const canUseTools = modelSupportsTools(usedModel);

          const system = `You are Agent Sam, the AI assistant for Companions of CPAS — a nonprofit animal rescue organization.

You have live access to their database, website, and records. When a question requires real data, retrieve it directly — never guess or estimate.

CRITICAL RULES:
- NEVER mention tool names, function names, or technical implementation in your responses. Users see only clean natural language.
- NEVER say things like "I'll use list_tables" or "calling query_database" — just do it silently and report results.
- Always retrieve real data when asked about counts, records, animals, applications, donations, volunteers, or website content.
- Be concise and warm. This is a small nonprofit team — friendly, practical, no jargon.
- For proposed changes, describe what will change in plain English. Never show SQL to users.
- If something fails silently, give a helpful response from context rather than exposing errors.`;

          // ── Tool-capable model: multi-turn tool loop ──────────────────────
          const callStart = Date.now();
          if (canUseTools) {
            const messages = [
              {
                role: "user",
                content: `Dashboard snapshot:\n${JSON.stringify(context)}\n\nRequest: ${prompt}`
              }
            ];

            let loopCount = 0;
            const MAX_LOOPS = 5;

            while (loopCount < MAX_LOOPS) {
              loopCount++;

              const result = await callAI(env, {
                model:     usedModel,
                system,
                messages,
                maxTokens: 1024,
                tools:     AGENT_TOOLS,
              });

              inputTokens  += result.inputTokens  || 0;
              outputTokens += result.outputTokens || 0;

              // Check for tool calls
              const toolCalls = result.toolCalls || [];

              if (toolCalls.length === 0) {
                // No tool calls — final answer
                answer  = result.text;
                success = true;
                break;
              }

              // Execute each tool call
              for (const tc of toolCalls) {
                const toolName = tc.function?.name || tc.name;
                const toolArgs = typeof tc.function?.arguments === "string"
                  ? JSON.parse(tc.function.arguments)
                  : (tc.function?.arguments || tc.arguments || {});

                send({ title: `Using tool: ${toolName}`, status: "running" }, "step");

                const _chainStart = Date.now();
                const chainId = await writeToolChain(env, {
                  agentRunId, sessionId,
                  chainIndex: loopCount,
                  toolKey: toolName,
                  inputArgs: toolArgs,
                });

                const toolResult = await executeTool(env, toolName, toolArgs);

                await resolveToolChain(env, {
                  chainId, agentRunId, toolKey: toolName,
                  outputJson: toolResult,
                  status: toolResult.success ? "completed" : "failed",
                  latencyMs: Date.now() - _chainStart,
                  errorMsg: toolResult.error || null,
                });

                // Approval-required actions go to frontend as action events
                if (toolResult.approval_required) {
                  pendingActions.push(toolResult);
                  send(toolResult, "action");
                  // Add placeholder to conversation
                  messages.push({
                    role: "tool",
                    tool_call_id: tc.id || toolName,
                    content: JSON.stringify({ pending_approval: true, action_type: toolResult.action_type })
                  });
                } else {
                  // Feed result back into conversation
                  messages.push({
                    role: "assistant",
                    content: null,
                    tool_calls: [tc]
                  });
                  messages.push({
                    role: "tool",
                    tool_call_id: tc.id || toolName,
                    content: JSON.stringify(toolResult)
                  });
                }
              }

              // If only pending actions, break and let user approve
              if (toolCalls.every(tc => {
                const n = tc.function?.name || tc.name;
                return n === "write_database" || n === "update_cms_section";
              })) {
                answer  = "I've prepared the changes above for your review. Tap Accept to apply or Reject to cancel.";
                success = true;
                break;
              }
            }

          } else {
            // ── Non-tool model: plain generation ────────────────────────────
            const result = await callAI(env, {
              model: usedModel,
              system,
              messages: [{
                role: "user",
                content: `Dashboard context:\n${JSON.stringify(context, null, 2)}\n\nRequest:\n${prompt}`
              }],
              maxTokens: 1024,
            });
            answer       = result.text;
            inputTokens  = result.inputTokens  || 0;
            outputTokens = result.outputTokens || 0;
            success      = true;
          }

          // Compute cost
          const _cat = await env.DB.prepare(
            `SELECT cost_per_1k_in, cost_per_1k_out FROM agentsam_model_catalog WHERE model_key=? LIMIT 1`
          ).bind(usedModel).first().catch(() => null);
          if (_cat) {
            callCostUsd = (inputTokens  / 1000 * (_cat.cost_per_1k_in  || 0))
                        + (outputTokens / 1000 * (_cat.cost_per_1k_out || 0));
          }

          // Thompson reward
          const _latMs     = Date.now() - callStart;
          const _latBonus  = _latMs < 3000 ? 0.2 : _latMs < 6000 ? 0.1 : 0;
          const _costBonus = callCostUsd < 0.001 ? 0.1 : 0;
          const _reward    = Math.min(1.5, 1.0 + _latBonus + _costBonus);

          await recordOutcome(env, {
            armId: usedArm, agentRunId, modelKey: usedModel, provider: usedProvider,
            taskType, mode,
            latencyMs: _latMs, inputTokens, outputTokens, costUsd: callCostUsd,
            success: true,
            qualityScore: _reward,
            rewardReason: `ok|lat:${_latMs}ms|cost:$${callCostUsd.toFixed(6)}|tools:${pendingActions.length}`,
          });

          answer = String(answer || "").trim();
          if (!answer) {
            answer = "I ran the Agent Sam tool/model loop, but the selected model returned an empty final message. The run, tool steps, routing arm, and usage event were still recorded, so this is an SSE/model-output parsing issue rather than a total failure.";
          }

          send({ title: "Writing response", status: "running" }, "step");

          // Persist assistant message
          await env.DB.prepare(
            `INSERT INTO agentsam_messages (id, session_id, tenant_id, role, content, metadata_json) VALUES (?, ?, 'tenant_companionscpas', 'assistant', ?, ?)`
          ).bind(
            crypto.randomUUID(), sessionId, answer,
            JSON.stringify({ provider: usedProvider, model_key: usedModel, run_id: runId, cost_usd: callCostUsd })
          ).run().catch(() => {});

          // Update agent_run
          await env.DB.prepare(
            `UPDATE agentsam_agent_run SET status='completed', model_key=?, latency_ms=?, input_tokens=?, output_tokens=?, cost_usd=? WHERE id=?`
          ).bind(usedModel, Date.now() - started, inputTokens, outputTokens, callCostUsd, agentRunId).run().catch(() => {});

          // Usage event
          await env.DB.prepare(
            `INSERT INTO agentsam_usage_events (tenant_id, workspace_id, user_id, session_id, agent_run_id, provider, model_key, task_type, mode, status, succeeded, latency_ms, tokens_in, tokens_out, total_tokens, cost_usd, event_type)
             VALUES ('tenant_companionscpas','ws_companionscpas',?,?,?, ?,?,?,?,'ok',1,?, ?,?,?,?,'chat')`
          ).bind(
            userId, sessionId, agentRunId,
            usedProvider, usedModel,
            classifyIntent(prompt, routePath), mode,
            Date.now() - started,
            inputTokens, outputTokens, inputTokens + outputTokens, callCostUsd
          ).run().catch(() => {});

          // Analytics record — mirrors agent_run with provider/token/cost detail
          await env.DB.prepare(`
            INSERT INTO agentsam_analytics
              (id, tenant_id, user_id, session_id, provider, model_key,
               runtime_location, mode, status,
               prompt_tokens, completion_tokens, total_tokens,
               input_tokens, output_tokens,
               estimated_cost_usd, latency_ms,
               input_chars, output_chars,
               raw_usage_json, started_at, completed_at)
            VALUES
              (?, 'tenant_companionscpas', ?, ?, ?, ?,
               'cloudflare', ?, 'completed',
               ?, ?, ?,
               ?, ?,
               ?, ?,
               ?, ?,
               ?, datetime('now'), datetime('now'))
          `).bind(
            crypto.randomUUID(),
            userId,
            sessionId,
            usedProvider,
            usedModel,
            mode,
            inputTokens, outputTokens, inputTokens + outputTokens,
            inputTokens, outputTokens,
            callCostUsd,
            Date.now() - started,
            (prompt  || "").length,
            (answer  || "").length,
            JSON.stringify({ prompt_tokens: inputTokens, completion_tokens: outputTokens })
          ).run().catch(e => console.warn("[analytics] INSERT failed:", e.message));

          // Write granular reward event
          await env.DB.prepare(`
            INSERT INTO agentsam_reward_events
              (agent_run_id, routing_arm_id, signal_type, signal_value, alpha_delta, beta_delta, reason, metadata_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            agentRunId,
            usedArm || null,
            success ? "success" : "failure",
            success ? _reward : 0,
            success ? _reward : 0,
            success ? 0 : 1,
            `lat:${_latMs}ms|cost:$${callCostUsd.toFixed(6)}|tools:${pendingActions.length}`,
            JSON.stringify({ model: usedModel, taskType, mode, inputTokens, outputTokens })
          ).run().catch(() => {});

          env.AGENTSAM_BRIDGE_KEY && syncToIAM(env).catch(() => {});

          send({ content: answer, provider: usedProvider, model_key: usedModel, session_id: sessionId, cost_usd: callCostUsd }, "answer");
          send({ run_id: runId, status: "completed" }, "done");

        } catch (err) {
          await env.DB.prepare(
            `UPDATE agentsam_agent_run SET status='failed', error_message=?, completed_at=datetime('now') WHERE id=?`
          ).bind(String(err.message || err), agentRunId).run().catch(() => {});
          send({ error: String(err.message || err) }, "error");
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" }
    });
  }

  return null;
}
