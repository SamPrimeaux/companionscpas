-- Remote D1 schema baseline
-- Source: companionscpas
-- Exported UTC: 2026-08-22T22:15:30+00:00
-- Generated read-only from sqlite_master; review before applying.

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- TABLES

CREATE TABLE cms_brand_settings (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  brand_name TEXT NOT NULL DEFAULT 'Companions of CPAS',
  logo_url TEXT DEFAULT '/logo.png',
  primary_color TEXT DEFAULT '#ee2336',
  secondary_color TEXT DEFAULT '#7c3aed',
  accent_color TEXT DEFAULT '#f59e0b',
  config_json TEXT DEFAULT '{}',
  updated_at TEXT DEFAULT (datetime('now'))
, site_domain TEXT, logo_light_url TEXT, logo_dark_url TEXT, favicon_url TEXT, footer_logo_light_url TEXT, footer_logo_dark_url TEXT, developer_logo_light_url TEXT, developer_logo_dark_url TEXT, navigation_json TEXT DEFAULT '[]', footer_json TEXT DEFAULT '{}', socials_json TEXT DEFAULT '{}', organization_json TEXT DEFAULT '{}', seo_defaults_json TEXT DEFAULT '{}', integrations_json TEXT DEFAULT '{}', header_json TEXT DEFAULT '{}', logo_width INTEGER DEFAULT 140, logo_height INTEGER DEFAULT NULL, footer_logo_width INTEGER DEFAULT 120, footer_logo_height INTEGER DEFAULT NULL);

COMMIT;
PRAGMA foreign_keys = ON;
