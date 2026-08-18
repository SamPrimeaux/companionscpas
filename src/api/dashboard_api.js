// dashboard_api.js — Companions of CPAS dashboard API
// Canonical animal table: animal_profiles (animals table deleted)
// Tenant: tenant_id = 'tenant_companionscpas'
// Org: org_companionscpas
//
// Split into src/api/dashboard/* on tkt_cpas_mod_dashboard_api_20260818.
// This file is now a thin dispatcher only — no route logic lives here.
// Same public paths, JSON keys, and status codes as before the split.

import { routesOverview } from "./dashboard/routes_overview.js";
import { routesAnimals } from "./dashboard/routes_animals.js";
import { routesApplications } from "./dashboard/routes_applications.js";
import { routesFundraising } from "./dashboard/routes_fundraising.js";
import { routesMisc } from "./dashboard/routes_misc.js";
import { routesFosters } from "./dashboard/routes_fosters.js";
import { routesCare } from "./dashboard/routes_care.js";
import { routesReports } from "./dashboard/routes_reports.js";
import { routesSettings } from "./dashboard/routes_settings.js";

const ROUTE_GROUPS = [
  routesOverview,
  routesAnimals,
  routesApplications,
  routesFundraising,
  routesMisc,
  routesFosters,
  routesCare,
  routesReports,
  routesSettings,
];

export async function dashboardApiRoutes(request, env, url) {
  const path = url.pathname;
  const method = request.method;

  for (const group of ROUTE_GROUPS) {
    const response = await group(request, env, url, path, method);
    if (response) return response;
  }

  return null;
}
