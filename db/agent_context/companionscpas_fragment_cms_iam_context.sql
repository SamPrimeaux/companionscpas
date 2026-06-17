-- ============================================================
-- CompanionsCPAS → inneranimalmedia-business (IAM main D1)
-- Agent Sam project context — sectionalized CMS handoff
-- Database: inneranimalmedia-business (cf87b717-d4e2-4cf8-bab0-a81268e32d49)
-- Client worker D1: companionscpas (fd6dd6fb-156b-4b6a-8ff0-505422652391)
-- Applied: 2026-06-14
-- ============================================================

-- Refresh canonical IAM client registry row
UPDATE agentsam_project_context
SET
  workspace_id = 'ws_companionscpas',
  project_name = 'CompanionsCPAS — Sectionalized CMS + Public Site',
  project_type = 'client_nonprofit_cms',
  status = 'active',
  priority = 100,
  description = 'Companions of CPAS production platform. Live: companionsofcaddo.org. Worker: companionscpas (companionscpas.meauxbility.workers.dev). Repo: github.com/SamPrimeaux/companionscpas. Client tenant: tenant_companionscpas. Client D1 binding DB → database companionscpas (fd6dd6fb-156b-4b6a-8ff0-505422652391). R2: companionscpas. KV: CMS_CACHE (0b410337a8494fc982ea04c5bde1eab4). All six public routes use sectionalized CMS: D1 cms_page_sections → R2 static/pages/{route}/{section}.html fragments → Worker assemble → KV page:{route}. Custom renderers: / and /about. Generic render_section.js: /services, /adopt, /donate, /community. Shell: shared.css, cpas-modals.js, donate-modal.js via page_shell.js. Stripe donate modal in test mode (GET /api/donations/config). README Sectionalized CMS System is handoff doc. Client D1 mirror row: ctx_companionscpas_fragment_cms_v1.',
  goals = json_array(
    'Maintain D1 → R2 fragment → assemble → KV pipeline on all six public routes.',
    'Board-editable CMS without code deploys for copy, images, sections, CTAs.',
    'Unified public UX: hero-cta buttons, cpas-modals.js (foster/volunteer/contact), donate-modal.js (Stripe test).',
    'Client sign-off on donate modal UI; then swap Stripe to live keys only.',
    'Next: block-level CMS editor for card sections; /adopt animal grid from animal_profiles.',
    'Ops: npm run deploy + bust page:* KV after Worker changes; R2 upload + page_shell.js version bump after CSS/JS.',
    'IAM RAG: docs/clients/companionscpas/project-brief.md + README sectionalized CMS section.'
  ),
  constraints = json_array(
    'Client D1 (companionscpas) is content SSOT; IAM D1 (inneranimalmedia-business) is Agent Sam registry only.',
    'Never hand-edit R2 static/pages HTML artifacts.',
    'Never hardcode Stripe publishable key in donate-modal.js.',
    'Do not describe Companions of CPAS as the shelter.',
    'Nav Foster label → route /services (unchanged).',
    'Tenant ID always tenant_companionscpas on client worker.'
  ),
  current_blockers = json_array(
    'CMS block editor UI missing for card-heavy sections (tiers, stats, campaigns).',
    '/adopt thinner than legacy baked page; animal_profiles grid may need restore.',
    'Stripe live keys pending client UI sign-off.',
    'Meta/social publishing stubbed until client approval.',
    'fundraising_campaigns_demo is demo data only.'
  ),
  primary_tables = json_array(
    'cms_pages',
    'cms_page_sections',
    'cms_page_content_blocks',
    'cms_brand_settings',
    'cms_assets',
    'cms_modals',
    'animal_profiles',
    'cpas_foster_applications',
    'donation_intents',
    'donations',
    'donors'
  ),
  secondary_tables = json_array(
    'agentsam_project_context',
    'cms_publish_jobs',
    'foster_records',
    'volunteer_records',
    'stripe_webhooks',
    'oauth_integrations',
    'secret_vault_items'
  ),
  workers_involved = json_array(
    'companionscpas Worker (binding DB → companionscpas D1 fd6dd6fb-156b-4b6a-8ff0-505422652391)'
  ),
  r2_buckets_involved = json_array('companionscpas'),
  domains_involved = json_array(
    'https://companionsofcaddo.org',
    'https://companionscpas.meauxbility.workers.dev',
    'https://assets.companionsofcaddo.org'
  ),
  mcp_services_involved = json_array(
    'Cloudflare D1 (client: companionscpas)',
    'Cloudflare D1 (IAM: inneranimalmedia-business)',
    'Cloudflare R2',
    'Cloudflare KV',
    'Workers AI / Agent Sam',
    'Stripe test mode',
    'Resend',
    'Google Drive OAuth',
    'Meta Business stub'
  ),
  key_files = json_array(
    'companionscpas/README.md',
    'companionscpas/src/index.js',
    'companionscpas/src/api/page_cms_registry.js',
    'companionscpas/src/api/page_shell.js',
    'companionscpas/src/api/render_section.js',
    'companionscpas/src/api/render_home_section.js',
    'companionscpas/src/api/render_about_section.js',
    'companionscpas/src/api/render_generic_fragments.js',
    'companionscpas/src/api/cms_api.js',
    'companionscpas/src/api/payments_email.js',
    'companionscpas/public/static/js/donate-modal.js',
    'companionscpas/public/static/global/cpas-modals.js',
    'companionscpas/scripts/sync-page-fragments.mjs',
    'companionscpas/scripts/republish-shell-pages.mjs',
    'companionscpas/db/agent_context/companionscpas_fragment_cms_context.sql',
    'docs/clients/companionscpas/project-brief.md'
  ),
  related_routes = json_array(
    '/',
    '/about',
    '/services',
    '/adopt',
    '/donate',
    '/community',
    '/dashboard/cms/pages',
    '/api/cms/publish',
    '/api/cms/preview',
    '/api/cms/page/bootstrap',
    '/api/donations/config',
    '/api/donations/intent',
    '/api/foster/apply',
    '/api/cms/modal/foster_cta'
  ),
  notes = 'IAM canonical client row. Updated 2026-06-14 after fragment CMS + modals + donate CTA unification. Client D1 active rows: ctx_companionscpas_fragment_cms_v1 (project_key companionscpas), ctx_companionscpas_public_ux_v1 (project_key companionscpas_public_ux). Re-apply client SQL: companionscpas/db/agent_context/companionscpas_fragment_cms_context.sql on DB companionscpas.',
  updated_at = unixepoch()
