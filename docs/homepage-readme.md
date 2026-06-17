# Homepage — How It Works

The live homepage at [`https://companionsofcaddo.org/`](https://companionsofcaddo.org/) is built from **seven R2 section fragments**. The CMS dashboard at [`/dashboard/cms/pages/home`](https://companionsofcaddo.org/dashboard/cms/pages/home) is now wired to update those fragments on save and publish.

---

## Pipeline (team editing flow)

```
Dashboard edit  →  D1 (cms_page_sections + cms_page_content_blocks)
       ↓ save / publish
Home renderers  →  R2 static/pages/home/*.html  (one file per section)
       ↓ publish (or live serve)
Fragment stitch →  full HTML for /
       ↓ publish only
KV cache        →  page:/  (fast repeat visits)
R2 artifact     →  static/pages/index.html  (optional baked full page)
```

| Step | What happens | Storage |
|------|----------------|---------|
| **Edit** | Team changes copy, images, CTAs in CMS | D1 — source of truth for editable fields |
| **Save draft** | Section/block POST → render section → write R2 fragment → bust `page:/` KV | R2 fragments updated; live reflects on next request |
| **Preview** | `GET /api/cms/preview?route=/` → sync D1→R2 → assemble fragments | Same HTML path as live |
| **Publish** | `POST /api/cms/publish` → sync all sections → assemble → write `static/pages/index.html` + KV | Page status `published` in D1 |

**D1** holds structured content the team edits. **R2 fragments** hold the rendered HTML the live site reads. **KV** caches the assembled full page after publish (TTL ~1 hour). You do not need to manually bust KV after every save — saves bust `page:/` automatically.

---

## Section files (in order)

| # | D1 `section_key` | R2 key | Editable in CMS |
|---|------------------|--------|-----------------|
| 1 | `hero` | `static/pages/home/hero.html` | Headline, subcopy, image, CTAs |
| 2 | `mission` | `static/pages/home/mission.html` | Eyebrow, heading, body (+ flow steps via blocks) |
| 3 | `how_it_helps` | `static/pages/home/how-it-helps.html` | Section eyebrow (+ pillar blocks) |
| 4 | `transport_win` | `static/pages/home/transport-win.html` | Story copy, image, CTA |
| 5 | `impact_stats` | `static/pages/home/impact-stats.html` | Stat cells via blocks |
| 6 | `campaigns` | `static/pages/home/campaigns.html` | Campaign + community items via blocks |
| 7 | `newsletter` | `static/pages/home/newsletter.html` | Heading, subcopy, CTA labels |

Local copies: [`static/pages/home/`](../static/pages/home/).

Implementation:

- [`src/api/home_cms_sync.js`](../src/api/home_cms_sync.js) — D1 load, ensure defaults, sync to R2, publish
- [`src/api/render_home_section.js`](../src/api/render_home_section.js) — fragment HTML renderers per section key
- [`src/api/render_home_fragments.js`](../src/api/render_home_fragments.js) — stitch fragments + shell

---

## First-time / reset bootstrap

If the CMS home editor shows wrong or missing sections, run once while logged into the dashboard:

```javascript
fetch('/api/cms/home/bootstrap', {
  method: 'POST',
  credentials: 'include',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ force: true })
}).then(r => r.json()).then(console.log)
```

- `force: false` — inserts missing canonical sections/blocks only
- `force: true` — resets all 7 home sections + blocks to defaults, re-renders R2 fragments

Then **Publish** from the home page editor (or `POST /api/cms/publish` with `route_path: "/"`).

---

## Shell assets

| Asset | Role |
|-------|------|
| `static/global/cpas-header.html` | Site header + mobile menu |
| `static/global/cpas-footer.html` | Site footer |
| `static/global/shared.css` | Global styles |
| `static/global/shared.js` | Nav, theme, `data-action` handlers |
| `static/js/donate-modal.js` | Donate modal |

---

## Known limits

- **Block-heavy sections** (mission steps, pillars, stats, campaigns) store child rows in `cms_page_content_blocks`. The section editor UI today focuses on top-level section fields; block editing UI is a follow-up. Blocks are seeded by bootstrap and sync correctly on save when updated via API.
- **Other routes** (`/services`, `/adopt`, `/donate`, `/community`) use the **generic fragment pipeline** via `render_section.js` — see README [Sectionalized CMS System](../README.md#sectionalized-cms-system).

Fragment-managed routes today: **`/`**, **`/about`** (custom renderers), **`/services`**, **`/adopt`**, **`/donate`**, **`/community`** (generic renderers).

---

## Quick checks

**Live + preview aligned (good):**

- Preview iframe matches `companionsofcaddo.org/`
- `hero-split`, “Every dog deserves a way out.”
- No `window.__BRAND` in `<head>`

**Stale cache (bad):**

- Old copy after publish — bust KV key `page:/` or republish `/`

---

## Related files

| File | Role |
|------|------|
| [`src/api/home_cms_sync.js`](../src/api/home_cms_sync.js) | D1 ↔ R2 sync + publish orchestration |
| [`src/api/render_home_section.js`](../src/api/render_home_section.js) | Per-section fragment renderers |
| [`src/api/render_home_fragments.js`](../src/api/render_home_fragments.js) | Fragment assembly |
| [`src/api/cms_api.js`](../src/api/cms_api.js) | Save/preview/publish/bootstrap endpoints |
| [`public/dashboard/js/view-cms.jsx`](../public/dashboard/js/view-cms.jsx) | CMS page editor UI |
