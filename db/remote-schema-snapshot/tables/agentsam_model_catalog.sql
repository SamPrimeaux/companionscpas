-- Remote D1 schema baseline
-- Source: companionscpas
-- Exported UTC: 2026-08-22T22:15:30+00:00
-- Generated read-only from sqlite_master; review before applying.

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- TABLES

CREATE TABLE agentsam_model_catalog (
  id                    TEXT PRIMARY KEY DEFAULT ('mdl_' || lower(hex(randomblob(6)))),
  model_key             TEXT UNIQUE NOT NULL,
  display_name          TEXT NOT NULL,
  provider              TEXT NOT NULL,
  tier                  TEXT NOT NULL DEFAULT 'standard',
  workers_ai_model_id   TEXT DEFAULT NULL,
  openai_model_id       TEXT DEFAULT NULL,
  google_model_id       TEXT DEFAULT NULL,
  context_window        INTEGER NOT NULL DEFAULT 128000,
  max_output_tokens     INTEGER NOT NULL DEFAULT 4096,
  cost_per_1k_in        REAL NOT NULL DEFAULT 0,
  cost_per_1k_out       REAL NOT NULL DEFAULT 0,
  supports_tools        INTEGER NOT NULL DEFAULT 0,
  supports_vision       INTEGER NOT NULL DEFAULT 0,
  supports_streaming    INTEGER NOT NULL DEFAULT 1,
  supports_json_mode    INTEGER NOT NULL DEFAULT 0,
  avg_latency_p50_ms    INTEGER DEFAULT NULL,
  quality_score         REAL DEFAULT NULL,
  total_calls           INTEGER DEFAULT 0,
  total_failures        INTEGER DEFAULT 0,
  is_active             INTEGER NOT NULL DEFAULT 1,
  is_degraded           INTEGER NOT NULL DEFAULT 0,
  degraded_reason       TEXT DEFAULT NULL,
  routing_lane          TEXT NOT NULL DEFAULT 'unknown',
  api_platform          TEXT DEFAULT NULL,
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

COMMIT;
PRAGMA foreign_keys = ON;
