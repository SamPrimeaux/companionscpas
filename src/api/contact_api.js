import { notifyContactRequest } from "./notifications.js";
import { sendResend, sendTemplateEmail } from "./payments_email.js";

const SUBJECT_LABELS = {
  fostering: "Fostering a dog",
  adopting: "Adopting a dog",
  volunteering: "Volunteering",
  donating: "Donations / Fundraising",
  media: "Press / Media inquiry",
  other: "Something else",
  general: "General inquiry",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function escHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function subjectLabel(requestType) {
  return SUBJECT_LABELS[requestType] || requestType || "General inquiry";
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

async function handleContactSubmit(request, env, data) {
  const name = String(data.name || "").trim();
  const email = String(data.email || "").trim().toLowerCase();
  const message = String(data.message || "").trim();
  const requestType = String(data.request_type || data.subject || "general").trim();
  const phone = String(data.phone || "").trim();
  const sourcePath = String(data.source || data.source_path || request.headers.get("referer") || "").trim();
  const subjectReadable = subjectLabel(requestType);

  if (!name || !email || !message) {
    return json({ error: "Name, email, and message are required." }, 400);
  }
  if (!isValidEmail(email)) {
    return json({ error: "Valid email required." }, 400);
  }

  const contactId = crypto.randomUUID();
  await env.DB.prepare(`
    INSERT INTO contact_requests_v2
    (id, name, email, phone, request_type, message, source_path, user_agent)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    contactId,
    name,
    email,
    phone,
    requestType,
    message,
    sourcePath,
    request.headers.get("user-agent") || "",
  ).run();

  const confirmResult = await sendResend(env, {
    to: email,
    name,
    subject: "We received your message — Companions of CPAS",
    type: "contact_confirmation",
    related_type: "contact_request",
    related_id: contactId,
    html: `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;padding:24px">
      <h2>Thank you, ${escHtml(name)}</h2>
      <p>Companions of CPAS received your message about <strong>${escHtml(subjectReadable)}</strong>.</p>
      <p>A volunteer will follow up within 1–2 business days. In the meantime, follow us on social media for daily dog updates!</p>
      <p style="margin-top:24px;color:#666;font-size:13px">Companions of CPAS · 501(c)(3) · EIN 88-4156327</p>
    </div>`,
  });

  const admin = env.ADMIN_EMAIL || "companionsCPAS@gmail.com";
  const adminResult = await sendTemplateEmail(env, {
    templateKey: "contact_request_notify",
    to: admin,
    vars: {
      name: escHtml(name),
      email: escHtml(email),
      subject: escHtml(subjectReadable),
      message: escHtml(message).replace(/\n/g, "<br>"),
    },
    type: "contact_request_notify",
    related_type: "contact_request",
    related_id: contactId,
  });

  let adminNotify = adminResult;
  if (!adminResult?.ok) {
    adminNotify = await sendResend(env, {
      to: admin,
      subject: `New contact: ${subjectReadable} — ${name}`,
      type: "admin_contact_alert",
      related_type: "contact_request",
      related_id: contactId,
      html: `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;padding:24px">
        <h2>New contact request</h2>
        <p><strong>Name:</strong> ${escHtml(name)}</p>
        <p><strong>Email:</strong> <a href="mailto:${escHtml(email)}">${escHtml(email)}</a></p>
        <p><strong>Topic:</strong> ${escHtml(subjectReadable)}</p>
        ${phone ? `<p><strong>Phone:</strong> ${escHtml(phone)}</p>` : ""}
        <p><strong>Source:</strong> ${escHtml(sourcePath || "website")}</p>
        <p><strong>Message:</strong></p>
        <p>${escHtml(message).replace(/\n/g, "<br>")}</p>
      </div>`,
    });
  }

  await notifyContactRequest(env, {
    contactId,
    name,
    email,
    requestType: subjectReadable,
    message,
  });

  const emailOk = confirmResult?.ok && adminNotify?.ok;
  if (!emailOk) {
    console.warn("[contact] email delivery issue", {
      contactId,
      confirmation: confirmResult?.error || confirmResult?.status,
      admin: adminNotify?.error || adminNotify?.status,
    });
  }

  return json({
    success: true,
    id: contactId,
    message: "Request saved. Companions of CPAS will follow up by email.",
    email_status: {
      confirmation: confirmResult?.ok ? "sent" : (confirmResult?.error || "failed"),
      admin: adminNotify?.ok ? "sent" : (adminNotify?.error || "failed"),
    },
  }, emailOk ? 200 : 202);
}

export async function contactApiRoutes(request, env, url) {
  if (
    (url.pathname === "/api/contact/request" || url.pathname === "/api/contact")
    && request.method === "POST"
  ) {
    const data = await request.json().catch(() => ({}));
    return handleContactSubmit(request, env, data);
  }

  if (url.pathname === "/api/admin/contact/requests" && request.method === "GET") {
    const rows = await env.DB.prepare(`
      SELECT * FROM contact_requests_v2
      ORDER BY created_at DESC
      LIMIT 100
    `).all();

    return json({ requests: rows.results || [] });
  }

  return null;
}
