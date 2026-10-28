-- Data-driven checkout popups + event registrations. ADDITIVE ONLY (no existing table touched).
-- Popup = a cms_globals row (global_type='checkout_modal'), shaped like the AgentSam SDK spine
-- (apps/ecommerce-cms-agentsam db/schema/cms.sql) so Companions can adopt the SDK editor later.

-- SDK expects accounts(id); Companions identifies its tenant as tenant_companionscpas.
CREATE TABLE IF NOT EXISTS accounts (id TEXT PRIMARY KEY);
INSERT OR IGNORE INTO accounts (id) VALUES ('tenant_companionscpas');

CREATE TABLE IF NOT EXISTS cms_globals (
  id                    TEXT PRIMARY KEY DEFAULT ('cmsg_' || lower(hex(randomblob(8)))),
  account_id            TEXT NOT NULL REFERENCES accounts(id),
  global_key            TEXT NOT NULL,
  global_type           TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'draft',
  inline_content_json   TEXT NOT NULL DEFAULT '{}',
  content_r2_key        TEXT,
  content_version       INTEGER NOT NULL DEFAULT 0,
  content_hash          TEXT,
  legacy_page_id        INTEGER,
  legacy_section_id     INTEGER UNIQUE,
  metadata_json         TEXT NOT NULL DEFAULT '{}',
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(account_id, global_key)
);
CREATE INDEX IF NOT EXISTS idx_cms_globals_account ON cms_globals(account_id, global_type, status);

-- One row per paid registration. Idempotent on the Stripe PaymentIntent.
CREATE TABLE IF NOT EXISTS event_registrations (
  id                        TEXT PRIMARY KEY,
  tenant_id                 TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  campaign_id               TEXT,
  modal_key                 TEXT,
  stripe_payment_intent_id  TEXT NOT NULL UNIQUE,
  donation_id               TEXT,
  donation_intent_id        TEXT,
  attendee_name             TEXT,
  attendee_email            TEXT,
  attendee_phone            TEXT,
  lines_json                TEXT NOT NULL DEFAULT '[]',   -- [{key,label,qty,price_cents}]
  hands                     INTEGER NOT NULL DEFAULT 0,
  total_cents               INTEGER NOT NULL DEFAULT 0,
  fields_json               TEXT NOT NULL DEFAULT '{}',
  checked_in_at             TEXT,
  notes                     TEXT,
  created_at                TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_event_registrations_campaign ON event_registrations(tenant_id, campaign_id, created_at DESC);

-- Freedom Ride popup. Prices are NOT stored here: items_source pulls the same tickets the page renders,
-- so the page and the popup cannot drift. Dormant until the campaign's event config sets "checkout_modal".
INSERT OR IGNORE INTO cms_globals (id, account_id, global_key, global_type, status, inline_content_json)
VALUES (
  'cmsg_freedom_ride_checkout', 'tenant_companionscpas', 'freedom_ride_checkout', 'checkout_modal', 'published',
  '{"mode":"items","campaign_id":"campaign_freedom-ride-poker-run_1792800874305","items_source":"campaign_event_tickets","selected_item_keys":["driver","passenger"],"participant_items":["driver","passenger"],"eyebrow":"Companions of CPAS","title":"The Freedom Ride","subtitle":"Saturday, November 7. Pick your entries, then pay securely below.","items_title":"Choose your entries","details_title":"Your details","submit_label":"Pay {total}","success_title":"You are in!","success_message":"Thank you. A receipt is on its way to your email. Registration is 9 to 10 AM at 3 State Harley-Davidson in Bossier City.","note_prefix":"Poker Run Entry","cover_fees":{"enabled":true,"default":false},"fields":[{"key":"phone","label":"Phone","type":"tel","required":false,"placeholder":"For day-of updates"},{"key":"vehicle","label":"Vehicle","type":"text","required":false,"placeholder":"e.g. Harley, truck, trike"}],"item_limits":{"driver":{"max":10},"passenger":{"max":10},"extra_hand":{"max":10}}}'
);
