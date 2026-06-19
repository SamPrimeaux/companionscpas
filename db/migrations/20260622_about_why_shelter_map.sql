-- About why_we_exist: show Caddo Parish Animal Services map preview
-- Run: npx wrangler d1 execute companionscpas --remote --file=db/migrations/20260622_about_why_shelter_map.sql

UPDATE cms_page_sections
SET image_url = NULL,
    config_json = '{"media_type":"shelter_map","shelter_name":"Caddo Parish Animal Services","shelter_address":"1500 Monty Street, Shreveport, LA 71107","map_embed_url":"https://maps.google.com/maps?q=1500+Monty+Street,+Shreveport,+LA+71107&hl=en&z=15&output=embed"}',
    updated_at = datetime('now')
WHERE tenant_id = 'tenant_companionscpas'
  AND page_route = '/about'
  AND section_key = 'why_we_exist';
