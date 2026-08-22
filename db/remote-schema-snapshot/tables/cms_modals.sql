-- Remote D1 schema baseline
-- Source: companionscpas
-- Exported UTC: 2026-08-22T22:15:30+00:00
-- Generated read-only from sqlite_master; review before applying.

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- TABLES

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

COMMIT;
PRAGMA foreign_keys = ON;
