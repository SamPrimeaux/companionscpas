# Companions of CPAS — Live Source File Map

Version: v2  
Last aligned: 2026-06-19  
Production repo: `/Users/samprimeaux/companionscpas`

Canonical companion to README [Source File Map](../README.md#source-file-map). Use this for dashboard route ownership, API lanes, and table source-of-truth decisions.

---

## Work rules

- Production edits, `npm run deploy`, `npm run deploy:full`, R2 sync, and KV busts run from this repo only.
- Commit to `main`; do not stage unrelated local work.
- No emojis in UI copy, labels, comments, README, or dashboard icon props.
- `data.js` still seeds mock fallbacks — see [Mock vs live](#mock-vs-live-dashboard-views) before trusting Overview / Reports subs.

---

## Dashboard shell

| Concern | File | Notes |
|---|---|---|
| HTML shell | `public/dashboard/index.html` | Loads JSX via Babel CDN; cache-bust query on script tags after deploy. |
| Router | `public/dashboard/js/app.jsx` | `ROUTE_REGISTRY`, legacy `?view=` redirects, session gate, mobile nav, view switch. |
| Shared UI | `public/dashboard/js/ui.jsx` | Sidebar, PageHeader, cards, Modal, Table, mobile drawer. |
| Config | `public/dashboard/js/config.js` | `GET /api/dashboard/config` |
| Data bootstrap | `public/dashboard/js/data.js` | `GET /api/dashboard/overview` + `/api/dashboard/team`; hydrates `window.CPAS` (mock fallback on failure). |
| Agent Sam chat | `public/dashboard/js/agentsam.jsx` | Chat UI, `POST /api/agentsam/chat`, uploads, Drive hooks. |

---

## Dashboard route ownership (live)

| Route | View key | Component | Frontend | API | D1 / storage | Status (Jun 2026) |
|---|---|---|---|---|---|---|
| `/dashboard/overview` | `overview` | `OverviewView` | `view-overview.jsx` | `/api/dashboard/overview` | `animal_profiles`, `cpas_foster_applications`, `donations`, `volunteer_records` | **Mixed** — animal count from API; deltas/sparklines/care bars still mock |
| `/dashboard/animals` | `animals` | `AnimalsView` | `view-animals.jsx` | `GET/POST /api/dashboard/animals` | `animal_profiles`, `cms_assets` | **Live** |
| `/dashboard/animals/:id` | `animal-profile` | `AnimalProfileView` | `view-animals.jsx` | `/api/dashboard/animals/:id`, notes, care-tasks, attachments, publish, applications | `animal_profiles`, `foster_records`, `animal_notes`, `care_tasks`, `scheduled_posts` | **Live** — foster assign/end in Care & Medical |
| `/dashboard/intakes` | `intakes` | `IntakesView` | `view-ops.jsx` | `/api/dashboard/intakes` | `cms_assets` (intake PDFs), `animal_profiles` | **Live** |
| `/dashboard/medical` | `medical` | `MedicalView` | `view-ops.jsx` | `/api/dashboard/medical` | `cms_assets` (medical PDFs), `animal_profiles` | **Live** |
| `/dashboard/daily-care` | `daily-care` | `DailyCareView` | `view-ops.jsx` | `/api/dashboard/daily-care` (exists, unused by UI) | `care_tasks` | **Stub** — UI uses `CPAS.dailyCare` mock only |
| `/dashboard/fosters` | `fosters` | `FostersView` | `view-animals.jsx` | `GET /api/dashboard/fosters?status=active` | `foster_records`, `animal_profiles` | **Live** — active placements only |
| `/dashboard/adoptions` | `adoptions` | `AdoptionsView` | `view-animals.jsx` | `/api/dashboard/adoptions` | `cpas_foster_applications` (`review_status=approved`) | **Live** — label is misleading (approved foster apps, not adoption records) |
| `/dashboard/applications` | `applications` | `ApplicationsView` | `view-applications.jsx` | `GET /api/dashboard/applications` | `cpas_foster_applications` | **Live** — demo `applications` table cleared |
| `/dashboard/applications/:id` | `application-detail` | `ApplicationDetailView` | `view-applications.jsx` | `GET/PATCH /api/dashboard/applications/:id` | `cpas_foster_applications` | **Live** |
| `/dashboard/volunteers` | `volunteers` | `VolunteersView` | `view-ops.jsx` | `GET/POST /api/dashboard/volunteers` | `volunteer_records` | **Live** — Add Volunteer modal wired |
| `/dashboard/donations` | `donations` | `DonationsView` | `view-finance.jsx` | `/api/dashboard/donations` | `donations`, `donors` | **Live** (Stripe test mode) |
| `/dashboard/fundraising` | `fundraising` | `FundraisingView` | `view-finance.jsx` | `/api/dashboard/fundraising` | `fundraising_campaigns` | **Live** — uses real table, not `fundraising_campaigns_demo` |
| `/dashboard/fundraising/:id` | `campaign-detail` | `CampaignWorkspaceView` | `view-campaign.jsx` | `/api/dashboard/fundraising` | `fundraising_campaigns` | **Live** |
| `/dashboard/cms/website` | `cms-website` | `CmsWebsiteView` | `view-cms.jsx` | `/api/cms/bootstrap`, `/api/cms/publish` | `cms_pages`, R2, KV | **Live** — status from D1 |
| `/dashboard/cms/pages` | `cms-pages` | `CmsPagesView` | `view-cms.jsx` | `/api/cms/bootstrap`, `/api/dashboard/cms`, `/api/cms/sections` | `cms_pages`, sections | **Live** — status from D1 |
| `/dashboard/cms/pages/:pageId` | `cms-page-editor` | `CmsPageEditorView` | `view-cms.jsx` | `/api/cms/page`, section/block save, publish | `cms_page_sections`, `cms_page_content_blocks` | **Live** |
| `/dashboard/cms/images` | `cms-images` | `CmsImagesView` | `view-cms.jsx` | `/api/cms/assets`, Drive import | `cms_assets`, R2 | **Live** — Drive scope `drive.readonly` |
| `/dashboard/cms/brand` | `cms-brand` | `CmsBrandView` | `view-cms.jsx` | `/api/cms/brand` | `cms_brand_settings`, `cms_themes` | **Live** — polish backlog |
| `/dashboard/cms/templates` | `cms-templates` | `CmsTemplatesView` | `view-cms.jsx` | Section type catalog (UI) | — | **Reference UI** |
| `/dashboard/reports` | `reports` | `ReportsView` | `view-reports.jsx` | Multiple + `/api/agentsam/runs` | Mixed | **Partial** — see Reports alignment |
| `/dashboard/settings` | `settings` | `SettingsView` | `view-admin.jsx` | `/api/dashboard/config` | brand, integrations | **Shell** |
| `/dashboard/notifications` | `email` | `EmailWorkspaceView` | `view-email.jsx` | Redirect to email notifications view | `dashboard_notifications` | **Live** (legacy URL) |
| `/dashboard/email` | `email` | `EmailWorkspaceView` | `view-email.jsx` | `/api/email/*`, Gmail OAuth | `inbound_emails`, Gmail scope | **Live** |

---

## Reports alignment

Active file: `public/dashboard/js/view-reports.jsx` only. Do not edit the stale `ReportsView` stub in `view-admin.jsx`.

| Tab | Fetches | Known issue (Jun 2026) |
|---|---|---|
| Animals | `/api/dashboard/animals` | Hardcoded seed stats used for charts (lines ~136–142) — not fully driven by API response |
| Financial | `/api/dashboard/reports/financial` | **Live** when tab opened |
| Applications | `/api/dashboard/applications` | Hardcoded seed pipeline (~143–150) overrides empty real data display |
| Volunteers | `/api/dashboard/volunteers` | Hardcoded `vols` object (~167–174) — ignores API response |
| Medical | — | Placeholder / thin |
| AI Usage | `/api/agentsam/runs` fetched but **not used** | Hardcoded `ai` object (~175–183) with placeholder model names (`gpt-5.4-mini`, etc.) — **fix in Agent Sam refresh sprint** ([`AGENTSAM_CPAS_ROADMAP.md`](AGENTSAM_CPAS_ROADMAP.md)) |

---

## Mock vs live dashboard views

| View | Behavior |
|---|---|
| `data.js` | Loads mock on init; partial API hydration. Applications always replaced from API. |
| `view-overview.jsx` | Reads `CPAS.stats` — mock deltas/sparklines unless extended |
| `view-ops.jsx` Daily Care | `CPAS.dailyCare` only |
| `view-admin.jsx` Notifications | `CPAS.notifications` mock |
| `view-reports.jsx` | Fetches APIs then falls back to inline seed objects for several tabs |

---

## Backend API map (active)

| File | Responsibility |
|---|---|
| `src/index.js` | Worker entry, auth gate, public page serve, API dispatch, cron rollups |
| `src/api/dashboard_api.js` | Overview, animals CRUD, fosters POST/PATCH, volunteers GET/POST, applications, fundraising, donations, intakes, medical, reports/financial |
| `src/api/dashboard_config_api.js` | Dashboard config snapshot |
| `src/api/cms_api.js` | CMS bootstrap, page/section/block save, publish, assets, brand |
| `src/api/page_cms_registry.js` | Fragment route registry (6 public pages) |
| `src/api/page_shell.js` | Public script tags + cache-bust versions |
| `src/api/home_cms_sync.js` | Home D1 → R2 fragments |
| `src/api/about_cms_sync.js` | About D1 → R2 fragments |
| `src/api/generic_page_cms_sync.js` | Services/adopt/donate/community sync |
| `src/api/render_home_section.js` | Home section HTML |
| `src/api/render_about_section.js` | About section HTML |
| `src/api/render_section.js` | Generic section renderers + CTA resolver |
| `src/api/render_home_fragments.js` | Assemble `/` |
| `src/api/render_about_fragments.js` | Assemble `/about` |
| `src/api/render_generic_fragments.js` | Assemble generic routes |
| `src/api/render_donate_v2.js` | Donate hero dynamic assembly |
| `src/api/render_shelter_hub.js` | Adopt shelter hub section |
| `src/api/render_campaign_transport_hero.js` | Campaign/transport hero blocks |
| `src/api/render_page.js` | `assembleFullPage()`, legacy `renderPage()` fallback |
| `src/api/render_site_nav.js` | Header/footer/nav injection |
| `src/api/foster_api.js` | Public `POST /api/foster/apply` |
| `src/api/donation_api.js` | Legacy adopt `create-intent` |
| `src/api/donation_fees.js` | Cover-fees math |
| `src/api/payments_email.js` | Stripe config/intent/webhook, receipts |
| `src/api/email_api.js` | Inbound email, drafts, Gmail sync hooks |
| `src/api/gmail_api.js` | Gmail OAuth connect/disconnect |
| `src/api/gmail_scope.js` | Per-user Gmail mailbox isolation |
| `src/api/drive_api.js` | Google Drive OAuth, import to R2 |
| `src/api/social.js` | Lane A embed + Lane B stubs (501 until client approval) |
| `src/api/contact_api.js` | Public contact form |
| `src/api/notifications.js` | Dashboard notification writes |
| `src/api/agentsam_api.js` | Agent Sam chat, runs, sessions — Phase 2 UI plan: [`AGENTSAM_CPAS_ROADMAP.md`](AGENTSAM_CPAS_ROADMAP.md) |
| `src/api/agentsam_tools.js` | DB-driven tool dispatch |
| `src/api/resolveModel.js` | Model routing, usage rollups |
| `src/api/auth_login.js` | Password login |
| `src/api/auth_google.js` | Google login OAuth |
| `src/api/session_api.js` | Session cookies, `getAuthUser` |
| `src/api/password_reset.js` | Reset flow |
| `src/api/members_api.js` | Team member admin (settings lane) |
| `src/api/public_api.js` | Public animal listing helpers |

**Removed (2026-06-19 cleanup):** `cms_api_additions.js`, `render_home.js`, `_shell.js` — do not recreate.

---

## D1 source-of-truth (use vs ignore)

Full table guidance (canonical, dropped, defer): [`HANDOFF.md`](HANDOFF.md). Per-feature vectorization docs: [`features/README.md`](features/README.md).

| Use in production UI | Dropped / defer |
|---|---|
| `animal_profiles` | `applications` — **dropped** from live D1 |
| `cpas_foster_applications` | `adoption_applications_demo` — never on live D1 |
| `foster_records` | — |
| `volunteer_records` | — |
| `fundraising_campaigns` | `fundraising_campaigns_demo` — never on live D1 |
| `donations`, `donors` | — |
| `cms_pages`, `cms_page_sections`, `cms_page_content_blocks`, `cms_assets` | `cms_navigation_items`, `cms_themes` — defer until code stops SELECT |
| `agentsam_tools`, `agentsam_workflows` | `agentsam_mcp_*` — **dropped** from live D1 |

---

## Foster placement API (handoff sprint)

| Method | Path | Body / behavior |
|---|---|---|
| `GET` | `/api/dashboard/fosters?status=active` | JOIN `foster_records` + `animal_profiles`; default active |
| `POST` | `/api/dashboard/fosters` | `{ animal_id, foster_name, foster_email?, foster_phone?, start_date?, application_id? }` — sets animal `status=foster` |
| `PATCH` | `/api/dashboard/fosters/:id` | `{ end_date?, notes? }` — ends placement; sets animal `status=available` |

UI: `AnimalProfileView` → Notes & Care → Foster Placement panel; Applications tab → Assign as Foster shortcut.

---

## Ops scripts (keep)

| Script | Purpose |
|---|---|
| `scripts/sync-r2.sh` | `npm run sync` — dashboard + public assets to R2 |
| `scripts/sync-page-fragments.mjs` | D1 → R2 for generic CMS routes |
| `scripts/republish-shell-pages.mjs` | Rebuild home/about + bust KV |
| `scripts/audit_public_images.py` | Public image link audit (handoff validation) |
| `scripts/cache-bust.sh` | KV bust helper |
| `scripts/live_url_file_map.py` | Regenerate `docs/live-url-file-map.json` |

---

## Deployment reminder

```bash
npm run deploy:full    # sync R2 + deploy Worker
# Bust page KV after CMS publish:
npx wrangler kv key delete "page:/donate" --namespace-id=0b410337a8494fc982ea04c5bde1eab4 --remote
```
