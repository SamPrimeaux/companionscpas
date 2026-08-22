-- Remote D1 schema baseline
-- Source: companionscpas
-- Exported UTC: 2026-08-22T22:15:30+00:00
-- Generated read-only from sqlite_master; review before applying.

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- TABLES

CREATE TABLE agentsam_eval_cases (
  id               TEXT PRIMARY KEY DEFAULT ('evc_' || lower(hex(randomblob(8)))),
  suite_id         TEXT NOT NULL REFERENCES agentsam_eval_suites(id),
  tenant_id        TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  input_prompt     TEXT NOT NULL,
  expected_output  TEXT,
  grading_criteria TEXT,
  tags             TEXT DEFAULT '[]',
  is_edge_case     INTEGER DEFAULT 0,
  sort_order       INTEGER DEFAULT 50,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  created_at_unix  INTEGER DEFAULT (unixepoch())
);

COMMIT;
PRAGMA foreign_keys = ON;
