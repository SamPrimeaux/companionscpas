-- Remote D1 schema baseline
-- Source: companionscpas
-- Exported UTC: 2026-08-22T22:15:30+00:00
-- Generated read-only from sqlite_master; review before applying.

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- TABLES

CREATE TABLE agentsam_workflow_nodes (
  id TEXT PRIMARY KEY DEFAULT ('wnode_' || lower(hex(randomblob(8)))),
  workflow_id TEXT NOT NULL REFERENCES agentsam_workflows(id) ON DELETE CASCADE,
  node_key TEXT NOT NULL,
  node_type TEXT NOT NULL DEFAULT 'agent'
    CHECK(node_type IN ('agent','db_query','mcp_tool','script','approval_gate','eval','branch','webhook','terminal','retry','parallel','join','trigger','process','output')),
  title TEXT NOT NULL,
  description TEXT,
  handler_key TEXT,
  input_schema_json TEXT DEFAULT '{}',
  output_schema_json TEXT DEFAULT '{}',
  timeout_ms INTEGER DEFAULT 30000,
  retry_policy_json TEXT DEFAULT '{"max_retries":2,"backoff_ms":1000}',
  quality_gate_json TEXT DEFAULT '{}',
  risk_level TEXT DEFAULT 'low' CHECK(risk_level IN ('low','medium','high','critical')),
  requires_approval INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  pos_x REAL,
  pos_y REAL,
  handler_config_json TEXT DEFAULT '{}',
  created_at_unix INTEGER DEFAULT (unixepoch()),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(workflow_id, node_key)
);

COMMIT;
PRAGMA foreign_keys = ON;
