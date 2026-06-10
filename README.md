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

---

## Local Development

```bash
npm install
npm run dev       # wrangler dev — uses wrangler.toml
npm run deploy    # wrangler deploy — deploys to Cloudflare
```

Local secrets go in `.dev.vars` (not committed):

```
RESEND_API_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
AGENTSAM_BRIDGE_TOKEN=...
```

Wrangler config: `wrangler.toml` (not `wrangler.production.toml`).

---

## Route Map

**Public**

| Route | Handler | Notes |
|---|---|---|
| `/` | `servePublicPage` | D1-driven via `render_home.js` |
| `/about` | `servePublicPage` | KV/R2 artifact |
| `/community` | `servePublicPage` | Added this sprint — CMS artifact needed |
| `/adopt` | `servePublicPage` | KV/R2 artifact |
| `/services` | `servePublicPage` | KV/R2 artifact |
| `/donate` | `servePublicPage` | KV/R2 artifact |

**Admin**

| Route | Notes |
|---|---|
| `/admin/login` | Serves `admin/login.html` from R2 |
| `/dashboard` | Auth-gated, serves dashboard SPA |

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

Set in `wrangler.toml` (non-secret) or via `wrangler secret put` (secret):

```
APP_DOMAIN            = companionsofcaddo.org
ALLOWED_ORIGINS       = https://companionsofcaddo.org
META_APP_ID           — Meta Developer App ID (Facebook/Instagram OAuth)
META_APP_SECRET       — wrangler secret put META_APP_SECRET
META_REDIRECT_URI     = https://companionsofcaddo.org/api/social/oauth/meta/callback
GOOGLE_CLIENT_ID      — Google OAuth client ID (YouTube)
GOOGLE_CLIENT_SECRET  — wrangler secret put GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI   = https://companionsofcaddo.org/api/social/oauth/youtube/callback
ADMIN_EMAIL           — Notification recipient
RESEND_FROM_EMAIL     — Outbound email sender (pending companionsofcaddo.org DNS on Resend)
STRIPE_SECRET_KEY     — wrangler secret put STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET — wrangler secret put STRIPE_WEBHOOK_SECRET
RESEND_API_KEY        — wrangler secret put RESEND_API_KEY
```

Never put real secrets in `wrangler.toml`. Use `wrangler secret put` for all credentials.

---

## Mobile Dashboard Shell

Dashboard shell was desktop-only before this sprint. Changes made:

- `MOBILE_BREAKPOINT = 900` — breakpoint used in both JS and CSS
- Below 900px: sidebar is hidden, content is full-width, mobile top bar renders
- Mobile top bar: hamburger (SVG bars) on left, section title centered, Agent Sam button on right
- `MobileNavDrawer`: glassmorphic slide-in drawer from left
  - Backdrop: `rgba(0,0,0,.55)` with `backdrop-filter: blur(10px)`
  - Drawer: `clamp(280px, 68vw, 340px)` wide, max `calc(100vw - 56px)`
  - Body scroll locked while open (`body.cpas-mobile-nav-open`)
  - Closes on: backdrop click, Escape key, nav item click
  - Nav grouped into Rescue Operations / Public Presence / Administration
- `useIsMobile(900)` and `useIsNarrow(520)` hooks exported to `window` for use in any view
- `OverviewView` uses responsive grids:
  - Stats: `1fr` (narrow) / `repeat(2,minmax(0,1fr))` (mobile) / `repeat(auto-fit,minmax(160px,1fr))` (desktop)
  - Middle row: `1fr` on mobile, `1fr 1.6fr` on desktop
  - Recent animals: `1fr` / `repeat(2,...)` / `repeat(5,1fr)`
  - Bottom row: `1fr` on mobile, `1fr 1fr 1fr` on desktop
