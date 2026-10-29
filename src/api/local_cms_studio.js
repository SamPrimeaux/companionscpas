/**
 * Isolated local ecommerce Theme Studio authoring contract.
 *
 * Only reachable on 127.0.0.1:4473 / localhost:4473, behind CMS auth.
 * Drafts never update cms_page_sections, public artifacts, or production R2.
 * Production editor/publishing routes remain unchanged.
 */
import { requireCmsUser, TENANT_ID } from "./cms/shared.js";
import { assemblePage, normalizeCmsRoute } from "./cms_pipeline.js";
import { injectCmsInspector } from "./cms/preview_inspector.js";

const base = "/api/cms/local-studio/";
const textFields = new Set([
  "eyebrow", "heading", "subheading", "body", "image_url",
  "cta_label", "cta_href", "cta_secondary_label", "cta_secondary_href",
]);
const htmlFields = new Set(["html", "source_url"]);
const response = (object, status = 200) => new Response(JSON.stringify(object), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
});
async function ensureTable(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS cms_local_studio_drafts (
    page_route TEXT NOT NULL,
    section_key TEXT NOT NULL,
    content_json TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY(page_route, section_key)
  )`).run();
}
async function loadDrafts(env, route) {
  const rows = await env.DB.prepare(
    "SELECT section_key, content_json, version, updated_at FROM cms_local_studio_drafts WHERE page_route = ?"
  ).bind(route).all();
  return (rows.results || []).map(row => ({
    section_key: row.section_key,
    content: JSON.parse(row.content_json || "{}"),
    version: Number(row.version || 0),
    updated_at: row.updated_at,
  }));
}
function validRoute(input) {
  const value = String(input ?? "").trim();
  if (!value.startsWith("/") || value.includes("?") || value.includes("#") || value.includes("..") || value.length > 180) return null;
  return normalizeCmsRoute(value);
}
async function pageExists(env, route) {
  return env.DB.prepare(
    "SELECT id FROM cms_pages WHERE tenant_id = ? AND route_path = ? LIMIT 1"
  ).bind(TENANT_ID, route).first();
}
async function pageOverrides(env, route) {
  const rows = await loadDrafts(env, route);
  const overrides = {};
  for (const row of rows) overrides[row.section_key] = row.content;
  return overrides;
}
export async function localCmsStudioRoutes(request, env, url) {
  const isWebsiteOverview = url.pathname === "/api/admin/store/online";
  if (!url.pathname.startsWith(base) && !isWebsiteOverview) return null;
  if (!["localhost", "127.0.0.1"].includes(url.hostname) || url.port !== "4473") {
    return isWebsiteOverview ? null : response({ success: false, error: "Local studio only" }, 404);
  }
  const user = await requireCmsUser(request, env);
  if (!user) return response({ success: false, error: "Not authenticated" }, 401);
  if (!env.DB) return response({ success: false, error: "Local CMS database unavailable" }, 503);
  if (isWebsiteOverview) {
    if (request.method !== "GET") return response({ error: "Method not allowed" }, 405);
    try {
      await ensureTable(env.DB);
      const [pageResult, draftResult, sectionTotal, latest] = await Promise.all([
        env.DB.prepare("SELECT slug, route_path, title, status, updated_at, is_homepage, sort_order FROM cms_pages WHERE tenant_id = ? AND archived_at IS NULL ORDER BY is_homepage DESC, sort_order ASC, title ASC").bind(TENANT_ID).all(),
        env.DB.prepare("SELECT page_route, COUNT(*) AS section_count, MAX(updated_at) AS updated_at FROM cms_local_studio_drafts GROUP BY page_route ORDER BY MAX(updated_at) DESC").all(),
        env.DB.prepare("SELECT COUNT(*) AS total FROM cms_page_sections WHERE tenant_id = ? AND deleted_at IS NULL").bind(TENANT_ID).first(),
        env.DB.prepare("SELECT MAX(updated_at) AS last_saved FROM (SELECT updated_at FROM cms_pages WHERE tenant_id = ? UNION ALL SELECT updated_at FROM cms_page_sections WHERE tenant_id = ? AND deleted_at IS NULL)").bind(TENANT_ID, TENANT_ID).first(),
      ]);
      const pages = pageResult.results || [];
      const draftsByRoute = new Map((draftResult.results || []).map(row => [row.page_route, row]));
      const draftPages = pages.filter(page => draftsByRoute.has(page.route_path) || page.status !== "published");
      const homepage = pages.find(page => page.is_homepage === 1 || page.slug === "home" || page.route_path === "/");
      const editorHref = page => "/dashboard/cms/website/editor?surface=pages&slug=" + encodeURIComponent(page.slug || "home");
      const draftThemes = draftPages.map(page => {
        const draft = draftsByRoute.get(page.route_path);
        const count = Number(draft?.section_count || 0);
        return {
          id: page.slug || page.route_path,
          name: page.title || page.slug || page.route_path,
          meta: (page.route_path === "/" ? "Homepage" : page.route_path) + " · " + (count ? count + " section edit" + (count === 1 ? "" : "s") : "Unpublished page"),
          section_count: count,
          edit_href: editorHref(page),
          updated_at: draft?.updated_at || page.updated_at || null,
        };
      });
      const publishedPages = pages.filter(page => page.status === "published").length;
      return response({
        store: {
          visibility: homepage?.status === "published" ? "public" : "unknown",
          url: "https://companionsofcaddo.org",
        },
        performance: {
          published_pages: publishedPages,
          draft_pages: draftPages.length,
          sections: Number(sectionTotal?.total || 0),
        },
        active_theme: {
          name: "Companions of CPAS website",
          verified: homepage?.status === "published",
          last_saved: latest?.last_saved || homepage?.updated_at || null,
          preview_href: "/",
          edit_href: homepage ? editorHref(homepage) : "/dashboard/cms/website/editor?surface=pages&slug=home",
        },
        draft_themes: draftThemes,
      });
    } catch (error) {
      console.error("[local-website-overview]", error);
      return response({ error: error?.message || "Website overview unavailable" }, 500);
    }
  }
  const action = url.pathname.slice(base.length);
  const method = request.method;
  if (!["draft", "preview"].includes(action)) return response({ success: false, error: "Unknown local studio route" }, 404);
  try {
    await ensureTable(env.DB);
    const payload = method === "GET" ? {} : await request.json().catch(() => null);
    const route = validRoute(method === "GET" ? url.searchParams.get("route") : payload?.route);
    if (!route) return response({ success: false, error: "Invalid CMS route" }, 400);
    if (!await pageExists(env, route)) return response({ success: false, error: "Unknown CMS page" }, 404);

    if (action === "draft" && method === "GET") {
      return response({ success: true, route, drafts: await loadDrafts(env, route) });
    }
    if (action === "draft" && method === "DELETE") {
      const sectionKey = String(payload?.section_key || "");
      const expected = Number(payload?.expected_version);
      if (!sectionKey || !Number.isInteger(expected) || expected < 1) return response({ success: false, error: "Invalid draft revision" }, 400);
      const result = await env.DB.prepare(
        "DELETE FROM cms_local_studio_drafts WHERE page_route=? AND section_key=? AND version=?"
      ).bind(route, sectionKey, expected).run();
      if (result.meta?.changes !== 1) return response({ success: false, error: "Draft changed before discard" }, 409);
      return response({ success: true, removed: true });
    }
    if (action === "draft" && method === "POST") {
      const sectionKey = String(payload?.section_key || "");
      if (!sectionKey || sectionKey.length > 160) return response({ success: false, error: "Invalid section" }, 400);
      const section = await env.DB.prepare(
        "SELECT section_type FROM cms_page_sections WHERE tenant_id=? AND page_route=? AND section_key=? AND (deleted_at IS NULL OR deleted_at='') LIMIT 1"
      ).bind(TENANT_ID, route, sectionKey).first();
      if (!section) return response({ success: false, error: "Unknown section" }, 404);
      const values = payload?.content;
      if (!values || typeof values !== "object" || Array.isArray(values)) return response({ success: false, error: "Invalid draft content" }, 400);
      const allowed = section.section_type === "raw_html" ? htmlFields : textFields;
      const content = {};
      for (const [key, val] of Object.entries(values)) {
        if (allowed.has(key)) {
          if (typeof val !== "string" || val.length > (key === "html" ? 250000 : 20000)) return response({ success: false, error: "Invalid field value" }, 400);
          content[key] = val;
        }
      }
      if (!Object.keys(content).length) return response({ success: false, error: "No editable fields" }, 400);
      const expected = Number(payload?.expected_version);
      if (!Number.isInteger(expected) || expected < 0) return response({ success: false, error: "Missing draft version" }, 400);
      const current = await env.DB.prepare(
        "SELECT version FROM cms_local_studio_drafts WHERE page_route=? AND section_key=? LIMIT 1"
      ).bind(route, sectionKey).first();
      if (Number(current?.version || 0) !== expected) return response({
        success: false, error: "Draft updated in another editor; reload before saving"
      }, 409);
      const row = await env.DB.prepare(`
        INSERT INTO cms_local_studio_drafts(page_route,section_key,content_json,version)
        VALUES(?,?,?,1)
        ON CONFLICT(page_route,section_key) DO UPDATE SET
          content_json=excluded.content_json,
          version=cms_local_studio_drafts.version+1,
          updated_at=datetime('now')
        WHERE cms_local_studio_drafts.version = ?
        RETURNING version, updated_at
      `).bind(route, sectionKey, JSON.stringify(content), expected).first();
      if (!row || expected === 0 && Number(row.version) !== 1) return response({ success: false, error: "Draft updated in another editor; reload before saving" }, 409);
      return response({ success: true, version: Number(row.version), updated_at: row.updated_at });
    }
    if (action === "preview" && method === "POST") {
      const html = await assemblePage(env, route, {
        preview: true, includeHidden: true, sectionOverrides: await pageOverrides(env, route),
      });
      if (!html) return response({ success: false, error: "Cannot render selected page" }, 404);
      return new Response(injectCmsInspector(html), {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
      });
    }
    return response({ success: false, error: "Method not allowed" }, 405);
  } catch (error) {
    console.error("[local-cms-studio]", error);
    return response({ success: false, error: error?.message || "Local studio error" }, 500);
  }
}
