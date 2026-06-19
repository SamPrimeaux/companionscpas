-- Move services_hero + services_mission verbatim onto /adopt; hide on /services
-- Run: npx wrangler d1 execute companionscpas --remote --file=db/migrations/20260622_adopt_services_sections.sql

UPDATE cms_page_sections
SET section_type = 'hero',
    eyebrow = 'Open Your Home · Caddo Parish',
    heading = 'A short-term foster can change everything.',
    subheading = 'Fostering gives a dog safety, stability, and time. Whether a dog is waiting for transport, recovering from care, or just needs a break from the shelter — a temporary home helps them reach the next step.',
    body = NULL,
    image_url = 'https://assets.companionsofcaddo.org/media/animals/bigsmiles.webp',
    cta_label = 'Apply to Foster',
    cta_href = 'modal:foster',
    cta_action = NULL,
    cta_secondary_label = 'See Dogs Needing Foster',
    cta_secondary_href = '/adopt',
    cta_secondary_action = NULL,
    sort_order = 10,
    is_visible = 1,
    config_json = '{}',
    updated_at = datetime('now')
WHERE id = 'sec_adopt_hero';

UPDATE cms_page_sections
SET section_key = 'adopt_mission',
    section_type = 'text_image',
    eyebrow = 'Caddo Parish · Volunteer Powered',
    heading = 'We amplify what the shelter needs most.',
    subheading = NULL,
    body = 'Companions of CPAS is not an adoption center. We are the bridge between a dog stuck at Caddo Parish Animal Services and the rescue, foster, or family that can say yes. We fund care, open transport pathways, coordinate fosters, and make sure dogs get seen — because visibility, time, and one person saying yes is often all the difference.',
    image_url = 'https://assets.companionsofcaddo.org/media/team/theteam.webp',
    cta_label = 'See Dogs Available',
    cta_href = '/adopt',
    cta_action = NULL,
    cta_secondary_label = NULL,
    cta_secondary_href = NULL,
    cta_secondary_action = NULL,
    sort_order = 15,
    is_visible = 1,
    config_json = '{}',
    updated_at = datetime('now')
WHERE id = 'sec_adopt_shelter_hero';

UPDATE cms_page_sections
SET is_visible = 0,
    updated_at = datetime('now')
WHERE id IN ('sec_svc_hero', 'sec_services_mission');
