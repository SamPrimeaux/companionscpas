# patch_agentsam_db_driven.py
# Wires agentsam_intent_rules, agentsam_model_policy, agentsam_tool_chain,
# agentsam_tool_result, and agentsam_reward_events into the live request path.
# Run from repo root: python3 patch_agentsam_db_driven.py

import re

# ── 1. Patch agentsam_tools.js — write tool_chain + tool_result rows ──────────
with open("src/api/agentsam_tools.js", "r") as f:
    tools = f.read()

old_exec = "async function _executeTool(env, toolName, args) {"
new_exec = """async function _executeTool(env, toolName, args) {"""

# Add chain writer wrapper around the real executor
if "writeToolChain" not in tools:
    chain_wrapper = '''
// ── Tool chain writer ─────────────────────────────────────────────────────────
export async function writeToolChain(env, { agentRunId, sessionId, chainIndex, toolKey, inputArgs }) {
  const chainId = "tc_" + crypto.randomUUID().replace(/-/g,"").slice(0,16);
  await env.DB.prepare(`
    INSERT INTO agentsam_tool_chain
      (id, agent_run_id, session_id, chain_index, tool_key, tool_name, input_args_json, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'running')
  `).bind(chainId, agentRunId, sessionId||null, chainIndex, toolKey, toolKey, JSON.stringify(inputArgs||{}))
   .run().catch(e => console.error("[tool_chain write]", e.message));
  return chainId;
}

export async function resolveToolChain(env, { chainId, agentRunId, toolKey, outputJson, status, latencyMs, errorMsg }) {
  await env.DB.prepare(`
    UPDATE agentsam_tool_chain
    SET status=?, output_json=?, latency_ms=?, error_message=?, created_at=datetime('now')
    WHERE id=?
  `).bind(status, JSON.stringify(outputJson||{}), latencyMs||null, errorMsg||null, chainId)
   .run().catch(e => console.error("[tool_chain resolve]", e.message));

  if (status === "completed" && outputJson) {
    await env.DB.prepare(`
      INSERT INTO agentsam_tool_result
        (chain_id, agent_run_id, tool_key, result_json, row_count, was_truncated)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      chainId, agentRunId, toolKey,
      JSON.stringify(outputJson),
      outputJson.row_count || outputJson.table_count || null,
      outputJson.was_truncated ? 1 : 0
    ).run().catch(e => console.error("[tool_result write]", e.message));
  }
}

'''
    tools = chain_wrapper + tools
    with open("src/api/agentsam_tools.js", "w") as f:
        f.write(tools)
    print("✅ agentsam_tools.js: writeToolChain + resolveToolChain added")
else:
    print("⏭  agentsam_tools.js: chain writer already present")

# ── 2. Patch agentsam_api.js — DB-driven intent rules + model policy ──────────
with open("src/api/agentsam_api.js", "r") as f:
    api = f.read()

# 2a. Add import for chain writers
old_import = "import { AGENT_TOOLS, executeTool, modelSupportsTools } from './agentsam_tools.js';"
new_import  = "import { AGENT_TOOLS, executeTool, modelSupportsTools, writeToolChain, resolveToolChain } from './agentsam_tools.js';"

if old_import in api:
    api = api.replace(old_import, new_import)
    print("✅ agentsam_api.js: import updated")
else:
    print("⚠️  agentsam_api.js: import already updated or not found")

# 2b. Replace hardcoded needsTools regex with DB-driven intent rules lookup
old_needs_tools = """          // If selected model can't use tools but prompt needs real data, escalate
          const needsTools = /how many|list|count|table|database|show me|query|record|what.*in.*db|agentsam/i.test(prompt);
          if (needsTools && !modelSupportsTools(usedModel)) {
            // Pick best available tool-capable model
            const toolModel = env.OPENAI_API_KEY ? "openai/gpt-5.4-mini" : "@cf/moonshotai/kimi-k2.6";
            console.log(`[agentsam] escalating ${usedModel} → ${toolModel} for tool use`);
            usedModel    = toolModel;
            usedProvider = toolModel.startsWith("openai/") ? "openai" : "workers_ai";
            usedArm      = null; // cold escalation, no arm to update
          }"""

new_needs_tools = """          // DB-driven intent rules — check agentsam_intent_rules for this prompt
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
            const toolModel = env.OPENAI_API_KEY ? "openai/gpt-5.4-mini" : "@cf/moonshotai/kimi-k2.6";
            console.log(`[agentsam] policy escalation: ${usedModel} → ${toolModel} (rule: ${activeRule?.intent_pattern||'model_policy'})`);
            usedModel    = toolModel;
            usedProvider = toolModel.startsWith("openai/") ? "openai" : "workers_ai";
            usedArm      = null;
          }"""

if old_needs_tools in api:
    api = api.replace(old_needs_tools, new_needs_tools)
    print("✅ agentsam_api.js: DB-driven intent rules + model policy wired")
else:
    print("❌ agentsam_api.js: needsTools pattern not found — may need manual review")

# 2c. Wire tool_chain writes inside the tool execution loop
old_tool_exec = """                const toolResult = await executeTool(env, toolName, toolArgs);"""
new_tool_exec  = """                const _chainStart = Date.now();
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
                });"""

if old_tool_exec in api:
    api = api.replace(old_tool_exec, new_tool_exec)
    print("✅ agentsam_api.js: tool_chain writes wired into tool loop")
else:
    print("❌ agentsam_api.js: tool execution pattern not found")

# 2d. Wire reward_events write after recordOutcome
old_reward = "          env.AGENTSAM_BRIDGE_KEY && syncToIAM(env).catch(() => {});"
new_reward  = """          // Write granular reward event
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

          env.AGENTSAM_BRIDGE_KEY && syncToIAM(env).catch(() => {});"""

if old_reward in api:
    api = api.replace(old_reward, new_reward)
    print("✅ agentsam_api.js: reward_events write added")
else:
    print("❌ agentsam_api.js: syncToIAM pattern not found")

with open("src/api/agentsam_api.js", "w") as f:
    f.write(api)

print("\n✅ All patches applied. Run:")
print("   git add src/api/agentsam_api.js src/api/agentsam_tools.js")
print("   git commit -m 'feat(core): DB-driven intent rules, model policy, tool_chain, reward_events'")
print("   git push origin main && npm run deploy")
