-- Remote D1 schema baseline
-- Source: companionscpas
-- Exported UTC: 2026-08-22T22:15:30+00:00
-- Generated read-only from sqlite_master; review before applying.

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- TABLES

CREATE TABLE cms_page_versions (
  id           TEXT PRIMARY KEY DEFAULT ('ver_' || lower(hex(randomblob(8)))),
  tenant_id    TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  page_id      TEXT NOT NULL,
  version_num  INTEGER NOT NULL DEFAULT 1,
  status       TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),
  snapshot_json TEXT NOT NULL DEFAULT '{}',
  sections_json TEXT NOT NULL DEFAULT '[]',
  theme_snapshot_json TEXT DEFAULT '{}',
  published_at TEXT,
  created_by   TEXT,
  created_at   TEXT DEFAULT (datetime('now'))
);

-- INDEXS

CREATE INDEX idx_cms_page_versions_page  ON cms_page_versions(page_id, version_num);

COMMIT;
PRAGMA foreign_keys = ON;
