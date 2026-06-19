# Feature doc template (vectorization-ready)

Copy this file to `docs/features/<feature-id>.md` when documenting a new dashboard or platform surface.

---

```yaml
---
doc_type: feature
feature_id: <kebab-case-id>
product: companionscpas
title: <Human-readable feature name>
status: live | mixed | partial | stub | future
last_verified: YYYY-MM-DD
tenant_id: tenant_companionscpas
tags:
  - <domain>
  - <capability>
surfaces:
  routes:
    - /dashboard/...
  frontend:
    - public/dashboard/js/...
  backend:
    - src/api/...
  d1_tables:
    - table_name
  bindings:
    - DB
    - WEBSITE_ASSETS
    - CMS_CACHE
related_docs:
  - docs/current-file-map.md
---
```

## Summary

One paragraph: what this feature does, who uses it, and production readiness.

## User goals

- Bullet list of tasks a staff member completes in this feature.

## Routes and navigation

| Route | View / component | Notes |
|---|---|---|
| `/dashboard/...` | `ComponentName` | |

## Data model (canonical)

| Table | Role | Filter / notes |
|---|---|---|
| `table_name` | SSOT for ... | `tenant_id = 'tenant_companionscpas'` |

**Do not use:** legacy or demo tables (see `docs/HANDOFF.md`).

## API contract

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/...` | |

Request/response notes only when non-obvious.

## Frontend behavior

- Primary file(s) and key UI states (loading, empty, error).
- Mock vs live data sources (`window.CPAS`, direct fetch).

## Backend behavior

- Handler file and dispatch path from `src/index.js`.
- Side effects: R2 writes, KV bust, email send, Stripe, etc.

## Operational commands

```bash
# Deploy, sync, KV bust, D1 query — only what applies to this feature
```

## Constraints and safety

- Auth / role requirements.
- Approval gates, 501 stubs, never silent success rules.
- Tenant scoping rules.

## Known gaps

| Gap | Severity | Tracking |
|---|---|---|
| ... | low / medium / high | roadmap or backlog link |

## Test checklist

- [ ] Happy path
- [ ] Empty state
- [ ] Error handling
- [ ] Post-deploy verification (if public-facing)

## Vectorization notes

**Chunk boundaries:** split on `##` headings; include frontmatter on every chunk.

**Synonyms for retrieval:** list alternate phrases users might ask (e.g. "page editor", "CMS", "website content").

**Do not embed:** secrets, API keys, password hashes, full PII examples.
