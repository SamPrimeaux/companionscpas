// routes_publish.js — extracted from cms_api.js (tkt_cpas_mod_cms_api_20260818)
// Auto-split: verbatim route bodies. No behavior change.

import {
  json,
  id,
  body,
  requireCmsUser,
  normalizeRouteInput,
  publishPageRoute,
  listAllCmsPageRoutes,
} from "./shared.js";

export async function routesPublish(request, env, url, path, method, sessionUser = null) {
  if (path === "/api/cms/publish" && method === "POST") {
    const cmsUser = await requireCmsUser(request, env, sessionUser);
    if (!cmsUser) return json({ success: false, error: "Not authenticated" }, 401);

    const data = await body(request);
    const routeInput = data.route_path ?? data.page_route ?? data.route ?? "";
    const route = normalizeRouteInput(routeInput);
    if (!route) {
      return json({ error: "route_path (or page_route/route) is required" }, 400);
    }

    const triggeredBy = cmsUser?.email || cmsUser?.id || "dashboard";
    const result = await publishPageRoute(env, route, triggeredBy);

    if (!result.success) {
      return json({
        success: false,
        error: "Failed to render published page artifacts",
        route_path: result.route_path,
        job_id: result.job_id,
        details: result.error,
      }, 500);
    }

    return json({
      success: true,
      job_id: result.job_id,
      route_path: result.route_path,
      artifact_key: result.artifact_key,
      preview_url: result.route_path === "/" ? "/" : result.route_path,
      message: "Page marked published and rendered to artifacts.",
    });
  }

  if (path === "/api/cms/publish-all" && method === "POST") {
    const cmsUser = await requireCmsUser(request, env, sessionUser);
    if (!cmsUser) return json({ success: false, error: "Not authenticated" }, 401);

    const data = await body(request);
    const triggeredBy = cmsUser?.email || cmsUser?.id || "dashboard";

    let routes = PUBLIC_PAGE_ROUTES;
    if (Array.isArray(data.routes) && data.routes.length) {
      routes = data.routes.map((r) => normalizeRouteInput(r)).filter(Boolean);
    } else if (!env.DB) {
      return json({ success: false, error: "DB binding missing" }, 500);
    } else {
      routes = await listAllCmsPageRoutes(env);
    }

    const results = [];
    for (const route of routes) {
      results.push(await publishPageRoute(env, route, triggeredBy));
    }

    const failed = results.filter((r) => !r.success);
    const succeeded = results.filter((r) => r.success);

    return json({
      success: failed.length === 0,
      published: succeeded.length,
      failed: failed.length,
      routes: results,
      message: failed.length
        ? `Published ${succeeded.length}/${results.length} pages. ${failed.length} failed.`
        : `Published all ${results.length} pages.`,
    }, failed.length ? 207 : 200);
  }
  return null;
}
