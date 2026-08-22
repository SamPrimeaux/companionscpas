-- Remote D1 schema baseline
-- Source: companionscpas
-- Exported UTC: 2026-08-22T22:15:30+00:00
-- Generated read-only from sqlite_master; review before applying.

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- TABLES

CREATE TABLE agentsam_sessions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  user_id TEXT,
  session_title TEXT DEFAULT 'Dashboard Assistant',
  route_path TEXT,
  mode TEXT DEFAULT 'ask',
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

COMMIT;
PRAGMA foreign_keys = ON;
