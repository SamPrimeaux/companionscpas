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
  R2_MEDIA_FOLDERS,
  rebuildCmsAssetUsages,
  loadUsagesByAssetIds,
} from "./shared.js";

// Multipart campaign uploads: 8 MB binary chunks, maximum 512 MB videos.
// Pending sessions live in cms_assets (D1). There are no new schema tables.
const CAMPAIGN_VIDEO_MAX_BYTES = 512 * 1024 * 1024;
const CAMPAIGN_PART_BYTES = 8 * 1024 * 1024;
const CAMPAIGN_UPLOAD_MAX_AGE = 24 * 60 * 60 * 1000;
const CAMPAIGN_UPLOAD_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm"]);
const CAMPAIGN_CDN_ORIGIN = "https://assets.companionsofcaddo.org";

function uploadOperator(user) {
  return String(user?.id || user?.user_id || user?.email || "dashboard").trim();
}

function campaignUploadSession(row, user) {
  if (!row || row.status !== "uploading" || row.tenant_id !== TENANT_ID) return null;
  if (row.created_by !== uploadOperator(user)) return null;
  try {
    const meta = JSON.parse(row.metadata_json || "{}");
    if (!meta.upload_id || !Number.isSafeInteger(meta.size) || !Number.isSafeInteger(meta.part_size)) return null;
    if (Date.now() - Number(meta.created_ms || 0) > CAMPAIGN_UPLOAD_MAX_AGE) return null;
    return meta;
  } catch { return null; }
}

