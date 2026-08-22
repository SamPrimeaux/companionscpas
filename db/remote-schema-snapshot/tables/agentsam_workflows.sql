-- Remote D1 schema baseline
-- Source: companionscpas
-- Exported UTC: 2026-08-22T22:15:30+00:00
-- Generated read-only from sqlite_master; review before applying.

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- TABLES

CREATE TABLE agentsam_workflows (
  id TEXT PRIMARY KEY DEFAULT ('wf_' || lower(hex(randomblob(8)))),
  tenant_id TEXT,
  workspace_id TEXT,
  workflow_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  workflow_type TEXT NOT NULL DEFAULT 'agentic',
  trigger_type TEXT NOT NULL DEFAULT 'manual',
  default_mode TEXT DEFAULT 'agent',
  default_task_type TEXT,
  risk_level TEXT DEFAULT 'low',
  requires_approval INTEGER DEFAULT 0,
  max_concurrent_nodes INTEGER DEFAULT 3,
  timeout_ms INTEGER DEFAULT 300000,
  quality_gate_json TEXT DEFAULT '{}',
  metadata_json TEXT DEFAULT '{}',
  is_active INTEGER DEFAULT 1,
  is_platform_global INTEGER NOT NULL DEFAULT 0,
  created_at_unix INTEGER DEFAULT (unixepoch()),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(workspace_id, workflow_key)
);

COMMIT;
PRAGMA foreign_keys = ON;
