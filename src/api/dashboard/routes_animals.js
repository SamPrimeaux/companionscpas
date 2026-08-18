// routes_animals.js — extracted from dashboard_api.js (tkt_cpas_mod_dashboard_api_20260818)
// Auto-split: verbatim route bodies moved from the original ladder. No behavior change.

import { CDN_ORIGIN, FOSTER_TENANT, ORG, TENANT, animalId, getAuthUser, invalidateAdoptSurfaces, json, normalizeAnimal, nowIso, postId, safeFilename, safeJson, syncAnimalPhotoUsage, taskId } from "./shared.js";

async function handleAnimalsList(request, env, url, path, method) {
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
  return null;
}

async function handleAnimalCreate(request, env, url, path, method) {
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
  return null;
}

async function handleAnimalDetailGet(request, env, url, path, method) {
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
  return null;
}

async function handleAnimalDetailPatch(request, env, url, path, method) {
  const animalDetailMatch = path.match(/^\/api\/dashboard\/animals\/([^/]+)$/);
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
    const nextStatus = ('status' in b) ? String(b.status || '').toLowerCase() : null;
    // Adopted / deceased / transferred animals should not keep a foster-needed flag.
    if (nextStatus && ['adopted', 'deceased', 'transferred', 'returned'].includes(nextStatus)) {
      b.foster_needed = 0;
    }
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

    // Stamp adopted_at into metadata when first marked adopted.
    if (nextStatus === 'adopted') {
      const existing = await env.DB.prepare(
        `SELECT metadata_json FROM animal_profiles WHERE id = ? AND tenant_id = ? LIMIT 1`
      ).bind(id, TENANT).first().catch(() => null);
      const meta = safeJson(existing?.metadata_json, {});
      if (!meta.adopted_at) {
        meta.adopted_at = nowIso();
        if (!('metadata_json' in b)) {
          sets.push('metadata_json = ?');
          vals.push(JSON.stringify(meta));
        }
      }
    }

    sets.push('updated_at = ?'); vals.push(nowIso());
    vals.push(id); vals.push(TENANT);
    await env.DB.prepare(
      `UPDATE animal_profiles SET ${sets.join(', ')} WHERE id = ? AND tenant_id = ?`
    ).bind(...vals).run();

    if (nextStatus === 'adopted') {
      await env.DB.prepare(`
        UPDATE foster_records
        SET status = 'ended', end_date = date('now'), updated_at = datetime('now')
        WHERE animal_id = ? AND tenant_id = ? AND lower(COALESCE(status,'')) = 'active'
      `).bind(id, TENANT).run().catch(() => null);
    }

    // Public /adopt gallery reads animal_profiles live but page HTML may be KV-cached
    const touchesPublic = ['public_visible', 'featured', 'status', 'name', 'bio', 'photo_url', 'breed', 'age_label'].some((k) => k in b);
    if (touchesPublic) await invalidateAdoptSurfaces(env);

    if (['photo_url', 'public_visible', 'status', 'name'].some((k) => k in b)) {
      const animal = await env.DB.prepare(
        `SELECT id, name, photo_url, public_visible, status FROM animal_profiles WHERE id = ? AND tenant_id = ? LIMIT 1`
      ).bind(id, TENANT).first().catch(() => null);
      if (animal) await syncAnimalPhotoUsage(env, animal);
    }

    return json({ ok: true, id });
  }
  return null;
}

