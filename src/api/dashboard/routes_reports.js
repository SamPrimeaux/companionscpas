// routes_reports.js — extracted from dashboard_api.js (tkt_cpas_mod_dashboard_api_20260818)
// Auto-split: verbatim route bodies moved from the original ladder. No behavior change.

import { FOSTER_TENANT, TENANT, getAuthUser, json, normalizeAnimal } from "./shared.js";

async function handleReportsFinancial(request, env, url, path, method) {
  if (path === '/api/dashboard/reports/financial' && method === 'GET') {
    const session = await getAuthUser(request, env);
    if (!session) return json({ error: 'Not authenticated' }, 401);

    const monthPrefix = new Date().toISOString().slice(0, 7);
    const paidStatuses = new Set(['succeeded', 'paid', 'completed', 'received']);

    const [donationRows, webhookRows] = await Promise.all([
      env.DB.prepare(`
        SELECT d.id, d.amount_cents, d.intended_amount_cents, d.cover_fees, d.currency, d.status, d.campaign_id,
               d.payment_provider, d.stripe_payment_intent_id, d.donated_at, d.created_at, d.is_anonymous,
               d.donor_message,
               dn.email AS donor_email, dn.full_name AS donor_name,
               fc.title AS campaign_title
        FROM donations d
        LEFT JOIN donors dn ON dn.id = d.donor_id
        LEFT JOIN fundraising_campaigns fc ON fc.id = d.campaign_id
        WHERE d.organization_id = ?
        ORDER BY COALESCE(d.donated_at, d.created_at) DESC
        LIMIT 200
      `).bind(TENANT).all().catch(() => ({ results: [] })),
      env.DB.prepare(`
        SELECT id, event_type, status, related_id, processed_at, created_at
        FROM stripe_webhooks
        WHERE tenant_id = ?
        ORDER BY COALESCE(processed_at, created_at) DESC
        LIMIT 50
      `).bind(TENANT).all().catch(() => ({ results: [] })),
    ]);

    const donations = (donationRows.results || []).map((row) => {
      const pi = String(row.stripe_payment_intent_id || "");
      const provider = String(row.payment_provider || "").toLowerCase();
      const status = String(row.status || "").toLowerCase();
      const isDemo = status === "demo"
        || provider === "mock_settle"
        || String(row.id || "").startsWith("donation_mock_")
        || (paidStatuses.has(status) && !pi.startsWith("pi_"));
      return { ...row, is_demo: isDemo ? 1 : 0 };
    });
    const giftCents = (row) => Number(row.intended_amount_cents ?? row.amount_cents ?? 0);
    // Only real Stripe charges count toward raised totals
    const paid = donations.filter((row) => {
      if (row.is_demo) return false;
      const pi = String(row.stripe_payment_intent_id || "");
      return paidStatuses.has(String(row.status || "").toLowerCase())
        && String(row.payment_provider || "stripe").toLowerCase() === "stripe"
        && pi.startsWith("pi_");
    });
    const totalCents = paid.reduce((sum, row) => sum + giftCents(row), 0);
    const thisMonth = paid.filter((row) => String(row.donated_at || row.created_at || "").slice(0, 7) === monthPrefix);
    const thisMonthCents = thisMonth.reduce((sum, row) => sum + giftCents(row), 0);
    const avgCents = paid.length ? Math.round(totalCents / paid.length) : 0;

    return json({
      summary: {
        total_raised_cents: totalCents,
        total_raised_display: `$${(totalCents / 100).toFixed(2)}`,
        this_month_cents: thisMonthCents,
        this_month_display: `$${(thisMonthCents / 100).toFixed(2)}`,
        total_donations: paid.length,
        this_month_donations: thisMonth.length,
        avg_gift_cents: avgCents,
        avg_gift_display: `$${(avgCents / 100).toFixed(2)}`,
        demo_excluded_count: donations.filter((r) => r.is_demo).length,
      },
      donations,
      recent_webhooks: webhookRows.results || [],
    });
  }
  return null;
}

async function handleReports(request, env, url, path, method) {
  if (path === '/api/dashboard/reports') {
    const [donations, animalRows, appRows] = await Promise.all([
      env.DB.prepare(`SELECT * FROM donations ORDER BY created_at DESC LIMIT 100`).all().catch(() => ({ results: [] })),
      env.DB.prepare(`SELECT * FROM animal_profiles WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 100`).bind(TENANT).all().catch(() => ({ results: [] })),
      env.DB.prepare(`SELECT * FROM cpas_foster_applications WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 100`).bind(FOSTER_TENANT).all().catch(() => ({ results: [] })),
    ]);
    return json({ donations: donations.results || [], animals: (animalRows.results || []).map(normalizeAnimal), applications: appRows.results || [] });
  }
  return null;
}

export async function routesReports(request, env, url, path, method) {
  {
    const r = await handleReportsFinancial(request, env, url, path, method);
    if (r) return r;
  }
  {
    const r = await handleReports(request, env, url, path, method);
    if (r) return r;
  }
  return null;
}
