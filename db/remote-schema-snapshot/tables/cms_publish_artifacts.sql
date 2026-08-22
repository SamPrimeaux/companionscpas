-- Remote D1 schema baseline
-- Source: companionscpas
-- Exported UTC: 2026-08-22T22:15:30+00:00
-- Generated read-only from sqlite_master; review before applying.

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- TABLES

CREATE TABLE cms_publish_artifacts (
  id           TEXT PRIMARY KEY DEFAULT ('art_' || lower(hex(randomblob(8)))),
  tenant_id    TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  job_id       TEXT NOT NULL,
  page_id      TEXT,
  artifact_type TEXT NOT NULL DEFAULT 'html' CHECK(artifact_type IN ('html','css','json','image','manifest')),
  r2_key       TEXT NOT NULL,
  r2_bucket    TEXT NOT NULL DEFAULT 'companionscpas-assets',
  content_hash TEXT,
  size_bytes   INTEGER,
  version      INTEGER DEFAULT 1,
  is_current   INTEGER DEFAULT 1,
  created_at   TEXT DEFAULT (datetime('now'))
);

COMMIT;
PRAGMA foreign_keys = ON;
