CREATE TABLE IF NOT EXISTS social_connections (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  account_name TEXT,
  account_id TEXT,
  page_id TEXT,
  instagram_business_account_id TEXT,
  youtube_channel_id TEXT,
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TEXT,
  scopes_json TEXT DEFAULT '[]',
  status TEXT DEFAULT 'disconnected',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(tenant_id, platform, account_id)
);

CREATE TABLE IF NOT EXISTS social_post_drafts (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  created_by TEXT,
  title TEXT,
  body TEXT NOT NULL,
  platforms_json TEXT DEFAULT '[]',
  media_asset_id TEXT,
  media_url TEXT,
  related_type TEXT,
  related_id TEXT,
  status TEXT DEFAULT 'draft',
  scheduled_at TEXT,
  approved_by TEXT,
  approved_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS social_publish_jobs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  draft_id TEXT,
  platform TEXT NOT NULL,
  connection_id TEXT,
  status TEXT DEFAULT 'queued',
  provider_post_id TEXT,
  provider_response_json TEXT DEFAULT '{}',
  error_message TEXT,
  queued_at TEXT DEFAULT (datetime('now')),
  published_at TEXT,
  failed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_social_connections_tenant ON social_connections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_social_drafts_tenant ON social_post_drafts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_social_jobs_tenant ON social_publish_jobs(tenant_id);
