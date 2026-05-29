-- ============================================================
-- CompanionsCPAS Agent Sam Context Anchor
-- Purpose:
-- One authoritative project context row + one active rules doc
-- so Agent Sam can rapidly understand this is a nonprofit OS,
-- not a basic static website.
-- ============================================================

DELETE FROM agentsam_project_context
WHERE project_key = 'companionscpas_nonprofit_os';

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
  'ctx_companionscpas_nonprofit_os',
  'tenant_companionscpas',
  'ws_companionscpas',
  'companionscpas_nonprofit_os',
  'CompanionsCPAS Nonprofit OS',
  'client_nonprofit_os',
  'active',
  100,
  'CompanionsCPAS is being built as a Cloudflare-hosted nonprofit operating system, not a basic website. It includes public CMS pages, dashboard editing, foster applications, donations, email/Resend, Stripe, Google Drive, Meta Business, optional YouTube, R2 artifacts, KV page cache, D1 source-of-truth, and Agent Sam inspection/repair workflows.',
  json_array(
    'Honor the D1 -> render/publish -> R2 artifact -> KV cache runtime model for public pages.',
    'Make /, /about, /adopt, /services, and /donate safe for end users to edit basics without calling Sam.',
    'Use one OAuth/control-plane lane: dashboard session gate, oauth_accounts for user identity, oauth_integrations for org/provider connections, secret_vault_items for encrypted tokens/secrets.',
    'Build toward a nonprofit OS with applications, donations, donors, email, integrations, social/media, board/admin workflows, and Agent Sam assisted operations.',
    'Keep public content truthful: Companions of CPAS supports Caddo Parish dogs through medical care, transport support, foster/adoption visibility, rescue partnerships, and second chances.'
  ),
  json_array(
    'Do not describe Companions of CPAS as the shelter.',
    'Do not create separate OAuth/auth systems for Google, Meta, Resend, Stripe, or YouTube.',
    'Do not bypass the shared integration control plane for dashboard-managed provider connections.',
    'Do not hardcode page content that belongs in cms_pages, cms_page_sections, cms_page_content_blocks, cms_assets, cms_brand_settings, cms_navigation_items, cms_modals, or cms_themes.',
    'Do not store raw long-term provider tokens in random tables; use secret_vault_items and oauth_integrations secret reference columns.'
  ),
  json_array(
    'cms_pages.settings_json contains stale pipeline notes that should be cleaned.',
    'cms_publish_artifacts currently has zero rows, so publish logging/artifact tracking needs hardening.',
    'cms_page_versions and cms_revisions are empty, so editor versioning/revision history needs to be wired.',
    'Integration router and provider status endpoints still need to be added.',
    'Need safe dashboard UX for editing sections, brand, nav, modals, forms, donations, and integrations.'
  ),
  json_array(
    'cms_pages',
    'cms_page_sections',
    'cms_page_content_blocks',
    'cms_assets',
    'cms_brand_settings',
    'cms_navigation_menus',
    'cms_navigation_items',
    'cms_modals',
    'cms_section_schemas',
    'cms_themes',
    'cms_publish_jobs',
    'cms_publish_artifacts',
    'cms_revisions',
    'cms_page_versions',
    'oauth_accounts',
    'oauth_integrations',
    'secret_vault_items'
  ),
  json_array(
    'agentsam_project_context',
    'agentsam_rules_document',
    'agentsam_todo',
    'agentsam_workflows',
    'agentsam_workflow_nodes',
    'agentsam_workflow_edges',
    'agentsam_tools',
    'cpas_application_forms',
    'cpas_application_steps',
    'cpas_application_fields',
    'cpas_foster_applications',
    'donation_settings',
    'donation_intents',
    'donation_payments',
    'donors',
    'donations',
    'email_templates',
    'email_events',
    'stripe_webhooks'
  ),
  json_array('companionscpas Worker'),
  json_array('companionscpas'),
  json_array(
    'https://companionscpas.meauxbility.workers.dev',
    'future desired client-owned URL/domain'
  ),
  json_array(
    'Cloudflare D1',
    'Cloudflare R2',
    'Cloudflare KV',
    'Workers AI',
    'Agent Sam',
    'Google Drive',
    'Meta Business',
    'Resend',
    'Stripe',
    'YouTube optional'
  ),
  json_array(
    'src/index.js',
    'src/api/render_home.js',
    'src/api/render_page.js',
    'src/api/render_section.js',
    'src/api/cms_api.js',
    'src/api/_shell.js',
    'src/api/foster_api.js',
    'src/api/payments_email.js',
    'src/api/social.js',
    'public/_shared.css',
    'public/_shared.js',
    'db/seed_primetech_inspect_protocol.sql',
    'db/migration_004_oauth_control_plane_unification.sql'
  ),
  json_array(
    '/',
    '/about',
    '/adopt',
    '/services',
    '/donate',
    '/dashboard',
    '/dashboard/settings/integrations',
    '/api/cms/publish',
    '/api/integrations',
    '/api/integrations/:provider/status',
    '/api/integrations/:provider/connect',
    '/api/integrations/:provider/callback',
    '/api/integrations/:provider/test',
    '/api/foster/apply'
  ),
  NULL,
  0,
  0,
  '[]',
  'sam_primeaux',
  'This row is the authoritative Agent Sam context anchor for the CompanionsCPAS nonprofit OS build. Keep it concise but current. Update this row when architecture truth changes.',
  unixepoch(),
  unixepoch()
);

DELETE FROM agentsam_rules_document
WHERE id = 'rules_companionscpas_nonprofit_os';

INSERT INTO agentsam_rules_document (
  id,
  user_id,
  workspace_id,
  title,
  body_markdown,
  version,
  is_active,
  apply_mode,
  globs,
  source,
  sort_order,
  created_at,
  updated_at
) VALUES (
  'rules_companionscpas_nonprofit_os',
  NULL,
  'ws_companionscpas',
  'CompanionsCPAS Nonprofit OS Rules',
  '# CompanionsCPAS Nonprofit OS Rules

CompanionsCPAS is a nonprofit operating system, not a basic static website.

Hard rules:
- D1 is the source of truth for CMS/page/business data.
- Public pages must honor the D1 -> render/publish -> R2 artifact -> KV cache model.
- R2 stores rendered HTML/CSS/JS/image artifacts.
- KV caches page HTML, brand payloads, nav/bootstrap payloads, and should be busted after publish.
- The public pages /, /about, /adopt, /services, and /donate must remain CMS-driven and end-user editable.
- Use one OAuth/control-plane lane. The dashboard session gate remains the front door. oauth_accounts represents user identity. oauth_integrations represents org/provider connections. secret_vault_items stores encrypted tokens/secrets.
- Do not create separate Google/Meta/YouTube/Resend/Stripe auth systems.
- Do not store raw long-term OAuth tokens/API keys in random tables.
- Prioritize Resend/email, foster applications, donations/Stripe, Google Drive, Meta Business, and optional YouTube as OS integrations.
- Never describe Companions of CPAS as the shelter. The organization supports Caddo Parish dogs through medical care, transport support, foster/adoption visibility, rescue partnerships, and second chances.',
  1,
  1,
  'always',
  json_array(
    'src/api/**',
    'src/index.js',
    'db/**',
    'public/_shared.*',
    'public/dashboard/**'
  ),
  'dashboard',
  10,
  datetime('now'),
  datetime('now')
);
