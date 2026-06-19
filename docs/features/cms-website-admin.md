---
doc_type: feature
feature_id: cms-website-admin
product: companionscpas
title: CMS Website Admin
status: live
last_verified: 2026-06-19
tenant_id: tenant_companionscpas
tags:
  - cms
  - assets
  - brand
  - media
  - drive
surfaces:
  routes:
    - /dashboard/cms/website
    - /dashboard/cms/pages
    - /dashboard/cms/images
    - /dashboard/cms/brand
    - /dashboard/cms/templates
  frontend:
    - public/dashboard/js/view-cms.jsx
  backend:
    - src/api/cms_api.js
    - src/api/drive_api.js
  d1_tables:
    - cms_pages
    - cms_assets
    - cms_brand_settings
  bindings:
    - DB
    - WEBSITE_ASSETS
    - CMS_CACHE
related_docs:
  - docs/features/cms-live-editor.md
  - docs/gmail-setup.md
---

## Summary

CMS website admin covers the dashboard surfaces around the live editor: site overview, page list with publish status, media library, brand settings, and section-type reference. Staff use it to manage what pages exist, which are published, and global look-and-feel (logo, nav, footer, colors).

## User goals

- See all CMS pages and publish status at a glance.
- Publish or republish routes from the website hub.
- Upload and manage images in the media library.
- Import assets from Google Drive into R2.
- Update brand header, footer, navigation, and organization JSON.
- Browse section type templates (reference UI).

## Routes and navigation

| Route | View | Status |
|---|---|---|
| `/dashboard/cms/website` | `CmsWebsiteView` | Live |
| `/dashboard/cms/pages` | `CmsPagesView` | Live |
| `/dashboard/cms/images` | `CmsImagesView` | Live |
| `/dashboard/cms/brand` | `CmsBrandView` | Live |
| `/dashboard/cms/templates` | `CmsTemplatesView` | Reference UI |

## Data model (canonical)

| Table | Role |
|---|---|
| `cms_pages` | Page registry and `status` (draft/published) |
| `cms_assets` | Media metadata + `r2_key` / `public_url` |
| `cms_brand_settings` | Nav, footer, logos, colors — **SSOT for navigation** |

**Defer / legacy reads:** `cms_navigation_items`, `cms_themes` still queried in places; nav truth is `cms_brand_settings.navigation_json` (see HANDOFF.md).

## API contract

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/cms/bootstrap` | Pages, brand, sections snapshot |
| `GET` | `/api/dashboard/cms` | Dashboard CMS snapshot fallback |
| `POST` | `/api/cms/publish` | Publish route |
| `GET` | `/api/cms/assets` | List media |
| `GET` | `/api/cms/assets/stats` | Library stats |
| `POST` | `/api/cms/asset/upload` | Upload to R2 + D1 row |
| `POST` | `/api/cms/asset/save` | Update asset metadata |
| `POST` | `/api/cms/asset/delete` | Remove asset |
| `GET` | `/api/cms/brand` | Brand settings |
| `POST` | `/api/cms/brand/save` | Save brand |
| `POST` | `/api/cms/brand/config` | Partial brand config |

**Drive import:** `/api/integrations/google-drive/*` via `drive_api.js`.

## Frontend behavior

- `CmsWebsiteView`: bootstrap-driven page cards; status from D1 (not hardcoded).
- `CmsImagesView`: asset grid, upload, Drive import hooks.
- `CmsBrandView`: forms for header/footer/nav/socials; polish backlog for UX.

## Backend behavior

- Assets stored in R2 under `media/` and `static/` paths; public CDN `assets.companionsofcaddo.org`.
- Drive OAuth tokens in `social_provider_connections` (encrypted).
- Publish busts KV keys listed in ARCHITECTURE.md.

## Operational commands

```bash
npm run sync          # dashboard + static assets to R2
python3 scripts/audit_public_images.py   # broken URL audit
```

## Constraints and safety

- Drive scope: `drive.readonly` for import.
- Do not expose vault secrets or raw OAuth tokens in UI.

## Known gaps

| Gap | Severity | Tracking |
|---|---|---|
| Brand editor UX polish | low | README backlog |
| `cms_navigation_items` table still read | low | HANDOFF defer list |

## Test checklist

- [ ] Pages list shows correct published/draft from D1
- [ ] Upload image; URL resolves on CDN
- [ ] Drive import creates `cms_assets` row
- [ ] Brand nav change reflects on public site after publish + KV bust

## Vectorization notes

**Synonyms:** media library, image manager, brand settings, site admin, CMS dashboard, upload photos, Google Drive import, website hub.
