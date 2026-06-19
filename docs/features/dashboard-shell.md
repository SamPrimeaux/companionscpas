---
doc_type: feature
feature_id: dashboard-shell
product: companionscpas
title: Dashboard Shell and Routing
status: live
last_verified: 2026-06-19
tenant_id: tenant_companionscpas
tags:
  - dashboard
  - spa
  - routing
  - navigation
  - overview
surfaces:
  routes:
    - /dashboard/overview
    - /dashboard/*
  frontend:
    - public/dashboard/index.html
    - public/dashboard/js/app.jsx
    - public/dashboard/js/ui.jsx
    - public/dashboard/js/config.js
    - public/dashboard/js/data.js
  backend:
    - src/index.js
    - src/api/dashboard_config_api.js
    - src/api/dashboard_api.js
  d1_tables:
    - animal_profiles
    - cpas_foster_applications
    - volunteer_records
    - donations
  bindings:
    - WEBSITE_ASSETS
related_docs:
  - docs/features/auth-sessions.md
  - docs/current-file-map.md
  - docs/features/reports.md
---

## Summary

The dashboard is a React SPA served from R2 (`public/dashboard/`) with no build step — JSX transpiled in-browser via Babel CDN. `app.jsx` owns route matching, legacy `?view=` redirects, session gate, and view switching. Shared chrome lives in `ui.jsx` (sidebar, headers, modals).

## User goals

- Navigate all admin features from the left sidebar.
- Land on Overview for at-a-glance counts (partially mock metrics).
- Use mobile layout: hamburger, centered title, Agent Sam button.
- Deep-link to routes; legacy URLs redirect to canonical paths.

## Shell files

| File | Role |
|---|---|
| `index.html` | Script tags, cache-bust query params after deploy |
| `app.jsx` | `ROUTE_REGISTRY`, view switch, auth user display |
| `ui.jsx` | Sidebar groups: Core, Animal Care, Placement, Community, Giving, Website, Admin |
| `config.js` | `GET /api/dashboard/config` |
| `data.js` | Bootstrap `window.CPAS` — mock fallback + partial API hydration |
| `agentsam.jsx` | Global AI drawer |

## Route registry (canonical paths)

Defined in `app.jsx` `ROUTE_REGISTRY`. Legacy aliases in same file (e.g. `notifications` → `/dashboard/email`).

Full route → view map: `docs/current-file-map.md`.

## Overview (`/dashboard/overview`)

| Data | Source |
|---|---|
| Animal count | API live |
| Deltas, sparklines, care bars | **Mock** (`CPAS.stats` in `data.js`) |

See `reports.md` and README for mock vs live guidance.

## Deploy

```bash
npm run sync:js    # pushes dashboard JS + index.html to R2
npm run deploy:full
```

Bump cache-bust query strings in `index.html` after JS changes.

## Constraints and safety

- No emojis in UI copy, labels, or icon props (project rule).
- Session gate at Worker — shell assumes authenticated user object from bootstrap.

## Known gaps

| Gap | Severity | Tracking |
|---|---|---|
| Overview mock metrics | medium | README backlog |
| `data.js` mock fallback on API failure | medium | current-file-map.md |

## Test checklist

- [ ] All sidebar links resolve without 404
- [ ] Legacy `?view=applications` redirects correctly
- [ ] Mobile nav opens drawer
- [ ] Agent Sam button opens drawer on all views

## Vectorization notes

**Synonyms:** admin dashboard, SPA router, sidebar navigation, overview page, dashboard shell, CPAS dashboard, staff portal.
