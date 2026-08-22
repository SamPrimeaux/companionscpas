-- Remote D1 schema baseline
-- Source: companionscpas
-- Exported UTC: 2026-08-22T22:15:30+00:00
-- Generated read-only from sqlite_master; review before applying.

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- TABLES

CREATE TABLE agentsam_model_policy (
  id               TEXT PRIMARY KEY DEFAULT ('mp_' || lower(hex(randomblob(6)))),
  tenant_id        TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  task_type        TEXT NOT NULL,
  mode             TEXT NOT NULL DEFAULT 'any',
  min_tier         TEXT NOT NULL DEFAULT 'flash',
  max_tier         TEXT DEFAULT NULL,
  required_caps    TEXT NOT NULL DEFAULT '[]',
  preferred_providers TEXT NOT NULL DEFAULT '[]',
  blocked_providers   TEXT NOT NULL DEFAULT '[]',
  max_cost_per_call   REAL DEFAULT NULL,
  max_latency_ms      INTEGER DEFAULT NULL,
  force_tool_capable  INTEGER NOT NULL DEFAULT 0,
  notes            TEXT,
  is_active        INTEGER NOT NULL DEFAULT 1,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id, task_type, mode)
);

COMMIT;
PRAGMA foreign_keys = ON;
