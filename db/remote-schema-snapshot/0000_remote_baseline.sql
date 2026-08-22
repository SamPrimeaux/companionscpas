-- Remote D1 schema baseline
-- Source: companionscpas
-- Exported UTC: 2026-08-22T22:15:30+00:00
-- Generated read-only from sqlite_master; review before applying.

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- TABLES

CREATE TABLE agentsam_agent_run (
  id               TEXT PRIMARY KEY,
  tenant_id        TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  workspace_id     TEXT DEFAULT 'ws_companionscpas',
  user_id          TEXT NOT NULL,
  conversation_id  TEXT,
  session_id       TEXT,
  status           TEXT NOT NULL DEFAULT 'queued',
  trigger          TEXT,
  task_type        TEXT,
  mode             TEXT DEFAULT 'ask',
  model_key        TEXT DEFAULT NULL,
  model_catalog_id TEXT DEFAULT NULL,
  routing_arm_id   TEXT,
  chain_root_id    TEXT,
  idempotency_key  TEXT,
  error_message    TEXT,
  input_tokens     INTEGER DEFAULT 0,
  output_tokens    INTEGER DEFAULT 0,
  cached_input_tokens INTEGER DEFAULT 0,
  reasoning_tokens INTEGER DEFAULT 0,
  total_tokens     INTEGER GENERATED ALWAYS AS (COALESCE(input_tokens,0) + COALESCE(output_tokens,0)) VIRTUAL,
  latency_ms       INTEGER DEFAULT NULL,
  cost_usd         REAL DEFAULT 0,
  quality_score    REAL DEFAULT NULL,
  timed_out        INTEGER DEFAULT 0,
  sla_breach       INTEGER DEFAULT 0,
  timeout_ms       INTEGER DEFAULT 30000,
  command_id       TEXT REFERENCES agentsam_commands(id),
  started_at       TEXT,
  completed_at     TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  created_at_unix  INTEGER DEFAULT (unixepoch())
);

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

CREATE TABLE agentsam_code_index_job (
  id                  TEXT PRIMARY KEY,
  user_id             TEXT NOT NULL,
  workspace_id        TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'idle',
  progress_percent    INTEGER DEFAULT 0,
  source_type         TEXT DEFAULT 'r2',
  source_path         TEXT,
  vector_backend      TEXT DEFAULT 'supabase_pgvector',
  file_manifest       TEXT DEFAULT '[]',
  symbol_summary      TEXT DEFAULT '{}',
  dependency_summary  TEXT DEFAULT '{}',
  languages           TEXT DEFAULT '{}',
  file_count          INTEGER DEFAULT 0,
  indexed_file_count  INTEGER DEFAULT 0,
  failed_file_count   INTEGER DEFAULT 0,
  total_size_bytes    INTEGER DEFAULT 0,
  chunk_count         INTEGER DEFAULT 0,
  symbol_count        INTEGER DEFAULT 0,
  triggered_by        TEXT DEFAULT 'manual',
  started_at          TEXT,
  completed_at        TEXT,
  last_sync_at        TEXT,
  last_error          TEXT,
  repo_full_name      TEXT,
  updated_at          TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, workspace_id)
);

