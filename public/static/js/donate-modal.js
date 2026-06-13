/**
 * donate-modal.js — Companions of CPAS
 * Hosted Stripe Checkout redirect. No PaymentElements. No campaigns.
 *
 * Flow:
 *   1. Modal opens → fetch /api/donations/tiers (D1 donation_tiers)
 *   2. Render 4 preset amounts + custom + one-time/monthly toggle
 *   3. Submit → POST /api/donations/checkout → redirect to stripe.url
 */
(function () {
  'use strict';

  const ENDPOINT_TIERS    = '/api/donations/tiers';
  const ENDPOINT_CHECKOUT = '/api/donations/checkout';

  /* ─── Fallback tiers if endpoint unavailable ─────────────────────────── */
  const FALLBACK_TIERS = [
    { label: 'A Part of the Pack', amount_cents: 2500,  stripe_price_id_onetime: 'price_1ThrHaRGnRsvqnfijU6E7R1M', stripe_price_id_monthly: 'price_1ThrU5RGnRsvqnfizGD90XTT' },
    { label: 'Loyal Companion',    amount_cents: 5000,  stripe_price_id_onetime: 'price_1ThrJ5RGnRsvqnfikaZXLCJw', stripe_price_id_monthly: 'price_1ThrUERGnRsvqnfidwoPOnaY' },
    { label: 'Pack Leader',        amount_cents: 10000, stripe_price_id_onetime: 'price_1ThrKeRGnRsvqnfiR670gQLX', stripe_price_id_monthly: 'price_1ThrULRGnRsvqnfibCHP1koD' },
    { label: 'Guardian Angel',     amount_cents: 25000, stripe_price_id_onetime: 'price_1ThrLSRGnRsvqnfiKwqD9Vsv', stripe_price_id_monthly: 'price_1ThrUSRGnRsvqnfimLPEY4wV' },
  ];

  /* ─── State ──────────────────────────────────────────────────────────── */
  let tiers          = [];
  let selectedTier   = null;   // null = custom amount active
  let customAmount   = null;
  let frequency      = 'onetime'; // 'onetime' | 'monthly'
  let isSubmitting   = false;

  /* ─── CSS ────────────────────────────────────────────────────────────── */
  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');

    #dm-overlay {
      position: fixed; inset: 0; z-index: 9999;
      background: rgba(4, 6, 15, 0.82);
      backdrop-filter: blur(10px) saturate(1.2);
      display: flex; align-items: center; justify-content: center;
      padding: 16px;
      animation: dm-fade .18s ease;
    }
    @keyframes dm-fade { from { opacity:0 } to { opacity:1 } }

    #dm-modal {
      background: #0b0f1c;
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 18px;
      width: 100%; max-width: 460px;
      max-height: 94vh;
      overflow-y: auto;
      box-shadow:
        0 0 0 1px rgba(124,58,237,0.12),
        0 32px 80px rgba(0,0,0,0.7),
        0 8px 24px rgba(0,0,0,0.4);
      font-family: 'DM Sans', system-ui, sans-serif;
      animation: dm-up .28s cubic-bezier(.16,1,.3,1);
      scrollbar-width: none;
      color: #f0ece6;
    }
    #dm-modal::-webkit-scrollbar { display: none; }
    @keyframes dm-up {
      from { transform: translateY(20px) scale(.98); opacity:0 }
      to   { transform: translateY(0) scale(1); opacity:1 }
    }

    /* ── Header ── */
    .dm-header {
      padding: 28px 28px 0;
      position: relative;
    }
    .dm-close {
      position: absolute; top: 22px; right: 22px;
      width: 30px; height: 30px; border-radius: 50%;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.09);
      color: #9ca3af; cursor: pointer; font-size: 13px;
      display: flex; align-items: center; justify-content: center;
      transition: background .15s, color .15s;
      line-height: 1; padding: 0;
    }
    .dm-close:hover { background: rgba(255,255,255,0.12); color: #f0ece6; }

    .dm-eyebrow {
      font-size: 9.5px; font-weight: 700; letter-spacing: .14em;
      text-transform: uppercase; color: #7c5cbf; margin-bottom: 8px;
    }
    .dm-title {
      font-family: 'Fraunces', Georgia, serif;
      font-size: 1.65rem; font-weight: 700;
      color: #f0ece6; margin: 0 0 6px;
      letter-spacing: -.025em; line-height: 1.1;
    }
    .dm-subtitle {
      font-size: .84rem; color: #7c8ba1; margin: 0 0 24px;
      line-height: 1.5;
    }

    /* ── Section label ── */
    .dm-label {
      font-size: 9.5px; font-weight: 700; letter-spacing: .12em;
      text-transform: uppercase; color: #4b5563;
      padding: 0 28px; margin-bottom: 10px; display: block;
    }

    /* ── Frequency toggle ── */
    .dm-freq-wrap {
      padding: 0 28px; margin-bottom: 22px;
    }
    .dm-freq {
      display: grid; grid-template-columns: 1fr 1fr;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 10px; padding: 3px; gap: 3px;
    }
    .dm-freq-btn {
      padding: 9px 0; border-radius: 7px;
      font-size: .84rem; font-weight: 600;
      font-family: 'DM Sans', system-ui, sans-serif;
      color: #6b7280; background: transparent;
      border: none; cursor: pointer;
      transition: background .15s, color .15s;
      letter-spacing: .01em;
    }
    .dm-freq-btn.active {
      background: rgba(124,58,237,0.22);
      color: #c4b5fd;
      box-shadow: 0 0 0 1px rgba(124,58,237,0.35);
    }
    .dm-freq-btn:not(.active):hover {
      color: #d1d5db;
      background: rgba(255,255,255,0.05);
    }

    /* ── Tier grid ── */
    .dm-tiers {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: 8px; padding: 0 28px; margin-bottom: 10px;
    }
    .dm-tier {
      background: rgba(255,255,255,0.03);
      border: 1.5px solid rgba(255,255,255,0.07);
      border-radius: 11px; padding: 14px 14px 13px;
      cursor: pointer; transition: all .14s; text-align: left;
      font-family: 'DM Sans', system-ui, sans-serif;
    }
    .dm-tier:hover {
      border-color: rgba(124,58,237,.38);
      background: rgba(124,58,237,.06);
    }
    .dm-tier.active {
      border-color: #7c3aed;
      background: rgba(124,58,237,.13);
      box-shadow: 0 0 0 1px rgba(124,58,237,.25);
    }
    .dm-tier-amount {
      font-family: 'Fraunces', Georgia, serif;
      font-size: 1.2rem; font-weight: 700;
      color: #f0ece6; display: block; margin-bottom: 3px;
      letter-spacing: -.02em;
    }
    .dm-tier.active .dm-tier-amount { color: #c4b5fd; }
    .dm-tier-name {
      font-size: .74rem; color: #6b7280;
      font-weight: 500; line-height: 1.3;
    }
    .dm-tier.active .dm-tier-name { color: #9474d4; }

    /* ── Custom amount ── */
    .dm-custom-wrap {
      padding: 0 28px; margin-bottom: 20px;
      position: relative;
    }
    .dm-custom-prefix {
      position: absolute; left: 40px; top: 50%;
      transform: translateY(-50%);
      color: #4b5563; font-weight: 600;
      font-size: .88rem; pointer-events: none;
    }
    input.dm-custom {
      width: 100%; box-sizing: border-box;
      background: rgba(255,255,255,0.03);
      border: 1.5px solid rgba(255,255,255,0.07);
      border-radius: 10px;
      padding: 11px 14px 11px 26px;
      color: #f0ece6; font-size: .88rem;
      font-family: 'DM Sans', system-ui, sans-serif;
      outline: none;
      -moz-appearance: textfield;
      appearance: textfield;
      transition: border-color .14s, box-shadow .14s;
    }
    input.dm-custom::-webkit-inner-spin-button,
    input.dm-custom::-webkit-outer-spin-button { -webkit-appearance: none; }
    input.dm-custom::placeholder { color: #374151; }
    input.dm-custom:focus {
      border-color: rgba(124,58,237,.5);
      box-shadow: 0 0 0 3px rgba(124,58,237,.12);
    }
    input.dm-custom.active-input {
      border-color: #7c3aed;
      background: rgba(124,58,237,.07);
    }

    /* ── Where gift goes callout ── */
    .dm-callout {
      margin: 0 28px 22px;
      padding: 14px 16px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 10px;
    }
    .dm-callout-title {
      font-size: .72rem; font-weight: 700; letter-spacing: .1em;
      text-transform: uppercase; color: #4b5563;
      margin-bottom: 5px;
    }
    .dm-callout-body {
      font-size: .8rem; color: #6b7280; line-height: 1.55;
    }
    .dm-callout-body.monthly-note { color: #7c5cbf; }

    /* ── Divider ── */
    .dm-divider {
      height: 1px; background: rgba(255,255,255,0.05);
      margin: 0 28px 22px;
    }

    /* ── Footer / CTA ── */
    .dm-footer { padding: 0 28px 28px; }
    .dm-submit {
      width: 100%; padding: 14px;
      background: #7c3aed;
      border: none; border-radius: 11px;
      color: #fff; font-size: .95rem; font-weight: 700;
      font-family: 'DM Sans', system-ui, sans-serif;
      cursor: pointer; transition: opacity .15s, transform .1s, background .15s;
      letter-spacing: .01em;
    }
    .dm-submit:hover:not(:disabled) {
      background: #6d28d9; transform: translateY(-1px);
    }
    .dm-submit:active:not(:disabled) { transform: translateY(0); }
    .dm-submit:disabled { opacity: .45; cursor: not-allowed; transform: none; }
    .dm-submit.loading {
      opacity: .7; cursor: not-allowed;
    }

    .dm-error {
      margin-top: 11px; padding: 10px 13px;
      background: rgba(248,113,113,.08);
      border: 1px solid rgba(248,113,113,.2);
      border-radius: 8px; font-size: .8rem; color: #fca5a5;
      display: none;
    }
    .dm-secure {
      text-align: center; margin-top: 12px;
      font-size: .72rem; color: #2d3540; line-height: 1.5;
    }

    /* ── Loading skeleton ── */
    .dm-skeleton {
      padding: 28px;
    }
    .dm-skel-line {
      border-radius: 6px; margin-bottom: 10px;
      background: linear-gradient(90deg,
        rgba(255,255,255,.04) 25%,
        rgba(255,255,255,.08) 50%,
        rgba(255,255,255,.04) 75%);
      background-size: 200% 100%;
      animation: dm-shimmer 1.4s infinite;
    }
    @keyframes dm-shimmer {
      0%   { background-position: 200% 0 }
      100% { background-position: -200% 0 }
    }
  `;

  /* ─── Helpers ────────────────────────────────────────────────────────── */
  function dollars(cents) {
    return '$' + (cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 });
  }

  function activeAmount() {
    if (customAmount && customAmount > 0) return customAmount;
    if (selectedTier) return selectedTier.amount_cents / 100;
    return null;
  }

  function activePriceId() {
    if (!selectedTier) return null;
    return frequency === 'monthly'
      ? selectedTier.stripe_price_id_monthly
      : selectedTier.stripe_price_id_onetime;
  }

  function injectStyles() {
    if (document.getElementById('dm-styles')) return;
    const s = document.createElement('style');
    s.id = 'dm-styles';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ─── Tier fetch ─────────────────────────────────────────────────────── */
  async function fetchTiers() {
    try {
      const res = await fetch(ENDPOINT_TIERS);
      if (!res.ok) throw new Error('non-ok');
      const data = await res.json();
      if (Array.isArray(data.tiers) && data.tiers.length) return data.tiers;
    } catch {}
    return FALLBACK_TIERS;
  }

  /* ─── Build HTML ─────────────────────────────────────────────────────── */
  function buildSkeleton() {
    return `
      <div id="dm-overlay" role="dialog" aria-modal="true" aria-label="Donate">
        <div id="dm-modal">
          <div class="dm-skeleton">
            <div class="dm-skel-line" style="height:12px;width:40%;margin-bottom:14px"></div>
            <div class="dm-skel-line" style="height:28px;width:70%;margin-bottom:20px"></div>
            <div class="dm-skel-line" style="height:44px;margin-bottom:10px"></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
              <div class="dm-skel-line" style="height:66px"></div>
              <div class="dm-skel-line" style="height:66px"></div>
              <div class="dm-skel-line" style="height:66px"></div>
              <div class="dm-skel-line" style="height:66px"></div>
            </div>
            <div class="dm-skel-line" style="height:44px;margin-top:10px"></div>
            <div class="dm-skel-line" style="height:48px;margin-top:20px;border-radius:11px"></div>
          </div>
          <button class="dm-close" id="dm-close" aria-label="Close">&#x2715;</button>
        </div>
      </div>`;
  }

  function buildModal() {
    const tierCards = tiers.map((t, i) => `
      <button type="button" class="dm-tier${i === 0 ? ' active' : ''}" data-idx="${i}">
        <span class="dm-tier-amount">${dollars(t.amount_cents)}</span>
        <span class="dm-tier-name">${t.label}</span>
      </button>`).join('');

    return `
      <div class="dm-header">
        <button class="dm-close" id="dm-close" aria-label="Close">&#x2715;</button>
        <div class="dm-eyebrow">Companions of CPAS</div>
        <h2 class="dm-title">Support Our Mission</h2>
        <p class="dm-subtitle">Your gift helps dogs at Caddo Parish Animal Services move from crisis to care.</p>
      </div>

      <span class="dm-label">Gift frequency</span>
      <div class="dm-freq-wrap">
        <div class="dm-freq">
          <button type="button" class="dm-freq-btn active" data-freq="onetime">One-time</button>
          <button type="button" class="dm-freq-btn" data-freq="monthly">Monthly</button>
        </div>
      </div>

      <span class="dm-label">Choose an amount</span>
      <div class="dm-tiers">${tierCards}</div>

      <div class="dm-custom-wrap">
        <span class="dm-custom-prefix">$</span>
        <input type="number" class="dm-custom" id="dm-custom"
          min="1" max="50000" placeholder="Custom amount" />
      </div>

      <div class="dm-callout" id="dm-callout">
        <div class="dm-callout-title">Where your gift goes</div>
        <div class="dm-callout-body" id="dm-callout-body">
          Gifts fund urgent medical care, foster supplies, transport, rescue coordination, and shelter visibility for dogs at CPAS.
        </div>
      </div>

      <div class="dm-divider"></div>

      <div class="dm-footer">
        <button class="dm-submit" id="dm-submit" type="button">
          Continue to Checkout
        </button>
        <div class="dm-error" id="dm-error"></div>
        <div class="dm-secure">
          Secure checkout by Stripe &middot; Receipt delivered automatically when payment succeeds.
        </div>
      </div>`;
  }

  /* ─── UI updates ─────────────────────────────────────────────────────── */
  function updateSubmitLabel() {
    const btn = document.getElementById('dm-submit');
    if (!btn) return;
    const amt = activeAmount();
    const freq = frequency === 'monthly' ? '/mo' : '';
    if (!amt || amt <= 0) {
      btn.textContent = 'Continue to Checkout';
      btn.disabled = true;
    } else {
      btn.textContent = `Donate $${Number.isInteger(amt) ? amt : amt.toFixed(2)}${freq}`;
      btn.disabled = isSubmitting;
    }
  }

  function updateCallout() {
    const body = document.getElementById('dm-callout-body');
    if (!body) return;
    if (frequency === 'monthly') {
      body.textContent = 'Your monthly gift sustains ongoing care so no dog loses their chance at safety due to lack of funds.';
      body.classList.add('monthly-note');
    } else {
      body.textContent = 'Gifts fund urgent medical care, foster supplies, transport, rescue coordination, and shelter visibility for dogs at CPAS.';
      body.classList.remove('monthly-note');
    }
  }

  function setError(msg) {
    const el = document.getElementById('dm-error');
    if (!el) return;
    el.textContent = msg;
    el.style.display = msg ? 'block' : 'none';
  }

  /* ─── Open / close ───────────────────────────────────────────────────── */
  function open() {
    if (document.getElementById('dm-overlay')) return;
    injectStyles();

    // Inject skeleton immediately
    const wrap = document.createElement('div');
    wrap.innerHTML = buildSkeleton();
    document.body.appendChild(wrap.firstElementChild);

    document.getElementById('dm-close').addEventListener('click', close);

    // Reset state
    selectedTier = null;
    customAmount = null;
    frequency    = 'onetime';
    isSubmitting = false;

    fetchTiers().then(loaded => {
      tiers = loaded;
      selectedTier = tiers[0] || null;

      const modal = document.getElementById('dm-modal');
      if (!modal) return; // closed before fetch returned
      modal.innerHTML = buildModal();
      bindEvents();
      updateSubmitLabel();
    });
  }

  function close() {
    const el = document.getElementById('dm-overlay');
    if (el) el.remove();
    isSubmitting = false;
  }

  /* ─── Submit ─────────────────────────────────────────────────────────── */
  async function submit() {
    if (isSubmitting) return;
    const amt = activeAmount();
    if (!amt || amt < 1) {
      setError('Please select or enter an amount.');
      return;
    }
    setError('');

    isSubmitting = true;
    const btn = document.getElementById('dm-submit');
    if (btn) { btn.classList.add('loading'); btn.disabled = true; btn.textContent = 'Redirecting...'; }

    try {
      const payload = {
        amount_cents: Math.round(amt * 100),
        recurring:    frequency === 'monthly',
        title:        selectedTier ? `${selectedTier.label} — ${frequency === 'monthly' ? 'Monthly Gift' : 'One-Time Gift'}` : 'Donation to Companions of CPAS',
      };
      if (activePriceId()) payload.price_id = activePriceId();

      const res  = await fetch(ENDPOINT_CHECKOUT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!data.checkout_url) throw new Error(data.error || 'Checkout unavailable.');
      window.location.href = data.checkout_url;

    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      isSubmitting = false;
      if (btn) { btn.classList.remove('loading'); btn.disabled = false; updateSubmitLabel(); }
    }
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

    // Frequency toggle
    document.querySelectorAll('.dm-freq-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.dm-freq-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        frequency = this.dataset.freq;
        updateSubmitLabel();
        updateCallout();
      });
    });

    // Tier select
    document.querySelectorAll('.dm-tier').forEach(btn => {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.dm-tier').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        selectedTier = tiers[parseInt(this.dataset.idx, 10)];
        customAmount = null;
        const inp = document.getElementById('dm-custom');
        if (inp) { inp.value = ''; inp.classList.remove('active-input'); }
        updateSubmitLabel();
      });
    });

    // Custom amount
    const customInp = document.getElementById('dm-custom');
    if (customInp) {
      customInp.addEventListener('input', function () {
        const val = parseFloat(this.value);
        if (this.value && val > 0) {
          customAmount = val;
          selectedTier = null;
          document.querySelectorAll('.dm-tier').forEach(b => b.classList.remove('active'));
          this.classList.add('active-input');
        } else {
          customAmount = null;
          this.classList.remove('active-input');
          // Re-select first tier if nothing selected
          if (!selectedTier && tiers.length) {
            selectedTier = tiers[0];
            document.querySelector('.dm-tier[data-idx="0"]')?.classList.add('active');
          }
        }
        updateSubmitLabel();
      });
    }

    document.getElementById('dm-submit').addEventListener('click', submit);
  }

  /* ─── Wire triggers ──────────────────────────────────────────────────── */
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
