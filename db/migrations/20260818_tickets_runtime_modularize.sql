-- Exclusive-file modularize tickets for runtime files >1200 lines.
-- Agents: one ticket, one branch, PR only. Operator merges and ships.

INSERT OR REPLACE INTO agentsam_tickets (
  id, title, description, status, status_reason, project, subsystem, tags, priority, requested_by, doc_path, blocked_by, blocks, attachments_json, created_at, updated_at, closed_at
) VALUES (
  'tkt_cpas_mod_umbrella_20260818',
  'Umbrella: split runtime files >1200 lines without breaking live CPAS',
  'Coordination only — do not implement code on this ticket.

Live site companionscpas / companionsofcaddo.org is semi-working. We are refurbishing inlanes so agents do not collide.

CHILD TICKETS (exclusive file owners)
• tkt_cpas_mod_cms_api_20260818 — src/api/cms_api.js
• tkt_cpas_mod_view_cms_20260818 — public/dashboard/js/view-cms.jsx
• tkt_cpas_mod_dashboard_api_20260818 — src/api/dashboard_api.js
• tkt_cpas_mod_view_animals_20260818 — public/dashboard/js/view-animals.jsx
• tkt_cpas_mod_payments_email_20260818 — src/api/payments_email.js
• tkt_cpas_mod_agentsam_tools_20260818 — src/api/agentsam_tools.js
• tkt_cpas_mod_view_email_20260818 — public/dashboard/js/view-email.jsx
• tkt_cpas_mod_cpas_shell_css_20260818 — static/global/cpas-shell.css
• tkt_cpas_mod_dash_css_20260818 — public/dashboard/dash.css
• tkt_cpas_mod_shared_css_20260818 — public/_shared.css

PRODUCT GATE (already active)
tkt_cpas_cms_editor_events_repair_20260818 owns surgical Events/D1-catalog behavior. cms_api, view-cms, and cpas-shell modularize tickets are blocked until that product PR merges (or this umbrella is updated).

PARALLEL NOW (no overlap with the product ticket)
dashboard_api, view-animals, payments_email, agentsam_tools, view-email, dash.css.


AGENT LANE (do not skip)
1. One agent per ticket. Branch: feat/<this-ticket-id>
2. Edit ONLY Exclusive files. Do not touch other 1200+ line files.
3. Keep the original filename as the public export so src/index.js does not need to change (re-export from a thin wrapper).
4. Preserve every public URL, /api path, JSON key, D1 table/column, and user-visible copy.
5. Move/split/polish only. No new features unless listed in Acceptance.
6. Validate: node --check on edited Worker .js. For dashboard JSX, load the named view logged-in. For CSS, spot-check 2 public pages or dashboard shell.
7. git push -u origin HEAD. Open a GitHub PR titled with this ticket id. Do NOT merge. Do NOT wrangler deploy production. Operator inspects, merges, pulls, ships.
8. If you need a shared helper, put it in a NEW file under the exclusive folder. Do not "clean up" neighboring giants.


SAFETY / NO-BREAK
This is a live semi-working production site. Refine what is here.
• No route or query-param renames.
• No D1 DROP/rename. Additive indexes only if a query is proven hot.
• No visual redesign. Keep tokens, spacing, and selectors working.
• No deleting "unused" code unless you prove zero callers (rg + runtime).
• Rollback = revert the PR branch.


SHIP FLOW
branch → full extract on exclusive files → PR to GitHub → operator inspect/verify → merge to main → pull → wrangler deploy + R2 dashboard sync if JSX/CSS.
',
  'active',
  'Lane board for modularize agents. Code happens on child tickets.',
  'runtime-modularize',
  'ops',
  '["modularize","umbrella","no-break","coordination"]',
  'high',
  'operator',
  NULL,
  NULL,
  'tkt_cpas_mod_cms_api_20260818,tkt_cpas_mod_view_cms_20260818,tkt_cpas_mod_dashboard_api_20260818,tkt_cpas_mod_view_animals_20260818,tkt_cpas_mod_payments_email_20260818,tkt_cpas_mod_agentsam_tools_20260818,tkt_cpas_mod_view_email_20260818,tkt_cpas_mod_cpas_shell_css_20260818,tkt_cpas_mod_dash_css_20260818,tkt_cpas_mod_shared_css_20260818',
  '[]',
  strftime('%s','now'),
  strftime('%s','now'),
  NULL
);

INSERT OR REPLACE INTO agentsam_ticket_events (
  id, ticket_id, event_type, from_status, to_status, detail,
  commit_sha, actor_type, actor_id, created_at
) VALUES (
  'tktevt_cpas_mod_umbrella_20260818',
  'tkt_cpas_mod_umbrella_20260818',
  'created',
  NULL,
  'active',
  'Lane ticket created. Exclusive files in description. PR only. Operator merges and ships.',
  NULL,
  'user',
  'operator',
  strftime('%s','now')
);

