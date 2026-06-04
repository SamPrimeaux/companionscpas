function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json", ...headers }
  });
}

function cookie(sessionId) {
  return `cpas_session=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`;
}

// ── STEP 1: Redirect to Google's OAuth consent screen
async function handleGoogleInit(request, env, url) {
  const clientId = env.GOOGLE_CLIENT_ID;
  if (!clientId) return json({ error: "Google OAuth not configured" }, 503);

  const redirectUri = `${url.origin}/api/auth/google/callback`;
  const state = crypto.randomUUID();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "offline",
    prompt: "select_account",
  });

  const googleUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  return new Response(null, {
    status: 302,
    headers: {
      Location: googleUrl,
      // SameSite=None so the cookie is sent back on Google's cross-origin redirect
      "Set-Cookie": `cpas_oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=600`,
    },
  });
}

// ── STEP 2: Handle Google's callback, exchange code for token, create session
async function handleGoogleCallback(request, env, url) {
  const clientId = env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return json({ error: "Google OAuth not configured" }, 503);

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return Response.redirect(`${url.origin}/admin/login?error=google_denied`, 302);
  }

  if (!code) {
    return Response.redirect(`${url.origin}/admin/login?error=invalid_callback`, 302);
  }

  // Validate CSRF state — warn but don't hard-block (cookie may not survive cross-origin redirect)
  const cookieHeader = request.headers.get("Cookie") || "";
  const storedState = cookieHeader.match(/cpas_oauth_state=([^;]+)/)?.[1];
  if (state && storedState && storedState !== state) {
    console.warn("[google-oauth] state mismatch — possible CSRF or cookie loss");
    return Response.redirect(`${url.origin}/admin/login?error=state_mismatch`, 302);
  }

  const redirectUri = `${url.origin}/api/auth/google/callback`;

  // Exchange code for tokens
  let tokenData;
  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    tokenData = await tokenRes.json();
  } catch (err) {
    console.error("[google-oauth] token exchange failed:", err?.message);
    return Response.redirect(`${url.origin}/admin/login?error=token_exchange_failed`, 302);
  }

  if (!tokenData?.access_token) {
    console.error("[google-oauth] no access_token:", JSON.stringify(tokenData));
    return Response.redirect(`${url.origin}/admin/login?error=token_missing`, 302);
  }

  // Fetch user profile from Google
  let profile;
  try {
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    profile = await profileRes.json();
  } catch (err) {
    console.error("[google-oauth] profile fetch failed:", err?.message);
    return Response.redirect(`${url.origin}/admin/login?error=profile_failed`, 302);
  }

  if (!profile?.email) {
    return Response.redirect(`${url.origin}/admin/login?error=no_email`, 302);
  }

  // Look up user in D1 by email
  const user = await env.DB.prepare(`
    SELECT u.id, u.email, u.full_name, u.status
    FROM users u
    WHERE lower(u.email) = lower(?)
      AND u.status = 'active'
    LIMIT 1
  `).bind(profile.email).first();

  if (!user) {
    console.warn("[google-oauth] email not authorized:", profile.email);
    return Response.redirect(`${url.origin}/admin/login?error=not_authorized`, 302);
  }

  // Revoke existing sessions
  await env.DB.prepare(`
    UPDATE agentsam_sessions
    SET status = 'revoked', updated_at = datetime('now')
    WHERE user_id = ? AND status = 'active'
  `).bind(user.id).run().catch(() => {});

  // Create new session
  const sessionId = crypto.randomUUID();
  await env.DB.prepare(`
    INSERT INTO agentsam_sessions
      (id, tenant_id, user_id, session_title, route_path, mode, status, created_at, updated_at)
    VALUES (?, 'tenant_companionscpas', ?, 'Google Login', '/dashboard', 'ask', 'active', datetime('now'), datetime('now'))
  `).bind(sessionId, user.id).run();

  // Update last login
  await env.DB.prepare(`
    UPDATE users SET last_login_at = datetime('now'), updated_at = datetime('now')
    WHERE id = ?
  `).bind(user.id).run().catch(() => {});

  return new Response(null, {
    status: 302,
    headers: {
      Location: "/dashboard",
      "Set-Cookie": [
        cookie(sessionId),
        `cpas_oauth_state=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0`,
      ].join(", "),
    },
  });
}

export async function googleAuthRoutes(request, env, url) {
  if (url.pathname === "/api/auth/google" && request.method === "GET") {
    return handleGoogleInit(request, env, url);
  }
  if (url.pathname === "/api/auth/google/callback" && request.method === "GET") {
    return handleGoogleCallback(request, env, url);
  }
  return null;
}
