import { renderPage } from "./render_page.js";
import {
  isFragmentPageRoute,
  ensureFragmentPageSections,
  syncFragmentPageToR2,
  previewFragmentPageFromCms,
  publishFragmentPageFromCms,
  upsertFragmentPageDefaults,
  getFragmentSectionKeys,
  normalizeFragmentRoute,
} from "./page_cms_registry.js";
import { getAuthUser } from "./session_api.js";
const TENANT_ID = "tenant_companionscpas";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

function id(prefix = "cms") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

async function body(request) {
  try { return await request.json(); } catch { return {}; }
}

function safeJson(value, fallback) {
  try { return JSON.parse(value || ""); } catch { return fallback; }
}


async function syncFragmentCmsToR2(env, route) {
  return syncFragmentPageToR2(env, normalizeFragmentRoute(route));
}

async function bustCache(env, ...keys) {
  if (!env.CMS_CACHE) return;
  await Promise.all(keys.map(k => env.CMS_CACHE.delete(k).catch(() => {})));
}

async function requireCmsUser(request, env, sessionUser = null) {
  if (sessionUser) return sessionUser;
  try {
    return await getAuthUser(request, env);
  } catch (err) {
    console.warn("[cms/auth] getAuthUser failed:", err?.message || err);
    return null;
  }
}

function normalizeRouteInput(route) {
  const raw = String(route || "").trim();
  if (!raw) return "";
  let normalized = raw.replace(/\/+/g, "/");
  if (!normalized.startsWith("/")) normalized = `/${normalized}`;
  normalized = normalized.replace(/\/+/g, "/");
  if (normalized.length > 1) normalized = normalized.replace(/\/+$/, "");
  return normalized || "/";
}

async function tableColumns(env, tableName) {
  const exists = await env.DB.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name=? LIMIT 1"
  ).bind(tableName).first().catch(() => null);
  if (!exists) return null;
  const { results } = await env.DB.prepare(`PRAGMA table_info(${tableName})`).all().catch(() => ({ results: [] }));
  const cols = new Set((results || []).map((row) => row?.name).filter(Boolean));
  return cols.size ? cols : null;
}

async function createPublishJob(env, routePath, triggeredBy) {
  const cols = await tableColumns(env, "cms_publish_jobs").catch(() => null);
  if (!cols) return null;

  const jobId = id("pub");
  const now = new Date().toISOString();
  const values = {
    id: jobId,
    tenant_id: TENANT_ID,
    page_id: null,
    route_path: routePath,
    page_route: routePath,
    job_type: "page",
    status: "running",
    triggered_by: triggeredBy,
    created_by: triggeredBy,
    created_at: now,
    updated_at: now,
    started_at: now,
  };

  const insertCols = [];
  const placeholders = [];
  const binds = [];
  for (const [key, value] of Object.entries(values)) {
    if (!cols.has(key)) continue;
    insertCols.push(key);
    placeholders.push("?");
    binds.push(value);
  }
  if (!insertCols.length) return null;

  try {
    await env.DB.prepare(
      `INSERT INTO cms_publish_jobs (${insertCols.join(", ")}) VALUES (${placeholders.join(", ")})`
    ).bind(...binds).run();
    return jobId;
  } catch (err) {
    console.warn("[cms/publish] unable to create cms_publish_jobs row:", err?.message || err);
    return null;
  }
}

const PUBLIC_PAGE_ROUTES = ["/", "/about", "/services", "/adopt", "/community", "/donate"];

function pageArtifactKey(route) {
  const normalized = normalizeRouteInput(route);
  return normalized === "/" ? "static/pages/index.html" : `static/pages${normalized}/index.html`;
}

