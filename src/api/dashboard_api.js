
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

  if (path === "/api/dashboard/fundraising") {
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
