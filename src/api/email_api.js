import { getAuthUser } from "./session_api.js";
import { syncGmailInbox } from "./gmail_api.js";

const TENANT_ID = "tenant_companionscpas";
const DEFAULT_MAILBOXES = [
  "support@companionsofcaddo.org",
  "dashboard@companionsofcaddo.org",
];

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function id(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

async function body(request) {
  try { return await request.json(); } catch { return {}; }
}

function safeJson(value, fallback = null) {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    const parsed = JSON.parse(String(value));
    return parsed === null ? fallback : parsed;
  } catch {
    return fallback;
  }
}

function timingSafeEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

function decodeWebhookSecret(secret) {
  const raw = String(secret || "").trim();
  const base64 = raw.startsWith("whsec_") ? raw.slice(6) : raw;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmacSha256Base64(secretBytes, payload) {
  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  let binary = "";
  const bytes = new Uint8Array(sig);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function verifyResendWebhook(request, env) {
  const secret = env.RESEND_INBOUND_WEBHOOK_SECRET || env.RESEND_WEBHOOK_SECRET;
  if (!secret) return { ok: false, status: 501, error: "Webhook secret not configured" };

  const rawBody = await request.text();
  const svixId = request.headers.get("svix-id") || request.headers.get("webhook-id");
  const svixTimestamp = request.headers.get("svix-timestamp") || request.headers.get("webhook-timestamp");
  const svixSignature = request.headers.get("svix-signature") || request.headers.get("webhook-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return { ok: false, status: 400, error: "Missing webhook signature headers" };
  }

  const ts = Number(svixTimestamp);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > 300) {
    return { ok: false, status: 400, error: "Webhook timestamp outside tolerance" };
  }

  const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;
  const secretBytes = decodeWebhookSecret(secret);
  const expected = await hmacSha256Base64(secretBytes, signedContent);
  const signatures = String(svixSignature)
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => (part.includes(",") ? part.split(",")[1] : part));

  const verified = signatures.some((sig) => timingSafeEqual(sig, expected));
  if (!verified) return { ok: false, status: 401, error: "Invalid webhook signature" };

  try {
    return { ok: true, event: JSON.parse(rawBody) };
  } catch {
    return { ok: false, status: 400, error: "Invalid webhook JSON" };
  }
}

function resendKey(env) {
  return env.RESEND_API_KEY || env.RESEND_API_TOKEN || null;
}

function defaultFrom(env, mailbox) {
  if (mailbox && String(mailbox).toLowerCase().includes("support@")) {
    return env.RESEND_SUPPORT_FROM || "Companions of CPAS <support@companionsofcaddo.org>";
  }
  return env.RESEND_FROM_EMAIL || "Companions of CPAS <no-reply@companionsofcaddo.org>";
}

function normalizeMailboxList(env) {
  const raw = String(env.EMAIL_INBOX_MAILBOXES || "").trim();
  if (!raw) return DEFAULT_MAILBOXES;
  return raw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
}

function pickMailbox(toList, mailboxes) {
  const lowered = (toList || []).map((t) => String(t).toLowerCase());
  for (const box of mailboxes) {
    if (lowered.some((t) => t === box || t.includes(box))) return box;
  }
  return lowered[0] || mailboxes[0] || "support@companionsofcaddo.org";
}

async function fetchReceivedEmail(env, emailId) {
  const key = resendKey(env);
  if (!key || !emailId) return null;
  const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const raw = await res.text();
  let parsed = {};
  try { parsed = JSON.parse(raw); } catch {}
  if (!res.ok) return { error: raw, status: res.status };
  return parsed;
}

