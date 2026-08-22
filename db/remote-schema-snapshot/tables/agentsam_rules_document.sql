-- Remote D1 schema baseline
-- Source: companionscpas
-- Exported UTC: 2026-08-22T22:15:30+00:00
-- Generated read-only from sqlite_master; review before applying.

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- TABLES

CREATE TABLE agentsam_rules_document (
  id           TEXT PRIMARY KEY,
  user_id      TEXT,
  workspace_id TEXT,
  title        TEXT NOT NULL DEFAULT 'default',
  body_markdown TEXT NOT NULL,
  version      INTEGER NOT NULL DEFAULT 1,
  is_active    INTEGER NOT NULL DEFAULT 1,
  apply_mode   TEXT NOT NULL DEFAULT 'always',
  globs        TEXT,
  source       TEXT NOT NULL DEFAULT 'dashboard',
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

COMMIT;
PRAGMA foreign_keys = ON;
