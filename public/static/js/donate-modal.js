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
  const ENDPOINT_MODAL = '/api/public/donation-modal';
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
    #dm-modal{width:min(100%,460px);max-height:92dvh;overflow:hidden;display:flex;flex-direction:column;background:#F5F2E9;border:1px solid rgba(15,31,61,0.1);border-radius:16px;box-shadow:0 24px 64px rgba(15,23,42,0.18),0 0 0 1px rgba(124,58,237,0.08);color:#1a1622;font-family:'DM Sans',system-ui,sans-serif;scrollbar-width:none;animation:dm-up 260ms cubic-bezier(.16,1,.3,1)}
    #dm-modal::-webkit-scrollbar{display:none}
    #dm-modal *{box-sizing:border-box}
    @keyframes dm-up{from{transform:translateY(14px) scale(.98);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}
    .dm-header{position:relative;padding:20px 22px 12px;flex:none;border-bottom:1px solid rgba(15,31,61,.07)}
    .dm-close{position:absolute;top:14px;right:14px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;border:1px solid rgba(15,31,61,0.12);border-radius:999px;background:#fff;color:#6b7280;cursor:pointer;font-size:15px;line-height:1;transition:background 150ms,color 150ms}
    .dm-close:hover{background:#faf7f3;color:#1a1622}
    .dm-eyebrow{margin-bottom:5px;color:var(--dm-accent,#7c3aed);font-size:9px;font-weight:800;letter-spacing:.14em;text-transform:uppercase}
    .dm-title{margin:0;font-family:'Fraunces',Georgia,serif;font-size:1.42rem;font-weight:700;letter-spacing:-.025em;line-height:1.1;color:#0f1f3d}
    .dm-sub{margin:6px 0 0;color:#4b5563;font-size:.82rem;line-height:1.45}
    .dm-body{padding:14px 22px 0;flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin}
    .dm-section{margin-bottom:12px;padding:14px;border:1px solid rgba(15,31,61,0.08);border-radius:12px;background:#faf7f3}
    .dm-label{margin:0 0 8px;color:#4b5563;font-size:9px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;display:block}
    .dm-freq{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:3px;border:1px solid rgba(15,31,61,0.1);border-radius:10px;background:#fff}
    .dm-freq button{min-height:36px;border:1px solid transparent;border-radius:8px;background:transparent;color:#6b7280;cursor:pointer;font-family:inherit;font-size:.82rem;font-weight:700;transition:all 150ms}
    .dm-freq button.active{border-color:rgba(124,58,237,0.55);background:rgba(124,58,237,0.1);color:#5b21b6}
    .dm-tiers{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px}
    .dm-tier{background:#fff;border:1.5px solid rgba(15,31,61,0.1);border-radius:10px;padding:11px 12px;cursor:pointer;transition:all .14s;text-align:left;font-family:inherit}
    .dm-tier:hover{border-color:rgba(124,58,237,.35);background:rgba(124,58,237,.04)}
    .dm-tier.active{border-color:var(--dm-accent,#7c3aed);background:rgba(124,58,237,.08);box-shadow:0 0 0 1px rgba(124,58,237,.18)}
    .dm-tier-amt{font-family:'Fraunces',Georgia,serif;font-size:1.05rem;font-weight:700;color:#0f1f3d;display:block;margin-bottom:1px}
    .dm-tier.active .dm-tier-amt{color:#5b21b6}
    .dm-tier-lbl{font-size:.7rem;color:#6b7280;font-weight:500}
    .dm-custom-wrap{position:relative}
    .dm-dollar{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#6b7280;font-weight:800;pointer-events:none;font-size:.85rem}
    .dm-custom{width:100%;min-height:38px;padding:9px 11px 9px 26px;border:1.5px solid rgba(15,31,61,0.12);border-radius:9px;outline:none;appearance:textfield;background:#fff;color:#1a1622;font-family:inherit;font-size:.88rem;font-weight:700;transition:border-color 150ms,box-shadow 150ms}
    .dm-custom::-webkit-inner-spin-button{-webkit-appearance:none}
    .dm-custom::placeholder{color:#9ca3af}
    .dm-custom:focus{border-color:var(--dm-accent,#7c3aed);box-shadow:0 0 0 3px rgba(124,58,237,.14)}
    .dm-contact{display:flex;flex-direction:column;gap:8px}
    .dm-email{width:100%;min-height:38px;padding:9px 11px;border:1.5px solid rgba(15,31,61,0.12);border-radius:9px;outline:none;background:#fff;color:#1a1622;font-family:inherit;font-size:.84rem;font-weight:500;transition:border-color 150ms,box-shadow 150ms}
    .dm-email::placeholder{color:#9ca3af}
    .dm-email:focus{border-color:var(--dm-accent,#7c3aed);box-shadow:0 0 0 3px rgba(124,58,237,.14)}
    .dm-memo{width:100%;min-height:38px;padding:9px 11px;border:1.5px solid rgba(15,31,61,0.12);border-radius:9px;outline:none;background:#fff;color:#1a1622;font-family:inherit;font-size:.84rem;font-weight:500;transition:border-color 150ms,box-shadow 150ms}
    .dm-memo::placeholder{color:#9ca3af}
    .dm-memo:focus{border-color:var(--dm-accent,#7c3aed);box-shadow:0 0 0 3px rgba(124,58,237,.14)}
    .dm-nl-row{display:flex;align-items:flex-start;gap:9px;padding:9px 10px;border:1px solid rgba(15,31,61,0.08);border-radius:9px;background:#fff;cursor:pointer}
    .dm-nl-row input[type=checkbox]{width:15px;height:15px;flex-shrink:0;margin-top:1px;accent-color:var(--dm-accent,#7c3aed);cursor:pointer}
    .dm-nl-lbl{font-size:.76rem;color:#4b5563;line-height:1.4;cursor:pointer}
    .dm-nl-lbl strong{color:#1a1622;font-weight:600;display:block;margin-bottom:1px;font-size:.78rem}
    .dm-fee-row{display:flex;align-items:flex-start;gap:9px;padding:10px 11px;margin-bottom:10px;border:1px solid rgba(15,31,61,0.07);border-radius:9px;background:rgba(255,255,255,0.72);cursor:pointer}
    .dm-fee-row input[type=checkbox]{width:15px;height:15px;flex-shrink:0;margin-top:2px;accent-color:var(--dm-accent,#7c3aed);cursor:pointer}
    .dm-fee-copy{font-size:.74rem;color:#6b7280;line-height:1.45;cursor:pointer}
    .dm-fee-copy strong{color:#374151;font-weight:600;display:block;margin-bottom:2px;font-size:.76rem}
    .dm-stripe-wrap{margin:0}
    .dm-skeleton{height:112px;border-radius:9px;background:linear-gradient(90deg,rgba(15,31,61,.04) 25%,rgba(15,31,61,.08) 50%,rgba(15,31,61,.04) 75%);background-size:200% 100%;animation:dm-shimmer 1.4s infinite}
    @keyframes dm-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
    .dm-footer{padding:12px 22px 18px;flex:none;background:#f5f2e9;border-top:1px solid rgba(15,31,61,.09);box-shadow:0 -10px 24px rgba(15,23,42,.04);z-index:2}
    .dm-submit{width:100%;min-height:44px;border:0;border-radius:10px;background:linear-gradient(135deg,var(--dm-accent,#6d28d9),var(--dm-accent,#7c3aed));color:#fff;cursor:pointer;font-family:inherit;font-size:.9rem;font-weight:900;letter-spacing:-.01em;transition:opacity 150ms,transform 120ms;position:relative;overflow:hidden}
    .dm-submit:hover:not(:disabled){opacity:.9;transform:translateY(-1px)}
    .dm-submit:disabled{opacity:.5;cursor:not-allowed;transform:none}
    .dm-submit.loading::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.15),transparent);animation:dm-shine 1.1s infinite}
    @keyframes dm-shine{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
    .dm-error{display:none;margin-top:9px;padding:9px 11px;border:1px solid rgba(220,38,38,.2);border-radius:9px;background:rgba(220,38,38,.06);color:#b91c1c;font-size:.78rem;line-height:1.4}
    .dm-secure{margin-top:9px;color:#6b7280;text-align:center;font-size:.68rem;line-height:1.4}
    .dm-success{display:none;text-align:center;padding:40px 22px}
    .dm-success-icon{width:50px;height:50px;border-radius:50%;margin:0 auto 14px;background:rgba(124,58,237,.1);border:1.5px solid rgba(124,58,237,.25);display:flex;align-items:center;justify-content:center;font-size:1.3rem;color:var(--dm-accent,#7c3aed)}
    .dm-success h3{font-family:'Fraunces',Georgia,serif;font-size:1.2rem;color:#0f1f3d;margin:0 0 7px}
    .dm-success p{font-size:.82rem;color:#4b5563;margin:0;line-height:1.5}
    .dm-test-banner{display:none;margin:10px 0 0;padding:8px 10px;border:1px solid rgba(217,119,6,.3);border-radius:9px;background:rgba(251,191,36,.12);color:#92400e;font-size:.74rem;line-height:1.4;text-align:center}
    .dm-test-banner.is-visible{display:block}
    #dm-modal.dm-compact .dm-section{padding:10px;margin-bottom:8px}
    #dm-modal.dm-compact .dm-tier{padding:8px 10px}
    #dm-modal.dm-compact .dm-header{padding-bottom:8px}
    #dm-modal.dm-no-monthly .dm-freq{display:none}
    #dm-modal:focus{outline:none}
    @media(prefers-reduced-motion:reduce){#dm-modal,#dm-overlay{animation:none}.dm-tier,.dm-submit{transition:none}}
    @media(max-width:460px){#dm-overlay{align-items:flex-end;padding:8px}#dm-modal{border-radius:14px 14px 0 0;max-height:94vh}.dm-header{padding:18px 18px 0}.dm-body{padding:12px 18px 0}.dm-footer{padding:0 18px 18px}.dm-tiers{grid-template-columns:1fr 1fr}}
  `;

  let tiers = [], selectedAmount = 1, frequency = 'one_time';
  let coverFees = true;
  let presetCampaignId = null, presetAmount = null, presetEntryId = null;
  let presetDonorEmail = null, presetDonorNote = null;
  let modalSettings = { eyebrow: "Companions of CPAS", title: "Support Our Mission",
    subtitle: "Your gift helps dogs at Caddo Parish Animal Services move from crisis to care.",
    theme: { accent: "#7c3aed", radius: 14 }, allow_monthly: true };
  let previousBodyOverflow = null, modalKeyHandler = null;
  let stripeInst = null, elements = null, isSubmitting = false;
  let stripePk = null, stripeTestMode = false, configPromise = null;
  let reinitTimer = null;
  // Data-driven popup state (null = classic donation modal, unchanged).
  let modalCfg = null, modalKey = null, itemQty = {}, currentClientSecret = null;

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

  function htmlText(value) { return String(value || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

  async function fetchModalSettings() {
    try {
      const res = await fetch(ENDPOINT_MODAL, { headers: { accept: "application/json" } });
      const data = await res.json();
      if (res.ok && data?.success && data.config) modalSettings = data.config;
    } catch (_) { /* preserve working donation defaults if CMS settings are unavailable */ }
    return modalSettings;
  }

  function money(v) { const n = Number(v); return Number.isFinite(n) ? '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '$0'; }
  function moneyExact(cents) { return '$' + (Number(cents || 0) / 100).toFixed(2); }
  function getAmount() { if (modalCfg) return itemsTotalCents() / 100; const c = document.getElementById('dm-custom'); const v = c && c.value ? Number(c.value) : 0; return v > 0 ? v : selectedAmount; }
  function getActiveTier() { return tiers.find(t => t.amount_cents === getAmount() * 100) || null; }

  function getDonorNote() { return (document.getElementById('dm-memo')?.value || '').trim().slice(0, 500) || null; }

  // ── Data-driven checkout popup (cms_globals checkout_modal) ─────────────────────────────
  const ITEMS_CSS = `
    .dm-item{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:12px 14px;border:1px solid rgba(124,58,237,.18);border-radius:12px;margin-bottom:10px;background:rgba(255,255,255,.55)}
    .dm-item-info{display:flex;flex-direction:column;gap:2px;min-width:0}
    .dm-item-label{font-weight:800;font-size:.98rem}
    .dm-item-price{font-weight:700;color:#7c3aed;font-size:.9rem}
    .dm-item-note{font-size:.78rem;opacity:.7;line-height:1.35}
    .dm-step-wrap{display:flex;align-items:center;gap:10px;flex:none}
    .dm-step{width:36px;height:36px;border-radius:50%;border:1px solid rgba(124,58,237,.4);background:#fff;font-size:1.15rem;font-weight:800;line-height:1;cursor:pointer;color:#4c1d95}
    .dm-step:hover{background:#f3e8ff}
    .dm-qty{min-width:22px;text-align:center;font-weight:800;font-size:1.05rem}
    .dm-hands{font-size:.8rem;opacity:.75;margin-top:2px}
    .dm-fields{display:grid;gap:10px}
    .dm-participants{display:grid;gap:10px}
    .dm-person-label{display:grid;gap:5px;color:#4b5563;font-size:11px;font-weight:700}
    #dm-modal.is-items{width:min(100%,480px);border-radius:20px}
    #dm-modal.is-items .dm-item{min-height:78px;border:1px solid rgba(15,31,61,.12);border-radius:12px;background:#fff;padding:13px 14px;margin-bottom:8px}
    #dm-modal.is-items .dm-header{padding:25px 25px 0}
    #dm-modal.is-items .dm-body{padding:18px 25px 0}
    #dm-modal.is-items .dm-footer{padding:8px 25px 24px}
    #dm-modal.is-items .dm-section{border-radius:14px;border:1px solid #e5e3e0;background:rgba(255,255,255,.5);padding:16px;margin-bottom:12px}
    #dm-modal.is-items .dm-title{font-size:clamp(1.5rem,4.5vw,2rem)}
    @media(max-width:460px){#dm-modal.is-items{width:100%;border-radius:18px 18px 0 0;max-height:94dvh}#dm-modal.is-items .dm-header{padding:20px 18px 0}#dm-modal.is-items .dm-body{padding:14px 15px 0}#dm-modal.is-items .dm-footer{padding:8px 18px 20px}}
    @media(prefers-reduced-motion:reduce){#dm-overlay,#dm-modal{animation:none}}`;
  function escHtml(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  async function fetchModalConfig(key) {
    try {
      const r = await fetch('/api/checkout/modals/' + encodeURIComponent(key));
      if (!r.ok) return null;
      const d = await r.json();
      return (d && d.mode === 'items' && Array.isArray(d.items) && d.items.length) ? d : null;
    } catch { return null; }
  }
  function applyModalConfig(cfg, ticketKey) {
    if (!cfg) { modalCfg = null; modalKey = null; itemQty = {}; return; }
    modalCfg = cfg; modalKey = cfg.key;
    itemQty = {};
    cfg.items.forEach(it => { itemQty[it.key] = it.default_qty || 0; });
    if (ticketKey && Object.prototype.hasOwnProperty.call(itemQty, ticketKey)) itemQty[ticketKey] = Math.max(1, itemQty[ticketKey]);
    if (cfg.campaign_id) presetCampaignId = cfg.campaign_id;
    presetAmount = null;
    coverFees = !!(cfg.cover_fees && cfg.cover_fees.enabled && cfg.cover_fees.default);
  }
  function itemsTotalCents() {
    if (!modalCfg) return 0;
    return modalCfg.items.reduce((sum, it) => sum + (itemQty[it.key] || 0) * it.price_cents, 0);
  }
  function itemsPayload() {
    return modalCfg.items.map(it => ({ key: it.key, qty: itemQty[it.key] || 0 })).filter(l => l.qty > 0);
  }
  function handsCount() { return modalCfg ? modalCfg.items.reduce((n, it) => n + (itemQty[it.key] || 0), 0) : 0; }
  function participantDrafts() {
    const cache = new Map();
    document.querySelectorAll('[data-participant-key]').forEach((el) => {
      cache.set(el.dataset.participantKey + ':' + el.dataset.participantIndex, el.value);
    });
    return cache;
  }
  function participantInputs() {
    const enabled = new Set(modalCfg?.participant_items || []);
    const container = document.getElementById('dm-participants');
    if (!container) return;
    const old = participantDrafts();
    let html = '';
    (modalCfg.items || []).forEach((item) => {
      if (!enabled.has(item.key)) return;
      for (let i = 1; i <= (itemQty[item.key] || 0); i++) {
        html += `<label class="dm-person-label">${escHtml(item.label)} ${i} · Full name *
          <input class="dm-email dm-person" type="text" autocomplete="off" required maxlength="100"
            data-participant-key="${escHtml(item.key)}" data-participant-index="${i}"
            aria-label="${escHtml(item.label)} ${i} full name" placeholder="First and last name" /></label>`;
      }
    });
    container.innerHTML = html;
    container.querySelectorAll('.dm-person').forEach((el) => {
      el.value = old.get(el.dataset.participantKey + ':' + el.dataset.participantIndex) || '';
    });
  }
  function collectedParticipantNames() {
    return [...document.querySelectorAll('#dm-participants .dm-person')].map((el) => ({
      key: el.dataset.participantKey, index: Number(el.dataset.participantIndex), name: el.value.trim(),
    }));
  }
  function missingRequiredField() {
    for (const f of (modalCfg?.fields || [])) {
      const el = document.getElementById('dmf-' + f.key);
      if (f.required && !(el && el.value.trim())) return f.label;
    }
    if (collectedParticipantNames().some((item) => !item.name)) return 'Each participant name';
    return null;
  }
  async function attachFields() {
    const pi = String(currentClientSecret || '').split('_secret_')[0];
    const fields = {};
    (modalCfg.fields || []).forEach(f => {
      const el = document.getElementById('dmf-' + f.key);
      if (el && el.value.trim()) fields[f.key] = el.value.trim();
    });
    const r = await fetch('/api/checkout/intent-fields', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_intent_id: pi, modal_key: modalKey,
        fields, participant_names: collectedParticipantNames() }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || 'Could not save your registration details.');
  }
  function buildItemsHTML() {
    const c = modalCfg;
    const rows = c.items.map(it => `
      <div class="dm-item">
        <div class="dm-item-info">
          <span class="dm-item-label">${escHtml(it.label)}</span>
          <span class="dm-item-price">${moneyExact(it.price_cents)}</span>
          ${it.note ? `<span class="dm-item-note">${escHtml(it.note)}</span>` : ''}
        </div>
        <div class="dm-step-wrap">
          <button type="button" class="dm-step" data-step="-1" data-key="${escHtml(it.key)}" aria-label="Fewer ${escHtml(it.label)}">&minus;</button>
          <span class="dm-qty" id="dm-qty-${escHtml(it.key)}" aria-live="polite">${itemQty[it.key] || 0}</span>
          <button type="button" class="dm-step" data-step="1" data-key="${escHtml(it.key)}" aria-label="More ${escHtml(it.label)}">+</button>
        </div>
      </div>`).join('');
    const fieldInputs = (c.fields || []).map(f => `
      <input id="dmf-${escHtml(f.key)}" class="dm-email" type="${escHtml(f.type)}" placeholder="${escHtml(f.label)}${f.required ? ' *' : ''}" aria-label="${escHtml(f.label)}" autocomplete="off" />`).join('');
    const feeWrap = (c.cover_fees && c.cover_fees.enabled) ? `
        <div id="dm-cover-fees-wrap">
          <label class="dm-fee-row" for="dm-cover-fees">
            <input type="checkbox" id="dm-cover-fees" ${coverFees ? 'checked' : ''} />
            <span class="dm-fee-copy"><strong id="fee-label">Cover processing fees</strong>More of your payment goes to the animals.</span>
          </label>
        </div>` : '';
    return `
      <div class="dm-header">
        <button class="dm-close" id="dm-close" type="button" aria-label="Close">&times;</button>
        <div class="dm-eyebrow">${escHtml(c.eyebrow || 'Companions of CPAS')}</div>
        <h2 class="dm-title">${escHtml(c.title)}</h2>
        ${c.subtitle ? `<p class="dm-sub">${escHtml(c.subtitle)}</p>` : ''}
        <div class="dm-test-banner${stripeTestMode ? ' is-visible' : ''}" id="dm-test-banner">Stripe test mode. No real charges.</div>
      </div>
      <div class="dm-body">
        <div class="dm-section">
          <span class="dm-label">${escHtml(c.items_title || 'Choose your entries')}</span>
          ${rows}
          <div class="dm-hands" id="dm-hands"></div>
        </div>
        <div class="dm-section">
          <span class="dm-label">${escHtml(c.details_title || 'Your details')}</span>
          <div class="dm-fields">
            <input id="receipt-email" class="dm-email" type="email" placeholder="Email for your receipt *" aria-label="Email" autocomplete="email" name="email" />
            ${fieldInputs}
            <div id="dm-participants" class="dm-participants" aria-label="Participant names"></div>
          </div>
        </div>
        <div class="dm-section">
          <span class="dm-label">Payment details</span>
          <div class="dm-stripe-wrap">
            <div id="dm-skeleton" class="dm-skeleton"></div>
            <div id="dm-mount" style="display:none"></div>
          </div>
        </div>
      </div>
      <div class="dm-footer">
        ${feeWrap}
        <button class="dm-submit" id="dm-submit" type="button" disabled>Loading...</button>
        <div class="dm-error" id="dm-error"></div>
        <div class="dm-secure">Secured by Stripe &middot; PCI compliant &middot; Receipt emailed when payment succeeds</div>
      </div>
      <div class="dm-success" id="dm-success">
        <div class="dm-success-icon">&#10003;</div>
        <h3>Thank you.</h3>
        <p id="dm-success-msg"></p>
      </div>`;
  }
  function refreshItems() {
    modalCfg.items.forEach(it => { const el = document.getElementById('dm-qty-' + it.key); if (el) el.textContent = itemQty[it.key] || 0; });
    const h = document.getElementById('dm-hands'); const n = handsCount();
    if (h) h.textContent = n ? `${n} selected entr${n === 1 ? 'y' : 'ies'}` : 'Choose at least one entry';
    participantInputs();
    updateFeeDisplay();
  }
  function bindItems() {
    document.querySelectorAll('.dm-step').forEach(b => b.addEventListener('click', () => {
      const it = modalCfg.items.find(i => i.key === b.dataset.key); if (!it) return;
      itemQty[it.key] = Math.max(it.min || 0, Math.min(it.max, (itemQty[it.key] || 0) + Number(b.dataset.step)));
      refreshItems(); scheduleReinitElements();
    }));
    refreshItems();
  }

  function injectStyles() {
    if (document.getElementById('dm-styles')) return;
    const s = document.createElement('style'); s.id = 'dm-styles'; s.textContent = CSS + ITEMS_CSS; document.head.appendChild(s);
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
    if (modalCfg) return buildItemsHTML();
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
        <div class="dm-eyebrow">${htmlText(modalSettings.eyebrow)}</div>
        <h2 class="dm-title" id="dm-title">${htmlText(modalSettings.title)}</h2>
        <p class="dm-sub">${htmlText(modalSettings.subtitle)}</p>
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
        <div class="dm-section">
          <span class="dm-label">Donation purpose <span style="color:#9ca3af;font-weight:500;text-transform:none;letter-spacing:0">— optional</span></span>
          <input id="dm-memo" class="dm-memo" type="text" maxlength="200" placeholder="e.g. Transport fund, Biscuit's vet care, general..." autocomplete="off" />
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
      if (modalCfg && getSelectedAmountCents() < 100) {
        const sk0 = document.getElementById('dm-skeleton'), mt0 = document.getElementById('dm-mount'), b0 = document.getElementById('dm-submit');
        if (sk0) { sk0.style.display = 'block'; sk0.style.animation = 'none'; sk0.innerHTML = '<div style="padding:16px;text-align:center;font-size:.85rem;opacity:.8">Choose at least one entry to continue.</div>'; }
        if (mt0) mt0.style.display = 'none';
        if (b0) b0.disabled = true;
        return;
      }
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
      if (modalCfg) { payload.modal_key = modalKey; payload.items = itemsPayload(); }
      if (presetEntryId) payload.entry_id = presetEntryId;
      // Include memo at intent creation time so it's stored in D1 + Stripe metadata
      const note = getDonorNote() || presetDonorNote;
      if (note) payload.note = note;
      const res = await fetch(ENDPOINT_INTENT, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.client_secret) throw new Error(data.error || 'Could not initialize payment.');
      currentClientSecret = data.client_secret;
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
    if (modalCfg) { const missing = missingRequiredField(); if (missing) { setErr(`${missing} is required.`); return; } }
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
        if (modalCfg) await attachFields();
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
              entry_id: presetEntryId || null,
              campaign_id: presetCampaignId || null,
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
          body: JSON.stringify({ payment_method_id: setupIntent.payment_method, price_id: tier?.stripe_price_id_monthly || null, amount_cents: tier ? null : intendedCents, donor_email: email, nl_opt_in: nlOptIn, save_my_info: saveInfo }),
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
      btn.textContent = modalCfg ? String(modalCfg.submit_label || 'Pay {total}').replace('{total}', moneyExact(totalCents)) : `Donate ${moneyExact(totalCents)}`;
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
    if (modalCfg) {
      const h = modal.querySelector('#dm-success h3'); if (h && modalCfg.success_title) h.textContent = modalCfg.success_title;
      if (msg) msg.textContent = modalCfg.success_message || (email ? `Receipt headed to ${email}. Thank you.` : 'Thank you.');
      setTimeout(close, 12000); return;
    }
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

  function open(eventOrOpts) {
    const opts = (eventOrOpts && typeof eventOrOpts === 'object' && typeof eventOrOpts.preventDefault !== 'function')
      ? eventOrOpts
      : null;
    if (!opts && eventOrOpts && typeof eventOrOpts.preventDefault === 'function') eventOrOpts.preventDefault();
    if (document.getElementById('dm-overlay')) return;
    const trigger = opts ? null : (
      eventOrOpts?.currentTarget?.closest?.('[data-action="donate"],[data-donate]')
      || eventOrOpts?.target?.closest?.('[data-action="donate"],[data-donate]')
    );
    presetCampaignId = opts?.campaign_id || opts?.campaignId || trigger?.dataset?.campaignId || null;
    presetEntryId = opts?.entry_id || opts?.entryId || trigger?.dataset?.entryId || null;
    presetDonorEmail = opts?.donor_email || opts?.donorEmail || null;
    presetDonorNote = opts?.note || null;
    const wantedModalKey = opts?.modal_key || opts?.modalKey || trigger?.dataset?.modalKey || null;
    const wantedTicket = opts?.ticket_key || trigger?.dataset?.eventTicket || null;
    const presetAmt = Number(opts?.amount || trigger?.dataset?.amount || 0);
    const presetCents = Number(opts?.amount_cents || opts?.amountCents || trigger?.dataset?.amountCents || 0);
    presetAmount = presetAmt > 0 ? presetAmt : (presetCents > 0 ? presetCents / 100 : null);
    injectStyles();
    selectedAmount = presetAmount || 1;
    frequency = 'one_time';
    coverFees = true;
    elements = null; isSubmitting = false;
    stripeInst = null; configPromise = null;
    const modalPromise = wantedModalKey ? fetchModalConfig(wantedModalKey) : Promise.resolve(null);
    const tiersPromise = fetchTiers();
    const modalSettingsPromise = fetchModalSettings();
    const configLoad = fetchStripeConfig().catch(() => null);
    loadStripe().catch(() => {});
    const overlay = document.createElement('div');
    overlay.id = 'dm-overlay'; overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true'); overlay.setAttribute('aria-labelledby', 'dm-title');
    const modal = document.createElement('div'); modal.id = 'dm-modal';
    modal.innerHTML = '<div style="padding:40px 28px"><div style="height:28px;width:70%;border-radius:6px;background:rgba(255,255,255,.06);margin-bottom:20px;animation:dm-shimmer 1.4s infinite;background-size:200% 100%"></div><div style="height:44px;border-radius:10px;background:rgba(255,255,255,.06);margin-bottom:10px;animation:dm-shimmer 1.4s infinite;background-size:200% 100%"></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:18px"><div style="height:66px;border-radius:10px;background:rgba(255,255,255,.06);animation:dm-shimmer 1.4s infinite;background-size:200% 100%"></div><div style="height:66px;border-radius:10px;background:rgba(255,255,255,.06);animation:dm-shimmer 1.4s infinite;background-size:200% 100%"></div><div style="height:66px;border-radius:10px;background:rgba(255,255,255,.06);animation:dm-shimmer 1.4s infinite;background-size:200% 100%"></div><div style="height:66px;border-radius:10px;background:rgba(255,255,255,.06);animation:dm-shimmer 1.4s infinite;background-size:200% 100%"></div></div><div style="height:130px;border-radius:10px;background:rgba(255,255,255,.06);animation:dm-shimmer 1.4s infinite;background-size:200% 100%"></div></div>';
    overlay.appendChild(modal); document.body.appendChild(overlay);
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    modal.setAttribute('tabindex', '-1'); modal.focus({ preventScroll: true });
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    modalKeyHandler = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab') return;
      const focusable = [...modal.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href]')].filter(el => el.offsetParent !== null);
      if (!focusable.length) { e.preventDefault(); return; }
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', modalKeyHandler);
    tiersPromise.then(async (loaded) => {
      await Promise.all([configLoad, modalSettingsPromise]);
      tiers = loaded;
      applyModalConfig(await modalPromise, wantedTicket);
      if (!document.getElementById('dm-overlay')) return;
      const style = modalSettings.theme || {};
      modal.style.setProperty('--dm-accent', /^#[0-9a-f]{6}$/i.test(style.accent || '') ? style.accent : '#7c3aed');
      modal.style.borderRadius = (Math.min(24, Math.max(6, Number(style.radius) || 14))) + 'px';
      modal.classList.toggle('dm-compact', style.compact === true);
      modal.classList.toggle('dm-no-monthly', modalSettings.allow_monthly === false);
      modal.classList.toggle('is-items', !!modalCfg);
      modal.innerHTML = buildHTML(); bindEvents(); if (modalCfg) bindItems(); mirrorReceiptEmail();
      if (presetDonorEmail) {
        const emailInput = document.getElementById('receipt-email');
        if (emailInput) emailInput.value = presetDonorEmail;
      }
      if (presetDonorNote) {
        const memo = document.getElementById('dm-memo');
        if (memo) memo.value = presetDonorNote;
      }
      initElements();
    });
  }

  function close() {
    const el = document.getElementById('dm-overlay'); if (el) el.remove();
    if (modalKeyHandler) { document.removeEventListener('keydown', modalKeyHandler); modalKeyHandler = null; }
    if (previousBodyOverflow !== null) { document.body.style.overflow = previousBodyOverflow; previousBodyOverflow = null; }
    elements = null; isSubmitting = false;
    presetCampaignId = null; presetAmount = null; presetEntryId = null;
    presetDonorEmail = null; presetDonorNote = null;
    modalCfg = null; modalKey = null; itemQty = {}; currentClientSecret = null;
  }

  function bindEvents() {
    document.getElementById('dm-close').addEventListener('click', close);
    document.querySelectorAll('.dm-freq button').forEach(btn => {
      btn.addEventListener('click', () => {
        if (modalSettings.allow_monthly === false) return;
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
    // Re-init when memo changes so the note is captured at intent creation time
    document.getElementById('dm-memo')?.addEventListener('change', function () {
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
