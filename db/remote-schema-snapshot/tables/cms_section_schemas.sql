-- Remote D1 schema baseline
-- Source: companionscpas
-- Exported UTC: 2026-08-22T22:15:30+00:00
-- Generated read-only from sqlite_master; review before applying.

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- TABLES

CREATE TABLE cms_section_schemas (
  id                TEXT PRIMARY KEY DEFAULT ('schema_' || lower(hex(randomblob(6)))),
  tenant_id         TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  section_type      TEXT NOT NULL UNIQUE,
  label             TEXT NOT NULL,
  category          TEXT NOT NULL DEFAULT 'content',
  description       TEXT,
  preview_image_url TEXT,
  schema_json       TEXT NOT NULL DEFAULT '{}',
  default_json      TEXT NOT NULL DEFAULT '{}',
  max_per_page      INTEGER,
  is_active         INTEGER NOT NULL DEFAULT 1,
  sort_order        INTEGER NOT NULL DEFAULT 50,
  created_at        TEXT DEFAULT (datetime('now')),
  updated_at        TEXT DEFAULT (datetime('now'))
);

COMMIT;
PRAGMA foreign_keys = ON;
