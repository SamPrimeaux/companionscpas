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

**Start here tomorrow:** read [Sectionalized CMS System](#sectionalized-cms-system) below, then the per-page docs in `docs/`.

---

## Sectionalized CMS System

> Last updated: 2026-06-14. This is the canonical handoff for continuing CMS/public-site work.

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

### Where to pick up tomorrow

| Area | Status | Next step |
|---|---|---|
| Fragment pipeline (all 6 routes) | Working | Refine section types / block editor UI |
| Home + About custom renderers | Reference implementations | Use as templates when remastering other pages |
| Generic pages (`render_section.js`) | Working; uses `shared.css` classes | Tune D1 content per page; add block-level CMS editing |
| Donate modal + CTAs | Working (Stripe test mode) | Client sign-off on UI; then live Stripe keys |
| Apply modals (foster/volunteer/contact) | Modular in `cpas-modals.js` | Wire more CTAs via `data-modal` / `cta_action` |
| CMS preview iframe | Working | Continue contrast/layout polish in dashboard |
| `/adopt` animal grid | Thinner than old baked page | Restore animal D1-driven grid/modal if needed |
| Block editor UI | Section-level only | Add block editing for card-heavy sections (tiers, campaigns, stats) |

Deeper schema/API reference: [`ARCHITECTURE.md`](ARCHITECTURE.md). Dashboard file ownership: [`docs/current-file-map.md`](docs/current-file-map.md).

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
| [`docs/current-file-map.md`](docs/current-file-map.md) | Dashboard route → file → API → table ownership map. |
| [`docs/live-url-sitemap.md`](docs/live-url-sitemap.md) | Live public/admin/dashboard/CMS route inventory. |
| [`docs/companions-brand-readme.md`](docs/companions-brand-readme.md) | Brand voice, copy system, page copy direction. |
| [`docs/sam-todo-final-polish-sprint.md`](docs/sam-todo-final-polish-sprint.md) | Polish sprint checklist (dashboard, reports, settings). |

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

**Dashboard / CMS routes to keep refining**

| Route | Focus |
|---|---|
| `/dashboard/overview` | Real overview metrics and mobile shell polish. |
| `/dashboard/animals` | Animal CRUD, image connection, public visibility. |
| `/dashboard/intakes` | Intake records and animal profile relationship. |
| `/dashboard/medical` | Medical status, care notes, and cost tracking. |
| `/dashboard/daily-care` | Care tracking; keep only if useful for this client. |
| `/dashboard/fosters` | Foster homes, foster needs, placements. |
| `/dashboard/adoptions` | Adoption tracking and inquiry flow. |
| `/dashboard/applications` | Foster/adoption application intake. |
| `/dashboard/volunteers` | Volunteer roster, roles, availability, notes. |
| `/dashboard/donations` | Donation records and verification. |
| `/dashboard/fundraising` | Campaigns, transport/medical funds, giving goals. |
| `/dashboard/cms/website` | Website management hub. |
| `/dashboard/cms/pages` | Page editor and publish workflow. |
| `/dashboard/cms/images` | R2 media library, tags, alt text, selection flow. |
| `/dashboard/cms/brand` | Brand source of truth. Tomorrow priority. |
| `/dashboard/cms/templates` | Template library. Needs full-screen responsive enhancement. |
| `/dashboard/reports` | Real-data reports; remove or label demo data. |
| `/dashboard/settings` | Real operational settings, users, roles, integrations. |
| `/dashboard/notifications` | Redirects to `/dashboard/email?view=notifications` (legacy URL) |
| `/dashboard/email` | Gmail + Resend inbox; **Notifications** smart view (donations, contact forms, foster apps) |

**API**

| Prefix | Handler |
|---|---|
| `/api/health` | Inline in `index.js` |
| `/api/auth/*` | `auth_login.js`, `session_api.js`, `password_reset.js` |
| `/api/cms/*` | `cms_api.js` |
| `/api/social/*` | `social.js` |
| `/api/agentsam/*` | `agentsam_api.js`, `agentsam_tools.js` |
| `/api/dashboard/*` | `dashboard_api.js`, `dashboard_config_api.js` |
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

Two separate integration lanes:

### Lane A — Public website Facebook embed

Low risk.

- No publishing permissions required.
- Uses Facebook Page Plugin embedded on `/community`.
- Config stored in `social_embed_settings` D1 table.
- `GET /api/social/embed/facebook-page` returns current embed config.
- `POST /api/social/embed/facebook-page` lets admin save page URL and options.
- Must gracefully fail if Facebook blocks embed, cookies, or tracking.

### Lane B — Dashboard social publishing

Higher risk.

- Requires Meta Developer App and app review.
- Requires Facebook Login for Business / page permissions.
- Requires explicit client approval before activation.
- `GET /api/social/status` shows whether credentials are configured.
- `GET /api/social/oauth/meta/start` begins Meta OAuth flow when `META_APP_ID` exists.
- `GET /api/social/oauth/meta/callback` remains stubbed until `META_APP_SECRET`, CSRF state persistence, and token encryption are ready.
- `POST /api/social/facebook/page-posts` must return 501 until page token is connected and real publishing is implemented.
- Real publish calls must never silently succeed.

Migration: `migration/d1/social_integrations.sql` adds `social_provider_connections`, `social_embed_settings`, and `social_post_drafts_v2`.

---

## AI / API Cost Ownership

Agent Sam social drafting must satisfy one of these before client handoff:

1. Client provides their own OpenAI/API provider key.
2. AI drafting is disabled.
3. Client is on a managed monthly plan with explicit included usage.
4. Usage is capped and visible in the dashboard.

Never silently run client production AI drafting on Sam's OpenAI account after handoff.

Planned config vars:

```bash
AI_PROVIDER_MODE = "disabled" | "client_key" | "managed"
AI_MONTHLY_TOKEN_CAP = 500000
AI_USAGE_VISIBLE_TO_ADMIN = true
```

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

## Development TODO

For the full polish sequence, use [`docs/sam-todo-final-polish-sprint.md`](docs/sam-todo-final-polish-sprint.md).

### Content / CMS (fragment system)

- All six public routes use the fragment pipeline — see [Sectionalized CMS System](#sectionalized-cms-system).
- Make `/dashboard/cms/brand` the source of truth for org identity, logos, theme tokens, footer.
- Add block-level editing in CMS for card-heavy sections (tiers, stats, campaigns).
- Refine page copy per [`docs/companions-brand-readme.md`](docs/companions-brand-readme.md).
- `/adopt`: verify animal grid renders from `animal_profiles` D1 data.
- `/community`: keep curated story-driven content.
- Stripe: client UI sign-off on donate modal, then swap to live keys.

### Dashboard / CRUD / CMS

- Verify Animals CRUD and Adopt page public rendering.
- Verify R2 media library upload, tagging, alt text, copy URL, selection, and public render.
- Fix low-contrast dashboard text/buttons.
- Improve `/dashboard/cms/templates` with previews, categories, and full-screen responsive layout.
- Improve `/dashboard/reports` with real data or clearly marked empty states.
- Overhaul `/dashboard/settings` into real settings: organization, users, roles, integrations, notifications, email, billing/usage boundaries.
- Wire `/dashboard/email` to Resend inbound once webhook is configured.

### Social / Facebook

- Run `migration/d1/social_integrations.sql` on D1 if not already applied.
- Configure Facebook Page embed URL via `POST /api/social/embed/facebook-page`.
- Create Meta Developer App if social publishing is approved.
- Add `META_APP_ID` and `META_APP_SECRET` via Wrangler secrets.
- Implement OAuth state token persistence before enabling live OAuth.
- Implement token encryption before storing page access tokens.
- Submit Meta app review if `pages_manage_posts` permission is required.
- Wire token decryption and Meta Graph API call only after client approval.

### Deploy / Infra

- Confirm `APP_DOMAIN`, `ALLOWED_ORIGINS`, `GOOGLE_REDIRECT_URI`, and `META_REDIRECT_URI` use `companionsofcaddo.org`.
- Decide AI billing owner before enabling Agent Sam social drafting.
- Deploy and verify live Worker after domain env var updates.
- Sync updated R2 dashboard assets.
- Purge KV cache for all public routes after deploy.
- Complete Resend inbound webhook setup before relying on `/dashboard/email`.

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

## Source File Map

```text
src/
  index.js                      Worker entry. servePublicPage(), fragment assembly branch.
  api/
    page_cms_registry.js        Route → fragment module registry (6 public pages).
    page_shell.js                 Shared public script tags + cache-bust versions.
    home_cms_sync.js              Home D1 ↔ R2 fragment sync.
    about_cms_sync.js             About D1 ↔ R2 fragment sync.
    generic_page_cms_sync.js      Services/adopt/donate/community sync.
    render_home_section.js        Home section renderers (custom).
    render_about_section.js       About section renderers (custom).
    render_section.js             Generic section renderers + unified CTA resolver.
    render_home_fragments.js      Assemble home from R2 fragments.
    render_about_fragments.js     Assemble about from R2 fragments.
    render_generic_fragments.js   Assemble generic routes from R2 fragments.
    render_page.js                assembleFullPage(), getBrand(), legacy renderPage().
    cms_api.js                    CMS CRUD, save/preview/publish/bootstrap.
    payments_email.js             Stripe config/intent/webhook, Resend email, cover fees.
    donation_api.js               Legacy adopt create-intent (same fee math as modal).
    donation_fees.js              Shared Stripe fee gross-up helpers.
    notifications.js              Dashboard notifications (donations, contact, foster).
    foster_api.js                 Foster application API (modal posts here).

public/
  _shared.css                     Source for static/global/shared.css (upload to R2).
  static/
    global/
      cpas-modals.js              Foster/volunteer/contact apply popups.
      shared.js                   Nav + footer (upload to R2).
    js/
      donate-modal.js             Stripe donate modal + cover processing fees (global).

static/
  global/
    cpas-header.html              Site header partial (R2).
    cpas-footer.html              Site footer partial (R2).
  pages/
    home/                         Local copies of home section fragments.
    about/                        Local copies of about section fragments.

scripts/
  sync-page-fragments.mjs         CLI: D1 → R2 for generic routes.
  republish-shell-pages.mjs       Rebuild home/about HTML + bust KV.
```

---

## Client Handoff Notes

**Domain:** `companionsofcaddo.org` — registered and active on Cloudflare, custom domain wired to Worker.

**Account transfer:** site is currently hosted under Inner Animal Media's Cloudflare account. Upon final client approval, transfer process is: client creates Cloudflare account, Worker is redeployed, D1/R2/KV are migrated, and domain is transferred via Cloudflare dashboard push/accept flow.

**Client self-service target:** edit page content via dashboard CMS, upload photos, update animal records, review donations/applications, and use Agent Sam for content writing only under approved billing/usage terms.

**Not self-service:** deploying Worker code, rotating secrets, running D1 migrations, configuring Meta app credentials, or enabling social publishing.

**Resend:** outbound account/domain setup is done or in progress separately; inbound webhook still needs to be configured before `/dashboard/email` becomes reliable.

---

Developed and maintained by [Inner Animal Media](https://inneranimalmedia.com) — sam@inneranimalmedia.com
