-- Remote D1 schema baseline
-- Source: companionscpas
-- Exported UTC: 2026-08-22T22:15:30+00:00
-- Generated read-only from sqlite_master; review before applying.

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- TABLES

CREATE TABLE agentsam_dev_runs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  user_id TEXT,
  bridge_key TEXT,
  command_key TEXT,
  requested_command TEXT,
  cwd TEXT,
  status TEXT DEFAULT 'queued',
  stdout TEXT,
  stderr TEXT,
  exit_code INTEGER,
  started_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT
);

COMMIT;
PRAGMA foreign_keys = ON;
