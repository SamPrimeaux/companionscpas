-- Watercolor hero theme tokens (revert homepage theme or edit tokens_json to change direction)
UPDATE cms_themes
SET tokens_json = '{
  "colors": {
    "bg": "#faf8f4",
    "bg2": "#f2ede4",
    "headerTop": "rgba(58, 16, 72, 0.90)",
    "headerBottom": "rgba(44, 10, 56, 0.84)",
    "headerScrolledTop": "rgba(98, 32, 92, 0.93)",
    "headerScrolledBottom": "rgba(130, 42, 118, 0.90)",
    "navLink": "rgba(255, 255, 255, 0.74)",
    "navActiveUnderline": "#e879f9",
    "ctaDonateStart": "rgba(192, 38, 211, 0.92)",
    "ctaDonateEnd": "rgba(107, 33, 168, 0.88)",
    "heroCtaPrimaryStart": "#6f2270",
    "heroCtaPrimaryEnd": "#4e1a52",
    "cocCream": "#fdf1e3",
    "cocMagenta": "#c23689",
    "cocPlum": "#4e1a52",
    "cocInk": "#2e102f"
  },
  "effects": {
    "headerBlur": "24px",
    "headerSaturate": "165%"
  }
}',
    description = 'Public prototype: watercolor hero, dark plum header morphing to magenta on scroll, theme-token CTAs.',
    updated_at = datetime('now')
WHERE tenant_id = 'tenant_companionscpas'
  AND theme_key = 'plum_glass';
