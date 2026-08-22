-- Remote D1 schema baseline
-- Source: companionscpas
-- Exported UTC: 2026-08-22T22:15:30+00:00
-- Generated read-only from sqlite_master; review before applying.

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- TABLES

CREATE TABLE agentsam_eval_suites (
  id          TEXT PRIMARY KEY DEFAULT ('evs_' || lower(hex(randomblob(8)))),
  tenant_id   TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  name        TEXT NOT NULL,
  description TEXT,
  provider    TEXT,
  mode        TEXT DEFAULT 'auto',
  task_type   TEXT,
  is_active   INTEGER DEFAULT 1,
  run_count   INTEGER DEFAULT 0,
  last_run_at TEXT,
  created_by  TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  created_at_unix INTEGER DEFAULT (unixepoch())
);

COMMIT;
PRAGMA foreign_keys = ON;
