// routes_care.js — extracted from dashboard_api.js (tkt_cpas_mod_dashboard_api_20260818)
// Auto-split: verbatim route bodies moved from the original ladder. No behavior change.

import { CDN_ORIGIN, TENANT, guessAnimalNameFromFilename, inferMedicalDocType, json, matchAnimalByFilename, safeJson } from "./shared.js";

async function handleIntakes(request, env, url, path, method) {
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
  return null;
}

async function handleMedical(request, env, url, path, method) {
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
  return null;
}

async function handleDailyCare(request, env, url, path, method) {
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
  return null;
}

export async function routesCare(request, env, url, path, method) {
  {
    const r = await handleIntakes(request, env, url, path, method);
    if (r) return r;
  }
  {
    const r = await handleMedical(request, env, url, path, method);
    if (r) return r;
  }
  {
    const r = await handleDailyCare(request, env, url, path, method);
    if (r) return r;
  }
  return null;
}
