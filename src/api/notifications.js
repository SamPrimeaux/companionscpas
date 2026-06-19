const TENANT_ID = "tenant_companionscpas";

function id(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function safeJson(value, fallback = {}) {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(String(value)) || fallback;
  } catch {
    return fallback;
  }
}

function money(cents) {
  return `$${(Number(cents || 0) / 100).toFixed(2)}`;
}

export async function createDashboardNotification(env, payload) {
  if (!env?.DB) return null;
  const relatedType = payload.related_type || null;
  const relatedId = payload.related_id || null;
  if (relatedType && relatedId) {
    const existing = await env.DB.prepare(
      `SELECT id FROM dashboard_notifications
       WHERE tenant_id = ? AND related_type = ? AND related_id = ? AND status != 'dismissed'
       LIMIT 1`
    ).bind(TENANT_ID, relatedType, relatedId).first().catch(() => null);
    if (existing?.id) return existing.id;
  }

  const notifId = payload.id || id("notif");
  await env.DB.prepare(
    `INSERT INTO dashboard_notifications
       (id, tenant_id, type, title, body, status, source, related_type, related_id,
        action_url, action_label, reply_to_email, reply_subject, metadata_json, created_at)
     VALUES (?, ?, ?, ?, ?, 'unread', ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
  ).bind(
    notifId,
    TENANT_ID,
    payload.type || "system",
    payload.title || "Notification",
    payload.body || null,
    payload.source || null,
    relatedType,
    relatedId,
    payload.action_url || null,
    payload.action_label || null,
    payload.reply_to_email || null,
    payload.reply_subject || null,
    JSON.stringify(payload.metadata || {})
  ).run().catch((err) => {
    console.warn("[notifications] insert failed:", err?.message || err);
  });
  return notifId;
}

export async function notifyDonationReceived(env, {
  donationId,
  amountCents,
  donorEmail,
  donorName,
  campaignTitle,
  stripePaymentIntentId,
}) {
  const label = donorName || donorEmail || "Anonymous donor";
  return createDashboardNotification(env, {
    type: "donation",
    title: `Donation received — ${money(amountCents)}`,
    body: `${label} donated ${money(amountCents)}${campaignTitle ? ` to ${campaignTitle}` : ""}.`,
    source: "stripe",
    related_type: "donation",
    related_id: donationId,
    action_url: "/dashboard/fundraising",
    action_label: "View in Giving",
    reply_to_email: donorEmail || null,
    reply_subject: "Thank you for your gift — Companions of CPAS",
    metadata: {
      amount_cents: amountCents,
      stripe_payment_intent_id: stripePaymentIntentId || null,
      campaign_title: campaignTitle || null,
    },
  });
}

export async function notifyContactRequest(env, {
  contactId,
  name,
  email,
  requestType,
  message,
}) {
  return createDashboardNotification(env, {
    type: "contact",
    title: `New contact — ${requestType || "general"}`,
    body: `${name} (${email}): ${String(message || "").slice(0, 280)}`,
    source: "contact_form",
    related_type: "contact",
    related_id: contactId,
    action_url: "/dashboard/email",
    action_label: "Open Email",
    reply_to_email: email || null,
    reply_subject: `Re: your message to Companions of CPAS`,
    metadata: { name, email, request_type: requestType || "general" },
  });
}

export async function notifyFosterApplication(env, {
  applicationId,
  applicantName,
  email,
  animalName,
}) {
  return createDashboardNotification(env, {
    type: "foster",
    title: `New foster application${animalName ? ` — ${animalName}` : ""}`,
    body: `${applicantName || "Applicant"}${email ? ` (${email})` : ""} submitted a foster application.`,
    source: "foster_form",
    related_type: "foster_application",
    related_id: applicationId,
    action_url: "/dashboard/applications",
    action_label: "Review application",
    reply_to_email: email || null,
    reply_subject: "Re: your foster application — Companions of CPAS",
    metadata: { applicant_name: applicantName, animal_name: animalName || null },
  });
}

export function normalizeNotificationRow(row) {
  if (!row) return null;
  return {
    ...row,
    metadata: safeJson(row.metadata_json, {}),
    is_notification: true,
  };
}

export async function listDashboardNotifications(env, { status = "active", limit = 100 } = {}) {
  let where = "tenant_id = ?";
  const binds = [TENANT_ID];
  if (status === "active") {
    where += " AND status != 'dismissed'";
  } else if (status && status !== "all") {
    where += " AND status = ?";
    binds.push(status);
  }
  binds.push(Math.min(Number(limit) || 100, 200));
  const rows = await env.DB.prepare(
    `SELECT * FROM dashboard_notifications
     WHERE ${where}
     ORDER BY datetime(created_at) DESC
     LIMIT ?`
  ).bind(...binds).all().catch(() => ({ results: [] }));

  const unread = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM dashboard_notifications
     WHERE tenant_id = ? AND status = 'unread'`
  ).bind(TENANT_ID).first().catch(() => ({ n: 0 }));

  return {
    notifications: (rows.results || []).map(normalizeNotificationRow),
    unread_count: Number(unread?.n || 0),
  };
}

export async function getDashboardNotification(env, notifId) {
  const row = await env.DB.prepare(
    `SELECT * FROM dashboard_notifications WHERE id = ? AND tenant_id = ? LIMIT 1`
  ).bind(notifId, TENANT_ID).first().catch(() => null);
  return normalizeNotificationRow(row);
}

export async function patchDashboardNotification(env, notifId, patch) {
  const sets = [];
  const vals = [];
  if (patch.status === "read") {
    sets.push("status = 'read'", "read_at = datetime('now')");
  } else if (patch.status === "dismissed") {
    sets.push("status = 'dismissed'", "dismissed_at = datetime('now')");
  } else if (patch.status === "unread") {
    sets.push("status = 'unread'", "read_at = NULL");
  }
  if (!sets.length) return null;
  vals.push(notifId, TENANT_ID);
  await env.DB.prepare(
    `UPDATE dashboard_notifications SET ${sets.join(", ")} WHERE id = ? AND tenant_id = ?`
  ).bind(...vals).run();
  return getDashboardNotification(env, notifId);
}

export async function deleteDashboardNotification(env, notifId) {
  await env.DB.prepare(
    `DELETE FROM dashboard_notifications WHERE id = ? AND tenant_id = ?`
  ).bind(notifId, TENANT_ID).run();
}
