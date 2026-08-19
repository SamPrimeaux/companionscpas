// cms_api.js — Companions of CPAS CMS API
// Split into src/api/cms/* on tkt_cpas_mod_cms_api_20260818.
// Thin dispatcher only — same cmsRoutes(request, env, url, sessionUser) signature.
// Same public paths, JSON keys, and status codes as before the split.

import { json } from "./cms/shared.js";
import { routesBrand } from "./cms/routes_brand.js";
import { routesPages } from "./cms/routes_pages.js";
import { routesSections } from "./cms/routes_sections.js";
import { routesBlocks } from "./cms/routes_blocks.js";
import { routesAssets } from "./cms/routes_assets.js";
import { routesPublish } from "./cms/routes_publish.js";

const ROUTE_GROUPS = [
  routesBrand,
  routesPages,
  routesSections,
  routesBlocks,
  routesAssets,
  routesPublish,
];

export async function cmsRoutes(request, env, url, sessionUser = null) {
  const path = url.pathname;
  const method = request.method;

  // tokens.css and foster_cta ran before the DB-missing guard in the original ladder.
  if (path === "/api/cms/brand/tokens.css" && method === "GET") {
    return routesBrand(request, env, url, path, method, sessionUser);
  }
  if (path === "/api/cms/modal/foster_cta" && method === "GET") {
    return routesPages(request, env, url, path, method, sessionUser);
  }
  if (!env.DB) return json({ error: "DB binding missing" }, 500);

  for (const group of ROUTE_GROUPS) {
    const response = await group(request, env, url, path, method, sessionUser);
    if (response) return response;
  }

  return null;
}