async function publishPageRoute(env, route, triggeredBy) {
  const normalizedRoute = normalizeRouteInput(route);
  if (!normalizedRoute) {
    return { success: false, route_path: route, error: "Invalid route" };
  }

  await bustCache(env, `page:${normalizedRoute}`);

  const jobId = await createPublishJob(env, normalizedRoute, triggeredBy);
  const artifactKey = pageArtifactKey(normalizedRoute);

  await env.DB.prepare(`
    UPDATE cms_pages
    SET status = 'published',
        published_at = datetime('now'),
        updated_at = datetime('now'),
        published_by = ?
    WHERE tenant_id = ? AND route_path = ?
  `).bind(triggeredBy, TENANT_ID, normalizedRoute).run();

  try {
    if (normalizedRoute === "/" || isFragmentPageRoute(normalizedRoute)) {
      const published = await publishFragmentPageFromCms(env, normalizedRoute, jobId || `pub_${Date.now()}`);
      await updatePublishJob(env, jobId, "done", {
        artifactPath: published.artifact_key,
        resultJson: { success: true, route_path: normalizedRoute, artifact_key: published.artifact_key, source: "fragment_cms_sync" },
      });
      return {
        success: true,
        route_path: normalizedRoute,
        job_id: jobId,
        artifact_key: published.artifact_key,
        source: "fragment_cms_sync",
      };
    }

    await renderPage(normalizedRoute, jobId || `pub_${Date.now()}`, env);
    await updatePublishJob(env, jobId, "done", {
      artifactPath: artifactKey,
      resultJson: { success: true, route_path: normalizedRoute, artifact_key: artifactKey },
    });
    return {
      success: true,
      route_path: normalizedRoute,
      job_id: jobId,
      artifact_key: artifactKey,
    };
  } catch (err) {
    const message = err?.message || String(err);
    await updatePublishJob(env, jobId, "failed", { error: message });
    return {
      success: false,
      route_path: normalizedRoute,
      job_id: jobId,
      error: message,
    };
  }
}

async function updatePublishJob(env, jobId, status, extras = {}) {
  if (!jobId) return;
  const cols = await tableColumns(env, "cms_publish_jobs").catch(() => null);
  if (!cols) return;

  const now = new Date().toISOString();
  const values = {
    status,
    updated_at: now,
    completed_at: status === "done" ? now : null,
    finished_at: status === "done" ? now : null,
    failed_at: status === "failed" ? now : null,
    error: extras.error || null,
    error_message: extras.error || null,
    artifact_path: extras.artifactPath || null,
    result_json: extras.resultJson ? JSON.stringify(extras.resultJson) : null,
  };

  const updates = [];
  const binds = [];
  for (const [key, value] of Object.entries(values)) {
    if (!cols.has(key)) continue;
    updates.push(`${key} = ?`);
    binds.push(value);
  }
  if (!updates.length) return;

  await env.DB.prepare(
    `UPDATE cms_publish_jobs SET ${updates.join(", ")} WHERE id = ?`
  ).bind(...binds, jobId).run().catch((err) => {
    console.warn("[cms/publish] unable to update cms_publish_jobs row:", err?.message || err);
  });
}

