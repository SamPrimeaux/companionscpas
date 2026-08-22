-- Remote D1 schema baseline
-- Source: companionscpas
-- Exported UTC: 2026-08-22T22:15:30+00:00
-- Generated read-only from sqlite_master; review before applying.

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- TABLES

CREATE TABLE agentsam_workflow_edges (
  id TEXT PRIMARY KEY DEFAULT ('wedge_' || lower(hex(randomblob(8)))),
  workflow_id TEXT NOT NULL REFERENCES agentsam_workflows(id) ON DELETE CASCADE,
  from_node_key TEXT NOT NULL,
  to_node_key TEXT NOT NULL,
  condition_json TEXT DEFAULT NULL,
  condition_type TEXT DEFAULT 'always'
    CHECK(condition_type IN ('always','threshold','status','elapsed','cost','field','risk','manual','timeout')),
  priority INTEGER DEFAULT 0,
  is_fallback INTEGER DEFAULT 0,
  label TEXT,
  created_at_unix INTEGER DEFAULT (unixepoch()),
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(workflow_id, from_node_key, to_node_key)
);

COMMIT;
PRAGMA foreign_keys = ON;
