# CMS Architecture — Companions of CPAS (reusable pattern)

> **SSOT for how the public CMS works.** Read this before changing publish, sections, soft-delete, or client #2 scaffolding.  
> Repo: `companionscpas` · Worker: `companionscpas` · Domain: companionsofcaddo.org  
> Last updated: 2026-07-20  
> Related: `AGENTSAM.md` (ops / bindings), `src/api/cms_pipeline.js` (code SSOT)

This document captures the **architecture**, not a changelog. Companions of CPAS is the proving ground; the reusable asset is the pipeline and lifecycle rules below.

---

## 1. Data model (D1)

Tenant: `tenant_companionscpas`. Binding: `env.DB`.

### Core tables

| Table | Owns |
|-------|------|
| `cms_pages` | Route registry (`route_path`, title, status, nav flags). One row per public page. |
| `cms_page_sections` | **Source of truth for page structure and copy.** One row per section on a route. |
| `cms_page_content_blocks` | Cards / repeatable children keyed by `(page_route, section_key, block_key)`. |
| `cms_brand_settings` | Logos, colors, fonts, org copy (`config_json`). |
| `cms_navigation_items` | Header/footer nav links. |
| `cms_assets` | Media library metadata (R2 keys under `media/…`). Shared; not owned by a section. |

### `cms_page_sections` — fields that matter for lifecycle

| Column | Role |
|--------|------|
| `page_route`, `section_key`, `section_type` | Identity + renderer dispatch |
| `heading`, `subheading`, `body`, CTAs, `image_url`, `config_json` | Editable content |
| `sort_order` | List / paint order |
| `is_visible` | **Hide** — still in editor; excluded from public assemble when `0` |
| `deleted_at` | **Soft-delete** — excluded from editor list, preview publish path, and assemble |
| `restore_count` | How many times Undo/restore ran on this row (never reset on delete) |
| `last_restored_at` | Timestamp of most recent restore |

**Reading a row at a glance**

- `deleted_at` set + `restore_count = 0` → deleted, never restored (since columns landed)
- `deleted_at` set + `restore_count ≥ 1` → deleted again after at least one Undo
- `deleted_at` null + `restore_count ≥ 1` → live again after Undo(s)

No separate audit/event table. History lives on the row.

### What D1 does *not* store

- Assembled public HTML (that lives in R2 page artifacts + KV)
- Per-section HTML fragments for live serve (R2 under `static/pages/…`)
- Soft-delete archive copies (R2 under `cms/section-trash/…`)

---

## 2. Three-layer pipeline (D1 → R2 → KV)

This is the non-obvious part. It is **not** “edit HTML in R2” and not “SSR every request from D1 only.”

```
┌─────────────────┐     renderSectionByType      ┌──────────────────────┐
│  D1 sections +  │ ───────────────────────────► │ R2 live fragments    │
│  blocks (truth) │   syncSectionToR2 / sync     │ static/pages/…/*.html│
└────────┬────────┘   RouteSectionsToR2          └──────────┬───────────┘
         │                                                  │
         │              assemblePage (preferR2 or live)     │
         └──────────────────────┬───────────────────────────┘
                                ▼
                    ┌──────────────────────┐
                    │ R2 page artifact     │
                    │ …/index.html         │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ KV CMS_CACHE         │
                    │ key: page:{route}    │
                    │ TTL ~3600s           │
                    └──────────────────────┘
                               │
                               ▼
                         Public GET /
```

### Layers

1. **D1** — Operators edit here via dashboard (`Save` / section APIs). Always the content SSOT.
2. **R2 fragments** — One HTML snippet per section key (`fragmentR2Key(route, section_key)`). Hidden sections sync as `<!-- cms: section hidden -->` stubs so keys stay predictable.
3. **R2 page artifact + KV** — Full HTML document for the route. Public reads prefer KV (`page:/about`), fall back to R2 artifact, can re-assemble if needed.

### Publish sequence (exact)

Entry points: dashboard **Publish Live**, `POST /api/cms/publish`, or `publishRoute(env, route, jobId)` in `cms_pipeline.js`.

