-- Replace /adopt "Next Steps" cta_banner with shelter_hub block
-- Run: npx wrangler d1 execute companionscpas --remote --file=db/migrations/20260621_adopt_shelter_hub.sql

UPDATE cms_page_sections
SET section_type = 'shelter_hub',
    eyebrow = NULL,
    heading = NULL,
    subheading = NULL,
    body = NULL,
    cta_label = NULL,
    cta_href = NULL,
    cta_action = NULL,
    config_json = '{}',
    updated_at = datetime('now')
WHERE tenant_id = 'tenant_companionscpas'
  AND page_route = '/adopt'
  AND section_key = 'adoption_next_steps';
