// dashboard_api.js — Companions of CPAS dashboard API
// Canonical animal table: animal_profiles (animals table deleted)
// Tenant: tenant_id = 'tenant_companionscpas'
// Foster apps tenant: 'companions_cpas'  (legacy mismatch, kept as-is)
// Org: org_companionscpas

import { getAuthUser } from "./session_api.js";

const TENANT = 'tenant_companionscpas';
const FOSTER_TENANT = 'companions_cpas';
const ORG = 'org_companionscpas';

function safeJson(value, fallback) {
  try { return JSON.parse(value || ''); } catch { return fallback; }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function nowIso() { return new Date().toISOString(); }

function animalId(name) {
  return 'animal_' + String(name).toLowerCase()
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40)
    + '_' + Date.now();
}

function taskId() { return 'task_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7); }
function postId()  { return 'post_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7); }

// Normalize a raw animal_profiles row into the API shape
function normalizeAnimal(a) {
  return {
    ...a,
    photo:       a.asset_cdn_url || a.photo_url || null,
    tags:        safeJson(a.tags_json, []),
    metadata:    safeJson(a.metadata_json, {}),
    foster_needed:  a.foster_needed  ? 1 : 0,
    public_visible: a.public_visible ? 1 : 0,
    featured:       a.featured       ? 1 : 0,
    status: (a.status || 'available').toLowerCase(),
  };
}

export async function dashboardApiRoutes(request, env, url) {
  const path   = url.pathname;
  const method = request.method;

  // ─── GET /api/dashboard/overview ─────────────────────────────────────────
  if (path === '/api/dashboard/overview') {
    const [animalRows, appRows, campaignRows, volunteerRows] = await Promise.all([
      env.DB.prepare(`
        SELECT ap.*, ca.cdn_url AS asset_cdn_url
        FROM animal_profiles ap
        LEFT JOIN cms_assets ca ON ca.asset_key = ap.id AND ca.tenant_id = ?
        WHERE ap.tenant_id = ?
        ORDER BY ap.featured DESC, ap.sort_order ASC, ap.updated_at DESC
      `).bind(TENANT, TENANT).all().catch(() => ({ results: [] })),
      env.DB.prepare(`SELECT id, first_name || ' ' || last_name AS applicant_name, review_status AS status, submitted_at FROM cpas_foster_applications WHERE tenant_id = ? ORDER BY submitted_at DESC LIMIT 20`).bind(FOSTER_TENANT).all().catch(() => ({ results: [] })),
      env.DB.prepare(`SELECT *, goal_amount_cents AS goal_cents, raised_amount_cents AS raised_cents FROM fundraising_campaigns WHERE is_public = 1 ORDER BY updated_at DESC`).all().catch(() => ({ results: [] })),
      env.DB.prepare(`SELECT * FROM volunteer_records ORDER BY hours_month DESC`).all().catch(() => ({ results: [] })),
    ]);
    const raised = (campaignRows.results || []).reduce((s, c) => s + Number(c.raised_cents || 0), 0);
    const goal   = (campaignRows.results || []).reduce((s, c) => s + Number(c.goal_cents  || 0), 0);
    return json({
      kpis: {
        animals:      animalRows.results?.length || 0,
        applications: appRows.results?.length    || 0,
        volunteers:   volunteerRows.results?.length || 0,
        raised_cents: raised,
        goal_cents:   goal,
      },
      animals:      (animalRows.results || []).map(normalizeAnimal),
      applications: appRows.results || [],
      campaigns:    campaignRows.results || [],
      volunteers:   volunteerRows.results || [],
    });
  }

  // ─── GET /api/dashboard/animals ──────────────────────────────────────────
  if (path === '/api/dashboard/animals' && method === 'GET') {
    const session = await getAuthUser(request, env);
    if (!session) return json({ error: 'Not authenticated' }, 401);

    const rows = await env.DB.prepare(`
      SELECT ap.*, ca.cdn_url AS asset_cdn_url, ca.public_url AS asset_public_url, ca.alt_text AS asset_alt_text
      FROM animal_profiles ap
      LEFT JOIN cms_assets ca ON ca.asset_key = ap.id AND ca.tenant_id = ?
      WHERE ap.tenant_id = ?
      ORDER BY ap.featured DESC, ap.sort_order ASC, ap.updated_at DESC
    `).bind(TENANT, TENANT).all().catch(() => ({ results: [] }));
    return json({ animals: (rows.results || []).map(normalizeAnimal) });
  }

  // ─── POST /api/dashboard/animals ─────────────────────────────────────────
  if (path === '/api/dashboard/animals' && method === 'POST') {
    const b = await request.json().catch(() => ({}));
    const name = String(b.name || '').trim();
    if (!name) return json({ ok: false, error: 'name is required' }, 400);
    const id  = animalId(name);
    const now = nowIso();
    await env.DB.prepare(`
      INSERT INTO animal_profiles
        (id, tenant_id, name, species, breed, sex, age_label, status,
         weight_label, energy_level, bio, good_with_dogs, good_with_cats, good_with_kids,
         medical_notes, foster_needed, featured, public_visible,
         sort_order, tags_json, intake_date, photo_url, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).bind(
      id, TENANT, name,
      b.species     || 'Dog',
      b.breed       || null,
      b.sex         || 'Unknown',
      b.age_label   || 'Unknown',
      b.status      || 'available',
      b.weight_label|| null,
      b.energy_level|| null,
      b.bio         || null,
      b.good_with_dogs || 'Unknown',
      b.good_with_cats || 'Unknown',
      b.good_with_kids || 'Unknown',
      b.medical_notes  || null,
      b.foster_needed  ? 1 : 0,
      b.featured       ? 1 : 0,
      b.public_visible !== undefined ? (b.public_visible ? 1 : 0) : 1,
      b.sort_order  || 50,
      b.tags_json   || '[]',
      b.intake_date || null,
      b.photo_url   || null,
      now, now
    ).run();
    return json({ ok: true, id });
  }

  // ─── GET /api/dashboard/animals/:id ──────────────────────────────────────
  const animalDetailMatch = path.match(/^\/api\/dashboard\/animals\/([^/]+)$/);
  if (animalDetailMatch && method === 'GET') {
    const id = animalDetailMatch[1];
    const [animalRow, fosterRow, connRows, postRows, appCount, noteCount] = await Promise.all([
      env.DB.prepare(`
        SELECT ap.*, ca.cdn_url AS asset_cdn_url, ca.public_url AS asset_public_url, ca.alt_text AS asset_alt_text
        FROM animal_profiles ap
        LEFT JOIN cms_assets ca ON ca.asset_key = ap.id AND ca.tenant_id = ?
        WHERE ap.id = ? AND ap.tenant_id = ?
        LIMIT 1
      `).bind(TENANT, id, TENANT).first().catch(() => null),
      env.DB.prepare(`
        SELECT * FROM foster_records
        WHERE animal_id = ? AND tenant_id = ? AND status = 'active'
        ORDER BY start_date DESC LIMIT 1
      `).bind(id, TENANT).first().catch(() => null),
      env.DB.prepare(`
        SELECT id, provider, account_label, page_name, page_id,
               provider_account_name, status, last_connected_at, last_tested_at
        FROM social_provider_connections
        WHERE tenant_id = ?
        ORDER BY provider ASC
      `).bind(TENANT).all().catch(() => ({ results: [] })),
      env.DB.prepare(`
        SELECT id, platform, status, content_text, media_url, media_type, media_json,
               scheduled_at, published_at, created_at
        FROM scheduled_posts
        WHERE animal_id = ? AND tenant_id = ?
        ORDER BY created_at DESC LIMIT 20
      `).bind(id, TENANT).all().catch(() => ({ results: [] })),
      env.DB.prepare(`
        SELECT COUNT(*) AS n FROM cpas_foster_applications
        WHERE tenant_id = ? AND (
          answers_json LIKE ? OR
          id IN (SELECT application_id FROM foster_records WHERE animal_id = ? AND application_id IS NOT NULL)
        )
      `).bind(FOSTER_TENANT, `%"${id}"%`, id).first().catch(() => ({ n: 0 })),
      env.DB.prepare(
        `SELECT COUNT(*) AS n FROM animal_notes WHERE animal_id = ? AND tenant_id = ?`
      ).bind(id, TENANT).first().catch(() => ({ n: 0 })),
    ]);
    if (!animalRow) return json({ ok: false, error: 'Animal not found' }, 404);

    // Also pull oauth_integrations so frontend knows which platforms are wired
    const oauthRows = await env.DB.prepare(`
      SELECT provider, status, provider_account_name, last_used_at, last_error
      FROM oauth_integrations WHERE tenant_id = ? ORDER BY provider ASC
    `).bind(TENANT).all().catch(() => ({ results: [] }));

    return json({
      animal:              normalizeAnimal(animalRow),
      foster:              fosterRow || null,
      social_connections:  connRows.results || [],
      oauth_integrations:  oauthRows.results || [],
      scheduled_posts:     postRows.results || [],
      application_count:   appCount?.n  || 0,
      note_count:          noteCount?.n || 0,
    });
  }

  // ─── PATCH /api/dashboard/animals/:id ────────────────────────────────────
  if (animalDetailMatch && method === 'PATCH') {
    const id = animalDetailMatch[1];
    const b  = await request.json().catch(() => ({}));
    const allowed = [
      'name','species','breed','sex','age_label','status','weight_label',
      'energy_level','bio','good_with_dogs','good_with_cats','good_with_kids',
      'medical_notes','foster_needed','featured','public_visible',
      'sort_order','tags_json','intake_date','photo_url'
    ];
    const sets = []; const vals = [];
    for (const k of allowed) {
      if (k in b) {
        sets.push(`${k} = ?`);
        if (['foster_needed','featured','public_visible'].includes(k)) {
          vals.push(b[k] ? 1 : 0);
        } else {
          vals.push(b[k] ?? null);
        }
      }
    }
    if (!sets.length) return json({ ok: false, error: 'No updatable fields provided' }, 400);
    sets.push('updated_at = ?'); vals.push(nowIso());
    vals.push(id); vals.push(TENANT);
    await env.DB.prepare(
      `UPDATE animal_profiles SET ${sets.join(', ')} WHERE id = ? AND tenant_id = ?`
    ).bind(...vals).run();
    return json({ ok: true, id });
  }

  // ─── GET /api/dashboard/animals/:id/care-tasks ───────────────────────────
  const careTasksMatch = path.match(/^\/api\/dashboard\/animals\/([^/]+)\/care-tasks$/);
  if (careTasksMatch && method === 'GET') {
    const animalId = careTasksMatch[1];
    const rows = await env.DB.prepare(`
      SELECT * FROM care_tasks
      WHERE animal_id = ?
      ORDER BY
        CASE status WHEN 'open' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END ASC,
        CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 ELSE 2 END ASC,
        due_at ASC NULLS LAST,
        created_at DESC
    `).bind(animalId).all().catch(() => ({ results: [] }));
    return json({ care_tasks: rows.results || [] });
  }

  // ─── POST /api/dashboard/animals/:id/care-tasks ──────────────────────────
  if (careTasksMatch && method === 'POST') {
    const animalIdVal = careTasksMatch[1];
    const b = await request.json().catch(() => ({}));
    const title = String(b.title || '').trim();
    const taskType = String(b.task_type || '').trim();
    if (!title)    return json({ ok: false, error: 'title is required' }, 400);
    if (!taskType) return json({ ok: false, error: 'task_type is required' }, 400);
    const validTypes = ['feed','walk','med','vaccine','procedure','check'];
    if (!validTypes.includes(taskType)) {
      return json({ ok: false, error: `task_type must be one of: ${validTypes.join(', ')}` }, 400);
    }
    const id  = taskId();
    const now = nowIso();
    await env.DB.prepare(`
      INSERT INTO care_tasks
        (id, organization_id, animal_id, task_type, title, description,
         status, priority, due_at, assigned_to_user_id, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    `).bind(
      id, ORG, animalIdVal, taskType, title,
      b.description        || null,
      'open',
      b.priority           || 'normal',
      b.due_at             || null,
      b.assigned_to_user_id|| null,
      now, now
    ).run();
    return json({ ok: true, id });
  }

  // ─── PATCH /api/dashboard/animals/:id/care-tasks/:taskId ─────────────────
  const careTaskPatchMatch = path.match(/^\/api\/dashboard\/animals\/([^/]+)\/care-tasks\/([^/]+)$/);
  if (careTaskPatchMatch && method === 'PATCH') {
    const taskIdVal = careTaskPatchMatch[2];
    const b = await request.json().catch(() => ({}));
    const allowed = ['status','title','description','priority','due_at','completed_at','assigned_to_user_id'];
    const sets = []; const vals = [];
    for (const k of allowed) {
      if (k in b) { sets.push(`${k} = ?`); vals.push(b[k] ?? null); }
    }
    // Auto-set completed_at when completing
    if (b.status === 'completed' && !('completed_at' in b)) {
      sets.push('completed_at = ?'); vals.push(nowIso());
    }
    if (!sets.length) return json({ ok: false, error: 'No updatable fields provided' }, 400);
    sets.push('updated_at = ?'); vals.push(nowIso());
    vals.push(taskIdVal);
    await env.DB.prepare(
      `UPDATE care_tasks SET ${sets.join(', ')} WHERE id = ?`
    ).bind(...vals).run();
    return json({ ok: true });
  }

  // ─── GET /api/dashboard/animals/:id/applications ─────────────────────────
  const appsMatch = path.match(/^\/api\/dashboard\/animals\/([^/]+)\/applications$/);
  if (appsMatch && method === 'GET') {
    const animalIdVal = appsMatch[1];
    // Fetch animal name so we can match by name in answers_json too
    const animalRow = await env.DB.prepare(
      `SELECT name FROM animal_profiles WHERE id = ? LIMIT 1`
    ).bind(animalIdVal).first().catch(() => null);
    const animalName = animalRow?.name || '';

    const rows = await env.DB.prepare(`
      SELECT
        fa.*,
        fr.id AS foster_record_id,
        fr.status AS foster_record_status,
        fr.start_date AS foster_start_date
      FROM cpas_foster_applications fa
      LEFT JOIN foster_records fr ON fr.application_id = fa.id
      WHERE fa.tenant_id = ?
        AND (
          fa.answers_json LIKE ?
          OR fa.answers_json LIKE ?
          OR fr.animal_id = ?
        )
      ORDER BY fa.submitted_at DESC
      LIMIT 50
    `).bind(
      FOSTER_TENANT,
      `%"${animalIdVal}"%`,
      `%"${animalName}"%`,
      animalIdVal
    ).all().catch(() => ({ results: [] }));

    return json({
      applications: (rows.results || []).map(a => ({
        ...a,
        answers: safeJson(a.answers_json, {}),
      }))
    });
  }

  // ─── PATCH /api/dashboard/applications/:id (internal notes / review status)
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

  // ─── POST /api/dashboard/animals/:id/publish ─────────────────────────────
  const publishMatch = path.match(/^\/api\/dashboard\/animals\/([^/]+)\/publish$/);
  if (publishMatch && method === 'POST') {
    const animalIdVal = publishMatch[1];
    const b = await request.json().catch(() => ({}));
    const platforms = Array.isArray(b.platforms) ? b.platforms : [];
    if (!platforms.length) return json({ ok: false, error: 'platforms array is required' }, 400);
    const contentText = String(b.content_text || '').trim();
    if (!contentText) return json({ ok: false, error: 'content_text is required' }, 400);

    const mediaItems = Array.isArray(b.media)
      ? b.media.filter(m => m && (m.url || m.public_url)).map(m => ({
          url: String(m.url || m.public_url),
          type: String(m.type || m.media_type || 'image').toLowerCase(),
          name: String(m.name || m.filename || '').trim() || null,
          mime_type: m.mime_type || null,
        }))
      : [];
    const primaryMedia = mediaItems[0] || (b.media_url ? {
      url: String(b.media_url),
      type: String(b.media_type || 'image').toLowerCase(),
      name: null,
      mime_type: null,
    } : null);
    const mediaJson = mediaItems.length ? JSON.stringify(mediaItems) : null;

    const now        = nowIso();
    const scheduledAt = b.scheduled_at || null;
    const status     = scheduledAt ? 'scheduled' : 'queued';
    const postIds    = [];
    for (const platform of platforms) {
      const id = postId();
      postIds.push(id);
      const insertWithJson = env.DB.prepare(`
        INSERT INTO scheduled_posts
          (id, tenant_id, animal_id, platform, status, content_text,
           media_url, media_type, media_json, scheduled_at, created_by, created_at, updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).bind(
        id, TENANT, animalIdVal,
        String(platform).toLowerCase(),
        status, contentText,
        primaryMedia?.url || null,
        primaryMedia?.type || 'image',
        mediaJson,
        scheduledAt,
        b.created_by || 'dashboard',
        now, now
      );
      const insertLegacy = env.DB.prepare(`
        INSERT INTO scheduled_posts
          (id, tenant_id, animal_id, platform, status, content_text,
           media_url, media_type, scheduled_at, created_by, created_at, updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
      `).bind(
        id, TENANT, animalIdVal,
        String(platform).toLowerCase(),
        status, contentText,
        primaryMedia?.url || null,
        primaryMedia?.type || 'image',
        scheduledAt,
        b.created_by || 'dashboard',
        now, now
      );
      try {
        await insertWithJson.run();
      } catch {
        await insertLegacy.run();
      }

      // Mirror to dashboard_calendar_events for scheduling visibility
      await env.DB.prepare(`
        INSERT INTO dashboard_calendar_events
          (id, tenant_id, animal_id, title, event_type, starts_at, platform, content, status, created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?)
      `).bind(
        'cal_' + id, TENANT, animalIdVal,
        `Post: ${platform}`,
        'social_post',
        scheduledAt || now,
        String(platform).toLowerCase(),
        contentText,
        status, now
      ).run().catch(() => {}); // non-fatal
    }
    return json({ ok: true, post_ids: postIds, status });
  }

  // ─── DELETE /api/dashboard/animals/:id/posts/:postId ─────────────────────
  const deletePostMatch = path.match(/^\/api\/dashboard\/animals\/([^/]+)\/posts\/([^/]+)$/);
  if (deletePostMatch && method === 'DELETE') {
    const postIdVal = deletePostMatch[2];
    await env.DB.prepare(
      `UPDATE scheduled_posts SET status = 'cancelled', updated_at = ? WHERE id = ? AND tenant_id = ?`
    ).bind(nowIso(), postIdVal, TENANT).run();
    return json({ ok: true });
  }

  // ─── GET /api/dashboard/applications ─────────────────────────────────────
  if (path === '/api/dashboard/applications' && method === 'GET') {
    const rows = await env.DB.prepare(`
      SELECT id, first_name || ' ' || last_name AS applicant_name,
             email AS applicant_email, phone AS applicant_phone,
             review_status AS status, source, submitted_at,
             assigned_to, internal_notes, answers_json
      FROM cpas_foster_applications
      WHERE tenant_id = ?
      ORDER BY submitted_at DESC
    `).bind(FOSTER_TENANT).all().catch(() => ({ results: [] }));
    return json({ applications: (rows.results || []).map(a => ({ ...a, answers: safeJson(a.answers_json, {}) })) });
  }

  // ─── GET /api/dashboard/fundraising ──────────────────────────────────────
  if (path === '/api/dashboard/fundraising' && method === 'GET') {
    const rows = await env.DB.prepare(`
      SELECT *, goal_amount_cents AS goal_cents, raised_amount_cents AS raised_cents,
             COALESCE(campaign_type, 'fundraiser') AS category
      FROM fundraising_campaigns WHERE is_public = 1 ORDER BY updated_at DESC
    `).all().catch(() => ({ results: [] }));
    return json({ campaigns: rows.results || [] });
  }

  if (path === '/api/dashboard/fundraising' && method === 'POST') {
    const b = await request.json().catch(() => ({}));
    const title = String(b.title || '').trim();
    if (!title) return json({ ok: false, error: 'Campaign title is required' }, 400);
    const now  = nowIso();
    const slug = String(b.slug || title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'campaign';
    const id   = b.id || `campaign_${slug}_${Date.now()}`;
    await env.DB.prepare(`INSERT INTO fundraising_campaigns (id,organization_id,title,slug,description,goal_amount_cents,raised_amount_cents,status,starts_at,ends_at,is_public,campaign_type,short_description,donor_count,created_at,updated_at) VALUES (?,?,?,?,?,?,0,?,?,?,?,?,?,0,?,?)`)
      .bind(id, b.organization_id || TENANT, title, slug, b.description || '', Math.max(0, Number(b.goal_amount_cents || 0)), b.status || 'active', b.starts_at || null, b.ends_at || null, b.is_public === 0 ? 0 : 1, b.campaign_type || 'fundraiser', b.short_description || String(b.description || '').slice(0, 240), now, now).run();
    return json({ ok: true, id });
  }

  if (path === '/api/dashboard/fundraising' && method === 'PUT') {
    const b = await request.json().catch(() => ({}));
    if (!b.id) return json({ ok: false, error: 'id required' }, 400);
    const title = String(b.title || '').trim();
    if (!title) return json({ ok: false, error: 'title required' }, 400);
    const slug = String(b.slug || title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'campaign';
    await env.DB.prepare(`UPDATE fundraising_campaigns SET title=?,slug=?,description=?,goal_amount_cents=?,status=?,starts_at=?,ends_at=?,is_public=?,campaign_type=?,short_description=?,updated_at=? WHERE id=?`)
      .bind(title, slug, b.description || '', Math.max(0, Number(b.goal_amount_cents || 0)), b.status || 'active', b.starts_at || null, b.ends_at || null, b.is_public === 0 ? 0 : 1, b.campaign_type || 'fundraiser', b.short_description || String(b.description || '').slice(0, 240), nowIso(), b.id).run();
    return json({ ok: true, id: b.id });
  }

  // ─── GET /api/dashboard/donations ────────────────────────────────────────
  if (path === '/api/dashboard/donations' && method === 'GET') {
    const rows = await env.DB.prepare(`
      SELECT d.*, dn.full_name AS donor_name, dn.email AS donor_email, fc.title AS campaign_title
      FROM donations d
      LEFT JOIN donors dn ON dn.id = d.donor_id
      LEFT JOIN fundraising_campaigns fc ON fc.id = d.campaign_id
      ORDER BY COALESCE(d.donated_at, d.created_at) DESC LIMIT 250
    `).all().catch(() => ({ results: [] }));
    return json({ donations: rows.results || [] });
  }

  if (path === '/api/dashboard/donations' && method === 'POST') {
    const b = await request.json().catch(() => ({}));
    const amount = Math.max(0, Number(b.amount_cents || 0));
    if (!amount) return json({ ok: false, error: 'amount_cents required' }, 400);
    const now = nowIso();
    const id  = b.id || `don_${Date.now()}`;
    await env.DB.prepare(`INSERT INTO donations (id,organization_id,donor_id,campaign_id,amount_cents,currency,status,payment_provider,donor_message,is_anonymous,donated_at,created_at) VALUES (?,?,NULL,?,'usd',?,?,?,?,?,?)`)
      .bind(id, b.organization_id || TENANT, b.campaign_id || null, amount, b.status || 'received', b.payment_provider || 'manual', b.donor_message || null, String(b.donor_name || '').toLowerCase() === 'anonymous' ? 1 : 0, b.donated_at || now, now).run();
    if (b.campaign_id && ['received','completed','paid','succeeded'].includes(String(b.status || 'received').toLowerCase())) {
      await env.DB.prepare(`UPDATE fundraising_campaigns SET raised_amount_cents=COALESCE(raised_amount_cents,0)+?,donor_count=COALESCE(donor_count,0)+1,updated_at=? WHERE id=?`)
        .bind(amount, now, b.campaign_id).run();
    }
    return json({ ok: true, id });
  }

  // ─── Simple read-only routes ──────────────────────────────────────────────
  if (path === '/api/dashboard/team') {
    const rows = await env.DB.prepare(`SELECT * FROM volunteer_records ORDER BY role, full_name`).all().catch(() => ({ results: [] }));
    return json({ members: rows.results || [] });
  }

  if (path === '/api/dashboard/calendar') {
    const rows = await env.DB.prepare(`
      SELECT dce.*, ap.name AS animal_name, ap.photo_url
      FROM dashboard_calendar_events dce
      LEFT JOIN animal_profiles ap ON ap.id = dce.animal_id
      ORDER BY starts_at ASC
    `).all().catch(() => ({ results: [] }));
    return json({ events: rows.results || [] });
  }

  if (path === '/api/dashboard/fosters') {
    const rows = await env.DB.prepare(`
      SELECT f.*, a.name AS animal_name, a.species, a.breed, a.sex, a.age_label,
             a.status AS animal_status, ca.cdn_url AS asset_cdn_url
      FROM foster_records f
      LEFT JOIN animal_profiles a ON a.id = f.animal_id
      LEFT JOIN cms_assets ca ON ca.asset_key = a.id AND ca.tenant_id = ?
      WHERE f.tenant_id = ?
      ORDER BY f.created_at DESC LIMIT 100
    `).bind(TENANT, TENANT).all().catch(() => ({ results: [] }));
    return json({ fosters: rows.results || [] });
  }

  if (path === '/api/dashboard/adoptions') {
    const rows = await env.DB.prepare(`SELECT * FROM cpas_foster_applications WHERE tenant_id = ? AND review_status = 'approved' ORDER BY created_at DESC LIMIT 100`).bind(FOSTER_TENANT).all().catch(() => ({ results: [] }));
    return json({ adoptions: rows.results || [] });
  }

  if (path === '/api/dashboard/intakes') {
    const rows = await env.DB.prepare(`SELECT * FROM animal_profiles WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 100`).bind(TENANT).all().catch(() => ({ results: [] }));
    return json({ intakes: (rows.results || []).map(normalizeAnimal) });
  }

  if (path === '/api/dashboard/medical') {
    const rows = await env.DB.prepare(`
      SELECT ct.*, ap.name AS animal_name, ap.photo_url
      FROM care_tasks ct
      LEFT JOIN animal_profiles ap ON ap.id = ct.animal_id
      WHERE ct.task_type IN ('med','vaccine','procedure','check')
      ORDER BY CASE ct.status WHEN 'open' THEN 0 ELSE 1 END ASC,
               CASE ct.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 ELSE 2 END ASC,
               ct.due_at ASC NULLS LAST
      LIMIT 200
    `).all().catch(() => ({ results: [] }));
    return json({ medical: rows.results || [] });
  }

  if (path === '/api/dashboard/daily-care') {
    const rows = await env.DB.prepare(`
      SELECT ct.*, ap.name AS animal_name, ap.photo_url
      FROM care_tasks ct
      LEFT JOIN animal_profiles ap ON ap.id = ct.animal_id
      WHERE ct.task_type IN ('feed','walk')
      ORDER BY CASE ct.status WHEN 'open' THEN 0 ELSE 1 END ASC,
               ct.due_at ASC NULLS LAST
      LIMIT 200
    `).all().catch(() => ({ results: [] }));
    return json({ care_tasks: rows.results || [] });
  }

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

  if (path === '/api/dashboard/cms') {
    const [pages, assets, themes, nav] = await Promise.all([
      env.DB.prepare(`SELECT * FROM cms_pages ORDER BY sort_order, updated_at DESC LIMIT 100`).all().catch(() => ({ results: [] })),
      env.DB.prepare(`SELECT * FROM cms_assets ORDER BY created_at DESC LIMIT 200`).all().catch(() => ({ results: [] })),
      env.DB.prepare(`SELECT * FROM cms_themes ORDER BY updated_at DESC LIMIT 20`).all().catch(() => ({ results: [] })),
      env.DB.prepare(`SELECT * FROM cms_navigation_items ORDER BY sort_order LIMIT 100`).all().catch(() => ({ results: [] })),
    ]);
    return json({ pages: pages.results || [], assets: assets.results || [], themes: themes.results || [], navigation: nav.results || [] });
  }

  if (path === '/api/dashboard/config') {
    const [brand, theme, assets] = await Promise.all([
      env.DB.prepare(`SELECT * FROM cms_brand_settings WHERE tenant_id = ? LIMIT 1`).bind(TENANT).first().catch(() => null),
      env.DB.prepare(`SELECT * FROM cms_themes WHERE tenant_id = ? AND is_active = 1 LIMIT 1`).bind(TENANT).first().catch(() => null),
      env.DB.prepare(`SELECT * FROM cms_assets WHERE tenant_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 200`).bind(TENANT).all().catch(() => ({ results: [] })),
    ]);
    return json({ brand, theme, assets: assets.results || [] });
  }

  if (path === '/api/dashboard/tasks') {
    const rows = await env.DB.prepare(`SELECT * FROM agentsam_todo ORDER BY sort_order, created_at`).all().catch(() => ({ results: [] }));
    return json({ todos: rows.results || [] });
  }

  if (path === '/api/dashboard/reports') {
    const [donations, animalRows, appRows] = await Promise.all([
      env.DB.prepare(`SELECT * FROM donations ORDER BY created_at DESC LIMIT 100`).all().catch(() => ({ results: [] })),
      env.DB.prepare(`SELECT * FROM animal_profiles WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 100`).bind(TENANT).all().catch(() => ({ results: [] })),
      env.DB.prepare(`SELECT * FROM cpas_foster_applications WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 100`).bind(FOSTER_TENANT).all().catch(() => ({ results: [] })),
    ]);
    return json({ donations: donations.results || [], animals: (animalRows.results || []).map(normalizeAnimal), applications: appRows.results || [] });
  }


  // ─── GET /api/dashboard/animals/:id/notes ────────────────────────────────
  const notesMatch = path.match(/^\/api\/dashboard\/animals\/([^/]+)\/notes$/);
  if (notesMatch && method === 'GET') {
    const animalIdVal = notesMatch[1];
    const rows = await env.DB.prepare(`
      SELECT n.*,
             au.full_name AS author_full_name,
             au.email     AS author_email
      FROM animal_notes n
      LEFT JOIN admin_users au ON au.id = n.author_id
      WHERE n.animal_id = ? AND n.tenant_id = ?
      ORDER BY n.is_pinned DESC, n.created_at DESC
      LIMIT 100
    `).bind(animalIdVal, TENANT).all().catch(() => ({ results: [] }));
    return json({ notes: rows.results || [] });
  }

  // ─── POST /api/dashboard/animals/:id/notes ───────────────────────────────
  if (notesMatch && method === 'POST') {
    const animalIdVal = notesMatch[1];
    const b = await request.json().catch(() => ({}));
    const body = String(b.body || '').trim();
    if (!body) return json({ ok: false, error: 'body is required' }, 400);
    const validTypes = ['general','medical','behavioral','foster','intake','urgent'];
    const noteType = validTypes.includes(b.note_type) ? b.note_type : 'general';
    const id  = 'note_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const now = nowIso();
    // Resolve author from session if available
    const authorId   = b.author_id   || null;
    const authorName = b.author_name || 'Staff';
    await env.DB.prepare(`
      INSERT INTO animal_notes
        (id, tenant_id, animal_id, note_type, body, is_pinned, is_private,
         author_id, author_name, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)
    `).bind(
      id, TENANT, animalIdVal, noteType, body,
      b.is_pinned  ? 1 : 0,
      b.is_private ? 1 : 0,
      authorId, authorName, now, now
    ).run();
    // Write to audit_log non-fatally
    await env.DB.prepare(`
      INSERT INTO audit_log (id, tenant_id, actor_user_id, action, entity_type, entity_id, metadata_json, created_at)
      VALUES (?,?,?,?,?,?,?,?)
    `).bind(
      'aud_' + id, TENANT, authorId, 'note_created', 'animal', animalIdVal,
      JSON.stringify({ note_id: id, note_type: noteType }),
      now
    ).run().catch(() => {});
    return json({ ok: true, id, author_name: authorName, created_at: now });
  }

  // ─── PATCH /api/dashboard/animals/:id/notes/:noteId ──────────────────────
  const notePatchMatch = path.match(/^\/api\/dashboard\/animals\/([^/]+)\/notes\/([^/]+)$/);
  if (notePatchMatch && method === 'PATCH') {
    const noteId = notePatchMatch[2];
    const b = await request.json().catch(() => ({}));
    const allowed = ['body','note_type','is_pinned','is_private'];
    const sets = []; const vals = [];
    for (const k of allowed) {
      if (k in b) {
        sets.push(`${k} = ?`);
        vals.push(['is_pinned','is_private'].includes(k) ? (b[k] ? 1 : 0) : (b[k] ?? null));
      }
    }
    if (!sets.length) return json({ ok: false, error: 'No updatable fields' }, 400);
    const now = nowIso();
    sets.push('edited_at = ?');  vals.push(now);
    sets.push('updated_at = ?'); vals.push(now);
    vals.push(noteId); vals.push(TENANT);
    await env.DB.prepare(
      `UPDATE animal_notes SET ${sets.join(', ')} WHERE id = ? AND tenant_id = ?`
    ).bind(...vals).run();
    return json({ ok: true });
  }

  // ─── DELETE /api/dashboard/animals/:id/notes/:noteId ─────────────────────
  if (notePatchMatch && method === 'DELETE') {
    const noteId = notePatchMatch[2];
    await env.DB.prepare(
      `DELETE FROM animal_notes WHERE id = ? AND tenant_id = ?`
    ).bind(noteId, TENANT).run();
    return json({ ok: true });
  }

  return null;
}
