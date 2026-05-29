# CompanionsCPAS Agent Context v1

## Mission
Companions of CPAS is a 501(c)(3) volunteer-powered rescue support organization helping dogs at Caddo Parish Animal Services receive medical care, transport support, rescue placement, adoption visibility, and second chances.

## Stack
Cloudflare Workers + D1 + R2 + KV + Workers AI.

Bindings:
- DB = D1 companionscpas
- CMS_CACHE = KV companionscpas-cache
- WEBSITE_ASSETS = R2 companionscpas
- AGENTSAM_WAI = Workers AI
- ASSETS = static fallback

Tenant:
- tenant_companionscpas

## Runtime Model
D1 is the content source of truth.
R2 stores rendered HTML/CSS/image artifacts.
KV caches assembled page HTML and brand/bootstrap payloads.
Worker serves public pages from KV -> R2 -> fallback/render.

## Public Pages Required
Home, Donate, Foster, Adopt, Rescue, Success Stories, FAQ, Events/News, Wishlist, Contact.

## CMS Publish Pipeline
Goal:
cms_pages + cms_page_sections + cms_page_content_blocks -> render_section.js -> render_page.js -> R2 artifacts -> KV page cache.

Current renderer files:
- src/api/render_section.js exists
- src/api/render_page.js exists

Still needed:
- Wire POST /api/cms/publish in src/api/cms_api.js to call renderPage()
- Add public route serving in src/index.js for /about /adopt /services /donate
- Add publish-global for header/footer/global.css
- Seed missing sections for /adopt and /services
- Fix /services and /donate content errors

## Critical Content Rules
Never describe Companions of CPAS as the shelter.
Do not use Grant Parish, Dry Prong, or Paw Love Rescue.
Correct org name: Companions of CPAS.
Correct parish: Caddo Parish.
Mission framing: medical funding, transport support, rescue partnerships, adoption visibility, and second chances for shelter dogs.

## Current Known Page State
/ is D1+KV driven via render_home.js.
/about has 1 D1 section but live site still uses hardcoded fallback.
/adopt has 0 D1 sections.
/services has 0 D1 sections and wrong old content.
/donate has 1 D1 section and wrong old content.

## Client Contract Scope
Build a self-managed nonprofit platform with public website, donation flow, donor emails, downloadable forms, social integration, board dashboard, multi-user access, domain/DNS support, and Cloudflare hosting.

## Current Sprint Status
Completed:
- Created render_section.js
- Created render_page.js
- Patched route normalization and safe fallback nav URLs
- Syntax checks passed
- R2 key test passed: //about -> static/pages/about/index.html

Next:
1. Commit renderer foundation.
2. Audit recent commits.
3. Wire cms_api.js publish route to renderPage().
4. Add index.js KV -> R2 public serving.
5. Test /api/cms/publish for /about only.
