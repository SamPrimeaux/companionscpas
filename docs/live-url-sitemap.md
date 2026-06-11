# Companions of CPAS Live URL Sitemap

Version: v1
Domain: https://companionsofcaddo.org
Purpose: Track public website routes, admin/auth routes, dashboard routes, CMS routes, integration notes, and near-term refinement priorities.

## Public Website

| Page | Route | Purpose | Current status | Notes |
|---|---|---|---|---|
| Home | `/` | First impression, mission, foster/donate CTAs, featured content | Mocked / active | Strong direction. Needs final copy cleanup, duplicate text removal, tighter hero CTA logic. |
| About | `/about` | Org identity, mission, volunteer-powered story, why CPAS dogs need support | Mocked / active | Hero section needs cleanup. Strengthen organization story and reduce awkward spacing/content issues. |
| Foster | `/services` | Foster education and application pathway | Mocked / active | Route is currently `/services`; nav label is Foster. Keep unless client requests a route change. Copy should make short-term fostering feel approachable. |
| Adopt | `/adopt` | Adoptable dog discovery and adoption inquiry path | Mocked / active | Needs clear animal cards, status labels, contact logic, and reliable D1/R2 image plumbing. |
| Community | `/community` | Updates, feel-good stories, rescue wins, social proof | Mocked / active | Best place to translate Facebook energy into curated stories without recreating Facebook. |
| Donate | `/donate` | Donation explanation, medical/transport support, giving CTA | Mocked / active | Should focus on direct outcomes: medical care, transport, foster support, and second chances. |

## Public Auth / Admin Entry

| Page | Route | Purpose | Current status | Notes |
|---|---|---|---|---|
| Admin Login | `/admin/login` | Entry point for custom login and Google OAuth | Active / needs final polish | Header logo/admin click should route here. Confirm session handling, redirects, and role-based access. |
| Reset Password | `/admin/reset-password` | Password reset flow | Active / needs test | Verify token flow, expired token state, success state, and post-reset redirect. |

## Dashboard Core

| Page | Route | Purpose | Current status | Notes |
|---|---|---|---|---|
| Overview | `/dashboard/overview` | Org summary, active animal counts, foster/adoption/medical/donation snapshot | Mocked / active | Good visual foundation. Confirm live D1-backed numbers and avoid fake/demo-only metrics. |
| Animals | `/dashboard/animals` | Animal roster, grid/list view, status filtering, Add Animal | Mocked / active | Needs CRUD reliability, image linking, status filters, and public visibility toggle. |
| Intakes | `/dashboard/intakes` | Track incoming animals / shelter intake flow | Built / needs plumbing | Confirm tables, create/edit/read views, and relation to animal profile records. |
| Medical | `/dashboard/medical` | Medical watch, needs, treatment notes, costs | Built / needs plumbing | Needs careful permissions and clear status labels. Avoid overcomplicating v1. |
| Daily Care | `/dashboard/daily-care` | Feeding, walk, medication, and vaccination care tracking | Built / needs validation | May be more shelter-management than Companions needs. Keep if useful; hide if not client-relevant. |
| Fosters | `/dashboard/fosters` | Foster homes, foster needs, placements | Built / needs plumbing | High-value. Should connect directly to Foster Needed website/social content. |
| Adoptions | `/dashboard/adoptions` | Adoption inquiries and placement tracking | Built / needs plumbing | Should connect to applications/email where possible. |
| Applications | `/dashboard/applications` | Foster/adoption application intake | Built / needs plumbing | Verify source of applications: forms, email, manual entry, and future integrations. |
| Volunteers | `/dashboard/volunteers` | Volunteer roster and roles | Built / needs refinement | Keep simple: name, contact, role, availability, notes. |
| Donations | `/dashboard/donations` | Donation records, campaigns, donor support | Built / needs verification | Do not imply payment processor integration unless live. |
| Fundraising | `/dashboard/fundraising` | Campaigns, transport/medical funds, giving goals | Built / needs verification | Best for medical/transport campaign blocks. |

## CMS Website Management

| Page | Route | Purpose | Current status | Notes |
|---|---|---|---|---|
| CMS Website Overview | `/dashboard/cms/website` | Website management hub | Built / needs refinement | Should show page status, last updated, draft/live state, and quick links. |
| CMS Pages | `/dashboard/cms/pages` | Page list and page editor entry | Built / active | Needs reliable section ordering, draft/live behavior, and D1/KV/R2 publish sync. |
| CMS Images | `/dashboard/cms/images` | R2 media library and image tagging | Strong foundation | Needs contrast fixes, alt text flow, delete/cleanup safety, upload validation. |
| CMS Brand Settings | `/dashboard/cms/brand` | Identity, logos, colors, org info | Built / needs enhancement | Tomorrow priority. Should become the source of truth for org identity, footer, logos, and basic theme tokens. |
| CMS Templates | `/dashboard/cms/templates` | Section template library | Built / needs major enhancement | Needs full-screen responsive layout, better previews, categories, and reusable section definitions. |

