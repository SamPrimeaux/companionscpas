-- Remote D1 schema baseline
-- Source: companionscpas
-- Exported UTC: 2026-08-22T22:15:30+00:00
-- Generated read-only from sqlite_master; review before applying.

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- TABLES

CREATE TABLE cms_page_content_blocks (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  page_route TEXT NOT NULL,
  section_key TEXT NOT NULL,
  block_key TEXT NOT NULL,
  block_type TEXT DEFAULT 'text',
  title TEXT,
  body TEXT,
  asset_id TEXT,
  href TEXT,
  sort_order INTEGER DEFAULT 50,
  config_json TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')), eyebrow TEXT, subtitle TEXT, image_url TEXT, alt_text TEXT, action_label TEXT, action_type TEXT, action_value TEXT, is_visible INTEGER DEFAULT 1,
  UNIQUE(tenant_id, page_route, section_key, block_key)
);

-- INDEXS

CREATE INDEX idx_cms_blocks_section ON cms_page_content_blocks(tenant_id, page_route, section_key);

COMMIT;
PRAGMA foreign_keys = ON;
