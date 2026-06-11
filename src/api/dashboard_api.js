
function safeJson(value, fallback) {
  try { return JSON.parse(value || ""); } catch { return fallback; }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

export async function dashboardApiRoutes(request, env, url) {
  const path = url.pathname;
  const method = request.method;

  if (path === "/api/dashboard/overview") {
    // Animals with cms_assets JOIN for canonical CDN URL
    const animals = await env.DB.prepare(`
      SELECT
        ap.*,
        ca.cdn_url   AS asset_cdn_url,
        ca.public_url AS asset_public_url
      FROM animal_profiles ap
      LEFT JOIN cms_assets ca
        ON ca.asset_key = REPLACE(ap.id, 'animal_', 'animal_')
        AND ca.tenant_id = 'tenant_companionscpas'
      WHERE ap.tenant_id = 'tenant_companionscpas'
      ORDER BY ap.featured DESC, ap.sort_order ASC, ap.updated_at DESC
    `).all().catch(() => ({ results: [] }));

    const apps = await env.DB.prepare(`
      SELECT
        id,
        first_name || ' ' || last_name AS applicant_name,
        email AS applicant_email,
        review_status AS status,
        submitted_at,
        answers_json
      FROM cpas_foster_applications
      WHERE tenant_id = 'companions_cpas'
      ORDER BY submitted_at DESC
    `).all().catch(() => ({ results: [] }));

    const campaigns = await env.DB.prepare(
      `
        SELECT
          *,
          goal_amount_cents AS goal_cents,
          raised_amount_cents AS raised_cents,
          COALESCE(campaign_type, 'fundraiser') AS category
        FROM fundraising_campaigns
        WHERE is_public = 1
        ORDER BY updated_at DESC, created_at DESC
      `
    ).all().catch(() => ({ results: [] }));

    const volunteers = await env.DB.prepare(
      "SELECT * FROM volunteer_records ORDER BY hours_month DESC"
    ).all().catch(() => ({ results: [] }));

    const raised = (campaigns.results || []).reduce((sum, c) => sum + Number(c.raised_cents || 0), 0);
    const goal   = (campaigns.results || []).reduce((sum, c) => sum + Number(c.goal_cents  || 0), 0);

    return json({
      kpis: {
        animals:      animals.results?.length || 0,
        applications: apps.results?.length || 0,
        volunteers:   volunteers.results?.length || 0,
        raised_cents: raised,
        goal_cents:   goal
      },
      animals:      animals.results || [],
      applications: apps.results || [],
      campaigns:    campaigns.results || [],
      volunteers:   volunteers.results || [],
    });
  }

  if (path === "/api/dashboard/animals") {
    const rows = await env.DB.prepare(`
      SELECT
        ap.*,
        ca.cdn_url    AS asset_cdn_url,
        ca.public_url AS asset_public_url,
        ca.alt_text   AS asset_alt_text
      FROM animal_profiles ap
      LEFT JOIN cms_assets ca
        ON ca.asset_key = ap.id
        AND ca.tenant_id = 'tenant_companionscpas'
      WHERE ap.tenant_id = 'tenant_companionscpas'
      ORDER BY ap.featured DESC, ap.sort_order ASC, ap.updated_at DESC
    `).all().catch(() => ({ results: [] }));

    return json({
      animals: (rows.results || []).map(a => ({
        ...a,
        photo:  a.asset_cdn_url || a.photo_url,
        image:  a.asset_cdn_url || a.photo_url,
        status: a.status || "available",
        tags:   safeJson(a.tags_json, []),
      }))
    });
  }

  if (path === "/api/dashboard/applications") {
    const rows = await env.DB.prepare(`
      SELECT
        id,
        first_name || ' ' || last_name AS applicant_name,
        email AS applicant_email,
        phone AS applicant_phone,
        review_status AS status,
        source,
        submitted_at,
        assigned_to,
        internal_notes,
        answers_json
      FROM cpas_foster_applications
      WHERE tenant_id = 'companions_cpas'
      ORDER BY submitted_at DESC
    `).all().catch(() => ({ results: [] }));

    return json({
      applications: (rows.results || []).map(a => ({
        ...a,
        answers: safeJson(a.answers_json, {})
      }))
    });
  }

  if (path === "/api/dashboard/fundraising" && method === "GET") {
    const campaigns = await env.DB.prepare(
      `
        SELECT
          *,
          goal_amount_cents AS goal_cents,
          raised_amount_cents AS raised_cents,
          COALESCE(campaign_type, 'fundraiser') AS category
        FROM fundraising_campaigns
        WHERE is_public = 1
        ORDER BY updated_at DESC, created_at DESC
      `
    ).all().catch(() => ({ results: [] }));
    return json({ campaigns: campaigns.results || [] });
  }

  if (path === "/api/dashboard/fundraising" && method === "POST") {
    const b = await request.json().catch(() => ({}));
    const title = String(b.title || "").trim();
    if (!title) return json({ ok:false, error:"Campaign title is required" }, 400);
    const now = new Date().toISOString();
    const slug = String(b.slug || title).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"") || "campaign";
    const id = b.id || `campaign_${slug}_${Date.now()}`;
    await env.DB.prepare("INSERT INTO fundraising_campaigns (id, organization_id, title, slug, description, goal_amount_cents, raised_amount_cents, status, starts_at, ends_at, is_public, campaign_type, short_description, donor_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, 0, ?, ?)").bind(id, b.organization_id || "tenant_companionscpas", title, slug, b.description || "", Math.max(0, Number(b.goal_amount_cents || b.goal_cents || 0)), b.status || "active", b.starts_at || null, b.ends_at || null, b.is_public === 0 ? 0 : 1, b.campaign_type || b.category || "fundraiser", b.short_description || String(b.description || "").slice(0,240), now, now).run();
    return json({ ok:true, id });
  }

  if (path === "/api/dashboard/fundraising" && method === "PUT") {
    const b = await request.json().catch(() => ({}));
    if (!b.id) return json({ ok:false, error:"Campaign id is required" }, 400);
    const title = String(b.title || "").trim();
    if (!title) return json({ ok:false, error:"Campaign title is required" }, 400);
    const slug = String(b.slug || title).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"") || "campaign";
    await env.DB.prepare("UPDATE fundraising_campaigns SET title=?, slug=?, description=?, goal_amount_cents=?, status=?, starts_at=?, ends_at=?, is_public=?, campaign_type=?, short_description=?, updated_at=? WHERE id=?").bind(title, slug, b.description || "", Math.max(0, Number(b.goal_amount_cents || b.goal_cents || 0)), b.status || "active", b.starts_at || null, b.ends_at || null, b.is_public === 0 ? 0 : 1, b.campaign_type || b.category || "fundraiser", b.short_description || String(b.description || "").slice(0,240), new Date().toISOString(), b.id).run();
    return json({ ok:true, id:b.id });
  }

  if (path === "/api/dashboard/donations" && method === "GET") {
    const donations = await env.DB.prepare(
      `
        SELECT
          d.*,
          dn.full_name AS donor_name,
          dn.email AS donor_email,
          fc.title AS campaign_title
        FROM donations d
        LEFT JOIN donors dn ON dn.id = d.donor_id
        LEFT JOIN fundraising_campaigns fc ON fc.id = d.campaign_id
        ORDER BY COALESCE(d.donated_at, d.created_at) DESC
        LIMIT 250
      `
    ).all().catch(() => ({ results: [] }));
    return json({ donations: donations.results || [] });
  }

  if (path === "/api/dashboard/donations" && method === "POST") {
    const b = await request.json().catch(() => ({}));
    const amount = Math.max(0, Number(b.amount_cents || 0));
    if (!amount) return json({ ok:false, error:"Donation amount is required" }, 400);
    const now = new Date().toISOString();
    const donationId = b.id || `don_${Date.now()}`;
    await env.DB.prepare("INSERT INTO donations (id, organization_id, donor_id, campaign_id, amount_cents, currency, status, payment_provider, donor_message, is_anonymous, donated_at, created_at) VALUES (?, ?, NULL, ?, ?, 'usd', ?, ?, ?, ?, ?, ?)").bind(donationId, b.organization_id || "tenant_companionscpas", b.campaign_id || null, amount, b.status || "received", b.payment_provider || "manual", b.donor_message || null, String(b.donor_name || "").toLowerCase() === "anonymous" ? 1 : 0, b.donated_at || now, now).run();
    if (b.campaign_id && ["received","completed","paid","succeeded"].includes(String(b.status || "received").toLowerCase())) {
      await env.DB.prepare('UPDATE fundraising_campaigns SET raised_amount_cents=COALESCE(raised_amount_cents,0)+?, donor_count=COALESCE(donor_count,0)+1, updated_at=? WHERE id=?').bind(amount, now, b.campaign_id).run();
    }
    return json({ ok:true, id:donationId });
  }

  if (path === "/api/dashboard/team") {
    const rows = await env.DB.prepare(
      "SELECT * FROM volunteer_records ORDER BY role, full_name"
    ).all().catch(() => ({ results: [] }));
    return json({ members: rows.results || [] });
  }

  if (path === "/api/dashboard/calendar") {
    const rows = await env.DB.prepare(
      "SELECT * FROM dashboard_calendar_events ORDER BY starts_at ASC"
    ).all().catch(() => ({ results: [] }));
    return json({ events: rows.results || [] });
  }

  if (path === "/api/dashboard/cms") {
    const [pages, assets, themes, nav] = await Promise.all([
      env.DB.prepare("SELECT * FROM cms_pages ORDER BY sort_order, updated_at DESC LIMIT 100").all().catch(() => ({ results: [] })),
      env.DB.prepare("SELECT * FROM cms_assets ORDER BY created_at DESC LIMIT 200").all().catch(() => ({ results: [] })),
      env.DB.prepare("SELECT * FROM cms_themes ORDER BY updated_at DESC LIMIT 20").all().catch(() => ({ results: [] })),
      env.DB.prepare("SELECT * FROM cms_navigation_items ORDER BY sort_order LIMIT 100").all().catch(() => ({ results: [] })),
    ]);
    return json({ pages: pages.results || [], assets: assets.results || [], themes: themes.results || [], navigation: nav.results || [] });
  }

  if (path === "/api/dashboard/config") {
    const brand = await env.DB.prepare(
      "SELECT * FROM cms_brand_settings WHERE tenant_id = 'tenant_companionscpas' LIMIT 1"
    ).first().catch(() => null);
    const theme = await env.DB.prepare(
      "SELECT * FROM cms_themes WHERE tenant_id = 'tenant_companionscpas' AND is_active = 1 LIMIT 1"
    ).first().catch(() => null);
    const assets = await env.DB.prepare(
      "SELECT * FROM cms_assets WHERE tenant_id = 'tenant_companionscpas' AND status = 'active' ORDER BY created_at DESC LIMIT 200"
    ).all().catch(() => ({ results: [] }));
    return json({ brand, theme, assets: assets.results || [] });
  }

  if (path === "/api/dashboard/tasks") {
    const rows = await env.DB.prepare(
      "SELECT * FROM agentsam_todo ORDER BY sort_order, created_at"
    ).all().catch(() => ({ results: [] }));
    return json({ todos: rows.results || [] });
  }

  if (path === "/api/dashboard/fosters") {
    const rows = await env.DB.prepare(`
      SELECT
        f.*,
        a.name       AS animal_name,
        a.species,
        a.breed,
        a.sex,
        a.age_label,
        a.status     AS animal_status,
        a.photo_url,
        ca.cdn_url   AS asset_cdn_url
      FROM foster_records f
      LEFT JOIN animal_profiles a  ON a.id = f.animal_id
      LEFT JOIN cms_assets ca
        ON ca.asset_key = a.id
        AND ca.tenant_id = 'tenant_companionscpas'
      WHERE f.tenant_id = 'tenant_companionscpas'
      ORDER BY f.created_at DESC
      LIMIT 100
    `).all().catch(() => ({ results: [] }));
    return json({ fosters: rows.results || [] });
  }

  if (path === "/api/dashboard/adoptions") {
    const rows = await env.DB.prepare(
      "SELECT * FROM applications ORDER BY created_at DESC LIMIT 100"
    ).all().catch(() => ({ results: [] }));
    return json({ adoptions: rows.results || [] });
  }

  if (path === "/api/dashboard/intakes") {
    const rows = await env.DB.prepare(
      "SELECT * FROM animal_profiles WHERE tenant_id = 'tenant_companionscpas' ORDER BY created_at DESC LIMIT 100"
    ).all().catch(() => ({ results: [] }));
    return json({ intakes: rows.results || [] });
  }

  if (path === "/api/dashboard/medical") {
    const rows = await env.DB.prepare(
      "SELECT * FROM care_tasks WHERE lower(category) LIKE '%medical%' OR lower(title) LIKE '%vaccine%' OR lower(title) LIKE '%med%' ORDER BY created_at DESC LIMIT 100"
    ).all().catch(() => ({ results: [] }));
    return json({ medical: rows.results || [] });
  }

  if (path === "/api/dashboard/daily-care") {
    const rows = await env.DB.prepare(
      "SELECT * FROM care_tasks ORDER BY created_at DESC LIMIT 100"
    ).all().catch(() => ({ results: [] }));
    return json({ care_tasks: rows.results || [] });
  }

  if (path === "/api/dashboard/reports") {
    const [donations, animals, apps] = await Promise.all([
      env.DB.prepare("SELECT * FROM donations ORDER BY created_at DESC LIMIT 100").all().catch(() => ({ results: [] })),
      env.DB.prepare("SELECT * FROM animal_profiles WHERE tenant_id = 'tenant_companionscpas' ORDER BY created_at DESC LIMIT 100").all().catch(() => ({ results: [] })),
      env.DB.prepare("SELECT * FROM applications ORDER BY created_at DESC LIMIT 100").all().catch(() => ({ results: [] })),
    ]);
    return json({ donations: donations.results || [], animals: animals.results || [], applications: apps.results || [] });
  }

  return null;
}
