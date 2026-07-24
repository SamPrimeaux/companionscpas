-- Seed Join Our Team form for About page embed (editable in Forms Studio).
INSERT OR REPLACE INTO cpas_application_forms
  (id, tenant_id, form_key, title, description, status, intro_json, settings_json, created_at, updated_at)
VALUES (
  'form_join_our_team',
  'tenant_companionscpas',
  'join_our_team',
  'Join Our Team',
  'Volunteer, foster, board, and events interest form.',
  'active',
  '{"eyebrow":"Get involved","heading":"Join Our Team"}',
  '{"submit_label":"Submit","success_message":"Thanks — we received your interest form. A volunteer will follow up by email.","placement":"about:join_our_team","submit_endpoint":"/api/forms/join_our_team/submit"}',
  datetime('now'),
  datetime('now')
);

INSERT OR REPLACE INTO cpas_application_steps
  (id, form_id, step_key, title, description, sort_order)
VALUES (
  'step_join_main',
  'form_join_our_team',
  'main',
  'Your info',
  '',
  10
);

DELETE FROM cpas_application_fields WHERE form_id = 'form_join_our_team';

INSERT INTO cpas_application_fields
  (id, form_id, step_id, field_key, label, placeholder, field_type, is_required, options_json, validation_json, sort_order)
VALUES
  ('fld_join_name', 'form_join_our_team', 'step_join_main', 'full_name', 'Full Name', 'Jane Doe', 'text', 1, '[]', '{}', 10),
  ('fld_join_email', 'form_join_our_team', 'step_join_main', 'email', 'Email', 'jane@email.com', 'email', 1, '[]', '{}', 20),
  ('fld_join_phone', 'form_join_our_team', 'step_join_main', 'phone', 'Phone', '(318) 000-0000', 'tel', 0, '[]', '{}', 30),
  ('fld_join_interest', 'form_join_our_team', 'step_join_main', 'interest', 'Area of Interest', 'Choose an area', 'select', 1, '["Fostering","Volunteering","Board","Events","Other"]', '{}', 40),
  ('fld_join_avail', 'form_join_our_team', 'step_join_main', 'availability', 'Availability', 'e.g. weekends, weekday evenings', 'text', 0, '[]', '{}', 50),
  ('fld_join_msg', 'form_join_our_team', 'step_join_main', 'message', 'Message', 'Tell us why you''d like to join...', 'textarea', 1, '[]', '{}', 60);

INSERT OR REPLACE INTO cms_page_sections
  (id, tenant_id, page_route, section_key, section_type, eyebrow, heading, subheading, body,
   image_url, cta_label, cta_href, cta_secondary_label, cta_secondary_href, sort_order,
   is_visible, config_json, updated_at)
VALUES (
  'section_about_join_our_team',
  'tenant_companionscpas',
  '/about',
  'join_our_team',
  'embedded_form',
  '',
  'Join Our Team',
  'Tell us how you''d like to help — fostering, volunteering, board, or events.',
  '',
  '',
  'Submit',
  '',
  '',
  '',
  90,
  1,
  '{"form_key":"join_our_team"}',
  datetime('now')
);