async function handleAnimalDetailDelete(request, env, url, path, method) {
  const animalDetailMatch = path.match(/^\/api\/dashboard\/animals\/([^/]+)$/);
  if (animalDetailMatch && method === 'DELETE') {
    const session = await getAuthUser(request, env);
    if (!session) return json({ ok: false, error: 'Not authenticated' }, 401);
    const id = animalDetailMatch[1];

    const existing = await env.DB.prepare(
      `SELECT id, name FROM animal_profiles WHERE id = ? AND tenant_id = ? LIMIT 1`
    ).bind(id, TENANT).first().catch(() => null);
    if (!existing) return json({ ok: false, error: 'Animal not found' }, 404);

    try {
      await env.DB.batch([
        env.DB.prepare(`DELETE FROM animal_notes WHERE animal_id = ? AND tenant_id = ?`).bind(id, TENANT),
        env.DB.prepare(`DELETE FROM care_tasks WHERE animal_id = ?`).bind(id),
        env.DB.prepare(`DELETE FROM scheduled_posts WHERE animal_id = ? AND tenant_id = ?`).bind(id, TENANT),
        env.DB.prepare(`DELETE FROM dashboard_calendar_events WHERE animal_id = ?`).bind(id),
        env.DB.prepare(`UPDATE foster_records SET animal_id = NULL WHERE animal_id = ? AND tenant_id = ?`).bind(id, TENANT),
        env.DB.prepare(`DELETE FROM animal_profiles WHERE id = ? AND tenant_id = ?`).bind(id, TENANT),
      ]);
    } catch (err) {
      console.warn('[animals] delete failed:', err?.message || err);
      return json({
        ok: false,
        error: err?.message || 'Delete failed — a related record still references this animal',
      }, 409);
    }

    await invalidateAdoptSurfaces(env);
    return json({ ok: true, deleted: id, name: existing.name });
  }
  return null;
}

async function handleAnimalAttachmentUpload(request, env, url, path, method) {
  const attachmentsMatch = path.match(/^\/api\/dashboard\/animals\/([^/]+)\/attachments$/);
  if (attachmentsMatch && method === 'POST') {
    const session = await getAuthUser(request, env);
    if (!session) return json({ error: 'Not authenticated' }, 401);

    const animalKey = attachmentsMatch[1];
    const row = await env.DB.prepare(
      `SELECT id, name, photo_url, metadata_json FROM animal_profiles WHERE id = ? AND tenant_id = ? LIMIT 1`
    ).bind(animalKey, TENANT).first().catch(() => null);
    if (!row) return json({ ok: false, error: 'Animal not found' }, 404);

    const IMAGE_MIME = new Set([
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
      'image/heic', 'image/heif', 'image/gif',
    ]);
    const PDF_MIME = new Set(['application/pdf']);
    const MAX_SIZE = 15 * 1024 * 1024;

    let formData;
    try { formData = await request.formData(); }
    catch { return json({ ok: false, error: 'Invalid multipart body' }, 400); }

    const file = formData.get('file');
    const label = String(formData.get('label') || file?.name || '').trim();
    const setPrimary = ['1', 'true', 'on', 'yes'].includes(
      String(formData.get('set_primary') || formData.get('setPrimary') || '').toLowerCase()
    );
    if (!file || typeof file.arrayBuffer !== 'function') {
      return json({ ok: false, error: 'No file provided' }, 400);
    }

    const fileNameLower = String(file.name || '').toLowerCase();
    const heicByExt = fileNameLower.endsWith('.heic') || fileNameLower.endsWith('.heif');
    const isImage = IMAGE_MIME.has(file.type) || heicByExt;
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

    const shouldSetPrimary = isImage && (setPrimary || !row.photo_url);
    if (shouldSetPrimary) {
      await env.DB.prepare(
        `UPDATE animal_profiles
         SET metadata_json = ?, photo_url = ?, updated_at = ?
         WHERE id = ? AND tenant_id = ?`
      ).bind(JSON.stringify(metadata), pubUrl, nowIso(), animalKey, TENANT).run();
    } else {
      await env.DB.prepare(
        `UPDATE animal_profiles SET metadata_json = ?, updated_at = ? WHERE id = ? AND tenant_id = ?`
      ).bind(JSON.stringify(metadata), nowIso(), animalKey, TENANT).run();
    }

    if (isImage) {
      const animal = await env.DB.prepare(
        `SELECT id, name, photo_url, public_visible, status FROM animal_profiles WHERE id = ? AND tenant_id = ? LIMIT 1`
      ).bind(animalKey, TENANT).first().catch(() => null);
      if (animal) await syncAnimalPhotoUsage(env, animal);
    }

    return json({
      success: true,
      ok: true,
      url: pubUrl,
      public_url: pubUrl,
      cdn_url: pubUrl,
      mime_type: file.type,
      asset_type: assetType,
      r2_key: r2Key,
      asset_id: assetId,
      set_primary: shouldSetPrimary,
      updated_metadata_json: metadata,
      metadata,
    });
  }
  return null;
}

