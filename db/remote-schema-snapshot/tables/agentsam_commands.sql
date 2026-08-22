-- Remote D1 schema baseline
-- Source: companionscpas
-- Exported UTC: 2026-08-22T22:15:30+00:00
-- Generated read-only from sqlite_master; review before applying.

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- TABLES

CREATE TABLE agentsam_commands (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  command_key TEXT NOT NULL UNIQUE,
  command_name TEXT NOT NULL,
  command_category TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  prompt_template TEXT,
  input_schema TEXT DEFAULT '{}',
  output_schema TEXT DEFAULT '{}',
  allowed_roles TEXT DEFAULT '["owner","developer","admin"]',
  allowed_modes TEXT DEFAULT '["ask","plan","agent","debug"]',
  provider_strategy TEXT DEFAULT 'auto',
  default_model TEXT,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  safety_level TEXT NOT NULL DEFAULT 'standard',
  sort_order INTEGER DEFAULT 50,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- INDEXS

CREATE INDEX idx_agentsam_commands_tenant ON agentsam_commands(tenant_id);

COMMIT;
PRAGMA foreign_keys = ON;
