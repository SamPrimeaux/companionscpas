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

async function logEmail(env, row) {
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

  if (path === "/api/donations/checkout" && method === "POST") {
    const data = await body(request);
    const amountCents = data.amount_cents || cents(data.amount);
    if (!amountCents || amountCents < 100) return json({ error: "Minimum donation is $1.00" }, 400);

    if (!env.STRIPE_SECRET_KEY) {
      return json({ error: "Stripe is not configured yet" }, 501);
    }

    const checkoutId = id("checkout");
    const origin = url.origin;

    const form = new URLSearchParams();
    form.set("mode", data.recurring ? "subscription" : "payment");
    form.set("success_url", data.success_url || `${origin}/donate?success=1`);
    form.set("cancel_url", data.cancel_url || `${origin}/donate?canceled=1`);
    form.set("customer_email", data.donor_email || "");
    form.set("metadata[tenant_id]", TENANT_ID);
    form.set("metadata[local_checkout_id]", checkoutId);
    if (data.donor_name) form.set("metadata[donor_name]", data.donor_name);
    if (data.animal_id) form.set("metadata[animal_id]", data.animal_id);
    if (data.campaign_id) form.set("metadata[campaign_id]", data.campaign_id);
    if (data.message) form.set("metadata[message]", data.message);

    const pricePrefix = data.recurring ? "line_items[0][price_data][recurring][interval]" : null;
    if (pricePrefix) form.set(pricePrefix, data.interval || "month");

    form.set("line_items[0][quantity]", "1");
    form.set("line_items[0][price_data][currency]", "usd");
    form.set("line_items[0][price_data][unit_amount]", String(amountCents));
    form.set("line_items[0][price_data][product_data][name]", data.title || "Donation to Companions of CPAS");

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

    await env.DB.prepare(
      `INSERT INTO donation_checkout_sessions
       (id, tenant_id, donor_name, donor_email, amount_cents, currency, donation_type, animal_id, campaign_id, message, stripe_checkout_session_id, status, checkout_url)
       VALUES (?, ?, ?, ?, ?, 'usd', ?, ?, ?, ?, ?, 'created', ?)`
    ).bind(
      checkoutId,
      TENANT_ID,
      data.donor_name || null,
      data.donor_email || null,
      amountCents,
      data.recurring ? "recurring" : "one_time",
      data.animal_id || null,
      data.campaign_id || null,
      data.message || null,
      stripe.id,
      stripe.url
    ).run();

    return json({ success: true, checkout_url: stripe.url, stripe_session_id: stripe.id, id: checkoutId }, 201);
  }

  if (path === "/api/webhooks/stripe" && method === "POST") {
    const event = await request.json().catch(() => null);
    if (!event) return json({ error: "Invalid Stripe event" }, 400);

    if (event.type === "checkout.session.completed") {
      const s = event.data?.object || {};
      const meta = s.metadata || {};
      const donationId = id("donation");
      const amount = s.amount_total || 0;

      await env.DB.prepare(
        `INSERT INTO donations
         (id, tenant_id, donor_name, donor_email, amount_cents, currency, donation_type, source, external_id, stripe_checkout_session_id, stripe_payment_intent_id, animal_id, campaign_id, message)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'stripe', ?, ?, ?, ?, ?, ?)`
      ).bind(
        donationId,
        TENANT_ID,
        meta.donor_name || s.customer_details?.name || null,
        s.customer_details?.email || s.customer_email || null,
        amount,
        s.currency || "usd",
        s.mode === "subscription" ? "recurring" : "one_time",
        s.id,
        s.id,
        s.payment_intent || null,
        meta.animal_id || null,
        meta.campaign_id || null,
        meta.message || null
      ).run();

      await env.DB.prepare(
        "UPDATE donation_checkout_sessions SET status = 'completed', stripe_payment_intent_id = ?, updated_at = datetime('now') WHERE stripe_checkout_session_id = ?"
      ).bind(s.payment_intent || null, s.id).run();

      const donorEmail = s.customer_details?.email || s.customer_email;
      if (donorEmail) {
        await sendResend(env, {
          to: donorEmail,
          name: meta.donor_name || s.customer_details?.name || null,
          subject: "Thank you for supporting Companions of CPAS",
          type: "donation_receipt",
          related_type: "donation",
          related_id: donationId,
          html: `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;padding:24px">
            <h2>Thank you for your donation</h2>
            <p>Your support helps Companions of CPAS care for animals and serve the community.</p>
            <p><strong>Amount:</strong> $${(amount / 100).toFixed(2)}</p>
            <p><strong>Donation ID:</strong> ${donationId}</p>
          </div>`
        });

        await env.DB.prepare("UPDATE donations SET receipt_sent = 1 WHERE id = ?").bind(donationId).run();
      }
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
