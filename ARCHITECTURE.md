# Companions of CPAS — Architecture Reference

> **Canonical reference for AI agents, developers, and future sprints.**
> When in doubt about how this app is wired, read this first.

---

## Stack Overview

| Layer | Technology | Purpose |
|---|---|---|
| Runtime | Cloudflare Workers (`src/index.js`) | All backend logic, API, page rendering |
| Database | D1 SQLite (`companionscpas`) | Content, animal data, users, CMS, sessions |
| Object Storage | R2 (`companionscpas`) | Published HTML pages, dashboard JS, media assets |
| Cache | KV (`companionscpas-cache`) | Fast page cache, busted on every publish |
| AI | Workers AI (`AGENTSAM_WAI`) | Agent Sam integration |
| CDN | `assets.companionsofcaddo.org` | Public R2 asset delivery (CNAME to R2 public URL) |
| Dashboard | React (no build step, raw JSX via Babel CDN) | Admin UI served from R2 `dashboard/` |
| Deploy | `wrangler deploy` from `/Users/samprimeaux/companionscpas` | Single command deploys Worker + bindings |

---

## Cloudflare Bindings

Defined in `wrangler.toml`. **Never hardcode these — always use `env.BINDING_NAME` in Worker code.**

| Binding Name | Type | Value | Purpose |
|---|---|---|---|
| `DB` | D1 Database | `companionscpas` (id: `fd6dd6fb-156b-4b6a-8ff0-505422652391`) | All app data |
| `WEBSITE_ASSETS` | R2 Bucket | `companionscpas` | Pages, dashboard, media |
| `CMS_CACHE` | KV Namespace | `companionscpas-cache` (id: `0b410337a8494fc982ea04c5bde1eab4`) | Page HTML cache |
| `AGENTSAM_WAI` | Workers AI | — | AI inference |

### Worker Secrets (set via `wrangler secret put`, never in wrangler.toml)

| Secret | Purpose |
|---|---|
| `GOOGLE_CLIENT_ID` | Google OAuth (login + Drive) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `RESEND_API_KEY` | Transactional email |
| `STRIPE_SECRET_KEY` | Stripe payments |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook verification |
| `DRIVE_ENCRYPT_KEY` | AES-GCM key for encrypting Drive OAuth tokens in D1 |
| `JWT_SECRET` | Session signing |
| `ADMIN_PASSWORD_HASH` | Fallback admin login |

### Plaintext Vars (in `wrangler.toml [vars]`)

| Var | Value |
|---|---|
| `APP_NAME` | `Companions of CPAS` |
| `APP_DOMAIN` | `companionsofcaddo.org` |
| `ALLOWED_ORIGINS` | `https://companionsofcaddo.org` |
| `ADMIN_EMAIL` | `ljmusland@gmail.com` |
| `RESEND_FROM_EMAIL` | `Companions of CPAS <no-reply@companionsofcaddo.org>` |
| `META_REDIRECT_URI` | `https://companionsofcaddo.org/api/social/oauth/meta/callback` |

**Note:** `GOOGLE_REDIRECT_URI` in wrangler.toml is dead — all Google OAuth redirect URIs are now built dynamically from `url.origin` in the Worker. Do not add new static redirect URI vars for Google flows.

---

## R2 Bucket Structure (`companionscpas`)

**Public access is ENABLED** on this bucket. CDN: `https://assets.companionsofcaddo.org/`

