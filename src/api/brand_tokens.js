/** Runtime brand color tokens — served as CSS so CMS color saves apply without republish. */

/** Public header bar height (matches cpas-shell.css --header-h). */
export const HEADER_BAR_PX = 72;
/** Keep logo inside the bar so it never crops (breathing room top + bottom). */
export const HEADER_LOGO_INSET_PX = 12;
/** Max logo height that still fits the bar. Larger would require growing the header. */
export const HEADER_LOGO_MAX_PX = HEADER_BAR_PX - HEADER_LOGO_INSET_PX; // 60
export const HEADER_LOGO_MIN_PX = 36;

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

/** Clamp CMS logo_width to the in-bar safe range (height in px). */
export function clampHeaderLogoPx(raw, fallback = 56) {
  const n = Number(raw);
  const base = Number.isFinite(n) && n > 0 ? n : fallback;
  return Math.max(HEADER_LOGO_MIN_PX, Math.min(HEADER_LOGO_MAX_PX, Math.round(base)));
}

export function buildBrandTokensCss(brand = {}) {
  const primary = normalizeHex(brand.primary_color, "#6b21e8");
  const accent = normalizeHex(brand.accent_color, "#d62b2b");
  const purpleMid = mixHex(primary, "#ffffff", 0.18);
  const purpleLight = mixHex(primary, "#ffffff", 0.42);
  // Slider = desired height; hard-capped so the full mark fits inside the 72px bar.
  const logoSize = clampHeaderLogoPx(brand.logo_width, 56);

  return `:root,
.theme-light,
.theme-plum-glass,
[data-theme="light"],
[data-theme="plum_glass"] {
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

/* Fit inside the header bar — height-driven, width follows aspect ratio (no crop/stretch). */
.header-logo-img,
.logo-link img {
  height: min(var(--brand-logo-size), calc(var(--header-h) - var(--header-logo-inset)));
  width: auto;
  max-height: calc(var(--header-h) - var(--header-logo-inset));
  max-width: min(280px, 42vw);
  margin-block: 0;
  object-fit: contain;
  object-position: left center;
}
`;
}

export function brandTokensStylesheetTag() {
  return `<link rel="stylesheet" href="/api/cms/brand/tokens.css">`;
}
