import { syncToIAM } from "./api/resolveModel.js";
import { authRoutes } from './api/auth_login.js';
import { sessionRoutes, getAuthUser } from './api/session_api.js';
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
  // Primary: WEBSITE_ASSETS (R2) — DB-driven content
  try {
    const key = path.replace(/^\//, '') || 'index.html';
    const obj = await env.WEBSITE_ASSETS.get(key);
    if (obj) {
      const ext = key.split('.').pop().toLowerCase();
      const mime = {
        html:'text/html', css:'text/css', js:'application/javascript',
        jsx:'application/javascript', json:'application/json',
        png:'image/png', webp:'image/webp', jpg:'image/jpeg',
        svg:'image/svg+xml', ico:'image/x-icon', woff2:'font/woff2',
      }[ext] || obj.httpMetadata?.contentType || 'text/html';
      return new Response(obj.body, {
        headers: {
          'content-type': mime,
          'cache-control': 'public, max-age=300',
        }
      });
    }
  } catch {}
  // Fallback: ASSETS (static binding — being migrated out)
  try {
    const url = new URL(request.url);
    const res = await env.ASSETS.fetch(new Request(url.origin + path, request));
    if (res.ok) return res;
  } catch {}
  return new Response('Not found', { status: 404 });
}

// ── Session validation — delegates to agentsam_sessions via session_api.js ─────
// getAuthUser(request, env) reads agentsam_sessions WHERE status='active'
// Alias kept as getSession for backward compat with existing call sites
const getSession = getAuthUser;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/agentsam/tools/")) {
      const session = await getSession(request, env);
      if (!session) return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401, headers: { "Content-Type": "application/json" }
      });
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

    // ── CMS about page: KV -> R2 -> hardcoded fallback ──────────────────────
    if (request.method === "GET" && url.pathname === "/about") {
      const cacheKey = "page:/about";
      const htmlHeaders = {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=60",
      };

      try {
        if (env.CMS_CACHE) {
          const cached = await env.CMS_CACHE.get(cacheKey);
          if (cached) return new Response(cached, { headers: htmlHeaders });
        }
      } catch (err) {
        console.warn("[about-serve] KV get failed:", err?.message || err);
      }

      try {
        const artifact = await env.WEBSITE_ASSETS.get("static/pages/about/index.html");
        if (artifact) {
          const html = await artifact.text();
          if (env.CMS_CACHE) {
            await env.CMS_CACHE.put(cacheKey, html, { expirationTtl: 3600 }).catch((err) => {
              console.warn("[about-serve] KV backfill failed:", err?.message || err);
            });
          }
          return new Response(html, { headers: htmlHeaders });
        }
      } catch (err) {
        console.warn("[about-serve] R2 get failed:", err?.message || err);
      }
    }

    // ── CMS adopt page: KV -> R2 -> hardcoded fallback ──────────────────────
    if (request.method === "GET" && url.pathname === "/adopt") {
      const cacheKey = "page:/adopt";
      const htmlHeaders = {
        "Content-Type": "text/html;charset=utf-8",
        "Cache-Control": "public,max-age=60",
      };

      try {
        if (env.CMS_CACHE) {
          const cached = await env.CMS_CACHE.get(cacheKey);
          if (cached) return new Response(cached, { headers: htmlHeaders });
        }
      } catch (err) {
        console.warn("[adopt-serve] KV get failed:", err?.message || err);
      }

      try {
        const artifact = await env.WEBSITE_ASSETS.get("static/pages/adopt/index.html");
        if (artifact) {
          const html = await artifact.text();
          if (env.CMS_CACHE) {
            await env.CMS_CACHE.put(cacheKey, html, { expirationTtl: 3600 }).catch((err) => {
              console.warn("[adopt-serve] KV backfill failed:", err?.message || err);
            });
          }
          return new Response(html, { headers: htmlHeaders });
        }
      } catch (err) {
        console.warn("[adopt-serve] R2 get failed:", err?.message || err);
      }
    }

    // ── Everything else: static assets ───────────────────────────────────────
    return env.ASSETS.fetch(request);
  },

  // Cron: sync ETO events to IAM daily 06:00 UTC
  async scheduled(event, env, ctx) {
    ctx.waitUntil(syncToIAM(env));
  }
};
