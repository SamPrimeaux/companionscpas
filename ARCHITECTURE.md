# Companions of CPAS — Architecture Reference

> **Canonical reference for AI agents, developers, and future sprints.**
> Read this before writing any code or querying any database on this project.
> Last verified: 2026-06-11 against live remote D1.

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

**Dead var:** `GOOGLE_REDIRECT_URI` in wrangler.toml is unused — all Google OAuth redirect URIs are built dynamically from `url.origin`. Do not add new static redirect URI vars for Google flows.

---

## R2 Bucket Structure (`companionscpas`)

**Public access ENABLED.** CDN root: `https://assets.companionsofcaddo.org/`

```
companionscpas/
├── static/
│   ├── pages/                    ← CMS-published HTML (build artifacts, never hand-edit)
│   │   ├── index.html            ← Homepage /
│   │   ├── about/index.html      ← /about
│   │   ├── adopt/index.html      ← /adopt
│   │   ├── community/index.html  ← /community
│   │   ├── donate/index.html     ← /donate
│   │   ├── services/index.html   ← /services
│   │   └── [section partials]    ← hero_main.html, mission.html, campaigns.html, etc.
│   └── global/
│       ├── cpas-shell.css        ← Main public site stylesheet
│       ├── logo-dark.webp
│       ├── companionsofcpa-newlogo.webp
│       └── companionsofcpa-newlogo-512x512.png
├── media/
│   ├── animals/                  ← All animal photos (17+ .webp files)
│   │   └── [2cutepups, bigsmiles, upclose, goinhomejustadopted, etc.]
│   └── team/
│       ├── thefounders.webp
│       └── theteam.webp
├── dashboard/
│   ├── index.html                ← Dashboard SPA shell
│   └── js/                       ← All dashboard JSX files (no build step)
│       └── [app, ui, config, data, agentsam, view-*.jsx]
└── admin/                        ← Legacy, mostly superseded
```

### R2 Rules
- Media is **always** `https://assets.companionsofcaddo.org/media/...` — never `companionsofcaddo.org/animals/...`
- Page HTML under `static/pages/` is a **build artifact** regenerated on every publish — never edit directly
- `sync:js` script deploys dashboard JS **and** `index.html` (both)
- After any CSS change: push `static/global/cpas-shell.css` to R2 + bust KV

---

## KV Cache (`CMS_CACHE`)

| Key | Contents | Busted when |
|---|---|---|
| `page:/` | Homepage HTML | publish `/` |
| `page:/about` | /about HTML | publish `/about` |
| `page:/adopt` | /adopt HTML | publish `/adopt` |
| `page:/community` | /community HTML | publish `/community` |
| `page:/donate` | /donate HTML | publish `/donate` |
| `page:/services` | /services HTML | publish `/services` |
| `bootstrap:tenant_companionscpas` | CMS bootstrap JSON | any section/page save |
| `sections:tenant_companionscpas:/{route}` | Section data JSON | section save for that route |

```bash
# Manual KV bust
npx wrangler kv key delete --binding=CMS_CACHE "page:/" --remote
```

---

## CMS Publish Pipeline (end-to-end)

```
Dashboard editor
  → POST /api/cms/section/save
  → D1 cms_page_sections (SSOT for all content)

  → POST /api/cms/publish { route_path }
  → renderPage(route) reads:
      cms_pages            (page meta, theme)
      cms_page_sections    (sections where is_visible=1, ordered by sort_order)
      cms_page_content_blocks  (repeating block items per section)
      cms_brand_settings   (header, footer, nav, colors, logos)
  → renders full HTML string
  → WEBSITE_ASSETS.put("static/pages{route}/index.html")
  → CMS_CACHE.delete("page:{route}")
  → live at companionsofcaddo.org{route} ✅

Public request:
  GET companionsofcaddo.org/about
  → Worker checks CMS_CACHE["page:/about"]
  → HIT: return cached HTML instantly
  → MISS: fetch R2 static/pages/about/index.html → write KV → return
```

---

## D1 Table Contracts — Verified Against Live DB 2026-06-11

### CMS Tables (actively used by the publish pipeline)

