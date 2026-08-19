// routes_assets.js — extracted from cms_api.js (tkt_cpas_mod_cms_api_20260818)
// Auto-split: verbatim route bodies. No behavior change.

import {
  TENANT_ID,
  json,
  id,
  body,
  bustCache,
  requireCmsUser,
  resolveUploadR2Key,
  rebuildCmsAssetUsages,
  loadUsagesByAssetIds,
} from "./shared.js";

export async function routesAssets(request, env, url, path, method, sessionUser = null) {
    // GET /api/cms/assets/stats
  if (path === "/api/cms/assets/stats" && method === "GET") {
    const summary = await env.DB.prepare(
      `SELECT COUNT(*) AS asset_count, COALESCE(SUM(size), 0) AS total_bytes
       FROM cms_assets WHERE tenant_id = ? AND status != 'archived'`
    ).bind(TENANT_ID).first().catch(() => ({ asset_count: 0, total_bytes: 0 }));

    const byType = await env.DB.prepare(
      `SELECT COALESCE(asset_type, 'image') AS asset_type, COUNT(*) AS n, COALESCE(SUM(size), 0) AS bytes
       FROM cms_assets WHERE tenant_id = ? AND status != 'archived'
       GROUP BY COALESCE(asset_type, 'image')`
    ).bind(TENANT_ID).all().catch(() => ({ results: [] }));

    const quotaBytes = Number(env.R2_STORAGE_QUOTA_BYTES || 10 * 1024 * 1024 * 1024);
    const totalBytes = Number(summary?.total_bytes || 0);
    return json({
      success: true,
      asset_count: Number(summary?.asset_count || 0),
      total_bytes: totalBytes,
      quota_bytes: quotaBytes,
      used_pct: quotaBytes ? Math.min(100, Math.round((totalBytes / quotaBytes) * 1000) / 10) : 0,
      by_type: byType?.results || [],
      cdn_origin: "https://assets.companionsofcaddo.org",
    });
  }

  // POST /api/cms/assets/rebuild-usages — scan animals/campaigns into cms_asset_usages
  if (path === "/api/cms/assets/rebuild-usages" && method === "POST") {
    const result = await rebuildCmsAssetUsages(env);
    return json({ success: true, ...result });
  }

    // GET /api/cms/assets
  if (path === "/api/cms/assets" && method === "GET") {
    const context = url.searchParams.get("context") || null;
    const category = url.searchParams.get("category") || null;
    let q = "SELECT * FROM cms_assets WHERE tenant_id = ? AND status != 'archived'";
    const binds = [TENANT_ID];
    if (context) { q += " AND usage_context = ?"; binds.push(context); }
    if (category) { q += " AND category = ?"; binds.push(category); }
    q += " ORDER BY updated_at DESC, created_at DESC LIMIT 500";
    const { results } = await env.DB.prepare(q).bind(...binds).all().catch(() => ({ results: [] }));
    const assets = results || [];
    const usageMap = await loadUsagesByAssetIds(env, assets.map((a) => a.id));
    const enriched = assets.map((a) => {
      const usages = usageMap.get(a.id) || [];
      const liveUsages = usages.filter((u) => u.is_live);
      // Trust only cms_asset_usages — ignore legacy cms_assets.is_live flags
      return {
        ...a,
        usages,
        usage_labels: usages.map((u) => u.label),
        is_live_usage: liveUsages.length > 0,
        live_labels: liveUsages.map((u) => u.label),
      };
    });
    return json({ success: true, assets: enriched });
  }

  // POST /api/cms/asset/upload — multipart file upload → R2 → cms_assets
  if (path === "/api/cms/asset/upload" && method === "POST") {
    const cmsUser = await requireCmsUser(request, env, sessionUser);
    if (!cmsUser) return json({ success: false, error: "Not authenticated" }, 401);

    const CDN_ORIGIN = "https://assets.companionsofcaddo.org";
    const ALLOWED_UPLOAD_MIME = new Set([
      "image/jpeg","image/jpg","image/png","image/webp",
      "image/gif","image/svg+xml","image/avif",
      "application/pdf",
      "video/mp4","video/quicktime","video/webm",
    ]);
    const MAX_SIZE = 25 * 1024 * 1024; // 25 MB (video/PDF)

    let formData;
    try { formData = await request.formData(); }
    catch { return json({ success: false, error: "Invalid multipart body" }, 400); }

    const file     = formData.get("file");
    const altText  = formData.get("alt_text")      || "";
    const label    = formData.get("label")         || "";
    const r2Folder = formData.get("r2_folder")     || "";
    const context  = formData.get("usage_context") || "cms";
    const category = formData.get("category")      || "image";
    const animalId = String(formData.get("animal_id") || formData.get("animalId") || "").trim();

    if (!file || typeof file.arrayBuffer !== "function") {
      return json({ success: false, error: "No file provided" }, 400);
    }
    if (!ALLOWED_UPLOAD_MIME.has(file.type)) {
      return json({ success: false, error: `MIME type not allowed: ${file.type}` }, 400);
    }

    const fileBytes = await file.arrayBuffer();
    if (fileBytes.byteLength > MAX_SIZE) {
      return json({ success: false, error: "File exceeds 10 MB limit" }, 400);
    }

    const safeName = file.name
      .normalize("NFC")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(0, 120);
    const r2Key  = resolveUploadR2Key(r2Folder, safeName, {
      animalId,
      category,
      usageContext: context,
      forceAnimalFolder: String(r2Folder || "").replace(/\/+$/, "") === "media/animals",
    });
    const pubUrl = `${CDN_ORIGIN}/${r2Key}`;
    const isAnimalPath = r2Key.startsWith("media/animals/");
    const usageContext = isAnimalPath
      ? "animals"
      : (R2_MEDIA_FOLDERS.has(String(r2Folder || "").replace(/\/+$/, ""))
        ? String(r2Folder).replace(/^media\//, "")
        : context);
    const resolvedCategory = isAnimalPath ? "animal" : category;

    // Write to R2
    try {
      const meta = { tenant_id: TENANT_ID, uploaded_by: cmsUser.id || "unknown" };
      if (animalId) meta.animal_id = animalId;
      await env.WEBSITE_ASSETS.put(r2Key, fileBytes, {
        httpMetadata: {
          contentType:  file.type,
          cacheControl: "public, max-age=31536000, immutable",
        },
        customMetadata: meta,
      });
    } catch (err) {
      console.error("[cms-upload] R2 put failed:", err?.message);
      return json({ success: false, error: "R2 upload failed" }, 500);
    }

    // Insert cms_assets row
    const assetId  = id("asset");
    const assetKey = animalId
      ? `animal_${animalId}_${Date.now().toString(36).slice(2, 8)}`
      : `upload_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`;
    const assetType = file.type.startsWith("video/") ? "video"
      : file.type === "application/pdf" ? "document"
      : "image";
    await env.DB.prepare(
      `INSERT INTO cms_assets
         (id, tenant_id, project_id, asset_key, label, filename, original_filename,
          mime_type, size, category, asset_type, r2_key, r2_bucket,
          pub_url, cdn_url, public_url, alt_text,
          usage_context, status, is_live, created_by, created_at, updated_at)
       VALUES (?, ?, 'proj_companionscpas', ?, ?, ?, ?,
               ?, ?, ?, ?, ?, 'companionscpas',
               ?, ?, ?, ?,
               ?, 'active', 1, ?, datetime('now'), datetime('now'))`
    ).bind(
      assetId, TENANT_ID, assetKey,
      label || safeName, safeName, file.name,
      file.type, fileBytes.byteLength,
      resolvedCategory, assetType,
      r2Key,
      pubUrl, pubUrl, pubUrl,
      altText,
      usageContext,
      cmsUser.id || "unknown"
    ).run();

    return json({
      success: true,
      asset_key: assetKey,
      public_url: pubUrl,
      r2_key: r2Key,
      id: assetId,
      mime_type: file.type,
      asset_type: assetType,
      filename: file.name,
      category: resolvedCategory,
    });
  }

    // POST /api/cms/asset/save
  if (path === "/api/cms/asset/save" && method === "POST") {
    const cmsUser = await requireCmsUser(request, env, sessionUser);
    if (!cmsUser) return json({ success: false, error: "Not authenticated" }, 401);

    const data = await body(request);
    const asset = data.asset || data;
    const asset_key = asset.asset_key || id("asset");

    await env.DB.prepare(`
      INSERT INTO cms_assets
      (id, tenant_id, project_id, asset_key, label, filename, original_filename,
       mime_type, size, category, asset_type, r2_key, r2_bucket,
       pub_url, cdn_url, public_url, usage_context, path, status, is_live,
       alt_text, notes, created_by, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))
      ON CONFLICT(tenant_id, asset_key) DO UPDATE SET
        label = excluded.label,
        cdn_url = excluded.cdn_url,
        pub_url = excluded.pub_url,
        public_url = excluded.public_url,
        alt_text = excluded.alt_text,
        status = excluded.status,
        is_live = excluded.is_live,
        usage_context = excluded.usage_context,
        notes = excluded.notes,
        updated_at = datetime('now')
    `).bind(
      asset.id || id("asset"),
      TENANT_ID,
      asset.project_id || "proj_companionscpas",
      asset_key,
      asset.label || asset.filename || "",
      asset.filename || "",
      asset.original_filename || asset.filename || "",
      asset.mime_type || "image/webp",
      asset.size || 0,
      asset.category || "image",
      asset.asset_type || "image",
      asset.r2_key || "",
      asset.r2_bucket || "companionscpas",
      asset.pub_url || "",
      asset.cdn_url || "",
      asset.cdn_url || asset.pub_url || "",
      asset.usage_context || "general",
      asset.r2_key || "",
      asset.status || "active",
      asset.is_live === 0 ? 0 : 1,
      asset.alt_text || "",
      asset.notes || "",
      asset.created_by || "dashboard"
    ).run();

    await bustCache(env, `bootstrap:${TENANT_ID}`);
    return json({ success: true, asset_key });
  }

  // POST /api/cms/asset/delete — archive row + remove R2 object
  if (path === "/api/cms/asset/delete" && method === "POST") {
    const cmsUser = await requireCmsUser(request, env, sessionUser);
    if (!cmsUser) return json({ success: false, error: "Not authenticated" }, 401);

    const data = await body(request);
    const assetId = data.id || null;
    const assetKey = data.asset_key || null;
    if (!assetId && !assetKey) return json({ success: false, error: "id or asset_key required" }, 400);

    const row = assetId
      ? await env.DB.prepare("SELECT * FROM cms_assets WHERE tenant_id = ? AND id = ? LIMIT 1").bind(TENANT_ID, assetId).first()
      : await env.DB.prepare("SELECT * FROM cms_assets WHERE tenant_id = ? AND asset_key = ? LIMIT 1").bind(TENANT_ID, assetKey).first();
    if (!row) return json({ success: false, error: "Asset not found" }, 404);

    if (row.r2_key) {
      try { await env.WEBSITE_ASSETS.delete(row.r2_key); } catch (err) {
        console.warn("[cms-delete] R2 delete failed:", row.r2_key, err?.message);
      }
    }

    await env.DB.prepare(
      `UPDATE cms_assets SET status = 'archived', is_live = 0, updated_at = datetime('now')
       WHERE tenant_id = ? AND id = ?`
    ).bind(TENANT_ID, row.id).run();

    await bustCache(env, `bootstrap:${TENANT_ID}`);
    return json({ success: true, id: row.id });
  }
  return null;
}
