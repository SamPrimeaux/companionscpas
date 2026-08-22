-- Remote D1 schema baseline
-- Source: companionscpas
-- Exported UTC: 2026-08-22T22:15:30+00:00
-- Generated read-only from sqlite_master; review before applying.

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- TABLES

CREATE TABLE cms_navigation_menus (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  project_id TEXT NOT NULL,
  project_slug TEXT,
  tenant_id TEXT,
  menu_name TEXT NOT NULL,
  menu_type TEXT DEFAULT 'site',
  menu_items TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  r2_bucket TEXT,
  r2_key TEXT,
  r2_url TEXT,
  s3_endpoint TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(project_id, menu_name)
);

COMMIT;
PRAGMA foreign_keys = ON;
