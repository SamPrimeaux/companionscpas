-- Point adopt hero + mission CTAs to Caddo Parish shelter dogs listing
-- Run: npx wrangler d1 execute companionscpas --remote --file=db/migrations/20260622_adopt_cta_caddo_dogs.sql

UPDATE cms_page_sections
SET cta_secondary_href = 'https://caddo.gov/dogs/',
    updated_at = datetime('now')
WHERE id = 'sec_adopt_hero';

UPDATE cms_page_sections
SET cta_href = 'https://caddo.gov/dogs/',
    updated_at = datetime('now')
WHERE id = 'sec_adopt_shelter_hero';
