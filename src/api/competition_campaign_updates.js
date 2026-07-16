/**
 * Public campaign feed for paid competition entries.
 * competition_entries = transactional SSOT
 * campaign_updates    = animal + image + running raised total for the campaign workspace/feed
 */

const TENANT_ID = "tenant_companionscpas";

function updateIdForEntry(entryId) {
  return `cupd_${String(entryId).replace(/^entry_/, "")}`;
}

/**
 * Upsert a campaign_updates row for a paid entry.
 * milestone_amount_cents = campaign raised_amount_cents after this gift.
 */
export async function upsertCampaignUpdateForPaidEntry(env, entryId) {
  const entry = await env.DB.prepare(`
    SELECT ce.id, ce.campaign_id, ce.dog_name, ce.owner_name, ce.caption,
           ce.asset_id, ce.photo_url, ce.expected_amount_cents, ce.payment_status,
           fc.title AS campaign_title, fc.raised_amount_cents
    FROM competition_entries ce
    LEFT JOIN fundraising_campaigns fc ON fc.id = ce.campaign_id
    WHERE ce.id = ? AND ce.tenant_id = ?
    LIMIT 1
  `).bind(entryId, TENANT_ID).first().catch(() => null);

  if (!entry?.id || entry.payment_status !== "paid") {
    return { ok: false, error: "entry_not_paid" };
  }

  const fee = Number(entry.expected_amount_cents) || 0;
  const raised = Number(entry.raised_amount_cents) || 0;
  const updateId = updateIdForEntry(entry.id);
  const title = entry.dog_name || "Competition entry";
  const body = [
    entry.caption ? String(entry.caption).trim() : "",
    `Entered by ${entry.owner_name || "a supporter"}.`,
    fee > 0 ? `Entry gift: $${(fee / 100).toFixed(2)}.` : "",
    `Campaign total after this entry: $${(raised / 100).toFixed(2)}.`,
    entry.photo_url ? `Photo: ${entry.photo_url}` : "",
    `Entry ref: ${entry.id}`,
  ].filter(Boolean).join("\n\n");

  await env.DB.prepare(`
    INSERT INTO campaign_updates
      (id, tenant_id, campaign_id, title, body, image_asset_id,
       update_type, milestone_amount_cents, status, is_public,
       published_at, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?,
            'competition_entry', ?, 'published', 0,
            datetime('now'), 'competition_settle', datetime('now'), datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      body = excluded.body,
      image_asset_id = COALESCE(excluded.image_asset_id, campaign_updates.image_asset_id),
      milestone_amount_cents = excluded.milestone_amount_cents,
      status = 'published',
      updated_at = datetime('now')
  `).bind(
    updateId,
    TENANT_ID,
    entry.campaign_id,
    title,
    body,
    entry.asset_id || null,
    raised
  ).run();

  return {
    ok: true,
    update_id: updateId,
    campaign_id: entry.campaign_id,
    milestone_amount_cents: raised,
    photo_url: entry.photo_url || null,
  };
}

export async function setCampaignUpdatePublicForEntry(env, entryId, isPublic) {
  const updateId = updateIdForEntry(entryId);
  await env.DB.prepare(`
    UPDATE campaign_updates
    SET is_public = ?,
        published_at = CASE WHEN ? = 1 THEN COALESCE(published_at, datetime('now')) ELSE published_at END,
        updated_at = datetime('now')
    WHERE id = ? AND tenant_id = ?
  `).bind(isPublic ? 1 : 0, isPublic ? 1 : 0, updateId, TENANT_ID).run().catch(() => null);
  return updateId;
}
