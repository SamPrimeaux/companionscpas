// Members API — tenant user management (users + tenant_memberships)
import { getAuthUser } from "./session_api.js";

const TENANT = "tenant_companionscpas";
const ADMIN_ROLES = new Set(["owner", "admin", "developer"]);

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function nowIso() {
  return new Date().toISOString();
}

async function sha256Hex(value) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function userIdFromEmail(email) {
  const slug = String(email).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 32);
  return `usr_${slug}_${Date.now().toString(36)}`;
}

function membershipId() {
  return `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function requireAdmin(request, env) {
  const session = await getAuthUser(request, env);
  if (!session) return { error: json({ error: "Not authenticated" }, 401) };
  const membership = await env.DB.prepare(`
    SELECT tm.*, u.email, u.full_name
    FROM tenant_memberships tm
    JOIN users u ON u.id = tm.user_id
    WHERE tm.tenant_id = ? AND tm.user_id = ? AND tm.status IN ('active', 'invited')
    LIMIT 1
  `).bind(TENANT, session.user_id).first().catch(() => null);
  if (!membership || !ADMIN_ROLES.has(membership.role)) {
    return { error: json({ error: "Forbidden" }, 403) };
  }
  return { session, membership };
}

async function sendInviteEmail(env, { email, fullName, resetUrl }) {
  const fromEmail = env.RESEND_FROM_EMAIL || "Companions of CPAS <no-reply@companionsofcaddo.org>";
  const key = env.RESEND_API_KEY || env.RESEND_API_TOKEN;
  if (!key) return { sent: false, error: "Resend not configured" };

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#090d18;color:#f0ece6;border-radius:16px">
      <h2 style="margin:0 0 12px;font-size:22px;color:#fff">You're invited to Companions of CPAS</h2>
      <p style="margin:0 0 24px;color:rgba(255,255,255,.62);font-size:15px;line-height:1.6">
        Hi ${fullName || "there"}, you've been invited to the Companions of CPAS dashboard.
        Set your password to get started.
      </p>
      <a href="${resetUrl}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,rgba(160,104,255,0.92),rgba(109,58,220,0.84));color:#fff;border-radius:12px;font-weight:700;font-size:15px;text-decoration:none">
        Accept invite &amp; set password
      </a>
      <p style="margin:24px 0 0;color:rgba(255,255,255,.38);font-size:12px">This link expires in 30 minutes.</p>
    </div>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: fromEmail,
      to: [email],
      subject: "You're invited to Companions of CPAS",
      html,
    }),
  }).catch((e) => ({ ok: false, _err: e.message }));

  return { sent: res.ok, error: res.ok ? null : `Resend ${res.status || res._err}` };
}

async function createPasswordResetToken(env, userId) {
  const token = crypto.randomUUID() + "." + crypto.randomUUID();
  const secret = env.PASSWORD_RESET_SECRET || "cpas-reset-fallback";
  const tokenHash = await sha256Hex(token + "." + secret);
  const resetId = "reset_" + crypto.randomUUID();
  const expires = new Date(Date.now() + 1000 * 60 * 30).toISOString();
  await env.DB.prepare(`
    INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, created_at)
    VALUES (?,?,?,?,datetime('now'))
  `).bind(resetId, userId, tokenHash, expires).run();
  const domain = env.APP_DOMAIN || "companionsofcaddo.org";
  return `https://${domain}/admin/reset-password?token=${encodeURIComponent(token)}`;
}

function formatMember(row) {
  return {
    membership_id: row.membership_id,
    user_id: row.user_id,
    email: row.email,
    full_name: row.full_name || row.display_name || row.email,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    role: row.role,
    status: row.status,
    invited_at: row.invited_at,
    accepted_at: row.accepted_at,
    last_login_at: row.last_login_at,
    created_at: row.created_at,
  };
}

