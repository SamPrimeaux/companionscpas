function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}

async function firstJson(env, sql, fallback = {}) {
  const row = await env.DB.prepare(sql).first().catch(() => null);
  if (!row) return fallback;
  return row;
}

export async function dashboardConfigRoutes(request, env, url) {
  if (url.pathname !== "/api/dashboard/config") return null;

  const brand = await firstJson(env, `
    SELECT *
    FROM cms_brand_settings
    WHERE tenant_id = 'tenant_companionscpas'
    LIMIT 1
  `, {});

  const theme = await firstJson(env, `
    SELECT *
    FROM cms_themes
    WHERE tenant_id = 'tenant_companionscpas'
      AND is_active = 1
    ORDER BY published_at DESC, updated_at DESC
    LIMIT 1
  `, {});

  const assets = await env.DB.prepare(`
    SELECT asset_key, label, url, alt_text, asset_type, usage_context, metadata_json
    FROM cms_assets
    WHERE tenant_id = 'tenant_companionscpas'
      AND status = 'active'
    ORDER BY asset_key ASC
  `).all().catch(() => ({ results: [] }));

  return json({
    tenant_id: "tenant_companionscpas",
    brand,
    theme,
    assets: assets.results || []
  });
}
