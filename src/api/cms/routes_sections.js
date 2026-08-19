// routes_sections.js — extracted from cms_api.js (tkt_cpas_mod_cms_api_20260818)
// Auto-split: verbatim route bodies. No behavior change.

import {
  TENANT_ID,
  json,
  id,
  body,
  bustCache,
  requireCmsUser,
  normalizeRouteInput,
  syncFragmentCmsToR2,
  loadEditorCatalog,
  isFragmentPageRoute,
  persistRawHtmlConfigOnSave,
  archiveAndClearLiveFragment,
  syncSectionToR2,
  loadRouteSections,
} from "./shared.js";

export async function routesSections(request, env, url, path, method, sessionUser = null) {
  // GET /api/cms/section/templates — addable section catalog from D1 schemas
  if (path === "/api/cms/section/templates" && method === "GET") {
    const cmsUser = await requireCmsUser(request, env, sessionUser);
    if (!cmsUser) return json({ success: false, error: "Not authenticated" }, 401);
    const {
      FORM_TEMPLATE_ENTRIES,
    } = await import("../cms_section_preview_fixtures.js");

    let sections = [];
    try {
      const catalog = await loadEditorCatalog(env);
      sections = catalog.templates || [];
    } catch (err) {
      console.warn("[cms/section/templates] D1 catalog failed:", err?.message || err);
    }
    if (!sections.length) {
      const { ADDABLE_SECTION_TYPES } = await import("../cms_section_catalog.js");
      const { SECTION_TEMPLATE_META } = await import("../cms_section_preview_fixtures.js");
      sections = (ADDABLE_SECTION_TYPES || []).map((row) => {
        const meta = SECTION_TEMPLATE_META[row.type] || { category: "content", icon: "layers" };
        return {
          type: row.type,
          label: row.label,
          desc: row.desc,
          kind: "section",
          category: meta.category,
          icon: meta.icon,
          preview_url: `/api/cms/section/preview?type=${encodeURIComponent(row.type)}`,
        };
      });
    }
    return json({
      success: true,
      sections,
      forms: FORM_TEMPLATE_ENTRIES,
      templates: [...sections, ...FORM_TEMPLATE_ENTRIES],
    });
  }

  // GET /api/cms/section/preview?type=hero — isolated template preview HTML
  if (path === "/api/cms/section/preview" && method === "GET") {
    const cmsUser = await requireCmsUser(request, env, sessionUser);
    if (!cmsUser) return json({ success: false, error: "Not authenticated" }, 401);
    const type = String(url.searchParams.get("type") || "").trim().toLowerCase();
    if (!type) return json({ success: false, error: "type required" }, 400);

    try {
      const { getBrand } = await import("../render_page.js");
      const { renderSectionByType } = await import("../cms_section_catalog.js");
      const { buildSectionPreviewFixture } = await import("../cms_section_preview_fixtures.js");
      const brand = await getBrand(env).catch(() => ({}));
      const { section: demo, blocks } = buildSectionPreviewFixture(type, brand);
      if (!demo.image_url && demo._logo_fallback) demo.image_url = demo._logo_fallback;
      delete demo._logo_fallback;
      const fragment = await renderSectionByType(demo, blocks || [], brand, env, {
        preview: true,
        includeHidden: true,
      });
      const html = `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Preview · ${type.replace(/</g, "")}</title>
<link rel="stylesheet" href="/static/global/cpas-shell.css"/>
<link rel="stylesheet" href="/api/cms/brand/tokens.css"/>
<style>
  html,body{margin:0;background:#f4efe8}
  body{padding:0}
  .tpl-artboard{width:1200px;min-height:420px;margin:0;background:#f4efe8}
  .tpl-artboard > *{max-width:100%}
</style>
</head><body><div class="tpl-artboard" data-preview-type="${type.replace(/"/g, "")}">${fragment || "<p style='padding:24px;font-family:system-ui'>No preview available for this type.</p>"}</div></body></html>`;
      return new Response(html, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
      });
    } catch (err) {
      return json({ success: false, error: err?.message || "Section preview failed" }, 500);
    }
  }

  if (path === "/api/cms/section/save" && method === "POST") {
    const cmsUser = await requireCmsUser(request, env, sessionUser);
    if (!cmsUser) return json({ success: false, error: "Not authenticated" }, 401);

    const data = await body(request);
    const section = data.section || data;

    const page_route = section.page_route || data.page_route || "/";
    const section_key = section.section_key || data.section_key || id("section");
    const sectionForPersist = { ...section, page_route, section_key };
    let configJsonOut;
    try {
      configJsonOut = await persistRawHtmlConfigOnSave(env, sectionForPersist);
    } catch (persistErr) {
      console.warn("[cms/section/save] raw_html R2 persist failed:", persistErr?.message || persistErr);
      return json({
        success: false,
        error: `Custom Code storage failed: ${persistErr?.message || persistErr}`,
      }, 500);
    }

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
      configJsonOut
    ).run();

    // Keep donation_settings + cms_components in sync when payment methods are edited in CMS
    try {
      const cfg = JSON.parse(configJsonOut || "{}");
      let methods = cfg.payment_methods_json ?? cfg.payment_methods;
      if (typeof methods === "string") methods = JSON.parse(methods);
      if (Array.isArray(methods) && methods.length) {
        const urlMap = {
          zeffy_donate_url: null,
          paypal_donate_url: null,
          venmo_donate_url: null,
          amazon_wishlist_url: null,
        };
        for (const m of methods) {
          if (!m || !m.url_field || !m.url) continue;
          if (Object.prototype.hasOwnProperty.call(urlMap, m.url_field)) {
            urlMap[m.url_field] = String(m.url).trim();
          }
        }
        const urlUpdates = Object.entries(urlMap).filter(([, v]) => v);
        if (urlUpdates.length) {
          await env.DB.prepare(
            `UPDATE donation_settings SET ${urlUpdates.map(([k]) => `${k} = ?`).join(", ")}, updated_at = datetime('now') WHERE tenant_id = ?`
          ).bind(...urlUpdates.map(([, v]) => v), TENANT_ID).run();
        }
        for (const m of methods) {
          const cid = String(m.component_id || "").trim();
          if (!cid) continue;
          const row = await env.DB.prepare(
            "SELECT config_json FROM cms_components WHERE id = ? LIMIT 1"
          ).bind(cid).first().catch(() => null);
          if (!row) continue;
          let ccfg = {};
          try { ccfg = JSON.parse(row.config_json || "{}"); } catch { ccfg = {}; }
          const next = {
            ...ccfg,
            ...(m.tooltip ? { label: m.tooltip } : (m.label ? { label: m.label } : {})),
            ...(m.note != null ? { note: m.note } : {}),
            ...(m.logo_url ? { logo_url: m.logo_url } : {}),
            ...(m.logo_height ? { logo_height: Number(m.logo_height) } : {}),
            ...(m.background ? { background: m.background } : {}),
            ...(m.border_color ? { border_color: m.border_color } : {}),
            ...(m.text_color ? { text_color: m.text_color } : {}),
            ...(m.note_color ? { note_color: m.note_color } : {}),
            ...(m.url ? { url: m.url } : {}),
          };
          await env.DB.prepare(
            "UPDATE cms_components SET config_json = ?, updated_at = datetime('now') WHERE id = ?"
          ).bind(JSON.stringify(next), cid).run();
        }
      }
    } catch (syncErr) {
      console.warn("[cms/section/save] payment method sync:", syncErr?.message || syncErr);
    }

    await env.DB.prepare("UPDATE cms_pages SET updated_at = datetime('now') WHERE tenant_id = ? AND route_path = ?")
      .bind(TENANT_ID, page_route).run().catch(() => {});

    await bustCache(env, `sections:${TENANT_ID}:${page_route}`, `bootstrap:${TENANT_ID}`, `page:${page_route}`);

    let fragmentSync = null;
    try {
      if (isFragmentPageRoute(page_route)) {
        fragmentSync = await syncFragmentCmsToR2(env, page_route);
      }
    } catch (err) {
      console.warn("[cms/section/save] R2 sync failed:", err?.message || err);
      fragmentSync = { error: String(err?.message || err) };
    }

    return json({ success: true, page_route, section_key, fragment_sync: fragmentSync });
  }

  // POST /api/cms/sections/reorder — batch sort_order only, one R2 sync
  if (path === "/api/cms/sections/reorder" && method === "POST") {
    const cmsUser = await requireCmsUser(request, env, sessionUser);
    if (!cmsUser) return json({ success: false, error: "Not authenticated" }, 401);

    const data = await body(request);
    const page_route = normalizeRouteInput(data.page_route || "/");
    const keys = Array.isArray(data.section_keys)
      ? data.section_keys.map((k) => String(k || "").trim()).filter(Boolean)
      : [];
    if (!page_route) return json({ success: false, error: "page_route required" }, 400);
    if (!keys.length) return json({ success: false, error: "section_keys required" }, 400);

    for (let i = 0; i < keys.length; i++) {
      await env.DB.prepare(
        `UPDATE cms_page_sections
         SET sort_order = ?, updated_at = datetime('now')
         WHERE tenant_id = ? AND page_route = ? AND section_key = ?`
      )
        .bind((i + 1) * 10, TENANT_ID, page_route, keys[i])
        .run();
    }

    // Keep published status so nav_visible-driven header stays stable while editing.
    await env.DB.prepare(
      "UPDATE cms_pages SET updated_at = datetime('now') WHERE tenant_id = ? AND route_path = ?"
    )
      .bind(TENANT_ID, page_route)
      .run()
      .catch(() => {});

    await bustCache(env, `sections:${TENANT_ID}:${page_route}`, `bootstrap:${TENANT_ID}`, `page:${page_route}`);

    let fragmentSync = null;
    try {
      if (isFragmentPageRoute(page_route)) {
        fragmentSync = await syncFragmentCmsToR2(env, page_route);
      }
    } catch (err) {
      console.warn("[cms/sections/reorder] R2 sync failed:", err?.message || err);
      fragmentSync = { error: String(err?.message || err) };
    }

    return json({
      success: true,
      page_route,
      section_keys: keys,
      fragment_sync: fragmentSync,
    });
  }

  // GET /api/cms/sections — all sections for this tenant, keyed for the pages view
  if (path === "/api/cms/sections" && method === "GET") {
    const pageRoute = url.searchParams.get("route") || null;
    let q = `SELECT id, page_route, section_key, section_type, heading, subheading,
                     eyebrow, body, image_url, cta_label, cta_href,
                     sort_order, is_visible, config_json, created_at, updated_at
              FROM cms_page_sections
              WHERE tenant_id = ?
                AND (deleted_at IS NULL OR deleted_at = '')`;
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

  // POST /api/cms/section/copy — duplicate a section onto another page (content + blocks). Source stays put.
  if (path === "/api/cms/section/copy" && method === "POST") {
    const cmsUser = await requireCmsUser(request, env, sessionUser);
    if (!cmsUser) return json({ success: false, error: "Not authenticated" }, 401);

    const data = await body(request);
    const sourceRoute = normalizeRouteInput(data.source_page_route || data.page_route || "");
    const sourceKey = String(data.source_section_key || data.section_key || "").trim();
    const targetRoute = normalizeRouteInput(data.target_page_route || "");
    const insertAfter = String(data.insert_after_section_key || "").trim();
    if (!sourceRoute || !sourceKey) {
      return json({ success: false, error: "source_page_route and source_section_key required" }, 400);
    }
    if (!targetRoute) {
      return json({ success: false, error: "target_page_route required" }, 400);
    }

    const source = await env.DB.prepare(
      `SELECT * FROM cms_page_sections
       WHERE tenant_id = ? AND page_route = ? AND section_key = ?
         AND (deleted_at IS NULL OR deleted_at = '')
       LIMIT 1`
    ).bind(TENANT_ID, sourceRoute, sourceKey).first().catch(() => null);
    if (!source) return json({ success: false, error: "Source section not found" }, 404);

    const slug = targetRoute === "/" ? "home" : targetRoute.replace(/^\//, "").replace(/\//g, "_");
    let targetKey = String(data.target_section_key || "").trim();
    if (!targetKey) {
      targetKey = `${source.section_type || "section"}_${slug}_${Date.now()}`;
    }

    const clash = await env.DB.prepare(
      `SELECT section_key FROM cms_page_sections
       WHERE tenant_id = ? AND page_route = ? AND section_key = ?
       LIMIT 1`
    ).bind(TENANT_ID, targetRoute, targetKey).first().catch(() => null);
    if (clash) {
      return json({ success: false, error: `Section key already exists on ${targetRoute}: ${targetKey}` }, 409);
    }

    let sortOrder = Number(data.sort_order);
    if (!Number.isFinite(sortOrder) || sortOrder <= 0) {
      if (insertAfter) {
        const after = await env.DB.prepare(
          `SELECT sort_order FROM cms_page_sections
           WHERE tenant_id = ? AND page_route = ? AND section_key = ?
             AND (deleted_at IS NULL OR deleted_at = '')
           LIMIT 1`
        ).bind(TENANT_ID, targetRoute, insertAfter).first().catch(() => null);
        const base = Number(after?.sort_order) || 0;
        await env.DB.prepare(
          `UPDATE cms_page_sections
           SET sort_order = sort_order + 10, updated_at = datetime('now')
           WHERE tenant_id = ? AND page_route = ? AND sort_order > ?
             AND (deleted_at IS NULL OR deleted_at = '')`
        ).bind(TENANT_ID, targetRoute, base).run();
        sortOrder = base + 5;
      } else {
        const maxRow = await env.DB.prepare(
          `SELECT MAX(sort_order) AS m FROM cms_page_sections
           WHERE tenant_id = ? AND page_route = ?
             AND (deleted_at IS NULL OR deleted_at = '')`
        ).bind(TENANT_ID, targetRoute).first().catch(() => null);
        sortOrder = (Number(maxRow?.m) || 0) + 10;
      }
    }

    const newId = id("section");
    let configJson = source.config_json || "{}";
    try {
      const cfg = typeof configJson === "string" ? JSON.parse(configJson || "{}") : { ...(configJson || {}) };
      if (cfg.share_url && typeof cfg.share_url === "string") {
        cfg.share_url = `https://companionsofcaddo.org${targetRoute === "/" ? "" : targetRoute}#campaign-entry-${targetKey}`;
      }
      configJson = JSON.stringify(cfg);
    } catch {
      configJson = typeof source.config_json === "string" ? source.config_json : JSON.stringify(source.config_json || {});
    }

    let secondaryHref = source.cta_secondary_href || "";
    if (secondaryHref && String(secondaryHref).includes("#campaign-entry-")) {
      secondaryHref = `https://companionsofcaddo.org${targetRoute === "/" ? "" : targetRoute}#campaign-entry-${targetKey}`;
    }

    await env.DB.prepare(`
      INSERT INTO cms_page_sections
      (id, tenant_id, page_route, section_key, section_type, eyebrow, heading, subheading, body,
       primary_asset_id, secondary_asset_id, image_url, cta_label, cta_href,
       cta_secondary_label, cta_secondary_href, sort_order, is_visible, config_json,
       title, created_at, updated_at, deleted_at, restore_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, datetime('now'), datetime('now'), NULL, 0)
    `).bind(
      newId,
      TENANT_ID,
      targetRoute,
      targetKey,
      source.section_type || "content",
      source.eyebrow || "",
      source.heading || source.title || "",
      source.subheading || "",
      source.body || "",
      source.primary_asset_id || null,
      source.secondary_asset_id || null,
      source.image_url || "",
      source.cta_label || "",
      source.cta_href || "",
      source.cta_secondary_label || "",
      secondaryHref,
      sortOrder,
      configJson,
      source.title || null
    ).run();

    const blocks = await env.DB.prepare(
      `SELECT * FROM cms_page_content_blocks
       WHERE tenant_id = ? AND page_route = ? AND section_key = ?`
    ).bind(TENANT_ID, sourceRoute, sourceKey).all().catch(() => ({ results: [] }));

    let blocksCopied = 0;
    for (const block of blocks.results || []) {
      await env.DB.prepare(`
        INSERT INTO cms_page_content_blocks
        (id, tenant_id, page_route, section_key, block_key, block_type, eyebrow, title, subtitle, body,
         image_url, alt_text, href, action_label, action_type, action_value, sort_order, is_visible,
         config_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).bind(
        id("block"),
        TENANT_ID,
        targetRoute,
        targetKey,
        block.block_key,
        block.block_type || "card",
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
        Number(block.sort_order) || 0,
        block.is_visible === 0 ? 0 : 1,
        typeof block.config_json === "string" ? block.config_json : JSON.stringify(block.config_json || {})
      ).run().catch(() => null);
      blocksCopied += 1;
    }

    await env.DB.prepare(
      "UPDATE cms_pages SET status = 'draft', updated_at = datetime('now') WHERE tenant_id = ? AND route_path = ?"
    ).bind(TENANT_ID, targetRoute).run().catch(() => {});

    await bustCache(env,
      `sections:${TENANT_ID}:${targetRoute}`,
      `bootstrap:${TENANT_ID}`,
      `page:${targetRoute}`
    );

    let fragmentSync = null;
    try {
      if (isFragmentPageRoute(targetRoute)) {
        fragmentSync = await syncFragmentCmsToR2(env, targetRoute);
      }
    } catch (err) {
      console.warn("[cms/section/copy] R2 sync failed:", err?.message || err);
      fragmentSync = { error: String(err?.message || err) };
    }

    return json({
      success: true,
      source: { page_route: sourceRoute, section_key: sourceKey },
      copied: {
        id: newId,
        page_route: targetRoute,
        section_key: targetKey,
        sort_order: sortOrder,
        blocks_copied: blocksCopied,
      },
      fragment_sync: fragmentSync,
      message: `Copied to ${targetRoute}. Publish Live on that page to go public.`,
    });
  }

  // POST /api/cms/section/delete — soft-delete (D1 deleted_at + R2 archive). Undo restores from D1 only.
  if (path === "/api/cms/section/delete" && method === "POST") {
    const cmsUser = await requireCmsUser(request, env, sessionUser);
    if (!cmsUser) return json({ success: false, error: "Not authenticated" }, 401);

    const data = await body(request);
    const { page_route, section_key } = data;
    if (!page_route || !section_key) return json({ error: "page_route and section_key required" }, 400);

    const existing = await env.DB.prepare(
      `SELECT section_key, heading FROM cms_page_sections
       WHERE tenant_id = ? AND page_route = ? AND section_key = ?
         AND (deleted_at IS NULL OR deleted_at = '')
       LIMIT 1`
    ).bind(TENANT_ID, page_route, section_key).first().catch(() => null);
    if (!existing) return json({ success: false, error: "Section not found" }, 404);

    await env.DB.prepare(
      `UPDATE cms_page_sections
       SET deleted_at = datetime('now'), updated_at = datetime('now')
       WHERE tenant_id = ? AND page_route = ? AND section_key = ?`
    ).bind(TENANT_ID, page_route, section_key).run();

    const archive = await archiveAndClearLiveFragment(env, page_route, section_key);

    await bustCache(env,
      `sections:${TENANT_ID}:${page_route}`,
      `bootstrap:${TENANT_ID}`,
      `page:${page_route}`
    );

    let fragmentSync = null;
    if (isFragmentPageRoute(page_route)) {
      fragmentSync = await syncFragmentCmsToR2(env, page_route);
    }

    return json({
      success: true,
      soft_deleted: true,
      deleted: { page_route, section_key, heading: existing.heading || section_key },
      archive,
      fragment_sync: fragmentSync,
      undo_window_seconds: 30,
    });
  }

  // POST /api/cms/section/restore — clear deleted_at and re-render live fragment from D1 (never from R2 trash).
  if (path === "/api/cms/section/restore" && method === "POST") {
    const cmsUser = await requireCmsUser(request, env, sessionUser);
    if (!cmsUser) return json({ success: false, error: "Not authenticated" }, 401);

    const data = await body(request);
    const { page_route, section_key } = data;
    if (!page_route || !section_key) return json({ error: "page_route and section_key required" }, 400);

    const row = await env.DB.prepare(
      `SELECT * FROM cms_page_sections
       WHERE tenant_id = ? AND page_route = ? AND section_key = ?
         AND deleted_at IS NOT NULL AND deleted_at != ''
       LIMIT 1`
    ).bind(TENANT_ID, page_route, section_key).first().catch(() => null);
    if (!row) return json({ success: false, error: "Nothing to restore (expired or already restored)" }, 404);

    await env.DB.prepare(
      `UPDATE cms_page_sections
       SET deleted_at = NULL,
           restore_count = COALESCE(restore_count, 0) + 1,
           last_restored_at = datetime('now'),
           updated_at = datetime('now')
       WHERE tenant_id = ? AND page_route = ? AND section_key = ?`
    ).bind(TENANT_ID, page_route, section_key).run();

    const brand = await getBrand(env);
    const { blocksBySection } = await loadRouteSections(env, page_route, { includeHidden: true });
    const sectionBlocks = blocksBySection.get(section_key) || [];
    const nextCount = (Number(row.restore_count) || 0) + 1;
    const restored = { ...row, deleted_at: null, restore_count: nextCount, last_restored_at: new Date().toISOString() };
    const sync = await syncSectionToR2(env, page_route, restored, sectionBlocks, brand, {});

    await bustCache(env,
      `sections:${TENANT_ID}:${page_route}`,
      `bootstrap:${TENANT_ID}`,
      `page:${page_route}`
    );

    let fragmentSync = null;
    if (isFragmentPageRoute(page_route)) {
      fragmentSync = await syncFragmentCmsToR2(env, page_route);
    }

    return json({
      success: true,
      restored: {
        page_route,
        section_key,
        restore_count: nextCount,
        last_restored_at: restored.last_restored_at,
      },
      sync,
      fragment_sync: fragmentSync,
    });
  }
  return null;
}
