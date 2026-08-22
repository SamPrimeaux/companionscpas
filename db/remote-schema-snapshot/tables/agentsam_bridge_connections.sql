-- Remote D1 schema baseline
-- Source: companionscpas
-- Exported UTC: 2026-08-22T22:15:30+00:00
-- Generated read-only from sqlite_master; review before applying.

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- TABLES

CREATE TABLE agentsam_bridge_connections (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  bridge_key TEXT NOT NULL UNIQUE,
  bridge_name TEXT NOT NULL,
  bridge_type TEXT NOT NULL DEFAULT 'local_pty',
  base_url TEXT,
  auth_secret_name TEXT DEFAULT 'AGENTSAM_BRIDGE_TOKEN',
  status TEXT DEFAULT 'inactive',
  capabilities_json TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

COMMIT;
PRAGMA foreign_keys = ON;
