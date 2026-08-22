-- Remote D1 schema baseline
-- Source: companionscpas
-- Exported UTC: 2026-08-22T22:15:30+00:00
-- Generated read-only from sqlite_master; review before applying.

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- TABLES

CREATE TABLE agentsam_agent_run (
  id               TEXT PRIMARY KEY,
  tenant_id        TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  workspace_id     TEXT DEFAULT 'ws_companionscpas',
  user_id          TEXT NOT NULL,
  conversation_id  TEXT,
  session_id       TEXT,
  status           TEXT NOT NULL DEFAULT 'queued',
  trigger          TEXT,
  task_type        TEXT,
  mode             TEXT DEFAULT 'ask',
  model_key        TEXT DEFAULT NULL,
  model_catalog_id TEXT DEFAULT NULL,
  routing_arm_id   TEXT,
  chain_root_id    TEXT,
  idempotency_key  TEXT,
  error_message    TEXT,
  input_tokens     INTEGER DEFAULT 0,
  output_tokens    INTEGER DEFAULT 0,
  cached_input_tokens INTEGER DEFAULT 0,
  reasoning_tokens INTEGER DEFAULT 0,
  total_tokens     INTEGER GENERATED ALWAYS AS (COALESCE(input_tokens,0) + COALESCE(output_tokens,0)) VIRTUAL,
  latency_ms       INTEGER DEFAULT NULL,
  cost_usd         REAL DEFAULT 0,
  quality_score    REAL DEFAULT NULL,
  timed_out        INTEGER DEFAULT 0,
  sla_breach       INTEGER DEFAULT 0,
  timeout_ms       INTEGER DEFAULT 30000,
  command_id       TEXT REFERENCES agentsam_commands(id),
  started_at       TEXT,
  completed_at     TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  created_at_unix  INTEGER DEFAULT (unixepoch())
);

COMMIT;
PRAGMA foreign_keys = ON;
