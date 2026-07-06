/**
 * src/api/agentsam_tools.js
 * ─────────────────────────
 * PrimeTech / AgentSam tool execution layer.
 * Handles all routes under /api/agentsam/tools/*
 *
 * Route map:
 *   POST /api/agentsam/tools/browser/inspect       → playwright_inspect_page
 *   POST /api/agentsam/tools/browser/console       → browser_console_audit
 *   POST /api/agentsam/tools/browser/network       → browser_network_audit
 *   POST /api/agentsam/tools/browser/snapshot      → cms_visual_snapshot
 *   POST /api/agentsam/tools/cms/dom_section_map   → cms_dom_section_map
 *   POST /api/agentsam/tools/cms/accessibility     → cms_accessibility_smoke
 *   POST /api/agentsam/tools/cms/asset_resolution  → cms_asset_resolution_check
 *   POST /api/agentsam/tools/cms/cache_probe       → cms_cache_probe
 *   POST /api/agentsam/tools/cms/inspect_report    → primetech_inspect_report
 *   POST /api/agentsam/tools/cms/repair_patch      → script_write_repair_patch
 *   POST /api/agentsam/tools/cms/kv_bust           → cms_kv_bust
 *   POST /api/agentsam/tools/cms/kv_prime          → cms_kv_prime
 *   POST /api/agentsam/tools/cms/diff              → cms_diff_sections
 *   POST /api/agentsam/tools/cms/schema            → cms_load_section_schema
 *   POST /api/agentsam/tools/cms/revision          → cms_write_revision
 *   POST /api/agentsam/tools/cms/publish_job       → cms_create_publish_job
 *
 * All handlers return: { ok, tool_key, result, error?, duration_ms }
 * All writes log to agentsam_tool_chain if agent_run_id is provided.
 */

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const TENANT = "tenant_companionscpas";

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

