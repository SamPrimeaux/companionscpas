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
  const sql = includeHidden
    ? `SELECT * FROM cms_page_sections WHERE tenant_id = ? AND page_route = ? ORDER BY sort_order, section_key`
    : `SELECT * FROM cms_page_sections WHERE tenant_id = ? AND page_route = ? AND is_visible = 1 ORDER BY sort_order, section_key`;
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
    getGlobalPartial("header", brand, env),
    getGlobalPartial("footer", brand, env),
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
