-- Remote D1 schema baseline
-- Source: companionscpas
-- Exported UTC: 2026-08-22T22:15:30+00:00
-- Generated read-only from sqlite_master; review before applying.

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- TABLES

CREATE TABLE agentsam_workflow_handlers (
  handler_key TEXT PRIMARY KEY,
  node_type TEXT NOT NULL,
  executor_kind TEXT NOT NULL CHECK(executor_kind IN ('d1_sql','d1_write','agent_llm','mcp_tool','builtin_tool','http','ui_emit','eval','terminal','approval','passthrough')),
  title TEXT,
  description TEXT,
  handler_config_json TEXT NOT NULL DEFAULT '{}',
  input_schema_json TEXT NOT NULL DEFAULT '{}',
  quality_gate_json TEXT NOT NULL DEFAULT '{}',
  risk_level TEXT NOT NULL DEFAULT 'low',
  requires_approval INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  tenant_id TEXT,
  workspace_id TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

COMMIT;
PRAGMA foreign_keys = ON;