async function logToolChain(env, { agent_run_id, session_id, tool_key, input, output, status, latency_ms }) {
  if (!agent_run_id) return;
  try {
    await env.DB.prepare(`
      INSERT INTO agentsam_tool_chain
        (id, tenant_id, agent_run_id, session_id, tool_key, tool_name,
         input_args_json, output_json, status, latency_ms)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      "tc_" + uid(), TENANT, agent_run_id, session_id || null,
      tool_key, tool_key,
      JSON.stringify(input || {}),
      JSON.stringify(output || {}),
      status || "completed",
      latency_ms || 0
    ).run();
  } catch (e) {
    console.warn("[tools] logToolChain failed:", e.message);
  }
}

function ok(tool_key, result, duration_ms) {
  return { ok: true, tool_key, result, duration_ms };
}

function err(tool_key, error, duration_ms) {
  return { ok: false, tool_key, error: String(error), duration_ms };
}

function isSafeRead(sql) {
  const raw = String(sql || "").trim();
  const normalized = raw.toUpperCase();
  if (!normalized.startsWith("SELECT") && !normalized.startsWith("PRAGMA TABLE_INFO")) return false;
  if (/DROP\s+TABLE|DROP\s+DATABASE|TRUNCATE|ALTER\s+TABLE|DELETE\s+FROM\s+(USERS|SESSIONS|AUTH_USERS|USER_CREDENTIALS|TENANT_MEMBERSHIPS)/i.test(raw)) {
    return false;
  }
  return true;
}

function isApprovedWrite(sql) {
  const raw = String(sql || "").trim();
  if (!raw || /^SELECT/i.test(raw)) return false;
  if (/DROP\s+TABLE|DROP\s+DATABASE|TRUNCATE|ALTER\s+TABLE|DELETE\s+FROM\s+(USERS|SESSIONS|AUTH_USERS|USER_CREDENTIALS|TENANT_MEMBERSHIPS)/i.test(raw)) {
    return false;
  }
  return true;
}

const R2_BINARY_EXT = /\.(webp|png|jpe?g|gif|ico|avif|woff2?|ttf|otf|eot|pdf|zip|gz|mp4|webm|mp3|wav|bin)$/i;

const R2_PROTECTED_PATHS = [
  /^admin\/login\.html$/,
  /^dashboard\//,
];

function isTextR2Key(key) {
  const k = String(key || "").trim();
  if (!k) return false;
  if (R2_BINARY_EXT.test(k)) return false;
  return /\.(html?|js|jsx?|css|json|txt|md|xml|svg|map)$/i.test(k) || !/\./.test(k.split("/").pop() || "");
}

function isProtectedR2Path(key, allowSensitive = false) {
  if (allowSensitive) return false;
  const k = String(key || "").trim();
  return R2_PROTECTED_PATHS.some((re) => re.test(k));
}

export const AGENT_TOOLS = [
  {
    type: "function",
    function: {
      name: "list_tables",
      description: "List available database tables and columns.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "query_database",
      description: "Run a safe read-only SELECT query.",
      parameters: {
        type: "object",
        properties: {
          sql: { type: "string" },
          description: { type: "string" },
        },
        required: ["sql", "description"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "write_database",
      description: "Propose an INSERT/UPDATE change requiring approval.",
      parameters: {
        type: "object",
        properties: {
          sql: { type: "string" },
          description: { type: "string" },
          impact: { type: "string" },
        },
        required: ["sql", "description", "impact"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_cms_page",
      description: "Get CMS page and section data by slug.",
      parameters: {
        type: "object",
        properties: { page_slug: { type: "string" } },
        required: ["page_slug"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_cms_section",
      description: "Propose a CMS section field update requiring approval.",
      parameters: {
        type: "object",
        properties: {
          section_id: { type: "string" },
          field: { type: "string" },
          current_value: { type: "string" },
          proposed_value: { type: "string" },
          reason: { type: "string" },
        },
        required: ["section_id", "field", "proposed_value", "reason"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "d1_query",
      description: "Run a safe read-only D1 SELECT (auto-LIMIT 50).",
      parameters: {
        type: "object",
        properties: {
          sql: { type: "string" },
          description: { type: "string" },
        },
        required: ["sql", "description"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "d1_write",
      description: "Propose an INSERT/UPDATE/DELETE requiring approval.",
      parameters: {
        type: "object",
        properties: {
          sql: { type: "string" },
          description: { type: "string" },
          impact: { type: "string" },
        },
        required: ["sql", "description", "impact"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "d1_schema",
      description: "List tables or PRAGMA table_info for one table (read-only).",
      parameters: {
        type: "object",
        properties: {
          table: { type: "string", description: "Omit to list all tables." },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "r2_list",
      description: "List R2 WEBSITE_ASSETS keys under an optional prefix.",
      parameters: {
        type: "object",
        properties: {
          prefix: { type: "string" },
          limit: { type: "number" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "r2_get",
      description: "Read text content from R2 (html/js/css/json only).",
      parameters: {
        type: "object",
        properties: {
          key: { type: "string" },
        },
        required: ["key"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "r2_head",
      description: "Read R2 object metadata without body.",
      parameters: {
        type: "object",
        properties: {
          key: { type: "string" },
        },
        required: ["key"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "r2_put",
      description: "Propose writing/updating an R2 object (requires approval).",
      parameters: {
        type: "object",
        properties: {
          key: { type: "string" },
          body: { type: "string" },
          content_type: { type: "string" },
          description: { type: "string" },
          allow_sensitive: { type: "boolean" },
        },
        required: ["key", "body", "description"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "r2_delete",
      description: "Propose deleting an R2 object (requires approval).",
      parameters: {
        type: "object",
        properties: {
          key: { type: "string" },
          description: { type: "string" },
          impact: { type: "string" },
        },
        required: ["key", "description", "impact"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "kv_get",
      description: "Read a CMS_CACHE KV value by key.",
      parameters: {
        type: "object",
        properties: {
          key: { type: "string" },
        },
        required: ["key"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "kv_list",
      description: "List CMS_CACHE KV keys under an optional prefix.",
      parameters: {
        type: "object",
        properties: {
          prefix: { type: "string" },
          limit: { type: "number" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "kv_delete",
      description: "Propose deleting a CMS_CACHE KV key (requires approval).",
      parameters: {
        type: "object",
        properties: {
          key: { type: "string" },
          description: { type: "string" },
          impact: { type: "string" },
        },
        required: ["key", "description", "impact"],
      },
    },
  },
];

const TOOL_CAPABLE_MODELS = new Set([
  "@cf/moonshotai/kimi-k2.6",
  "@cf/moonshotai/kimi-k2.5",
  "openai/gpt-5.4-mini",
  "openai/gpt-5.4-nano",
  "openai/gpt-4.1",
]);

export function modelSupportsTools(modelKey) {
  const key = String(modelKey || "").trim();
  if (!key) return false;
  if (TOOL_CAPABLE_MODELS.has(key)) return true;
  return key.startsWith("openai/");
}

// ── KV key namespaces ─────────────────────────────────────────────────────────
const KV_PREFIXES = {
  brand:     "cms:brand:tenant_companionscpas",
  nav:       "cms:nav:tenant_companionscpas",
  bootstrap: "agentsam:bootstrap:tenant_companionscpas:v1",
  schema:    "cms:schema:",
  page:      (route) => `cms:page:tenant_companionscpas:${route || "*"}`,
};

// ─────────────────────────────────────────────────────────────────────────────
// TOOL HANDLERS
// ─────────────────────────────────────────────────────────────────────────────

// ── 1. Playwright Inspect Page ────────────────────────────────────────────────
async function toolBrowserInspect(env, params) {
  const { url, viewport = "desktop" } = params;
  if (!url) return { error: "url is required" };

  // Real implementation: forward to terminal.inneranimalmedia.com PTY
  // or a dedicated Playwright worker. For now: HTTP fetch + metadata.
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "PrimeTech-Inspector/1.0 (+https://companionsofcaddo.org)" },
      cf: { cacheTtl: 0, cacheEverything: false },
    });
    const html = await res.text();
    const duration_ms = Date.now() - t0;

    const title_match = html.match(/<title[^>]*>(.*?)<\/title>/is);
    const h1_match    = html.match(/<h1[^>]*>(.*?)<\/h1>/is);
    const sections    = (html.match(/data-section-key="([^"]+)"/g) || [])
                          .map(m => m.replace(/data-section-key="|"/g, ""));

    return {
      url,
      status:       res.status,
      ok:           res.ok,
      viewport,
      title:        title_match ? title_match[1].replace(/<[^>]+>/g, "").trim() : null,
      h1:           h1_match    ? h1_match[1].replace(/<[^>]+>/g, "").trim()    : null,
      html_bytes:   html.length,
      sections_found: sections,
      duration_ms,
      note: "Full Playwright/CDP execution requires PTY bridge. This is HTTP-only fetch.",
    };
  } catch (e) {
    return { url, error: e.message };
  }
}

// ── 2. Browser Console Audit ──────────────────────────────────────────────────
async function toolBrowserConsole(env, params) {
  const { url } = params;
  if (!url) return { error: "url is required" };

  // Stub: real impl via Playwright CDP page.on('console')
  // Returns shape the workflow runner expects
  const res = await fetch(url).catch(e => ({ ok: false, status: 0, error: e.message }));
  return {
    url,
    fetch_ok:       res.ok || false,
    fetch_status:   res.status || 0,
    console_errors: [],
    console_warns:  [],
    uncaught:       [],
    note: "Full console capture requires Playwright bridge (PTY). Stub returns fetch status only.",
  };
}

// ── 3. Browser Network Audit ──────────────────────────────────────────────────
async function toolBrowserNetwork(env, params) {
  const { url } = params;
  if (!url) return { error: "url is required" };

  const t0  = Date.now();
  const res = await fetch(url).catch(e => ({ ok: false, status: 0, statusText: e.message }));
  return {
    url,
    status:          res.status || 0,
    ok:              res.ok     || false,
    duration_ms:     Date.now() - t0,
    failed_requests: res.ok ? [] : [{ url, status: res.status, reason: res.statusText }],
    note: "Full network interception requires Playwright bridge. Stub checks main URL only.",
  };
}

// ── 4. Visual Snapshot ────────────────────────────────────────────────────────
async function toolVisualSnapshot(env, params) {
  const { url, viewports = ["desktop","tablet","mobile"] } = params;
  if (!url) return { error: "url is required" };
  // Stub: real impl captures screenshots → R2
  return {
    url,
    viewports_requested: viewports,
    screenshots: viewports.map(vp => ({
      viewport: vp,
      r2_key:   `static/snapshots/${vp}-${Date.now()}.png`,
      pub_url:  null,
      note:     "Requires Playwright bridge to capture",
    })),
    note: "Screenshot capture requires Playwright/PTY bridge.",
  };
}

// ── 5. DOM → CMS Section Map ──────────────────────────────────────────────────
async function toolDomSectionMap(env, params) {
  const { url, page_route } = params;
  if (!url && !page_route) return { error: "url or page_route required" };

  const route = page_route || new URL(url).pathname;

  const [domSections, dbSections] = await Promise.all([
    // Fetch rendered HTML and extract data-section-key attributes
    fetch(url || `https://companionsofcaddo.org${route}`)
      .then(r => r.text())
      .then(html => (html.match(/data-section-key="([^"]+)"/g) || [])
        .map(m => m.replace(/data-section-key="|"/g, "")))
      .catch(() => []),

    // Load D1 sections for comparison
    env.DB.prepare(
      `SELECT section_key, section_type, is_visible FROM cms_page_sections
       WHERE page_route = ? ORDER BY sort_order`
    ).bind(route).all().then(r => r.results || []).catch(() => []),
  ]);

  const dbKeys  = dbSections.map(s => s.section_key);
  const inDomNotDb = domSections.filter(k => !dbKeys.includes(k));
  const inDbNotDom = dbKeys.filter(k => !domSections.includes(k));

  return {
    page_route:      route,
    dom_sections:    domSections,
    db_sections:     dbSections,
    in_dom_not_db:   inDomNotDb,
    in_db_not_dom:   inDbNotDom,
    fully_mapped:    inDomNotDb.length === 0 && inDbNotDom.length === 0,
  };
}

