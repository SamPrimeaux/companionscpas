-- Remote D1 schema baseline
-- Source: companionscpas
-- Exported UTC: 2026-08-22T22:15:30+00:00
-- Generated read-only from sqlite_master; review before applying.

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- TABLES

CREATE TABLE cms_publish_jobs (
  id           TEXT PRIMARY KEY DEFAULT ('pub_' || lower(hex(randomblob(8)))),
  tenant_id    TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  page_id      TEXT,
  job_type     TEXT NOT NULL DEFAULT 'page' CHECK(job_type IN ('page','theme','nav','full_site')),
  status       TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','running','done','failed','scheduled')),
  scheduled_at TEXT,
  started_at   TEXT,
  completed_at TEXT,
  triggered_by TEXT,
  artifacts_json TEXT DEFAULT '[]',
  error_message TEXT,
  r2_prefix    TEXT,
  version_id   TEXT,
  created_at   TEXT DEFAULT (datetime('now')),
  updated_at   TEXT DEFAULT (datetime('now'))
);

-- INDEXS

CREATE INDEX idx_cms_publish_jobs_page   ON cms_publish_jobs(page_id, status);

COMMIT;
PRAGMA foreign_keys = ON;
