import { renderSection } from "./render_section.js";
import {
  assembleFullPage,
  getBrand,
  getGlobalPartial,
  getPageAssetBase,
  sanitizePathSegment,
} from "./render_page.js";

const TENANT_ID = "tenant_companionscpas";
const PAGE_CACHE_TTL = 3600;

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

export async function assembleGenericPageFromFragments(env, route, opts = {}) {
  const includeHidden = opts?.includeHidden === true;
  const preview = opts?.preview === true;

  const page = await env.DB.prepare(
    "SELECT * FROM cms_pages WHERE tenant_id = ? AND route_path = ? LIMIT 1"
  ).bind(TENANT_ID, route).first().catch(() => null);
  if (!page) return null;

  const sectionsSql = includeHidden
    ? `SELECT * FROM cms_page_sections
       WHERE tenant_id = ? AND page_route = ?
       ORDER BY sort_order, section_key`
    : `SELECT * FROM cms_page_sections
       WHERE tenant_id = ? AND page_route = ? AND is_visible = 1
       ORDER BY sort_order, section_key`;

  const [brand, sectionsRes, blocksRes] = await Promise.all([
    getBrand(env),
    env.DB.prepare(sectionsSql).bind(TENANT_ID, route).all(),
    env.DB.prepare(
      `SELECT * FROM cms_page_content_blocks
       WHERE tenant_id = ? AND page_route = ?
       ORDER BY sort_order, section_key, block_key`
    ).bind(TENANT_ID, route).all(),
  ]);

  const sections = sectionsRes?.results || [];
  const blocksBySection = groupBlocks(blocksRes?.results || []);
  const pageAssetBase = getPageAssetBase(route);
  const sectionHtmls = [];

  for (const section of sections) {
    const sectionKeyRaw = String(section?.section_key || "").trim();
    const sectionKey = sanitizePathSegment(sectionKeyRaw, "section");
    const r2Key = `${pageAssetBase}/${sectionKey}.html`;
    let html = await r2Text(env, r2Key);

    if (!html.trim()) {
      const sectionBlocks = blocksBySection.get(sectionKeyRaw) || [];
      html = String(renderSection(section, sectionBlocks, brand, env) || "");
    }

    if (includeHidden && Number(section.is_visible) === 0) {
      html = `<div class="cms-preview-hidden-section" data-hidden-section="1">${html}</div>`;
    }

    sectionHtmls.push(html);
  }

  if (!sectionHtmls.length) return null;

  const [headerHtml, footerHtml] = await Promise.all([
    getGlobalPartial("header", brand, env),
    getGlobalPartial("footer", brand, env),
  ]);

  return assembleFullPage(page, brand, headerHtml, sectionHtmls, footerHtml, { preview });
}

export async function publishGenericPageFromFragments(env, route, jobId = null) {
  const html = await assembleGenericPageFromFragments(env, route);
  if (!html) {
    throw new Error(`Fragment assembly failed for route ${route}`);
  }

  const artifactKey = `${getPageAssetBase(route)}/index.html`;
  await env.WEBSITE_ASSETS.put(artifactKey, html, {
    httpMetadata: { contentType: "text/html; charset=utf-8" },
  });

  if (env.CMS_CACHE) {
    await env.CMS_CACHE.put(`page:${route}`, html, { expirationTtl: PAGE_CACHE_TTL }).catch(() => {});
  }

  return { html, artifact_key: artifactKey, job_id: jobId };
}
