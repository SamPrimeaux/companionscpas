-- Align feature_cards schema with live cms_page_content_blocks columns.

UPDATE cms_section_schemas
SET
  label = 'Feature Cards',
  category = 'content',
  description = 'Card grid for events, services, or benefits. One card is valid.',
  schema_json = '{"settings":[{"id":"heading","type":"text","label":"Section Heading","max_length":80},{"id":"subheading","type":"textarea","label":"Section Subheading","max_length":200},{"id":"columns","type":"select","label":"Cards Per Row","options":["1","auto","2","3","4"],"default":"auto"},{"id":"image_display","type":"select","label":"Image crop","options":["natural","crop","square","portrait","portrait_45","story"],"default":"natural"}],"blocks":[{"type":"card","label":"Card","min":1,"max":12,"fields":[{"id":"title","type":"text","label":"Title","max_length":120},{"id":"subtitle","type":"text","label":"Subtitle","max_length":80},{"id":"body","type":"textarea","label":"Body","max_length":800},{"id":"image_url","type":"url","label":"Image or video URL"},{"id":"image_display","type":"select","label":"Card crop override","options":["","natural","crop","square","portrait","portrait_45","story"]}]}]}',
  default_json = '{"heading":"Upcoming Events","columns":"auto","image_display":"natural"}',
  updated_at = datetime('now')
WHERE section_type = 'feature_cards';

INSERT OR IGNORE INTO cms_section_schemas (id, tenant_id, section_type, label, category, description, schema_json, default_json, is_active, sort_order, updated_at)
VALUES ('schema_campaign_entry_hero', 'tenant_companionscpas', 'campaign_entry_hero', 'Campaign Entry Hero', 'fundraising', 'Split campaign opener with image, steps, entry, and sharing', '{}', '{}', 1, 16, datetime('now'));

INSERT OR IGNORE INTO cms_section_schemas (id, tenant_id, section_type, label, category, description, schema_json, default_json, is_active, sort_order, updated_at)
VALUES ('schema_wet_dog_competition', 'tenant_companionscpas', 'wet_dog_competition', 'Competition Vote Gallery', 'fundraising', 'Side-by-side entry gallery with public voting and sharing', '{}', '{}', 1, 17, datetime('now'));

INSERT OR IGNORE INTO cms_section_schemas (id, tenant_id, section_type, label, category, description, schema_json, default_json, is_active, sort_order, updated_at)
VALUES ('schema_adopt_live_gallery', 'tenant_companionscpas', 'adopt_live_gallery', 'Live Animal Gallery', 'dynamic', 'Adoptable dogs pulled live from the Animals dashboard', '{}', '{}', 1, 18, datetime('now'));

INSERT OR IGNORE INTO cms_section_schemas (id, tenant_id, section_type, label, category, description, schema_json, default_json, is_active, sort_order, updated_at)
VALUES ('schema_split_info_card', 'tenant_companionscpas', 'split_info_card', 'Split Info Card', 'content', 'Image + copy with bullet list and contact card', '{}', '{}', 1, 19, datetime('now'));

INSERT OR IGNORE INTO cms_section_schemas (id, tenant_id, section_type, label, category, description, schema_json, default_json, is_active, sort_order, updated_at)
VALUES ('schema_foster_grid', 'tenant_companionscpas', 'foster_grid', 'Foster Grid', 'dynamic', 'Foster / animal focused grid', '{}', '{}', 1, 20, datetime('now'));

INSERT OR IGNORE INTO cms_section_schemas (id, tenant_id, section_type, label, category, description, schema_json, default_json, is_active, sort_order, updated_at)
VALUES ('schema_contact_hero', 'tenant_companionscpas', 'contact_hero', 'Contact Hero', 'content', 'Contact page opener with social pills', '{}', '{}', 1, 21, datetime('now'));

INSERT OR IGNORE INTO cms_section_schemas (id, tenant_id, section_type, label, category, description, schema_json, default_json, is_active, sort_order, updated_at)
VALUES ('schema_contact_form', 'tenant_companionscpas', 'contact_form', 'Contact Form', 'conversion', 'Inline message form for contact pages', '{}', '{}', 1, 22, datetime('now'));

INSERT OR IGNORE INTO cms_section_schemas (id, tenant_id, section_type, label, category, description, schema_json, default_json, is_active, sort_order, updated_at)
VALUES ('schema_embedded_form', 'tenant_companionscpas', 'embedded_form', 'Form (Forms Studio)', 'conversion', 'Embed a published Forms Studio form', '{}', '{}', 1, 23, datetime('now'));

INSERT OR IGNORE INTO cms_section_schemas (id, tenant_id, section_type, label, category, description, schema_json, default_json, is_active, sort_order, updated_at)
VALUES ('schema_contact_team', 'tenant_companionscpas', 'contact_team', 'Team', 'content', 'Group photo + member list', '{}', '{}', 1, 24, datetime('now'));

INSERT OR IGNORE INTO cms_section_schemas (id, tenant_id, section_type, label, category, description, schema_json, default_json, is_active, sort_order, updated_at)
VALUES ('schema_contact_socials', 'tenant_companionscpas', 'contact_socials', 'Contact Info Cards', 'content', 'Email, location, org cards', '{}', '{}', 1, 25, datetime('now'));

INSERT OR IGNORE INTO cms_section_schemas (id, tenant_id, section_type, label, category, description, schema_json, default_json, is_active, sort_order, updated_at)
VALUES ('schema_raw_html', 'tenant_companionscpas', 'raw_html', 'Custom Code', 'layout', 'Paste HTML or embed from a URL', '{}', '{}', 1, 26, datetime('now'));

UPDATE cms_section_schemas
SET is_active = 0, updated_at = datetime('now')
WHERE section_type IN ('nav', 'footer') AND tenant_id = 'tenant_companionscpas';
