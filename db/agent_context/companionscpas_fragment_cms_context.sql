-- ============================================================
-- CompanionsCPAS Agent Sam Context — Sectionalized CMS (canonical)
-- Applied: 2026-06-14
-- Purpose: One authoritative active row for rapid Agent Sam retrieval
-- after fragment pipeline, modals, and donate popup work.
-- ============================================================

-- Archive superseded active rows that share project_key companionscpas
UPDATE agentsam_project_context
SET status = 'archived', updated_at = unixepoch()
WHERE project_key = 'companionscpas'
  AND status = 'active'
  AND id IN (
    'ctx_companionscpas_cms_publish_v1',
    'ctx_cpas_donation_modal_session'
  );

-- Upsert canonical master context
DELETE FROM agentsam_project_context
WHERE id = 'ctx_companionscpas_fragment_cms_v1';

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
  secondary_tables,
  workers_involved,
  r2_buckets_involved,
  domains_involved,
  mcp_services_involved,
  key_files,
  related_routes,
  tokens_budgeted,
  tokens_used,
  cost_usd,
  linked_todo_ids,
  created_by,
  notes,
  started_at,
  updated_at
) VALUES (
  'ctx_companionscpas_fragment_cms_v1',
  'tenant_companionscpas',
  'ws_companionscpas',
  'companionscpas',
  'CompanionsCPAS — Sectionalized CMS + Public Site',
  'client_nonprofit_cms',
  'active',
  100,
  'Companions of CPAS public site (companionsofcaddo.org) runs on Cloudflare Workers with a sectionalized CMS: D1 is source of truth for cms_page_sections and cms_page_content_blocks; each section renders to an R2 HTML fragment under static/pages/{route}/; Worker assembles header + sections + footer on request; KV caches page:{route}. All six public routes use this pipeline. Custom renderers for / and /about; generic render_section.js for /services, /adopt, /donate, /community. Public shell: shared.css, cpas-modals.js (foster/volunteer/contact), donate-modal.js (Stripe test mode via GET /api/donations/config). README Sectionalized CMS System is the handoff doc.',
  json_array(
    'Keep D1 -> section render -> R2 fragment -> assemble -> KV as the only public-page content path for all six routes.',
    'Use custom renderers (render_home_section.js, render_about_section.js) as reference when remastering pages.',
    'Use render_section.js + renderActionCta() for generic routes; CTAs use cta_action or cta_href (data-action:donate, modal:foster, etc.).',
    'Enable board/CMS editing without code deploys for copy, images, section visibility, and CTAs.',
    'Stripe donations stay in test mode until client sign-off; then swap STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY only.',
    'Modular apply popups live in cpas-modals.js; donate modal in donate-modal.js; script tags centralized in page_shell.js.',
    'After render/Worker changes: npm run deploy + bust page:* KV. After CSS/JS: upload R2 + bump page_shell.js versions + bust KV.',
    'After D1-only changes: CMS save or node scripts/sync-page-fragments.mjs (KV busted on save).'
  ),
  json_array(
    'Never hand-edit R2 static/pages/*.html artifacts; regenerate via CMS save, sync script, or publish.',
    'Never hardcode pk_live or pk_test in donate-modal.js; use /api/donations/config.',
    'Do not describe Companions of CPAS as the shelter; they support Caddo Parish dogs via medical care, transport, foster, adoption visibility.',
    'Do not bypass fragment pipeline with legacy renderPage() for the six public routes unless assembly fails.',
    'Do not create duplicate modal systems in shared.js or cpas-shell.js; use cpas-modals.js and donate-modal.js.',
    'Tenant ID is always tenant_companionscpas.',
    'Nav Foster label maps to route /services (not renamed yet).'
  ),
  json_array(
    'CMS block-level editor UI missing for card-heavy sections (tiers, stats, campaigns) — sections editable, blocks mostly API/bootstrap only.',
    '/adopt page thinner than old baked index.html; animal grid from animal_profiles may need D1 content restore.',
    'cms_navigation_items table is dead; nav lives in cms_brand_settings.navigation_json and static/global/cpas-header.html.',
    'fundraising_campaigns_demo has demo data; do not drive production UI from it.',
    'applications table is legacy stub; cpas_foster_applications is canonical for foster apps.',
    'Stripe live keys not yet configured; client UI sign-off pending on donate modal.',
    'Meta/social publishing remains stubbed until client approval.'
  ),
  json_array(
    'cms_pages',
    'cms_page_sections',
    'cms_page_content_blocks',
    'cms_brand_settings',
    'cms_assets',
    'cms_modals',
    'cms_publish_jobs',
    'animal_profiles',
    'cpas_foster_applications',
    'donation_intents',
    'donation_payments',
    'donors',
    'donations'
  ),
  json_array(
    'agentsam_project_context',
    'agentsam_rules_document',
    'agentsam_todo',
    'volunteer_records',
    'foster_records',
    'fundraising_campaigns',
    'stripe_webhooks',
    'email_logs',
    'oauth_integrations',
    'secret_vault_items'
  ),
  json_array('companionscpas'),
  json_array('companionscpas'),
  json_array(
    'https://companionsofcaddo.org',
    'https://companionscpas.meauxbility.workers.dev',
    'https://assets.companionsofcaddo.org'
  ),
  json_array(
    'Cloudflare D1',
    'Cloudflare R2',
    'Cloudflare KV',
    'Cloudflare Workers AI',
    'Agent Sam',
    'Stripe (test mode)',
    'Resend',
    'Google Drive OAuth',
    'Meta Business (stub)'
  ),
  json_array(
    'README.md',
    'ARCHITECTURE.md',
    'src/index.js',
    'src/api/page_cms_registry.js',
    'src/api/page_shell.js',
    'src/api/home_cms_sync.js',
    'src/api/about_cms_sync.js',
    'src/api/generic_page_cms_sync.js',
    'src/api/render_home_section.js',
    'src/api/render_about_section.js',
    'src/api/render_section.js',
    'src/api/render_home_fragments.js',
    'src/api/render_about_fragments.js',
    'src/api/render_generic_fragments.js',
    'src/api/render_page.js',
    'src/api/cms_api.js',
    'src/api/payments_email.js',
    'src/api/foster_api.js',
    'public/_shared.css',
    'public/static/global/cpas-modals.js',
    'public/static/js/donate-modal.js',
    'public/static/global/shared.js',
    'static/global/cpas-header.html',
    'static/global/cpas-footer.html',
    'scripts/sync-page-fragments.mjs',
    'scripts/republish-shell-pages.mjs',
    'docs/homepage-readme.md',
    'docs/about-readme.md',
    'docs/services-page-spec.md'
  ),
  json_array(
    '/',
    '/about',
    '/services',
    '/adopt',
    '/donate',
    '/community',
    '/dashboard',
    '/dashboard/cms/pages',
    '/api/cms/publish',
    '/api/cms/preview',
    '/api/cms/section/save',
    '/api/cms/page/bootstrap',
    '/api/cms/home/bootstrap',
    '/api/cms/modal/foster_cta',
    '/api/donations/config',
    '/api/donations/intent',
    '/api/donations/tiers',
    '/api/foster/apply',
    '/api/integrations/status'
  ),
  NULL,
  0,
  0,
  '[]',
  'sam_primeaux',
  'Canonical Agent Sam context as of 2026-06-14. Fragment CMS pipeline live on all 6 public routes. Modals modularized. Donate popup uses Stripe test mode. Update this row when architecture or blockers change. README Sectionalized CMS System section is the human handoff mirror.',
  unixepoch(),
  unixepoch()
);

