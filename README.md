# CompanionsCPAS Platform

Companions of CPAS — 501(c)(3) volunteer-powered rescue helping dogs at Caddo Parish Animal Services receive medical care, transport support, and second chances.

- **Live site:** `https://companionsofcaddo.org`
- **Dev URL:** `https://companionscpas.meauxbility.workers.dev` *(internal/testing only)*
- **Dashboard:** `/dashboard` *(auth-gated, session-enforced at Worker level)*
- **Repo:** `github.com/SamPrimeaux/companionscpas`
- **Developed by:** [Inner Animal Media](https://inneranimalmedia.com)
- **Stack:** Cloudflare Workers, D1, R2, KV, Workers AI

---

## Project Overview

This platform combines a public-facing rescue website with a private admin dashboard. **All six public pages** are served through a **sectionalized CMS pipeline**: editable content lives in D1, renders into per-section R2 HTML fragments, assembles into full pages at request time, and caches in KV.

The dashboard is a React SPA (raw JSX via Babel CDN) served from R2. The public site uses `shared.css` design tokens, modular popups (`cpas-modals.js`, `donate-modal.js`), and Stripe test-mode donations until the client goes live.

**Start here:** [Client handoff status](#client-handoff-status-june-2026) for what's live today, then [Sectionalized CMS System](#sectionalized-cms-system) for CMS/public-site work. Dashboard file ownership: [`docs/current-file-map.md`](docs/current-file-map.md). Per-feature docs (vectorization-ready): [`docs/features/README.md`](docs/features/README.md).

---

## Client Handoff Status (June 2026)

Production domain: `companionsofcaddo.org`. Final client sprint shipped:

| Area | Status |
|---|---|
| Public site (6 fragment routes) | Live — D1 → R2 → KV |
| Animals + profiles + foster placement | Live — `POST/PATCH /api/dashboard/fosters`, Care & Medical panel |
| Fosters list | Live — active placements from API |
| Applications | Live — `cpas_foster_applications` only; legacy `applications` table empty |
| Volunteers | Live — `GET/POST /api/dashboard/volunteers`, Add Volunteer form |
| CMS pages list | Live — `status` from D1 (not hardcoded) |
| Donations / Stripe | Live in test mode |
| Email inbox | Live — Resend + per-user Gmail scope |

**Still mixed or stub (do not treat as full production metrics):**

- **Overview** — partial API hydration; sparklines/deltas/care bars still from `data.js` mock
- **Daily Care** — mock tasks only (`CPAS.dailyCare`); API exists but UI not wired
- **Reports** — Financial tab live; Animals/Applications/Volunteers/AI Usage tabs still use hardcoded seed fallbacks in `view-reports.jsx` (see file map)
- **Settings** — shell; org/users/integrations need build-out
- **Adoptions route** — shows approved foster applications, not adoption records (naming only)

**Maintenance backlog (future sprints — not blockers for handoff):**

- [Lane B — Dashboard social publishing](#lane-b--dashboard-social-publishing-future) (Meta app review, client approval required)
- [Agent Sam / AI cost ownership refresh](#agent-sam--ai-cost-ownership) — Reports AI tab + chat reliability; full Phase 2 plan in [`docs/AGENTSAM_CPAS_ROADMAP.md`](docs/AGENTSAM_CPAS_ROADMAP.md)
- Overview/Daily Care wire-up or explicit "demo metrics" labels
- `/adopt` animal grid depth, CMS block editor, live Stripe keys

---

## Sectionalized CMS System

> Last updated: 2026-06-19. Canonical reference for CMS/public-site work.

### Mental model

```
Dashboard edit  →  D1 (cms_page_sections + cms_page_content_blocks)   ← source of truth
       ↓ save / publish / sync
Section renderers  →  R2 static/pages/{route}/{section_key}.html        ← rendered HTML fragments
       ↓ assemble (Worker, on each request or publish)
Full page HTML  →  header + <main>sections</main> + footer + shell JS
       ↓ cache
KV page:{route}  →  fast repeat visits (TTL ~1 hour)
R2 static/pages/{route}/index.html  →  optional baked artifact after publish
```

**D1** = what the team edits. **R2 fragments** = what the live site reads. **KV** = assembled page cache. Never hand-edit R2 page HTML; regenerate via CMS save, sync script, or publish.

### Public page serve order (`src/index.js` → `servePublicPage`)

For every public route:

1. **KV hit** — return `page:{route}` immediately
2. **Fragment assembly** — if route is fragment-managed, stitch R2 section files + shell
3. **R2 artifact** — `static/pages/index.html` or `static/pages/{route}/index.html`
4. **D1 ad-hoc fallback** — `renderPage()` (legacy; avoid for fragment routes)

### Fragment-managed routes

| Route | Registry module | Renderer style | R2 fragment base | Page doc |
|---|---|---|---|---|
| `/` | `home_cms_sync.js` | Custom per-section (`render_home_section.js`) | `static/pages/home/` | [`docs/homepage-readme.md`](docs/homepage-readme.md) |
| `/about` | `about_cms_sync.js` | Custom per-section (`render_about_section.js`) | `static/pages/about/` | [`docs/about-readme.md`](docs/about-readme.md) |
| `/services` | `generic_page_cms_sync.js` | Shared `render_section.js` | `static/pages/services/` | [`docs/services-page-spec.md`](docs/services-page-spec.md) |
| `/adopt` | `generic_page_cms_sync.js` | Shared `render_section.js` | `static/pages/adopt/` | — |
| `/donate` | `generic_page_cms_sync.js` | Shared `render_section.js` + `render_campaign_transport_hero.js` | `static/pages/donate/` | [`docs/donate-readme.md`](docs/donate-readme.md) |
| `/community` | `generic_page_cms_sync.js` | Shared `render_section.js` | `static/pages/community/` | — |

**Custom routes** (`/`, `/about`) have dedicated renderers tuned to the design system (`hero-split`, `story-block`, `ways-grid`, etc.).

**Generic routes** (`/services`, `/adopt`, `/donate`, `/community`) use `render_section.js` section types (`hero`, `text_image`, `feature_cards`, `foster_grid`, `cta_banner`, `fundraising`, etc.). Section type picks the HTML layout; D1 fields + blocks supply content.

Route registry: [`src/api/page_cms_registry.js`](src/api/page_cms_registry.js).

### Key implementation files

| File | Role |
|---|---|
| [`src/api/page_cms_registry.js`](src/api/page_cms_registry.js) | Maps routes → sync modules; `isFragmentPageRoute()`, publish/preview helpers |
| [`src/api/home_cms_sync.js`](src/api/home_cms_sync.js) | Home D1 → R2 fragment sync + publish |
| [`src/api/about_cms_sync.js`](src/api/about_cms_sync.js) | About D1 → R2 fragment sync + publish |
| [`src/api/generic_page_cms_sync.js`](src/api/generic_page_cms_sync.js) | Generic pages D1 → R2 sync |
| [`src/api/render_home_section.js`](src/api/render_home_section.js) | Home section HTML renderers |
| [`src/api/render_about_section.js`](src/api/render_about_section.js) | About section HTML renderers |
| [`src/api/render_section.js`](src/api/render_section.js) | Generic section renderers + **unified CTA resolver** |
| [`src/api/render_home_fragments.js`](src/api/render_home_fragments.js) | Stitch home fragments → full page |
| [`src/api/render_about_fragments.js`](src/api/render_about_fragments.js) | Stitch about fragments → full page |
| [`src/api/render_generic_fragments.js`](src/api/render_generic_fragments.js) | Stitch generic routes → full page |
| [`src/api/render_page.js`](src/api/render_page.js) | `assembleFullPage()`, brand/header/footer, legacy `renderPage()` |
| [`src/api/page_shell.js`](src/api/page_shell.js) | Shared script tags + cache-bust versions for all public pages |
| [`src/api/cms_api.js`](src/api/cms_api.js) | CMS save/preview/publish/bootstrap API |

### D1 tables (CMS content)

| Table | Purpose |
|---|---|
| `cms_pages` | Page meta: `route_path`, `title`, `theme`, SEO fields |
| `cms_page_sections` | Section rows per route: `section_key`, `section_type`, copy, images, CTAs, `config_json`, `sort_order`, `is_visible` |
| `cms_page_content_blocks` | Repeating items inside a section (cards, stats, tiers, campaigns) |
| `cms_brand_settings` | Logos, nav, footer, org identity |
| `cms_modals` | CMS-driven intro copy (e.g. foster CTA popup) |
| `cms_assets` | R2 media library metadata |

Tenant ID everywhere: `tenant_companionscpas`.

### Public shell assets (R2)

| Asset | Role |
|---|---|
| `static/global/cpas-header.html` | Site header; nav Donate uses `data-action="donate"` |
| `static/global/cpas-footer.html` | Site footer |
| `static/global/shared.css` | Global design system (`hero-cta`, `hero-split`, `ways-grid`, etc.) |
| `static/global/shared.js` | Mobile nav, footer inject |
| `static/global/cpas-modals.js` | Reusable apply popups (foster intro → 4-step form, volunteer, contact) |
| `static/js/donate-modal.js` | Stripe PaymentElement donate modal (fetches key from API) |

Script inclusion is centralized in [`src/api/page_shell.js`](src/api/page_shell.js) → `publicPageScripts()`. Bump `SHELL_VERSION` / modal versions there after JS/CSS changes.

### CTA and modal conventions

Use these in D1 `cta_action` or `cta_href` (handled by `renderActionCta()` in `render_section.js`):

| Intent | Set in CMS | Result |
|---|---|---|
| Open donate modal | `cta_action: donate` or `cta_href: data-action:donate` | `<button data-action="donate" class="hero-cta hero-cta-primary">` |
| Open foster intro | `cta_action: foster` or `cta_href: modal:foster` | Foster intro popup → application form |
| Volunteer form | `cta_href: modal:volunteer` | Volunteer interest modal |
| Contact form | `cta_href: modal:contact` | Contact modal |
| Legacy anchor | `cta_href: #donate-form` | Auto-mapped to donate modal |

Home hero buttons use `data-action="foster"` / `data-action="donate"` directly in custom renderers.

**Legacy adopt CTAs** — buttons labeled “Support our work” / “Support our mission”, `#cpasDonateForm`, and `[data-donate]` are bridged in `public/_shared.js` → `static/global/shared.js` to open the same unified donate modal (with cover fees).

### Donations (Stripe)

One global donate modal (`static/js/donate-modal.js`) on every public page via `page_shell.js`. Triggered by `data-action="donate"` anywhere (header, home, `/donate`, `/adopt`, campaign cards).

| Endpoint | Handler | Purpose |
|---|---|---|
| `GET /api/donations/config` | `payments_email.js` | Publishable Stripe key + test/live mode |
| `POST /api/donations/intent` | `payments_email.js` | PaymentIntent / SetupIntent for in-modal PaymentElement |
| `POST /api/donations/create-intent` | `donation_api.js` | Legacy adopt support form API — same fee math + real PaymentIntent |
| `POST /api/donations/after-payment` | `payments_email.js` | Post-payment email + newsletter opt-in |
| `POST /api/webhooks/stripe` | `payments_email.js` | Writes `donations`, sends receipt, dashboard notification |

**Cover processing fees (default on):** donors can gross-up the Stripe charge so the nonprofit nets the intended gift. Formula: `(intended_cents + 30) / (1 - 0.029)`, rounded up. Shared logic in `src/api/donation_fees.js`.

- UI: checkbox in donate modal (one-time only), live fee label, button shows exact charge
- API payload: `{ intended_cents, cover_fees, amount_cents }` where `amount_cents` is the gross charge when covering fees
- D1: `donations.intended_amount_cents`, `donations.cover_fees`, `donations.amount_cents` (Stripe charge)
- Financial report: **Raised** vs **Charged** columns; totals use intended amounts

Stripe publishable key from `GET /api/donations/config` (secret: `STRIPE_PUBLISHABLE_KEY`). Test card: `4242 4242 4242 4242`.

### Dashboard email (Gmail + Resend)

`/dashboard/email` combines Resend inbound (`support@companionsofcaddo.org`, shared tenant-wide) with optional **per-user** Gmail OAuth inbox sync.

| Endpoint | Handler | Purpose |
|---|---|---|
| `GET /api/email/config` | `email_api.js` | Mailboxes, Resend status, **your** connected Gmail accounts |
| `GET /api/email/inbox` | `email_api.js` | Inbound messages — Gmail rows filtered to shared + **your** connections only |
| `POST /api/email/sync-gmail` | `email_api.js` | Sync **your** connected Gmail account(s) |
| `GET /api/integrations/gmail/connect` | `gmail_api.js` | Start Google OAuth (stores `user_id` on OAuth state) |
| `POST /api/integrations/gmail/disconnect` | `gmail_api.js` | Revoke token + disconnect **your** connection |
| `DELETE /api/email/gmail/disconnect` | `gmail_api.js` | Alias for disconnect |

**Gmail isolation (P0):** OAuth tokens live in D1 `social_provider_connections` with `connected_by_user_id`. Connection IDs are scoped as `conn_gmail_{userId}_{localPart}`. Inbox queries hide Gmail messages from other users' mailboxes. Org accounts: `*@companionsofcaddo.org` or `companionscpas@gmail.com`. Personal Gmail shows a warning banner in Mail settings.

**Disconnect:** revokes Google token, clears ciphers, sets `status = disconnected`. Does **not** delete historical `inbound_emails` rows (audit); run targeted SQL purge if personal mail was synced tenant-wide.

### CMS dashboard workflow

1. Edit at `/dashboard/cms/pages` → pick route → section fields
2. **Save section** → `POST /api/cms/section/save` → re-render fragment → write R2 → bust `page:{route}` KV
3. **Preview** → `GET /api/cms/preview?route=/donate` (auth required) — same assembly path as live
4. **Publish** → `POST /api/cms/publish` with `{ route_path }` → sync all sections → write `index.html` artifact → refresh KV

**Bootstrap / reset a page** (logged into dashboard):

```javascript
// Home only
fetch('/api/cms/home/bootstrap', {
  method: 'POST', credentials: 'include',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ force: true })
}).then(r => r.json()).then(console.log)

// Any fragment route (/about, /services, /donate, etc.)
fetch('/api/cms/page/bootstrap', {
  method: 'POST', credentials: 'include',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ route_path: '/donate', force: true })
}).then(r => r.json()).then(console.log)
```

`force: true` resets sections to module defaults. `force: false` only inserts missing rows.

### Ops commands (production)

```bash
# Deploy Worker (API + render logic)
npm run deploy

# Sync generic page fragments from D1 → R2 (CLI, no dashboard needed)
node scripts/sync-page-fragments.mjs /donate
node scripts/sync-page-fragments.mjs   # all four generic routes

# Republish home + about full HTML + bust KV (after shell/script changes)
node scripts/republish-shell-pages.mjs

# Upload a static asset to R2
npx wrangler r2 object put companionscpas/static/global/shared.css \
  --file public/_shared.css --content-type "text/css; charset=utf-8" --remote

# Bust a cached page
npx wrangler kv key delete "page:/donate" \
  --namespace-id 0b410337a8494fc982ea04c5bde1eab4 --remote

# Full dashboard + public asset sync
npm run sync
```

**After CSS/JS/header changes:** upload to R2, bump version in `page_shell.js`, deploy Worker if render code changed, bust KV for affected routes.

**After D1-only copy changes:** save in CMS or run sync script; KV is busted on save automatically.

### KV cache keys

| Key | Contents |
|---|---|
| `page:/` | Assembled homepage HTML |
| `page:/about` | Assembled about HTML |
| `page:/services` | Assembled services HTML |
| `page:/adopt` | Assembled adopt HTML |
| `page:/donate` | Assembled donate HTML |
| `page:/community` | Assembled community HTML |
| `brand:tenant_companionscpas` | Brand settings cache |
| `bootstrap:tenant_companionscpas` | CMS bootstrap JSON |

### CMS maintenance (post-handoff)

| Area | Status | Next step |
|---|---|---|
| Fragment pipeline (all 6 routes) | Live | Block-level CMS editing for card-heavy sections |
| Home + About custom renderers | Reference implementations | Template for future page remasters |
| Generic pages (`render_section.js`) | Live | Per-page D1 content polish |
| Donate modal + CTAs | Live (Stripe test mode) | Client sign-off; swap to live Stripe keys |
| Apply modals (foster/volunteer/contact) | Live in `cpas-modals.js` | More CTAs via `data-modal` / `cta_action` |
| `/adopt` animal grid | Live but thinner than legacy bake | D1-driven grid/modal depth if client wants |
| CMS brand | Live | Make org identity source of truth for all public copy |

Deeper schema/API reference: [`ARCHITECTURE.md`](ARCHITECTURE.md) (update dashboard contract table when editing). **Live dashboard map:** [`docs/current-file-map.md`](docs/current-file-map.md).

**Agent Sam context (D1):** canonical rows in `agentsam_project_context` on **both** databases:

| Database | Binding | ID | `project_key` |
|---|---|---|---|
| Client worker | `companionscpas` (`fd6dd6fb…`) | `ctx_companionscpas_fragment_cms_v1` | `companionscpas` |
| Client worker | `companionscpas` | `ctx_companionscpas_public_ux_v1` | `companionscpas_public_ux` |
| IAM main | `inneranimalmedia-business` (`cf87b717…`) | `ctx_companionscpas` | `companionscpas` |
| IAM main | `inneranimalmedia-business` | `ctx_companionscpas_public_ux_iam` | `companionscpas_public_ux` |

```bash
# Client D1
npx wrangler d1 execute companionscpas --remote --file db/agent_context/companionscpas_fragment_cms_context.sql

# IAM main D1 (Agent Sam registry)
npx wrangler d1 execute inneranimalmedia-business --remote --file db/agent_context/companionscpas_fragment_cms_iam_context.sql
```

---

## Documentation Index

| Document | Purpose |
|---|---|
| **This README** — [Sectionalized CMS System](#sectionalized-cms-system) | Canonical handoff: D1 → R2 fragments → KV pipeline, routes, ops commands, where to continue. |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Deep stack reference: D1 table contracts, bindings, legacy publish path, animal/app tables. |
| [`docs/homepage-readme.md`](docs/homepage-readme.md) | Home (`/`) custom fragment renderers, 7 sections, bootstrap. |
| [`docs/about-readme.md`](docs/about-readme.md) | About (`/about`) custom fragments and design-system classes. |
| [`docs/services-page-spec.md`](docs/services-page-spec.md) | Foster/services page layout spec and generic pipeline notes. |
| [`docs/features/README.md`](docs/features/README.md) | **Feature doc catalog** — vectorization-ready, one doc per main product surface. |
| [`docs/templates/FEATURE_DOC_TEMPLATE.md`](docs/templates/FEATURE_DOC_TEMPLATE.md) | Template for new feature docs. |
| [`docs/HANDOFF.md`](docs/HANDOFF.md) | **Canonical vs legacy D1 tables** — what to use, what was dropped, what needs code first. |
| [`docs/AGENTSAM_CPAS_ROADMAP.md`](docs/AGENTSAM_CPAS_ROADMAP.md) | **Agent Sam Phase 2 plan** — tools, workflows, approval queue, sprint build order. |
| [`docs/current-file-map.md`](docs/current-file-map.md) | **Live** dashboard route → file → API → table map (v2, Jun 2026). |
| [`docs/cleanup-report-2026-06-19.md`](docs/cleanup-report-2026-06-19.md) | Repo/R2 files already removed in cleanup pass. |
| [`docs/live-url-sitemap.md`](docs/live-url-sitemap.md) | Live public/admin/dashboard/CMS route inventory. |
| [`docs/companions-brand-readme.md`](docs/companions-brand-readme.md) | Brand voice, copy system, page copy direction. |
| [`docs/sam-todo-final-polish-sprint.md`](docs/sam-todo-final-polish-sprint.md) | Historical polish checklist — superseded by README [Maintenance Backlog](#maintenance-backlog-post-handoff). |

---

## Current Brand / Theme Call

Keep the current theme for now. It is good enough to become great.

The biggest issues are not the overall visual direction. The priority is to finish the content, contrast, CMS editing/publish path, database connections, and dashboard operational screens.

Typography direction currently reads like a modern Inter / Geist / SF Pro-style sans system. Keep the clean sans direction with strong 800/900 headings and readable 400/500 body text. Do not bring Facebook flyer-style script fonts into the primary UI except as a rare decorative accent later.

Core brand message:

> Every dog deserves someone in their corner.

Brand positioning:

> Companions of CPAS helps dogs at Caddo Parish Animal Services receive medical care, transport support, foster placement, adoption visibility, and a safer path forward.

---

## Local Development

```bash
npm install
npm run dev       # wrangler dev — uses wrangler.toml
npm run deploy    # wrangler deploy — deploys to Cloudflare
```

Local secrets go in `.dev.vars` (not committed):

```bash
RESEND_API_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
AGENTSAM_BRIDGE_TOKEN=...
```

Wrangler config: `wrangler.toml`.

Never put real secrets in `wrangler.toml`. Use `wrangler secret put` for credentials.

---

## Route Map

See [`docs/live-url-sitemap.md`](docs/live-url-sitemap.md) for the detailed live URL sitemap and route-by-route notes.

**Public**

| Route | Pipeline | Notes |
|---|---|---|
| `/` | Fragment (custom) | 7 sections in `static/pages/home/`. Reference implementation. |
| `/about` | Fragment (custom) | 5 sections in `static/pages/about/`. Uses `shared.css` design system. |
| `/services` | Fragment (generic) | Foster page. Nav label "Foster"; route stays `/services`. |
| `/adopt` | Fragment (generic) | Adoptable dogs. May need animal grid D1 content restored. |
| `/community` | Fragment (generic) | Curated stories; not a raw Facebook dump. |
| `/donate` | Fragment (generic) | CTAs open donate modal (`data-action="donate"`). Stripe test mode. |

**Admin / Auth**

| Route | Notes |
|---|---|
| `/admin/login` | Serves `admin/login.html` from R2. Entry point for custom login and Google OAuth. |
| `/admin/reset-password` | Password reset flow. |
| `/dashboard/*` | Auth-gated dashboard SPA. |

**Dashboard routes — live status (Jun 2026)**

| Route | Status |
|---|---|
| `/dashboard/overview` | Mixed — partial API; mock deltas/sparklines |
| `/dashboard/animals`, `/dashboard/animals/:id` | Live — CRUD, foster placement, publish |
| `/dashboard/intakes`, `/dashboard/medical` | Live — R2 PDF lanes |
| `/dashboard/daily-care` | Stub — mock UI only |
| `/dashboard/fosters` | Live — active placements |
| `/dashboard/adoptions` | Live — approved foster apps (naming caveat) |
| `/dashboard/applications` | Live — `cpas_foster_applications` |
| `/dashboard/volunteers` | Live — roster + Add Volunteer |
| `/dashboard/donations`, `/dashboard/fundraising` | Live — `fundraising_campaigns` (not demo table) |
| `/dashboard/cms/*` | Live — pages read status from D1 |
| `/dashboard/reports` | Partial — Financial live; AI/Volunteers/Animals tabs have seed fallbacks |
| `/dashboard/settings` | Shell |
| `/dashboard/notifications` | Redirects to `/dashboard/email?view=notifications` |
| `/dashboard/email` | Live — Gmail + Resend inbox |

Full route → file → API map: [`docs/current-file-map.md`](docs/current-file-map.md).

**API**

| Prefix | Handler |
|---|---|
| `/api/health` | Inline in `index.js` |
| `/api/auth/*` | `auth_login.js`, `session_api.js`, `password_reset.js` |
| `/api/cms/*` | `cms_api.js` |
| `/api/social/*` | `social.js` |
| `/api/agentsam/*` | `agentsam_api.js`, `agentsam_tools.js` |
| `/api/dashboard/*` | `dashboard_api.js`, `dashboard_config_api.js` — includes `POST/PATCH /api/dashboard/fosters`, `GET/POST /api/dashboard/volunteers` |
| `/api/donations/*` | `payments_email.js` + `donation_api.js` — config, intent, create-intent (adopt), subscribe, webhook |
| `/api/contact` | `contact_api.js` |
| `/api/foster/*` | `foster_api.js` |

---

## Worker Bindings

| Binding | Type | Value | ID |
|---|---|---|---|
| `DB` | D1 | `companionscpas` | `fd6dd6fb-156b-4b6a-8ff0-505422652391` |
| `WEBSITE_ASSETS` | R2 | `companionscpas` | — |
| `CMS_CACHE` | KV | `companionscpas-cache` | `0b410337a8494fc982ea04c5bde1eab4` |
| `AGENTSAM_WAI` | Workers AI | — | — |

---

## Environment Variables

Set non-secret values in Wrangler config and secrets via `wrangler secret put`:

```bash
APP_DOMAIN            = companionsofcaddo.org
ALLOWED_ORIGINS       = https://companionsofcaddo.org
META_APP_ID           = Meta Developer App ID
META_APP_SECRET       = wrangler secret put META_APP_SECRET
META_REDIRECT_URI     = https://companionsofcaddo.org/api/social/oauth/meta/callback
GOOGLE_CLIENT_ID      = Google OAuth client ID
GOOGLE_CLIENT_SECRET  = wrangler secret put GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI   = https://companionsofcaddo.org/api/social/oauth/youtube/callback
ADMIN_EMAIL           = Notification recipient
RESEND_FROM_EMAIL     = Outbound email sender
STRIPE_SECRET_KEY     = wrangler secret put STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY = wrangler secret put STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET = wrangler secret put STRIPE_WEBHOOK_SECRET
RESEND_API_KEY        = wrangler secret put RESEND_API_KEY
```

---

## Mobile Dashboard Shell

Dashboard shell was desktop-only before this sprint. It now has a strong mobile foundation.

Changes made:

- `MOBILE_BREAKPOINT = 900` — breakpoint used in both JS and CSS.
- Below 900px: sidebar is hidden, content is full-width, mobile top bar renders.
- Mobile top bar: hamburger on left, section title centered, Agent Sam button on right.
- `MobileNavDrawer`: glassmorphic slide-in drawer from left.
  - Backdrop: `rgba(0,0,0,.55)` with `backdrop-filter: blur(10px)`.
  - Drawer: `clamp(280px, 68vw, 340px)` wide, max `calc(100vw - 56px)`.
  - Body scroll locked while open with `body.cpas-mobile-nav-open`.
  - Closes on backdrop click, Escape key, and nav item click.
  - Nav grouped into Rescue Operations / Public Presence / Administration.
- `useIsMobile(900)` and `useIsNarrow(520)` hooks exported to `window` for use in any view.
- `OverviewView` uses responsive grids:
  - Stats: `1fr` narrow / `repeat(2,minmax(0,1fr))` mobile / `repeat(auto-fit,minmax(160px,1fr))` desktop.
  - Middle row: `1fr` mobile / `1fr 1.6fr` desktop.
  - Recent animals: `1fr` / `repeat(2,...)` / `repeat(5,1fr)`.
  - Bottom row: `1fr` mobile / `1fr 1fr 1fr` desktop.
- CSS helpers in `public/dashboard/index.html`:
  - `.cpas-mobile-only` / `.cpas-desktop-only` visibility toggles.
  - `body.cpas-mobile-nav-open` scroll lock.
  - `body { overflow-x: hidden }` below 900px.
  - `#root { overflow-x: hidden }`.

Target: no horizontal scroll at 375px, no clipped cards, sidebar hidden below 900px.

---

## Facebook / Social Integration Plan

Two separate integration lanes. **Lane A is in scope today. Lane B is explicitly deferred** until the client approves Meta app review and publishing risk.

### Lane A — Public website Facebook embed (low risk, current)

- No publishing permissions required.
- Facebook Page Plugin on `/community`.
- Config in `social_embed_settings` D1 table.
- `GET /api/social/embed/facebook-page` / `POST /api/social/embed/facebook-page`
- Must gracefully fail if Facebook blocks embed.

### Lane B — Dashboard social publishing (future — not in handoff)

**Planned for a later sprint after explicit client approval.** Do not enable or imply live publishing until complete.

- Requires Meta Developer App and app review.
- Requires Facebook Login for Business / page permissions.
- `GET /api/social/status` — shows whether credentials are configured.
- `GET /api/social/oauth/meta/start` — begins Meta OAuth when `META_APP_ID` exists.
- `GET /api/social/oauth/meta/callback` — remains stubbed until `META_APP_SECRET`, CSRF state persistence, and token encryption are ready.
- `POST /api/social/facebook/page-posts` — must return **501** until page token is connected and real publishing is implemented.
- **Real publish calls must never silently succeed.**

Handler: `src/api/social.js`. Migration: `db/schema_social.sql` (`social_provider_connections`, `social_embed_settings`, `social_post_drafts_v2`).

---

## Agent Sam / AI Cost Ownership

Agent Sam chat (`agentsam.jsx`) and Reports → **AI Usage** are live but need a **dedicated refresh sprint** (not part of June 2026 handoff).

**Known issues (Jun 2026):**

- `view-reports.jsx` fetches `/api/agentsam/runs` but the AI Usage tab renders a **hardcoded seed object** (placeholder model names like `gpt-5.4-mini`, fixed run/cost totals) instead of API data.
- Agent Sam chat can fail with provider capacity errors (e.g. Workers AI / routed models); error handling needs hardening.
- Cost ownership policy (who pays for inference) must be decided before expanding Agent Sam drafting in production.

**Policy before expanded client use:**

1. Client provides their own API provider key, OR
2. AI drafting stays disabled, OR
3. Managed monthly plan with explicit included usage, OR
4. Usage capped and visible from **real** `agentsam_usage_events` / rollups (not mock report seeds).

Never silently run client production AI drafting on Inner Animal's accounts after handoff.

Planned config vars:

```bash
AI_PROVIDER_MODE = "disabled" | "client_key" | "managed"
AI_MONTHLY_TOKEN_CAP = 500000
AI_USAGE_VISIBLE_TO_ADMIN = true
```

Backend: `agentsam_api.js`, `agentsam_tools.js`, `resolveModel.js`. Canonical tables: `agentsam_tools`, `agentsam_workflows`, `agentsam_usage_events` (not `agentsam_mcp_*` legacy tables).

**Phase 2 build plan (tool picker, approval queue, bio/app/campaign flows, live overview stats):** [`docs/AGENTSAM_CPAS_ROADMAP.md`](docs/AGENTSAM_CPAS_ROADMAP.md).

---

## D1 / R2 / KV Checklist

- D1 database: `companionscpas` (id: `fd6dd6fb-156b-4b6a-8ff0-505422652391`)
- R2 bucket: `companionscpas` (binding `WEBSITE_ASSETS`). CDN: `https://assets.companionsofcaddo.org/`
- KV namespace: `CMS_CACHE` (id: `0b410337a8494fc982ea04c5bde1eab4`)
- Public pages: D1 sections → R2 fragments → assemble → KV `page:{route}`
- After Worker/render changes: `npm run deploy` + bust affected `page:*` KV keys
- After CSS/JS changes: push to R2 + bump `src/api/page_shell.js` versions + bust KV
- After D1 content-only changes: CMS save or `node scripts/sync-page-fragments.mjs` (auto-busts KV on save)

```bash
# Bust one page
npx wrangler kv key delete "page:/donate" --namespace-id 0b410337a8494fc982ea04c5bde1eab4 --remote

# Bust all public pages
for r in / /about /services /adopt /donate /community; do
  npx wrangler kv key delete "page:$r" --namespace-id 0b410337a8494fc982ea04c5bde1eab4 --remote
done

# Sync generic route fragments from D1
node scripts/sync-page-fragments.mjs /services
```

See [Sectionalized CMS System](#sectionalized-cms-system) for the full ops reference.

---

## Maintenance Backlog (post-handoff)

Not blockers for invoicing. Track in [`docs/current-file-map.md`](docs/current-file-map.md).

### Done in June 2026 handoff

- Foster placement API + animal profile UI + fosters list
- Volunteers `GET/POST` + Add Volunteer form
- Applications on `cpas_foster_applications`; legacy `applications` table cleared
- CMS pages list reads `status` from D1
- Repo cleanup pass — see [`docs/cleanup-report-2026-06-19.md`](docs/cleanup-report-2026-06-19.md)

### CMS / public site

- Block-level editing for card-heavy sections (tiers, stats, campaigns)
- `/dashboard/cms/brand` as org identity source of truth
- `/adopt` animal grid depth from `animal_profiles`
- Live Stripe keys after client sign-off

### Dashboard polish

- Wire Overview / Daily Care to APIs or label demo metrics explicitly
- Fix Reports tabs to use fetched data (especially AI Usage — see [Agent Sam section](#agent-sam--ai-cost-ownership))
- Settings: organization, users, roles, integrations
- Emoji removal in `view-ops.jsx`, `view-finance.jsx` (per file map)

### Social (Lane B — future)

- Meta Developer App + client approval
- OAuth state persistence, token encryption, real Graph API publish (never fake success)

### Agent Sam refresh sprint

See [`docs/AGENTSAM_CPAS_ROADMAP.md`](docs/AGENTSAM_CPAS_ROADMAP.md) for sprint order and tool wiring.

- Reports AI Usage from real `/api/agentsam/runs` + rollups
- Chat error handling and model routing cleanup
- AI billing owner decision documented in dashboard
- Tool picker, approval queue, `generate_animal_bio` / `draft_app_response` (roadmap Sprints 1–2)

### Infra

- Resend inbound webhook hardening if needed
- Account transfer to client Cloudflare when approved

---

## Hard Rules

- No emojis anywhere: UI copy, README, comments, commit messages, labels, generated content.
- No hardcoded secrets: all credentials via `wrangler secret put` or provider UI.
- No fake publish success: all social publish routes return 501 until real tokens are configured.
- No social publishing without explicit client approval.
- No AI drafting on Sam's bill after handoff unless a managed plan is approved and documented.
- Every codebase change must leave the repo in a working state before and after.
- Do not polish fake data into production-looking UI.

---

## Source File Map (live)

**Authoritative dashboard detail:** [`docs/current-file-map.md`](docs/current-file-map.md)

```text
src/
  index.js                         Worker entry, auth gate, public serve, API dispatch
  api/
    dashboard_api.js               Dashboard CRUD: animals, fosters POST/PATCH, volunteers,
                                     applications, fundraising, donations, intakes, medical
    dashboard_config_api.js        Dashboard config snapshot
    cms_api.js                     CMS bootstrap, save, publish, assets, brand
    page_cms_registry.js             Fragment route registry (6 public pages)
    page_shell.js                  Public script tags + cache-bust versions
    home_cms_sync.js               Home D1 ↔ R2 fragments
    about_cms_sync.js              About D1 ↔ R2 fragments
    generic_page_cms_sync.js       Services / adopt / donate / community sync
    render_home_section.js         Home section renderers
    render_about_section.js        About section renderers
    render_section.js              Generic sections + CTA resolver
    render_home_fragments.js       Assemble /
    render_about_fragments.js      Assemble /about
    render_generic_fragments.js    Assemble generic routes
    render_donate_v2.js            Donate dynamic hero
    render_shelter_hub.js          Adopt shelter hub
    render_page.js                 assembleFullPage(), legacy renderPage() fallback
    render_site_nav.js             Header / footer / nav
    foster_api.js                  Public POST /api/foster/apply
    payments_email.js              Stripe + receipts + webhook
    donation_api.js                Legacy adopt create-intent
    donation_fees.js               Cover-fees math
    email_api.js                   Inbound email + drafts
    gmail_api.js                   Gmail OAuth
    drive_api.js                   Google Drive import → R2
    social.js                      Lane A embed + Lane B stubs (501)
    contact_api.js                 Public contact form
    notifications.js               Dashboard notification writes
    agentsam_api.js                Agent Sam chat + runs
    agentsam_tools.js              Tool dispatch
    resolveModel.js                Model routing + usage rollups
    auth_login.js, auth_google.js, session_api.js, password_reset.js
    members_api.js                 Team admin (settings lane)

public/dashboard/js/
  app.jsx                          Router + session + mobile shell
  ui.jsx                           Shared components
  data.js                          API bootstrap (mock fallback — see file map)
  config.js                        Dashboard config loader
  view-overview.jsx                Overview (mixed mock/live)
  view-animals.jsx                 Animals, profile, fosters list, adoptions
  view-applications.jsx            Applications list + detail
  view-ops.jsx                     Intakes, medical, volunteers
  view-finance.jsx                 Donations + fundraising
  view-campaign.jsx                Campaign workspace editor
  view-cms.jsx                     All CMS views
  view-reports.jsx                 Reports (partial — AI tab seeded)
  view-email.jsx                   Email + notifications workspace
  view-admin.jsx                   Settings shell (+ stale Reports stub — do not use)
  agentsam.jsx                     Agent Sam chat drawer

public/
  _shared.css, _shared.js          Public design system (sync to R2)
  static/global/cpas-modals.js     Foster / volunteer / contact modals
  static/js/donate-modal.js        Stripe donate modal

static/global/
  cpas-header.html, cpas-footer.html   R2 shell partials

scripts/ (ops — keep)
  sync-r2.sh                       npm run sync
  sync-page-fragments.mjs          Generic CMS → R2
  republish-shell-pages.mjs          Home/about republish + KV bust
  audit_public_images.py             Handoff image validation
```

---

## Files candidates for removal (not deleted yet)

Safe to cut in a future housekeeping pass. **Do not delete without confirming no import/reference.**

### One-off build / patch scripts (historical)

Most `scripts/patch_*.py`, `scripts/fix_*.py`, `scripts/repair_*.py`, `scripts/phase*.py`, `scripts/nuke_*.py`, `scripts/build_dashboard_full.py`, `scripts/build_full_cms_editor_system.py`, `scripts/install_agentsam_drawer.py` — used during June 2026 remaster; superseded by CMS fragment pipeline and live dashboard.

### Generated / snapshot docs

| Path | Reason |
|---|---|
| `audits/` (entire tree) | Point-in-time Agent Sam + remaster audits |
| `audits/companionscpas/remaster_proposal.md` | Pre-cleanup proposal; many items done |
| `docs/sam-todo-final-polish-sprint.md` | Superseded by README maintenance backlog |
| `docs/sam-todo-2026-06-19-client-handoff.md` | Point-in-time handoff notes (Google Drive) |
| `docs/donate-v2-mockup.txt` | Design mockup artifact |
| `docs/cleanup-report-2026-06-19.json` | Machine snapshot; keep `.md` summary only if desired |
| `docs/live-url-file-map.json` | Regenerate via `scripts/live_url_file_map.py` |

### Demo DB artifacts (keep migrations; optional seed purge)

| Path | Reason |
|---|---|
| `db/seed_dashboard_demo.sql` | Seeds `fundraising_campaigns_demo` |
| `db/schema_dashboard_demo.sql` | Demo table definitions (`adoption_applications_demo`, etc.) |
| `db/seed_cpas_platform_demo_workflows_safe.sql` | Commented demo workflows only |

### Dead / duplicate frontend

| Path | Reason |
|---|---|
| `view-admin.jsx` inner `ReportsView` | Stale duplicate; active reports in `view-reports.jsx` |

### D1 legacy tables

**Dropped from live D1 (2026-06-23):** `applications`, `agentsam_mcp_tools`, `agentsam_mcp_workflows`, `cms_editor_sessions`, `cms_editor_events`. See [`docs/HANDOFF.md`](docs/HANDOFF.md) for canonical vs legacy guidance and the defer list (`contact_requests`, `social_post_drafts`, `cms_navigation_items`, etc.).

---

## Client Handoff Notes

**Domain:** `companionsofcaddo.org` — registered and active on Cloudflare, custom domain wired to Worker.

**Account transfer:** site is currently hosted under Inner Animal Media's Cloudflare account. Upon final client approval, transfer process is: client creates Cloudflare account, Worker is redeployed, D1/R2/KV are migrated, and domain is transferred via Cloudflare dashboard push/accept flow.

**Client self-service target:** edit page content via dashboard CMS, upload photos, update animal records, review donations/applications, and use Agent Sam for content writing only under approved billing/usage terms.

**Not self-service:** deploying Worker code, rotating secrets, running D1 migrations, configuring Meta app credentials, or enabling social publishing.

**Resend:** outbound account/domain setup is done or in progress separately; inbound webhook still needs to be configured before `/dashboard/email` becomes reliable.

---

Developed and maintained by [Inner Animal Media](https://inneranimalmedia.com) — sam@inneranimalmedia.com
