-- Remote D1 schema baseline
-- Source: companionscpas
-- Exported UTC: 2026-08-22T22:15:30+00:00
-- Generated read-only from sqlite_master; review before applying.

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- TABLES

CREATE TABLE agentsam_tools (
  id                TEXT PRIMARY KEY DEFAULT ('tool_' || lower(hex(randomblob(8)))),
  tenant_id         TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  tool_key          TEXT NOT NULL UNIQUE,
  tool_name         TEXT NOT NULL,
  category          TEXT NOT NULL,
  description       TEXT NOT NULL,
  function_schema   TEXT NOT NULL DEFAULT '{}',
  is_enabled        INTEGER NOT NULL DEFAULT 1,
  requires_approval INTEGER NOT NULL DEFAULT 0,
  allowed_roles     TEXT NOT NULL DEFAULT '["owner","developer","admin"]',
  min_model_tier    TEXT NOT NULL DEFAULT 'standard',
  usage_count       INTEGER NOT NULL DEFAULT 0,
  last_used_at      TEXT,
  sort_order        INTEGER NOT NULL DEFAULT 50,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

COMMIT;
PRAGMA foreign_keys = ON;
