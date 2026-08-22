-- Remote D1 schema baseline
-- Source: companionscpas
-- Exported UTC: 2026-08-22T22:15:30+00:00
-- Generated read-only from sqlite_master; review before applying.

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- TABLES

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

-- INDEXS

CREATE INDEX idx_cms_asset_usages_asset
  ON cms_asset_usages (tenant_id, asset_id);

CREATE INDEX idx_cms_asset_usages_live
  ON cms_asset_usages (tenant_id, is_live);

COMMIT;
PRAGMA foreign_keys = ON;
