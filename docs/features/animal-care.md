---
doc_type: feature
feature_id: animal-care
product: companionscpas
title: Animal Care
status: live
last_verified: 2026-06-19
tenant_id: tenant_companionscpas
tags:
  - animals
  - intakes
  - medical
  - daily-care
  - profiles
surfaces:
  routes:
    - /dashboard/animals
    - /dashboard/animals/:id
    - /dashboard/intakes
    - /dashboard/medical
    - /dashboard/daily-care
  frontend:
    - public/dashboard/js/view-animals.jsx
    - public/dashboard/js/view-ops.jsx
  backend:
    - src/api/dashboard_api.js
    - src/api/public_api.js
  d1_tables:
    - animal_profiles
    - animal_notes
    - care_tasks
    - cms_assets
  bindings:
    - DB
    - WEBSITE_ASSETS
related_docs:
  - docs/features/foster-applications.md
  - docs/HANDOFF.md
---

## Summary

Animal care covers the animal registry, rich profiles, intake and medical document views, and (stub) daily care tasks. `animal_profiles` is the canonical animal table (17+ production rows). Public adopt grid reads the same table via `/api/public/animals`.

## User goals

- List and search animals in care.
- Create animals and edit profiles (bio, photos, status, tags).
- Add notes, care tasks, and attachments on a profile.
- Publish animal updates to scheduled posts / public visibility where wired.
- Review intake PDFs and medical PDFs linked via `cms_assets`.
- Assign or end foster placement from profile (see foster-applications doc).

## Routes and navigation

| Route | View | Status |
|---|---|---|
| `/dashboard/animals` | `AnimalsView` | Live |
| `/dashboard/animals/:id` | `AnimalProfileView` | Live |
| `/dashboard/intakes` | `IntakesView` | Live |
| `/dashboard/medical` | `MedicalView` | Live |
| `/dashboard/daily-care` | `DailyCareView` | Stub (mock UI) |

## Data model (canonical)

| Table | Role | Filter |
|---|---|---|
| `animal_profiles` | SSOT for animals | `tenant_id = 'tenant_companionscpas'` |
| `animal_notes` | Profile notes | per `animal_id` |
| `care_tasks` | Medical/daily tasks | `organization_id = 'tenant_companionscpas'` |
| `cms_assets` | Intake/medical PDFs | matched to animals by filename/metadata |

**Do not use:** `animals` table (dropped from live D1).

## API contract

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/dashboard/animals` | List |
| `POST` | `/api/dashboard/animals` | Create |
| `GET` | `/api/dashboard/animals/:id` | Profile detail |
| `PATCH` | `/api/dashboard/animals/:id` | Update profile |
| `GET/POST` | `/api/dashboard/animals/:id/notes` | Notes CRUD |
| `GET/POST/PATCH` | `/api/dashboard/animals/:id/care-tasks` | Tasks |
| `POST` | `/api/dashboard/animals/:id/attachments` | Upload attachment |
| `POST` | `/api/dashboard/animals/:id/publish` | Publish animal post |
| `GET` | `/api/dashboard/intakes` | Intake PDF view |
| `GET` | `/api/dashboard/medical` | Medical PDF view |
| `GET` | `/api/dashboard/daily-care` | Tasks API (UI not wired) |
| `GET` | `/api/public/animals` | Public adopt listing |

## Frontend behavior

- `view-animals.jsx`: list, profile tabs (Overview, Care & Medical, Applications, etc.), foster panel in Care & Medical.
- `view-ops.jsx`: Intakes/Medical aggregate `cms_assets` + `animal_profiles`; Daily Care reads `CPAS.dailyCare` mock only.

## Backend behavior

- Photos stored in R2 `media/animals/`; `photo_url` must be CDN URL.
- Intake/medical endpoints join assets to animals by intake PDF URL or filename guess.

## Constraints and safety

- All queries scoped to tenant.
- Attachment uploads go to R2 via Worker; validate animal exists before write.

## Known gaps

| Gap | Severity | Tracking |
|---|---|---|
| Daily Care UI uses mock data | medium | README backlog |
| Overview medical alerts mock | medium | AGENTSAM_CPAS_ROADMAP Sprint 1 |

## Test checklist

- [ ] Create animal, upload photo, appears in list
- [ ] Profile notes save and reload
- [ ] Intakes view shows PDF-linked animals
- [ ] Foster assign/end updates `animal_profiles.status`

## Vectorization notes

**Synonyms:** animal registry, dog profiles, kennel cards, intake records, medical records, animal bio, photos, care tasks, daily care.
