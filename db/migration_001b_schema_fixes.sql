-- ============================================================
-- MIGRATION 001b — Schema Fixes (corrected)
-- Skips columns already present in donors.
-- cpas_application_steps uses step_key not title as step ref.
-- Run: npx wrangler d1 execute companionscpas --remote --file=db/migration_001b_schema_fixes.sql
-- ============================================================

-- 1. FIX TENANT MISMATCH
UPDATE cpas_foster_applications
  SET tenant_id = 'tenant_companionscpas'
  WHERE tenant_id = 'companions_cpas';

UPDATE cpas_application_forms
  SET tenant_id = 'tenant_companionscpas'
  WHERE tenant_id = 'companions_cpas';

-- 2. PATCH contact_requests — missing operational columns
ALTER TABLE contact_requests ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'tenant_companionscpas';
ALTER TABLE contact_requests ADD COLUMN phone TEXT;
ALTER TABLE contact_requests ADD COLUMN subject TEXT;
ALTER TABLE contact_requests ADD COLUMN assigned_to TEXT;
ALTER TABLE contact_requests ADD COLUMN resend_notified INTEGER DEFAULT 0;
ALTER TABLE contact_requests ADD COLUMN resend_message_id TEXT;
ALTER TABLE contact_requests ADD COLUMN updated_at TEXT DEFAULT (datetime('now'));

-- 3. PATCH donors — add missing columns (stripe_customer_id already exists)
ALTER TABLE donors ADD COLUMN is_recurring INTEGER DEFAULT 0;
ALTER TABLE donors ADD COLUMN recurring_interval TEXT;
ALTER TABLE donors ADD COLUMN resend_subscribed INTEGER DEFAULT 1;

-- 4. SEED donation_settings
INSERT OR IGNORE INTO donation_settings (
  id, tenant_id, provider, currency,
  default_amounts_json, allow_custom_amount,
  enable_donor_message, enable_anonymous_gifts,
  success_redirect_path, cancel_redirect_path,
  thank_you_email_template_id,
  created_at, updated_at
) VALUES (
  'dsettings_companionscpas',
  'tenant_companionscpas',
  'stripe', 'usd',
  '[25,50,100,250,500]',
  1, 1, 1,
  '/donate/thank-you', '/donate',
  'tpl_donation_receipt',
  datetime('now'), datetime('now')
);

-- 5. CREATE stripe_webhooks
CREATE TABLE IF NOT EXISTS stripe_webhooks (
  id               TEXT PRIMARY KEY,
  tenant_id        TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  event_type       TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'received',
  related_id       TEXT,
  payload_json     TEXT NOT NULL DEFAULT '{}',
  processed_at     TEXT,
  error_message    TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_stripe_webhooks_event_type ON stripe_webhooks(event_type);
CREATE INDEX IF NOT EXISTS idx_stripe_webhooks_status ON stripe_webhooks(status);

-- 6. CREATE cms_modals
CREATE TABLE IF NOT EXISTS cms_modals (
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

INSERT OR IGNORE INTO cms_modals (id, modal_key, title, subtitle, body, cta_label, cta_action, secondary_label, secondary_href, config_json) VALUES
  ('modal_foster_cta', 'foster_cta', 'Apply to Foster', 'Open your home. Change a life.', 'Fostering gives a dog safety, stability, and time to find their forever family. Applications take about 5 minutes.', 'Start Application', 'form_submit', 'Learn More', '/adopt', '{"form_id":"form_foster_application","submit_endpoint":"/api/foster/apply"}'),
  ('modal_donate_cta', 'donate_cta', 'Support Our Mission', 'Every dollar goes directly to dogs in need.', 'Your gift funds medical care, transport, and second chances for dogs at Caddo Parish Animal Services.', 'Donate Now', 'stripe_checkout', 'See How Funds Are Used', '/services', '{"stripe_product_id":null,"amounts":[25,50,100,250],"allow_custom":true}');

-- 7. CREATE oauth_integrations
CREATE TABLE IF NOT EXISTS oauth_integrations (
  id                    TEXT PRIMARY KEY,
  tenant_id             TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  provider              TEXT NOT NULL,
  scope                 TEXT NOT NULL,
  access_token          TEXT,
  refresh_token         TEXT,
  token_expires_at      TEXT,
  provider_account_id   TEXT,
  provider_account_name TEXT,
  status                TEXT NOT NULL DEFAULT 'disconnected',
  last_used_at          TEXT,
  last_error            TEXT,
  config_json           TEXT NOT NULL DEFAULT '{}',
  connected_by          TEXT,
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_oauth_integrations_provider ON oauth_integrations(tenant_id, provider);

INSERT OR IGNORE INTO oauth_integrations (id, provider, scope, status, config_json) VALUES
  ('oint_google',    'google',    'profile email',                                  'disconnected', '{"redirect_uri":"/api/social/oauth/google/callback"}'),
  ('oint_meta',      'meta',      'pages_show_list pages_read_engagement',          'disconnected', '{"redirect_uri":"/api/social/oauth/meta/callback"}'),
  ('oint_youtube',   'youtube',   'https://www.googleapis.com/auth/youtube.upload', 'disconnected', '{"redirect_uri":"/api/social/oauth/youtube/callback"}'),
  ('oint_instagram', 'instagram', 'instagram_basic instagram_content_publish',      'disconnected', '{"redirect_uri":"/api/social/oauth/instagram/callback"}');

-- 8. CREATE scheduled_posts
CREATE TABLE IF NOT EXISTS scheduled_posts (
  id               TEXT PRIMARY KEY,
  tenant_id        TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  platform         TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'draft',
  content_text     TEXT,
  media_url        TEXT,
  media_type       TEXT,
  scheduled_at     TEXT,
  published_at     TEXT,
  provider_post_id TEXT,
  error_message    TEXT,
  created_by       TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 9. PATCH meauxxx.com image URLs in D1
UPDATE cms_page_sections
  SET image_url = REPLACE(image_url, 'https://assets.meauxxx.com/static/pages/home/', '/static/animals/'),
      updated_at = datetime('now')
  WHERE image_url LIKE '%assets.meauxxx.com/static/pages/home/%';

UPDATE cms_page_sections
  SET config_json = REPLACE(config_json, 'https://assets.meauxxx.com/static/pages/home/', '/static/animals/'),
      updated_at = datetime('now')
  WHERE config_json LIKE '%assets.meauxxx.com/static/pages/home/%';
