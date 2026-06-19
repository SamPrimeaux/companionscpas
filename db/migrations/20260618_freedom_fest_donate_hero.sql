-- Freedom Fest 2026 transport campaign + donate hero section
-- Option A: VIP dogs linked via animal_profiles.campaign_id

INSERT INTO fundraising_campaigns (
  id, tenant_id, organization_id, title, slug,
  short_description, description, campaign_type, status,
  goal_amount_cents, raised_amount_cents, donor_count, is_public,
  starts_at, ends_at, created_at, updated_at
) VALUES (
  'camp_freedom_fest_2026',
  'tenant_companionscpas',
  'tenant_companionscpas',
  'Freedom Fest 2026: Red, White & Rescued',
  'freedom-fest-2026',
  'Sponsor a transport ticket and help rescue dogs reach a brighter future.',
  'Celebrate freedom and second chances. Each $175 ticket sponsors one passenger on a rescue transport run.',
  'transport',
  'active',
  175000,
  0,
  0,
  1,
  '2026-06-01T00:00:00Z',
  '2026-07-31T23:59:59Z',
  datetime('now'),
  datetime('now')
) ON CONFLICT(id) DO UPDATE SET
  title = excluded.title,
  slug = excluded.slug,
  short_description = excluded.short_description,
  description = excluded.description,
  campaign_type = excluded.campaign_type,
  status = excluded.status,
  is_public = excluded.is_public,
  updated_at = datetime('now');

-- VIP passengers (3 animals with existing photos)
UPDATE animal_profiles SET
  campaign_id = 'camp_freedom_fest_2026',
  campaign_role = 'vip_guest',
  campaign_sort_order = 1,
  campaign_ticket_goal = 1,
  campaign_tickets_sponsored = 0,
  campaign_status_note = NULL,
  updated_at = datetime('now')
WHERE id = 'animal_bluepit' AND tenant_id = 'tenant_companionscpas';

UPDATE animal_profiles SET
  campaign_id = 'camp_freedom_fest_2026',
  campaign_role = 'vip_guest',
  campaign_sort_order = 2,
  campaign_ticket_goal = 1,
  campaign_tickets_sponsored = 0,
  campaign_status_note = NULL,
  updated_at = datetime('now')
WHERE id = 'animal_chopper' AND tenant_id = 'tenant_companionscpas';

UPDATE animal_profiles SET
  campaign_id = 'camp_freedom_fest_2026',
  campaign_role = 'vip_guest',
  campaign_sort_order = 3,
  campaign_ticket_goal = 1,
  campaign_tickets_sponsored = 0,
  campaign_status_note = NULL,
  updated_at = datetime('now')
WHERE id = 'animal_upclose' AND tenant_id = 'tenant_companionscpas';

-- Donate hero → Freedom Fest campaign_transport_hero
UPDATE cms_page_sections SET
  section_type = 'campaign_transport_hero',
  sort_order = 1,
  eyebrow = 'FREEDOM FEST 2026',
  heading = 'RED, WHITE & RESCUED',
  subheading = 'Celebrate Freedom. Change a Life.',
  body = 'Sponsor a ticket and help rescue dogs travel to a brighter, better future.',
  cta_label = 'Sponsor a Ticket',
  cta_action = 'donate',
  cta_href = 'data-action:donate',
  cta_secondary_label = NULL,
  cta_secondary_href = NULL,
  cta_secondary_action = NULL,
  config_json = '{"campaign_id":"camp_freedom_fest_2026","ticket_amount_cents":17500,"ribbon_text":"RED, WHITE & RESCUED","tagline":"Celebrate Freedom. Change a Life.","price_label":"$175 PER PASSENGER","footer_tagline":"ONE TICKET. ONE LIFE. FOREVER.","footer_note":"Thank you for helping us celebrate freedom and second chances."}',
  updated_at = datetime('now')
WHERE id = 'sec_donate_hero' AND page_route = '/donate';

UPDATE cms_page_sections SET sort_order = 15, updated_at = datetime('now')
WHERE page_route = '/donate' AND section_key = 'donate_intro';
