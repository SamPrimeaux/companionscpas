-- Copy Virtual Wet Dog entry + vote gallery onto homepage under hero.
-- Leaves /donate sections intact (deep links + fundraising page stay valid).
-- Run: npx wrangler d1 execute companionscpas --remote --file=db/migrations/20260720_home_wetdog_under_hero.sql

INSERT INTO cms_page_sections (
  id, tenant_id, page_route, section_key, section_type,
  eyebrow, heading, subheading, body,
  primary_asset_id, secondary_asset_id,
  cta_label, cta_href, cta_secondary_label, cta_secondary_href,
  sort_order, is_visible, config_json, title, image_url,
  created_at, updated_at, deleted_at, restore_count
)
SELECT
  'sec_home_wetdog_entry',
  tenant_id,
  '/',
  'home_wetdog_entry',
  section_type,
  eyebrow,
  heading,
  subheading,
  body,
  primary_asset_id,
  secondary_asset_id,
  cta_label,
  cta_href,
  cta_secondary_label,
  'https://companionsofcaddo.org/#campaign-entry-home_wetdog_entry',
  15,
  1,
  json_set(
    COALESCE(config_json, '{}'),
    '$.share_url',
    'https://companionsofcaddo.org/#campaign-entry-home_wetdog_entry'
  ),
  title,
  image_url,
  datetime('now'),
  datetime('now'),
  NULL,
  0
FROM cms_page_sections
WHERE tenant_id = 'tenant_companionscpas'
  AND page_route = '/donate'
  AND section_key = 'text_image_donate_1784225238860'
  AND (deleted_at IS NULL OR deleted_at = '')
ON CONFLICT(tenant_id, page_route, section_key) DO UPDATE SET
  section_type = excluded.section_type,
  eyebrow = excluded.eyebrow,
  heading = excluded.heading,
  subheading = excluded.subheading,
  body = excluded.body,
  image_url = excluded.image_url,
  cta_label = excluded.cta_label,
  cta_href = excluded.cta_href,
  cta_secondary_label = excluded.cta_secondary_label,
  cta_secondary_href = excluded.cta_secondary_href,
  sort_order = excluded.sort_order,
  is_visible = 1,
  config_json = excluded.config_json,
  deleted_at = NULL,
  updated_at = datetime('now');

INSERT INTO cms_page_sections (
  id, tenant_id, page_route, section_key, section_type,
  eyebrow, heading, subheading, body,
  primary_asset_id, secondary_asset_id,
  cta_label, cta_href, cta_secondary_label, cta_secondary_href,
  sort_order, is_visible, config_json, title, image_url,
  created_at, updated_at, deleted_at, restore_count
)
SELECT
  'sec_home_wetdog_gallery',
  tenant_id,
  '/',
  'home_wetdog_gallery',
  section_type,
  eyebrow,
  heading,
  subheading,
  body,
  primary_asset_id,
  secondary_asset_id,
  cta_label,
  cta_href,
  cta_secondary_label,
  cta_secondary_href,
  18,
  1,
  config_json,
  title,
  image_url,
  datetime('now'),
  datetime('now'),
  NULL,
  0
FROM cms_page_sections
WHERE tenant_id = 'tenant_companionscpas'
  AND page_route = '/donate'
  AND section_key = 'donate_wetdog'
  AND (deleted_at IS NULL OR deleted_at = '')
ON CONFLICT(tenant_id, page_route, section_key) DO UPDATE SET
  section_type = excluded.section_type,
  eyebrow = excluded.eyebrow,
  heading = excluded.heading,
  subheading = excluded.subheading,
  body = excluded.body,
  image_url = excluded.image_url,
  cta_label = excluded.cta_label,
  cta_href = excluded.cta_href,
  cta_secondary_label = excluded.cta_secondary_label,
  cta_secondary_href = excluded.cta_secondary_href,
  sort_order = excluded.sort_order,
  is_visible = 1,
  config_json = excluded.config_json,
  deleted_at = NULL,
  updated_at = datetime('now');
