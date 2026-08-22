-- Remote D1 schema baseline
-- Source: companionscpas
-- Exported UTC: 2026-08-22T22:15:30+00:00
-- Generated read-only from sqlite_master; review before applying.

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- TABLES

CREATE TABLE agentsam_tool_chain (
  id               TEXT PRIMARY KEY DEFAULT ('tc_' || lower(hex(randomblob(8)))),
  tenant_id        TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  agent_run_id     TEXT NOT NULL REFERENCES agentsam_agent_run(id) ON DELETE CASCADE,
  session_id       TEXT,
  chain_index      INTEGER NOT NULL DEFAULT 0,
  tool_key         TEXT NOT NULL,
  tool_name        TEXT,
  input_args_json  TEXT NOT NULL DEFAULT '{}',
  output_json      TEXT DEFAULT NULL,
  status           TEXT NOT NULL DEFAULT 'pending',
  approval_required INTEGER NOT NULL DEFAULT 0,
  approved_by      TEXT DEFAULT NULL,
  approved_at      TEXT DEFAULT NULL,
  error_message    TEXT DEFAULT NULL,
  latency_ms       INTEGER DEFAULT NULL,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  created_at_unix  INTEGER DEFAULT (unixepoch())
);

COMMIT;
PRAGMA foreign_keys = ON;
