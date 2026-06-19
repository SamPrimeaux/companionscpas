---
doc_type: feature
feature_id: cms-live-editor
product: companionscpas
title: CMS Live Page Editor
status: live
last_verified: 2026-06-19
tenant_id: tenant_companionscpas
tags:
  - cms
  - content
  - editor
  - publish
surfaces:
  routes:
    - /dashboard/cms/pages/:pageId
  frontend:
    - public/dashboard/js/view-cms.jsx
  backend:
    - src/api/cms_api.js
    - src/api/render_page.js
    - src/api/render_section.js
    - src/api/page_cms_registry.js
  d1_tables:
    - cms_pages
    - cms_page_sections
    - cms_page_content_blocks
    - cms_brand_settings
    - cms_publish_jobs
  bindings:
    - DB
    - WEBSITE_ASSETS
    - CMS_CACHE
related_docs:
  - docs/features/cms-website-admin.md
  - docs/features/public-publish-pipeline.md
  - docs/current-file-map.md
---

## Summary

The CMS live page editor lets staff edit public website content section-by-section: headings, body copy, images, CTAs, and repeating blocks. D1 is the source of truth; saves update `cms_page_sections` and `cms_page_content_blocks`. Publish/sync regenerates R2 HTML fragments and busts KV so `companionsofcaddo.org` reflects changes.

## User goals

- Open a public page (home, about, adopt, donate, services, community) from the dashboard.
- Edit section fields and content blocks without touching HTML by hand.
- Preview changes before publish where supported.
- Publish a single route or rely on fragment sync after section save.
- Toggle nav visibility for a page when needed.

## Routes and navigation

| Route | View | Notes |
|---|---|---|
| `/dashboard/cms/pages` | `CmsPagesView` | Entry list; links into editor |
| `/dashboard/cms/pages/:pageId` | `CmsPageEditorView` | Live editor for one page |

Sidebar: **Website → CMS Website → Pages**.

## Data model (canonical)

| Table | Role |
|---|---|
| `cms_pages` | Page meta: `route_path`, `slug`, `title`, `status`, `theme` |
| `cms_page_sections` | Section rows keyed by `page_route` + `section_key` |
| `cms_page_content_blocks` | Repeating items within a section |
| `cms_brand_settings` | Header, footer, nav JSON (global shell) |
| `cms_publish_jobs` | Audit trail on publish |

Filter CMS tenant: `tenant_companionscpas` (or tenant column on each CMS table).

## API contract

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/cms/page` | Load page + sections for editor |
| `GET` | `/api/cms/sections` | Section list for route |
| `POST` | `/api/cms/section/save` | Save section fields |
| `POST` | `/api/cms/block/save` | Save content block |
| `POST` | `/api/cms/page/save` | Page-level meta |
| `PATCH` | `/api/cms/section/:id` | Partial section update |
| `POST` | `/api/cms/section/delete` | Remove section |
| `POST` | `/api/cms/publish` | Publish one `route_path` |
| `POST` | `/api/cms/publish-all` | Batch publish |
| `GET` | `/api/cms/preview` | Preview HTML |
| `POST` | `/api/cms/page/nav-visible` | Show/hide in nav |

## Frontend behavior

- **File:** `view-cms.jsx` — `CmsPageEditorView` loads page bootstrap, renders section forms by `section_type`.
- Section save calls `/api/cms/section/save`; block editor uses `/api/cms/block/save`.
- Image fields expect full CDN URLs: `https://assets.companionsofcaddo.org/...`.
- Page list status comes from D1 (`/api/cms/bootstrap`, `/api/dashboard/cms` fallback).

## Backend behavior

- **Handler:** `cms_api.js` dispatched from `src/index.js`.
- On publish: `renderPage` / fragment sync writes R2 `static/pages/{route}/...`, deletes KV `page:{route}` and `bootstrap:tenant_companionscpas`.
- Six public routes use custom fragment renderers registered in `page_cms_registry.js` (home, about, adopt, donate, services, community).

## Operational commands

```bash
cd /Users/samprimeaux/companionscpas
npm run deploy:full
node scripts/sync-page-fragments.mjs    # D1 → R2 for generic routes
npx wrangler kv key delete --binding=CMS_CACHE "page:/donate" --remote
```

## Constraints and safety

- Auth required: dashboard session gate at Worker level.
- Never hand-edit R2 `static/pages/` HTML; it is regenerated on publish.
- `image_url` must be absolute CDN URLs, not relative paths.

## Known gaps

| Gap | Severity | Tracking |
|---|---|---|
| Block editor UI does not write all block types yet | medium | README maintenance backlog |
| `cms_page_content_blocks` seeded; some sections editor-only | low | ARCHITECTURE.md |

## Test checklist

- [ ] Open `/dashboard/cms/pages/home` (or slug), edit hero heading, save
- [ ] Publish route; verify live page at `companionsofcaddo.org`
- [ ] KV bust: hard refresh shows new content
- [ ] Image field uses assets CDN URL

## Vectorization notes

**Synonyms:** page editor, CMS editor, section editor, website content, live editor, publish page, edit homepage, edit donate page.

**Chunk boundaries:** Summary + routes; API table; publish pipeline cross-link `public-publish-pipeline.md`.
