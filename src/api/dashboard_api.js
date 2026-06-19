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

const CDN_ORIGIN = "https://assets.companionsofcaddo.org";

function safeFilename(name) {
  return String(name || "file")
    .normalize("NFC")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 120) || "file";
}

function taskId() { return 'task_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7); }
function postId()  { return 'post_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7); }

function guessAnimalNameFromFilename(filename) {
  const base = String(filename || '').replace(/\.[^.]+$/, '');
  const vaccMatch = base.match(/Vaccination[-_ ]?Certificate[-_ ]?([A-Za-z]+)/i)
    || base.match(/VaccinationCertificate([A-Za-z]+)/i);
  if (vaccMatch?.[1]) {
    const name = vaccMatch[1];
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  }
  const nameBeforeDate = base.match(/([A-Za-z]+)[-_]?\d{4}$/);
  if (nameBeforeDate?.[1] && nameBeforeDate[1].length > 2) {
    const name = nameBeforeDate[1];
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  }
  const kennelMatch = base.match(/KennelCard.*?([A-Za-z]{3,})/i);
  if (kennelMatch?.[1]) {
    const name = kennelMatch[1];
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  }
  return base.replace(/[_-]+/g, ' ').trim() || 'Unknown';
}

function matchAnimalByFilename(animals, filename) {
  const guess = guessAnimalNameFromFilename(filename).toLowerCase();
  return (animals || []).find((row) => String(row.name || '').toLowerCase() === guess) || null;
}

function inferMedicalDocType(label) {
  const text = String(label || '').toLowerCase();
  if (text.includes('vaccination')) return 'Vaccination Certificate';
  if (text.includes('certificate')) return 'Certificate';
  return 'Medical Document';
}


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

function normalizeCampaign(row) {
  if (!row) return null;
  const config = safeJson(row.config_json, {});
  return {
    ...row,
    goal_cents: Number(row.goal_amount_cents ?? row.goal_cents ?? 0),
    raised_cents: Number(row.raised_amount_cents ?? row.raised_cents ?? 0),
    donors: Number(row.donor_count || 0),
    category: row.campaign_type || row.category || 'fundraiser',
    config,
    cover_url: row.cover_url || config.cover_url || null,
  };
}

async function invalidateDonatePageCache(env) {
  if (!env?.CMS_CACHE) return;
  await env.CMS_CACHE.delete('page:/donate').catch(() => {});
  try {
    const { assembleGenericPageFromFragments } = await import('./render_generic_fragments.js');
    const html = await assembleGenericPageFromFragments(env, '/donate');
    if (html) {
      await env.CMS_CACHE.put('page:/donate', html, { expirationTtl: 3600 }).catch(() => {});
    }
  } catch (err) {
    console.warn('[donate-cache] warm failed:', err?.message || err);
  }
}

const CAMPAIGN_SELECT = `
  SELECT fc.*,
         fc.goal_amount_cents AS goal_cents,
         fc.raised_amount_cents AS raised_cents,
         COALESCE(fc.campaign_type, 'fundraiser') AS category,
         COALESCE(ca.public_url, ca.cdn_url, ca.pub_url) AS cover_url
  FROM fundraising_campaigns fc
  LEFT JOIN cms_assets ca ON ca.id = fc.cover_asset_id
`;

async function fetchCampaignById(env, id) {
  const row = await env.DB.prepare(`${CAMPAIGN_SELECT} WHERE fc.id = ? LIMIT 1`)
    .bind(id).first().catch(() => null);
  return normalizeCampaign(row);
}

async function saveCampaignRecord(env, b, existingId = null) {
  const title = String(b.title || '').trim();
  if (!title) throw new Error('Campaign title is required');
  const now = nowIso();
  const slug = String(b.slug || title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'campaign';
  const id = existingId || b.id || `campaign_${slug}_${Date.now()}`;
  const configJson = typeof b.config_json === 'string'
    ? b.config_json
    : JSON.stringify(b.config_json || b.config || {});
  const goalCents = Math.max(0, Number(b.goal_amount_cents || 0));
  const isPublic = b.is_public === 0 || b.is_public === false ? 0 : 1;
  const shortDesc = String(b.short_description || b.description || '').slice(0, 240);

  if (existingId) {
    await env.DB.prepare(`
      UPDATE fundraising_campaigns SET
        title = ?, slug = ?, description = ?, short_description = ?,
        goal_amount_cents = ?, status = ?, starts_at = ?, ends_at = ?,
        is_public = ?, campaign_type = ?, cover_asset_id = ?, config_json = ?,
        updated_at = ?
      WHERE id = ?
    `).bind(
      title, slug, b.description || '', shortDesc,
      goalCents, b.status || 'active', b.starts_at || null, b.ends_at || null,
      isPublic, b.campaign_type || 'fundraiser', b.cover_asset_id || null, configJson,
      now, existingId
    ).run();
    return id;
  }

  await env.DB.prepare(`
    INSERT INTO fundraising_campaigns
      (id, tenant_id, organization_id, title, slug, description, short_description,
       goal_amount_cents, raised_amount_cents, status, starts_at, ends_at, is_public,
       campaign_type, cover_asset_id, config_json, donor_count, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
  `).bind(
    id, TENANT, TENANT, title, slug, b.description || '', shortDesc,
    goalCents, b.status || 'draft', b.starts_at || null, b.ends_at || null,
    isPublic, b.campaign_type || 'fundraiser', b.cover_asset_id || null, configJson,
    now, now
  ).run().catch(async () => {
    await env.DB.prepare(`
      INSERT INTO fundraising_campaigns
        (id, organization_id, title, slug, description, short_description,
         goal_amount_cents, raised_amount_cents, status, starts_at, ends_at, is_public,
         campaign_type, donor_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, 0, ?, ?)
    `).bind(
      id, TENANT, title, slug, b.description || '', shortDesc,
      goalCents, b.status || 'draft', b.starts_at || null, b.ends_at || null,
      isPublic, b.campaign_type || 'fundraiser', now, now
    ).run();
  });
  return id;
}

export async function dashboardApiRoutes(request, env, url) {
  const path   = url.pathname;
  const method = request.method;

  // ─── GET /api/dashboard/overview ─────────────────────────────────────────
  if (path === '/api/dashboard/overview') {
    const monthPrefix = new Date().toISOString().slice(0, 7);
    const paidStatuses = new Set(['succeeded', 'paid', 'completed', 'received']);
    const [animalRows, appRows, campaignRows, volunteerRows, donationRows] = await Promise.all([
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
      env.DB.prepare(`
        SELECT d.amount_cents, d.status, d.campaign_id, d.donated_at, d.created_at,
               fc.title AS campaign_title, fc.campaign_type
        FROM donations d
        LEFT JOIN fundraising_campaigns fc ON fc.id = d.campaign_id
        WHERE d.organization_id = ?
        ORDER BY COALESCE(d.donated_at, d.created_at) DESC
      `).bind(TENANT).all().catch(() => ({ results: [] })),
    ]);
    const paidDonations = (donationRows.results || []).filter((row) =>
      paidStatuses.has(String(row.status || '').toLowerCase())
    );
    const raisedFromDonations = paidDonations.reduce((sum, row) => sum + Number(row.amount_cents || 0), 0);
    const mtdDonations = paidDonations.filter((row) =>
      String(row.donated_at || row.created_at || '').slice(0, 7) === monthPrefix
    );
    const mtdCents = mtdDonations.reduce((sum, row) => sum + Number(row.amount_cents || 0), 0);
    const goal = (campaignRows.results || []).reduce((s, c) => s + Number(c.goal_cents || 0), 0);
    return json({
      kpis: {
        animals:      animalRows.results?.length || 0,
        applications: appRows.results?.length    || 0,
        volunteers:   volunteerRows.results?.length || 0,
        raised_cents: raisedFromDonations,
        donations_mtd_cents: mtdCents,
        donation_count: paidDonations.length,
        donations_mtd_count: mtdDonations.length,
        goal_cents:   goal,
      },
      animals:      (animalRows.results || []).map(normalizeAnimal),
      applications: appRows.results || [],
      campaigns:    campaignRows.results || [],
      volunteers:   volunteerRows.results || [],
      donations:    paidDonations,
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
      'sort_order','tags_json','intake_date','photo_url', 'metadata_json'
    ];
    const sets = []; const vals = [];
    for (const k of allowed) {
      if (k in b) {
        sets.push(`${k} = ?`);
        if (['foster_needed','featured','public_visible'].includes(k)) {
          vals.push(b[k] ? 1 : 0);
        } else if (k === 'metadata_json') {
          vals.push(typeof b.metadata_json === 'string' ? b.metadata_json : JSON.stringify(b.metadata_json ?? {}));
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

  // ─── POST /api/dashboard/animals/:id/attachments ─────────────────────────
  const attachmentsMatch = path.match(/^\/api\/dashboard\/animals\/([^/]+)\/attachments$/);
  if (attachmentsMatch && method === 'POST') {
    const session = await getAuthUser(request, env);
    if (!session) return json({ error: 'Not authenticated' }, 401);

    const animalKey = attachmentsMatch[1];
    const row = await env.DB.prepare(
      `SELECT id, name, metadata_json FROM animal_profiles WHERE id = ? AND tenant_id = ? LIMIT 1`
    ).bind(animalKey, TENANT).first().catch(() => null);
    if (!row) return json({ ok: false, error: 'Animal not found' }, 404);

    const IMAGE_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
    const PDF_MIME = new Set(['application/pdf']);
    const MAX_SIZE = 15 * 1024 * 1024;

    let formData;
    try { formData = await request.formData(); }
    catch { return json({ ok: false, error: 'Invalid multipart body' }, 400); }

    const file = formData.get('file');
    const label = String(formData.get('label') || file?.name || '').trim();
    if (!file || typeof file.arrayBuffer !== 'function') {
      return json({ ok: false, error: 'No file provided' }, 400);
    }

    const isImage = IMAGE_MIME.has(file.type);
    const isPdf = PDF_MIME.has(file.type);
    if (!isImage && !isPdf) {
      return json({ ok: false, error: `File type not allowed: ${file.type || 'unknown'}` }, 400);
    }

    const fileBytes = await file.arrayBuffer();
    if (fileBytes.byteLength > MAX_SIZE) {
      return json({ ok: false, error: 'File exceeds 15 MB limit' }, 400);
    }

    const safeName = safeFilename(file.name);
    const r2Key = isImage
      ? `media/animals/${animalKey}/${Date.now()}-${safeName}`
      : `media/medical/${animalKey}/${Date.now()}-${safeName}`;
    const pubUrl = `${CDN_ORIGIN}/${r2Key}`;
    const assetType = isImage ? 'image' : 'document';
    const category = isImage ? 'animal' : 'medical';

    try {
      await env.WEBSITE_ASSETS.put(r2Key, fileBytes, {
        httpMetadata: {
          contentType: file.type,
          cacheControl: 'public, max-age=31536000, immutable',
        },
        customMetadata: { tenant_id: TENANT, animal_id: animalKey },
      });
    } catch (err) {
      console.error('[animal-attachments] R2 put failed:', err?.message || err);
      return json({ ok: false, error: 'R2 upload failed' }, 500);
    }

    const assetId = `asset_animal_${Date.now().toString(36)}`;
    const assetKey = `animal_${animalKey}_${Date.now().toString(36).slice(2, 8)}`;
    await env.DB.prepare(
      `INSERT INTO cms_assets
         (id, tenant_id, project_id, asset_key, label, filename, original_filename,
          mime_type, size, category, asset_type, r2_key, r2_bucket,
          pub_url, cdn_url, public_url, usage_context, status, is_live, created_at, updated_at)
       VALUES (?, ?, 'proj_companionscpas', ?, ?, ?, ?,
               ?, ?, ?, ?, ?, 'companionscpas',
               ?, ?, ?, 'animal_profile', 'active', 1, datetime('now'), datetime('now'))`
    ).bind(
      assetId, TENANT, assetKey,
      label || safeName, safeName, file.name,
      file.type, fileBytes.byteLength, category, assetType, r2Key,
      pubUrl, pubUrl, pubUrl
    ).run().catch((err) => console.warn('[animal-attachments] cms_assets insert:', err?.message));

    const metadata = safeJson(row.metadata_json, {});
    if (isImage) {
      const photos = Array.isArray(metadata.photos) ? metadata.photos.slice() : [];
      if (photos.indexOf(pubUrl) === -1) photos.push(pubUrl);
      metadata.photos = photos;
    } else {
      const medicalFiles = Array.isArray(metadata.medical_files) ? metadata.medical_files.slice() : [];
      medicalFiles.push({
        url: pubUrl,
        name: file.name || safeName,
        mime_type: file.type,
        uploaded_at: nowIso(),
      });
      metadata.medical_files = medicalFiles;
    }

    await env.DB.prepare(
      `UPDATE animal_profiles SET metadata_json = ?, updated_at = ? WHERE id = ? AND tenant_id = ?`
    ).bind(JSON.stringify(metadata), nowIso(), animalKey, TENANT).run();

    return json({
      success: true,
      ok: true,
      url: pubUrl,
      mime_type: file.type,
      asset_type: assetType,
      updated_metadata_json: metadata,
      metadata,
    });
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

  // ─── GET/POST/PUT /api/dashboard/fundraising[/:id] ───────────────────────
  const fundraisingDetailMatch = path.match(/^\/api\/dashboard\/fundraising\/([^/]+)$/);

  if (fundraisingDetailMatch && method === 'GET') {
    const campaign = await fetchCampaignById(env, fundraisingDetailMatch[1]);
    if (!campaign) return json({ ok: false, error: 'Campaign not found' }, 404);
    const donationRows = await env.DB.prepare(`
      SELECT d.id, d.amount_cents, d.currency, d.status, d.donated_at, d.created_at,
             d.donor_message, d.is_anonymous,
             dn.full_name AS donor_name, dn.email AS donor_email
      FROM donations d
      LEFT JOIN donors dn ON dn.id = d.donor_id
      WHERE d.campaign_id = ?
      ORDER BY COALESCE(d.donated_at, d.created_at) DESC
      LIMIT 100
    `).bind(campaign.id).all().catch(() => ({ results: [] }));
    const raisedLive = await env.DB.prepare(`
      SELECT COALESCE(SUM(amount_cents), 0) AS total
      FROM donations WHERE campaign_id = ? AND status = 'succeeded'
    `).bind(campaign.id).first().catch(() => ({ total: 0 }));
    const liveRaised = Number(raisedLive?.total) || campaign.raised_cents;
    return json({
      ok: true,
      campaign: { ...campaign, raised_cents: liveRaised, raised_amount_cents: liveRaised },
      donations: donationRows.results || [],
    });
  }

  if (path === '/api/dashboard/fundraising' && method === 'GET') {
    const rows = await env.DB.prepare(`${CAMPAIGN_SELECT} ORDER BY fc.updated_at DESC`)
      .all().catch(() => ({ results: [] }));
    return json({ campaigns: (rows.results || []).map(normalizeCampaign) });
  }

  if (path === '/api/dashboard/fundraising' && method === 'POST') {
    try {
      const b = await request.json().catch(() => ({}));
      const id = await saveCampaignRecord(env, b);
      await invalidateDonatePageCache(env);
      return json({ ok: true, id });
    } catch (err) {
      return json({ ok: false, error: err.message || 'Campaign create failed' }, 400);
    }
  }

  if (path === '/api/dashboard/fundraising' && method === 'PUT') {
    try {
      const b = await request.json().catch(() => ({}));
      if (!b.id) return json({ ok: false, error: 'id required' }, 400);
      const id = await saveCampaignRecord(env, b, b.id);
      await invalidateDonatePageCache(env);
      return json({ ok: true, id });
    } catch (err) {
      return json({ ok: false, error: err.message || 'Campaign update failed' }, 400);
    }
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
    await invalidateDonatePageCache(env);
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
    const [assetRows, animalRows] = await Promise.all([
      env.DB.prepare(`
        SELECT id, label, filename, original_filename, r2_key, public_url, cdn_url,
               mime_type, size, created_at, updated_at
        FROM cms_assets
        WHERE tenant_id = ? AND status = 'active' AND r2_key LIKE 'media/intakes/%'
        ORDER BY created_at DESC
        LIMIT 200
      `).bind(TENANT).all().catch(() => ({ results: [] })),
      env.DB.prepare(`
        SELECT id, name, species, breed, intake_date, photo_url, metadata_json, status
        FROM animal_profiles
        WHERE tenant_id = ?
      `).bind(TENANT).all().catch(() => ({ results: [] })),
    ]);

    const animals = animalRows.results || [];
    const byIntakePdf = {};
    for (const row of animals) {
      const meta = safeJson(row.metadata_json, {});
      if (meta.intake_pdf) byIntakePdf[meta.intake_pdf] = row;
    }

    const intakes = (assetRows.results || []).map((asset) => {
      const url = asset.public_url || asset.cdn_url || `${CDN_ORIGIN}/${asset.r2_key}`;
      const animal = byIntakePdf[url] || matchAnimalByFilename(animals, asset.filename || asset.original_filename);
      return {
        id: asset.id,
        filename: asset.filename || asset.original_filename,
        label: asset.label || asset.filename,
        url,
        size: asset.size || null,
        created_at: asset.created_at,
        animal_id: animal?.id || null,
        animal_name: animal?.name || guessAnimalNameFromFilename(asset.filename || asset.original_filename),
        species: animal?.species || 'Dog',
        intake_date: animal?.intake_date || asset.created_at?.slice(0, 10) || null,
        photo_url: animal?.photo_url || null,
        status: animal?.status || null,
      };
    });

    const now = new Date();
    const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    const thisMonth = intakes.filter((row) => String(row.created_at || '').slice(0, 7) === monthKey).length;

    return json({
      intakes,
      stats: {
        total: intakes.length,
        this_month: thisMonth,
        linked_animals: intakes.filter((row) => row.animal_id).length,
      },
    });
  }

  if (path === '/api/dashboard/medical') {
    const [assetRows, animalRows] = await Promise.all([
      env.DB.prepare(`
        SELECT id, label, filename, original_filename, r2_key, public_url, cdn_url,
               mime_type, size, created_at, updated_at
        FROM cms_assets
        WHERE tenant_id = ? AND status = 'active' AND r2_key LIKE 'media/medical/%'
        ORDER BY created_at DESC
        LIMIT 200
      `).bind(TENANT).all().catch(() => ({ results: [] })),
      env.DB.prepare(`
        SELECT id, name, species, breed, intake_date, photo_url, metadata_json, status, medical_notes
        FROM animal_profiles
        WHERE tenant_id = ?
      `).bind(TENANT).all().catch(() => ({ results: [] })),
    ]);

    const animals = animalRows.results || [];
    const byMedicalUrl = {};
    for (const row of animals) {
      const meta = safeJson(row.metadata_json, {});
      if (meta.vaccination_cert) byMedicalUrl[meta.vaccination_cert] = row;
      if (Array.isArray(meta.medical_files)) {
        for (const file of meta.medical_files) {
          const fileUrl = file?.url || file;
          if (fileUrl) byMedicalUrl[fileUrl] = row;
        }
      }
    }

    const medical = (assetRows.results || []).map((asset) => {
      const url = asset.public_url || asset.cdn_url || `${CDN_ORIGIN}/${asset.r2_key}`;
      const animal = byMedicalUrl[url] || matchAnimalByFilename(animals, asset.filename || asset.original_filename);
      const docType = inferMedicalDocType(asset.label || asset.filename);
      return {
        id: asset.id,
        filename: asset.filename || asset.original_filename,
        label: asset.label || asset.filename,
        url,
        type: docType,
        size: asset.size || null,
        created_at: asset.created_at,
        animal_id: animal?.id || null,
        animal_name: animal?.name || guessAnimalNameFromFilename(asset.filename || asset.original_filename),
        photo_url: animal?.photo_url || null,
        medical_notes: animal?.medical_notes || null,
      };
    });

    return json({
      medical,
      stats: {
        total: medical.length,
        vaccination_certs: medical.filter((row) => row.type === 'Vaccination Certificate').length,
        linked_animals: medical.filter((row) => row.animal_id).length,
      },
    });
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

  if (path === '/api/dashboard/reports/financial' && method === 'GET') {
    const session = await getAuthUser(request, env);
    if (!session) return json({ error: 'Not authenticated' }, 401);

    const monthPrefix = new Date().toISOString().slice(0, 7);
    const paidStatuses = new Set(['succeeded', 'paid', 'completed', 'received']);

    const [donationRows, webhookRows] = await Promise.all([
      env.DB.prepare(`
        SELECT d.id, d.amount_cents, d.intended_amount_cents, d.cover_fees, d.currency, d.status, d.campaign_id,
               d.stripe_payment_intent_id, d.donated_at, d.created_at, d.is_anonymous,
               dn.email AS donor_email, dn.full_name AS donor_name,
               fc.title AS campaign_title
        FROM donations d
        LEFT JOIN donors dn ON dn.id = d.donor_id
        LEFT JOIN fundraising_campaigns fc ON fc.id = d.campaign_id
        WHERE d.organization_id = ?
        ORDER BY COALESCE(d.donated_at, d.created_at) DESC
        LIMIT 200
      `).bind(TENANT).all().catch(() => ({ results: [] })),
      env.DB.prepare(`
        SELECT id, event_type, status, related_id, processed_at, created_at
        FROM stripe_webhooks
        WHERE tenant_id = ?
        ORDER BY COALESCE(processed_at, created_at) DESC
        LIMIT 50
      `).bind(TENANT).all().catch(() => ({ results: [] })),
    ]);

    const donations = donationRows.results || [];
    const giftCents = (row) => Number(row.intended_amount_cents ?? row.amount_cents ?? 0);
    const paid = donations.filter((row) => paidStatuses.has(String(row.status || '').toLowerCase()));
    const totalCents = paid.reduce((sum, row) => sum + giftCents(row), 0);
    const thisMonth = paid.filter((row) => String(row.donated_at || row.created_at || '').slice(0, 7) === monthPrefix);
    const thisMonthCents = thisMonth.reduce((sum, row) => sum + giftCents(row), 0);
    const avgCents = paid.length ? Math.round(totalCents / paid.length) : 0;

    return json({
      summary: {
        total_raised_cents: totalCents,
        total_raised_display: `$${(totalCents / 100).toFixed(2)}`,
        this_month_cents: thisMonthCents,
        this_month_display: `$${(thisMonthCents / 100).toFixed(2)}`,
        total_donations: paid.length,
        this_month_donations: thisMonth.length,
        avg_gift_cents: avgCents,
        avg_gift_display: `$${(avgCents / 100).toFixed(2)}`,
      },
      donations,
      recent_webhooks: webhookRows.results || [],
    });
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
