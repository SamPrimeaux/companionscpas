-- Donate page v2: 3 sections (Freedom Fest hero, Kita medical story, stories + help)
-- Run: npx wrangler d1 execute companionscpas --remote --file=db/migrations/20260618_donate_v2.sql

-- Kita amputation medical campaign
INSERT INTO fundraising_campaigns (
  id, tenant_id, organization_id, title, slug,
  short_description, description, campaign_type, status,
  goal_amount_cents, raised_amount_cents, donor_count, is_public,
  starts_at, ends_at, created_at, updated_at
) VALUES (
  'camp_kita_amputation',
  'tenant_companionscpas',
  'tenant_companionscpas',
  'Kita''s Amputation Care',
  'kita-amputation-care',
  'Help Kita heal after a leg amputation with surgery, medication, and recovery support.',
  'Kita needs an amputation and follow-up care. A foster is ready — your gift funds surgery, meds, and boarding while she heals.',
  'medical',
  'active',
  60000,
  22500,
  0,
  1,
  datetime('now'),
  NULL,
  datetime('now'),
  datetime('now')
) ON CONFLICT(id) DO UPDATE SET
  title = excluded.title,
  slug = excluded.slug,
  short_description = excluded.short_description,
  description = excluded.description,
  campaign_type = excluded.campaign_type,
  status = excluded.status,
  goal_amount_cents = excluded.goal_amount_cents,
  raised_amount_cents = excluded.raised_amount_cents,
  is_public = excluded.is_public,
  updated_at = datetime('now');

-- Retire v1 sections
UPDATE cms_page_sections SET is_visible = 0, updated_at = datetime('now')
WHERE tenant_id = 'tenant_companionscpas' AND page_route = '/donate'
  AND section_key IN ('donate_hero', 'donate_tiers', 'donate_cta');

-- Section 1: Freedom Fest hero
INSERT INTO cms_page_sections (
  id, tenant_id, page_route, section_key, section_type,
  eyebrow, heading, subheading, body,
  cta_label, cta_href, sort_order, is_visible, config_json, updated_at
) VALUES (
  'sec_donate_freedom',
  'tenant_companionscpas',
  '/donate',
  'donate_freedom',
  'donate_freedom_hero',
  'FREEDOM FEST 2026',
  'RED, WHITE & RESCUED',
  'Celebrate Freedom. Change a Life.',
  'Sponsor a ticket and help rescue dogs travel to a brighter, better future. Every sponsored passenger gives an animal the chance to leave the shelter behind and move toward safety, rescue, foster, or a forever home.',
  'Sponsor a Ticket',
  'data-action:donate',
  10,
  1,
  '{"campaign_id":"camp_freedom_fest_2026","ticket_amount_cents":17500,"footer_tagline":"ONE TICKET. ONE LIFE. FOREVER.","footer_note":"Thank you for helping us celebrate freedom and second chances."}',
  datetime('now')
) ON CONFLICT(tenant_id, page_route, section_key) DO UPDATE SET
  section_type = excluded.section_type,
  eyebrow = excluded.eyebrow,
  heading = excluded.heading,
  subheading = excluded.subheading,
  body = excluded.body,
  cta_label = excluded.cta_label,
  cta_href = excluded.cta_href,
  sort_order = excluded.sort_order,
  is_visible = excluded.is_visible,
  config_json = excluded.config_json,
  updated_at = datetime('now');

-- Section 2: Kita medical story
INSERT INTO cms_page_sections (
  id, tenant_id, page_route, section_key, section_type,
  eyebrow, heading, body,
  sort_order, is_visible, config_json, updated_at
) VALUES (
  'sec_donate_medical',
  'tenant_companionscpas',
  '/donate',
  'donate_medical',
  'donate_medical_story',
  'Featured Medical Need: Kita',
  'A Sweet Cat Deserves a Second Chance',
  'Kita first arrived as a routine TNR case, but shelter staff quickly realized she was not feral at all. She was sweet, friendly, and clearly deserving of a life beyond the streets.

After a veterinary evaluation, Kita was diagnosed with a fractured back leg that cannot be repaired. She will need an amputation, follow-up care, recovery support, and boarding while she heals.

The good news: a foster has already stepped forward to care for her during recovery.',
  20,
  1,
  '{"campaign_id":"camp_kita_amputation","card_eyebrow":"CURRENT MEDICAL NEED","card_title":"Kita''s Amputation Care","supports":["Surgery","Medication","Follow-up care","Recovery expenses"]}',
  datetime('now')
) ON CONFLICT(tenant_id, page_route, section_key) DO UPDATE SET
  section_type = excluded.section_type,
  eyebrow = excluded.eyebrow,
  heading = excluded.heading,
  body = excluded.body,
  sort_order = excluded.sort_order,
  is_visible = excluded.is_visible,
  config_json = excluded.config_json,
  updated_at = datetime('now');

-- Section 3: Sponsored stories + more ways to help
INSERT INTO cms_page_sections (
  id, tenant_id, page_route, section_key, section_type,
  heading, body,
  sort_order, is_visible, config_json, updated_at
) VALUES (
  'sec_donate_stories',
  'tenant_companionscpas',
  '/donate',
  'donate_stories',
  'donate_stories_help',
  'Every Sponsorship Moves a Life Forward',
  'Some animals need medical care. Some need transport. Some need a foster.
Some simply need one person to say, "I''ll help."',
  30,
  1,
  '{"ticket_amount_cents":17500,"freedom_campaign_id":"camp_freedom_fest_2026","kita_campaign_id":"camp_kita_amputation","sunflower":{"name":"Sunflower","body":"Sunflower''s ticket to Freedom Fest has already been sponsored. That means her ride to a brighter, better future is covered.","thanks":"Thank you for giving Sunflower a real chance at freedom and a future."},"kita":{"name":"Kita","body":"Help cover her amputation, medication, follow-up care, and recovery support."},"general_body":"Not every need comes with a perfect campaign. General gifts help the team respond when urgent needs come up.","trust_strip":"Volunteer-led nonprofit • Medical care • Foster support • Transport help"}',
  datetime('now')
) ON CONFLICT(tenant_id, page_route, section_key) DO UPDATE SET
  section_type = excluded.section_type,
  heading = excluded.heading,
  body = excluded.body,
  sort_order = excluded.sort_order,
  is_visible = excluded.is_visible,
  config_json = excluded.config_json,
  updated_at = datetime('now');

-- Cream page shell
UPDATE cms_pages SET theme = 'light', updated_at = datetime('now')
WHERE tenant_id = 'tenant_companionscpas' AND route_path = '/donate';
