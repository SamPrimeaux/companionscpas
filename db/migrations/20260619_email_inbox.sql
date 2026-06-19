-- Email inbox + campaigns for /dashboard/email
-- Run: npx wrangler d1 execute companionscpas --remote --file=db/migrations/20260619_email_inbox.sql

CREATE TABLE IF NOT EXISTS inbound_emails (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  resend_email_id TEXT,
  provider_event_id TEXT,
  message_id TEXT,
  thread_key TEXT,
  mailbox TEXT NOT NULL,
  from_email TEXT NOT NULL,
  from_name TEXT,
  to_json TEXT DEFAULT '[]',
  cc_json TEXT DEFAULT '[]',
  subject TEXT,
  preview_text TEXT,
  body_html TEXT,
  body_text TEXT,
  attachments_json TEXT DEFAULT '[]',
  status TEXT DEFAULT 'unread',
  in_reply_to TEXT,
  related_type TEXT,
  related_id TEXT,
  raw_event_json TEXT,
  received_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_inbound_resend_email
  ON inbound_emails(tenant_id, resend_email_id)
  WHERE resend_email_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inbound_mailbox
  ON inbound_emails(tenant_id, mailbox, status, received_at);

CREATE TABLE IF NOT EXISTS email_campaigns (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT,
  body_text TEXT,
  from_email TEXT,
  audience_type TEXT DEFAULT 'manual',
  audience_json TEXT DEFAULT '[]',
  status TEXT DEFAULT 'draft',
  scheduled_at TEXT,
  sent_at TEXT,
  stats_json TEXT DEFAULT '{}',
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_email_campaigns_tenant
  ON email_campaigns(tenant_id, status, updated_at);
