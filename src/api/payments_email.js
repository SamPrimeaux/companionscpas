const TENANT_ID = "tenant_companionscpas";

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function id(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

async function body(request) {
  try { return await request.json(); } catch { return {}; }
}

function cents(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * 100);
}


function timingSafeEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function parseStripeSignatureHeader(header) {
  const parts = String(header || "").split(",").map((part) => part.trim());
  const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2) || null;
  const signatures = parts
    .filter((part) => part.startsWith("v1="))
    .map((part) => part.slice(3))
    .filter(Boolean);

  return { timestamp, signatures };
}

async function hmacSha256Hex(secret, payload) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function verifyStripeWebhook(request, env) {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    return { ok: false, status: 501, error: "Stripe webhook secret is not configured" };
  }

  const signatureHeader = request.headers.get("stripe-signature");
  if (!signatureHeader) {
    return { ok: false, status: 400, error: "Missing Stripe-Signature header" };
  }

  const rawBody = await request.text();
  const { timestamp, signatures } = parseStripeSignatureHeader(signatureHeader);

  if (!timestamp || signatures.length === 0) {
    return { ok: false, status: 400, error: "Invalid Stripe-Signature header" };
  }

  const timestampNumber = Number(timestamp);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(timestampNumber) || Math.abs(now - timestampNumber) > 300) {
    return { ok: false, status: 400, error: "Stripe webhook timestamp outside tolerance" };
  }

  const signedPayload = `${timestamp}.${rawBody}`;
  const expectedSignature = await hmacSha256Hex(env.STRIPE_WEBHOOK_SECRET, signedPayload);
  const verified = signatures.some((sig) => timingSafeEqual(sig, expectedSignature));

  if (!verified) {
    return { ok: false, status: 400, error: "Invalid Stripe webhook signature" };
  }

  try {
    return { ok: true, event: JSON.parse(rawBody) };
  } catch {
    return { ok: false, status: 400, error: "Invalid Stripe event JSON" };
  }
}


