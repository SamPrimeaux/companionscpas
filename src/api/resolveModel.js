// src/api/resolveModel.js
// ─────────────────────────────────────────────────────────────────────────────
// Universal AI resolver + Thompson sampling router for AGENTSAM_WAI.
// ALL AI calls go through callAI(). No direct env.AGENTSAM_WAI.run() anywhere.
// No hardcoded fallbacks — escalation is driven by agentsam_routing_arms α/β.
// ─────────────────────────────────────────────────────────────────────────────

// ── Model alias map (short name → AGENTSAM_WAI model string) ─────────────────
export const MODELS = {
  // Native Cloudflare Workers AI — all route through AGENTSAM_WAI binding
  flash:     "@cf/meta/llama-4-scout-17b-16e-instruct",  // fast, low cost
  nano:      "@cf/meta/llama-4-scout-17b-16e-instruct",  // same tier
  mini:      "@cf/google/gemma-4-26b-a4b-it",            // mid-tier
  kimi:      "@cf/moonshotai/kimi-k2.6",                 // long context, tool calling
  pro:       "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b", // reasoning
  premium:   "@cf/moonshotai/kimi-k2.6",                 // best available via WAI
  coder:     "@cf/qwen/qwen2.5-coder-32b-instruct",      // code tasks
  image:     "@cf/black-forest-labs/flux-1-schnell",     // image gen
};

// Board-facing CMS copy must never go below mini

const WORKSPACE = "ws_companionscpas";

// ── Thompson sampling ─────────────────────────────────────────────────────────
// Beta(α, β) sampled via Normal approximation (Box-Muller).
// Works well when α+β > 5; for cold arms (α=β=1) adds healthy exploration.
function betaSample(alpha, beta) {
  const n    = alpha + beta;
  const mean = alpha / n;
  const variance = (alpha * beta) / (n * n * (n + 1));
  const std  = Math.sqrt(variance);
  // Box-Muller transform → standard normal
  const u1 = Math.max(1e-10, Math.random());
  const u2 = Math.random();
  const z  = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return Math.max(0.001, Math.min(0.999, mean + std * z));
}

// ── Load eligible arms from DB ────────────────────────────────────────────────
async function loadArms(env, taskType, mode) {
  const rows = await env.DB.prepare(`
    SELECT id, model_key, provider, success_alpha, success_beta,
           priority, fallback_model_key, budget_exhausted
    FROM agentsam_routing_arms
    WHERE workspace_id = ?
      AND task_type    = ?
      AND mode         = ?
      AND is_eligible  = 1
      AND is_paused    = 0
      AND budget_exhausted = 0
    ORDER BY priority ASC
    LIMIT 8
  `).bind(WORKSPACE, taskType, mode).all().catch(() => ({ results: [] }));
  return rows.results || [];
}

// ── Thompson route: pick best arm for (taskType, mode) ───────────────────────
// Returns { armId, modelKey, provider, score }
// Falls back to static tier map if no arms seeded yet.
export async function thompsonRoute(env, taskType, mode) {
  const arms = await loadArms(env, taskType, mode);

  if (arms.length === 0) {
    // Cold start — no arms seeded yet, use static tier map
    return staticFallback(taskType, mode);
  }

  let best = null;
  let bestScore = -1;

  for (const arm of arms) {
    const score = betaSample(arm.success_alpha, arm.success_beta);
    if (score > bestScore) {
      bestScore = score;
      best = arm;
    }
  }

  return {
    armId:    best.id,
    modelKey: best.model_key,
    provider: best.provider,
    score:    bestScore,
  };
}

// ── Static fallback tier map (no DB required) ─────────────────────────────────
function staticFallback(taskType, mode) {
  if (taskType === "cms")   return { armId: null, modelKey: MODELS.mini,    provider: "openai",  score: 0 };
  if (mode === "debug")     return { armId: null, modelKey: MODELS.premium, provider: "openai",  score: 0 };
  if (mode === "agent")     return { armId: null, modelKey: MODELS.mini,    provider: "openai",  score: 0 };
  if (mode === "plan")      return { armId: null, modelKey: MODELS.mini,    provider: "openai",  score: 0 };
  return                           { armId: null, modelKey: MODELS.nano,    provider: "openai",  score: 0 };
}

