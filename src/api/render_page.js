import { renderSection } from "./render_section.js";
import { SHELL_VERSION, publicPageScripts } from "./page_shell.js";

const TENANT_ID = "tenant_companionscpas";
const BRAND_CACHE_KEY = `brand:${TENANT_ID}`;
const PAGE_CACHE_TTL = 3600;

const SHELL_CSS = "/static/global/shared.css";

function nowIso() {
  return new Date().toISOString();
}

function text(value) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function escapeHtml(value) {
  return text(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function parseJson(value, fallback = {}) {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    const parsed = JSON.parse(String(value));
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch {
    return fallback;
  }
}

function normalizeRoute(route) {
  const raw = text(route).trim();
  if (!raw) return "/";

  let normalized = raw.replace(/\/+/g, "/");
  if (!normalized.startsWith("/")) normalized = `/${normalized}`;
  normalized = normalized.replace(/\/+/g, "/");

  if (normalized.length > 1) {
    normalized = normalized.replace(/\/+$/, "");
  }

  return normalized || "/";
}

export function sanitizePathSegment(value, fallback = "section") {
  const cleaned = text(value)
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned || fallback;
}

export function getPageAssetBase(route) {
  return route === "/" ? "static/pages" : `static/pages${route}`;
}

function contentTypeOptions() {
  return { httpMetadata: { contentType: "text/html; charset=utf-8" } };
}

function safeUrl(value, fallback = "#") {
  const raw = text(value).trim();
  if (!raw) return fallback;

  if (raw.startsWith("//")) return fallback;
  if (raw.startsWith("/")) return escapeHtml(raw);
  if (raw.startsWith("#")) return escapeHtml(raw);

  const lower = raw.toLowerCase();
  if (
    lower.startsWith("mailto:") ||
    lower.startsWith("tel:") ||
    lower.startsWith("https://") ||
    lower.startsWith("http://")
  ) {
    return escapeHtml(raw);
  }

  return fallback;
}

function randomId(prefix) {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}

async function queryAll(env, sql, ...binds) {
  const result = await env.DB.prepare(sql).bind(...binds).all();
  return result?.results || [];
}

async function queryFirst(env, sql, ...binds) {
  return env.DB.prepare(sql).bind(...binds).first();
}

function buildBrandPayload(row) {
  if (!row) return {};
  const config = parseJson(row.config_json, {});
  return {
    ...row,
    config,
    navigation: parseJson(row.navigation_json, []),
    footer: parseJson(row.footer_json, {}),
    socials: parseJson(row.socials_json, {}),
    organization: parseJson(row.organization_json, {}),
    seoDefaults: parseJson(row.seo_defaults_json, {}),
  };
}

export async function getBrand(env) {
  if (!env?.DB) return {};

  if (env.CMS_CACHE) {
    const cached = await env.CMS_CACHE.get(BRAND_CACHE_KEY, { type: "json" }).catch(() => null);
    if (cached && typeof cached === "object") return cached;
  }

  const row = await queryFirst(
    env,
    "SELECT * FROM cms_brand_settings WHERE tenant_id = ? ORDER BY updated_at DESC, id DESC LIMIT 1",
    TENANT_ID
  ).catch(() => null);

  const brand = buildBrandPayload(row);
  if (env.CMS_CACHE) {
    await env.CMS_CACHE.put(BRAND_CACHE_KEY, JSON.stringify(brand), { expirationTtl: PAGE_CACHE_TTL }).catch(() => {});
  }
  return brand;
}

function fallbackHeader(brand) {
  const brandName = escapeHtml(brand?.brand_name || "Companions of CPAS");
  const navFromBrand = Array.isArray(brand?.navigation) ? brand.navigation : [];
  const navItems = navFromBrand
    .map((item) => {
      const label = escapeHtml(item?.label || "");
      const href = safeUrl(item?.href, "#");
      if (!label) return "";
      return `<li><a href="${href}">${label}</a></li>`;
    })
    .join("");

  return `
<header class="cpas-global-header">
  <div class="cpas-global-header-inner">
    <a class="cpas-brand-link" href="/">${brandName}</a>
    ${navItems ? `<nav class="cpas-global-nav" aria-label="Primary navigation"><ul>${navItems}</ul></nav>` : ""}
  </div>
</header>`.trim();
}

function fallbackFooter(brand) {
  const brandName = escapeHtml(brand?.brand_name || "Companions of CPAS");
  const org = brand?.organization || {};
  const ein = escapeHtml(org?.ein || "");
  const email = escapeHtml(org?.email || "");
  const lineParts = [brandName, ein ? `EIN ${ein}` : "", email].filter(Boolean);

  return `
<footer class="cpas-global-footer">
  <div class="cpas-global-footer-inner">
    <p>${escapeHtml(lineParts.join(" • "))}</p>
  </div>
</footer>`.trim();
}

export async function getGlobalPartial(name, brand, env) {
  const partialName = sanitizePathSegment(name, "");
  if (!partialName) return "";

  const keyMap = { header: 'cpas-header', footer: 'cpas-footer' };
  const resolvedName = keyMap[partialName] || partialName;
  const key = `static/global/${resolvedName}.html`;
  const fromR2 = await env?.WEBSITE_ASSETS?.get(key).catch(() => null);
  if (fromR2) {
    const html = await fromR2.text().catch(() => "");
    if (html) return html;
  }

  if (partialName === "header") return fallbackHeader(brand);
  if (partialName === "footer") return fallbackFooter(brand);
  return `<!-- Missing global partial: ${escapeHtml(partialName)} -->`;
}

export function assembleFullPage(page, brand, headerHtml, sectionHtmls, footerHtml, opts = {}) {
  const safePage = page || {};
  const safeBrand = brand || {};
  const preview = opts?.preview === true;
  const title = escapeHtml(safePage.seo_title || safePage.title || safeBrand.brand_name || "Companions of CPAS");
  const description = escapeHtml(
    safePage.meta_description ||
      safeBrand?.seoDefaults?.description ||
      "Companions of CPAS community animal rescue support."
  );
  const theme = safePage.theme === "light" ? "light" : "dark";
  const route = escapeHtml(safePage.route_path || "/");
  // Font preset from brand config
  const fontPresets = Array.isArray(safeBrand?.config?.font_presets) ? safeBrand.config.font_presets : [];
  const activeFontKey = safeBrand?.config?.active_font_preset || 'fraunces_dm';
  const activePreset = fontPresets.find(p => p.key === activeFontKey) || null;
  const fontImportTag = activePreset && Array.isArray(activePreset.imports) && activePreset.imports.length
    ? activePreset.imports.map(u => '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="' + u + '">').join('')
    : '';
  const fontDataAttr = activeFontKey !== 'fraunces_dm' ? ' data-font="' + activeFontKey + '"' : '';
  const shellCssHref = `${SHELL_CSS}?v=${SHELL_VERSION}`;

  const sectionsMarkup = Array.isArray(sectionHtmls) ? sectionHtmls.join("\n") : "";
  const brandScript = `<script>window.__BRAND=${JSON.stringify({
    brand_name: safeBrand.brand_name || "Companions of CPAS",
    logo_dark_url: safeBrand.logo_dark_url || "/static/global/logo-dark.webp",
    logo_light_url: safeBrand.logo_light_url || "/static/global/companionsofcpa-newlogo.webp",
    footer_logo_dark_url: safeBrand.footer_logo_dark_url || "/static/global/companionsofcpa-newlogo.webp",
    footer_logo_light_url: safeBrand.footer_logo_light_url || "/static/global/logo-dark.webp",
    developer_logo_dark_url: safeBrand.developer_logo_dark_url || "",
    developer_logo_light_url: safeBrand.developer_logo_light_url || "",
    logo_width: safeBrand.logo_width || 140,
    footer_logo_width: safeBrand.footer_logo_width || 120,
  })}<\/script>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <link rel="stylesheet" href="${shellCssHref}">
${fontImportTag}
${brandScript}
</head>
<body class="theme-${theme}${preview ? " cms-preview" : ""}" data-theme="${theme}" data-route="${route}"${fontDataAttr}>
${headerHtml || ""}
<main>
${sectionsMarkup}
</main>
${footerHtml || ""}
${publicPageScripts()}
</body>
</html>`;
}

export async function hashContent(textValue) {
  const input = text(textValue);
  const encoder = new TextEncoder();
  const bytes = encoder.encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function writeHtmlArtifact(env, key, html) {
  await env.WEBSITE_ASSETS.put(key, html, contentTypeOptions());
}

function groupBlocksBySectionKey(blocks) {
  const groups = new Map();
  for (const block of blocks || []) {
    const sectionKey = text(block?.section_key).trim();
    if (!groups.has(sectionKey)) groups.set(sectionKey, []);
    groups.get(sectionKey).push(block);
  }
  return groups;
}

async function logPublishArtifact(env, data) {
  try {
    const hasTable = await queryFirst(
      env,
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'cms_publish_artifacts' LIMIT 1"
    ).catch(() => null);
    if (!hasTable) return;

    const info = await queryAll(env, "PRAGMA table_info(cms_publish_artifacts)").catch(() => []);
    const columns = new Set(info.map((row) => row?.name).filter(Boolean));
    if (!columns.size) return;

    const values = {
      id: randomId("artifact"),
      tenant_id: TENANT_ID,
      route_path: data.route,
      page_route: data.route,
      page_path: data.route,
      artifact_path: data.pageArtifactKey,
      path: data.pageArtifactKey,
      artifact_type: "page",
      content_hash: data.contentHash,
      etag: data.contentHash,
      job_id: data.jobId || null,
      publish_job_id: data.jobId || null,
      status: "published",
      size_bytes: Number(data.sizeBytes || 0),
      byte_size: Number(data.sizeBytes || 0),
      content_type: "text/html; charset=utf-8",
      metadata_json: JSON.stringify({
        route: data.route,
        generated_at: nowIso(),
      }),
      created_at: nowIso(),
      updated_at: nowIso(),
      published_at: nowIso(),
    };

    const insertColumns = [];
    const placeholders = [];
    const binds = [];
    for (const [key, value] of Object.entries(values)) {
      if (!columns.has(key)) continue;
      insertColumns.push(key);
      placeholders.push("?");
      binds.push(value);
    }

    if (!insertColumns.length) return;

    const sql = `INSERT INTO cms_publish_artifacts (${insertColumns.join(", ")}) VALUES (${placeholders.join(", ")})`;
    await env.DB.prepare(sql).bind(...binds).run();
  } catch (error) {
    console.warn("[renderPage] cms_publish_artifacts logging skipped:", error?.message || error);
    // Artifact logging must never fail page render.
  }
}

export async function renderPage(route, jobId, env, opts = {}) {
  if (!env?.DB) throw new Error("renderPage requires env.DB");
  if (!env?.WEBSITE_ASSETS) throw new Error("renderPage requires env.WEBSITE_ASSETS");

  const persist = opts?.persist !== false;
  const includeHidden = opts?.includeHidden === true;
  const normalizedRoute = normalizeRoute(route);
  const page = await queryFirst(
    env,
    "SELECT * FROM cms_pages WHERE route_path=? AND tenant_id=?",
    normalizedRoute,
    TENANT_ID
  );

  if (!page) {
    throw new Error(`Page not found for route: ${normalizedRoute}`);
  }

  const [brand, sections, blocks] = await Promise.all([
    getBrand(env),
    queryAll(
      env,
      includeHidden
        ? `SELECT * FROM cms_page_sections
           WHERE page_route=? AND tenant_id=?
           ORDER BY sort_order`
        : `SELECT * FROM cms_page_sections
           WHERE page_route=? AND tenant_id=? AND is_visible=1
           ORDER BY sort_order`,
      normalizedRoute,
      TENANT_ID
    ),
    queryAll(
      env,
      `SELECT * FROM cms_page_content_blocks
       WHERE page_route=? AND tenant_id=?
       ORDER BY section_key, sort_order`,
      normalizedRoute,
      TENANT_ID
    ),
  ]);

  const blocksBySection = groupBlocksBySectionKey(blocks);
  const pageAssetBase = getPageAssetBase(normalizedRoute);
  const sectionHtmls = [];

  for (let i = 0; i < sections.length; i += 1) {
    const section = sections[i] || {};
    const sectionKeyRaw = text(section.section_key).trim() || `section_${i + 1}`;
    const sectionKey = sanitizePathSegment(sectionKeyRaw, `section_${i + 1}`);
    const sectionBlocks = blocksBySection.get(sectionKeyRaw) || [];
    let html = text(renderSection(section, sectionBlocks, brand, env));
    if (includeHidden && Number(section.is_visible) === 0) {
      html = `<div class="cms-preview-hidden-section" data-hidden-section="1">${html}</div>`;
    }
    sectionHtmls.push(html);
    if (persist) {
      await writeHtmlArtifact(env, `${pageAssetBase}/${sectionKey}.html`, html);
    }
  }

  if (!sectionHtmls.length) {
    sectionHtmls.push(includeHidden ? "<!-- no sections found -->" : "<!-- no visible sections found -->");
  }

  const [headerHtml, footerHtml] = await Promise.all([
    getGlobalPartial("header", brand, env),
    getGlobalPartial("footer", brand, env),
  ]);

  const fullHTML = assembleFullPage(page, brand, headerHtml, sectionHtmls, footerHtml, { preview: !persist });
  const pageArtifactKey = `${pageAssetBase}/index.html`;

  if (persist) {
    await writeHtmlArtifact(env, pageArtifactKey, fullHTML);

    if (env.CMS_CACHE) {
      await env.CMS_CACHE.put(`page:${normalizedRoute}`, fullHTML, { expirationTtl: PAGE_CACHE_TTL }).catch(() => {});
    }

    const contentHash = await hashContent(fullHTML).catch(() => "");
    await logPublishArtifact(env, {
      route: normalizedRoute,
      jobId,
      pageArtifactKey,
      contentHash,
      sizeBytes: fullHTML.length,
    });
  }

  return fullHTML;
}
