import { sendResend } from "./payments_email.js";
import { createDashboardNotification } from "./notifications.js";

const TENANT_ID = "tenant_companionscpas";

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function bytesToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function loadEntry(env, entryId) {
  return env.DB.prepare(`
    SELECT ce.*, fc.title AS campaign_title, ca.mime_type, ca.original_filename
    FROM competition_entries ce
    LEFT JOIN fundraising_campaigns fc ON fc.id = ce.campaign_id
    LEFT JOIN cms_assets ca ON ca.id = ce.asset_id
    WHERE ce.id = ? AND ce.tenant_id = ?
    LIMIT 1
  `).bind(entryId, TENANT_ID).first().catch(() => null);
}

async function attachmentForEntry(env, entry) {
  if (!entry?.r2_key || !env.WEBSITE_ASSETS) return [];
  const object = await env.WEBSITE_ASSETS.get(entry.r2_key).catch(() => null);
  if (!object) return [];
  const content = bytesToBase64(await object.arrayBuffer());
  const ext = String(entry.original_filename || "").split(".").pop() || "jpg";
  const filename = `${String(entry.dog_name || "pet").replace(/[^a-z0-9_-]+/gi, "_")}-entry.${ext}`;
  return [{
    filename,
    content,
    content_type: entry.mime_type || object.httpMetadata?.contentType || "image/jpeg",
  }];
}

async function alreadyNotified(env, entryId, kind) {
  const relatedId = `${entryId}:${kind}`;
  const row = await env.DB.prepare(`
    SELECT id FROM dashboard_notifications
    WHERE tenant_id = ?
      AND related_type = 'competition_entry'
      AND related_id = ?
      AND status != 'dismissed'
    LIMIT 1
  `).bind(TENANT_ID, relatedId).first().catch(() => null);
  return Boolean(row?.id);
}

