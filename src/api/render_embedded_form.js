/**
 * embedded_form — D1 Forms Studio schema → public HTML + submit to /api/forms/:key/submit.
 * Editable in /dashboard/cms/forms/:id; no HTML paste required.
 */
import { loadFormBundleForRender } from "./forms_api.js";

function esc(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseConfig(section) {
  const raw = section?.config_json;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return { ...raw };
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

function pick(section, keys) {
  for (const k of keys) {
    const v = section?.[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return "";
}

function fieldControl(f) {
  const id = `ef_${esc(f.field_key)}`;
  const name = esc(f.field_key);
  const ph = esc(f.placeholder || "");
  const req = f.is_required || Number(f.is_required) === 1 ? " required" : "";
  const type = String(f.field_type || "text").toLowerCase();
  const opts = Array.isArray(f.options) ? f.options : [];

  if (type === "textarea") {
    return `<textarea id="${id}" name="${name}" placeholder="${ph}"${req} rows="4"></textarea>`;
  }
  if (type === "select") {
    const options = [
      `<option value="" disabled selected>${ph || "Choose…"}</option>`,
      ...opts.map((o) => {
        const val = typeof o === "object" ? o.value || o.label : o;
        const label = typeof o === "object" ? o.label || o.value : o;
        return `<option value="${esc(val)}">${esc(label)}</option>`;
      }),
    ].join("");
    return `<select id="${id}" name="${name}"${req}>${options}</select>`;
  }
  const inputType =
    type === "email" ? "email" : type === "tel" || type === "phone" ? "tel" : type === "number" ? "number" : "text";
  return `<input type="${inputType}" id="${id}" name="${name}" placeholder="${ph}"${req}>`;
}

/** Self-contained submit handler — one script per embedded form instance. */
function embedSubmitScript(formDomId, formKey, submitLabel) {
  const safeKey = String(formKey || "").replace(/[^a-zA-Z0-9_-]/g, "");
  const safeId = String(formDomId || "").replace(/[^a-zA-Z0-9_-]/g, "");
  const label = String(submitLabel || "Submit").replace(/'/g, "\\'");
  return `<script>
(function() {
  var form = document.getElementById('${safeId}');
  if (!form || form.getAttribute('data-ef-bound') === '1') return;
  form.setAttribute('data-ef-bound', '1');
  var btn = form.querySelector('[type=submit]');
  var success = document.getElementById('${safeId}_success');
  var errBox = document.getElementById('${safeId}_error');
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    if (errBox) { errBox.style.display = 'none'; errBox.textContent = ''; }
    if (btn) { btn.disabled = true; btn.textContent = 'Sending\\u2026'; }
    var data = { source: 'embedded_form:${safeKey}' };
    var fields = form.querySelectorAll('[name]');
    for (var i = 0; i < fields.length; i++) {
      var el = fields[i];
      if (!el.name) continue;
      if (el.type === 'checkbox') data[el.name] = el.checked;
      else data[el.name] = el.value;
    }
    fetch('/api/forms/${safeKey}/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(data)
    })
    .then(function(r) { return r.json().then(function(body) { return { ok: r.ok, body: body }; }); })
    .then(function(res) {
      if (!res.ok || !res.body || res.body.success === false) {
        var msg = (res.body && (res.body.error || (res.body.errors && res.body.errors.join(', ')))) || 'Submission failed';
        throw new Error(msg);
      }
      form.style.display = 'none';
      if (success) success.style.display = 'block';
    })
    .catch(function(err) {
      if (btn) { btn.disabled = false; btn.textContent = '${label}'; }
      if (errBox) {
        errBox.textContent = err && err.message ? err.message : 'Something went wrong. Please try again.';
        errBox.style.display = 'block';
      } else {
        alert(err && err.message ? err.message : 'Something went wrong.');
      }
    });
  });
})();
</script>`;
}

/**
 * @param {object} section
 * @param {object[]} [_blocks]
 * @param {object} [_brand]
 * @param {object|null} env
 * @param {{ preview?: boolean }} [opts]
 */
export async function renderEmbeddedForm(section, _blocks = [], _brand = {}, env = null, opts = {}) {
  const preview = opts.preview === true;
  const cfg = parseConfig(section);
  const sectionKey = pick(section, ["section_key"]) || "embedded_form";
  const formKey = String(cfg.form_key || cfg.form_id || "").trim();
  const heading =
    pick(section, ["heading"]) ||
    pick(cfg, ["heading"]) ||
    "";
  const sub =
    pick(section, ["subheading"]) ||
    pick(section, ["body"]) ||
    pick(cfg, ["subheading"]) ||
    "";

  if (!formKey) {
    if (preview) {
      return `<section class="cms-embedded-form cms-embedded-form--empty" data-section-key="${esc(sectionKey)}" data-section-type="embedded_form" style="margin:1rem;padding:1.25rem;border:2px dashed #64748b;border-radius:12px;font-family:system-ui,sans-serif">
  <strong>Form embed</strong>
  <div style="margin-top:0.35rem;font-size:0.9rem">Pick a form key in the inspector (Forms Studio → form key).</div>
</section>`;
    }
    return `<!-- cms: embedded_form missing form_key -->`;
  }

  if (!env?.DB) {
    return preview
      ? `<section class="cms-embedded-form" data-section-key="${esc(sectionKey)}"><p>Form unavailable (no DB).</p></section>`
      : `<!-- cms: embedded_form no db -->`;
  }

  const bundle = await loadFormBundleForRender(env, formKey);
  if (!bundle) {
    if (preview) {
      return `<section class="cms-embedded-form" data-section-key="${esc(sectionKey)}" style="margin:1rem;padding:1.25rem;border:2px solid #dc2626;border-radius:12px;background:#fef2f2;color:#991b1b;font-family:system-ui,sans-serif">
  <strong>Form not found:</strong> <code>${esc(formKey)}</code>
</section>`;
    }
    return `<!-- cms: embedded_form not found ${esc(formKey)} -->`;
  }

  const status = String(bundle.form.status || "").toLowerCase();
  if (status !== "active" && status !== "published" && status !== "open") {
    if (preview) {
      return `<section class="cms-embedded-form" data-section-key="${esc(sectionKey)}" style="margin:1rem;padding:1.25rem;border:2px dashed #b45309;border-radius:12px;background:#fffbeb;font-family:system-ui,sans-serif">
  <strong>${esc(bundle.form.title || formKey)}</strong> is not published (status: ${esc(status || "draft")}). Publish it in Forms Studio.
</section>`;
    }
    return `<!-- cms: embedded_form not active ${esc(formKey)} -->`;
  }

  const title = heading || bundle.form.title || "Form";
  const successMsg =
    (bundle.form.settings && bundle.form.settings.success_message) ||
    "Thanks — we received your submission. A volunteer will follow up soon.";
  const submitLabel =
    (bundle.form.settings && bundle.form.settings.submit_label) ||
    pick(section, ["cta_label"]) ||
    "Submit";

  const fields = [...(bundle.fields || [])].sort(
    (a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0)
  );

  const fullWidthTypes = new Set(["textarea"]);
  const fieldHtml = fields
    .map((f) => {
      const full = fullWidthTypes.has(String(f.field_type || "").toLowerCase()) || f.field_key === "availability" || f.field_key === "message";
      const reqMark = f.is_required || Number(f.is_required) === 1 ? ' <span aria-hidden="true">*</span>' : "";
      return `<div class="cms-ef-field${full ? " cms-ef-full" : ""}">
        <label for="ef_${esc(f.field_key)}">${esc(f.label || f.field_key)}${reqMark}</label>
        ${fieldControl(f)}
      </div>`;
    })
    .join("\n");

  const domId = `cms_ef_${sectionKey.replace(/[^a-zA-Z0-9_-]/g, "_")}`;

  return `<style>
.cms-embedded-form{isolation:isolate;padding:clamp(28px,5vw,56px) max(var(--page-gutter,1.25rem),calc((100% - var(--page-max,1100px))/2));background:var(--bg,#faf8f4);color:var(--text-1,#1c1420)}
.cms-embedded-form .cms-ef-card{max-width:640px;margin:0 auto;background:#fff;border:1px solid var(--border,rgba(28,20,32,.1));border-radius:16px;box-shadow:0 12px 40px rgba(28,20,32,.08);padding:clamp(20px,3vw,32px)}
.cms-embedded-form .cms-ef-title{font-family:var(--font-display,Georgia,serif);font-size:clamp(1.6rem,3vw,2.1rem);margin:0 0 .5rem;line-height:1.2}
.cms-embedded-form .cms-ef-sub{margin:0 0 1.25rem;color:var(--text-2,#5c5460);line-height:1.55;font-size:.95rem}
.cms-embedded-form .cms-ef-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px 16px}
.cms-embedded-form .cms-ef-full{grid-column:1 / -1}
.cms-embedded-form .cms-ef-field label{display:block;font-size:.72rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;margin:0 0 6px;color:var(--text-2,#5c5460)}
.cms-embedded-form .cms-ef-field input,.cms-embedded-form .cms-ef-field select,.cms-embedded-form .cms-ef-field textarea{width:100%;box-sizing:border-box;border:1px solid var(--border,rgba(28,20,32,.16));border-radius:10px;padding:10px 12px;font:inherit;background:#fff;color:inherit}
.cms-embedded-form .cms-ef-field textarea{min-height:96px;resize:vertical}
.cms-embedded-form .cms-ef-submit{margin-top:18px;appearance:none;border:0;border-radius:999px;padding:12px 22px;font-weight:700;cursor:pointer;background:var(--purple,#6b21e8);color:#fff}
.cms-embedded-form .cms-ef-submit:disabled{opacity:.65;cursor:wait}
.cms-embedded-form .cms-ef-error{display:none;margin-top:12px;padding:10px 12px;border-radius:10px;background:#fef2f2;color:#991b1b;font-size:.9rem}
.cms-embedded-form .cms-ef-success{display:none;padding:1.25rem 0;text-align:center}
.cms-embedded-form .cms-ef-success strong{display:block;font-size:1.15rem;margin-bottom:.35rem}
@media(max-width:640px){.cms-embedded-form .cms-ef-grid{grid-template-columns:1fr}}
</style>
<section class="cms-embedded-form" data-section-key="${esc(sectionKey)}" data-section-type="embedded_form" data-form-key="${esc(formKey)}">
  <div class="cms-ef-card">
    <h2 class="cms-ef-title" data-cms-field="heading">${esc(title)}</h2>
    ${sub ? `<p class="cms-ef-sub" data-cms-field="subheading">${esc(sub)}</p>` : ""}
    <form id="${esc(domId)}" class="cms-ef-form" novalidate>
      <div class="cms-ef-grid">
        ${fieldHtml}
      </div>
      <button type="submit" class="cms-ef-submit">${esc(submitLabel)}</button>
      <div class="cms-ef-error" id="${esc(domId)}_error" role="alert"></div>
    </form>
    <div class="cms-ef-success" id="${esc(domId)}_success">
      <strong>Got it.</strong>
      <div>${esc(successMsg)}</div>
    </div>
  </div>
</section>
${embedSubmitScript(domId, formKey, submitLabel)}`;
}
