# CompanionsCPAS Platform

Companions of CPAS — 501(c)(3) volunteer-powered rescue helping dogs at Caddo Parish Animal Services receive medical care, transport support, and second chances.

- **Live site:** `https://companionsofcaddo.org`
- **Admin route:** `admin.companionsofcaddo.org/*` (Cloudflare custom domain + wrangler route)
- **Dashboard:** `https://companionsofcaddo.org/dashboard` *(auth-gated)*
- **Repo:** `github.com/SamPrimeaux/companionscpas`
- **Developed by:** [Inner Animal Media](https://inneranimalmedia.com)
- **Stack:** Cloudflare Workers, D1, R2, KV, Workers AI

---

## Project Overview

This platform combines a public-facing rescue website with a private admin dashboard. **Public CMS pages** use one pipeline: D1 content → section HTML → assemble with dynamic header/footer → R2 page artifact + KV cache.

The dashboard is a React SPA (raw JSX via Babel CDN) served from R2. The public site uses `cpas-shell.css` / brand tokens, modular popups (`cpas-modals.js`, `donate-modal.js`), and Stripe test-mode donations until the client goes live.

**Start here:** [Sectionalized CMS System](#sectionalized-cms-system) (agent SSOT for how pages/header/footer work), then [Client handoff status](#client-handoff-status-june-2026). Dashboard file ownership: [`docs/current-file-map.md`](docs/current-file-map.md). Architecture deep-dive: [`CMS_ARCHITECTURE.md`](CMS_ARCHITECTURE.md).

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

> Last verified against code: **2026-07-30**. Canonical agent reference for CMS / public site.
> Companion deep-dive: [`CMS_ARCHITECTURE.md`](CMS_ARCHITECTURE.md).

### Mental model (one pipeline for every `cms_pages` route)

```
Dashboard edit  →  D1 (cms_pages + cms_page_sections + cms_page_content_blocks
                        + cms_brand_settings)     ← content + chrome SSOT
       ↓ Publish / brand save (republish)
cms_pipeline.publishRoute
  → syncRouteSectionsToR2  (renderSectionByType → R2 fragments)
  → bust KV page:{route}
  → assemblePage (D1 sections + dynamic header/footer)
  → R2 static/pages…/index.html + KV page:{route}
       ↓
Public GET  →  KV → else assemblePage → else R2 artifact
```

**D1** = what the team edits. **Never** hand-edit live R2 `static/pages/**/index.html` artifacts. Regenerate via CMS Publish, brand/footer save (republishes all routes), or ops scripts.

### Do home and about still use different renderers?

**Short answer: separate assemble pipelines — no. Separate branded section HTML for some keys — yes.**

| Layer | Home `/` | About `/about` | Other CMS routes |
|---|---|---|---|
| **Serve / publish / preview** | Same: `cms_pipeline.assemblePage` / `publishRoute` | Same | Same |
| **Route allowlist** | None — any `cms_pages` row (`isCmsPageRoute`) | Same | Same |
| **Header / footer** | Same: `render_site_nav.js` (+ `footer_chrome.js`) | Same | Same |
| **Section HTML** | Some `section_key`s still dispatch to `render_home_section.js` | Some keys → `render_about_section.js` | Typed catalog + `render_section.js` |

Dispatch lives in **one catalog**: [`src/api/cms_section_catalog.js`](src/api/cms_section_catalog.js) → `renderSectionByType()`.

- If `page_route === "/"` and key is in `{hero, mission, how_it_helps, transport_win, impact_stats, campaigns, newsletter}` (or type `home_*`) → `renderHomeFragment`.
- If `page_route === "/about"` and key is in `{mission_statement, hero, why_we_exist, paths, campaigns, cta}` → `renderAboutFragment`.
- Else → contact / donate-v2 / campaign / gallery / generic `render_section.js` / stub.

Legacy modules `home_cms_sync.js`, `about_cms_sync.js`, `render_*_fragments.js`, `generic_page_cms_sync.js` still exist for **ops salvage / CLI sync**, but they are **not** the live public assemble path. [`page_cms_registry.js`](src/api/page_cms_registry.js) is a thin wrapper over `cms_pipeline` (no hard-coded six-route FRAGMENT_PAGES for serving).

### Header / footer (agents: read this)

| Concern | Truth |
|---|---|
| Live header/footer HTML | [`src/api/render_site_nav.js`](src/api/render_site_nav.js) (`renderSiteHeader` / `renderSiteFooter`) |
| Footer chrome data | `cms_brand_settings.footer_json` via [`src/api/footer_chrome.js`](src/api/footer_chrome.js) — column titles, title size, trust badges (caption, image, href, height, placement, order) |
| Nav links | `cms_pages` (`nav_visible`, `nav_label`, `nav_placement`, `sort_order`) — **not** `cms_brand_settings.navigation_json` |
| Org / socials / logos | `cms_brand_settings` (`organization_json`, `socials_json`, logo fields) |
| Editor UX | Page editor → click **Footer** / **Header** chrome rows in [`public/dashboard/js/view-cms.jsx`](public/dashboard/js/view-cms.jsx). Preview click on captions/badges/labels posts `cms:chrome-selected`. |
| Brand & Settings | Colors + logos (+ header logo height via `/api/cms/brand/tokens.css`). **Not** the place for footer copy/nav. |
| `static/global/cpas-header.html` / `cpas-footer.html` | **Reference / R2 fallback only.** Editing them does not change live pages when D1 is available. |
| Brand save | `POST /api/cms/brand/save` writes D1, busts brand KV, then **republishes all `cms_pages` routes** (D1 list via `listAllCmsPageRoutes` — not a hardcoded `PUBLIC_ROUTES` allowlist for the happy path). |

### Public page serve order (`src/index.js` → `servePublicPage`)

1. **KV** `page:{route}`
2. If `isCmsPageRoute(env, route)` → **`assemblePage`** (live D1 + dynamic chrome)
3. **R2 artifact** `static/pages/index.html` or `static/pages{route}/index.html`
4. Legacy `renderPage()` only if the above fail

### Routes

Any published `cms_pages.route_path` is a CMS route. Common production routes include `/`, `/about`, `/adopt`, `/fosters`, `/donate`, `/community`, `/contact`, `/events`, `/services` (services assembly may still be thin/broken — do not invent a route allowlist to “fix” that).

R2 fragment keys: `static/pages/{page_name}/{section_key}.html` (home uses `static/pages/home/…`). Artifacts: `/` → `static/pages/index.html`, else `static/pages{route}/index.html`.

### Key implementation files

| File | Role |
|---|---|
| [`src/api/cms_pipeline.js`](src/api/cms_pipeline.js) | **SSOT pipeline** — load sections, sync R2, `assemblePage`, `publishRoute`, `previewRoute` |
| [`src/api/cms_section_catalog.js`](src/api/cms_section_catalog.js) | `renderSectionByType` — home/about key overrides + typed/generic renderers |
| [`src/api/cms_api.js`](src/api/cms_api.js) | CMS HTTP: save, preview, publish, brand, chrome, assets |
| [`src/api/page_cms_registry.js`](src/api/page_cms_registry.js) | Thin compat wrappers over `cms_pipeline` |
| [`src/api/render_site_nav.js`](src/api/render_site_nav.js) | Live header/footer |
| [`src/api/footer_chrome.js`](src/api/footer_chrome.js) | `footer_json` normalize + trust-badge HTML |
| [`src/api/render_page.js`](src/api/render_page.js) | `getBrand`, `getGlobalPartial`, `assembleFullPage` |
| [`src/api/page_shell.js`](src/api/page_shell.js) | Shell script tags + `SHELL_VERSION` cache bust |
| [`src/api/render_home_section.js`](src/api/render_home_section.js) | Branded home section HTML (catalog override) |
| [`src/api/render_about_section.js`](src/api/render_about_section.js) | Branded about section HTML (catalog override) |
| [`src/api/render_section.js`](src/api/render_section.js) | Shared/generic section types + CTA resolver |
| [`public/dashboard/js/view-cms.jsx`](public/dashboard/js/view-cms.jsx) | Page editor + Footer chrome panel + Brand theme |

### D1 tables (CMS content)

| Table | Purpose |
|---|---|
| `cms_pages` | Route registry + **nav chrome** (`nav_visible`, `nav_label`, `nav_placement`, `sort_order`), theme, SEO |
| `cms_page_sections` | Section rows: `section_key`, `section_type`, copy, images, CTAs, `config_json`, `sort_order`, `is_visible`, `deleted_at` |
| `cms_page_content_blocks` | Repeating items inside a section |
| `cms_brand_settings` | Logos, colors, `organization_json`, `socials_json`, **`footer_json`** (trust badges + column titles) |
| `cms_modals` | CMS-driven intro copy (e.g. foster CTA popup) |
| `cms_assets` | R2 media library metadata |

Tenant ID everywhere: `tenant_companionscpas`.

### Public shell assets (R2)

| Asset | Role |
|---|---|
| `static/global/cpas-shell.css` | Public design system (merge from `cpas-public-surface.css` + partials via `npm run css:merge`) |
| `static/global/cpas-header.html` | Fallback / reference only — not live SSOT |
| `static/global/cpas-footer.html` | Fallback / reference only — not live SSOT |
| `static/global/shared.js` | Mobile nav / shared public JS |
| `static/global/cpas-modals.js` | Foster / volunteer / contact modals |
| `static/js/donate-modal.js` | Stripe donate modal |
| `/api/cms/brand/tokens.css` | Live logo size + brand CSS vars (no page republish needed for logo height) |

Script inclusion: [`src/api/page_shell.js`](src/api/page_shell.js) → `publicPageScripts()`. Bump `SHELL_VERSION` after shell CSS/JS changes.

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

1. Edit at `/dashboard/cms/pages/{page}` — section list + live preview iframe (`GET /api/cms/preview?route=…`).
2. **Body sections** — click section → inspector fields → Save Draft / blur-save → fragment sync + KV bust for that route.
3. **Header chrome** — click Header → this page’s nav label / placement / sort / visibility (`POST /api/cms/page/chrome` republishes **all** routes).
4. **Footer chrome** — click Footer → mission, org, socials, column titles, trust badges (drag reorder, placement, height, caption). Save → `POST /api/cms/brand/save` → republish all routes.
5. **Publish Live** — `publishRoute` for the current page (full sync + artifact + KV).
6. Preview uses the **same** `assemblePage` path as production (with `preview: true` for inspector hooks).

**Bootstrap / reset a page** (logged into dashboard):

```javascript
fetch('/api/cms/page/bootstrap', {
  method: 'POST', credentials: 'include',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ route_path: '/donate', force: true })
}).then(r => r.json()).then(console.log)
```

`force: true` resets sections to defaults. Prefer this over route-specific bootstrap unless a dedicated endpoint still exists for home.

### Ops commands (production)

```bash
# Full ship (CSS merge → R2 globals → dashboard sync → wrangler deploy → salvage republish → KV bust)
npm run deploy:full

# Worker only (API / render logic)
npm run deploy

# Merge public CSS partials into cpas-shell.css
npm run css:merge && npm run css:publish

# CLI fragment sync / republish (ops; prefer dashboard Publish when possible)
node scripts/sync-page-fragments.mjs /donate
node scripts/republish-shell-pages.mjs
node scripts/publish-generic-page.mjs

# Dashboard / asset delta sync to R2
npm run sync
```

**After shell CSS/JS changes:** `css:merge` + publish globals, bump `SHELL_VERSION` in `page_shell.js`, deploy Worker, republish pages (or brand save / salvage).

**After footer/brand chrome changes:** dashboard Footer save (or brand save) already republishes all `cms_pages` routes.

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
| Unified `cms_pipeline` (all `cms_pages` routes) | Live | Keep adding section types in the catalog, not new assemble paths |
| Home/About branded `section_key` overrides | Live inside catalog | Prefer typed shared sections for new work when possible |
| Footer/header chrome in page editor | Live | Trust badges + column titles fully CMS-driven |
| Donate modal + CTAs | Live (Stripe test mode) | Client sign-off; live Stripe keys |
| Apply modals (foster/volunteer/contact) | Live in `cpas-modals.js` | More CTAs via `data-modal` / `cta_action` |
| `/services` | May fail assemble | Fix content/sections in D1 — do not hardcode route lists |

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
  index.js                         Worker entry → servePublicPage (KV → assemblePage → R2)
  api/
    cms_pipeline.js                SSOT: assemblePage / publishRoute / syncRouteSectionsToR2
    cms_section_catalog.js         renderSectionByType (home/about key overrides + typed)
    cms_api.js                     CMS HTTP: sections, preview, publish, brand, chrome
    page_cms_registry.js           Thin wrappers over cms_pipeline (compat)
    render_site_nav.js             Live header/footer HTML
    footer_chrome.js               footer_json normalize + trust badge HTML
    render_page.js                 getBrand, getGlobalPartial, assembleFullPage
    page_shell.js                  Public script tags + SHELL_VERSION
    render_home_section.js         Branded home section HTML (catalog override)
    render_about_section.js        Branded about section HTML (catalog override)
    render_section.js              Generic sections + CTA resolver
    home_cms_sync.js               Legacy/ops home sync (not live assemble path)
    about_cms_sync.js               Legacy/ops about sync
    generic_page_cms_sync.js       Legacy/ops generic sync
    render_*_fragments.js          Legacy stitch helpers used by salvage CLI
    dashboard_api.js               Animals, fosters, volunteers, applications, …
    foster_api.js                  Public foster apply
    payments_email.js              Stripe + receipts + webhook
    brand_tokens.js                /api/cms/brand/tokens.css
    …

public/dashboard/js/
  view-cms.jsx                     Page editor + Footer/Header chrome + Brand theme
  app.jsx, ui.jsx, data.js, …
  view-*.jsx                       Dashboard surfaces

static/global/
  cpas-shell.css                   Merged public CSS (do not hand-edit surface half)
  cpas-public-surface.css          Surface partial → merged into shell
  cpas-header.html / cpas-footer.html   Fallback/reference only
  cpas-modals.js, shared.js

scripts/
  sync-r2.sh                       npm run sync (dashboard + changed assets)
  merge-cpas-css.mjs               npm run css:merge
  republish-shell-pages.mjs        Ops republish home/about + KV bust
  sync-page-fragments.mjs          Ops generic fragment sync
  salvage-resync.mjs               Post-deploy republish helper
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
