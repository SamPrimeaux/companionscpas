-- ============================================================
-- SEED 003b — Foster Application Form (corrected schema)
-- Actual columns: is_required, options_json, step_key (not title)
-- Run: npx wrangler d1 execute companionscpas --remote --file=db/seed_003b_foster_form.sql
-- ============================================================

INSERT OR REPLACE INTO cpas_application_forms (
  id, tenant_id, form_key, title, description, status,
  intro_json, settings_json, created_at, updated_at
) VALUES (
  'form_foster_application',
  'tenant_companionscpas',
  'foster_application',
  'Foster Application',
  'Apply to become a foster family for dogs at Caddo Parish Animal Services.',
  'active',
  '{"heading":"Open your home. Change a life.","subheading":"Foster families are the backbone of rescue. Applications take about 5 minutes and we review every one personally.","image_url":"/static/animals/upclose.webp"}',
  '{"submit_endpoint":"/api/foster/apply","success_message":"Application received! We will be in touch within 2-3 business days.","email_template":"foster_application_received","notify_admin_email":"companionsCPAS@gmail.com"}',
  datetime('now'), datetime('now')
);

-- STEPS (uses step_key column)
INSERT OR IGNORE INTO cpas_application_steps (id, form_id, step_key, title, description, sort_order) VALUES
  ('step_contact',    'form_foster_application', 'contact',    'Your Info',      'Tell us how to reach you.',                    10),
  ('step_household',  'form_foster_application', 'household',  'Your Household', 'Help us understand your living situation.',     20),
  ('step_experience', 'form_foster_application', 'experience', 'Experience',     'Tell us about your experience with animals.',   30),
  ('step_commitment', 'form_foster_application', 'commitment', 'Commitment',     'Understanding what fostering involves.',         40);

-- FIELDS — Step 1: Contact
-- Columns: id, form_id, step_id, field_key, label, placeholder, field_type, is_required, options_json, validation_json, sort_order
INSERT OR IGNORE INTO cpas_application_fields (id, form_id, step_id, field_key, label, placeholder, field_type, is_required, validation_json, sort_order) VALUES
  ('fld_first_name', 'form_foster_application', 'step_contact', 'first_name',  'First Name',  'Jane',           'text',  1, '{"min_length":1,"max_length":80}', 10),
  ('fld_last_name',  'form_foster_application', 'step_contact', 'last_name',   'Last Name',   'Smith',          'text',  1, '{"min_length":1,"max_length":80}', 20),
  ('fld_email',      'form_foster_application', 'step_contact', 'email',       'Email',       'you@email.com',  'email', 1, '{"format":"email"}',               30),
  ('fld_phone',      'form_foster_application', 'step_contact', 'phone',       'Phone',       '(318) 555-0100', 'tel',   0, '{"format":"phone"}',               40),
  ('fld_city',       'form_foster_application', 'step_contact', 'city',        'City',        'Shreveport',     'text',  1, '{}',                               50),
  ('fld_state',      'form_foster_application', 'step_contact', 'state',       'State',       'LA',             'text',  1, '{"max_length":2}',                 60),
  ('fld_zip',        'form_foster_application', 'step_contact', 'postal_code', 'ZIP Code',    '71101',          'text',  1, '{"format":"zip"}',                 70);

-- FIELDS — Step 2: Household
INSERT OR IGNORE INTO cpas_application_fields (id, form_id, step_id, field_key, label, field_type, is_required, options_json, validation_json, sort_order) VALUES
  ('fld_housing_type',  'form_foster_application', 'step_household', 'housing_type',     'Housing Type',                               'select',   1, '["House","Apartment","Condo","Townhouse","Other"]',              '{}', 10),
  ('fld_rent_own',      'form_foster_application', 'step_household', 'rent_or_own',      'Do you rent or own?',                        'radio',    1, '["Own","Rent"]',                                                '{}', 20),
  ('fld_landlord_ok',   'form_foster_application', 'step_household', 'landlord_ok',      'If renting, does your landlord allow pets?', 'radio',    0, '["Yes","No","N/A - I own"]',                                    '{}', 30),
  ('fld_yard',          'form_foster_application', 'step_household', 'has_yard',         'Do you have a fenced yard?',                 'radio',    1, '["Yes - fully fenced","Yes - partially fenced","No"]',          '{}', 40),
  ('fld_adults',        'form_foster_application', 'step_household', 'adults_in_home',   'Adults in home',                             'number',   1, '[]',                                                            '{"min":1,"max":20}', 50),
  ('fld_children',      'form_foster_application', 'step_household', 'children_in_home', 'Children in home (under 18)',                'number',   0, '[]',                                                            '{"min":0,"max":20}', 60),
  ('fld_current_pets',  'form_foster_application', 'step_household', 'current_pets',     'Current pets (type, breed, age)',            'textarea', 0, '[]',                                                            '{"max_length":400}', 70);

-- FIELDS — Step 3: Experience
INSERT OR IGNORE INTO cpas_application_fields (id, form_id, step_id, field_key, label, field_type, is_required, options_json, validation_json, sort_order) VALUES
  ('fld_foster_exp',    'form_foster_application', 'step_experience', 'foster_experience', 'Have you fostered before?',              'radio',    1, '["Yes","No"]',                                                                              '{}', 10),
  ('fld_dog_exp',       'form_foster_application', 'step_experience', 'dog_experience',    'Experience level with dogs',             'radio',    1, '["First-time owner","Some experience","Very experienced"]',                                 '{}', 20),
  ('fld_special_needs', 'form_foster_application', 'step_experience', 'special_needs_ok',  'Open to dogs with special needs?',       'checkbox', 0, '[]',                                                                                        '{}', 30),
  ('fld_dog_sizes',     'form_foster_application', 'step_experience', 'dog_sizes',         'Dog sizes you can foster',               'multiselect', 1, '["Small (under 25 lbs)","Medium (25-50 lbs)","Large (50-80 lbs)","XL (80+ lbs)","Any size"]', '{}', 40),
  ('fld_why_foster',    'form_foster_application', 'step_experience', 'why_foster',        'Why do you want to foster?',             'textarea', 1, '[]',                                                                                        '{"min_length":20,"max_length":600}', 50);

-- FIELDS — Step 4: Commitment
INSERT OR IGNORE INTO cpas_application_fields (id, form_id, step_id, field_key, label, field_type, is_required, options_json, validation_json, sort_order) VALUES
  ('fld_hours_alone',   'form_foster_application', 'step_commitment', 'hours_alone',      'Max hours dog would be alone daily',     'select',   1, '["0-2 hours","2-4 hours","4-6 hours","6-8 hours","8+ hours"]',  '{}', 10),
  ('fld_duration',      'form_foster_application', 'step_commitment', 'foster_duration',  'How long can you foster?',               'select',   1, '["1-2 weeks","2-4 weeks","1-3 months","As long as needed","Open to adopt"]', '{}', 20),
  ('fld_vet_ref',       'form_foster_application', 'step_commitment', 'vet_reference',    'Vet name and clinic (if you have one)',  'text',     0, '[]',                                                            '{}', 30),
  ('fld_additional',    'form_foster_application', 'step_commitment', 'additional_info',  'Anything else we should know?',          'textarea', 0, '[]',                                                            '{"max_length":600}', 40),
  ('fld_agree_terms',   'form_foster_application', 'step_commitment', 'agree_terms',      'I understand fostering is a temporary commitment and agree to care for the dog according to Companions of CPAS guidelines.', 'checkbox', 1, '[]', '{}', 50);
