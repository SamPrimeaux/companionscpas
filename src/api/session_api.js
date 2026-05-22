// ─── Session API: /api/auth/me + /api/auth/logout ────────────────────────────
// Uses agentsam_sessions as the canonical session store.

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json", ...headers }
  });
}

export function getSessionId(request) {
  const cookie = request.headers.get("Cookie") || "";
  const match  = cookie.match(/cpas_session=([^;]+)/);
  return match?.[1]?.trim() || null;
}

export async function getAuthUser(request, env) {
  const sessionId = getSessionId(request);
  if (!sessionId) return null;

  // Session valid for 30 days from creation
  const row = await env.DB.prepare(`
    SELECT s.id AS session_id, s.user_id, s.route_path, s.mode,
           s.created_at, s.updated_at,
           u.full_name, u.email, u.avatar_url, u.status
    FROM agentsam_sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.id = ?
      AND s.status = 'active'
      AND datetime(s.created_at, '+30 days') > datetime('now')
    LIMIT 1
  `).bind(sessionId).first().catch(() => null);

  return row || null;
}

export async function sessionRoutes(request, env, url) {

  // GET /api/auth/me
  if (url.pathname === "/api/auth/me" && request.method === "GET") {
    const row = await getAuthUser(request, env);
    if (!row) return json({ error: "Not authenticated" }, 401);

    const membership = await env.DB.prepare(`
      SELECT role FROM tenant_memberships
      WHERE user_id = ? AND status = 'active'
      ORDER BY created_at DESC LIMIT 1
    `).bind(row.user_id).first().catch(() => null);

    return json({
      authenticated: true,
      user: {
        id:              row.user_id,
        email:           row.email,
        full_name:       row.full_name,
        avatar_url:      row.avatar_url,
        role:            membership?.role || "staff",
        session_id:      row.session_id,
        session_route:   row.route_path,
        session_mode:    row.mode,
        session_created: row.created_at,
      }
    });
  }

  // POST /api/auth/logout
  if (url.pathname === "/api/auth/logout" && request.method === "POST") {
    const sessionId = getSessionId(request);
    if (sessionId) {
      await env.DB.prepare(`
        UPDATE agentsam_sessions
        SET status = 'revoked', updated_at = datetime('now')
        WHERE id = ?
      `).bind(sessionId).run().catch(() => {});
    }

    return json({ success: true, redirect: "/admin/login" }, 200, {
      "Set-Cookie": "cpas_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0"
    });
  }

  return null;
}
