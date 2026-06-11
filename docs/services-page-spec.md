# /services Page — Full Specification

**Route:** `companionsofcaddo.org/services`  
**Nav label:** Foster (nav links here from `header_json` in `cms_brand_settings`)  
**Theme:** `light` (`--bg: #f5f1e8`, warm cream)  
**Last major rebuild:** 2026-06-11  
**Purpose:** Convert visitors into fosters, volunteers, and movement participants. Not a services directory. This is the action page.

---

## How this page renders

Every request hits the Cloudflare Worker at `src/index.js`. It checks KV cache key `page:/services`. On a miss it calls `renderPage('/services', userId, env)` in `src/api/render_page.js`, which:

1. Queries `cms_page_sections WHERE page_route = '/services' ORDER BY sort_order`
2. For each section, queries `cms_page_content_blocks WHERE page_route = '/services' AND section_key = ?`
3. Calls the matching renderer from `src/api/render_section.js`
4. Wraps output in the full shell from `renderFullPage()` (header, footer, CSS/JS links)
5. Writes rendered HTML to R2 at `static/pages/services/index.html`
6. Writes to KV `page:/services`

**To publish changes:** Dashboard → CMS Website → Pages → Services → Publish Live. This is the only way to regenerate R2 and KV from the current D1 state. The Publish button is the single source of truth trigger.

**To bust the cache without republishing:** `npx wrangler kv key delete --binding=CMS_CACHE "page:/services" --remote` — next request will re-render from D1 but not update R2.

---

## Section map (current, ordered by sort_order)

### 1. `services_hero` — type: `hero` — sort: 10

The opening statement. Large split layout: text left, dog photo right.

| Field | Value |
|---|---|
| eyebrow | Open Your Home · Caddo Parish |
| heading | A short-term foster can change everything. |
| subheading | Fostering gives a dog safety, stability, and time. Whether a dog is waiting for transport, recovering from care, or just needs a break from the shelter — a temporary home helps them reach the next step. |
| image_url | `https://assets.companionsofcaddo.org/media/animals/bigsmiles.webp` |
| cta_label | Apply to Foster |
| cta_href | `modal:foster` → opens foster application modal |
| cta_secondary_label | See Dogs Needing Foster |
| cta_secondary_href | `/adopt` |

**CSS notes:** `.section-hero` has `min-height: 88vh`, `padding-bottom: clamp(60px,6vw,100px)`. The `.hero-blend-out` div is `position: absolute; bottom: 0; height: 160px; z-index: 1` — it dissolves the bottom of the hero into `--bg`. All sections below have `position: relative; z-index: 2` to stack correctly above it. Do not set `overflow: hidden` on `.section-hero` or the blend stops working. Do not set `.hero-blend-out` `z-index` higher than 2 or it covers the next section's content.

**To swap the hero image:** Update `image_url` in D1, then Publish Live.

---

### 2. `services_mission` — type: `text_image` — sort: 15

The brand bridge. Explains what CPAS actually is — not an adoption center, but the connective tissue between shelter and outcome.

| Field | Value |
|---|---|
| eyebrow | Caddo Parish · Volunteer Powered |
| heading | We step in where the shelter cannot. |
| body | Full paragraph explaining CPAS role — funding care, transport, fosters, visibility |
| image_url | `https://assets.companionsofcaddo.org/media/team/theteam.webp` |
| cta_label | See Dogs Available |
| cta_href | `/adopt` |

**Rendered by:** `renderTextImage()`. Layout: text-content left, image right. Image gets `aspect-ratio: 4/5`, rounded corners, border, shadow.

**To update:** Edit `body` or `image_url` in D1 for this section_key, then Publish Live. Good candidate for swapping to `media/team/thefounders.webp` if a more personal feel is wanted.

---

### 3. `services_ways` — type: `feature_cards` — sort: 18

Three cards showing the three ways to help. Each card has an image, title, body, and a CTA button wired to a modal or page.

| block_key | title | image | CTA |
|---|---|---|---|
| `way_foster` | Open your home. | `happyboy.webp` | `modal:foster` |
| `way_volunteer` | Give your time. | `tansportfundraiserdogimage.webp` | `modal:volunteer` |
| `way_donate` | Fund the work. | `goinhomejustadopted.webp` | `/donate` |

