# Companions of CPAS Current File Map

Version: v1
Last aligned: 2026-06-11
Live repo path for production work: `/Users/samprimeaux/companionscpas`

This map reflects the current dashboard structure in the live repo. The older source map was stale because the dashboard is now grouped into consolidated view files rather than one file per route.

## Work Rules

- Work from `/Users/samprimeaux/companionscpas` for production edits, deploys, R2 sync, and KV work.
- Do not use a parallel clone for production work.
- Commit from the real repo and push to `main`.
- Do not stage unrelated local work.
- Existing local unstaged work found while aligning this map: `public/dashboard/index.html` modified and `scripts/migrate_r2_animals.py` untracked.
- No emojis in UI copy, labels, comments, generated content, README text, or dashboard icon props. Current emoji cleanup targets are listed below.

## Dashboard Shell

| Concern | File | Notes |
|---|---|---|
| HTML shell | `public/dashboard/index.html` | Loads dashboard scripts and owns shell CSS. |
| Router | `public/dashboard/js/app.jsx` | Owns `ROUTE_REGISTRY`, legacy `?view=` compatibility, session check, mobile shell state, and route render switch. |
| Shared UI | `public/dashboard/js/ui.jsx` | Sidebar, top bar, cards, shared components, mobile nav pieces. |
| Config | `public/dashboard/js/config.js` | Loads `/api/dashboard/config`. |
| Data bootstrap | `public/dashboard/js/data.js` | Loads `/api/dashboard/overview` and `/api/dashboard/team`, then hydrates `window.CPAS`. |
| Agent Sam | `public/dashboard/js/agentsam.jsx` | Chat UI, uploads, Google Drive helper hooks, Agent Sam API calls. |

## Dashboard Route Ownership

