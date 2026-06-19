-- Dashboard notifications (donations, contact forms, foster apps, etc.)
CREATE TABLE IF NOT EXISTS dashboard_notifications (
  id               TEXT PRIMARY KEY,
  tenant_id        TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  type             TEXT NOT NULL,
  title            TEXT NOT NULL,
  body             TEXT,
  status           TEXT NOT NULL DEFAULT 'unread',
  source           TEXT,
  related_type     TEXT,
  related_id       TEXT,
  action_url       TEXT,
  action_label     TEXT,
  reply_to_email   TEXT,
  reply_subject    TEXT,
  metadata_json    TEXT NOT NULL DEFAULT '{}',
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  read_at          TEXT,
  dismissed_at     TEXT
);

CREATE INDEX IF NOT EXISTS idx_dashboard_notifications_status
  ON dashboard_notifications(tenant_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dashboard_notifications_related
  ON dashboard_notifications(related_type, related_id);

-- Ensure v2 contact table exists (contact_api writes here)
CREATE TABLE IF NOT EXISTS contact_requests_v2 (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  request_type TEXT DEFAULT 'general',
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new',
  source_path TEXT,
  user_agent TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_contact_requests_v2_status ON contact_requests_v2(status);
CREATE INDEX IF NOT EXISTS idx_contact_requests_v2_created ON contact_requests_v2(created_at);

-- Backfill live donation + contact requests (skip if already present)
INSERT INTO dashboard_notifications
  (id, tenant_id, type, title, body, status, source, related_type, related_id,
   action_url, action_label, reply_to_email, reply_subject, metadata_json, created_at)
SELECT
  'notif_' || d.id,
  'tenant_companionscpas',
  'donation',
  'Donation received — $' || printf('%.2f', d.amount_cents / 100.0),
  COALESCE(dr.full_name, dr.email, 'Anonymous donor') || ' donated $' || printf('%.2f', d.amount_cents / 100.0) || '.',
  'unread',
  'stripe',
  'donation',
  d.id,
  '/dashboard/fundraising',
  'View in Giving',
  dr.email,
  'Thank you for your gift — Companions of CPAS',
  json_object('amount_cents', d.amount_cents, 'stripe_payment_intent_id', d.stripe_payment_intent_id),
  COALESCE(d.donated_at, datetime('now'))
FROM donations d
LEFT JOIN donors dr ON dr.id = d.donor_id
WHERE d.status = 'succeeded'
  AND NOT EXISTS (
    SELECT 1 FROM dashboard_notifications n
    WHERE n.related_type = 'donation' AND n.related_id = d.id
  );

INSERT INTO dashboard_notifications
  (id, tenant_id, type, title, body, status, source, related_type, related_id,
   action_url, action_label, reply_to_email, reply_subject, metadata_json, created_at)
SELECT
  'notif_contact_' || c.id,
  'tenant_companionscpas',
  'contact',
  'New contact — ' || COALESCE(c.request_type, 'general'),
  c.name || ' (' || c.email || '): ' || substr(COALESCE(c.message, ''), 1, 280),
  'unread',
  'contact_form',
  'contact',
  c.id,
  '/dashboard/email',
  'Open Email',
  c.email,
  'Re: your message to Companions of CPAS',
  json_object('name', c.name, 'email', c.email, 'request_type', COALESCE(c.request_type, 'general')),
  COALESCE(c.created_at, datetime('now'))
FROM contact_requests_v2 c
WHERE NOT EXISTS (
  SELECT 1 FROM dashboard_notifications n
  WHERE n.related_type = 'contact' AND n.related_id = c.id
);

INSERT INTO dashboard_notifications
  (id, tenant_id, type, title, body, status, source, related_type, related_id,
   action_url, action_label, reply_to_email, reply_subject, metadata_json, created_at)
SELECT
  'notif_contact_legacy_' || c.id,
  'tenant_companionscpas',
  'contact',
  'New contact — general',
  c.name || ' (' || COALESCE(c.email, 'no email') || '): ' || substr(COALESCE(c.message, ''), 1, 280),
  'unread',
  'contact_form',
  'contact',
  c.id,
  '/dashboard/email',
  'Open Email',
  c.email,
  'Re: your message to Companions of CPAS',
  json_object('name', c.name, 'email', c.email, 'request_type', 'general'),
  COALESCE(c.created_at, datetime('now'))
FROM contact_requests c
WHERE NOT EXISTS (
  SELECT 1 FROM dashboard_notifications n
  WHERE n.related_type = 'contact' AND n.related_id = c.id
);
