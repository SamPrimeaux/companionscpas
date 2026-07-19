-- Asset usage registry: where each cms_assets row is referenced / live.
-- Run: npx wrangler d1 execute companionscpas --remote --file=db/migrations/20260719_cms_asset_usages.sql

CREATE TABLE IF NOT EXISTS cms_asset_usages (
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

CREATE INDEX IF NOT EXISTS idx_cms_asset_usages_asset
  ON cms_asset_usages (tenant_id, asset_id);

CREATE INDEX IF NOT EXISTS idx_cms_asset_usages_live
  ON cms_asset_usages (tenant_id, is_live);
