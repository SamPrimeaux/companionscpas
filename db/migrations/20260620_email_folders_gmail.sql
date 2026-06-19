-- Email folders, message flags, drafts, Gmail sync support
-- Run: npx wrangler d1 execute companionscpas --remote --file=db/migrations/20260620_email_folders_gmail.sql

CREATE TABLE IF NOT EXISTS email_folders (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  is_system INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 50,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(tenant_id, slug)
);

CREATE TABLE IF NOT EXISTS email_drafts (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  to_json TEXT DEFAULT '[]',
  cc_json TEXT DEFAULT '[]',
  subject TEXT,
  body_html TEXT,
  body_text TEXT,
  from_email TEXT,
  folder_id TEXT,
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_email_drafts_tenant ON email_drafts(tenant_id, updated_at);

-- Safe column adds (ignore errors if already applied)
ALTER TABLE inbound_emails ADD COLUMN folder_id TEXT;
ALTER TABLE inbound_emails ADD COLUMN is_important INTEGER DEFAULT 0;
ALTER TABLE inbound_emails ADD COLUMN is_deleted INTEGER DEFAULT 0;
ALTER TABLE inbound_emails ADD COLUMN source TEXT DEFAULT 'resend';
ALTER TABLE inbound_emails ADD COLUMN gmail_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_inbound_gmail_id
  ON inbound_emails(tenant_id, gmail_id)
  WHERE gmail_id IS NOT NULL;

INSERT OR IGNORE INTO email_folders (id, tenant_id, name, slug, is_system, sort_order)
VALUES ('fld_onboarding', 'tenant_companionscpas', 'Onboarding', 'onboarding', 1, 10);