| Table | Row count | Key columns | Status |
|---|---|---|---|
| `cms_pages` | 6 | `route_path`, `slug`, `title`, `status`, `theme`, `is_homepage`, `seo_title`, `meta_description` | ✅ SSOT for pages |
| `cms_page_sections` | 25+ | `page_route` (FK→route_path), `section_key`, `section_type`, `heading`, `subheading`, `eyebrow`, `body`, `image_url`, `cta_label`, `cta_href`, `cta_secondary_label`, `cta_secondary_href`, `sort_order`, `is_visible`, `config_json` | ✅ SSOT for section content |
| `cms_page_content_blocks` | 59 | `page_route`, `section_key`, `block_key`, `block_type`, `title`, `body`, `image_url`, `alt_text`, `action_label`, `action_type`, `action_value`, `sort_order`, `is_visible` | ⚠️ Seeded, render reads it, editor doesn't write to it yet |
| `cms_brand_settings` | 1 | `brand_name`, `logo_light_url`, `logo_dark_url`, `navigation_json`, `footer_json`, `header_json`, `socials_json`, `organization_json`, `primary_color`, `config_json` | ✅ Rich data populated |
| `cms_assets` | active | `r2_key`, `public_url`, `filename`, `alt_text`, `source_provider`, `source_file_id`, `imported_at` | ✅ Wired via /dashboard/cms/images |
| `cms_publish_jobs` | active | `route_path`, `status`, `artifact_key`, `triggered_by` | ✅ Written on every publish |
| `cms_publish_artifacts` | active | links to publish job | ✅ |

### CMS Tables — Future / Dead (do not query unless building that feature)

| Table | Verdict | Notes |
|---|---|---|
| `cms_navigation_items` | **Dead** | Nav lives in `cms_brand_settings.navigation_json` |
| `cms_navigation_menus` | **Dead** | Same |
| `cms_themes` | **Dead** | Theme is a column on `cms_pages.theme` |
| `cms_section_schemas` | Future | Templates tab |
| `cms_revisions` | Future | No revision history wired yet |
| `cms_page_versions` | Future | `published_version_id`/`draft_version_id` on cms_pages point nowhere |
| `cms_editor_sessions` | **Dead** | Never written |
| `cms_editor_events` | **Dead** | Never written |
| `cms_modals` | Unverified | Not referenced in current code |

---

### Animal Care Tables — Verified Schemas

#### `animal_profiles` — **CANONICAL. 17 rows. Use this, not `animals`.**
Columns: `id | tenant_id | name | species | breed | sex | age_label | status | location | intake_date | photo_url | bio | created_at | updated_at | animal_key | weight_label | energy_level | good_with_dogs | good_with_cats | good_with_kids | medical_notes | foster_needed | adoption_fee_cents | featured | sort_order | asset_id | public_visible | tags_json | metadata_json`

Always filter: `WHERE tenant_id = 'tenant_companionscpas'`

#### `animals` — **DEAD. 0 rows. Stub schema (id, name, breed, age, status, created_at). Drop or ignore.**

#### `care_tasks` — **0 rows currently. Schema uses `organization_id`, not `tenant_id`.**
Columns: `id | organization_id | animal_id | task_type | title | description | status | priority | due_at | completed_at | assigned_to_user_id | created_at | updated_at`

Note: filter by `organization_id = 'tenant_companionscpas'` for CPAS tasks. Backend `daily-care` and `medical` queries use this table — it's empty because no tasks have been created yet, not because it's broken.

#### `foster_records` — **5 rows. Rich schema.**
Columns: `id | tenant_id | animal_id | foster_name | foster_email | status | start_date | notes | created_at | foster_phone | application_id | end_date | expected_end_date | foster_type | placement_reason | home_visit_status | check_in_frequency | last_check_in_at | next_check_in_at | emergency_contact_name | emergency_contact_phone | supplies_needed_json | care_notes_json | updated_at`

---

### Applications — Source of Truth Decision (verified)

#### `applications` — **4 rows. LEGACY STUB. 6 columns only: id, applicant_name, applicant_email, animal_name, status, created_at.**
This is a thin placeholder. It does NOT have tenant_id, address, answers_json, review workflow, or any CPAS-specific fields. Do NOT build new features on this table.

