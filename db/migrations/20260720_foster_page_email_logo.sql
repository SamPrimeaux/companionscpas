-- Foster public page + fix broken email logo URLs (workers.dev 404 → assets CDN)
-- companionscpas D1 fd6dd6fb-156b-4b6a-8ff0-505422652391

-- ── Email templates: replace dead workers.dev logo / links ──────────────────
UPDATE email_templates
SET
  body_html = REPLACE(
    REPLACE(
      REPLACE(body_html,
        'https://companionscpas.meauxbility.workers.dev/static/global/companionsofcpa-newlogo.webp',
        'https://assets.companionsofcaddo.org/companionsofcpa-newlogo.webp'
      ),
      'https://companionscpas.meauxbility.workers.dev/adopt',
      'https://companionsofcaddo.org/fosters'
    ),
    'https://companionscpas.meauxbility.workers.dev',
    'https://companionsofcaddo.org'
  ),
  updated_at = datetime('now')
WHERE body_html LIKE '%companionscpas.meauxbility.workers.dev%';

-- ── CMS page: /fosters (hero + needs-foster gallery) ────────────────────────
INSERT INTO cms_pages (
  id, tenant_id, route_path, slug, title, status,
  seo_title, meta_description, page_type, template_key,
  sort_order, is_homepage, show_header, show_footer, nav_visible,
  published_at, updated_at, created_at, project_id
) VALUES (
  'page_fosters',
  'tenant_companionscpas',
  '/fosters',
  'fosters',
  'Foster',
  'published',
  'Foster a Dog — Companions of CPAS',
  'Open your home. Short-term fosters give dogs at Caddo Parish Animal Services safety, stability, and a path to adoption.',
  'standard',
  'default',
  35,
  0,
  1,
  1,
  1,
  datetime('now'),
  datetime('now'),
  datetime('now'),
  'proj_companionscpas'
)
ON CONFLICT(tenant_id, route_path) DO UPDATE SET
  title = excluded.title,
  status = 'published',
  seo_title = excluded.seo_title,
  meta_description = excluded.meta_description,
  nav_visible = 1,
  published_at = COALESCE(cms_pages.published_at, datetime('now')),
  updated_at = datetime('now');

INSERT INTO cms_page_sections (
  id, tenant_id, page_route, section_key, section_type,
  eyebrow, heading, subheading, body,
  cta_label, cta_href, cta_secondary_label, cta_secondary_href,
  image_url, sort_order, is_visible, config_json,
  created_at, updated_at, project_id, seeded_by_pipeline
) VALUES (
  'sec_fosters_hero',
  'tenant_companionscpas',
  '/fosters',
  'fosters_hero',
  'hero',
  'Open Your Home · Caddo Parish',
  'A short-term foster can change everything.',
  'Fostering gives a dog safety, stability, and time. Whether a dog is waiting for transport, recovering from care, or just needs a break from the shelter — a temporary home helps them reach the next step.',
  NULL,
  'Apply to Foster',
  'modal:foster',
  'See Dogs Needing Foster',
  '#needs-foster',
  'https://assets.companionsofcaddo.org/media/animals/bigsmiles.webp',
  10,
  1,
  '{}',
  datetime('now'),
  datetime('now'),
  'proj_companionscpas',
  'migration_20260720_fosters'
)
ON CONFLICT(id) DO UPDATE SET
  eyebrow = excluded.eyebrow,
  heading = excluded.heading,
  subheading = excluded.subheading,
  cta_label = excluded.cta_label,
  cta_href = excluded.cta_href,
  cta_secondary_label = excluded.cta_secondary_label,
  cta_secondary_href = excluded.cta_secondary_href,
  image_url = excluded.image_url,
  is_visible = 1,
  updated_at = datetime('now');

INSERT INTO cms_page_sections (
  id, tenant_id, page_route, section_key, section_type,
  eyebrow, heading, subheading, body,
  cta_label, cta_href, cta_secondary_label, cta_secondary_href,
  image_url, sort_order, is_visible, config_json,
  created_at, updated_at, project_id, seeded_by_pipeline
) VALUES (
  'sec_fosters_gallery',
  'tenant_companionscpas',
  '/fosters',
  'fosters_live_animals',
  'adopt_live_gallery',
  'Needs a Foster Home',
  'Dogs waiting for a temporary home.',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  20,
  1,
  '{"filter_mode":"foster_needed","hide_filters":true,"anchor_id":"needs-foster","empty_heading":"No dogs flagged for foster right now","empty_body":"Check back soon — when a dog needs a foster home, they will appear here."}',
  datetime('now'),
  datetime('now'),
  'proj_companionscpas',
  'migration_20260720_fosters'
)
ON CONFLICT(id) DO UPDATE SET
  eyebrow = excluded.eyebrow,
  heading = excluded.heading,
  section_type = excluded.section_type,
  config_json = excluded.config_json,
  is_visible = 1,
  updated_at = datetime('now');

-- Point adopt hero secondary CTA at the new public fosters page
UPDATE cms_page_sections
SET
  cta_secondary_label = 'See Dogs Needing Foster',
  cta_secondary_href = '/fosters#needs-foster',
  updated_at = datetime('now')
WHERE page_route = '/adopt' AND section_key = 'adopt_hero';
