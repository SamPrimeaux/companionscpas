-- Homepage hero mockup: Contact Us primary CTA + hide /community from nav

UPDATE cms_pages
SET nav_visible = 0,
    updated_at = datetime('now')
WHERE tenant_id = 'tenant_companionscpas'
  AND route_path = '/community';

UPDATE cms_navigation_items
SET is_visible = 0,
    updated_at = datetime('now')
WHERE tenant_id = 'tenant_companionscpas'
  AND href = '/community';

UPDATE cms_page_sections
SET cta_label = 'Contact Us',
    config_json = json_set(
      COALESCE(NULLIF(config_json, ''), '{}'),
      '$.cta_sub', 'We''re here to help',
      '$.cta_action', 'contact',
      '$.cta_secondary_sub', 'Donate or give supplies',
      '$.cta_secondary_action', 'donate',
      '$.image_alt', 'A happy dog ready for a second chance'
    ),
    updated_at = datetime('now')
WHERE tenant_id = 'tenant_companionscpas'
  AND page_route = '/'
  AND section_key = 'hero';

UPDATE cms_themes
SET tokens_json = '{
    "colors": {
      "bg": "#faf8f4",
      "bg2": "#f2ede4",
      "headerGlassBg": "rgba(58,16,72,0.90)",
      "headerGlassScrolledBg": "rgba(34,8,44,0.96)",
      "headerGlassBorder": "rgba(255,255,255,0.12)",
      "ctaGradientStart": "#9333ea",
      "ctaGradientMid": "#6b21a8",
      "ctaGradientEnd": "#4c1d6e",
      "navActive": "#e879f9"
    },
    "effects": {
      "headerBlur": "24px",
      "headerSaturate": "165%"
    }
  }',
    updated_at = datetime('now')
WHERE tenant_id = 'tenant_companionscpas'
  AND theme_key = 'plum_glass';
