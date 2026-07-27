# CPAS Sprint — Full Dynamic Header / Footer (CMS-only)

**Status:** SHIPPED 2026-07-27 — live header `data-nav-source="cms_pages"`; More = Events + Contact; Donate CTA; Community hidden  
**Date:** 2026-07-27  
**Rule:** Every public chrome control (label, show/hide, primary vs More vs Donate CTA, order) is editable in **CMS Website** and rendered from D1 only.  
**Git:** companionscpas `43a50b3` (+ migration applied remote)

---

## 1. Database validation (live D1 — proven)

### Tables that already exist

| Table | Relevant columns | Live header reads it? | Data health |
|-------|------------------|----------------------|-------------|
| **`cms_pages`** | `route_path`, `title`, `nav_visible`, `sort_order`, `status`, `show_header`, `show_footer`, `settings_json` | **Partial** — `nav_visible` filters a JS list today / in-progress work | Healthy for pages; **no `nav_label`**, **no placement** |
| **`cms_navigation_items`** | `label`, `href`, `nav_group`, `parent_id`, `is_visible`, `sort_order`, `css_class` | **No** — writes on create-page / nav-visible; renderer ignores | **Stale** (Services `/services`, Home `is_visible=0`, Donate `is_visible=0`, Events row exists but unused) |
| **`cms_navigation_menus`** | `menu_name`, `menu_items` JSON | **No** | **Stale** (May 2026 seed: Home/About/Adopt/Services/Donate) |
| **`cms_brand_settings`** | `navigation_json`, `header_json`, `footer_json` | **No** for live HTML — Brand studio preview only | **Stale** (Foster → `/services`, Community still listed, no Contact, no Events) |

### Columns that do **not** exist (must add)

On **`cms_pages`** (page = unit staff already create/publish):

| Column | Type | Purpose |
|--------|------|---------|
| `nav_label` | TEXT NULL | Short header/footer label (e.g. “About Us”). Never use SEO `title` as chrome text. |
| `nav_placement` | TEXT NOT NULL DEFAULT `'more'` | `primary` \| `more` \| `cta` \| `footer_only` \| `none` |

`nav_visible = 0` remains the hard hide (e.g. Community).  
`nav_placement = 'none'` = exists but never in chrome even if visible (rare).  
`cta` = Donate-style header button (not a text link).

### Verdict

The schema **almost** had this (`cms_navigation_items.label` + `nav_group` + `parent_id`), but:

1. Live chrome never SELECT’d it.  
2. Docs claimed Brand `navigation_json` was SSOT while code used hardcoded `SITE_NAV_ITEMS`.  
3. Create-page wrote a ghost row into `cms_navigation_items` — that is why “Add Page” felt seamless for **URL** but not for **nav**.

**Sprint SSOT (locked):** `cms_pages` (+ new `nav_label` / `nav_placement`).  
One page row = one public URL = one chrome config. No second menu table as truth.

**Deprecate for live render (after cutover):** hardcoded `SITE_NAV_*`, Brand JSON as live source, `cms_navigation_menus`.  
**Optional mirror:** keep writing `cms_navigation_items` from page save for one release, then drop reads; do not treat it as SSOT.

---

## 2. Product concept (no exceptions)

Staff open **CMS Website → page → Page settings / Header & Footer chrome**:

- Toggle **Show in navigation** (`nav_visible`)  
- Set **Nav label** (`nav_label`)  
- Set **Placement**: Primary bar · More dropdown · Header CTA button · Footer only · Hidden from chrome  
- Set **Sort order** (`sort_order`)  

Publish Live → header + footer on **every** page rebuild from D1.  

Creating a page seeds defaults (e.g. `nav_placement='more'`, `nav_label` from title short form, `nav_visible=1`). Staff adjust in CMS — **never** in Worker constants.

Desktop: Primary links + **More** (all `nav_placement='more'`).  
Mobile: flat list of primary + more + cta (polish later; still D1-driven).

---

## 3. Implementation order (fail-closed)

1. **Migration** — `ALTER cms_pages ADD nav_label`, `ADD nav_placement`; backfill current published pages (no inventing Community).  
2. **Renderer** — `renderSiteHeader` / `renderSiteFooter` SELECT only from `cms_pages` where `nav_visible=1` AND `status='published'`. **Zero fallback arrays.** Empty primary → empty nav (fail loud in logs; do not resurrect hardcoded Home/About/…).  
3. **CMS editor UI** — Page settings fields for label / placement / visible / sort; Header + Footer chrome entries in SECTIONS list that open the same controls (global chrome, not per-page body HTML).  
4. **Create / publish** — `page/save` + `bootstrapNewCmsPage` set `nav_label` + `nav_placement`; stop implying `cms_navigation_items` drives live nav.  
5. **Brand studio** — either edit the same `cms_pages` chrome fields or show read-only “managed on Pages”; stop saving a parallel stale `navigation_json` as if it were live.  
6. **Cache** — any chrome change busts all `page:*` KV + republishes routes (already partly true for `nav-visible`).  
7. **Proof** — D1 query of placements + `curl` live header HTML must match; Events under More when `nav_placement='more'`; Community absent when `nav_visible=0`.  
8. **Delete** — remove `SITE_NAV_ITEMS` / `SITE_NAV_FALLBACK` / `PRIMARY_HEADER_ROUTES` / `LABEL_BY_ROUTE` / `PUBLIC_PAGE_ROUTES` used as nav; do not replace with another route list.

---

## 4. Seed map (backfill only — then CMS owns it)

| route | nav_label | nav_placement | nav_visible |
|-------|-----------|---------------|-------------|
| `/` | Home | primary | 1 |
| `/fosters` | Foster | primary | 1 |
| `/adopt` | Adopt | primary | 1 |
| `/about` | About Us | primary | 1 |
| `/events` | Events | more | 1 |
| `/contact` | Contact | more | 1 |
| `/donate` | Donate | cta | 1 |
| `/community` | Community | none | 0 |

---

## 5. Explicitly out of scope for this sprint

- Rewriting Events page body content (adopt gallery vs Past Events) — separate ticket  
- Mobile More accordion polish  
- Merch  
- Animal Visible/Foster publish UX  

---

## 6. Acceptance (quality gate)

- [ ] No route strings in Worker nav membership/placement (except optional Donate detection via `nav_placement='cta'`, not `href==='/donate'`).  
- [ ] Adding a CMS page + setting placement/label/visible + Publish → link appears without deploy/code change.  
- [ ] Toggling `nav_visible` off removes link sitewide after republish.  
- [ ] Brand preview and live header cannot disagree (same D1 source).  
- [ ] Proof paste: SQL rows + live `<ul class="site-nav">` HTML.

---

## 7. Complexity note

This is **one** sprint track (control-plane). Do not parallelize with Events content / Merch / Collaborate “swarms” until chrome SSOT is green — otherwise every new page repeats the Events failure mode (URL works, nav lies).