// ── 6. Accessibility Smoke Test ───────────────────────────────────────────────
async function toolAccessibilitySmoke(env, params) {
  const { url, page_route } = params;
  const route = page_route || (url ? new URL(url).pathname : "/");

  const sections = await env.DB.prepare(
    `SELECT section_key, heading, body, image_url FROM cms_page_sections
     WHERE page_route = ? AND is_visible = 1`
  ).bind(route).all().then(r => r.results || []).catch(() => []);

  const violations = [];

  for (const s of sections) {
    if (!s.heading || s.heading.trim() === "") {
      violations.push({ section: s.section_key, impact: "serious", rule: "empty-heading",
                        message: "Section has no heading" });
    }
  }

  // Check for image sections missing alt text (via cms_assets)
  const assets = await env.DB.prepare(
    `SELECT asset_key, alt_text, pub_url FROM cms_assets
     WHERE tenant_id = ? AND is_live = 1 AND alt_text IS NULL`
  ).bind(TENANT).all().then(r => r.results || []).catch(() => []);

  for (const a of assets.slice(0, 20)) {
    violations.push({ asset: a.asset_key, impact: "moderate", rule: "image-alt",
                      message: "Asset missing alt_text", url: a.pub_url });
  }

  return {
    page_route:      route,
    sections_checked: sections.length,
    violations,
    violation_count:  violations.length,
    passed:           violations.length === 0,
  };
}

