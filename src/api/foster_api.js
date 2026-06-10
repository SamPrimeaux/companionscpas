/**
 * foster_api.js — POST /api/foster/apply
 * Reads validation rules from D1 cpas_application_fields.
 * Inserts to cpas_foster_applications.
 * Fires Resend confirmation to applicant + admin notify.
 * Runtime contract: see db/runtime_contracts.md
 */

const TENANT       = "tenant_companionscpas";
const FORM_ID      = "form_foster_application";
const ADMIN_EMAIL  = "companionsCPAS@gmail.com"; // fallback if env missing

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function uid(prefix = "cfa") {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

// ── Validation ──────────────────────────────────────────────────────────────

function validateEmail(v) {
  return typeof v === "string" && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.trim());
}

function validateField(field, value) {
  const v = (value ?? "").toString().trim();
  if (field.is_required && !v) return `${field.label} is required`;
  if (!v) return null; // optional empty field is fine

  let rules = {};
  try { rules = JSON.parse(field.validation_json || "{}"); } catch {}

  if (rules.min_length && v.length < rules.min_length)
    return `${field.label} must be at least ${rules.min_length} characters`;
  if (rules.max_length && v.length > rules.max_length)
    return `${field.label} must be under ${rules.max_length} characters`;
  if (rules.format === "email" && !validateEmail(v))
    return `${field.label} must be a valid email address`;
  if (rules.min !== undefined && Number(v) < rules.min)
    return `${field.label} must be at least ${rules.min}`;
  if (rules.max !== undefined && Number(v) > rules.max)
    return `${field.label} must be at most ${rules.max}`;

  return null;
}

// ── Resend ───────────────────────────────────────────────────────────────────

async function sendResend(env, { to, templateKey, vars }) {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[foster_api] RESEND_API_KEY not set — skipping email");
    return null;
  }

  // Load template from D1
  const tpl = await env.DB.prepare(
    "SELECT subject, body_html, body_text FROM email_templates WHERE template_key = ? AND status = 'active' LIMIT 1"
  ).bind(templateKey).first().catch(() => null);

  if (!tpl) {
    console.warn(`[foster_api] Email template not found: ${templateKey}`);
    return null;
  }

  // Replace {{variable}} placeholders
  let subject  = tpl.subject  || "";
  let bodyHtml = tpl.body_html || "";
  let bodyText = tpl.body_text || "";

  for (const [k, v] of Object.entries(vars)) {
    const token = `{{${k}}}`;
    subject  = subject.replaceAll(token, v);
    bodyHtml = bodyHtml.replaceAll(token, v);
    bodyText = bodyText.replaceAll(token, v);
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: env.RESEND_FROM_EMAIL || "Companions of CPAS <no-reply@companionsofcaddo.org>",
        to: [to],
        subject,
        html: bodyHtml,
        text: bodyText
      })
    });
    const data = await res.json().catch(() => ({}));
    return data?.id || null;
  } catch (err) {
    console.error("[foster_api] Resend error:", err.message);
    return null;
  }
}

// ── POST /api/foster/apply ───────────────────────────────────────────────────