CREATE TABLE agentsam_commands (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  command_key TEXT NOT NULL UNIQUE,
  command_name TEXT NOT NULL,
  command_category TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  prompt_template TEXT,
  input_schema TEXT DEFAULT '{}',
  output_schema TEXT DEFAULT '{}',
  allowed_roles TEXT DEFAULT '["owner","developer","admin"]',
  allowed_modes TEXT DEFAULT '["ask","plan","agent","debug"]',
  provider_strategy TEXT DEFAULT 'auto',
  default_model TEXT,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  safety_level TEXT NOT NULL DEFAULT 'standard',
  sort_order INTEGER DEFAULT 50,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE agentsam_dev_runs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  user_id TEXT,
  bridge_key TEXT,
  command_key TEXT,
  requested_command TEXT,
  cwd TEXT,
  status TEXT DEFAULT 'queued',
  stdout TEXT,
  stderr TEXT,
  exit_code INTEGER,
  started_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE TABLE agentsam_escalation (
  id               TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  run_group_id     TEXT NOT NULL,
  agent_run_id     TEXT REFERENCES agentsam_agent_run(id) ON DELETE SET NULL,
  chain_index      INTEGER NOT NULL DEFAULT 0,
  model_attempted  TEXT NOT NULL,
  succeeded        INTEGER NOT NULL DEFAULT 0,
  input_tokens     INTEGER DEFAULT 0,
  output_tokens    INTEGER DEFAULT 0,
  latency_ms       INTEGER DEFAULT NULL,
  error_message    TEXT,
  workspace_id     TEXT DEFAULT 'ws_companionscpas',
  tenant_id        TEXT DEFAULT 'tenant_companionscpas',
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  created_at_unix  INTEGER DEFAULT (unixepoch())
);

CREATE TABLE agentsam_eval_cases (
  id               TEXT PRIMARY KEY DEFAULT ('evc_' || lower(hex(randomblob(8)))),
  suite_id         TEXT NOT NULL REFERENCES agentsam_eval_suites(id),
  tenant_id        TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  input_prompt     TEXT NOT NULL,
  expected_output  TEXT,
  grading_criteria TEXT,
  tags             TEXT DEFAULT '[]',
  is_edge_case     INTEGER DEFAULT 0,
  sort_order       INTEGER DEFAULT 50,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  created_at_unix  INTEGER DEFAULT (unixepoch())
);

CREATE TABLE agentsam_eval_runs (
  id                   TEXT PRIMARY KEY DEFAULT ('evr_' || lower(hex(randomblob(8)))),
  suite_id             TEXT NOT NULL REFERENCES agentsam_eval_suites(id),
  case_id              TEXT REFERENCES agentsam_eval_cases(id),
  tenant_id            TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  model_key            TEXT NOT NULL,
  provider             TEXT NOT NULL,
  routing_arm_id       TEXT REFERENCES agentsam_routing_arms(id) ON DELETE SET NULL,
  input_tokens         INTEGER DEFAULT 0,
  output_tokens        INTEGER DEFAULT 0,
  latency_ms           INTEGER DEFAULT 0,
  cost_usd             REAL DEFAULT 0,
  score_quality        REAL DEFAULT NULL,
  score_latency        REAL DEFAULT NULL,
  score_cost           REAL DEFAULT NULL,
  score_overall        REAL DEFAULT NULL,
  passed               INTEGER DEFAULT 0,
  output_text          TEXT,
  grader_notes         TEXT,
  grader_model         TEXT,
  run_group_id         TEXT,
  retry_count          INTEGER DEFAULT 0,
  failure_taxonomy     TEXT,
  run_at               TEXT NOT NULL DEFAULT (datetime('now')),
  run_at_unix          INTEGER DEFAULT (unixepoch())
);

CREATE TABLE agentsam_eval_suites (
  id          TEXT PRIMARY KEY DEFAULT ('evs_' || lower(hex(randomblob(8)))),
  tenant_id   TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  name        TEXT NOT NULL,
  description TEXT,
  provider    TEXT,
  mode        TEXT DEFAULT 'auto',
  task_type   TEXT,
  is_active   INTEGER DEFAULT 1,
  run_count   INTEGER DEFAULT 0,
  last_run_at TEXT,
  created_by  TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  created_at_unix INTEGER DEFAULT (unixepoch())
);

CREATE TABLE agentsam_ignore_pattern (
  id           TEXT PRIMARY KEY,
  user_id      TEXT,
  workspace_id TEXT,
  pattern      TEXT NOT NULL,
  is_negation  INTEGER NOT NULL DEFAULT 0,
  order_index  INTEGER NOT NULL DEFAULT 0,
  source       TEXT NOT NULL DEFAULT 'db',
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE agentsam_intent_rules (
  id               TEXT PRIMARY KEY DEFAULT ('ir_' || lower(hex(randomblob(6)))),
  tenant_id        TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  intent_pattern   TEXT NOT NULL,
  task_type        TEXT NOT NULL,
  required_tools   TEXT NOT NULL DEFAULT '[]',
  optional_tools   TEXT NOT NULL DEFAULT '[]',
  min_model_tier   TEXT NOT NULL DEFAULT 'standard',
  force_tool_model INTEGER NOT NULL DEFAULT 0,
  description      TEXT,
  is_active        INTEGER NOT NULL DEFAULT 1,
  priority         INTEGER NOT NULL DEFAULT 50,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE agentsam_memory (
  id               TEXT    PRIMARY KEY DEFAULT ('mem_' || lower(hex(randomblob(8)))),
  tenant_id        TEXT    NOT NULL,
  user_id          TEXT    NOT NULL,
  workspace_id     TEXT,
  memory_type      TEXT    DEFAULT 'fact'
                           CHECK (memory_type IN ('fact','preference','project','skill','error','decision')),
  key              TEXT    NOT NULL,
  value            TEXT    NOT NULL,
  source           TEXT,
  confidence       REAL    DEFAULT 1.0,
  decay_score      REAL    DEFAULT 1.0,
  recall_count     INTEGER DEFAULT 0,
  last_recalled_at INTEGER,
  expires_at       INTEGER,
  created_at       INTEGER DEFAULT (unixepoch()),
  updated_at       INTEGER DEFAULT (unixepoch()),
  agent_id         TEXT,
  session_id       TEXT,
  tags             TEXT    DEFAULT '[]',
  embedding_id     TEXT,
  plan_id          TEXT,
  task_id          TEXT,
  UNIQUE(tenant_id, user_id, key)
);

CREATE TABLE agentsam_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata_json TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(session_id) REFERENCES agentsam_sessions(id)
);

CREATE TABLE agentsam_model_catalog (
  id                    TEXT PRIMARY KEY DEFAULT ('mdl_' || lower(hex(randomblob(6)))),
  model_key             TEXT UNIQUE NOT NULL,
  display_name          TEXT NOT NULL,
  provider              TEXT NOT NULL,
  tier                  TEXT NOT NULL DEFAULT 'standard',
  workers_ai_model_id   TEXT DEFAULT NULL,
  openai_model_id       TEXT DEFAULT NULL,
  google_model_id       TEXT DEFAULT NULL,
  context_window        INTEGER NOT NULL DEFAULT 128000,
  max_output_tokens     INTEGER NOT NULL DEFAULT 4096,
  cost_per_1k_in        REAL NOT NULL DEFAULT 0,
  cost_per_1k_out       REAL NOT NULL DEFAULT 0,
  supports_tools        INTEGER NOT NULL DEFAULT 0,
  supports_vision       INTEGER NOT NULL DEFAULT 0,
  supports_streaming    INTEGER NOT NULL DEFAULT 1,
  supports_json_mode    INTEGER NOT NULL DEFAULT 0,
  avg_latency_p50_ms    INTEGER DEFAULT NULL,
  quality_score         REAL DEFAULT NULL,
  total_calls           INTEGER DEFAULT 0,
  total_failures        INTEGER DEFAULT 0,
  is_active             INTEGER NOT NULL DEFAULT 1,
  is_degraded           INTEGER NOT NULL DEFAULT 0,
  degraded_reason       TEXT DEFAULT NULL,
  routing_lane          TEXT NOT NULL DEFAULT 'unknown',
  api_platform          TEXT DEFAULT NULL,
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

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

CREATE TABLE agentsam_reward_events (
  id               TEXT PRIMARY KEY DEFAULT ('re_' || lower(hex(randomblob(8)))),
  tenant_id        TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  agent_run_id     TEXT NOT NULL REFERENCES agentsam_agent_run(id) ON DELETE CASCADE,
  routing_arm_id   TEXT REFERENCES agentsam_routing_arms(id) ON DELETE SET NULL,
  signal_type      TEXT NOT NULL,
  signal_value     REAL NOT NULL DEFAULT 0,
  alpha_delta      REAL NOT NULL DEFAULT 0,
  beta_delta       REAL NOT NULL DEFAULT 0,
  reason           TEXT,
  metadata_json    TEXT NOT NULL DEFAULT '{}',
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  created_at_unix  INTEGER DEFAULT (unixepoch())
);

CREATE TABLE agentsam_routing_arms (
  id                    TEXT PRIMARY KEY DEFAULT ('ra_' || lower(hex(randomblob(8)))),
  workspace_id          TEXT NOT NULL DEFAULT 'ws_companionscpas',
  task_type             TEXT NOT NULL,
  mode                  TEXT NOT NULL,
  model_key             TEXT NOT NULL,
  provider              TEXT NOT NULL,
  model_catalog_id      TEXT REFERENCES agentsam_model_catalog(id) ON DELETE SET NULL,
  success_alpha         REAL NOT NULL DEFAULT 1.0,
  success_beta          REAL NOT NULL DEFAULT 1.0,
  cost_n                INTEGER NOT NULL DEFAULT 0,
  cost_mean             REAL NOT NULL DEFAULT 0,
  latency_n             INTEGER NOT NULL DEFAULT 0,
  latency_mean          REAL NOT NULL DEFAULT 0,
  avg_quality_score     REAL DEFAULT 0,
  quality_n             INTEGER DEFAULT 0,
  total_executions      INTEGER DEFAULT 0,
  is_eligible           INTEGER NOT NULL DEFAULT 1,
  is_paused             INTEGER NOT NULL DEFAULT 0,
  pause_reason          TEXT,
  budget_exhausted      INTEGER DEFAULT 0,
  max_cost_per_call_usd REAL DEFAULT NULL,
  fallback_model_key    TEXT,
  priority              INTEGER DEFAULT 50,
  supports_tools        INTEGER DEFAULT 1,
  updated_at            INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(workspace_id, task_type, mode, model_key)
);

CREATE TABLE agentsam_rules_document (
  id           TEXT PRIMARY KEY,
  user_id      TEXT,
  workspace_id TEXT,
  title        TEXT NOT NULL DEFAULT 'default',
  body_markdown TEXT NOT NULL,
  version      INTEGER NOT NULL DEFAULT 1,
  is_active    INTEGER NOT NULL DEFAULT 1,
  apply_mode   TEXT NOT NULL DEFAULT 'always',
  globs        TEXT,
  source       TEXT NOT NULL DEFAULT 'dashboard',
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE agentsam_secret_bindings (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  binding_key TEXT NOT NULL UNIQUE,
  secret_item_id TEXT,
  purpose TEXT,
  allowed_tools_json TEXT DEFAULT '[]',
  allowed_workflows_json TEXT DEFAULT '[]',
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

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

CREATE TABLE agentsam_skill (
  id                     TEXT PRIMARY KEY,
  tenant_id              TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  workspace_id           TEXT DEFAULT 'ws_companionscpas',
  user_id                TEXT NOT NULL,
  name                   TEXT NOT NULL,
  description            TEXT NOT NULL DEFAULT '',
  content_markdown       TEXT NOT NULL DEFAULT '',
  scope                  TEXT NOT NULL DEFAULT 'workspace',
  slash_trigger          TEXT,
  always_apply           INTEGER NOT NULL DEFAULT 0,
  task_types_json        TEXT NOT NULL DEFAULT '[]',
  default_model_key      TEXT,
  access_mode            TEXT NOT NULL DEFAULT 'read_write',
  tags_json              TEXT NOT NULL DEFAULT '[]',
  metadata_json          TEXT NOT NULL DEFAULT '{}',
  token_estimate         INTEGER NOT NULL DEFAULT 0,
  invocation_count       INTEGER NOT NULL DEFAULT 0,
  last_invoked_at        TEXT,
  version                INTEGER NOT NULL DEFAULT 1,
  is_active              INTEGER NOT NULL DEFAULT 1,
  sort_order             INTEGER NOT NULL DEFAULT 0,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at             TEXT NOT NULL DEFAULT (datetime('now'))
);

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

CREATE TABLE agentsam_tickets (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL
    CHECK (status IN ('backlog','active','blocked','in_review','shipped','abandoned')),
  status_reason TEXT,
  project TEXT,
  subsystem TEXT,
  tags TEXT,
  priority TEXT DEFAULT 'medium',
  requested_by TEXT,
  doc_path TEXT,
  blocks TEXT,
  blocked_by TEXT,
  supersedes TEXT,
  dedup_key TEXT,
  consecutive_pass_count INTEGER,
  last_gate_run_id INTEGER,
  last_gate_ok_at INTEGER,
  required_pass_count INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  closed_at INTEGER
, due_at INTEGER, attachments_json TEXT NOT NULL DEFAULT '[]');

CREATE TABLE agentsam_tool_chain (
  id               TEXT PRIMARY KEY DEFAULT ('tc_' || lower(hex(randomblob(8)))),
  tenant_id        TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  agent_run_id     TEXT NOT NULL REFERENCES agentsam_agent_run(id) ON DELETE CASCADE,
  session_id       TEXT,
  chain_index      INTEGER NOT NULL DEFAULT 0,
  tool_key         TEXT NOT NULL,
  tool_name        TEXT,
  input_args_json  TEXT NOT NULL DEFAULT '{}',
  output_json      TEXT DEFAULT NULL,
  status           TEXT NOT NULL DEFAULT 'pending',
  approval_required INTEGER NOT NULL DEFAULT 0,
  approved_by      TEXT DEFAULT NULL,
  approved_at      TEXT DEFAULT NULL,
  error_message    TEXT DEFAULT NULL,
  latency_ms       INTEGER DEFAULT NULL,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  created_at_unix  INTEGER DEFAULT (unixepoch())
);

CREATE TABLE agentsam_tool_result (
  id              TEXT PRIMARY KEY DEFAULT ('tr_' || lower(hex(randomblob(8)))),
  tenant_id       TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  chain_id        TEXT NOT NULL REFERENCES agentsam_tool_chain(id) ON DELETE CASCADE,
  agent_run_id    TEXT NOT NULL,
  tool_key        TEXT NOT NULL,
  result_json     TEXT NOT NULL DEFAULT '{}',
  row_count       INTEGER DEFAULT NULL,
  was_truncated   INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE agentsam_tools (
  id                TEXT PRIMARY KEY DEFAULT ('tool_' || lower(hex(randomblob(8)))),
  tenant_id         TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  tool_key          TEXT NOT NULL UNIQUE,
  tool_name         TEXT NOT NULL,
  category          TEXT NOT NULL,
  description       TEXT NOT NULL,
  function_schema   TEXT NOT NULL DEFAULT '{}',
  is_enabled        INTEGER NOT NULL DEFAULT 1,
  requires_approval INTEGER NOT NULL DEFAULT 0,
  allowed_roles     TEXT NOT NULL DEFAULT '["owner","developer","admin"]',
  min_model_tier    TEXT NOT NULL DEFAULT 'standard',
  usage_count       INTEGER NOT NULL DEFAULT 0,
  last_used_at      TEXT,
  sort_order        INTEGER NOT NULL DEFAULT 50,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE agentsam_usage_events (
  id               TEXT PRIMARY KEY DEFAULT ('ue_' || lower(hex(randomblob(8)))),
  tenant_id        TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  workspace_id     TEXT NOT NULL DEFAULT 'ws_companionscpas',
  user_id          TEXT,
  session_id       TEXT,
  agent_run_id     TEXT REFERENCES agentsam_agent_run(id) ON DELETE SET NULL,
  routing_arm_id   TEXT REFERENCES agentsam_routing_arms(id) ON DELETE SET NULL,
  provider         TEXT NOT NULL,
  model_key        TEXT NOT NULL,
  task_type        TEXT,
  mode             TEXT,
  tokens_in        INTEGER NOT NULL DEFAULT 0,
  tokens_out       INTEGER NOT NULL DEFAULT 0,
  total_tokens     INTEGER NOT NULL DEFAULT 0,
  cost_usd         REAL NOT NULL DEFAULT 0,
  latency_ms       INTEGER DEFAULT NULL,
  status           TEXT NOT NULL DEFAULT 'ok',
  succeeded        INTEGER DEFAULT 1,
  event_type       TEXT,
  reason           TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  created_at_unix  INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE agentsam_usage_rollups_daily (
  tenant_id               TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  workspace_id            TEXT NOT NULL DEFAULT 'ws_companionscpas',
  day                     TEXT NOT NULL,
  ai_calls                INTEGER NOT NULL DEFAULT 0,
  tokens_in               INTEGER NOT NULL DEFAULT 0,
  tokens_out              INTEGER NOT NULL DEFAULT 0,
  cost_usd                REAL NOT NULL DEFAULT 0,
  tool_calls              INTEGER NOT NULL DEFAULT 0,
  tool_successes          INTEGER NOT NULL DEFAULT 0,
  tool_failures           INTEGER NOT NULL DEFAULT 0,
  error_count             INTEGER NOT NULL DEFAULT 0,
  provider_breakdown_json TEXT DEFAULT '{}',
  top_models_json         TEXT DEFAULT '[]',
  rollup_source           TEXT NOT NULL DEFAULT 'daily_cron',
  rolled_up_at            INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (tenant_id, workspace_id, day)
);

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

CREATE TABLE agentsam_workflow_handlers (
  handler_key TEXT PRIMARY KEY,
  node_type TEXT NOT NULL,
  executor_kind TEXT NOT NULL CHECK(executor_kind IN ('d1_sql','d1_write','agent_llm','mcp_tool','builtin_tool','http','ui_emit','eval','terminal','approval','passthrough')),
  title TEXT,
  description TEXT,
  handler_config_json TEXT NOT NULL DEFAULT '{}',
  input_schema_json TEXT NOT NULL DEFAULT '{}',
  quality_gate_json TEXT NOT NULL DEFAULT '{}',
  risk_level TEXT NOT NULL DEFAULT 'low',
  requires_approval INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  tenant_id TEXT,
  workspace_id TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

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

CREATE TABLE agentsam_workflow_runs (
  id TEXT PRIMARY KEY DEFAULT ('wrun_' || lower(hex(randomblob(8)))),
  workflow_id TEXT REFERENCES agentsam_workflows(id) ON DELETE CASCADE,
  workflow_key TEXT,
  display_name TEXT,
  tenant_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  user_id TEXT,
  session_id TEXT,
  trigger_type TEXT NOT NULL DEFAULT 'manual'
    CHECK(trigger_type IN ('manual','agent','scheduled','api','cicd')),
  status TEXT NOT NULL DEFAULT 'running'
    CHECK(status IN ('running','completed','failed','cancelled','timeout')),
  input_json TEXT NOT NULL DEFAULT '{}',
  output_json TEXT NOT NULL DEFAULT '{}',
  step_results_json TEXT NOT NULL DEFAULT '[]',
  steps_completed INTEGER NOT NULL DEFAULT 0,
  steps_total INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  model_used TEXT,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd REAL NOT NULL DEFAULT 0,
  duration_ms INTEGER,
  environment TEXT NOT NULL DEFAULT 'production',
  git_commit_sha TEXT,
  git_branch TEXT DEFAULT 'main',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  started_at INTEGER NOT NULL DEFAULT (unixepoch()),
  completed_at INTEGER,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), project_id TEXT, run_group_id TEXT, d1_auth_user_id TEXT, user_email TEXT, parent_run_id TEXT DEFAULT NULL, retry_of_run_id TEXT DEFAULT NULL, approval_id TEXT DEFAULT NULL, retry_count INTEGER NOT NULL DEFAULT 0, graph_mode INTEGER DEFAULT 0, current_node_key TEXT DEFAULT NULL, max_runtime_ms INTEGER DEFAULT 600000, max_cost_usd REAL DEFAULT 0.10, max_total_tokens INTEGER DEFAULT 50000, heartbeat_at INTEGER DEFAULT NULL, kill_reason TEXT DEFAULT NULL, run_mode TEXT DEFAULT 'seed' CHECK(run_mode IN ('seed','update')), plan_id TEXT, task_id TEXT, source_tool TEXT, supabase_run_id TEXT, supabase_sync_status TEXT NOT NULL DEFAULT 'pending', supabase_synced_at TEXT, supabase_sync_error TEXT, supabase_sync_attempts INTEGER NOT NULL DEFAULT 0, created_at_unix INTEGER DEFAULT (unixepoch()),
  CHECK(length(trim(tenant_id)) > 0),
  CHECK(length(trim(workspace_id)) > 0)
);

CREATE TABLE agentsam_workflows (
  id TEXT PRIMARY KEY DEFAULT ('wf_' || lower(hex(randomblob(8)))),
  tenant_id TEXT,
  workspace_id TEXT,
  workflow_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  workflow_type TEXT NOT NULL DEFAULT 'agentic',
  trigger_type TEXT NOT NULL DEFAULT 'manual',
  default_mode TEXT DEFAULT 'agent',
  default_task_type TEXT,
  risk_level TEXT DEFAULT 'low',
  requires_approval INTEGER DEFAULT 0,
  max_concurrent_nodes INTEGER DEFAULT 3,
  timeout_ms INTEGER DEFAULT 300000,
  quality_gate_json TEXT DEFAULT '{}',
  metadata_json TEXT DEFAULT '{}',
  is_active INTEGER DEFAULT 1,
  is_platform_global INTEGER NOT NULL DEFAULT 0,
  created_at_unix INTEGER DEFAULT (unixepoch()),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(workspace_id, workflow_key)
);

CREATE TABLE cms_asset_usages (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  surface TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT '',
  entity_id TEXT NOT NULL DEFAULT '',
  entity_label TEXT,
  field TEXT NOT NULL DEFAULT 'primary',
  is_live INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (tenant_id, asset_id, surface, entity_type, entity_id, field)
);

CREATE TABLE cms_assets (
  id                   TEXT PRIMARY KEY DEFAULT ('asset_' || lower(hex(randomblob(8)))),
  tenant_id            TEXT NOT NULL,
  asset_key            TEXT NOT NULL,
  label                TEXT,
  filename             TEXT NOT NULL,
  original_filename    TEXT NOT NULL,
  alt_text             TEXT,
  mime_type            TEXT NOT NULL DEFAULT 'image/jpeg',
  size                 INTEGER,
  category             TEXT NOT NULL DEFAULT 'image',
  asset_type           TEXT NOT NULL DEFAULT 'image',
  tags                 TEXT,
  r2_key               TEXT NOT NULL,
  r2_bucket            TEXT NOT NULL DEFAULT 'companionscpas',
  pub_url              TEXT NOT NULL,
  cdn_url              TEXT,
  public_url           TEXT NOT NULL,
  thumbnail_url        TEXT,
  cloudflare_image_id  TEXT,
  s3_endpoint          TEXT,
  usage_context        TEXT,
  path                 TEXT,
  status               TEXT NOT NULL DEFAULT 'active',
  is_live              INTEGER NOT NULL DEFAULT 1,
  preferred_bg         TEXT,
  builds               TEXT,
  notes                TEXT,
  metadata_json        TEXT DEFAULT '{}',
  created_by           TEXT,
  created_at_unix      INTEGER DEFAULT (unixepoch()),
  created_at           TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at           TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), project_id TEXT DEFAULT 'proj_companionscpas', source_provider  TEXT, source_file_id   TEXT, source_account_id TEXT, source_url        TEXT, imported_at       TEXT, imported_by       TEXT, campaign_id TEXT REFERENCES fundraising_campaigns(id), update_id TEXT REFERENCES campaign_updates(id), width_px INTEGER, height_px INTEGER, usage_type TEXT DEFAULT 'general',
  UNIQUE(tenant_id, asset_key),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE cms_brand_settings (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  brand_name TEXT NOT NULL DEFAULT 'Companions of CPAS',
  logo_url TEXT DEFAULT '/logo.png',
  primary_color TEXT DEFAULT '#ee2336',
  secondary_color TEXT DEFAULT '#7c3aed',
  accent_color TEXT DEFAULT '#f59e0b',
  config_json TEXT DEFAULT '{}',
  updated_at TEXT DEFAULT (datetime('now'))
, site_domain TEXT, logo_light_url TEXT, logo_dark_url TEXT, favicon_url TEXT, footer_logo_light_url TEXT, footer_logo_dark_url TEXT, developer_logo_light_url TEXT, developer_logo_dark_url TEXT, navigation_json TEXT DEFAULT '[]', footer_json TEXT DEFAULT '{}', socials_json TEXT DEFAULT '{}', organization_json TEXT DEFAULT '{}', seo_defaults_json TEXT DEFAULT '{}', integrations_json TEXT DEFAULT '{}', header_json TEXT DEFAULT '{}', logo_width INTEGER DEFAULT 140, logo_height INTEGER DEFAULT NULL, footer_logo_width INTEGER DEFAULT 120, footer_logo_height INTEGER DEFAULT NULL);

CREATE TABLE cms_components (
  id          TEXT PRIMARY KEY,
  label       TEXT NOT NULL,
  type        TEXT NOT NULL,
  config_json TEXT NOT NULL DEFAULT '{}',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  active      INTEGER NOT NULL DEFAULT 1,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE cms_modals (
  id               TEXT PRIMARY KEY,
  tenant_id        TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  modal_key        TEXT NOT NULL UNIQUE,
  title            TEXT NOT NULL,
  subtitle         TEXT,
  body             TEXT,
  cta_label        TEXT,
  cta_href         TEXT,
  cta_action       TEXT DEFAULT 'href',
  secondary_label  TEXT,
  secondary_href   TEXT,
  image_url        TEXT,
  is_active        INTEGER NOT NULL DEFAULT 1,
  config_json      TEXT NOT NULL DEFAULT '{}',
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE cms_navigation_items (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  label TEXT NOT NULL,
  href TEXT NOT NULL,
  sort_order INTEGER DEFAULT 50,
  is_visible INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
, nav_group TEXT DEFAULT 'primary', parent_id TEXT, is_external INTEGER DEFAULT 0, open_in_new_tab INTEGER DEFAULT 0, icon TEXT, badge_label TEXT, css_class TEXT, requires_auth INTEGER DEFAULT 0, created_by TEXT DEFAULT 'Sam Primeaux');

CREATE TABLE cms_navigation_menus (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  project_id TEXT NOT NULL,
  project_slug TEXT,
  tenant_id TEXT,
  menu_name TEXT NOT NULL,
  menu_type TEXT DEFAULT 'site',
  menu_items TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  r2_bucket TEXT,
  r2_key TEXT,
  r2_url TEXT,
  s3_endpoint TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(project_id, menu_name)
);

CREATE TABLE cms_page_content_blocks (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  page_route TEXT NOT NULL,
  section_key TEXT NOT NULL,
  block_key TEXT NOT NULL,
  block_type TEXT DEFAULT 'text',
  title TEXT,
  body TEXT,
  asset_id TEXT,
  href TEXT,
  sort_order INTEGER DEFAULT 50,
  config_json TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')), eyebrow TEXT, subtitle TEXT, image_url TEXT, alt_text TEXT, action_label TEXT, action_type TEXT, action_value TEXT, is_visible INTEGER DEFAULT 1,
  UNIQUE(tenant_id, page_route, section_key, block_key)
);

CREATE TABLE cms_page_sections (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  page_route TEXT NOT NULL,
  section_key TEXT NOT NULL,
  section_type TEXT DEFAULT 'content',
  eyebrow TEXT,
  heading TEXT,
  subheading TEXT,
  body TEXT,
  primary_asset_id TEXT,
  secondary_asset_id TEXT,
  cta_label TEXT,
  cta_href TEXT,
  sort_order INTEGER DEFAULT 50,
  is_visible INTEGER DEFAULT 1,
  config_json TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')), title TEXT, image_url TEXT, cta_action TEXT, cta_secondary_label TEXT, cta_secondary_href TEXT, cta_secondary_action TEXT, meta_json TEXT DEFAULT '{}', created_by TEXT, project_id TEXT DEFAULT 'proj_companionscpas', run_id TEXT, seeded_by_pipeline TEXT DEFAULT 'primetech_cms_asset_pipeline', deleted_at TEXT, restore_count INTEGER DEFAULT 0, last_restored_at TEXT,
  UNIQUE(tenant_id, page_route, section_key)
);

CREATE TABLE cms_page_versions (
  id           TEXT PRIMARY KEY DEFAULT ('ver_' || lower(hex(randomblob(8)))),
  tenant_id    TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  page_id      TEXT NOT NULL,
  version_num  INTEGER NOT NULL DEFAULT 1,
  status       TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),
  snapshot_json TEXT NOT NULL DEFAULT '{}',
  sections_json TEXT NOT NULL DEFAULT '[]',
  theme_snapshot_json TEXT DEFAULT '{}',
  published_at TEXT,
  created_by   TEXT,
  created_at   TEXT DEFAULT (datetime('now'))
);

CREATE TABLE cms_pages (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  route_path TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  seo_title TEXT,
  meta_description TEXT,
  og_image_url TEXT,
  published_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')), site_id TEXT, parent_page_id TEXT, page_type TEXT DEFAULT 'standard', template_key TEXT DEFAULT 'default', sort_order INTEGER DEFAULT 50, is_homepage INTEGER DEFAULT 0, show_header INTEGER DEFAULT 1, show_footer INTEGER DEFAULT 1, requires_auth INTEGER DEFAULT 0, canonical_url TEXT, robots TEXT DEFAULT 'index,follow', seo_json TEXT DEFAULT '{}', analytics_json TEXT DEFAULT '{}', settings_json TEXT DEFAULT '{}', published_version_id TEXT, draft_version_id TEXT, created_by TEXT, updated_by TEXT, published_by TEXT, archived_at TEXT, theme_id TEXT, project_id TEXT DEFAULT 'proj_companionscpas', run_id TEXT, theme TEXT NOT NULL DEFAULT 'dark', nav_visible INTEGER DEFAULT 1, nav_label TEXT, nav_placement TEXT DEFAULT 'more',
  UNIQUE(tenant_id, route_path)
);

CREATE TABLE cms_publish_artifacts (
  id           TEXT PRIMARY KEY DEFAULT ('art_' || lower(hex(randomblob(8)))),
  tenant_id    TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  job_id       TEXT NOT NULL,
  page_id      TEXT,
  artifact_type TEXT NOT NULL DEFAULT 'html' CHECK(artifact_type IN ('html','css','json','image','manifest')),
  r2_key       TEXT NOT NULL,
  r2_bucket    TEXT NOT NULL DEFAULT 'companionscpas-assets',
  content_hash TEXT,
  size_bytes   INTEGER,
  version      INTEGER DEFAULT 1,
  is_current   INTEGER DEFAULT 1,
  created_at   TEXT DEFAULT (datetime('now'))
);

CREATE TABLE cms_publish_jobs (
  id           TEXT PRIMARY KEY DEFAULT ('pub_' || lower(hex(randomblob(8)))),
  tenant_id    TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  page_id      TEXT,
  job_type     TEXT NOT NULL DEFAULT 'page' CHECK(job_type IN ('page','theme','nav','full_site')),
  status       TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','running','done','failed','scheduled')),
  scheduled_at TEXT,
  started_at   TEXT,
  completed_at TEXT,
  triggered_by TEXT,
  artifacts_json TEXT DEFAULT '[]',
  error_message TEXT,
  r2_prefix    TEXT,
  version_id   TEXT,
  created_at   TEXT DEFAULT (datetime('now')),
  updated_at   TEXT DEFAULT (datetime('now'))
);

CREATE TABLE cms_revisions (
  id           TEXT PRIMARY KEY DEFAULT ('rev_' || lower(hex(randomblob(8)))),
  tenant_id    TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  entity_type  TEXT NOT NULL CHECK(entity_type IN ('page','section','block','theme','nav','brand')),
  entity_id    TEXT NOT NULL,
  page_id      TEXT,
  change_type  TEXT NOT NULL CHECK(change_type IN ('create','update','delete','reorder','publish','restore')),
  field_changed TEXT,
  before_json  TEXT,
  after_json   TEXT,
  summary      TEXT,
  created_by   TEXT,
  created_at   TEXT DEFAULT (datetime('now'))
);

CREATE TABLE cms_section_schemas (
  id                TEXT PRIMARY KEY DEFAULT ('schema_' || lower(hex(randomblob(6)))),
  tenant_id         TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  section_type      TEXT NOT NULL UNIQUE,
  label             TEXT NOT NULL,
  category          TEXT NOT NULL DEFAULT 'content',
  description       TEXT,
  preview_image_url TEXT,
  schema_json       TEXT NOT NULL DEFAULT '{}',
  default_json      TEXT NOT NULL DEFAULT '{}',
  max_per_page      INTEGER,
  is_active         INTEGER NOT NULL DEFAULT 1,
  sort_order        INTEGER NOT NULL DEFAULT 50,
  created_at        TEXT DEFAULT (datetime('now')),
  updated_at        TEXT DEFAULT (datetime('now'))
);

CREATE TABLE cms_themes (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  theme_key TEXT NOT NULL UNIQUE,
  theme_name TEXT NOT NULL,
  description TEXT,
  mode TEXT DEFAULT 'dark',
  is_active INTEGER DEFAULT 0,
  tokens_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
, version TEXT DEFAULT '1.0.0', status TEXT DEFAULT 'draft', brand_json TEXT DEFAULT '{}', color_tokens_json TEXT DEFAULT '{}', typography_tokens_json TEXT DEFAULT '{}', spacing_tokens_json TEXT DEFAULT '{}', radius_tokens_json TEXT DEFAULT '{}', shadow_tokens_json TEXT DEFAULT '{}', motion_tokens_json TEXT DEFAULT '{}', component_tokens_json TEXT DEFAULT '{}', layout_tokens_json TEXT DEFAULT '{}', light_tokens_json TEXT DEFAULT '{}', dark_tokens_json TEXT DEFAULT '{}', page_overrides_json TEXT DEFAULT '{}', css_vars_json TEXT DEFAULT '{}', custom_css TEXT, preview_image_url TEXT, r2_key TEXT, published_at TEXT, created_by TEXT DEFAULT 'agentsam', updated_by TEXT DEFAULT 'agentsam', asset_tokens_json TEXT DEFAULT '{}');

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

CREATE INDEX idx_agentsam_commands_tenant ON agentsam_commands(tenant_id);

CREATE INDEX idx_agentsam_ticket_events_ticket_created
  ON agentsam_ticket_events(ticket_id, created_at DESC);

CREATE INDEX idx_agentsam_tickets_project
  ON agentsam_tickets(project);

CREATE INDEX idx_agentsam_tickets_status_priority
  ON agentsam_tickets(status, priority);

CREATE INDEX idx_agentsam_tickets_updated_at
  ON agentsam_tickets(updated_at DESC);

CREATE INDEX idx_cms_asset_usages_asset
  ON cms_asset_usages (tenant_id, asset_id);

CREATE INDEX idx_cms_asset_usages_live
  ON cms_asset_usages (tenant_id, is_live);

CREATE INDEX idx_cms_blocks_section ON cms_page_content_blocks(tenant_id, page_route, section_key);

CREATE INDEX idx_cms_page_sections_deleted
  ON cms_page_sections (tenant_id, deleted_at);

CREATE INDEX idx_cms_page_versions_page  ON cms_page_versions(page_id, version_num);

CREATE INDEX idx_cms_pages_parent
ON cms_pages (parent_page_id);

CREATE INDEX idx_cms_pages_site_status
ON cms_pages (site_id, status);

CREATE INDEX idx_cms_pages_tenant_slug
ON cms_pages (tenant_id, slug);

CREATE INDEX idx_cms_pages_tenant_status
ON cms_pages (tenant_id, status);

CREATE INDEX idx_cms_publish_jobs_page   ON cms_publish_jobs(page_id, status);

CREATE INDEX idx_cms_revisions_entity    ON cms_revisions(entity_type, entity_id);

CREATE INDEX idx_cms_revisions_page      ON cms_revisions(page_id, created_at);

CREATE INDEX idx_cms_sections_route ON cms_page_sections(tenant_id, page_route);

CREATE INDEX idx_cms_themes_key
ON cms_themes(theme_key);

CREATE INDEX idx_cms_themes_status
ON cms_themes(status);

CREATE INDEX idx_cms_themes_tenant_active
ON cms_themes(tenant_id, is_active);

COMMIT;
PRAGMA foreign_keys = ON;
