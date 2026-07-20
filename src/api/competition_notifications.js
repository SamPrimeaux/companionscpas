import { sendResend, sendTemplateEmail } from "./payments_email.js";
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

async function alreadyThankedEntrant(env, entryId) {
  const row = await env.DB.prepare(`
    SELECT id FROM email_logs
    WHERE tenant_id = ?
      AND related_type = 'competition_entry'
      AND related_id = ?
      AND email_type = 'competition_entry_thank_you'
      AND status IN ('delivered', 'sent', 'queued')
    LIMIT 1
  `).bind(TENANT_ID, entryId).first().catch(() => null);
  return Boolean(row?.id);
}

function entryTemplateVars(entry, extra = {}) {
  const amount = (Number(entry.expected_amount_cents || 0) / 100).toFixed(2);
  const firstName = String(entry.owner_name || "friend").trim().split(/\s+/)[0] || "friend";
  const caption = String(entry.caption || "").trim();
  const dashboardPath = `/dashboard/fundraising/${encodeURIComponent(entry.campaign_id)}`;
  return {
    first_name: firstName,
    owner_name: entry.owner_name || "",
    owner_email: entry.owner_email || "",
    owner_phone: entry.owner_phone || "Not provided",
    dog_name: entry.dog_name || "your pet",
    campaign_title: entry.campaign_title || "Wet Dog Competition",
    entry_id: entry.id,
    amount,
    caption_line: caption ? `Caption: ${caption}` : "",
    caption_html: caption ? `<p style="margin:0;"><strong>Caption:</strong> ${esc(caption)}</p>` : "",
    photo_url: entry.photo_url || "https://companionsofcaddo.org/donate",
    dashboard_url: `https://companionsofcaddo.org${dashboardPath}`,
    stripe_payment_intent_id: entry.stripe_payment_intent_id || "",
    ...extra,
  };
}

async function sendEntrantThankYou(env, entry) {
  const to = String(entry.owner_email || "").trim().toLowerCase();
  if (!to || !to.includes("@")) return { ok: false, error: "no_owner_email" };
  if (await alreadyThankedEntrant(env, entry.id)) {
    return { ok: true, duplicate: true };
  }

  const vars = entryTemplateVars(entry);
  const templated = await sendTemplateEmail(env, {
    templateKey: "competition_entry_thank_you",
    to,
    name: entry.owner_name || null,
    vars,
    type: "competition_entry_thank_you",
    related_type: "competition_entry",
    related_id: entry.id,
  });
  if (templated?.ok || templated?.duplicate) return templated;
  if (templated?.error && templated.error !== "template_not_found") return templated;

  // Fallback if template missing — still deliver, but prefer D1 templates in production.
  return sendResend(env, {
    to,
    name: entry.owner_name || null,
    subject: `You're in! ${vars.dog_name} is entered in ${vars.campaign_title}`,
    html: `<p>Hi ${esc(vars.first_name)},</p><p><strong>${esc(vars.dog_name)}</strong> is entered. Reference: ${esc(vars.entry_id)}</p>`,
    text: `Hi ${vars.first_name}, ${vars.dog_name} is entered. Reference: ${vars.entry_id}`,
    type: "competition_entry_thank_you",
    related_type: "competition_entry",
    related_id: entry.id,
  });
}

export async function notifyCompetitionEntry(env, entryId, kind, detail = {}) {
  const entry = await loadEntry(env, entryId);
  if (!entry) return { ok: false, error: "entry_not_found" };

  const isPaid = kind === "paid";
  const isStarted = kind === "started";
  let thankYou = null;
  if (isPaid) {
    thankYou = await sendEntrantThankYou(env, entry).catch((err) => ({
      ok: false,
      error: err?.message || "thank_you_failed",
    }));
  }

  if (await alreadyNotified(env, entryId, kind)) {
    return { ok: true, duplicate: true, thank_you: thankYou };
  }

  const adminTo = env.ADMIN_EMAIL || "companionsCPAS@gmail.com";
  const reason = String(
    detail.reason
      || entry.failure_message
      || entry.failure_code
      || (isStarted ? "New competition entry started — awaiting payment." : "Payment was not completed.")
  );
  const statusLabel = isPaid
    ? "Paid entry"
    : isStarted
      ? "Entry started"
      : kind === "abandoned"
        ? "Abandoned payment"
        : "Payment failed";
  const attachments = await attachmentForEntry(env, entry);
  const vars = entryTemplateVars(entry, { reason, status_label: statusLabel });
  const actionUrl = `/dashboard/fundraising/${encodeURIComponent(entry.campaign_id)}`;
  const templateKey = isPaid
    ? "competition_entry_paid_admin"
    : "competition_entry_followup_admin";
  const emailType = isPaid ? "competition_entry_paid" : `competition_entry_${kind}`;

  const notifId = await createDashboardNotification(env, {
    type: isPaid ? "competition_entry_paid" : `competition_entry_${kind}`,
    title: isPaid
      ? `Paid competition entry: ${entry.dog_name} — ${entry.owner_name}`
      : isStarted
        ? `New competition entry: ${entry.dog_name} — ${entry.owner_name}`
        : `Action needed: ${statusLabel.toLowerCase()} — ${entry.dog_name}`,
    body: isPaid
      ? `${entry.owner_name} paid $${vars.amount} for ${entry.dog_name}.`
      : isStarted
        ? `${entry.owner_name} started an entry for ${entry.dog_name} (${entry.owner_email || "no email"}). Payment not completed yet.`
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
      thank_you_ok: thankYou?.ok ? 1 : 0,
      attachment_count: attachments.length,
    },
  });

  let result = await sendTemplateEmail(env, {
    templateKey,
    to: adminTo,
    vars,
    attachments,
    type: emailType,
    related_type: "competition_entry",
    related_id: entry.id,
  });

  if (result?.error === "template_not_found") {
    result = await sendResend(env, {
      to: adminTo,
      subject: isPaid
        ? `Paid competition entry: ${entry.dog_name} — ${entry.owner_name}`
        : `Action needed: ${statusLabel.toLowerCase()} — ${entry.dog_name}`,
      html: `<p>${esc(statusLabel)}</p><p>${esc(entry.dog_name)} / ${esc(entry.owner_name)} / ${esc(entry.owner_email)}</p><p>${esc(reason)}</p>`,
      text: `${statusLabel}\n${entry.dog_name}\n${entry.owner_email}\n${reason}`,
      attachments,
      type: emailType,
      related_type: "competition_entry",
      related_id: entry.id,
    });
  }

  if (notifId) {
    await env.DB.prepare(`
      UPDATE dashboard_notifications
      SET metadata_json = json_set(
            COALESCE(NULLIF(metadata_json, ''), '{}'),
            '$.email_ok', ?,
            '$.email_error', ?,
            '$.email_provider_id', ?,
            '$.thank_you_ok', ?
          )
      WHERE id = ?
    `).bind(
      result.ok ? 1 : 0,
      result.error || null,
      result.id || null,
      thankYou?.ok ? 1 : 0,
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
  } else if (!isStarted) {
    await env.DB.prepare(`
      UPDATE competition_entries
      SET failure_notified_at = datetime('now'),
          updated_at = datetime('now')
      WHERE id = ? AND tenant_id = ?
    `).bind(entry.id, TENANT_ID).run().catch(() => null);
  }

  return { ...result, notification_id: notifId || null, thank_you: thankYou };
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