#### `cpas_foster_applications` — **4 rows. CANONICAL. Full production schema.**
Columns: `id | form_id | tenant_id | status | review_status | source | first_name | last_name | email | phone | street_address | apartment_suite | city | state_province | postal_code | answers_json | resend_message_id | submitted_at | reviewed_at | approved_at | denied_at | assigned_to | internal_notes | ip_hash | user_agent | created_at | updated_at`

**All application work goes through `cpas_foster_applications`.** The `applications` view and its API should be migrated to query `cpas_foster_applications`.

---

### Users / Auth — Source of Truth Decision (verified)

#### `users` — **6 rows. CANONICAL for dashboard users.**
Columns: `id | email | full_name | display_name | avatar_url | status | created_at | updated_at | last_login_at`

#### `admin_users` — **5 rows. LEGACY. Has `password_hash` and `role` columns.**
This was the original auth table. It still powers `/admin/login` via `auth_login.js`. The migration path: `users` + `user_credentials` + `sessions` takes over fully, `admin_users` becomes read-only then dropped. For now, both exist and `/admin/login` uses `admin_users`.

#### Supporting auth tables (active):
- `user_credentials` — password/credential auth linked to `users`
- `sessions` — active dashboard sessions
- `password_reset_tokens` — reset flow
- `user_security_events` — login/security audit log
- `role_permissions` — role-based access
- `tenant_memberships` — user↔org membership
- `tenants` — tenant/org records
- `organizations` — org profile data (Settings → Organization)

---

### Donations / Fundraising

| Table | Rows | Status | Use for |
|---|---|---|---|
| `donations` | 0 | Empty, schema ready | /dashboard/donations, Reports → Financial |
| `donors` | 0 | Empty, schema ready | /dashboard/donations |
| `donation_payments` | active | Stripe payment records | Donations detail |
| `donation_intents` | active | Stripe payment intents | Pre-payment tracking |
| `donation_settings` | config | Donation config | Stripe setup |
| `stripe_webhooks` | log | Stripe webhook events | Debug/audit |
| `fundraising_campaigns` | **0 rows** | Empty, schema ready | /dashboard/fundraising — use this |
| `fundraising_campaigns_demo` | **3 rows** | **DEMO DATA — never drive production UI from this** | Discard or clearly label |
| `campaign_updates` | active | Campaign update posts | Fundraising detail |

---

### Volunteers

#### `volunteer_records` — **3 rows.**
Columns: `id | tenant_id | full_name | email | role | status | hours_month | created_at`

Backend has `/api/dashboard/team` querying this but frontend calls `/api/dashboard/volunteers`. Add the volunteers endpoint alias in `dashboard_api.js`.

---

### Social / Integrations

| Table | Purpose |
|---|---|
| `social_provider_connections` | Google Drive, YouTube, Meta OAuth tokens (AES-GCM encrypted) — /dashboard/settings Integrations |
| `integration_oauth_states` | CSRF state tokens for all OAuth flows |
| `oauth_accounts` | OAuth account records |
| `oauth_integrations` | OAuth provider config |
| `social_embed_settings` | Facebook Page embed config for /community |
| `social_post_drafts_v2` | Draft social posts |
| `scheduled_posts` | Scheduled content |
| `secret_vault_items` | Secret references — never expose in UI |
| `secret_vault_access_log` | Secret access audit |

---

### Agent Sam Tables (in this CPAS D1 — these are IAM platform tables shared here)

**Important:** `agentsam_tools` (34 rows) is the canonical MCP tool registry. `agentsam_mcp_tools` (25 rows) is a legacy/parallel table from before the refactor — `agentsam_tools` wins. GPT's suggestion that `agentsam_mcp_tools` is the current registry is **incorrect**.

`agentsam_tools` schema: `id | tenant_id | tool_key | tool_name | category | description | function_schema | is_enabled | requires_approval | allowed_roles | min_model_tier | usage_count | last_used_at | sort_order | created_at | updated_at`

`agentsam_mcp_tools` schema: `id | tenant_id | tool_key | tool_name | display_name | tool_category | description | input_schema | output_schema | intent_tags | modes_json | handler_type | handler_config | provider | requires_auth | requires_secret_keys | safety_level | is_enabled | sort_order | created_at | updated_at`

For `/dashboard/reports → AI Usage`: query `agentsam_usage_events` and `agentsam_usage_rollups_daily`.

