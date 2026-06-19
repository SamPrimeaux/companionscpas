import { resolveDonationAmounts } from "./donation_fees.js";

const TENANT_ID = "tenant_companionscpas";

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function id(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function centsFromDollars(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * 100);
}

export async function createDonationPaymentIntent(env, data = {}) {
  if (!env.STRIPE_SECRET_KEY) {
    return { ok: false, status: 501, error: "Stripe not configured" };
  }

  const donorName = String(data.donor_name || "").trim() || null;
  const donorEmail = String(data.donor_email || "").trim().toLowerCase() || null;
  const campaignId = String(data.campaign_id || "general").trim();
  const note = String(data.note || "").trim() || null;
  const frequency = String(data.frequency || "one_time").trim();

  let intendedCents = Number(data.intended_cents || 0) || 0;
  if (!intendedCents && data.custom_amount) {
    intendedCents = centsFromDollars(data.custom_amount);
  }
  if (!intendedCents) {
    intendedCents = Number(data.amount_cents || 0) || centsFromDollars(data.amount);
  }

  const { intendedCents: intended, chargeCents, coverFees } = resolveDonationAmounts({
    intended_cents: intendedCents,
    amount_cents: data.amount_cents,
    cover_fees: data.cover_fees !== false && data.cover_fees !== 0 && data.cover_fees !== "false",
  });

  if (!intended || intended < 100) {
    return { ok: false, status: 400, error: "Donation amount of at least $1.00 is required." };
  }

  const localIntentId = id("intent");
  const form = new URLSearchParams();
  form.set("amount", String(chargeCents));
  form.set("currency", "usd");
  form.set("automatic_payment_methods[enabled]", "true");
  form.set("metadata[tenant_id]", TENANT_ID);
  form.set("metadata[local_intent_id]", localIntentId);
  form.set("metadata[source]", String(data.source || "adopt_support_modal"));
  form.set("metadata[intended_cents]", String(intended));
  form.set("metadata[cover_fees]", coverFees ? "true" : "false");
  if (campaignId && campaignId !== "general") form.set("metadata[campaign_id]", campaignId);
  if (donorEmail) form.set("receipt_email", donorEmail);
  if (note) form.set("metadata[message]", note);
  if (donorName) form.set("metadata[donor_name]", donorName);

  const res = await fetch("https://api.stripe.com/v1/payment_intents", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
  });
  const stripe = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, status: 500, error: stripe?.error?.message || "Stripe error" };
  }

  try {
    await env.DB.prepare(
      `INSERT INTO donation_intents
       (id, tenant_id, donor_name, donor_email, amount_cents, frequency, campaign_id, note, provider,
        provider_checkout_id, status, resend_receipt_status, metadata_json, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'stripe', ?, 'pending_payment', 'pending_after_payment', ?, datetime('now'))`
    ).bind(
      localIntentId,
      TENANT_ID,
      donorName,
      donorEmail,
      chargeCents,
      frequency,
      campaignId === "general" ? null : campaignId,
      note,
      stripe.id,
      JSON.stringify({
        stripe_payment_intent_id: stripe.id,
        source: data.source || "adopt_support_modal",
        intended_cents: intended,
        cover_fees: coverFees,
        charge_cents: chargeCents,
      })
    ).run();
  } catch (err) {
    console.warn("[create-intent] donation_intents insert skipped:", err?.message);
  }

  return {
    ok: true,
    client_secret: stripe.client_secret,
    mode: "payment",
    donation_intent_id: localIntentId,
    payment_intent_id: stripe.id,
    intended_cents: intended,
    charge_cents: chargeCents,
    cover_fees: coverFees,
  };
}

export async function donationApiRoutes(request, env, url) {
  if (url.pathname === "/api/donations/create-intent" && request.method === "POST") {
    const data = await request.json().catch(() => ({}));
    const donorName = String(data.donor_name || "").trim();
    const donorEmail = String(data.donor_email || "").trim().toLowerCase();

    if (!donorName || !donorEmail) {
      return json({ error: "Name and email are required." }, 400);
    }

    const result = await createDonationPaymentIntent(env, {
      ...data,
      source: "adopt_support_modal",
      cover_fees: data.cover_fees !== false && data.cover_fees !== 0 && data.cover_fees !== "false",
    });

    if (!result.ok) return json({ error: result.error }, result.status || 500);

    return json({
      success: true,
      ...result,
      message: "Payment ready. Complete checkout in the donate modal.",
    });
  }

  if (url.pathname === "/api/admin/donation-intents" && request.method === "GET") {
    const rows = await env.DB.prepare(`
      SELECT *
      FROM donation_intents
      ORDER BY created_at DESC
      LIMIT 100
    `).all();

    return json({ donation_intents: rows.results || [] });
  }

  return null;
}
