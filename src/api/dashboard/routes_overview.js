// routes_overview.js — extracted from dashboard_api.js (tkt_cpas_mod_dashboard_api_20260818)
// Auto-split: verbatim route bodies moved from the original ladder. No behavior change.

import { FOSTER_TENANT, TENANT, buildFinancialBreakdownMtd, buildOverviewActivity, isSameMonthPrefix, json, normalizeAnimal } from "./shared.js";

async function handleOverview(request, env, url, path, method) {
  if (path === '/api/dashboard/overview') {
    const monthPrefix = new Date().toISOString().slice(0, 7);
    const paidStatuses = new Set(['succeeded', 'paid', 'completed', 'received']);
    const [animalRows, appRows, campaignRows, volunteerRows, donationRows, mediaCountRow, pagesCountRow, inboxCountRow, competitionReviewRow] = await Promise.all([
      env.DB.prepare(`
        SELECT ap.*, ca.cdn_url AS asset_cdn_url
        FROM animal_profiles ap
        LEFT JOIN cms_assets ca ON ca.asset_key = ap.id AND ca.tenant_id = ?
        WHERE ap.tenant_id = ?
        ORDER BY ap.featured DESC, ap.sort_order ASC, ap.updated_at DESC
      `).bind(TENANT, TENANT).all().catch(() => ({ results: [] })),
      env.DB.prepare(`
        SELECT id, first_name, last_name,
               first_name || ' ' || last_name AS applicant_name,
               email AS applicant_email, phone AS applicant_phone,
               email, phone, review_status, review_status AS status,
               submitted_at, created_at, answers_json, internal_notes
        FROM cpas_foster_applications
        WHERE tenant_id = ?
        ORDER BY COALESCE(submitted_at, created_at) DESC LIMIT 200
      `).bind(FOSTER_TENANT).all().catch(() => ({ results: [] })),
      env.DB.prepare(`SELECT *, goal_amount_cents AS goal_cents, raised_amount_cents AS raised_cents FROM fundraising_campaigns WHERE is_public = 1 ORDER BY updated_at DESC`).all().catch(() => ({ results: [] })),
      env.DB.prepare(`SELECT * FROM volunteer_records ORDER BY hours_month DESC`).all().catch(() => ({ results: [] })),
      env.DB.prepare(`
        SELECT d.amount_cents, d.status, d.campaign_id, d.donated_at, d.created_at,
               d.payment_provider, d.stripe_payment_intent_id,
               COALESCE(dn.full_name, dn.email, 'a supporter') AS donor_name,
               fc.title AS campaign_title, fc.campaign_type
        FROM donations d
        LEFT JOIN donors dn ON dn.id = d.donor_id
        LEFT JOIN fundraising_campaigns fc ON fc.id = d.campaign_id
        WHERE d.organization_id = ?
        ORDER BY COALESCE(d.donated_at, d.created_at) DESC
      `).bind(TENANT).all().catch(() => ({ results: [] })),
      env.DB.prepare(`
        SELECT COUNT(*) AS n FROM cms_assets
        WHERE tenant_id = ? AND (status IS NULL OR status = 'active')
      `).bind(TENANT).first().catch(() => ({ n: 0 })),
      env.DB.prepare(`
        SELECT COUNT(*) AS n FROM cms_pages WHERE tenant_id = ?
      `).bind(TENANT).first().catch(() => ({ n: 0 })),
      env.DB.prepare(`
        SELECT
          SUM(CASE WHEN COALESCE(is_deleted,0)=0 AND status='unread'
                   AND (folder_id IS NULL OR folder_id='') THEN 1 ELSE 0 END) AS unread_inbox,
          SUM(CASE WHEN COALESCE(is_deleted,0)=0
                   AND (folder_id IS NULL OR folder_id='') THEN 1 ELSE 0 END) AS inbox_total
        FROM inbound_emails
        WHERE tenant_id = ?
      `).bind(TENANT).first().catch(() => ({ unread_inbox: 0, inbox_total: 0 })),
      env.DB.prepare(`
        SELECT COUNT(*) AS n
        FROM competition_entries
        WHERE tenant_id = ?
          AND payment_status = 'paid'
          AND COALESCE(is_approved, 0) = 0
          AND archived_at IS NULL
          AND COALESCE(moderation_status, '') NOT IN ('rejected', 'demo', 'archived')
      `).bind(TENANT).first().catch(() => ({ n: 0 })),
    ]);
    const animals = animalRows.results || [];
    const apps = appRows.results || [];
    function appBucket(reviewStatus) {
      const s = String(reviewStatus || "new").toLowerCase();
      if (s === "approved") return "approved";
      if (s === "denied" || s === "rejected") return "denied";
      if (s === "under_review" || s === "in_review" || s === "review" || s === "home_visit") return "underReview";
      return "pending";
    }
    const applicationStatus = { pending: 0, approved: 0, underReview: 0, denied: 0 };
    for (const a of apps) {
      applicationStatus[appBucket(a.review_status)] += 1;
    }
    const competitionReviewCount = Number(competitionReviewRow?.n || 0);
    const paidDonations = (donationRows.results || []).filter((row) => {
      const status = String(row.status || '').toLowerCase();
      const pi = String(row.stripe_payment_intent_id || '');
      const provider = String(row.payment_provider || 'stripe').toLowerCase();
      return paidStatuses.has(status)
        && status !== 'demo'
        && provider === 'stripe'
        && pi.startsWith('pi_');
    });
    const raisedFromDonations = paidDonations.reduce((sum, row) => sum + Number(row.amount_cents || 0), 0);
    const mtdDonations = paidDonations.filter((row) =>
      isSameMonthPrefix(row.donated_at || row.created_at, monthPrefix)
    );
    const mtdCents = mtdDonations.reduce((sum, row) => sum + Number(row.amount_cents || 0), 0);
    const financialBreakdown = buildFinancialBreakdownMtd(mtdDonations);
    const goal = (campaignRows.results || []).reduce((s, c) => s + Number(c.goal_cents || 0), 0);
    const inFoster = animals.filter((a) => /foster/i.test(String(a.status || ''))).length;
    const applicationsMtd = apps.filter((a) =>
      isSameMonthPrefix(a.submitted_at || a.created_at, monthPrefix)
    ).length;

    // Activity: prefer recent paid rows (any month) so the feed stays live; sort by real clock time.
    const recentActivity = buildOverviewActivity({
      animals,
      apps,
      donations: paidDonations,
    });

    return json({
      kpis: {
        animals:      animals.length,
        in_foster:    inFoster,
        applications: apps.length,
        applications_mtd: applicationsMtd,
        application_status: applicationStatus,
        volunteers:   volunteerRows.results?.length || 0,
        raised_cents: raisedFromDonations,
        donations_mtd_cents: mtdCents,
        donation_count: paidDonations.length,
        donations_mtd_count: mtdDonations.length,
        media_count:  Number(mediaCountRow?.n || 0),
        pages_count:  Number(pagesCountRow?.n || 0),
        campaigns:    (campaignRows.results || []).length,
        goal_cents:   goal,
        inbox_unread: Number(inboxCountRow?.unread_inbox || 0),
        inbox_total:  Number(inboxCountRow?.inbox_total || 0),
        competition_review_count: competitionReviewCount,
      },
      financial_breakdown: financialBreakdown,
      month_prefix: monthPrefix,
      recent_activity: recentActivity,
      animals:      animals.map(normalizeAnimal),
      applications: apps,
      application_status: applicationStatus,
      campaigns:    campaignRows.results || [],
      volunteers:   volunteerRows.results || [],
      donations:    paidDonations,
      donations_mtd: mtdDonations,
    });
  }
  return null;
}

export async function routesOverview(request, env, url, path, method) {
  {
    const r = await handleOverview(request, env, url, path, method);
    if (r) return r;
  }
  return null;
}
