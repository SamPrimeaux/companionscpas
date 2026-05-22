// src/api/agentsam_tools.js
// Companions of CPAS — Agent Sam tool definitions + executor
// All DB reads execute directly. Writes require frontend approval.
// ─────────────────────────────────────────────────────────────────────────────

// ── Hard-blocked SQL patterns ─────────────────────────────────────────────────
const BLOCKED = [
  /DROP\s+TABLE/i, /DROP\s+DATABASE/i, /TRUNCATE/i,
  /DELETE\s+FROM\s+(users|sessions|auth_users|user_credentials|tenant_memberships)/i,
  /ALTER\s+TABLE/i, /pragma\s+(?!table_info)/i,
];

function isSafeRead(sql) {
  const s = sql.trim().toUpperCase();
  if (!s.startsWith("SELECT") && !s.startsWith("PRAGMA TABLE_INFO")) return false;
  return !BLOCKED.some(r => r.test(sql));
}

function isApprovedWrite(sql) {
  const s = sql.trim().toUpperCase();
  if (s.startsWith("SELECT")) return false; // reads don't need approval
  if (BLOCKED.some(r => r.test(sql))) return false; // hard block
  return true; // UPDATE, INSERT allowed with approval
}

// ── Tool definitions (OpenAI function-calling schema) ─────────────────────────
export const AGENT_TOOLS = [
  {
    type: "function",
    function: {
      name: "list_tables",
      description: "List all tables in the Companions of CPAS database with their column names. Use this when asked about the database structure, available data, or what information exists.",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "query_database",
      description: "Run a read-only SELECT query against the Companions of CPAS database. Use this to answer questions about animals, fosters, applications, donations, volunteers, CMS pages, or any other operational data. Always use LIMIT to avoid large result sets.",
      parameters: {
        type: "object",
        properties: {
          sql: {
            type: "string",
            description: "A safe SELECT SQL query. Must start with SELECT. Use LIMIT. No DROP, DELETE of core tables, or schema changes."
          },
          description: {
            type: "string",
            description: "Brief plain-English description of what this query is checking."
          }
        },
        required: ["sql", "description"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "write_database",
      description: "Propose an UPDATE or INSERT to the database. This will NOT execute immediately — it sends an approval request to the user first. Use for updating animal bios, application statuses, CMS content, donor notes, etc.",
      parameters: {
        type: "object",
        properties: {
          sql: {
            type: "string",
            description: "The UPDATE or INSERT SQL statement to propose."
          },
          description: {
            type: "string",
            description: "Plain English explanation of exactly what will change. Written for a non-technical user."
          },
          impact: {
            type: "string",
            description: "How many records will be affected and what they are."
          }
        },
        required: ["sql", "description", "impact"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_cms_page",
      description: "Get the full content of a CMS page including all sections and their current field values. Use when asked to help edit, improve, or review website content.",
      parameters: {
        type: "object",
        properties: {
          page_slug: {
            type: "string",
            description: "The page slug e.g. 'home', 'about', 'adopt', 'donate', 'services'"
          }
        },
        required: ["page_slug"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_cms_section",
      description: "Propose an update to a CMS section field. Sends an approval card to the user showing before/after. Does NOT publish — saves as draft only.",
      parameters: {
        type: "object",
        properties: {
          section_id: { type: "string", description: "The section ID to update" },
          field: { type: "string", description: "The field name e.g. 'heading', 'body', 'eyebrow', 'cta_label'" },
          current_value: { type: "string", description: "The current field value" },
          proposed_value: { type: "string", description: "The proposed new value" },
          reason: { type: "string", description: "Why this change improves the content" }
        },
        required: ["section_id", "field", "proposed_value", "reason"]
      }
    }
  }
];

// ── Tool executor ─────────────────────────────────────────────────────────────
export async function executeTool(env, toolName, args) {
  switch (toolName) {

    case "list_tables": {
      const rows = await env.DB.prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '_cf_%' ORDER BY name`
      ).all().catch(() => ({ results: [] }));
      const tables = rows.results || [];

      // Get column info for each table
      const detailed = await Promise.all(
        tables.slice(0, 30).map(async ({ name }) => {
          const cols = await env.DB.prepare(
            `PRAGMA table_info(${name})`
          ).all().catch(() => ({ results: [] }));
          const colNames = (cols.results || []).map(c => c.name).join(", ");
          return `${name} (${colNames})`;
        })
      );

      return {
        success: true,
        table_count: tables.length,
        tables: detailed
      };
    }

    case "query_database": {
      const { sql, description } = args;
      if (!isSafeRead(sql)) {
        return { success: false, error: "Query blocked — only SELECT statements are allowed for direct execution." };
      }
      // Enforce LIMIT
      const safeSql = sql.match(/LIMIT\s+\d+/i) ? sql : sql.trimEnd().replace(/;?$/, " LIMIT 50");
      const result = await env.DB.prepare(safeSql).all().catch(e => ({ error: e.message }));
      if (result.error) return { success: false, error: result.error };
      return {
        success: true,
        description,
        row_count: result.results?.length || 0,
        rows: result.results || []
      };
    }

    case "write_database": {
      // Never auto-executes — always returns approval_required
      const { sql, description, impact } = args;
      if (!isApprovedWrite(sql)) {
        return { success: false, error: "This operation is blocked for safety." };
      }
      return {
        success: true,
        approval_required: true,
        sql,
        description,
        impact,
        action_type: "db_write"
      };
    }

    case "get_cms_page": {
      const { page_slug } = args;
      const page = await env.DB.prepare(
        `SELECT id, title, slug, status FROM cms_pages WHERE slug=? AND tenant_id='tenant_companionscpas' LIMIT 1`
      ).bind(page_slug).first().catch(() => null);

      if (!page) return { success: false, error: `Page '${page_slug}' not found.` };

      const sections = await env.DB.prepare(
        `SELECT id, section_type, sort_order, content_json, is_visible
         FROM cms_page_sections
         WHERE page_id=? ORDER BY sort_order ASC`
      ).bind(page.id).all().catch(() => ({ results: [] }));

      return {
        success: true,
        page,
        sections: (sections.results || []).map(s => ({
          ...s,
          content: s.content_json ? JSON.parse(s.content_json) : {}
        }))
      };
    }

    case "update_cms_section": {
      // Returns approval_required — frontend renders action card
      const { section_id, field, current_value, proposed_value, reason } = args;
      return {
        success: true,
        approval_required: true,
        action_type: "cms_edit",
        section_id,
        field,
        current_value: current_value || "",
        proposed_value,
        reason
      };
    }

    default:
      return { success: false, error: `Unknown tool: ${toolName}` };
  }
}

// ── Models that support tool calling ─────────────────────────────────────────
export const TOOL_CAPABLE_MODELS = new Set([
  "@cf/moonshotai/kimi-k2.6",
  "@cf/moonshotai/kimi-k2.5",
  "openai/gpt-5.4-mini",
  "openai/gpt-5.4-nano",
  "openai/gpt-4.1",
]);

export function modelSupportsTools(modelKey) {
  return TOOL_CAPABLE_MODELS.has(modelKey);
}
