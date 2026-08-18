// routes_fosters.js — extracted from dashboard_api.js (tkt_cpas_mod_dashboard_api_20260818)
// Auto-split: verbatim route bodies moved from the original ladder. No behavior change.

import { TENANT, json, nowIso, safeJson } from "./shared.js";

async function handleFostersList(request, env, url, path, method) {
  if (path === '/api/dashboard/fosters' && method === 'GET') {
    const statusFilter = url.searchParams.get('status') || 'active';
    let statusClause = '';
    if (statusFilter === 'active') statusClause = " AND f.status = 'active'";
    else if (statusFilter === 'ended') statusClause = " AND f.status != 'active'";
    const [rows, needsRows] = await Promise.all([
      env.DB.prepare(`
        SELECT f.*, a.name AS animal_name, a.species, a.breed, a.sex, a.age_label,
               a.status AS animal_status, a.photo_url, ca.cdn_url AS asset_cdn_url
        FROM foster_records f
        LEFT JOIN animal_profiles a ON a.id = f.animal_id
        LEFT JOIN cms_assets ca ON ca.asset_key = a.id AND ca.tenant_id = ?
        WHERE f.tenant_id = ?${statusClause}
        ORDER BY f.start_date DESC, f.created_at DESC LIMIT 100
      `).bind(TENANT, TENANT).all().catch(() => ({ results: [] })),
      env.DB.prepare(`
        SELECT a.id, a.name, a.species, a.breed, a.sex, a.age_label, a.status,
               a.foster_needed, a.photo_url, a.intake_date, a.updated_at,
               ca.cdn_url AS asset_cdn_url
        FROM animal_profiles a
        LEFT JOIN cms_assets ca ON ca.asset_key = a.id AND ca.tenant_id = ?
        WHERE a.tenant_id = ?
          AND a.foster_needed = 1
          AND lower(COALESCE(a.status, '')) NOT IN ('adopted', 'deceased', 'transferred', 'foster')
        ORDER BY a.featured DESC, a.updated_at DESC
        LIMIT 100
      `).bind(TENANT, TENANT).all().catch(() => ({ results: [] })),
    ]);
    return json({
      fosters: rows.results || [],
      needs_foster: needsRows.results || [],
    });
  }
  return null;
}

