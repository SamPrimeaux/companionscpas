
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
    const apps = await env.DB.prepare("SELECT * FROM adoption_applications_demo ORDER BY submitted_at DESC").all();
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
    const rows = await env.DB.prepare("SELECT * FROM animal_profiles ORDER BY name").all();
    return json({ animals: rows.results || [] });
  }

  if (path === "/api/dashboard/applications") {
    const rows = await env.DB.prepare("SELECT * FROM adoption_applications_demo ORDER BY submitted_at DESC").all();
    return json({ applications: rows.results || [] });
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

  return null;
}
