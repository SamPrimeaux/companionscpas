---
doc_type: feature
feature_id: public-publish-pipeline
product: companionscpas
title: Public Site Publish Pipeline
status: live
last_verified: 2026-06-19
tenant_id: tenant_companionscpas
tags:
  - cms
  - publish
  - r2
  - kv
  - fragments
  - public-site
surfaces:
  routes:
    - /
    - /about
    - /adopt
    - /donate
    - /services
    - /community
  frontend:
    - public/static/global/cpas-shell.css
    - public/static/js/cpas-modals.js
  backend:
    - src/index.js
    - src/api/page_cms_registry.js
    - src/api/render_home_fragments.js
    - src/api/render_about_fragments.js
    - src/api/render_generic_fragments.js
    - src/api/render_page.js
    - src/api/page_shell.js
  d1_tables:
    - cms_pages
    - cms_page_sections
    - cms_page_content_blocks
    - cms_brand_settings
  bindings:
    - DB
    - WEBSITE_ASSETS
    - CMS_CACHE
related_docs:
  - docs/features/cms-live-editor.md
  - docs/homepage-readme.md
  - docs/about-readme.md
  - docs/donate-readme.md
---

## Summary

All six public marketing routes use a **sectionalized CMS pipeline**: D1 sections → per-section R2 HTML fragments → Worker assembly → KV cache → browser. This is the core public-site architecture for `companionsofcaddo.org`.

## Public routes

| URL | slug | Fragment renderer |
|---|---|---|
| `/` | home | `render_home_fragments.js` + section sync |
| `/about` | about | `render_about_fragments.js` |
| `/adopt` | adopt | generic + `render_shelter_hub.js` |
| `/donate` | donate | `render_donate_v2.js` |
| `/services` | services | `render_generic_fragments.js` |
| `/community` | community | generic + social embed |

Registry: `page_cms_registry.js`.

## Request flow (`servePublicPage` in `src/index.js`)

1. **KV hit** — return `page:{route}` immediately.
2. **Fragment assembly** — stitch R2 section files + shell (header/footer from brand).
3. **R2 fallback** — `static/pages/{route}/index.html` if present.
4. **Legacy render** — `render_page.js` full build from D1 (fallback).

## Publish flow

```
Dashboard save/publish
  → D1 cms_page_sections (+ blocks)
  → section renderer → R2 static/pages/{route}/{section_key}.html
  → assemble full page
  → CMS_CACHE.delete("page:{route}")
  → live at companionsofcaddo.org{route}
```

## KV keys

| Key | Busted when |
|---|---|
| `page:/`, `page:/about`, ... | publish that route |
| `bootstrap:tenant_companionscpas` | any CMS save |
| `sections:tenant_companionscpas:/{route}` | section save |

## Operational commands

```bash
npm run deploy:full
node scripts/sync-page-fragments.mjs
node scripts/republish-shell-pages.mjs
npx wrangler kv key delete --binding=CMS_CACHE "page:/" --remote
npx wrangler r2 object put companionscpas/static/global/cpas-shell.css \
  --file=public/static/global/cpas-shell.css --content-type=text/css --remote
```

After CSS/JS changes: bump versions in `page_shell.js` + bust KV.

## Constraints and safety

- R2 page HTML is a **build artifact** — never hand-edit for permanent fixes.
- `image_url` fields must be full `https://assets.companionsofcaddo.org/...` URLs.
- CDN CNAME: `assets.companionsofcaddo.org`.

## Known gaps

| Gap | Severity | Tracking |
|---|---|---|
| `/adopt` animal grid depth | medium | README backlog |
| Block editor not writing all block types | medium | cms-live-editor.md |

## Test checklist

- [ ] Each of 6 routes returns 200 and matches D1 content after publish
- [ ] KV bust reflects edit within expected TTL
- [ ] `audit_public_images.py` reports 0 broken URLs

## Vectorization notes

**Synonyms:** publish pipeline, fragment CMS, sectionalized CMS, R2 fragments, KV cache, public pages, live site, companionsofcaddo.org, page assembly, sync fragments.
