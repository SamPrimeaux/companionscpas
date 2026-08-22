-- Remote D1 schema baseline
-- Source: companionscpas
-- Exported UTC: 2026-08-22T22:15:30+00:00
-- Generated read-only from sqlite_master; review before applying.

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- TABLES

CREATE TABLE agentsam_workflow_runs (
  id TEXT PRIMARY KEY DEFAULT ('wrun_' || lower(hex(randomblob(8)))),
  workflow_id TEXT REFERENCES agentsam_workflows(id) ON DELETE CASCADE,
  workflow_key TEXT,
  display_name TEXT,
  tenant_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  user_id TEXT,
  session_id TEXT,
  trigger_type TEXT NOT NULL DEFAULT 'manual'
    CHECK(trigger_type IN ('manual','agent','scheduled','api','cicd')),
  status TEXT NOT NULL DEFAULT 'running'
    CHECK(status IN ('running','completed','failed','cancelled','timeout')),
  input_json TEXT NOT NULL DEFAULT '{}',
  output_json TEXT NOT NULL DEFAULT '{}',
  step_results_json TEXT NOT NULL DEFAULT '[]',
  steps_completed INTEGER NOT NULL DEFAULT 0,
  steps_total INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  model_used TEXT,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd REAL NOT NULL DEFAULT 0,
  duration_ms INTEGER,
  environment TEXT NOT NULL DEFAULT 'production',
  git_commit_sha TEXT,
  git_branch TEXT DEFAULT 'main',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  started_at INTEGER NOT NULL DEFAULT (unixepoch()),
  completed_at INTEGER,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), project_id TEXT, run_group_id TEXT, d1_auth_user_id TEXT, user_email TEXT, parent_run_id TEXT DEFAULT NULL, retry_of_run_id TEXT DEFAULT NULL, approval_id TEXT DEFAULT NULL, retry_count INTEGER NOT NULL DEFAULT 0, graph_mode INTEGER DEFAULT 0, current_node_key TEXT DEFAULT NULL, max_runtime_ms INTEGER DEFAULT 600000, max_cost_usd REAL DEFAULT 0.10, max_total_tokens INTEGER DEFAULT 50000, heartbeat_at INTEGER DEFAULT NULL, kill_reason TEXT DEFAULT NULL, run_mode TEXT DEFAULT 'seed' CHECK(run_mode IN ('seed','update')), plan_id TEXT, task_id TEXT, source_tool TEXT, supabase_run_id TEXT, supabase_sync_status TEXT NOT NULL DEFAULT 'pending', supabase_synced_at TEXT, supabase_sync_error TEXT, supabase_sync_attempts INTEGER NOT NULL DEFAULT 0, created_at_unix INTEGER DEFAULT (unixepoch()),
  CHECK(length(trim(tenant_id)) > 0),
  CHECK(length(trim(workspace_id)) > 0)
);

COMMIT;
PRAGMA foreign_keys = ON;
