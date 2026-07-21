-- Wire optimized Zeffy + Stripe wordmarks into cms_components / cms_assets / donate section config.

UPDATE cms_components
SET config_json = json_set(
  COALESCE(config_json, '{}'),
  '$.logo_url', 'https://assets.companionsofcaddo.org/static/assets/zeffy-wordmark.webp',
  '$.logo_height', 22,
  '$.logo_asset_key', 'payment_logo_zeffy',
  '$.label', 'Donate — 100% goes to animals',
  '$.note', 'fee-free'
),
updated_at = datetime('now')
WHERE id = 'payment_zeffy';

UPDATE cms_components
SET config_json = json_set(
  COALESCE(config_json, '{}'),
  '$.logo_url', 'https://assets.companionsofcaddo.org/static/assets/stripe-wordmark.webp',
  '$.logo_height', 22,
  '$.logo_asset_key', 'payment_logo_stripe',
  '$.label', 'Card or bank'
),
updated_at = datetime('now')
WHERE id = 'payment_stripe_donation_modal';

INSERT OR IGNORE INTO cms_assets (
  id, tenant_id, asset_key, filename, original_filename, mime_type, category, asset_type,
  r2_key, pub_url, public_url, status, is_live
) VALUES (
  'asset_logo_zeffy',
  'tenant_companionscpas',
  'payment_logo_zeffy',
  'zeffy-wordmark.webp',
  'zeffy-wordmark.webp',
  'image/webp',
  'image',
  'image',
  'static/assets/zeffy-wordmark.webp',
  'https://assets.companionsofcaddo.org/static/assets/zeffy-wordmark.webp',
  'https://assets.companionsofcaddo.org/static/assets/zeffy-wordmark.webp',
  'active',
  1
);

INSERT OR IGNORE INTO cms_assets (
  id, tenant_id, asset_key, filename, original_filename, mime_type, category, asset_type,
  r2_key, pub_url, public_url, status, is_live
) VALUES (
  'asset_logo_stripe',
  'tenant_companionscpas',
  'payment_logo_stripe',
  'stripe-wordmark.webp',
  'stripe-wordmark.webp',
  'image/webp',
  'image',
  'image',
  'static/assets/stripe-wordmark.webp',
  'https://assets.companionsofcaddo.org/static/assets/stripe-wordmark.webp',
  'https://assets.companionsofcaddo.org/static/assets/stripe-wordmark.webp',
  'active',
  1
);

UPDATE cms_assets
SET public_url = 'https://assets.companionsofcaddo.org/static/assets/zeffy-wordmark.webp',
    pub_url = 'https://assets.companionsofcaddo.org/static/assets/zeffy-wordmark.webp',
    r2_key = 'static/assets/zeffy-wordmark.webp',
    mime_type = 'image/webp',
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE id = 'asset_logo_zeffy' OR asset_key = 'payment_logo_zeffy';

UPDATE cms_assets
SET public_url = 'https://assets.companionsofcaddo.org/static/assets/stripe-wordmark.webp',
    pub_url = 'https://assets.companionsofcaddo.org/static/assets/stripe-wordmark.webp',
    r2_key = 'static/assets/stripe-wordmark.webp',
    mime_type = 'image/webp',
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE id = 'asset_logo_stripe' OR asset_key = 'payment_logo_stripe';

-- Refresh /donate payment hero config so logos resolve from components + asset keys.
UPDATE cms_page_sections
SET config_json = '{"show_tax_badge":true,"payment_methods_json":[{"id":"zeffy","enabled":true,"label":"Donate — 100% goes to animals","note":"fee-free","url_field":"zeffy_donate_url","component_id":"payment_zeffy","logo_asset_key":"payment_logo_zeffy","style":"zeffy","logo_height":22},{"id":"paypal","enabled":true,"label":"Donate via PayPal","url_field":"paypal_donate_url","component_id":"payment_paypal","style":"paypal"},{"id":"venmo","enabled":true,"label":"Pay on Venmo","url_field":"venmo_donate_url","component_id":"payment_venmo","style":"venmo"},{"id":"amazon_wishlist","enabled":true,"label":"Send supplies","url_field":"amazon_wishlist_url","component_id":"wishlist_amazon","logo_asset_key":"payment_logo_amazon","style":"amazon","logo_height":28},{"id":"stripe","enabled":true,"label":"Card or bank","action":"donate","component_id":"payment_stripe_donation_modal","logo_asset_key":"payment_logo_stripe","style":"stripe","logo_height":22}]}',
    updated_at = datetime('now')
WHERE id = 'sec_donate_payment_hero';
