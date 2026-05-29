-- ============================================================
-- MIGRATION 005 — CMS Publish Contract Normalization
-- CompanionsCPAS: D1 truth -> R2 artifacts -> KV cache
-- ============================================================

-- cms_publish_artifacts currently defaults to companionscpas-assets,
-- but the active Worker binding WEBSITE_ASSETS points to R2 bucket companionscpas.
-- Keep old rows intact; future rows should log the real bucket.
UPDATE cms_publish_artifacts
SET r2_bucket = 'companionscpas'
WHERE r2_bucket IS NULL
   OR r2_bucket = ''
   OR r2_bucket = 'companionscpas-assets';

-- Make existing publish jobs explicit.
UPDATE cms_publish_jobs
SET r2_prefix = COALESCE(
  r2_prefix,
  CASE
    WHEN page_id = 'page_home' THEN 'static/pages/home/'
    WHEN page_id = 'page_about' THEN 'static/pages/about/'
    WHEN page_id = 'page_adopt' THEN 'static/pages/adopt/'
    WHEN page_id = 'page_services' THEN 'static/pages/services/'
    WHEN page_id = 'page_donate' THEN 'static/pages/donate/'
    ELSE 'static/pages/'
  END
)
WHERE r2_prefix IS NULL OR r2_prefix = '';

-- Mark current public CMS pages as intended for the D1/R2/KV pipeline.
UPDATE cms_pages
SET settings_json = json_set(
  COALESCE(settings_json, '{}'),
  '$.runtime_contract', 'd1_to_r2_to_kv',
  '$.r2_bucket', 'companionscpas',
  '$.global_css_key', 'static/global/shared.css',
  '$.global_js_key', 'static/global/shared.js',
  '$.cache_key', 'page:' || route_path,
  '$.managed_by', 'agentsam_cms'
),
updated_at = datetime('now')
WHERE tenant_id = 'tenant_companionscpas'
  AND route_path IN ('/', '/about', '/adopt', '/services', '/donate');

-- Make active nav items explicit as primary nav truth for public shell.
UPDATE cms_navigation_items
SET nav_group = COALESCE(nav_group, 'primary'),
    is_visible = COALESCE(is_visible, 1),
    updated_at = datetime('now')
WHERE tenant_id = 'tenant_companionscpas';

-- Mark active theme rows as publishable to the current R2 bucket.
UPDATE cms_themes
SET r2_key = COALESCE(r2_key, 'cms/themes/' || theme_key || '/theme.css'),
    status = CASE WHEN is_active = 1 THEN 'published' ELSE status END,
    updated_at = datetime('now')
WHERE tenant_id = 'tenant_companionscpas';

