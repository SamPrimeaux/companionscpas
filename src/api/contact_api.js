import { notifyContactRequest } from "./notifications.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

async function sendContactEmail(env, { to, subject, html }) {
  const key = env.RESEND_API_KEY || env.RESEND_API_TOKEN;
  if (!key || !to) return;
  const from = env.RESEND_FROM_EMAIL || "Companions of CPAS <no-reply@companionsofcaddo.org>";
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html }),
  }).catch(() => {});
}

export async function contactApiRoutes(request, env, url) {
  if (url.pathname === "/api/contact/request" && request.method === "POST") {
    const data = await request.json().catch(() => ({}));
    const name = String(data.name || "").trim();
    const email = String(data.email || "").trim().toLowerCase();
    const message = String(data.message || "").trim();
    const requestType = String(data.request_type || "general").trim();

    if (!name || !email || !message) {
      return json({ error: "Name, email, and message are required." }, 400);
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
      String(data.phone || "").trim(),
      requestType,
      message,
      request.headers.get("referer") || "",
      request.headers.get("user-agent") || ""
    ).run();

    await sendContactEmail(env, {
      to: email,
      subject: "We received your message — Companions of CPAS",
      html: `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;padding:24px">
        <h2>Thank you, ${name}</h2>
        <p>Companions of CPAS received your message. A volunteer will follow up soon.</p>
      </div>`,
    });

    const admin = env.ADMIN_EMAIL || "companionsCPAS@gmail.com";
    await sendContactEmail(env, {
      to: admin,
      subject: `New contact: ${requestType} — ${name}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;padding:24px">
        <h2>New contact request</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Topic:</strong> ${requestType}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, "<br>")}</p>
      </div>`,
    });

    await notifyContactRequest(env, {
      contactId,
      name,
      email,
      requestType,
      message,
    });

    return json({
      success: true,
      id: contactId,
      message: "Request saved. Companions of CPAS will follow up by email.",
    });
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
