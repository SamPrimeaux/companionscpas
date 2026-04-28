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

const TENANT_ID = "tenant_companionscpas";

export async function socialRoutes(request, env, url) {
  const path = url.pathname;
  const method = request.method;

  if (path === "/api/social/providers" && method === "GET") {
    return json({
      providers: [
        {
          platform: "facebook",
          label: "Facebook Page",
          status: env.META_APP_ID ? "configurable" : "missing_keys",
          required_env: ["META_APP_ID", "META_APP_SECRET", "META_REDIRECT_URI"]
        },
        {
          platform: "instagram",
          label: "Instagram Business",
          status: env.META_APP_ID ? "configurable" : "missing_keys",
          required_env: ["META_APP_ID", "META_APP_SECRET", "META_REDIRECT_URI"]
        },
        {
          platform: "youtube",
          label: "YouTube Channel",
          status: env.GOOGLE_CLIENT_ID ? "configurable" : "missing_keys",
          required_env: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI"]
        }
      ]
    });
  }

  if (path === "/api/social/connections" && method === "GET") {
    const rows = await env.DB.prepare(
      "SELECT id, tenant_id, platform, account_name, account_id, page_id, instagram_business_account_id, youtube_channel_id, scopes_json, status, created_at, updated_at FROM social_connections WHERE tenant_id = ? ORDER BY platform"
    ).bind(TENANT_ID).all();

    return json({ connections: rows.results || [] });
  }

  if (path === "/api/social/drafts" && method === "GET") {
    const rows = await env.DB.prepare(
      "SELECT * FROM social_post_drafts WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 100"
    ).bind(TENANT_ID).all();

    return json({ drafts: rows.results || [] });
  }

  if (path === "/api/social/drafts" && method === "POST") {
    const data = await body(request);
    if (!data.body) return json({ error: "Post body is required" }, 400);

    const draftId = id("draft");
    await env.DB.prepare(
      `INSERT INTO social_post_drafts
       (id, tenant_id, created_by, title, body, platforms_json, media_asset_id, media_url, related_type, related_id, status, scheduled_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      draftId,
      TENANT_ID,
      data.created_by || null,
      data.title || null,
      data.body,
      JSON.stringify(data.platforms || []),
      data.media_asset_id || null,
      data.media_url || null,
      data.related_type || null,
      data.related_id || null,
      data.status || "draft",
      data.scheduled_at || null
    ).run();

    return json({ success: true, id: draftId }, 201);
  }

  if (path.match(/^\/api\/social\/drafts\/[^/]+\/approve$/) && method === "POST") {
    const draftId = path.split("/")[4];
    const data = await body(request);

    await env.DB.prepare(
      "UPDATE social_post_drafts SET status = 'approved', approved_by = ?, approved_at = datetime('now'), updated_at = datetime('now') WHERE id = ? AND tenant_id = ?"
    ).bind(data.approved_by || "system", draftId, TENANT_ID).run();

    return json({ success: true, id: draftId });
  }

  if (path.match(/^\/api\/social\/drafts\/[^/]+\/queue$/) && method === "POST") {
    const draftId = path.split("/")[4];
    const draft = await env.DB.prepare(
      "SELECT * FROM social_post_drafts WHERE id = ? AND tenant_id = ?"
    ).bind(draftId, TENANT_ID).first();

    if (!draft) return json({ error: "Draft not found" }, 404);

    let platforms = [];
    try { platforms = JSON.parse(draft.platforms_json || "[]"); } catch {}

    if (!platforms.length) return json({ error: "No platforms selected" }, 400);

    for (const platform of platforms) {
      const conn = await env.DB.prepare(
        "SELECT * FROM social_connections WHERE tenant_id = ? AND platform = ? AND status = 'connected' LIMIT 1"
      ).bind(TENANT_ID, platform).first();

      await env.DB.prepare(
        `INSERT INTO social_publish_jobs
         (id, tenant_id, draft_id, platform, connection_id, status)
         VALUES (?, ?, ?, ?, ?, 'queued')`
      ).bind(id("job"), TENANT_ID, draftId, platform, conn?.id || null).run();
    }

    await env.DB.prepare(
      "UPDATE social_post_drafts SET status = 'queued', updated_at = datetime('now') WHERE id = ?"
    ).bind(draftId).run();

    return json({ success: true, queued: platforms });
  }

  if (path === "/api/social/jobs" && method === "GET") {
    const rows = await env.DB.prepare(
      "SELECT * FROM social_publish_jobs WHERE tenant_id = ? ORDER BY queued_at DESC LIMIT 100"
    ).bind(TENANT_ID).all();

    return json({ jobs: rows.results || [] });
  }

  if (path === "/api/social/oauth/meta/start" && method === "GET") {
    if (!env.META_APP_ID || !env.META_REDIRECT_URI) {
      return json({ error: "Meta OAuth env vars missing" }, 501);
    }

    const state = crypto.randomUUID();
    const scopes = [
      "pages_show_list",
      "pages_read_engagement",
      "pages_manage_posts",
      "instagram_basic",
      "instagram_content_publish"
    ].join(",");

    const authUrl = new URL("https://www.facebook.com/v20.0/dialog/oauth");
    authUrl.searchParams.set("client_id", env.META_APP_ID);
    authUrl.searchParams.set("redirect_uri", env.META_REDIRECT_URI);
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("scope", scopes);
    authUrl.searchParams.set("response_type", "code");

    return Response.redirect(authUrl.toString(), 302);
  }

  if (path === "/api/social/oauth/meta/callback" && method === "GET") {
    return json({
      status: "stub_ready",
      message: "Meta callback route exists. Token exchange will be enabled once META_APP_SECRET and app review requirements are ready.",
      code_present: Boolean(url.searchParams.get("code"))
    });
  }

  if (path === "/api/social/oauth/youtube/start" && method === "GET") {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_REDIRECT_URI) {
      return json({ error: "Google OAuth env vars missing" }, 501);
    }

    const state = crypto.randomUUID();
    const scopes = [
      "https://www.googleapis.com/auth/youtube.upload",
      "https://www.googleapis.com/auth/youtube"
    ].join(" ");

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", env.GOOGLE_REDIRECT_URI);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");
    authUrl.searchParams.set("scope", scopes);
    authUrl.searchParams.set("state", state);

    return Response.redirect(authUrl.toString(), 302);
  }

  if (path === "/api/social/oauth/youtube/callback" && method === "GET") {
    return json({
      status: "stub_ready",
      message: "YouTube callback route exists. Token exchange will be enabled once GOOGLE_CLIENT_SECRET is configured.",
      code_present: Boolean(url.searchParams.get("code"))
    });
  }

  if (path.match(/^\/api\/social\/jobs\/[^/]+\/publish$/) && method === "POST") {
    const jobId = path.split("/")[4];

    return json({
      success: false,
      id: jobId,
      status: "stub_ready",
      message: "Publish route is staged. Real Facebook/Instagram/YouTube posting will activate after OAuth tokens and app permissions are configured."
    }, 501);
  }

  return null;
}
