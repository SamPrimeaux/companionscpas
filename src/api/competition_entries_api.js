/**
 * Public competition entry API.
 * POST /api/public/competition-entries — multipart form + photo → pending D1 row + R2 asset.
 * POST /api/public/competition-entries/:id/mock-settle — test-only paid path (ALLOW_ENTRY_MOCK_SETTLE=1).
 * POST /api/public/competition-entries/:id/vote — public vote cast, persisted + deduped per visitor.
 * GET  /api/public/competitions/:campaignId/entries — approved entries + vote counts for the public gallery.
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
  return `entry_${crypto.randomUUID().replace(/-/g, "")}`;
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

function mockSettleAllowed(env) {
  return String(env.ALLOW_ENTRY_MOCK_SETTLE || "") === "1";
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
    SELECT id, title, status, is_public, config_json
    FROM fundraising_campaigns
    WHERE id = ? AND (tenant_id = ? OR organization_id = ?)
    LIMIT 1
  `).bind(campaignId, TENANT_ID, TENANT_ID).first().catch(() => null);

  if (!campaign) return json({ ok: false, error: "Campaign not found" }, 404);
  if (Number(campaign.is_public) !== 1 || campaign.status !== "active") {
    return json({ ok: false, error: "This competition is not accepting entries right now" }, 403);
  }
  let campaignConfig = {};
  try { campaignConfig = JSON.parse(campaign.config_json || "{}"); } catch {}
  if (campaignConfig.entry_status && campaignConfig.entry_status !== "open") {
    return json({ ok: false, error: "This competition is not accepting entries right now" }, 403);
  }
  const entryFeeCents = Math.max(100, Number(campaignConfig.entry_fee_cents) || 1000);

  const bytes = await file.arrayBuffer();
  if (bytes.byteLength > MAX_BYTES) {
    return json({ ok: false, error: "Photo must be under 10 MB" }, 400);
  }

  const id = entryId();
  const asset = assetId();
  const filename = safeFilename(file.name || `${dogName}.jpg`);
  const r2Key = `media/campaign/${campaignId}/entries/${id}/${filename}`;
  const photoUrl = `${CDN}/${r2Key}`;
  const ip = request.headers.get("CF-Connecting-IP") || null;
  const metadata = { photo_consent: true, source: "campaign_entry_hero" };

  await env.DB.prepare(`
    INSERT INTO competition_entries
      (id, tenant_id, campaign_id, owner_name, owner_email, owner_phone,
       dog_name, category, caption, expected_amount_cents,
       payment_status, submission_status, moderation_status, is_approved,
       ip_address, metadata_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            'pending', 'pending_upload', 'pending', 0,
            ?, ?, datetime('now'), datetime('now'))
  `).bind(
    id, TENANT_ID, campaignId, ownerName, ownerEmail, ownerPhone,
    dogName, category, caption || null, entryFeeCents,
    ip, JSON.stringify(metadata)
  ).run();

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
    await env.DB.prepare(`
      UPDATE competition_entries
      SET submission_status = 'upload_failed',
          payment_status = 'failed',
          failure_stage = 'photo_upload',
          failure_code = 'r2_put_failed',
          failure_message = ?,
          updated_at = datetime('now')
      WHERE id = ? AND tenant_id = ?
    `).bind(err?.message || "R2 upload failed", id, TENANT_ID).run().catch(() => null);
    const { notifyCompetitionEntry } = await import("./competition_notifications.js");
    await notifyCompetitionEntry(env, id, "failed", { reason: "The submitted photo could not be stored." });
    return json({ ok: false, error: "Photo upload failed" }, 500);
  }

  try {
    const assetInsert = env.DB.prepare(`
      INSERT INTO cms_assets
        (id, tenant_id, project_id, asset_key, label, filename, original_filename,
         mime_type, size, category, asset_type, r2_key, r2_bucket,
         pub_url, cdn_url, public_url, alt_text,
         usage_context, status, is_live, created_by, created_at, updated_at)
      VALUES (?, ?, 'proj_companionscpas', ?, ?, ?, ?,
              ?, ?, 'campaign', 'image', ?, 'companionscpas',
              ?, ?, ?, ?,
              'competition_entry', 'active', 0, 'public_entry', datetime('now'), datetime('now'))
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
    );
    const entryUpdate = env.DB.prepare(`
      UPDATE competition_entries
      SET asset_id = ?,
          r2_key = ?,
          photo_url = ?,
          submission_status = 'pending_payment',
          updated_at = datetime('now')
      WHERE id = ? AND tenant_id = ?
    `).bind(asset, r2Key, photoUrl, id, TENANT_ID);
    await env.DB.batch([assetInsert, entryUpdate]);
  } catch (err) {
    console.error("[competition-entries] D1 finalize failed:", err?.message || err);
    await env.WEBSITE_ASSETS.delete(r2Key).catch(() => null);
    await env.DB.prepare(`
      UPDATE competition_entries
      SET submission_status = 'storage_failed',
          payment_status = 'failed',
          failure_stage = 'entry_storage',
          failure_code = 'd1_finalize_failed',
          failure_message = ?,
          updated_at = datetime('now')
      WHERE id = ? AND tenant_id = ?
    `).bind(err?.message || "D1 finalize failed", id, TENANT_ID).run().catch(() => null);
    const { notifyCompetitionEntry } = await import("./competition_notifications.js");
    await notifyCompetitionEntry(env, id, "failed", { reason: "The uploaded entry could not be finalized." });
    return json({ ok: false, error: "Could not save entry" }, 500);
  }

  return json({
    ok: true,
    entry_id: id,
    campaign_id: campaignId,
    photo_url: photoUrl,
    entry_fee_cents: entryFeeCents,
    payment_status: "pending",
    mock_settle_available: mockSettleAllowed(env),
  });
}

/**
 * Test-only: mark entry paid, bump campaign raised, write campaign_updates, email admin.
 * Enabled only when wrangler var ALLOW_ENTRY_MOCK_SETTLE=1.
 */
