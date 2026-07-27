/** Runtime brand tokens — CMS Brand saves apply via /api/cms/brand/tokens.css (no rebuild). */

/** Must match cpas-shell.css --header-h */
export const HEADER_BAR_PX = 88;
/** 0 = slider may use the full bar height. */
export const HEADER_LOGO_INSET_PX = 0;
export const HEADER_LOGO_MAX_PX = HEADER_BAR_PX - HEADER_LOGO_INSET_PX; // 88
export const HEADER_LOGO_MIN_PX = 40;

function trim(v) {
  return v == null ? "" : String(v).trim();
}

function isHexColor(value) {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trim(value));
}

function normalizeHex(value, fallback) {
  const raw = trim(value);
  if (!isHexColor(raw)) return fallback;
  if (raw.length === 4) {
    const r = raw[1];
    const g = raw[2];
    const b = raw[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return raw.toLowerCase();
}

function hexToRgb(hex) {
  const n = normalizeHex(hex, "#000000").slice(1);
  return {
    r: parseInt(n.slice(0, 2), 16),
    g: parseInt(n.slice(2, 4), 16),
    b: parseInt(n.slice(4, 6), 16),
  };
}

function mixHex(a, b, weight = 0.5) {
  const c1 = hexToRgb(a);
  const c2 = hexToRgb(b);
  const w = Math.min(1, Math.max(0, weight));
  const r = Math.round(c1.r * (1 - w) + c2.r * w);
  const g = Math.round(c1.g * (1 - w) + c2.g * w);
  const bVal = Math.round(c1.b * (1 - w) + c2.b * w);
  return `#${[r, g, bVal].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

/** Clamp CMS logo_width to [min, header bar height] — max = full header height. */
export function clampHeaderLogoPx(raw, fallback = HEADER_LOGO_MAX_PX) {
  const n = Number(raw);
  const base = Number.isFinite(n) && n > 0 ? n : fallback;
  return Math.max(HEADER_LOGO_MIN_PX, Math.min(HEADER_LOGO_MAX_PX, Math.round(base)));
}

/**
 * Prefer a sharp CF Images variant for the header mark.
 * /avatar is a small thumb and reads tiny even when CSS height is correct.
 */
export function preferHeaderLogoUrl(url) {
  const raw = trim(url);
  if (!raw) return raw;
  if (!/imagedelivery\.net\//i.test(raw)) return raw;
  return raw
    .replace(/\/avatar\/?$/i, "/public")
    .replace(/\/w=\d+\/?$/i, "/public")
    .replace(/\/h=\d+\/?$/i, "/public");
}

export function buildBrandTokensCss(brand = {}) {
  const primary = normalizeHex(brand.primary_color, "#6b21e8");
  const accent = normalizeHex(brand.accent_color, "#d62b2b");
  const purpleMid = mixHex(primary, "#ffffff", 0.18);
  const purpleLight = mixHex(primary, "#ffffff", 0.42);
  const logoSize = clampHeaderLogoPx(brand.logo_width, HEADER_LOGO_MAX_PX);

  return `:root,
.theme-light,
.theme-plum-glass,
.theme-dark,
[data-theme="light"],
[data-theme="plum_glass"],
[data-theme="dark"] {
  --purple: ${primary};
  --purple-mid: ${purpleMid};
  --purple-light: ${purpleLight};
  --red-accent: ${accent};
  --btn-bg: ${primary};
  --eyebrow-color: ${primary};
  --brand-logo-size: ${logoSize}px;
  --brand-logo-width: ${logoSize}px;
  --brand-logo-height: ${logoSize}px;
  --header-logo-inset: ${HEADER_LOGO_INSET_PX}px;
}

/*
 * Header logo — Brand slider drives height in px.
 * Max = full --header-h. !important beats stale shell / shared rules.
 * width:auto + object-fit:contain = no crop, no stretch.
 */
.site-header .logo-link {
  height: 100%;
  display: inline-flex !important;
  align-items: center !important;
  overflow: visible !important;
}
.site-header .logo-link img,
.site-header .header-logo-img,
.header-logo-img,
.logo-link img {
  height: ${logoSize}px !important;
  width: auto !important;
  max-height: ${logoSize}px !important;
  max-width: none !important;
  margin-block: 0 !important;
  object-fit: contain !important;
  object-position: left center !important;
  display: block !important;
  flex-shrink: 0 !important;
}
`;
}

export function brandTokensStylesheetTag() {
  return `<link rel="stylesheet" href="/api/cms/brand/tokens.css">`;
}
