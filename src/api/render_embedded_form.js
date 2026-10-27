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
  // Real controls for choice field types — the old renderer reduced these to text inputs.
  if (type === "radio" || type === "multiselect") {
    const choices = opts.map((o, i) => {
      const val = typeof o === "object" ? o.value || o.label : o;
      const label = typeof o === "object" ? o.label || o.value : o;
      const choiceId = `${id}_${i}`;
      const multiAttr = type === "multiselect" ? ' data-multiselect="1"' : "";
      return `<label class="cms-ef-choice" for="${choiceId}"><input type="${type === "radio" ? "radio" : "checkbox"}" id="${choiceId}" name="${name}" value="${esc(val)}"${multiAttr}><span>${esc(label)}</span></label>`;
    }).join("");
    return `<div class="cms-ef-choices" role="group" aria-label="${esc(f.label || f.field_key)}">${choices}</div>`;
  }
  if (type === "checkbox") return `<input type="checkbox" id="${id}" name="${name}" value="true"${req}>`;
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
      if (el.type === 'checkbox' && el.hasAttribute('data-multiselect')) {
        if (!Array.isArray(data[el.name])) data[el.name] = [];
        if (el.checked) data[el.name].push(el.value);
      } else if (el.type === 'checkbox') data[el.name] = el.checked;
      else if (el.type === 'radio') { if (el.checked) data[el.name] = el.value; }
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

  const intro = bundle.form.intro || {};
  const theme = bundle.form.settings?.theme || {};
  const title = heading || intro.heading || bundle.form.title || "Form";
  const subtitle = sub || intro.subheading || bundle.form.description || "";
  const validHex = (v, fallback) => /^#[0-9a-fA-F]{6}$/.test(String(v || "")) ? String(v) : fallback;
  const accent = validHex(theme.accent, "#7c3aed");
  const isLight = theme.mode === "light";
  const radius = Math.max(4, Math.min(24, Number(theme.radius) || 12));
  const width = Math.max(480, Math.min(900, Number(theme.max_width) || 680));
  const gap = theme.spacing === "compact" ? 10 : theme.spacing === "airy" ? 22 : 15;
  const fullButton = theme.button_style === "full";
  const treatment = ["filled", "underline"].includes(theme.field_style) ? theme.field_style : "outline";
  const font = theme.font_style === "serif" ? "Georgia,serif" : "Inter,system-ui,sans-serif";
  const formStyle = [
    `--ef-accent:${accent}`, `--ef-radius:${radius}px`, `--ef-width:${width}px`,
    `--ef-gap:${gap}px`, `--ef-font:${font}`,
    `--ef-bg:${isLight ? "#fff" : "#151827"}`,
    `--ef-text:${isLight ? "#171a21" : "#f7f7fc"}`,
    `--ef-muted:${isLight ? "#646b7b" : "#a5a8b9"}`,
    `--ef-input:${treatment === "filled" ? (isLight ? "#f3f4f6" : "#292c39") : (isLight ? "#fff" : "#101321")}`,
    `--ef-border:${isLight ? "#d9dce5" : "#343a4c"}`,
  ].join(";");
  const formClass = `cms-embedded-form cms-ef--${treatment}${fullButton ? " cms-ef--full-button" : ""}`;
  const rawLogo = String(theme.logo_url || "");
  const logo = /^https:\/\/[^\s"'<>]+$/i.test(rawLogo) || /^\/(?!\/)[^\s"'<>]+$/.test(rawLogo) ? rawLogo : "";
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
.cms-embedded-form .cms-ef-card{max-width:var(--ef-width,680px);margin:0 auto;background:var(--ef-bg,#fff);color:var(--ef-text,#171a21);font-family:var(--ef-font,Inter,system-ui,sans-serif);border:1px solid var(--ef-border,#e5e7eb);border-radius:calc(var(--ef-radius,12px) + 4px);box-shadow:0 12px 40px rgba(28,20,32,.08);overflow:hidden;padding:clamp(20px,3vw,32px)}
.cms-embedded-form .cms-ef-title{font-family:var(--font-display,Georgia,serif);font-size:clamp(1.6rem,3vw,2.1rem);margin:0 0 .5rem;line-height:1.2}
.cms-embedded-form .cms-ef-sub{margin:0 0 1.25rem;color:var(--ef-muted,#5c5460);line-height:1.55;font-size:.95rem}
.cms-embedded-form .cms-ef-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:var(--ef-gap,15px)}
.cms-embedded-form .cms-ef-full{grid-column:1 / -1}
.cms-embedded-form .cms-ef-field label{display:block;font-size:.72rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;margin:0 0 6px;color:var(--ef-text,#171a21)}
.cms-embedded-form .cms-ef-field input,.cms-embedded-form .cms-ef-field select,.cms-embedded-form .cms-ef-field textarea{width:100%;box-sizing:border-box;border:1px solid var(--ef-border,#d9dce5);border-radius:var(--ef-radius,12px);padding:10px 12px;font:inherit;background:var(--ef-input,#fff);color:var(--ef-text,#171a21)}
.cms-embedded-form.cms-ef--underline .cms-ef-field input,.cms-embedded-form.cms-ef--underline .cms-ef-field select,.cms-embedded-form.cms-ef--underline .cms-ef-field textarea{border:0;border-bottom:2px solid var(--ef-border);border-radius:0}
.cms-embedded-form.cms-ef--filled .cms-ef-field input,.cms-embedded-form.cms-ef--filled .cms-ef-field select,.cms-embedded-form.cms-ef--filled .cms-ef-field textarea{border-color:transparent}
.cms-embedded-form .cms-ef-field input:focus-visible,.cms-embedded-form .cms-ef-field select:focus-visible,.cms-embedded-form .cms-ef-field textarea:focus-visible{outline:2px solid var(--ef-accent);outline-offset:2px}
.cms-embedded-form .cms-ef-field textarea{min-height:96px;resize:vertical}
.cms-embedded-form .cms-ef-choices{display:flex;flex-wrap:wrap;gap:8px}
.cms-embedded-form .cms-ef-choice{display:flex!important;align-items:center;gap:9px;border:1px solid var(--ef-border);padding:9px 12px;border-radius:var(--ef-radius);font-size:.83rem!important;font-weight:500!important;letter-spacing:0!important;text-transform:none!important;cursor:pointer}
.cms-embedded-form .cms-ef-choice input{width:16px!important;height:16px!important;min-width:16px;margin:0;accent-color:var(--ef-accent)}
.cms-embedded-form .cms-ef-field>input[type=checkbox]{width:18px;height:18px;accent-color:var(--ef-accent)}
.cms-embedded-form .cms-ef-submit{margin-top:18px;appearance:none;border:0;border-radius:var(--ef-radius,12px);padding:12px 22px;font-weight:700;cursor:pointer;background:var(--ef-accent,#6b21e8);color:#fff}
.cms-embedded-form.cms-ef--full-button .cms-ef-submit{width:100%}
.cms-embedded-form .cms-ef-header{display:flex;align-items:center;gap:12px;font:700 .8rem/1.4 var(--ef-font,Inter,system-ui,sans-serif);color:var(--ef-text,#171a21);padding:0 0 14px;margin-bottom:22px;border-bottom:1px solid var(--ef-border,#e5e7eb)}
.cms-embedded-form .cms-ef-header img{max-width:110px;max-height:36px;object-fit:contain}
.cms-embedded-form .cms-ef-eyebrow{font-size:.65rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--ef-accent,#7c3aed);margin:0 0 10px}
.cms-embedded-form .cms-ef-submit:disabled{opacity:.65;cursor:wait}
.cms-embedded-form .cms-ef-error{display:none;margin-top:12px;padding:10px 12px;border-radius:10px;background:#fef2f2;color:#991b1b;font-size:.9rem}
.cms-embedded-form .cms-ef-success{display:none;padding:1.25rem 0;text-align:center}
.cms-embedded-form .cms-ef-success strong{display:block;font-size:1.15rem;margin-bottom:.35rem}
@media(max-width:640px){.cms-embedded-form .cms-ef-grid{grid-template-columns:1fr}}
</style>
<section class="${formClass}" style="${esc(formStyle)}" data-section-key="${esc(sectionKey)}" data-section-type="embedded_form" data-form-key="${esc(formKey)}">
  <div class="cms-ef-card">
    ${theme.show_header !== false ? `<div class="cms-ef-header">${logo ? `<img src="${esc(logo)}" alt="">` : ""}${esc(theme.org_name || "Companions of CPAS")}</div>` : ""}
    ${intro.eyebrow ? `<div class="cms-ef-eyebrow">${esc(intro.eyebrow)}</div>` : ""}
    <h2 class="cms-ef-title" data-cms-field="heading">${esc(title)}</h2>
    ${subtitle ? `<p class="cms-ef-sub" data-cms-field="subheading">${esc(subtitle)}</p>` : ""}
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
