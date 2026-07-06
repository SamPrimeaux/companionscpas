-- Apply plum_glass public header theme site-wide (revert per route via cms_pages.theme)
UPDATE cms_pages
SET theme = 'plum_glass',
    updated_at = datetime('now')
WHERE tenant_id = 'tenant_companionscpas'
  AND route_path IN ('/', '/about', '/adopt', '/community', '/contact', '/donate', '/services');
