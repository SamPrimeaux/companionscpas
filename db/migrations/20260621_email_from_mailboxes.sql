-- Outbound sender tracking (idempotent for remote D1)
CREATE TABLE IF NOT EXISTS email_logs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  email_type TEXT NOT NULL,
  from_email TEXT,
  provider TEXT DEFAULT 'resend',
  provider_message_id TEXT,
  status TEXT DEFAULT 'queued',
  related_type TEXT,
  related_id TEXT,
  error_message TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  sent_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_email_logs_tenant ON email_logs(tenant_id);
