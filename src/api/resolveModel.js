// src/api/resolveModel.js
// ─────────────────────────────────────────────────────────────────────────────
// Universal AI resolver for AGENTSAM_WAI (Cloudflare Workers AI binding).
// All AI calls in this platform flow through callAI() — never call
// env.AGENTSAM_WAI.run() or fetch() to OpenAI/Google directly.
//
// Response contract: always returns { text: string, model: string, provider: string }
// Callers never need to know which provider handled the request.
// ─────────────────────────────────────────────────────────────────────────────

// ── Model catalog ─────────────────────────────────────────────────────────────
// Keys are short aliases used throughout the codebase.
// Values are the model strings accepted by env.AGENTSAM_WAI.run().
export const MODELS = {
  // ── Text generation ──────────────────────────────────────────────────────
  flash:   "google/gemini-3-flash",       // Classification, intent, quick reads
  nano:    "openai/gpt-5.4-nano",         // Standard tasks, data ops, summaries
  mini:    "openai/gpt-5.4-mini",         // Board-facing copy, emails, UI suggestions (CMS floor)
  kimi:    "moonshot/kimi-k2.6",          // Long docs, 262k ctx, tool calling, vet summaries
  pro:     "google/gemini-3.1-pro",       // Heavy reasoning, 1M context
  premium: "openai/gpt-4.1",             // Critical ops, orchestration, 1M context

  // ── Image generation ─────────────────────────────────────────────────────
  image:       "xai/grok-imagine-image",  // Social posts, campaign assets (default)
  imagePlus:   "openai/gpt-image-1.5",   // Editable / higher quality
  imagePro:    "google/imagen-4",         // Photorealistic hero images
};

// ── Quality gate ──────────────────────────────────────────────────────────────
// Any feature that generates copy seen by board members / public must use
// at least MODELS.mini. Never route CMS suggestions to flash or nano.
export const CMS_FLOOR = MODELS.mini;

// ── Core resolver ─────────────────────────────────────────────────────────────
/**
 * callAI(env, options) → { text, model, provider }
 *
 * @param {object} env            - Worker env (must have AGENTSAM_WAI binding)
 * @param {object} options
 * @param {string} options.model  - Model alias (keyof MODELS) or full model string
 * @param {Array}  options.messages - OpenAI-style message array [{ role, content }]
 * @param {string} [options.system]    - Optional system prompt (prepended as role:system)
 * @param {number} [options.maxTokens] - Max output tokens (default 1024)
 * @param {boolean}[options.json]      - If true, request JSON output mode
 */
export async function callAI(env, { model, messages, system, maxTokens = 1024, json = false }) {
  if (!env.AGENTSAM_WAI) {
    throw new Error("AGENTSAM_WAI binding not found. Add [ai] binding = \"AGENTSAM_WAI\" to wrangler.toml.");
  }

  // Resolve alias → full model string
  const resolvedModel = MODELS[model] ?? model;
  const provider = resolvedModel.split("/")[0]; // "openai", "google", "moonshot", "xai"

  // Build message array
  const msgs = [];
  if (system) msgs.push({ role: "system", content: system });
  msgs.push(...messages);

  const payload = {
    messages: msgs,
    max_tokens: maxTokens,
    ...(json ? { response_format: { type: "json_object" } } : {}),
  };

  let raw;
  try {
    raw = await env.AGENTSAM_WAI.run(resolvedModel, payload);
  } catch (err) {
    throw new Error(`AGENTSAM_WAI.run failed for model "${resolvedModel}": ${err.message}`);
  }

  // ── Normalize response ────────────────────────────────────────────────────
  // Workers AI native models  → { response: "..." }
  // OpenAI / Google via WAI   → { choices: [{ message: { content: "..." } }] }
  let text = "";

  if (typeof raw?.response === "string") {
    text = raw.response;
  } else if (Array.isArray(raw?.choices) && raw.choices[0]?.message?.content) {
    text = raw.choices[0].message.content;
  } else if (typeof raw?.text === "string") {
    text = raw.text;
  } else if (typeof raw === "string") {
    text = raw;
  } else {
    // Last resort — stringify so the caller can at least debug
    text = JSON.stringify(raw ?? "");
  }

  return { text: text.trim(), model: resolvedModel, provider };
}

// ── JSON helper ───────────────────────────────────────────────────────────────
/**
 * callAIJson(env, options) → parsed object
 * Same as callAI but strips markdown fences and parses JSON.
 * Throws if the response is not valid JSON.
 */
export async function callAIJson(env, options) {
  const { text } = await callAI(env, { ...options, json: true });
  const clean = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
  return JSON.parse(clean);
}

// ── Image helper ──────────────────────────────────────────────────────────────
/**
 * generateImage(env, options) → { imageData: Uint8Array | base64 string, model }
 */
export async function generateImage(env, { prompt, model = "image", size = "1024x1024" }) {
  if (!env.AGENTSAM_WAI) {
    throw new Error("AGENTSAM_WAI binding not found.");
  }

  const resolvedModel = MODELS[model] ?? model;

  const raw = await env.AGENTSAM_WAI.run(resolvedModel, { prompt, size });

  return {
    imageData: raw?.image ?? raw?.data?.[0]?.b64_json ?? raw,
    model: resolvedModel,
  };
}
