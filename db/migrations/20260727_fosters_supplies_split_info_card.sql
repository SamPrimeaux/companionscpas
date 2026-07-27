-- Convert Foster Custom Code (raw_html) supplies card → editable split_info_card
-- Image: Sunflower; supplies as vertical bullets (config.supplies)

UPDATE cms_page_sections
SET
  section_type = 'split_info_card',
  section_key = 'fosters_supplies',
  eyebrow = 'Fostering with us',
  heading = 'All supplies provided',
  subheading = '',
  body = 'Everything you need to foster comes from us — you bring the home.',
  image_url = 'https://assets.companionsofcaddo.org/static/cms/uploads/2026/07/1785120531387-Sunflower-Foster.jpg',
  cta_label = NULL,
  cta_href = NULL,
  cta_secondary_label = NULL,
  cta_secondary_href = NULL,
  config_json = '{"image_position":"left","image_alt":"Sunflower, foster dog","supplies":["Crate","Food","Vetting","Collar","Leash"],"contact":{"eyebrow":"Questions about fostering","name":"Amanda Norris","email":"anorris@caddo.gov","phone":"318-226-6624"}}',
  updated_at = datetime('now')
WHERE tenant_id = 'tenant_companionscpas'
  AND id = 'section_mrw7033y_kgu8bl'
  AND page_route = '/fosters';
