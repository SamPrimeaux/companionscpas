// shared.js — helpers extracted from cms_api.js (tkt_cpas_mod_cms_api_20260818)
// TENANT_ID comes from cms_editor_config.js (already started; do not duplicate).

import { renderPage, getBrand } from "../render_page.js";
import {
  isFragmentPageRoute,
  ensureFragmentPageSections,
  syncFragmentPageToR2,
  previewFragmentPageFromCms,
  publishFragmentPageFromCms,
  upsertFragmentPageDefaults,
  getFragmentSectionKeys,
  normalizeFragmentRoute,
} from "../page_cms_registry.js";
import { bootstrapNewCmsPage, archiveAndClearLiveFragment, syncSectionToR2, loadRouteSections } from "../cms_pipeline.js";
import { getAuthUser } from "../session_api.js";
import {
  rebuildCmsAssetUsages,
  loadUsagesByAssetIds,
} from "../cms_asset_usages.js";
import {
  persistRawHtmlConfigOnSave,
  hydrateRawHtmlSectionForEditor,
} from "../cms_raw_html_storage.js";
import { clampHeaderLogoPx } from "../brand_tokens.js";
import { TENANT_ID, loadEditorCatalog } from "../cms_editor_config.js";
import { normalizeFooterChrome, componentConfigFromTrustBadge } from "../footer_chrome.js";

export {
  TENANT_ID,
  loadEditorCatalog,
  renderPage,
  getBrand,
  isFragmentPageRoute,
  ensureFragmentPageSections,
  syncFragmentPageToR2,
  previewFragmentPageFromCms,
  publishFragmentPageFromCms,
  upsertFragmentPageDefaults,
  getFragmentSectionKeys,
  normalizeFragmentRoute,
  bootstrapNewCmsPage,
  archiveAndClearLiveFragment,
  syncSectionToR2,
  loadRouteSections,
  rebuildCmsAssetUsages,
  loadUsagesByAssetIds,
  persistRawHtmlConfigOnSave,
  hydrateRawHtmlSectionForEditor,
  clampHeaderLogoPx,
};

export const R2_MEDIA_FOLDERS = new Set([
  "media/animals",
  "media/campaign",
  "media/intakes",
  "media/medical",
  "media/team",
  "media/videos",
]);

export function resolveUploadR2Key(r2Folder, safeName, opts = {}) {
  const now = new Date();
  const yr = now.getUTCFullYear();
  const mo = String(now.getUTCMonth() + 1).padStart(2, "0");
  const stamp = Date.now();
  let normalized = String(r2Folder || "").replace(/\/+$/, "");
  const animalId = String(opts.animalId || "").trim();
  const forceAnimal =
    opts.forceAnimalFolder === true
    || normalized === "media/animals"
    || String(opts.category || "").toLowerCase() === "animal"
    || String(opts.usageContext || "").toLowerCase() === "animal_profile";

  if (forceAnimal) {
    if (animalId) return `media/animals/${animalId}/${stamp}-${safeName}`;
    return `media/animals/${stamp}-${safeName}`;
  }
  if (R2_MEDIA_FOLDERS.has(normalized)) {
    return `${normalized}/${stamp}-${safeName}`;
  }
  return `static/cms/uploads/${yr}/${mo}/${stamp}-${safeName}`;
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

export function id(prefix = "cms") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function body(request) {
  try { return await request.json(); } catch { return {}; }
}

export function safeJson(value, fallback) {
  try { return JSON.parse(value || ""); } catch { return fallback; }
}


export async function syncFragmentCmsToR2(env, route) {
  return syncFragmentPageToR2(env, normalizeFragmentRoute(route));
}

export async function bustCache(env, ...keys) {
  if (!env.CMS_CACHE) return;
  await Promise.all(keys.map(k => env.CMS_CACHE.delete(k).catch(() => {})));
}

export async function requireCmsUser(request, env, sessionUser = null) {
  if (sessionUser) return sessionUser;

  const authHeader = request.headers.get("Authorization") || "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const bridgeKey = env.AGENTSAM_BRIDGE_KEY || env.INTERNAL_PUBLISH_KEY || "";
  if (bridgeKey && bearer && bearer === bridgeKey) {
    const userId = request.headers.get("X-User-Id") || request.headers.get("x-user-id") || "iam_bridge";
    return {
      id: userId,
      email: request.headers.get("X-User-Email") || null,
      role: "operator",
      bridge: true,
    };
  }

  try {
    return await getAuthUser(request, env);
  } catch (err) {
    console.warn("[cms/auth] getAuthUser failed:", err?.message || err);
    return null;
  }
}

export function normalizeRouteInput(route) {
  const raw = String(route || "").trim();
  if (!raw) return "";
  let normalized = raw.replace(/\/+/g, "/");
  if (!normalized.startsWith("/")) normalized = `/${normalized}`;
  normalized = normalized.replace(/\/+/g, "/");
  if (normalized.length > 1) normalized = normalized.replace(/\/+$/, "");
  return normalized || "/";
}

export async function tableColumns(env, tableName) {
  const exists = await env.DB.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name=? LIMIT 1"
  ).bind(tableName).first().catch(() => null);
  if (!exists) return null;
  const { results } = await env.DB.prepare(`PRAGMA table_info(${tableName})`).all().catch(() => ({ results: [] }));
  const cols = new Set((results || []).map((row) => row?.name).filter(Boolean));
  return cols.size ? cols : null;
}

