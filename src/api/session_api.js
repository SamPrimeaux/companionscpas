// ─── Session API: /api/auth/me + /api/auth/logout ────────────────────────────

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json", ...headers }
  });
}

function getSessionId(request) {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(/cpas_session=([^;]+)/);
  return match?.[1] || null;
}

export async function sessionRoutes(request, env, url) {
  // GET /api/auth/me — return current user from session cookie
  if (url.pathname === "/api/auth/me" && request.method === "GET") {
    const sessionId = getSessionId(request);
    if (!sessionId) return json({ error: "Not authenticated" }, 401);

    const row = await env.DB.prepare(`
      SELECT s.user_id, s.id AS session_id, s.expires_at,
             u.full_name, u.email, u.avatar_url, u.status
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.id = ?
        AND s.expires_at > datetime('now')
        AND s.revoked_at IS NULL
      LIMIT 1
    `).bind(sessionId).first().catch(() => null);

    if (!row) return json({ error: "Session expired or invalid" }, 401);

    // Get role from tenant_memberships
    const membership = await env.DB.prepare(`
      SELECT role FROM tenant_memberships
      WHERE user_id = ? AND status = 'active'
      ORDER BY created_at DESC LIMIT 1
    `).bind(row.user_id).first().catch(() => null);

    return json({
      authenticated: true,
      user: {
        id: row.user_id,
        email: row.email,
        full_name: row.full_name,
        avatar_url: row.avatar_url,
        role: membership?.role || "staff",
        session_expires: row.expires_at
      }
    });
  }

  // POST /api/auth/logout — revoke session, clear cookie
  if (url.pathname === "/api/auth/logout" && request.method === "POST") {
    const sessionId = getSessionId(request);
    if (sessionId) {
      await env.DB.prepare(`
        UPDATE sessions SET revoked_at = datetime('now')
        WHERE id = ?
      `).bind(sessionId).run().catch(() => {});
    }

    return json({ success: true, redirect: "/admin/login" }, 200, {
      "Set-Cookie": "cpas_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
    });
  }

  return null;
}
