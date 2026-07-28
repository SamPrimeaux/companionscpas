import {
  buildSessionCookie,
  createDashboardSession,
} from "./session_api.js";

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json", ...headers }
  });
}

async function pbkdf2Verify(password, saltHex, hashHex) {
  const enc = new TextEncoder();
  const salt = Uint8Array.from(saltHex.match(/.{1,2}/g).map(b => parseInt(b, 16)));
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: 100000 },
    key,
    512
  );
  const calc = [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, "0")).join("");
  return calc === hashHex;
}

export async function authRoutes(request, env, url) {
  if (url.pathname !== "/api/auth/login" || request.method !== "POST") return null;

  const data = await request.json().catch(() => null);
  if (!data?.email || !data?.password) {
    return json({ error: "Email and password required" }, 400);
  }

  const row = await env.DB.prepare(`
    SELECT
      u.id,
      u.email,
      u.full_name,
      u.status,
      c.password_hash,
      c.password_salt,
      c.password_algo
    FROM users u
    JOIN user_credentials c ON c.user_id = u.id
    WHERE lower(u.email) = lower(?)
      AND c.provider = 'password'
      AND u.status = 'active'
    LIMIT 1
  `).bind(data.email).first();

  if (!row) return json({ error: "Invalid email or password" }, 401);

  const valid = await pbkdf2Verify(data.password, row.password_salt, row.password_hash);
  if (!valid) return json({ error: "Invalid email or password" }, 401);

  // Multi-device: add a session — do NOT revoke phone/desktop/other active sessions
  const { sessionId } = await createDashboardSession(env, row.id, {
    title: "Dashboard Session",
  });

  await env.DB.prepare(`
    UPDATE users SET last_login_at = datetime('now'), updated_at = datetime('now')
    WHERE id = ?
  `).bind(row.id).run();

  return json({
    success: true,
    user: { id: row.id, email: row.email, full_name: row.full_name },
    redirect: "/dashboard"
  }, 200, {
    "Set-Cookie": buildSessionCookie(sessionId)
  });
}
