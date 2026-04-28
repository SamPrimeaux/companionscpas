CREATE TABLE IF NOT EXISTS donation_checkout_sessions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  donor_name TEXT,
  donor_email TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  donation_type TEXT DEFAULT 'one_time',
  animal_id TEXT,
  campaign_id TEXT,
  message TEXT,
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,
  status TEXT DEFAULT 'created',
  checkout_url TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS donations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  donor_name TEXT,
  donor_email TEXT,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'usd',
  donation_type TEXT DEFAULT 'one_time',
  source TEXT DEFAULT 'stripe',
  external_id TEXT,
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,
  animal_id TEXT,
  campaign_id TEXT,
  message TEXT,
  receipt_sent INTEGER DEFAULT 0,
  donated_at TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS email_logs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  email_type TEXT NOT NULL,
  provider TEXT DEFAULT 'resend',
  provider_message_id TEXT,
  status TEXT DEFAULT 'queued',
  related_type TEXT,
  related_id TEXT,
  error_message TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  sent_at TEXT
);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  status TEXT DEFAULT 'subscribed',
  source TEXT DEFAULT 'website',
  created_at TEXT DEFAULT (datetime('now')),
  unsubscribed_at TEXT,
  UNIQUE(tenant_id, email)
);

CREATE INDEX IF NOT EXISTS idx_donations_tenant ON donations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_tenant ON email_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_stripe ON donation_checkout_sessions(stripe_checkout_session_id);
