import * as home from "./home_cms_sync.js";
import * as about from "./about_cms_sync.js";
import { services, adopt, donate, community } from "./generic_page_cms_sync.js";

const FRAGMENT_PAGES = {
  "/": home,
  "/about": about,
  "/services": services,
  "/adopt": adopt,
  "/donate": donate,
  "/community": community,
};

export function normalizeFragmentRoute(route) {
  const raw = String(route || "").trim();
  if (!raw || raw === "/") return "/";
  let n = raw.startsWith("/") ? raw : `/${raw}`;
  if (n.length > 1) n = n.replace(/\/+$/, "");
  return n;
}

export function getFragmentPageModule(route) {
  return FRAGMENT_PAGES[normalizeFragmentRoute(route)] || null;
}

export function isFragmentPageRoute(route) {
  return !!getFragmentPageModule(route);
}

export function getFragmentSectionKeys(route) {
  const mod = getFragmentPageModule(route);
  return mod?.SECTION_KEYS || [];
}

export async function ensureFragmentPageSections(env, route) {
  const mod = getFragmentPageModule(route);
  if (!mod) return null;
  return mod.ensurePageSections(env);
}

export async function upsertFragmentPageDefaults(env, route, force = false) {
  const mod = getFragmentPageModule(route);
  if (!mod) return null;
  return mod.upsertPageDefaults(env, force);
}

export async function syncFragmentPageToR2(env, route) {
  const mod = getFragmentPageModule(route);
  if (!mod) return null;
  const result = await mod.syncAllSectionsToR2(env);
  await mod.bustPageCache(env);
  return result;
}

export async function bustFragmentPageCache(env, route) {
  const mod = getFragmentPageModule(route);
  if (!mod) return;
  await mod.bustPageCache(env);
}

export async function previewFragmentPageFromCms(env, route) {
  const mod = getFragmentPageModule(route);
  if (!mod) return null;
  return mod.previewPageFromCms(env);
}

export async function publishFragmentPageFromCms(env, route, jobId = null) {
  const mod = getFragmentPageModule(route);
  if (!mod) return null;
  return mod.syncAndPublishPage(env, jobId);
}

export { home, about, services, adopt, donate, community };
