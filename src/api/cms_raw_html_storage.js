/**
 * Custom Code (raw_html) authoring storage — HTML bodies live in R2.
 * D1 config_json holds pointers only (no html/inline_html blobs).
 */

export const CDN_BASE = "https://assets.companionsofcaddo.org";

function sanitizeSeg(value, fallback = "section") {
  const s = String(value || "")
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return s || fallback;
}

/** Authoring SSOT key (draft). Distinct from live publish fragment under static/pages/… */
export function rawHtmlAuthoringKey(pageRoute, sectionKey) {
  const route = String(pageRoute || "/").trim() || "/";
  const routeSeg = route === "/" ? "home" : sanitizeSeg(route.replace(/^\//, ""), "page");
  const keySeg = sanitizeSeg(sectionKey, "raw_html");
  return `static/cms/raw-html/${routeSeg}/${keySeg}.html`;
}

export function rawHtmlCdnUrl(r2Key) {
  const key = String(r2Key || "").replace(/^\/+/, "");
  return key ? `${CDN_BASE}/${key}` : "";
}

export function parseSectionConfig(sectionOrJson) {
  const raw = sectionOrJson?.config_json != null ? sectionOrJson.config_json : sectionOrJson;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return { ...raw };
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

/** Strip HTML bodies from config — keep pointer fields only. */
export function leanRawHtmlConfig(cfg = {}, overrides = {}) {
  const next = { ...(cfg && typeof cfg === "object" ? cfg : {}), ...overrides };
  delete next.html;
  delete next.inline_html;
  if (!next.html_source || next.html_source === "paste" || next.html_source === "inline") {
    if (next.r2_key || overrides.r2_key) next.html_source = "r2";
  }
  return next;
}

export async function putRawHtmlAuthoring(env, pageRoute, sectionKey, html) {
  const r2Key = rawHtmlAuthoringKey(pageRoute, sectionKey);
  const body = String(html ?? "");
  if (!env?.WEBSITE_ASSETS) {
    throw new Error("WEBSITE_ASSETS binding missing");
  }
  await env.WEBSITE_ASSETS.put(r2Key, body, {
    httpMetadata: { contentType: "text/html; charset=utf-8" },
  });
  return {
    r2_key: r2Key,
    cdn_url: rawHtmlCdnUrl(r2Key),
    bytes: new TextEncoder().encode(body).length,
  };
}

export async function getRawHtmlAuthoring(env, r2Key) {
  const key = String(r2Key || "").trim();
  if (!key || !env?.WEBSITE_ASSETS) return "";
  const obj = await env.WEBSITE_ASSETS.get(key).catch(() => null);
  if (!obj) return "";
  return obj.text().catch(() => "");
}

/**
 * On section save: if raw_html and HTML body present, write R2 and return lean config_json string.
 * Pass-through for non-raw_html or URL-only configs with no html body.
 */
export async function persistRawHtmlConfigOnSave(env, section) {
  const type = String(section?.section_type || "").trim();
  if (type !== "raw_html") {
    return typeof section.config_json === "string"
      ? section.config_json
      : JSON.stringify(section.config_json || {});
  }

  const pageRoute = section.page_route || "/";
  const sectionKey = section.section_key || "raw_html";
  const cfg = parseSectionConfig(section);
  const inline = String(cfg.html || cfg.inline_html || "").trim();
  const mode = String(cfg.html_source || "").trim().toLowerCase();

  // Explicit external URL mode with no paste body — keep lean pointer
  if ((mode === "url" || (!inline && cfg.source_url)) && !inline) {
    const lean = leanRawHtmlConfig({
      html_source: "url",
      source_url: String(cfg.source_url || "").trim(),
      r2_key: cfg.r2_key || "",
      cdn_url: cfg.cdn_url || "",
    });
    if (!lean.source_url) delete lean.source_url;
    if (!lean.r2_key) {
      delete lean.r2_key;
      delete lean.cdn_url;
    }
    return JSON.stringify(lean);
  }

  // Paste / r2 / default: body goes to R2 (empty string clears authoring object)
  const put = await putRawHtmlAuthoring(env, pageRoute, sectionKey, inline);
  const lean = leanRawHtmlConfig(cfg, {
    html_source: "r2",
    r2_key: put.r2_key,
    cdn_url: put.cdn_url,
    source_url: "",
  });
  delete lean.source_url;
  return JSON.stringify(lean);
}

/** Hydrate editor response: inject html from R2 into a copy of config_json (D1 unchanged). */
export async function hydrateRawHtmlSectionForEditor(env, section) {
  if (!section || String(section.section_type || "") !== "raw_html") return section;
  const cfg = parseSectionConfig(section);
  const mode = String(cfg.html_source || "").trim().toLowerCase();
  const r2Key = String(cfg.r2_key || "").trim();

  if (mode === "url" && cfg.source_url && !r2Key) {
    return section;
  }

  if (r2Key || mode === "r2" || mode === "paste" || mode === "inline") {
    const key = r2Key || rawHtmlAuthoringKey(section.page_route, section.section_key);
    const html = await getRawHtmlAuthoring(env, key);
    if (html || r2Key) {
      const hydrated = {
        ...cfg,
        html_source: r2Key || mode === "r2" ? "r2" : (cfg.html_source || "r2"),
        r2_key: key,
        cdn_url: cfg.cdn_url || rawHtmlCdnUrl(key),
        html,
      };
      return { ...section, config_json: JSON.stringify(hydrated) };
    }
  }

  // Legacy paste still in D1 — leave as-is until migrate runs
  return section;
}
