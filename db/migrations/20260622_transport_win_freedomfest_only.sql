-- Transport win: Freedom Fest graphic only (replace goinhome photo)
-- Run: npx wrangler d1 execute companionscpas --remote --file=db/migrations/20260622_transport_win_freedomfest_only.sql

UPDATE cms_page_sections
SET image_url = 'https://assets.companionsofcaddo.org/media/campaign/freedomfest.webp',
    config_json = '{"cta_action":"donate","image_alt":"2026 Freedom Fest: Red, White & Rescued"}',
    updated_at = datetime('now')
WHERE tenant_id = 'tenant_companionscpas'
  AND page_route = '/'
  AND section_key = 'transport_win';
