// routes_misc.js — extracted from dashboard_api.js (tkt_cpas_mod_dashboard_api_20260818)
// Auto-split: verbatim route bodies moved from the original ladder. No behavior change.

import { TENANT, json, nowIso } from "./shared.js";

async function handleVolunteersList(request, env, url, path, method) {
  if (path === '/api/dashboard/volunteers' && method === 'GET') {
    const rows = await env.DB.prepare(
      `SELECT * FROM volunteer_records WHERE tenant_id = ? ORDER BY role, full_name`
    ).bind(TENANT).all().catch(() => ({ results: [] }));
    return json({ volunteers: rows.results || [], members: rows.results || [] });
  }
  return null;
}

async function handleVolunteerCreate(request, env, url, path, method) {
  if (path === '/api/dashboard/volunteers' && method === 'POST') {
    const b = await request.json().catch(() => ({}));
    const fullName = String(b.full_name || '').trim();
    if (!fullName) return json({ ok: false, error: 'full_name is required' }, 400);
    const now = nowIso();
    const slug = fullName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);
    const id = b.id || ('vol_' + slug + '_' + Date.now().toString(36).slice(2, 6));
    await env.DB.prepare(`
      INSERT INTO volunteer_records (id, tenant_id, full_name, email, role, status, hours_month, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?)
    `).bind(
      id, TENANT, fullName,
      b.email || null,
      b.role || 'Volunteer',
      b.status || 'active',
      now
    ).run();
    const row = await env.DB.prepare(`SELECT * FROM volunteer_records WHERE id = ? LIMIT 1`)
      .bind(id).first().catch(() => null);
    return json({ ok: true, id, volunteer: row });
  }
  return null;
}

async function handleTeam(request, env, url, path, method) {
  if (path === '/api/dashboard/team') {
    const rows = await env.DB.prepare(
      `SELECT * FROM volunteer_records WHERE tenant_id = ? ORDER BY role, full_name`
    ).bind(TENANT).all().catch(() => ({ results: [] }));
    return json({ members: rows.results || [] });
  }
  return null;
}

async function handleCalendar(request, env, url, path, method) {
  if (path === '/api/dashboard/calendar') {
    const rows = await env.DB.prepare(`
      SELECT dce.*, ap.name AS animal_name, ap.photo_url
      FROM dashboard_calendar_events dce
      LEFT JOIN animal_profiles ap ON ap.id = dce.animal_id
      ORDER BY starts_at ASC
    `).all().catch(() => ({ results: [] }));
    return json({ events: rows.results || [] });
  }
  return null;
}

async function handleSocialConnections(request, env, url, path, method) {
  if (path === '/api/dashboard/social-connections') {
    const rows = await env.DB.prepare(`
      SELECT spc.*, oi.status AS oauth_status, oi.last_error AS oauth_error
      FROM social_provider_connections spc
      LEFT JOIN oauth_integrations oi ON oi.provider = spc.provider AND oi.tenant_id = spc.tenant_id
      WHERE spc.tenant_id = ?
      ORDER BY spc.provider ASC
    `).bind(TENANT).all().catch(() => ({ results: [] }));
    return json({ connections: rows.results || [] });
  }
  return null;
}

async function handleCmsStub(request, env, url, path, method) {
  if (path === '/api/dashboard/cms') {
    const [pages, assets, themes, nav] = await Promise.all([
      env.DB.prepare(`SELECT * FROM cms_pages ORDER BY sort_order, updated_at DESC LIMIT 100`).all().catch(() => ({ results: [] })),
      env.DB.prepare(`SELECT * FROM cms_assets ORDER BY created_at DESC LIMIT 200`).all().catch(() => ({ results: [] })),
      env.DB.prepare(`SELECT * FROM cms_themes ORDER BY updated_at DESC LIMIT 20`).all().catch(() => ({ results: [] })),
      env.DB.prepare(`SELECT * FROM cms_navigation_items ORDER BY sort_order LIMIT 100`).all().catch(() => ({ results: [] })),
    ]);
    return json({ pages: pages.results || [], assets: assets.results || [], themes: themes.results || [], navigation: nav.results || [] });
  }
  return null;
}

async function handleConfig(request, env, url, path, method) {
  if (path === '/api/dashboard/config') {
    const [brand, theme, assets] = await Promise.all([
      env.DB.prepare(`SELECT * FROM cms_brand_settings WHERE tenant_id = ? LIMIT 1`).bind(TENANT).first().catch(() => null),
      env.DB.prepare(`SELECT * FROM cms_themes WHERE tenant_id = ? AND is_active = 1 LIMIT 1`).bind(TENANT).first().catch(() => null),
      env.DB.prepare(`SELECT * FROM cms_assets WHERE tenant_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 200`).bind(TENANT).all().catch(() => ({ results: [] })),
    ]);
    return json({ brand, theme, assets: assets.results || [] });
  }
  return null;
}

async function handleTasks(request, env, url, path, method) {
  if (path === '/api/dashboard/tasks') {
    const rows = await env.DB.prepare(`SELECT * FROM agentsam_todo ORDER BY sort_order, created_at`).all().catch(() => ({ results: [] }));
    return json({ todos: rows.results || [] });
  }
  return null;
}

export async function routesMisc(request, env, url, path, method) {
  {
    const r = await handleVolunteersList(request, env, url, path, method);
    if (r) return r;
  }
  {
    const r = await handleVolunteerCreate(request, env, url, path, method);
    if (r) return r;
  }
  {
    const r = await handleTeam(request, env, url, path, method);
    if (r) return r;
  }
  {
    const r = await handleCalendar(request, env, url, path, method);
    if (r) return r;
  }
  {
    const r = await handleSocialConnections(request, env, url, path, method);
    if (r) return r;
  }
  {
    const r = await handleCmsStub(request, env, url, path, method);
    if (r) return r;
  }
  {
    const r = await handleConfig(request, env, url, path, method);
    if (r) return r;
  }
  {
    const r = await handleTasks(request, env, url, path, method);
    if (r) return r;
  }
  return null;
}
