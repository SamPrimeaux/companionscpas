-- Remote D1 schema baseline
-- Source: companionscpas
-- Exported UTC: 2026-08-22T22:15:30+00:00
-- Generated read-only from sqlite_master; review before applying.

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- TABLES

CREATE TABLE agentsam_tickets (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL
    CHECK (status IN ('backlog','active','blocked','in_review','shipped','abandoned')),
  status_reason TEXT,
  project TEXT,
  subsystem TEXT,
  tags TEXT,
  priority TEXT DEFAULT 'medium',
  requested_by TEXT,
  doc_path TEXT,
  blocks TEXT,
  blocked_by TEXT,
  supersedes TEXT,
  dedup_key TEXT,
  consecutive_pass_count INTEGER,
  last_gate_run_id INTEGER,
  last_gate_ok_at INTEGER,
  required_pass_count INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  closed_at INTEGER
, due_at INTEGER, attachments_json TEXT NOT NULL DEFAULT '[]');

-- INDEXS

CREATE INDEX idx_agentsam_tickets_project
  ON agentsam_tickets(project);

CREATE INDEX idx_agentsam_tickets_status_priority
  ON agentsam_tickets(status, priority);

CREATE INDEX idx_agentsam_tickets_updated_at
  ON agentsam_tickets(updated_at DESC);

COMMIT;
PRAGMA foreign_keys = ON;
