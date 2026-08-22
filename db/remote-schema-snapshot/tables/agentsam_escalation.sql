-- Remote D1 schema baseline
-- Source: companionscpas
-- Exported UTC: 2026-08-22T22:15:30+00:00
-- Generated read-only from sqlite_master; review before applying.

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- TABLES

CREATE TABLE agentsam_escalation (
  id               TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  run_group_id     TEXT NOT NULL,
  agent_run_id     TEXT REFERENCES agentsam_agent_run(id) ON DELETE SET NULL,
  chain_index      INTEGER NOT NULL DEFAULT 0,
  model_attempted  TEXT NOT NULL,
  succeeded        INTEGER NOT NULL DEFAULT 0,
  input_tokens     INTEGER DEFAULT 0,
  output_tokens    INTEGER DEFAULT 0,
  latency_ms       INTEGER DEFAULT NULL,
  error_message    TEXT,
  workspace_id     TEXT DEFAULT 'ws_companionscpas',
  tenant_id        TEXT DEFAULT 'tenant_companionscpas',
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  created_at_unix  INTEGER DEFAULT (unixepoch())
);

COMMIT;
PRAGMA foreign_keys = ON;
