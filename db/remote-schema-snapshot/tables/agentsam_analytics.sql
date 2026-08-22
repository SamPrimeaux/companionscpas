-- Remote D1 schema baseline
-- Source: companionscpas
-- Exported UTC: 2026-08-22T22:15:30+00:00
-- Generated read-only from sqlite_master; review before applying.

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- TABLES

CREATE TABLE agentsam_analytics (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  user_id TEXT,
  session_id TEXT,
  run_group_id TEXT,
  command_key TEXT,
  tool_key TEXT,
  provider TEXT NOT NULL,
  model_key TEXT,
  runtime_location TEXT DEFAULT 'cloudflare',
  mode TEXT DEFAULT 'ask',
  status TEXT NOT NULL DEFAULT 'started',
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  estimated_cost_usd REAL DEFAULT 0,
  latency_ms INTEGER DEFAULT 0,
  input_chars INTEGER DEFAULT 0,
  output_chars INTEGER DEFAULT 0,
  safety_flags TEXT DEFAULT '[]',
  metadata_json TEXT DEFAULT '{}',
  error_message TEXT,
  started_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT
, workflow_id TEXT, workflow_key TEXT, workflow_run_id TEXT, workflow_step_key TEXT, input_tokens INTEGER DEFAULT 0, output_tokens INTEGER DEFAULT 0, workers_ai_neurons INTEGER DEFAULT 0, workers_ai_units INTEGER DEFAULT 0, raw_usage_json TEXT DEFAULT '{}', metering_json TEXT DEFAULT '{}', cost_gate_hit INTEGER DEFAULT 0, token_gate_hit INTEGER DEFAULT 0, neuron_gate_hit INTEGER DEFAULT 0, stopped_reason TEXT, max_prompt_tokens INTEGER DEFAULT 0, max_completion_tokens INTEGER DEFAULT 0, max_total_tokens INTEGER DEFAULT 0, max_workers_ai_neurons INTEGER DEFAULT 0, max_estimated_cost_usd REAL DEFAULT 0, fallback_from_provider TEXT, fallback_from_model_key TEXT, fallback_reason TEXT, approval_required INTEGER DEFAULT 0, approval_status TEXT DEFAULT 'not_required', approved_by TEXT, approved_at TEXT);

-- INDEXS

CREATE INDEX idx_agentsam_analytics_cost_gates
ON agentsam_analytics(cost_gate_hit, token_gate_hit, neuron_gate_hit);

CREATE INDEX idx_agentsam_analytics_provider ON agentsam_analytics(provider, model_key);

CREATE INDEX idx_agentsam_analytics_provider_model
ON agentsam_analytics(provider, model_key, started_at);

CREATE INDEX idx_agentsam_analytics_run
ON agentsam_analytics(workflow_run_id, workflow_step_key);

CREATE INDEX idx_agentsam_analytics_run_group ON agentsam_analytics(run_group_id);

CREATE INDEX idx_agentsam_analytics_tenant ON agentsam_analytics(tenant_id);

CREATE INDEX idx_agentsam_analytics_workflow
ON agentsam_analytics(tenant_id, workflow_key, started_at);

COMMIT;
PRAGMA foreign_keys = ON;
