/** Runtime brand color tokens — served as CSS so CMS color saves apply without republish. */

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

export function buildBrandTokensCss(brand = {}) {
  const primary = normalizeHex(brand.primary_color, "#6b21e8");
  const accent = normalizeHex(brand.accent_color, "#d62b2b");
  const purpleMid = mixHex(primary, "#ffffff", 0.18);
  const purpleLight = mixHex(primary, "#ffffff", 0.42);
  const logoWidth = Math.max(48, Math.min(320, Number(brand.logo_width) || 140));
  const logoHeight = Number(brand.logo_height) > 0
    ? Math.max(28, Math.min(120, Number(brand.logo_height)))
    : Math.round(logoWidth * 0.52);

  return `:root,
.theme-light,
[data-theme="light"] {
  --purple: ${primary};
  --purple-mid: ${purpleMid};
  --purple-light: ${purpleLight};
  --red-accent: ${accent};
  --btn-bg: ${primary};
  --eyebrow-color: ${primary};
  --brand-logo-width: ${logoWidth}px;
  --brand-logo-height: ${logoHeight}px;
}

.logo-link img {
  height: var(--brand-logo-height, 72px);
  width: auto;
  max-width: var(--brand-logo-width, 240px);
  object-fit: contain;
}
`;
}

export function brandTokensStylesheetTag() {
  return `<link rel="stylesheet" href="/api/cms/brand/tokens.css">`;
}