WHERE id = 'ctx_companionscpas';

-- Focused IAM row: public modals / donate / CTAs
DELETE FROM agentsam_project_context
WHERE id = 'ctx_companionscpas_public_ux_iam';

INSERT INTO agentsam_project_context (
  id,
  tenant_id,
  workspace_id,
  project_key,
  project_name,
  project_type,
  status,
  priority,
  description,
  goals,
  constraints,
  current_blockers,
  primary_tables,
  workers_involved,
  r2_buckets_involved,
  domains_involved,
  key_files,
  related_routes,
  linked_todo_ids,
  created_by,
  notes,
  started_at,
  updated_at
) VALUES (
  'ctx_companionscpas_public_ux_iam',
  'tenant_companionscpas',
  'ws_companionscpas',
  'companionscpas_public_ux',
  'CompanionsCPAS — Public Modals, CTAs, Donate',
  'client_public_ux',
  'active',
  85,
  'Public interaction layer on companionsofcaddo.org. renderActionCta() in companionscpas/src/api/render_section.js maps cta_action/cta_href to buttons. data-action=donate → donate-modal.js (Stripe PaymentElement, test banner, GET /api/donations/config). data-action=foster → cpas-modals.js intro (GET /api/cms/modal/foster_cta) → 4-step form → POST /api/foster/apply. data-modal=volunteer|contact for forms. Header nav Donate uses data-action=donate. Scripts via page_shell.js on all public pages.',
  json_array(
    'Site-wide Donate CTAs open same in-modal Stripe flow.',
    'Foster CTAs: intro popup then application.',
    'Unified hero-cta-primary styling with heart icon on donate buttons.',
    'Client UI sign-off before Stripe live keys.'
  ),
  json_array(
    'Extend cpas-modals.js or donate-modal.js only; no third modal system.',
    'D1 donate CTAs: cta_action donate or cta_href data-action:donate.',
    'Secrets: STRIPE_PUBLISHABLE_KEY + STRIPE_SECRET_KEY on companionscpas worker.'
  ),
  json_array(
    'Home ghost CTA vs donate page primary CTA — same modal, different variant.',
    'Newsletter cta-action-btn on home not yet unified to hero-cta.'
  ),
  json_array('cms_modals', 'cms_page_sections', 'donation_intents'),
  json_array('companionscpas Worker'),
  json_array('companionscpas'),
  json_array('https://companionsofcaddo.org'),
  json_array(
    'companionscpas/src/api/render_section.js',
    'companionscpas/src/api/page_shell.js',
    'companionscpas/public/static/js/donate-modal.js',
    'companionscpas/public/static/global/cpas-modals.js',
    'companionscpas/src/api/payments_email.js'
  ),
  json_array(
    'GET /api/donations/config',
    'POST /api/donations/intent',
    'GET /api/cms/modal/foster_cta',
    'POST /api/foster/apply'
  ),
  '[]',
  'sam_primeaux',
  'IAM secondary context. Parent: ctx_companionscpas on inneranimalmedia-business. Client D1 mirror: ctx_companionscpas_public_ux_v1 on companionscpas.',
  unixepoch(),
  unixepoch()
);