```
companionscpas/                          ← R2 bucket root
│
├── static/                              ← All static site assets
│   ├── pages/                           ← CMS-published public page HTML (SSOT for public site)
│   │   ├── index.html                   ← Homepage (route: /)
│   │   ├── about/index.html             ← /about
│   │   ├── adopt/index.html             ← /adopt
│   │   ├── community/index.html         ← /community
│   │   ├── donate/index.html            ← /donate
│   │   ├── services/index.html          ← /services
│   │   │
│   │   ├── [section partials]           ← Written by renderPage() alongside full pages
│   │   │   ├── hero_main.html
│   │   │   ├── mission.html
│   │   │   ├── campaigns.html
│   │   │   ├── foster_grid.html
│   │   │   ├── crisis_care.html
│   │   │   ├── testimonial.html
│   │   │   └── org_info.html
│   │   └── ...
│   │
│   └── global/                          ← Shared static files (CSS, fonts, logos)
│       ├── cpas-shell.css               ← Main public site stylesheet
│       ├── logo-dark.webp
│       ├── companionsofcpa-newlogo.webp
│       └── companionsofcpa-newlogo-512x512.png
│
├── media/                               ← All uploaded media assets
│   ├── animals/                         ← Animal photos (served at assets.companionsofcaddo.org/media/animals/*)
│   │   ├── 2cutepups.webp
│   │   ├── bigsmiles.webp
│   │   ├── upclose.webp
│   │   ├── goinhomejustadopted.webp
│   │   └── [17+ animal images]
│   │
│   └── team/                            ← Team/founder photos
│       ├── thefounders.webp
│       └── theteam.webp
│
├── dashboard/                           ← Admin dashboard SPA (served at companionsofcaddo.org/dashboard)
│   ├── index.html                       ← Dashboard shell HTML (imports JS files below)
│   └── js/                              ← All dashboard React JSX files (raw, no build)
│       ├── app.jsx                      ← Router + layout shell
│       ├── ui.jsx                       ← Shared components (topbar, sidebar, StatCard, Input, Modal)
│       ├── config.js                    ← Color tokens (C), theme constants
│       ├── data.js                      ← Shared data helpers
│       ├── agentsam.jsx                 ← Agent Sam drawer + chat
│       ├── view-overview.jsx            ← /dashboard/overview
│       ├── view-animals.jsx             ← /dashboard/animals, /dashboard/fosters, /dashboard/adoptions
│       ├── view-ops.jsx                 ← /dashboard/intakes, /dashboard/medical, /dashboard/daily-care, /dashboard/volunteers
│       ├── view-finance.jsx             ← /dashboard/donations, /dashboard/fundraising
│       ├── view-applications.jsx        ← /dashboard/applications
│       ├── view-reports.jsx             ← /dashboard/reports (6 sub-tabs)
│       ├── view-admin.jsx               ← /dashboard/settings, /dashboard/notifications
│       └── view-cms.jsx                 ← All /dashboard/cms/* views
│
└── admin/                               ← Legacy admin files (mostly superseded by dashboard)
```

### R2 Key Rules
- **Never reference R2 paths as `companionsofcaddo.org/animals/...`** — that's a Worker route, not R2. All R2 media is served via `assets.companionsofcaddo.org/media/...`
- **Published pages live at `static/pages/{route}/index.html`** — homepage is `static/pages/index.html`
- **Dashboard JS deploys via `sync:js` script** — always pushes `index.html` too (fixed in sync-r2.sh)
- **After any CSS change**, push `static/global/cpas-shell.css` directly to R2 and bust KV

---

## KV Cache (`CMS_CACHE`)

| Key Pattern | Contents | Busted when |
|---|---|---|
| `page:/` | Rendered HTML for homepage | `POST /api/cms/publish` with `route_path: "/"` |
| `page:/about` | Rendered HTML for /about | publish for that route |
| `page:/adopt` | etc. | publish |
| `page:/community` | etc. | publish |
| `page:/donate` | etc. | publish |
| `page:/services` | etc. | publish |
| `bootstrap:tenant_companionscpas` | CMS bootstrap JSON | any section/page save |
| `sections:tenant_companionscpas:/` | Section data JSON | section save for that route |

**KV bust command (manual):**
```bash
npx wrangler kv key delete --binding=CMS_CACHE "page:/" --remote
```

---

## D1 Database (`companionscpas`) — CMS Tables

These are the tables the CMS pipeline reads and writes. **This is the SSOT for all public page content.**

### Core CMS Tables (actively used)