export async function createPublishJob(env, routePath, triggeredBy) {
  const cols = await tableColumns(env, "cms_publish_jobs").catch(() => null);
  if (!cols) return null;

  const jobId = id("pub");
  const now = new Date().toISOString();
  const values = {
    id: jobId,
    tenant_id: TENANT_ID,
    page_id: null,
    route_path: routePath,
    page_route: routePath,
    job_type: "page",
    status: "running",
    triggered_by: triggeredBy,
    created_by: triggeredBy,
    created_at: now,
    updated_at: now,
    started_at: now,
  };

  const insertCols = [];
  const placeholders = [];
  const binds = [];
  for (const [key, value] of Object.entries(values)) {
    if (!cols.has(key)) continue;
    insertCols.push(key);
    placeholders.push("?");
    binds.push(value);
  }
  if (!insertCols.length) return null;

  try {
    await env.DB.prepare(
      `INSERT INTO cms_publish_jobs (${insertCols.join(", ")}) VALUES (${placeholders.join(", ")})`
    ).bind(...binds).run();
    return jobId;
  } catch (err) {
    console.warn("[cms/publish] unable to create cms_publish_jobs row:", err?.message || err);
    return null;
  }
}

export const PUBLIC_PAGE_ROUTES = ["/", "/about", "/services", "/adopt", "/community", "/donate", "/contact", "/fosters", "/events"];

export async function listAllCmsPageRoutes(env) {
  const pages = await env.DB.prepare(
    "SELECT route_path FROM cms_pages WHERE tenant_id = ? ORDER BY sort_order, route_path"
  ).bind(TENANT_ID).all().catch(() => ({ results: [] }));
  const fromDb = (pages.results || []).map((row) => normalizeRouteInput(row.route_path)).filter(Boolean);
  return fromDb.length ? fromDb : PUBLIC_PAGE_ROUTES;
}

export function parseJsonObject(raw, fallback = {}) {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw || "{}");
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