// ── 7. Asset Resolution Check ─────────────────────────────────────────────────
async function toolAssetResolution(env, params) {
  const { page_route } = params;

  const [sections, assets] = await Promise.all([
    env.DB.prepare(
      `SELECT section_key, image_url FROM cms_page_sections
       WHERE page_route = ? AND image_url IS NOT NULL AND image_url != ''`
    ).bind(page_route || "/").all().then(r => r.results || []),
    env.DB.prepare(
      `SELECT asset_key, pub_url, r2_key FROM cms_assets
       WHERE tenant_id = ? AND is_live = 1 LIMIT 50`
    ).bind(TENANT).all().then(r => r.results || []),
  ]);

  const checks = [];
  for (const s of sections) {
    if (!s.image_url) continue;
    const res = await fetch(s.image_url, { method: "HEAD" }).catch(e => ({ ok: false, status: 0 }));
    checks.push({ section: s.section_key, url: s.image_url, status: res.status, ok: res.ok });
  }

  const broken = checks.filter(c => !c.ok);
  return {
    page_route,
    sections_with_images: sections.length,
    assets_in_db:         assets.length,
    checks,
    broken_assets:        broken,
    all_resolved:         broken.length === 0,
  };
}

// ── 8. KV Cache Probe ─────────────────────────────────────────────────────────
async function toolCacheProbe(env, params) {
  if (!env.CMS_CACHE) return { error: "CMS_CACHE binding not available" };

  const keysToProbe = [
    KV_PREFIXES.brand,
    KV_PREFIXES.nav,
    KV_PREFIXES.bootstrap,
    KV_PREFIXES.page("/"),
  ];

  const results = await Promise.all(keysToProbe.map(async key => {
    try {
      const { value, metadata } = await env.CMS_CACHE.getWithMetadata(key);
      return {
        key,
        hit:      value !== null,
        size:     value ? value.length : 0,
        metadata: metadata || null,
      };
    } catch (e) {
      return { key, hit: false, error: e.message };
    }
  }));

  const hits   = results.filter(r => r.hit).length;
  const misses = results.filter(r => !r.hit).length;

  return { keys_probed: results.length, hits, misses, results };
}

// ── 9. Inspect Report Compiler ────────────────────────────────────────────────
async function toolInspectReport(env, params) {
  const {
    page_route = "/",
    browser_result, console_result, network_result,
    dom_map, accessibility, asset_resolution, cache_probe,
  } = params;

  const findings = [];

  if (network_result?.failed_requests?.length > 0) {
    findings.push({ severity: "error", category: "network",
                    message: `${network_result.failed_requests.length} failed network request(s)`,
                    detail: network_result.failed_requests });
  }
  if (console_result?.console_errors?.length > 0) {
    findings.push({ severity: "error", category: "console",
                    message: `${console_result.console_errors.length} console error(s)`,
                    detail: console_result.console_errors });
  }
  if (dom_map?.in_dom_not_db?.length > 0) {
    findings.push({ severity: "warning", category: "cms_mapping",
                    message: `${dom_map.in_dom_not_db.length} DOM section(s) not in D1`,
                    detail: dom_map.in_dom_not_db });
  }
  if (dom_map?.in_db_not_dom?.length > 0) {
    findings.push({ severity: "info", category: "cms_mapping",
                    message: `${dom_map.in_db_not_dom.length} D1 section(s) not rendered in DOM`,
                    detail: dom_map.in_db_not_dom });
  }
  if (accessibility?.violations?.length > 0) {
    findings.push({ severity: "warning", category: "accessibility",
                    message: `${accessibility.violations.length} accessibility violation(s)`,
                    detail: accessibility.violations });
  }
  if (asset_resolution?.broken_assets?.length > 0) {
    findings.push({ severity: "error", category: "assets",
                    message: `${asset_resolution.broken_assets.length} broken asset(s)`,
                    detail: asset_resolution.broken_assets });
  }
  if (cache_probe && cache_probe.misses > 0) {
    findings.push({ severity: "info", category: "cache",
                    message: `${cache_probe.misses} KV cache miss(es)`,
                    detail: cache_probe.results?.filter(r => !r.hit) });
  }

  const error_count    = findings.filter(f => f.severity === "error").length;
  const warning_count  = findings.filter(f => f.severity === "warning").length;
  const actionable_count = error_count + warning_count;

  return {
    page_route,
    generated_at:    new Date().toISOString(),
    overall_status:  error_count > 0 ? "fail" : warning_count > 0 ? "warn" : "pass",
    error_count,
    warning_count,
    info_count:      findings.filter(f => f.severity === "info").length,
    actionable_count,
    findings,
    repair_recommended: actionable_count > 0,
    summary: `${findings.length} finding(s): ${error_count} errors, ${warning_count} warnings.`,
  };
}

// ── 10. Repair Patch Writer ───────────────────────────────────────────────────
async function toolRepairPatch(env, params) {
  const { page_route, findings = [], agent_run_id } = params;
  if (!page_route) return { error: "page_route required" };

  // Build a structured cms_patch from actionable findings
  const patches = [];

  for (const f of findings.filter(f => f.severity === "error" || f.severity === "warning")) {
    if (f.category === "cms_mapping" && f.detail) {
      for (const section_key of (f.detail || [])) {
        patches.push({ section_key, action: "review", reason: f.message });
      }
    }
  }

  const patch = {
    type:        "cms_patch",
    page_route,
    source:      "primetech_inspect_protocol",
    agent_run_id: agent_run_id || null,
    generated_at: new Date().toISOString(),
    changes:     patches,
    requires_approval: true,
    note: "This patch was generated by the PrimeTech inspect protocol. Review before applying.",
  };

  // Write to agentsam_artifacts or cms_revisions as a pending patch
  await env.DB.prepare(`
    INSERT INTO agentsam_rules_document
      (id, user_id, workspace_id, title, body_markdown, version, is_active, apply_mode, source)
    VALUES (?, 'agentsam', ?, ?, ?, 1, 0, 'manual', 'primetech_inspect')
  `).bind(
    "patch_" + uid(),
    "ws_companionscpas",
    `Repair Patch — ${page_route} — ${new Date().toISOString().slice(0,10)}`,
    "```json\n" + JSON.stringify(patch, null, 2) + "\n```"
  ).run().catch(e => console.warn("[tools] repair patch write failed:", e.message));

  return { patch, written: true };
}