1. `syncRouteSectionsToR2(route)`  
   - Loads sections with `deleted_at IS NULL` (and includes hidden for stub writes).  
   - Renders each via `renderSectionByType` → `WEBSITE_ASSETS.put(fragmentKey)`.
2. `bustPageCache(route)` — deletes KV `page:{route}`.
3. `assemblePage(route, { preferR2: false })` — builds full HTML from **current D1** (+ header/footer partials). Soft-deleted and (for public) hidden sections are omitted.
4. Put assembled HTML to R2 artifact key (`getPageArtifactKey`).
5. Put same HTML into KV `page:{route}` with TTL.

**Contract:** Dashboard edit alone does not change the public site until Publish (or a path that calls `publishRoute` / fragment sync). Soft-delete / restore also sync fragments and bust cache so the live fragment key does not outlive the D1 row state.

### Code map

| Concern | File |
|---------|------|
| Pipeline (load / sync / assemble / publish / trash helpers) | `src/api/cms_pipeline.js` |
| HTTP CMS APIs (save, delete, restore, page load) | `src/api/cms_api.js` |
| Section type → HTML | `src/api/cms_section_catalog.js` (+ type-specific renderers) |
| Public serve + KV | `src/index.js` → `servePublicPage` |
| Editor UI | `public/dashboard/js/view-cms.jsx` |
| Addable catalog API | `GET /api/cms/section/templates` |

---

## 3. Section lifecycle

### States

```
                    ┌─────────────┐
         hide/show  │   VISIBLE   │  is_visible=1, deleted_at NULL
          ◄───────► │  (live OK)  │
                    └──────┬──────┘
                           │ soft-delete
                           ▼
                    ┌─────────────┐
         Undo 30s   │ SOFT-DELETED│  deleted_at set
          ◄───────► │ (editor out)│  restore_count may increment
                    └──────┬──────┘
                           │ after 3 days
                           ▼
                    ┌─────────────┐
                    │   PURGED    │  D1 row + blocks gone
                    │             │  R2 trash expired by lifecycle
                    └─────────────┘
```

### Hide vs soft-delete vs purge

| Action | Mechanism | Editor list | Public / Publish | Undo |
|--------|-----------|-------------|------------------|------|
| **Hide** | `is_visible = 0` | Still listed (dimmed) | Omitted from assemble; fragment stub may remain | Toggle eye |
| **Soft-delete** | `deleted_at = now` | Gone | Omitted (`deleted_at IS NULL` filter) | 30s toast → `POST /api/cms/section/restore` |
| **Purge** | Daily cron + R2 lifecycle | Gone forever | N/A | No |

### Soft-delete behavior (shipped)

1. Set `deleted_at` (do **not** clear `restore_count` / `last_restored_at`).
2. Copy live fragment → `cms/section-trash/{yyyy-mm-dd}/{page}/{section}.html`.
3. Delete live fragment key.
4. Bust KV; re-sync remaining fragments for the route.

### Restore / Undo (shipped)

- **Source of truth for restore = D1 row**, never R2 trash.
- Clears `deleted_at`, increments `restore_count`, sets `last_restored_at`, re-renders live fragment from D1.
- UI: session-scoped 30s toast (`sessionStorage` key `cpas.sectionUndo`) with draining progress bar; survives in-tab navigation.

### Purge (two mechanisms, ~3-day window)

| Side | Who | What |
|------|-----|------|
| **R2 trash** | Bucket lifecycle rule `cms-section-trash-3d` on prefix `cms/section-trash/` | Auto-expire archive HTML after 3 days |
| **D1** | Worker cron `0 6 * * *` → `purgeExpiredSoftDeletedSections` | DELETE sections with `deleted_at < now - 3 days` + their content blocks; delete leftover **live** fragment keys only |

**Important:** Restore never un-archives from R2. If lifecycle deletes the trash object while a soft-deleted D1 row still exists, that is harmless for Undo (Undo only uses D1). Media library assets are **not** deleted with a section.

### Publish-path exclusion (bug magnet)

