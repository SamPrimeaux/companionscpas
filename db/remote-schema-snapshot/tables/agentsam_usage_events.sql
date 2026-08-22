-- Remote D1 schema baseline
-- Source: companionscpas
-- Exported UTC: 2026-08-22T22:15:30+00:00
-- Generated read-only from sqlite_master; review before applying.

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- TABLES

CREATE TABLE agentsam_usage_events (
  id               TEXT PRIMARY KEY DEFAULT ('ue_' || lower(hex(randomblob(8)))),
  tenant_id        TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  workspace_id     TEXT NOT NULL DEFAULT 'ws_companionscpas',
  user_id          TEXT,
  session_id       TEXT,
  agent_run_id     TEXT REFERENCES agentsam_agent_run(id) ON DELETE SET NULL,
  routing_arm_id   TEXT REFERENCES agentsam_routing_arms(id) ON DELETE SET NULL,
  provider         TEXT NOT NULL,
  model_key        TEXT NOT NULL,
  task_type        TEXT,
  mode             TEXT,
  tokens_in        INTEGER NOT NULL DEFAULT 0,
  tokens_out       INTEGER NOT NULL DEFAULT 0,
  total_tokens     INTEGER NOT NULL DEFAULT 0,
  cost_usd         REAL NOT NULL DEFAULT 0,
  latency_ms       INTEGER DEFAULT NULL,
  status           TEXT NOT NULL DEFAULT 'ok',
  succeeded        INTEGER DEFAULT 1,
  event_type       TEXT,
  reason           TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  created_at_unix  INTEGER NOT NULL DEFAULT (unixepoch())
);

COMMIT;
PRAGMA foreign_keys = ON;
