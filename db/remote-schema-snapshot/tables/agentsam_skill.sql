-- Remote D1 schema baseline
-- Source: companionscpas
-- Exported UTC: 2026-08-22T22:15:30+00:00
-- Generated read-only from sqlite_master; review before applying.

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- TABLES

CREATE TABLE agentsam_skill (
  id                     TEXT PRIMARY KEY,
  tenant_id              TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  workspace_id           TEXT DEFAULT 'ws_companionscpas',
  user_id                TEXT NOT NULL,
  name                   TEXT NOT NULL,
  description            TEXT NOT NULL DEFAULT '',
  content_markdown       TEXT NOT NULL DEFAULT '',
  scope                  TEXT NOT NULL DEFAULT 'workspace',
  slash_trigger          TEXT,
  always_apply           INTEGER NOT NULL DEFAULT 0,
  task_types_json        TEXT NOT NULL DEFAULT '[]',
  default_model_key      TEXT,
  access_mode            TEXT NOT NULL DEFAULT 'read_write',
  tags_json              TEXT NOT NULL DEFAULT '[]',
  metadata_json          TEXT NOT NULL DEFAULT '{}',
  token_estimate         INTEGER NOT NULL DEFAULT 0,
  invocation_count       INTEGER NOT NULL DEFAULT 0,
  last_invoked_at        TEXT,
  version                INTEGER NOT NULL DEFAULT 1,
  is_active              INTEGER NOT NULL DEFAULT 1,
  sort_order             INTEGER NOT NULL DEFAULT 0,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at             TEXT NOT NULL DEFAULT (datetime('now'))
);

COMMIT;
PRAGMA foreign_keys = ON;
