// ─── Session API: /api/auth/me + /api/auth/logout ────────────────────────────
// Uses agentsam_sessions as the canonical session store.
// Multi-device: login creates an additional active session; it does NOT revoke
// other devices. Soft prune keeps the newest N actives per user.

/** Max concurrent active dashboard sessions per user (phone + desk + extras). */
export const MAX_ACTIVE_SESSIONS_PER_USER = 10;

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

/** SameSite=Lax so password + Google login behave the same across devices/tabs. */
export function buildSessionCookie(sessionId) {
  return `cpas_session=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`;
}

export function clearSessionCookie() {
  return `cpas_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
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

/**
 * Revoke oldest active sessions so a user never exceeds maxKeep concurrent devices.
 * Does not touch the newest maxKeep rows (including the one just created).
 */
export async function pruneExcessActiveSessions(env, userId, maxKeep = MAX_ACTIVE_SESSIONS_PER_USER) {
  if (!env?.DB || !userId) return { pruned: 0 };
  const keep = Math.max(1, Number(maxKeep) || MAX_ACTIVE_SESSIONS_PER_USER);

  const active = await env.DB.prepare(`
    SELECT id FROM agentsam_sessions
    WHERE user_id = ? AND status = 'active'
    ORDER BY datetime(created_at) DESC, id DESC
  `).bind(userId).all().catch(() => ({ results: [] }));

  const ids = (active.results || []).map((r) => r.id).filter(Boolean);
  if (ids.length <= keep) return { pruned: 0 };

  const excess = ids.slice(keep);
  for (const id of excess) {
    await env.DB.prepare(`
      UPDATE agentsam_sessions
      SET status = 'revoked', updated_at = datetime('now')
      WHERE id = ? AND status = 'active'
    `).bind(id).run().catch(() => {});
  }
  return { pruned: excess.length };
}

/**
 * Create a new active dashboard session WITHOUT revoking other devices.
 * Soft-prunes if the user is over MAX_ACTIVE_SESSIONS_PER_USER.
 * @returns {{ sessionId: string }}
 */
export async function createDashboardSession(env, userId, { title = "Dashboard Session" } = {}) {
  const sessionId = crypto.randomUUID();
  await env.DB.prepare(`
    INSERT INTO agentsam_sessions
      (id, tenant_id, user_id, session_title, route_path, mode, status, created_at, updated_at)
    VALUES (?, 'tenant_companionscpas', ?, ?, '/dashboard', 'ask', 'active', datetime('now'), datetime('now'))
  `).bind(sessionId, userId, title).run();

  await pruneExcessActiveSessions(env, userId);
  return { sessionId };
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

  // POST /api/auth/logout — revoke THIS device only
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
      "Set-Cookie": clearSessionCookie()
    });
  }

  return null;
}