All publish/assemble/editor loads that mean “active sections” must use:

```sql
(deleted_at IS NULL OR deleted_at = '')
```

and for public:

```sql
is_visible = 1 AND (deleted_at IS NULL OR deleted_at = '')
```

Soft-deleted must be **absent** from the assembled page — not a hidden stub comment. Hidden (`is_visible = 0`) may still write stubs during sync; soft-deleted must not reappear on Publish.

---

## 4. Editor UX (portable ideas)

| Behavior | Notes |
|----------|--------|
| Sections rail | Drag reorder, eye = hide, trash = soft-delete |
| Canvas | Live preview iframe; click-to-select sections |
| Inspector | Fields + Save / Publish / Delete Section |
| **+ Add** | Loads `GET /api/cms/section/templates` (SSOT catalog); modal (drawer deferred) |
| Undo toast | Global `CmsSectionUndoToast` in dashboard shell |

Retired: dedicated `/dashboard/cms/templates` page (removed). Catalog API remains for Add.

---

## 5. Reusable vs Companions-specific

### Portable (template for client #2)

Copy / generalize these:

- D1 sections + blocks as content SSOT  
- `cms_pipeline.js` pattern: fragment sync → assemble → R2 artifact → KV  
- Soft-delete + session Undo + `restore_count` / `last_restored_at`  
- R2 prefix trash + lifecycle rule (3-day) + D1 cron purge  
- Publish filter: `is_visible` ∧ `deleted_at` null  
- Dashboard section list: hide + delete + calm Undo toast  
- `GET /api/cms/section/templates` as Add SSOT (not a separate Templates app page)  
- Brand tokens / shell partials pattern  

### Companions-specific (do not treat as template core)

- Wet Dog competition entry + Stripe payment modal + resume-pay  
- Campaign / donation v2 sections, Kita story, Freedom Fest copy  
- Board / team / foster / adopt shelter hub content and renderers  
- Branding (plum glass, watercolor heroes, CPAS logos)  
- Email inbox / Resend mailbox wiring for this org  
- Fragment key legacy aliases on home (`how-it-helps`, etc.)  
- Tenant IDs, domain, Stripe/Resend secrets  

When spinning client #2: fork the **pipeline + lifecycle + editor shell**, then swap catalog types, brand, and product features.

---

## 6. Known gaps / deferred

| Item | Status |
|------|--------|
| Full audit log / event table | **Deferred** — row-level `restore_count` / `last_restored_at` only |
| Soft-delete trash UI (“Recently deleted”) | Deferred — Undo window is 30s session only |
| Backfill `restore_count` for Undos before columns existed | Not done (historical Undos stay at 0) |
| Editor Add drawer (preview thumbs) | Deferred — text-card modal still uses catalog API |
| Templates page | **Removed** — do not resurrect as a second catalog UI |
| Orphan media cleanup when sections purge | Explicitly out of scope (shared `cms_assets`) |
| Observability trail for delete/restore | Not relied on; inspect D1 + R2 trash instead |
| Hard delete API | Soft-delete only; purge is time-based |

---

## 7. Operator cheat sheet

```bash
# Deploy worker (Mac)
cd /Users/samprimeaux/companionscpas && npm run deploy

# Dashboard JSX → R2 + bake hash
npm run sync:js
# then put public/dashboard/index.html to R2 if bake changed

# Soft-deleted rows
npx wrangler d1 execute companionscpas --remote --command \
  "SELECT page_route, section_key, deleted_at, restore_count, last_restored_at
   FROM cms_page_sections WHERE deleted_at IS NOT NULL LIMIT 20;"

# R2 trash prefix (lifecycle 3d)
# keys like: cms/section-trash/2026-07-20/contact/contact_socials.html
```

**Do not** hand-edit live HTML in R2 for CMS pages. Edit D1 via dashboard → Publish.

---

## 8. Feeding Agent Sam later

This file is the durable SSOT. Chunking into `agentsam_memory_search` / Vectorize is a mechanical follow-up once memory ingest is scheduled — not required for the architecture to be correct or greppable today.
