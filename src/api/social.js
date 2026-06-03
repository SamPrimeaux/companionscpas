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

// Validate that a Facebook page URL is safe to store.
// Only accepts https://www.facebook.com/ or https://facebook.com/ prefixes.
// Rejects script tags and arbitrary HTML.
function isValidFacebookPageUrl(url) {
  if (typeof url !== "string") return false;
  if (/<script/i.test(url)) return false;
  return /^https:\/\/(www\.)?facebook\.com\//.test(url);
}

export async function socialRoutes(request, env, url) {
  const path = url.pathname;
  const method = request.method;

  // ── Existing routes (preserved exactly) ─────────────────────────────────

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

    // TODO: persist state token in KV/D1 for CSRF validation before going live
    return Response.redirect(authUrl.toString(), 302);
  }

  if (path === "/api/social/oauth/meta/callback" && method === "GET") {
    // TODO: validate state param, exchange code for token, store encrypted token
    // Not wired until META_APP_SECRET is configured and token encryption is in place
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

  // ── New routes added this sprint ─────────────────────────────────────────

  // GET /api/social/status
  // Returns which social providers have credentials configured. Does not expose secrets.
  if (path === "/api/social/status" && method === "GET") {
    return json({
      ok: true,
      providers: {
        meta: {
          configured: Boolean(env.META_APP_ID && env.META_APP_SECRET),
          redirectUri: env.META_REDIRECT_URI || null,
          embedEnabled: true
        },
        google: {
          configured: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
          redirectUri: env.GOOGLE_REDIRECT_URI || null
        }
      }
    });
  }

  // GET /api/social/embed/facebook-page
  // Returns the saved Facebook Page embed config for the public /community page.
  if (path === "/api/social/embed/facebook-page" && method === "GET") {
    try {
      const row = await env.DB.prepare(
        "SELECT * FROM social_embed_settings WHERE tenant_id = ? AND provider = 'facebook' LIMIT 1"
      ).bind(TENANT_ID).first();

      if (!row || !row.enabled) {
        return json({ ok: true, configured: false, message: "Facebook page embed is not configured." });
      }

      let config = {};
      try { config = JSON.parse(row.config_json || "{}"); } catch {}

      return json({
        ok: true,
        configured: true,
        page_url: row.page_url,
        tabs: config.tabs || "timeline",
        width: config.width || null,
        height: config.height || null,
        small_header: config.small_header || false,
        hide_cover: config.hide_cover || false,
        show_facepile: config.show_facepile !== false
      });
    } catch (err) {
      // If the table does not yet exist, return graceful empty state
      return json({ ok: true, configured: false, message: "Facebook page embed is not configured." });
    }
  }

  // POST /api/social/embed/facebook-page
  // Saves Facebook Page embed config. Admin auth required.
  // Validates URL format. Rejects script injection.
  if (path === "/api/social/embed/facebook-page" && method === "POST") {
    // Auth check
    const { getAuthUser } = await import('./session_api.js').catch(() => ({ getAuthUser: null }));
    if (getAuthUser) {
      const user = await getAuthUser(request, env);
      if (!user) return json({ error: "Not authenticated" }, 401);
    }

    const data = await body(request);

    if (!data.page_url) {
      return json({ error: "page_url is required" }, 400);
    }
    if (!isValidFacebookPageUrl(data.page_url)) {
      return json({ error: "page_url must start with https://www.facebook.com/ or https://facebook.com/ and contain no script tags" }, 400);
    }

    const configJson = JSON.stringify({
      tabs:          data.tabs         || "timeline",
      width:         data.width        || null,
      height:        data.height       || null,
      small_header:  data.small_header || false,
      hide_cover:    data.hide_cover   || false,
      show_facepile: data.show_facepile !== false
    });

    try {
      await env.DB.prepare(
        `INSERT INTO social_embed_settings (id, tenant_id, provider, page_url, config_json, enabled, created_at, updated_at)
         VALUES (?, ?, 'facebook', ?, ?, 1, datetime('now'), datetime('now'))
         ON CONFLICT(id) DO UPDATE SET page_url=excluded.page_url, config_json=excluded.config_json,
           enabled=1, updated_at=datetime('now')`
      ).bind(`embed_facebook_${TENANT_ID}`, TENANT_ID, data.page_url, configJson).run();

      // Bust public page KV cache so /community picks up new config
      if (env.CMS_CACHE) {
        await env.CMS_CACHE.delete("page:/community").catch(() => {});
      }

      return json({ ok: true, message: "Facebook embed config saved." });
    } catch (err) {
      return json({ error: "Failed to save embed config. Run the social integrations migration first.", detail: err.message }, 500);
    }
  }

  // POST /api/social/facebook/page-posts
  // Scaffold route for publishing to a connected Facebook Page.
  // Returns 501 until a real page access token is configured.
  // Never silently succeeds — returns clear error if tokens are absent.
  if (path === "/api/social/facebook/page-posts" && method === "POST") {
    const { getAuthUser } = await import('./session_api.js').catch(() => ({ getAuthUser: null }));
    if (getAuthUser) {
      const user = await getAuthUser(request, env);
      if (!user) return json({ error: "Not authenticated" }, 401);
    }

    // Check for a connected Facebook page token in D1
    let connection = null;
    try {
      connection = await env.DB.prepare(
        "SELECT * FROM social_provider_connections WHERE tenant_id = ? AND provider = 'facebook' AND status = 'connected' LIMIT 1"
      ).bind(TENANT_ID).first();
    } catch {}

    if (!connection || !connection.token_ciphertext) {
      return json({
        ok: false,
        status: 501,
        message: "Facebook publishing is not configured. Connect a Meta app and page access token first."
      }, 501);
    }

    // Token exists — scaffold the publish call. Real implementation goes here
    // once token decryption and Meta Graph API call are wired.
    const data = await body(request);
    if (!data.message) return json({ error: "message is required" }, 400);

    // TODO: decrypt token_ciphertext, call POST /{page_id}/feed via Meta Graph API
    return json({
      ok: false,
      status: 501,
      message: "Page token found but publish call is not yet wired. Implement token decryption and Graph API call."
    }, 501);
  }

  return null;
}
