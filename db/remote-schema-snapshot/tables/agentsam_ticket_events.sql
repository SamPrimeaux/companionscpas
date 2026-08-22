-- Remote D1 schema baseline
-- Source: companionscpas
-- Exported UTC: 2026-08-22T22:15:30+00:00
-- Generated read-only from sqlite_master; review before applying.

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- TABLES

CREATE TABLE agentsam_ticket_events (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  detail TEXT,
  commit_sha TEXT,
  actor_type TEXT,
  actor_id TEXT,
  created_at INTEGER NOT NULL
);

-- INDEXS

CREATE INDEX idx_agentsam_ticket_events_ticket_created
  ON agentsam_ticket_events(ticket_id, created_at DESC);

COMMIT;
PRAGMA foreign_keys = ON;
