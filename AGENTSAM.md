# AGENTSAM.md — Companions of Caddo (companionsofcaddo.org)
> SSOT for any agent picking up this project. Read completely before touching any file, table, or binding.
> Last updated: 2026-07-30 · CMS SSOT detail: [README.md § Sectionalized CMS System](README.md#sectionalized-cms-system)

---

## Identity
- Agent name: Agent Sam (client worker)
- Operator: Inner Animal Media (Sam Primeaux) for Companions of CPAS, Caddo Parish LA
- Client ID: client_companions_cpas | Tenant: tenant_companionscpas | Workspace: ws_companionscpas
- Local repo: /Users/samprimeaux/companionscpas | GitHub: SamPrimeaux/companionscpas | Branch: main

---

## Stack
- Worker: companionscpas — entry src/index.js (NOT worker.js)
- Public: https://companionsofcaddo.org | Dashboard: /dashboard | Assets CDN: https://assets.companionsofcaddo.org
- Frontend: React (Babel CDN, no build step) — public/dashboard/js/*.jsx deployed to R2
- Deploy: cd /Users/samprimeaux/companionscpas && npx wrangler deploy

---

## Worker Bindings (verbatim from CF dashboard)
| Type | Name (env.*) | Value |
|------|-------------|-------|
| Workers AI | AGENTSAM_WAI | Workers AI Catalog |
| KV namespace | CMS_CACHE | companionscpas-cache (ID: 0b410337a8494fc982ea04c5bde1eab4) |
| D1 database | DB | companionscpas (ID: fd6dd6fb-156b-4b6a-8ff0-505422652391) |
| R2 bucket | WEBSITE_ASSETS | companionscpas |

Secrets (NOT bindings): AGENTSAM_BRIDGE_KEY, STRIPE_*, RESEND_API_KEY, OPENAI_API_KEY, GOOGLE_CLIENT_*, INTERNAL_PUBLISH_KEY

---

## Non-Negotiables
1. ALL code changes in companionscpas repo ONLY. Never patch from IAM worker.
2. CMS publish contract: D1 edit → `POST /api/cms/publish` → `cms_pipeline.publishRoute` → section R2 sync + `assemblePage` → R2 baked index + KV `page:{route}` bust → live. Brand/footer save republishes **all** `cms_pages` routes.
3. No manual R2 HTML edits of live page artifacts. Dashboard Publish Live, brand/footer save, or scripted sync only.
4. Deploy: bare `npx wrangler deploy` from repo root (or `npm run deploy` / `deploy:full` on Mac). No `--env production`. No `wrangler.production.toml`.
5. After wrangler deploy, push changed R2 static/dashboard files separately with `--remote` when needed.
6. `INTERNAL_PUBLISH_KEY` in production ≠ `AGENTSAM_BRIDGE_KEY` in `.dev.vars`. Use `/api/cms/publish` (session auth) from dashboard.
7. Live header/footer = `render_site_nav.js` + `footer_chrome.js`, **not** hand-edited `static/global/cpas-{header,footer}.html` (those are fallback/reference only).

---

## CMS Pipeline (unified — see README for detail)

```
D1 (cms_pages / cms_page_sections / cms_brand_settings)
  → Publish Live or brand save
  → cms_pipeline.publishRoute
       → syncRouteSectionsToR2 (cms_section_catalog.renderSectionByType)
       → assemblePage (dynamic header/footer from render_site_nav)
       → R2 static/pages…/index.html + KV bust
Public GET → KV → assemblePage → else R2 artifact
```

**Home vs about:** same assemble/serve/publish path. Only *some* `section_key`s still use branded HTML in `render_home_section.js` / `render_about_section.js` via the catalog — not separate page pipelines. Legacy `*_cms_sync.js` / `render_*_fragments.js` = ops salvage, not live assemble.

**Footer chrome:** edit in dashboard Pages → Footer panel (`footer_json` trust badges, column labels). Not Brand page ping-pong.

Full agent SSOT: [README.md § Sectionalized CMS System](README.md#sectionalized-cms-system).

---

## Home Page Sections (typical visible set — confirm in D1)
| sort | section_key | type | Editable fields |
|------|-------------|------|-----------------|
| 10 | hero | hero | eyebrow, heading, subheading, image_url, cta_href, cta_secondary_href |
| 20 | mission | text_image | heading, body |
| 30 | how_it_helps | home_pillars | heading |
| 40 | campaigns | campaign_grid | heading |
| 50 | transport_win | home_story | heading, body, image_url |
| 60 | newsletter | home_newsletter | heading, subheading |

Hidden rows may exist in D1 (`is_visible=0`). Visibility is D1-driven via the unified pipeline — do **not** require a `HOME_FRAGMENT_KEYS` allowlist to re-enable.

---

## Other Pages
| Route | Status | Notes |
|-------|--------|-------|
| /about | Published | Same pipeline as home; some keys use `render_about_section.js`. Needs: image resize, mission, CTA reroute from /community |
| /adopt | Published | Needs image/content pass |
| /contact | Published | Needs content pass |
| /donate | Published | Audit dashboard vs live sections if drift appears |
| /community | Published | Prefer hide after rerouting CTAs to /foster or /adopt |
| /services | Published | Assembly may still be thin/broken — fix data/renderer, not a route allowlist |

---

## Dashboard (view-cms.jsx)
Routes: CmsWebsiteView, CmsPagesView, CmsPageEditorView, CmsImagesView, CmsTemplatesView

APIs:
- GET  /api/cms/page?route=      -> sections + blocks
- POST /api/cms/section/save     -> save draft to D1
- POST /api/cms/publish          -> full publish pipeline
- GET  /api/cms/bootstrap        -> brand settings

What works:
- Section list: drag reorder, click to select, eye toggle, drag-to-reorder (reorderSections())
- Inspector: eyebrow/heading/subheading/body/image/CTA fields, Save Draft, Publish Live
- Header/Footer chrome panels (footer: mission/org/socials, column titles, trust badges with caption/height/placement)
- Live iframe preview bumped on save, desktop/tablet/mobile toggle
- Image picker modal (Pick button)

What is broken/missing (priority order):
1. Active section not scrolled/highlighted in preview iframe when clicked in section list
2. Section row active state too subtle (border-left color only) - needs stronger highlight
3. Inspector is generic - all types show same fields (hero needs CTA label fields, campaign_grid needs block editor)
4. /community CTAs need global replace -> /foster or /adopt, then hide page
5. Brand colors wrong: showing #7c3aed (purple) / #ee2336 (red) - need #6f2270 / #c23689
6. /donate dashboard sections out of sync with live
7. Image drag-and-drop to inspector field not implemented (Pick button works)
8. "Ask Agent Sam" button broken - known IAM platform issue, skip

---

## Collaborate Workspace

- Route: `/dashboard/collaborate`; `seg=calendar|tasks|mail` selects the surface and defaults to Calendar.
- `app.jsx` owns query parsing and browser history. The optional `ticket` query is retained only for Tasks.
- `view-collaborate.jsx` owns the shell. Calendar mounts the live `window.CollaborateCalendarPane`; Swarm B mounts `window.CollaborateTasksPane`.
- Calendar uses `/api/collaborate/calendar/events` for authenticated range reads and full create/update/delete against `dashboard_calendar_events`; each mutation batches a `dashboard_notifications` audit row.
- Mail embeds the existing `EmailView` and keeps the current `/api/email/*`, Gmail OAuth, drafts, and notification behavior. `/dashboard/email` remains supported.
- The seeded package in `packages/collaboration-integration-suite/` is reference material only. Runtime code lives under `public/dashboard` and `src/api`; Tasks must use `agentsam_tickets` and `agentsam_ticket_events`, never `agentsam_todo`.

---

## Key Files
| File | Purpose |
|------|---------|
| src/index.js | Worker router → servePublicPage |
| src/api/cms_pipeline.js | SSOT assemblePage / publishRoute (all cms_pages routes) |
| src/api/cms_section_catalog.js | renderSectionByType — home/about key overrides + typed/generic |
| src/api/cms_api.js | CMS HTTP: sections, preview, publish, brand/footer chrome |
| src/api/render_site_nav.js | Live header/footer (not static/global/cpas-*.html) |
| src/api/footer_chrome.js | footer_json trust badges + column titles |
| src/api/render_home_section.js | Branded home section HTML (catalog override only) |
| src/api/render_about_section.js | Branded about section HTML (catalog override only) |
| src/api/render_section.js | Generic section renderer |
| src/api/render_page.js | getBrand(), getGlobalPartial(), assembleFullPage() |
| src/api/brand_tokens.js | CSS vars from D1 brand settings |
| static/global/cpas-shell.css | Main stylesheet (in R2) |
| static/global/cpas-modals.js | Contact/foster/volunteer modals |
| public/dashboard/js/view-cms.jsx | Page editor + Footer/Header chrome + Brand |
| README.md | Agent SSOT for CMS pipeline (updated 2026-07-30) |
| public/dashboard/js/view-collaborate.jsx | Collaborate Calendar / Tasks / Mail shell and pane mount contract |
| public/dashboard/js/view-collaborate-calendar.jsx | Live Calendar week/day/month UI and CRUD interactions |
| public/dashboard/css/collaborate-calendar.css | Calendar parity grid, mini-month, modal, and responsive styles |
| src/api/collaborate_calendar_api.js | Authenticated Calendar range and CRUD API |
| db/migrations/20260727_collaborate_calendar_crud.sql | Calendar unix range fields, metadata, and indexes |
| public/dashboard/css/collaborate.css | Collaborate desktop and mobile shell styles |
| public/dashboard/js/view-email.jsx | Standalone and embedded CPAS mailbox |

---

## Ship Blockers
- /about: image resize + mission statement + reroute /community CTAs
- /adopt: content + image pass
- /contact: content pass
- /donate: reconcile dashboard vs live sections
- /community: hide after rerouting all inbound CTAs
- Brand colors: update primary/accent in Brand & Settings
- Stripe: client approval -> live keys -> smoke test
- Verify Publish Live works end-to-end for each page from dashboard

---

## Deploy Checklist
1. npx wrangler deploy (from /Users/samprimeaux/companionscpas)
2. npx wrangler r2 object put companionscpas/static/global/cpas-shell.css --file=... --content-type=text/css --remote (if CSS changed)
3. KV bust: for p in "/" "/about" "/adopt" "/contact" "/donate"; do npx wrangler kv key delete "page:$p" --binding=CMS_CACHE --remote; done
4. Publish Live from dashboard for each page
5. Smoke: companionsofcaddo.org, /about, /adopt, /donate, /contact

---

## Gotchas
- Do not assume separate home/about page assemblers — live path is always `cms_pipeline`. Branded section overrides live only in `cms_section_catalog` → `render_home_section` / `render_about_section`.
- companionscpas D1 != inneranimalmedia-business D1. Never confuse.
- wrangler r2 object list syntax varies by wrangler version - use agentsam_r2_list MCP tool instead.
- assets.companionsofcaddo.org is separate R2 custom domain - upload via dashboard Images, not wrangler.
- Babel CDN dashboard: no TS, no imports, React.createElement() throughout, all in same file or window globals.
- Collaborate tab state is URL state. Route all tab changes through `onNavigate`; do not mutate `location.search` directly.
- Collaborate Calendar and Tasks may replace only their named `window.*Pane` mount points; shell ownership stays in `view-collaborate.jsx`.
- /community: hide nav_visible=0 in cms_pages AND reroute all href=/community in R2 fragments BEFORE hiding.
- impact_stats section removed from home. Do not re-enable without real metrics from client.

---

Edit this file every session that changes architecture, pipeline, or known issues.
Commit: git add AGENTSAM.md && git commit -m "docs: AGENTSAM.md [date]"
