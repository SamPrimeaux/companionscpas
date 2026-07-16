/**
 * One-off Wet Dog competition payment modal.
 * Isolated from donate-modal.js: fixed one-time fee, no tiers, no monthly option.
 */
(function () {
  'use strict';

  const CONFIG_ENDPOINT = '/api/donations/config';
  const INTENT_ENDPOINT = '/api/donations/intent';
  const AFTER_PAYMENT_ENDPOINT = '/api/donations/after-payment';
  const LOGO_URL = 'https://assets.companionsofcaddo.org/companionsofcpa-newlogo.webp';

  const APPEARANCE = {
    theme: 'stripe',
    variables: {
      colorPrimary: '#6f2270',
      colorBackground: '#ffffff',
      colorText: '#211b25',
      colorDanger: '#b4233d',
      fontFamily: "'DM Sans', system-ui, sans-serif",
      borderRadius: '10px',
      spacingUnit: '4px',
    },
    rules: {
      '.Input': {
        border: '1.5px solid #ded5df',
        boxShadow: 'none',
        padding: '11px 12px',
      },
      '.Input:focus': {
        border: '1.5px solid #6f2270',
        boxShadow: '0 0 0 3px rgba(111,34,112,.12)',
      },
      '.Label': {
        color: '#5d5163',
        fontSize: '12px',
        fontWeight: '700',
      },
      '.Tab': { border: '1.5px solid #ded5df' },
      '.Tab--selected': {
        border: '1.5px solid #6f2270',
        backgroundColor: '#faf5fb',
      },
    },
  };

  const CSS = `
    #cepay-overlay{position:fixed;inset:0;z-index:10050;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(25,14,30,.7);backdrop-filter:blur(10px);animation:cepay-fade .18s ease}
    #cepay-overlay *{box-sizing:border-box}
    #cepay-modal{width:min(100%,470px);max-height:92vh;overflow:auto;border-radius:24px;background:#f7f2ea;color:#211b25;box-shadow:0 34px 100px rgba(17,7,25,.4);font-family:'DM Sans',system-ui,sans-serif;animation:cepay-up .25s cubic-bezier(.2,.8,.2,1)}
    .cepay-head{position:relative;padding:25px 28px 22px;background:linear-gradient(145deg,#6f2270,#4e1a52);text-align:center;color:#fff}
    .cepay-logo{display:block;width:92px;height:auto;margin:0 auto 13px}
    .cepay-kicker{margin:0 0 6px;font-size:10px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.75)}
    .cepay-title{margin:0;font-family:'Fraunces',Georgia,serif;font-size:27px;line-height:1.12;color:#f8eefa;text-shadow:0 1px 0 rgba(0,0,0,.08)}
    .cepay-close{position:absolute;top:13px;right:13px;display:grid;place-items:center;width:32px;height:32px;border:1px solid rgba(255,255,255,.25);border-radius:50%;background:rgba(255,255,255,.1);color:#fff;font-size:20px;cursor:pointer}
    .cepay-body{padding:20px 24px 10px}
    .cepay-summary{display:grid;grid-template-columns:1fr auto;gap:16px;align-items:center;margin-bottom:15px;padding:15px 16px;border:1px solid rgba(79,40,87,.12);border-radius:15px;background:#fff}
    .cepay-summary strong{display:block;font-size:16px;color:#302636}
    .cepay-summary span{display:block;margin-top:3px;color:#746978;font-size:12px}
    .cepay-amount{font-family:'Fraunces',Georgia,serif;font-size:28px;font-weight:700;color:#6f2270}
    .cepay-contact{margin-bottom:15px;padding:13px 15px;border-radius:13px;background:#eee6f1;color:#55475b;font-size:13px;line-height:1.5}
    .cepay-contact b{color:#35283b}
    .cepay-payment{min-height:142px;padding:15px;border:1px solid rgba(79,40,87,.12);border-radius:15px;background:#fff}
    .cepay-label{display:block;margin:0 0 11px;color:#5d5163;font-size:11px;font-weight:800;letter-spacing:.09em;text-transform:uppercase}
    .cepay-skeleton{height:115px;border-radius:10px;background:linear-gradient(90deg,#f4eff5 20%,#e9e0eb 50%,#f4eff5 80%);background-size:200% 100%;animation:cepay-shimmer 1.3s infinite}
    .cepay-error{display:none;margin:12px 0 0;padding:10px 12px;border:1px solid rgba(180,35,61,.2);border-radius:10px;background:rgba(180,35,61,.07);color:#a61b38;font-size:13px;line-height:1.45}
    .cepay-foot{padding:10px 24px 24px}
    .cepay-submit{width:100%;min-height:48px;border:0;border-radius:12px;background:#6f2270;color:#fff;font:800 15px 'DM Sans',system-ui,sans-serif;cursor:pointer;transition:transform .15s,opacity .15s}
    .cepay-submit:hover:not(:disabled){transform:translateY(-1px);background:#5a1d5c}
    .cepay-submit:disabled{opacity:.5;cursor:not-allowed}
    .cepay-secure{margin:10px 0 0;text-align:center;color:#786d7c;font-size:11px}
    .cepay-success{padding:42px 28px;text-align:center}
    .cepay-check{display:grid;place-items:center;width:58px;height:58px;margin:0 auto 15px;border-radius:50%;background:#e9f6ec;color:#237a3b;font-size:28px;font-weight:900}
    .cepay-success h3{margin:0 0 8px;font-family:'Fraunces',Georgia,serif;font-size:25px;color:#4e1a52}
    .cepay-success p{margin:0;color:#64586a;font-size:14px;line-height:1.6}
    @keyframes cepay-fade{from{opacity:0}to{opacity:1}}
    @keyframes cepay-up{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:none}}
    @keyframes cepay-shimmer{to{background-position:-200% 0}}
    @media(max-width:520px){#cepay-overlay{align-items:flex-end;padding:0}#cepay-modal{max-height:95vh;border-radius:22px 22px 0 0}.cepay-head{padding:22px 22px 18px}.cepay-body,.cepay-foot{padding-left:18px;padding-right:18px}}
  `;

  let stripe = null;
  let elements = null;
  let options = null;
  let submitting = false;

  function injectStyles() {
    if (document.getElementById('cepay-styles')) return;
    const style = document.createElement('style');
    style.id = 'cepay-styles';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  function loadStripe() {
    return new Promise((resolve, reject) => {
      if (window.Stripe) return resolve(window.Stripe);
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.onload = () => resolve(window.Stripe);
      script.onerror = () => reject(new Error('Stripe could not be loaded.'));
      document.head.appendChild(script);
    });
  }

  function money(cents) {
    return '$' + (Number(cents || 0) / 100).toFixed(2);
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function setError(message) {
    const el = document.getElementById('cepay-error');
    if (!el) return;
    el.textContent = message || '';
    el.style.display = message ? 'block' : 'none';
  }

  function friendlyError(error) {
    const message = String(error?.message || error || '');
    if (/email/i.test(message)) return 'Please confirm the email on your entry and try again.';
    return message || 'Payment could not be completed. Please try again.';
  }

  function close() {
    document.getElementById('cepay-overlay')?.remove();
    document.body.style.overflow = '';
    elements = null;
    stripe = null;
    options = null;
    submitting = false;
  }

  function showSuccess() {
    const modal = document.getElementById('cepay-modal');
    if (!modal) return;
    modal.innerHTML = `
      <div class="cepay-success">
        <div class="cepay-check">✓</div>
        <h3>Your entry payment is complete.</h3>
        <p><strong>${escapeHtml(options?.dog_name || 'Your pet')}</strong> is in. Stripe is confirming the payment now, and your entry confirmation will be emailed to <strong>${escapeHtml(options?.donor_email || '')}</strong>.</p>
      </div>`;
    setTimeout(close, 7000);
  }

  async function submit() {
    if (submitting || !stripe || !elements || !options) return;
    submitting = true;
    setError('');
    const button = document.getElementById('cepay-submit');
    if (button) {
      button.disabled = true;
      button.textContent = 'Processing securely…';
    }
    try {
      const result = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
        confirmParams: {
          return_url: `${location.origin}/donate/thank-you`,
          payment_method_data: {
            billing_details: {
              name: options.donor_name || undefined,
              email: options.donor_email,
            },
          },
        },
      });
      if (result.error) throw result.error;

      fetch(AFTER_PAYMENT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          donor_email: options.donor_email,
          payment_intent_id: result.paymentIntent?.id || null,
          entry_id: options.entry_id,
          campaign_id: options.campaign_id,
          nl_opt_in: false,
          save_my_info: false,
        }),
      }).catch(() => {});

      showSuccess();
    } catch (error) {
      submitting = false;
      setError(friendlyError(error));
      if (button) {
        button.disabled = false;
        button.textContent = `Pay ${money(options.amount_cents)} & Submit Entry`;
      }
    }
  }

  async function initializePayment() {
    try {
      const [configResponse, Stripe] = await Promise.all([
        fetch(CONFIG_ENDPOINT),
        loadStripe(),
      ]);
      const config = await configResponse.json().catch(() => ({}));
      if (!configResponse.ok || !config.publishable_key) {
        throw new Error(config.error || 'Stripe is not configured.');
      }

      const intentResponse = await fetch(INTENT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'payment',
          intended_cents: options.amount_cents,
          amount_cents: options.amount_cents,
          cover_fees: false,
          currency: 'usd',
          campaign_id: options.campaign_id,
          entry_id: options.entry_id,
          note: options.note || `Competition entry — ${options.dog_name || options.entry_id}`,
        }),
      });
      const intent = await intentResponse.json().catch(() => ({}));
      if (!intentResponse.ok || !intent.client_secret) {
        throw new Error(intent.error || 'Payment could not be initialized.');
      }

      stripe = Stripe(config.publishable_key);
      elements = stripe.elements({
        clientSecret: intent.client_secret,
        appearance: APPEARANCE,
      });
      const paymentElement = elements.create('payment', {
        layout: { type: 'tabs', defaultCollapsed: false },
        fields: { billingDetails: { name: 'never', email: 'never' } },
      });
      paymentElement.on('ready', () => {
        const skeleton = document.getElementById('cepay-skeleton');
        const mount = document.getElementById('cepay-mount');
        const button = document.getElementById('cepay-submit');
        if (skeleton) skeleton.style.display = 'none';
        if (mount) mount.style.display = 'block';
        if (button) button.disabled = false;
      });
      paymentElement.mount('#cepay-mount');
    } catch (error) {
      const skeleton = document.getElementById('cepay-skeleton');
      if (skeleton) skeleton.style.display = 'none';
      setError(friendlyError(error));
    }
  }

  function open(input = {}) {
    if (document.getElementById('cepay-overlay')) return;
    const amountCents = Math.max(100, Number(input.amount_cents || 0));
    if (!input.entry_id || !input.campaign_id || !input.donor_email) {
      console.error('[competition-payment] Missing required entry payment context.');
      return;
    }
    options = {
      entry_id: String(input.entry_id),
      campaign_id: String(input.campaign_id),
      amount_cents: amountCents,
      donor_email: String(input.donor_email),
      donor_name: String(input.donor_name || ''),
      dog_name: String(input.dog_name || 'Your pet'),
      note: String(input.note || ''),
    };
    injectStyles();

    const overlay = document.createElement('div');
    overlay.id = 'cepay-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'cepay-title');
    overlay.innerHTML = `
      <div id="cepay-modal">
        <header class="cepay-head">
          <button type="button" class="cepay-close" id="cepay-close" aria-label="Close">×</button>
          <img class="cepay-logo" src="${LOGO_URL}" alt="Companions of CPAS">
          <p class="cepay-kicker">Wet Dog Competition</p>
          <h2 class="cepay-title" id="cepay-title">Complete ${escapeHtml(options.dog_name)}’s entry</h2>
        </header>
        <div class="cepay-body">
          <div class="cepay-summary">
            <div><strong>One-time competition entry</strong><span>Fixed fee · no recurring charge</span></div>
            <div class="cepay-amount">${money(options.amount_cents)}</div>
          </div>
          <div class="cepay-contact">
            <b>Entry confirmation:</b> ${escapeHtml(options.donor_email)}<br>
            <b>Entry reference:</b> ${escapeHtml(options.entry_id)}
          </div>
          <div class="cepay-payment">
            <span class="cepay-label">Secure payment details</span>
            <div class="cepay-skeleton" id="cepay-skeleton"></div>
            <div id="cepay-mount" style="display:none"></div>
          </div>
          <div class="cepay-error" id="cepay-error" role="alert"></div>
        </div>
        <footer class="cepay-foot">
          <button type="button" class="cepay-submit" id="cepay-submit" disabled>Loading secure payment…</button>
          <p class="cepay-secure">Secured by Stripe · ${money(options.amount_cents)} one-time charge</p>
        </footer>
      </div>`;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) close();
    });
    document.getElementById('cepay-close')?.addEventListener('click', close);
    document.getElementById('cepay-submit')?.addEventListener('click', submit);
    const escape = (event) => {
      if (event.key !== 'Escape') return;
      document.removeEventListener('keydown', escape);
      close();
    };
    document.addEventListener('keydown', escape);
    initializePayment();
  }

  window.CompetitionEntryPaymentModal = { open, close };
})();
