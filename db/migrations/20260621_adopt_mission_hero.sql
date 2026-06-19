-- Move services_mission card to /adopt top; old adopt hero becomes section 2
-- Run: npx wrangler d1 execute companionscpas --remote --file=db/migrations/20260621_adopt_mission_hero.sql

INSERT INTO cms_page_sections (
  id, tenant_id, page_route, section_key, section_type,
  eyebrow, heading, subheading, body,
  image_url, cta_label, cta_href, sort_order, is_visible, config_json,
  created_at, updated_at
)
SELECT
  'sec_adopt_shelter_hero',
  'tenant_companionscpas',
  '/adopt',
  'adopt_shelter_hero',
  'hero',
  eyebrow,
  heading,
  subheading,
  body,
  image_url,
  cta_label,
  cta_href,
  15,
  1,
  config_json,
  datetime('now'),
  datetime('now')
FROM cms_page_sections
WHERE tenant_id = 'tenant_companionscpas'
  AND page_route = '/adopt'
  AND section_key = 'adopt_hero'
ON CONFLICT(id) DO UPDATE SET
  section_type = excluded.section_type,
  eyebrow = excluded.eyebrow,
  heading = excluded.heading,
  subheading = excluded.subheading,
  body = excluded.body,
  image_url = excluded.image_url,
  cta_label = excluded.cta_label,
  cta_href = excluded.cta_href,
  sort_order = excluded.sort_order,
  is_visible = excluded.is_visible,
  updated_at = datetime('now');

UPDATE cms_page_sections
SET section_type = 'text_image',
    eyebrow = (SELECT eyebrow FROM cms_page_sections WHERE id = 'sec_services_mission'),
    heading = (SELECT heading FROM cms_page_sections WHERE id = 'sec_services_mission'),
    subheading = NULL,
    body = (SELECT body FROM cms_page_sections WHERE id = 'sec_services_mission'),
    image_url = (SELECT image_url FROM cms_page_sections WHERE id = 'sec_services_mission'),
    cta_label = 'See Adoptable Dogs',
    cta_href = '#adoptable-dogs',
    updated_at = datetime('now')
WHERE id = 'sec_adopt_hero';

UPDATE cms_page_sections
SET is_visible = 0,
    updated_at = datetime('now')
WHERE id = 'sec_services_mission';