| Route | App view key | Component | Frontend file | Backend/API lane | Data/storage lane | Notes |
|---|---|---|---|---|---|---|
| `/dashboard/overview` | `overview` | `OverviewView` | `view-overview.jsx` | `/api/dashboard/overview`, `/api/dashboard/team` | `animal_profiles`, `cpas_foster_applications`, `fundraising_campaigns_demo`, `volunteer_records` | Confirm metrics are real or clearly empty. |
| `/dashboard/animals` | `animals` | `AnimalsView` | `view-animals.jsx` | `/api/dashboard/animals` | `animal_profiles`, `cms_assets` | Needs CRUD reliability and Adopt page alignment. |
| `/dashboard/animals/:animalId` | `animal-profile` | `AnimalProfileView` | `view-animals.jsx` | Needs route-specific backend audit | `animal_profiles` plus related records | Make canonical internal animal profile. |
| `/dashboard/intakes` | `intakes` | `IntakesView` | `view-ops.jsx` | `/api/dashboard/intakes` | `animal_profiles` | Needs backend-connected intake workflow and emoji cleanup. |
| `/dashboard/medical` | `medical` | `MedicalView` | `view-ops.jsx` | `/api/dashboard/medical` | `care_tasks` | Decide dedicated medical table vs typed care tasks. Emoji cleanup needed. |
| `/dashboard/daily-care` | `daily-care` | `DailyCareView` | `view-ops.jsx` | `/api/dashboard/daily-care` | `care_tasks` | Needs emoji removal and backend connection validation. |
| `/dashboard/fosters` | `fosters` | `FostersView` | `view-animals.jsx` | `/api/dashboard/fosters` | `foster_records`, `animal_profiles` | Connect to foster-needed web/social workflows. |
| `/dashboard/adoptions` | `adoptions` | `AdoptionsView` | `view-animals.jsx` | `/api/dashboard/adoptions` | `applications` currently | Clarify adoption vs foster application source of truth. |
| `/dashboard/applications` | `applications` | `ApplicationsView` | `view-applications.jsx` | `/api/dashboard/applications` | `cpas_foster_applications` | Needs review/status CRUD and email alignment. |
| `/dashboard/applications/:appId` | `application-detail` | `ApplicationDetailView` | `view-applications.jsx` | Needs route-specific backend audit | `cpas_foster_applications` | Make source of truth for review. |
| `/dashboard/volunteers` | `volunteers` | `VolunteersView` | `view-ops.jsx` | `/api/dashboard/team`; reports expect `/api/dashboard/volunteers` | `volunteer_records` | Verify or add `/api/dashboard/volunteers`. |
| `/dashboard/donations` | `donations` | `DonationsView` | `view-finance.jsx` | `/api/dashboard/donations` | `donations` | Backburner until Stripe/customer setup is complete. Emoji cleanup needed. |
| `/dashboard/fundraising` | `fundraising` | `FundraisingView` | `view-finance.jsx` | `/api/dashboard/fundraising` | `fundraising_campaigns_demo` | Backburner; hide/label demo data. Emoji cleanup needed. |
| `/dashboard/cms/website` | `cms-website` | `CmsWebsiteView` | `view-cms.jsx` | `/api/cms/bootstrap`, `/api/cms/publish` | `cms_pages`, `cms_assets`, `cms_brand_settings`, `cms_navigation_items`, `cms_themes`, R2, KV | Website hub. |
| `/dashboard/cms/pages` | `cms-pages` | `CmsPagesView` | `view-cms.jsx` | `/api/cms/bootstrap`, `/api/cms/sections`, `/api/cms/page/save`, `/api/cms/publish` | `cms_pages`, `cms_page_sections`, `cms_page_content_blocks`, R2, KV | High priority for page editing. |
| `/dashboard/cms/pages/:pageId` | `cms-page-editor` | `CmsPageEditorView` | `view-cms.jsx` | `/api/cms/page`, `/api/cms/section/save`, `/api/cms/block/save`, `/api/cms/publish` | `cms_pages`, `cms_page_sections`, `cms_page_content_blocks`, R2, KV | Page remaster work should happen here. |
| `/dashboard/cms/images` | `cms-images` | `CmsImagesView` | `view-cms.jsx` | `/api/cms/assets`, `/api/cms/asset/upload`, `/api/cms/asset/save`, Google Drive endpoints | `cms_assets`, R2, Google Drive OAuth tables | Strong UI; R2 images and Google Drive appear solid. |
| `/dashboard/cms/brand` | `cms-brand` | `CmsBrandView` | `view-cms.jsx` | `/api/cms/brand`, `/api/cms/brand/save`, `/api/cms/brand/config` | `cms_brand_settings`, KV | Needs enhancement; should become org identity source of truth. |
| `/dashboard/cms/templates` | `cms-templates` | `CmsTemplatesView` | `view-cms.jsx` | Needs backend audit | Future reusable section/template lane | Lower priority; extract reusable sections as pages are remastered. |
| `/dashboard/reports` | `reports` | `ReportsView` | `view-reports.jsx` | Dashboard report fetches and Agent Sam runs | Animals, donations, applications, volunteers, medical, AI usage tables | Active reports file is `view-reports.jsx`; stale `ReportsView` also exists in `view-admin.jsx`. |
| `/dashboard/settings` | `settings` | `SettingsView` | `view-admin.jsx` | `/api/dashboard/config` plus future settings endpoints | Brand, users, integrations, notifications | Build out Organization, Users, Integrations, Notifications. |
| `/dashboard/notifications` | `notifications` | `NotificationsView` | `view-admin.jsx` | Needs backend audit | Future notification/event table | Needs backend connection and emoji cleanup. |
| `/dashboard/email` | `email` | Inline scaffold | `app.jsx` | Planned `/api/email/inbound` | Future Resend inbound storage | Needs Resend inbound webhook, inbox, detail, reply flow. |

## Reports View Alignment

Active file: `public/dashboard/js/view-reports.jsx`.

| Reports tab | Frontend source | API/data source | DB/backend alignment needed |
|---|---|---|---|
| Animals | `ReportsView` in `view-reports.jsx` | `/api/dashboard/animals?limit=100` | `animal_profiles`, optional `cms_assets` image join. |
| Financial | `ReportsView` in `view-reports.jsx` | `/api/dashboard/donations`; `/api/dashboard/reports` also has donations lane | `donations`; Stripe setup pending, hide or mark empty until customer setup is complete. |
| Applications | `ReportsView` in `view-reports.jsx` | `/api/dashboard/applications?limit=100` | `cpas_foster_applications`; clarify foster vs adoption app reporting. |
| Volunteers | `ReportsView` in `view-reports.jsx` | `/api/dashboard/volunteers`; dashboard API visibly has `/api/dashboard/team` | `volunteer_records`; verify endpoint exists or add alias. |
| Medical | `ReportsView` in `view-reports.jsx` | Needs audit; `/api/dashboard/medical` exists | `care_tasks` filtered for medical/vaccine/med terms or a future dedicated medical table. |
| AI Usage | `ReportsView` in `view-reports.jsx` | `/api/agentsam/runs?limit=50` plus scheduled rollups | `agentsam_usage_events`, `agentsam_usage_rollups_daily`, run/session tables as implemented. Must show real usage only. |