// ── Update α/β after a call ───────────────────────────────────────────────────
// success=true → α += alphaDelta, success=false → β += betaDelta
export async function recordOutcome(env, {
  armId, agentRunId, modelKey, provider, taskType, mode,
  latencyMs, inputTokens, outputTokens, costUsd,
  success, qualityScore = null, rewardReason = "",
}) {
  if (!armId) return; // cold-start call, nothing to update

  // Compute reward signal
  const latencyOk = latencyMs < 4000;
  const baseReward = success ? 1.0 : 0.0;
  const latencyBonus = (success && latencyOk) ? 0.2 : 0;
  const qualityBonus = qualityScore != null ? qualityScore * 0.3 : 0;
  const rewardScore = Math.min(1.0, baseReward + latencyBonus + qualityBonus);

  const alphaDelta = success ? rewardScore : 0;
  const betaDelta  = success ? 0 : 1.0;

  // Update routing arm α/β in-place
  await env.DB.prepare(`
    UPDATE agentsam_routing_arms
    SET success_alpha    = success_alpha + ?,
        success_beta     = success_beta  + ?,
        latency_n        = latency_n + 1,
        latency_mean     = CASE WHEN latency_n = 0 THEN ?
                           ELSE latency_mean + (? - latency_mean) / (latency_n + 1) END,
        cost_n           = cost_n + 1,
        cost_mean        = CASE WHEN cost_n = 0 THEN ?
                           ELSE cost_mean + (? - cost_mean) / (cost_n + 1) END,
        total_executions = total_executions + 1,
        updated_at       = unixepoch()
    WHERE id = ?
  `).bind(
    alphaDelta, betaDelta,
    latencyMs, latencyMs,
    costUsd, costUsd,
    armId
  ).run().catch(() => {});

  // Write ETO event for federated sync to IAM
  const etoId = "eto_" + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  await env.DB.prepare(`
    INSERT OR IGNORE INTO agentsam_performance_eto_events
      (id, source_table, source_id, routing_arm_id, task_type, mode,
       model_key, provider, success, failure, latency_ms,
       input_tokens, output_tokens, cost_usd, quality_score,
       reward_score, alpha_delta, beta_delta, reward_reason,
       is_training_eligible, evidence_json)
    VALUES (?,?,?,?,?,?, ?,?,?,?,?, ?,?,?,?, ?,?,?,?, ?,?)
  `).bind(
    etoId,
    "agentsam_agent_run", agentRunId || "none",
    armId, taskType, mode,
    modelKey, provider,
    success ? 1 : 0,
    success ? 0 : 1,
    latencyMs,
    inputTokens, outputTokens, costUsd,
    qualityScore,
    rewardScore, alphaDelta, betaDelta, rewardReason,
    1,
    JSON.stringify({ latencyOk, qualityBonus })
  ).run().catch(() => {});
}

