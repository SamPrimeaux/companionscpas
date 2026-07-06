/**
 * src/api/mcp_handler.js
 * ──────────────────────
 * MCP 2024-11-05 JSON-RPC handler for Companions of CPAS.
 * Exposes agentsam tools over standard MCP protocol so the IAM
 * platform (or any MCP-aware client) can drive this Worker as a
 * first-class MCP server.
 *
 * Endpoint:  POST /api/agentsam/mcp
 * Auth:      x-bridge-key: <AGENTSAM_BRIDGE_KEY>  (same secret already in use)
 *
 * Supported methods:
 *   initialize          → server info + capabilities
 *   tools/list          → all AGENT_TOOLS translated to MCP InputSchema
 *   tools/call          → proxies into executeTool()
 *   ping                → health check
 *
 * Response shape: JSON-RPC 2.0
 *   { jsonrpc: "2.0", id, result }  on success
 *   { jsonrpc: "2.0", id, error: { code, message, data? } }  on failure
 *
 * Error codes (MCP spec):
 *   -32700  Parse error
 *   -32600  Invalid request
 *   -32601  Method not found
 *   -32602  Invalid params
 *   -32603  Internal error
 */

import { AGENT_TOOLS, executeTool } from "./agentsam_tools.js";

const MCP_VERSION   = "2024-11-05";
const SERVER_NAME   = "companionscpas";
const SERVER_VERSION = "1.0.0";

// ── Helpers ───────────────────────────────────────────────────────────────────

function jsonrpc(id, result) {
  return new Response(
    JSON.stringify({ jsonrpc: "2.0", id: id ?? null, result }),
    { headers: { "Content-Type": "application/json" } }
  );
}

function jsonrpcError(id, code, message, data) {
  const error = { code, message };
  if (data !== undefined) error.data = data;
  return new Response(
    JSON.stringify({ jsonrpc: "2.0", id: id ?? null, error }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

/** Translate OpenAI function-calling schema → MCP InputSchema */
function toMcpTool(tool) {
  const fn = tool.function;
  return {
    name:        fn.name,
    description: fn.description,
    inputSchema: {
      type:       fn.parameters?.type       || "object",
      properties: fn.parameters?.properties || {},
      required:   fn.parameters?.required   || [],
    },
  };
}

// ── Auth ──────────────────────────────────────────────────────────────────────

function isAuthorized(request, env) {
  const key      = request.headers.get("x-bridge-key") || "";
  const validKey = env.AGENTSAM_BRIDGE_KEY || "";
  return validKey && key === validKey;
}

// ── Method handlers ───────────────────────────────────────────────────────────

function handleInitialize(id, params) {
  return jsonrpc(id, {
    protocolVersion: MCP_VERSION,
    capabilities: {
      tools: { listChanged: false },
    },
    serverInfo: {
      name:    SERVER_NAME,
      version: SERVER_VERSION,
    },
    instructions: [
      "You are connected to the Companions of CPAS agentsam Worker.",
      "Use tools/list to discover available tools.",
      "All write tools (write_database, update_cms_section) return approval_required:true — present proposed changes to the user before calling /api/agentsam/tool/approve.",
    ].join(" "),
  });
}

function handleToolsList(id) {
  return jsonrpc(id, {
    tools: AGENT_TOOLS.map(toMcpTool),
  });
}

async function handleToolsCall(id, params, env) {
  const name      = params?.name;
  const arguments_ = params?.arguments || {};

  if (!name) {
    return jsonrpcError(id, -32602, "Invalid params: 'name' is required");
  }

  const knownTools = new Set(AGENT_TOOLS.map(t => t.function.name));
  if (!knownTools.has(name)) {
    return jsonrpcError(id, -32601, `Tool not found: ${name}`, {
      available: [...knownTools],
    });
  }

  try {
    const result = await executeTool(env, name, arguments_);

    if (!result.success) {
      // Tool executed but returned a logical error — MCP content block with isError
      return jsonrpc(id, {
        content: [{ type: "text", text: result.error || "Tool returned an error." }],
        isError: true,
      });
    }

    // Approval-required actions surface as structured content so the caller
    // can present them before hitting /api/agentsam/tool/approve
    if (result.approval_required) {
      return jsonrpc(id, {
        content: [{
          type: "text",
          text: JSON.stringify({
            approval_required: true,
            action_type:       result.action_type,
            description:       result.description || "",
            impact:            result.impact       || "",
            sql:               result.sql          || undefined,
            section_id:        result.section_id   || undefined,
            field:             result.field        || undefined,
            proposed_value:    result.proposed_value || undefined,
          }),
        }],
        isError: false,
      });
    }

    // Strip internal bookkeeping fields before returning
    const { success: _s, approval_required: _ar, ...clean } = result;
    return jsonrpc(id, {
      content: [{ type: "text", text: JSON.stringify(clean) }],
      isError: false,
    });

  } catch (err) {
    return jsonrpcError(id, -32603, "Internal error during tool execution", {
      tool: name,
      error: err?.message || String(err),
    });
  }
}

function handlePing(id) {
  return jsonrpc(id, {
    status:  "ok",
    server:  SERVER_NAME,
    version: SERVER_VERSION,
    ts:      new Date().toISOString(),
  });
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function mcpHandler(request, env) {
  // Auth gate — bridge key only, no session cookie required
  if (!isAuthorized(request, env)) {
    return new Response(
      JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Unauthorized" } }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // Must be POST
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Method must be POST" } }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  // Parse body
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonrpcError(null, -32700, "Parse error: request body is not valid JSON");
  }

  const { id, method, params } = body;

  if (body.jsonrpc !== "2.0" || !method) {
    return jsonrpcError(id, -32600, "Invalid Request: missing jsonrpc or method");
  }

  switch (method) {
    case "initialize":   return handleInitialize(id, params);
    case "tools/list":   return handleToolsList(id);
    case "tools/call":   return handleToolsCall(id, params, env);
    case "ping":         return handlePing(id);
    default:
      return jsonrpcError(id, -32601, `Method not found: ${method}`);
  }
}
