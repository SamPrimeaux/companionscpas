-- Remote D1 schema baseline
-- Source: companionscpas
-- Exported UTC: 2026-08-22T22:15:30+00:00
-- Generated read-only from sqlite_master; review before applying.

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- TABLES

CREATE TABLE agentsam_plans (
  id                   TEXT PRIMARY KEY,
  tenant_id            TEXT NOT NULL,
  workspace_id         TEXT,
  session_id           TEXT,
  agent_id             TEXT,
  client_id            TEXT,
  client_name          TEXT,
  plan_date            TEXT NOT NULL,
  plan_type            TEXT DEFAULT 'daily'
    CHECK(plan_type IN ('daily','sprint','incident','feature','refactor')),
  title                TEXT NOT NULL,
  status               TEXT NOT NULL DEFAULT 'active'
    CHECK(status IN ('draft','active','complete','abandoned')),
  morning_brief        TEXT,
  session_notes        TEXT,
  eod_summary          TEXT,
  available_providers  TEXT DEFAULT '["anthropic","openai","google","workers_ai"]',
  blocked_providers    TEXT DEFAULT '[]',
  budget_snapshot      TEXT DEFAULT '{}',
  default_model        TEXT,
  token_budget         INTEGER DEFAULT NULL,
  tokens_used          INTEGER NOT NULL DEFAULT 0,
  cost_usd             REAL NOT NULL DEFAULT 0,
  carry_over_from      TEXT,
  carry_over_count     INTEGER DEFAULT 0,
  tasks_total          INTEGER DEFAULT 0,
  tasks_done           INTEGER DEFAULT 0,
  tasks_blocked        INTEGER DEFAULT 0,
  linked_project_keys  TEXT DEFAULT '[]',
  linked_todo_ids      TEXT DEFAULT '[]',
  linked_context_ids   TEXT DEFAULT '[]',
  graph_mode           INTEGER DEFAULT 0,
  risk_level           TEXT DEFAULT 'low',
  requires_approval    INTEGER DEFAULT 0,
  r2_prefix            TEXT,
  plan_md_url          TEXT,
  plan_map_url         TEXT,
  created_at           INTEGER DEFAULT (unixepoch()),
  updated_at           INTEGER DEFAULT (unixepoch())
);

COMMIT;
PRAGMA foreign_keys = ON;
