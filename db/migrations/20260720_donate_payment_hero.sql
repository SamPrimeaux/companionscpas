-- Donate payment hero: D1 SSOT for payment method URLs/logos + CMS section on /donate.
-- URLs live in donation_settings; logos/labels in cms_components; order/toggles in section config.

-- Sync payment button URLs to donation_settings (settings win at render time; keep components in sync for CMS previews).
UPDATE cms_components
SET config_json = json_set(
  COALESCE(config_json, '{}'),
  '$.url', (SELECT paypal_donate_url FROM donation_settings WHERE tenant_id = 'tenant_companionscpas' LIMIT 1),
  '$.logo_url', 'https://assets.companionsofcaddo.org/static/assets/PayPal.svg.webp',
  '$.logo_height', 22,
  '$.label', 'Donate via PayPal'
),
updated_at = datetime('now')
WHERE id = 'payment_paypal';

UPDATE cms_components
SET config_json = json_set(
  COALESCE(config_json, '{}'),
  '$.url', (SELECT venmo_donate_url FROM donation_settings WHERE tenant_id = 'tenant_companionscpas' LIMIT 1),
  '$.logo_url', 'https://assets.companionsofcaddo.org/static/assets/venmo-official-logo.svg',
  '$.logo_height', 22,
  '$.label', 'Pay on Venmo'
),
updated_at = datetime('now')
WHERE id = 'payment_venmo';

-- Amazon wishlist: keep real button asset; type payment_button so catalog tools find it.
INSERT OR REPLACE INTO cms_components (id, label, type, config_json, sort_order, active, updated_at) VALUES (
  'wishlist_amazon',
  'Amazon Wishlist',
  'payment_button',
  '{"url":"https://www.amazon.com/hz/wishlist/ls/3RBTXOS6HM1MF","logo_url":"https://assets.companionsofcaddo.org/static/assets/amz-wishlist-bttn.webp","logo_height":28,"label":"Send supplies","logo_asset_key":"payment_logo_amazon","background":"#ffffff"}',
  35, 1, datetime('now')
);

-- Zeffy: fee-free primary (text pill; no external logo file required).
INSERT OR REPLACE INTO cms_components (id, label, type, config_json, sort_order, active, updated_at) VALUES (
  'payment_zeffy',
  'Zeffy Fee-Free Donate',
  'payment_button',
  '{"url":"https://www.zeffy.com/en-US/donation-form/46329a28-bbc2-488b-b98a-fbc275e1dcde","label":"Donate — 100% goes to animals","note":"fee-free","brand_color":"#1a1622","background":"#1a1622"}',
  20, 1, datetime('now')
);

UPDATE cms_components
SET config_json = json_set(
  COALESCE(config_json, '{}'),
  '$.url', (SELECT zeffy_donate_url FROM donation_settings WHERE tenant_id = 'tenant_companionscpas' LIMIT 1)
),
updated_at = datetime('now')
WHERE id = 'payment_zeffy';

-- Ensure amazon wishlist URL column is populated.
UPDATE donation_settings
SET amazon_wishlist_url = COALESCE(
  NULLIF(TRIM(amazon_wishlist_url), ''),
  'https://www.amazon.com/hz/wishlist/ls/3RBTXOS6HM1MF'
)
WHERE tenant_id = 'tenant_companionscpas';

-- Logo asset keys used by payment_methods_json / resolvePaymentMethods.
UPDATE cms_assets
SET asset_key = 'payment_logo_amazon',
    public_url = 'https://assets.companionsofcaddo.org/static/assets/amz-wishlist-bttn.webp',
    pub_url = 'https://assets.companionsofcaddo.org/static/assets/amz-wishlist-bttn.webp',
    r2_key = 'static/assets/amz-wishlist-bttn.webp',
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE id = 'asset_logo_amazon_wishlist';

INSERT OR IGNORE INTO cms_assets (
  id, tenant_id, asset_key, filename, original_filename, mime_type, category, asset_type,
  r2_key, pub_url, public_url, status, is_live
) VALUES (
  'asset_logo_paypal',
  'tenant_companionscpas',
  'payment_logo_paypal',
  'PayPal.svg.webp',
  'PayPal.svg.webp',
  'image/webp',
  'image',
  'image',
  'static/assets/PayPal.svg.webp',
  'https://assets.companionsofcaddo.org/static/assets/PayPal.svg.webp',
  'https://assets.companionsofcaddo.org/static/assets/PayPal.svg.webp',
  'active',
  1
);

INSERT OR IGNORE INTO cms_assets (
  id, tenant_id, asset_key, filename, original_filename, mime_type, category, asset_type,
  r2_key, pub_url, public_url, status, is_live
) VALUES (
  'asset_logo_venmo',
  'tenant_companionscpas',
  'payment_logo_venmo',
  'venmo-official-logo.svg',
  'venmo-official-logo.svg',
  'image/svg+xml',
  'image',
  'image',
  'static/assets/venmo-official-logo.svg',
  'https://assets.companionsofcaddo.org/static/assets/venmo-official-logo.svg',
  'https://assets.companionsofcaddo.org/static/assets/venmo-official-logo.svg',
  'active',
  1
);

