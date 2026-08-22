-- Remote D1 schema baseline
-- Source: companionscpas
-- Exported UTC: 2026-08-22T22:15:30+00:00
-- Generated read-only from sqlite_master; review before applying.

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- TABLES

CREATE TABLE agentsam_eval_runs (
  id                   TEXT PRIMARY KEY DEFAULT ('evr_' || lower(hex(randomblob(8)))),
  suite_id             TEXT NOT NULL REFERENCES agentsam_eval_suites(id),
  case_id              TEXT REFERENCES agentsam_eval_cases(id),
  tenant_id            TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  model_key            TEXT NOT NULL,
  provider             TEXT NOT NULL,
  routing_arm_id       TEXT REFERENCES agentsam_routing_arms(id) ON DELETE SET NULL,
  input_tokens         INTEGER DEFAULT 0,
  output_tokens        INTEGER DEFAULT 0,
  latency_ms           INTEGER DEFAULT 0,
  cost_usd             REAL DEFAULT 0,
  score_quality        REAL DEFAULT NULL,
  score_latency        REAL DEFAULT NULL,
  score_cost           REAL DEFAULT NULL,
  score_overall        REAL DEFAULT NULL,
  passed               INTEGER DEFAULT 0,
  output_text          TEXT,
  grader_notes         TEXT,
  grader_model         TEXT,
  run_group_id         TEXT,
  retry_count          INTEGER DEFAULT 0,
  failure_taxonomy     TEXT,
  run_at               TEXT NOT NULL DEFAULT (datetime('now')),
  run_at_unix          INTEGER DEFAULT (unixepoch())
);

COMMIT;
PRAGMA foreign_keys = ON;
