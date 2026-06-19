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

  const ENDPOINT_CONFIG = '/api/donations/config';
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
    theme: 'stripe',
    variables: {
      colorPrimary: '#7c3aed', colorBackground: '#faf7f3',
      colorText: '#1a1622', colorTextSecondary: '#4b5563',
      colorTextPlaceholder: '#9ca3af', colorDanger: '#dc2626',
      fontFamily: "'DM Sans', system-ui, sans-serif", borderRadius: '8px', spacingUnit: '3px',
    },
    rules: {
      '.Input': { border: '1.5px solid rgba(15,31,61,0.12)', boxShadow: 'none', padding: '9px 11px', fontSize: '14px', backgroundColor: '#fff' },
      '.Input:focus': { border: '1.5px solid #7c3aed', boxShadow: '0 0 0 3px rgba(124,58,237,0.14)' },
      '.Label': { fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b7280', marginBottom: '5px' },
      '.Tab': { border: '1.5px solid rgba(15,31,61,0.1)', background: '#fff' },
      '.Tab--selected': { border: '1.5px solid #7c3aed', background: 'rgba(124,58,237,0.06)' },
    },
  };

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,700;1,9..144,400&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
    #dm-overlay{position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,0.42);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:14px;animation:dm-fade 180ms ease}
    @keyframes dm-fade{from{opacity:0}to{opacity:1}}
    #dm-modal{width:min(100%,392px);max-height:88vh;overflow-y:auto;background:#F5F2E9;border:1px solid rgba(15,31,61,0.1);border-radius:16px;box-shadow:0 24px 64px rgba(15,23,42,0.18),0 0 0 1px rgba(124,58,237,0.08);color:#1a1622;font-family:'DM Sans',system-ui,sans-serif;scrollbar-width:none;animation:dm-up 260ms cubic-bezier(.16,1,.3,1)}
    #dm-modal::-webkit-scrollbar{display:none}
    #dm-modal *{box-sizing:border-box}
    @keyframes dm-up{from{transform:translateY(14px) scale(.98);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}
    .dm-header{position:relative;padding:20px 22px 0}
    .dm-close{position:absolute;top:14px;right:14px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;border:1px solid rgba(15,31,61,0.12);border-radius:999px;background:#fff;color:#6b7280;cursor:pointer;font-size:15px;line-height:1;transition:background 150ms,color 150ms}
    .dm-close:hover{background:#faf7f3;color:#1a1622}
    .dm-eyebrow{margin-bottom:5px;color:#7c3aed;font-size:9px;font-weight:800;letter-spacing:.14em;text-transform:uppercase}
    .dm-title{margin:0;font-family:'Fraunces',Georgia,serif;font-size:1.42rem;font-weight:700;letter-spacing:-.025em;line-height:1.1;color:#0f1f3d}
    .dm-sub{margin:6px 0 0;color:#4b5563;font-size:.82rem;line-height:1.45}
    .dm-body{padding:14px 22px 0}
    .dm-section{margin-bottom:16px;padding:14px;border:1px solid rgba(15,31,61,0.08);border-radius:12px;background:#faf7f3}
    .dm-label{margin:0 0 8px;color:#4b5563;font-size:9px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;display:block}
    .dm-freq{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:3px;border:1px solid rgba(15,31,61,0.1);border-radius:10px;background:#fff}
    .dm-freq button{min-height:36px;border:1px solid transparent;border-radius:8px;background:transparent;color:#6b7280;cursor:pointer;font-family:inherit;font-size:.82rem;font-weight:700;transition:all 150ms}
    .dm-freq button.active{border-color:rgba(124,58,237,0.55);background:rgba(124,58,237,0.1);color:#5b21b6}
    .dm-tiers{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px}
    .dm-tier{background:#fff;border:1.5px solid rgba(15,31,61,0.1);border-radius:10px;padding:11px 12px;cursor:pointer;transition:all .14s;text-align:left;font-family:inherit}
    .dm-tier:hover{border-color:rgba(124,58,237,.35);background:rgba(124,58,237,.04)}
    .dm-tier.active{border-color:#7c3aed;background:rgba(124,58,237,.08);box-shadow:0 0 0 1px rgba(124,58,237,.18)}
    .dm-tier-amt{font-family:'Fraunces',Georgia,serif;font-size:1.05rem;font-weight:700;color:#0f1f3d;display:block;margin-bottom:1px}
    .dm-tier.active .dm-tier-amt{color:#5b21b6}
    .dm-tier-lbl{font-size:.7rem;color:#6b7280;font-weight:500}
    .dm-custom-wrap{position:relative}
    .dm-dollar{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#6b7280;font-weight:800;pointer-events:none;font-size:.85rem}
    .dm-custom{width:100%;min-height:38px;padding:9px 11px 9px 26px;border:1.5px solid rgba(15,31,61,0.12);border-radius:9px;outline:none;appearance:textfield;background:#fff;color:#1a1622;font-family:inherit;font-size:.88rem;font-weight:700;transition:border-color 150ms,box-shadow 150ms}
    .dm-custom::-webkit-inner-spin-button{-webkit-appearance:none}
    .dm-custom::placeholder{color:#9ca3af}
    .dm-custom:focus{border-color:#7c3aed;box-shadow:0 0 0 3px rgba(124,58,237,.14)}
    .dm-contact{display:flex;flex-direction:column;gap:8px}
    .dm-email{width:100%;min-height:38px;padding:9px 11px;border:1.5px solid rgba(15,31,61,0.12);border-radius:9px;outline:none;background:#fff;color:#1a1622;font-family:inherit;font-size:.84rem;font-weight:500;transition:border-color 150ms,box-shadow 150ms}
    .dm-email::placeholder{color:#9ca3af}
    .dm-email:focus{border-color:#7c3aed;box-shadow:0 0 0 3px rgba(124,58,237,.14)}
    .dm-nl-row{display:flex;align-items:flex-start;gap:9px;padding:9px 10px;border:1px solid rgba(15,31,61,0.08);border-radius:9px;background:#fff;cursor:pointer}
    .dm-nl-row input[type=checkbox]{width:15px;height:15px;flex-shrink:0;margin-top:1px;accent-color:#7c3aed;cursor:pointer}
    .dm-nl-lbl{font-size:.76rem;color:#4b5563;line-height:1.4;cursor:pointer}
    .dm-nl-lbl strong{color:#1a1622;font-weight:600;display:block;margin-bottom:1px;font-size:.78rem}
    .dm-fee-row{display:flex;align-items:flex-start;gap:9px;padding:10px 11px;margin-bottom:10px;border:1px solid rgba(15,31,61,0.07);border-radius:9px;background:rgba(255,255,255,0.72);cursor:pointer}
    .dm-fee-row input[type=checkbox]{width:15px;height:15px;flex-shrink:0;margin-top:2px;accent-color:#7c3aed;cursor:pointer}
    .dm-fee-copy{font-size:.74rem;color:#6b7280;line-height:1.45;cursor:pointer}
    .dm-fee-copy strong{color:#374151;font-weight:600;display:block;margin-bottom:2px;font-size:.76rem}
    .dm-stripe-wrap{margin:0}
    .dm-skeleton{height:112px;border-radius:9px;background:linear-gradient(90deg,rgba(15,31,61,.04) 25%,rgba(15,31,61,.08) 50%,rgba(15,31,61,.04) 75%);background-size:200% 100%;animation:dm-shimmer 1.4s infinite}
    @keyframes dm-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
    .dm-footer{padding:0 22px 20px}
    .dm-submit{width:100%;min-height:44px;border:0;border-radius:10px;background:linear-gradient(135deg,#6d28d9,#7c3aed);color:#fff;cursor:pointer;font-family:inherit;font-size:.9rem;font-weight:900;letter-spacing:-.01em;transition:opacity 150ms,transform 120ms;position:relative;overflow:hidden}
    .dm-submit:hover:not(:disabled){opacity:.9;transform:translateY(-1px)}
    .dm-submit:disabled{opacity:.5;cursor:not-allowed;transform:none}
    .dm-submit.loading::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.15),transparent);animation:dm-shine 1.1s infinite}
    @keyframes dm-shine{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
    .dm-error{display:none;margin-top:9px;padding:9px 11px;border:1px solid rgba(220,38,38,.2);border-radius:9px;background:rgba(220,38,38,.06);color:#b91c1c;font-size:.78rem;line-height:1.4}
    .dm-secure{margin-top:9px;color:#6b7280;text-align:center;font-size:.68rem;line-height:1.4}
    .dm-success{display:none;text-align:center;padding:40px 22px}
    .dm-success-icon{width:50px;height:50px;border-radius:50%;margin:0 auto 14px;background:rgba(124,58,237,.1);border:1.5px solid rgba(124,58,237,.25);display:flex;align-items:center;justify-content:center;font-size:1.3rem;color:#7c3aed}
    .dm-success h3{font-family:'Fraunces',Georgia,serif;font-size:1.2rem;color:#0f1f3d;margin:0 0 7px}
    .dm-success p{font-size:.82rem;color:#4b5563;margin:0;line-height:1.5}
    .dm-test-banner{display:none;margin:10px 0 0;padding:8px 10px;border:1px solid rgba(217,119,6,.3);border-radius:9px;background:rgba(251,191,36,.12);color:#92400e;font-size:.74rem;line-height:1.4;text-align:center}
    .dm-test-banner.is-visible{display:block}
    @media(max-width:460px){#dm-overlay{align-items:flex-end;padding:8px}#dm-modal{border-radius:14px 14px 0 0;max-height:94vh}.dm-header{padding:18px 18px 0}.dm-body{padding:12px 18px 0}.dm-footer{padding:0 18px 18px}.dm-tiers{grid-template-columns:1fr 1fr}}
  `;

  let tiers = [], selectedAmount = 1, frequency = 'one_time';
  let coverFees = true;
  let presetCampaignId = null, presetAmount = null;
  let stripeInst = null, elements = null, isSubmitting = false;
  let stripePk = null, stripeTestMode = false, configPromise = null;
  let reinitTimer = null;

  function calculateWithFees(intendedCents) {
    return Math.ceil((intendedCents + 30) / (1 - 0.029));
  }

  function feeAmount(intendedCents) {
    return calculateWithFees(intendedCents) - intendedCents;
  }

  function getSelectedAmountCents() {
    return Math.round(getAmount() * 100);
  }

  function chargeAmountCents() {
    const intended = getSelectedAmountCents();
    if (frequency !== 'one_time' || !coverFees) return intended;
    return calculateWithFees(intended);
  }

  async function fetchStripeConfig() {
    if (configPromise) return configPromise;
    configPromise = (async () => {
      const res = await fetch(ENDPOINT_CONFIG);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.publishable_key) {
        throw new Error(data.error || 'Stripe is not configured for donations yet.');
      }
      stripePk = data.publishable_key;
      stripeTestMode = Boolean(data.test_mode);
      return data;
    })();
    return configPromise;
  }

  function money(v) { const n = Number(v); return Number.isFinite(n) ? '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '$0'; }
  function moneyExact(cents) { return '$' + (Number(cents || 0) / 100).toFixed(2); }
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
    const customDefault = presetAmount ? String(presetAmount) : '1';
    const tierBtns = tiers.map((t, i) => {
      const amt = t.amount_cents / 100;
      const active = presetAmount && presetAmount === amt;
      return `
      <button type="button" class="dm-tier${active ? ' active' : ''}" data-idx="${i}" data-amount="${amt}">
        <span class="dm-tier-amt">${money(amt)}</span>
        <span class="dm-tier-lbl">${t.label}</span>
      </button>`;
    }).join('');

    return `
      <div class="dm-header">
        <button class="dm-close" id="dm-close" type="button" aria-label="Close">&times;</button>
        <div class="dm-eyebrow">Companions of CPAS</div>
        <h2 class="dm-title">Support Our Mission</h2>
        <p class="dm-sub">Your gift helps dogs at Caddo Parish Animal Services move from crisis to care.</p>
        <div class="dm-test-banner${stripeTestMode ? ' is-visible' : ''}" id="dm-test-banner">Stripe test mode — use card <strong>4242 4242 4242 4242</strong>, any future expiry &amp; CVC. No real charges.</div>
      </div>
      <div class="dm-body">
        <div class="dm-section">
          <span class="dm-label">Choose an amount</span>
          <div class="dm-tiers">${tierBtns}</div>
          <div class="dm-custom-wrap">
            <span class="dm-dollar">$</span>
            <input id="dm-custom" class="dm-custom" type="number" min="1" max="50000" step="0.01" inputmode="decimal" placeholder="Custom amount" autocomplete="off" value="${customDefault}" />
          </div>
        </div>
        <div class="dm-section">
          <span class="dm-label">Payment details</span>
          <div class="dm-stripe-wrap">
            <div id="dm-skeleton" class="dm-skeleton"></div>
            <div id="dm-mount" style="display:none"></div>
          </div>
        </div>
        <div class="dm-section">
          <span class="dm-label">Gift frequency</span>
          <div class="dm-freq">
            <button type="button" class="active" data-freq="one_time">One-time</button>
            <button type="button" data-freq="monthly">Monthly</button>
          </div>
        </div>
        <div class="dm-section">
          <span class="dm-label">Receipt &amp; updates <span style="color:#9ca3af;font-weight:500;text-transform:none;letter-spacing:0">— optional</span></span>
          <div class="dm-contact">
            <input id="receipt-email" class="dm-email" type="email" placeholder="Email address" autocomplete="email" name="email" />
            <label class="dm-nl-row" for="dm-newsletter">
              <input type="checkbox" id="dm-newsletter" />
              <span class="dm-nl-lbl"><strong>Subscribe to updates</strong>Occasional news on animals helped. No spam.</span>
            </label>
            <label class="dm-nl-row" for="dm-save-info">
              <input type="checkbox" id="dm-save-info" />
              <span class="dm-nl-lbl"><strong>Save my information</strong>Faster checkout next time you donate.</span>
            </label>
          </div>
        </div>
      </div>
      <div class="dm-footer">
        <div id="dm-cover-fees-wrap">
          <label class="dm-fee-row" for="dm-cover-fees">
            <input type="checkbox" id="dm-cover-fees" checked />
            <span class="dm-fee-copy">
              <strong id="fee-label">Cover processing fees (+$0.33)</strong>
              100% of your gift goes to the animals.
            </span>
          </label>
        </div>
        <button class="dm-submit" id="dm-submit" type="button" disabled>Donate $1.33</button>
        <div class="dm-error" id="dm-error"></div>
        <div class="dm-secure">Secured by Stripe &middot; PCI compliant &middot; Receipt emailed when payment succeeds</div>
      </div>
      <div class="dm-success" id="dm-success">
        <div class="dm-success-icon">&#10003;</div>
        <h3>Thank you for your gift.</h3>
        <p id="dm-success-msg">Every dollar helps bridge the gap from urgent to safe.</p>
      </div>`;
  }

  function getDonorEmail() {
    const receipt = document.getElementById('receipt-email') || document.getElementById('dm-email');
    const receiptVal = receipt?.value?.trim() || '';
    if (receiptVal) return receiptVal;
    const pageEmail = document.querySelector('input[type="email"]:not([disabled])');
    return pageEmail?.value?.trim() || '';
  }

  function friendlyStripeError(err) {
    const msg = String(err?.message || err || '');
    if (/billing_details\.email/i.test(msg)) {
      return 'Please enter your email address above to complete your donation.';
    }
    return msg || 'Payment failed. Please try again.';
  }

  function mirrorReceiptEmail() {
    const receiptEmail = document.getElementById('receipt-email') || document.getElementById('dm-email');
    if (!receiptEmail) return;
    const linkEmail = document.querySelector('input[name="email"], input[autocomplete="email"]');
    if (linkEmail && linkEmail !== receiptEmail) {
      linkEmail.addEventListener('input', () => {
        if (!receiptEmail.value) receiptEmail.value = linkEmail.value;
      });
    }
  }

  async function initElements() {
    try {
      await fetchStripeConfig();
      const Stripe = await loadStripe();
      if (!stripeInst) stripeInst = Stripe(stripePk);
      const isMonthly = frequency === 'monthly';
      const intendedCents = getSelectedAmountCents();
      const payload = {
        mode: isMonthly ? 'setup' : 'payment',
        intended_cents: intendedCents,
        cover_fees: !isMonthly && coverFees,
        amount_cents: isMonthly ? intendedCents : chargeAmountCents(),
        currency: 'usd',
      };
      if (presetCampaignId) payload.campaign_id = presetCampaignId;
      const res = await fetch(ENDPOINT_INTENT, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
      const msg = err.message || 'Could not load payment form.';
      if (sk) { sk.style.animation = 'none'; sk.style.background = 'rgba(248,113,113,.07)'; sk.innerHTML = `<div style="padding:16px;color:#fca5a5;font-size:.82rem;text-align:center;line-height:1.5">${msg}<br><a href="/donate" style="color:#a78bfa;text-decoration:underline">Try the donate page</a></div>`; }
    }
  }

  async function submit() {
    if (isSubmitting || !elements || !stripeInst) return;
    const amt = getAmount();
    if (!amt || amt < 1) { setErr('Please select or enter an amount.'); return; }
    const email = getDonorEmail();
    if (!email) {
      setErr('Please enter your email address above to complete your donation.');
      return;
    }
    setErr('');
    isSubmitting = true;
    const btn = document.getElementById('dm-submit');
    if (btn) { btn.disabled = true; btn.classList.add('loading'); btn.textContent = 'Processing...'; }
    const nlOptIn = document.getElementById('dm-newsletter')?.checked || false;
    const saveInfo = document.getElementById('dm-save-info')?.checked || false;
    const isMonthly = frequency === 'monthly';
    const tier = getActiveTier();
    const intendedCents = getSelectedAmountCents();
    const chargeCents = isMonthly ? intendedCents : chargeAmountCents();
    const billingDetails = { email };
    try {
      if (!isMonthly) {
        const { error, paymentIntent } = await stripeInst.confirmPayment({
          elements, redirect: 'if_required',
          confirmParams: {
            return_url: `${location.origin}/donate/thank-you`,
            payment_method_data: { billing_details: billingDetails },
          },
        });
        if (error) throw new Error(friendlyStripeError(error));
        if (email || paymentIntent?.id) {
          fetch(ENDPOINT_AFTER, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              donor_email: email,
              nl_opt_in: nlOptIn,
              save_my_info: saveInfo,
              amount_cents: chargeCents,
              intended_cents: intendedCents,
              cover_fees: !isMonthly && coverFees,
              payment_intent_id: paymentIntent?.id || null,
            }),
          }).catch(() => {});
        }
        showSuccess(email, false);
      } else {
        const { error, setupIntent } = await stripeInst.confirmSetup({
          elements, redirect: 'if_required',
          confirmParams: {
            return_url: `${location.origin}/donate/thank-you`,
            payment_method_data: { billing_details: billingDetails },
          },
        });
        if (error) throw new Error(friendlyStripeError(error));
        const subRes = await fetch(ENDPOINT_SUB, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payment_method_id: setupIntent.payment_method, price_id: tier?.stripe_price_id_monthly || null, amount_cents: tier ? null : amountCents, donor_email: email, nl_opt_in: nlOptIn, save_my_info: saveInfo }),
        });
        const subData = await subRes.json();
        if (!subData.success) throw new Error(subData.error || 'Subscription could not be created.');
        showSuccess(email, true);
      }
    } catch (err) {
      setErr(friendlyStripeError(err));
      isSubmitting = false;
      if (btn) { btn.disabled = false; btn.classList.remove('loading'); updateLabel(); }
    }
  }

  function updateFeeDisplay() {
    const wrap = document.getElementById('dm-cover-fees-wrap');
    const feeLabel = document.getElementById('fee-label');
    const btn = document.getElementById('dm-submit');
    const cb = document.getElementById('dm-cover-fees');
    if (cb) coverFees = cb.checked;
    if (frequency !== 'one_time') {
      if (wrap) wrap.style.display = 'none';
      if (btn && !btn.disabled && !isSubmitting) {
        btn.textContent = `Donate ${money(getAmount())}/mo`;
      }
      return;
    }
    if (wrap) wrap.style.display = '';
    const intendedCents = getSelectedAmountCents();
    const feeCents = feeAmount(intendedCents);
    const totalCents = coverFees ? calculateWithFees(intendedCents) : intendedCents;
    if (feeLabel) feeLabel.textContent = `Cover processing fees (+${moneyExact(feeCents)})`;
    if (btn && !btn.disabled && !isSubmitting) {
      btn.textContent = `Donate ${moneyExact(totalCents)}`;
    }
  }

  function updateLabel() {
    updateFeeDisplay();
  }

  function scheduleReinitElements() {
    if (frequency !== 'one_time') return;
    clearTimeout(reinitTimer);
    reinitTimer = setTimeout(function() { reinitElements(); }, 450);
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
    const trigger = event?.currentTarget?.closest?.('[data-action="donate"],[data-donate]')
      || event?.target?.closest?.('[data-action="donate"],[data-donate]');
    presetCampaignId = trigger?.dataset?.campaignId || null;
    const presetAmt = Number(trigger?.dataset?.amount || 0);
    const presetCents = Number(trigger?.dataset?.amountCents || 0);
    presetAmount = presetAmt > 0 ? presetAmt : (presetCents > 0 ? presetCents / 100 : null);
    injectStyles();
    selectedAmount = presetAmount || 1;
    frequency = 'one_time';
    coverFees = true;
    elements = null; isSubmitting = false;
    stripeInst = null; configPromise = null;
    const tiersPromise = fetchTiers();
    const configLoad = fetchStripeConfig().catch(() => null);
    loadStripe().catch(() => {});
    const overlay = document.createElement('div');
    overlay.id = 'dm-overlay'; overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true');
    const modal = document.createElement('div'); modal.id = 'dm-modal';
    modal.innerHTML = '<div style="padding:40px 28px"><div style="height:28px;width:70%;border-radius:6px;background:rgba(255,255,255,.06);margin-bottom:20px;animation:dm-shimmer 1.4s infinite;background-size:200% 100%"></div><div style="height:44px;border-radius:10px;background:rgba(255,255,255,.06);margin-bottom:10px;animation:dm-shimmer 1.4s infinite;background-size:200% 100%"></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:18px"><div style="height:66px;border-radius:10px;background:rgba(255,255,255,.06);animation:dm-shimmer 1.4s infinite;background-size:200% 100%"></div><div style="height:66px;border-radius:10px;background:rgba(255,255,255,.06);animation:dm-shimmer 1.4s infinite;background-size:200% 100%"></div><div style="height:66px;border-radius:10px;background:rgba(255,255,255,.06);animation:dm-shimmer 1.4s infinite;background-size:200% 100%"></div><div style="height:66px;border-radius:10px;background:rgba(255,255,255,.06);animation:dm-shimmer 1.4s infinite;background-size:200% 100%"></div></div><div style="height:130px;border-radius:10px;background:rgba(255,255,255,.06);animation:dm-shimmer 1.4s infinite;background-size:200% 100%"></div></div>';
    overlay.appendChild(modal); document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); } }, { once: true });
    tiersPromise.then(async (loaded) => {
      await configLoad;
      tiers = loaded;
      if (!document.getElementById('dm-overlay')) return;
      modal.innerHTML = buildHTML(); bindEvents(); mirrorReceiptEmail(); initElements();
    });
  }

  function close() {
    const el = document.getElementById('dm-overlay'); if (el) el.remove();
    elements = null; isSubmitting = false;
    presetCampaignId = null; presetAmount = null;
  }

  function bindEvents() {
    document.getElementById('dm-close').addEventListener('click', close);
    document.querySelectorAll('.dm-freq button').forEach(btn => {
      btn.addEventListener('click', () => {
        frequency = btn.dataset.freq;
        document.querySelectorAll('.dm-freq button').forEach(b => b.classList.toggle('active', b === btn));
        updateFeeDisplay();
        reinitElements();
      });
    });
    document.querySelectorAll('.dm-tier').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.dm-tier').forEach(b => b.classList.remove('active'));
        btn.classList.add('active'); selectedAmount = Number(btn.dataset.amount);
        const c = document.getElementById('dm-custom'); if (c) c.value = '';
        updateFeeDisplay();
        scheduleReinitElements();
      });
    });
    document.getElementById('dm-custom')?.addEventListener('input', function () {
      document.querySelectorAll('.dm-tier').forEach(b => b.classList.remove('active'));
      selectedAmount = Number(this.value) || 0;
      updateFeeDisplay();
      scheduleReinitElements();
    });
    document.getElementById('dm-cover-fees')?.addEventListener('change', function () {
      coverFees = this.checked;
      updateFeeDisplay();
      reinitElements();
    });
    const customInput = document.getElementById('dm-custom');
    if (presetAmount) {
      document.querySelectorAll('.dm-tier').forEach(b => b.classList.remove('active'));
      const match = document.querySelector(`.dm-tier[data-amount="${presetAmount}"]`);
      if (match) match.classList.add('active');
      selectedAmount = presetAmount;
      updateLabel();
    } else if (customInput) {
      selectedAmount = Number(customInput.value) || 1;
      updateLabel();
      requestAnimationFrame(() => { customInput.focus(); customInput.select(); });
    }
    document.getElementById('dm-submit').addEventListener('click', submit);
  }

  function wireButtons() {
    document.querySelectorAll('[data-donate],[data-action="donate"]').forEach(el => {
      if (el.dataset.dmWired === '1') return; el.dataset.dmWired = '1';
      el.addEventListener('click', open);
    });
  }

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-donate],[data-action="donate"]');
    if (!el) return;
    e.preventDefault();
    open(e);
  });

  function ensureShareOverlay() {
    if (document.getElementById('dv2-share-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'dv2-share-overlay';
    overlay.hidden = true;
    overlay.innerHTML = `
      <div class="dv2-share-panel" role="dialog" aria-modal="true" aria-labelledby="dv2-share-title">
        <h3 class="dv2-share-title" id="dv2-share-title">Share This Campaign</h3>
        <p class="dv2-share-copy" id="dv2-share-text"></p>
        <div class="dv2-share-actions">
          <button type="button" class="dv2-share-btn dv2-share-btn--fb" data-share-channel="facebook">Share on Facebook</button>
          <button type="button" class="dv2-share-btn dv2-share-btn--email" data-share-channel="email">Share by Email</button>
          <button type="button" class="dv2-share-btn" data-share-channel="copy">Copy Link</button>
        </div>
        <p class="dv2-share-status" id="dv2-share-status" aria-live="polite"></p>
        <button type="button" class="dv2-share-close" data-share-close>Close</button>
      </div>`;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay || e.target.closest('[data-share-close]')) closeShare();
    });
    overlay.querySelector('[data-share-channel="facebook"]')?.addEventListener('click', () => {
      const url = overlay.dataset.shareUrl || window.location.href;
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'noopener,noreferrer,width=640,height=560');
    });
    overlay.querySelector('[data-share-channel="email"]')?.addEventListener('click', () => {
      const url = overlay.dataset.shareUrl || window.location.href;
      const title = overlay.dataset.shareTitle || 'Help Kita Heal';
      const text = overlay.dataset.shareText || '';
      window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${text}\n\n${url}`)}`;
    });
    overlay.querySelector('[data-share-channel="copy"]')?.addEventListener('click', async () => {
      const url = overlay.dataset.shareUrl || window.location.href;
      const status = document.getElementById('dv2-share-status');
      try {
        await navigator.clipboard.writeText(url);
        if (status) status.textContent = 'Link copied. Paste it on Instagram or anywhere you share.';
      } catch {
        if (status) status.textContent = url;
      }
    });
  }

  function openShare(trigger) {
    ensureShareOverlay();
    const overlay = document.getElementById('dv2-share-overlay');
    if (!overlay) return;
    const url = trigger?.dataset?.shareUrl || `${window.location.origin}/donate#donate-medical-story`;
    const title = trigger?.dataset?.shareTitle || 'Help Kita Heal — Companions of Caddo';
    const text = trigger?.dataset?.shareText || 'Kita needs amputation surgery and recovery care. Please help if you can.';
    overlay.dataset.shareUrl = url;
    overlay.dataset.shareTitle = title;
    overlay.dataset.shareText = text;
    const copyEl = document.getElementById('dv2-share-text');
    if (copyEl) copyEl.textContent = text;
    const status = document.getElementById('dv2-share-status');
    if (status) status.textContent = '';
    overlay.hidden = false;
  }

  function closeShare() {
    const overlay = document.getElementById('dv2-share-overlay');
    if (overlay) overlay.hidden = true;
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="share-campaign"]');
    if (!btn) return;
    e.preventDefault();
    openShare(btn);
  });

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', wireButtons); } else { wireButtons(); }
  window.DonateModal = { open, close };
  window.openDonateModal = open;
})();