| Table | Purpose | Key columns |
|---|---|---|
| `cms_pages` | One row per public page | `route_path` (e.g. `/about`), `slug` (e.g. `about`), `title`, `status`, `theme` (`dark`\|`light`), `is_homepage` |
| `cms_page_sections` | One row per section within a page | `page_route` (FK → cms_pages.route_path), `section_key`, `section_type`, `heading`, `subheading`, `eyebrow`, `body`, `image_url`, `cta_label`, `cta_href`, `cta_secondary_label`, `cta_secondary_href`, `sort_order`, `is_visible`, `config_json` |
| `cms_page_content_blocks` | Repeating items inside a section (cards, tiers, testimonials) | `page_route`, `section_key`, `block_key`, `block_type`, `title`, `body`, `image_url`, `action_label`, `action_value`, `sort_order`, `is_visible` |
| `cms_brand_settings` | Single row, global brand config | `brand_name`, `logo_light_url`, `logo_dark_url`, `navigation_json`, `footer_json`, `header_json`, `socials_json`, `organization_json`, `primary_color`, `config_json` |
| `cms_assets` | Media library index | `r2_key`, `public_url`, `filename`, `alt_text`, `source_provider`, `source_file_id` |
| `cms_publish_jobs` | Publish history log | `route_path`, `status`, `artifact_key`, `triggered_by` |
| `cms_publish_artifacts` | Per-publish rendered artifact record | links to publish job |

### CMS Tables That Exist But Are NOT Actively Used

| Table | Status | Notes |
|---|---|---|
| `cms_navigation_items` | Dead | Nav lives in `cms_brand_settings.navigation_json` |
| `cms_navigation_menus` | Dead | Same |
| `cms_themes` | Dead | Theme is a column on `cms_pages.theme` |
| `cms_revisions` | Future | No revision history wired yet |
| `cms_page_versions` | Future | `published_version_id`/`draft_version_id` on cms_pages point nowhere yet |
| `cms_section_schemas` | Future | Intended for Templates tab |
| `cms_editor_sessions` | Dead | Never written |
| `cms_editor_events` | Dead | Never written |

---

## D1 Database — App Data Tables (Animal Care, Users, etc.)

| Table | Purpose | Dashboard view |
|---|---|---|
| `animal_profiles` | All animals, tenant-scoped (`tenant_id = 'tenant_companionscpas'`) | Animals, Intakes, Overview |
| `animals` | Legacy/duplicate animal table — audit needed, `animal_profiles` is canonical | — |
| `care_tasks` | Daily care + medical tasks | Daily Care, Medical |
| `foster_records` | Active foster placements | Fosters |
| `applications` | Foster/adopt applications | Applications, Adoptions |
| `cpas_foster_applications` | CPAS-specific foster application form submissions | Applications |
| `cpas_application_forms/steps/fields` | Dynamic form builder for public application forms | — |
| `volunteer_records` | Volunteer roster | Volunteers |
| `donations` | Individual donation records | Donations, Reports |
| `donors` | Donor profiles | Donations |
| `donation_payments` | Stripe payment records | Donations |
| `donation_intents` | Stripe payment intents (pre-payment) | — |
| `fundraising_campaigns` | Campaigns | Fundraising |
| `organizations` | Org profile (settings) | Settings → Organization |
| `users` | Dashboard user accounts | Settings → Users |
| `sessions` | Auth sessions | — |
| `social_provider_connections` | Google Drive, YouTube, Meta OAuth tokens (AES-GCM encrypted) | Settings → Integrations |
| `integration_oauth_states` | CSRF state tokens for OAuth flows | — |

---

## CMS Publish Pipeline (end-to-end)

```
Editor (dashboard) → section/save → D1 cms_page_sections (SSOT)
                                         ↓
                    publish button → POST /api/cms/publish
                                         ↓
                              renderPage(route) reads:
                                - cms_pages (page meta, theme)
                                - cms_page_sections (sections, is_visible=1)
                                - cms_page_content_blocks (block items per section)
                                - cms_brand_settings (header, footer, nav, colors)
                                         ↓
                              renders full HTML string
                                         ↓
                              WEBSITE_ASSETS.put(static/pages{route}/index.html)
                                         ↓
                              CMS_CACHE.delete(page:{route})
                                         ↓
                              live at companionsofcaddo.org{route}  ✅
```