**Rendered by:** `renderFeatureCards()`. 3-column grid. Cards have `card-img` aspect-ratio `4/3`, card-body with title + text + CTA link.

**To add a fourth card:** Insert a new row in `cms_page_content_blocks` with `section_key = 'services_ways'`, increment `sort_order`. Cards render in sort_order ASC.

**Image swap candidates:** Any image from the R2 `media/animals/` pool works here. Keep the emotional register consistent — use action/warmth images, not medical watch photos.

---

### 4. `service_cards` — type: `foster_grid` — sort: 20

Real dogs needing foster right now. This section should be kept current — update it when dogs are placed or new urgent cases come in.

| block_key | Dog | Image | Status |
|---|---|---|---|
| `chopper` | Chopper — 2mo, transport July 10 | `media/animals/chopper.webp` | foster_needed |
| `toffee` | Toffee — 4mo, Terrier mix, adoption-ready | `media/campaign/meet-toffee.webp` | available |
| `foster_open` | Open foster slot — general | `media/animals/pup.webp` | evergreen |

**Rendered by:** `renderFosterGrid()`. First card gets `.foster-card--tall` class (`aspect-ratio: 3/5`). Remaining cards are `3/4`. The section-level CTA (Apply to Foster) renders above the card grid via `.foster-header` flex row.

**To update a dog card:** Update the block row in `cms_page_content_blocks` — change `title`, `body`, `image_url`, `action_label`, `action_value`. Then Publish Live.

**To add a new urgent dog:** Insert a new block with `section_key = 'service_cards'`, `block_type = 'card'`, wire `action_value = 'modal:foster'` or `'mailto:contact@email.com'`. Then Publish Live.

**Contact info for current dogs:**
- Chopper: Amanda Norris — `anorris@caddo.gov` — transport 2026-07-10
- Toffee: Kim Freeman (adoption) — `kfreeman@caddo.gov` — shelter ID A0060701275

---

### 5. `services_reassure` — type: `cta_banner` — sort: 25

Emotional reassurance for hesitant would-be fosters. Warm, direct, no pressure.

| Field | Value |
|---|---|
| eyebrow | No Experience Needed |
| heading | You do not have to have it all figured out. |
| subheading | Fosters help provide a safe temporary place while Companions and shelter partners continue working on rescue, transport, adoption, or care... |
| cta_label | Apply to Foster → `modal:foster` |
| cta_secondary_label | Ask a Question → `modal:contact` |

**Rendered by:** `renderCtaBanner()`. Section gets `id="services_reassure"` from the `_sectionKey` anchor patch. Centered text, two button row.

**Copy rule:** Keep this section short and honest. No statistics. No guilt. This is for the person who wants to help but doesn't know if they're ready.

---

### 6. `services_volunteer` — type: `feature_cards` — sort: 27

Four volunteer role cards. Each describes a specific, concrete thing a volunteer does.

| block_key | Role | Image |
|---|---|---|
| `blk_vol_transport` | Transport Driver | `tansportfundraiserdogimage.webp` |
| `blk_vol_foster_coord` | Foster Coordinator | `bigsmiles.webp` |
| `blk_vol_photo` | Photographer | `sus.webp` |
| `blk_vol_social` | Social Media Advocate | `2cutepups.webp` |

All four CTAs → `modal:volunteer`.

**To add a role:** Insert a new block into `cms_page_content_blocks` with `section_key = 'services_volunteer'`. Publish Live.

**Image swap note:** Photographer and transport roles benefit most from action shots. When better volunteer/event photography exists, swap those two first.

---

### 7. `foster_form` — type: `cta_banner` — sort: 30

The closing CTA. Both primary actions are available — foster and volunteer. This is the last thing on the page before the footer.

| Field | Value |
|---|---|
| eyebrow | Ready When You Are |
| heading | Choose how you want to help. |
| subheading | Foster a dog. Volunteer your time. Both matter. Both move dogs forward. Applications take about 5 minutes and are reviewed personally. |
| cta_label | Apply to Foster → `modal:foster` |
| cta_secondary_label | Volunteer With Us → `modal:volunteer` |

---

## Modal system

All modals are injected at runtime by `static/global/cpas-shell.js`. No server rendering involved — pure client JS.