INSERT OR REPLACE INTO agentsam_tickets (
  id, title, description, status, status_reason, project, subsystem, tags, priority, requested_by, doc_path, blocked_by, blocks, attachments_json, created_at, updated_at, closed_at
) VALUES (
  'tkt_cpas_mod_cms_api_20260818',
  'Split src/api/cms_api.js into cms route modules (no API behavior change)',
  '~2389-line Worker file. One if (path === ''/api/cms/...'') ladder plus injectCmsInspector (~480 lines).

EXCLUSIVE FILES
• src/api/cms_api.js (keep as thin cmsRoutes dispatcher + re-exports)
• src/api/cms/* (NEW: shared.js, preview_inspector.js, routes_pages.js, routes_sections.js, routes_blocks.js, routes_assets.js, routes_brand.js, routes_publish.js)
• src/api/cms_editor_config.js (already started — finish, do not duplicate)

FORBIDDEN
view-cms.jsx, dashboard_api.js, cpas-shell.css, index.js (keep `import { cmsRoutes } from ''./api/cms_api.js''`).

PLAN OF ACTION
1. Extract json/bustCache/requireCmsUser/TENANT_ID into src/api/cms/shared.js.
2. Move injectCmsInspector to preview_inspector.js unchanged.
3. Split remaining handlers by domain; each handleX(request, env, ctx) returns Response | null.
4. cmsRoutes calls them in today''s order. Identical status codes and JSON keys.
5. node --check every new file. Smoke: GET /api/cms/bootstrap (auth), GET /api/cms/page?route=/events, POST reorder still 200.

ACCEPTANCE
• cms_api.js under ~400 lines.
• No /api/cms path added/removed/renamed.
• PR feat/tkt_cpas_mod_cms_api_20260818 — do not merge/deploy.


AGENT LANE (do not skip)
1. One agent per ticket. Branch: feat/<this-ticket-id>
2. Edit ONLY Exclusive files. Do not touch other 1200+ line files.
3. Keep the original filename as the public export so src/index.js does not need to change (re-export from a thin wrapper).
4. Preserve every public URL, /api path, JSON key, D1 table/column, and user-visible copy.
5. Move/split/polish only. No new features unless listed in Acceptance.
6. Validate: node --check on edited Worker .js. For dashboard JSX, load the named view logged-in. For CSS, spot-check 2 public pages or dashboard shell.
7. git push -u origin HEAD. Open a GitHub PR titled with this ticket id. Do NOT merge. Do NOT wrangler deploy production. Operator inspects, merges, pulls, ships.
8. If you need a shared helper, put it in a NEW file under the exclusive folder. Do not "clean up" neighboring giants.


SAFETY / NO-BREAK
This is a live semi-working production site. Refine what is here.
• No route or query-param renames.
• No D1 DROP/rename. Additive indexes only if a query is proven hot.
• No visual redesign. Keep tokens, spacing, and selectors working.
• No deleting "unused" code unless you prove zero callers (rg + runtime).
• Rollback = revert the PR branch.
',
  'blocked',
  'Wait until Events product ticket merges so both agents do not edit cms_api.js',
  'runtime-modularize',
  'cms',
  '["modularize","cms","worker","no-break"]',
  'high',
  'operator',
  'docs/features/cms-live-editor.md',
  'tkt_cpas_cms_editor_events_repair_20260818',
  NULL,
  '[]',
  strftime('%s','now'),
  strftime('%s','now'),
  NULL
);

INSERT OR REPLACE INTO agentsam_ticket_events (
  id, ticket_id, event_type, from_status, to_status, detail,
  commit_sha, actor_type, actor_id, created_at
) VALUES (
  'tktevt_cpas_mod_cms_api_20260818',
  'tkt_cpas_mod_cms_api_20260818',
  'created',
  NULL,
  'blocked',
  'Lane ticket created. Exclusive files in description. PR only. Operator merges and ships.',
  NULL,
  'user',
  'operator',
  strftime('%s','now')
);

INSERT OR REPLACE INTO agentsam_tickets (
  id, title, description, status, status_reason, project, subsystem, tags, priority, requested_by, doc_path, blocked_by, blocks, attachments_json, created_at, updated_at, closed_at
) VALUES (
  'tkt_cpas_mod_view_cms_20260818',
  'Split public/dashboard/js/view-cms.jsx into cms view modules (Babel globals)',
  '~4913-line Babel dashboard file: Website, Pages, Editor, Images, Brand in one global script.

EXCLUSIVE FILES
• public/dashboard/js/view-cms.jsx (thin barrel exporting the same window globals)
• public/dashboard/js/cms/*.jsx (NEW modules)
• public/dashboard/index.html (only add script tags for new cms/*.jsx BEFORE view-cms.jsx; do not reorder other views)
• packages/cms-editor/* (optional TS kernel types/hooks — not loaded by Babel)

FORBIDDEN
src/api/cms_api.js, dashboard_api.js, view-animals.jsx, dash.css (except if you add cms-editor.css as a NEW file).

PLAN OF ACTION
1. Split by existing functions: CmsWebsiteView, CmsPagesView, CmsPageEditorView, CmsImagesView, CmsBrandView.
2. Keep React.createElement style and window.Btn / Icon / C from ui.jsx.
3. Load page catalog from GET /api/cms/bootstrap (schemas, cta_actions, cdn_base) — do not re-hardcode CMS_CTA_ACTIONS as SSOT if bootstrap already returns them.
4. Cache-bust via scripts/sync-r2.sh hash on index.html.

ACCEPTANCE
• view-cms.jsx under ~400 lines.
• /dashboard/cms/website, /pages, /pages/events, /images, /brand still render.
• Same window exports: CmsWebsiteView, CmsPagesView, CmsPageEditorView, CmsImagesView, CmsBrandView, CmsSectionUndoToast.
• PR only — no production deploy.


AGENT LANE (do not skip)
1. One agent per ticket. Branch: feat/<this-ticket-id>
2. Edit ONLY Exclusive files. Do not touch other 1200+ line files.
3. Keep the original filename as the public export so src/index.js does not need to change (re-export from a thin wrapper).
4. Preserve every public URL, /api path, JSON key, D1 table/column, and user-visible copy.
5. Move/split/polish only. No new features unless listed in Acceptance.
6. Validate: node --check on edited Worker .js. For dashboard JSX, load the named view logged-in. For CSS, spot-check 2 public pages or dashboard shell.
7. git push -u origin HEAD. Open a GitHub PR titled with this ticket id. Do NOT merge. Do NOT wrangler deploy production. Operator inspects, merges, pulls, ships.
8. If you need a shared helper, put it in a NEW file under the exclusive folder. Do not "clean up" neighboring giants.


SAFETY / NO-BREAK
This is a live semi-working production site. Refine what is here.
• No route or query-param renames.
• No D1 DROP/rename. Additive indexes only if a query is proven hot.
• No visual redesign. Keep tokens, spacing, and selectors working.
• No deleting "unused" code unless you prove zero callers (rg + runtime).
• Rollback = revert the PR branch.
',
  'blocked',
  'Wait until Events product ticket merges so both agents do not edit view-cms.jsx',
  'runtime-modularize',
  'cms',
  '["modularize","cms","dashboard","no-break"]',
  'high',
  'operator',
  'docs/features/cms-live-editor.md',
  'tkt_cpas_cms_editor_events_repair_20260818',
  NULL,
  '[]',
  strftime('%s','now'),
  strftime('%s','now'),
  NULL
);

INSERT OR REPLACE INTO agentsam_ticket_events (
  id, ticket_id, event_type, from_status, to_status, detail,
  commit_sha, actor_type, actor_id, created_at
) VALUES (
  'tktevt_cpas_mod_view_cms_20260818',
  'tkt_cpas_mod_view_cms_20260818',
  'created',
  NULL,
  'blocked',
  'Lane ticket created. Exclusive files in description. PR only. Operator merges and ships.',
  NULL,
  'user',
  'operator',
  strftime('%s','now')
);

INSERT OR REPLACE INTO agentsam_tickets (
  id, title, description, status, status_reason, project, subsystem, tags, priority, requested_by, doc_path, blocked_by, blocks, attachments_json, created_at, updated_at, closed_at
) VALUES (
  'tkt_cpas_mod_dashboard_api_20260818',
  'Split src/api/dashboard_api.js into dashboard route modules (no API behavior change)',
  '~2128-line Worker file. dashboardApiRoutes is a single ladder: overview, animals, applications, fundraising, donations, volunteers, team, calendar, fosters, adoptions, intakes, medical, daily-care, social-connections, cms stub, config, tasks, reports, settings.

EXCLUSIVE FILES
• src/api/dashboard_api.js (keep exporting dashboardApiRoutes)
• src/api/dashboard/* (NEW: shared.js + one module per domain)
  suggested: routes_overview.js, routes_animals.js, routes_applications.js, routes_fundraising.js, routes_fosters.js, routes_care.js (intakes/medical/daily-care), routes_reports.js, routes_settings.js, routes_misc.js (team/calendar/volunteers/donations/config/tasks/cms stub)

FORBIDDEN
cms_api.js, view-animals.jsx (UI), animal_profiles schema changes, src/index.js (keep import from dashboard_api.js).

PLAN OF ACTION
1. Extract TENANT/ORG, json(), normalizeAnimal(), and other helpers into shared.js without changing return shapes.
2. Move each path block verbatim. GET/POST/PUT/PATCH status codes stay the same.
3. Canonical animal table remains animal_profiles (comment at top of file). Do not revive deleted `animals` table.
4. CDN helper may read env.APP_DOMAIN later; do not break existing https://assets.companionsofcaddo.org URLs this pass unless already derived.
5. node --check. Smoke: GET /api/dashboard/overview, GET /api/dashboard/animals, GET /api/dashboard/fosters (auth cookies).

ACCEPTANCE
• dashboard_api.js under ~250 lines dispatcher.
• Zero path or JSON key changes.
• PR feat/tkt_cpas_mod_dashboard_api_20260818 — operator merges/ships.


AGENT LANE (do not skip)
1. One agent per ticket. Branch: feat/<this-ticket-id>
2. Edit ONLY Exclusive files. Do not touch other 1200+ line files.
3. Keep the original filename as the public export so src/index.js does not need to change (re-export from a thin wrapper).
4. Preserve every public URL, /api path, JSON key, D1 table/column, and user-visible copy.
5. Move/split/polish only. No new features unless listed in Acceptance.
6. Validate: node --check on edited Worker .js. For dashboard JSX, load the named view logged-in. For CSS, spot-check 2 public pages or dashboard shell.
7. git push -u origin HEAD. Open a GitHub PR titled with this ticket id. Do NOT merge. Do NOT wrangler deploy production. Operator inspects, merges, pulls, ships.
8. If you need a shared helper, put it in a NEW file under the exclusive folder. Do not "clean up" neighboring giants.


SAFETY / NO-BREAK
This is a live semi-working production site. Refine what is here.
• No route or query-param renames.
• No D1 DROP/rename. Additive indexes only if a query is proven hot.
• No visual redesign. Keep tokens, spacing, and selectors working.
• No deleting "unused" code unless you prove zero callers (rg + runtime).
• Rollback = revert the PR branch.
',
  'backlog',
  'Parallel lane — exclusive Worker file, no overlap with CMS Events product ticket',
  'runtime-modularize',
  'dashboard',
  '["modularize","dashboard","worker","animals","no-break"]',
  'high',
  'operator',
  NULL,
  NULL,
  NULL,
  '[]',
  strftime('%s','now'),
  strftime('%s','now'),
  NULL
);

INSERT OR REPLACE INTO agentsam_ticket_events (
  id, ticket_id, event_type, from_status, to_status, detail,
  commit_sha, actor_type, actor_id, created_at
) VALUES (
  'tktevt_cpas_mod_dashboard_api_20260818',
  'tkt_cpas_mod_dashboard_api_20260818',
  'created',
  NULL,
  'backlog',
  'Lane ticket created. Exclusive files in description. PR only. Operator merges and ships.',
  NULL,
  'user',
  'operator',
  strftime('%s','now')
);

INSERT OR REPLACE INTO agentsam_tickets (
  id, title, description, status, status_reason, project, subsystem, tags, priority, requested_by, doc_path, blocked_by, blocks, attachments_json, created_at, updated_at, closed_at
) VALUES (
  'tkt_cpas_mod_view_animals_20260818',
  'Split public/dashboard/js/view-animals.jsx into animal dashboard modules',
  '~2252-line Babel animals UI. File already says: this file only; dashboard shell/nav untouched.

EXCLUSIVE FILES
• public/dashboard/js/view-animals.jsx (thin barrel)
• public/dashboard/js/animals/*.jsx (NEW)
• public/dashboard/index.html (only the view-animals.jsx script src/cache-bust — do not add/remove other scripts)

FORBIDDEN
src/api/dashboard_api.js (API stays as-is unless a bug you prove; prefer UI-only split), view-cms.jsx.

PLAN OF ACTION
1. Split list / profile / medical docs / foster assignment UI along existing inner functions.
2. Keep IIFE + window globals the dashboard router already calls.
3. Still talk to /api/dashboard/animals and related paths unchanged.

ACCEPTANCE
• view-animals.jsx under ~400 lines.
• /dashboard/animals list + one animal profile still load.
• PR only.


AGENT LANE (do not skip)
1. One agent per ticket. Branch: feat/<this-ticket-id>
2. Edit ONLY Exclusive files. Do not touch other 1200+ line files.
3. Keep the original filename as the public export so src/index.js does not need to change (re-export from a thin wrapper).
4. Preserve every public URL, /api path, JSON key, D1 table/column, and user-visible copy.
5. Move/split/polish only. No new features unless listed in Acceptance.
6. Validate: node --check on edited Worker .js. For dashboard JSX, load the named view logged-in. For CSS, spot-check 2 public pages or dashboard shell.
7. git push -u origin HEAD. Open a GitHub PR titled with this ticket id. Do NOT merge. Do NOT wrangler deploy production. Operator inspects, merges, pulls, ships.
8. If you need a shared helper, put it in a NEW file under the exclusive folder. Do not "clean up" neighboring giants.


SAFETY / NO-BREAK
This is a live semi-working production site. Refine what is here.
• No route or query-param renames.
• No D1 DROP/rename. Additive indexes only if a query is proven hot.
• No visual redesign. Keep tokens, spacing, and selectors working.
• No deleting "unused" code unless you prove zero callers (rg + runtime).
• Rollback = revert the PR branch.
',
  'backlog',
  NULL,
  'runtime-modularize',
  'animals',
  '["modularize","dashboard","animals","no-break"]',
  'medium',
  'operator',
  NULL,
  NULL,
  NULL,
  '[]',
  strftime('%s','now'),
  strftime('%s','now'),
  NULL
);

INSERT OR REPLACE INTO agentsam_ticket_events (
  id, ticket_id, event_type, from_status, to_status, detail,
  commit_sha, actor_type, actor_id, created_at
) VALUES (
  'tktevt_cpas_mod_view_animals_20260818',
  'tkt_cpas_mod_view_animals_20260818',
  'created',
  NULL,
  'backlog',
  'Lane ticket created. Exclusive files in description. PR only. Operator merges and ships.',
  NULL,
  'user',
  'operator',
  strftime('%s','now')
);

INSERT OR REPLACE INTO agentsam_tickets (
  id, title, description, status, status_reason, project, subsystem, tags, priority, requested_by, doc_path, blocked_by, blocks, attachments_json, created_at, updated_at, closed_at
) VALUES (
  'tkt_cpas_mod_payments_email_20260818',
  'Split src/api/payments_email.js into donations vs email-admin modules',
  '~1309-line Worker mixing public donate checkout, Stripe webhook, newsletter, and admin email logs.

EXCLUSIVE FILES
• src/api/payments_email.js (keep paymentsEmailRoutes export)
• src/api/payments/* (NEW) e.g. routes_donations.js, routes_stripe_webhook.js, routes_newsletter.js, routes_admin_email.js, shared.js

FORBIDDEN
cms_api.js, donate public HTML/CSS (cpas-donate-v2.css), Stripe secret names.

PLAN OF ACTION
1. Move handlers verbatim: /api/donations/*, /api/webhooks/stripe, /api/newsletter/subscribe, /api/admin/donations, /api/admin/email/*.
2. Do not change webhook signature verification or amount math.
3. node --check. Do not fire live Stripe tests unless operator provides a test clock.

ACCEPTANCE
• Dispatcher under ~200 lines.
• Same paths and JSON. PR only.


AGENT LANE (do not skip)
1. One agent per ticket. Branch: feat/<this-ticket-id>
2. Edit ONLY Exclusive files. Do not touch other 1200+ line files.
3. Keep the original filename as the public export so src/index.js does not need to change (re-export from a thin wrapper).
4. Preserve every public URL, /api path, JSON key, D1 table/column, and user-visible copy.
5. Move/split/polish only. No new features unless listed in Acceptance.
6. Validate: node --check on edited Worker .js. For dashboard JSX, load the named view logged-in. For CSS, spot-check 2 public pages or dashboard shell.
7. git push -u origin HEAD. Open a GitHub PR titled with this ticket id. Do NOT merge. Do NOT wrangler deploy production. Operator inspects, merges, pulls, ships.
8. If you need a shared helper, put it in a NEW file under the exclusive folder. Do not "clean up" neighboring giants.


SAFETY / NO-BREAK
This is a live semi-working production site. Refine what is here.
• No route or query-param renames.
• No D1 DROP/rename. Additive indexes only if a query is proven hot.
• No visual redesign. Keep tokens, spacing, and selectors working.
• No deleting "unused" code unless you prove zero callers (rg + runtime).
• Rollback = revert the PR branch.
',
  'backlog',
  NULL,
  'runtime-modularize',
  'payments',
  '["modularize","payments","stripe","email","no-break"]',
  'medium',
  'operator',
  NULL,
  NULL,
  NULL,
  '[]',
  strftime('%s','now'),
  strftime('%s','now'),
  NULL
);

INSERT OR REPLACE INTO agentsam_ticket_events (
  id, ticket_id, event_type, from_status, to_status, detail,
  commit_sha, actor_type, actor_id, created_at
) VALUES (
  'tktevt_cpas_mod_payments_email_20260818',
  'tkt_cpas_mod_payments_email_20260818',
  'created',
  NULL,
  'backlog',
  'Lane ticket created. Exclusive files in description. PR only. Operator merges and ships.',
  NULL,
  'user',
  'operator',
  strftime('%s','now')
);

INSERT OR REPLACE INTO agentsam_tickets (
  id, title, description, status, status_reason, project, subsystem, tags, priority, requested_by, doc_path, blocked_by, blocks, attachments_json, created_at, updated_at, closed_at
) VALUES (
  'tkt_cpas_mod_agentsam_tools_20260818',
  'Split src/api/agentsam_tools.js (registry vs execute vs HTTP routes)',
  '~1270-line Agent Sam tool registry + executeTool switch + /api/agentsam/tools/ routes.

EXCLUSIVE FILES
• src/api/agentsam_tools.js (keep AGENT_TOOLS, executeTool, agentsamToolsRoutes exports)
• src/api/agentsam/* (NEW: tools_registry.js, tools_execute.js, tools_routes.js, optional per-tool files)

FORBIDDEN
cms_api.js, tickets_api.js, src/core/agentsam_tickets.js.

PLAN OF ACTION
1. Keep tool_key strings identical (Agent Sam depends on them).
2. executeTool default branch and TOOL_ROUTES map stay equivalent.
3. KV/D1 side effects of tools stay behind the same approval_required flags.

ACCEPTANCE
• No tool renamed. /api/agentsam/tools/* still 401 without session.
• PR only.


AGENT LANE (do not skip)
1. One agent per ticket. Branch: feat/<this-ticket-id>
2. Edit ONLY Exclusive files. Do not touch other 1200+ line files.
3. Keep the original filename as the public export so src/index.js does not need to change (re-export from a thin wrapper).
4. Preserve every public URL, /api path, JSON key, D1 table/column, and user-visible copy.
5. Move/split/polish only. No new features unless listed in Acceptance.
6. Validate: node --check on edited Worker .js. For dashboard JSX, load the named view logged-in. For CSS, spot-check 2 public pages or dashboard shell.
7. git push -u origin HEAD. Open a GitHub PR titled with this ticket id. Do NOT merge. Do NOT wrangler deploy production. Operator inspects, merges, pulls, ships.
8. If you need a shared helper, put it in a NEW file under the exclusive folder. Do not "clean up" neighboring giants.


SAFETY / NO-BREAK
This is a live semi-working production site. Refine what is here.
• No route or query-param renames.
• No D1 DROP/rename. Additive indexes only if a query is proven hot.
• No visual redesign. Keep tokens, spacing, and selectors working.
• No deleting "unused" code unless you prove zero callers (rg + runtime).
• Rollback = revert the PR branch.
',
  'backlog',
  NULL,
  'runtime-modularize',
  'agentsam',
  '["modularize","agentsam","worker","no-break"]',
  'medium',
  'operator',
  NULL,
  NULL,
  NULL,
  '[]',
  strftime('%s','now'),
  strftime('%s','now'),
  NULL
);

INSERT OR REPLACE INTO agentsam_ticket_events (
  id, ticket_id, event_type, from_status, to_status, detail,
  commit_sha, actor_type, actor_id, created_at
) VALUES (
  'tktevt_cpas_mod_agentsam_tools_20260818',
  'tkt_cpas_mod_agentsam_tools_20260818',
  'created',
  NULL,
  'backlog',
  'Lane ticket created. Exclusive files in description. PR only. Operator merges and ships.',
  NULL,
  'user',
  'operator',
  strftime('%s','now')
);

INSERT OR REPLACE INTO agentsam_tickets (
  id, title, description, status, status_reason, project, subsystem, tags, priority, requested_by, doc_path, blocked_by, blocks, attachments_json, created_at, updated_at, closed_at
) VALUES (
  'tkt_cpas_mod_view_email_20260818',
  'Split public/dashboard/js/view-email.jsx mail UI modules',
  '~1224-line Collaborate Mail surface.

EXCLUSIVE FILES
• public/dashboard/js/view-email.jsx
• public/dashboard/js/email/*.jsx (NEW)
• public/dashboard/index.html (view-email.jsx script tag only)

FORBIDDEN
src/api/email_api.js, gmail_api.js, view-collaborate.jsx shell (unless a one-line global export).

PLAN OF ACTION
1. Split list / thread / compose along existing functions.
2. Keep window.Collaborate mail pane export name the shell already mounts.
3. Do not change Gmail OAuth or mailbox API payloads.

ACCEPTANCE
• Mail still opens from /dashboard/collaborate?seg=mail.
• PR only.


AGENT LANE (do not skip)
1. One agent per ticket. Branch: feat/<this-ticket-id>
2. Edit ONLY Exclusive files. Do not touch other 1200+ line files.
3. Keep the original filename as the public export so src/index.js does not need to change (re-export from a thin wrapper).
4. Preserve every public URL, /api path, JSON key, D1 table/column, and user-visible copy.
5. Move/split/polish only. No new features unless listed in Acceptance.
6. Validate: node --check on edited Worker .js. For dashboard JSX, load the named view logged-in. For CSS, spot-check 2 public pages or dashboard shell.
7. git push -u origin HEAD. Open a GitHub PR titled with this ticket id. Do NOT merge. Do NOT wrangler deploy production. Operator inspects, merges, pulls, ships.
8. If you need a shared helper, put it in a NEW file under the exclusive folder. Do not "clean up" neighboring giants.


SAFETY / NO-BREAK
This is a live semi-working production site. Refine what is here.
• No route or query-param renames.
• No D1 DROP/rename. Additive indexes only if a query is proven hot.
• No visual redesign. Keep tokens, spacing, and selectors working.
• No deleting "unused" code unless you prove zero callers (rg + runtime).
• Rollback = revert the PR branch.
',
  'backlog',
  NULL,
  'runtime-modularize',
  'email',
  '["modularize","email","dashboard","no-break"]',
  'medium',
  'operator',
  NULL,
  NULL,
  NULL,
  '[]',
  strftime('%s','now'),
  strftime('%s','now'),
  NULL
);

INSERT OR REPLACE INTO agentsam_ticket_events (
  id, ticket_id, event_type, from_status, to_status, detail,
  commit_sha, actor_type, actor_id, created_at
) VALUES (
  'tktevt_cpas_mod_view_email_20260818',
  'tkt_cpas_mod_view_email_20260818',
  'created',
  NULL,
  'backlog',
  'Lane ticket created. Exclusive files in description. PR only. Operator merges and ships.',
  NULL,
  'user',
  'operator',
  strftime('%s','now')
);

INSERT OR REPLACE INTO agentsam_tickets (
  id, title, description, status, status_reason, project, subsystem, tags, priority, requested_by, doc_path, blocked_by, blocks, attachments_json, created_at, updated_at, closed_at
) VALUES (
  'tkt_cpas_mod_cpas_shell_css_20260818',
  'Modularize static/global/cpas-shell.css without visual regressions',
  '~3980-line canonical public stylesheet (render_page.js SHELL_CSS).

EXCLUSIVE FILES
• static/global/cpas-shell.css (may @import new partials under static/global/shell/)
• static/global/shell/*.css (NEW partials)

FORBIDDEN
public/dashboard/dash.css, public/_shared.css, donate-v2 CSS, changing public class names.

PLAN OF ACTION
1. Split by comments/sections already in the file (header, cards, ways-grid, donate, footer). Prefer @import from cpas-shell.css so one public URL remains /static/global/cpas-shell.css.
2. Do not restyle. Pixel-compare Home + /events + /donate.
3. Events product ticket may already have patched .ways-grid / .ways-card img — keep those rules.

ACCEPTANCE
• Public pages unchanged to the eye.
• Still a single SHELL_CSS href.
• PR only. Worker deploy not required unless you change render_page.js (you should not).


AGENT LANE (do not skip)
1. One agent per ticket. Branch: feat/<this-ticket-id>
2. Edit ONLY Exclusive files. Do not touch other 1200+ line files.
3. Keep the original filename as the public export so src/index.js does not need to change (re-export from a thin wrapper).
4. Preserve every public URL, /api path, JSON key, D1 table/column, and user-visible copy.
5. Move/split/polish only. No new features unless listed in Acceptance.
6. Validate: node --check on edited Worker .js. For dashboard JSX, load the named view logged-in. For CSS, spot-check 2 public pages or dashboard shell.
7. git push -u origin HEAD. Open a GitHub PR titled with this ticket id. Do NOT merge. Do NOT wrangler deploy production. Operator inspects, merges, pulls, ships.
8. If you need a shared helper, put it in a NEW file under the exclusive folder. Do not "clean up" neighboring giants.


SAFETY / NO-BREAK
This is a live semi-working production site. Refine what is here.
• No route or query-param renames.
• No D1 DROP/rename. Additive indexes only if a query is proven hot.
• No visual redesign. Keep tokens, spacing, and selectors working.
• No deleting "unused" code unless you prove zero callers (rg + runtime).
• Rollback = revert the PR branch.
',
  'blocked',
  'Events product ticket may patch .ways-grid; split after that merges',
  'runtime-modularize',
  'public-css',
  '["modularize","css","public","no-break"]',
  'medium',
  'operator',
  NULL,
  'tkt_cpas_cms_editor_events_repair_20260818',
  NULL,
  '[]',
  strftime('%s','now'),
  strftime('%s','now'),
  NULL
);

INSERT OR REPLACE INTO agentsam_ticket_events (
  id, ticket_id, event_type, from_status, to_status, detail,
  commit_sha, actor_type, actor_id, created_at
) VALUES (
  'tktevt_cpas_mod_cpas_shell_css_20260818',
  'tkt_cpas_mod_cpas_shell_css_20260818',
  'created',
  NULL,
  'blocked',
  'Lane ticket created. Exclusive files in description. PR only. Operator merges and ships.',
  NULL,
  'user',
  'operator',
  strftime('%s','now')
);

INSERT OR REPLACE INTO agentsam_tickets (
  id, title, description, status, status_reason, project, subsystem, tags, priority, requested_by, doc_path, blocked_by, blocks, attachments_json, created_at, updated_at, closed_at
) VALUES (
  'tkt_cpas_mod_dash_css_20260818',
  'Modularize public/dashboard/dash.css without dashboard visual regressions',
  '~2172-line dashboard chrome stylesheet.

EXCLUSIVE FILES
• public/dashboard/dash.css
• public/dashboard/css/dash-*.css (NEW partials) if you @import from dash.css
• public/dashboard/index.html (dash.css href cache-bust only)

FORBIDDEN
cpas-shell.css, collaborate.css (already separate), rewriting the dashboard theme.

PLAN OF ACTION
1. Split layout / tokens / components along existing sections.
2. Keep CSS variables --dash-* and --brand-* names.
3. Spot-check /dashboard/overview and /dashboard/cms/pages.

ACCEPTANCE
• No color/spacing redesign.
• PR + R2 sync of CSS after operator merge (not self-deploy).


AGENT LANE (do not skip)
1. One agent per ticket. Branch: feat/<this-ticket-id>
2. Edit ONLY Exclusive files. Do not touch other 1200+ line files.
3. Keep the original filename as the public export so src/index.js does not need to change (re-export from a thin wrapper).
4. Preserve every public URL, /api path, JSON key, D1 table/column, and user-visible copy.
5. Move/split/polish only. No new features unless listed in Acceptance.
6. Validate: node --check on edited Worker .js. For dashboard JSX, load the named view logged-in. For CSS, spot-check 2 public pages or dashboard shell.
7. git push -u origin HEAD. Open a GitHub PR titled with this ticket id. Do NOT merge. Do NOT wrangler deploy production. Operator inspects, merges, pulls, ships.
8. If you need a shared helper, put it in a NEW file under the exclusive folder. Do not "clean up" neighboring giants.


SAFETY / NO-BREAK
This is a live semi-working production site. Refine what is here.
• No route or query-param renames.
• No D1 DROP/rename. Additive indexes only if a query is proven hot.
• No visual redesign. Keep tokens, spacing, and selectors working.
• No deleting "unused" code unless you prove zero callers (rg + runtime).
• Rollback = revert the PR branch.
',
  'backlog',
  NULL,
  'runtime-modularize',
  'dashboard',
  '["modularize","css","dashboard","no-break"]',
  'low',
  'operator',
  NULL,
  NULL,
  NULL,
  '[]',
  strftime('%s','now'),
  strftime('%s','now'),
  NULL
);

INSERT OR REPLACE INTO agentsam_ticket_events (
  id, ticket_id, event_type, from_status, to_status, detail,
  commit_sha, actor_type, actor_id, created_at
) VALUES (
  'tktevt_cpas_mod_dash_css_20260818',
  'tkt_cpas_mod_dash_css_20260818',
  'created',
  NULL,
  'backlog',
  'Lane ticket created. Exclusive files in description. PR only. Operator merges and ships.',
  NULL,
  'user',
  'operator',
  strftime('%s','now')
);

INSERT OR REPLACE INTO agentsam_tickets (
  id, title, description, status, status_reason, project, subsystem, tags, priority, requested_by, doc_path, blocked_by, blocks, attachments_json, created_at, updated_at, closed_at
) VALUES (
  'tkt_cpas_mod_shared_css_20260818',
  'Audit public/_shared.css vs canonical cpas-shell.css (do not double-ship)',
  '~2190-line public/_shared.css. render_page.js says cpas-shell.css is canonical and shared.css on R2 is an alias.

EXCLUSIVE FILES
• public/_shared.css
• (read-only) static/global/cpas-shell.css for comparison — do not edit shell on this ticket

FORBIDDEN
Deleting _shared.css until rg + live HTML prove zero consumers. Do not change SHELL_CSS.

PLAN OF ACTION
1. rg for _shared.css / shared.css links in Worker + R2 HTML.
2. If unused: document and leave a 10-line stub comment pointing at cpas-shell.css, or stop syncing it — operator confirms before delete.
3. If still aliased: make it `@import` cpas-shell.css only, no duplicate rules.

ACCEPTANCE
• No public visual change.
• Written note in PR of every remaining caller.
• PR only.


AGENT LANE (do not skip)
1. One agent per ticket. Branch: feat/<this-ticket-id>
2. Edit ONLY Exclusive files. Do not touch other 1200+ line files.
3. Keep the original filename as the public export so src/index.js does not need to change (re-export from a thin wrapper).
4. Preserve every public URL, /api path, JSON key, D1 table/column, and user-visible copy.
5. Move/split/polish only. No new features unless listed in Acceptance.
6. Validate: node --check on edited Worker .js. For dashboard JSX, load the named view logged-in. For CSS, spot-check 2 public pages or dashboard shell.
7. git push -u origin HEAD. Open a GitHub PR titled with this ticket id. Do NOT merge. Do NOT wrangler deploy production. Operator inspects, merges, pulls, ships.
8. If you need a shared helper, put it in a NEW file under the exclusive folder. Do not "clean up" neighboring giants.


SAFETY / NO-BREAK
This is a live semi-working production site. Refine what is here.
• No route or query-param renames.
• No D1 DROP/rename. Additive indexes only if a query is proven hot.
• No visual redesign. Keep tokens, spacing, and selectors working.
• No deleting "unused" code unless you prove zero callers (rg + runtime).
• Rollback = revert the PR branch.
',
  'backlog',
  NULL,
  'runtime-modularize',
  'public-css',
  '["modularize","css","audit","no-break"]',
  'low',
  'operator',
  NULL,
  NULL,
  NULL,
  '[]',
  strftime('%s','now'),
  strftime('%s','now'),
  NULL
);

INSERT OR REPLACE INTO agentsam_ticket_events (
  id, ticket_id, event_type, from_status, to_status, detail,
  commit_sha, actor_type, actor_id, created_at
) VALUES (
  'tktevt_cpas_mod_shared_css_20260818',
  'tkt_cpas_mod_shared_css_20260818',
  'created',
  NULL,
  'backlog',
  'Lane ticket created. Exclusive files in description. PR only. Operator merges and ships.',
  NULL,
  'user',
  'operator',
  strftime('%s','now')
);


UPDATE agentsam_tickets
SET
  status_reason = 'PRODUCT lane: surgical Events/D1-catalog fixes. Modularize of cms_api/view-cms/cpas-shell is blocked_by this ticket.',
  blocks = CASE
    WHEN blocks IS NULL OR blocks = '' THEN 'tkt_cpas_mod_cms_api_20260818,tkt_cpas_mod_view_cms_20260818,tkt_cpas_mod_cpas_shell_css_20260818'
    ELSE blocks
  END,
  updated_at = strftime('%s','now')
WHERE id = 'tkt_cpas_cms_editor_events_repair_20260818';

