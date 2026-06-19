-- Community page refresh — D1 content for /community
-- Tenant: tenant_companionscpas | Page route: /community
-- Run: npx wrangler d1 execute companionscpas --remote --file=db/migrations/20260615_community_page_refresh.sql

-- ── 1. Stay Connected: intro copy + card images/links ─────────────────────
UPDATE cms_page_sections
SET subheading = body,
    body = NULL,
    updated_at = datetime('now')
WHERE tenant_id = 'tenant_companionscpas'
  AND page_route = '/community'
  AND section_key = 'community_connect';

UPDATE cms_page_content_blocks
SET image_url = 'https://assets.companionsofcaddo.org/media/animals/bigsmiles.webp',
    action_label = 'Follow on Facebook',
    action_value = 'https://www.facebook.com/people/Companions-of-CPAS/100069291576354/',
    updated_at = datetime('now')
WHERE id = 'pcb_community_fb';

UPDATE cms_page_content_blocks
SET image_url = 'https://assets.companionsofcaddo.org/media/animals/sus.webp',
    action_label = 'Follow on Instagram',
    action_value = 'https://www.instagram.com/companionscpas',
    updated_at = datetime('now')
WHERE id = 'pcb_community_ig';

UPDATE cms_page_content_blocks
SET image_url = 'https://assets.companionsofcaddo.org/media/team/theteam.webp',
    action_label = 'Get in Touch',
    action_value = 'modal:contact',
    updated_at = datetime('now')
WHERE id = 'pcb_community_email';

UPDATE cms_page_content_blocks
SET image_url = 'https://assets.companionsofcaddo.org/media/animals/tansportfundraiserdogimage.webp',
    action_label = 'Volunteer With Us',
    action_value = 'modal:volunteer',
    updated_at = datetime('now')
WHERE id = 'pcb_community_vol';

-- ── 2. Community Stories section (feature_cards) ───────────────────────────
INSERT INTO cms_page_sections (
  id, tenant_id, page_route, section_key, section_type,
  eyebrow, heading, subheading, body, sort_order, is_visible, config_json, updated_at
) VALUES (
  'ps_community_stories',
  'tenant_companionscpas',
  '/community',
  'community_stories',
  'feature_cards',
  'Community Wins',
  'Stories from the mission.',
  'Curated updates from fosters, transports, and families — the warmth of our community, edited for clarity.',
  NULL,
  28,
  1,
  '{}',
  datetime('now')
)
ON CONFLICT(id) DO UPDATE SET
  section_type = excluded.section_type,
  eyebrow = excluded.eyebrow,
  heading = excluded.heading,
  subheading = excluded.subheading,
  body = excluded.body,
  sort_order = excluded.sort_order,
  is_visible = excluded.is_visible,
  updated_at = datetime('now');

INSERT INTO cms_page_content_blocks (
  id, tenant_id, page_route, section_key, block_key, block_type,
  title, body, image_url, action_label, action_value, sort_order, is_visible, updated_at
) VALUES
(
  'pcb_comm_story_transport',
  'tenant_companionscpas',
  '/community',
  'community_stories',
  'story_transport',
  'card',
  '13 dogs on the Freedom Bus',
  'Thanks to transport volunteers and a community that showed up, thirteen dogs rolled toward rescue partners and families waiting for them.',
  'https://assets.companionsofcaddo.org/media/animals/goinhomejustadopted.webp',
  'Support a transport seat',
  '/donate',
  10,
  1,
  datetime('now')
),
(
  'pcb_comm_story_luna',
  'tenant_companionscpas',
  '/community',
  'community_stories',
  'story_luna',
  'card',
  'Sweet Luna found her family',
  'A foster home gave Luna time to be seen — and a forever family said yes. This is what community makes possible.',
  'https://assets.companionsofcaddo.org/media/animals/happyboy.webp',
  'Meet adoptable dogs',
  '/adopt',
  20,
  1,
  datetime('now')
),
(
  'pcb_comm_story_chopper',
  'tenant_companionscpas',
  '/community',
  'community_stories',
  'story_chopper',
  'card',
  'Chopper needs a foster home',
  'Two months old, tagged by rescue, transport scheduled. Chopper just needs a safe temporary home to get there.',
  'https://assets.companionsofcaddo.org/media/animals/chopper.webp',
  'Apply to foster',
  'modal:foster',
  30,
  1,
  datetime('now')
)
ON CONFLICT(id) DO UPDATE SET
  section_key = excluded.section_key,
  title = excluded.title,
  body = excluded.body,
  image_url = excluded.image_url,
  action_label = excluded.action_label,
  action_value = excluded.action_value,
  sort_order = excluded.sort_order,
  is_visible = excluded.is_visible,
  updated_at = datetime('now');

-- ── 3. Hide placeholder embed + duplicate volunteer banner ────────────────
UPDATE cms_page_sections
SET is_visible = 0,
    updated_at = datetime('now')
WHERE tenant_id = 'tenant_companionscpas'
  AND page_route = '/community'
  AND section_key IN ('community_fb_posts', 'community_volunteer');

-- ── 4. Testimonial → text_image story block ─────────────────────────────────
UPDATE cms_page_sections
SET section_type = 'text_image',
    eyebrow = 'Real Impact',
    heading = 'Companions gave me the chance to say yes — and to fight for her.',
    body = 'Brittany Ramsey, foster and board member',
    subheading = NULL,
    image_url = 'https://assets.companionsofcaddo.org/media/animals/goinhomejustadopted.webp',
    cta_label = NULL,
    cta_href = NULL,
    sort_order = 40,
    updated_at = datetime('now')
WHERE tenant_id = 'tenant_companionscpas'
  AND page_route = '/community'
  AND section_key = 'community_testimonial';

-- ── 5. Final CTA ───────────────────────────────────────────────────────────
UPDATE cms_page_sections
SET subheading = body,
    body = NULL,
    cta_label = 'See Available Dogs',
    cta_href = '/adopt',
    cta_secondary_label = 'Apply to Foster',
    cta_secondary_href = 'modal:foster',
    sort_order = 50,
    updated_at = datetime('now')
WHERE tenant_id = 'tenant_companionscpas'
  AND page_route = '/community'
  AND section_key = 'community_cta';

-- ── 6. Section order sanity ────────────────────────────────────────────────
UPDATE cms_page_sections SET sort_order = 10, updated_at = datetime('now')
WHERE tenant_id = 'tenant_companionscpas' AND page_route = '/community' AND section_key = 'community_hero';
UPDATE cms_page_sections SET sort_order = 20, updated_at = datetime('now')
WHERE tenant_id = 'tenant_companionscpas' AND page_route = '/community' AND section_key = 'community_connect';
