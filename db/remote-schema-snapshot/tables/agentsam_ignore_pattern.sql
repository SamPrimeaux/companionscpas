-- Remote D1 schema baseline
-- Source: companionscpas
-- Exported UTC: 2026-08-22T22:15:30+00:00
-- Generated read-only from sqlite_master; review before applying.

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- TABLES

CREATE TABLE agentsam_ignore_pattern (
  id           TEXT PRIMARY KEY,
  user_id      TEXT,
  workspace_id TEXT,
  pattern      TEXT NOT NULL,
  is_negation  INTEGER NOT NULL DEFAULT 0,
  order_index  INTEGER NOT NULL DEFAULT 0,
  source       TEXT NOT NULL DEFAULT 'db',
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

COMMIT;
PRAGMA foreign_keys = ON;
