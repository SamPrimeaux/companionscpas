-- Remote D1 schema baseline
-- Source: companionscpas
-- Exported UTC: 2026-08-22T22:15:30+00:00
-- Generated read-only from sqlite_master; review before applying.

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- TABLES

CREATE TABLE agentsam_tool_result (
  id              TEXT PRIMARY KEY DEFAULT ('tr_' || lower(hex(randomblob(8)))),
  tenant_id       TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  chain_id        TEXT NOT NULL REFERENCES agentsam_tool_chain(id) ON DELETE CASCADE,
  agent_run_id    TEXT NOT NULL,
  tool_key        TEXT NOT NULL,
  result_json     TEXT NOT NULL DEFAULT '{}',
  row_count       INTEGER DEFAULT NULL,
  was_truncated   INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

COMMIT;
PRAGMA foreign_keys = ON;
