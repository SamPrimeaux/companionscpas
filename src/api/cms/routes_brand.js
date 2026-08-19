// routes_brand.js — extracted from cms_api.js (tkt_cpas_mod_cms_api_20260818)
// Auto-split: verbatim route bodies. No behavior change.

import {
  TENANT_ID,
  json,
  id,
  body,
  bustCache,
  requireCmsUser,
  publishPageRoute,
  persistFooterChrome,
  listAllCmsPageRoutes,
  clampHeaderLogoPx,
} from "./shared.js";

export async function routesBrand(request, env, url, path, method, sessionUser = null) {
  if (path === "/api/cms/brand/tokens.css" && method === "GET") {
    const { getBrand } = await import("../render_page.js");
    const { buildBrandTokensCss } = await import("../brand_tokens.js");
    const brand = await getBrand(env);
    return new Response(buildBrandTokensCss(brand), {
      headers: {
        "content-type": "text/css; charset=utf-8",
        // Short TTL so Brand slider saves apply without a rebuild (KV brand bust is immediate).
        "cache-control": "public, max-age=30, stale-while-revalidate=60",
      },
    });
  }

  // Donation payment URLs — CMS-editable without worker redeploy
  if (path === "/api/cms/donation-settings" && method === "GET") {
    const { getEditablePaymentMethodsDefaults } = await import("../donate_payment_methods.js");
    const settings = await env.DB.prepare(
      `SELECT paypal_donate_url, venmo_donate_url, zeffy_donate_url, amazon_wishlist_url,
              provider, currency, default_amounts_json
       FROM donation_settings WHERE tenant_id = ? LIMIT 1`
    ).bind(TENANT_ID).first().catch(() => null);
    return json({
      success: true,
      settings: settings || {},
      default_methods: getEditablePaymentMethodsDefaults(),
    });
  }

  if (path === "/api/cms/donation-settings" && method === "POST") {
    const body = await request.json().catch(() => ({}));
    const fields = ["paypal_donate_url", "venmo_donate_url", "zeffy_donate_url", "amazon_wishlist_url"];
    const updates = [];
    const binds = [];
    for (const f of fields) {
      if (body[f] !== undefined) {
        updates.push(`${f} = ?`);
        binds.push(String(body[f] || "").trim());
      }
    }
    if (!updates.length) return json({ error: "No donation URL fields provided" }, 400);
    binds.push(TENANT_ID);
    await env.DB.prepare(
      `UPDATE donation_settings SET ${updates.join(", ")}, updated_at = datetime('now') WHERE tenant_id = ?`
    ).bind(...binds).run();
    const settings = await env.DB.prepare(
      `SELECT paypal_donate_url, venmo_donate_url, zeffy_donate_url, amazon_wishlist_url
       FROM donation_settings WHERE tenant_id = ? LIMIT 1`
    ).bind(TENANT_ID).first();
    return json({ success: true, settings });
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
    const footerJson = await persistFooterChrome(env, brand.footer_json);

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
        logo_width            = ?,
        logo_height           = ?,
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
      footerJson,
      typeof brand.socials_json === "string"    ? brand.socials_json    : JSON.stringify(brand.socials_json || {}),
      typeof brand.organization_json === "string" ? brand.organization_json : JSON.stringify(brand.organization_json || {}),
      typeof brand.seo_defaults_json === "string" ? brand.seo_defaults_json : JSON.stringify(brand.seo_defaults_json || {}),
      clampHeaderLogoPx(brand.logo_width),
      null,
      TENANT_ID
    ).run();

    // Bust KV — next request re-hydrates from D1
    await bustCache(env,
      `brand:${TENANT_ID}`,
      `bootstrap:${TENANT_ID}`
    );

    // Footer/org/socials/logos are baked into page artifacts — republish from cms_pages (D1), not a hardcoded route list.
    const triggeredBy = cmsUser?.email || cmsUser?.id || "dashboard";
    const republishResults = [];
    const routesToRepublish = await listAllCmsPageRoutes(env);
    for (const pageRoute of routesToRepublish) {
      republishResults.push(await publishPageRoute(env, pageRoute, triggeredBy));
    }
    const failed = republishResults.filter((r) => !r.success);

    return json({
      success: failed.length === 0,
      republished: republishResults.filter((r) => r.success).length,
      failed: failed.length,
      message: failed.length
        ? `Brand saved; ${failed.length} page(s) failed to republish.`
        : "Brand updated. Sitewide header/footer republished.",
    }, failed.length ? 207 : 200);
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
    const PUBLIC_ROUTES = ['/', '/about', '/adopt', '/fosters', '/contact', '/donate', '/community', '/events'];
    for (const r of PUBLIC_ROUTES) {
      await env.CMS_CACHE.delete('page:' + r).catch(() => {});
    }
    return json({ success: true, config: merged });
  }
  return null;
}
