import { syncToIAM } from "./api/resolveModel.js";
import { authRoutes } from './api/auth_login.js';
import { googleAuthRoutes } from './api/auth_google.js';
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
import { renderPage, getBrand } from "./api/render_page.js";
import { handleFosterApply, handleFosterList, handleFosterUpdate } from './api/foster_api.js';


function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

async function asset(env, request, path) {
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
  return new Response('Not found', { status: 404 });
}


async function servePublicPage(route, env) {
  const normalizedRoute = route === "" ? "/" : route;
  const cacheKey = `page:${normalizedRoute}`;
  const artifactKey = normalizedRoute === "/" ? "static/pages/index.html" : `static/pages${normalizedRoute}/index.html`;
  const headers = {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "public, max-age=60",
  };

  try {
    if (env.CMS_CACHE) {
      const cached = await env.CMS_CACHE.get(cacheKey);
      if (cached) return new Response(cached, { headers });
    }
  } catch (err) {
    console.warn("[public-page] KV get failed:", normalizedRoute, err?.message || err);
  }

  try {
    const artifact = await env.WEBSITE_ASSETS.get(artifactKey);
    if (artifact) {
      const html = await artifact.text();
      if (env.CMS_CACHE) {
        await env.CMS_CACHE.put(cacheKey, html, { expirationTtl: 3600 }).catch(() => {});
      }
      return new Response(html, { headers });
    }
  } catch (err) {
    console.warn("[public-page] R2 get failed:", normalizedRoute, err?.message || err);
  }

  try {
    const html = await renderPage(normalizedRoute, `adhoc_${Date.now()}`, env);
    return new Response(html, { headers: { ...headers, "cache-control": "no-store" } });
  } catch (err) {
    console.warn("[public-page] render fallback failed:", normalizedRoute, err?.message || err);
    return new Response("Page unavailable", { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } });
  }
}

// Legacy ?view= → canonical /dashboard/* path map
const LEGACY_VIEW_MAP = {
  "overview":           "/dashboard/overview",
  "animals":            "/dashboard/animals",
  "fosters":            "/dashboard/fosters",
  "adoptions":          "/dashboard/adoptions",
  "intakes":            "/dashboard/intakes",
  "medical":            "/dashboard/medical",
  "daily-care":         "/dashboard/daily-care",
  "volunteers":         "/dashboard/volunteers",
  "applications":       "/dashboard/applications",
  "donations":          "/dashboard/donations",
  "fundraising":        "/dashboard/fundraising",
  "cms":                "/dashboard/cms/website",
  "reports":            "/dashboard/reports",
  "settings":           "/dashboard/settings",
  "notifications":      "/dashboard/notifications",
};

