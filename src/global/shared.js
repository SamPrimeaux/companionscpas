(function () {
  const FOOTER_HTML = `
    <footer class="site-footer">
      <div class="footer-waves" aria-hidden="true"></div>
      <div class="footer-card">
        <div class="footer-grid">
          <section class="footer-brand">
            <img src="/logo.png" alt="Companions of CPAS" class="footer-logo">
            <p>Companions of CPAS gives dogs at Caddo Parish Animal Services a second chance through medical support, rescue transport, and community awareness.</p>
          </section>
          <section>
            <h4>Contact</h4>
            <a href="mailto:companionsCPAS@gmail.com">companionsCPAS@gmail.com</a>
            <p>Shreveport, LA 71106</p>
            <a href="https://www.companionsofcaddo.org">companionsofcaddo.org</a>
          </section>
          <section>
            <h4>Nonprofit Info</h4>
            <p>501(c)(3) Tax-Exempt</p>
            <p>EIN: 88-4156327</p>
            <p>Parish: Caddo</p>
            <p>Sector: Animals</p>
          </section>
          <section>
            <h4>Quick Links</h4>
            <a href="/">Home</a>
            <a href="/about">About</a>
            <a href="/adopt">Adopt</a>
            <a href="/services">Services</a>
            <a href="/donate">Donate</a>
          </section>
        </div>
        <div class="footer-bottom">
          <span>&copy; 2026 Companions of CPAS. All rights reserved.</span>
          <span>Developed by <strong>Inner Animal Media</strong></span>
        </div>
      </div>
    </footer>
  `;

  const style = document.createElement('style');
  style.textContent = `
    .site-footer{position:relative;overflow:hidden;padding:72px 22px 28px;background:radial-gradient(circle at 20% 0%,rgba(124,58,237,.22),transparent 34%),radial-gradient(circle at 90% 20%,rgba(34,211,238,.18),transparent 38%),linear-gradient(180deg,#0b1220 0%,#05070d 100%);color:rgba(255,255,255,.86);border-top:1px solid rgba(255,255,255,.08)}
    .footer-waves{position:absolute;inset:auto 0 0 0;height:220px;pointer-events:none;opacity:.7;background:radial-gradient(80% 60% at 20% 100%,rgba(124,58,237,.45),transparent 60%),radial-gradient(80% 60% at 70% 100%,rgba(14,165,233,.38),transparent 62%),radial-gradient(80% 60% at 100% 100%,rgba(34,211,238,.34),transparent 58%);filter:blur(18px);transform:translateY(38%);animation:footerWaveDrift 16s ease-in-out infinite alternate}
    @keyframes footerWaveDrift{from{transform:translate3d(-2%,38%,0) scale(1)}to{transform:translate3d(2%,34%,0) scale(1.05)}}
    .footer-card{position:relative;z-index:1;max-width:1180px;margin:auto;padding:34px;border-radius:28px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.09);box-shadow:0 24px 80px rgba(0,0,0,.32);backdrop-filter:blur(18px)}
    .footer-grid{display:grid;grid-template-columns:1.5fr 1fr 1fr .8fr;gap:28px}
    .footer-logo{width:86px;height:86px;object-fit:contain;filter:drop-shadow(0 18px 34px rgba(124,58,237,.36));margin-bottom:14px}
    .site-footer h4{margin:0 0 14px;color:#fff;font-size:14px;text-transform:uppercase;letter-spacing:.08em}
    .site-footer p,.site-footer a{display:block;margin:0 0 10px;color:rgba(255,255,255,.78);text-decoration:none;line-height:1.55}
    .site-footer a:hover{color:#a78bfa}
    .footer-brand p{max-width:420px}
    .footer-bottom{display:flex;justify-content:space-between;gap:18px;border-top:1px solid rgba(255,255,255,.08);margin-top:28px;padding-top:20px;color:rgba(255,255,255,.66);font-size:14px}
    .footer-bottom strong{color:#a78bfa}
    @media(max-width:860px){.footer-grid{grid-template-columns:1fr}.footer-bottom{flex-direction:column}.footer-card{padding:24px}}
    @media(prefers-reduced-motion:reduce){.footer-waves{animation:none}}
  `;
  document.head.appendChild(style);

  function renderFooter() {
    const el = document.getElementById('site-footer');
    if (el) el.outerHTML = FOOTER_HTML;
  }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', renderFooter); } else { renderFooter(); }
})();