**Public request path:**
```
GET companionsofcaddo.org/about
  → Worker checks CMS_CACHE["page:/about"]
  → HIT: return cached HTML
  → MISS: Worker.fetch R2 static/pages/about/index.html → cache in KV → return
```

---

## Backend API Route Map

All routes in `src/index.js` dispatching to handlers in `src/api/`.

| Handler file | Routes |
|---|---|
| `dashboard_api.js` | `GET /api/dashboard/overview|animals|applications|intakes|medical|daily-care|fosters|adoptions|fundraising|volunteers|reports` |
| `cms_api.js` | `GET /api/cms/bootstrap|page|sections|assets|brand` — `POST /api/cms/section/save|block/save|page/save|publish|asset/upload|asset/save|brand/save|brand/config|section/delete` |
| `drive_api.js` | `GET /api/integrations/google-drive/status|connect|files|test` — `POST /api/integrations/google-drive/import|disconnect` |
| `auth_google.js` | `GET /api/auth/google/login|callback|debug` |
| `auth_login.js` | `POST /api/auth/login|logout` |
| `social.js` | `GET /api/social/oauth/google/callback|youtube/callback` |
| `foster_api.js` | Foster-specific endpoints |
| `agentsam_api.js` | `POST /api/agentsam/chat` — `GET /api/agentsam/runs` |
| `render_page.js` | Public page rendering (called internally by publish, not directly routed) |

---

## Dashboard Route → View → File Map

| URL | View component | File |
|---|---|---|
| `/dashboard/overview` | `OverviewView` | `view-overview.jsx` |
| `/dashboard/animals` | `AnimalsView` | `view-animals.jsx` |
| `/dashboard/animals/{id}` | `AnimalProfileView` | `view-animals.jsx` |
| `/dashboard/intakes` | `IntakesView` | `view-ops.jsx` |
| `/dashboard/medical` | `MedicalView` | `view-ops.jsx` |
| `/dashboard/daily-care` | `DailyCareView` | `view-ops.jsx` |
| `/dashboard/volunteers` | `VolunteersView` | `view-ops.jsx` |
| `/dashboard/fosters` | `FostersView` | `view-animals.jsx` |
| `/dashboard/adoptions` | `AdoptionsView` | `view-animals.jsx` |
| `/dashboard/applications` | `ApplicationsView` | `view-applications.jsx` |
| `/dashboard/applications/{id}` | `ApplicationDetailView` | `view-applications.jsx` |
| `/dashboard/donations` | `DonationsView` | `view-finance.jsx` |
| `/dashboard/fundraising` | `FundraisingView` | `view-finance.jsx` |
| `/dashboard/reports` | `ReportsView` | `view-reports.jsx` |
| `/dashboard/settings` | `SettingsView` | `view-admin.jsx` |
| `/dashboard/notifications` | `NotificationsView` | `view-admin.jsx` |
| `/dashboard/cms/website` | `CmsWebsiteView` | `view-cms.jsx` |
| `/dashboard/cms/pages` | `CmsPagesView` | `view-cms.jsx` |
| `/dashboard/cms/pages/{slug}` | `CmsPageEditorView` | `view-cms.jsx` |
| `/dashboard/cms/images` | `CmsImagesView` | `view-cms.jsx` |
| `/dashboard/cms/brand` | `CmsBrandView` | `view-cms.jsx` |
| `/dashboard/cms/templates` | `CmsTemplatesView` | `view-cms.jsx` |

---

## Public Pages → D1 Mapping

