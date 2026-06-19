-- Donate page: campaign grid + Get in Touch sections
-- Run: npx wrangler d1 execute companionscpas --remote --file=db/migrations/20260620_donate_campaign_grid_contact.sql

INSERT INTO cms_page_sections (
  id, tenant_id, page_route, section_key, section_type,
  heading, body, cta_label,
  sort_order, is_visible, config_json, updated_at
) VALUES (
  'sec_donate_grid',
  'tenant_companionscpas',
  '/donate',
  'donate_grid',
  'donate_campaign_grid',
  'More ways to give',
  'Every gift goes directly toward medical care, transport, and second chances for animals at Caddo Parish Animal Services.',
  NULL,
  35,
  1,
  '{"freedom_campaign_id":"camp_freedom_fest_2026","kita_campaign_id":"camp_kita_amputation","medical_campaign_id":"camp_kita_amputation"}',
  datetime('now')
) ON CONFLICT(tenant_id, page_route, section_key) DO UPDATE SET
  section_type = excluded.section_type,
  heading = excluded.heading,
  body = excluded.body,
  sort_order = excluded.sort_order,
  is_visible = excluded.is_visible,
  config_json = excluded.config_json,
  updated_at = datetime('now');

INSERT INTO cms_page_sections (
  id, tenant_id, page_route, section_key, section_type,
  heading, body, cta_label,
  sort_order, is_visible, config_json, updated_at
) VALUES (
  'sec_donate_contact',
  'tenant_companionscpas',
  '/donate',
  'donate_contact',
  'donate_contact',
  'Questions before you give?',
  'Reach out anytime — a volunteer will follow up by email.',
  'Get in Touch',
  40,
  1,
  '{}',
  datetime('now')
) ON CONFLICT(tenant_id, page_route, section_key) DO UPDATE SET
  section_type = excluded.section_type,
  heading = excluded.heading,
  body = excluded.body,
  cta_label = excluded.cta_label,
  sort_order = excluded.sort_order,
  is_visible = excluded.is_visible,
  updated_at = datetime('now');
