with open("src/api/resolveModel.js", "r") as f:
    content = f.read()

# Add tools support to callAI signature and payload
old = """export async function callAI(env, {
  model, messages, system, maxTokens = 1024, json = false
}) {"""

new = """export async function callAI(env, {
  model, messages, system, maxTokens = 1024, json = false, tools = null
}) {"""

if old in content:
    content = content.replace(old, new)
    print("✅ tools param added to callAI")
else:
    print("❌ callAI signature not found")

# Add tools to payload
old = """  const payload = {
    messages:   msgs,
    max_tokens: maxTokens,
    ...(json ? { response_format: { type: "json_object" } } : {}),
  };"""

new = """  const payload = {
    messages:   msgs,
    max_tokens: maxTokens,
    ...(json  ? { response_format: { type: "json_object" } } : {}),
    ...(tools ? { tools } : {}),
  };"""

if old in content:
    content = content.replace(old, new)
    print("✅ tools added to payload")
else:
    print("❌ payload pattern not found")

# Extract tool_calls from response and return them
old = """  return {
    text: text.trim(),
    model: resolvedModel,
    provider,
    inputTokens,
    outputTokens,
  };"""

new = """  // Extract tool calls if present (OpenAI + kimi-k2.6 format)
  let toolCalls = [];
  if (Array.isArray(raw?.choices?.[0]?.message?.tool_calls)) {
    toolCalls = raw.choices[0].message.tool_calls;
  } else if (Array.isArray(raw?.tool_calls)) {
    toolCalls = raw.tool_calls;
  }

  return {
    text: text.trim(),
    model: resolvedModel,
    provider,
    inputTokens,
    outputTokens,
    toolCalls,
  };"""

if old in content:
    content = content.replace(old, new)
    print("✅ toolCalls extraction added")
else:
    print("❌ return pattern not found")

with open("src/api/resolveModel.js", "w") as f:
    f.write(content)
print("✅ resolveModel.js saved")
