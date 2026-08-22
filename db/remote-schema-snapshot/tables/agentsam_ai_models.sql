-- Remote D1 schema baseline
-- Source: companionscpas
-- Exported UTC: 2026-08-22T22:15:30+00:00
-- Generated read-only from sqlite_master; review before applying.

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- TABLES

CREATE TABLE agentsam_ai_models (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  model_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL,
  runtime TEXT NOT NULL,
  base_url TEXT,
  is_local INTEGER NOT NULL DEFAULT 0,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  priority INTEGER NOT NULL DEFAULT 50,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
, max_context_tokens INTEGER, max_output_tokens INTEGER, capabilities_json TEXT NOT NULL DEFAULT '[]', task_types_json TEXT NOT NULL DEFAULT '[]', is_workers_ai INTEGER NOT NULL DEFAULT 0, is_openai_api INTEGER NOT NULL DEFAULT 0, is_anthropic_api INTEGER NOT NULL DEFAULT 0, api_key_env TEXT, workers_ai_model_id TEXT, input_price_per_1m REAL, output_price_per_1m REAL, cached_input_price_per_1m REAL, context_window INTEGER DEFAULT 0, supports_tools INTEGER DEFAULT 0, supports_vision INTEGER DEFAULT 0, supports_image_generation INTEGER DEFAULT 0, supports_streaming INTEGER DEFAULT 1, supports_json INTEGER DEFAULT 1, latency_tier TEXT DEFAULT 'medium', quality_tier TEXT DEFAULT 'medium', cost_tier TEXT DEFAULT 'medium', default_mode TEXT DEFAULT 'ask', fallback_model_key TEXT, max_estimated_cost_usd REAL DEFAULT 0.05, workers_ai_neuron_budget INTEGER DEFAULT 0, routing_tags_json TEXT DEFAULT '[]', safety_policy_json TEXT DEFAULT '{}');

COMMIT;
PRAGMA foreign_keys = ON;