/** Keep footer_json layout + cms_components catalog in sync. No JS tenant URLs. */
export async function persistFooterChrome(env, footerRaw) {
  const footer = parseJsonObject(footerRaw, {});
  const chrome = normalizeFooterChrome(footer);
  const next = {
    ...footer,
    column_labels: chrome.column_labels,
    col_label_size_px: chrome.col_label_size_px,
  };
  if (!chrome.has_trust_badge_layout) {
    return JSON.stringify(next);
  }
  next.trust_badges = chrome.trust_badges;
  for (const badge of chrome.trust_badges) {
    const id = String(badge.component_id || badge.id || "").trim();
    if (!id) continue;
    const config = JSON.stringify(componentConfigFromTrustBadge(badge));
    const existing = await env.DB.prepare(
      "SELECT id FROM cms_components WHERE id = ? LIMIT 1"
    ).bind(id).first().catch(() => null);
    if (existing) {
      await env.DB.prepare(
        `UPDATE cms_components
         SET label = ?, type = 'trust_badge', config_json = ?, sort_order = ?, updated_at = datetime('now')
         WHERE id = ?`
      ).bind(badge.label || id, config, Number(badge.sort_order) || 0, id).run();
    } else {
      await env.DB.prepare(
        `INSERT INTO cms_components (id, label, type, config_json, sort_order, active, updated_at)
         VALUES (?, ?, 'trust_badge', ?, ?, 1, datetime('now'))`
      ).bind(id, badge.label || id, config, Number(badge.sort_order) || 0).run();
    }
  }
  return JSON.stringify(next);
}

export function pageArtifactKey(route) {
  const normalized = normalizeRouteInput(route);
  return normalized === "/" ? "static/pages/index.html" : `static/pages${normalized}/index.html`;
}

export async function publishPageRoute(env, route, triggeredBy) {
  const normalizedRoute = normalizeRouteInput(route);
  if (!normalizedRoute) {
    return { success: false, route_path: route, error: "Invalid route" };
  }

  await bustCache(env, `page:${normalizedRoute}`);

  const jobId = await createPublishJob(env, normalizedRoute, triggeredBy);
  const artifactKey = pageArtifactKey(normalizedRoute);

  await env.DB.prepare(`
    UPDATE cms_pages
    SET status = 'published',
        published_at = datetime('now'),
        updated_at = datetime('now'),
        published_by = ?
    WHERE tenant_id = ? AND route_path = ?
  `).bind(triggeredBy, TENANT_ID, normalizedRoute).run();

  try {
    // One pipeline for every cms_pages route (home, donate, contact, …)
    const published = await publishFragmentPageFromCms(env, normalizedRoute, jobId || `pub_${Date.now()}`);
    await updatePublishJob(env, jobId, "done", {
      artifactPath: published.artifact_key,
      resultJson: { success: true, route_path: normalizedRoute, artifact_key: published.artifact_key, source: "cms_pipeline" },
    });
    return {
      success: true,
      route_path: normalizedRoute,
      job_id: jobId,
      artifact_key: published.artifact_key,
      source: "cms_pipeline",
    };
  } catch (err) {
    const message = err?.message || String(err);
    await updatePublishJob(env, jobId, "failed", { error: message });
    return {
      success: false,
      route_path: normalizedRoute,
      job_id: jobId,
      error: message,
    };
  }
}

export async function updatePublishJob(env, jobId, status, extras = {}) {
  if (!jobId) return;
  const cols = await tableColumns(env, "cms_publish_jobs").catch(() => null);
  if (!cols) return;

  const now = new Date().toISOString();
  const values = {
    status,
    updated_at: now,
    completed_at: status === "done" ? now : null,
    finished_at: status === "done" ? now : null,
    failed_at: status === "failed" ? now : null,
    error: extras.error || null,
    error_message: extras.error || null,
    artifact_path: extras.artifactPath || null,
    result_json: extras.resultJson ? JSON.stringify(extras.resultJson) : null,
  };

  const updates = [];
  const binds = [];
  for (const [key, value] of Object.entries(values)) {
    if (!cols.has(key)) continue;
    updates.push(`${key} = ?`);
    binds.push(value);
  }
  if (!updates.length) return;

  await env.DB.prepare(
    `UPDATE cms_publish_jobs SET ${updates.join(", ")} WHERE id = ?`
  ).bind(...binds, jobId).run().catch((err) => {
    console.warn("[cms/publish] unable to update cms_publish_jobs row:", err?.message || err);
  });
}