async function campaignMultipartRoutes(request, env, path, method, sessionUser) {
  if (!path.startsWith("/api/cms/asset/multipart/")) return null;
  const user = await requireCmsUser(request, env, sessionUser);
  if (!user) return json({ success: false, error: "Not authenticated" }, 401);
  if (!env.WEBSITE_ASSETS?.createMultipartUpload || !env.WEBSITE_ASSETS?.resumeMultipartUpload) {
    return json({ success: false, error: "Large-media storage is unavailable" }, 503);
  }
  if (path === "/api/cms/asset/multipart/start" && method === "POST") {
    const input = await request.json().catch(() => ({}));
    const filename = String(input.filename || "").trim();
    const mime = String(input.mime_type || "").toLowerCase();
    const size = Number(input.size);
    if (!filename || filename.length > 220 || !CAMPAIGN_UPLOAD_TYPES.has(mime)
      || !Number.isSafeInteger(size) || size <= 25 * 1024 * 1024 || size > CAMPAIGN_VIDEO_MAX_BYTES) {
      return json({ success: false, error: "Use MP4, WebM, or MOV videos between 25 MB and 512 MB" }, 400);
    }
    const safeName = filename.normalize("NFC").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
    const r2Key = "media/campaign/" + crypto.randomUUID() + "-" + safeName;
    let multipart;
    try {
      multipart = await env.WEBSITE_ASSETS.createMultipartUpload(r2Key, {
        httpMetadata: { contentType: mime, cacheControl: "public, max-age=31536000, immutable" },
        customMetadata: { tenant_id: TENANT_ID, uploaded_by: uploadOperator(user) },
      });
    } catch (e) {
      console.error("[campaign-multipart] start:", e?.message || e);
      return json({ success: false, error: "Could not create video upload session" }, 502);
    }
    const assetId = id("asset");
    const assetKey = "upload_" + crypto.randomUUID().replace(/-/g, "");
    const publicUrl = CAMPAIGN_CDN_ORIGIN + "/" + r2Key;
    const metadata = JSON.stringify({
      upload_id: multipart.uploadId, size, part_size: CAMPAIGN_PART_BYTES,
      created_ms: Date.now(),
    });
    try {
      await env.DB.prepare(`
        INSERT INTO cms_assets (
          id, tenant_id, project_id, asset_key, label, filename, original_filename,
          mime_type, size, category, asset_type, r2_key, r2_bucket,
          pub_url, cdn_url, public_url, usage_context, status,
          is_live, created_by, metadata_json, created_at, updated_at
        ) VALUES (
          ?, ?, 'proj_companionscpas', ?, ?, ?, ?, ?, ?, 'campaign', 'video',
          ?, 'companionscpas', ?, ?, ?, 'campaign_cover', 'uploading',
          0, ?, ?, datetime('now'), datetime('now')
        )
      `).bind(
        assetId, TENANT_ID, assetKey, filename, safeName, filename,
        mime, size, r2Key, publicUrl, publicUrl, publicUrl,
        uploadOperator(user), metadata
      ).run();
    } catch (e) {
      console.error("[campaign-multipart] session registration:", e?.message || e);
      try { await multipart.abort(); } catch (_) {}
      return json({ success: false, error: "Could not register video upload session" }, 500);
    }
    return json({ success: true, id: assetId, part_size: CAMPAIGN_PART_BYTES });
  }

  const match = path.match(/^\/api\/cms\/asset\/multipart\/([^/]+)\/(part|complete|abort)$/);
  if (!match) return json({ success: false, error: "Unknown upload operation" }, 404);
  const assetId = decodeURIComponent(match[1]);
  const action = match[2];
  const asset = await env.DB.prepare(
    "SELECT * FROM cms_assets WHERE id = ? AND tenant_id = ? AND status = 'uploading' LIMIT 1"
  ).bind(assetId, TENANT_ID).first().catch(() => null);
  const meta = campaignUploadSession(asset, user);
  if (!meta) return json({ success: false, error: "Upload session expired or unavailable. Retry the upload." }, 404);
  const multipart = env.WEBSITE_ASSETS.resumeMultipartUpload(asset.r2_key, meta.upload_id);
  const expectedParts = Math.ceil(meta.size / meta.part_size);

  if (action === "part" && method === "PUT") {
    const number = Number(new URL(request.url).searchParams.get("number"));
    if (!Number.isInteger(number) || number < 1 || number > expectedParts) {
      return json({ success: false, error: "Invalid video chunk number" }, 400);
    }
    const expectedBytes = Math.min(meta.part_size, meta.size - (number - 1) * meta.part_size);
    const lengthHeader = request.headers.get("Content-Length");
    if (lengthHeader && Number(lengthHeader) !== expectedBytes) {
      return json({ success: false, error: "Incorrect chunk length" }, 400);
    }
    const bytes = await request.arrayBuffer();
    if (bytes.byteLength !== expectedBytes) {
      return json({ success: false, error: "Incorrect chunk length" }, 400);
    }
    try {
      const uploaded = await multipart.uploadPart(number, bytes);
      return json({ success: true, part_number: number, etag: uploaded.etag });
    } catch (e) {
      console.error("[campaign-multipart] chunk:", e?.message || e);
      return json({ success: false, error: "Video chunk failed. Retry upload." }, 502);
    }
  }

  if (action === "complete" && method === "POST") {
    const data = await request.json().catch(() => ({}));
    const parts = data.parts;
    if (!Array.isArray(parts) || parts.length !== expectedParts ||
      parts.some((p, i) => p?.partNumber !== i + 1 || typeof p.etag !== "string" || !p.etag || p.etag.length > 200)) {
      return json({ success: false, error: "Incomplete or invalid video chunks" }, 400);
    }
    try {
      await multipart.complete(parts);
      const stored = await env.WEBSITE_ASSETS.head(asset.r2_key);
      if (!stored || stored.size !== meta.size) {
        await env.WEBSITE_ASSETS.delete(asset.r2_key).catch(() => {});
        return json({ success: false, error: "Video failed storage integrity check" }, 502);
      }
      try {
        await env.DB.prepare(`
          UPDATE cms_assets SET status = 'active', is_live = 1,
          metadata_json = ?, updated_at = datetime('now')
          WHERE id = ? AND tenant_id = ? AND status = 'uploading'
        `).bind(JSON.stringify({ upload_kind: "multipart", size: meta.size }), assetId, TENANT_ID).run();
      } catch (dbError) {
        console.error("[campaign-multipart] final registration:", dbError?.message || dbError);
        await env.WEBSITE_ASSETS.delete(asset.r2_key).catch(() => {});
        return json({ success: false, error: "Video storage succeeded but registration failed" }, 500);
      }
      return json({
        success: true, id: assetId, public_url: asset.public_url, r2_key: asset.r2_key,
        mime_type: asset.mime_type, asset_type: "video", filename: asset.original_filename,
      });
    } catch (e) {
      console.error("[campaign-multipart] finalize:", e?.message || e);
      return json({ success: false, error: "Could not finalize video upload" }, 502);
    }
  }

  if (action === "abort" && method === "POST") {
    try { await multipart.abort(); } catch (e) { console.warn("[campaign-multipart] abort:", e?.message || e); }
    await env.DB.prepare(
      "UPDATE cms_assets SET status = 'archived', updated_at = datetime('now') WHERE id = ? AND tenant_id = ?"
    ).bind(assetId, TENANT_ID).run().catch(() => {});
    return json({ success: true, aborted: true });
  }
  return json({ success: false, error: "Method not allowed" }, 405);
}

export async function routesAssets(request, env, url, path, method, sessionUser = null) {
  const multiResponse = await campaignMultipartRoutes(request, env, path, method, sessionUser);
  if (multiResponse) return multiResponse;
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
    let q = "SELECT * FROM cms_assets WHERE tenant_id = ? AND status = 'active'";
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
    const MAX_SIZE = 25 * 1024 * 1024; // Larger files require direct-to-R2 uploads.

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

    if (file.size > MAX_SIZE) {
      return json({ success: false, error: "File exceeds the 25 MB upload limit." }, 413);
    }
    const fileBytes = await file.arrayBuffer();

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
    try {
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
    } catch (err) {
      console.error("[cms-upload] asset registration failed:", err?.message || err);
      try { await env.WEBSITE_ASSETS.delete(r2Key); }
      catch (cleanupErr) { console.error("[cms-upload] rollback failed:", cleanupErr?.message || cleanupErr); }
      return json({ success: false, error: "Could not register the uploaded file. Please retry." }, 500);
    }

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
