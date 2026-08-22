-- Remote D1 schema baseline
-- Source: companionscpas
-- Exported UTC: 2026-08-22T22:15:30+00:00
-- Generated read-only from sqlite_master; review before applying.

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- TABLES

CREATE TABLE cms_navigation_items (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  label TEXT NOT NULL,
  href TEXT NOT NULL,
  sort_order INTEGER DEFAULT 50,
  is_visible INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
, nav_group TEXT DEFAULT 'primary', parent_id TEXT, is_external INTEGER DEFAULT 0, open_in_new_tab INTEGER DEFAULT 0, icon TEXT, badge_label TEXT, css_class TEXT, requires_auth INTEGER DEFAULT 0, created_by TEXT DEFAULT 'Sam Primeaux');

COMMIT;
PRAGMA foreign_keys = ON;