## Settings View Alignment

Active file: `public/dashboard/js/view-admin.jsx`.

| Settings view to build | Current frontend owner | Likely backend/API | DB/storage alignment |
|---|---|---|---|
| Organization | `SettingsView` / future split file | `/api/dashboard/config`; `/api/cms/brand`; `/api/cms/brand/save` | `cms_brand_settings`, `cms_themes`, `cms_navigation_items`. |
| Users | `SettingsView` / future split file | Existing auth/session routes plus future user admin endpoints | User/auth/session tables. Do not expose secrets. |
| Integrations | `SettingsView` / future split file | `drive_api.js`, `social.js`, provider-specific status endpoints | `social_provider_connections`, `integration_oauth_states`; secrets in CF/provider UIs only. |
| Notifications | `NotificationsView` and future settings subsection | Future notification preference endpoints | Notification/event/preference table to confirm or create. |

## Backend/API File Map

| File | Current responsibility |
|---|---|
| `src/index.js` | Worker entry, auth gating, public route serving, dashboard shell serving, API route dispatch, scheduled Agent Sam rollups. |
| `src/api/dashboard_api.js` | Dashboard read APIs for overview, animals, applications, fundraising, team, calendar, CMS snapshot, config, tasks, fosters, adoptions, intakes, medical, daily care, reports. |
| `src/api/cms_api.js` | Main CMS API: bootstrap, page get/save, section save/delete, block save, publish, assets, upload, asset save, brand get/save/config. Writes R2 and busts KV where applicable. |
| `src/api/cms_api_additions.js` | Older/additional CMS route definitions; appears partially duplicated with `cms_api.js`. Audit before modifying. |
| `src/api/drive_api.js` | Google Drive OAuth/status/files/import/disconnect/test. Imports Drive images to R2 and registers `cms_assets`. |
| `src/api/auth_login.js` | Login route and credential validation. |
| `src/api/auth_google.js` | Google auth/OAuth login lane. |
| `src/api/session_api.js` | Session auth, `/api/auth/me`, logout, `getAuthUser`. |
| `src/api/password_reset.js` | Password reset route flow. |
| `src/api/foster_api.js` | Public foster/adoption application flow: apply/list/update. |
| `src/api/donation_api.js` | Stripe checkout intent creation. Backburner until Stripe setup is finished. |
| `src/api/payments_email.js` | Stripe webhook and Resend outbound email. |
| `src/api/social.js` | Social provider status/OAuth stubs, Facebook embed config, social drafts/jobs/publish scaffolds. |
| `src/api/agentsam_api.js` | Agent Sam chat/session endpoints. |
| `src/api/agentsam_tools.js` | DB-driven Agent Sam tool dispatch. |
| `src/api/render_page.js` | Public page render pipeline. |
| `src/api/render_section.js` | Section renderer pipeline for CMS public pages. |
| `src/api/render_home.js` | Homepage renderer/reference implementation. |
| `src/api/_shell.js` | Shared public HTML shell and branding helpers. |
| `src/api/contact_api.js` | Public contact form. |
| `src/api/resolveModel.js` | LLM routing and IAM sync/rollup support. |

## Current Data/Table Alignment Snapshot