- CSS helpers in `public/dashboard/index.html`:
  - `.cpas-mobile-only` / `.cpas-desktop-only` visibility toggles
  - `body.cpas-mobile-nav-open` scroll lock
  - `body { overflow-x: hidden }` below 900px
  - `#root { overflow-x: hidden }`

**Target:** no horizontal scroll at 375px (iPhone), no clipped cards, sidebar hidden below 900px.

---

## Facebook / Social Integration Plan

Two separate integration lanes:

**Lane A — Public website Facebook embed (low risk)**

- No publishing permissions required
- Uses Facebook Page Plugin embedded on the `/community` page
- Config stored in `social_embed_settings` D1 table
- `GET /api/social/embed/facebook-page` — returns current embed config
- `POST /api/social/embed/facebook-page` — admin saves page URL + options
- Must gracefully fail if Facebook blocks embed, cookies, or tracking

**Lane B — Dashboard social publishing (higher risk)**

- Requires Meta Developer App + app review
- Requires Facebook Login for Business / page permissions
- Requires explicit client approval before activation
- `GET /api/social/status` — shows whether credentials are configured
- `GET /api/social/oauth/meta/start` — begins Meta OAuth flow (requires `META_APP_ID`)
- `GET /api/social/oauth/meta/callback` — stub; token exchange not wired until `META_APP_SECRET` and CSRF state persistence are in place
- `POST /api/social/facebook/page-posts` — scaffold; returns 501 until page token is connected
- Real publish calls must never silently succeed — always 501 if tokens absent

**Migration:** `migration/d1/social_integrations.sql` adds `social_provider_connections`, `social_embed_settings`, `social_post_drafts_v2`. Run before any social API calls.

---

## AI / API Cost Ownership

AgentSam social drafting must satisfy one of these before client handoff:

1. Client provides their own OpenAI API key
2. AI drafting is disabled
3. Client is on a managed monthly plan with explicit included usage
4. Usage is capped and visible in the dashboard

Never silently run client production AI drafting on Sam's OpenAI account after handoff.

Planned config vars (not yet implemented):

```
AI_PROVIDER_MODE       = "disabled" | "client_key" | "managed"
AI_MONTHLY_TOKEN_CAP   = 500000
AI_USAGE_VISIBLE_TO_ADMIN = true
```

---

## D1 / R2 / KV Checklist

- D1 database: `companionscpas` (`fd6dd6fb-156b-4b6a-8ff0-505422652391`)
- R2 bucket: `companionscpas` (binding: `WEBSITE_ASSETS`)
- KV namespace: `companionscpas-cache` (binding: `CMS_CACHE`)
- Dashboard and public assets must be synced to R2 before live verification
- Purge KV cache after any public page, theme, or brand artifact update:
  ```
  wrangler kv key delete --binding=CMS_CACHE "page:/community"
  wrangler kv key delete --binding=CMS_CACHE "bootstrap:tenant_companionscpas"
  ```

---

## Development TODO

**Content / CMS (no deploy)**

- Create CMS page record and sections for `/community` route in D1
- Rewrite `/services` sections — wrong mission description in current data
- Fix `/donate` — wrong org name, address, and parish in current data
- Set correct logo URL in `cms_brand_settings`

**Social / Facebook**

- Run `migration/d1/social_integrations.sql` on D1
- Configure Facebook Page embed URL via `POST /api/social/embed/facebook-page`
- Create Meta Developer App at developers.facebook.com
- Add `META_APP_ID` and `META_APP_SECRET` via wrangler secrets
- Implement OAuth state token persistence (KV or D1) before enabling live OAuth
- Implement token encryption before storing any page access tokens
- Submit Meta app review if `pages_manage_posts` permission is required
- Wire token decryption and Meta Graph API call in `POST /api/social/facebook/page-posts`

**Dashboard / mobile**

- Add Playwright smoke tests for mobile dashboard shell at 375px
- Verify no horizontal scroll on iPhone viewport
- Verify hamburger opens drawer and all nav items work
- Verify backdrop and Escape close the drawer
- Verify Agent Sam button works in mobile top bar