| URL | `cms_pages.slug` | `cms_pages.theme` | Sections in `cms_page_sections` |
|---|---|---|---|
| `/` | `home` | `dark` | `home_hero`, `home_mission`, `home_impact`, `home_animal_grid`, `home_foster_cta`, `home_donate_cta`, `home_testimonial` |
| `/about` | `about` | `light` | `about_hero`, `about_mission`, `about_team`, `about_stats`, `about_cta` |
| `/adopt` | `adopt` | `dark` | `adopt_hero`, `adopt_grid`, `adopt_process`, `adopt_cta` |
| `/services` | `services` | `light` | `services_hero`, `service_cards`, `services_cta` |
| `/donate` | `donate` | `dark` | `donate_hero`, `donate_intro`, `donate_tiers`, `donate_cta` |
| `/community` | `community` | `dark` | `community_hero`, `community_connect`, `community_volunteer`, `community_testimonial`, `community_cta` |
| `global` | — | — | `header` (nav), `footer` |

---

## Deploy Commands

```bash
# Full deploy (Worker + all bindings)
cd /Users/samprimeaux/companionscpas && wrangler deploy

# Sync dashboard JS to R2 (also pushes index.html)
npm run sync:js

# Push a single CSS file to R2
npx wrangler r2 object put companionscpas/static/global/cpas-shell.css \
  --file=public/static/global/cpas-shell.css \
  --content-type=text/css --remote

# Bust KV cache for a page
npx wrangler kv key delete --binding=CMS_CACHE "page:/" --remote
npx wrangler kv key delete --binding=CMS_CACHE "page:/about" --remote
# etc.

# Run a D1 query (remote)
npx wrangler d1 execute companionscpas --remote --command "SELECT ..."
```

---

## Rules for AI Agents Working on This Project

1. **Never clone the repo.** Use `agentsam_terminal_local` to run commands on the actual repo at `/Users/samprimeaux/companionscpas`. The PTY runs on Sam's iMac.
2. **Always read before editing.** Use `agentsam_github_read` or terminal `cat`/`sed` to read the exact current file content before writing.
3. **Never hardcode tenant IDs, binding names, or IDs.** The tenant is always `tenant_companionscpas`. Binding names are `DB`, `WEBSITE_ASSETS`, `CMS_CACHE`.
4. **D1 is the SSOT for all content.** Never edit R2 HTML directly to change page content — edit D1 via the CMS API or wrangler, then publish.
5. **R2 HTML is a build artifact.** It is always regenerated by `renderPage()` on publish. Manual R2 HTML edits will be overwritten.
6. **Two repos, never mixed:**
   - CPAS site: `/Users/samprimeaux/companionscpas` → deploy: `wrangler deploy`
   - IAM platform: `/Users/samprimeaux/inneranimalmedia` → deploy: `npm run deploy:full`
7. **Every change must be committed and pushed to `main`** before deploying.
8. **KV cache must be busted after any publish** or the live site serves stale HTML.
9. **`cms_page_sections.image_url` must always be a full `https://assets.companionsofcaddo.org/...` URL**, never a relative path like `/animals/...`.
10. **D1 queries for CPAS data must always include `WHERE tenant_id = 'tenant_companionscpas'`** — this is a shared multi-tenant D1 database.

---

## For ChatGPT: How to Query This Project's D1

This project does NOT use the IAM platform's MCP D1 helper (`agentsam_d1_query`) — that tool is scoped to the IAM platform workspace, not CPAS. To query the CPAS D1 database, use the terminal tool to run wrangler from the CPAS repo:

```bash
# Always run from the CPAS repo directory
cd /Users/samprimeaux/companionscpas

# Read-only query
npx wrangler d1 execute companionscpas --remote --command "SELECT * FROM cms_pages"

# Schema inspection
npx wrangler d1 execute companionscpas --remote --command "PRAGMA table_info(cms_page_sections)"

# Write (use with care)
npx wrangler d1 execute companionscpas --remote --command "UPDATE cms_page_sections SET image_url = '...' WHERE section_key = '...'"
```

The D1 database ID is `fd6dd6fb-156b-4b6a-8ff0-505422652391`. The binding name in the Worker is `DB`. The tenant ID for all CPAS data is `tenant_companionscpas`.
