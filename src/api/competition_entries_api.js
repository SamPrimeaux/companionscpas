/**
 * Public competition entry API.
 * POST /api/public/competition-entries — multipart form + photo → pending D1 row + R2 asset.
 */

const TENANT_ID = "tenant_companionscpas";
const CDN = "https://assets.companionsofcaddo.org";
const ALLOWED_MIME = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const MAX_BYTES = 10 * 1024 * 1024;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function text(value) {
  return value == null ? "" : String(value).trim();
}

function entryId() {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return `entry_${[...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

function assetId() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return `asset_${Date.now().toString(36)}_${[...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

function safeFilename(name) {
  return String(name || "photo.jpg")
    .normalize("NFC")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 100);
}

async function handleCreateEntry(request, env) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, error: "Invalid multipart body" }, 400);
  }

  const campaignId = text(form.get("campaign_id"));
  const ownerName = text(form.get("owner_name"));
  const ownerPhone = text(form.get("owner_phone"));
  const ownerEmail = text(form.get("owner_email")).toLowerCase();
  const dogName = text(form.get("dog_name") || form.get("pet_name"));
  const caption = text(form.get("caption")).slice(0, 240);
  const consent = form.get("photo_consent");
  const file = form.get("photo") || form.get("pet_photo");
  const entryFeeCents = Math.max(100, Number(form.get("entry_fee_cents")) || 1000);
  const category = text(form.get("category")) || "general";

  if (!campaignId) return json({ ok: false, error: "campaign_id is required" }, 400);
  if (!ownerName) return json({ ok: false, error: "Owner name is required" }, 400);
  if (!ownerPhone) return json({ ok: false, error: "Phone number is required" }, 400);
  if (!ownerEmail || !ownerEmail.includes("@")) return json({ ok: false, error: "Valid email is required" }, 400);
  if (!dogName) return json({ ok: false, error: "Pet name is required" }, 400);
  if (!(consent === "1" || consent === "true" || consent === "on")) {
    return json({ ok: false, error: "Photo consent is required" }, 400);
  }
  if (!file || typeof file.arrayBuffer !== "function") {
    return json({ ok: false, error: "Pet photo is required" }, 400);
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return json({ ok: false, error: "Photo must be JPG, PNG, or WebP" }, 400);
  }

  const campaign = await env.DB.prepare(`
    SELECT id, title, status, is_public
    FROM fundraising_campaigns
    WHERE id = ? AND (tenant_id = ? OR organization_id = ?)
    LIMIT 1
  `).bind(campaignId, TENANT_ID, TENANT_ID).first().catch(() => null);

  if (!campaign) return json({ ok: false, error: "Campaign not found" }, 404);
  if (Number(campaign.is_public) !== 1 && campaign.status !== "active") {
    return json({ ok: false, error: "This competition is not accepting entries right now" }, 403);
  }

  const bytes = await file.arrayBuffer();
  if (bytes.byteLength > MAX_BYTES) {
    return json({ ok: false, error: "Photo must be under 10 MB" }, 400);
  }

  const id = entryId();
  const asset = assetId();
  const filename = safeFilename(file.name || `${dogName}.jpg`);
  const r2Key = `static/cms/uploads/competition/${campaignId}/${id}-${filename}`;
  const photoUrl = `${CDN}/${r2Key}`;
  const ip = request.headers.get("CF-Connecting-IP") || null;
  const metadata = {
    owner_phone: ownerPhone,
    caption: caption || null,
    entry_fee_cents: entryFeeCents,
    photo_consent: true,
    source: "campaign_entry_hero",
  };

  try {
    await env.WEBSITE_ASSETS.put(r2Key, bytes, {
      httpMetadata: {
        contentType: file.type,
        cacheControl: "public, max-age=31536000, immutable",
      },
      customMetadata: {
        tenant_id: TENANT_ID,
        campaign_id: campaignId,
        entry_id: id,
      },
    });
  } catch (err) {
    console.error("[competition-entries] R2 put failed:", err?.message || err);
    return json({ ok: false, error: "Photo upload failed" }, 500);
  }

  try {
    await env.DB.prepare(`
      INSERT INTO cms_assets
        (id, tenant_id, project_id, asset_key, label, filename, original_filename,
         mime_type, size, category, asset_type, r2_key, r2_bucket,
         pub_url, cdn_url, public_url, alt_text,
         usage_context, status, is_live, created_by, created_at, updated_at)
      VALUES (?, ?, 'proj_companionscpas', ?, ?, ?, ?,
              ?, ?, 'competition', 'image', ?, 'companionscpas',
              ?, ?, ?, ?,
              'competition_entry', 'active', 1, 'public_entry', datetime('now'), datetime('now'))
    `).bind(
      asset,
      TENANT_ID,
      `competition_${id}`,
      `${dogName} — ${campaign.title || "competition"}`,
      filename,
      file.name || filename,
      file.type,
      bytes.byteLength,
      r2Key,
      photoUrl,
      photoUrl,
      photoUrl,
      `${dogName} competition entry`
    ).run();
  } catch (err) {
    console.warn("[competition-entries] cms_assets insert skipped:", err?.message || err);
  }

  try {
    await env.DB.prepare(`
      INSERT INTO competition_entries
        (id, tenant_id, campaign_id, owner_name, owner_email, dog_name, category,
         asset_id, r2_key, photo_url, payment_status, is_approved,
         ip_address, metadata_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?,
              ?, ?, ?, 'pending', 0,
              ?, ?, datetime('now'), datetime('now'))
    `).bind(
      id,
      TENANT_ID,
      campaignId,
      ownerName,
      ownerEmail,
      dogName,
      category,
      asset,
      r2Key,
      photoUrl,
      ip,
      JSON.stringify(metadata)
    ).run();
  } catch (err) {
    console.error("[competition-entries] D1 insert failed:", err?.message || err);
    return json({ ok: false, error: "Could not save entry" }, 500);
  }

  return json({
    ok: true,
    entry_id: id,
    campaign_id: campaignId,
    photo_url: photoUrl,
    entry_fee_cents: entryFeeCents,
    payment_status: "pending",
  });
}

export async function competitionEntriesRoutes(request, env, url) {
  if (url.pathname === "/api/public/competition-entries" && request.method === "POST") {
    return handleCreateEntry(request, env);
  }
  return null;
}
