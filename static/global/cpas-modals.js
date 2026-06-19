/**
 * cpas-modals.js — reusable apply / contact / volunteer modals for Companions of CPAS
 *
 * Triggers:
 *   data-action="foster"  or data-modal="foster"         → 4-step foster application
 *   data-modal="foster-application"                        → same as foster (application form)
 *   data-modal="volunteer"                                 → volunteer interest form
 *   data-modal="contact"                                   → contact form
 *
 * Donate modal is handled separately by donate-modal.js (data-action="donate").
 */
(function () {
  'use strict';

  const INTRO_DEFAULTS = {
    foster: {
      eyebrow: 'Companions of CPAS',
      title: 'Apply to Foster',
      subtitle: 'Open your home. Change a life.',
      body: 'Fostering gives a dog safety, stability, and time to find their forever family. Applications take about 5 minutes.',
      cta_label: 'Start Application',
    },
  };

  const FORM_MODALS = {
    volunteer: {
      title: 'Volunteer With Companions',
      sub: '100% volunteer-run. Every role directly helps dogs move forward.',
      submitLabel: 'Submit Interest',
      success: {
        title: 'Interest received!',
        msg: 'Thank you for wanting to help. We will be in touch within a few days to match you with the right role.',
      },
      html: `
        <form id="cpasVolunteerForm" novalidate>
          <div class="cm-form-row">
            <div><label>First Name *</label><input name="first_name" required placeholder="Jane"></div>
            <div><label>Last Name *</label><input name="last_name" required placeholder="Smith"></div>
          </div>
          <div class="cm-form-row">
            <div><label>Email *</label><input name="email" type="email" required placeholder="jane@email.com"></div>
            <div><label>Phone</label><input name="phone" type="tel" placeholder="(318) 555-0100"></div>
          </div>
          <div><label>City / Area *</label><input name="city" required placeholder="Shreveport"></div>
          <div><label>How would you like to volunteer? *</label>
            <select name="volunteer_role" required>
              <option value="">Select a role…</option>
              <option>Transport driver</option>
              <option>Foster coordinator</option>
              <option>Photographer / videographer</option>
              <option>Social media advocate</option>
              <option>Fundraising / events</option>
              <option>General support</option>
              <option>Not sure yet — tell me what's needed</option>
            </select>
          </div>
          <div><label>Availability</label>
            <select name="availability">
              <option value="">Select…</option>
              <option>A few hours per month</option>
              <option>Weekends occasionally</option>
              <option>Flexible / as needed</option>
              <option>Regular weekly commitment</option>
            </select>
          </div>
          <div><label>Tell us a little about yourself *</label>
            <textarea name="why_volunteer" required placeholder="Why you want to help, any relevant experience…" rows="3"></textarea>
          </div>
          <button type="submit" class="cm-submit">Submit Interest</button>
          <p class="cm-form-note">We will reach out within a few days to connect you with the right role.</p>
        </form>`,
    },
    contact: {
      title: 'Get in Touch',
      sub: 'Questions about fostering, transport, or how to help? Send us a note.',
      submitLabel: 'Send Message',
      success: {
        title: 'Message sent!',
        msg: "We'll get back to you as soon as we can.",
      },
      html: `
        <form id="cpasContactForm" novalidate>
          <div class="cm-form-row">
            <div><label>First Name *</label><input name="first_name" required placeholder="Jane"></div>
            <div><label>Last Name</label><input name="last_name" placeholder="Smith"></div>
          </div>
          <div><label>Email *</label><input name="email" type="email" required placeholder="jane@email.com"></div>
          <div><label>Subject</label>
            <select name="subject">
              <option value="">Select a topic…</option>
              <option>Fostering a dog</option>
              <option>Adopting a dog</option>
              <option>Transport support</option>
              <option>Volunteering</option>
              <option>Donating / fundraising</option>
              <option>General question</option>
            </select>
          </div>
          <div><label>Message *</label>
            <textarea name="message" required placeholder="How can we help?" rows="4"></textarea>
          </div>
          <button type="submit" class="cm-submit">Send Message</button>
          <p class="cm-form-note">Or email us at <a href="mailto:companionsCPAS@gmail.com">companionsCPAS@gmail.com</a></p>
        </form>`,
    },
  };

  const FOSTER_STEPS = [
    { id: 'contact', title: 'Contact Info', fields: [
      { key: 'first_name', label: 'First Name', type: 'text', required: true, placeholder: 'Jane' },
      { key: 'last_name', label: 'Last Name', type: 'text', required: true, placeholder: 'Smith' },
      { key: 'email', label: 'Email', type: 'email', required: true, placeholder: 'you@email.com' },
      { key: 'phone', label: 'Phone', type: 'tel', required: false, placeholder: '(318) 555-0100' },
      { key: 'city', label: 'City', type: 'text', required: true, placeholder: 'Shreveport' },
      { key: 'state', label: 'State', type: 'text', required: true, placeholder: 'LA' },
      { key: 'postal_code', label: 'ZIP Code', type: 'text', required: true, placeholder: '71101' },
    ]},
    { id: 'household', title: 'Your Home', fields: [
      { key: 'housing_type', label: 'Housing Type', type: 'select', required: true, options: ['House', 'Apartment', 'Condo', 'Townhouse', 'Other'] },
      { key: 'rent_or_own', label: 'Rent or Own?', type: 'radio', required: true, options: ['Own', 'Rent'] },
      { key: 'landlord_ok', label: 'Landlord allows pets?', type: 'radio', required: false, options: ['Yes', 'No', 'N/A - I own'] },
      { key: 'has_yard', label: 'Fenced yard?', type: 'radio', required: true, options: ['Yes - fully fenced', 'Yes - partially fenced', 'No'] },
      { key: 'adults_in_home', label: 'Adults in home', type: 'number', required: true, placeholder: '2' },
      { key: 'children_in_home', label: 'Children under 18', type: 'number', required: false, placeholder: '0' },
      { key: 'current_pets', label: 'Current pets (type, breed, age)', type: 'textarea', required: false, placeholder: 'e.g. Lab mix, 3 yrs' },
    ]},
    { id: 'experience', title: 'Experience', fields: [
      { key: 'foster_experience', label: 'Have you fostered before?', type: 'radio', required: true, options: ['Yes', 'No'] },
      { key: 'dog_experience', label: 'Experience with dogs', type: 'radio', required: true, options: ['First-time owner', 'Some experience', 'Very experienced'] },
      { key: 'dog_sizes', label: 'Dog sizes you can foster', type: 'multiselect', required: true, options: ['Small (under 25 lbs)', 'Medium (25-50 lbs)', 'Large (50-80 lbs)', 'XL (80+ lbs)', 'Any size'] },
      { key: 'special_needs_ok', label: 'Open to dogs with special needs?', type: 'checkbox', required: false },
      { key: 'why_foster', label: 'Why do you want to foster?', type: 'textarea', required: true, placeholder: 'Tell us a bit about your motivation...' },
    ]},
    { id: 'commitment', title: 'Commitment', fields: [
      { key: 'hours_alone', label: 'Max hours dog alone daily', type: 'select', required: true, options: ['0-2 hours', '2-4 hours', '4-6 hours', '6-8 hours', '8+ hours'] },
      { key: 'foster_duration', label: 'How long can you foster?', type: 'select', required: true, options: ['1-2 weeks', '2-4 weeks', '1-3 months', 'As long as needed', 'Open to adopt'] },
      { key: 'vet_reference', label: 'Vet name and clinic (if any)', type: 'text', required: false, placeholder: 'Dr. Smith, Caddo Animal Clinic' },
      { key: 'additional_info', label: 'Anything else we should know?', type: 'textarea', required: false, placeholder: 'Optional' },
      { key: 'agree_terms', label: 'I understand fostering is temporary and agree to care for the dog per Companions of CPAS guidelines.', type: 'checkbox', required: true },
    ]},
  ];

  const CSS = `
    .cm-backdrop{position:fixed;inset:0;z-index:9000;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(4,7,17,.78);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}
    .cm-backdrop.is-open{display:flex}
    .cm-card{width:min(100%,520px);max-height:92vh;overflow-y:auto;border:1px solid rgba(255,255,255,.12);border-radius:22px;background:#090d18;color:#f4efe8;box-shadow:0 40px 100px rgba(0,0,0,.58);font-family:'DM Sans',system-ui,sans-serif;scrollbar-width:none}
    .cm-card::-webkit-scrollbar{display:none}
    .cm-card *{box-sizing:border-box}
    .cm-top{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;padding:28px 28px 0}
    .cm-eyebrow{margin:0 0 7px;color:#a78bfa;font-size:10px;font-weight:800;letter-spacing:.14em;text-transform:uppercase}
    .cm-title{margin:0;font-family:'Fraunces',Georgia,serif;font-size:clamp(1.55rem,4vw,2rem);line-height:1.05;color:#f4efe8}
    .cm-sub{margin:8px 0 0;color:#a9afbd;font-size:.95rem;line-height:1.55}
    .cm-body{padding:16px 28px 24px;color:#c8cdd8;font-size:.95rem;line-height:1.7;white-space:pre-line}
    .cm-close{width:34px;height:34px;border:0;background:transparent;color:#a78bfa;cursor:pointer;position:relative;flex:0 0 auto}
    .cm-close::before,.cm-close::after{content:'';position:absolute;left:50%;top:50%;width:22px;height:2px;border-radius:999px;background:currentColor}
    .cm-close::before{transform:translate(-50%,-50%) rotate(45deg)}.cm-close::after{transform:translate(-50%,-50%) rotate(-45deg)}
    .cm-cta-wrap{padding:0 28px 28px}
    .cm-cta{display:inline-flex;align-items:center;justify-content:center;width:100%;min-height:48px;border:0;border-radius:12px;background:linear-gradient(135deg,#7c3aed,#5b21b6);color:#fff;font-weight:800;font-size:.95rem;text-decoration:none;cursor:pointer;font-family:inherit}
    .cm-cta:hover{opacity:.92}
    .cm-error{display:none;margin:0 28px 16px;color:#fca5a5;font-size:.86rem;line-height:1.4}
    .cm-form{padding:0 28px 28px;display:grid;gap:14px}
    .cm-form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .cm-form label{display:block;font-size:11px;font-weight:700;color:#6b7280;margin-bottom:6px;text-transform:uppercase;letter-spacing:.08em}
    .cm-form input,.cm-form select,.cm-form textarea{width:100%;padding:10px 12px;border:1.5px solid rgba(255,255,255,.09);border-radius:10px;font-size:.88rem;font-family:inherit;color:#f4efe8;background:rgba(255,255,255,.045);outline:none;transition:border-color .15s,box-shadow .15s}
    .cm-form input:focus,.cm-form select:focus,.cm-form textarea:focus{border-color:#7c3aed;box-shadow:0 0 0 3px rgba(124,58,237,.18)}
    .cm-form textarea{resize:vertical;min-height:80px}
    .cm-submit{margin-top:6px;width:100%;min-height:46px;border:0;border-radius:11px;background:#7c3aed;color:#fff;font-family:inherit;font-size:.92rem;font-weight:700;cursor:pointer}
    .cm-submit:disabled{opacity:.55;cursor:not-allowed}
    .cm-form-note{font-size:.78rem;color:#6b7280;text-align:center;margin:0;line-height:1.5}
    .cm-form-note a{color:#a78bfa}
    .cm-success{text-align:center;padding:40px 28px}
    .cm-success-title{font-family:'Fraunces',Georgia,serif;font-size:1.25rem;color:#f4efe8;margin-bottom:8px}
    .cm-success-msg{font-size:.88rem;color:#9ca3af;line-height:1.55}
    .fa-backdrop{position:fixed;inset:0;z-index:9100;background:rgba(4,7,17,.82);backdrop-filter:blur(10px);display:none;align-items:center;justify-content:center;padding:16px}
    .fa-backdrop.is-open{display:flex}
    .fa-card{width:min(100%,540px);max-height:92vh;overflow-y:auto;background:#090d18;border:1px solid rgba(255,255,255,.1);border-radius:20px;box-shadow:0 40px 100px rgba(0,0,0,.65);font-family:'DM Sans',system-ui,sans-serif;color:#f4efe8;scrollbar-width:none}
    .fa-card::-webkit-scrollbar{display:none}
    .fa-card *{box-sizing:border-box}
    .fa-header{padding:24px 24px 0;position:relative}
    .fa-close{position:absolute;top:18px;right:18px;width:30px;height:30px;border:1px solid rgba(255,255,255,.12);border-radius:50%;background:rgba(255,255,255,.06);color:#9ca3af;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center}
    .fa-eyebrow{font-size:10px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#a78bfa;margin-bottom:6px}
    .fa-title{font-family:'Fraunces',Georgia,serif;font-size:1.5rem;font-weight:700;color:#f4efe8;margin:0 0 4px}
    .fa-sub{font-size:.84rem;color:#8a94a6;margin:0 0 16px;line-height:1.5}
    .fa-progress{display:flex;gap:6px;padding:0 24px;margin-bottom:20px}
    .fa-pip{flex:1;height:3px;border-radius:99px;background:rgba(255,255,255,.08);transition:background .3s}
    .fa-pip.done{background:#7c3aed}.fa-pip.active{background:#a78bfa}
    .fa-step-label{padding:0 24px;margin-bottom:16px;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#6b7280}
    .fa-body{padding:0 24px 24px}
    .fa-field{margin-bottom:16px}
    .fa-label{display:block;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;margin-bottom:6px}
    .fa-req{color:#f87171}
    .fa-input,.fa-select,.fa-textarea{width:100%;background:rgba(255,255,255,.045);border:1.5px solid rgba(255,255,255,.09);border-radius:9px;padding:10px 12px;color:#f4efe8;font-family:inherit;font-size:.88rem;outline:none}
    .fa-input:focus,.fa-select:focus,.fa-textarea:focus{border-color:#7c3aed;box-shadow:0 0 0 3px rgba(124,58,237,.18)}
    .fa-textarea{resize:vertical;min-height:80px}
    .fa-radio-group{display:flex;flex-direction:column;gap:7px}
    .fa-radio-opt,.fa-check-opt{display:flex;align-items:center;gap:10px;padding:9px 12px;border:1.5px solid rgba(255,255,255,.08);border-radius:9px;cursor:pointer}
    .fa-radio-opt input,.fa-check-opt input{accent-color:#7c3aed;width:16px;height:16px}
    .fa-radio-opt.selected,.fa-check-opt.selected{border-color:#7c3aed;background:rgba(124,58,237,.1)}
    .fa-multi{display:flex;flex-wrap:wrap;gap:7px}
    .fa-multi-opt{padding:7px 14px;border:1.5px solid rgba(255,255,255,.08);border-radius:999px;cursor:pointer;font-size:.8rem;color:#9ca3af}
    .fa-multi-opt.selected{border-color:#7c3aed;background:rgba(124,58,237,.15);color:#c4b5fd}
    .fa-footer{padding:0 24px 24px;display:flex;gap:10px}
    .fa-btn{flex:1;min-height:46px;border:none;border-radius:10px;font-family:inherit;font-size:.9rem;font-weight:700;cursor:pointer}
    .fa-btn-back{background:rgba(255,255,255,.07);border:1.5px solid rgba(255,255,255,.1);color:#d1d5db}
    .fa-btn-next{background:#7c3aed;color:#fff}
    .fa-error{margin:0 24px 16px;padding:10px 12px;background:rgba(248,113,113,.09);border:1px solid rgba(248,113,113,.25);border-radius:9px;color:#fca5a5;font-size:.82rem;display:none}
    .fa-success{text-align:center;padding:48px 28px;display:none}
    .fa-success-icon{width:56px;height:56px;border-radius:50%;margin:0 auto 18px;background:rgba(124,58,237,.15);border:1.5px solid rgba(124,58,237,.35);display:flex;align-items:center;justify-content:center;font-size:1.4rem;color:#a78bfa}
    .fa-success h3{font-family:'Fraunces',Georgia,serif;font-size:1.3rem;color:#f4efe8;margin:0 0 8px}
    .fa-success p{font-size:.86rem;color:#9ca3af;margin:0;line-height:1.5}
    @media(max-width:520px){.cm-backdrop,.fa-backdrop{padding:0;align-items:flex-end}.cm-card,.fa-card{border-radius:20px 20px 0 0;max-height:96vh}.cm-form-row{grid-template-columns:1fr}}
  `;

  let introBackdrop = null;
  let formBackdrop = null;
  let fosterStep = 0;
  let fosterData = {};
  let fosterSubmitting = false;

  function ensureStyles() {
    if (document.getElementById('cpas-modals-styles')) return;
    const s = document.createElement('style');
    s.id = 'cpas-modals-styles';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function lockScroll(on) {
    document.body.style.overflow = on ? 'hidden' : '';
  }

  function closeAll() {
    closeIntro();
    closeFormModal();
    closeFosterApplication();
  }

  function escHandler(e) {
    if (e.key === 'Escape') closeAll();
  }

  /* ── Intro modal (foster CTA, CMS-driven) ───────────────── */
  function ensureIntroBackdrop() {
    if (introBackdrop) return introBackdrop;
    ensureStyles();
    introBackdrop = document.createElement('div');
    introBackdrop.id = 'cpasIntroBackdrop';
    introBackdrop.className = 'cm-backdrop';
    introBackdrop.innerHTML = `
      <div class="cm-card" role="dialog" aria-modal="true" aria-labelledby="cpasIntroTitle">
        <div class="cm-top">
          <div>
            <p class="cm-eyebrow" id="cpasIntroEyebrow"></p>
            <h2 class="cm-title" id="cpasIntroTitle"></h2>
            <p class="cm-sub" id="cpasIntroSub"></p>
          </div>
          <button class="cm-close" type="button" aria-label="Close"></button>
        </div>
        <div class="cm-body" id="cpasIntroBody"></div>
        <p class="cm-error" id="cpasIntroError"></p>
        <div class="cm-cta-wrap"><button type="button" class="cm-cta" id="cpasIntroCta"></button></div>
      </div>`;
    document.body.appendChild(introBackdrop);
    introBackdrop.addEventListener('click', (e) => { if (e.target === introBackdrop) closeIntro(); });
    introBackdrop.querySelector('.cm-close').addEventListener('click', closeIntro);
    return introBackdrop;
  }

  function closeIntro() {
    if (!introBackdrop) return;
    introBackdrop.classList.remove('is-open');
    if (!formBackdrop?.classList.contains('is-open') && !document.getElementById('fa-backdrop')?.classList.contains('is-open')) {
      lockScroll(false);
      document.removeEventListener('keydown', escHandler);
    }
  }

  async function openFosterIntro() {
    const modal = ensureIntroBackdrop();
    const err = modal.querySelector('#cpasIntroError');
    err.style.display = 'none';
    err.textContent = '';

    let cfg = { ...INTRO_DEFAULTS.foster };
    try {
      const res = await fetch('/api/cms/modal/foster_cta', { headers: { accept: 'application/json' } });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.modal) {
        cfg = {
          eyebrow: INTRO_DEFAULTS.foster.eyebrow,
          title: data.modal.title || cfg.title,
          subtitle: data.modal.subtitle || cfg.subtitle,
          body: data.modal.body || cfg.body,
          cta_label: data.modal.cta_label || cfg.cta_label,
        };
      }
    } catch (_) { /* use defaults */ }

    modal.querySelector('#cpasIntroEyebrow').textContent = cfg.eyebrow;
    modal.querySelector('#cpasIntroTitle').textContent = cfg.title;
    modal.querySelector('#cpasIntroSub').textContent = cfg.subtitle;
    modal.querySelector('#cpasIntroBody').textContent = cfg.body;
    const cta = modal.querySelector('#cpasIntroCta');
    cta.textContent = cfg.cta_label;
    cta.onclick = () => { closeIntro(); openFosterApplication(); };

    modal.classList.add('is-open');
    lockScroll(true);
    document.addEventListener('keydown', escHandler);
  }

  /* ── Simple form modals (volunteer, contact) ──────────── */
  function ensureFormBackdrop() {
    if (formBackdrop) return formBackdrop;
    ensureStyles();
    formBackdrop = document.createElement('div');
    formBackdrop.id = 'cpasFormBackdrop';
    formBackdrop.className = 'cm-backdrop';
    formBackdrop.innerHTML = `
      <div class="cm-card" role="dialog" aria-modal="true" aria-labelledby="cpasFormTitle">
        <div class="cm-top">
          <div>
            <h2 class="cm-title" id="cpasFormTitle"></h2>
            <p class="cm-sub" id="cpasFormSub"></p>
          </div>
          <button class="cm-close" type="button" aria-label="Close"></button>
        </div>
        <div id="cpasFormBody"></div>
      </div>`;
    document.body.appendChild(formBackdrop);
    formBackdrop.addEventListener('click', (e) => { if (e.target === formBackdrop) closeFormModal(); });
    formBackdrop.querySelector('.cm-close').addEventListener('click', closeFormModal);
    return formBackdrop;
  }

  function closeFormModal() {
    if (!formBackdrop) return;
    formBackdrop.classList.remove('is-open');
    if (!introBackdrop?.classList.contains('is-open') && !document.getElementById('fa-backdrop')?.classList.contains('is-open')) {
      lockScroll(false);
      document.removeEventListener('keydown', escHandler);
    }
  }

  function showFormSuccess(cfg) {
    document.getElementById('cpasFormBody').innerHTML = `
      <div class="cm-success">
        <div class="cm-success-title">${cfg.title}</div>
        <div class="cm-success-msg">${cfg.msg}</div>
      </div>`;
  }

  async function handleFormSubmit(e, key) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('.cm-submit');
    const cfg = FORM_MODALS[key];
    if (!cfg) return;
    btn.disabled = true;
    btn.textContent = 'Submitting…';
    const data = Object.fromEntries(new FormData(form));
    try {
      if (key === 'foster') {
        const res = await fetch('/api/foster/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ form_key: 'foster_application', ...data }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok && !json.success) throw new Error('server error');
      } else if (key === 'contact') {
        const name = [data.first_name, data.last_name].filter(Boolean).join(' ').trim() || data.first_name || '';
        const res = await fetch('/api/contact/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            email: data.email,
            message: data.message,
            request_type: data.subject || 'general',
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok && !json.success) throw new Error(json.error || 'server error');
      } else {
        showFormSuccess(cfg.success);
        return;
      }
      showFormSuccess(cfg.success);
    } catch (_) {
      btn.disabled = false;
      btn.textContent = cfg.submitLabel;
      const err = document.createElement('p');
      err.style.cssText = 'color:#fca5a5;font-size:13px;text-align:center;margin:8px 28px 0';
      err.textContent = 'Something went wrong — please email companionsCPAS@gmail.com directly.';
      formBackdrop.querySelector('.cm-card').appendChild(err);
    }
  }

  function openFormModal(key) {
    const cfg = FORM_MODALS[key];
    if (!cfg) return;
    const modal = ensureFormBackdrop();
    modal.querySelector('#cpasFormTitle').textContent = cfg.title;
    modal.querySelector('#cpasFormSub').textContent = cfg.sub;
    const body = modal.querySelector('#cpasFormBody');
    body.innerHTML = `<div class="cm-form">${cfg.html}</div>`;
    const form = body.querySelector('form');
    if (form) form.addEventListener('submit', (e) => handleFormSubmit(e, key));
    modal.classList.add('is-open');
    lockScroll(true);
    document.addEventListener('keydown', escHandler);
  }

  /* ── Foster 4-step application ────────────────────────── */
  function buildField(f) {
    const req = f.required ? '<span class="fa-req">*</span>' : '';
    if (f.type === 'radio') {
      const opts = f.options.map((o) => `<label class="fa-radio-opt${fosterData[f.key] === o ? ' selected' : ''}"><input type="radio" name="${f.key}" value="${o}"${fosterData[f.key] === o ? ' checked' : ''} />${o}</label>`).join('');
      return `<div class="fa-field"><span class="fa-label">${f.label} ${req}</span><div class="fa-radio-group">${opts}</div></div>`;
    }
    if (f.type === 'multiselect') {
      const vals = Array.isArray(fosterData[f.key]) ? fosterData[f.key] : [];
      const opts = f.options.map((o) => `<span class="fa-multi-opt${vals.includes(o) ? ' selected' : ''}" data-val="${o}">${o}</span>`).join('');
      return `<div class="fa-field"><span class="fa-label">${f.label} ${req}</span><input type="hidden" name="${f.key}" value="${vals.join(',')}" /><div class="fa-multi">${opts}</div></div>`;
    }
    if (f.type === 'checkbox') {
      return `<div class="fa-field"><label class="fa-check-opt${fosterData[f.key] ? ' selected' : ''}"><input type="checkbox" name="${f.key}"${fosterData[f.key] ? ' checked' : ''} /><span>${f.label} ${req}</span></label></div>`;
    }
    if (f.type === 'textarea') {
      return `<div class="fa-field"><label class="fa-label">${f.label} ${req}</label><textarea class="fa-textarea" name="${f.key}" placeholder="${f.placeholder || ''}">${fosterData[f.key] || ''}</textarea></div>`;
    }
    if (f.type === 'select') {
      const opts = f.options.map((o) => `<option value="${o}"${fosterData[f.key] === o ? ' selected' : ''}>${o}</option>`).join('');
      return `<div class="fa-field"><label class="fa-label">${f.label} ${req}</label><select class="fa-select" name="${f.key}"><option value="">Select...</option>${opts}</select></div>`;
    }
    return `<div class="fa-field"><label class="fa-label">${f.label} ${req}</label><input class="fa-input" type="${f.type}" name="${f.key}" placeholder="${f.placeholder || ''}" value="${fosterData[f.key] || ''}" /></div>`;
  }

  function renderFosterStep(card) {
    const s = FOSTER_STEPS[fosterStep];
    const pips = FOSTER_STEPS.map((_, i) => `<div class="fa-pip${i < fosterStep ? ' done' : i === fosterStep ? ' active' : ''}"></div>`).join('');
    card.innerHTML = `
      <div class="fa-header">
        <button class="fa-close" id="fa-close" type="button" aria-label="Close">&times;</button>
        <div class="fa-eyebrow">Companions of CPAS · Foster Application</div>
        <h2 class="fa-title">Apply to Foster</h2>
        <p class="fa-sub">Open your home. Change a life. About 5 minutes.</p>
      </div>
      <div class="fa-progress">${pips}</div>
      <div class="fa-step-label">Step ${fosterStep + 1} of ${FOSTER_STEPS.length} — ${s.title}</div>
      <div class="fa-error" id="fa-error"></div>
      <div class="fa-body">${s.fields.map(buildField).join('')}</div>
      <div class="fa-footer">
        ${fosterStep > 0 ? '<button class="fa-btn fa-btn-back" id="fa-back" type="button">Back</button>' : ''}
        <button class="fa-btn fa-btn-next" id="fa-next" type="button">${fosterStep === FOSTER_STEPS.length - 1 ? 'Submit Application' : 'Continue'}</button>
      </div>
      <div class="fa-success" id="fa-success">
        <div class="fa-success-icon">&#10003;</div>
        <h3>Application received.</h3>
        <p>We review every application personally and will be in touch within 2-3 business days. Thank you for opening your home.</p>
      </div>`;

    document.getElementById('fa-close').addEventListener('click', closeFosterApplication);
    card.querySelectorAll('.fa-radio-opt').forEach((opt) => {
      opt.addEventListener('click', () => {
        const inp = opt.querySelector('input');
        inp.checked = true;
        card.querySelectorAll(`.fa-radio-opt input[name="${inp.name}"]`).forEach((i) => i.closest('.fa-radio-opt').classList.remove('selected'));
        opt.classList.add('selected');
      });
    });
    card.querySelectorAll('.fa-multi-opt').forEach((opt) => {
      opt.addEventListener('click', () => {
        opt.classList.toggle('selected');
        const wrap = opt.closest('.fa-field');
        const vals = [...wrap.querySelectorAll('.fa-multi-opt.selected')].map((o) => o.dataset.val);
        wrap.querySelector('input[type=hidden]').value = vals.join(',');
      });
    });
    card.querySelectorAll('.fa-check-opt input[type=checkbox]').forEach((inp) => {
      inp.addEventListener('change', () => inp.closest('.fa-check-opt').classList.toggle('selected', inp.checked));
    });
    document.getElementById('fa-back')?.addEventListener('click', () => { collectFosterStep(card); fosterStep--; renderFosterStep(card); });
    document.getElementById('fa-next').addEventListener('click', async () => {
      if (!validateFosterStep(card)) return;
      collectFosterStep(card);
      if (fosterStep < FOSTER_STEPS.length - 1) { fosterStep++; renderFosterStep(card); card.scrollTop = 0; }
      else { await submitFosterForm(card); }
    });
  }

  function collectFosterStep(card) {
    const s = FOSTER_STEPS[fosterStep];
    s.fields.forEach((f) => {
      if (f.type === 'multiselect') {
        const h = card.querySelector(`input[type=hidden][name="${f.key}"]`);
        if (h) fosterData[f.key] = h.value ? h.value.split(',') : [];
      } else if (f.type === 'checkbox') {
        const i = card.querySelector(`input[name="${f.key}"]`);
        if (i) fosterData[f.key] = i.checked;
      } else {
        const i = card.querySelector(`[name="${f.key}"]`);
        if (i) fosterData[f.key] = i.value.trim();
      }
    });
  }

  function validateFosterStep(card) {
    const s = FOSTER_STEPS[fosterStep];
    const err = document.getElementById('fa-error');
    const missing = [];
    s.fields.forEach((f) => {
      if (!f.required) return;
      if (f.type === 'multiselect') {
        const h = card.querySelector(`input[type=hidden][name="${f.key}"]`);
        if (!h?.value) missing.push(f.label);
      } else if (f.type === 'checkbox') {
        const i = card.querySelector(`input[name="${f.key}"]`);
        if (!i?.checked) missing.push(f.label);
      } else {
        const i = card.querySelector(`[name="${f.key}"]`);
        if (!i?.value?.trim()) missing.push(f.label);
      }
    });
    if (missing.length) {
      err.textContent = 'Please complete: ' + missing.join(', ');
      err.style.display = 'block';
      return false;
    }
    err.style.display = 'none';
    return true;
  }

  async function submitFosterForm(card) {
    if (fosterSubmitting) return;
    fosterSubmitting = true;
    const btn = document.getElementById('fa-next');
    if (btn) { btn.disabled = true; btn.textContent = 'Submitting...'; }
    try {
      const payload = { ...fosterData };
      Object.keys(payload).forEach((k) => { if (Array.isArray(payload[k])) payload[k] = payload[k].join(', '); });
      const res = await fetch('/api/foster/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'Submission failed.');
      ['fa-header', 'fa-progress', 'fa-step-label', 'fa-body', 'fa-footer', 'fa-error'].forEach((id) => {
        const el = document.getElementById(id) || card.querySelector('.' + id);
        if (el) el.style.display = 'none';
      });
      document.getElementById('fa-success').style.display = 'block';
      setTimeout(closeFosterApplication, 6000);
    } catch (e) {
      const err = document.getElementById('fa-error');
      if (err) { err.textContent = e.message || 'Submission failed. Please try again.'; err.style.display = 'block'; }
      fosterSubmitting = false;
      if (btn) { btn.disabled = false; btn.textContent = 'Submit Application'; }
    }
  }

  function openFosterApplication() {
    ensureStyles();
    fosterStep = 0;
    fosterData = {};
    fosterSubmitting = false;
    let backdrop = document.getElementById('fa-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'fa-backdrop';
      backdrop.className = 'fa-backdrop';
      backdrop.setAttribute('role', 'dialog');
      backdrop.setAttribute('aria-modal', 'true');
      backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeFosterApplication(); });
      document.body.appendChild(backdrop);
    }
    let card = document.getElementById('fa-card');
    if (!card) {
      card = document.createElement('div');
      card.id = 'fa-card';
      card.className = 'fa-card';
      backdrop.appendChild(card);
    }
    renderFosterStep(card);
    backdrop.classList.add('is-open');
    lockScroll(true);
    document.addEventListener('keydown', escHandler);
  }

  function closeFosterApplication() {
    const b = document.getElementById('fa-backdrop');
    if (b) b.classList.remove('is-open');
    if (!introBackdrop?.classList.contains('is-open') && !formBackdrop?.classList.contains('is-open')) {
      lockScroll(false);
      document.removeEventListener('keydown', escHandler);
    }
  }

  /* ── Global click routing ─────────────────────────────── */
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-modal],[data-action]');
    if (!el) return;

    const modal = el.dataset.modal;
    const action = el.dataset.action;

    if (action === 'donate' || el.hasAttribute('data-donate')) return;

    if (
      action === 'foster' ||
      modal === 'foster' ||
      modal === 'foster-application' ||
      modal === 'foster-form'
    ) {
      e.preventDefault();
      openFosterApplication();
      return;
    }
    if (modal === 'volunteer') {
      e.preventDefault();
      openFormModal('volunteer');
      return;
    }
    if (modal === 'contact') {
      e.preventDefault();
      openFormModal('contact');
    }
  });

  window.CPASModals = {
    openFosterIntro,
    openFosterApplication,
    openVolunteer: () => openFormModal('volunteer'),
    openContact: () => openFormModal('contact'),
    close: closeAll,
  };

  window.FosterModal = {
    open: openFosterApplication,
    openApplication: openFosterApplication,
    openIntro: openFosterIntro,
    close: closeAll,
  };
})();
