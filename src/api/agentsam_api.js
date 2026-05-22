// src/api/agentsam_api.js
// Companions of CPAS — Agent Sam API with tool loop
import { callAI, thompsonRoute, recordOutcome, syncToIAM, classifyIntent, MODELS } from './resolveModel.js';
import { AGENT_TOOLS, executeTool, modelSupportsTools } from './agentsam_tools.js';

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
export async function agentsamRoutes(request, env, url, sessionUser = null) {
  const path = url.pathname;

  // GET /api/agentsam/bootstrap
  if (path === "/api/agentsam/bootstrap" && request.method === "GET") {
    const [commands, models] = await Promise.all([
      env.DB.prepare(`SELECT command_key, command_name, command_category, description, safety_level FROM agentsam_commands WHERE tenant_id='tenant_companionscpas' AND is_enabled=1 ORDER BY sort_order ASC LIMIT 50`).all().catch(() => ({ results: [] })),
      env.DB.prepare(`SELECT model_key, display_name, provider, tier, routing_lane, is_enabled FROM agentsam_model_catalog WHERE is_active=1 ORDER BY tier ASC`).all().catch(() => ({ results: [] })),
    ]);
    return json({ commands: commands.results||[], models: models.results||[] });
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

          // If selected model can't use tools but prompt needs real data, escalate
          const needsTools = /how many|list|count|table|database|show me|query|record|what.*in.*db|agentsam/i.test(prompt);
          if (needsTools && !modelSupportsTools(usedModel)) {
            // Pick best available tool-capable model
            const toolModel = env.OPENAI_API_KEY ? "openai/gpt-5.4-mini" : "@cf/moonshotai/kimi-k2.6";
            console.log(`[agentsam] escalating ${usedModel} → ${toolModel} for tool use`);
            usedModel    = toolModel;
            usedProvider = toolModel.startsWith("openai/") ? "openai" : "workers_ai";
            usedArm      = null; // cold escalation, no arm to update
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

                const toolResult = await executeTool(env, toolName, toolArgs);

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
