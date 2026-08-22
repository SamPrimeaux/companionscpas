-- Remote D1 schema baseline
-- Source: companionscpas
-- Exported UTC: 2026-08-22T22:15:30+00:00
-- Generated read-only from sqlite_master; review before applying.

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- TABLES

CREATE TABLE cms_revisions (
  id           TEXT PRIMARY KEY DEFAULT ('rev_' || lower(hex(randomblob(8)))),
  tenant_id    TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  entity_type  TEXT NOT NULL CHECK(entity_type IN ('page','section','block','theme','nav','brand')),
  entity_id    TEXT NOT NULL,
  page_id      TEXT,
  change_type  TEXT NOT NULL CHECK(change_type IN ('create','update','delete','reorder','publish','restore')),
  field_changed TEXT,
  before_json  TEXT,
  after_json   TEXT,
  summary      TEXT,
  created_by   TEXT,
  created_at   TEXT DEFAULT (datetime('now'))
);

-- INDEXS

CREATE INDEX idx_cms_revisions_entity    ON cms_revisions(entity_type, entity_id);

CREATE INDEX idx_cms_revisions_page      ON cms_revisions(page_id, created_at);

COMMIT;
PRAGMA foreign_keys = ON;
