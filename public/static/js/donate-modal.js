/**
 * donate-modal.js — Companions of CPAS
 * In-modal Stripe PaymentElement. NO redirect. NO hosted checkout.
 *
 * One-time:  POST /api/donations/intent {mode:'payment', amount_cents}
 *            → PaymentIntent client_secret → confirmPayment() in-modal
 *
 * Monthly:   POST /api/donations/intent {mode:'setup'}
 *            → SetupIntent client_secret → confirmSetup() in-modal
 *            → POST /api/donations/subscribe {payment_method_id, price_id}
 *
 * Tiers:     GET /api/donations/tiers (D1) — fallback to FALLBACK_TIERS
 * Email/NL:  Optional email + newsletter opt-in, not required
 */
(function () {
  'use strict';

  const STRIPE_PK       = 'pk_live_51SuGjiRi9zMPk3BPrxYMelFIUFUKfaAyB4AyihsoX4JtVQcOahYLkq7r9fqOc9L36bj4qZLzA3MojyVSsWdu7LKh008ImEpNvR';
  const ENDPOINT_TIERS  = '/api/donations/tiers';
  const ENDPOINT_INTENT = '/api/donations/intent';
  const ENDPOINT_SUB    = '/api/donations/subscribe';
  const ENDPOINT_AFTER  = '/api/donations/after-payment';

  const FALLBACK_TIERS = [
    { label: 'A Part of the Pack', amount_cents: 2500,  stripe_price_id_onetime: 'price_1ThrHaRGnRsvqnfijU6E7R1M', stripe_price_id_monthly: 'price_1ThrU5RGnRsvqnfizGD90XTT' },
    { label: 'Loyal Companion',    amount_cents: 5000,  stripe_price_id_onetime: 'price_1ThrJ5RGnRsvqnfikaZXLCJw', stripe_price_id_monthly: 'price_1ThrUERGnRsvqnfidwoPOnaY' },
    { label: 'Pack Leader',        amount_cents: 10000, stripe_price_id_onetime: 'price_1ThrKeRGnRsvqnfiR670gQLX', stripe_price_id_monthly: 'price_1ThrULRGnRsvqnfibCHP1koD' },
    { label: 'Guardian Angel',     amount_cents: 25000, stripe_price_id_onetime: 'price_1ThrLSRGnRsvqnfiKwqD9Vsv', stripe_price_id_monthly: 'price_1ThrUSRGnRsvqnfimLPEY4wV' },
  ];

  const APPEARANCE = {
    theme: 'night',
    variables: {
      colorPrimary: '#7c3aed', colorBackground: '#0d1120',
      colorText: '#f4efe8', colorTextSecondary: '#9ca3af',
      colorTextPlaceholder: '#4b5563', colorDanger: '#f87171',
      fontFamily: "'DM Sans', system-ui, sans-serif", borderRadius: '8px', spacingUnit: '4px',
    },
    rules: {
      '.Input': { border: '1.5px solid rgba(255,255,255,0.1)', boxShadow: 'none', padding: '10px 12px', fontSize: '14px' },
      '.Input:focus': { border: '1.5px solid #7c3aed', boxShadow: '0 0 0 3px rgba(124,58,237,0.18)' },
      '.Label': { fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b7280', marginBottom: '6px' },
      '.Tab': { border: '1.5px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.04)' },
      '.Tab--selected': { border: '1.5px solid #7c3aed', background: 'rgba(124,58,237,0.14)' },
    },
  };

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,700;1,9..144,400&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
    #dm-overlay{position:fixed;inset:0;z-index:9999;background:rgba(4,6,15,0.86);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;padding:16px;animation:dm-fade 180ms ease}
    @keyframes dm-fade{from{opacity:0}to{opacity:1}}
    #dm-modal{width:min(100%,460px);max-height:92vh;overflow-y:auto;background:#090d18;border:1px solid rgba(255,255,255,0.09);border-radius:20px;box-shadow:0 40px 100px rgba(0,0,0,0.65),0 0 0 1px rgba(124,58,237,0.14);color:#f4efe8;font-family:'DM Sans',system-ui,sans-serif;scrollbar-width:none;animation:dm-up 260ms cubic-bezier(.16,1,.3,1)}
    #dm-modal::-webkit-scrollbar{display:none}
    #dm-modal *{box-sizing:border-box}
    @keyframes dm-up{from{transform:translateY(18px) scale(.98);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}
    .dm-header{position:relative;padding:28px 28px 0}
    .dm-close{position:absolute;top:18px;right:18px;width:30px;height:30px;display:flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,0.1);border-radius:999px;background:rgba(255,255,255,0.06);color:#9ca3af;cursor:pointer;font-size:16px;line-height:1;transition:background 150ms,color 150ms}
    .dm-close:hover{background:rgba(255,255,255,0.12);color:#f4efe8}
    .dm-eyebrow{margin-bottom:7px;color:#a78bfa;font-size:10px;font-weight:800;letter-spacing:.14em;text-transform:uppercase}
    .dm-title{margin:0;font-family:'Fraunces',Georgia,serif;font-size:1.68rem;font-weight:700;letter-spacing:-.025em;line-height:1.08;color:#f4efe8}
    .dm-sub{margin:8px 0 0;color:#a9afbd;font-size:.88rem;line-height:1.5}
    .dm-body{padding:20px 28px 0}
    .dm-label{margin:0 0 9px;color:#727989;font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;display:block}
    .dm-freq{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:18px;padding:4px;border:1px solid rgba(255,255,255,0.08);border-radius:12px;background:rgba(255,255,255,0.035)}
    .dm-freq button{min-height:40px;border:1px solid transparent;border-radius:9px;background:transparent;color:#a9afbd;cursor:pointer;font-family:inherit;font-size:.86rem;font-weight:700;transition:all 150ms}
    .dm-freq button.active{border-color:rgba(124,58,237,0.7);background:rgba(124,58,237,0.18);color:#ddd6fe}
    .dm-tiers{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px}
    .dm-tier{background:rgba(255,255,255,0.04);border:1.5px solid rgba(255,255,255,0.08);border-radius:11px;padding:14px;cursor:pointer;transition:all .14s;text-align:left;font-family:inherit}
    .dm-tier:hover{border-color:rgba(124,58,237,.4);background:rgba(124,58,237,.06)}
    .dm-tier.active{border-color:#7c3aed;background:rgba(124,58,237,.14);box-shadow:0 0 0 1px rgba(124,58,237,.25)}
    .dm-tier-amt{font-family:'Fraunces',Georgia,serif;font-size:1.2rem;font-weight:700;color:#f4efe8;display:block;margin-bottom:2px}
    .dm-tier.active .dm-tier-amt{color:#c4b5fd}
    .dm-tier-lbl{font-size:.74rem;color:#6b7280;font-weight:500}
    .dm-custom-wrap{position:relative;margin-bottom:18px}
    .dm-dollar{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:#7c8598;font-weight:800;pointer-events:none;font-size:.9rem}
    .dm-custom{width:100%;min-height:42px;padding:10px 12px 10px 28px;border:1.5px solid rgba(255,255,255,0.09);border-radius:10px;outline:none;appearance:textfield;background:rgba(255,255,255,0.045);color:#f4efe8;font-family:inherit;font-size:.9rem;font-weight:700;transition:border-color 150ms,box-shadow 150ms}
    .dm-custom::-webkit-inner-spin-button{-webkit-appearance:none}
    .dm-custom::placeholder{color:#4b5563}
    .dm-custom:focus{border-color:#7c3aed;box-shadow:0 0 0 3px rgba(124,58,237,.18)}
    .dm-divider{height:1px;background:rgba(255,255,255,0.07);margin:4px 0 20px}
    .dm-contact{margin-bottom:16px}
    .dm-email{width:100%;min-height:42px;padding:10px 12px;border:1.5px solid rgba(255,255,255,0.09);border-radius:10px;outline:none;background:rgba(255,255,255,0.045);color:#f4efe8;font-family:inherit;font-size:.88rem;font-weight:500;transition:border-color 150ms,box-shadow 150ms;margin-bottom:10px}
    .dm-email::placeholder{color:#4b5563}
    .dm-email:focus{border-color:#7c3aed;box-shadow:0 0 0 3px rgba(124,58,237,.18)}
    .dm-nl-row{display:flex;align-items:flex-start;gap:10px;padding:11px 12px;border:1px solid rgba(255,255,255,0.07);border-radius:10px;background:rgba(255,255,255,0.03);cursor:pointer}
    .dm-nl-row input[type=checkbox]{width:16px;height:16px;flex-shrink:0;margin-top:1px;accent-color:#7c3aed;cursor:pointer}
    .dm-nl-lbl{font-size:.8rem;color:#9ca3af;line-height:1.45;cursor:pointer}
    .dm-nl-lbl strong{color:#d1d5db;font-weight:600;display:block;margin-bottom:1px}
    .dm-stripe-wrap{margin-bottom:18px}
    .dm-skeleton{height:130px;border-radius:10px;background:linear-gradient(90deg,rgba(255,255,255,.04) 25%,rgba(255,255,255,.08) 50%,rgba(255,255,255,.04) 75%);background-size:200% 100%;animation:dm-shimmer 1.4s infinite}
    @keyframes dm-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
    .dm-footer{padding:0 28px 26px}
    .dm-submit{width:100%;min-height:48px;border:0;border-radius:12px;background:linear-gradient(135deg,#6d28d9,#7c3aed);color:#fff;cursor:pointer;font-family:inherit;font-size:.95rem;font-weight:900;letter-spacing:-.01em;transition:opacity 150ms,transform 120ms;position:relative;overflow:hidden}
    .dm-submit:hover:not(:disabled){opacity:.9;transform:translateY(-1px)}
    .dm-submit:disabled{opacity:.5;cursor:not-allowed;transform:none}
    .dm-submit.loading::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.15),transparent);animation:dm-shine 1.1s infinite}
    @keyframes dm-shine{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
    .dm-error{display:none;margin-top:11px;padding:10px 12px;border:1px solid rgba(248,113,113,.25);border-radius:10px;background:rgba(248,113,113,.09);color:#fca5a5;font-size:.82rem;line-height:1.4}
    .dm-secure{margin-top:11px;color:#4b5563;text-align:center;font-size:.72rem;line-height:1.4}
    .dm-success{display:none;text-align:center;padding:48px 28px}
    .dm-success-icon{width:56px;height:56px;border-radius:50%;margin:0 auto 18px;background:rgba(124,58,237,.15);border:1.5px solid rgba(124,58,237,.35);display:flex;align-items:center;justify-content:center;font-size:1.4rem;color:#a78bfa}
    .dm-success h3{font-family:'Fraunces',Georgia,serif;font-size:1.3rem;color:#f4efe8;margin:0 0 8px}
    .dm-success p{font-size:.86rem;color:#9ca3af;margin:0;line-height:1.5}
    @media(max-width:460px){#dm-overlay{align-items:flex-end;padding:8px}#dm-modal{border-radius:18px 18px 0 0;max-height:96vh}.dm-header{padding:22px 20px 0}.dm-body{padding:18px 20px 0}.dm-footer{padding:0 20px 24px}.dm-tiers{grid-template-columns:1fr 1fr}}
  `;

  let tiers = [], selectedAmount = 25, frequency = 'one_time';
  let stripeInst = null, elements = null, isSubmitting = false;

  function money(v) { const n = Number(v); return Number.isFinite(n) ? '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '$0'; }
  function getAmount() { const c = document.getElementById('dm-custom'); const v = c && c.value ? Number(c.value) : 0; return v > 0 ? v : selectedAmount; }
  function getActiveTier() { return tiers.find(t => t.amount_cents === getAmount() * 100) || null; }

  function injectStyles() {
    if (document.getElementById('dm-styles')) return;
    const s = document.createElement('style'); s.id = 'dm-styles'; s.textContent = CSS; document.head.appendChild(s);
  }

  function loadStripe() {
    return new Promise((res, rej) => {
      if (window.Stripe) return res(window.Stripe);
      const s = document.createElement('script'); s.src = 'https://js.stripe.com/v3/';
      s.onload = () => res(window.Stripe); s.onerror = rej; document.head.appendChild(s);
    });
  }

  async function fetchTiers() {
    try {
      const r = await fetch(ENDPOINT_TIERS); if (!r.ok) throw 0;
      const d = await r.json(); if (Array.isArray(d.tiers) && d.tiers.length) return d.tiers;
    } catch {}
    return FALLBACK_TIERS;
  }

  function buildHTML() {
    const tierBtns = tiers.map((t, i) => `
      <button type="button" class="dm-tier${i===0?' active':''}" data-idx="${i}" data-amount="${t.amount_cents/100}">
        <span class="dm-tier-amt">${money(t.amount_cents/100)}</span>
        <span class="dm-tier-lbl">${t.label}</span>
      </button>`).join('');

    return `
      <div class="dm-header">
        <button class="dm-close" id="dm-close" type="button" aria-label="Close">&times;</button>
        <div class="dm-eyebrow">Companions of CPAS</div>
        <h2 class="dm-title">Support Our Mission</h2>
        <p class="dm-sub">Your gift helps dogs at Caddo Parish Animal Services move from crisis to care.</p>
      </div>
      <div class="dm-body">
        <span class="dm-label">Gift frequency</span>
        <div class="dm-freq">
          <button type="button" class="active" data-freq="one_time">One-time</button>
          <button type="button" data-freq="monthly">Monthly</button>
        </div>
        <span class="dm-label">Choose an amount</span>
        <div class="dm-tiers">${tierBtns}</div>
        <div class="dm-custom-wrap">
          <span class="dm-dollar">$</span>
          <input id="dm-custom" class="dm-custom" type="number" min="1" max="50000" step="1" inputmode="decimal" placeholder="Custom amount" autocomplete="off" />
        </div>
        <div class="dm-divider"></div>
        <div class="dm-contact">
          <span class="dm-label">Receipt &amp; updates <span style="color:#4b5563;font-weight:500;text-transform:none;letter-spacing:0">— optional</span></span>
          <input id="dm-email" class="dm-email" type="email" placeholder="Email address" autocomplete="email" />
          <label class="dm-nl-row" for="dm-newsletter">
            <input type="checkbox" id="dm-newsletter" />
            <span class="dm-nl-lbl"><strong>Subscribe to updates</strong>Occasional news on animals helped. No spam.</span>
          </label>
        </div>
        <div class="dm-divider"></div>
        <span class="dm-label">Payment details</span>
        <div class="dm-stripe-wrap">
          <div id="dm-skeleton" class="dm-skeleton"></div>
          <div id="dm-mount" style="display:none"></div>
        </div>
      </div>
      <div class="dm-footer">
        <button class="dm-submit" id="dm-submit" type="button" disabled>Donate ${money(selectedAmount)}</button>
        <div class="dm-error" id="dm-error"></div>
        <div class="dm-secure">Secured by Stripe &middot; PCI compliant &middot; Receipt emailed when payment succeeds</div>
      </div>
      <div class="dm-success" id="dm-success">
        <div class="dm-success-icon">&#10003;</div>
        <h3>Thank you for your gift.</h3>
        <p id="dm-success-msg">Every dollar helps bridge the gap from urgent to safe.</p>
      </div>`;
  }

  async function initElements() {
    try {
      const Stripe = await loadStripe();
      if (!stripeInst) stripeInst = Stripe(STRIPE_PK);
      const isMonthly = frequency === 'monthly';
      const res = await fetch(ENDPOINT_INTENT, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: isMonthly ? 'setup' : 'payment', amount_cents: Math.round(getAmount() * 100), currency: 'usd' }),
      });
      const data = await res.json();
      if (!data.client_secret) throw new Error(data.error || 'Could not initialize payment.');
      elements = stripeInst.elements({ clientSecret: data.client_secret, appearance: APPEARANCE });
      const pe = elements.create('payment', { layout: { type: 'tabs', defaultCollapsed: false }, fields: { billingDetails: { name: 'auto', email: 'never' } } });
      const skeleton = document.getElementById('dm-skeleton');
      const mount = document.getElementById('dm-mount');
      pe.on('ready', () => {
        if (skeleton) skeleton.style.display = 'none';
        if (mount) mount.style.display = 'block';
        const btn = document.getElementById('dm-submit');
        if (btn) { btn.disabled = false; updateLabel(); }
      });
      pe.mount('#dm-mount');
    } catch (err) {
      const sk = document.getElementById('dm-skeleton');
      if (sk) { sk.style.animation = 'none'; sk.style.background = 'rgba(248,113,113,.07)'; sk.innerHTML = '<div style="padding:16px;color:#fca5a5;font-size:.82rem;text-align:center">Could not load payment form. <a href="/donate" style="color:#a78bfa;text-decoration:underline">Try the donate page</a></div>'; }
    }
  }

  async function submit() {
    if (isSubmitting || !elements || !stripeInst) return;
    const amt = getAmount();
    if (!amt || amt < 1) { setErr('Please select or enter an amount.'); return; }
    setErr('');
    isSubmitting = true;
    const btn = document.getElementById('dm-submit');
    if (btn) { btn.disabled = true; btn.classList.add('loading'); btn.textContent = 'Processing...'; }
    const email = (document.getElementById('dm-email')?.value || '').trim() || null;
    const nlOptIn = document.getElementById('dm-newsletter')?.checked || false;
    const isMonthly = frequency === 'monthly';
    const tier = getActiveTier();
    const amountCents = Math.round(amt * 100);
    try {
      if (!isMonthly) {
        const { error } = await stripeInst.confirmPayment({
          elements, redirect: 'if_required',
          confirmParams: { return_url: `${location.origin}/donate?success=1`, payment_method_data: { billing_details: { email: email || undefined } } },
        });
        if (error) throw new Error(error.message);
        if (email) fetch(ENDPOINT_AFTER, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ donor_email: email, nl_opt_in: nlOptIn, amount_cents: amountCents }) }).catch(() => {});
        showSuccess(email, false);
      } else {
        const { error, setupIntent } = await stripeInst.confirmSetup({
          elements, redirect: 'if_required',
          confirmParams: { return_url: `${location.origin}/donate?success=1`, payment_method_data: { billing_details: { email: email || undefined } } },
        });
        if (error) throw new Error(error.message);
        const subRes = await fetch(ENDPOINT_SUB, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payment_method_id: setupIntent.payment_method, price_id: tier?.stripe_price_id_monthly || null, amount_cents: tier ? null : amountCents, donor_email: email, nl_opt_in: nlOptIn }),
        });
        const subData = await subRes.json();
        if (!subData.success) throw new Error(subData.error || 'Subscription could not be created.');
        showSuccess(email, true);
      }
    } catch (err) {
      setErr(err.message || 'Payment failed. Please try again.');
      isSubmitting = false;
      if (btn) { btn.disabled = false; btn.classList.remove('loading'); updateLabel(); }
    }
  }

  function updateLabel() {
    const btn = document.getElementById('dm-submit');
    if (!btn || btn.disabled) return;
    btn.textContent = `Donate ${money(getAmount())}${frequency === 'monthly' ? '/mo' : ''}`;
  }
  function setErr(msg) { const el = document.getElementById('dm-error'); if (!el) return; el.textContent = msg || ''; el.style.display = msg ? 'block' : 'none'; }
  function showSuccess(email, isMonthly) {
    const modal = document.getElementById('dm-modal');
    if (!modal) return;
    [...modal.children].forEach(el => { el.style.display = el.id === 'dm-success' ? 'block' : 'none'; });
    const msg = document.getElementById('dm-success-msg');
    if (msg) msg.textContent = isMonthly
      ? (email ? `Your monthly gift is active. Confirmation headed to ${email}.` : 'Your monthly gift is active. Thank you.')
      : (email ? `Receipt headed to ${email}. Every dollar helps bridge the gap from urgent to safe.` : 'Every dollar helps bridge the gap from urgent to safe.');
    setTimeout(close, 6000);
  }

  function reinitElements() {
    elements = null;
    const sk = document.getElementById('dm-skeleton'); const mt = document.getElementById('dm-mount');
    if (sk) { sk.style.display = 'block'; sk.style.animation = ''; sk.style.background = ''; sk.innerHTML = ''; }
    if (mt) { mt.style.display = 'none'; mt.innerHTML = ''; }
    const btn = document.getElementById('dm-submit'); if (btn) { btn.disabled = true; btn.textContent = 'Loading...'; }
    initElements();
  }

  function open(event) {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    if (document.getElementById('dm-overlay')) return;
    injectStyles();
    selectedAmount = 25; frequency = 'one_time'; elements = null; isSubmitting = false;
    const tiersPromise = fetchTiers();
    loadStripe().catch(() => {});
    const overlay = document.createElement('div');
    overlay.id = 'dm-overlay'; overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true');
    const modal = document.createElement('div'); modal.id = 'dm-modal';
    modal.innerHTML = '<div style="padding:40px 28px"><div style="height:28px;width:70%;border-radius:6px;background:rgba(255,255,255,.06);margin-bottom:20px;animation:dm-shimmer 1.4s infinite;background-size:200% 100%"></div><div style="height:44px;border-radius:10px;background:rgba(255,255,255,.06);margin-bottom:10px;animation:dm-shimmer 1.4s infinite;background-size:200% 100%"></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:18px"><div style="height:66px;border-radius:10px;background:rgba(255,255,255,.06);animation:dm-shimmer 1.4s infinite;background-size:200% 100%"></div><div style="height:66px;border-radius:10px;background:rgba(255,255,255,.06);animation:dm-shimmer 1.4s infinite;background-size:200% 100%"></div><div style="height:66px;border-radius:10px;background:rgba(255,255,255,.06);animation:dm-shimmer 1.4s infinite;background-size:200% 100%"></div><div style="height:66px;border-radius:10px;background:rgba(255,255,255,.06);animation:dm-shimmer 1.4s infinite;background-size:200% 100%"></div></div><div style="height:130px;border-radius:10px;background:rgba(255,255,255,.06);animation:dm-shimmer 1.4s infinite;background-size:200% 100%"></div></div>';
    overlay.appendChild(modal); document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); } }, { once: true });
    tiersPromise.then(loaded => {
      tiers = loaded; if (tiers.length) selectedAmount = tiers[0].amount_cents / 100;
      if (!document.getElementById('dm-overlay')) return;
      modal.innerHTML = buildHTML(); bindEvents(); initElements();
    });
  }

  function close() {
    const el = document.getElementById('dm-overlay'); if (el) el.remove();
    elements = null; isSubmitting = false;
  }

  function bindEvents() {
    document.getElementById('dm-close').addEventListener('click', close);
    document.querySelectorAll('.dm-freq button').forEach(btn => {
      btn.addEventListener('click', () => {
        frequency = btn.dataset.freq;
        document.querySelectorAll('.dm-freq button').forEach(b => b.classList.toggle('active', b === btn));
        updateLabel(); reinitElements();
      });
    });
    document.querySelectorAll('.dm-tier').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.dm-tier').forEach(b => b.classList.remove('active'));
        btn.classList.add('active'); selectedAmount = Number(btn.dataset.amount);
        const c = document.getElementById('dm-custom'); if (c) c.value = '';
        updateLabel();
      });
    });
    document.getElementById('dm-custom')?.addEventListener('input', function () {
      document.querySelectorAll('.dm-tier').forEach(b => b.classList.remove('active'));
      selectedAmount = Number(this.value) || 0; updateLabel();
    });
    document.getElementById('dm-submit').addEventListener('click', submit);
  }

  function wireButtons() {
    document.querySelectorAll('[data-donate],[data-action="donate"]').forEach(el => {
      if (el.dataset.dmWired === '1') return; el.dataset.dmWired = '1';
      el.addEventListener('click', open);
    });
  }

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', wireButtons); } else { wireButtons(); }
  window.DonateModal = { open, close };
  window.openDonateModal = open;
})();
