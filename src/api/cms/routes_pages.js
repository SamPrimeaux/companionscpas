// routes_pages.js — extracted from cms_api.js (tkt_cpas_mod_cms_api_20260818)
// Auto-split: verbatim route bodies. No behavior change.

import { injectCmsInspector } from "./preview_inspector.js";
import {
  TENANT_ID,
  json,
  id,
  body,
  safeJson,
  bustCache,
  requireCmsUser,
  normalizeRouteInput,
  publishPageRoute,
  listAllCmsPageRoutes,
  syncFragmentCmsToR2,
  loadEditorCatalog,
  renderPage,
  isFragmentPageRoute,
  ensureFragmentPageSections,
  previewFragmentPageFromCms,
  upsertFragmentPageDefaults,
  getFragmentSectionKeys,
  normalizeFragmentRoute,
  hydrateRawHtmlSectionForEditor,
  bootstrapNewCmsPage,
} from "./shared.js";

export async function routesPages(request, env, url, path, method, sessionUser = null) {
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

  if (path === "/api/cms/bootstrap" && method === "GET") {
    const cmsUser = await requireCmsUser(request, env, sessionUser);
    if (!cmsUser) return json({ success: false, error: "Not authenticated" }, 401);
    const catalog = await loadEditorCatalog(env);
    return json({ success: true, ...catalog });
  }

  if (path === "/api/cms/page" && method === "GET") {
    const route = url.searchParams.get("route") || "/";
    if (isFragmentPageRoute(route)) await ensureFragmentPageSections(env, route);

    const page = await env.DB.prepare("SELECT * FROM cms_pages WHERE tenant_id = ? AND route_path = ? LIMIT 1")
      .bind(TENANT_ID, route).first();

    if (!page) return json({ error: "Page not found", route }, 404);

    const sections = await env.DB.prepare(
      `SELECT * FROM cms_page_sections
       WHERE tenant_id = ? AND page_route = ?
         AND (deleted_at IS NULL OR deleted_at = '')
       ORDER BY sort_order, section_key`
    )
      .bind(TENANT_ID, route).all().catch(() => ({ results: [] }));

    const blocks = await env.DB.prepare("SELECT * FROM cms_page_content_blocks WHERE tenant_id = ? AND page_route = ? ORDER BY sort_order, section_key, block_key")
      .bind(TENANT_ID, route).all().catch(() => ({ results: [] }));

    // Drop blocks whose section was soft-deleted (and thus omitted above)
    const activeKeys = new Set((sections.results || []).map((s) => s.section_key));
    const blockResults = (blocks.results || []).filter((b) => activeKeys.has(b.section_key));

    let sectionResults = sections.results || [];
    const fragmentKeys = getFragmentSectionKeys(route);
    if (fragmentKeys.length) {
      sectionResults = sectionResults.filter((s) => fragmentKeys.includes(s.section_key));
    }

    // Custom Code: hydrate HTML from R2 into response for the editor textarea (D1 stays lean)
    sectionResults = await Promise.all(
      sectionResults.map((s) => hydrateRawHtmlSectionForEditor(env, s))
    );

    return json({ success: true, page, sections: sectionResults, blocks: blockResults });
  }

  if (path === "/api/cms/page/bootstrap" && method === "POST") {
    const cmsUser = await requireCmsUser(request, env, sessionUser);
    if (!cmsUser) return json({ success: false, error: "Not authenticated" }, 401);

    const data = await body(request);
    const route = normalizeFragmentRoute(data.route_path || "/");
    const force = data.force === true;

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
    if (!cmsUser) {
      // iframe navigations must get HTML — raw JSON becomes Chrome "Pretty print"
      const loginHref = "/admin/login?next=" + encodeURIComponent("/dashboard/cms/pages");
      const html = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Sign in required</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
    font-family:system-ui,-apple-system,sans-serif;background:#f5f2e9;color:#1a1622;padding:24px}
  .card{max-width:420px;background:#fff;border:1px solid rgba(26,22,34,.08);border-radius:16px;
    padding:28px 26px;box-shadow:0 8px 28px rgba(26,22,34,.08)}
  h1{margin:0 0 10px;font-size:1.25rem} p{margin:0 0 18px;line-height:1.55;color:#4a4454;font-size:.95rem}
  a{display:inline-flex;align-items:center;justify-content:center;padding:10px 16px;border-radius:10px;
    background:#7B2FBE;color:#fff;font-weight:700;text-decoration:none}
  a:hover{filter:brightness(1.05)}
</style></head><body>
  <div class="card">
    <h1>Sign in required</h1>
    <p>This CMS preview needs an active session on <strong>this device</strong>.
       Phone and desktop can stay signed in at the same time — sign in here to restore the editor.</p>
    <a href="${loginHref}" target="_top" rel="noopener">Sign in</a>
  </div>
</body></html>`;
      return new Response(html, {
        status: 401,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
        },
      });
    }

    const route = normalizeRouteInput(url.searchParams.get("route") || "/");
    if (!route) return json({ success: false, error: "route required" }, 400);

    try {
      const raw = await previewFragmentPageFromCms(env, route);
      if (!raw) {
        // Fallback for pages without sections yet
        const fallback = await renderPage(route, `preview_${Date.now()}`, env, {
          persist: false,
          includeHidden: true,
        }).catch(() => null);
        if (!fallback) return json({ success: false, error: "Preview assembly failed", route }, 500);
        const html = injectCmsInspector(fallback);
        return new Response(html, {
          status: 200,
          headers: {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "no-store",
          },
        });
      }
      const html = injectCmsInspector(raw);
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

  if (path === "/api/cms/page/save" && method === "POST") {
    const cmsUser = await requireCmsUser(request, env, sessionUser);
    if (!cmsUser) return json({ success: false, error: "Not authenticated" }, 401);

    const data = await body(request);
    const page = data.page || data;
    const route_path = normalizeRouteInput(page.route_path || "/");
    if (!route_path) return json({ success: false, error: "route_path required" }, 400);
    const slug = page.slug || (route_path === "/" ? "home" : route_path.replace(/^\//, "").replace(/\//g, "-"));
    const title = page.title || "Untitled Page";
    const addToNav = data.add_to_nav !== false && page.add_to_nav !== false;
    const seedSections = data.seed_sections !== false && page.seed_sections !== false;
    const shortNavLabel = String(page.nav_label || title).split(/[—–|-]/)[0]?.trim() || title;
    const navPlacementRaw = String(page.nav_placement || (addToNav ? "more" : "none")).trim().toLowerCase();
    const navPlacement = ["primary", "more", "cta", "footer_only", "none"].includes(navPlacementRaw)
      ? navPlacementRaw
      : (addToNav ? "more" : "none");

    const existing = await env.DB.prepare(
      "SELECT id FROM cms_pages WHERE tenant_id = ? AND route_path = ? LIMIT 1"
    ).bind(TENANT_ID, route_path).first().catch(() => null);
    const isNew = !existing;

    await env.DB.prepare(`
      INSERT INTO cms_pages
      (id, tenant_id, route_path, slug, title, status, seo_title, meta_description, og_image_url,
       page_type, template_key, sort_order, is_homepage, show_header, show_footer, nav_visible,
       nav_label, nav_placement, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
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
      page.id || existing?.id || id("page"),
      TENANT_ID,
      route_path,
      slug,
      title,
      page.status || (isNew ? "draft" : "draft"),
      page.seo_title || title || "",
      page.meta_description || "",
      page.og_image_url || "",
      page.page_type || "standard",
      page.template_key || "default",
      Number(page.sort_order || 50),
      page.is_homepage ? 1 : 0,
      page.show_header === 0 ? 0 : 1,
      page.show_footer === 0 ? 0 : 1,
      addToNav ? 1 : 0,
      shortNavLabel,
      navPlacement
    ).run();

    let bootstrap = null;
    if (isNew) {
      bootstrap = await bootstrapNewCmsPage(env, {
        route: route_path,
        title,
        add_to_nav: addToNav,
        nav_placement: navPlacement,
      });
    }

    await bustCache(env, `bootstrap:${TENANT_ID}`, `brand:${TENANT_ID}`);

    return json({
      success: true,
      route_path,
      created: isNew,
      bootstrap,
      editor_page_id: route_path === "/" ? "home" : route_path.replace(/^\//, "").replace(/\//g, "_"),
      message: isNew
        ? "Page created with starter sections. Publish Live to make the URL public."
        : "Page saved.",
    });
  }

  if (path === "/api/cms/page/nav-visible" && method === "POST") {
    const cmsUser = await requireCmsUser(request, env, sessionUser);
    if (!cmsUser) return json({ success: false, error: "Not authenticated" }, 401);

    const data = await body(request);
    const route = normalizeRouteInput(data.route_path || data.route || "");
    if (!route) return json({ success: false, error: "route_path is required" }, 400);

    const navVisible = data.nav_visible === 0 || data.nav_visible === false ? 0 : 1;
    const triggeredBy = cmsUser?.email || cmsUser?.id || "dashboard";

    try {
      await env.DB.prepare(
        `UPDATE cms_pages
         SET nav_visible = ?, updated_at = datetime('now')
         WHERE tenant_id = ? AND route_path = ?`
      ).bind(navVisible, TENANT_ID, route).run();
    } catch (err) {
      console.error("[cms/nav-visible] update failed:", err?.message || err);
      return json({ success: false, error: "Could not update page navigation visibility" }, 500);
    }

    await env.DB.prepare(
      `UPDATE cms_navigation_items
       SET is_visible = ?, updated_at = datetime('now')
       WHERE tenant_id = ? AND href = ?`
    ).bind(navVisible, TENANT_ID, route).run().catch(() => {});

    await bustCache(env, `brand:${TENANT_ID}`, `bootstrap:${TENANT_ID}`);

    const republishResults = [];
    const routesToRepublish = await listAllCmsPageRoutes(env);
    for (const pageRoute of routesToRepublish) {
      republishResults.push(await publishPageRoute(env, pageRoute, triggeredBy));
    }

    const failed = republishResults.filter((r) => !r.success);
    return json({
      success: failed.length === 0,
      route_path: route,
      nav_visible: navVisible,
      republished: republishResults.filter((r) => r.success).length,
      failed: failed.length,
      message: navVisible
        ? "Page is visible in site navigation."
        : "Page hidden from site navigation. Direct URL still works for editing.",
    }, failed.length ? 207 : 200);
  }

  // Full chrome controls — nav_label / nav_placement / nav_visible / sort_order (cms_pages SSOT)
  if (path === "/api/cms/page/chrome" && method === "POST") {
    const cmsUser = await requireCmsUser(request, env, sessionUser);
    if (!cmsUser) return json({ success: false, error: "Not authenticated" }, 401);

    const data = await body(request);
    const route = normalizeRouteInput(data.route_path || data.route || "");
    if (!route) return json({ success: false, error: "route_path is required" }, 400);

    const allowedPlacement = new Set(["primary", "more", "cta", "footer_only", "none"]);
    const placementRaw = String(data.nav_placement || "").trim().toLowerCase();
    const navPlacement = allowedPlacement.has(placementRaw) ? placementRaw : null;
    const navLabel = data.nav_label !== undefined ? String(data.nav_label || "").trim() : null;
    const navVisible = data.nav_visible === undefined
      ? null
      : (data.nav_visible === 0 || data.nav_visible === false ? 0 : 1);
    const sortOrder = data.sort_order !== undefined && data.sort_order !== null && data.sort_order !== ""
      ? Number(data.sort_order)
      : null;

    if (navPlacement === null && navLabel === null && navVisible === null && sortOrder === null) {
      return json({ success: false, error: "Provide nav_label, nav_placement, nav_visible, and/or sort_order" }, 400);
    }

    const sets = ["updated_at = datetime('now')"];
    const binds = [];
    if (navLabel !== null) { sets.push("nav_label = ?"); binds.push(navLabel); }
    if (navPlacement !== null) { sets.push("nav_placement = ?"); binds.push(navPlacement); }
    if (navVisible !== null) { sets.push("nav_visible = ?"); binds.push(navVisible); }
    if (sortOrder !== null && Number.isFinite(sortOrder)) { sets.push("sort_order = ?"); binds.push(sortOrder); }
    binds.push(TENANT_ID, route);

    try {
      await env.DB.prepare(
        `UPDATE cms_pages SET ${sets.join(", ")} WHERE tenant_id = ? AND route_path = ?`
      ).bind(...binds).run();
    } catch (err) {
      console.error("[cms/page/chrome] update failed:", err?.message || err);
      return json({ success: false, error: "Could not update page chrome settings" }, 500);
    }

    const triggeredBy = cmsUser?.email || cmsUser?.id || "dashboard";
    await bustCache(env, `brand:${TENANT_ID}`, `bootstrap:${TENANT_ID}`);
    const republishResults = [];
    const routesToRepublish = await listAllCmsPageRoutes(env);
    for (const pageRoute of routesToRepublish) {
      republishResults.push(await publishPageRoute(env, pageRoute, triggeredBy));
    }
    const failed = republishResults.filter((r) => !r.success);
    const row = await env.DB.prepare(
      `SELECT route_path, nav_label, nav_placement, nav_visible, sort_order, status
       FROM cms_pages WHERE tenant_id = ? AND route_path = ? LIMIT 1`
    ).bind(TENANT_ID, route).first().catch(() => null);

    return json({
      success: failed.length === 0,
      page: row,
      republished: republishResults.filter((r) => r.success).length,
      failed: failed.length,
      message: "Header/footer chrome updated from cms_pages. Site republished.",
    }, failed.length ? 207 : 200);
  }

  if (path === "/api/cms/page/theme" && method === "POST") {
    const cmsUser = await requireCmsUser(request, env, sessionUser);
    if (!cmsUser) return json({ success: false, error: "Not authenticated" }, 401);

    const data = await body(request);
    const route = normalizeRouteInput(data.route_path || data.route || "");
    if (!route) return json({ success: false, error: "route_path is required" }, 400);

    const allowed = new Set(["plum_glass", "light", "dark"]);
    const themeRaw = String(data.theme || "").trim().toLowerCase().replace(/-/g, "_");
    const theme = themeRaw === "plum" || themeRaw === "cream" ? "plum_glass" : themeRaw;
    if (!allowed.has(theme)) {
      return json({ success: false, error: "theme must be plum_glass, light, or dark" }, 400);
    }

    const triggeredBy = cmsUser?.email || cmsUser?.id || "dashboard";
    try {
      await env.DB.prepare(
        `UPDATE cms_pages
         SET theme = ?, updated_at = datetime('now')
         WHERE tenant_id = ? AND route_path = ?`
      ).bind(theme, TENANT_ID, route).run();
    } catch (err) {
      console.error("[cms/page/theme] update failed:", err?.message || err);
      return json({ success: false, error: "Could not update page theme" }, 500);
    }

    await bustCache(env, `page:${route}`, `brand:${TENANT_ID}`);
    const published = await publishPageRoute(env, route, triggeredBy).catch((err) => ({
      success: false,
      error: err?.message || String(err),
    }));

    return json({
      success: Boolean(published?.success !== false),
      route_path: route,
      theme,
      published: Boolean(published?.success !== false),
      message: theme === "dark"
        ? "Page theme set to Dark (legacy)."
        : theme === "light"
          ? "Page theme set to Light."
          : "Page theme set to Light plum / cream (recommended).",
    }, published?.success === false ? 207 : 200);
  }
  return null;
}