const PUBLIC_ROUTES = ["/", "/about", "/community", "/adopt", "/services", "/donate"];

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

    // API routes
    if (url.pathname.startsWith("/api/")) {
      if (url.pathname === "/api/foster/apply" && request.method === "POST") {
        return handleFosterApply(request, env);
      }
      if (url.pathname === "/api/foster/applications" && request.method === "GET") {
        return handleFosterList(request, env);
      }
      if (url.pathname.startsWith("/api/foster/applications/") && request.method === "PATCH") {
        const appId = url.pathname.split("/api/foster/applications/")[1];
        return handleFosterUpdate(request, env, appId);
      }

      if (url.pathname === "/api/health") {
        return json({ ok: true, service: "companionscpas" });
      }

      const cmsResult = await cmsRoutes(request, env, url);
      if (cmsResult) return cmsResult;

      const googleResult = await googleAuthRoutes(request, env, url);
      if (googleResult) return googleResult;

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

    // Static assets
    if ((request.method === "GET" || request.method === "HEAD") && url.pathname.startsWith("/static/")) {
      const key = url.pathname.slice(1);

      try {
        const object = await env.WEBSITE_ASSETS.get(key);
        if (!object) return new Response("Not found", { status: 404 });

        const ext = key.split(".").pop()?.toLowerCase();
        const contentType =
          ext === "css" ? "text/css; charset=utf-8" :
          ext === "js" ? "application/javascript; charset=utf-8" :
          ext === "html" ? "text/html; charset=utf-8" :
          ext === "webp" ? "image/webp" :
          ext === "png" ? "image/png" :
          ext === "jpg" || ext === "jpeg" ? "image/jpeg" :
          ext === "svg" ? "image/svg+xml" :
          ext === "ico" ? "image/x-icon" :
          "application/octet-stream";

        const etag = object.etag ? `"${object.etag}"` : null;
        const ifNoneMatch = request.headers.get("if-none-match");
        if (etag && ifNoneMatch === etag) {
          return new Response(null, { status: 304 });
        }

        const isShell = key.includes("cpas-shell");
        const cacheControl = isShell
          ? "public, max-age=60, stale-while-revalidate=300"
          : "public, max-age=3600, stale-while-revalidate=86400";

        const staticHeaders = {
          "content-type": object.httpMetadata?.contentType || contentType,
          "cache-control": cacheControl,
          ...(etag ? { "etag": etag } : {}),
        };

        if (request.method === "HEAD") {
          return new Response(null, { headers: staticHeaders });
        }

        return new Response(object.body, { headers: staticHeaders });
      } catch (err) {
        console.warn("[static-r2] failed:", err?.message || err);
        return new Response("Static asset error", { status: 500 });
      }
    }

    // Admin routes
    if (url.pathname === "/admin/login" || url.pathname === "/admin" || url.pathname === "/admin/") {
      const brand = await getBrand(env).catch(() => ({}));
      const logoUrl = brand?.logo_light_url || "https://imagedelivery.net/g7wf09fCONpnidkRnR_5vw/9a00de35-fa41-49da-e431-a5f004cf5e00/avatar";
      const obj = await env.WEBSITE_ASSETS.get("admin/login.html").catch(() => null);
      if (!obj) return new Response("Not found", { status: 404 });
      let html = await obj.text();
      html = html.replace(/src="[^"]*" alt="Companions of CPAS"/, `src="${logoUrl}" alt="Companions of CPAS"`);
      return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
    }

    if (url.pathname === "/admin/reset" || url.pathname === "/admin/reset-password") {
      return asset(env, request, "/admin/reset-password.html");
    }

    if (url.pathname.startsWith("/admin/dashboard")) {
      return asset(env, request, "/admin/dashboard.html");
    }

    // ── Dashboard — serve shell for all /dashboard/* paths ───────────────────
    if (url.pathname === "/dashboard" || url.pathname.startsWith("/dashboard/")) {
      // Pass JS/CSS/image assets through directly
      const isAsset = url.pathname.match(/\.(js|jsx|css|png|webp|jpg|svg|ico|woff2?)$/i);
      if (isAsset) {
        // Assets live under dashboard/ in R2
        return asset(env, request, url.pathname);
      }

      // Auth check for all non-asset dashboard routes
      const session = await getSession(request, env);
      if (!session) {
        return Response.redirect(`${url.origin}/admin/login`, 302);
      }

      // Legacy ?view= redirect → canonical clean URL (302 so browser updates address bar)
      const legacyView = url.searchParams.get("view");
      if (legacyView) {
        const legacyAnimalId = url.searchParams.get("animalId");
        const legacyAppId    = url.searchParams.get("appId");

        if (legacyView === "animal-profile" && legacyAnimalId) {
          return Response.redirect(`${url.origin}/dashboard/animals/${legacyAnimalId}`, 302);
        }
        if (legacyView === "application-detail" && legacyAppId) {
          return Response.redirect(`${url.origin}/dashboard/applications/${legacyAppId}`, 302);
        }

        const canonical = LEGACY_VIEW_MAP[legacyView];
        if (canonical) {
          return Response.redirect(`${url.origin}${canonical}`, 302);
        }
      }

      // Serve dashboard shell — lives at dashboard/index.html in R2
      return asset(env, request, "/dashboard/index.html");
    }

    // Public CMS pages
    if (request.method === "GET" && PUBLIC_ROUTES.includes(url.pathname)) {
      return servePublicPage(url.pathname, env);
    }

    return new Response('Not found', { status: 404 });
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(syncToIAM(env));

    ctx.waitUntil(
      env.DB.prepare(`
        INSERT OR REPLACE INTO agentsam_usage_rollups_daily
          (tenant_id, workspace_id, day,
           ai_calls, tokens_in, tokens_out, cost_usd,
           tool_calls, tool_successes, tool_failures, error_count,
           provider_breakdown_json, top_models_json,
           rollup_source, rolled_up_at)
        SELECT
          tenant_id,
          workspace_id,
          date(created_at) AS day,
          COUNT(*) AS ai_calls,
          SUM(tokens_in) AS tokens_in,
          SUM(tokens_out) AS tokens_out,
          SUM(cost_usd) AS cost_usd,
          0, 0, 0,
          SUM(CASE WHEN status != 'ok' THEN 1 ELSE 0 END) AS error_count,
          '{}' AS provider_breakdown_json,
          '[]' AS top_models_json,
          'daily_cron',
          unixepoch()
        FROM agentsam_usage_events
        WHERE date(created_at) = date('now', '-1 day')
          AND tenant_id = 'tenant_companionscpas'
        GROUP BY tenant_id, workspace_id, date(created_at)
      `).run().catch(e => console.warn("[rollup] failed:", e.message))
    );
  }
};
