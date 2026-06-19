---
doc_type: feature
feature_id: agent-sam
product: companionscpas
title: Agent Sam AI Assistant
status: mixed
last_verified: 2026-06-19
tenant_id: tenant_companionscpas
tags:
  - ai
  - agentsam
  - chat
  - tools
  - workers-ai
surfaces:
  routes:
    - /dashboard/*
  frontend:
    - public/dashboard/js/agentsam.jsx
  backend:
    - src/api/agentsam_api.js
    - src/api/agentsam_tools.js
    - src/api/resolveModel.js
  d1_tables:
    - agentsam_sessions
    - agentsam_messages
    - agentsam_tools
    - agentsam_workflows
    - agentsam_usage_events
    - agentsam_usage_rollups_daily
    - agentsam_tool_chain
  bindings:
    - DB
    - AGENTSAM_WAI
related_docs:
  - docs/AGENTSAM_CPAS_ROADMAP.md
  - docs/features/reports.md
---

## Summary

Agent Sam is the dashboard AI drawer: chat with streaming responses, tool calling for PrimeTech/CMS operations, and run history API. **Baseline is live** (`POST /api/agentsam/chat`, `GET /api/agentsam/runs`, `POST /api/agentsam/tools/*`). **Phase 2** (tool picker, approval queue, staff workflows like bio generation) is documented in `AGENTSAM_CPAS_ROADMAP.md`. AI cost ownership policy must be decided before expanded client use.

## User goals

- Ask questions about animals, applications, site content, and dashboard data.
- Run PrimeTech/CMS audit tools from chat (developer-oriented).
- (Future) one-click animal bio, application response drafts, campaign copy.
- (Future) approve gated tool runs as owner/admin.

## Surfaces

| Surface | Path / component | Status |
|---|---|---|
| Chat drawer | `agentsam.jsx` on all dashboard routes | Live |
| Runs API | `GET /api/agentsam/runs` | Live |
| Reports AI tab | `view-reports.jsx` | Mock display |
| Tool routes | `POST /api/agentsam/tools/*` | Live (PrimeTech) |

## Data model (canonical)

| Table | Role |
|---|---|
| `agentsam_tools` | Registered tool metadata (33 tools) |
| `agentsam_workflows` | Workflow definitions (17) |
| `agentsam_sessions` / `agentsam_messages` | Chat history |
| `agentsam_usage_events` / `agentsam_usage_rollups_daily` | Cost and token tracking |
| `agentsam_tool_chain` | Per-run tool execution log |

**Dropped:** `agentsam_mcp_tools`, `agentsam_mcp_workflows`.

## API contract

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/agentsam/chat` | SSE chat + tool loop |
| `GET` | `/api/agentsam/runs` | Run history |
| `GET` | `/api/agentsam/bootstrap` | Drawer bootstrap |
| `POST` | `/api/agentsam/tool/approve` | Approved write execution |
| `POST` | `/api/agentsam/tools/*` | PrimeTech/CMS tools (`agentsam_tools.js`) |

Model routing: `resolveModel.js` + Workers AI binding `AGENTSAM_WAI`.

## Frontend behavior

- Right sidebar drawer; "Working..." state during stream.
- Can fail with provider capacity errors — needs hardening (README).
- Drive upload hooks for asset workflows.

## Constraints and safety

- Policy vars (planned): `AI_PROVIDER_MODE`, `AI_MONTHLY_TOKEN_CAP`.
- Never run client production drafting on Inner Animal accounts after handoff without contract.
- Tools with `requires_approval` must not execute without owner sign-off (Phase 2 queue).

## Known gaps

| Gap | Severity | Tracking |
|---|---|---|
| Reports AI Usage mock data | high | reports.md |
| Chat capacity / routing errors | medium | README |
| Staff tool picker + approval queue | medium | AGENTSAM_CPAS_ROADMAP |
| `POST /api/agentsam/run` generic runner | medium | roadmap Sprint 1 |

## Test checklist

- [ ] Open drawer, send message, receive stream
- [ ] Verify run logged in `agentsam_sessions`
- [ ] `/api/agentsam/runs` returns data (compare to Reports tab display)

## Vectorization notes

**Synonyms:** Agent Sam, AI assistant, chat bot, MCP tools, Workers AI, inference cost, AI usage, bio generator, draft email.
