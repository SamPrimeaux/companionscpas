# CompanionsCPAS Platform

**Companions of CPAS** — Volunteer-powered 501(c)(3) helping dogs at Caddo Parish Animal Services receive medical care, transport support, and second chances.

- **Live site:** `https://companionscpas.meauxbility.workers.dev` *(migrating to client domain)*
- **Dashboard:** `https://companionscpas.meauxbility.workers.dev/dashboard`
- **Stack:** Cloudflare Workers · D1 · R2 · KV · Workers AI
- **Developed by:** [Inner Animal Media](https://inneranimalmedia.com)
- **Repo:** `github.com/SamPrimeaux/companionscpas-platform`

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Worker Bindings](#worker-bindings)
3. [Infrastructure](#infrastructure)
4. [CMS System](#cms-system)
5. [Runtime Contract](#runtime-contract)
6. [Database Schema](#database-schema)
7. [API Routes](#api-routes)
8. [R2 Asset Structure](#r2-asset-structure)
9. [Brand & Assets](#brand--assets)
10. [Agent Sam Integration](#agent-sam-integration)
11. [Development](#development)
12. [Deployment](#deployment)
13. [Current Status & Known Gaps](#current-status--known-gaps)
14. [Client Handoff Notes](#client-handoff-notes)

---

## Architecture Overview

```
Browser
  │
  ▼
Cloudflare Worker (src/index.js)
  │
  ├── /api/*          → src/api/*.js handlers
  ├── /dashboard      → dashboard.html (React SPA, auth-gated)
  ├── /              → render_home.js (D1+KV driven)
  ├── /about|adopt|services|donate → [PENDING: CMS publish pipeline]
  └── static assets  → WEBSITE_ASSETS (R2) → ASSETS (fallback)

D1: companionscpas          ← source of truth for all content
KV: companionscpas-cache    ← assembled page cache (60min TTL)
R2: companionscpas          ← rendered HTML artifacts + images
Workers AI: AGENTSAM_WAI   ← Agent Sam + content assist
```

The homepage (`/`) is fully D1+KV driven via `render_home.js`. All other public pages (`/about`, `/adopt`, `/services`, `/donate`) are currently served from hardcoded HTML templates — **the CMS publish pipeline has not been executed yet.** Once wired, every page will be rendered from D1 `cms_page_sections` data and cached in KV.

---

## Worker Bindings

| Binding name | Type | Value | Purpose |
|---|---|---|---|
| `AGENTSAM_WAI` | Workers AI | Workers AI Catalog | Agent Sam LLM + embed |
| `ASSETS` | Assets | — | Static fallback (being migrated out) |
| `CMS_CACHE` | KV namespace | `companionscpas-cache` (`0b410337a8494fc982ea04c5bde1eab4`) | Page + brand cache |
| `DB` | D1 database | `companionscpas` (`fd6dd6fb-156b-4b6a-8ff0-505422652391`) | All content, users, config |
| `WEBSITE_ASSETS` | R2 bucket | `companionscpas` | Rendered HTML + images |

**wrangler.toml** — note this project uses `wrangler.toml` (not `wrangler.production.toml`).

---

## Infrastructure

### D1 Database
- **Name:** `companionscpas`
- **ID:** `fd6dd6fb-156b-4b6a-8ff0-505422652391`
- **Tenant:** `tenant_companionscpas`
- **Default workspace:** `ws_companionscpas`
- **Region:** WNAM (Western North America)

### R2 Bucket
- **Name:** `companionscpas`
- **Custom domain:** `assets.meauxxx.com` *(temp — migrate to client domain when purchased)*
- **Dev URL:** `https://pub-bd8b064ba266482baa07a382af659771.r2.dev` *(rate-limited, not for production)*
- **S3 API:** `https://ede6590ac0d2fb7daf155b35653457b2.r2.cloudflarestorage.com/companionscpas`
- **R2 Data Catalog:** `https://catalog.cloudflarestorage.com/ede6590ac0d2fb7daf155b35653457b2/companionscpas`

### KV Namespace
- **Name:** `companionscpas-cache`
- **ID:** `0b410337a8494fc982ea04c5bde1eab4`
- **Key patterns:**
  - `brand:tenant_companionscpas` — brand settings (60min TTL)
  - `page:/` — assembled home HTML (60min TTL)
  - `page:/about` — assembled about HTML (60min TTL)
  - `sections:tenant_companionscpas:{route}` — sections array per route
  - `bootstrap:tenant_companionscpas` — full CMS bootstrap payload

---

## CMS System

The CMS is built on 15 D1 tables and a section-schema registry. It supports agent-assisted editing, full revision history, and a publish pipeline that renders D1 content to R2 HTML artifacts.

### Core Tables

| Table | Purpose |
|---|---|
| `cms_pages` | Page registry — route, slug, title, status, SEO |
| `cms_page_sections` | Section content — heading, body, CTAs, image, sort_order |
| `cms_page_content_blocks` | Sub-block level (repeating cards within a section) |
| `cms_section_schemas` | Field contract per section_type (19 schemas) |
| `cms_themes` | Design token system — color, typography, spacing, radius, motion |
| `cms_brand_settings` | Logo, colors, nav JSON, footer JSON, socials, org data |
| `cms_assets` | Asset registry — R2 keys, CDN URLs, alt text |
| `cms_navigation_items` | Nav links with group, parent, sort_order |
| `cms_navigation_menus` | Nav menu registry with R2 artifact key |
| `cms_publish_jobs` | Publish pipeline job queue |
| `cms_publish_artifacts` | Published HTML/CSS artifact registry |
| `cms_revisions` | Full before/after revision history |
| `cms_page_versions` | Draft/published version snapshots |
| `cms_editor_sessions` | Session tracking for dashboard usage |
| `cms_editor_events` | Audit trail — field_edit, publish, agent_assist, rollback |

### Section Schema Registry (19 schemas)

The `cms_section_schemas` table defines what fields each section type has. The CMS editor reads this to know what inputs to render. Agent Sam reads this before proposing any section edit.

| section_type | Label | Category |
|---|---|---|
| `hero` | Hero | layout |
| `text_image` | Text + Image | layout |
| `card_grid` | Card Grid | layout |
| `text_image_split` | Text + Image Split | content |
| `feature_cards` | Feature Cards | content |
| `faq` | FAQ | content |
| `org_info` | Org Info | content |
| `testimonial` | Testimonial | social_proof |
| `testimonials` | Testimonials | social_proof |
| `impact_stats` | Impact Stats Bar | social_proof |
| `sponsor_logos` | Sponsor / Partner Logos | social_proof |
| `image_gallery` | Image Gallery | media |
| `animal_grid` | Animal Adoption Grid | dynamic |
| `campaign_grid` | Campaign Grid | fundraising |
| `cta_banner` | Call to Action Banner | conversion |
| `donation_block` | Donation Block | conversion |
| `volunteer_cta` | Volunteer CTA | conversion |
| `nav` | Navigation | global |
| `footer` | Footer | global |

### Theme System

Two themes are active:
- `midnight_companion_glass` — primary site theme
- `donation_modal_glass` — donation modal overlay

Themes store full design tokens as JSON columns: `color_tokens_json`, `typography_tokens_json`, `spacing_tokens_json`, `radius_tokens_json`, `shadow_tokens_json`, `motion_tokens_json`, `component_tokens_json`, `light_tokens_json`, `dark_tokens_json`. Compiled CSS lives in `css_vars_json` and `custom_css`.

---

## Runtime Contract

The CMS pipeline connects D1 content to live pages. This is the source of truth for how edits become visible on the site.

### Flow

```
1. EDIT      POST /api/cms/section/save
               └── UPDATE cms_page_sections (D1)
               └── INSERT cms_revisions
               └── INSERT cms_editor_events (event_type='field_edit')
               └── KV.delete(`sections:${tenant}:${route}`)
               └── KV.delete(`bootstrap:${tenant}`)

2. PUBLISH   POST /api/cms/publish
               └── INSERT cms_publish_jobs (status='running')
               └── renderPage(route, env)
               └── UPDATE cms_publish_jobs (status='done')

3. RENDER    renderPage(route, env)
               ├── load cms_pages WHERE route_path=?
               ├── getBrand() → KV → D1
               ├── load cms_page_sections WHERE page_route=? ORDER BY sort_order
               ├── load cms_page_content_blocks WHERE page_route=?
               ├── renderSection(section, blocks, brand) per section_type
               ├── WEBSITE_ASSETS.put(static/pages{route}/{section_key}.html)
               ├── assemble: header.html + sections + footer.html
               ├── WEBSITE_ASSETS.put(static/pages{route}/index.html)
               ├── CMS_CACHE.put(`page:${route}`, html, { expirationTtl: 3600 })
               └── INSERT cms_publish_artifacts

4. SERVE     GET /{route}
               ├── CMS_CACHE.get(`page:${route}`) → return if hit
               ├── WEBSITE_ASSETS.get(static/pages{route}/index.html) → cache + return
               └── renderPage(route, env) → on-demand fallback
```

### Section Renderer Map

```js
const SECTION_RENDERERS = {
  hero:             renderHero,
  text_image:       renderTextImage,
  text_image_split: renderTextImageSplit,
  card_grid:        renderCardGrid,
  feature_cards:    renderFeatureCards,
  testimonials:     renderTestimonials,
  testimonial:      renderTestimonial,
  impact_stats:     renderImpactStats,
  campaign_grid:    renderCampaignGrid,
  animal_grid:      renderAnimalGrid,    // queries animal_profiles D1
  cta_banner:       renderCtaBanner,
  donation_block:   renderDonationBlock,
  org_info:         renderOrgInfo,
  faq:              renderFaq,
};
```

### Size Budget

- `global.css` — **≤ 30KB** gzip (compiled from active theme tokens)
- Each section HTML — **≤ 50KB** (markup only — no embedded CSS/JS)
- Global header/footer — **≤ 10KB** each
- Section files live at: `static/pages/{route_slug}/{section_key}.html`
- Global partials live at: `static/global/header.html`, `static/global/footer.html`, `static/global/global.css`

### Global Rebuild Trigger

```
POST /api/cms/publish-global
  → rebuild header.html from cms_brand_settings + cms_navigation_items
  → rebuild footer.html from brand + socials + IAM badge
  → compile global.css from active theme tokens
  → write to R2 static/global/
  → KV.delete all page:* keys (full site cache bust)
```

---

## Database Schema

### Core domain tables

| Table | Key fields | Notes |
|---|---|---|
| `users` | id, email, full_name, status | Site users + admins |
| `admin_users` | id, email, role, is_active | Dashboard access |
| `sessions` | id, user_id, expires_at | Auth sessions |
| `tenants` | id, slug, name, domain | Multi-tenant support |
| `tenant_memberships` | tenant_id, user_id, role | Roles: owner/admin/volunteer |

### Animal & rescue tables

| Table | Key fields | Notes |
|---|---|---|
| `animal_profiles` | id, name, breed, status, photo_url, adoption_fee_cents | Powers `/adopt` animal grid |
| `animals` | id, name, breed, age, status | Legacy (pre-animal_profiles) |
| `foster_records` | id, animal_id, foster_name, status, application_id | Active foster placements |
| `care_tasks` | id, animal_id, task_type, status, due_at | Vet/feed/walk task queue |

### Application tables

| Table | Key fields | Notes |
|---|---|---|
| `cpas_application_forms` | id, form_key, title | Form registry |
| `cpas_application_steps` | form_id, step_key, title, sort_order | Multi-step form structure |
| `cpas_application_fields` | form_id, step_id, field_key, field_type | Dynamic field registry |
| `cpas_foster_applications` | id, status, review_status, answers_json | Submitted adopt/foster apps |
| `cpas_application_events` | application_id, event_type | Status history |
| `cpas_application_email_logs` | application_id, email_type, status | Resend delivery tracking |
| `applications` | id, applicant_name, applicant_email, status | Legacy (pre-cpas tables) |

### Fundraising tables

| Table | Key fields | Notes |
|---|---|---|
| `fundraising_campaigns` | id, title, goal_amount_cents, raised_amount_cents, status | Active campaigns |
| `fundraising_campaigns_demo` | id, title, goal_cents, raised_cents | Demo/dev data |
| `campaign_updates` | campaign_id, title, body, is_public | Campaign progress posts |
| `donors` | id, email, stripe_customer_id, total_given_cents | Donor CRM |
| `donations` | id, amount_cents, stripe_payment_intent_id, status | Donation records |
| `donation_intents` | id, donor_name, amount_cents, frequency, provider_checkout_id | Stripe checkout sessions |
| `donation_payments` | id, donation_id, provider_payment_id, status | Payment confirmations |
| `donation_settings` | tenant_id, provider, default_amounts_json | Donation widget config |

### Agent Sam tables

| Table | Notes |
|---|---|
| `agentsam_sessions` | Chat sessions |
| `agentsam_messages` | Message history |
| `agentsam_agent_run` | LLM call records with token/cost tracking |
| `agentsam_tool_chain` | Tool call log per agent run |
| `agentsam_tool_result` | Tool output per chain entry |
| `agentsam_tools` | Tool registry (DB-driven, replaces hardcoded) |
| `agentsam_mcp_tools` | MCP tool catalog |
| `agentsam_mcp_workflows` | Workflow definitions |
| `agentsam_commands` | Slash command registry |
| `agentsam_memory` | Agent memory (key/value + embedding_id) |
| `agentsam_model_catalog` | LLM model registry |
| `agentsam_routing_arms` | Thompson Sampling routing arms |
| `agentsam_performance_eto_events` | ETO reward signal log |
| `agentsam_usage_events` | Token + cost per call |
| `agentsam_usage_rollups_daily` | Daily spend aggregates |
| `agentsam_analytics` | Analytics per run |
| `agentsam_eval_suites/cases/runs` | Eval framework |
| `agentsam_plans` | Sprint/daily plans |
| `agentsam_plan_tasks` | Tasks per plan |
| `agentsam_project_context` | Project context entries |
| `agentsam_todo` | Todo backlog |
| `agentsam_rules_document` | Agent rules / system prompt patches |
| `agentsam_skill` | Agent skills |
| `agentsam_workflows` | Workflow graph definitions |
| `agentsam_workflow_nodes` | Workflow nodes |
| `agentsam_workflow_edges` | Workflow edges |
| `agentsam_workflow_runs` | Workflow execution history |
| `agentsam_workflow_handlers` | Handler registry |
| `agentsam_escalation` | Model escalation chain |
| `context_index` | Knowledge/rule index |
| `agentsam_ai_models` | AI model metadata |
| `agentsam_model_policy` | Routing policy per task_type |
| `agentsam_intent_rules` | Intent → task_type mapping |
| `agentsam_bridge_connections` | Bridge connections (PTY/local) |
| `agentsam_secret_bindings` | Secret key bindings |
| `agentsam_code_index_job` | Codebase index job status |
| `agentsam_reward_events` | Thompson sampling reward events |
| `agentsam_superdev_grants` | Developer permission grants |

### Supporting tables

| Table | Notes |
|---|---|
| `organizations` | Org registry |
| `volunteer_records` | Volunteer roster |
| `email_templates` | Resend email templates |
| `email_events` | Email delivery log |
| `contact_requests` | Public contact form submissions |
| `secret_vault_items` | Encrypted API keys |
| `secret_vault_access_log` | Secret access audit |
| `audit_log` | General audit log |
| `oauth_accounts` | OAuth provider accounts |
| `user_credentials` | Password credentials |
| `user_security_events` | Login/security events |
| `password_reset_tokens` | Password reset tokens |
| `role_permissions` | RBAC permission map |
| `dashboard_calendar_events` | Dashboard calendar |

---

## API Routes

### Health
| Method | Route | Notes |
|---|---|---|
| GET | `/api/health` | Returns `{ ok: true, service: "companionscpas-platform" }` |

### Auth
| Method | Route | Handler |
|---|---|---|
| POST | `/api/auth/login` | `auth_login.js` |
| POST | `/api/auth/logout` | `session_api.js` |
| GET | `/api/auth/session` | `session_api.js` |
| POST | `/api/auth/password-reset/request` | `password_reset.js` |
| POST | `/api/auth/password-reset/confirm` | `password_reset.js` |

### CMS
| Method | Route | Handler | Notes |
|---|---|---|---|
| GET | `/api/cms/bootstrap` | `cms_api.js` | Full CMS payload — pages, assets, brand, nav, themes |
| GET | `/api/cms/page?route=/about` | `cms_api.js` | Single page + sections + blocks |
| POST | `/api/cms/page/save` | `cms_api.js` | Upsert page metadata |
| POST | `/api/cms/section/save` | `cms_api.js` | Upsert section (UPSERT on tenant+route+key) |
| POST | `/api/cms/section/delete` | `cms_api.js` | Delete section + bust KV |
| POST | `/api/cms/block/save` | `cms_api.js` | Upsert content block |
| POST | `/api/cms/publish` | `cms_api.js` | Mark page published *(render pipeline pending)* |
| GET | `/api/cms/brand` | `cms_api.js` | Brand settings (KV → D1) |
| POST | `/api/cms/brand/save` | `cms_api.js` | Update brand + bust KV |
| GET | `/api/cms/assets` | `cms_api.js` | Asset list (filter by context/category) |
| POST | `/api/cms/asset/save` | `cms_api.js` | Upsert asset record |

### Agent Sam
| Method | Route | Notes |
|---|---|---|
| POST | `/api/agentsam/chat` | Agent chat — requires session auth |
| GET/POST | `/api/agentsam/tools/*` | Tool dispatch — requires session auth |

### Donations
| Method | Route | Handler |
|---|---|---|
| POST | `/api/donations/intent` | `donation_api.js` — create Stripe checkout |
| POST | `/api/donations/webhook` | `payments_email.js` — Stripe webhook handler |

### Dashboard
| Method | Route | Handler |
|---|---|---|
| GET | `/api/dashboard/*` | `dashboard_api.js` — animals, fosters, applications |
| GET | `/api/dashboard/config` | `dashboard_config_api.js` |

### Contact / Social
| Method | Route | Handler |
|---|---|---|
| POST | `/api/contact` | `contact_api.js` |
| GET/POST | `/api/social/*` | `social.js` — Facebook/Instagram/YouTube |

---

## R2 Asset Structure

```
companionscpas/              ← WEBSITE_ASSETS binding
│
├── static/
│   ├── global/              ← compiled global partials
│   │   ├── header.html      ← [PENDING: publish pipeline]
│   │   ├── footer.html      ← [PENDING: publish pipeline]
│   │   └── global.css       ← [PENDING: theme compile]
│   │
│   ├── animals/             ← 21 animal photos (webp/jpg)
│   │   ├── 2cute.webp
│   │   ├── awwmaaann-(1).webp
│   │   ├── bigsmiles.webp
│   │   ├── bluepit.webp
│   │   ├── brindle.jpg
│   │   ├── conehead.webp
│   │   ├── gimmieabite.webp
│   │   ├── goinhome.webp
│   │   ├── happyboy.webp
│   │   ├── hungryboy.webp
│   │   ├── miniscoobydoo.webp
│   │   ├── pup.webp
│   │   ├── redeye.webp
│   │   ├── skinnyman.webp
│   │   ├── sus.webp
│   │   ├── thefounders.webp
│   │   ├── theteam.webp
│   │   ├── thinboy.webp
│   │   ├── thisismysweater.webp
│   │   ├── transport-fundraiser.webp
│   │   └── upclose.webp
│   │
│   ├── assets/              ← brand assets
│   │   ├── logo.png         ← light logo
│   │   ├── logo-dark.webp   ← dark logo
│   │   └── iam_badge.jpg    ← Inner Animal Media footer badge
│   │
│   ├── pages/               ← rendered page section HTML
│   │   ├── home/            ← [PENDING: publish pipeline]
│   │   ├── about/
│   │   ├── adopt/
│   │   ├── services/
│   │   └── donate/
│   │
│   └── backup/              ← backup files
```

All public assets are served via `assets.meauxxx.com` (custom domain on the `companionscpas` R2 bucket). When the client's actual domain is purchased, update the custom domain in R2 settings and update `cms_brand_settings.site_domain`.

---

## Brand & Assets

### Logos

| Usage | URL |
|---|---|
| Light version (dark backgrounds) | `https://assets.meauxxx.com/static/assets/logo.png` |
| Dark version (light backgrounds) | `https://assets.meauxxx.com/static/assets/logo-dark.webp` |
| Inner Animal Media badge (footer) | `https://assets.meauxxx.com/static/assets/iam_badge.jpg` |

### Colors (from `cms_brand_settings`)

| Token | Value |
|---|---|
| Primary | `#7c3aed` (purple) |
| Secondary | `#172033` (dark navy) |
| Accent | `#ee2336` (red) |

### Organization Data

| Field | Value |
|---|---|
| Legal name | Companions of CPAS |
| Tax status | 501(c)(3) |
| EIN | 88-4156327 |
| Parish served | Caddo |
| Operating budget | Under $100,000 |
| Email | companionsCPAS@gmail.com |
| Facebook | facebook.com/people/Companions-of-CPAS/100069291576354 |
| Instagram | instagram.com/companionscpas |

> **Note:** `cms_brand_settings.logo_url` is currently empty — this causes `/logo.png` fallback in some templates. Fix: `UPDATE cms_brand_settings SET logo_url = 'https://assets.meauxxx.com/static/assets/logo.png' WHERE tenant_id = 'tenant_companionscpas'`

---

## Agent Sam Integration

Agent Sam is embedded in the dashboard CMS view. It uses `AGENTSAM_WAI` (Workers AI) and the `agentsam_*` D1 tables for session, memory, tool, and routing management.

### How agent-assisted CMS editing works

1. Agent reads the current section from D1 via `GET /api/cms/page?route=/about`
2. Agent reads the section schema from `cms_section_schemas WHERE section_type=?` to know what fields exist
3. Agent proposes a new heading/body/CTA in chat
4. User approves → `POST /api/cms/section/save` (same path as manual dashboard edit)
5. `POST /api/cms/publish` → triggers render pipeline → page goes live

### Event logging

Every agent edit is logged to `cms_editor_events` with `event_type = 'agent_assist'`. This table also captures `field_edit`, `draft_save`, `publish`, `rollback`, and `preview_switch` events — full audit trail of every change to the site.

### Tool registry

Agent Sam's tools are DB-driven via `agentsam_tools` (not hardcoded). Tools are added by inserting rows into `agentsam_tools` — no code deploy required for new tool additions.

---

## Development

### Prerequisites

- Node.js 18+
- `wrangler` CLI (`npm install -g wrangler`)
- Cloudflare account access (`ede6590ac0d2fb7daf155b35653457b2`)

### Local setup

```bash
git clone https://github.com/SamPrimeaux/companionscpas-platform.git
cd companionscpas-platform
npm install
```

### Environment

Secrets are stored in Cloudflare Worker secrets (not `.env`). For local dev, create `.dev.vars`:

```
RESEND_API_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
AGENTSAM_BRIDGE_TOKEN=...
```

### Running locally

```bash
wrangler dev
```

The local dev server binds to all configured D1/KV/R2 bindings. Note: `WEBSITE_ASSETS` (R2) in local dev uses a local simulation — R2 puts will not hit the production bucket.

---

## Deployment

```bash
wrangler deploy
```

> Uses `wrangler.toml` (not `wrangler.production.toml`). There is no separate sandbox deploy.

### Post-deploy checklist

1. `curl https://companionscpas.meauxbility.workers.dev/api/health` → `{ ok: true }`
2. Visit `/` → confirm homepage renders with correct brand
3. Visit `/dashboard` → confirm auth redirect to `/admin/login`
4. Check D1 metrics in Cloudflare dashboard

### D1 migrations

```bash
wrangler d1 execute companionscpas --remote --file=./migrations/MIGRATION_FILE.sql
```

---

## Current Status & Known Gaps

### What is working

- ✅ Homepage (`/`) — fully D1+KV driven via `render_home.js`
- ✅ Dashboard (`/dashboard`) — auth-gated React SPA, Agent Sam embedded
- ✅ Auth — login, session, password reset
- ✅ CMS section save/delete (`/api/cms/section/save`)
- ✅ Brand save with KV invalidation (`/api/cms/brand/save`)
- ✅ Asset registry (`/api/cms/assets`, `/api/cms/asset/save`)
- ✅ Agent Sam chat + tool dispatch
- ✅ Donation intent flow (Stripe checkout)
- ✅ Adopt/foster application form (3-step)
- ✅ 19 section schemas defined
- ✅ 2 themes active with CSS vars compiled
- ✅ 53 assets in `cms_assets`
- ✅ 21 animal images in R2 `static/animals/`

### Gaps to close (ordered by priority)

| Priority | Gap | Fix |
|---|---|---|
| **P0** | `cms_brand_settings.logo_url` empty | 1 SQL UPDATE — causes broken logo on About/Adopt header |
| **P0** | Services page content wrong | Rewrite: community pet assistance → shelter rescue mission |
| **P0** | Donate page critical errors | Rewrite: wrong org name ("Paw Love"), wrong address ("Dry Prong, LA"), wrong parish ("Grant Parish") |
| **P0** | Publish pipeline never executed | Wire `renderPage()` in `cms_api.js` `/api/cms/publish` route |
| **P0** | `/adopt`, `/services` have 0 D1 sections | Seed sections per page |
| **P1** | 8 section schemas missing `schema_json` | Populate field definitions for: `org_info`, `campaign_grid`, `footer`, `nav`, `hero`, `text_image`, `card_grid`, `testimonial` |
| **P1** | `navigation_json` empty in brand settings | Populate from `cms_navigation_items` |
| **P1** | Animal grid on `/adopt` shows "Loading..." | Wire `animal_profiles` D1 query to the adopt page render |
| **P1** | 0 revision history entries | First CMS edit via dashboard will start populating |
| **P2** | `global.css` not compiled to R2 | Wire theme compile → `static/global/global.css` |
| **P2** | Section renderers not written | Write `renderSection()` per section_type |
| **P2** | Client domain not purchased | Update R2 custom domain + `site_domain` in brand when ready |

---

## Client Handoff Notes

### Domain migration

When Companions of CPAS purchases their domain:
1. Add custom domain to `companionscpas` R2 bucket (replace `assets.meauxxx.com`)
2. Update DNS to point to the Cloudflare Worker
3. `UPDATE cms_brand_settings SET site_domain = 'companionscpas.org' WHERE tenant_id = 'tenant_companionscpas'`
4. Update Worker route in `wrangler.toml`

### Admin access

Admin dashboard at `/dashboard`. The client should be provisioned an `admin_users` row with a hashed password. Password reset flow is fully wired at `/admin/reset`.

### Content updates

The client can update page content directly through the CMS dashboard at `/dashboard?view=cms`. Any section field (heading, body, CTA text, images) can be edited and published without a code deploy. Agent Sam is available in the dashboard sidebar to assist with copy.

### What requires a code deploy

- New section types (requires adding a renderer to `src/api/`)
- New API routes
- New Worker bindings

### What does NOT require a code deploy

- Page content (D1)
- Brand settings — logo, colors, nav, footer (D1 + KV)
- Asset additions (D1 + R2 upload)
- New Agent Sam tools (D1 insert only)
- Theme token updates (D1)

---

*Developed and maintained by [Inner Animal Media](https://inneranimalmedia.com) · info@inneranimals.com*