**Deploy / infra**

- Update `APP_DOMAIN`, `ALLOWED_ORIGINS`, `GOOGLE_REDIRECT_URI`, `META_REDIRECT_URI` in CF dashboard to use `companionsofcaddo.org`
- Decide AI billing owner before enabling AgentSam social drafting
- Deploy and verify live Worker after domain env var updates
- Sync updated R2 dashboard assets
- Purge KV cache for all public routes after deploy
- Verify `/community` route returns 503 gracefully (not 404) before CMS artifact is published
- Set up Resend account under `companionsofcaddo.org` domain (client approval needed)

**Publish pipeline (separate sprint)**

- Wire `renderPage()` into `POST /api/cms/publish` handler
- Write `src/api/render_section.js` with all 14 section renderers
- Add `POST /api/cms/publish-global` for header/footer/CSS rebuild
- Seed sections for `/adopt` (0 in D1) and `/services` (0 in D1)

---

## Hard Rules

- No emojis anywhere — UI copy, README, comments, commit messages, labels, generated content
- No hardcoded secrets — all credentials via `wrangler secret put`
- No fake publish success — all social publish routes return 501 until real tokens are configured
- No social publishing without explicit client approval
- No AI drafting on Sam's bill after handoff unless a managed plan is approved and documented
- Every codebase change must leave the repo in a working state before and after

---

## Source File Map

```
src/
  index.js                   Worker entry. All request routing.
  api/
    _shell.js                Shared HTML shell. getBrand() from D1+KV.
    agentsam_api.js          Agent Sam chat + session management
    agentsam_tools.js        DB-driven tool dispatch
    auth_login.js            Login: validates credentials, writes sessions
    cms_api.js               CMS CRUD: section/block/page/brand/asset + publish stub
    cms_api_additions.js     Extended CMS routes
    contact_api.js           Public contact form
    dashboard_api.js         Dashboard data endpoints
    dashboard_config_api.js  Dashboard config (DB-driven)
    donation_api.js          Stripe checkout intent creation
    foster_api.js            Foster/adoption application flow
    password_reset.js        Password reset flow
    payments_email.js        Stripe webhook + Resend email
    render_home.js           Homepage renderer (reference implementation)
    render_page.js           Full page render pipeline
    resolveModel.js          LLM routing + ETO sync to IAM
    session_api.js           getAuthUser() + /api/auth/me + /api/auth/logout
    social.js                Social provider OAuth, embed config, publish scaffold

public/
  dashboard/
    index.html               Dashboard SPA shell. Mobile CSS helpers here.
    js/
      app.jsx                App router. isMobile state, MobileNavDrawer mount.
      ui.jsx                 Shared components. useIsMobile, MobileNavDrawer, TopBar.
      view-overview.jsx      Dashboard home. Responsive grids.
      view-cms.jsx           CMS editor view
      [other views]

migration/
  d1/
    social_integrations.sql  social_provider_connections, social_embed_settings, social_post_drafts_v2
```

---

## Client Handoff Notes

**Domain:** `companionsofcaddo.org` — registered and active on Cloudflare, custom domain wired to Worker.

**Account transfer:** site is currently hosted under Inner Animal Media's Cloudflare account. Upon final client approval, transfer process: client creates CF account, Worker is redeployed, D1/R2/KV are migrated, domain is transferred via CF dashboard push/accept flow.

**Client self-service (no developer needed):** edit any page content via `/dashboard?view=cms`, upload photos, view donations and applications, use Agent Sam for content writing.

**Not self-service:** deploying Worker code, rotating secrets, running D1 migrations, configuring Meta app credentials.

**Resend:** client will need their own Resend account connected to `companionsofcaddo.org` before transactional emails go live. Free tier (3k/month) is sufficient for their volume.

---

Developed and maintained by [Inner Animal Media](https://inneranimalmedia.com) — sam@inneranimalmedia.com