async function handleFosterCreate(request, env, url, path, method) {
  if (path === '/api/dashboard/fosters' && method === 'POST') {
    const b = await request.json().catch(() => ({}));
    const animalIdVal = String(b.animal_id || '').trim();
    const fosterName = String(b.foster_name || '').trim();
    if (!animalIdVal) return json({ ok: false, error: 'animal_id is required' }, 400);
    if (!fosterName) return json({ ok: false, error: 'foster_name is required' }, 400);

    const animalRow = await env.DB.prepare(
      `SELECT id FROM animal_profiles WHERE id = ? AND tenant_id = ? LIMIT 1`
    ).bind(animalIdVal, TENANT).first().catch(() => null);
    if (!animalRow) return json({ ok: false, error: 'Animal not found' }, 404);

    const now = nowIso();
    const startDate = b.start_date || now.slice(0, 10);
    const id = b.id || ('foster_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7));

    await env.DB.prepare(`
      UPDATE foster_records
      SET status = 'ended', end_date = COALESCE(end_date, ?), updated_at = ?
      WHERE animal_id = ? AND tenant_id = ? AND status = 'active'
    `).bind(startDate, now, animalIdVal, TENANT).run().catch(() => {});

    await env.DB.prepare(`
      INSERT INTO foster_records
        (id, tenant_id, animal_id, foster_name, foster_email, foster_phone, status,
         start_date, application_id, check_in_frequency, notes, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).bind(
      id, TENANT, animalIdVal, fosterName,
      b.foster_email || null, b.foster_phone || null,
      'active', startDate, b.application_id || null,
      b.check_in_frequency || 'weekly', b.notes || null, now, now
    ).run();

    await env.DB.prepare(
      `UPDATE animal_profiles SET status = 'foster', updated_at = ? WHERE id = ? AND tenant_id = ?`
    ).bind(now, animalIdVal, TENANT).run();

    const row = await env.DB.prepare(`SELECT * FROM foster_records WHERE id = ? LIMIT 1`)
      .bind(id).first().catch(() => null);
    return json({ ok: true, foster: row });
  }
  return null;
}

async function handleFosterPatch(request, env, url, path, method) {
  const fosterPatchMatch = path.match(/^\/api\/dashboard\/fosters\/([^/]+)$/);
  if (fosterPatchMatch && method === 'PATCH') {
    const fosterId = fosterPatchMatch[1];
    const b = await request.json().catch(() => ({}));
    const existing = await env.DB.prepare(
      `SELECT * FROM foster_records WHERE id = ? AND tenant_id = ? LIMIT 1`
    ).bind(fosterId, TENANT).first().catch(() => null);
    if (!existing) return json({ ok: false, error: 'Foster record not found' }, 404);

    const now = nowIso();
    const endDate = b.end_date || now.slice(0, 10);
    const sets = ['end_date = ?', "status = 'ended'", 'updated_at = ?'];
    const vals = [endDate, now];
    if ('notes' in b) { sets.push('notes = ?'); vals.push(b.notes ?? null); }
    vals.push(fosterId, TENANT);

    await env.DB.prepare(
      `UPDATE foster_records SET ${sets.join(', ')} WHERE id = ? AND tenant_id = ?`
    ).bind(...vals).run();

    if (existing.animal_id) {
      await env.DB.prepare(
        `UPDATE animal_profiles SET status = 'available', updated_at = ? WHERE id = ? AND tenant_id = ?`
      ).bind(now, existing.animal_id, TENANT).run();
    }

    const row = await env.DB.prepare(`SELECT * FROM foster_records WHERE id = ? LIMIT 1`)
      .bind(fosterId).first().catch(() => null);
    return json({ ok: true, foster: row });
  }
  return null;
}

async function handleAdoptions(request, env, url, path, method) {
  if (path === '/api/dashboard/adoptions') {
    // Outcomes roster: animals marked Adopted on their profile.
    // No separate adoptions table / adopter PII yet — do not invent applicants.
    const rows = await env.DB.prepare(`
      SELECT id, name, species, breed, sex, age_label, status, photo_url,
             intake_date, foster_needed, public_visible, featured,
             updated_at, created_at, metadata_json
      FROM animal_profiles
      WHERE tenant_id = ? AND lower(COALESCE(status, '')) = 'adopted'
      ORDER BY COALESCE(updated_at, created_at) DESC
      LIMIT 200
    `).bind(TENANT).all().catch(() => ({ results: [] }));
    const adoptions = (rows.results || []).map((a) => {
      const meta = safeJson(a.metadata_json, {});
      return {
        id: a.id,
        animal_id: a.id,
        animal_name: a.name,
        name: a.name,
        species: a.species,
        breed: a.breed,
        sex: a.sex,
        age_label: a.age_label,
        status: a.status,
        photo_url: a.photo_url,
        intake_date: a.intake_date,
        adopted_at: meta.adopted_at || a.updated_at || a.created_at || null,
        public_visible: a.public_visible,
        featured: a.featured,
        notes: meta.adoption_notes || null,
      };
    });
    return json({ adoptions, source: 'animal_profiles.status=adopted' });
  }
  return null;
}

export async function routesFosters(request, env, url, path, method) {
  {
    const r = await handleFostersList(request, env, url, path, method);
    if (r) return r;
  }
  {
    const r = await handleFosterCreate(request, env, url, path, method);
    if (r) return r;
  }
  {
    const r = await handleFosterPatch(request, env, url, path, method);
    if (r) return r;
  }
  {
    const r = await handleAdoptions(request, env, url, path, method);
    if (r) return r;
  }
  return null;
}
