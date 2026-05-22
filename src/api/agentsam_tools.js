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

// ── Local response helper (agentsam_api.js does not export json) ─────────────
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
      headers: { "User-Agent": "PrimeTech-Inspector/1.0 (+https://companionscpas.meauxbility.workers.dev)" },
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
    fetch(url || `https://companionscpas.meauxbility.workers.dev${route}`)
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
