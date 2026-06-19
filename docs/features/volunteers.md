---
doc_type: feature
feature_id: volunteers
product: companionscpas
title: Volunteers
status: live
last_verified: 2026-06-19
tenant_id: tenant_companionscpas
tags:
  - volunteers
  - community
  - team
surfaces:
  routes:
    - /dashboard/volunteers
  frontend:
    - public/dashboard/js/view-ops.jsx
  backend:
    - src/api/dashboard_api.js
  d1_tables:
    - volunteer_records
  bindings:
    - DB
related_docs:
  - docs/features/reports.md
---

## Summary

Volunteer management lists team volunteers from `volunteer_records` with live API fetch and an Add Volunteer modal that POSTs new rows. `/api/dashboard/team` remains an alias for GET list.

## User goals

- View volunteer roster with role, status, and hours.
- Add a new volunteer from the dashboard form.
- (Future) log hours and tie to reports tab with real API data.

## Routes and navigation

| Route | View | Status |
|---|---|---|
| `/dashboard/volunteers` | `VolunteersView` | Live |

Sidebar: **Community → Volunteers**.

## Data model (canonical)

| Table | Role |
|---|---|
| `volunteer_records` | `full_name`, `email`, `role`, `status`, `hours_month` |

## API contract

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/dashboard/volunteers` | List volunteers |
| `POST` | `/api/dashboard/volunteers` | Add volunteer |
| `GET` | `/api/dashboard/team` | Alias for list |

## Frontend behavior

- `view-ops.jsx` — `VolunteersView` fetches on mount; modal form POSTs then refreshes list.
- `data.js` hydrates team into `window.CPAS` for overview counts.

## Backend behavior

- `dashboard_api.js` inserts with generated id and `tenant_id`.
- Overview endpoint includes volunteer count from same table.

## Known gaps

| Gap | Severity | Tracking |
|---|---|---|
| Reports Volunteers tab uses hardcoded seed | medium | reports.md |

## Test checklist

- [ ] List loads Amanda/Kim (or current rows)
- [ ] Add Volunteer creates row and appears in list
- [ ] Overview volunteer count updates after refresh

## Vectorization notes

**Synonyms:** volunteer roster, team members, community volunteers, add volunteer, volunteer hours.
