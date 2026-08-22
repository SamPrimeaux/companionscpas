-- Remote D1 schema baseline
-- Source: companionscpas
-- Exported UTC: 2026-08-22T22:15:30+00:00
-- Generated read-only from sqlite_master; review before applying.

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- TABLES

CREATE TABLE agentsam_reward_events (
  id               TEXT PRIMARY KEY DEFAULT ('re_' || lower(hex(randomblob(8)))),
  tenant_id        TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  agent_run_id     TEXT NOT NULL REFERENCES agentsam_agent_run(id) ON DELETE CASCADE,
  routing_arm_id   TEXT REFERENCES agentsam_routing_arms(id) ON DELETE SET NULL,
  signal_type      TEXT NOT NULL,
  signal_value     REAL NOT NULL DEFAULT 0,
  alpha_delta      REAL NOT NULL DEFAULT 0,
  beta_delta       REAL NOT NULL DEFAULT 0,
  reason           TEXT,
  metadata_json    TEXT NOT NULL DEFAULT '{}',
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  created_at_unix  INTEGER DEFAULT (unixepoch())
);

COMMIT;
PRAGMA foreign_keys = ON;
