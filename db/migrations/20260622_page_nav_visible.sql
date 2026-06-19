-- Page nav visibility: hide from header/footer without removing from CMS
-- Run: npx wrangler d1 execute companionscpas --remote --file=db/migrations/20260622_page_nav_visible.sql

ALTER TABLE cms_pages ADD COLUMN nav_visible INTEGER DEFAULT 1;

UPDATE cms_pages
SET nav_visible = 0,
    updated_at = datetime('now')
WHERE tenant_id = 'tenant_companionscpas'
  AND route_path = '/services';

UPDATE cms_navigation_items
SET is_visible = 0,
    updated_at = datetime('now')
WHERE tenant_id = 'tenant_companionscpas'
  AND href = '/services';
