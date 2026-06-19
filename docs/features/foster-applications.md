---
doc_type: feature
feature_id: foster-applications
product: companionscpas
title: Foster Placements and Applications
status: live
last_verified: 2026-06-19
tenant_id: tenant_companionscpas
tags:
  - foster
  - applications
  - placement
  - adoptions
surfaces:
  routes:
    - /dashboard/fosters
    - /dashboard/applications
    - /dashboard/applications/:id
    - /dashboard/adoptions
  frontend:
    - public/dashboard/js/view-animals.jsx
    - public/dashboard/js/view-applications.jsx
  backend:
    - src/api/dashboard_api.js
    - src/api/foster_api.js
  d1_tables:
    - cpas_foster_applications
    - foster_records
    - animal_profiles
  bindings:
    - DB
related_docs:
  - docs/features/animal-care.md
  - docs/features/email-workspace.md
---

## Summary

Foster and application workflows use `cpas_foster_applications` as the canonical application table (public form → dashboard review). Foster placements use `foster_records` with `POST/PATCH` APIs. The `/dashboard/adoptions` route shows **approved foster applications**, not separate adoption records — naming is misleading but data is live.

## User goals

- Review incoming foster applications from the public site.
- Update review status and internal notes.
- Assign an approved applicant as foster from application detail or animal profile.
- List active foster placements; end a placement when complete.
- Draft email responses (future: Agent Sam `draft_app_response`).

## Routes and navigation

| Route | View | Status |
|---|---|---|
| `/dashboard/applications` | `ApplicationsView` | Live |
| `/dashboard/applications/:id` | `ApplicationDetailView` | Live |
| `/dashboard/fosters` | `FostersView` | Live (active only) |
| `/dashboard/adoptions` | `AdoptionsView` | Live (approved apps) |

Public form: site foster CTA → `POST /api/foster/apply`.

## Data model (canonical)

| Table | Role |
|---|---|
| `cpas_foster_applications` | Full application schema, `answers_json`, review workflow |
| `foster_records` | Placement rows linked to `animal_id` |
| `animal_profiles` | `status` set to `foster` or `available` on assign/end |

**Dropped:** `applications` legacy stub (live D1).

## API contract

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/dashboard/applications` | List |
| `GET` | `/api/dashboard/applications/:id` | Detail |
| `PATCH` | `/api/dashboard/applications/:id` | Notes / review_status |
| `GET` | `/api/dashboard/animals/:id/applications` | Apps for one animal |
| `GET` | `/api/dashboard/fosters?status=active` | Active placements |
| `POST` | `/api/dashboard/fosters` | Create placement |
| `PATCH` | `/api/dashboard/fosters/:id` | End placement |
| `GET` | `/api/dashboard/adoptions` | Approved applications |
| `POST` | `/api/foster/apply` | Public submit (`foster_api.js`) |

**POST body (foster create):** `{ animal_id, foster_name, foster_email?, foster_phone?, start_date?, application_id? }`

## Frontend behavior

- `view-applications.jsx`: list + detail, PATCH for notes/status.
- `view-animals.jsx`: `FostersView` (active placements), `FosterPlacementPanel` on profile, Applications tab shortcut "Assign as Foster".

## Backend behavior

- POST foster ends any prior active placement for same animal, inserts new row, sets animal `status=foster`.
- PATCH foster sets `status=ended`, sets animal `status=available`.
- Public apply sends confirmation email via Resend when configured.

## Constraints and safety

- Tenant: `tenant_companionscpas` on all queries.
- Do not rebuild on legacy `applications` table.

## Known gaps

| Gap | Severity | Tracking |
|---|---|---|
| `/dashboard/adoptions` label vs data | low | rename in future sprint |
| Agent Sam draft response not wired | medium | AGENTSAM_CPAS_ROADMAP Sprint 2 |

## Test checklist

- [ ] Public foster form creates `cpas_foster_applications` row
- [ ] Application appears in dashboard list
- [ ] Assign foster from animal profile
- [ ] End foster returns animal to available
- [ ] Fosters list shows only active placements

## Vectorization notes

**Synonyms:** foster application, adoption application, applicant review, placement, foster home, assign foster, application pipeline, CPAS foster form.
