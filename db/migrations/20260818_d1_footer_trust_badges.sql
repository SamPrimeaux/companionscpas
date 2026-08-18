-- Footer/header chrome is D1-driven.
-- Catalog: cms_components (type=trust_badge) — same pattern as social_link / payment_button.
-- Layout: cms_brand_settings.footer_json.trust_badges (placement, order, enabled, overrides).
-- Worker/dashboard JS must not inject tenant Candid URLs.

INSERT OR REPLACE INTO cms_components (id, label, type, config_json, sort_order, active, updated_at)
VALUES (
  'trust_badge_candid',
  'Candid Seal of Transparency',
  'trust_badge',
  '{"label":"Candid Seal of Transparency","caption":"Visit our Candid Profile","href":"https://app.candid.org/profile/14607574/companions-of-cpas-88-4156327/?pkId=ef6a3773-8ef0-42a2-b7df-ad52ac334f0e","image_url":"https://widgets.guidestar.org/prod/v1/pdp/transparency-seal/14607574/svg","height_px":72,"placement":"organization","enabled":true}',
  70,
  1,
  datetime('now')
);

UPDATE cms_brand_settings
SET
  footer_json = json_set(
    COALESCE(NULLIF(footer_json, ''), '{}'),
    '$.column_labels', json('{"pages":"Pages","organization":"Organization","follow_us":"Follow Us","staff":"Staff"}'),
    '$.col_label_size_px', 15,
    '$.trust_badges', json('[{"id":"trust_badge_candid","component_id":"trust_badge_candid","label":"Candid Seal of Transparency","caption":"Visit our Candid Profile","href":"https://app.candid.org/profile/14607574/companions-of-cpas-88-4156327/?pkId=ef6a3773-8ef0-42a2-b7df-ad52ac334f0e","image_url":"https://widgets.guidestar.org/prod/v1/pdp/transparency-seal/14607574/svg","enabled":true,"height_px":72,"placement":"organization","sort_order":10}]')
  ),
  organization_json = json_set(
    COALESCE(NULLIF(organization_json, ''), '{}'),
    '$.tax_exempt_label', '501(c)(3) Tax-Exempt',
    '$.tax_status_short', '501(c)(3)'
  ),
  updated_at = datetime('now')
WHERE tenant_id = 'tenant_companionscpas'
  AND id = 'brand_companionscpas';
