-- Remote D1 schema baseline
-- Source: companionscpas
-- Exported UTC: 2026-08-22T22:15:30+00:00
-- Generated read-only from sqlite_master; review before applying.

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- TABLES

CREATE TABLE agentsam_code_index_job (
  id                  TEXT PRIMARY KEY,
  user_id             TEXT NOT NULL,
  workspace_id        TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'idle',
  progress_percent    INTEGER DEFAULT 0,
  source_type         TEXT DEFAULT 'r2',
  source_path         TEXT,
  vector_backend      TEXT DEFAULT 'supabase_pgvector',
  file_manifest       TEXT DEFAULT '[]',
  symbol_summary      TEXT DEFAULT '{}',
  dependency_summary  TEXT DEFAULT '{}',
  languages           TEXT DEFAULT '{}',
  file_count          INTEGER DEFAULT 0,
  indexed_file_count  INTEGER DEFAULT 0,
  failed_file_count   INTEGER DEFAULT 0,
  total_size_bytes    INTEGER DEFAULT 0,
  chunk_count         INTEGER DEFAULT 0,
  symbol_count        INTEGER DEFAULT 0,
  triggered_by        TEXT DEFAULT 'manual',
  started_at          TEXT,
  completed_at        TEXT,
  last_sync_at        TEXT,
  last_error          TEXT,
  repo_full_name      TEXT,
  updated_at          TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, workspace_id)
);

COMMIT;
PRAGMA foreign_keys = ON;
