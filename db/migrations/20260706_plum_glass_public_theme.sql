-- Ivory plum glass — public prototype theme (header/nav glass + magenta CTA tokens)
INSERT OR REPLACE INTO cms_themes (
  id,
  tenant_id,
  theme_key,
  theme_name,
  description,
  mode,
  is_active,
  tokens_json,
  updated_at
) VALUES (
  'theme_ivory_plum_glass',
  'tenant_companionscpas',
  'plum_glass',
  'Ivory Plum Glass',
  'Public prototype: warm ivory surfaces, plum glassmorphic header, minimal nav underline, magenta donate CTA.',
  'light',
  0,
  '{
    "colors": {
      "bg": "#faf8f4",
      "bg2": "#f2ede4",
      "headerGlassBg": "rgba(250,248,244,0.74)",
      "headerGlassScrolledBg": "rgba(252,250,247,0.94)",
      "headerGlassBorder": "rgba(107,33,232,0.16)",
      "ctaGradientStart": "#e879f9",
      "ctaGradientMid": "#c026d3",
      "ctaGradientEnd": "#9333ea",
      "navActive": "#6b21e8"
    },
    "effects": {
      "headerBlur": "20px",
      "headerSaturate": "150%"
    }
  }',
  datetime('now')
);

-- Homepage prototype uses plum_glass for client approval pass
UPDATE cms_pages
SET theme = 'plum_glass',
    updated_at = datetime('now')
WHERE tenant_id = 'tenant_companionscpas'
  AND route_path = '/';
