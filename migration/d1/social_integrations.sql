-- Migration: social_integrations
-- Adds three tables for social provider OAuth connections, embed config, and post drafts.
-- Use CREATE TABLE IF NOT EXISTS throughout — safe to re-run.
-- No secrets are stored in plaintext. token_ciphertext must be encrypted before insert.
-- Run via: wrangler d1 execute companionscpas --file=migration/d1/social_integrations.sql

-- social_provider_connections
-- One row per connected social account (Facebook Page, Instagram Business, YouTube Channel).
-- token_ciphertext must be AES-256 encrypted before storage. Never insert plaintext tokens.
CREATE TABLE IF NOT EXISTS social_provider_connections (
  id                              TEXT PRIMARY KEY,
  tenant_id                       TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  provider                        TEXT NOT NULL,
  account_label                   TEXT,
  page_id                         TEXT,
  page_name                       TEXT,
  status                          TEXT NOT NULL DEFAULT 'disconnected',
  scopes                          TEXT,
  token_ciphertext                TEXT,
  token_expires_at                TEXT,
  created_at                      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_social_provider_connections_tenant_provider
  ON social_provider_connections (tenant_id, provider);

-- social_embed_settings
-- Stores embed config for the public /community page Facebook Page Plugin.
-- One row per provider per tenant. ON CONFLICT upsert is safe.
CREATE TABLE IF NOT EXISTS social_embed_settings (
  id                              TEXT PRIMARY KEY,
  tenant_id                       TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  provider                        TEXT NOT NULL,
  page_url                        TEXT,
  config_json                     TEXT,
  enabled                         INTEGER NOT NULL DEFAULT 0,
  created_at                      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_social_embed_settings_tenant_provider
  ON social_embed_settings (tenant_id, provider);

-- social_post_drafts
-- Stores post drafts for all platforms.
-- Note: the existing social_post_drafts table may already exist from prior migrations.
-- This version adds reviewed_by, published_at, media_asset_key columns if absent.
-- If the table already exists with a different schema, do not drop it — add columns manually.
CREATE TABLE IF NOT EXISTS social_post_drafts_v2 (
  id                              TEXT PRIMARY KEY,
  tenant_id                       TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  provider                        TEXT NOT NULL DEFAULT 'facebook',
  status                          TEXT NOT NULL DEFAULT 'draft',
  message                         TEXT NOT NULL,
  link_url                        TEXT,
  media_asset_key                 TEXT,
  external_post_id                TEXT,
  error_message                   TEXT,
  created_by                      TEXT,
  reviewed_by                     TEXT,
  published_at                    TEXT,
  created_at                      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Note: the original social_post_drafts table created by an earlier migration is preserved.
-- social_post_drafts_v2 is a clean normalized version for the Facebook publish pipeline.
-- Use social_post_drafts for the existing dashboard draft flow.
-- Use social_post_drafts_v2 for the new Facebook Page publishing scaffold.