export async function notifyCompetitionEntry(env, entryId, kind, detail = {}) {
  const entry = await loadEntry(env, entryId);
  if (!entry) return { ok: false, error: "entry_not_found" };

  const isPaid = kind === "paid";
  // Dedupe via dashboard_notifications (related_id = entryId:kind). Not admin_notification_status.
  if (await alreadyNotified(env, entryId, kind)) {
    return { ok: true, duplicate: true };
  }

  const adminTo = env.ADMIN_EMAIL || "companionsCPAS@gmail.com";
  const amount = Number(entry.expected_amount_cents || 0) / 100;
  const reason = String(
    detail.reason || entry.failure_message || entry.failure_code || "Payment was not completed."
  );
  const statusLabel = isPaid ? "Paid entry" : kind === "abandoned" ? "Abandoned payment" : "Payment failed";
  const subject = isPaid
    ? `Paid competition entry: ${entry.dog_name} — ${entry.owner_name}`
    : `Action needed: ${statusLabel.toLowerCase()} — ${entry.dog_name}`;
  const attachments = await attachmentForEntry(env, entry);
  const actionUrl = `/dashboard/fundraising/${encodeURIComponent(entry.campaign_id)}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:640px;color:#211b25">
      <p style="font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#6f2fa8">${esc(statusLabel)}</p>
      <h1 style="font-size:24px;margin:0 0 16px">${esc(entry.dog_name)} — ${esc(entry.campaign_title || "Campaign entry")}</h1>
      <p><strong>Entry reference:</strong> ${esc(entry.id)}</p>
      <p><strong>Owner:</strong> ${esc(entry.owner_name)}</p>
      <p><strong>Email:</strong> ${esc(entry.owner_email)}</p>
      <p><strong>Phone:</strong> ${esc(entry.owner_phone || "Not provided")}</p>
      <p><strong>Expected entry fee:</strong> $${amount.toFixed(2)}</p>
      ${entry.caption ? `<p><strong>Caption:</strong> ${esc(entry.caption)}</p>` : ""}
      ${isPaid ? `<p><strong>Stripe PaymentIntent:</strong> ${esc(entry.stripe_payment_intent_id || "")}</p>` : `<p style="color:#a61b38"><strong>Follow-up reason:</strong> ${esc(reason)}</p>`}
      <p>The submitted image is attached to this email.</p>
      <p><a href="https://companionsofcaddo.org${actionUrl}">Open campaign in dashboard</a></p>
    </div>`;
  const text = [
    statusLabel,
    `Entry: ${entry.id}`,
    `Campaign: ${entry.campaign_title || entry.campaign_id}`,
    `Pet: ${entry.dog_name}`,
    `Owner: ${entry.owner_name}`,
    `Email: ${entry.owner_email}`,
    `Phone: ${entry.owner_phone || "Not provided"}`,
    `Expected fee: $${amount.toFixed(2)}`,
    entry.caption ? `Caption: ${entry.caption}` : "",
    isPaid ? `Stripe PaymentIntent: ${entry.stripe_payment_intent_id || ""}` : `Follow-up reason: ${reason}`,
    "The submitted image is attached.",
    `Dashboard: https://companionsofcaddo.org${actionUrl}`,
  ].filter(Boolean).join("\n");

  const notifId = await createDashboardNotification(env, {
    type: isPaid ? "competition_entry_paid" : `competition_entry_${kind}`,
    title: subject,
    body: isPaid
      ? `${entry.owner_name} paid $${amount.toFixed(2)} for ${entry.dog_name}.`
      : `${statusLabel}: ${entry.dog_name} / ${entry.owner_name}. ${reason}`,
    source: isPaid ? "stripe" : "competition_entry",
    related_type: "competition_entry",
    related_id: `${entry.id}:${kind}`,
    action_url: actionUrl,
    action_label: "Open campaign",
    reply_to_email: entry.owner_email || null,
    reply_subject: `Re: Wet Dog Competition entry — ${entry.dog_name}`,
    metadata: {
      entry_id: entry.id,
      campaign_id: entry.campaign_id,
      kind,
      payment_status: entry.payment_status,
      stripe_payment_intent_id: entry.stripe_payment_intent_id || null,
      attachment_count: attachments.length,
    },
  });

  const result = await sendResend(env, {
    to: adminTo,
    subject,
    html,
    text,
    attachments,
    type: isPaid ? "competition_entry_paid" : `competition_entry_${kind}`,
    related_type: "competition_entry",
    related_id: entry.id,
  });

  if (notifId) {
    await env.DB.prepare(`
      UPDATE dashboard_notifications
      SET metadata_json = json_set(
            COALESCE(NULLIF(metadata_json, ''), '{}'),
            '$.email_ok', ?,
            '$.email_error', ?,
            '$.email_provider_id', ?
          )
      WHERE id = ?
    `).bind(
      result.ok ? 1 : 0,
      result.error || null,
      result.id || null,
      notifId
    ).run().catch(() => null);
  }

  if (isPaid) {
    await env.DB.prepare(`
      UPDATE competition_entries
      SET admin_notified_at = datetime('now'),
          updated_at = datetime('now')
      WHERE id = ? AND tenant_id = ?
    `).bind(entry.id, TENANT_ID).run().catch(() => null);
  } else {
    await env.DB.prepare(`
      UPDATE competition_entries
      SET failure_notified_at = datetime('now'),
          updated_at = datetime('now')
      WHERE id = ? AND tenant_id = ?
    `).bind(entry.id, TENANT_ID).run().catch(() => null);
  }

  return { ...result, notification_id: notifId || null };
}

export async function reconcileAbandonedCompetitionEntries(env) {
  const rows = await env.DB.prepare(`
    SELECT ce.id
    FROM competition_entries ce
    WHERE ce.tenant_id = ?
      AND ce.archived_at IS NULL
      AND ce.submission_status IN ('pending_upload', 'pending_payment')
      AND ce.payment_status = 'pending'
      AND datetime(ce.created_at, '+30 minutes') <= datetime('now')
      AND NOT EXISTS (
        SELECT 1 FROM dashboard_notifications dn
        WHERE dn.tenant_id = ce.tenant_id
          AND dn.related_type = 'competition_entry'
          AND dn.related_id = (ce.id || ':abandoned')
          AND dn.status != 'dismissed'
      )
    ORDER BY ce.created_at
    LIMIT 100
  `).bind(TENANT_ID).all().catch(() => ({ results: [] }));

  const results = [];
  for (const row of rows.results || []) {
    await env.DB.prepare(`
      UPDATE competition_entries
      SET submission_status = 'abandoned',
          payment_status = 'abandoned',
          abandoned_at = datetime('now'),
          failure_stage = 'payment',
          failure_code = 'payment_abandoned',
          failure_message = 'Entry was started but payment was not completed within 30 minutes.',
          updated_at = datetime('now')
      WHERE id = ? AND tenant_id = ?
    `).bind(row.id, TENANT_ID).run();
    results.push(await notifyCompetitionEntry(env, row.id, "abandoned", {
      reason: "Entry was started but payment was not completed within 30 minutes.",
    }));
  }
  return { processed: results.length, results };
}
