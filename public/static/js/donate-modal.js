/**
 * donate-modal.js — Companions of CPAS
 * Stripe PaymentElement (real Elements, not hosted checkout redirect).
 * Trigger: [data-donate] or DonateModal.open()
 *
 * Flow:
 *   1. Modal opens → POST /api/donations/checkout → get client_secret
 *   2. Mount Stripe PaymentElement into modal
 *   3. Confirm payment in-modal → success state
 */
(function () {
  'use strict';

  const STRIPE_PK   = 'pk_live_51SuGjiRi9zMPk3BPrxYMelFIUFUKfaAyB4AyihsoX4JtVQcOahYLkq7r9fqOc9L36bj4qZLzA3MojyVSsWdu7LKh008ImEpNvR';
  const ENDPOINT    = '/api/donations/checkout';
  const AMOUNTS     = [10, 25, 50, 100, 250];

  const CAMPAIGNS = [
    { id: 'campaign_companions_second_chances_2026', label: 'Second Chance Fund',   sub: 'Urgent rescue & transport',  raised: 1835,  goal: 10000 },
    { id: 'camp_medical',                            label: 'Emergency Medical',     sub: 'Vet care for critical dogs', raised: 1240,  goal: 3000  },
    { id: 'camp_transport',                          label: 'Transport Support',     sub: 'Moving dogs to safety',     raised: 370,   goal: 1000  },
    { id: 'camp_food',                               label: 'Feed the Shelter',      sub: 'Keep dogs nourished',       raised: 820,   goal: 1500  },
  ];

  /* ─── Stripe appearance — matches site dark theme ───────────────────── */
  const STRIPE_APPEARANCE = {
    theme: 'night',
    variables: {
      colorPrimary:          '#7c3aed',
      colorBackground:       '#0d1322',
      colorText:             '#f0ece6',
      colorTextSecondary:    '#9ca3af',
      colorTextPlaceholder:  '#6b7280',
      colorDanger:           '#f87171',
      fontFamily:            "'DM Sans', system-ui, sans-serif",
      borderRadius:          '8px',
      spacingUnit:           '4px',
    },
    rules: {
      '.Input': {
        border:     '1.5px solid rgba(255,255,255,0.1)',
        boxShadow:  'none',
        padding:    '10px 12px',
        fontSize:   '14px',
      },
      '.Input:focus': {
        border:    '1.5px solid #7c3aed',
        boxShadow: '0 0 0 3px rgba(124,58,237,0.2)',
      },
      '.Label': {
        fontSize:      '11px',
        fontWeight:    '700',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color:         '#9ca3af',
        marginBottom:  '5px',
      },
      '.Tab': {
        border:     '1.5px solid rgba(255,255,255,0.1)',
        background: 'rgba(255,255,255,0.04)',
      },
      '.Tab--selected': {
        border:     '1.5px solid #7c3aed',
        background: 'rgba(124,58,237,0.12)',
      },
      '.Block': {
        background: 'rgba(255,255,255,0.03)',
        border:     '1px solid rgba(255,255,255,0.08)',
      }
    }
  };

  /* ─── CSS ────────────────────────────────────────────────────────────── */
  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@400;500;600;700&display=swap');

    #dm-overlay {
      position: fixed; inset: 0; z-index: 9999;
      background: rgba(4, 6, 15, 0.85);
      backdrop-filter: blur(8px);
      display: flex; align-items: center; justify-content: center;
      padding: 16px;
      animation: dm-fade .2s ease;
    }
    @keyframes dm-fade { from { opacity:0 } to { opacity:1 } }

    #dm-modal {
      background: #090d18;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 20px;
      width: 100%; max-width: 480px;
      max-height: 92vh;
      overflow-y: auto;
      box-shadow: 0 40px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(124,58,237,0.15);
      font-family: 'DM Sans', system-ui, sans-serif;
      animation: dm-up .3s cubic-bezier(.16,1,.3,1);
      scrollbar-width: none;
    }
    #dm-modal::-webkit-scrollbar { display: none; }
    @keyframes dm-up {
      from { transform: translateY(24px) scale(.97); opacity:0 }
      to   { transform: translateY(0)    scale(1);   opacity:1 }
    }

    /* Header */
    #dm-modal .dm-header {
      padding: 26px 26px 0;
      position: relative;
    }
    #dm-modal .dm-close {
      position: absolute; top: 20px; right: 20px;
      width: 28px; height: 28px; border-radius: 50%;
      background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1);
      color: #9ca3af; cursor: pointer; font-size: 14px;
      display: flex; align-items: center; justify-content: center;
      transition: background .15s, color .15s; line-height: 1;
    }
    #dm-modal .dm-close:hover { background: rgba(255,255,255,0.13); color: #f0ece6; }
    #dm-modal .dm-eyebrow {
      font-size: 10px; font-weight: 700; letter-spacing: .12em;
      text-transform: uppercase; color: #a78bfa; margin-bottom: 6px;
    }
    #dm-modal .dm-title {
      font-family: 'Fraunces', Georgia, serif;
      font-size: 1.55rem; font-weight: 700; color: #f0ece6;
      margin: 0 0 4px; letter-spacing: -.02em; line-height: 1.15;
    }
    #dm-modal .dm-sub {
      font-size: .85rem; color: #9ca3af; margin: 0 0 20px;
    }

    /* Campaign selector */
    #dm-modal .dm-section-label {
      font-size: 10px; font-weight: 700; letter-spacing: .1em;
      text-transform: uppercase; color: #6b7280; margin-bottom: 8px;
      padding: 0 26px;
    }
    #dm-modal .dm-campaigns {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: 8px; padding: 0 26px; margin-bottom: 6px;
    }
    #dm-modal .dm-camp {
      background: rgba(255,255,255,0.04);
      border: 1.5px solid rgba(255,255,255,0.08);
      border-radius: 10px; padding: 10px 12px;
      cursor: pointer; transition: all .15s; text-align: left;
    }
    #dm-modal .dm-camp:hover { border-color: rgba(124,58,237,.4); background: rgba(124,58,237,.06); }
    #dm-modal .dm-camp.active {
      border-color: #7c3aed;
      background: rgba(124,58,237,.12);
      box-shadow: 0 0 0 1px rgba(124,58,237,.3);
    }
    #dm-modal .dm-camp-label {
      font-size: .82rem; font-weight: 600; color: #f0ece6;
      margin-bottom: 2px; line-height: 1.2;
    }
    #dm-modal .dm-camp-sub {
      font-size: .72rem; color: #6b7280; line-height: 1.3;
    }
    #dm-modal .dm-camp-progress {
      margin-top: 7px; height: 3px;
      background: rgba(255,255,255,0.07); border-radius: 99px; overflow: hidden;
    }
    #dm-modal .dm-camp-fill {
      height: 100%; border-radius: 99px;
      background: linear-gradient(90deg, #7c3aed, #a78bfa);
    }
    #dm-modal .dm-camp-stat {
      font-size: .68rem; color: #6b7280; margin-top: 4px;
    }
    #dm-modal .dm-camp-stat strong { color: #a78bfa; }

    /* Divider */
    #dm-modal .dm-divider {
      height: 1px; background: rgba(255,255,255,0.07);
      margin: 18px 26px;
    }

    /* Amount grid */
    #dm-modal .dm-amounts {
      display: grid; grid-template-columns: repeat(5,1fr);
      gap: 7px; padding: 0 26px; margin-bottom: 8px;
    }
    #dm-modal .dm-amt {
      background: rgba(255,255,255,0.04);
      border: 1.5px solid rgba(255,255,255,0.08);
      border-radius: 8px; padding: 9px 4px;
      font-size: .88rem; font-weight: 600; color: #f0ece6;
      cursor: pointer; transition: all .12s; text-align: center;
      font-family: 'DM Sans', system-ui, sans-serif;
    }
    #dm-modal .dm-amt:hover { border-color: rgba(124,58,237,.5); background: rgba(124,58,237,.08); }
    #dm-modal .dm-amt.active { border-color: #7c3aed; background: rgba(124,58,237,.18); color: #c4b5fd; }

    #dm-modal .dm-custom-wrap {
      position: relative; padding: 0 26px; margin-bottom: 18px;
    }
    #dm-modal .dm-custom-wrap span {
      position: absolute; left: 38px; top: 50%; transform: translateY(-50%);
      color: #6b7280; font-weight: 600; pointer-events: none;
    }
    #dm-modal input.dm-custom {
      width: 100%; box-sizing: border-box;
      background: rgba(255,255,255,0.04);
      border: 1.5px solid rgba(255,255,255,0.08);
      border-radius: 8px; padding: 9px 12px 9px 24px;
      color: #f0ece6; font-size: .88rem;
      font-family: 'DM Sans', system-ui, sans-serif;
      outline: none; appearance: textfield;
    }
    #dm-modal input.dm-custom::-webkit-inner-spin-button { -webkit-appearance: none; }
    #dm-modal input.dm-custom::placeholder { color: #6b7280; }
    #dm-modal input.dm-custom:focus {
      border-color: #7c3aed;
      box-shadow: 0 0 0 3px rgba(124,58,237,.2);
    }

    /* Stripe mount */
    #dm-modal .dm-stripe-wrap {
      padding: 0 26px; margin-bottom: 18px; min-height: 0;
    }
    #dm-stripe-element { min-height: 44px; }

    /* Loading skeleton for Stripe mount */
    #dm-modal .dm-stripe-loading {
      height: 120px; border-radius: 8px;
      background: linear-gradient(90deg, rgba(255,255,255,.04) 25%, rgba(255,255,255,.08) 50%, rgba(255,255,255,.04) 75%);
      background-size: 200% 100%;
      animation: dm-shimmer 1.4s infinite;
    }
    @keyframes dm-shimmer {
      0%   { background-position: 200% 0 }
      100% { background-position: -200% 0 }
    }

    /* Submit */
    #dm-modal .dm-footer { padding: 0 26px 24px; }
    #dm-modal .dm-submit {
      width: 100%; padding: 13px;
      background: linear-gradient(135deg, #6d28d9, #7c3aed);
      border: none; border-radius: 10px;
      color: #fff; font-size: .95rem; font-weight: 700;
      font-family: 'DM Sans', system-ui, sans-serif;
      cursor: pointer; transition: opacity .15s, transform .12s;
      position: relative; overflow: hidden;
    }
    #dm-modal .dm-submit:hover:not(:disabled) { opacity: .88; transform: translateY(-1px); }
    #dm-modal .dm-submit:disabled { opacity: .5; cursor: not-allowed; transform: none; }
    #dm-modal .dm-submit.loading::after {
      content: ''; position: absolute; inset: 0;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,.15), transparent);
      animation: dm-shine 1.2s infinite;
    }
    @keyframes dm-shine {
      0%   { transform: translateX(-100%) }
      100% { transform: translateX(100%) }
    }

    #dm-modal .dm-error {
      margin-top: 10px; padding: 9px 12px;
      background: rgba(248,113,113,.1); border: 1px solid rgba(248,113,113,.25);
      border-radius: 8px; font-size: .82rem; color: #fca5a5;
      display: none;
    }
    #dm-modal .dm-secure {
      text-align: center; margin-top: 10px;
      font-size: .72rem; color: #4b4453;
    }

    /* Success state */
    #dm-modal .dm-success {
      text-align: center; padding: 48px 26px;
      display: none;
    }
    #dm-modal .dm-success-icon {
      width: 56px; height: 56px; border-radius: 50%;
      background: rgba(124,58,237,.15); border: 1.5px solid rgba(124,58,237,.3);
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 16px; font-size: 1.5rem;
    }
    #dm-modal .dm-success h3 {
      font-family: 'Fraunces', Georgia, serif;
      font-size: 1.3rem; color: #f0ece6; margin: 0 0 8px;
    }
    #dm-modal .dm-success p {
      font-size: .88rem; color: #9ca3af; margin: 0;
    }
  `;

  /* ─── State ──────────────────────────────────────────────────────────── */
  let selectedAmount   = 25;
  let selectedCampaign = CAMPAIGNS[0];
  let stripeInstance   = null;
  let elements         = null;
  let paymentElement   = null;
  let clientSecret     = null;

  /* ─── Helpers ────────────────────────────────────────────────────────── */
  function fmt(cents) {
    return '$' + (cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 });
  }
  function fmtDollars(d) {
    return '$' + Number(d).toLocaleString('en-US', { maximumFractionDigits: 0 });
  }

  function injectStyles() {
    if (document.getElementById('dm-styles')) return;
    const s = document.createElement('style');
    s.id = 'dm-styles';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function loadStripe() {
    return new Promise((resolve, reject) => {
      if (window.Stripe) return resolve(window.Stripe);
      const s = document.createElement('script');
      s.src = 'https://js.stripe.com/v3/';
      s.onload = () => resolve(window.Stripe);
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  /* ─── Build HTML ─────────────────────────────────────────────────────── */
  function buildHTML() {
    const campCards = CAMPAIGNS.map((c, i) => {
      const pct = Math.min(Math.round((c.raised / c.goal) * 100), 100);
      return `
        <button type="button" class="dm-camp${i === 0 ? ' active' : ''}" data-camp="${i}">
          <div class="dm-camp-label">${c.label}</div>
          <div class="dm-camp-sub">${c.sub}</div>
          <div class="dm-camp-progress"><div class="dm-camp-fill" style="width:${pct}%"></div></div>
          <div class="dm-camp-stat"><strong>${fmtDollars(c.raised)}</strong> of ${fmtDollars(c.goal)}</div>
        </button>`;
    }).join('');

    const amtBtns = AMOUNTS.map((a, i) =>
      `<button type="button" class="dm-amt${i === 1 ? ' active' : ''}" data-amount="${a}">$${a}</button>`
    ).join('');

    return `
      <div id="dm-overlay" role="dialog" aria-modal="true" aria-label="Donate to Companions of CPAS">
        <div id="dm-modal">

          <div class="dm-header">
            <button class="dm-close" id="dm-close" aria-label="Close">✕</button>
            <div class="dm-eyebrow">Companions of CPAS</div>
            <h2 class="dm-title">Support Our Mission</h2>
            <p class="dm-sub">Choose a campaign and make an impact today.</p>
          </div>

          <div class="dm-section-label">Where your gift goes</div>
          <div class="dm-campaigns">${campCards}</div>

          <div class="dm-divider"></div>

          <div class="dm-section-label" style="padding:0 26px;margin-bottom:8px;">Choose an amount</div>
          <div class="dm-amounts">${amtBtns}</div>
          <div class="dm-custom-wrap">
            <span>$</span>
            <input type="number" class="dm-custom" id="dm-custom" min="1" max="50000" placeholder="Custom amount" />
          </div>

          <div class="dm-divider" style="margin-top:0"></div>

          <div class="dm-section-label" style="padding:0 26px;margin-bottom:12px;">Payment details</div>
          <div class="dm-stripe-wrap">
            <div id="dm-stripe-loading" class="dm-stripe-loading"></div>
            <div id="dm-stripe-element" style="display:none"></div>
          </div>

          <div class="dm-footer">
            <button class="dm-submit" id="dm-submit" type="button">Donate $25</button>
            <div class="dm-error" id="dm-error"></div>
            <div class="dm-secure">🔒 Secured by Stripe · PCI compliant · Receipt emailed automatically</div>
          </div>

          <div class="dm-success" id="dm-success">
            <div class="dm-success-icon">✓</div>
            <h3>Thank you for your gift.</h3>
            <p>A receipt is on its way to your inbox. Every dollar helps bridge the gap from urgent to safe.</p>
          </div>

        </div>
      </div>`;
  }

  /* ─── Modal open/close ───────────────────────────────────────────────── */
  function open() {
    if (document.getElementById('dm-overlay')) return;
    injectStyles();

    const wrap = document.createElement('div');
    wrap.innerHTML = buildHTML();
    document.body.appendChild(wrap.firstElementChild);

    selectedAmount   = 25;
    selectedCampaign = CAMPAIGNS[0];
    clientSecret     = null;
    elements         = null;
    paymentElement   = null;

    bindEvents();
    initStripeElements();
  }

  function close() {
    const el = document.getElementById('dm-overlay');
    if (el) el.remove();
  }

  /* ─── Stripe Elements init ───────────────────────────────────────────── */
  async function initStripeElements() {
    try {
      const amountDollars = selectedAmount;
      // Create intent immediately so Elements loads while user fills form
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount:       amountDollars,
          donor_name:   '',
          donor_email:  '',
          campaign_id:  selectedCampaign.id,
          title:        `Donation — ${selectedCampaign.label}`,
          mode:         'elements', // signal to worker: return client_secret not checkout_url
        })
      });
      const data = await res.json();

      if (!data.client_secret && !data.checkout_url) {
        throw new Error(data.error || 'Could not initialize payment.');
      }

      // If worker returns checkout_url (hosted checkout mode), fall back gracefully
      if (data.checkout_url && !data.client_secret) {
        window._dmFallbackUrl = data.checkout_url;
        mountFallbackMode();
        return;
      }

      clientSecret = data.client_secret;

      const Stripe = await loadStripe();
      stripeInstance = Stripe(STRIPE_PK);
      elements = stripeInstance.elements({
        clientSecret,
        appearance: STRIPE_APPEARANCE,
      });

      paymentElement = elements.create('payment', {
        layout: { type: 'tabs', defaultCollapsed: false },
        fields: { billingDetails: { name: 'auto', email: 'auto' } },
      });

      const mountEl = document.getElementById('dm-stripe-element');
      const loadEl  = document.getElementById('dm-stripe-loading');
      if (!mountEl) return;

      paymentElement.on('ready', () => {
        if (loadEl) loadEl.style.display = 'none';
        mountEl.style.display = 'block';
      });

      paymentElement.mount('#dm-stripe-element');

    } catch (err) {
      const loadEl = document.getElementById('dm-stripe-loading');
      if (loadEl) {
        loadEl.style.background = 'rgba(248,113,113,.08)';
        loadEl.style.animation  = 'none';
        loadEl.innerHTML = `<div style="padding:16px;color:#fca5a5;font-size:.82rem;text-align:center">
          Unable to load payment form. <a href="/donate" style="color:#a78bfa;text-decoration:underline">Try the donate page →</a>
        </div>`;
      }
    }
  }

  function mountFallbackMode() {
    // Worker doesn't support client_secret yet — show a clean redirect button
    const loadEl = document.getElementById('dm-stripe-loading');
    if (loadEl) {
      loadEl.style.animation = 'none';
      loadEl.style.background = 'transparent';
      loadEl.style.height = 'auto';
      loadEl.innerHTML = `<div style="padding:12px 0;color:#9ca3af;font-size:.82rem;text-align:center">
        You'll complete payment securely on Stripe's hosted page.
      </div>`;
    }
    const submitBtn = document.getElementById('dm-submit');
    if (submitBtn) {
      submitBtn.dataset.fallback = '1';
    }
  }

  /* ─── Re-init when amount/campaign changes ───────────────────────────── */
  async function reinitElements() {
    if (!stripeInstance) return; // still loading or in fallback

    clientSecret   = null;
    paymentElement = null;

    const mountEl = document.getElementById('dm-stripe-element');
    const loadEl  = document.getElementById('dm-stripe-loading');
    if (mountEl) { mountEl.style.display = 'none'; mountEl.innerHTML = ''; }
    if (loadEl)  { loadEl.style.display = 'block'; }

    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount:      selectedAmount,
          donor_name:  '',
          donor_email: '',
          campaign_id: selectedCampaign.id,
          title:       `Donation — ${selectedCampaign.label}`,
          mode:        'elements',
        })
      });
      const data = await res.json();
      if (!data.client_secret) { mountFallbackMode(); return; }

      clientSecret = data.client_secret;
      elements = stripeInstance.elements({ clientSecret, appearance: STRIPE_APPEARANCE });
      paymentElement = elements.create('payment', {
        layout: { type: 'tabs', defaultCollapsed: false },
        fields: { billingDetails: { name: 'auto', email: 'auto' } },
      });
      paymentElement.on('ready', () => {
        if (loadEl)  loadEl.style.display  = 'none';
        if (mountEl) mountEl.style.display = 'block';
      });
      paymentElement.mount('#dm-stripe-element');
    } catch (e) { mountFallbackMode(); }
  }

  /* ─── Submit ─────────────────────────────────────────────────────────── */
  async function submit() {
    setError('');
    const btn = document.getElementById('dm-submit');

    // Fallback: hosted checkout redirect
    if (btn && btn.dataset.fallback === '1') {
      if (window._dmFallbackUrl) window.location.href = window._dmFallbackUrl;
      return;
    }

    if (!elements || !clientSecret) {
      return setError('Payment form is still loading. Please wait a moment.');
    }

    btn.disabled = true;
    btn.classList.add('loading');
    btn.textContent = 'Processing…';

    const { error } = await stripeInstance.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/donate/thank-you`,
      },
      redirect: 'if_required',
    });

    if (error) {
      setError(error.message || 'Payment failed. Please try again.');
      btn.disabled = false;
      btn.classList.remove('loading');
      updateSubmitLabel();
      return;
    }

    // Success — no redirect needed
    showSuccess();
  }

  function showSuccess() {
    const form = document.getElementById('dm-modal');
    if (!form) return;
    // Hide everything except success div
    [...form.children].forEach(el => {
      if (el.id === 'dm-success') { el.style.display = 'block'; }
      else { el.style.display = 'none'; }
    });
    setTimeout(close, 4000);
  }

  /* ─── UI helpers ─────────────────────────────────────────────────────── */
  function setError(msg) {
    const el = document.getElementById('dm-error');
    if (!el) return;
    el.textContent = msg;
    el.style.display = msg ? 'block' : 'none';
  }

  function updateSubmitLabel() {
    const btn = document.getElementById('dm-submit');
    if (!btn || btn.dataset.fallback === '1') return;
    const custom = document.getElementById('dm-custom');
    const amt = (custom && custom.value) ? parseFloat(custom.value) : selectedAmount;
    btn.textContent = `Donate $${amt}`;
  }

  /* ─── Events ─────────────────────────────────────────────────────────── */
  function bindEvents() {
    document.getElementById('dm-close').addEventListener('click', close);
    document.getElementById('dm-overlay').addEventListener('click', e => {
      if (e.target.id === 'dm-overlay') close();
    });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
    }, { once: true });

    // Campaign select
    document.querySelectorAll('.dm-camp').forEach(btn => {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.dm-camp').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        selectedCampaign = CAMPAIGNS[parseInt(this.dataset.camp, 10)];
        reinitElements();
        updateSubmitLabel();
      });
    });

    // Amount buttons
    document.querySelectorAll('.dm-amt').forEach(btn => {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.dm-amt').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        selectedAmount = parseInt(this.dataset.amount, 10);
        document.getElementById('dm-custom').value = '';
        reinitElements();
        updateSubmitLabel();
      });
    });

    // Custom amount
    document.getElementById('dm-custom').addEventListener('input', function () {
      document.querySelectorAll('.dm-amt').forEach(b => b.classList.remove('active'));
      if (this.value) {
        selectedAmount = parseFloat(this.value);
        reinitElements();
      }
      updateSubmitLabel();
    });

    document.getElementById('dm-submit').addEventListener('click', submit);
  }

  /* ─── Auto-wire triggers ─────────────────────────────────────────────── */
  function wireButtons() {
    document.querySelectorAll('[data-donate], [data-action="donate"]').forEach(el => {
      el.addEventListener('click', e => { e.preventDefault(); open(); });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireButtons);
  } else {
    wireButtons();
  }

  window.DonateModal = { open, close };
})();