export async function cmsRoutes(request, env, url, sessionUser = null) {
  const path = url.pathname;
  const method = request.method;

  if (path === "/api/cms/modal/foster_cta" && method === "GET") {
    const row = await env.DB.prepare(`
      SELECT modal_key, title, subtitle, body, cta_label, cta_href, cta_action, image_url, config_json
      FROM cms_modals
      WHERE tenant_id = ? AND modal_key IN ('foster_cta', 'modal_foster_cta') AND is_active = 1
      ORDER BY CASE modal_key WHEN 'foster_cta' THEN 0 ELSE 1 END
      LIMIT 1
    `).bind(TENANT_ID).first().catch(() => null);

    if (!row) return json({ success: false, error: "Foster modal not found" }, 404);
    return json({
      success: true,
      modal: {
        modal_key: row.modal_key,
        title: row.title || "",
        subtitle: row.subtitle || "",
        body: row.body || "",
        cta_label: row.cta_label || "Start Application",
        cta_href: row.cta_href || "/services",
        cta_action: row.cta_action || "href",
        image_url: row.image_url || "",
        config: safeJson(row.config_json, {}),
      }
    });
  }

  if (!env.DB) return json({ error: "DB binding missing" }, 500);

  if (path === "/api/cms/bootstrap" && method === "GET") {
    const [pages, assets, brand, nav, themes] = await Promise.all([
      env.DB.prepare("SELECT * FROM cms_pages WHERE tenant_id = ? ORDER BY sort_order, route_path").bind(TENANT_ID).all().catch(() => ({ results: [] })),
      env.DB.prepare("SELECT * FROM cms_assets WHERE tenant_id = ? AND status != 'archived' ORDER BY updated_at DESC, created_at DESC LIMIT 200").bind(TENANT_ID).all().catch(() => ({ results: [] })),
      env.DB.prepare("SELECT * FROM cms_brand_settings WHERE tenant_id = ? LIMIT 1").bind(TENANT_ID).first().catch(() => null),
      env.DB.prepare("SELECT * FROM cms_navigation_items WHERE tenant_id = ? ORDER BY sort_order, label").bind(TENANT_ID).all().catch(() => ({ results: [] })),
      env.DB.prepare("SELECT * FROM cms_themes WHERE tenant_id = ? ORDER BY is_active DESC, updated_at DESC LIMIT 20").bind(TENANT_ID).all().catch(() => ({ results: [] })),
    ]);

    return json({
      success: true,
      tenant_id: TENANT_ID,
      pages: pages.results || [],
      assets: assets.results || [],
      brand,
      nav: nav.results || [],
      themes: themes.results || []
    });
  }

  if (path === "/api/cms/page" && method === "GET") {
    const route = url.searchParams.get("route") || "/";
    if (isFragmentPageRoute(route)) await ensureFragmentPageSections(env, route);

    const page = await env.DB.prepare("SELECT * FROM cms_pages WHERE tenant_id = ? AND route_path = ? LIMIT 1")
      .bind(TENANT_ID, route).first();

    if (!page) return json({ error: "Page not found", route }, 404);

    const sections = await env.DB.prepare("SELECT * FROM cms_page_sections WHERE tenant_id = ? AND page_route = ? ORDER BY sort_order, section_key")
      .bind(TENANT_ID, route).all().catch(() => ({ results: [] }));

    const blocks = await env.DB.prepare("SELECT * FROM cms_page_content_blocks WHERE tenant_id = ? AND page_route = ? ORDER BY sort_order, section_key, block_key")
      .bind(TENANT_ID, route).all().catch(() => ({ results: [] }));

    let sectionResults = sections.results || [];
    const fragmentKeys = getFragmentSectionKeys(route);
    if (fragmentKeys.length) {
      sectionResults = sectionResults.filter((s) => fragmentKeys.includes(s.section_key));
    }

    return json({ success: true, page, sections: sectionResults, blocks: blocks.results || [] });
  }

  if (path === "/api/cms/page/bootstrap" && method === "POST") {
    const cmsUser = await requireCmsUser(request, env, sessionUser);
    if (!cmsUser) return json({ success: false, error: "Not authenticated" }, 401);

    const data = await body(request);
    const route = normalizeFragmentRoute(data.route_path || "/");
    const force = data.force === true;

    if (!isFragmentPageRoute(route)) {
      return json({ success: false, error: "Route is not a fragment-managed page", route_path: route }, 400);
    }

    await upsertFragmentPageDefaults(env, route, force);
    const fragmentSync = await syncFragmentCmsToR2(env, route);
    return json({ success: true, route_path: route, force, fragment_sync: fragmentSync });
  }

  if (path === "/api/cms/home/bootstrap" && method === "POST") {
    const cmsUser = await requireCmsUser(request, env, sessionUser);
    if (!cmsUser) return json({ success: false, error: "Not authenticated" }, 401);
    const data = await body(request);
    const force = data.force === true;
    await upsertFragmentPageDefaults(env, "/", force);
    const fragmentSync = await syncFragmentCmsToR2(env, "/");
    return json({ success: true, route_path: "/", force, fragment_sync: fragmentSync });
  }

  if (path === "/api/cms/preview" && method === "GET") {
    const cmsUser = await requireCmsUser(request, env, sessionUser);
    if (!cmsUser) return json({ success: false, error: "Not authenticated" }, 401);

    const route = normalizeRouteInput(url.searchParams.get("route") || "/");
    if (!route) return json({ success: false, error: "route required" }, 400);

    try {
      if (isFragmentPageRoute(route)) {
        const html = await previewFragmentPageFromCms(env, route);
        if (!html) return json({ success: false, error: "Preview assembly failed", route }, 500);
        return new Response(html, {
          status: 200,
          headers: {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "no-store",
          },
        });
      }

      const html = await renderPage(route, `preview_${Date.now()}`, env, {
        persist: false,
        includeHidden: true,
      });
      return new Response(html, {
        status: 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
        },
      });
    } catch (err) {
      return json({ success: false, error: err?.message || "Preview render failed" }, 500);
    }
  }

  if (path === "/api/cms/section/save" && method === "POST") {
    const cmsUser = await requireCmsUser(request, env, sessionUser);
    if (!cmsUser) return json({ success: false, error: "Not authenticated" }, 401);

    const data = await body(request);
    const section = data.section || data;

    const page_route = section.page_route || data.page_route || "/";
    const section_key = section.section_key || data.section_key || id("section");

    await env.DB.prepare(`
      INSERT INTO cms_page_sections
      (id, tenant_id, page_route, section_key, section_type, eyebrow, heading, subheading, body,
       image_url, cta_label, cta_href, cta_secondary_label, cta_secondary_href, sort_order,
       is_visible, config_json, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(tenant_id, page_route, section_key) DO UPDATE SET
        section_type = excluded.section_type,
        eyebrow = excluded.eyebrow,
        heading = excluded.heading,
        subheading = excluded.subheading,
        body = excluded.body,
        image_url = excluded.image_url,
        cta_label = excluded.cta_label,
        cta_href = excluded.cta_href,
        cta_secondary_label = excluded.cta_secondary_label,
        cta_secondary_href = excluded.cta_secondary_href,
        sort_order = excluded.sort_order,
        is_visible = excluded.is_visible,
        config_json = excluded.config_json,
        updated_at = datetime('now')
    `).bind(
      section.id || id("section"),
      TENANT_ID,
      page_route,
      section_key,
      section.section_type || "content",
      section.eyebrow || "",
      section.heading || section.title || "",
      section.subheading || "",
      section.body || "",
      section.image_url || "",
      section.cta_label || "",
      section.cta_href || "",
      section.cta_secondary_label || "",
      section.cta_secondary_href || "",
      Number(section.sort_order || 50),
      section.is_visible === 0 ? 0 : 1,
      typeof section.config_json === "string" ? section.config_json : JSON.stringify(section.config_json || {})
    ).run();

    await env.DB.prepare("UPDATE cms_pages SET status = 'draft', updated_at = datetime('now') WHERE tenant_id = ? AND route_path = ?")
      .bind(TENANT_ID, page_route).run().catch(() => {});

    await bustCache(env, `sections:${TENANT_ID}:${page_route}`, `bootstrap:${TENANT_ID}`);

    let fragmentSync = null;
    if (isFragmentPageRoute(page_route)) {
      fragmentSync = await syncFragmentCmsToR2(env, page_route);
    }

    return json({ success: true, page_route, section_key, fragment_sync: fragmentSync });
  }

  if (path === "/api/cms/block/save" && method === "POST") {
    const cmsUser = await requireCmsUser(request, env, sessionUser);
    if (!cmsUser) return json({ success: false, error: "Not authenticated" }, 401);

    const data = await body(request);
    const block = data.block || data;

    const page_route = block.page_route || data.page_route || "/";
    const section_key = block.section_key || data.section_key || "main";
    const block_key = block.block_key || data.block_key || id("block");

    await env.DB.prepare(`
      INSERT INTO cms_page_content_blocks
      (id, tenant_id, page_route, section_key, block_key, block_type, eyebrow, title, subtitle, body,
       image_url, alt_text, href, action_label, action_type, action_value, sort_order, is_visible,
       config_json, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(tenant_id, page_route, section_key, block_key) DO UPDATE SET
        block_type = excluded.block_type,
        eyebrow = excluded.eyebrow,
        title = excluded.title,
        subtitle = excluded.subtitle,
        body = excluded.body,
        image_url = excluded.image_url,
        alt_text = excluded.alt_text,
        href = excluded.href,
        action_label = excluded.action_label,
        action_type = excluded.action_type,
        action_value = excluded.action_value,
        sort_order = excluded.sort_order,
        is_visible = excluded.is_visible,
        config_json = excluded.config_json,
        updated_at = datetime('now')
    `).bind(
      block.id || id("block"),
      TENANT_ID,
      page_route,
      section_key,
      block_key,
      block.block_type || "text",
      block.eyebrow || "",
      block.title || "",
      block.subtitle || "",
      block.body || "",
      block.image_url || "",
      block.alt_text || "",
      block.href || "",
      block.action_label || "",
      block.action_type || "",
      block.action_value || "",
      Number(block.sort_order || 50),
      block.is_visible === 0 ? 0 : 1,
      typeof block.config_json === "string" ? block.config_json : JSON.stringify(block.config_json || {})
    ).run();

    await env.DB.prepare("UPDATE cms_pages SET status = 'draft', updated_at = datetime('now') WHERE tenant_id = ? AND route_path = ?")
      .bind(TENANT_ID, page_route).run().catch(() => {});

    await bustCache(env, `sections:${TENANT_ID}:${page_route}`, `bootstrap:${TENANT_ID}`);

    let fragmentSync = null;
    if (isFragmentPageRoute(page_route)) {
      fragmentSync = await syncFragmentCmsToR2(env, page_route);
    }

    return json({ success: true, page_route, section_key, block_key, fragment_sync: fragmentSync });
  }

  if (path === "/api/cms/page/save" && method === "POST") {
    const cmsUser = await requireCmsUser(request, env, sessionUser);
    if (!cmsUser) return json({ success: false, error: "Not authenticated" }, 401);

    const data = await body(request);
    const page = data.page || data;
    const route_path = page.route_path || "/";
    const slug = page.slug || (route_path === "/" ? "home" : route_path.replace(/^\//, ""));

    await env.DB.prepare(`
      INSERT INTO cms_pages
      (id, tenant_id, route_path, slug, title, status, seo_title, meta_description, og_image_url,
       page_type, template_key, sort_order, is_homepage, show_header, show_footer, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(tenant_id, route_path) DO UPDATE SET
        slug = excluded.slug,
        title = excluded.title,
        status = excluded.status,
        seo_title = excluded.seo_title,
        meta_description = excluded.meta_description,
        og_image_url = excluded.og_image_url,
        page_type = excluded.page_type,
        template_key = excluded.template_key,
        sort_order = excluded.sort_order,
        is_homepage = excluded.is_homepage,
        show_header = excluded.show_header,
        show_footer = excluded.show_footer,
        updated_at = datetime('now')
    `).bind(
      page.id || id("page"),
      TENANT_ID,
      route_path,
      slug,
      page.title || "Untitled Page",
      page.status || "draft",
      page.seo_title || page.title || "",
      page.meta_description || "",
      page.og_image_url || "",
      page.page_type || "standard",
      page.template_key || "default",
      Number(page.sort_order || 50),
      page.is_homepage ? 1 : 0,
      page.show_header === 0 ? 0 : 1,
      page.show_footer === 0 ? 0 : 1
    ).run();

    return json({ success: true, route_path });
  }

  if (path === "/api/cms/publish" && method === "POST") {
    const cmsUser = await requireCmsUser(request, env, sessionUser);
    if (!cmsUser) return json({ success: false, error: "Not authenticated" }, 401);

    const data = await body(request);
    const routeInput = data.route_path ?? data.page_route ?? data.route ?? "";
    const route = normalizeRouteInput(routeInput);
    if (!route) {
      return json({ error: "route_path (or page_route/route) is required" }, 400);
    }

    const triggeredBy = cmsUser?.email || cmsUser?.id || "dashboard";
    const result = await publishPageRoute(env, route, triggeredBy);

    if (!result.success) {
      return json({
        success: false,
        error: "Failed to render published page artifacts",
        route_path: result.route_path,
        job_id: result.job_id,
        details: result.error,
      }, 500);
    }

    return json({
      success: true,
      job_id: result.job_id,
      route_path: result.route_path,
      artifact_key: result.artifact_key,
      preview_url: result.route_path === "/" ? "/" : result.route_path,
      message: "Page marked published and rendered to artifacts.",
    });
  }

  if (path === "/api/cms/publish-all" && method === "POST") {
    const cmsUser = await requireCmsUser(request, env, sessionUser);
    if (!cmsUser) return json({ success: false, error: "Not authenticated" }, 401);

    const data = await body(request);
    const triggeredBy = cmsUser?.email || cmsUser?.id || "dashboard";

    let routes = PUBLIC_PAGE_ROUTES;
    if (Array.isArray(data.routes) && data.routes.length) {
      routes = data.routes.map((r) => normalizeRouteInput(r)).filter(Boolean);
    } else if (!env.DB) {
      return json({ success: false, error: "DB binding missing" }, 500);
    } else {
      const pages = await env.DB.prepare(
        "SELECT route_path FROM cms_pages WHERE tenant_id = ? ORDER BY sort_order, route_path"
      ).bind(TENANT_ID).all().catch(() => ({ results: [] }));
      const fromDb = (pages.results || []).map((row) => normalizeRouteInput(row.route_path)).filter(Boolean);
      if (fromDb.length) routes = fromDb;
    }

    const results = [];
    for (const route of routes) {
      results.push(await publishPageRoute(env, route, triggeredBy));
    }

    const failed = results.filter((r) => !r.success);
    const succeeded = results.filter((r) => r.success);

    return json({
      success: failed.length === 0,
      published: succeeded.length,
      failed: failed.length,
      routes: results,
      message: failed.length
        ? `Published ${succeeded.length}/${results.length} pages. ${failed.length} failed.`
        : `Published all ${results.length} pages.`,
    }, failed.length ? 207 : 200);
  }

  // GET /api/cms/sections — all sections for this tenant, keyed for the pages view
  if (path === "/api/cms/sections" && method === "GET") {
    const pageRoute = url.searchParams.get("route") || null;
    let q = `SELECT id, page_route, section_key, section_type, heading, subheading,
                     eyebrow, body, image_url, cta_label, cta_href,
                     sort_order, is_visible, config_json, created_at, updated_at
              FROM cms_page_sections
              WHERE tenant_id = ?`;
    const binds = [TENANT_ID];
    if (pageRoute) { q += " AND page_route = ?"; binds.push(pageRoute); }
    q += " ORDER BY page_route, sort_order";
    const { results } = await env.DB.prepare(q).bind(...binds).all().catch(() => ({ results: [] }));
    return json({ success: true, sections: results || [] });
  }

  // PATCH /api/cms/section/:id — update a single section field (inline editing)
  if (path.match(/^\/api\/cms\/section\/[^/]+$/) && method === "PATCH") {
    const sectionId = path.split("/")[4];
    const data = await body(request);
    const allowed = ["heading","subheading","eyebrow","body","image_url","cta_label","cta_href","cta_secondary_label","cta_secondary_href","is_visible","sort_order","config_json"];
    const updates = Object.keys(data).filter(k => allowed.includes(k));
    if (!updates.length) return json({ success: false, error: "No valid fields" }, 400);
    const setClauses = updates.map(k => `${k} = ?`).join(", ");
    const vals = updates.map(k => data[k]);
    await env.DB.prepare(
      `UPDATE cms_page_sections SET ${setClauses}, updated_at = datetime('now') WHERE id = ? AND tenant_id = ?`
    ).bind(...vals, sectionId, TENANT_ID).run();
    if (env.CMS_CACHE) {
      // Bust cache for the page this section belongs to
      const sec = await env.DB.prepare("SELECT page_route FROM cms_page_sections WHERE id = ?").bind(sectionId).first().catch(() => null);
      if (sec?.page_route) await bustCache(env, `page:${sec.page_route}`);
    }
    return json({ success: true, id: sectionId });
  }

    // GET /api/cms/assets
  if (path === "/api/cms/assets" && method === "GET") {
    const context = url.searchParams.get("context") || null;
    const category = url.searchParams.get("category") || null;
    let q = "SELECT * FROM cms_assets WHERE tenant_id = ? AND status != 'archived'";
    const binds = [TENANT_ID];
    if (context) { q += " AND usage_context = ?"; binds.push(context); }
    if (category) { q += " AND category = ?"; binds.push(category); }
    q += " ORDER BY created_at DESC LIMIT 200";
    const { results } = await env.DB.prepare(q).bind(...binds).all().catch(() => ({ results: [] }));
    return json({ success: true, assets: results || [] });
  }

  // POST /api/cms/asset/upload — multipart file upload → R2 → cms_assets
  if (path === "/api/cms/asset/upload" && method === "POST") {
    const cmsUser = await requireCmsUser(request, env, sessionUser);
    if (!cmsUser) return json({ success: false, error: "Not authenticated" }, 401);

    const CDN_ORIGIN = "https://assets.companionsofcaddo.org";
    const ALLOWED_UPLOAD_MIME = new Set([
      "image/jpeg","image/jpg","image/png","image/webp",
      "image/gif","image/svg+xml","image/avif",
    ]);
    const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

    let formData;
    try { formData = await request.formData(); }
    catch { return json({ success: false, error: "Invalid multipart body" }, 400); }

    const file     = formData.get("file");
    const altText  = formData.get("alt_text")      || "";
    const label    = formData.get("label")         || "";
    const context  = formData.get("usage_context") || "cms";
    const category = formData.get("category")      || "image";

    if (!file || typeof file.arrayBuffer !== "function") {
      return json({ success: false, error: "No file provided" }, 400);
    }
    if (!ALLOWED_UPLOAD_MIME.has(file.type)) {
      return json({ success: false, error: `MIME type not allowed: ${file.type}` }, 400);
    }

    const fileBytes = await file.arrayBuffer();
    if (fileBytes.byteLength > MAX_SIZE) {
      return json({ success: false, error: "File exceeds 10 MB limit" }, 400);
    }

    // Sanitise filename
    const safeName = file.name
      .normalize("NFC")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(0, 120);
    const now    = new Date();
    const yr     = now.getUTCFullYear();
    const mo     = String(now.getUTCMonth() + 1).padStart(2, "0");
    const r2Key  = `static/cms/uploads/${yr}/${mo}/${Date.now()}-${safeName}`;
    const pubUrl = `${CDN_ORIGIN}/${r2Key}`;

    // Write to R2
    try {
      await env.WEBSITE_ASSETS.put(r2Key, fileBytes, {
        httpMetadata: {
          contentType:  file.type,
          cacheControl: "public, max-age=31536000, immutable",
        },
        customMetadata: { tenant_id: TENANT_ID, uploaded_by: cmsUser.id || "unknown" },
      });
    } catch (err) {
      console.error("[cms-upload] R2 put failed:", err?.message);
      return json({ success: false, error: "R2 upload failed" }, 500);
    }

    // Insert cms_assets row
    const assetId  = id("asset");
    const assetKey = `upload_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`;
    await env.DB.prepare(
      `INSERT INTO cms_assets
         (id, tenant_id, project_id, asset_key, label, filename, original_filename,
          mime_type, size, category, asset_type, r2_key, r2_bucket,
          pub_url, cdn_url, public_url, alt_text,
          usage_context, status, is_live, created_by, created_at, updated_at)
       VALUES (?, ?, 'proj_companionscpas', ?, ?, ?, ?,
               ?, ?, ?, 'image', ?, 'companionscpas',
               ?, ?, ?, ?,
               ?, 'active', 1, ?, datetime('now'), datetime('now'))`
    ).bind(
      assetId, TENANT_ID, assetKey,
      label || safeName, safeName, file.name,
      file.type, fileBytes.byteLength,
      category,
      r2Key,
      pubUrl, pubUrl, pubUrl,
      altText,
      context,
      cmsUser.id || "unknown"
    ).run();

    return json({ success: true, asset_key: assetKey, public_url: pubUrl, r2_key: r2Key, id: assetId });
  }

    // POST /api/cms/asset/save
  if (path === "/api/cms/asset/save" && method === "POST") {
    const cmsUser = await requireCmsUser(request, env, sessionUser);
    if (!cmsUser) return json({ success: false, error: "Not authenticated" }, 401);

    const data = await body(request);
    const asset = data.asset || data;
    const asset_key = asset.asset_key || id("asset");

    await env.DB.prepare(`
      INSERT INTO cms_assets
      (id, tenant_id, project_id, asset_key, label, filename, original_filename,
       mime_type, size, category, asset_type, r2_key, r2_bucket,
       pub_url, cdn_url, public_url, usage_context, path, status, is_live,
       alt_text, notes, created_by, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))
      ON CONFLICT(tenant_id, asset_key) DO UPDATE SET
        label = excluded.label,
        cdn_url = excluded.cdn_url,
        pub_url = excluded.pub_url,
        public_url = excluded.public_url,
        alt_text = excluded.alt_text,
        status = excluded.status,
        is_live = excluded.is_live,
        usage_context = excluded.usage_context,
        notes = excluded.notes,
        updated_at = datetime('now')
    `).bind(
      asset.id || id("asset"),
      TENANT_ID,
      asset.project_id || "proj_companionscpas",
      asset_key,
      asset.label || asset.filename || "",
      asset.filename || "",
      asset.original_filename || asset.filename || "",
      asset.mime_type || "image/webp",
      asset.size || 0,
      asset.category || "image",
      asset.asset_type || "image",
      asset.r2_key || "",
      asset.r2_bucket || "companionscpas",
      asset.pub_url || "",
      asset.cdn_url || "",
      asset.cdn_url || asset.pub_url || "",
      asset.usage_context || "general",
      asset.r2_key || "",
      asset.status || "active",
      asset.is_live === 0 ? 0 : 1,
      asset.alt_text || "",
      asset.notes || "",
      asset.created_by || "dashboard"
    ).run();

    await bustCache(env, `bootstrap:${TENANT_ID}`);
    return json({ success: true, asset_key });
  }

  // GET /api/cms/brand
  if (path === "/api/cms/brand" && method === "GET") {
    // KV first
    if (env.CMS_CACHE) {
      const cached = await env.CMS_CACHE.get(`brand:${TENANT_ID}`, { type: "json" }).catch(() => null);
      if (cached) return json({ success: true, brand: cached, source: "kv" });
    }
    const brand = await env.DB.prepare(
      "SELECT * FROM cms_brand_settings WHERE tenant_id = ? ORDER BY id LIMIT 1"
    ).bind(TENANT_ID).first().catch(() => null);

    if (brand && env.CMS_CACHE) {
      await env.CMS_CACHE.put(`brand:${TENANT_ID}`, JSON.stringify(brand), { expirationTtl: 60 }).catch(() => {});
    }
    return json({ success: true, brand, source: "d1" });
  }

  // POST /api/cms/brand/save
  if (path === "/api/cms/brand/save" && method === "POST") {
    const cmsUser = await requireCmsUser(request, env, sessionUser);
    if (!cmsUser) return json({ success: false, error: "Not authenticated" }, 401);

    const data = await body(request);
    const brand = data.brand || data;

    await env.DB.prepare(`
      UPDATE cms_brand_settings SET
        brand_name            = ?,
        logo_url              = ?,
        logo_dark_url         = ?,
        logo_light_url        = ?,
        favicon_url           = ?,
        footer_logo_dark_url  = ?,
        footer_logo_light_url = ?,
        primary_color         = ?,
        secondary_color       = ?,
        accent_color          = ?,
        site_domain           = ?,
        navigation_json       = ?,
        footer_json           = ?,
        socials_json          = ?,
        organization_json     = ?,
        seo_defaults_json     = ?,
        updated_at            = datetime('now')
      WHERE tenant_id = ? AND id = 'brand_companionscpas'
    `).bind(
      brand.brand_name       || "Companions of CPAS",
      brand.logo_url         || "",
      brand.logo_dark_url    || "",
      brand.logo_light_url   || "",
      brand.favicon_url      || "",
      brand.footer_logo_dark_url  || "",
      brand.footer_logo_light_url || "",
      brand.primary_color    || "#7c3aed",
      brand.secondary_color  || "#172033",
      brand.accent_color     || "#ee2336",
      brand.site_domain      || "",
      typeof brand.navigation_json === "string" ? brand.navigation_json : JSON.stringify(brand.navigation_json || []),
      typeof brand.footer_json === "string"     ? brand.footer_json     : JSON.stringify(brand.footer_json || {}),
      typeof brand.socials_json === "string"    ? brand.socials_json    : JSON.stringify(brand.socials_json || {}),
      typeof brand.organization_json === "string" ? brand.organization_json : JSON.stringify(brand.organization_json || {}),
      typeof brand.seo_defaults_json === "string" ? brand.seo_defaults_json : JSON.stringify(brand.seo_defaults_json || {}),
      TENANT_ID
    ).run();

    // Bust KV — next request re-hydrates from D1
    await bustCache(env,
      `brand:${TENANT_ID}`,
      `bootstrap:${TENANT_ID}`
    );

    return json({ success: true, message: "Brand updated. KV cache invalidated." });
  }

  // POST /api/cms/section/delete
  if (path === "/api/cms/section/delete" && method === "POST") {
    const cmsUser = await requireCmsUser(request, env, sessionUser);
    if (!cmsUser) return json({ success: false, error: "Not authenticated" }, 401);

    const data = await body(request);
    const { page_route, section_key } = data;
    if (!page_route || !section_key) return json({ error: "page_route and section_key required" }, 400);

    await env.DB.prepare(
      "DELETE FROM cms_page_sections WHERE tenant_id = ? AND page_route = ? AND section_key = ?"
    ).bind(TENANT_ID, page_route, section_key).run();

    await bustCache(env,
      `sections:${TENANT_ID}:${page_route}`,
      `bootstrap:${TENANT_ID}`
    );

    let fragmentSync = null;
    if (isFragmentPageRoute(page_route)) {
      fragmentSync = await syncFragmentCmsToR2(env, page_route);
    }

    return json({ success: true, deleted: { page_route, section_key }, fragment_sync: fragmentSync });
  }


  // PATCH /api/cms/brand/config — write active_font_preset or any config_json key
  if (path === '/api/cms/brand/config' && (method === 'POST' || method === 'PATCH')) {
    const cmsUser = await requireCmsUser(request, env, sessionUser);
    if (!cmsUser) return json({ success: false, error: 'Not authenticated' }, 401);
    const data = await body(request);
    // data: { active_font_preset: 'playfair_inter' } or any flat config key
    // Read current config_json, merge, write back
    const row = await env.DB.prepare(
      'SELECT config_json FROM cms_brand_settings WHERE tenant_id = ? LIMIT 1'
    ).bind(TENANT_ID).first().catch(() => null);
    const current = (() => { try { return JSON.parse(row?.config_json || '{}'); } catch { return {}; } })();
    const merged = { ...current, ...data };
    await env.DB.prepare(
      `UPDATE cms_brand_settings SET config_json = ?, updated_at = datetime("now") WHERE tenant_id = ?`
    ).bind(JSON.stringify(merged), TENANT_ID).run();
    await bustCache(env, 'brand:' + TENANT_ID, 'bootstrap:' + TENANT_ID);
    // Bust all page KV cache so re-render picks up new font
    const PUBLIC_ROUTES = ['/', '/about', '/adopt', '/services', '/donate', '/community'];
    for (const r of PUBLIC_ROUTES) {
      await env.CMS_CACHE.delete('page:' + r).catch(() => {});
    }
    return json({ success: true, config: merged });
  }

  return null;
}
