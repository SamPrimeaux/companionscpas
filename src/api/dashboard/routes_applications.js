// routes_applications.js — extracted from dashboard_api.js (tkt_cpas_mod_dashboard_api_20260818)
// Auto-split: verbatim route bodies moved from the original ladder. No behavior change.

import { FOSTER_TENANT, json, nowIso, safeJson } from "./shared.js";

async function handleApplicationPatch(request, env, url, path, method) {
  const appPatchMatch = path.match(/^\/api\/dashboard\/applications\/([^/]+)$/);
  if (appPatchMatch && method === 'PATCH') {
    const appId = appPatchMatch[1];
    const b = await request.json().catch(() => ({}));
    const allowed = ['review_status','internal_notes','assigned_to'];
    const sets = []; const vals = [];
    for (const k of allowed) {
      if (k in b) { sets.push(`${k} = ?`); vals.push(b[k] ?? null); }
    }
    if (!sets.length) return json({ ok: false, error: 'No updatable fields' }, 400);
    sets.push('updated_at = ?'); vals.push(nowIso());
    vals.push(appId);
    await env.DB.prepare(
      `UPDATE cpas_foster_applications SET ${sets.join(', ')} WHERE id = ?`
    ).bind(...vals).run();
    return json({ ok: true });
  }
  return null;
}

async function handleApplicationDetailGet(request, env, url, path, method) {
  const appDetailMatch = path.match(/^\/api\/dashboard\/applications\/([^/]+)$/);
  if (appDetailMatch && method === 'GET') {
    const appId = appDetailMatch[1];
    const row = await env.DB.prepare(`
      SELECT id, first_name, last_name,
             first_name || ' ' || last_name AS applicant_name,
             email AS applicant_email, phone AS applicant_phone,
             city, state_province, postal_code,
             review_status, review_status AS status, source, submitted_at, created_at,
             assigned_to, internal_notes, answers_json, form_id
      FROM cpas_foster_applications
      WHERE tenant_id = ? AND id = ?
      LIMIT 1
    `).bind(FOSTER_TENANT, appId).first().catch(() => null);
    if (!row) return json({ ok: false, error: 'Application not found' }, 404);
    return json({ application: { ...row, answers: safeJson(row.answers_json, {}) } });
  }
  return null;
}

async function handleApplicationsList(request, env, url, path, method) {
  if (path === '/api/dashboard/applications' && method === 'GET') {
    const rows = await env.DB.prepare(`
      SELECT id, first_name, last_name,
             first_name || ' ' || last_name AS applicant_name,
             email AS applicant_email, phone AS applicant_phone,
             city, state_province,
             review_status, review_status AS status, source, submitted_at,
             assigned_to, internal_notes, answers_json, form_id
      FROM cpas_foster_applications
      WHERE tenant_id = ?
      ORDER BY submitted_at DESC
    `).bind(FOSTER_TENANT).all().catch(() => ({ results: [] }));
    return json({ applications: (rows.results || []).map(a => ({ ...a, answers: safeJson(a.answers_json, {}) })) });
  }
  return null;
}

export async function routesApplications(request, env, url, path, method) {
  {
    const r = await handleApplicationPatch(request, env, url, path, method);
    if (r) return r;
  }
  {
    const r = await handleApplicationDetailGet(request, env, url, path, method);
    if (r) return r;
  }
  {
    const r = await handleApplicationsList(request, env, url, path, method);
    if (r) return r;
  }
  return null;
}
