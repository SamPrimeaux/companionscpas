/**
 * One CMS pipeline for every cms_pages route.
 * D1 sections → renderSectionByType → R2 fragments → assemblePage → KV.
 */
import {
  assembleFullPage,
  getBrand,
  getGlobalPartial,
  getPageAssetBase,
  sanitizePathSegment,
} from "./render_page.js";
import {
  renderSectionByType,
  pageNeedsContactFormScript,
  CONTACT_FORM_SCRIPT,
  TENANT_ID,
} from "./cms_section_catalog.js";

const PAGE_CACHE_TTL = 3600;

export function normalizeCmsRoute(route) {
  const raw = String(route || "").trim();
  if (!raw || raw === "/") return "/";
  let n = raw.startsWith("/") ? raw : `/${raw}`;
  if (n.length > 1) n = n.replace(/\/+$/, "");
  return n;
}

export function getFragmentBase(route) {
  const r = normalizeCmsRoute(route);
  if (r === "/") return "static/pages/home";
  return getPageAssetBase(r);
}

export function getPageArtifactKey(route) {
  const r = normalizeCmsRoute(route);
  if (r === "/") return "static/pages/index.html";
  return `${getPageAssetBase(r)}/index.html`;
}

export function fragmentR2Key(route, sectionKey) {
  const base = getFragmentBase(route);
  const seg = sanitizePathSegment(sectionKey, "section");
  if (normalizeCmsRoute(route) === "/") {
    const legacy = {
      how_it_helps: "how-it-helps",
      transport_win: "transport-win",
      impact_stats: "impact-stats",
    };
    const file = legacy[sectionKey] || seg;
    return `${base}/${file}.html`;
  }
  return `${base}/${seg}.html`;
}

async function r2Text(env, key) {
  const obj = await env?.WEBSITE_ASSETS?.get(key).catch(() => null);
  if (!obj) return "";
  return obj.text().catch(() => "");
}

function groupBlocks(blocks) {
  const map = new Map();
  for (const block of blocks || []) {
    const key = String(block?.section_key || "").trim();
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(block);
  }
  return map;
}

export async function loadCmsPageRow(env, route) {
  const r = normalizeCmsRoute(route);
  return env.DB.prepare(
    "SELECT * FROM cms_pages WHERE tenant_id = ? AND route_path = ? LIMIT 1"
  ).bind(TENANT_ID, r).first().catch(() => null);
}

export async function isCmsPageRoute(env, route) {
  return !!(await loadCmsPageRow(env, route));
}

export async function loadRouteSections(env, route, { includeHidden = false } = {}) {
  const r = normalizeCmsRoute(route);
  // Soft-deleted rows are never publishable. Hide vs delete stay distinct.
  const deletedClause = " AND (deleted_at IS NULL OR deleted_at = '')";
  const sql = includeHidden
    ? `SELECT * FROM cms_page_sections WHERE tenant_id = ? AND page_route = ?${deletedClause} ORDER BY sort_order, section_key`
    : `SELECT * FROM cms_page_sections WHERE tenant_id = ? AND page_route = ? AND is_visible = 1${deletedClause} ORDER BY sort_order, section_key`;
  const [sectionsRes, blocksRes] = await Promise.all([
    env.DB.prepare(sql).bind(TENANT_ID, r).all(),
    env.DB.prepare(
      `SELECT * FROM cms_page_content_blocks WHERE tenant_id = ? AND page_route = ? ORDER BY sort_order, section_key, block_key`
    ).bind(TENANT_ID, r).all(),
  ]);
  return {
    sections: sectionsRes?.results || [],
    blocks: blocksRes?.results || [],
    blocksBySection: groupBlocks(blocksRes?.results || []),
  };
}