async function logEmail(env, row) {
  try {
    const emailId = id("email");
    await env.DB.prepare(
      `INSERT INTO email_logs
       (id, tenant_id, recipient_email, recipient_name, subject, email_type, provider_message_id, status, related_type, related_id, error_message, sent_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      emailId,
      TENANT_ID,
      row.to,
      row.name || null,
      row.subject,
      row.type || "manual",
      row.provider_message_id || null,
      row.status || "queued",
      row.related_type || null,
      row.related_id || null,
      row.error_message || null,
      row.sent_at || null
    ).run();
    return emailId;
  } catch (err) {
    console.warn("Email log skipped:", err?.message || err);
    return null;
  }
}

async function sendResend(env, { to, name, subject, html, text, type, related_type, related_id }) {
  if (!env.RESEND_API_KEY && !env.RESEND_API_TOKEN) {
    await logEmail(env, { to, name, subject, type, related_type, related_id, status: "skipped", error_message: "Missing RESEND_API_KEY" });
    return { skipped: true, error: "Missing RESEND_API_KEY" };
  }

  const key = env.RESEND_API_KEY || env.RESEND_API_TOKEN;
  const from = env.RESEND_FROM_EMAIL || "Companions of CPAS <no-reply@companionsofcaddo.org>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, " ")
    })
  });

  const raw = await res.text();
  let parsed = {};
  try { parsed = JSON.parse(raw); } catch {}

  if (!res.ok) {
    await logEmail(env, { to, name, subject, type, related_type, related_id, status: "failed", error_message: raw });
    return { ok: false, status: res.status, error: raw };
  }

  await logEmail(env, {
    to,
    name,
    subject,
    type,
    related_type,
    related_id,
    provider_message_id: parsed.id || null,
    status: "sent",
    sent_at: new Date().toISOString()
  });

  return { ok: true, id: parsed.id || null };
}

// ── Shared receipt sender ─────────────────────────────────────────────────────
async function sendDonationReceipt(env, { donorEmail, donorName, amountCents, donationId, intentId, piId }) {
  if (!donorEmail) return;
  const receipt = await sendResend(env, {
    to: donorEmail,
    name: donorName,
    subject: "Thank you for supporting Companions of CPAS",
    type: "donation_receipt",
    related_type: "donation",
    related_id: donationId,
    html: `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;padding:24px">
      <h2>Thank you for your donation</h2>
      <p>Your support helps Companions of CPAS care for animals and serve the community.</p>
      <p><strong>Amount:</strong> $${(amountCents / 100).toFixed(2)}</p>
      <p><strong>Donation ID:</strong> ${donationId}</p>
    </div>`
  });

  try {
    await env.DB.prepare(
      `UPDATE donation_intents
       SET resend_receipt_status = ?, updated_at = datetime('now')
       WHERE id = ? OR provider_checkout_id = ?`
    ).bind(
      receipt?.ok ? "sent" : receipt?.skipped ? "skipped" : "failed",
      intentId || "",
      piId || ""
    ).run();
  } catch {}
}

// ── Shared donor upsert ───────────────────────────────────────────────────────
async function upsertDonor(env, { donorEmail, donorName, amountCents, isRecurring }) {
  if (!donorEmail) return null;
  const existing = await env.DB.prepare(
    "SELECT id FROM donors WHERE tenant_id = ? AND lower(email) = lower(?) LIMIT 1"
  ).bind(TENANT_ID, donorEmail).first();

  if (existing?.id) {
    await env.DB.prepare(
      `UPDATE donors
       SET full_name = COALESCE(full_name, ?),
           total_given_cents = COALESCE(total_given_cents, 0) + ?,
           donation_count = COALESCE(donation_count, 0) + 1,
           last_donated_at = datetime('now'),
           updated_at = datetime('now')
       WHERE id = ?`
    ).bind(donorName, amountCents, existing.id).run();
    return existing.id;
  }

  const donorId = id("donor");
  await env.DB.prepare(
    `INSERT INTO donors
     (id, tenant_id, full_name, email, total_given_cents, donation_count, last_donated_at, is_recurring, recurring_interval, resend_subscribed)
     VALUES (?, ?, ?, ?, ?, 1, datetime('now'), ?, ?, 1)`
  ).bind(
    donorId, TENANT_ID, donorName, donorEmail, amountCents,
    isRecurring ? 1 : 0,
    isRecurring ? "month" : null
  ).run();
  return donorId;
}

export async function paymentsEmailRoutes(request, env, url) {
  const path = url.pathname;
  const method = request.method;

  if (path === "/api/integrations/status" && method === "GET") {
    return json({
      stripe: {
        configured: Boolean(env.STRIPE_SECRET_KEY),
        webhook_configured: Boolean(env.STRIPE_WEBHOOK_SECRET)
      },
      resend: {
        configured: Boolean(env.RESEND_API_KEY || env.RESEND_API_TOKEN),
        from: env.RESEND_FROM_EMAIL || null
      }
    });
  }

  // ── POST /api/donations/intent — PaymentIntent or SetupIntent for in-modal Stripe PaymentElement ──
  if (path === "/api/donations/intent" && method === "POST") {
    if (!env.STRIPE_SECRET_KEY) return json({ error: "Stripe not configured" }, 501);
    const data = await body(request);
    const mode = data.mode === "setup" ? "setup" : "payment";
    const stripeHeaders = {
      "Authorization": `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded"
    };

    if (mode === "payment") {
      const amountCents = data.amount_cents || cents(data.amount);
      if (!amountCents || amountCents < 100) return json({ error: "Minimum donation is $1.00" }, 400);
      const form = new URLSearchParams();
      form.set("amount", String(amountCents));
      form.set("currency", "usd");
      form.set("automatic_payment_methods[enabled]", "true");
      form.set("metadata[tenant_id]", TENANT_ID);
      const res = await fetch("https://api.stripe.com/v1/payment_intents", { method: "POST", headers: stripeHeaders, body: form });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return json({ error: d?.error?.message || "Stripe error" }, 500);
      return json({ client_secret: d.client_secret, mode: "payment" });
    } else {
      // SetupIntent for monthly — collect card, then create subscription server-side
      const form = new URLSearchParams();
      form.set("automatic_payment_methods[enabled]", "true");
      form.set("metadata[tenant_id]", TENANT_ID);
      const res = await fetch("https://api.stripe.com/v1/setup_intents", { method: "POST", headers: stripeHeaders, body: form });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return json({ error: d?.error?.message || "Stripe error" }, 500);
      return json({ client_secret: d.client_secret, mode: "setup" });
    }
  }

  // ── POST /api/donations/subscribe — create Customer + Subscription after SetupIntent ──
  if (path === "/api/donations/subscribe" && method === "POST") {
    if (!env.STRIPE_SECRET_KEY) return json({ error: "Stripe not configured" }, 501);
    const data = await body(request);
    const { payment_method_id, price_id, amount_cents, donor_email } = data;
    if (!payment_method_id) return json({ error: "payment_method_id required" }, 400);

    const h = {
      "Authorization": `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded"
    };

    // 1. Create customer
    const custForm = new URLSearchParams();
    if (donor_email) custForm.set("email", donor_email);
    custForm.set("payment_method", payment_method_id);
    custForm.set("invoice_settings[default_payment_method]", payment_method_id);
    custForm.set("metadata[tenant_id]", TENANT_ID);
    const custRes = await fetch("https://api.stripe.com/v1/customers", { method: "POST", headers: h, body: custForm });
    const customer = await custRes.json().catch(() => ({}));
    if (!custRes.ok) return json({ error: customer?.error?.message || "Could not create customer" }, 500);

    // 2. Attach payment method
    const attachForm = new URLSearchParams();
    attachForm.set("customer", customer.id);
    await fetch(`https://api.stripe.com/v1/payment_methods/${payment_method_id}/attach`, { method: "POST", headers: h, body: attachForm });

    // 3. Create subscription
    const subForm = new URLSearchParams();
    subForm.set("customer", customer.id);
    subForm.set("default_payment_method", payment_method_id);
    subForm.set("metadata[tenant_id]", TENANT_ID);
    if (price_id) {
      subForm.set("items[0][price]", price_id);
    } else {
      const mc = amount_cents || 2500;
      subForm.set("items[0][price_data][currency]", "usd");
      subForm.set("items[0][price_data][unit_amount]", String(mc));
      subForm.set("items[0][price_data][recurring][interval]", "month");
      subForm.set("items[0][price_data][product_data][name]", "Monthly Donation — Companions of CPAS");
    }
    const subRes = await fetch("https://api.stripe.com/v1/subscriptions", { method: "POST", headers: h, body: subForm });
    const sub = await subRes.json().catch(() => ({}));
    if (!subRes.ok) return json({ error: sub?.error?.message || "Could not create subscription" }, 500);

    // Non-fatal D1 record
    try {
      const donorId = await upsertDonor(env, {
        donorEmail: donor_email, donorName: null,
        amountCents: amount_cents || 2500, isRecurring: true
      });
      await env.DB.prepare(
        `INSERT INTO donation_intents
         (id, tenant_id, donor_name, donor_email, amount_cents, frequency, provider, provider_checkout_id, status, resend_receipt_status, updated_at)
         VALUES (?, ?, NULL, ?, ?, 'month', 'stripe', ?, 'subscription_active', 'pending_after_payment', datetime('now'))`
      ).bind(id("sub"), TENANT_ID, donor_email || null, amount_cents || 2500, sub.id).run();
    } catch (err) {
      console.warn("subscription D1 write skipped:", err?.message);
    }

    return json({ success: true, subscription_id: sub.id, customer_id: customer.id });
  }

  // ── POST /api/donations/after-payment — post-payment receipt + newsletter ──
  if (path === "/api/donations/after-payment" && method === "POST") {
    const data = await body(request);
    try {
      if (data.donor_email && data.nl_opt_in) {
        await env.DB.prepare(
          `INSERT OR IGNORE INTO newsletter_subscribers
           (id, tenant_id, email, status, source, created_at)
           VALUES (?, ?, ?, 'subscribed', 'donate_modal', datetime('now'))`
        ).bind(id("sub"), TENANT_ID, String(data.donor_email).toLowerCase().trim()).run();
      }
    } catch (_) {}
    return json({ ok: true });
  }

  // ── GET /api/donations/tiers — D1-driven tier catalog ────────────────────
  if (path === "/api/donations/tiers" && method === "GET") {
    try {
      const rows = await env.DB.prepare(
        `SELECT label, amount_cents, description,
                stripe_price_id_onetime, stripe_price_id_monthly, display_order
         FROM donation_tiers
         WHERE active = 1
         ORDER BY display_order ASC`
      ).all();
      return json({ tiers: rows.results || [] });
    } catch (err) {
      console.warn("donation_tiers fetch failed:", err?.message);
      return json({ tiers: [] });
    }
  }

  // ── POST /api/donations/checkout ─────────────────────────────────────────
  if (path === "/api/donations/checkout" && method === "POST") {
    const data = await body(request);
    const amountCents = data.amount_cents || cents(data.amount);
    if (!amountCents || amountCents < 100) return json({ error: "Minimum donation is $1.00" }, 400);

    if (!env.STRIPE_SECRET_KEY) {
      return json({ error: "Stripe is not configured yet" }, 501);
    }

    const isRecurring = Boolean(data.recurring);
    const checkoutId  = id("checkout");
    const origin      = url.origin;

    const form = new URLSearchParams();
    form.set("mode", isRecurring ? "subscription" : "payment");
    form.set("success_url", data.success_url || `${origin}/donate?success=1`);
    form.set("cancel_url",  data.cancel_url  || `${origin}/`);
    form.set("metadata[tenant_id]",          TENANT_ID);
    form.set("metadata[local_checkout_id]",  checkoutId);
    if (data.campaign_id) form.set("metadata[campaign_id]", data.campaign_id);
    if (data.message)     form.set("metadata[message]",     data.message);

    if (data.price_id) {
      form.set("line_items[0][price]",    data.price_id);
      form.set("line_items[0][quantity]", "1");
    } else {
      form.set("line_items[0][quantity]", "1");
      form.set("line_items[0][price_data][currency]",                   "usd");
      form.set("line_items[0][price_data][unit_amount]",                String(amountCents));
      form.set("line_items[0][price_data][product_data][name]",
               data.title || "Donation to Companions of CPAS");
      if (isRecurring) {
        form.set("line_items[0][price_data][recurring][interval]", data.interval || "month");
      }
    }

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: form
    });

    const stripeRaw = await stripeRes.text();
    let stripe = {};
    try { stripe = JSON.parse(stripeRaw); } catch {}

    if (!stripeRes.ok) return json({ error: "Stripe checkout failed", details: stripe }, 500);

    try {
      await env.DB.prepare(
        `INSERT INTO donation_intents
         (id, tenant_id, donor_name, donor_email, amount_cents, frequency, campaign_id, note, provider,
          provider_checkout_id, provider_checkout_url, status, resend_receipt_status, metadata_json, updated_at)
         VALUES (?, ?, NULL, NULL, ?, ?, ?, ?, 'stripe', ?, ?, 'checkout_created', 'pending_after_payment', ?, datetime('now'))`
      ).bind(
        checkoutId, TENANT_ID,
        amountCents,
        isRecurring ? (data.interval || "month") : "one_time",
        data.campaign_id || null,
        data.message     || null,
        stripe.id, stripe.url,
        JSON.stringify({
          stripe_session_id: stripe.id,
          price_id:          data.price_id || null,
          title:             data.title || "Donation to Companions of CPAS"
        })
      ).run();
    } catch (err) {
      console.warn("donation_intents insert skipped:", err?.message);
    }

    return json({ success: true, checkout_url: stripe.url, stripe_session_id: stripe.id, id: checkoutId }, 201);
  }

  // ── POST /api/webhooks/stripe ─────────────────────────────────────────────
  if (path === "/api/webhooks/stripe" && method === "POST") {
    const verified = await verifyStripeWebhook(request, env);
    if (!verified.ok) return json({ error: verified.error }, verified.status || 400);
    const event = verified.event;
    const rawEvent = JSON.stringify(event);

    if (event.type === "payment_intent.succeeded") {
      const pi = event.data?.object || {};
      await env.DB.prepare(
        `INSERT INTO stripe_webhooks (id, tenant_id, event_type, status, related_id, payload_json, processed_at)
         VALUES (?, ?, ?, 'acknowledged', ?, ?, datetime('now'))`
      ).bind(id("stripewh"), TENANT_ID, event.type, pi.id || null, rawEvent).run();
      return json({ received: true, acknowledged: true });
    }

    if (event.type === "checkout.session.completed") {
      const s = event.data?.object || {};
      const meta = s.metadata || {};
      const amount = s.amount_total || 0;
      const currency = s.currency || "usd";

      const existingPayment = await env.DB.prepare(
        "SELECT id FROM donation_payments WHERE provider_checkout_session_id = ? LIMIT 1"
      ).bind(s.id).first();

      if (existingPayment?.id) {
        try {
          await env.DB.prepare(
            `INSERT INTO stripe_webhooks (id, tenant_id, event_type, status, related_id, payload_json, processed_at)
             VALUES (?, ?, ?, 'duplicate', ?, ?, datetime('now'))`
          ).bind(id("stripewh"), TENANT_ID, event.type, existingPayment.id, rawEvent).run();
        } catch {}
        return json({ received: true, duplicate: true });
      }

      let intent = null;
      if (s.id) {
        intent = await env.DB.prepare(
          "SELECT * FROM donation_intents WHERE provider_checkout_id = ? LIMIT 1"
        ).bind(s.id).first();
      }
      if (!intent && meta.local_checkout_id) {
        intent = await env.DB.prepare(
          "SELECT * FROM donation_intents WHERE id = ? LIMIT 1"
        ).bind(meta.local_checkout_id).first();
      }

      const donorEmail = s.customer_details?.email || s.customer_email || intent?.donor_email || null;
      const donorName  = meta.donor_name || s.customer_details?.name  || intent?.donor_name  || null;
      const note       = meta.message    || intent?.note               || null;
      const campaignIdRaw = meta.campaign_id || intent?.campaign_id   || null;
      const campaignId    = campaignIdRaw && campaignIdRaw !== "general" ? campaignIdRaw : null;

      const donorId = await upsertDonor(env, {
        donorEmail, donorName, amountCents: amount,
        isRecurring: s.mode === "subscription"
      });

      const donationId = id("donation");
      await env.DB.prepare(
        `INSERT INTO donations
         (id, organization_id, donor_id, campaign_id, amount_cents, currency, status, payment_provider, stripe_payment_intent_id, donor_message, is_anonymous, donated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'succeeded', 'stripe', ?, ?, 0, datetime('now'))`
      ).bind(donationId, TENANT_ID, donorId, campaignId, amount, currency, s.payment_intent || null, note).run();

      await env.DB.prepare(
        `INSERT INTO donation_payments
         (id, tenant_id, donation_id, provider, provider_payment_id, provider_checkout_session_id, amount_cents, currency, status, raw_json, updated_at)
         VALUES (?, ?, ?, 'stripe', ?, ?, ?, ?, 'succeeded', ?, datetime('now'))`
      ).bind(id("payment"), TENANT_ID, donationId, s.payment_intent || null, s.id, amount, currency, JSON.stringify(s)).run();

      try {
        await env.DB.prepare(
          `UPDATE donation_intents
           SET status = 'completed',
               provider_checkout_id = COALESCE(provider_checkout_id, ?),
               resend_receipt_status = 'processing',
               updated_at = datetime('now')
           WHERE id = ? OR provider_checkout_id = ?`
        ).bind(s.id, meta.local_checkout_id || "", s.id).run();
      } catch {}

      await env.DB.prepare(
        `INSERT INTO stripe_webhooks (id, tenant_id, event_type, status, related_id, payload_json, processed_at)
         VALUES (?, ?, ?, 'processed', ?, ?, datetime('now'))`
      ).bind(id("stripewh"), TENANT_ID, event.type, donationId, rawEvent).run();

      await sendDonationReceipt(env, {
        donorEmail, donorName, amountCents: amount, donationId,
        intentId: meta.local_checkout_id,
        piId: s.id
      });
    }

    return json({ received: true });
  }

  if (path === "/api/contact" && method === "POST") {
    const data = await body(request);
    if (!data.name || !data.message) return json({ error: "Name and message required" }, 400);

    const contactId = id("contact");
    await env.DB.prepare(
      `INSERT INTO contact_requests (id, name, email, message, status, created_at)
       VALUES (?, ?, ?, ?, 'new', datetime('now'))`
    ).bind(contactId, data.name, data.email || null, data.message).run();

    if (data.email) {
      await sendResend(env, {
        to: data.email,
        name: data.name,
        subject: "We received your message",
        type: "contact_confirmation",
        related_type: "contact_request",
        related_id: contactId,
        html: `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;padding:24px">
          <h2>Thank you, ${data.name}</h2>
          <p>Companions of CPAS received your message. We will follow up as soon as possible.</p>
        </div>`
      });
    }

    if (env.ADMIN_EMAIL) {
      await sendResend(env, {
        to: env.ADMIN_EMAIL,
        subject: "New Companions CPAS contact request",
        type: "admin_contact_alert",
        related_type: "contact_request",
        related_id: contactId,
        html: `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;padding:24px">
          <h2>New contact request</h2>
          <p><strong>Name:</strong> ${data.name}</p>
          <p><strong>Email:</strong> ${data.email || ""}</p>
          <p><strong>Message:</strong></p>
          <p>${data.message}</p>
        </div>`
      });
    }

    return json({ success: true, id: contactId }, 201);
  }

  if (path === "/api/newsletter/subscribe" && method === "POST") {
    const data = await body(request);
    if (!data.email) return json({ error: "Email required" }, 400);

    await env.DB.prepare(
      `INSERT OR IGNORE INTO newsletter_subscribers
       (id, tenant_id, email, name, status, source)
       VALUES (?, ?, ?, ?, 'subscribed', ?)`
    ).bind(id("sub"), TENANT_ID, String(data.email).toLowerCase().trim(), data.name || null, data.source || "website").run();

    return json({ success: true }, 201);
  }

  if (path === "/api/admin/donations" && method === "GET") {
    const rows = await env.DB.prepare(
      "SELECT * FROM donations WHERE tenant_id = ? ORDER BY donated_at DESC LIMIT 250"
    ).bind(TENANT_ID).all();
    return json({ donations: rows.results || [] });
  }

  if (path === "/api/admin/email/logs" && method === "GET") {
    const rows = await env.DB.prepare(
      "SELECT * FROM email_logs WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 250"
    ).bind(TENANT_ID).all();
    return json({ emails: rows.results || [] });
  }

  if (path === "/api/admin/email/send" && method === "POST") {
    const data = await body(request);
    if (!data.to || !data.subject || !data.message) return json({ error: "to, subject, message required" }, 400);

    const sent = await sendResend(env, {
      to: data.to,
      name: data.name || null,
      subject: data.subject,
      type: data.type || "manual",
      related_type: data.related_type || null,
      related_id: data.related_id || null,
      html: `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;padding:24px;white-space:pre-wrap">${data.message}</div>`
    });

    return json({ success: Boolean(sent.ok), result: sent }, sent.ok ? 200 : 500);
  }

  return null;
}
