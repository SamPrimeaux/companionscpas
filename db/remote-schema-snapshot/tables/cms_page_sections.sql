-- Remote D1 schema baseline
-- Source: companionscpas
-- Exported UTC: 2026-08-22T22:15:30+00:00
-- Generated read-only from sqlite_master; review before applying.

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- TABLES

CREATE TABLE cms_page_sections (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  page_route TEXT NOT NULL,
  section_key TEXT NOT NULL,
  section_type TEXT DEFAULT 'content',
  eyebrow TEXT,
  heading TEXT,
  subheading TEXT,
  body TEXT,
  primary_asset_id TEXT,
  secondary_asset_id TEXT,
  cta_label TEXT,
  cta_href TEXT,
  sort_order INTEGER DEFAULT 50,
  is_visible INTEGER DEFAULT 1,
  config_json TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')), title TEXT, image_url TEXT, cta_action TEXT, cta_secondary_label TEXT, cta_secondary_href TEXT, cta_secondary_action TEXT, meta_json TEXT DEFAULT '{}', created_by TEXT, project_id TEXT DEFAULT 'proj_companionscpas', run_id TEXT, seeded_by_pipeline TEXT DEFAULT 'primetech_cms_asset_pipeline', deleted_at TEXT, restore_count INTEGER DEFAULT 0, last_restored_at TEXT,
  UNIQUE(tenant_id, page_route, section_key)
);

-- INDEXS

CREATE INDEX idx_cms_page_sections_deleted
  ON cms_page_sections (tenant_id, deleted_at);

CREATE INDEX idx_cms_sections_route ON cms_page_sections(tenant_id, page_route);

COMMIT;
PRAGMA foreign_keys = ON;