/** Archive key for soft-deleted section HTML. Lifecycle rule expires cms/section-trash/ after 3 days. */
export function sectionTrashR2Key(route, sectionKey, deletedAtIso = null) {
  const day = (deletedAtIso || new Date().toISOString()).slice(0, 10);
  const r = normalizeCmsRoute(route);
  const routeSeg = r === "/" ? "home" : sanitizePathSegment(r.replace(/^\//, "").replace(/\//g, "__"), "page");
  const seg = sanitizePathSegment(sectionKey, "section");
  return `cms/section-trash/${day}/${routeSeg}/${seg}.html`;
}

/**
 * Soft-delete: archive live fragment → remove live key.
 * Restore never reads the archive — only D1 row + re-render.
 */
export async function archiveAndClearLiveFragment(env, route, sectionKey) {
  const liveKey = fragmentR2Key(route, sectionKey);
  const trashKey = sectionTrashR2Key(route, sectionKey);
  let archived = false;
  try {
    const obj = await env.WEBSITE_ASSETS?.get(liveKey);
    if (obj) {
      const body = await obj.arrayBuffer();
      await env.WEBSITE_ASSETS.put(trashKey, body, {
        httpMetadata: obj.httpMetadata || { contentType: "text/html; charset=utf-8" },
        customMetadata: {
          ...(obj.customMetadata || {}),
          soft_deleted_from: liveKey,
          page_route: normalizeCmsRoute(route),
          section_key: String(sectionKey),
        },
      });
      archived = true;
    }
  } catch (err) {
    console.warn("[cms] archive fragment failed:", err?.message || err);
  }
  try {
    await env.WEBSITE_ASSETS?.delete(liveKey);
  } catch (_) {}
  return { live_key: liveKey, trash_key: trashKey, archived };
}

/** Purge D1 soft-deleted sections older than 3 days (+ their content blocks). R2 trash is lifecycle-owned. */
export async function purgeExpiredSoftDeletedSections(env, { olderThanDays = 3 } = {}) {
  const days = Math.max(1, Number(olderThanDays) || 3);
  const expired = await env.DB.prepare(
    `SELECT page_route, section_key FROM cms_page_sections
     WHERE tenant_id = ?
       AND deleted_at IS NOT NULL AND deleted_at != ''
       AND deleted_at < datetime('now', ?)
     LIMIT 200`
  ).bind(TENANT_ID, `-${days} days`).all().catch(() => ({ results: [] }));

  const rows = expired?.results || [];
  let purged = 0;
  for (const row of rows) {
    const pageRoute = row.page_route;
    const sectionKey = row.section_key;
    await env.DB.prepare(
      `DELETE FROM cms_page_content_blocks
       WHERE tenant_id = ? AND page_route = ? AND section_key = ?`
    ).bind(TENANT_ID, pageRoute, sectionKey).run().catch(() => null);
    await env.DB.prepare(
      `DELETE FROM cms_page_sections
       WHERE tenant_id = ? AND page_route = ? AND section_key = ?`
    ).bind(TENANT_ID, pageRoute, sectionKey).run().catch(() => null);
    // Leftover live fragment only — do not touch cms/section-trash (lifecycle).
    try {
      await env.WEBSITE_ASSETS?.delete(fragmentR2Key(pageRoute, sectionKey));
    } catch (_) {}
    purged += 1;
  }
  return { purged, older_than_days: days };
}

export async function syncSectionToR2(env, route, section, blocks, brand, opts = {}) {
  const r = normalizeCmsRoute(route);
  const sectionKey = String(section?.section_key || "").trim();
  if (!sectionKey) return { skipped: true };

  let out = await renderSectionByType(
    { ...section, page_route: r },
    blocks,
    brand,
    env,
    { preview: opts.preview === true, includeHidden: true, route: r }
  );
  out = out || "";
  if (Number(section.is_visible) === 0) out = "<!-- cms: section hidden -->";

  const r2Key = fragmentR2Key(r, sectionKey);
  await env.WEBSITE_ASSETS.put(r2Key, out, {
    httpMetadata: { contentType: "text/html; charset=utf-8" },
  });
  return { synced: true, section_key: sectionKey, r2_key: r2Key };
}

export async function syncRouteSectionsToR2(env, route, opts = {}) {
  const r = normalizeCmsRoute(route);
  const brand = opts.brand || (await getBrand(env));
  const { sections, blocksBySection } = await loadRouteSections(env, r, { includeHidden: true });
  const results = [];
  for (const section of sections) {
    const sectionBlocks = blocksBySection.get(section.section_key) || [];
    results.push(await syncSectionToR2(env, r, section, sectionBlocks, brand, opts));
  }
  return { route: r, synced: results.filter((x) => x.synced), sections: results };
}

export async function bustPageCache(env, route) {
  const r = normalizeCmsRoute(route);
  if (env.CMS_CACHE) await env.CMS_CACHE.delete(`page:${r}`).catch(() => {});
}

export async function assemblePage(env, route, opts = {}) {
  const r = normalizeCmsRoute(route);
  const includeHidden = opts.includeHidden === true;
  const preview = opts.preview === true;
  const preferR2 = opts.preferR2 === true;

  const page = await loadCmsPageRow(env, r);
  if (!page) return null;

  const brand = await getBrand(env);
  const { sections, blocksBySection } = await loadRouteSections(env, r, { includeHidden });

  const sectionHtmls = [];
  for (const section of sections) {
    const sectionBlocks = blocksBySection.get(section.section_key) || [];
    let html = "";
    if (preferR2) html = await r2Text(env, fragmentR2Key(r, section.section_key));
    if (!html.trim()) {
      html = await renderSectionByType(
        { ...section, page_route: r },
        sectionBlocks,
        brand,
        env,
        { preview, includeHidden, route: r }
      );
    }
    if (includeHidden && Number(section.is_visible) === 0) {
      html = `<div class="cms-preview-hidden-section" data-hidden-section="1">${html}</div>`;
    }
    if (html) sectionHtmls.push(html);
  }
  if (!sectionHtmls.length) return null;

  const [headerHtml, footerHtml] = await Promise.all([
    getGlobalPartial("header", brand, env, { preview }),
    getGlobalPartial("footer", brand, env, { preview }),
  ]);

  let html = assembleFullPage(page, brand, headerHtml, sectionHtmls, footerHtml, { preview });
  if (pageNeedsContactFormScript(sections)) {
    if (html.includes("</body>")) html = html.replace("</body>", `${CONTACT_FORM_SCRIPT}\n</body>`);
    else html += CONTACT_FORM_SCRIPT;
  }
  return html;
}

export async function publishRoute(env, route, jobId = null) {
  const r = normalizeCmsRoute(route);
  await syncRouteSectionsToR2(env, r);
  await bustPageCache(env, r);
  const html = await assemblePage(env, r, { preferR2: false });
  if (!html) throw new Error(`Assembly failed for route ${r}`);

  const artifactKey = getPageArtifactKey(r);
  await env.WEBSITE_ASSETS.put(artifactKey, html, {
    httpMetadata: { contentType: "text/html; charset=utf-8" },
  });
  if (env.CMS_CACHE) {
    await env.CMS_CACHE.put(`page:${r}`, html, { expirationTtl: PAGE_CACHE_TTL }).catch(() => {});
  }
  return { html, artifact_key: artifactKey, job_id: jobId, route: r };
}

export async function previewRoute(env, route) {
  const r = normalizeCmsRoute(route);
  await syncRouteSectionsToR2(env, r, { preview: true });
  return assemblePage(env, r, { includeHidden: true, preview: true });
}

export async function syncAndPublishPage(env, route, jobId) { return publishRoute(env, route, jobId); }
export async function previewPageFromCms(env, route) { return previewRoute(env, route); }
export async function syncAllSectionsToR2(env, route, opts) { return syncRouteSectionsToR2(env, route, opts); }

function newId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Starter sections for brand-new pages (catalog types only). */
export const STARTER_SECTION_DEFS = [
  {
    section_key: "hero",
    section_type: "hero",
    sort_order: 10,
    eyebrow: "New Page",
    heading: "",
    subheading: "Edit this hero in the page editor — change the headline, image, and buttons.",
    body: "",
    cta_label: "Learn More",
    cta_href: "#",
    cta_secondary_label: "Contact Us",
    cta_secondary_href: "/contact",
  },
  {
    section_key: "intro",
    section_type: "text_image",
    sort_order: 20,
    eyebrow: "About",
    heading: "Tell your story",
    subheading: "",
    body: "Replace this copy with your own content. Add an image from the media library when you are ready.",
    cta_label: "",
    cta_href: "",
    cta_secondary_label: "",
    cta_secondary_href: "",
  },
  {
    section_key: "cta",
    section_type: "cta_banner",
    sort_order: 30,
    eyebrow: "Get Involved",
    heading: "Ready to take the next step?",
    subheading: "",
    body: "Give visitors a clear action — donate, foster, or get in touch.",
    cta_label: "Contact Us",
    cta_href: "/contact",
    cta_secondary_label: "Donate",
    cta_secondary_href: "/donate",
  },
];

export async function seedStarterSectionsForRoute(env, route, title = "Welcome") {
  const r = normalizeCmsRoute(route);
  const countRow = await env.DB.prepare(
    "SELECT COUNT(*) AS c FROM cms_page_sections WHERE tenant_id = ? AND page_route = ?"
  ).bind(TENANT_ID, r).first().catch(() => ({ c: 0 }));
  if (Number(countRow?.c || 0) > 0) {
    return { seeded: false, reason: "already_has_sections", sections: [] };
  }

  const seeded = [];
  for (const def of STARTER_SECTION_DEFS) {
    const heading = def.section_key === "hero"
      ? (title || "Welcome")
      : def.heading;
    await env.DB.prepare(`
      INSERT INTO cms_page_sections
      (id, tenant_id, page_route, section_key, section_type, eyebrow, heading, subheading, body,
       image_url, cta_label, cta_href, cta_secondary_label, cta_secondary_href, sort_order,
       is_visible, config_json, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, '{}', datetime('now'))
      ON CONFLICT(tenant_id, page_route, section_key) DO NOTHING
    `).bind(
      newId("section"),
      TENANT_ID,
      r,
      def.section_key,
      def.section_type,
      def.eyebrow || "",
      heading || "",
      def.subheading || "",
      def.body || "",
      "",
      def.cta_label || "",
      def.cta_href || "",
      def.cta_secondary_label || "",
      def.cta_secondary_href || "",
      def.sort_order
    ).run();
    seeded.push(def.section_key);
  }
  return { seeded: true, sections: seeded };
}

export async function ensurePageNavItem(env, route, label, { visible = true, placement = "more" } = {}) {
  const r = normalizeCmsRoute(route);
  const navVisible = visible ? 1 : 0;
  const navLabel = String(label || "").trim() || r;
  const navPlacement = ["primary", "more", "cta", "footer_only", "none"].includes(String(placement))
    ? String(placement)
    : "more";

  await env.DB.prepare(
    `UPDATE cms_pages
     SET nav_visible = ?,
         nav_label = COALESCE(NULLIF(TRIM(nav_label), ''), ?),
         nav_placement = COALESCE(NULLIF(TRIM(nav_placement), ''), ?),
         updated_at = datetime('now')
     WHERE tenant_id = ? AND route_path = ?`
  ).bind(navVisible, navLabel, navPlacement, TENANT_ID, r).run().catch(() => {});

  // Optional mirror only — not live SSOT
  const existing = await env.DB.prepare(
    "SELECT id FROM cms_navigation_items WHERE tenant_id = ? AND href = ? LIMIT 1"
  ).bind(TENANT_ID, r).first().catch(() => null);

  if (existing?.id) {
    await env.DB.prepare(
      `UPDATE cms_navigation_items
       SET label = ?, is_visible = ?, nav_group = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(navLabel, navVisible, navPlacement === "cta" ? "cta" : navPlacement, existing.id).run();
    return { nav: "updated", href: r, label: navLabel, placement: navPlacement };
  }

  const maxRow = await env.DB.prepare(
    "SELECT MAX(sort_order) AS m FROM cms_pages WHERE tenant_id = ?"
  ).bind(TENANT_ID).first().catch(() => ({ m: 100 }));
  const sortOrder = (Number(maxRow?.m) || 100) + 10;

  await env.DB.prepare(
    `UPDATE cms_pages SET sort_order = COALESCE(sort_order, ?) WHERE tenant_id = ? AND route_path = ?`
  ).bind(sortOrder, TENANT_ID, r).run().catch(() => {});

  await env.DB.prepare(`
    INSERT INTO cms_navigation_items
    (id, tenant_id, label, href, sort_order, is_visible, created_at, updated_at, nav_group)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), ?)
  `).bind(newId("nav"), TENANT_ID, navLabel, r, sortOrder, navVisible, navPlacement === "cta" ? "cta" : navPlacement).run();

  return { nav: "created", href: r, label: navLabel, placement: navPlacement, sort_order: sortOrder };
}

/**
 * Full new-page bootstrap: starter sections + cms_pages chrome defaults.
 * New pages default to More placement; staff change in Page settings.
 */
export async function bootstrapNewCmsPage(env, { route, title, add_to_nav = true, nav_placement = "more" } = {}) {
  const r = normalizeCmsRoute(route);
  const sectionResult = await seedStarterSectionsForRoute(env, r, title);
  const shortLabel = String(title || r).split(/[—–|-]/)[0]?.trim() || String(title || r);
  let navResult = null;
  if (add_to_nav !== false) {
    navResult = await ensurePageNavItem(env, r, shortLabel, {
      visible: true,
      placement: nav_placement || "more",
    });
  } else {
    await env.DB.prepare(
      `UPDATE cms_pages SET nav_visible = 0, nav_placement = 'none', updated_at = datetime('now')
       WHERE tenant_id = ? AND route_path = ?`
    ).bind(TENANT_ID, r).run().catch(() => {});
    navResult = { nav: "hidden", href: r };
  }
  if (env.CMS_CACHE) {
    await Promise.all([
      env.CMS_CACHE.delete(`brand:${TENANT_ID}`).catch(() => {}),
      env.CMS_CACHE.delete(`bootstrap:${TENANT_ID}`).catch(() => {}),
      env.CMS_CACHE.delete(`page:${r}`).catch(() => {}),
    ]);
  }
  return { route: r, sections: sectionResult, nav: navResult };
}
