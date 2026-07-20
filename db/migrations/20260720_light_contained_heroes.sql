-- Light foster preset + contained heroes (gutters) for /fosters and /adopt.
-- Run: npx wrangler d1 execute companionscpas --remote --file=db/migrations/20260720_light_contained_heroes.sql

-- Fosters: leave dark theme behind — plum/cream light preset
UPDATE cms_pages
SET theme = 'plum_glass', updated_at = datetime('now')
WHERE tenant_id = 'tenant_companionscpas' AND route_path = '/fosters';

-- Adopt stays plum_glass; ensure both heroes use contained_split + layout lock
UPDATE cms_page_sections
SET config_json = json_set(
  COALESCE(NULLIF(config_json, ''), '{}'),
  '$.hero_layout', 'contained_split',
  '$.overlay_strength', 'none',
  '$.layout_locked', 1,
  '$.image_fit', 'cover',
  '$.image_width', 48
),
updated_at = datetime('now')
WHERE tenant_id = 'tenant_companionscpas'
  AND page_route = '/fosters'
  AND section_key = 'fosters_hero';

UPDATE cms_page_sections
SET config_json = json_set(
  COALESCE(NULLIF(config_json, ''), '{}'),
  '$.hero_layout', 'contained_split',
  '$.overlay_strength', 'none',
  '$.layout_locked', 1,
  '$.image_fit', 'cover',
  '$.image_width', 48
),
updated_at = datetime('now')
WHERE tenant_id = 'tenant_companionscpas'
  AND page_route = '/adopt'
  AND section_key = 'adopt_hero';
