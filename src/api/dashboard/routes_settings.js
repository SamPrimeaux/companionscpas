// routes_settings.js — extracted from dashboard_api.js (tkt_cpas_mod_dashboard_api_20260818)
// Auto-split: verbatim route bodies moved from the original ladder. No behavior change.

import { ORG, getAuthUser, json, safeJson } from "./shared.js";

async function handleSettingsGet(request, env, url, path, method) {
  if (path === '/api/dashboard/settings' && method === 'GET') {
    const session = await getAuthUser(request, env);
    if (!session) return json({ ok: false, error: 'Not authenticated' }, 401);
    const org = await env.DB.prepare(`
      SELECT id, name, legal_name, ein, email, phone, website_url,
             city, state, postal_code, mission, about, notification_prefs_json
      FROM organizations WHERE id = ? LIMIT 1
    `).bind(ORG).first().catch(() => null);
    if (!org) return json({ ok: false, error: 'Organization not found' }, 404);
    const defaultPrefs = {
      new_application: true,
      application_status_changed: true,
      new_donation: true,
      medical_overdue: true,
      daily_care_incomplete: false,
      new_intake: true,
      campaign_goal_reached: true,
      weekly_digest: false,
    };
    const prefs = Object.assign({}, defaultPrefs, safeJson(org.notification_prefs_json, {}));
    return json({
      ok: true,
      organization: {
        id: org.id,
        name: org.name || '',
        legal_name: org.legal_name || '',
        ein: org.ein || '',
        email: org.email || '',
        phone: org.phone || '',
        website_url: org.website_url || '',
        city: org.city || '',
        state: org.state || '',
        postal_code: org.postal_code || '',
        mailing_address: [org.city, org.state, org.postal_code].filter(Boolean).join(', '),
        mission: org.mission || '',
        about: org.about || '',
      },
      notification_prefs: prefs,
    });
  }
  return null;
}

async function handleSettingsOrgPatch(request, env, url, path, method) {
  if (path === '/api/dashboard/settings/org' && method === 'PATCH') {
    const session = await getAuthUser(request, env);
    if (!session) return json({ ok: false, error: 'Not authenticated' }, 401);
    const b = await request.json().catch(() => ({}));
    const fields = {
      name: b.name,
      legal_name: b.legal_name,
      ein: b.ein,
      email: b.email,
      phone: b.phone,
      website_url: b.website_url,
      city: b.city,
      state: b.state,
      postal_code: b.postal_code,
      mission: b.mission,
      about: b.about,
    };
    // Allow mailing_address as "City, ST ZIP" convenience write.
    if (typeof b.mailing_address === 'string' && b.mailing_address.trim() && !b.city) {
      const parts = b.mailing_address.split(',').map((s) => s.trim()).filter(Boolean);
      if (parts[0]) fields.city = parts[0];
      if (parts[1]) {
        const stZip = parts[1].split(/\s+/).filter(Boolean);
        if (stZip[0]) fields.state = stZip[0];
        if (stZip[1]) fields.postal_code = stZip.slice(1).join(' ');
      }
    }
    const sets = [];
    const vals = [];
    for (const [k, v] of Object.entries(fields)) {
      if (v === undefined) continue;
      sets.push(`${k} = ?`);
      vals.push(v == null ? null : String(v).trim());
    }
    if (!sets.length) return json({ ok: false, error: 'No fields to update' }, 400);
    sets.push(`updated_at = datetime('now')`);
    vals.push(ORG);
    await env.DB.prepare(`UPDATE organizations SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
    return json({ ok: true });
  }
  return null;
}

async function handleSettingsNotificationsPatch(request, env, url, path, method) {
  if (path === '/api/dashboard/settings/notifications' && method === 'PATCH') {
    const session = await getAuthUser(request, env);
    if (!session) return json({ ok: false, error: 'Not authenticated' }, 401);
    const b = await request.json().catch(() => ({}));
    const incoming = b.notification_prefs || b.prefs || b;
    const allowed = [
      'new_application', 'application_status_changed', 'new_donation', 'medical_overdue',
      'daily_care_incomplete', 'new_intake', 'campaign_goal_reached', 'weekly_digest',
    ];
    const next = {};
    for (const key of allowed) {
      if (incoming[key] === undefined) continue;
      next[key] = !!incoming[key];
    }
    const existing = await env.DB.prepare(
      `SELECT notification_prefs_json FROM organizations WHERE id = ? LIMIT 1`
    ).bind(ORG).first().catch(() => null);
    const merged = Object.assign({}, safeJson(existing?.notification_prefs_json, {}), next);
    await env.DB.prepare(`
      UPDATE organizations
      SET notification_prefs_json = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(JSON.stringify(merged), ORG).run();
    return json({ ok: true, notification_prefs: merged });
  }
  return null;
}

export async function routesSettings(request, env, url, path, method) {
  {
    const r = await handleSettingsGet(request, env, url, path, method);
    if (r) return r;
  }
  {
    const r = await handleSettingsOrgPatch(request, env, url, path, method);
    if (r) return r;
  }
  {
    const r = await handleSettingsNotificationsPatch(request, env, url, path, method);
    if (r) return r;
  }
  return null;
}