-- Section schema for CMS editor (order/toggles without redeploy).
INSERT OR REPLACE INTO cms_section_schemas (
  id, tenant_id, section_type, label, category, description, schema_json, default_json, is_active, sort_order, updated_at
) VALUES (
  'schema_donate_payment_hero',
  'tenant_companionscpas',
  'donate_payment_hero',
  'Donate Payment Hero',
  'conversion',
  'Split hero with D1-driven payment methods (donation_settings URLs + cms_components logos).',
  '{"settings":[
    {"id":"eyebrow","type":"text","label":"Eyebrow","max_length":60,"default":"Give · Care · Transport"},
    {"id":"heading","type":"text","label":"Heading","max_length":120,"default":"Every gift funds care, transport, and second chances."},
    {"id":"body","type":"textarea","label":"Body","max_length":400},
    {"id":"image_url","type":"url","label":"Hero image URL"},
    {"id":"show_tax_badge","type":"toggle","label":"Show 501(c)(3) badge","default":true},
    {"id":"payment_methods_json","type":"json","label":"Payment methods (order / enable / labels)","default":"[{\\"id\\":\\"zeffy\\",\\"enabled\\":true,\\"label\\":\\"Donate — 100% goes to animals\\",\\"note\\":\\"fee-free\\",\\"url_field\\":\\"zeffy_donate_url\\",\\"component_id\\":\\"payment_zeffy\\",\\"style\\":\\"zeffy\\"},{\\"id\\":\\"paypal\\",\\"enabled\\":true,\\"label\\":\\"Donate via PayPal\\",\\"url_field\\":\\"paypal_donate_url\\",\\"component_id\\":\\"payment_paypal\\",\\"style\\":\\"paypal\\"},{\\"id\\":\\"venmo\\",\\"enabled\\":true,\\"label\\":\\"Pay on Venmo\\",\\"url_field\\":\\"venmo_donate_url\\",\\"component_id\\":\\"payment_venmo\\",\\"style\\":\\"venmo\\"},{\\"id\\":\\"amazon_wishlist\\",\\"enabled\\":true,\\"label\\":\\"Send supplies\\",\\"url_field\\":\\"amazon_wishlist_url\\",\\"component_id\\":\\"wishlist_amazon\\",\\"logo_asset_key\\":\\"payment_logo_amazon\\",\\"style\\":\\"amazon\\",\\"logo_height\\":28},{\\"id\\":\\"stripe\\",\\"enabled\\":true,\\"label\\":\\"Card or bank\\",\\"note\\":\\"Stripe\\",\\"action\\":\\"donate\\",\\"component_id\\":\\"payment_stripe_donation_modal\\",\\"style\\":\\"stripe\\"}]"}
  ]}',
  '{"eyebrow":"Give · Care · Transport","heading":"Every gift funds care, transport, and second chances.","show_tax_badge":true}',
  1,
  15,
  datetime('now')
);

-- Also keep donation_block schema payment_methods_json aligned to component_id.
UPDATE cms_section_schemas
SET schema_json = REPLACE(
  schema_json,
  '"logo_asset_key":"payment_logo_zeffy"',
  '"component_id":"payment_zeffy","style":"zeffy"'
),
updated_at = datetime('now')
WHERE section_type = 'donation_block';

-- Insert payment hero at top of /donate (above Wet Dog).
INSERT OR REPLACE INTO cms_page_sections (
  id, tenant_id, page_route, section_key, section_type,
  eyebrow, heading, body, image_url,
  sort_order, is_visible, config_json, updated_at
) VALUES (
  'sec_donate_payment_hero',
  'tenant_companionscpas',
  '/donate',
  'donate_payment_hero',
  'donate_payment_hero',
  'Give · Care · Transport',
  'Every gift funds care, transport, and second chances.',
  'Choose a fee-free gift, PayPal, Venmo, supplies from our wishlist, or a card donation — all of it stays with Companions of CPAS.',
  'https://assets.companionsofcaddo.org/static/cms/uploads/2026/07/1784219444043-wet-dog-comp..jpg',
  5,
  1,
  '{"show_tax_badge":true,"payment_methods_json":[{"id":"zeffy","enabled":true,"label":"Donate — 100% goes to animals","note":"fee-free","url_field":"zeffy_donate_url","component_id":"payment_zeffy","style":"zeffy"},{"id":"paypal","enabled":true,"label":"Donate via PayPal","url_field":"paypal_donate_url","component_id":"payment_paypal","style":"paypal"},{"id":"venmo","enabled":true,"label":"Pay on Venmo","url_field":"venmo_donate_url","component_id":"payment_venmo","style":"venmo"},{"id":"amazon_wishlist","enabled":true,"label":"Send supplies","url_field":"amazon_wishlist_url","component_id":"wishlist_amazon","logo_asset_key":"payment_logo_amazon","style":"amazon","logo_height":28},{"id":"stripe","enabled":true,"label":"Card or bank","note":"Stripe","action":"donate","component_id":"payment_stripe_donation_modal","style":"stripe"}]}',
  datetime('now')
);