async function handleAnimalCareTasksList(request, env, url, path, method) {
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
  return null;
}

async function handleAnimalCareTaskCreate(request, env, url, path, method) {
  const careTasksMatch = path.match(/^\/api\/dashboard\/animals\/([^/]+)\/care-tasks$/);
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
  return null;
}

async function handleAnimalCareTaskPatch(request, env, url, path, method) {
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
  return null;
}

async function handleAnimalApplicationsList(request, env, url, path, method) {
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
  return null;
}

async function handleAnimalPublish(request, env, url, path, method) {
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
  return null;
}

async function handleAnimalPostDelete(request, env, url, path, method) {
  const deletePostMatch = path.match(/^\/api\/dashboard\/animals\/([^/]+)\/posts\/([^/]+)$/);
  if (deletePostMatch && method === 'DELETE') {
    const postIdVal = deletePostMatch[2];
    await env.DB.prepare(
      `UPDATE scheduled_posts SET status = 'cancelled', updated_at = ? WHERE id = ? AND tenant_id = ?`
    ).bind(nowIso(), postIdVal, TENANT).run();
    return json({ ok: true });
  }
  return null;
}

async function handleAnimalNotesList(request, env, url, path, method) {
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
  return null;
}

async function handleAnimalNoteCreate(request, env, url, path, method) {
  const notesMatch = path.match(/^\/api\/dashboard\/animals\/([^/]+)\/notes$/);
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
  return null;
}

async function handleAnimalNotePatch(request, env, url, path, method) {
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
  return null;
}

async function handleAnimalNoteDelete(request, env, url, path, method) {
  const notePatchMatch = path.match(/^\/api\/dashboard\/animals\/([^/]+)\/notes\/([^/]+)$/);
  if (notePatchMatch && method === 'DELETE') {
    const noteId = notePatchMatch[2];
    await env.DB.prepare(
      `DELETE FROM animal_notes WHERE id = ? AND tenant_id = ?`
    ).bind(noteId, TENANT).run();
    return json({ ok: true });
  }
  return null;
}

export async function routesAnimals(request, env, url, path, method) {
  {
    const r = await handleAnimalsList(request, env, url, path, method);
    if (r) return r;
  }
  {
    const r = await handleAnimalCreate(request, env, url, path, method);
    if (r) return r;
  }
  {
    const r = await handleAnimalDetailGet(request, env, url, path, method);
    if (r) return r;
  }
  {
    const r = await handleAnimalDetailPatch(request, env, url, path, method);
    if (r) return r;
  }
  {
    const r = await handleAnimalDetailDelete(request, env, url, path, method);
    if (r) return r;
  }
  {
    const r = await handleAnimalAttachmentUpload(request, env, url, path, method);
    if (r) return r;
  }
  {
    const r = await handleAnimalCareTasksList(request, env, url, path, method);
    if (r) return r;
  }
  {
    const r = await handleAnimalCareTaskCreate(request, env, url, path, method);
    if (r) return r;
  }
  {
    const r = await handleAnimalCareTaskPatch(request, env, url, path, method);
    if (r) return r;
  }
  {
    const r = await handleAnimalApplicationsList(request, env, url, path, method);
    if (r) return r;
  }
  {
    const r = await handleAnimalPublish(request, env, url, path, method);
    if (r) return r;
  }
  {
    const r = await handleAnimalPostDelete(request, env, url, path, method);
    if (r) return r;
  }
  {
    const r = await handleAnimalNotesList(request, env, url, path, method);
    if (r) return r;
  }
  {
    const r = await handleAnimalNoteCreate(request, env, url, path, method);
    if (r) return r;
  }
  {
    const r = await handleAnimalNotePatch(request, env, url, path, method);
    if (r) return r;
  }
  {
    const r = await handleAnimalNoteDelete(request, env, url, path, method);
    if (r) return r;
  }
  return null;
}
