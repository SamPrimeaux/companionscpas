# CompanionsCPAS Platform

**Companions of CPAS** — 501(c)(3) volunteer-powered rescue helping dogs at Caddo Parish Animal Services receive medical care, transport support, and second chances.

- **Live site:** `https://companionscpas.meauxbility.workers.dev` *(domain pending)*
- **Dashboard:** `/dashboard` *(auth-gated, session-enforced at Worker level)*
- **Repo:** `github.com/SamPrimeaux/companionscpas-platform`
- **Developed by:** [Inner Animal Media](https://inneranimalmedia.com)
- **Stack:** Cloudflare Workers · D1 · R2 · KV · Workers AI

---

## Agent Quickstart

> Read this section first. It tells you what is wired, what is not, and where every file lives.

### What is fully working
- Homepage `/` — D1+KV driven via `src/api/render_home.js`
- Dashboard auth — cookie `cpas_session` → `agentsam_sessions` lookup (30-day window)
- CMS CRUD — section/block/page/brand/asset save + KV invalidation (`src/api/cms_api.js`)
- Agent Sam chat + tool dispatch (`src/api/agentsam_api.js`, `src/api/agentsam_tools.js`)
- Donation intent + Stripe webhook (`src/api/donation_api.js`, `src/api/payments_email.js`)
- Adopt/foster application form — 3-step, D1-backed (`cpas_foster_applications`)
- Auth login, logout, password reset, session management

### What is NOT wired — the publish pipeline
The CMS publish pipeline has **never been executed**. `POST /api/cms/publish` currently only marks a page `published` in D1 — it does not render HTML or write to R2. Public pages (`/about`, `/adopt`, `/services`, `/donate`) are served from hardcoded HTML templates, not from D1 `cms_page_sections` data.

**The critical path to fix:**
1. Wire `renderPage(route, env)` inside the `/api/cms/publish` handler
2. Each section type needs a renderer function (`renderSection(section, blocks, brand)`)
3. Rendered HTML writes to `WEBSITE_ASSETS` R2 at `static/pages/{slug}/index.html`
4. Assembled page caches in `CMS_CACHE` KV at key `page:{route}`
5. Worker `fetch()` serves from KV → R2 → on-demand render (in that priority)

### Content errors to fix before any page goes live
| Page | Error | Fix |
|---|---|---|
| `/services` | Wrong mission — describes community pet assistance (spay/neuter, pet food) | Rewrite: medical funding + transport + rescue partnerships for shelter dogs |
| `/donate` | Wrong org name: "Paw Love Rescue & Services" | Replace with "Companions of CPAS" |
| `/donate` | Wrong address: "Dry Prong, LA 71423" (Grant Parish) | Replace with correct CPAS contact |
| `/donate` | Wrong parish throughout: "Grant Parish" | Replace with "Caddo Parish" |
| Brand settings | `logo_url` is empty string | `UPDATE cms_brand_settings SET logo_url='https://assets.meauxxx.com/static/assets/logo.png' WHERE tenant_id='tenant_companionscpas'` |

---

## Worker Bindings

| Binding | Type | Value | ID |
|---|---|---|---|
| `AGENTSAM_WAI` | Workers AI | Workers AI Catalog | — |
| `ASSETS` | Assets | Static fallback (migrating out) | — |
| `CMS_CACHE` | KV namespace | `companionscpas-cache` | `0b410337a8494fc982ea04c5bde1eab4` |
| `DB` | D1 database | `companionscpas` | `fd6dd6fb-156b-4b6a-8ff0-505422652391` |
| `WEBSITE_ASSETS` | R2 bucket | `companionscpas` | — |

Config file: `wrangler.toml` (not `wrangler.production.toml`).

---

## Source File Map

```
companionscpas-platform/
└── src/
    ├── index.js                   ← Worker entry. Routes all requests.
    └── api/
        ├── _shell.js              ← Shared HTML shell. getBrand() reads D1+KV.
        ├── agentsam_api.js        ← Agent Sam chat + session management
        ├── agentsam_tools.js      ← DB-driven tool dispatch (no hardcoded tools)
        ├── auth_login.js          ← Login: validates credentials, writes agentsam_sessions + sessions
        ├── cms_api.js             ← CMS CRUD: section/block/page/brand/asset + publish stub
        ├── cms_api_additions.js   ← Extended CMS routes (overflow from cms_api.js)
        ├── contact_api.js         ← Public contact form → D1 contact_requests
        ├── dashboard_api.js       ← Dashboard data: animals, fosters, applications
        ├── dashboard_config_api.js← Dashboard config (DB-driven icon/feature flags)
        ├── donation_api.js        ← Stripe checkout intent creation
        ├── password_reset.js      ← Password reset flow (token → D1 → Resend email)
        ├── payments_email.js      ← Stripe webhook handler + Resend email dispatch
        ├── render_home.js         ← Homepage renderer: D1 sections → HTML (DONE — reference impl)
        ├── resolveModel.js        ← LLM routing + ETO sync to IAM
        ├── session_api.js         ← getAuthUser() + /api/auth/me + /api/auth/logout
        └── social.js              ← Facebook/Instagram/YouTube connection routes
```

### Key patterns already established — follow these

**Reading brand (D1 + KV cache):**
```js
// From _shell.js / render_home.js
async function getBrand(env) {
  const cached = await env.CMS_CACHE.get('brand:tenant_companionscpas', { type: 'json' }).catch(() => null);
  if (cached) return cached;
  const brand = await env.DB.prepare(
    'SELECT * FROM cms_brand_settings WHERE tenant_id = ? LIMIT 1'
  ).bind('tenant_companionscpas').first();
  if (brand) await env.CMS_CACHE.put('brand:tenant_companionscpas', JSON.stringify(brand), { expirationTtl: 60 });
  return brand;
}
```

**Auth check (from session_api.js — use this everywhere):**
```js
import { getAuthUser } from './api/session_api.js';
const user = await getAuthUser(request, env);
if (!user) return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
```

**KV cache bust (from cms_api.js):**
```js
async function bustCache(env, ...keys) {
  if (!env.CMS_CACHE) return;
  await Promise.all(keys.map(k => env.CMS_CACHE.delete(k).catch(() => {})));
}
// After any content change:
await bustCache(env, `sections:tenant_companionscpas:${route}`, 'bootstrap:tenant_companionscpas');
```

**Section upsert (from cms_api.js — already correct):**
```js
INSERT INTO cms_page_sections (...) VALUES (...)
ON CONFLICT(tenant_id, page_route, section_key) DO UPDATE SET ...
```

---

## Auth System

### How it works

```
Login POST /api/auth/login (auth_login.js)
  → validate credentials against users + user_credentials
  → INSERT INTO agentsam_sessions (id=uuid, user_id, status='active', route_path, mode)
  → INSERT INTO sessions (id=same uuid, user_id, expires_at=+30days)  ← secondary log
  → Set-Cookie: cpas_session={session_id}; HttpOnly; Secure; SameSite=Strict

Every protected request (session_api.js getAuthUser)
  → read cookie cpas_session → sessionId
  → SELECT FROM agentsam_sessions JOIN users
      WHERE id=? AND status='active'
      AND datetime(created_at, '+30 days') > datetime('now')
  → return user row or null

Logout POST /api/auth/logout
  → UPDATE agentsam_sessions SET status='revoked' WHERE id=?
  → Clear cookie Max-Age=0
```

### Two session tables — both active, different purposes

| Table | Written by | Read by | Purpose |
|---|---|---|---|
| `agentsam_sessions` | `auth_login.js` + `agentsam_api.js` | `getAuthUser()` — **the auth gate** | Auth validation + agent conversation context. Has `route_path`, `mode`, `session_title`, `status`. 30-day expiry enforced in query. |
| `sessions` | `auth_login.js` | Nothing (not read by auth gate) | Secondary audit log written at login. Has `expires_at`, `revoked_at`. Not used for auth decisions. |

**Current state:** 5 valid auth sessions, all `usr_sam_primeaux`. 19 agent sessions all active. One user (you), one tenant.

### Role resolution
```js
// After getAuthUser(), fetch role from tenant_memberships:
const membership = await env.DB.prepare(
  'SELECT role FROM tenant_memberships WHERE user_id = ? AND status = "active" ORDER BY created_at DESC LIMIT 1'
).bind(user.user_id).first();
const role = membership?.role || 'staff';
// Roles: owner, admin, volunteer, staff
```

---

## CMS System

### Data model

```
cms_pages              (route_path, slug, title, status, SEO fields)
  └── cms_page_sections    (page_route, section_key, section_type, heading, body, CTAs, sort_order)
        └── cms_page_content_blocks  (section_key, block_key, block_type — repeating cards/items)

cms_section_schemas    (section_type, schema_json, default_json — field contract for editor + agent)
cms_themes             (design tokens: color, typography, spacing, radius, motion, component)
cms_brand_settings     (logo, colors, navigation_json, footer_json, socials_json, organization_json)
cms_assets             (r2_key, cdn_url, alt_text, category — asset registry)
cms_navigation_items   (label, href, nav_group, sort_order, parent_id)
cms_publish_jobs       (job_type, status, page_id, r2_prefix — publish queue)
cms_publish_artifacts  (r2_key, artifact_type, content_hash, is_current — rendered output)
cms_revisions          (entity_type, before_json, after_json, change_type — full history)
cms_editor_events      (event_type: field_edit|publish|agent_assist|rollback — audit trail)
cms_editor_sessions    (user_id, page_id, started_at, event_count — usage tracking)
cms_page_versions      (snapshot_json, sections_json, status: draft|published|archived)
```

### Section schema registry (19 schemas — agent reads before any edit)

Before proposing any section change, query:
```sql
SELECT schema_json, default_json FROM cms_section_schemas
WHERE section_type = ? AND tenant_id = 'tenant_companionscpas' AND is_active = 1
```

| section_type | Category | Notes |
|---|---|---|
| `hero` | layout | Main page hero — eyebrow, heading, subheading, image, 2 CTAs |
| `text_image` | layout | Text left/right + image |
| `card_grid` | layout | Grid of cards with title + body |
| `text_image_split` | content | Split layout with detailed copy |
| `feature_cards` | content | Icon/image + heading + body cards |
| `faq` | content | Accordion Q&A |
| `org_info` | content | Nonprofit data block — EIN, budget, contact |
| `testimonial` | social_proof | Single quote + attribution |
| `testimonials` | social_proof | Multiple testimonials |
| `impact_stats` | social_proof | Key metric numbers bar |
| `sponsor_logos` | social_proof | Partner/sponsor logo grid |
| `image_gallery` | media | Photo gallery |
| `animal_grid` | dynamic | Queries `animal_profiles` D1 — live data |
| `campaign_grid` | fundraising | Queries `fundraising_campaigns` — live data |
| `cta_banner` | conversion | Full-width CTA strip |
| `donation_block` | conversion | Embedded donation widget |
| `volunteer_cta` | conversion | Foster/volunteer signup CTA |
| `nav` | global | Navigation (rendered from `cms_navigation_items`) |
| `footer` | global | Footer (rendered from brand + socials + IAM badge) |

### Current page state

| Route | D1 Status | Sections in D1 | Live site |
|---|---|---|---|
| `/` | published | 7 | ✅ D1-driven via `render_home.js` |
| `/about` | draft | 1 | ⚠️ Hardcoded template |
| `/adopt` | draft | 0 (empty) | ⚠️ Hardcoded template |
| `/services` | draft | 0 (empty) | 🔴 Wrong content |
| `/donate` | draft | 1 | 🔴 Wrong org/address/parish |

---

## Runtime Contract (Publish Pipeline — NOT YET WIRED)

This is the spec for `renderPage()` — implement in `src/api/cms_api.js` or a new `src/api/render_page.js`:

```js
// Step 1: POST /api/cms/publish handler (currently just marks status='published')
// Replace the stub with:
async function handlePublish(request, env, sessionUser) {
  const { route_path } = await request.json();
  const jobId = `pub_${crypto.randomUUID().slice(0,12)}`;

  await env.DB.prepare(
    `INSERT INTO cms_publish_jobs (id, tenant_id, page_id, job_type, status, triggered_by, created_at, updated_at)
     SELECT ?, 'tenant_companionscpas', id, 'page', 'running', ?, datetime('now'), datetime('now')
     FROM cms_pages WHERE route_path = ? AND tenant_id = 'tenant_companionscpas'`
  ).bind(jobId, sessionUser?.email || 'dashboard', route_path).run();

  try {
    await renderPage(route_path, jobId, env);
    await env.DB.prepare(
      `UPDATE cms_publish_jobs SET status='done', completed_at=datetime('now') WHERE id=?`
    ).bind(jobId).run();
    return json({ success: true, job_id: jobId, route_path });
  } catch (err) {
    await env.DB.prepare(
      `UPDATE cms_publish_jobs SET status='failed', error_message=?, completed_at=datetime('now') WHERE id=?`
    ).bind(err.message, jobId).run();
    return json({ error: err.message, job_id: jobId }, 500);
  }
}

// Step 2: renderPage
const TENANT = 'tenant_companionscpas';
async function renderPage(route, jobId, env) {
  const [page, brand] = await Promise.all([
    env.DB.prepare('SELECT * FROM cms_pages WHERE route_path=? AND tenant_id=?').bind(route, TENANT).first(),
    getBrand(env),
  ]);

  const { results: sections } = await env.DB.prepare(
    'SELECT * FROM cms_page_sections WHERE page_route=? AND tenant_id=? AND is_visible=1 ORDER BY sort_order'
  ).bind(route, TENANT).all();

  const { results: blocks } = await env.DB.prepare(
    'SELECT * FROM cms_page_content_blocks WHERE page_route=? AND tenant_id=? ORDER BY section_key, sort_order'
  ).bind(route, TENANT).all();

  const blocksBySection = blocks.reduce((acc, b) => {
    (acc[b.section_key] = acc[b.section_key] || []).push(b); return acc;
  }, {});

  // Write individual section files + build full page
  const sectionHTMLs = await Promise.all(
    sections.map(async s => {
      const html = renderSection(s, blocksBySection[s.section_key] || [], brand, env);
      await env.WEBSITE_ASSETS.put(
        `static/pages${route}/${s.section_key}.html`, html,
        { httpMetadata: { contentType: 'text/html' } }
      );
      return html;
    })
  );

  const header = await getGlobalPartial('header', brand, env);
  const footer = await getGlobalPartial('footer', brand, env);
  const fullHTML = assembleFullPage(page, brand, header, sectionHTMLs, footer);

  // Write full page artifact
  await env.WEBSITE_ASSETS.put(`static/pages${route}/index.html`, fullHTML,
    { httpMetadata: { contentType: 'text/html' } });

  // Cache in KV (60min)
  await env.CMS_CACHE.put(`page:${route}`, fullHTML, { expirationTtl: 3600 });

  // Log artifact
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(fullHTML));
  const hashHex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,'0')).join('').slice(0,32);
  await env.DB.prepare(
    `INSERT INTO cms_publish_artifacts (id, tenant_id, job_id, page_id, artifact_type, r2_key, r2_bucket, content_hash, is_current, created_at)
     SELECT 'art_'||lower(hex(randomblob(8))), 'tenant_companionscpas', ?, id, 'html', ?, 'companionscpas', ?, 1, datetime('now')
     FROM cms_pages WHERE route_path=? AND tenant_id='tenant_companionscpas'`
  ).bind(jobId, `static/pages${route}/index.html`, hashHex, route).run();
}

// Step 3: Worker serve path (add to index.js before the static asset fallback)
const PUBLIC_ROUTES = ['/', '/about', '/adopt', '/services', '/donate'];
if (PUBLIC_ROUTES.includes(url.pathname)) {
  const cached = await env.CMS_CACHE.get(`page:${url.pathname}`);
  if (cached) return new Response(cached, { headers: { 'content-type': 'text/html' } });

  const artifact = await env.WEBSITE_ASSETS.get(`static/pages${url.pathname}/index.html`);
  if (artifact) {
    const html = await artifact.text();
    await env.CMS_CACHE.put(`page:${url.pathname}`, html, { expirationTtl: 3600 });
    return new Response(html, { headers: { 'content-type': 'text/html' } });
  }
  // fall through to existing hardcoded template as last resort
}
```

### Section renderer dispatch
```js
// Implement in src/api/render_section.js
// render_home.js already has working examples — copy its pattern
export function renderSection(section, blocks, brand) {
  const renderers = {
    hero:             renderHero,
    text_image:       renderTextImage,
    text_image_split: renderTextImageSplit,
    card_grid:        renderCardGrid,
    feature_cards:    renderFeatureCards,
    testimonials:     renderTestimonials,
    testimonial:      renderTestimonial,
    impact_stats:     renderImpactStats,
    campaign_grid:    renderCampaignGrid,  // async — queries fundraising_campaigns
    animal_grid:      renderAnimalGrid,    // async — queries animal_profiles
    cta_banner:       renderCtaBanner,
    donation_block:   renderDonationBlock,
    org_info:         renderOrgInfo,
    faq:              renderFaq,
  };
  const fn = renderers[section.section_type];
  if (!fn) return `<!-- section type '${section.section_type}' has no renderer -->`;
  return fn(section, blocks, brand);
}
```

### Size budget per artifact
| Artifact | Target | Notes |
|---|---|---|
| `static/global/global.css` | ≤ 30KB | Compiled from active theme tokens |
| `static/global/header.html` | ≤ 10KB | Brand + nav |
| `static/global/footer.html` | ≤ 10KB | Brand + socials + IAM badge |
| `static/pages/{slug}/{section_key}.html` | ≤ 50KB each | Markup only — no inline CSS/JS |
| `static/pages/{slug}/index.html` | ≤ 200KB | Full assembled page |

---

## API Routes

### Auth
| Method | Route | Handler | Notes |
|---|---|---|---|
| POST | `/api/auth/login` | `auth_login.js` | Sets `cpas_session` cookie |
| GET | `/api/auth/me` | `session_api.js` | Returns user + role from `agentsam_sessions` |
| POST | `/api/auth/logout` | `session_api.js` | Revokes session, clears cookie |
| POST | `/api/auth/password-reset/request` | `password_reset.js` | Resend email |
| POST | `/api/auth/password-reset/confirm` | `password_reset.js` | Token → new password |

### CMS
| Method | Route | Handler | Status |
|---|---|---|---|
| GET | `/api/cms/bootstrap` | `cms_api.js` | ✅ pages + assets + brand + nav + themes |
| GET | `/api/cms/page?route=` | `cms_api.js` | ✅ page + sections + blocks |
| POST | `/api/cms/page/save` | `cms_api.js` | ✅ upsert page |
| POST | `/api/cms/section/save` | `cms_api.js` | ✅ upsert section + bust KV |
| POST | `/api/cms/section/delete` | `cms_api.js` | ✅ delete + bust KV |
| POST | `/api/cms/block/save` | `cms_api.js` | ✅ upsert block |
| POST | `/api/cms/publish` | `cms_api.js` | ⚠️ marks D1 only — render pipeline NOT wired |
| GET | `/api/cms/brand` | `cms_api.js` | ✅ KV → D1 |
| POST | `/api/cms/brand/save` | `cms_api.js` | ✅ update + bust KV |
| GET | `/api/cms/assets` | `cms_api.js` | ✅ filtered asset list |
| POST | `/api/cms/asset/save` | `cms_api.js` | ✅ upsert asset |
| POST | `/api/cms/publish-global` | — | ❌ NOT BUILT — needed for header/footer/CSS rebuild |

### Agent Sam
| Method | Route | Handler | Auth |
|---|---|---|---|
| POST | `/api/agentsam/chat` | `agentsam_api.js` | Session required |
| GET/POST | `/api/agentsam/tools/*` | `agentsam_tools.js` | Session required |

### Data
| Method | Route | Handler |
|---|---|---|
| GET | `/api/dashboard/*` | `dashboard_api.js` |
| GET | `/api/dashboard/config` | `dashboard_config_api.js` |
| POST | `/api/donations/intent` | `donation_api.js` |
| POST | `/api/donations/webhook` | `payments_email.js` |
| POST | `/api/contact` | `contact_api.js` |
| GET | `/api/health` | `index.js` inline |

---

## R2 Structure

```
companionscpas/  (binding: WEBSITE_ASSETS, custom domain: assets.meauxxx.com)
└── static/
    ├── global/
    │   ├── header.html              ← [NOT BUILT]
    │   ├── footer.html              ← [NOT BUILT]
    │   └── global.css               ← [NOT BUILT]
    ├── assets/
    │   ├── logo.png                 ← light logo (dark backgrounds)
    │   ├── logo-dark.webp           ← dark logo (light backgrounds)
    │   └── iam_badge.jpg            ← Inner Animal Media footer badge
    ├── animals/                     ← 21 animal photos (all webp/jpg)
    │   ├── 2cute.webp · awwmaaann-(1).webp · bigsmiles.webp · bluepit.webp
    │   ├── brindle.jpg · conehead.webp · gimmieabite.webp · goinhome.webp
    │   ├── happyboy.webp · hungryboy.webp · miniscoobydoo.webp · pup.webp
    │   ├── redeye.webp · skinnyman.webp · sus.webp · thefounders.webp
    │   ├── theteam.webp · thinboy.webp · thisismysweater.webp
    │   ├── transport-fundraiser.webp · upclose.webp
    └── pages/
        ├── home/    ← [NOT BUILT — render_home.js serves / directly]
        ├── about/   ← [NOT BUILT]
        ├── adopt/   ← [NOT BUILT]
        ├── services/← [NOT BUILT]
        └── donate/  ← [NOT BUILT]
```

---

## Brand

| Asset | URL |
|---|---|
| Light logo | `https://assets.meauxxx.com/static/assets/logo.png` |
| Dark logo | `https://assets.meauxxx.com/static/assets/logo-dark.webp` |
| IAM badge (footer) | `https://assets.meauxxx.com/static/assets/iam_badge.jpg` |

| Token | Value |
|---|---|
| Primary | `#7c3aed` |
| Secondary | `#172033` |
| Accent | `#ee2336` |
| Themes active | `midnight_companion_glass`, `donation_modal_glass` |

**Organization:**
EIN `88-4156327` · 501(c)(3) · Caddo Parish · `companionsCPAS@gmail.com`
Facebook: `facebook.com/people/Companions-of-CPAS/100069291576354`
Instagram: `instagram.com/companionscpas`

---

## Database Quick Reference

### Tables agents touch most
```sql
-- Read a page + all sections
SELECT * FROM cms_pages WHERE route_path=? AND tenant_id='tenant_companionscpas';
SELECT * FROM cms_page_sections WHERE page_route=? AND tenant_id='tenant_companionscpas' ORDER BY sort_order;
SELECT * FROM cms_page_content_blocks WHERE page_route=? AND tenant_id='tenant_companionscpas' ORDER BY section_key, sort_order;

-- Read brand
SELECT * FROM cms_brand_settings WHERE tenant_id='tenant_companionscpas' LIMIT 1;

-- Read section schema before editing
SELECT schema_json, default_json FROM cms_section_schemas WHERE section_type=? AND is_active=1;

-- Check publish state
SELECT status, tasks_done, tasks_total FROM cms_publish_jobs WHERE tenant_id='tenant_companionscpas' ORDER BY created_at DESC LIMIT 5;

-- Read animal profiles (powers /adopt animal_grid)
SELECT id, name, breed, status, photo_url, bio, adoption_fee_cents, public_visible
FROM animal_profiles WHERE tenant_id='tenant_companionscpas' AND public_visible=1 AND status='available'
ORDER BY featured DESC, sort_order;

-- Read active campaigns (powers campaign_grid)
SELECT id, title, goal_amount_cents, raised_amount_cents, donor_count, status
FROM fundraising_campaigns WHERE is_public=1 AND status='active';

-- Auth: validate session
SELECT s.id, s.user_id, s.route_path, s.mode, u.full_name, u.email
FROM agentsam_sessions s JOIN users u ON u.id=s.user_id
WHERE s.id=? AND s.status='active' AND datetime(s.created_at,'+30 days')>datetime('now');
```

---

## Development

```bash
# Clone
git clone https://github.com/SamPrimeaux/companionscpas-platform.git
cd companionscpas-platform
npm install

# Local dev (uses wrangler.toml)
wrangler dev

# Deploy
wrangler deploy
```

Local secrets in `.dev.vars`:
```
RESEND_API_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
AGENTSAM_BRIDGE_TOKEN=...
```

---

## Ordered Task List for Agents

Work these in order. Each task is self-contained.

### Immediate (no deploy — SQL only)
1. `UPDATE cms_brand_settings SET logo_url='https://assets.meauxxx.com/static/assets/logo.png' WHERE tenant_id='tenant_companionscpas'` — fixes broken logo on About/Adopt
2. Rewrite `/services` sections in D1 — wrong mission, needs: medical funding + transport + rescue partnerships
3. Rewrite `/donate` sections — fix org name, address, parish throughout

### Short sprint (src/ changes → `wrangler deploy`)
4. Write `src/api/render_section.js` — section renderer dispatch. Copy pattern from `render_home.js`
5. Implement `renderPage()` and `getGlobalPartial()` — wire into `/api/cms/publish` handler in `cms_api.js`
6. Add `POST /api/cms/publish-global` route — rebuilds `static/global/header.html`, `footer.html`, `global.css`
7. Add public route serve logic in `index.js` — KV → R2 → fallback for `/about`, `/adopt`, `/services`, `/donate`
8. Seed sections for `/adopt` (0 in D1) and `/services` (0 in D1)

### After publish pipeline is live
9. Wire `animal_profiles` query into `renderAnimalGrid()` — fixes "Loading..." on adopt page
10. Populate `cms_section_schemas.schema_json` for 8 schemas missing field definitions
11. Populate `cms_brand_settings.navigation_json` from `cms_navigation_items`
12. Run full site publish: `POST /api/cms/publish` for each route

---

## What Never Needs a Deploy

- Page content edits (D1 via `/api/cms/section/save`)
- Brand updates — logo, colors, nav, footer (D1 via `/api/cms/brand/save`)
- Asset additions (D1 + R2 upload)
- New Agent Sam tools (D1 insert into `agentsam_tools`)
- Theme token updates (D1)
- Adding admin users (D1 insert into `users` + `admin_users` + `tenant_memberships`)

---

## Client Handoff

### Domain migration
When client purchases domain:
1. Add to R2 `companionscpas` bucket → Custom Domains (replace `assets.meauxxx.com`)
2. Point DNS to Cloudflare Worker route
3. `UPDATE cms_brand_settings SET site_domain='<new-domain>' WHERE tenant_id='tenant_companionscpas'`
4. Update `wrangler.toml` routes

### Client can do without developer
- Edit any page content via `/dashboard?view=cms`
- Upload new photos to R2 via dashboard asset manager
- View donation records, applications, volunteer roster in dashboard
- Agent Sam assists with content writing in the CMS sidebar

---

*Developed by [Inner Animal Media](https://inneranimalmedia.com) · sam@inneranimalmedia.com
*Developed and maintained by [Inner Animal Media](https://inneranimalmedia.com) · info@inneranimals.com + sam@inneranimalmedia.com
