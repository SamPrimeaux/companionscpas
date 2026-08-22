-- Remote D1 schema baseline
-- Source: companionscpas
-- Exported UTC: 2026-08-22T22:15:30+00:00
-- Generated read-only from sqlite_master; review before applying.

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- TABLES

CREATE TABLE agentsam_intent_rules (
  id               TEXT PRIMARY KEY DEFAULT ('ir_' || lower(hex(randomblob(6)))),
  tenant_id        TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  intent_pattern   TEXT NOT NULL,
  task_type        TEXT NOT NULL,
  required_tools   TEXT NOT NULL DEFAULT '[]',
  optional_tools   TEXT NOT NULL DEFAULT '[]',
  min_model_tier   TEXT NOT NULL DEFAULT 'standard',
  force_tool_model INTEGER NOT NULL DEFAULT 0,
  description      TEXT,
  is_active        INTEGER NOT NULL DEFAULT 1,
  priority         INTEGER NOT NULL DEFAULT 50,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

COMMIT;
PRAGMA foreign_keys = ON;
