-- Remote D1 schema baseline
-- Source: companionscpas
-- Exported UTC: 2026-08-22T22:15:30+00:00
-- Generated read-only from sqlite_master; review before applying.

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- TABLES

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

COMMIT;
PRAGMA foreign_keys = ON;
