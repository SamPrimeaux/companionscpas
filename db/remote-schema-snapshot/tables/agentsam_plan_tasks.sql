-- Remote D1 schema baseline
-- Source: companionscpas
-- Exported UTC: 2026-08-22T22:15:30+00:00
-- Generated read-only from sqlite_master; review before applying.

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- TABLES

CREATE TABLE agentsam_plan_tasks (
  id                TEXT PRIMARY KEY DEFAULT ('task_' || lower(hex(randomblob(8)))),
  tenant_id         TEXT,
  workspace_id      TEXT,
  plan_id           TEXT NOT NULL REFERENCES agentsam_plans(id) ON DELETE CASCADE,
  agent_id          TEXT,
  assigned_model    TEXT,
  order_index       INTEGER NOT NULL,
  title             TEXT NOT NULL,
  description       TEXT,
  priority          TEXT NOT NULL DEFAULT 'P1'
                    CHECK(priority IN ('P0','P1','P2','P3')),
  category          TEXT DEFAULT 'backend'
                    CHECK(category IN ('frontend','backend','db','infra','ux','research','other')),
  status            TEXT NOT NULL DEFAULT 'todo'
                    CHECK(status IN ('todo','running','in_progress','done','blocked','skipped','carried')),
  files_involved    TEXT DEFAULT '[]',
  tables_involved   TEXT DEFAULT '[]',
  routes_involved   TEXT DEFAULT '[]',
  depends_on        TEXT DEFAULT '[]',
  estimated_minutes INTEGER,
  actual_minutes    INTEGER,
  blocked_reason    TEXT,
  notes             TEXT,
  output_summary    TEXT,
  error_trace       TEXT,
  tokens_used       INTEGER DEFAULT 0,
  cost_usd          REAL DEFAULT 0,
  handler_key       TEXT DEFAULT NULL,
  handler_type      TEXT DEFAULT NULL
                    CHECK(handler_type IS NULL OR handler_type IN (
                      'agent','db_query','terminal','mcp_tool','script',
                      'eval','branch','webhook','approval_gate','retry','parallel','join'
                    )),
  risk_level        TEXT DEFAULT 'low'
                    CHECK(risk_level IN ('low','medium','high','critical')),
  requires_approval INTEGER DEFAULT 0,
  quality_gate_json TEXT DEFAULT '{}',
  edge_taken        TEXT DEFAULT NULL,
  started_at        INTEGER,
  completed_at      INTEGER,
  created_at        INTEGER DEFAULT (unixepoch())
);

COMMIT;
PRAGMA foreign_keys = ON;