// ── 11. KV Bust ───────────────────────────────────────────────────────────────
async function toolKvBust(env, params) {
  if (!env.CMS_CACHE) return { error: "CMS_CACHE binding not available" };
  const { keys = [], namespace } = params;

  const toDelete = [...keys];
  if (namespace === "brand")     toDelete.push(KV_PREFIXES.brand);
  if (namespace === "nav")       toDelete.push(KV_PREFIXES.nav);
  if (namespace === "bootstrap") toDelete.push(KV_PREFIXES.bootstrap);
  if (namespace === "all") {
    toDelete.push(KV_PREFIXES.brand, KV_PREFIXES.nav,
                  KV_PREFIXES.bootstrap, KV_PREFIXES.page("/"));
  }

  const results = await Promise.all(
    [...new Set(toDelete)].map(async key => {
      try {
        await env.CMS_CACHE.delete(key);
        return { key, deleted: true };
      } catch (e) {
        return { key, deleted: false, error: e.message };
      }
    })
  );

  return { keys_deleted: results.filter(r => r.deleted).length, results };
}

// ── 12. KV Prime ──────────────────────────────────────────────────────────────
async function toolKvPrime(env, params) {
  if (!env.CMS_CACHE) return { error: "CMS_CACHE binding not available" };
  const results = [];

  // Prime brand settings
  try {
    const brand = await env.DB.prepare(
      `SELECT * FROM cms_brand_settings WHERE tenant_id = ? LIMIT 1`
    ).bind(TENANT).first();
    if (brand) {
      await env.CMS_CACHE.put(KV_PREFIXES.brand, JSON.stringify(brand), { expirationTtl: 60 });
      results.push({ key: KV_PREFIXES.brand, primed: true });
    }
  } catch (e) {
    results.push({ key: KV_PREFIXES.brand, primed: false, error: e.message });
  }

  // Prime nav items
  try {
    const nav = await env.DB.prepare(
      `SELECT * FROM cms_navigation_items WHERE tenant_id = ? AND is_visible = 1
       ORDER BY sort_order`
    ).bind(TENANT).all();
    await env.CMS_CACHE.put(KV_PREFIXES.nav, JSON.stringify(nav.results || []), { expirationTtl: 60 });
    results.push({ key: KV_PREFIXES.nav, primed: true });
  } catch (e) {
    results.push({ key: KV_PREFIXES.nav, primed: false, error: e.message });
  }

  return { keys_primed: results.filter(r => r.primed).length, results };
}

// ── 13. Diff Sections ─────────────────────────────────────────────────────────
async function toolDiffSections(env, params) {
  const { page_route = "/" } = params;

  const [current, published] = await Promise.all([
    env.DB.prepare(
      `SELECT section_key, heading, subheading, body, image_url, cta_label, cta_href,
              sort_order, is_visible, updated_at
       FROM cms_page_sections WHERE page_route = ? ORDER BY sort_order`
    ).bind(page_route).all().then(r => r.results || []),

    env.DB.prepare(
      `SELECT sections_json FROM cms_page_versions
       WHERE page_id = (SELECT id FROM cms_pages WHERE route_path = ? LIMIT 1)
       AND status = 'published' ORDER BY version_num DESC LIMIT 1`
    ).bind(page_route).first(),
  ]);

  const publishedSections = published?.sections_json
    ? JSON.parse(published.sections_json)
    : [];

  const diffs = [];
  for (const cur of current) {
    const pub = publishedSections.find(s => s.section_key === cur.section_key);
    if (!pub) {
      diffs.push({ section_key: cur.section_key, type: "new", before: null, after: cur });
      continue;
    }
    const changed_fields = [];
    for (const field of ["heading","subheading","body","image_url","cta_label","cta_href","is_visible"]) {
      if (cur[field] !== pub[field]) {
        changed_fields.push({ field, before: pub[field], after: cur[field] });
      }
    }
    if (changed_fields.length > 0) {
      diffs.push({ section_key: cur.section_key, type: "modified", changes: changed_fields });
    }
  }

  return {
    page_route,
    has_published_snapshot: !!published,
    sections_current:  current.length,
    sections_published: publishedSections.length,
    diffs,
    diff_count: diffs.length,
    is_clean: diffs.length === 0,
  };
}

// ── 14. Load Section Schema ───────────────────────────────────────────────────
async function toolLoadSchema(env, params) {
  const { section_type } = params;
  if (!section_type) return { error: "section_type required" };

  const schema = await env.DB.prepare(
    `SELECT section_type, label, category, schema_json, default_json
     FROM cms_section_schemas WHERE section_type = ? AND is_active = 1 LIMIT 1`
  ).bind(section_type).first();

  if (!schema) return { error: `No schema found for section_type: ${section_type}`, section_type };

  return {
    section_type,
    label:        schema.label,
    category:     schema.category,
    schema:       JSON.parse(schema.schema_json  || "{}"),
    defaults:     JSON.parse(schema.default_json || "{}"),
  };
}

