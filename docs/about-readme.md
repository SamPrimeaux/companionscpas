# About Page — How It Works

The live `/about` page uses the same **R2 fragment pipeline** as home.

---

## Section files (in order)

| # | D1 `section_key` | R2 key |
|---|------------------|--------|
| 1 | `hero` | `static/pages/about/hero.html` |
| 2 | `why_we_exist` | `static/pages/about/why_we_exist.html` |
| 3 | `paths` | `static/pages/about/paths.html` |
| 4 | `campaigns` | `static/pages/about/campaigns.html` |
| 5 | `cta` | `static/pages/about/cta.html` |

Local copies: [`static/pages/about/`](../static/pages/about/).

These use **`shared.css` section classes** (`section-hero`, `section-text-image`, `card-grid`, etc.) — not the older baked inline-style artifact.

---

## Pipeline

Same as home — see [`homepage-readme.md`](homepage-readme.md):

```
CMS edit → D1 → render section → R2 fragment → assemble → live /about
```

**Editor:** `/dashboard/cms/pages/about`

**Bootstrap (once, logged in):**

```javascript
fetch('/api/cms/page/bootstrap', {
  method: 'POST',
  credentials: 'include',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ route_path: '/about', force: true })
}).then(r => r.json()).then(console.log)
```

---

## Implementation

| File | Role |
|------|------|
| [`src/api/render_about_fragments.js`](../src/api/render_about_fragments.js) | Stitch fragments + shell |
| [`src/api/render_about_section.js`](../src/api/render_about_section.js) | D1 → fragment HTML |
| [`src/api/about_cms_sync.js`](../src/api/about_cms_sync.js) | Sync + publish |
| [`src/api/page_cms_registry.js`](../src/api/page_cms_registry.js) | Routes `/` and `/about` |

---

## Blocks

- **`paths`** section uses 2 D1 blocks (medical care + transport cards)
- Other sections are single-section fields (hero, why_we_exist, campaigns, cta)
