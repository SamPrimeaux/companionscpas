// routes_blocks.js — extracted from cms_api.js (tkt_cpas_mod_cms_api_20260818)
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
  isFragmentPageRoute,
} from "./shared.js";

export async function routesBlocks(request, env, url, path, method, sessionUser = null) {
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

    await env.DB.prepare("UPDATE cms_pages SET updated_at = datetime('now') WHERE tenant_id = ? AND route_path = ?")
      .bind(TENANT_ID, page_route).run().catch(() => {});

    await bustCache(env, `sections:${TENANT_ID}:${page_route}`, `bootstrap:${TENANT_ID}`, `page:${page_route}`);

    let fragmentSync = null;
    try {
      if (isFragmentPageRoute(page_route)) {
        fragmentSync = await syncFragmentCmsToR2(env, page_route);
      }
    } catch (err) {
      console.warn("[cms/block/save] R2 sync failed:", err?.message || err);
      fragmentSync = { error: String(err?.message || err) };
    }

    return json({ success: true, page_route, section_key, block_key, fragment_sync: fragmentSync });
  }

  if (path === "/api/cms/block/delete" && method === "POST") {
    const cmsUser = await requireCmsUser(request, env, sessionUser);
    if (!cmsUser) return json({ success: false, error: "Not authenticated" }, 401);

    const data = await body(request);
    const page_route = normalizeRouteInput(data.page_route || "/");
    const section_key = String(data.section_key || "").trim();
    const block_key = String(data.block_key || "").trim();
    if (!page_route || !section_key || !block_key) {
      return json({ success: false, error: "page_route, section_key, and block_key required" }, 400);
    }

    await env.DB.prepare(`
      DELETE FROM cms_page_content_blocks
      WHERE tenant_id = ? AND page_route = ? AND section_key = ? AND block_key = ?
    `).bind(TENANT_ID, page_route, section_key, block_key).run();

    await env.DB.prepare("UPDATE cms_pages SET updated_at = datetime('now') WHERE tenant_id = ? AND route_path = ?")
      .bind(TENANT_ID, page_route).run().catch(() => {});
    await bustCache(env, `sections:${TENANT_ID}:${page_route}`, `bootstrap:${TENANT_ID}`, `page:${page_route}`);

    let fragmentSync = null;
    try {
      if (isFragmentPageRoute(page_route)) {
        fragmentSync = await syncFragmentCmsToR2(env, page_route);
      }
    } catch (err) {
      console.warn("[cms/block/delete] R2 sync failed:", err?.message || err);
      fragmentSync = { error: String(err?.message || err) };
    }

    return json({ success: true, page_route, section_key, block_key, fragment_sync: fragmentSync });
  }

  if (path === "/api/cms/blocks/reorder" && method === "POST") {
    const cmsUser = await requireCmsUser(request, env, sessionUser);
    if (!cmsUser) return json({ success: false, error: "Not authenticated" }, 401);

    const data = await body(request);
    const page_route = normalizeRouteInput(data.page_route || "/");
    const section_key = String(data.section_key || "").trim();
    const keys = Array.isArray(data.block_keys)
      ? data.block_keys.map((k) => String(k || "").trim()).filter(Boolean)
      : [];
    if (!page_route || !section_key) return json({ success: false, error: "page_route and section_key required" }, 400);
    if (!keys.length) return json({ success: false, error: "block_keys required" }, 400);

    for (let i = 0; i < keys.length; i++) {
      await env.DB.prepare(`
        UPDATE cms_page_content_blocks
        SET sort_order = ?, updated_at = datetime('now')
        WHERE tenant_id = ? AND page_route = ? AND section_key = ? AND block_key = ?
      `).bind((i + 1) * 10, TENANT_ID, page_route, section_key, keys[i]).run();
    }

    await bustCache(env, `sections:${TENANT_ID}:${page_route}`, `bootstrap:${TENANT_ID}`, `page:${page_route}`);
    let fragmentSync = null;
    try {
      if (isFragmentPageRoute(page_route)) {
        fragmentSync = await syncFragmentCmsToR2(env, page_route);
      }
    } catch (err) {
      fragmentSync = { error: String(err?.message || err) };
    }
    return json({ success: true, page_route, section_key, block_keys: keys, fragment_sync: fragmentSync });
  }
  return null;
}