Similarly: `agentsam_workflows` (17 rows) is the canonical workflow table. `agentsam_mcp_workflows` (33 rows) is a legacy/parallel structure — do not build new features on `agentsam_mcp_workflows`.

---

## Dashboard → API → D1 Contracts (sprint target)

| Dashboard route | API endpoint(s) | D1 table(s) | Current status |
|---|---|---|---|
| `/dashboard/overview` | `GET /api/dashboard/overview` | `animal_profiles`, `cpas_foster_applications`, `donations`, `volunteer_records` | ✅ wired |
| `/dashboard/animals` | `GET /api/dashboard/animals` | `animal_profiles` (tenant filter) | ✅ wired |
| `/dashboard/intakes` | `GET /api/dashboard/intakes` | `animal_profiles` (intake_date, status) | ⚠️ API exists, frontend not fetching |
| `/dashboard/medical` | `GET /api/dashboard/medical` | `care_tasks` (organization_id, type=medical) | ⚠️ 0 rows — empty, not broken |
| `/dashboard/daily-care` | `GET /api/dashboard/daily-care` | `care_tasks` (organization_id) | ⚠️ 0 rows — empty, not broken |
| `/dashboard/fosters` | `GET /api/dashboard/fosters` | `foster_records` | ⚠️ API exists, frontend stub |
| `/dashboard/adoptions` | `GET /api/dashboard/adoptions` | `cpas_foster_applications` (status=adopted) | ⚠️ stub |
| `/dashboard/applications` | `GET /api/dashboard/applications` | **`cpas_foster_applications`** (not `applications`) | ⚠️ currently queries wrong table |
| `/dashboard/volunteers` | `GET /api/dashboard/volunteers` | `volunteer_records` | ⚠️ endpoint missing (exists as `/api/dashboard/team`) |
| `/dashboard/donations` | `GET /api/dashboard/donations` | `donations`, `donors`, `donation_payments` | ⚠️ endpoint missing |
| `/dashboard/fundraising` | `GET /api/dashboard/fundraising` | `fundraising_campaigns` (NOT demo table) | ⚠️ backburner — Stripe setup pending |
| `/dashboard/reports` | multiple | animals, applications, donations, volunteers, `agentsam_usage_events` | ✅ fetches 5 endpoints, sub-tab render pending |
| `/dashboard/settings` | org/users/integrations | `organizations`, `users`, `social_provider_connections` | ⚠️ stub shell |
| `/dashboard/cms/*` | `/api/cms/*` | `cms_pages`, `cms_page_sections`, `cms_page_content_blocks`, `cms_brand_settings`, `cms_assets` | ✅ mostly wired — block editor UI pending |

---

## Backend API Route Map

| File | Routes |
|---|---|
| `dashboard_api.js` | `GET /api/dashboard/overview\|animals\|applications\|intakes\|medical\|daily-care\|fosters\|adoptions\|fundraising\|team\|reports` |
| `cms_api.js` | `GET /api/cms/bootstrap\|page\|sections\|assets\|brand` — `POST /api/cms/section/save\|block/save\|page/save\|publish\|asset/upload\|asset/save\|brand/save\|brand/config\|section/delete` |
| `drive_api.js` | `GET /api/integrations/google-drive/status\|connect\|files\|test` — `POST /api/integrations/google-drive/import\|disconnect` |
| `auth_google.js` | `GET /api/auth/google/login\|callback\|debug` |
| `auth_login.js` | `POST /api/auth/login\|logout` |
| `social.js` | `GET /api/social/oauth/google/callback\|youtube/callback` |
| `foster_api.js` | Foster-specific endpoints |
| `agentsam_api.js` | `POST /api/agentsam/chat` — `GET /api/agentsam/runs` |

---

## Dashboard Route → View → File Map

| URL | View | File |
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

| URL | slug | theme | section_keys in cms_page_sections |
|---|---|---|---|
| `/` | `home` | `dark` | `home_hero`, `home_mission`, `home_impact`, `home_animal_grid`, `home_foster_cta`, `home_donate_cta`, `home_testimonial` |
| `/about` | `about` | `light` | `about_hero`, `about_mission`, `about_team`, `about_stats`, `about_cta` |
| `/adopt` | `adopt` | `dark` | `adopt_hero`, `adopt_grid`, `adopt_process`, `adopt_cta` |
| `/services` | `services` | `light` | `services_hero`, `service_cards`, `services_cta` |
| `/donate` | `donate` | `dark` | `donate_hero`, `donate_intro`, `donate_tiers`, `donate_cta` |
| `/community` | `community` | `dark` | `community_hero`, `community_connect`, `community_stories`, `community_testimonial`, `community_cta` (+ hidden: `community_fb_posts`, `community_volunteer`) |
| `global` | — | — | `header` (nav type), `footer` |

