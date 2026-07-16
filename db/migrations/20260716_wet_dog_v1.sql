-- Wet Dog V1: reproducible entry schema, state tracking, and payment component registry.

CREATE TABLE IF NOT EXISTS competition_entries (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  campaign_id TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  dog_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  asset_id TEXT,
  r2_key TEXT,
  photo_url TEXT,
  donation_intent_id TEXT,
  stripe_payment_intent_id TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  is_approved INTEGER NOT NULL DEFAULT 0,
  approved_by TEXT,
  approved_at TEXT,
  rejection_reason TEXT,
  vote_count INTEGER NOT NULL DEFAULT 0,
  ip_address TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (campaign_id) REFERENCES fundraising_campaigns(id),
  FOREIGN KEY (asset_id) REFERENCES cms_assets(id),
  FOREIGN KEY (donation_intent_id) REFERENCES donation_intents(id)
);

ALTER TABLE competition_entries ADD COLUMN owner_phone TEXT;
ALTER TABLE competition_entries ADD COLUMN caption TEXT;
ALTER TABLE competition_entries ADD COLUMN expected_amount_cents INTEGER NOT NULL DEFAULT 1000;
ALTER TABLE competition_entries ADD COLUMN submission_status TEXT NOT NULL DEFAULT 'pending_payment';
ALTER TABLE competition_entries ADD COLUMN moderation_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE competition_entries ADD COLUMN failure_stage TEXT;
ALTER TABLE competition_entries ADD COLUMN failure_code TEXT;
ALTER TABLE competition_entries ADD COLUMN failure_message TEXT;
-- Admin alerts use dashboard_notifications + email_logs (not a fake status column).
ALTER TABLE competition_entries ADD COLUMN admin_notified_at TEXT;
ALTER TABLE competition_entries ADD COLUMN failure_notified_at TEXT;
ALTER TABLE competition_entries ADD COLUMN abandoned_at TEXT;
ALTER TABLE competition_entries ADD COLUMN archived_at TEXT;

CREATE INDEX IF NOT EXISTS idx_competition_entries_campaign_created
  ON competition_entries (campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_competition_entries_payment
  ON competition_entries (payment_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_competition_entries_moderation
  ON competition_entries (moderation_status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_competition_entries_stripe_pi
  ON competition_entries (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

UPDATE fundraising_campaigns
SET config_json = json_set(
      COALESCE(NULLIF(config_json, ''), '{}'),
      '$.entry_fee_cents', 1000,
      '$.entry_type', 'photo_competition',
      '$.entry_status', 'open'
    ),
    updated_at = datetime('now')
WHERE id = 'campaign_wet-dog-competition-entry_1782850774741';

INSERT OR REPLACE INTO cms_components
  (id, label, type, config_json, sort_order, active, updated_at)
VALUES (
  'payment_stripe_donation_modal',
  'Stripe Donation Modal',
  'payment_modal',
  '{"active_version":"2026-07-16-38e57dc","active_asset_url":"https://assets.companionsofcaddo.org/static/js/donate-modal.js","rollback_asset_url":"https://assets.companionsofcaddo.org/static/components/payments/donation-modal/2026-07-16-38e57dc/donate-modal.js","sha256":"a483f735f7982225c1ad2d5f5065efdf7aee712c87fb7bb438e881cdbdba7d0d","source_commit":"38e57dc3a8de8d4ca2a8956511be7ce86dd96301","triggers":["data-action=donate","data-donate","window.DonateModal.open","window.openDonateModal"],"status":"frozen"}',
  5,
  1,
  datetime('now')
);
