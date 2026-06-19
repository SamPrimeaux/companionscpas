# Agent Sam — Companions of CPAS
## AI Dashboard Roadmap

> **Status:** Infrastructure seeded, baseline functional. Tools and workflows are
> registered in D1 and ready to be wired to the dashboard UI and live API calls.
> This document is the handoff plan for Phase 2 AI buildout.
>
> **June 2026 baseline (already shipped):** Chat drawer (`agentsam.jsx`) → `POST /api/agentsam/chat`;
> run history API → `GET /api/agentsam/runs`; PrimeTech/CMS tools → `POST /api/agentsam/tools/*`
> (`agentsam_tools.js`). Canonical registry: `agentsam_tools` + `agentsam_workflows` tables
> (`agentsam_mcp_*` legacy tables **dropped** from live D1). **Not done yet:** staff tool picker,
> approval queue UI, one-click animal bio / app response flows, Reports → AI Usage from real API data.
> See also README [Agent Sam / AI Cost Ownership](../README.md#agent-sam--ai-cost-ownership).

**Related docs:** [`HANDOFF.md`](HANDOFF.md) (D1 tables) · [`current-file-map.md`](current-file-map.md) (dashboard routes) · [`../ARCHITECTURE.md`](../ARCHITECTURE.md) (stack)

---

## What's Already Built (D1 — Live Today)

### 33 Tools across 11 categories

| Category | Tools | Notes |
|---|---|---|
| **animals** | get_animal_profile, list_available_animals, generate_animal_bio, update_animal_bio | Bio gen + profile fetch wired to animal_profiles |
| **cms** | get_cms_page, update_cms_section, generate_section_copy, publish_cms_page | Approval-gated writes |
| **cms_inspect** | cms_dom_section_map, cms_asset_resolution_check | Audit tools |
| **browser_inspect** | playwright_inspect_page, browser_console_audit, browser_network_audit, cms_visual_snapshot | CDP/Playwright pipeline |
| **cache** | cms_cache_probe | KV hit/miss/bust |
| **database** | list_tables, query_database, write_database | Read-only free; writes require approval |
| **fosters** | list_applications, review_application, update_app_status, draft_app_response | Application pipeline |
| **fundraising** | get_donation_summary, draft_donor_update, generate_campaign_copy | Campaign + donor comms |
| **operations** | get_medical_due, get_volunteer_hours | Care + ops reporting |
| **platform** | inspect_schema, run_migration, check_deploy_status | Developer-tier only |
| **quality** | cms_accessibility_smoke | A11y smoke checks |
| **reporting** | generate_report, primetech_inspect_report | Cross-domain reports |

### 17 Workflows (agentic pipelines)

| Workflow | Trigger | Risk | Purpose |
|---|---|---|---|
| primetech_inspect_protocol | manual | medium | Full page audit: browser + CMS + R2 + KV + A11y |
| primetech_cms_asset_pipeline | manual | medium | CMS onboarding: discover → diff → upload → seed → dedup |
| primetech_shell_pipeline | manual | medium | Global shell extraction: CSS, header, footer, brand → R2 |
| cms_page_live_editor_session | manual | low | Load full page editing context |
| cms_section_draft_update | manual | low | Save section as draft, bust KV |
| cms_agent_section_improvement_patch | agent | low | Agent Sam proposes section improvements (approval-gated) |
| cms_page_publish_pipeline | manual | high | Draft → approve → R2 → KV bust → verify live |
| cms_page_revert_revision | manual | medium | Restore from revision history |
| cms_draft_change_review | manual | low | Show all pending unpublished changes |
| cms_cache_integrity_refresh | manual | medium | Bust + re-prime all KV keys |
| cms_asset_picker_sync | manual | medium | Reconcile R2 ↔ cms_assets |
| cms_brand_theme_live_update | manual | medium | Logo, colors, tokens, KV bust |
| cms_nav_menu_builder_update | manual | medium | Nav items, labels, hrefs |
| cms_homepage_quality_review | manual | low | Homepage audit: content, CTAs, SEO, a11y |
| cms_editor_bootstrap_audit | manual | low | Validate CMS editor can load all dependencies |
| cms_schema_section_type_generator | manual | medium | Generate/refine section type schemas |
| cms_full_site_static_fallback_snapshot | manual | medium | Render all pages → R2 static fallback |

---

## What's Missing (Phase 2 Build Plan)

### 1. Agent Sam UI in Dashboard (`/dashboard` → Agent Sam tab)

The `agentsam.jsx` file exists and loads at a baseline. What it needs:

- **Tool picker** — surface tools by category; user selects a tool, fills params, submits
- **Approval queue** — tools with `requires_approval = 1` show a "Pending Approval" card before executing; owner/admin clicks Approve or Deny
- **Run history** — `agentsam_sessions` table exists; render last N sessions with status, tool used, output summary
- **Workflow launcher** — button per workflow; shows risk level badge and approval requirement before starting

**Priority order for UI:**
1. `generate_animal_bio` — one-click bio generation from intake data (highest daily value)
2. `draft_app_response` — draft email to foster applicants
3. `generate_campaign_copy` — fundraising campaign copy
4. `cms_agent_section_improvement_patch` — Agent Sam rewrites a CMS section
5. `primetech_inspect_protocol` — full site audit on demand

---

### 2. Tool Execution API (`/api/agentsam/run`)

**Partial today:** PrimeTech/CMS tools execute via `POST /api/agentsam/tools/*` (`agentsam_tools.js`). Chat uses the tool loop in `agentsam_api.js`. **Still needed:** a generic staff-facing runner for D1-registered tools (animals, fosters, fundraising) with role checks and approval queue.

```
POST /api/agentsam/run
Body: { tool_key, params, session_id? }

→ Validate tool_key exists in agentsam_tools, is_enabled = 1
→ Check allowed_roles vs current user
→ If requires_approval = 0: execute immediately, return result
→ If requires_approval = 1: queue to agentsam_approval_queue, return { pending: true, approval_id }

POST /api/agentsam/approve/:approval_id
→ Owner/admin approves → executes the queued tool call → returns result
```

(Existing: `POST /api/agentsam/tool/approve` — extend for queued staff tools.)

Tool execution handlers per category — some call Anthropic API (bio gen, copy gen), some query D1 (database tools), some call Worker sub-requests (CMS tools).

---

### 3. Approval Queue Table

```sql
CREATE TABLE IF NOT EXISTS agentsam_approval_queue (
  id TEXT PRIMARY KEY DEFAULT ('appr_' || lower(hex(randomblob(8)))),
  tenant_id TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  tool_key TEXT NOT NULL,
  workflow_key TEXT,
  params_json TEXT DEFAULT '{}',
  requested_by TEXT,
  status TEXT DEFAULT 'pending', -- pending | approved | denied | executed
  approved_by TEXT,
  approved_at TEXT,
  result_json TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

This is what makes the approval-gated tools safe for non-developer staff to trigger — they can request, owner approves.

---

### 4. Highest-Value Tools to Wire First

**`generate_animal_bio`**
- Input: `animal_id`
- Fetch animal_profiles row (breed, age, sex, intake notes, medical_notes, tags_json)
- POST to Anthropic API with CPAS brand voice prompt
- Return proposed bio — staff clicks "Save to Profile" → PATCH animal_profiles

**`draft_app_response`**
- Input: `application_id`, `response_type` (approved/denied/follow_up)
- Fetch cpas_foster_applications row
- Generate warm, professional email draft
- Staff edits → sends via `/api/email/send`

**`get_medical_due`**
- Input: `days_ahead` (default 7)
- Query animal_profiles WHERE medical_notes LIKE '%due%' OR metadata_json vaccination_cert expiry
- Return list of animals needing attention
- Surface on Overview dashboard as "Medical Alerts" card (replace mock)

**`generate_campaign_copy`**
- Input: `campaign_id`, `format` (email/social/both)
- Fetch fundraising_campaigns row + linked animal if applicable
- Generate subject line + body + CTA copy
- Staff approves → sends via Resend or posts to social

---

### 5. Connection to Live Overview Stats (replaces mock data)

Once tool execution API exists, wire Overview dashboard:

| Mock card today | Live source |
|---|---|
| Animals in care | `SELECT COUNT(*) FROM animal_profiles WHERE status != 'adopted'` |
| Foster placements | `SELECT COUNT(*) FROM foster_records WHERE status = 'active'` |
| Applications pending | `SELECT COUNT(*) FROM cpas_foster_applications WHERE review_status = 'new'` |
| Donations this month | `SELECT SUM(intended_amount_cents) FROM donations WHERE created_at >= ...` |
| Medical due | `get_medical_due` tool |
| Volunteer hours | Real data once volunteer_hours table is seeded |

---

## Schema Reference (tables already in D1)

```
agentsam_tools          — 33 registered tools, all is_enabled = 1
agentsam_workflows      — 17 registered workflows
agentsam_sessions       — run history (exists, not yet populated from CPAS)
agentsam_tools.usage_count + last_used_at — increment on each tool run
```

---

## Build Order Recommendation

```
Sprint 1 (2-3 hrs)
  POST /api/agentsam/run (no-approval tools only)
  generate_animal_bio wired + Save to Profile button on animal profile
  get_medical_due wired → Medical Alerts card on Overview

Sprint 2 (2-3 hrs)  
  agentsam_approval_queue table + POST /api/agentsam/approve
  Approval queue UI on Agent Sam tab
  draft_app_response wired on /dashboard/applications

Sprint 3 (2-3 hrs)
  generate_campaign_copy wired on /dashboard/fundraising
  Overview stats wired to live D1 queries (kill mock data)
  Agent Sam session history panel

Sprint 4 (future)
  Playwright tools (browser_inspect category) — needs headless browser
  primetech_inspect_protocol — full audit pipeline
  cms_page_publish_pipeline — full agentic publish flow
```

---

## Notes

- All tools with `requires_approval = 1` are safe to expose to `admin` and `staff` roles — they cannot execute without owner sign-off
- The Anthropic API key needs to be added as a Worker secret: `ANTHROPIC_API_KEY`
- Bio generation and copy tools should use `claude-sonnet-4-6` (cost-efficient for this volume)
- The `browser_inspect` category tools require a Playwright/CDP worker or external service — not native to CF Workers; defer to Sprint 4