export async function membersApiRoutes(request, env, url) {
  const path = url.pathname;
  const method = request.method;

  if (!path.startsWith("/api/dashboard/members")) return null;

  if (path === "/api/dashboard/members" && method === "GET") {
    const auth = await requireAdmin(request, env);
    if (auth.error) return auth.error;

    const rows = await env.DB.prepare(`
      SELECT
        tm.id AS membership_id,
        tm.user_id,
        tm.role,
        tm.status,
        tm.invited_at,
        tm.accepted_at,
        tm.created_at,
        u.email,
        u.full_name,
        u.display_name,
        u.avatar_url,
        u.last_login_at
      FROM tenant_memberships tm
      JOIN users u ON u.id = tm.user_id
      WHERE tm.tenant_id = ?
      ORDER BY
        CASE tm.status WHEN 'active' THEN 0 WHEN 'invited' THEN 1 ELSE 2 END,
        u.full_name ASC,
        u.email ASC
    `).bind(TENANT).all().catch(() => ({ results: [] }));

    return json({ members: (rows.results || []).map(formatMember) });
  }

  if (path === "/api/dashboard/members/invite" && method === "POST") {
    const auth = await requireAdmin(request, env);
    if (auth.error) return auth.error;

    const body = await request.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const fullName = String(body.full_name || body.fullName || "").trim();
    const role = String(body.role || "volunteer").toLowerCase();

    if (!email || !email.includes("@")) return json({ error: "Valid email is required" }, 400);
    if (!["admin", "volunteer", "viewer", "developer"].includes(role)) {
      return json({ error: "Invalid role" }, 400);
    }
    if (role === "developer" && !["owner", "developer"].includes(auth.membership.role)) {
      return json({ error: "Only owners can assign developer role" }, 403);
    }

    let user = await env.DB.prepare(`SELECT * FROM users WHERE lower(email) = lower(?) LIMIT 1`).bind(email).first();
    const now = nowIso();

    if (!user) {
      const userId = userIdFromEmail(email);
      await env.DB.prepare(`
        INSERT INTO users (id, email, full_name, display_name, status, created_at, updated_at)
        VALUES (?,?,?,?,?,?,?)
      `).bind(userId, email, fullName || email.split("@")[0], fullName || null, "active", now, now).run();
      user = { id: userId, email, full_name: fullName };
    } else if (fullName && !user.full_name) {
      await env.DB.prepare(`UPDATE users SET full_name = ?, updated_at = ? WHERE id = ?`).bind(fullName, now, user.id).run();
    }

    const existing = await env.DB.prepare(`
      SELECT id, status FROM tenant_memberships WHERE tenant_id = ? AND user_id = ? LIMIT 1
    `).bind(TENANT, user.id).first();

    if (existing && existing.status === "active") {
      return json({ error: "User is already an active member" }, 409);
    }

    const memId = existing?.id || membershipId();
    if (existing) {
      await env.DB.prepare(`
        UPDATE tenant_memberships
        SET role = ?, status = 'invited', invited_by = ?, invited_at = ?, updated_at = ?
        WHERE id = ?
      `).bind(role, auth.session.user_id, now, now, memId).run();
    } else {
      await env.DB.prepare(`
        INSERT INTO tenant_memberships (id, tenant_id, user_id, role, status, invited_by, invited_at, created_at, updated_at)
        VALUES (?,?,?,?,?,?,?,?,?)
      `).bind(memId, TENANT, user.id, role, "invited", auth.session.user_id, now, now, now).run();
    }

    const resetUrl = await createPasswordResetToken(env, user.id);
    const emailResult = await sendInviteEmail(env, {
      email,
      fullName: fullName || user.full_name,
      resetUrl,
    });

    return json({
      ok: true,
      membership_id: memId,
      user_id: user.id,
      email_sent: emailResult.sent,
      email_error: emailResult.error || null,
    });
  }

  const memberMatch = path.match(/^\/api\/dashboard\/members\/([^/]+)$/);
  if (memberMatch && method === "PATCH") {
    const auth = await requireAdmin(request, env);
    if (auth.error) return auth.error;

    const membershipIdParam = memberMatch[1];
    const body = await request.json().catch(() => ({}));

    const target = await env.DB.prepare(`
      SELECT tm.*, u.email FROM tenant_memberships tm
      JOIN users u ON u.id = tm.user_id
      WHERE tm.id = ? AND tm.tenant_id = ?
      LIMIT 1
    `).bind(membershipIdParam, TENANT).first();

    if (!target) return json({ error: "Member not found" }, 404);
    if (target.user_id === auth.session.user_id && body.status === "inactive") {
      return json({ error: "You cannot deactivate your own account" }, 400);
    }

    const sets = [];
    const vals = [];

    if (body.role !== undefined) {
      const role = String(body.role).toLowerCase();
      if (!["admin", "volunteer", "viewer", "developer", "owner"].includes(role)) {
        return json({ error: "Invalid role" }, 400);
      }
      if (target.user_id === auth.session.user_id && role !== target.role) {
        return json({ error: "You cannot change your own role" }, 400);
      }
      sets.push("role = ?");
      vals.push(role);
    }

    if (body.status !== undefined) {
      const status = String(body.status).toLowerCase();
      if (!["active", "inactive", "invited"].includes(status)) {
        return json({ error: "Invalid status" }, 400);
      }
      sets.push("status = ?");
      vals.push(status);
      if (status === "active") {
        sets.push("accepted_at = ?");
        vals.push(nowIso());
      }
    }

    if (body.full_name !== undefined) {
      await env.DB.prepare(`UPDATE users SET full_name = ?, updated_at = ? WHERE id = ?`)
        .bind(String(body.full_name).trim() || null, nowIso(), target.user_id).run();
    }

    if (!sets.length && body.full_name === undefined) {
      return json({ error: "No updatable fields" }, 400);
    }

    if (sets.length) {
      sets.push("updated_at = ?");
      vals.push(nowIso());
      vals.push(membershipIdParam);
      await env.DB.prepare(
        `UPDATE tenant_memberships SET ${sets.join(", ")} WHERE id = ?`
      ).bind(...vals).run();
    }

    return json({ ok: true, membership_id: membershipIdParam });
  }

  if (memberMatch && method === "DELETE") {
    const auth = await requireAdmin(request, env);
    if (auth.error) return auth.error;

    const membershipIdParam = memberMatch[1];
    const target = await env.DB.prepare(`
      SELECT user_id FROM tenant_memberships WHERE id = ? AND tenant_id = ? LIMIT 1
    `).bind(membershipIdParam, TENANT).first();

    if (!target) return json({ error: "Member not found" }, 404);
    if (target.user_id === auth.session.user_id) {
      return json({ error: "You cannot remove your own membership" }, 400);
    }

    await env.DB.prepare(`
      UPDATE tenant_memberships SET status = 'inactive', updated_at = ? WHERE id = ?
    `).bind(nowIso(), membershipIdParam).run();

    return json({ ok: true, membership_id: membershipIdParam, status: "inactive" });
  }

  return null;
}
