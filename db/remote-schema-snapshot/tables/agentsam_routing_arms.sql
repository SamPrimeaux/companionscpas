-- Remote D1 schema baseline
-- Source: companionscpas
-- Exported UTC: 2026-08-22T22:15:30+00:00
-- Generated read-only from sqlite_master; review before applying.

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- TABLES

CREATE TABLE agentsam_routing_arms (
  id                    TEXT PRIMARY KEY DEFAULT ('ra_' || lower(hex(randomblob(8)))),
  workspace_id          TEXT NOT NULL DEFAULT 'ws_companionscpas',
  task_type             TEXT NOT NULL,
  mode                  TEXT NOT NULL,
  model_key             TEXT NOT NULL,
  provider              TEXT NOT NULL,
  model_catalog_id      TEXT REFERENCES agentsam_model_catalog(id) ON DELETE SET NULL,
  success_alpha         REAL NOT NULL DEFAULT 1.0,
  success_beta          REAL NOT NULL DEFAULT 1.0,
  cost_n                INTEGER NOT NULL DEFAULT 0,
  cost_mean             REAL NOT NULL DEFAULT 0,
  latency_n             INTEGER NOT NULL DEFAULT 0,
  latency_mean          REAL NOT NULL DEFAULT 0,
  avg_quality_score     REAL DEFAULT 0,
  quality_n             INTEGER DEFAULT 0,
  total_executions      INTEGER DEFAULT 0,
  is_eligible           INTEGER NOT NULL DEFAULT 1,
  is_paused             INTEGER NOT NULL DEFAULT 0,
  pause_reason          TEXT,
  budget_exhausted      INTEGER DEFAULT 0,
  max_cost_per_call_usd REAL DEFAULT NULL,
  fallback_model_key    TEXT,
  priority              INTEGER DEFAULT 50,
  supports_tools        INTEGER DEFAULT 1,
  updated_at            INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(workspace_id, task_type, mode, model_key)
);

COMMIT;
PRAGMA foreign_keys = ON;