// ── 15. Write Revision ────────────────────────────────────────────────────────
async function toolWriteRevision(env, params) {
  const { entity_type, entity_id, page_id, change_type, field_changed,
          before_json, after_json, summary, created_by } = params;

  if (!entity_type || !entity_id) return { error: "entity_type and entity_id required" };

  const id = "rev_" + uid();
  await env.DB.prepare(`
    INSERT INTO cms_revisions
      (id, tenant_id, entity_type, entity_id, page_id, change_type,
       field_changed, before_json, after_json, summary, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, TENANT, entity_type, entity_id, page_id || null,
    change_type || "update", field_changed || null,
    before_json ? JSON.stringify(before_json) : null,
    after_json  ? JSON.stringify(after_json)  : null,
    summary || null, created_by || "agentsam"
  ).run();

  return { id, entity_type, entity_id, change_type, written: true };
}

// ── 16. Create Publish Job ────────────────────────────────────────────────────
async function toolCreatePublishJob(env, params) {
  const { page_id, job_type = "page", triggered_by, version_id } = params;

  const id = "pub_" + uid();
  await env.DB.prepare(`
    INSERT INTO cms_publish_jobs
      (id, tenant_id, page_id, job_type, status, triggered_by, version_id)
    VALUES (?, ?, ?, ?, 'pending', ?, ?)
  `).bind(id, TENANT, page_id || null, job_type, triggered_by || "agentsam", version_id || null)
   .run();

  return { id, job_type, status: "pending", created: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTER
// ─────────────────────────────────────────────────────────────────────────────

const TOOL_ROUTES = {
  "browser/inspect":      toolBrowserInspect,
  "browser/console":      toolBrowserConsole,
  "browser/network":      toolBrowserNetwork,
  "browser/snapshot":     toolVisualSnapshot,
  "cms/dom_section_map":  toolDomSectionMap,
  "cms/accessibility":    toolAccessibilitySmoke,
  "cms/asset_resolution": toolAssetResolution,
  "cms/cache_probe":      toolCacheProbe,
  "cms/inspect_report":   toolInspectReport,
  "cms/repair_patch":     toolRepairPatch,
  "cms/kv_bust":          toolKvBust,
  "cms/kv_prime":         toolKvPrime,
  "cms/diff":             toolDiffSections,
  "cms/schema":           toolLoadSchema,
  "cms/revision":         toolWriteRevision,
  "cms/publish_job":      toolCreatePublishJob,
};

export async function writeToolChain(env, {
  agentRunId,
  sessionId = null,
  chainIndex = null,
  toolKey,
  inputArgs = {},
}) {
  const chainId = "tc_" + uid();
  try {
    await env.DB.prepare(`
      INSERT INTO agentsam_tool_chain
        (id, tenant_id, agent_run_id, session_id, tool_key, tool_name, chain_index, input_args_json, status, latency_ms)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      chainId,
      TENANT,
      agentRunId || null,
      sessionId,
      toolKey || "unknown_tool",
      toolKey || "unknown_tool",
      Number.isFinite(Number(chainIndex)) ? Number(chainIndex) : null,
      JSON.stringify(inputArgs || {}),
      "running",
      0
    ).run();
  } catch (e) {
    // Compatibility helper: chain logging should never block execution.
    console.warn("[tools] writeToolChain failed:", e.message);
  }
  return chainId;
}

export async function resolveToolChain(env, {
  chainId,
  outputJson = {},
  status = "completed",
  latencyMs = 0,
  errorMsg = null,
}) {
  if (!chainId) return;
  try {
    await env.DB.prepare(`
      UPDATE agentsam_tool_chain
      SET output_json = ?, status = ?, latency_ms = ?, error_message = ?, resolved_at = datetime('now')
      WHERE id = ?
    `).bind(
      JSON.stringify(outputJson || {}),
      status || "completed",
      Number(latencyMs || 0),
      errorMsg || null,
      chainId
    ).run();
  } catch (e) {
    console.warn("[tools] resolveToolChain failed:", e.message);
  }
}