// Mobile nav
(() => {
  function initMobileNav() {
    const header = document.querySelector('.site-header');
    if (!header || header.dataset.mobileNavReady === '1') return;
    header.dataset.mobileNavReady = '1';
    const inner = header.querySelector('.header-inner') || header.querySelector('.nav') || header;
    const currentPath = window.location.pathname.replace(/\/$/, '') || '/';
    let toggle = header.querySelector('.mobile-menu-toggle');
    if (!toggle) {
      toggle = document.createElement('button');
      toggle.className = 'mobile-menu-toggle'; toggle.type = 'button';
      toggle.setAttribute('aria-label', 'Open navigation'); toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-controls', 'mobileMenuPanel');
      toggle.innerHTML = '<span></span><span></span><span></span>';
      inner.appendChild(toggle);
    }
    let panel = document.querySelector('.mobile-menu-panel');
    if (!panel) {
      panel = document.createElement('nav'); panel.className = 'mobile-menu-panel'; panel.id = 'mobileMenuPanel';
      panel.setAttribute('aria-label', 'Mobile navigation');
      panel.innerHTML = '<a href="/">Home</a><a href="/about">About</a><a href="/adopt">Adopt</a><a href="/services">Services</a><a href="/donate" class="mobile-donate">Donate</a>';
      document.body.appendChild(panel);
    }
    panel.setAttribute('aria-hidden', 'true');
    panel.querySelectorAll('a').forEach(a => {
      const hp = new URL(a.getAttribute('href'), window.location.origin).pathname.replace(/\/$/, '') || '/';
      a.classList.toggle('active', hp === currentPath);
    });
    function closeMenu() {
      toggle.classList.remove('is-open'); panel.classList.remove('is-open'); panel.setAttribute('aria-hidden', 'true');
      toggle.setAttribute('aria-label', 'Open navigation'); toggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('menu-open', 'cpas-nav-open');
      document.documentElement.classList.remove('nav-open', 'cpas-nav-open');
      document.body.style.overflow = '';
    }
    function openMenu() {
      toggle.classList.add('is-open'); panel.classList.add('is-open'); panel.setAttribute('aria-hidden', 'false');
      toggle.setAttribute('aria-label', 'Close navigation'); toggle.setAttribute('aria-expanded', 'true');
      document.body.classList.add('menu-open', 'cpas-nav-open');
      document.documentElement.classList.add('nav-open', 'cpas-nav-open');
      document.body.style.overflow = 'hidden';
    }
    toggle.addEventListener('click', () => toggle.classList.contains('is-open') ? closeMenu() : openMenu());
    panel.addEventListener('click', e => { if (e.target.closest('a')) closeMenu(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
    document.addEventListener('click', e => {
      if (!panel.classList.contains('is-open')) return;
      if (header.contains(e.target) || panel.contains(e.target)) return;
      closeMenu();
    });
    window.addEventListener('resize', () => { if (window.innerWidth > 760) closeMenu(); });
  }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', initMobileNav); } else { initMobileNav(); }
})();

// Foster application modal — 4-step, posts to /api/foster/apply
(() => {
  const STEPS = [
    { id: 'contact', title: 'Contact Info', fields: [
      { key: 'first_name', label: 'First Name', type: 'text', required: true, placeholder: 'Jane' },
      { key: 'last_name',  label: 'Last Name',  type: 'text', required: true, placeholder: 'Smith' },
      { key: 'email',      label: 'Email',       type: 'email', required: true, placeholder: 'you@email.com' },
      { key: 'phone',      label: 'Phone',       type: 'tel',  required: false, placeholder: '(318) 555-0100' },
      { key: 'city',       label: 'City',        type: 'text', required: true, placeholder: 'Shreveport' },
      { key: 'state',      label: 'State',       type: 'text', required: true, placeholder: 'LA' },
      { key: 'postal_code',label: 'ZIP Code',    type: 'text', required: true, placeholder: '71101' },
    ]},
    { id: 'household', title: 'Your Home', fields: [
      { key: 'housing_type',    label: 'Housing Type', type: 'select', required: true, options: ['House','Apartment','Condo','Townhouse','Other'] },
      { key: 'rent_or_own',     label: 'Rent or Own?', type: 'radio', required: true, options: ['Own','Rent'] },
      { key: 'landlord_ok',     label: 'Landlord allows pets?', type: 'radio', required: false, options: ['Yes','No','N/A - I own'] },
      { key: 'has_yard',        label: 'Fenced yard?', type: 'radio', required: true, options: ['Yes - fully fenced','Yes - partially fenced','No'] },
      { key: 'adults_in_home',  label: 'Adults in home', type: 'number', required: true, placeholder: '2' },
      { key: 'children_in_home',label: 'Children under 18', type: 'number', required: false, placeholder: '0' },
      { key: 'current_pets',    label: 'Current pets (type, breed, age)', type: 'textarea', required: false, placeholder: 'e.g. Lab mix, 3 yrs' },
    ]},
    { id: 'experience', title: 'Experience', fields: [
      { key: 'foster_experience', label: 'Have you fostered before?', type: 'radio', required: true, options: ['Yes','No'] },
      { key: 'dog_experience',    label: 'Experience with dogs', type: 'radio', required: true, options: ['First-time owner','Some experience','Very experienced'] },
      { key: 'dog_sizes',         label: 'Dog sizes you can foster', type: 'multiselect', required: true, options: ['Small (under 25 lbs)','Medium (25-50 lbs)','Large (50-80 lbs)','XL (80+ lbs)','Any size'] },
      { key: 'special_needs_ok',  label: 'Open to dogs with special needs?', type: 'checkbox', required: false },
      { key: 'why_foster',        label: 'Why do you want to foster?', type: 'textarea', required: true, placeholder: 'Tell us a bit about your motivation...' },
    ]},
    { id: 'commitment', title: 'Commitment', fields: [
      { key: 'hours_alone',    label: 'Max hours dog alone daily', type: 'select', required: true, options: ['0-2 hours','2-4 hours','4-6 hours','6-8 hours','8+ hours'] },
      { key: 'foster_duration',label: 'How long can you foster?', type: 'select', required: true, options: ['1-2 weeks','2-4 weeks','1-3 months','As long as needed','Open to adopt'] },
      { key: 'vet_reference',  label: 'Vet name and clinic (if any)', type: 'text', required: false, placeholder: 'Dr. Smith, Caddo Animal Clinic' },
      { key: 'additional_info',label: 'Anything else we should know?', type: 'textarea', required: false, placeholder: 'Optional' },
      { key: 'agree_terms',    label: 'I understand fostering is temporary and agree to care for the dog per Companions of CPAS guidelines.', type: 'checkbox', required: true },
    ]},
  ];

  const CSS = `
    .fa-backdrop{position:fixed;inset:0;z-index:9100;background:rgba(4,7,17,.82);backdrop-filter:blur(10px);display:none;align-items:center;justify-content:center;padding:16px}
    .fa-backdrop.is-open{display:flex}
    .fa-card{width:min(100%,540px);max-height:92vh;overflow-y:auto;background:#090d18;border:1px solid rgba(255,255,255,.1);border-radius:20px;box-shadow:0 40px 100px rgba(0,0,0,.65);font-family:'DM Sans',system-ui,sans-serif;color:#f4efe8;scrollbar-width:none}
    .fa-card::-webkit-scrollbar{display:none}
    .fa-card *{box-sizing:border-box}
    .fa-header{padding:24px 24px 0;position:relative}
    .fa-close{position:absolute;top:18px;right:18px;width:30px;height:30px;border:1px solid rgba(255,255,255,.12);border-radius:50%;background:rgba(255,255,255,.06);color:#9ca3af;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;transition:background .15s}
    .fa-close:hover{background:rgba(255,255,255,.14);color:#f4efe8}
    .fa-eyebrow{font-size:10px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#a78bfa;margin-bottom:6px}
    .fa-title{font-family:'Fraunces',Georgia,serif;font-size:1.5rem;font-weight:700;color:#f4efe8;margin:0 0 4px;letter-spacing:-.02em}
    .fa-sub{font-size:.84rem;color:#8a94a6;margin:0 0 16px;line-height:1.5}
    .fa-progress{display:flex;gap:6px;padding:0 24px;margin-bottom:20px}
    .fa-pip{flex:1;height:3px;border-radius:99px;background:rgba(255,255,255,.08);transition:background .3s}
    .fa-pip.done{background:#7c3aed}
    .fa-pip.active{background:#a78bfa}
    .fa-step-label{padding:0 24px;margin-bottom:16px;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#6b7280}
    .fa-body{padding:0 24px 24px}
    .fa-field{margin-bottom:16px}
    .fa-label{display:block;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;margin-bottom:6px}
    .fa-req{color:#f87171}
    .fa-input,.fa-select,.fa-textarea{width:100%;background:rgba(255,255,255,.045);border:1.5px solid rgba(255,255,255,.09);border-radius:9px;padding:10px 12px;color:#f4efe8;font-family:inherit;font-size:.88rem;outline:none;transition:border-color .14s,box-shadow .14s}
    .fa-input:focus,.fa-select:focus,.fa-textarea:focus{border-color:#7c3aed;box-shadow:0 0 0 3px rgba(124,58,237,.18)}
    .fa-input::placeholder,.fa-textarea::placeholder{color:#4b5563}
    .fa-select{appearance:none;cursor:pointer}
    .fa-textarea{resize:vertical;min-height:80px}
    .fa-radio-group{display:flex;flex-direction:column;gap:7px}
    .fa-radio-opt,.fa-check-opt{display:flex;align-items:center;gap:10px;padding:9px 12px;border:1.5px solid rgba(255,255,255,.08);border-radius:9px;cursor:pointer;transition:border-color .14s,background .14s}
    .fa-radio-opt:hover,.fa-check-opt:hover{border-color:rgba(124,58,237,.4);background:rgba(124,58,237,.06)}
    .fa-radio-opt input,.fa-check-opt input{accent-color:#7c3aed;flex-shrink:0;width:16px;height:16px;cursor:pointer}
    .fa-radio-opt.selected,.fa-check-opt.selected{border-color:#7c3aed;background:rgba(124,58,237,.1)}
    .fa-multi{display:flex;flex-wrap:wrap;gap:7px}
    .fa-multi-opt{padding:7px 14px;border:1.5px solid rgba(255,255,255,.08);border-radius:999px;cursor:pointer;font-size:.8rem;font-weight:600;color:#9ca3af;transition:all .14s}
    .fa-multi-opt:hover{border-color:rgba(124,58,237,.4);color:#c4b5fd}
    .fa-multi-opt.selected{border-color:#7c3aed;background:rgba(124,58,237,.15);color:#c4b5fd}
    .fa-footer{padding:0 24px 24px;display:flex;gap:10px}
    .fa-btn{flex:1;min-height:46px;border:none;border-radius:10px;font-family:inherit;font-size:.9rem;font-weight:700;cursor:pointer;transition:opacity .15s,transform .1s}
    .fa-btn:hover:not(:disabled){transform:translateY(-1px)}
    .fa-btn:disabled{opacity:.5;cursor:not-allowed;transform:none}
    .fa-btn-back{background:rgba(255,255,255,.07);border:1.5px solid rgba(255,255,255,.1);color:#d1d5db}
    .fa-btn-next{background:#7c3aed;color:#fff}
    .fa-error{margin:0 24px 16px;padding:10px 12px;background:rgba(248,113,113,.09);border:1px solid rgba(248,113,113,.25);border-radius:9px;color:#fca5a5;font-size:.82rem;display:none}
    .fa-success{text-align:center;padding:48px 28px;display:none}
    .fa-success-icon{width:56px;height:56px;border-radius:50%;margin:0 auto 18px;background:rgba(124,58,237,.15);border:1.5px solid rgba(124,58,237,.35);display:flex;align-items:center;justify-content:center;font-size:1.4rem;color:#a78bfa}
    .fa-success h3{font-family:'Fraunces',Georgia,serif;font-size:1.3rem;color:#f4efe8;margin:0 0 8px}
    .fa-success p{font-size:.86rem;color:#9ca3af;margin:0;line-height:1.5}
    @media(max-width:480px){.fa-backdrop{padding:0;align-items:flex-end}.fa-card{border-radius:20px 20px 0 0;max-height:96vh}}
  `;

  let step = 0, data = {}, submitting = false;

  function ensureStyles() {
    if (document.getElementById('fa-styles')) return;
    const s = document.createElement('style'); s.id = 'fa-styles'; s.textContent = CSS; document.head.appendChild(s);
  }

  function buildField(f) {
    const req = f.required ? '<span class="fa-req">*</span>' : '';
    if (f.type === 'radio') {
      const opts = f.options.map(o => `<label class="fa-radio-opt${data[f.key]===o?' selected':''}"><input type="radio" name="${f.key}" value="${o}"${data[f.key]===o?' checked':''} />${o}</label>`).join('');
      return `<div class="fa-field"><span class="fa-label">${f.label} ${req}</span><div class="fa-radio-group">${opts}</div></div>`;
    }
    if (f.type === 'multiselect') {
      const vals = Array.isArray(data[f.key]) ? data[f.key] : [];
      const opts = f.options.map(o => `<span class="fa-multi-opt${vals.includes(o)?' selected':''}" data-val="${o}">${o}</span>`).join('');
      return `<div class="fa-field"><span class="fa-label">${f.label} ${req}</span><input type="hidden" name="${f.key}" value="${vals.join(',')}" /><div class="fa-multi">${opts}</div></div>`;
    }
    if (f.type === 'checkbox') {
      return `<div class="fa-field"><label class="fa-check-opt${data[f.key]?' selected':''}"><input type="checkbox" name="${f.key}"${data[f.key]?' checked':''} /><span>${f.label} ${req}</span></label></div>`;
    }
    if (f.type === 'textarea') {
      return `<div class="fa-field"><label class="fa-label">${f.label} ${req}</label><textarea class="fa-textarea" name="${f.key}" placeholder="${f.placeholder||''}">${data[f.key]||''}</textarea></div>`;
    }
    if (f.type === 'select') {
      const opts = f.options.map(o => `<option value="${o}"${data[f.key]===o?' selected':''}>${o}</option>`).join('');
      return `<div class="fa-field"><label class="fa-label">${f.label} ${req}</label><select class="fa-select" name="${f.key}"><option value="">Select...</option>${opts}</select></div>`;
    }
    return `<div class="fa-field"><label class="fa-label">${f.label} ${req}</label><input class="fa-input" type="${f.type}" name="${f.key}" placeholder="${f.placeholder||''}" value="${data[f.key]||''}" /></div>`;
  }

  function renderStep(card) {
    const s = STEPS[step];
    const pips = STEPS.map((_,i)=>`<div class="fa-pip${i<step?' done':i===step?' active':''}"></div>`).join('');
    card.innerHTML = `
      <div class="fa-header">
        <button class="fa-close" id="fa-close" type="button">&times;</button>
        <div class="fa-eyebrow">Companions of CPAS &middot; Foster Application</div>
        <h2 class="fa-title">Apply to Foster</h2>
        <p class="fa-sub">Open your home. Change a life. About 5 minutes.</p>
      </div>
      <div class="fa-progress">${pips}</div>
      <div class="fa-step-label">Step ${step+1} of ${STEPS.length} &mdash; ${s.title}</div>
      <div class="fa-error" id="fa-error"></div>
      <div class="fa-body">${s.fields.map(buildField).join('')}</div>
      <div class="fa-footer">
        ${step>0?'<button class="fa-btn fa-btn-back" id="fa-back" type="button">Back</button>':''}
        <button class="fa-btn fa-btn-next" id="fa-next" type="button">${step===STEPS.length-1?'Submit Application':'Continue'}</button>
      </div>
      <div class="fa-success" id="fa-success">
        <div class="fa-success-icon">&#10003;</div>
        <h3>Application received.</h3>
        <p>We review every application personally and will be in touch within 2-3 business days. Thank you for opening your home.</p>
      </div>`;
    document.getElementById('fa-close').addEventListener('click', closeModal);
    card.querySelectorAll('.fa-radio-opt').forEach(opt => {
      opt.addEventListener('click', () => {
        const inp = opt.querySelector('input'); inp.checked = true;
        card.querySelectorAll(`.fa-radio-opt input[name="${inp.name}"]`).forEach(i=>i.closest('.fa-radio-opt').classList.remove('selected'));
        opt.classList.add('selected');
      });
    });
    card.querySelectorAll('.fa-multi-opt').forEach(opt => {
      opt.addEventListener('click', () => {
        opt.classList.toggle('selected');
        const wrap = opt.closest('.fa-field');
        const vals = [...wrap.querySelectorAll('.fa-multi-opt.selected')].map(o=>o.dataset.val);
        wrap.querySelector('input[type=hidden]').value = vals.join(',');
      });
    });
    card.querySelectorAll('.fa-check-opt input[type=checkbox]').forEach(inp => {
      inp.addEventListener('change', ()=>inp.closest('.fa-check-opt').classList.toggle('selected',inp.checked));
    });
    document.getElementById('fa-back')?.addEventListener('click', ()=>{ collectStep(); step--; renderStep(card); });
    document.getElementById('fa-next').addEventListener('click', async ()=>{
      if (!validateStep(card)) return;
      collectStep();
      if (step < STEPS.length-1) { step++; renderStep(card); card.scrollTop=0; }
      else { await submitForm(card); }
    });
  }

  function collectStep() {
    const card = document.getElementById('fa-card'); if (!card) return;
    STEPS[step].fields.forEach(f => {
      if (f.type==='multiselect') { const h=card.querySelector(`input[type=hidden][name="${f.key}"]`); if(h) data[f.key]=h.value?h.value.split(','):[];}
      else if (f.type==='checkbox') { const i=card.querySelector(`input[name="${f.key}"]`); if(i) data[f.key]=i.checked; }
      else { const i=card.querySelector(`[name="${f.key}"]`); if(i) data[f.key]=i.value.trim(); }
    });
  }

  function validateStep(card) {
    const s=STEPS[step]; const err=document.getElementById('fa-error'); const missing=[];
    s.fields.forEach(f=>{
      if(!f.required) return;
      if(f.type==='multiselect'){const h=card.querySelector(`input[type=hidden][name="${f.key}"]`);if(!h?.value)missing.push(f.label);}
      else if(f.type==='checkbox'){const i=card.querySelector(`input[name="${f.key}"]`);if(!i?.checked)missing.push(f.label);}
      else{const i=card.querySelector(`[name="${f.key}"]`);if(!i?.value?.trim())missing.push(f.label);}
    });
    if(missing.length){err.textContent='Please complete: '+missing.join(', ');err.style.display='block';return false;}
    err.style.display='none'; return true;
  }

  async function submitForm(card) {
    if(submitting) return; submitting=true;
    const btn=document.getElementById('fa-next');
    if(btn){btn.disabled=true;btn.textContent='Submitting...';}
    try {
      const payload={...data};
      Object.keys(payload).forEach(k=>{if(Array.isArray(payload[k]))payload[k]=payload[k].join(', ');});
      const res=await fetch('/api/foster/apply',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const d=await res.json().catch(()=>({}));
      if(!res.ok) throw new Error(d.error||'Submission failed.');
      ['fa-header','fa-progress','fa-step-label','fa-body','fa-footer','fa-error'].forEach(id=>{const el=document.getElementById(id)||card.querySelector('.'+id);if(el)el.style.display='none';});
      document.getElementById('fa-success').style.display='block';
      setTimeout(closeModal,6000);
    } catch(e) {
      const err=document.getElementById('fa-error');
      if(err){err.textContent=e.message||'Submission failed. Please try again.';err.style.display='block';}
      submitting=false;
      if(btn){btn.disabled=false;btn.textContent='Submit Application';}
    }
  }

  function openModal() {
    ensureStyles(); step=0; data={}; submitting=false;
    let backdrop=document.getElementById('fa-backdrop');
    if(!backdrop){
      backdrop=document.createElement('div');backdrop.id='fa-backdrop';backdrop.className='fa-backdrop';
      backdrop.setAttribute('role','dialog');backdrop.setAttribute('aria-modal','true');
      backdrop.addEventListener('click',e=>{if(e.target===backdrop)closeModal();});
      document.body.appendChild(backdrop);
    }
    let card=document.getElementById('fa-card');
    if(!card){card=document.createElement('div');card.id='fa-card';card.className='fa-card';backdrop.appendChild(card);}
    renderStep(card);
    backdrop.classList.add('is-open'); document.body.style.overflow='hidden';
    document.addEventListener('keydown',escHandler);
  }

  function closeModal() {
    const b=document.getElementById('fa-backdrop');if(b)b.classList.remove('is-open');
    document.body.style.overflow=''; document.removeEventListener('keydown',escHandler);
  }

  function escHandler(e){if(e.key==='Escape')closeModal();}

  window.FosterModal={open:openModal,close:closeModal};

  document.addEventListener('click',e=>{
    const foster=e.target.closest('[data-action="foster"]');
    if(foster){e.preventDefault();openModal();return;}
    const donate=e.target.closest('[data-action="donate"]');
    if(donate&&window.DonateModal){e.preventDefault();window.DonateModal.open(e);}
  });
})();

// Newsletter
(() => {
  document.addEventListener('submit',async e=>{
    const form=e.target.closest('[data-newsletter-form]');if(!form)return;e.preventDefault();
    const email=form.querySelector('input[type="email"]')?.value?.trim();
    const status=form.querySelector('[data-newsletter-status]');
    if(status)status.textContent='Subscribing...';
    try{
      const res=await fetch('/api/newsletter/subscribe',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email})});
      if(!res.ok)throw new Error();
      if(status)status.textContent='You are subscribed.';form.reset();
    }catch{if(status)status.textContent='Could not subscribe. Please try again.';}
  });
})();
