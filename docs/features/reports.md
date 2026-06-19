---
doc_type: feature
feature_id: reports
product: companionscpas
title: Reports Dashboard
status: partial
last_verified: 2026-06-19
tenant_id: tenant_companionscpas
tags:
  - reports
  - analytics
  - ai-usage
  - metrics
surfaces:
  routes:
    - /dashboard/reports
  frontend:
    - public/dashboard/js/view-reports.jsx
  backend:
    - src/api/dashboard_api.js
    - src/api/agentsam_api.js
  d1_tables:
    - animal_profiles
    - cpas_foster_applications
    - volunteer_records
    - donations
    - agentsam_usage_events
    - agentsam_usage_rollups_daily
  bindings:
    - DB
related_docs:
  - docs/features/agent-sam.md
  - docs/AGENTSAM_CPAS_ROADMAP.md
---

## Summary

The reports dashboard provides tabbed operational metrics: Animals, Financial, Applications, Volunteers, Medical, and AI Usage. **Financial is live** when the tab opens. Several other tabs fetch APIs but **render hardcoded seed objects** for charts and totals — do not treat as authoritative production metrics until the Agent Sam / reports refresh sprint.

## User goals

- Review month-to-date financial summary.
- Inspect animal, application, and volunteer trends (intended; partially stubbed).
- Monitor AI run volume and cost (intended; AI tab uses mock data today).
- Export or build custom reports (future: "+ Custom report" button).

## Routes and navigation

| Route | View | Status |
|---|---|---|
| `/dashboard/reports` | `ReportsView` | Partial |

**Active file only:** `view-reports.jsx` — do not edit stale `ReportsView` in `view-admin.jsx`.

## API contract

| Tab | Fetches | Display status |
|---|---|---|
| Animals | `GET /api/dashboard/animals` | Hardcoded chart seeds ~136–142 |
| Financial | `GET /api/dashboard/reports/financial` | **Live** |
| Applications | `GET /api/dashboard/applications` | Hardcoded pipeline ~143–150 |
| Volunteers | `GET /api/dashboard/volunteers` | Hardcoded `vols` ~167–174 |
| Medical | — | Placeholder |
| AI Usage | `GET /api/agentsam/runs` (unused) | Hardcoded `ai` ~175–183 |

## Data model

Reports read from canonical tables listed in frontmatter. AI usage SSOT: `agentsam_usage_events`, `agentsam_usage_rollups_daily` — not yet wired to UI.

## Frontend behavior

- Tab state in `view-reports.jsx`; parallel fetch on mount for several endpoints.
- Seed objects use placeholder model names (e.g. `gpt-5.4-mini`) — known bug.

## Known gaps

| Gap | Severity | Tracking |
|---|---|---|
| AI Usage ignores `/api/agentsam/runs` | high | README Agent Sam section |
| Animals/Applications/Volunteers seeds | medium | maintenance backlog |
| Medical tab thin | low | future sprint |
| Custom report builder | future | UI button present, not built |

## Test checklist

- [ ] Financial tab matches D1 donation data
- [ ] Confirm other tabs show "live data" label but verify against API before trusting charts
- [ ] After refresh sprint: AI tab matches `agentsam_usage_events`

## Vectorization notes

**Synonyms:** dashboard reports, analytics, AI usage report, cost by model, MTD spend, run history, financial reports, KPIs.

**Important for RAG:** explicitly state Financial=live, other tabs=mixed/mock to avoid hallucinated metrics.