export async function executeTool(env, toolName, args = {}) {
  try {
    switch (toolName) {
      case "list_tables": {
        const rows = await env.DB.prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '_cf_%' ORDER BY name"
        ).all().catch(() => ({ results: [] }));
        const tables = rows.results || [];
        return { success: true, table_count: tables.length, tables: tables.map((t) => t.name) };
      }
      case "query_database": {
        const sql = String(args?.sql || "");
        if (!isSafeRead(sql)) {
          return { success: false, error: "Query blocked — only safe SELECT statements are allowed." };
        }
        const safeSql = /\bLIMIT\s+\d+\b/i.test(sql) ? sql : `${sql.trim().replace(/;$/, "")} LIMIT 50`;
        const result = await env.DB.prepare(safeSql).all().catch((e) => ({ error: e.message }));
        if (result.error) return { success: false, error: result.error };
        return {
          success: true,
          description: args?.description || "",
          row_count: result.results?.length || 0,
          rows: result.results || [],
        };
      }
      case "write_database": {
        const sql = String(args?.sql || "");
        if (!isApprovedWrite(sql)) {
          return { success: false, error: "This operation is blocked for safety." };
        }
        return {
          success: true,
          approval_required: true,
          action_type: "db_write",
          sql,
          description: String(args?.description || ""),
          impact: String(args?.impact || ""),
        };
      }
      case "get_cms_page": {
        const slug = String(args?.page_slug || "").trim();
        if (!slug) return { success: false, error: "page_slug required" };
        const page = await env.DB.prepare(
          "SELECT * FROM cms_pages WHERE tenant_id = ? AND slug = ? LIMIT 1"
        ).bind(TENANT, slug).first().catch(() => null);
        if (!page) return { success: false, error: `Page '${slug}' not found.` };
        const route = page.route_path || (slug === "home" ? "/" : `/${slug}`);
        const [sections, blocks] = await Promise.all([
          env.DB.prepare(
            "SELECT * FROM cms_page_sections WHERE tenant_id = ? AND page_route = ? ORDER BY sort_order, section_key"
          ).bind(TENANT, route).all().catch(() => ({ results: [] })),
          env.DB.prepare(
            "SELECT * FROM cms_page_content_blocks WHERE tenant_id = ? AND page_route = ? ORDER BY sort_order, section_key, block_key"
          ).bind(TENANT, route).all().catch(() => ({ results: [] })),
        ]);
        return { success: true, page, sections: sections.results || [], blocks: blocks.results || [] };
      }
      case "update_cms_section": {
        return {
          success: true,
          approval_required: true,
          action_type: "cms_edit",
          section_id: args?.section_id,
          field: args?.field,
          current_value: args?.current_value || "",
          proposed_value: args?.proposed_value,
          reason: args?.reason || "",
        };
      }
      case "d1_query": {
        const sql = String(args?.sql || "");
        if (!isSafeRead(sql)) {
          return { success: false, error: "Query blocked — only safe SELECT statements are allowed." };
        }
        const safeSql = /\bLIMIT\s+\d+\b/i.test(sql) ? sql : `${sql.trim().replace(/;$/, "")} LIMIT 50`;
        const result = await env.DB.prepare(safeSql).all().catch((e) => ({ error: e.message }));
        if (result.error) return { success: false, error: result.error };
        return {
          success: true,
          description: args?.description || "",
          row_count: result.results?.length || 0,
          rows: result.results || [],
        };
      }
      case "d1_write": {
        const sql = String(args?.sql || "");
        if (!isApprovedWrite(sql)) {
          return { success: false, error: "This operation is blocked for safety." };
        }
        return {
          success: true,
          approval_required: true,
          action_type: "d1_write",
          sql,
          description: String(args?.description || ""),
          impact: String(args?.impact || ""),
        };
      }
      case "d1_schema": {
        const table = String(args?.table || "").trim();
        if (!table) {
          const rows = await env.DB.prepare(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '_cf_%' ORDER BY name"
          ).all().catch(() => ({ results: [] }));
          return { success: true, tables: (rows.results || []).map((t) => t.name) };
        }
        if (!/^[a-zA-Z0-9_]+$/.test(table)) {
          return { success: false, error: "Invalid table name." };
        }
        const cols = await env.DB.prepare(`PRAGMA table_info(${table})`).all().catch((e) => ({ error: e.message }));
        if (cols.error) return { success: false, error: cols.error };
        return { success: true, table, columns: cols.results || [] };
      }
      case "r2_list": {
        if (!env.WEBSITE_ASSETS) return { success: false, error: "WEBSITE_ASSETS binding not available." };
        const prefix = String(args?.prefix || "");
        const limit = Math.min(Math.max(Number(args?.limit) || 50, 1), 200);
        const listed = await env.WEBSITE_ASSETS.list({ prefix, limit }).catch((e) => ({ error: e.message }));
        if (listed.error) return { success: false, error: listed.error };
        const objects = (listed.objects || []).map((o) => ({
          key: o.key,
          size: o.size,
          etag: o.etag,
          uploaded: o.uploaded,
        }));
        return { success: true, prefix, count: objects.length, objects };
      }
      case "r2_get": {
        if (!env.WEBSITE_ASSETS) return { success: false, error: "WEBSITE_ASSETS binding not available." };
        const key = String(args?.key || "").trim();
        if (!key) return { success: false, error: "key is required." };
        if (!isTextR2Key(key)) {
          return { success: false, error: "Binary or unsupported file type — use r2_head for metadata only." };
        }
        const obj = await env.WEBSITE_ASSETS.get(key).catch((e) => ({ error: e.message }));
        if (obj?.error) return { success: false, error: obj.error };
        if (!obj) return { success: false, error: `Object not found: ${key}` };
        const contentType = obj.httpMetadata?.contentType || "text/plain";
        if (/^(image|font|video|audio|application\/octet-stream)/i.test(contentType)) {
          return { success: false, error: "Binary content-type — use r2_head instead." };
        }
        const text = await obj.text();
        return {
          success: true,
          key,
          size: obj.size,
          content_type: contentType,
          content: text.slice(0, 50000),
          truncated: text.length > 50000,
        };
      }
      case "r2_head": {
        if (!env.WEBSITE_ASSETS) return { success: false, error: "WEBSITE_ASSETS binding not available." };
        const key = String(args?.key || "").trim();
        if (!key) return { success: false, error: "key is required." };
        const meta = await env.WEBSITE_ASSETS.head(key).catch((e) => ({ error: e.message }));
        if (meta?.error) return { success: false, error: meta.error };
        if (!meta) return { success: false, error: `Object not found: ${key}` };
        return {
          success: true,
          key,
          size: meta.size,
          etag: meta.etag,
          uploaded: meta.uploaded,
          http_metadata: meta.httpMetadata || {},
          custom_metadata: meta.customMetadata || {},
        };
      }
      case "r2_put": {
        if (!env.WEBSITE_ASSETS) return { success: false, error: "WEBSITE_ASSETS binding not available." };
        const key = String(args?.key || "").trim();
        const body = String(args?.body ?? "");
        if (!key) return { success: false, error: "key is required." };
        if (isProtectedR2Path(key, args?.allow_sensitive)) {
          return { success: false, error: "Protected path — set allow_sensitive:true to propose changes." };
        }
        return {
          success: true,
          approval_required: true,
          action_type: "r2_put",
          key,
          body,
          content_type: String(args?.content_type || "text/html; charset=utf-8"),
          description: String(args?.description || ""),
        };
      }
      case "r2_delete": {
        if (!env.WEBSITE_ASSETS) return { success: false, error: "WEBSITE_ASSETS binding not available." };
        const key = String(args?.key || "").trim();
        if (!key) return { success: false, error: "key is required." };
        return {
          success: true,
          approval_required: true,
          action_type: "r2_delete",
          key,
          description: String(args?.description || ""),
          impact: String(args?.impact || ""),
        };
      }
      case "kv_get": {
        if (!env.CMS_CACHE) return { success: false, error: "CMS_CACHE binding not available." };
        const key = String(args?.key || "").trim();
        if (!key) return { success: false, error: "key is required." };
        const value = await env.CMS_CACHE.get(key).catch((e) => ({ error: e.message }));
        if (value?.error) return { success: false, error: value.error };
        return { success: true, key, value: value ?? null, hit: value !== null };
      }
      case "kv_list": {
        if (!env.CMS_CACHE) return { success: false, error: "CMS_CACHE binding not available." };
        const prefix = String(args?.prefix || "");
        const limit = Math.min(Math.max(Number(args?.limit) || 50, 1), 200);
        const listed = await env.CMS_CACHE.list({ prefix, limit }).catch((e) => ({ error: e.message }));
        if (listed.error) return { success: false, error: listed.error };
        const keys = (listed.keys || []).map((k) => k.name);
        return { success: true, prefix, count: keys.length, keys };
      }
      case "kv_delete": {
        if (!env.CMS_CACHE) return { success: false, error: "CMS_CACHE binding not available." };
        const key = String(args?.key || "").trim();
        if (!key) return { success: false, error: "key is required." };
        return {
          success: true,
          approval_required: true,
          action_type: "kv_delete",
          key,
          description: String(args?.description || ""),
          impact: String(args?.impact || ""),
        };
      }
      default: {
        const routeKey = String(toolName || "").replace(/_/g, "/");
        const handler = TOOL_ROUTES[toolName] || TOOL_ROUTES[routeKey];
        if (!handler) return { success: false, error: `Unknown tool: ${toolName}` };
        const result = await handler(env, args || {});
        if (result?.error) return { success: false, ...result };
        return { success: true, ...result };
      }
    }
  } catch (err) {
    return { success: false, error: `Tool execution failed: ${err?.message || err}` };
  }
}