| Area | Tables or storage currently referenced | Action needed |
|---|---|---|
| Animals | `animal_profiles`, `cms_assets` | Verify CRUD endpoints, status values, public visibility, R2 image relationship. |
| Applications | `cpas_foster_applications`, `applications` | Align duplicate/overlapping application tables. Decide foster vs adoption application source of truth. |
| Fosters | `foster_records`, `animal_profiles` | Verify CRUD and relation to animal/foster-needed workflows. |
| Intakes | `animal_profiles` | Consider dedicated intake workflow/table or ensure intake fields live on `animal_profiles`. |
| Medical | `care_tasks` filtered by medical terms | Decide if medical should use dedicated records table or typed `care_tasks`. |
| Daily Care | `care_tasks` | Backend-connect and determine if v1 should remain visible. |
| Volunteers | `volunteer_records` | Add/verify CRUD and reports endpoint alias. |
| Donations | `donations` | Stripe pending. Keep empty/backburner until customer setup is complete. |
| Fundraising | `fundraising_campaigns_demo` | Treat as demo/backburner until real campaign table is confirmed. |
| CMS Pages | `cms_pages`, `cms_page_sections`, `cms_page_content_blocks` | Confirm page editor/publish updates live public routes reliably. |
| CMS Images | `cms_assets`, R2 `WEBSITE_ASSETS`, Google Drive provider state | Strong lane. Continue polish, alt text, tagging, delete safety. |
| Brand | `cms_brand_settings`, `cms_themes`, `cms_navigation_items` | Make source of truth for public identity/header/footer/theme tokens. |
| Google Drive | `social_provider_connections`, `integration_oauth_states`, `cms_assets`, R2 | Appears connected. Verify import and token refresh behavior. |
| Social/Facebook | `social_provider_connections`, `social_embed_settings`, `social_post_drafts_v2` | Embed is low-risk; publishing remains explicit-approval-only. |
| Email | Planned `/api/email/inbound` | Build Resend inbound webhook, storage, inbox list/detail/reply. |
| AI Usage | `agentsam_usage_events`, `agentsam_usage_rollups_daily`, Agent Sam run/session tables | Reports must show real usage/cost only. |

## Emoji Cleanup Targets

These are current UI files with emoji-like icons or symbols that should be replaced with plain UI icons, CSS badges, or text labels.

| File | Area | Notes |
|---|---|---|
| `public/dashboard/js/view-ops.jsx` | Intakes, Daily Care, Medical, Volunteers | Major cleanup target. Contains emoji StatCard icons and task icons. Daily Care specifically needs emoji removal and backend connection validation. |
| `public/dashboard/js/view-finance.jsx` | Fundraising, Donations | Major cleanup target. Contains finance/donor/campaign emoji icons and date/category inline emoji. Fundraising is backburner until Stripe/customer setup is done. |
| `public/dashboard/js/view-animals.jsx` | Animals/adoptions | Contains grid/list symbols and adoption stat emoji icons. |
| `public/dashboard/js/view-applications.jsx` | Applications | Contains stat emoji icons. |
| `public/dashboard/js/view-admin.jsx` | Settings/Notifications | Contains integration and notification emoji icons. Settings needs rebuild anyway. |
| `public/dashboard/js/view-cms.jsx` | CMS Images | Contains a checkmark glyph in a UI badge. Not urgent, but include in no-emoji sweep. |

## High-Priority Next Alignment Tasks

1. Active reports route uses `public/dashboard/js/view-reports.jsx`. Stale `ReportsView` remains in `public/dashboard/js/view-admin.jsx`; avoid editing the stale one unless removing/refactoring.
2. Add or verify `/api/dashboard/volunteers` because `view-reports.jsx` fetches it while `dashboard_api.js` visibly has `/api/dashboard/team`.
3. Decide whether `applications` or `cpas_foster_applications` is the source of truth for adoption/foster/application screens.
4. Replace `fundraising_campaigns_demo` usage or clearly hide/label it until real campaign/payment data exists.
5. Remove emoji icons from `view-ops.jsx` and `view-finance.jsx` first.
6. Confirm Daily Care and Medical should be active v1 features; if yes, connect them to typed backend records and reliable CRUD.
7. Make `/dashboard/cms/brand` the organization source of truth before public page remastering.
8. Remaster public pages one at a time through `/dashboard/cms/pages/:pageId`; each revised section should be eligible to become a reusable template.
9. After any public/CMS/brand change: sync R2 dashboard/public assets as needed, deploy Worker if code changed, and bust relevant KV keys.

## Deployment / Cache Reminder

For dashboard JS/CSS changes, deploy from `/Users/samprimeaux/companionscpas` only.

Typical code path:

```bash
npm run sync
npm run deploy
```

For public page or brand changes, publish through CMS and bust relevant KV keys as needed. Do not deploy or bust cache from a parallel clone.