// ── Sync ETO events to IAM (federated learning) ───────────────────────────────
// Called async — never blocks the response.
// IAM endpoint: POST /api/agentsam/telemetry/ingest
// Secured with AGENTSAM_BRIDGE_KEY (set via wrangler secret put).
export async function syncToIAM(env) {
  if (!env.AGENTSAM_BRIDGE_KEY || !env.IAM_TELEMETRY_URL) return;

  // Pull up to 20 unsynced ETO events
  const rows = await env.DB.prepare(`
    SELECT id, source_table, source_id, routing_arm_id, task_type, mode,
           model_key, provider, success, failure, latency_ms,
           input_tokens, output_tokens, cost_usd, quality_score,
           reward_score, alpha_delta, beta_delta, reward_reason, evidence_json
    FROM agentsam_performance_eto_events
    WHERE applied_to_thompson_at IS NULL
      AND is_training_eligible = 1
    ORDER BY created_at ASC
    LIMIT 20
  `).all().catch(() => ({ results: [] }));

  const events = rows.results || [];
  if (events.length === 0) return;

  try {
    const res = await fetch(env.IAM_TELEMETRY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${env.AGENTSAM_BRIDGE_KEY}`,
        "X-Tenant-ID": "tenant_companionscpas",
        "X-Workspace-ID": WORKSPACE,
      },
      body: JSON.stringify({ events }),
    });

    if (res.ok) {
      // Mark as synced
      const ids = events.map(e => `'${e.id}'`).join(",");
      await env.DB.prepare(`
        UPDATE agentsam_performance_eto_events
        SET applied_to_thompson_at = datetime('now')
        WHERE id IN (${ids})
      `).run().catch(() => {});
    }
  } catch (_) {
    // Silent — sync failure never blocks the user
  }
}

// ── Core AI call ──────────────────────────────────────────────────────────────
// options.model: MODELS alias OR full model string OR use thompsonRoute() first
export async function callAI(env, {
  model, messages, system, maxTokens = 1024, json = false
}) {
  if (!env.AGENTSAM_WAI) throw new Error("AGENTSAM_WAI binding missing.");

  const resolvedModel = MODELS[model] ?? model;
  const provider      = resolvedModel.startsWith("@cf/") ? "workers_ai" : resolvedModel.split("/")[0];

  const msgs = [];
  if (system) msgs.push({ role: "system", content: system });
  msgs.push(...messages);

  const payload = {
    messages:   msgs,
    max_tokens: maxTokens,
    ...(json ? { response_format: { type: "json_object" } } : {}),
  };

  let raw;
  try {
    if (resolvedModel.startsWith("openai/") && env.OPENAI_API_KEY) {
      // Route openai/* through direct API — WAI binding rejects these model strings
      const modelId = resolvedModel.replace("openai/", "");
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: modelId,
          messages: payload.messages,
          max_tokens: payload.max_tokens,
          ...(payload.response_format ? { response_format: payload.response_format } : {})
        })
      });
      if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
      raw = await res.json();
    } else {
      // Native @cf/ models through WAI binding
      if (!env.AGENTSAM_WAI) throw new Error("AGENTSAM_WAI binding missing.");
      raw = await env.AGENTSAM_WAI.run(resolvedModel, payload);
    }
  } catch (err) {
    throw new Error(`callAI failed for "${resolvedModel}": ${err.message}`);
  }

  // Normalize response across all providers
  let text = "";
  if (typeof raw?.response === "string")        text = raw.response;
  else if (raw?.choices?.[0]?.message?.content) text = raw.choices[0].message.content;
  else if (typeof raw?.text === "string")        text = raw.text;
  else if (typeof raw === "string")              text = raw;
  else                                           text = JSON.stringify(raw ?? "");

  // Capture token usage — WAI returns usage.prompt_tokens / usage.completion_tokens
  // OpenAI-compatible returns usage.prompt_tokens / usage.completion_tokens too
  const usage = raw?.usage || {};
  const inputTokens  = usage.prompt_tokens     || usage.input_tokens  || 0;
  const outputTokens = usage.completion_tokens || usage.output_tokens || 0;

  return {
    text: text.trim(),
    model: resolvedModel,
    provider,
    inputTokens,
    outputTokens,
  };
}

// ── JSON helper ───────────────────────────────────────────────────────────────
export async function callAIJson(env, options) {
  const { text } = await callAI(env, { ...options, json: true });
  const clean = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  return JSON.parse(clean);
}

// ── Image helper ──────────────────────────────────────────────────────────────
export async function generateImage(env, { prompt, model = "image", size = "1024x1024" }) {
  if (!env.AGENTSAM_WAI) throw new Error("AGENTSAM_WAI binding missing.");
  const resolvedModel = MODELS[model] ?? model;
  const raw = await env.AGENTSAM_WAI.run(resolvedModel, { prompt, size });
  return { imageData: raw?.image ?? raw?.data?.[0]?.b64_json ?? raw, model: resolvedModel };
}

// ── Classify intent → task_type ───────────────────────────────────────────────
// Lightweight heuristic — no AI call needed.
export function classifyIntent(prompt, routePath = "") {
  const p = prompt.toLowerCase();
  const r = routePath.toLowerCase();
  if (r.includes("cms") || p.includes("copy") || p.includes("section") || p.includes("headline")) return "cms";
  if (p.includes("donat") || p.includes("donor") || p.includes("fundrais")) return "donor";
  if (p.includes("animal") || p.includes("foster") || p.includes("adopt") || p.includes("intake")) return "animal";
  return "general";
}
