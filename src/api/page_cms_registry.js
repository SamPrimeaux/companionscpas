/**
 * CMS page registry — thin compatibility layer over cms_pipeline.
 * Any cms_pages row is a live route; no static FRAGMENT_PAGES allowlist.
 */
import {
  normalizeCmsRoute,
  isCmsPageRoute,
  syncRouteSectionsToR2,
  bustPageCache,
  publishRoute,
  previewRoute,
  loadRouteSections,
} from "./cms_pipeline.js";

export function normalizeFragmentRoute(route) {
  return normalizeCmsRoute(route);
}

/** @deprecated Prefer isCmsPageRoute(env, route) — kept for sync callers that only have a string. */
export function isFragmentPageRoute(route) {
  // Without env we cannot query D1; treat known public CMS routes as true for sync paths.
  // Runtime public serving uses isCmsPageRoute(env, route).
  const r = normalizeCmsRoute(route);
  return r === "/" || r === "/about" || r === "/services" || r === "/adopt"
    || r === "/donate" || r === "/community" || r === "/contact"
    || (r.startsWith("/") && r.length > 1);
}

export async function getFragmentPageModule(route) {
  const r = normalizeCmsRoute(route);
  return {
    PAGE_ROUTE: r,
    SECTION_KEYS: [],
    ensurePageSections: async () => null,
    upsertPageDefaults: async () => ({ route: r }),
    syncAllSectionsToR2: (env, opts) => syncRouteSectionsToR2(env, r, opts),
    bustPageCache: (env) => bustPageCache(env, r),
    syncAndPublishPage: (env, jobId) => publishRoute(env, r, jobId),
    previewPageFromCms: (env) => previewRoute(env, r),
  };
}

export function getFragmentSectionKeys(route) {
  return [];
}

export async function ensureFragmentPageSections(env, route) {
  return null;
}

export async function upsertFragmentPageDefaults(env, route, force = false) {
  return { route: normalizeCmsRoute(route), force };
}

export async function syncFragmentPageToR2(env, route) {
  return syncRouteSectionsToR2(env, route);
}

export async function bustFragmentPageCache(env, route) {
  return bustPageCache(env, route);
}

export async function previewFragmentPageFromCms(env, route) {
  return previewRoute(env, route);
}

export async function publishFragmentPageFromCms(env, route, jobId = null) {
  return publishRoute(env, route, jobId);
}

export { isCmsPageRoute, loadRouteSections, publishRoute, previewRoute, syncRouteSectionsToR2 };
