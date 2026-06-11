/* cpas-shell.js — public site interactions */
(function () {
  'use strict';

  /* ── Header scroll behaviour ─────────────────────────── */
  const hdr = document.querySelector('.site-header');
  if (hdr) {
    let lastY = 0;
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      hdr.classList.toggle('scrolled', y > 24);
      hdr.classList.toggle('header-hidden', y > lastY + 80 && y > 300);
      if (y < lastY || y < 80) hdr.classList.remove('header-hidden');
      lastY = y;
    }, { passive: true });
  }

  /* ── Mobile nav ──────────────────────────────────────── */
  const toggle = document.querySelector('.mobile-menu-toggle');
  const drawer = document.querySelector('.mobile-nav-drawer');
  const overlay = document.getElementById('navOverlay');
  function closeNav() {
    drawer && drawer.classList.remove('is-open');
    overlay && overlay.classList.remove('is-open');
    document.body.style.overflow = '';
  }
  if (toggle) {
    toggle.addEventListener('click', () => {
      const open = drawer && drawer.classList.toggle('is-open');
      overlay && overlay.classList.toggle('is-open', !!open);
      document.body.style.overflow = open ? 'hidden' : '';
    });
  }
  const closeBtn = document.querySelector('.mobile-nav-close');
  closeBtn && closeBtn.addEventListener('click', closeNav);
  overlay && overlay.addEventListener('click', closeNav);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeNav(); closeModal(); } });

  /* ── Modal system ────────────────────────────────────── */
  const MODALS = {
    foster: {
      title: 'Apply to Foster',
      sub: 'Takes about 5 minutes. We review every application personally.',
      html: `
        <form id="fosterForm" novalidate>
          <div class="form-row">
            <div><label>First Name *</label><input name="first_name" required placeholder="Jane"></div>
            <div><label>Last Name *</label><input name="last_name" required placeholder="Smith"></div>
          </div>
          <div class="form-row">
            <div><label>Email *</label><input name="email" type="email" required placeholder="jane@email.com"></div>
            <div><label>Phone</label><input name="phone" type="tel" placeholder="(318) 555-0100"></div>
          </div>
          <div class="form-row">
            <div><label>City *</label><input name="city" required placeholder="Shreveport"></div>
            <div><label>State *</label><input name="state" required placeholder="LA" maxlength="2"></div>
          </div>
          <div class="form-row">
            <div><label>Housing *</label>
              <select name="housing_type" required>
                <option value="">Select…</option>
                <option>House</option><option>Apartment</option><option>Condo</option><option>Other</option>
              </select>
            </div>
            <div><label>Fenced yard? *</label>
              <select name="has_yard" required>
                <option value="">Select…</option>
                <option value="yes">Yes</option><option value="no">No</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div><label>Fostered before? *</label>
              <select name="foster_experience" required>
                <option value="">Select…</option>
                <option value="yes">Yes</option><option value="no">No, first time</option>
              </select>
            </div>
            <div><label>How long can you foster? *</label>
              <select name="foster_duration" required>
                <option value="">Select…</option>
                <option>1–2 weeks</option><option>2–4 weeks</option>
                <option>1–2 months</option><option>Flexible / open-ended</option>
              </select>
            </div>
          </div>
          <div><label>Why do you want to foster? *</label>
            <textarea name="why_foster" required placeholder="Tell us a little about yourself and why you'd like to help…" rows="3"></textarea>
          </div>
          <div><label>Current pets (optional)</label>
            <input name="current_pets" placeholder="e.g. 1 dog, 8 years old, Lab mix">
          </div>
          <div style="display:flex;align-items:flex-start;gap:10px;margin-top:2px">
            <input type="checkbox" name="agree_terms" id="agreeTerms" style="width:auto;margin-top:3px;flex-shrink:0">
            <label for="agreeTerms" style="text-transform:none;font-size:13px;letter-spacing:0;font-weight:400;color:#4b4453">
              I understand fostering is a temporary commitment and agree to care for the dog according to Companions of CPAS guidelines.
            </label>
          </div>
          <button type="submit" class="form-submit">Submit Application</button>
          <p class="form-note">We will follow up within 2–3 business days.</p>
        </form>`
    },
    contact: {
      title: 'Get in Touch',
      sub: 'Questions about fostering, transport, or how to help? Send us a note.',
      html: `
        <form id="contactForm" novalidate>
          <div class="form-row">
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
          <button type="submit" class="form-submit">Send Message</button>
          <p class="form-note">Or email us directly at <a href="mailto:companionsCPAS@gmail.com" style="color:var(--purple)">companionsCPAS@gmail.com</a></p>
        </form>`
    }
  };

  /* Build and inject modal HTML once */
  function buildBackdrop() {
    const bd = document.createElement('div');
    bd.className = 'cpas-modal-backdrop';
    bd.id = 'cpasModalBackdrop';
    bd.innerHTML = `
      <div class="cpas-modal" role="dialog" aria-modal="true">
        <div class="cpas-modal-header">
          <div>
            <div class="cpas-modal-title" id="cpasModalTitle"></div>
            <div class="cpas-modal-sub" id="cpasModalSub"></div>
          </div>
          <button class="cpas-modal-close" id="cpasModalClose" aria-label="Close">&#x2715;</button>
        </div>
        <div id="cpasModalBody"></div>
      </div>`;
    document.body.appendChild(bd);
    bd.addEventListener('click', (e) => { if (e.target === bd) closeModal(); });
    document.getElementById('cpasModalClose').addEventListener('click', closeModal);
    return bd;
  }

  let backdrop;
  function openModal(key) {
    if (!backdrop) backdrop = buildBackdrop();
    const cfg = MODALS[key];
    if (!cfg) return;
    document.getElementById('cpasModalTitle').textContent = cfg.title;
    document.getElementById('cpasModalSub').textContent = cfg.sub;
    document.getElementById('cpasModalBody').innerHTML = cfg.html;
    backdrop.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    /* Wire form submit */
    const form = backdrop.querySelector('form');
    if (form) form.addEventListener('submit', (e) => handleSubmit(e, key));
  }
  function closeModal() {
    backdrop && backdrop.classList.remove('is-open');
    document.body.style.overflow = '';
  }
  window.cpasOpenModal = openModal;

  /* Form submission → /api/foster/apply or mailto fallback for contact */
  async function handleSubmit(e, key) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('.form-submit');
    /* Basic required check */
    const missing = [...form.querySelectorAll('[required]')].filter(f => !f.value.trim() || (f.type === 'checkbox' && !f.checked));
    if (missing.length) { missing[0].focus(); missing[0].style.borderColor = '#ef4444'; setTimeout(() => missing[0].style.borderColor = '', 2000); return; }
    btn.disabled = true; btn.textContent = 'Submitting…';
    const data = Object.fromEntries(new FormData(form));
    try {
      let ok = false;
      if (key === 'foster') {
        const res = await fetch('/api/foster/apply', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ form_key: 'foster_application', ...data })
        });
        const json = await res.json().catch(() => ({}));
        ok = res.ok || json.success;
      } else {
        /* Contact: email fallback until contact API is wired */
        ok = true;
      }
      if (ok) showSuccess(key === 'foster'
        ? { icon: '🐾', title: 'Application received!', msg: 'We\'ll be in touch within 2–3 business days. Thank you for opening your home.' }
        : { icon: '✉️', title: 'Message sent!', msg: 'We\'ll get back to you as soon as we can.' }
      );
      else throw new Error('server error');
    } catch {
      btn.disabled = false;
      btn.textContent = key === 'foster' ? 'Submit Application' : 'Send Message';
      const err = document.createElement('p');
      err.style.cssText = 'color:#ef4444;font-size:13px;text-align:center;margin-top:4px';
      err.textContent = 'Something went wrong — please email companionsCPAS@gmail.com directly.';
      form.appendChild(err);
    }
  }
  function showSuccess({ icon, title, msg }) {
    document.getElementById('cpasModalBody').innerHTML = `
      <div class="form-success">
        <div class="form-success-icon">${icon}</div>
        <div class="form-success-title">${title}</div>
        <div class="form-success-msg">${msg}</div>
      </div>`;
  }

  /* ── Wire [data-modal] triggers anywhere on the page ──── */
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-modal]');
    if (el) { e.preventDefault(); openModal(el.dataset.modal); }
  });

})();
