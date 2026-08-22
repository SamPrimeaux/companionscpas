-- Remote D1 schema baseline
-- Source: companionscpas
-- Exported UTC: 2026-08-22T22:15:30+00:00
-- Generated read-only from sqlite_master; review before applying.

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- TABLES

CREATE TABLE cms_themes (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  theme_key TEXT NOT NULL UNIQUE,
  theme_name TEXT NOT NULL,
  description TEXT,
  mode TEXT DEFAULT 'dark',
  is_active INTEGER DEFAULT 0,
  tokens_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
, version TEXT DEFAULT '1.0.0', status TEXT DEFAULT 'draft', brand_json TEXT DEFAULT '{}', color_tokens_json TEXT DEFAULT '{}', typography_tokens_json TEXT DEFAULT '{}', spacing_tokens_json TEXT DEFAULT '{}', radius_tokens_json TEXT DEFAULT '{}', shadow_tokens_json TEXT DEFAULT '{}', motion_tokens_json TEXT DEFAULT '{}', component_tokens_json TEXT DEFAULT '{}', layout_tokens_json TEXT DEFAULT '{}', light_tokens_json TEXT DEFAULT '{}', dark_tokens_json TEXT DEFAULT '{}', page_overrides_json TEXT DEFAULT '{}', css_vars_json TEXT DEFAULT '{}', custom_css TEXT, preview_image_url TEXT, r2_key TEXT, published_at TEXT, created_by TEXT DEFAULT 'agentsam', updated_by TEXT DEFAULT 'agentsam', asset_tokens_json TEXT DEFAULT '{}');

-- INDEXS

CREATE INDEX idx_cms_themes_key
ON cms_themes(theme_key);

CREATE INDEX idx_cms_themes_status
ON cms_themes(status);

CREATE INDEX idx_cms_themes_tenant_active
ON cms_themes(tenant_id, is_active);

COMMIT;
PRAGMA foreign_keys = ON;