---

## Deploy Commands

```bash
# Full Worker deploy
cd /Users/samprimeaux/companionscpas && wrangler deploy

# Sync dashboard JS + index.html to R2
npm run sync:js

# Push CSS to R2
npx wrangler r2 object put companionscpas/static/global/cpas-shell.css \
  --file=public/static/global/cpas-shell.css --content-type=text/css --remote

# Bust KV for a page
npx wrangler kv key delete --binding=CMS_CACHE "page:/" --remote

# Remote D1 query
npx wrangler d1 execute companionscpas --remote --command "SELECT ..."
```

---

## Rules for AI Agents

1. **Never clone the repo.** Run commands via `agentsam_terminal_local` on the actual repo at `/Users/samprimeaux/companionscpas`.
2. **Always read before editing.** Use `agentsam_github_read` or terminal `cat`/`sed` before any write.
3. **Never hardcode IDs or tenant strings in code.** Tenant = `tenant_companionscpas`. Bindings = `DB`, `WEBSITE_ASSETS`, `CMS_CACHE`.
4. **D1 is SSOT for all content.** Never edit R2 HTML directly — edit D1, then publish.
5. **R2 page HTML is a build artifact.** renderPage() regenerates it on publish. Manual edits get overwritten.
6. **Two repos, never mixed:**
   - CPAS: `/Users/samprimeaux/companionscpas` → `wrangler deploy`
   - IAM: `/Users/samprimeaux/inneranimalmedia` → `npm run deploy:full`
7. **Every change: commit → push main → deploy.**
8. **Bust KV after every publish.**
9. **`image_url` in cms_page_sections must always be full `https://assets.companionsofcaddo.org/...` URL.**
10. **All CPAS D1 queries must include `WHERE tenant_id = 'tenant_companionscpas'`** (except CMS tables which use their own tenant column).

---

## For ChatGPT: D1 Access Pattern

`agentsam_d1_query` is scoped to the IAM platform — it will NOT find CPAS tables. Always use the terminal tool:

```bash
cd /Users/samprimeaux/companionscpas
npx wrangler d1 execute companionscpas --remote --command "YOUR SQL"
```

DB ID: `fd6dd6fb-156b-4b6a-8ff0-505422652391`. Worker binding: `DB`. Tenant: `tenant_companionscpas`.

### GPT Corrections (verified against live DB)

| GPT said | Reality |
|---|---|
| "`animals` may be an alternate animal table" | `animals` has 0 rows and a 6-column stub schema. It is dead. `animal_profiles` (17 rows, 29 columns) is canonical. |
| "`applications` may be source of truth for adoptions" | `applications` is a 6-column legacy stub with 4 rows and no tenant_id. `cpas_foster_applications` is canonical (4 rows, 27 columns, full review workflow). |
| "`agentsam_mcp_tools` is the MCP tool registry" | `agentsam_tools` (34 rows) is canonical. `agentsam_mcp_tools` (25 rows) is legacy from pre-refactor. Build on `agentsam_tools`. |
| "`agentsam_mcp_workflows` for workflow definitions" | `agentsam_workflows` (17 rows) is canonical. `agentsam_mcp_workflows` (33 rows) is legacy. |
| "`fundraising_campaigns` is production" | `fundraising_campaigns` has 0 rows. `fundraising_campaigns_demo` has 3 rows but is demo data — never drive production UI from it. Both are backburner until Stripe setup completes. |
| "`care_tasks` filters by tenant_id" | `care_tasks` uses `organization_id`, not `tenant_id`. Filter: `WHERE organization_id = 'tenant_companionscpas'`. Currently 0 rows (empty, not broken). |
| "Add `/api/dashboard/volunteers` as new endpoint" | Endpoint already exists as `/api/dashboard/team` in `dashboard_api.js`. Frontend needs to call `/api/dashboard/team` or the backend needs an alias. |
