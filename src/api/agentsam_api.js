 // src/api/agentsam_api.js
import {
  callAI, thompsonRoute, recordOutcome, syncToIAM, classifyIntent, MODELS
} from './resolveModel.js';

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json", ...headers }
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
    env.DB.prepare(`
      SELECT name, status, species, breed, bio
      FROM animal_profiles
      WHERE tenant_id='tenant_companionscpas'
      ORDER BY updated_at DESC LIMIT 8
    `).all().catch(() => ({ results: [] })),
    env.DB.prepare(`
      SELECT first_name, last_name, email, review_status, submitted_at, internal_notes
      FROM cpas_foster_applications
      ORDER BY submitted_at DESC LIMIT 5
    `).all().catch(() => ({ results: [] })),
    env.DB.prepare(`
      SELECT f.foster_name, f.status, f.foster_type, a.name AS animal_name
      FROM foster_records f
      LEFT JOIN animal_profiles a ON a.id=f.animal_id
      ORDER BY f.created_at DESC LIMIT 5
    `).all().catch(() => ({ results: [] })),
  ]);
  return {
    animals:      animals.results  || [],
    applications: apps.results     || [],
    fosters:      fosters.results  || [],
  };
}

export async function agentsamRoutes(request, env, url, sessionUser = null) {
  const path = url.pathname;

  // ── GET /api/agentsam/bootstrap ───────────────────────────────────────────
  if (path === "/api/agentsam/bootstrap" && request.method === "GET") {
    const [commands, models] = await Promise.all([
      env.DB.prepare(`
        SELECT command_key, command_name, command_category, description, safety_level
        FROM agentsam_commands
        WHERE tenant_id='tenant_companionscpas' AND is_enabled=1
        ORDER BY sort_order ASC LIMIT 50
      `).all().catch(() => ({ results: [] })),
      env.DB.prepare(`
        SELECT model_key, display_name, provider, tier, routing_lane,
               supports_tools, supports_vision, is_active
        FROM agentsam_model_catalog
        WHERE is_active=1
        ORDER BY tier ASC
      `).all().catch(() => ({ results: [] })),
    ]);
    return json({ commands: commands.results || [], models: models.results || [] });
  }

  // ── POST /api/agentsam/chat ───────────────────────────────────────────────
  if (path === "/api/agentsam/chat" && request.method === "POST") {
    const body      = await readJson(request);
    const prompt    = String(body.prompt    || "").trim();
    const mode      = String(body.mode      || "ask");
    const routePath = String(body.route_path || "/dashboard");

    if (!prompt) return json({ error: "Prompt required" }, 400);

    const runId     = crypto.randomUUID();
    const sessionId = body.session_id || crypto.randomUUID();
    const agentRunId = "ar_" + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    const started   = Date.now();

    const stream = new ReadableStream({
      async start(controller) {
        const enc  = new TextEncoder();
        const send = (payload, event = "message") =>
          controller.enqueue(enc.encode(sse(payload, event)));

        let usedArm     = null;
        let usedModel   = null;
        let usedProvider = null;
        let answer      = "";
        let success     = false;

        try {
          send({ run_id: runId, status: "started", mode }, "status");
          send({ title: "Reading context", status: "running" }, "step");

          const userId = sessionUser?.id || sessionUser?.user_id || null;

          // Persist session
          await env.DB.prepare(`
            INSERT OR IGNORE INTO agentsam_sessions
              (id, tenant_id, user_id, route_path, mode, updated_at)
            VALUES (?, 'tenant_companionscpas', ?, ?, ?, datetime('now'))
          `).bind(sessionId, userId, routePath, mode).run().catch(() => {});

          // Persist user message
          await env.DB.prepare(`
            INSERT INTO agentsam_messages
              (id, session_id, tenant_id, role, content)
            VALUES (?, ?, 'tenant_companionscpas', 'user', ?)
          `).bind(crypto.randomUUID(), sessionId, prompt).run().catch(() => {});

          // Create agent_run record
          await env.DB.prepare(`
            INSERT INTO agentsam_agent_run
              (id, tenant_id, user_id, session_id, status, mode, task_type, started_at)
            VALUES (?, 'tenant_companionscpas', ?, ?, 'running', ?, ?, datetime('now'))
          `).bind(agentRunId, userId, sessionId, mode,
            classifyIntent(prompt, routePath)
          ).run().catch(() => {});

          // ── Thompson routing (no hardcoded fallbacks) ─────────────────────
          const taskType = classifyIntent(prompt, routePath);
          send({ title: `Routing (${taskType}/${mode})`, status: "running" }, "step");

          // Primary arm via Thompson sampling
          const arm = await thompsonRoute(env, taskType, mode);
          usedArm      = arm.armId;
          usedModel    = arm.modelKey;
          usedProvider = arm.provider;

          send({ title: `Selected ${usedModel}`, status: "running" }, "step");

          const context = await getRecentContext(env);
          const system  = `You are Agent Sam for Companions of CPAS — a community animal support nonprofit. Be practical, concise, and professional. Help with foster applications, animal management, fundraising, CMS copy, and operations. Never claim you completed external actions unless a tool actually did it.`;

          // ── Call primary arm ──────────────────────────────────────────────
          let callStart = Date.now();
          try {
            const result = await callAI(env, {
              model: usedModel,
              system,
              messages: [{
                role: "user",
                content: `Dashboard context:\n${JSON.stringify(context, null, 2)}\n\nRequest:\n${prompt}`
              }],
              maxTokens: 1024,
            });
            answer    = result.text;
            success   = true;

            // Record success on primary arm
            await recordOutcome(env, {
              armId: usedArm, agentRunId, modelKey: usedModel, provider: usedProvider,
              taskType, mode,
              latencyMs:    Date.now() - callStart,
              inputTokens:  0, outputTokens: 0, costUsd: 0,
              success:      true,
              rewardReason: "primary_ok",
            });

          } catch (primaryErr) {
            // Record failure on primary arm
            await recordOutcome(env, {
              armId: usedArm, agentRunId, modelKey: usedModel, provider: usedProvider,
              taskType, mode,
              latencyMs: Date.now() - callStart,
              inputTokens: 0, outputTokens: 0, costUsd: 0,
              success: false,
              rewardReason: `primary_fail: ${primaryErr.message}`,
            });

            // Log escalation
            await env.DB.prepare(`
              INSERT INTO agentsam_escalation
                (run_group_id, agent_run_id, chain_index, model_attempted, succeeded, error_message)
              VALUES (?, ?, 0, ?, 0, ?)
            `).bind(runId, agentRunId, usedModel, String(primaryErr.message)).run().catch(() => {});

            // ── Escalate: sample a DIFFERENT arm ─────────────────────────
            send({ title: `Escalating from ${usedModel}`, status: "running" }, "step");

            const fallbackArm = await thompsonRoute(env, taskType, mode);
            // If same arm selected again, force next tier up
            const fallbackModel = (fallbackArm.modelKey === usedModel)
              ? (usedModel === MODELS.nano ? MODELS.mini : MODELS.premium)
              : fallbackArm.modelKey;

            callStart = Date.now();
            try {
              const fallback = await callAI(env, {
                model: fallbackModel,
                system,
                messages: [{
                  role: "user",
                  content: `Context:\n${JSON.stringify(context).slice(0, 4000)}\n\nRequest:\n${prompt}`
                }],
                maxTokens: 512,
              });
              answer       = fallback.text;
              usedModel    = fallback.model;
              usedProvider = fallback.provider;
              usedArm      = fallbackArm.armId;
              success      = true;

              await recordOutcome(env, {
                armId: fallbackArm.armId, agentRunId,
                modelKey: usedModel, provider: usedProvider,
                taskType, mode,
                latencyMs: Date.now() - callStart,
                inputTokens: 0, outputTokens: 0, costUsd: 0,
                success: true,
                rewardReason: "escalation_ok",
              });

              await env.DB.prepare(`
                INSERT INTO agentsam_escalation
                  (run_group_id, agent_run_id, chain_index, model_attempted, succeeded)
                VALUES (?, ?, 1, ?, 1)
              `).bind(runId, agentRunId, usedModel).run().catch(() => {});

            } catch (escalateErr) {
              // Both arms failed — surface the error
              throw new Error(`Both arms failed. Last: ${escalateErr.message}`);
            }
          }

          send({ title: "Writing response", status: "running" }, "step");

          // Persist assistant message
          await env.DB.prepare(`
            INSERT INTO agentsam_messages
              (id, session_id, tenant_id, role, content, metadata_json)
            VALUES (?, ?, 'tenant_companionscpas', 'assistant', ?, ?)
          `).bind(
            crypto.randomUUID(), sessionId, answer,
            JSON.stringify({ provider: usedProvider, model_key: usedModel, run_id: runId })
          ).run().catch(() => {});

          // Update agent_run to completed
          await env.DB.prepare(`
            UPDATE agentsam_agent_run
            SET status='completed', model_key=?, latency_ms=?, completed_at=datetime('now')
            WHERE id=?
          `).bind(usedModel, Date.now() - started, agentRunId).run().catch(() => {});

          // Usage event
          await env.DB.prepare(`
            INSERT INTO agentsam_usage_events
              (tenant_id, workspace_id, user_id, session_id, agent_run_id,
               provider, model_key, task_type, mode, status, succeeded,
               latency_ms, event_type)
            VALUES ('tenant_companionscpas','ws_companionscpas',?,?,?, ?,?,?,?,'ok',1, ?,'chat')
          `).bind(
            sessionUser?.id || null, sessionId, agentRunId,
            usedProvider, usedModel,
            classifyIntent(prompt, routePath), mode,
            Date.now() - started
          ).run().catch(() => {});

          // Async IAM sync — fire and forget
          env.AGENTSAM_BRIDGE_KEY && syncToIAM(env).catch(() => {});

          send({ content: answer, provider: usedProvider, model_key: usedModel, session_id: sessionId }, "answer");
          send({ run_id: runId, status: "completed" }, "done");

        } catch (err) {
          await env.DB.prepare(`
            UPDATE agentsam_agent_run
            SET status='failed', error_message=?, completed_at=datetime('now')
            WHERE id=?
          `).bind(String(err.message || err), agentRunId).run().catch(() => {});

          send({ error: String(err.message || err) }, "error");
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type":  "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection":    "keep-alive",
      }
    });
  }

  return null;
}
