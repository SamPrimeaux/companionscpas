-- cms_components: reusable UI components (social links, payment buttons, share actions)
-- Each row is a named, typed block whose config_json drives rendering.
-- Renderers call getComponent(id, env) instead of hardcoding URLs or SVGs.

CREATE TABLE IF NOT EXISTS cms_components (
  id          TEXT PRIMARY KEY,
  label       TEXT NOT NULL,
  type        TEXT NOT NULL,         -- social_link | payment_button | share_action
  config_json TEXT NOT NULL DEFAULT '{}',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  active      INTEGER NOT NULL DEFAULT 1,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Social links
INSERT OR REPLACE INTO cms_components (id, label, type, config_json, sort_order, active) VALUES
(
  'social_facebook',
  'Facebook',
  'social_link',
  '{"url":"https://www.facebook.com/people/Companions-of-CPAS/100069291576354/","icon":"facebook","label":"Facebook","brand_color":"#1877F2"}',
  10, 1
),
(
  'social_instagram',
  'Instagram',
  'social_link',
  '{"url":"https://www.instagram.com/companionscpas","icon":"instagram","label":"Instagram","brand_color":"#E1306C"}',
  20, 1
);

-- Payment buttons
INSERT OR REPLACE INTO cms_components (id, label, type, config_json, sort_order, active) VALUES
(
  'payment_paypal',
  'PayPal Donate Button',
  'payment_button',
  '{"url":"https://www.paypal.com/donate/?hosted_button_id=QNABSTFR2HSBL","logo_url":"https://assets.companionsofcaddo.org/static/assets/PayPal.svg.webp","logo_height":22,"label":"Donate via PayPal","brand_color":"#003087","background":"#ffffff"}',
  30, 1
),
(
  'payment_venmo',
  'Venmo Donate Button',
  'payment_button',
  '{"url":"https://venmo.com/CompanionsCPAS","logo_url":"https://assets.companionsofcaddo.org/static/assets/venmo-official-logo.svg","logo_height":22,"label":"Donate via Venmo","brand_color":"#3D95CE","background":"#ffffff"}',
  40, 1
);

-- Share actions
INSERT OR REPLACE INTO cms_components (id, label, type, config_json, sort_order, active) VALUES
(
  'share_email',
  'Share via Email',
  'share_action',
  '{"subject":"Help the dogs at Caddo Parish Animal Services","body":"I wanted to share this with you — Companions of CPAS helps dogs at the Caddo Parish shelter get medical care, transport, and second chances. Check it out:","icon":"email","label":"Email"}',
  50, 1
),
(
  'share_copy_link',
  'Copy Link',
  'share_action',
  '{"icon":"link","label":"Copy link","feedback_label":"Copied!"}',
  60, 1
);
