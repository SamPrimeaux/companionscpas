-- Add Freedom Fest campaign image to homepage transport win section
-- Run: npx wrangler d1 execute companionscpas --remote --file=db/migrations/20260622_home_transport_win_images.sql

UPDATE cms_page_sections
SET config_json = json_set(
  COALESCE(NULLIF(config_json, ''), '{}'),
  '$.secondary_image_url', 'https://assets.companionsofcaddo.org/media/campaign/freedomfest.webp',
  '$.secondary_image_alt', '2026 Freedom Fest: Red, White & Rescued'
),
updated_at = datetime('now')
WHERE tenant_id = 'tenant_companionscpas'
  AND page_route = '/'
  AND section_key = 'transport_win';
