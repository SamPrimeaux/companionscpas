-- Full dynamic header/footer: chrome fields on cms_pages (SSOT).
-- No hardcoded route lists for membership/placement after cutover.

ALTER TABLE cms_pages ADD COLUMN nav_label TEXT;
ALTER TABLE cms_pages ADD COLUMN nav_placement TEXT DEFAULT 'more';

-- Backfill locked IA (then CMS owns these values)
UPDATE cms_pages SET nav_label = 'Home',     nav_placement = 'primary', nav_visible = 1, sort_order = 10 WHERE tenant_id = 'tenant_companionscpas' AND route_path = '/';
UPDATE cms_pages SET nav_label = 'Foster',   nav_placement = 'primary', nav_visible = 1, sort_order = 20 WHERE tenant_id = 'tenant_companionscpas' AND route_path = '/fosters';
UPDATE cms_pages SET nav_label = 'Adopt',    nav_placement = 'primary', nav_visible = 1, sort_order = 30 WHERE tenant_id = 'tenant_companionscpas' AND route_path = '/adopt';
UPDATE cms_pages SET nav_label = 'About Us', nav_placement = 'primary', nav_visible = 1, sort_order = 40 WHERE tenant_id = 'tenant_companionscpas' AND route_path = '/about';
UPDATE cms_pages SET nav_label = 'Events',   nav_placement = 'more',    nav_visible = 1, sort_order = 50 WHERE tenant_id = 'tenant_companionscpas' AND route_path = '/events';
UPDATE cms_pages SET nav_label = 'Contact',  nav_placement = 'more',    nav_visible = 1, sort_order = 60 WHERE tenant_id = 'tenant_companionscpas' AND route_path = '/contact';
UPDATE cms_pages SET nav_label = 'Donate',   nav_placement = 'cta',     nav_visible = 1, sort_order = 70 WHERE tenant_id = 'tenant_companionscpas' AND route_path = '/donate';
UPDATE cms_pages SET nav_label = 'Community', nav_placement = 'none',   nav_visible = 0, sort_order = 90 WHERE tenant_id = 'tenant_companionscpas' AND route_path = '/community';

-- Any other pages: keep visible flag; default placement more; label from title short
UPDATE cms_pages
SET nav_placement = COALESCE(NULLIF(TRIM(nav_placement), ''), 'more'),
    nav_label = COALESCE(
      NULLIF(TRIM(nav_label), ''),
      CASE
        WHEN instr(title, '—') > 0 THEN trim(substr(title, 1, instr(title, '—') - 1))
        WHEN instr(title, '-') > 0 THEN trim(substr(title, 1, instr(title, '-') - 1))
        ELSE title
      END
    )
WHERE tenant_id = 'tenant_companionscpas'
  AND (nav_label IS NULL OR trim(nav_label) = '' OR nav_placement IS NULL OR trim(nav_placement) = '');