async function logOutbound(env, row) {
  try {
    const emailId = id("email");
    await env.DB.prepare(
      `INSERT INTO email_logs
       (id, tenant_id, recipient_email, recipient_name, subject, email_type, provider_message_id, status, related_type, related_id, error_message, sent_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      emailId,
      TENANT_ID,
      row.to,
      row.name || null,
      row.subject,
      row.type || "manual",
      row.provider_message_id || null,
      row.status || "queued",
      row.related_type || null,
      row.related_id || null,
      row.error_message || null,
      row.sent_at || null
    ).run();
    return emailId;
  } catch (err) {
    console.warn("[email] log skipped:", err?.message || err);
    return null;
  }
}

async function sendResendEmail(env, { from, to, subject, html, text, replyTo, type, related_type, related_id }) {
  const key = resendKey(env);
  if (!key) {
    await logOutbound(env, { to, subject, type, related_type, related_id, status: "skipped", error_message: "Missing RESEND_API_KEY" });
    return { ok: false, error: "Missing RESEND_API_KEY" };
  }

  const payload = {
    from: from || defaultFrom(env),
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    text: text || String(html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(),
  };
  if (replyTo) payload.reply_to = replyTo;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const raw = await res.text();
  let parsed = {};
  try { parsed = JSON.parse(raw); } catch {}

  if (!res.ok) {
    await logOutbound(env, { to: Array.isArray(to) ? to[0] : to, subject, type, related_type, related_id, status: "failed", error_message: raw });
    return { ok: false, status: res.status, error: raw };
  }

  await logOutbound(env, {
    to: Array.isArray(to) ? to[0] : to,
    subject,
    type,
    related_type,
    related_id,
    provider_message_id: parsed.id || null,
    status: "sent",
    sent_at: new Date().toISOString(),
  });

  return { ok: true, id: parsed.id || null };
}

async function storeInboundEmail(env, event, mailboxes) {
  const data = event?.data || {};
  const resendEmailId = data.email_id || data.id || null;
  if (!resendEmailId) return { skipped: true, reason: "missing email_id" };

  const existing = await env.DB.prepare(
    "SELECT id FROM inbound_emails WHERE tenant_id = ? AND resend_email_id = ? LIMIT 1"
  ).bind(TENANT_ID, resendEmailId).first().catch(() => null);
  if (existing?.id) return { duplicate: true, id: existing.id };

  const toList = Array.isArray(data.to) ? data.to : (data.to ? [data.to] : []);
  const mailbox = pickMailbox(toList, mailboxes);
  const full = await fetchReceivedEmail(env, resendEmailId);
  const emailBody = full && !full.error ? full : {};

  const rowId = id("inb");
  const preview = String(emailBody.text || data.subject || "").slice(0, 280);
  const threadKey = data.message_id || data.in_reply_to || resendEmailId;
  const subject = data.subject || emailBody.subject || "(no subject)";
  const folderId = /onboarding/i.test(subject) ? "fld_onboarding" : null;

  await env.DB.prepare(
    `INSERT INTO inbound_emails
     (id, tenant_id, resend_email_id, provider_event_id, message_id, thread_key, mailbox,
      from_email, from_name, to_json, cc_json, subject, preview_text, body_html, body_text,
      attachments_json, status, source, folder_id, in_reply_to, raw_event_json, received_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unread', 'resend', ?, ?, ?, ?, datetime('now'))`
  ).bind(
    rowId,
    TENANT_ID,
    resendEmailId,
    event.id || null,
    data.message_id || null,
    threadKey,
    mailbox,
    String(data.from || emailBody.from || "unknown"),
    null,
    JSON.stringify(toList),
    JSON.stringify(data.cc || []),
    subject,
    preview,
    emailBody.html || null,
    emailBody.text || null,
    JSON.stringify(data.attachments || emailBody.attachments || []),
    folderId,
    data.in_reply_to || null,
    JSON.stringify(event),
    data.created_at || new Date().toISOString()
  ).run();

  return { stored: true, id: rowId, mailbox };
}

async function updateOutboundFromEvent(env, event) {
  const type = String(event?.type || "");
  const data = event?.data || {};
  const providerId = data.email_id || data.id || null;
  if (!providerId) return;

  const statusMap = {
    "email.sent": "sent",
    "email.delivered": "delivered",
    "email.failed": "failed",
    "email.bounced": "bounced",
    "email.complained": "complained",
    "email.opened": "opened",
    "email.scheduled": "scheduled",
  };
  const status = statusMap[type];
  if (!status) return;

  await env.DB.prepare(
    `UPDATE email_logs
     SET status = ?
     WHERE tenant_id = ? AND provider_message_id = ?`
  ).bind(status, TENANT_ID, providerId).run().catch(() => {});
}

async function handleInboundWebhook(request, env) {
  const verified = await verifyResendWebhook(request, env);
  if (!verified.ok) return json({ error: verified.error }, verified.status);

  const event = verified.event;
  const type = String(event?.type || "");

  if (type === "email.received") {
    const mailboxes = normalizeMailboxList(env);
    const result = await storeInboundEmail(env, event, mailboxes);
    return json({ ok: true, ...result });
  }

  if (type.startsWith("email.")) {
    await updateOutboundFromEvent(env, event);
    return json({ ok: true, handled: type });
  }

  return json({ ok: true, ignored: type });
}

function normalizeInboundRow(row) {
  if (!row) return null;
  return {
    ...row,
    to: safeJson(row.to_json, []),
    cc: safeJson(row.cc_json, []),
    attachments: safeJson(row.attachments_json, []),
  };
}

export async function emailApiRoutes(request, env, url) {
  const path = url.pathname;
  const method = request.method;

  if (!path.startsWith("/api/email/")) return null;

  if (path === "/api/email/inbound" && method === "POST") {
    return handleInboundWebhook(request, env);
  }

  const session = await getAuthUser(request, env);
  if (!session) return json({ error: "Not authenticated" }, 401);

  if (path === "/api/email/config" && method === "GET") {
    const gmailConn = await env.DB.prepare(
      "SELECT status, provider_account_email FROM social_provider_connections WHERE id = ? LIMIT 1"
    ).bind(`conn_gmail_${TENANT_ID}`).first().catch(() => null);

    return json({
      mailboxes: normalizeMailboxList(env),
      from_addresses: {
        support: env.RESEND_SUPPORT_FROM || "Companions of CPAS <support@companionsofcaddo.org>",
        default: env.RESEND_FROM_EMAIL || "Companions of CPAS <no-reply@companionsofcaddo.org>",
      },
      resend_configured: Boolean(resendKey(env)),
      webhook_configured: Boolean(env.RESEND_INBOUND_WEBHOOK_SECRET || env.RESEND_WEBHOOK_SECRET),
      gmail: {
        connected: gmailConn?.status === "connected",
        account_email: gmailConn?.provider_account_email || null,
      },
    });
  }

  if (path === "/api/email/folders" && method === "GET") {
    const rows = await env.DB.prepare(
      "SELECT id, name, slug, is_system, sort_order FROM email_folders WHERE tenant_id = ? ORDER BY sort_order, name"
    ).bind(TENANT_ID).all().catch(() => ({ results: [] }));
    return json({ folders: rows?.results || [] });
  }

  if (path === "/api/email/folders" && method === "POST") {
    const data = await body(request);
    const name = String(data.name || "").trim();
    if (!name) return json({ error: "name is required" }, 400);
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "folder";
    const folderId = id("fld");
    await env.DB.prepare(
      `INSERT INTO email_folders (id, tenant_id, name, slug, is_system, sort_order, updated_at)
       VALUES (?, ?, ?, ?, 0, 60, datetime('now'))`
    ).bind(folderId, TENANT_ID, name, slug).run();
    return json({ ok: true, id: folderId, slug });
  }

  if (path === "/api/email/inbox" && method === "GET") {
    const mailbox = url.searchParams.get("mailbox") || null;
    const view = (url.searchParams.get("view") || "inbox").toLowerCase();
    const folderId = url.searchParams.get("folder_id") || null;
    const readFilter = url.searchParams.get("read_filter") || "all";
    const q = (url.searchParams.get("q") || "").trim().toLowerCase();
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 50)));

    let sql = `SELECT id, mailbox, from_email, subject, preview_text, status, received_at, thread_key,
                      is_important, is_deleted, folder_id, source
               FROM inbound_emails WHERE tenant_id = ?`;
    const binds = [TENANT_ID];

    if (view === "important") {
      sql += " AND is_important = 1 AND COALESCE(is_deleted, 0) = 0";
    } else if (view === "deleted") {
      sql += " AND COALESCE(is_deleted, 0) = 1";
    } else if (view === "folder" && folderId) {
      sql += " AND folder_id = ? AND COALESCE(is_deleted, 0) = 0";
      binds.push(folderId);
    } else {
      sql += " AND COALESCE(is_deleted, 0) = 0 AND (folder_id IS NULL OR folder_id = '')";
    }

    if (mailbox && mailbox !== "all") {
      sql += " AND (lower(mailbox) = lower(?) OR source = 'gmail')";
      binds.push(mailbox);
    }
    if (readFilter === "read") sql += " AND status = 'read'";
    if (readFilter === "unread") sql += " AND status = 'unread'";

    sql += " ORDER BY received_at DESC LIMIT ?";
    binds.push(limit);

    const rows = await env.DB.prepare(sql).bind(...binds).all().catch(() => ({ results: [] }));
    let messages = rows?.results || [];
    if (q) {
      messages = messages.filter((m) =>
        String(m.subject || "").toLowerCase().includes(q)
        || String(m.from_email || "").toLowerCase().includes(q)
        || String(m.preview_text || "").toLowerCase().includes(q)
      );
    }

    const counts = await env.DB.prepare(
      `SELECT
         SUM(CASE WHEN COALESCE(is_deleted,0)=0 AND status='unread' AND (folder_id IS NULL OR folder_id='') THEN 1 ELSE 0 END) AS unread_inbox,
         SUM(CASE WHEN COALESCE(is_deleted,0)=0 AND is_important=1 THEN 1 ELSE 0 END) AS important_count
       FROM inbound_emails WHERE tenant_id = ?`
    ).bind(TENANT_ID).first().catch(() => ({}));

    return json({
      messages,
      unread_count: Number(counts?.unread_inbox || 0),
      important_count: Number(counts?.important_count || 0),
    });
  }

  const inboxMatch = path.match(/^\/api\/email\/inbox\/([^/]+)$/);
  if (inboxMatch && method === "GET") {
    const row = await env.DB.prepare(
      "SELECT * FROM inbound_emails WHERE tenant_id = ? AND id = ? LIMIT 1"
    ).bind(TENANT_ID, inboxMatch[1]).first();
    if (!row) return json({ error: "Not found" }, 404);
    return json({ message: normalizeInboundRow(row) });
  }

  if (inboxMatch && method === "PATCH") {
    const data = await body(request);
    const sets = [];
    const binds = [];

    if (data.status && ["unread", "read", "archived"].includes(data.status)) {
      sets.push("status = ?");
      binds.push(data.status);
    }
    if (data.is_important !== undefined) {
      sets.push("is_important = ?");
      binds.push(data.is_important ? 1 : 0);
    }
    if (data.is_deleted !== undefined) {
      sets.push("is_deleted = ?");
      binds.push(data.is_deleted ? 1 : 0);
    }
    if (data.folder_id !== undefined) {
      sets.push("folder_id = ?");
      binds.push(data.folder_id || null);
    }
    if (!sets.length) return json({ error: "No valid fields to update" }, 400);

    sets.push("updated_at = datetime('now')");
    binds.push(TENANT_ID, inboxMatch[1]);
    await env.DB.prepare(
      `UPDATE inbound_emails SET ${sets.join(", ")} WHERE tenant_id = ? AND id = ?`
    ).bind(...binds).run();
    return json({ ok: true });
  }

  if (path === "/api/email/drafts" && method === "GET") {
    const rows = await env.DB.prepare(
      "SELECT * FROM email_drafts WHERE tenant_id = ? ORDER BY updated_at DESC LIMIT 50"
    ).bind(TENANT_ID).all().catch(() => ({ results: [] }));
    return json({ drafts: rows?.results || [] });
  }

  if (path === "/api/email/drafts" && method === "POST") {
    const data = await body(request);
    const draftId = id("draft");
    await env.DB.prepare(
      `INSERT INTO email_drafts (id, tenant_id, to_json, subject, body_html, body_text, from_email, created_by, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      draftId,
      TENANT_ID,
      JSON.stringify(data.to ? [data.to] : []),
      data.subject || null,
      data.body_html || data.html || null,
      data.body_text || data.text || null,
      data.from_email || defaultFrom(env, "support@companionsofcaddo.org"),
      session.email || session.user_id || null
    ).run();
    return json({ ok: true, id: draftId });
  }

  const draftMatch = path.match(/^\/api\/email\/drafts\/([^/]+)$/);
  if (draftMatch && method === "DELETE") {
    await env.DB.prepare(
      "DELETE FROM email_drafts WHERE tenant_id = ? AND id = ?"
    ).bind(TENANT_ID, draftMatch[1]).run();
    return json({ ok: true });
  }

  if (path === "/api/email/sync-gmail" && method === "POST") {
    const result = await syncGmailInbox(env, 40);
    if (!result.ok) return json(result, 400);
    return json(result);
  }

  if (path === "/api/email/send" && method === "POST") {
    const data = await body(request);
    const to = String(data.to || "").trim();
    const subject = String(data.subject || "").trim();
    const html = String(data.html || data.body_html || "").trim();
    if (!to || !subject || !html) return json({ error: "to, subject, and html are required" }, 400);

    const from = data.from || defaultFrom(env, data.mailbox || "support@companionsofcaddo.org");
    const result = await sendResendEmail(env, {
      from,
      to,
      subject,
      html,
      text: data.text || data.body_text,
      replyTo: data.reply_to || null,
      type: data.type || "dashboard_send",
      related_type: data.related_type || "inbound",
      related_id: data.related_id || null,
    });

    if (!result.ok) return json({ error: result.error || "Send failed", status: result.status || 500 }, 500);
    return json({ ok: true, id: result.id });
  }

  if (path === "/api/email/outbound" && method === "GET") {
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 50)));
    const rows = await env.DB.prepare(
      `SELECT id, recipient_email, subject, email_type, status, provider_message_id, sent_at, created_at, error_message
       FROM email_logs WHERE tenant_id = ?
       ORDER BY COALESCE(sent_at, created_at) DESC LIMIT ?`
    ).bind(TENANT_ID, limit).all().catch(() => ({ results: [] }));
    return json({ messages: rows?.results || [] });
  }

  if (path === "/api/email/templates" && method === "GET") {
    const rows = await env.DB.prepare(
      "SELECT id, template_key, subject, body_text, body_html, status FROM email_templates WHERE tenant_id = ? AND status = 'active' ORDER BY template_key"
    ).bind(TENANT_ID).all().catch(() => ({ results: [] }));
    return json({ templates: rows?.results || [] });
  }

  if (path === "/api/email/campaigns" && method === "GET") {
    const rows = await env.DB.prepare(
      "SELECT * FROM email_campaigns WHERE tenant_id = ? ORDER BY updated_at DESC LIMIT 50"
    ).bind(TENANT_ID).all().catch(() => ({ results: [] }));
    return json({
      campaigns: (rows?.results || []).map((c) => ({
        ...c,
        audience: safeJson(c.audience_json, []),
        stats: safeJson(c.stats_json, {}),
      })),
    });
  }

  if (path === "/api/email/campaigns" && method === "POST") {
    const data = await body(request);
    const name = String(data.name || "").trim();
    const subject = String(data.subject || "").trim();
    if (!name || !subject) return json({ error: "name and subject are required" }, 400);

    const campId = id("camp");
    await env.DB.prepare(
      `INSERT INTO email_campaigns
       (id, tenant_id, name, subject, body_html, body_text, from_email, audience_type, audience_json, status, created_by, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, datetime('now'))`
    ).bind(
      campId,
      TENANT_ID,
      name,
      subject,
      data.body_html || null,
      data.body_text || null,
      data.from_email || defaultFrom(env, "support@companionsofcaddo.org"),
      data.audience_type || "manual",
      JSON.stringify(Array.isArray(data.audience) ? data.audience : []),
      session.email || session.user_id || null
    ).run();

    return json({ ok: true, id: campId });
  }

  const campMatch = path.match(/^\/api\/email\/campaigns\/([^/]+)\/send$/);
  if (campMatch && method === "POST") {
    const camp = await env.DB.prepare(
      "SELECT * FROM email_campaigns WHERE tenant_id = ? AND id = ? LIMIT 1"
    ).bind(TENANT_ID, campMatch[1]).first();
    if (!camp) return json({ error: "Campaign not found" }, 404);

    const audience = safeJson(camp.audience_json, []);
    if (!audience.length) return json({ error: "Campaign has no recipients" }, 400);

    await env.DB.prepare(
      "UPDATE email_campaigns SET status = 'sending', updated_at = datetime('now') WHERE id = ?"
    ).bind(camp.id).run();

    let sent = 0;
    let failed = 0;
    const errors = [];

    for (const recipient of audience) {
      const to = typeof recipient === "string" ? recipient : recipient?.email;
      if (!to) continue;
      const result = await sendResendEmail(env, {
        from: camp.from_email || defaultFrom(env, "support@companionsofcaddo.org"),
        to,
        subject: camp.subject,
        html: camp.body_html || `<p>${camp.body_text || ""}</p>`,
        text: camp.body_text,
        type: "campaign",
        related_type: "email_campaign",
        related_id: camp.id,
      });
      if (result.ok) sent += 1;
      else { failed += 1; errors.push({ to, error: result.error }); }
    }

    await env.DB.prepare(
      `UPDATE email_campaigns
       SET status = ?, sent_at = datetime('now'), stats_json = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(
      failed && !sent ? "failed" : "sent",
      JSON.stringify({ sent, failed, errors: errors.slice(0, 5) }),
      camp.id
    ).run();

    return json({ ok: true, sent, failed, errors: errors.slice(0, 5) });
  }

  const campIdMatch = path.match(/^\/api\/email\/campaigns\/([^/]+)$/);
  if (campIdMatch && method === "PATCH") {
    const data = await body(request);
    await env.DB.prepare(
      `UPDATE email_campaigns
       SET name = COALESCE(?, name),
           subject = COALESCE(?, subject),
           body_html = COALESCE(?, body_html),
           body_text = COALESCE(?, body_text),
           audience_json = COALESCE(?, audience_json),
           updated_at = datetime('now')
       WHERE tenant_id = ? AND id = ?`
    ).bind(
      data.name || null,
      data.subject || null,
      data.body_html || null,
      data.body_text || null,
      data.audience ? JSON.stringify(data.audience) : null,
      TENANT_ID,
      campIdMatch[1]
    ).run();
    return json({ ok: true });
  }

  return null;
}
