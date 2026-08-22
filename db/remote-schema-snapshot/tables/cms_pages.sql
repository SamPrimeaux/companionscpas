-- Remote D1 schema baseline
-- Source: companionscpas
-- Exported UTC: 2026-08-22T22:15:30+00:00
-- Generated read-only from sqlite_master; review before applying.

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- TABLES

CREATE TABLE cms_pages (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  route_path TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  seo_title TEXT,
  meta_description TEXT,
  og_image_url TEXT,
  published_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')), site_id TEXT, parent_page_id TEXT, page_type TEXT DEFAULT 'standard', template_key TEXT DEFAULT 'default', sort_order INTEGER DEFAULT 50, is_homepage INTEGER DEFAULT 0, show_header INTEGER DEFAULT 1, show_footer INTEGER DEFAULT 1, requires_auth INTEGER DEFAULT 0, canonical_url TEXT, robots TEXT DEFAULT 'index,follow', seo_json TEXT DEFAULT '{}', analytics_json TEXT DEFAULT '{}', settings_json TEXT DEFAULT '{}', published_version_id TEXT, draft_version_id TEXT, created_by TEXT, updated_by TEXT, published_by TEXT, archived_at TEXT, theme_id TEXT, project_id TEXT DEFAULT 'proj_companionscpas', run_id TEXT, theme TEXT NOT NULL DEFAULT 'dark', nav_visible INTEGER DEFAULT 1, nav_label TEXT, nav_placement TEXT DEFAULT 'more',
  UNIQUE(tenant_id, route_path)
);

-- INDEXS

CREATE INDEX idx_cms_pages_parent
ON cms_pages (parent_page_id);

CREATE INDEX idx_cms_pages_site_status
ON cms_pages (site_id, status);

CREATE INDEX idx_cms_pages_tenant_slug
ON cms_pages (tenant_id, slug);

CREATE INDEX idx_cms_pages_tenant_status
ON cms_pages (tenant_id, status);

COMMIT;
PRAGMA foreign_keys = ON;
