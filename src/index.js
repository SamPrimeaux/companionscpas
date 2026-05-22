import { syncToIAM } from "./api/resolveModel.js";
import { authRoutes } from './api/auth_login.js';
import { sessionRoutes } from './api/session_api.js';
import { agentsamRoutes } from './api/agentsam_api.js';
import { agentsamToolsRoutes } from './api/agentsam_tools.js';
import { cmsRoutes } from './api/cms_api.js';
import { passwordResetRoutes } from './api/password_reset.js';
import { dashboardApiRoutes } from './api/dashboard_api.js';
import { contactApiRoutes } from './api/contact_api.js';
import { donationApiRoutes } from './api/donation_api.js';
import { paymentsEmailRoutes } from './api/payments_email.js';
import { socialRoutes } from './api/social.js';
import { renderHome } from "./api/render_home.js";


function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

async function asset(env, request, path) {
  const url = new URL(request.url);
  try {
    const res = await env.ASSETS.fetch(new Request(url.origin + path, request));
    if (res.ok) return res;
  } catch {}
  // Fallback: R2 WEBSITE_ASSETS
  try {
    const key = path.replace(/^\//, '');
    const obj = await env.WEBSITE_ASSETS.get(key);
    if (obj) {
      const headers = new Headers();
      headers.set('content-type', obj.httpMetadata?.contentType || 'text/html');
      headers.set('cache-control', 'public, max-age=300');
      return new Response(obj.body, { headers });
    }
  } catch {}
  return new Response('Not found', { status: 404 });
}

// ── Validate session cookie → returns user row or null ────────────────────────
async function getSession(request, env) {
  const cookieHeader = request.headers.get("Cookie") || "";
  const match = cookieHeader.match(/cpas_session=([^;]+)/);
  if (!match) return null;
  const sessionId = match[1];
  return env.DB.prepare(`
    SELECT s.user_id, s.id AS session_id, u.full_name, u.email
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.id = ?
      AND s.expires_at > datetime('now')
      AND s.revoked_at IS NULL
    LIMIT 1
  `).bind(sessionId).first().catch(() => null);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/agentsam/tools/")) {
      const toolResult = await agentsamToolsRoutes(request, env, url);
      if (toolResult) return toolResult;
    }

    if (url.pathname.startsWith("/api/agentsam/")) {
      const session = await getSession(request, env);
      if (!session) return new Response(JSON.stringify({ error:"Not authenticated" }), { status:401, headers:{ "Content-Type":"application/json" } });
      const agentResult = await agentsamRoutes(request, env, url, session);
      if (agentResult) return agentResult;
    }

    // ── API routes ────────────────────────────────────────────────────────────
    if (url.pathname.startsWith("/api/")) {
      if (url.pathname === "/api/health") {
        return json({ ok: true, service: "companionscpas-platform" });
      }

      const cmsResult = await cmsRoutes(request, env, url);
      if (cmsResult) return cmsResult;

      const routes = [
        authRoutes,
        sessionRoutes,
        passwordResetRoutes,
        dashboardApiRoutes,
        contactApiRoutes,
        donationApiRoutes,
        paymentsEmailRoutes,
        socialRoutes
      ];

      for (const route of routes) {
        const res = await route(request, env, url);
        if (res) return res;
      }

      return json({ error: "API route not found", path: url.pathname }, 404);
    }

    // ── Admin password reset ──────────────────────────────────────────────────
    if (url.pathname === "/admin/reset") {
      return asset(env, request, "/admin/reset-password.html");
    }

    // ── Legacy admin dashboard (keep working) ─────────────────────────────────
    if (url.pathname.startsWith("/admin/dashboard")) {
      return asset(env, request, "/admin/dashboard.html");
    }

    // ── Dashboard: enforce session auth ──────────────────────────────────────
    if (url.pathname === "/dashboard" || url.pathname.startsWith("/dashboard")) {
      // Let JS/CSS/asset sub-paths through without auth check
      const isAsset = url.pathname.match(/\.(js|jsx|css|png|webp|jpg|svg|ico|woff2?)$/i);
      if (!isAsset) {
        const session = await getSession(request, env);
        if (!session) {
          return Response.redirect(`${url.origin}/admin/login`, 302);
        }
      }
      // Serve dashboard shell for route, but allow JS/CSS/image assets through
      if (!isAsset) {
        return asset(env, request, "/dashboard.html");
      }
      return env.ASSETS.fetch(request);
    }

    // ── PRIMETECH: DB-driven home page ──────────────────────────────────────────
    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "")) {
      const html = await renderHome(env);
      return new Response(html, {
        headers: {
          "Content-Type": "text/html;charset=UTF-8",
          "Cache-Control": "no-store",
        },
      });
    }
    // ── END PRIMETECH ─────────────────────────────────────────────────────────

    // ── Everything else: static assets ───────────────────────────────────────
    return env.ASSETS.fetch(request);
  },

  // Cron: sync ETO events to IAM daily 06:00 UTC
  async scheduled(event, env, ctx) {
    ctx.waitUntil(syncToIAM(env));
  }
};
