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

This platform combines a public-facing rescue website with a private admin dashboard. Public pages are rendered from D1 CMS data, cached in KV, and served as R2 artifacts. Dashboard assets are served from R2 and rendered in the browser as a React SPA using Babel standalone.

The current direction is to keep and refine the existing visual system rather than replacing it. The theme already has a strong foundation: modern sans typography, emotional dog photography, rounded cards, dark/light contrast, and a memorable purple accent. The next pass should focus on brand copy, dashboard contrast, CMS publish reliability, D1/KV/R2 plumbing, and making settings/templates/reports feel finished instead of mocked.

---

## Documentation Index

| Document | Purpose |
|---|---|
| [`docs/live-url-sitemap.md`](docs/live-url-sitemap.md) | Live public/admin/dashboard/CMS route inventory with status notes and integration reminders. |
| [`docs/companions-brand-readme.md`](docs/companions-brand-readme.md) | Brand identity, voice, copy system, audience guidance, page copy direction, and dashboard language rules. |
| [`docs/sam-todo-final-polish-sprint.md`](docs/sam-todo-final-polish-sprint.md) | Tomorrow's systematic polish sprint for brand identity, dashboard CRUD/CMS reliability, page publishing, reports, settings, and email. |

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

| Route | Handler | Notes |
|---|---|---|
| `/` | `servePublicPage` | Home. D1/KV/R2 public page pipeline. |
| `/about` | `servePublicPage` | About. Hero/layout needs final cleanup. |
| `/services` | `servePublicPage` | Foster page. Public nav label is Foster; route currently remains `/services`. |
| `/adopt` | `servePublicPage` | Adoptable dog discovery. Needs animal D1/R2 verification. |
| `/community` | `servePublicPage` | Community stories/social proof. Use curated content, not a Facebook dump. |
| `/donate` | `servePublicPage` | Donation purpose and outcome-based giving. |

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
| `/dashboard/notifications` | Internal alerts/reminders/status updates. |
| `/dashboard/email` | Resend inbound email/applications/messages. Needs webhook setup. |

**API**

| Prefix | Handler |
|---|---|
| `/api/health` | Inline in `index.js` |
| `/api/auth/*` | `auth_login.js`, `session_api.js`, `password_reset.js` |
| `/api/cms/*` | `cms_api.js` |
| `/api/social/*` | `social.js` |
| `/api/agentsam/*` | `agentsam_api.js`, `agentsam_tools.js` |
| `/api/dashboard/*` | `dashboard_api.js`, `dashboard_config_api.js` |
| `/api/donations/*` | `donation_api.js`, `payments_email.js` |
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

- D1 database: `companionscpas`.
- R2 bucket: `companionscpas` with binding `WEBSITE_ASSETS`.
- KV namespace: `companionscpas-cache` with binding `CMS_CACHE`.
- Dashboard and public assets must be synced to R2 before live verification.
- Purge KV cache after any public page, theme, or brand artifact update.

Example cache purge:

```bash
wrangler kv key delete --binding=CMS_CACHE "page:/community"
wrangler kv key delete --binding=CMS_CACHE "bootstrap:tenant_companionscpas"
```

Tomorrow's rule: for every page, identify what is D1-rendered, what is KV-cached, what is R2-backed, what is hardcoded, and what is demo data.

---

## Development TODO

For the full polish sequence, use [`docs/sam-todo-final-polish-sprint.md`](docs/sam-todo-final-polish-sprint.md).

### Content / CMS

- Make `/dashboard/cms/brand` the real source of truth for org identity, footer, logos, theme tokens, social URLs, and contact points.
- Refine page-by-page copy using [`docs/companions-brand-readme.md`](docs/companions-brand-readme.md).
- Confirm CMS edits publish reliably to live routes through D1/KV/R2.
- Remove duplicate hero/body copy.
- Repair `/about` hero layout.
- Keep `/services` as the Foster route for now unless client requests a route change.
- Make `/community` curated and story-driven instead of a raw Facebook feed.
- Make `/donate` outcome-based: medical care, transport support, foster support, general mission.

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
  index.js                   Worker entry. All request routing.
  api/
    _shell.js                Shared HTML shell. getBrand() from D1+KV.
    agentsam_api.js          Agent Sam chat + session management.
    agentsam_tools.js        DB-driven tool dispatch.
    auth_login.js            Login: validates credentials, writes sessions.
    cms_api.js               CMS CRUD: section/block/page/brand/asset + publish stub.
    cms_api_additions.js     Extended CMS routes.
    contact_api.js           Public contact form.
    dashboard_api.js         Dashboard data endpoints.
    dashboard_config_api.js  Dashboard config (DB-driven).
    donation_api.js          Stripe checkout intent creation.
    foster_api.js            Foster/adoption application flow.
    password_reset.js        Password reset flow.
    payments_email.js        Stripe webhook + Resend email.
    render_home.js           Homepage renderer reference implementation.
    render_page.js           Full page render pipeline.
    resolveModel.js          LLM routing + ETO sync to IAM.
    session_api.js           getAuthUser() + /api/auth/me + /api/auth/logout.
    social.js                Social provider OAuth, embed config, publish scaffold.

public/
  dashboard/
    index.html               Dashboard SPA shell. Mobile CSS helpers here.
    js/
      app.jsx                App router. isMobile state, MobileNavDrawer mount.
      ui.jsx                 Shared components. useIsMobile, MobileNavDrawer, TopBar.
      view-overview.jsx      Dashboard home. Responsive grids.
      view-cms.jsx           CMS editor view.
      [other views]

migration/
  d1/
    social_integrations.sql  social_provider_connections, social_embed_settings, social_post_drafts_v2.
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