-- Focused sprint row: public UX (modals + donate + CTAs)
DELETE FROM agentsam_project_context
WHERE id = 'ctx_companionscpas_public_ux_v1';

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
  key_files,
  related_routes,
  created_by,
  notes,
  started_at,
  updated_at
) VALUES (
  'ctx_companionscpas_public_ux_v1',
  'tenant_companionscpas',
  'ws_companionscpas',
  'companionscpas_public_ux',
  'CompanionsCPAS — Public Modals, CTAs, Donate',
  'client_public_ux',
  'active',
  85,
  'Public-site interaction layer: unified hero-cta buttons via renderActionCta() in render_section.js; data-action=donate opens donate-modal.js (Stripe PaymentElement, test banner); data-action=foster opens cpas-modals.js intro then 4-step foster form posting to /api/foster/apply; data-modal=volunteer|contact for interest/contact forms. Header nav Donate also uses data-action=donate. All public pages load scripts via page_shell.js publicPageScripts().',
  json_array(
    'All Donate CTAs site-wide open the same in-modal Stripe flow (no redirect).',
    'Foster CTAs use intro popup (CMS modal foster_cta API) then application form.',
    'CTA styling unified: hero-cta-primary purple gradient + optional heart icon.',
    'Client sign-off on donate modal UI before switching Stripe to live keys.'
  ),
  json_array(
    'Do not add a third modal implementation; extend cpas-modals.js or donate-modal.js.',
    'cta_href #donate-form is legacy; auto-maps to donate modal in render_section.js.',
    'Use cta_action: donate or cta_href: data-action:donate in D1 for donate CTAs.'
  ),
  json_array(
    'Home Support Our Mission uses hero-cta-ghost; donate page uses hero-cta-primary — both open same modal.',
    'Newsletter section still uses cta-action-btn class on home; may need unification later.'
  ),
  json_array('cms_modals', 'cms_page_sections', 'donation_intents'),
  json_array(
    'src/api/render_section.js',
    'src/api/page_shell.js',
    'public/static/js/donate-modal.js',
    'public/static/global/cpas-modals.js',
    'src/api/payments_email.js',
    'src/api/cms_api.js'
  ),
  json_array(
    'GET /api/donations/config',
    'POST /api/donations/intent',
    'GET /api/cms/modal/foster_cta',
    'POST /api/foster/apply'
  ),
  'sam_primeaux',
  'Secondary context for rapid retrieval when working on CTAs, popups, or Stripe donate UX. Parent master: ctx_companionscpas_fragment_cms_v1.',
  unixepoch(),
  unixepoch()
);
