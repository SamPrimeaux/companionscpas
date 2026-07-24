/**
 * forms_api.js — CMS Forms Studio CRUD over cpas_application_* tables.
 * Public schema for modal runtime; admin save/publish for dashboard.
 */

const TENANT = "tenant_companionscpas";

const SYSTEM_FIELD_KEYS = new Set([
  "first_name",
  "last_name",
  "email",
  "phone",
  "agree_terms",
]);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function uid(prefix = "fld") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function safeJson(value, fallback) {
  if (value == null || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function parseOptions(raw) {
  const parsed = safeJson(raw, null);
  if (Array.isArray(parsed)) return parsed.map(String);
  if (typeof raw === "string" && raw.trim()) {
    return raw
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

async function getAuthUser(request, env) {
  try {
    const { getAuthUser: auth } = await import("./session_api.js");
    return await auth(request, env);
  } catch {
    return null;
  }
}

async function requireUser(request, env) {
  const user = await getAuthUser(request, env);
  if (!user) return null;
  return user;
}

function normalizeStatus(status) {
  const s = String(status || "").toLowerCase();
  if (s === "active" || s === "published" || s === "open") return "active";
  if (s === "paused" || s === "closed") return "paused";
  return "draft";
}

function statusLabel(status) {
  const s = normalizeStatus(status);
  if (s === "active") return "published";
  if (s === "paused") return "paused";
  return "draft";
}

async function loadFormBundle(env, formIdOrKey) {
  const form = await env.DB.prepare(
    `SELECT * FROM cpas_application_forms
     WHERE tenant_id = ? AND (id = ? OR form_key = ?)
     LIMIT 1`
  )
    .bind(TENANT, formIdOrKey, formIdOrKey)
    .first()
    .catch(() => null);

  if (!form) return null;

  const { results: steps } = await env.DB.prepare(
    `SELECT * FROM cpas_application_steps WHERE form_id = ? ORDER BY sort_order ASC`
  )
    .bind(form.id)
    .all()
    .catch(() => ({ results: [] }));

  const { results: fields } = await env.DB.prepare(
    `SELECT * FROM cpas_application_fields WHERE form_id = ? ORDER BY sort_order ASC`
  )
    .bind(form.id)
    .all()
    .catch(() => ({ results: [] }));

  return {
    form: {
      ...form,
      intro: safeJson(form.intro_json, {}),
      settings: safeJson(form.settings_json, {}),
      status_ui: statusLabel(form.status),
    },
    steps: steps || [],
    fields: (fields || []).map((f) => ({
      ...f,
      is_required: Number(f.is_required) === 1,
      options: parseOptions(f.options_json),
      validation: safeJson(f.validation_json, {}),
      is_system: SYSTEM_FIELD_KEYS.has(String(f.field_key || "")),
    })),
  };
}

/** Public read for section renderers (same bundle as Forms Studio). */
export async function loadFormBundleForRender(env, formIdOrKey) {
  return loadFormBundle(env, formIdOrKey);
}

async function ensureSubmissionsTable(env) {
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS cpas_form_submissions (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      form_id TEXT NOT NULL,
      form_key TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new',
      source TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  )
    .run()
    .catch(() => {});
}

async function countSubmissions(env, formKey) {
  if (formKey === "foster_application" || formKey === "form_foster_application") {
    const row = await env.DB.prepare(
      `SELECT COUNT(*) AS c FROM cpas_foster_applications WHERE tenant_id = ?`
    )
      .bind(TENANT)
      .first()
      .catch(() => ({ c: 0 }));
    return Number(row?.c || 0);
  }
  if (formKey === "contact" || formKey === "contact_request") {
    const row = await env.DB.prepare(
      `SELECT COUNT(*) AS c FROM contact_requests_v2`
    )
      .first()
      .catch(() => ({ c: 0 }));
    return Number(row?.c || 0);
  }
  await ensureSubmissionsTable(env);
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS c FROM cpas_form_submissions
     WHERE tenant_id = ? AND form_key = ?`
  )
    .bind(TENANT, formKey)
    .first()
    .catch(() => ({ c: 0 }));
  return Number(row?.c || 0);
}

/** Validate required fields from published schema; return error strings. */
function validateSubmission(fields, data) {
  const errors = [];
  for (const f of fields || []) {
    if (!f.is_required && Number(f.is_required) !== 1) continue;
    const key = f.field_key;
    if (!key) continue;
    const raw = data[key];
    const empty =
      raw == null ||
      (typeof raw === "string" && !raw.trim()) ||
      (Array.isArray(raw) && raw.length === 0);
    if (empty) errors.push(`${f.label || key} is required`);
  }
  return errors;
}

async function handleGenericFormSubmit(request, env, formKey) {
  const bundle = await loadFormBundle(env, formKey);
  if (!bundle) return json({ success: false, error: "Form not found" }, 404);
  if (normalizeStatus(bundle.form.status) !== "active") {
    return json({ success: false, error: "Form is not open" }, 403);
  }

  // Known specialty forms should use their dedicated receivers.
  const settings = bundle.form.settings || {};
  const dedicated = String(settings.submit_endpoint || "");
  if (
    dedicated.includes("/foster/apply") ||
    formKey === "foster_application" ||
    formKey === "form_foster_application"
  ) {
    return json(
      {
        success: false,
        error: "Use /api/foster/apply for foster applications",
        redirect: "/api/foster/apply",
      },
      400
    );
  }
  if (dedicated.includes("/contact/request") || formKey === "contact" || formKey === "contact_request") {
    return json(
      {
        success: false,
        error: "Use /api/contact/request for contact messages",
        redirect: "/api/contact/request",
      },
      400
    );
  }

  const data = await request.json().catch(() => ({}));
  const errors = validateSubmission(bundle.fields, data);
  if (errors.length) return json({ success: false, error: "Validation failed", errors }, 400);

  await ensureSubmissionsTable(env);
  const id = uid("sub");
  await env.DB.prepare(
    `INSERT INTO cpas_form_submissions
     (id, tenant_id, form_id, form_key, payload_json, status, source, created_at)
     VALUES (?, ?, ?, ?, ?, 'new', ?, datetime('now'))`
  )
    .bind(
      id,
      TENANT,
      bundle.form.id,
      bundle.form.form_key,
      JSON.stringify(data),
      String(data.source || settings.placement || "public:form")
    )
    .run();

  return json({
    success: true,
    id,
    message: settings.success_message || "Thanks — we received your submission.",
  });
}

/** Idempotent seed: Contact Us modal form so it is editable in Form Studio. */
async function ensureContactForm(env) {
  const existing = await env.DB.prepare(
    `SELECT id FROM cpas_application_forms
     WHERE tenant_id = ? AND (form_key = 'contact' OR form_key = 'contact_request')
     LIMIT 1`
  )
    .bind(TENANT)
    .first()
    .catch(() => null);
  if (existing?.id) return existing.id;

  const formId = "form_contact_request";
  const stepId = "step_contact_main";
  await env.DB.prepare(
    `INSERT OR IGNORE INTO cpas_application_forms
     (id, tenant_id, form_key, title, description, status, intro_json, settings_json, created_at, updated_at)
     VALUES (?, ?, 'contact', 'Contact Us', 'Get in touch with Companions of CPAS.', 'active', ?, ?, datetime('now'), datetime('now'))`
  )
    .bind(
      formId,
      TENANT,
      JSON.stringify({
        eyebrow: "Companions of CPAS",
        heading: "Get in Touch",
        subheading:
          "Questions about fostering, transport, or how to help? Send us a note — we typically reply within 1–2 business days.",
      }),
      JSON.stringify({
        submit_endpoint: "/api/contact/request",
        submit_label: "Send Message",
        success_message: "We'll get back to you as soon as we can.",
        success_title: "Message sent!",
        placement: "modal:contact",
        theme: {
          accent: "#7c3aed",
          accent_2: "#a78bfa",
          mode: "dark",
          show_header: true,
          org_name: "Companions of CPAS",
          radius: 12,
        },
      })
    )
    .run()
    .catch(() => {});

  await env.DB.prepare(
    `INSERT OR IGNORE INTO cpas_application_steps
     (id, form_id, step_key, title, description, sort_order)
     VALUES (?, ?, 'main', 'Your message', '', 10)`
  )
    .bind(stepId, formId)
    .run()
    .catch(() => {});

  const fields = [
    ["fld_c_first", "first_name", "First Name", "Jane", "text", 1, "[]", 10],
    ["fld_c_last", "last_name", "Last Name", "Smith", "text", 0, "[]", 20],
    ["fld_c_email", "email", "Email", "jane@email.com", "email", 1, "[]", 30],
    [
      "fld_c_subject",
      "subject",
      "Subject",
      "Select a topic...",
      "select",
      0,
      '["Fostering a dog","Adopting a dog","Volunteering","Donations / Fundraising","Press / Media inquiry","Something else"]',
      40,
    ],
    ["fld_c_message", "message", "Message", "How can we help?", "textarea", 1, "[]", 50],
  ];
  for (const [id, key, label, ph, type, req, opts, order] of fields) {
    await env.DB.prepare(
      `INSERT OR IGNORE INTO cpas_application_fields
       (id, form_id, step_id, field_key, label, placeholder, field_type, is_required, options_json, validation_json, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '{}', ?)`
    )
      .bind(id, formId, stepId, key, label, ph, type, req, opts, order)
      .run()
      .catch(() => {});
  }
  return formId;
}

export async function formsRoutes(request, env, url) {
  const path = url.pathname;
  const method = request.method;

  // POST /api/forms/:key/submit — generic receiver for Forms Studio forms
  const submitMatch = path.match(/^\/api\/forms\/([^/]+)\/submit$/);
  if (submitMatch && method === "POST") {
    return handleGenericFormSubmit(request, env, decodeURIComponent(submitMatch[1]));
  }

  // GET /api/public/forms/:key — published schema for public modal
  const publicMatch = path.match(/^\/api\/public\/forms\/([^/]+)$/);
  if (publicMatch && method === "GET") {
    const key = decodeURIComponent(publicMatch[1]);
    if (key === "contact" || key === "contact_request") {
      await ensureContactForm(env);
    }
    const bundle = await loadFormBundle(env, key);
    if (!bundle) return json({ success: false, error: "Form not found" }, 404);
    if (normalizeStatus(bundle.form.status) !== "active") {
      return json({ success: false, error: "Form is not open" }, 403);
    }
    return json({
      success: true,
      form: {
        id: bundle.form.id,
        form_key: bundle.form.form_key,
        title: bundle.form.title,
        description: bundle.form.description,
        intro: bundle.form.intro,
        settings: bundle.form.settings,
        status: bundle.form.status,
      },
      steps: bundle.steps.map((s) => ({
        id: s.id,
        step_key: s.step_key,
        title: s.title,
        description: s.description,
        sort_order: s.sort_order,
      })),
      fields: bundle.fields.map((f) => ({
        id: f.id,
        step_id: f.step_id,
        field_key: f.field_key,
        label: f.label,
        placeholder: f.placeholder,
        field_type: f.field_type,
        is_required: f.is_required,
        options: f.options,
        validation: f.validation,
        sort_order: f.sort_order,
      })),
    });
  }

  // Admin routes below
  if (!path.startsWith("/api/cms/forms")) return null;

  const user = await requireUser(request, env);
  if (!user) return json({ success: false, error: "Not authenticated" }, 401);

  // GET /api/cms/forms — list
  if (path === "/api/cms/forms" && method === "GET") {
    await ensureContactForm(env);
    const { results } = await env.DB.prepare(
      `SELECT id, form_key, title, description, status, intro_json, settings_json, updated_at, created_at
       FROM cpas_application_forms
       WHERE tenant_id = ?
       ORDER BY updated_at DESC`
    )
      .bind(TENANT)
      .all()
      .catch(() => ({ results: [] }));

    const forms = [];
    for (const row of results || []) {
      const fieldCount = await env.DB.prepare(
        `SELECT COUNT(*) AS c FROM cpas_application_fields WHERE form_id = ?`
      )
        .bind(row.id)
        .first()
        .catch(() => ({ c: 0 }));
      const submissions = await countSubmissions(env, row.form_key || row.id);
      const settings = safeJson(row.settings_json, {});
      forms.push({
        id: row.id,
        form_key: row.form_key,
        title: row.title,
        description: row.description,
        status: row.status,
        status_ui: statusLabel(row.status),
        field_count: Number(fieldCount?.c || 0),
        submissions,
        placement: settings.placement || settings.page_route || null,
        updated_at: row.updated_at,
        created_at: row.created_at,
      });
    }

    const published = forms.filter((f) => f.status_ui === "published").length;
    const awaiting = forms.reduce((n, f) => n + (f.submissions || 0), 0);

    return json({
      success: true,
      forms,
      stats: {
        total: forms.length,
        published,
        awaiting_review: awaiting,
      },
    });
  }

  // POST /api/cms/forms — create blank / from template
  if (path === "/api/cms/forms" && method === "POST") {
    const data = await request.json().catch(() => ({}));
    const title = String(data.title || "New form").trim() || "New form";
    const formKey =
      String(data.form_key || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, "_")
        .replace(/^_|_$/g, "") || `form_${Date.now().toString(36)}`;
    const formId = uid("form");
    const stepId = uid("step");

    await env.DB.prepare(
      `INSERT INTO cpas_application_forms
       (id, tenant_id, form_key, title, description, status, intro_json, settings_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, datetime('now'), datetime('now'))`
    )
      .bind(
        formId,
        TENANT,
        formKey,
        title,
        String(data.description || ""),
        JSON.stringify(
          data.intro || {
            heading: title,
            subheading: "Tell us a little about yourself.",
          }
        ),
        JSON.stringify(
          data.settings || {
            submit_endpoint: "/api/forms/" + formKey + "/submit",
            success_message: "Thanks — we received your submission.",
            submit_label: "Submit",
          }
        )
      )
      .run();

    await env.DB.prepare(
      `INSERT INTO cpas_application_steps
       (id, form_id, step_key, title, description, sort_order)
       VALUES (?, ?, 'main', 'Your information', '', 10)`
    )
      .bind(stepId, formId)
      .run();

    // Seed a few starter fields
    const starters = [
      { key: "full_name", label: "Full name", type: "text", req: 1, order: 10 },
      { key: "email", label: "Email", type: "email", req: 1, order: 20 },
      { key: "phone", label: "Phone", type: "tel", req: 0, order: 30 },
    ];
    for (const s of starters) {
      await env.DB.prepare(
        `INSERT INTO cpas_application_fields
         (id, form_id, step_id, field_key, label, placeholder, field_type, is_required, options_json, validation_json, sort_order)
         VALUES (?, ?, ?, ?, ?, '', ?, ?, '[]', '{}', ?)`
      )
        .bind(uid("fld"), formId, stepId, s.key, s.label, s.type, s.req, s.order)
        .run();
    }

    const bundle = await loadFormBundle(env, formId);
    return json({ success: true, form: bundle.form, steps: bundle.steps, fields: bundle.fields });
  }

  // GET /api/cms/forms/:id
  const getMatch = path.match(/^\/api\/cms\/forms\/([^/]+)$/);
  if (getMatch && method === "GET") {
    const bundle = await loadFormBundle(env, decodeURIComponent(getMatch[1]));
    if (!bundle) return json({ success: false, error: "Form not found" }, 404);
    const submissions = await countSubmissions(env, bundle.form.form_key);
    return json({ success: true, ...bundle, submissions });
  }

  // POST /api/cms/forms/:id/save
  const saveMatch = path.match(/^\/api\/cms\/forms\/([^/]+)\/save$/);
  if (saveMatch && method === "POST") {
    const formIdOrKey = decodeURIComponent(saveMatch[1]);
    const existing = await loadFormBundle(env, formIdOrKey);
    if (!existing) return json({ success: false, error: "Form not found" }, 404);
    const formId = existing.form.id;
    const data = await request.json().catch(() => ({}));

    const title = data.title != null ? String(data.title).trim() : existing.form.title;
    const description =
      data.description != null ? String(data.description) : existing.form.description || "";
    const status =
      data.status != null ? normalizeStatus(data.status) : normalizeStatus(existing.form.status);
    const intro =
      data.intro != null
        ? typeof data.intro === "string"
          ? data.intro
          : JSON.stringify(data.intro)
        : existing.form.intro_json || "{}";
    const settingsObj = {
      ...safeJson(existing.form.settings_json, {}),
      ...(data.settings && typeof data.settings === "object" ? data.settings : {}),
    };
    if (data.submit_label) settingsObj.submit_label = data.submit_label;
    if (data.success_message) settingsObj.success_message = data.success_message;
    if (data.placement) settingsObj.placement = data.placement;

    await env.DB.prepare(
      `UPDATE cpas_application_forms SET
         title = ?, description = ?, status = ?,
         intro_json = ?, settings_json = ?,
         updated_at = datetime('now')
       WHERE id = ? AND tenant_id = ?`
    )
      .bind(
        title,
        description,
        status === "active" ? "active" : status === "paused" ? "paused" : "draft",
        typeof intro === "string" ? intro : JSON.stringify(intro),
        JSON.stringify(settingsObj),
        formId,
        TENANT
      )
      .run();

    // Replace fields/steps — delete fields first (FK), then steps, then re-insert
    const replacingSteps = Array.isArray(data.steps);
    const replacingFields = Array.isArray(data.fields);

    if (replacingFields) {
      const existingKeys = new Set(existing.fields.map((f) => f.field_key));
      const incomingKeys = new Set(
        data.fields.map((f) => f.field_key).filter(Boolean)
      );

      for (const key of SYSTEM_FIELD_KEYS) {
        if (existingKeys.has(key) && !incomingKeys.has(key)) {
          return json(
            {
              success: false,
              error: `Cannot remove required system field "${key}". Deactivate or relabel it instead.`,
            },
            400
          );
        }
      }

      await env.DB.prepare(`DELETE FROM cpas_application_fields WHERE form_id = ?`)
        .bind(formId)
        .run();
    }

    if (replacingSteps) {
      await env.DB.prepare(`DELETE FROM cpas_application_steps WHERE form_id = ?`)
        .bind(formId)
        .run();
      let order = 10;
      for (const step of data.steps) {
        const sid = step.id || uid("step");
        await env.DB.prepare(
          `INSERT INTO cpas_application_steps
           (id, form_id, step_key, title, description, sort_order)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
          .bind(
            sid,
            formId,
            String(step.step_key || step.id || "step").slice(0, 64),
            String(step.title || "Step"),
            String(step.description || ""),
            Number(step.sort_order) || order
          )
          .run();
        order += 10;
      }
    }

    if (replacingFields) {
      let order = 10;
      const fallbackStep =
        (Array.isArray(data.steps) && data.steps[0]?.id) ||
        existing.steps[0]?.id ||
        null;
      for (const field of data.fields) {
        const fid = field.id && String(field.id).startsWith("fld_") ? field.id : uid("fld");
        const fieldKey =
          String(field.field_key || field.id || `field_${order}`)
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9_]+/g, "_")
            .slice(0, 64) || `field_${order}`;
        const options = Array.isArray(field.options)
          ? field.options
          : parseOptions(field.options_json || field.options || "[]");
        await env.DB.prepare(
          `INSERT INTO cpas_application_fields
           (id, form_id, step_id, field_key, label, placeholder, field_type, is_required, options_json, validation_json, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            fid,
            formId,
            field.step_id || fallbackStep,
            fieldKey,
            String(field.label || "Untitled"),
            String(field.placeholder || ""),
            String(field.field_type || field.type || "text"),
            field.is_required || field.required ? 1 : 0,
            JSON.stringify(options),
            JSON.stringify(field.validation || field.validation_json || {}),
            Number(field.sort_order) || order
          )
          .run();
        order += 10;
      }
    }

    if (env.CMS_CACHE) {
      await env.CMS_CACHE.delete(`form:${TENANT}:${existing.form.form_key}`).catch(() => {});
      await env.CMS_CACHE.delete(`form:${TENANT}:${formId}`).catch(() => {});
    }

    const bundle = await loadFormBundle(env, formId);
    return json({ success: true, message: "Form saved", ...bundle });
  }

  // POST /api/cms/forms/:id/publish
  const pubMatch = path.match(/^\/api\/cms\/forms\/([^/]+)\/publish$/);
  if (pubMatch && method === "POST") {
    const formIdOrKey = decodeURIComponent(pubMatch[1]);
    const existing = await loadFormBundle(env, formIdOrKey);
    if (!existing) return json({ success: false, error: "Form not found" }, 404);
    const data = await request.json().catch(() => ({}));
    const next = data.status === "draft" || data.status === "paused" ? normalizeStatus(data.status) : "active";
    const dbStatus = next === "active" ? "active" : next === "paused" ? "paused" : "draft";

    await env.DB.prepare(
      `UPDATE cpas_application_forms SET status = ?, updated_at = datetime('now')
       WHERE id = ? AND tenant_id = ?`
    )
      .bind(dbStatus, existing.form.id, TENANT)
      .run();

    if (env.CMS_CACHE) {
      await env.CMS_CACHE.delete(`form:${TENANT}:${existing.form.form_key}`).catch(() => {});
    }

    return json({
      success: true,
      status: dbStatus,
      status_ui: statusLabel(dbStatus),
      message: dbStatus === "active" ? "Form published" : "Form updated",
    });
  }

  return json({ success: false, error: "Forms route not found", path }, 404);
}
