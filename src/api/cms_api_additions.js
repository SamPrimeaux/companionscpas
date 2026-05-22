/**
 * cms_api_additions.js
 * PRIMETECH v1 — Paste these routes into cms_api.js
 * before the final `return null;` line.
 *
 * Adds:
 *   GET  /api/cms/assets          — browse all cms_assets
 *   POST /api/cms/asset/save      — register new R2 upload
 *   GET  /api/cms/brand           — get brand settings
 *   POST /api/cms/brand/save      — update brand settings + bust KV
 *   POST /api/cms/section/delete  — soft delete a section
 *   KV invalidation on every save — CMS_CACHE.delete(key)
 *
 * KV cache keys used:
 *   brand:tenant_companionscpas
 *   sections:tenant_companionscpas:{page_route}
 *   bootstrap:tenant_companionscpas
 */

// ── KV cache invalidation helper ──────────────────────────────
async function bustCache(env, ...keys) {
  if (!env.CMS_CACHE) return;
  await Promise.all(keys.map(k => env.CMS_CACHE.delete(k).catch(() => {})));
}

// ── Paste these inside cmsRoutes(), before `return null;` ─────

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

  // POST /api/cms/asset/save
  if (path === "/api/cms/asset/save" && method === "POST") {
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

    return json({ success: true, deleted: { page_route, section_key } });
  }

  // ── KV bust on existing section/save ──────────────────────────
  // Add this inside the existing /api/cms/section/save handler,
  // just before the final `return json({ success: true... })`:
  //
  //   await bustCache(env,
  //     `sections:${TENANT_ID}:${page_route}`,
  //     `bootstrap:${TENANT_ID}`
  //   );