| Key | Trigger | Submits to | Success state |
|---|---|---|---|
| `foster` | Any `[data-modal="foster"]` element | `POST /api/foster/apply` | "Application received!" |
| `volunteer` | Any `[data-modal="volunteer"]` element | Client-side only (ok=true) pending `/api/volunteer/apply` | "Interest received!" |
| `contact` | Any `[data-modal="contact"]` element | Client-side only pending contact API | "Message sent!" |

**How `modal:` CTA hrefs work:** `renderCta()` in `render_section.js` detects when `url` starts with `modal:` and renders a `<button data-modal="key">` instead of an `<a href>`. The JS delegate listener on `document` catches all clicks on `[data-modal]` elements sitewide.

**Foster form fields (24 total from `cpas_application_fields`):**
Required: first_name, last_name, email, city, state, housing_type, has_yard, foster_experience, foster_duration, why_foster, agree_terms, dog_sizes, adults_in_home, postal_code
Optional: phone, landlord_ok, special_needs_ok, vet_reference, current_pets, children_in_home, additional_info

Submissions write to `cpas_foster_applications` in D1. Dashboard view at `/dashboard/applications`.

**To wire volunteer form to backend:** Create `POST /api/volunteer/apply` handler, insert to a `volunteer_records` table (or reuse `cpas_foster_applications` with `form_key = 'volunteer'`), update `handleSubmit` in `cpas-shell.js` to POST instead of `ok = true`.

---

## CSS architecture for this page

The page uses `theme-light` on `<body>`. Key tokens:

```
--bg:           #f5f1e8   (warm cream)
--surface:      #edeae0   (slightly darker card bg)
--text-1:       #1a1622   (near-black)
--text-2:       #4b4453   (muted body text)
--purple:       #7c3aed   (primary accent)
--border:       rgba(23,32,51,0.08)
```

**Header on light pages:** At scroll top, header uses `rgba(245,241,232,0.72)` frosted background with dark text (`rgba(23,32,51,0.75)`) so nav links are legible on cream. Once `.scrolled` class fires (after 24px scroll), nav text switches to `var(--text-1)` solid.

**Section font consistency:** All `.theme-light .section h2` use `--font-body` (DM Sans 700) to match the hero h1. Don't switch to `--font-display` (Fraunces serif) for section headings on this page — it breaks the visual rhythm set by the large hero type.

**Hero blend fix history:** `hero-blend-out` was originally `z-index: 3; bottom: -1px; height: 240px` — this caused it to overlap the first section below the hero, making the mission section text appear faded. Fixed to `z-index: 1; bottom: 0; height: 160px`. All `.section` elements have `z-index: 2` to stack above it cleanly.

---

## R2 image inventory (CDN: `assets.companionsofcaddo.org`)

All images served via Cloudflare CDN at `assets.companionsofcaddo.org`. Upload new images via Dashboard → CMS Website → Images, or directly via `npx wrangler r2 object put companionscpas/media/animals/filename.webp --file=path --content-type=image/webp --remote`.

**Currently used on this page:**

| File | Used in section |
|---|---|
| `media/animals/bigsmiles.webp` | Hero, services_ways (foster coord card) |
| `media/animals/happyboy.webp` | services_ways (foster card) |
| `media/animals/goinhomejustadopted.webp` | services_ways (donate card) |
| `media/animals/tansportfundraiserdogimage.webp` | services_ways (volunteer card), volunteer roles |
| `media/animals/chopper.webp` | service_cards (Chopper foster card) |
| `media/campaign/meet-toffee.webp` | service_cards (Toffee adoption card) |
| `media/animals/pup.webp` | service_cards (open foster slot) |
| `media/animals/sus.webp` | services_volunteer (photographer role) |
| `media/animals/2cutepups.webp` | services_volunteer (social media role) |
| `media/team/theteam.webp` | services_mission (text_image right column) |

**Full animal image pool available:**