export async function handleFosterApply(request, env) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  // 1. Verify form is active
  const form = await env.DB.prepare(
    "SELECT id, status, settings_json FROM cpas_application_forms WHERE form_id = ? AND tenant_id = ? LIMIT 1"
  ).bind(FORM_ID, TENANT).first().catch(() => null);

  // Fallback: try by id column if form_id lookup fails
  const formRow = form || await env.DB.prepare(
    "SELECT id, status, settings_json FROM cpas_application_forms WHERE id = ? LIMIT 1"
  ).bind(FORM_ID).first().catch(() => null);

  if (!formRow || formRow.status !== "active") {
    return json({ error: "Applications are not currently open" }, 503);
  }

  // 2. Load required fields from D1 for server-side validation
  const { results: fields } = await env.DB.prepare(
    "SELECT field_key, label, field_type, is_required, validation_json FROM cpas_application_fields WHERE form_id = ? ORDER BY sort_order ASC"
  ).bind(FORM_ID).all().catch(() => ({ results: [] }));

  // 3. Validate
  const errors = [];
  for (const field of fields) {
    const err = validateField(field, body[field.field_key]);
    if (err) errors.push(err);
  }
  if (errors.length) {
    return json({ error: "Validation failed", errors }, 400);
  }

  // 4. Deduplicate: block same email within 24h
  const existing = await env.DB.prepare(`
    SELECT id FROM cpas_foster_applications
    WHERE email = ? AND tenant_id = ?
      AND datetime(created_at, '+24 hours') > datetime('now')
    LIMIT 1
  `).bind((body.email || "").toLowerCase().trim(), TENANT).first().catch(() => null);

  if (existing) {
    return json({
      success: true,
      application_id: existing.id,
      duplicate: true,
      message: "An application with this email was already submitted recently."
    });
  }

  // 5. Insert application
  const appId = uid("cfa");
  const answersJson = JSON.stringify(body);
  const ipHash = await hashIp(request.headers.get("CF-Connecting-IP") || "");

  await env.DB.prepare(`
    INSERT INTO cpas_foster_applications (
      id, form_id, tenant_id, status, review_status, source,
      first_name, last_name, email, phone,
      city, state_province, postal_code,
      answers_json, ip_hash, user_agent,
      submitted_at, created_at, updated_at
    ) VALUES (?, ?, ?, 'submitted', 'new', 'website_modal',
      ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?,
      datetime('now'), datetime('now'), datetime('now'))
  `).bind(
    appId, FORM_ID, TENANT,
    (body.first_name || "").trim(),
    (body.last_name  || "").trim(),
    (body.email      || "").toLowerCase().trim(),
    (body.phone      || "").trim(),
    (body.city       || "").trim(),
    (body.state      || "").trim(),
    (body.postal_code|| "").trim(),
    answersJson,
    ipHash,
    request.headers.get("User-Agent") || ""
  ).run().catch(err => {
    console.error("[foster_api] D1 insert error:", err.message);
    throw err;
  });

  // 6. Fire emails (non-fatal — don't fail the request if Resend is down)
  const firstName = (body.first_name || "Applicant").trim();
  const adminEmail = env.ADMIN_EMAIL || ADMIN_EMAIL;

  const [applicantMsgId] = await Promise.allSettled([
    sendResend(env, {
      to: body.email,
      templateKey: "foster_application_received",
      vars: { first_name: firstName, application_id: appId }
    }),
    sendResend(env, {
      to: adminEmail,
      templateKey: "contact_request_notify",
      vars: {
        name: `${firstName} ${body.last_name || ""}`.trim(),
        email: body.email,
        subject: "New Foster Application",
        message: `Application ID: ${appId}\nCity: ${body.city || ""}\nDog sizes: ${body.dog_sizes || ""}\nWhy foster: ${body.why_foster || ""}`
      }
    })
  ]);

  // Update resend_message_id if we got one
  const msgId = applicantMsgId?.value;
  if (msgId) {
    await env.DB.prepare(
      "UPDATE cpas_foster_applications SET resend_message_id = ? WHERE id = ?"
    ).bind(msgId, appId).run().catch(() => {});
  }

  return json({
    success: true,
    application_id: appId,
    message: "Application received! We will be in touch within 2-3 business days."
  });
}

// ── GET /api/foster/applications (admin) ─────────────────────────────────────

export async function handleFosterList(request, env) {
  const { getAuthUser } = await import("./session_api.js");
  const user = await getAuthUser(request, env);
  if (!user) return json({ error: "Unauthorized" }, 401);

  const url    = new URL(request.url);
  const status = url.searchParams.get("status") || null;
  const page   = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const limit  = 25;
  const offset = (page - 1) * limit;

  const where  = status ? "WHERE tenant_id = ? AND review_status = ?" : "WHERE tenant_id = ?";
  const params = status ? [TENANT, status] : [TENANT];

  const { results } = await env.DB.prepare(`
    SELECT id, first_name, last_name, email, phone, city, state_province,
           review_status, status, assigned_to, submitted_at, created_at
    FROM cpas_foster_applications
    ${where}
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `).bind(...params).all();

  const countRow = await env.DB.prepare(
    `SELECT COUNT(*) as total FROM cpas_foster_applications ${where}`
  ).bind(...params).first();

  return json({
    applications: results,
    total: countRow?.total || 0,
    page, limit
  });
}

// ── PATCH /api/foster/applications/:id (admin) ───────────────────────────────

export async function handleFosterUpdate(request, env, appId) {
  const { getAuthUser } = await import("./session_api.js");
  const user = await getAuthUser(request, env);
  if (!user) return json({ error: "Unauthorized" }, 401);

  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const allowed = ["review_status", "assigned_to", "internal_notes"];
  const sets    = [];
  const vals    = [];

  for (const k of allowed) {
    if (body[k] !== undefined) {
      sets.push(`${k} = ?`);
      vals.push(body[k]);
    }
  }

  if (!sets.length) return json({ error: "Nothing to update" }, 400);

  sets.push("updated_at = datetime('now')");
  vals.push(appId);

  await env.DB.prepare(
    `UPDATE cpas_foster_applications SET ${sets.join(", ")} WHERE id = ?`
  ).bind(...vals).run();

  // Trigger home visit email if status set to home_visit
  if (body.review_status === "home_visit") {
    const app = await env.DB.prepare(
      "SELECT first_name, email FROM cpas_foster_applications WHERE id = ? LIMIT 1"
    ).bind(appId).first().catch(() => null);

    if (app) {
      await sendResend(env, {
        to: app.email,
        templateKey: "home_visit_followup",
        vars: {
          first_name:       app.first_name || "Applicant",
          coordinator_name: user.full_name || "The Companions of CPAS Team",
          scheduled_date:   body.scheduled_date || "To be confirmed"
        }
      }).catch(() => {});
    }
  }

  return json({ success: true });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function hashIp(ip) {
  if (!ip) return "";
  try {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
  } catch { return ""; }
}