export async function agentsamToolsRoutes(request, env, url) {
  if (!url.pathname.startsWith("/api/agentsam/tools/")) return null;

  const toolPath = url.pathname.replace("/api/agentsam/tools/", "");
  const handler  = TOOL_ROUTES[toolPath];

  if (!handler) {
    return json({ error: "Unknown tool", tool_path: toolPath,
                  available: Object.keys(TOOL_ROUTES) }, 404);
  }

  const t0 = Date.now();
  let params = {};

  try {
    if (request.method === "POST") {
      const ct = request.headers.get("content-type") || "";
      params = ct.includes("application/json")
        ? await request.json()
        : Object.fromEntries(new URL(request.url).searchParams);
    } else {
      params = Object.fromEntries(url.searchParams);
    }
  } catch (e) {
    return json({ error: "Failed to parse request body: " + e.message }, 400);
  }

  const tool_key = toolPath.replace("/", "_");

  try {
    const result      = await handler(env, params);
    const duration_ms = Date.now() - t0;

    // Log to tool_chain if agent_run_id provided
    await logToolChain(env, {
      agent_run_id: params.agent_run_id,
      session_id:   params.session_id,
      tool_key,
      input:        params,
      output:       result,
      status:       result?.error ? "failed" : "completed",
      latency_ms:   duration_ms,
    });

    if (result?.error) {
      return json(err(tool_key, result.error, duration_ms), 400);
    }
    return json(ok(tool_key, result, duration_ms));

  } catch (e) {
    const duration_ms = Date.now() - t0;
    console.error(`[tools] ${tool_key} threw:`, e.message);
    await logToolChain(env, {
      agent_run_id: params.agent_run_id,
      tool_key, input: params, output: { error: e.message },
      status: "failed", latency_ms: duration_ms,
    });
    return json(err(tool_key, e.message, duration_ms), 500);
  }
}