| File | Notes |
|---|---|
| `media/animals/2cutepups.webp` | Two puppies, community |
| `media/animals/bigsmiles.webp` | Smiling pit mix on tile, hero-quality |
| `media/animals/bluepit.webp` | Blue/grey pit, Blue |
| `media/animals/brindle.webp` | Brindle dog |
| `media/animals/conehead.webp` | Post-surgery, medical watch |
| `media/animals/gimmieabite.webp` | Food-motivated, Biscuit |
| `media/animals/goinhomejustadopted.webp` | Happy adoption moment |
| `media/animals/happyboy.webp` | Happy yellow dog, foster-positive |
| `media/animals/hungryboy.webp` | Thin dog, medical context only |
| `media/animals/miniscoobydoo.webp` | Small dog, Scooby |
| `media/animals/pup.webp` | Dalmatian-mix puppy, Patches |
| `media/animals/redeye.webp` | Adult dog, Red |
| `media/animals/skinnyman.webp` | Thin dog, medical context only |
| `media/animals/sus.webp` | Suspicious/curious expression, Mischief |
| `media/animals/tansportfundraiserdogimage.webp` | Transport/fundraising |
| `media/animals/thinboy.webp` | Thin dog, Chance |
| `media/animals/thisismysweater.webp` | Charming dog in sweater, Sweater |
| `media/animals/upclose.webp` | Close-up face, Joy |
| `media/animals/chopper.webp` | Chopper — active foster urgent |
| `media/campaign/meet-toffee.webp` | Toffee campaign flyer — adoption ready |
| `media/team/theteam.webp` | Team photo |
| `media/team/thefounders.webp` | Founders photo — personal/about context |

**Image usage rules:**
- `hungryboy`, `skinnyman`, `thinboy`, `conehead` — use only in medical/donation contexts, never in foster recruitment sections. Do not use as "why fostering is great" imagery.
- `goinhomejustadopted` — best for donation and outcome sections. Shows the reward.
- `bigsmiles`, `happyboy`, `pup` — best hero and foster recruitment images. High warmth.

---

## D1 tables involved

| Table | Role |
|---|---|
| `cms_page_sections` | One row per section. Contains heading, subheading, eyebrow, image_url, cta fields, section_type, sort_order. |
| `cms_page_content_blocks` | One row per card/block within a section. Contains title, body, image_url, action_label, action_value. |
| `cms_application_forms` | form_key `foster_application` — config for the foster form. |
| `cpas_application_fields` | 24 rows defining the foster form fields, types, validation, sort order. |
| `cpas_foster_applications` | Submissions land here. View in dashboard at `/dashboard/applications`. |
| `animal_profiles` | Source of truth for individual dog data (Chopper, Toffee, etc). |
| `cms_assets` | R2 image registry. Used by the dashboard image picker. |

---

## Deploy sequence for any change to this page

```
# 1. Edit D1 data (sections or blocks)
npx wrangler d1 execute companionscpas --remote --command "UPDATE ..."

# 2. If editing render logic (render_section.js, render_page.js, index.js):
git add src/ && git commit -m "..." && git push origin main
wrangler deploy

# 3. If editing CSS (cpas-shell.css):
npx wrangler r2 object put companionscpas/static/global/cpas-shell.css \
  --file=static/global/cpas-shell.css --content-type=text/css --remote

# 4. If editing JS (cpas-shell.js):
npx wrangler r2 object put companionscpas/static/global/cpas-shell.js \
  --file=static/global/cpas-shell.js --content-type=application/javascript --remote

# 5. Bust KV (forces re-render on next visit, does NOT update R2 artifact)
npx wrangler kv key delete --binding=CMS_CACHE "page:/services" --remote

# 6. Publish Live from dashboard (regenerates R2 + KV from current D1 state)
# Dashboard → CMS Website → Pages → Services → Publish Live
# This is REQUIRED after any D1 section/block change to go live.
```

**CSS and JS changes are live immediately** after the R2 put — no publish needed since the browser fetches them fresh.  
**D1 changes require a Publish** to regenerate the R2 HTML artifact.

---

## Pending / known gaps

| Item | Status |
|---|---|
| `/api/volunteer/apply` backend route | Not wired — volunteer modal submits `ok=true` client-side. Needs D1 table + handler. |
| Contact form backend | Not wired — contact modal is client-side only. |
| Foster application email notification | `RESEND_API_KEY` is set, email template `foster_application_received` referenced in `settings_json` but email send not verified end-to-end. |
| Chopper photo | Only in R2 as `media/animals/chopper.webp` — not in campaign folder. Consider uploading a campaign-style card version like Toffee has. |
| Transport date on Chopper card | Hard-coded as July 10 in block body text. Update `cms_page_content_blocks` when date changes or dog is placed. |
| `services_mission` image | Using `media/team/theteam.webp`. Swap to actual org action photo when available. |