export async function mockSettleCompetitionEntry(env, entryId) {
  const entry = await env.DB.prepare(`
    SELECT id, campaign_id, payment_status, expected_amount_cents, owner_name, owner_email,
           dog_name, asset_id, photo_url, r2_key
    FROM competition_entries
    WHERE id = ? AND tenant_id = ?
    LIMIT 1
  `).bind(entryId, TENANT_ID).first();

  if (!entry?.id) return { ok: false, status: 404, error: "Entry not found" };
  if (!entry.photo_url && !entry.r2_key) {
    return { ok: false, status: 400, error: "Entry has no uploaded photo yet" };
  }
  if (entry.payment_status === "paid") {
    const { upsertCampaignUpdateForPaidEntry } = await import("./competition_campaign_updates.js");
    const update = await upsertCampaignUpdateForPaidEntry(env, entryId);
    const { notifyCompetitionEntry } = await import("./competition_notifications.js");
    const mail = await notifyCompetitionEntry(env, entryId, "paid");
    return { ok: true, duplicate: true, entry_id: entryId, campaign_update: update, email: mail };
  }

  const fee = Math.max(100, Number(entry.expected_amount_cents) || 1000);
  const mockPi = `mock_pi_${entryId}`;

  await env.DB.prepare(`
    UPDATE competition_entries
    SET payment_status = 'paid',
        submission_status = 'paid',
        moderation_status = COALESCE(NULLIF(moderation_status, ''), 'pending'),
        stripe_payment_intent_id = COALESCE(stripe_payment_intent_id, ?),
        failure_stage = NULL,
        failure_code = NULL,
        failure_message = NULL,
        updated_at = datetime('now')
    WHERE id = ? AND tenant_id = ?
  `).bind(mockPi, entryId, TENANT_ID).run();

  await env.DB.prepare(`
    UPDATE fundraising_campaigns
    SET raised_amount_cents = COALESCE(raised_amount_cents, 0) + ?,
        donor_count = COALESCE(donor_count, 0) + 1,
        updated_at = datetime('now')
    WHERE id = ?
  `).bind(fee, entry.campaign_id).run().catch(() => null);

  const donationId = `donation_mock_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  await env.DB.prepare(`
    INSERT INTO donations
      (id, organization_id, donor_id, campaign_id, amount_cents, currency, status,
       payment_provider, donor_message, is_anonymous, donated_at)
    VALUES (?, ?, NULL, ?, ?, 'usd', 'succeeded', 'mock_settle', ?, 0, datetime('now'))
  `).bind(
    donationId,
    TENANT_ID,
    entry.campaign_id,
    fee,
    `Mock settle for ${entry.dog_name} (${entryId})`
  ).run().catch(() => null);

  const { upsertCampaignUpdateForPaidEntry } = await import("./competition_campaign_updates.js");
  const update = await upsertCampaignUpdateForPaidEntry(env, entryId);

  const { notifyCompetitionEntry } = await import("./competition_notifications.js");
  const mail = await notifyCompetitionEntry(env, entryId, "paid");

  return {
    ok: true,
    entry_id: entryId,
    campaign_id: entry.campaign_id,
    amount_cents: fee,
    photo_url: entry.photo_url,
    campaign_update: update,
    email: mail,
    donation_id: donationId,
  };
}

async function handleMockSettle(request, env, entryId) {
  if (!mockSettleAllowed(env)) {
    return json({ ok: false, error: "Mock settle disabled" }, 403);
  }
  const result = await mockSettleCompetitionEntry(env, entryId);
  return json(result, result.status || (result.ok ? 200 : 400));
}

/**
 * Hash a per-visitor fingerprint from IP + User-Agent so one visitor can cast
 * one vote per entry without requiring an account. Not identity-grade —
 * good enough to stop casual double-clicking and basic script spam.
 */
async function voterFingerprint(request) {
  const ip = request.headers.get("CF-Connecting-IP") || "";
  const ua = request.headers.get("User-Agent") || "";
  const raw = `${ip}::${ua}`;
  const bytes = new TextEncoder().encode(raw);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function voteId() {
  return `vote_${crypto.randomUUID().replace(/-/g, "")}`;
}

/**
 * POST /api/public/competition-entries/:id/vote
 * Persists one vote per (entry, visitor fingerprint). Recomputes vote_count
 * from competition_entry_votes so the counter can never drift from reality.
 */
async function handleCastVote(request, env, entryIdParam) {
  const entry = await env.DB.prepare(`
    SELECT ce.id, ce.campaign_id, ce.is_approved, ce.moderation_status, ce.archived_at,
           fc.is_public, fc.status
    FROM competition_entries ce
    JOIN fundraising_campaigns fc ON fc.id = ce.campaign_id
    WHERE ce.id = ? AND ce.tenant_id = ?
    LIMIT 1
  `).bind(entryIdParam, TENANT_ID).first().catch(() => null);

  if (!entry?.id) return json({ ok: false, error: "Entry not found" }, 404);
  if (Number(entry.is_approved) !== 1 || entry.archived_at) {
    return json({ ok: false, error: "This entry is not open for voting" }, 403);
  }
  if (Number(entry.is_public) !== 1 || entry.status !== "active") {
    return json({ ok: false, error: "This competition is not open for voting" }, 403);
  }

  const fingerprint = await voterFingerprint(request);
  const ip = request.headers.get("CF-Connecting-IP") || null;
  const id = voteId();

  const insert = await env.DB.prepare(`
    INSERT OR IGNORE INTO competition_entry_votes
      (id, tenant_id, entry_id, campaign_id, voter_fingerprint, ip_address, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `).bind(id, TENANT_ID, entryIdParam, entry.campaign_id, fingerprint, ip).run();

  const alreadyVoted = !insert?.meta || insert.meta.changes === 0;

  const countRow = await env.DB.prepare(`
    SELECT COUNT(*) AS n FROM competition_entry_votes WHERE entry_id = ?
  `).bind(entryIdParam).first().catch(() => ({ n: 0 }));
  const voteCount = Number(countRow?.n) || 0;

  await env.DB.prepare(`
    UPDATE competition_entries SET vote_count = ?, updated_at = datetime('now')
    WHERE id = ? AND tenant_id = ?
  `).bind(voteCount, entryIdParam, TENANT_ID).run().catch(() => null);

  return json({ ok: true, entry_id: entryIdParam, vote_count: voteCount, already_voted: alreadyVoted });
}

/**
 * GET /api/public/competitions/:campaignId/entries
 * Approved, non-archived entries with live vote counts, for the public gallery.
 */
async function handlePublicEntriesList(env, campaignId) {
  const campaign = await env.DB.prepare(`
    SELECT id, title, is_public, status FROM fundraising_campaigns
    WHERE id = ? AND (tenant_id = ? OR organization_id = ?)
    LIMIT 1
  `).bind(campaignId, TENANT_ID, TENANT_ID).first().catch(() => null);

  if (!campaign) return json({ ok: false, error: "Campaign not found" }, 404);
  if (Number(campaign.is_public) !== 1 || campaign.status !== "active") {
    return json({ ok: true, campaign_id: campaignId, entries: [] });
  }

  const rows = await env.DB.prepare(`
    SELECT id, dog_name, caption, photo_url, category, vote_count, created_at
    FROM competition_entries
    WHERE campaign_id = ? AND tenant_id = ?
      AND payment_status = 'paid' AND is_approved = 1 AND archived_at IS NULL
    ORDER BY vote_count DESC, created_at DESC
    LIMIT 100
  `).bind(campaignId, TENANT_ID).all().catch(() => ({ results: [] }));

  return json({ ok: true, campaign_id: campaignId, entries: rows.results || [] });
}

export async function competitionEntriesRoutes(request, env, url) {
  if (url.pathname === "/api/public/competition-entries" && request.method === "POST") {
    return handleCreateEntry(request, env);
  }

  const mockMatch = url.pathname.match(/^\/api\/public\/competition-entries\/([^/]+)\/mock-settle$/);
  if (mockMatch && request.method === "POST") {
    return handleMockSettle(request, env, decodeURIComponent(mockMatch[1]));
  }

  const voteMatch = url.pathname.match(/^\/api\/public\/competition-entries\/([^/]+)\/vote$/);
  if (voteMatch && request.method === "POST") {
    return handleCastVote(request, env, decodeURIComponent(voteMatch[1]));
  }

  const listMatch = url.pathname.match(/^\/api\/public\/competitions\/([^/]+)\/entries$/);
  if (listMatch && request.method === "GET") {
    return handlePublicEntriesList(env, decodeURIComponent(listMatch[1]));
  }

  return null;
}
