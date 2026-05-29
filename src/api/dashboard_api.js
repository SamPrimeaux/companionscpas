
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
    const animals = await env.DB.prepare("SELECT * FROM animal_profiles ORDER BY created_at DESC").all();
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
    `).all();
    const campaigns = await env.DB.prepare("SELECT * FROM fundraising_campaigns_demo ORDER BY created_at DESC").all();
    const volunteers = await env.DB.prepare("SELECT * FROM volunteer_records ORDER BY hours_month DESC").all();
    const events = await env.DB.prepare("SELECT * FROM dashboard_calendar_events ORDER BY starts_at ASC").all();

    const raised = (campaigns.results || []).reduce((sum, c) => sum + Number(c.raised_cents || 0), 0);
    const goal = (campaigns.results || []).reduce((sum, c) => sum + Number(c.goal_cents || 0), 0);

    return json({
      kpis: {
        animals: animals.results?.length || 0,
        applications: apps.results?.length || 0,
        volunteers: volunteers.results?.length || 0,
        raised_cents: raised,
        goal_cents: goal
      },
      animals: animals.results || [],
      applications: apps.results || [],
      campaigns: campaigns.results || [],
      volunteers: volunteers.results || [],
      events: events.results || []
    });
  }


  if (path === "/api/dashboard/animals") {
    const rows = await env.DB.prepare(`
      SELECT
        id,
        animal_key,
        name,
        species,
        breed,
        sex,
        age_label,
        weight_label,
        status,
        location,
        intake_date,
        photo_url,
        bio,
        energy_level,
        good_with_dogs,
        good_with_cats,
        good_with_kids,
        medical_notes,
        foster_needed,
        adoption_fee_cents,
        featured,
        sort_order,
        asset_id,
        public_visible,
        tags_json,
        metadata_json,
        created_at,
        updated_at
      FROM animal_profiles
      WHERE tenant_id = 'tenant_companionscpas'
      ORDER BY featured DESC, sort_order ASC, updated_at DESC
    `).all();

    return json({
      animals: (rows.results || []).map(a => ({
        ...a,
        type: a.species,
        image: a.photo_url,
        photo: a.photo_url,
        status: a.status || "available",
        tags: safeJson(a.tags_json, []),
        metadata: safeJson(a.metadata_json, {})
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
    const campaigns = await env.DB.prepare("SELECT * FROM fundraising_campaigns_demo ORDER BY created_at DESC").all();
    return json({ campaigns: campaigns.results || [] });
  }

  if (path === "/api/dashboard/team") {
    const rows = await env.DB.prepare("SELECT * FROM volunteer_records ORDER BY role, full_name").all();
    return json({ members: rows.results || [] });
  }

  if (path === "/api/dashboard/calendar") {
    const rows = await env.DB.prepare("SELECT * FROM dashboard_calendar_events ORDER BY starts_at ASC").all();
    return json({ events: rows.results || [] });
  }


  if (path === "/api/dashboard/cms") {
    const pages = await env.DB.prepare("SELECT * FROM cms_pages ORDER BY sort_order, updated_at DESC LIMIT 100").all().catch(() => ({ results: [] }));
    const assets = await env.DB.prepare("SELECT * FROM cms_assets ORDER BY created_at DESC LIMIT 100").all().catch(() => ({ results: [] }));
    const themes = await env.DB.prepare("SELECT * FROM cms_themes ORDER BY updated_at DESC LIMIT 20").all().catch(() => ({ results: [] }));
    const nav = await env.DB.prepare("SELECT * FROM cms_navigation_items ORDER BY sort_order LIMIT 100").all().catch(() => ({ results: [] }));
    return json({ pages: pages.results || [], assets: assets.results || [], themes: themes.results || [], navigation: nav.results || [] });
  }

  if (path === "/api/dashboard/tasks") {
    const rows = await env.DB.prepare("SELECT * FROM agentsam_todo ORDER BY sort_order, created_at").all().catch(() => ({ results: [] }));
    return json({ todos: rows.results || [] });
  }

  if (path === "/api/dashboard/fosters") {
    const rows = await env.DB.prepare(`
      SELECT
        f.*,
        a.name AS animal_name,
        a.species,
        a.breed,
        a.sex,
        a.age_label,
        a.status AS animal_status,
        a.photo_url
      FROM foster_records f
      LEFT JOIN animal_profiles a ON a.id = f.animal_id
      WHERE f.tenant_id = 'tenant_companionscpas'
      ORDER BY f.created_at DESC
      LIMIT 100
    `).all().catch(() => ({ results: [] }));

    return json({ fosters: rows.results || [] });
  }

  if (path === "/api/dashboard/adoptions") {
    const rows = await env.DB.prepare("SELECT * FROM applications ORDER BY created_at DESC LIMIT 100").all().catch(() => ({ results: [] }));
    return json({ adoptions: rows.results || [] });
  }

  if (path === "/api/dashboard/intakes") {
    const rows = await env.DB.prepare("SELECT * FROM animal_profiles WHERE status = 'available' ORDER BY created_at DESC LIMIT 100").all().catch(() => ({ results: [] }));
    return json({ intakes: rows.results || [] });
  }

  if (path === "/api/dashboard/medical") {
    const rows = await env.DB.prepare("SELECT * FROM care_tasks WHERE lower(category) LIKE '%medical%' OR lower(title) LIKE '%vaccine%' OR lower(title) LIKE '%med%' ORDER BY created_at DESC LIMIT 100").all().catch(() => ({ results: [] }));
    return json({ medical: rows.results || [] });
  }

  if (path === "/api/dashboard/daily-care") {
    const rows = await env.DB.prepare("SELECT * FROM care_tasks ORDER BY created_at DESC LIMIT 100").all().catch(() => ({ results: [] }));
    return json({ care_tasks: rows.results || [] });
  }

  if (path === "/api/dashboard/reports") {
    const donations = await env.DB.prepare("SELECT * FROM donations ORDER BY created_at DESC LIMIT 100").all().catch(() => ({ results: [] }));
    const animals = await env.DB.prepare("SELECT * FROM animal_profiles WHERE status = 'available' ORDER BY created_at DESC LIMIT 100").all().catch(() => ({ results: [] }));
    const apps = await env.DB.prepare("SELECT * FROM applications ORDER BY created_at DESC LIMIT 100").all().catch(() => ({ results: [] }));
    return json({ donations: donations.results || [], animals: animals.results || [], applications: apps.results || [] });
  }

  return null;
}
