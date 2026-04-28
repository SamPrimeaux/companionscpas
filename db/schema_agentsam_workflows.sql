CREATE TABLE IF NOT EXISTS agentsam_mcp_workflows (
  id TEXT PRIMARY KEY,

  tenant_id TEXT NOT NULL DEFAULT 'tenant_companionscpas',

  workflow_key TEXT NOT NULL UNIQUE,
  workflow_name TEXT NOT NULL,
  description TEXT,

  -- JSON array of steps (tool_key + config)
  steps_json TEXT NOT NULL DEFAULT '[]',

  -- triggers: manual / cron / webhook / event
  trigger_type TEXT DEFAULT 'manual',
  trigger_config TEXT DEFAULT '{}',

  -- role safety
  allowed_roles TEXT DEFAULT '["owner","developer","admin"]',

  -- execution config
  execution_mode TEXT DEFAULT 'sequential', -- sequential | parallel
  retry_policy TEXT DEFAULT '{"retries":1}',

  -- observability
  last_run_at TEXT,
  last_status TEXT,
  run_count INTEGER DEFAULT 0,

  -- flags
  is_enabled INTEGER DEFAULT 1,
  safety_level TEXT DEFAULT 'standard',

  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