## Reports / Settings / Communications

| Page | Route | Purpose | Current status | Notes |
|---|---|---|---|---|
| Reports | `/dashboard/reports` | Animal, financial, application, volunteer, medical, AI usage reporting | Built / needs layout refinement | Needs responsive full-screen fit, real DB queries, and no dummy chart data. |
| Settings | `/dashboard/settings` | Org settings, users, integrations, notifications | Built / needs overhaul | Should become real settings, not placeholder tabs. Confirm D1-backed settings tables. |
| Notifications | `/dashboard/notifications` | Internal alerts, reminders, status updates | Built / needs validation | Connect to application/email/medical/foster events where possible. |
| Email Inbox | `/dashboard/email` | Inbound email, applications, messages, replies | Built / waiting on Resend inbound webhook | Needs Resend inbound route setup, parsing, thread display, reply flow, and routing labels. |

## Asset Domains / Storage

| Resource | Purpose | Notes |
|---|---|---|
| `assets.companionsofcaddo.org` | R2 public asset delivery | Used for animal images, logos, page images, and CMS media library assets. |
| R2 bucket | Image/file storage | Must be client-owned or cost-scoped. |
| D1 database | Structured CMS/dashboard records | Animal profiles, pages, sections, settings, users, reports, applications, etc. |
| KV cache | Published page/cache layer | Should reflect current live page state after publish. |

## Route Label Notes

- Public nav label Foster currently maps to `/services`.
- Keep this unless changing the route is worth the redirect/SEO cleanup.
- Admin login should stay separate from dashboard routes.
- Dashboard should only be reachable after auth.
- CMS edits should flow through `/dashboard/cms/pages`, not manual page edits.

## Social Integration Notes

### Lane A: Public website Facebook embed

- Low risk.
- No publishing permissions required.
- Uses Facebook Page Plugin embedded on `/community`.
- Config stored in `social_embed_settings` D1 table.
- `GET /api/social/embed/facebook-page` returns current embed config.
- `POST /api/social/embed/facebook-page` lets admin save page URL and options.
- Must gracefully fail if Facebook blocks embed, cookies, or tracking.

### Lane B: Dashboard social publishing

- Higher risk.
- Requires Meta Developer App and app review.
- Requires Facebook Login for Business / page permissions.
- Requires explicit client approval before activation.
- `GET /api/social/status` shows whether credentials are configured.
- `GET /api/social/oauth/meta/start` begins Meta OAuth flow when `META_APP_ID` exists.
- `GET /api/social/oauth/meta/callback` remains stubbed until `META_APP_SECRET`, CSRF state persistence, and token encryption are ready.
- `POST /api/social/facebook/page-posts` must return 501 until page token is connected and real publishing is implemented.
- Real publish calls must never silently succeed.

## D1 / R2 / KV Checklist

- D1 database: `companionscpas`.
- R2 bucket binding: `WEBSITE_ASSETS`.
- KV namespace binding: `CMS_CACHE`.
- Dashboard and public assets must be synced to R2 before live verification.
- Purge KV cache after any public page, theme, or brand artifact update.

Common cache keys:

```bash
wrangler kv key delete --binding=CMS_CACHE "page:/community"
wrangler kv key delete --binding=CMS_CACHE "bootstrap:tenant_companionscpas"
```

## Deploy / Infra Notes

- Confirm `APP_DOMAIN`, `ALLOWED_ORIGINS`, `GOOGLE_REDIRECT_URI`, and `META_REDIRECT_URI` use `companionsofcaddo.org`.
- Decide AI billing owner before enabling Agent Sam social drafting.
- Deploy and verify live Worker after domain env var updates.
- Sync updated R2 dashboard assets.
- Purge KV cache for all public routes after deploy.
- Set up or complete Resend inbound webhook before relying on `/dashboard/email`.

## V1 Completion Definition

The site/dashboard reaches v1 when:

- Public pages render cleanly on desktop and mobile.
- CMS page editor edits reliably publish to live routes.
- Animal images and profile records are cleanly connected through D1/R2.
- Brand settings update actual visible site identity.
- Templates can be added to pages without breaking layout.
- Reports show real data or clearly marked empty states.
- Settings, users, and integrations are not fake UI.
- Email inbox is wired to Resend inbound or clearly hidden until enabled.

## Hard Rules

- No emojis anywhere: UI copy, README, comments, commit messages, labels, generated content.
- No hardcoded secrets. All credentials go through `wrangler secret put` or the appropriate provider UI.
- No fake publish success. Social publish routes must return 501 until real tokens are configured.
- No social publishing without explicit client approval.
- No AI drafting on Sam's bill after handoff unless a managed plan is approved and documented.
- Every codebase change must leave the repo in a working state before and after.
