# Companions CPAS — Collaboration suite swarm blast (Calendar + Tickets-Tasks + Mail)

**Date:** 2026-07-26  
**Branch (integration):** `collaboration-integration-suite`  
**Repo:** `github.com/SamPrimeaux/companionscpas`  
**Live site:** `https://companionsofcaddo.org`  
**Visual SSOT (IAM screenshots):** Calendar `/dashboard/collaborate` · Tasks `/dashboard/collaborate?seg=tasks` · Mail `/dashboard/mail` (CPAS already has `/dashboard/email`)  

**Coordination tickets (IAM D1 `agentsam_tickets` — also mirrored intent on CPAS D1):**
| ID | Role |
|----|------|
| `tkt_cpas_collab_suite_e2e_2026_07` | Umbrella — do not ship until A+B+C Tier 1+2 |
| `tkt_cpas_collab_calendar_crud_2026_07` | Swarm A — Calendar FULL CRUD |
| `tkt_cpas_collab_tickets_tasks_crud_2026_07` | Swarm B — Tasks UX on `agentsam_tickets` FULL CRUD |
| `tkt_cpas_collab_mail_shell_refine_2026_07` | Swarm C — Mail UX refine + Collaborate shell tabs |

**Law:** no stubs · full CRUD where required · dual-pass E2E · deploy ≠ pass · unique branch + unique worktree per swarm · QC does not edit implementer branches  

Paste **Swarm A / B / C** into **separate** agent sessions. Do not run two writing swarms in one chat.

---

## 0. Double-check: what the screenshots are (and are NOT)

| Screenshot | Surface | Migrate? | Data spine |
|------------|---------|----------|------------|
| Collaborate / Calendar week grid + mini-cal + Create | **YES — required** | IAM LaunchDesk calendar UX into CPAS shell | CPAS `dashboard_calendar_events` (+ extend) · `dashboard_notifications` · optional Google later |
| Collaborate / Tasks list + detail focus | **YES — required** | IAM Tasks **UX** (lists, create, focus, complete) | **`agentsam_tickets` + `agentsam_ticket_events` only** — NOT `agentsam_todo` |
| IAM Mail (`/dashboard/mail`) | **NO wholesale replace** | CPAS already has working `/dashboard/email` | `inbound_emails` · Gmail OAuth · `dashboard_notifications` |
| CPAS Email (current) | **YES — minor UI/UX** to sit under Collaborate tabs | Keep `view-email.jsx` | same as today |
| IAM `/dashboard/artifacts/tickets` Drive shell | **NO** | Wrong chrome for this product | — |

**Already seeded on branch (commit `1d2a7d5`) — reference only, not drop-in:**

`packages/collaboration-integration-suite/` contains IAM LaunchDesk calendar/tasks **source seeds**.  
**Critical remap:** seed still talks to `/api/agent/todo` / `agentsam_todo`. Swarm B must **delete that coupling** and bind Tasks UI to `/api/tickets` → `agentsam_tickets`.

**Explicitly out of scope (do not port):**
- `calendar_booking_pages`, `time_entries`, `time_projects`, `meet_rooms`, booking pages, project timers  
- IAM `ArtifactsDriveShell` / Drive library  
- Replacing CPAS mail with IAM `MailPage.tsx` wholesale  

---

## 1. Product contract (LOCKED)

### 1.1 Collaborate shell (shared by A/B/C)

Route family under CPAS dashboard:

| Route | Seg / view | Owner |
|-------|------------|-------|
| `/dashboard/collaborate` | Calendar (default) | Swarm A |
| `/dashboard/collaborate?seg=tasks` | Tasks board | Swarm B |
| `/dashboard/collaborate?seg=tasks&ticket=<id>` | Task focus/detail | Swarm B |
| `/dashboard/collaborate?seg=mail` **or** keep `/dashboard/email` with Collaborate chrome | Mail | Swarm C |

**UX chrome (from screenshots):**
- Breadcrumb: `Collaborate / {Calendar|Tasks|Mail}`
- Pill tabs: Calendar · Tasks · Mail (active state matches IAM)
- Left contextual sidebar (Create / mini-cal OR My Tasks lists OR mail folders)
- Main pane
- Optional thin right utility rail (can reuse CPAS patterns; do not block on IAM rail parity)

Nav: add **Collaborate** under ADMIN (near Email). Email can remain as deep link; Mail tab inside Collaborate must land on the same inbox capability.

### 1.2 Calendar — FULL CRUD (Swarm A)

| Op | UX | API (target) | D1 |
|----|----|--------------|-----|
| Create | Create button + click grid + event form | `POST /api/collaborate/calendar/events` | INSERT `dashboard_calendar_events` |
| Read | Day/week/month views, mini-cal | `GET /api/collaborate/calendar/events?from=&to=` | SELECT range |
| Update | Drag/edit form | `PATCH /api/collaborate/calendar/events/:id` | UPDATE |
| Delete | Delete in form | `DELETE /api/collaborate/calendar/events/:id` | DELETE |
| Notifications | Badge / list of upcoming or system | `GET/PATCH /api/email/notifications` (existing) + create on event CRUD where useful | `dashboard_notifications` |

**Schema work (required — current `dashboard_calendar_events` is too thin for week-grid parity):**

Existing columns: `id, tenant_id, title, event_type, starts_at, ends_at, platform, content, status, animal_id, created_at`.

Add via migration (do not invent a second events table):

| Column | Purpose |
|--------|---------|
| `all_day` INTEGER 0/1 | All-day events |
| `location` TEXT | Optional |
| `attendees_json` TEXT | JSON array |
| `created_by` TEXT | Actor |
| `updated_at` INTEGER unix | Law: epoch for filters |
| `source` TEXT | `local` \| `google` (optional later) |
| `external_event_id` TEXT | Google sync later |
| `metadata_json` TEXT | Escape hatch |

Prefer `starts_at`/`ends_at` as **INTEGER unix** going forward; if TEXT ISO must stay for legacy rows, add `starts_at_unix` / `ends_at_unix` and filter on unix only (AGENTS.md timestamp law).

**Do not** require Google Calendar for v1 visual/CRUD ship. Google sync is Phase 2 after local CRUD green.

### 1.3 Tasks — FULL CRUD on `agentsam_tickets` (Swarm B)

IAM Tasks UX, CPAS ticket spine. Real rows already exist (15 tickets, 27 events).

| Op | UX (from screenshots) | API | D1 |
|----|----------------------|-----|-----|
| Create | + Create / + Add a task | `POST /api/tickets` | INSERT `agentsam_tickets` + event |
| Read list | My Tasks / filters / counts | `GET /api/tickets` | SELECT |
| Read detail | Focus panel (title, docs, badges) | `GET /api/tickets/:id` + events | tickets + `agentsam_ticket_events` |
| Update fields | Save title/description/priority/project/due | `PATCH /api/tickets/:id` | UPDATE (+ event) |
| Status / complete | Mark complete → `shipped` or map `open`→`active`/`shipped` | `POST /api/tickets/:id/status` | status + event |
| Delete | Delete button | `DELETE /api/tickets/:id` | DELETE ticket + events |
| Star / lists | Starred / Personal | tags JSON on ticket (`starred`, list name) | UPDATE tags |

**Field mapping (LOCKED):**

| Tasks UX field | `agentsam_tickets` column |
|----------------|---------------------------|
| Title | `title` |
| Documentation / body | `description` (CPAS has it; IAM UI lacked it — use it) |
| Status badge | `status` (`backlog\|active\|blocked\|in_review\|shipped\|abandoned`) |
| Priority badge | `priority` (accept `P0`–`P3` **and** `high\|medium\|low` — normalize in API) |
| Project chip | `project` (e.g. `proj_companions_cpas_web`) |
| Requested by | `requested_by` |
| Due | store in `metadata` via tags or add `due_at INTEGER` if missing — **prefer add `due_at INTEGER`** in same migration if not present |
| Created/Updated | `created_at` / `updated_at` (unix) |
| Activity | `agentsam_ticket_events` |

**Status UX mapping for “Mark complete”:** set `shipped` (with `status_reason`).  
**“Open” list:** `active` + `in_review` (+ optionally `blocked`).  
**Backlog list:** `backlog`.

**Banned:** any read/write to `agentsam_todo` for this surface. Remove `agent-todo.excerpt.js` from the runtime path.

### 1.4 Mail — refinements only (Swarm C)

Keep `public/dashboard/js/view-email.jsx` + `src/api/email_api.js` + `src/api/gmail_api.js`.

Required refinements:
1. Collaborate tab chrome when entered via `/dashboard/collaborate?seg=mail` (or equivalent).
2. Visual alignment with Calendar/Tasks tabs (same breadcrumb + pill row).
3. Do not regress Inbox / Compose / Gmail connect / notifications smart view.
4. Optional: match IAM Compose styling lightly — not a rewrite.

---

## 2. File map (migrate / create / touch)

### 2.1 IAM provenance (read-only reference)

**Calendar + shell**
- `dashboard/pages/LaunchDeskPage.tsx`
- `dashboard/pages/launch-desk/collaborate-calendar.css`
- `dashboard/pages/launch-desk/ops-desk-types.ts` (trim — calendar only)
- `dashboard/pages/launch-desk/CollaborateCalendarSetupPanel.tsx` (optional; booking pages out of scope)
- `dashboard/src/components/collaborate/CollaborateWorkShell.tsx`
- `dashboard/src/components/collaborate/CollaboratePageRail.tsx`
- `dashboard/src/components/collaborate/collaborate-work-*.css`
- `dashboard/src/lib/collaborate/collaborateRailNav.ts`
- `src/api/calendar.js` (logic reference — **do not copy GCal/booking/timer wholesale**)

**Tasks UX (remap data layer)**
- `dashboard/pages/launch-desk/CollaborateTasksPanel.tsx`
- `dashboard/pages/launch-desk/CollaborateTaskFocus.tsx`
- `dashboard/pages/launch-desk/CollaborateTasksInsights.tsx` (optional Phase 2)
- `dashboard/pages/launch-desk/CollaborateActiveTasksPanel.tsx`
- `dashboard/src/lib/collaborate/userTaskLists.ts` (reimplement lists via ticket tags)
- IAM tickets API/core for CRUD contract: `dashboard/api/tickets.ts`, `src/api/tickets.js`, `src/core/agentsam-tickets.js`

**Mail (reference only)**
- `dashboard/components/MailPage.tsx` — styling cues only

### 2.2 CPAS targets (writers create/edit these)

| Path | Swarm | Notes |
|------|-------|-------|
| `public/dashboard/js/view-collaborate.jsx` | A+B+C (A owns shell+calendar; B tasks pane; C mail pane hook) | New Collaborate SPA view |
| `public/dashboard/css/collaborate.css` | A (B/C append) | Extracted/adapted from IAM CSS |
| `public/dashboard/js/app.jsx` | C (coord) + each swarm for route registry | Routes + nav |
| `public/dashboard/js/ui.jsx` | C | Sidebar Collaborate item |
| `public/dashboard/index.html` | C | Script include + cache-bust |
| `src/api/collaborate_calendar_api.js` | A | NEW — FULL CRUD events |
| `src/api/tickets_api.js` | B | NEW — wrap/port IAM tickets handlers to CPAS auth |
| `src/core/agentsam_tickets.js` | B | NEW — port from IAM; extend description/requested_by/due_at |
| `src/index.js` | A+B | Dispatch `/api/collaborate/calendar/*`, `/api/tickets*` |
| `db/migrations/XXX_collaborate_calendar_extend.sql` | A | Extend `dashboard_calendar_events` |
| `db/migrations/XXX_tickets_due_at_if_needed.sql` | B | Only if `due_at` missing |
| `public/dashboard/js/view-email.jsx` | C | Tab chrome refinements |
| `packages/collaboration-integration-suite/docs/*` | C | Package README + MANIFEST after build |
| `docs/current-file-map.md` | C | Update route map |

Seed package under `packages/collaboration-integration-suite/` stays as **vendor reference**; runtime lives in `public/dashboard` + `src/api`.

---

## 3. Swarm assignments

### Lane map

| | **Swarm A — CALENDAR** | **Swarm B — TICKETS-TASKS** | **Swarm C — SHELL+MAIL** | **QC** |
|--|------------------------|----------------------------|--------------------------|--------|
| **Owns** | Calendar grid UX + event FULL CRUD + schema extend + notifications hooks | Tasks UX remapped to `agentsam_tickets` FULL CRUD + tickets API | Collaborate routes/nav/tabs; Mail UX refine; R2 sync/cache-bust; package docs | Tier 2 raw D1 + visual accept |
| **Branch** | `feat/cpas-collab-calendar-crud` | `feat/cpas-collab-tickets-tasks-crud` | `feat/cpas-collab-shell-mail` | none (detached) |
| **Worktree** | `$HOME/agent-worktrees/swarm-a-collab-cal/companionscpas` | `$HOME/agent-worktrees/swarm-b-collab-tickets/companionscpas` | `$HOME/agent-worktrees/swarm-c-collab-mail/companionscpas` | `/tmp/cpas-worktrees/qc-collab/companionscpas` |
| **Base** | `origin/collaboration-integration-suite` | same | same | same |
| **Primary ticket** | `tkt_cpas_collab_calendar_crud_2026_07` | `tkt_cpas_collab_tickets_tasks_crud_2026_07` | `tkt_cpas_collab_mail_shell_refine_2026_07` | umbrella T2 |
| **Must not touch** | tickets API, `agentsam_tickets` writers, `view-email.jsx` core mail fetch | calendar API, `dashboard_calendar_events` writers | calendar event SQL, tickets CRUD core (except nav wiring) | implementer branches |

```text
$HOME/companionscpas                                      ← Sam / integration ONLY
$HOME/agent-worktrees/
  ├── swarm-a-collab-cal/companionscpas
  ├── swarm-b-collab-tickets/companionscpas
  └── swarm-c-collab-mail/companionscpas
/tmp/cpas-worktrees/
  └── qc-collab/companionscpas
```

**Basename law:** worktree directory basename **must** be `companionscpas`.

### Merge order (LOCKED)

1. **C** lands shell routes + empty Collaborate chrome + Mail tab hook first (unblocks A/B mount points).  
2. **A** and **B** rebase onto C after C merges to `collaboration-integration-suite` (or sequential PR onto C).  
3. Prefer: C → A → B → QC visual pass → umbrella.

If parallel: A/B must not both rewrite `app.jsx` route registry conflict — **C owns `app.jsx` / `ui.jsx` / `index.html`**. A/B export view components; C wires them.

---

## 4. API contracts (no stubs — implement fully)

### 4.1 Calendar

```
GET    /api/collaborate/calendar/events?from=<unix>&to=<unix>
POST   /api/collaborate/calendar/events
       body: { title, starts_at, ends_at, all_day?, location?, content?, event_type?, animal_id?, attendees_json? }
PATCH  /api/collaborate/calendar/events/:id
DELETE /api/collaborate/calendar/events/:id
GET    /api/collaborate/calendar/meta   # optional: timezone, working hours defaults
```

Auth: same dashboard session as other `/api/dashboard/*` / `/api/email/*`.  
Responses: `{ ok: true, events: [...] }` — fail loud on DB errors (no empty success with wrong data).

On create/update/delete: optionally INSERT `dashboard_notifications` (`type=calendar`, `related_type=calendar_event`, `related_id=…`).

### 4.2 Tickets (Tasks)

```
GET    /api/tickets?status=&project=&workable=1&limit=
GET    /api/tickets/analytics
POST   /api/tickets
GET    /api/tickets/:id
PATCH  /api/tickets/:id
DELETE /api/tickets/:id
POST   /api/tickets/:id/status   { status, status_reason? }
GET    /api/tickets/:id/events
POST   /api/tickets/:id/events   { event_type, detail? }
```

Port behavior from IAM `src/core/agentsam-tickets.js` + `src/api/tickets.js`, adapted to CPAS auth (no tenant/workspace filters required). Always write `agentsam_ticket_events` on status change and meaningful patches.

---

## 5. Acceptance goldens (must pass before visual approve)

### Swarm A
1. Open `/dashboard/collaborate` → week grid renders without console errors.  
2. Create event → row in `dashboard_calendar_events` with correct unix range → appears on grid.  
3. Edit title/time → UPDATE proven by D1 SELECT.  
4. Delete → row gone; UI removes block.  
5. At least one notification row created or explicitly deferred with code comment + ticket note (prefer implement).

### Swarm B
1. `/dashboard/collaborate?seg=tasks` lists **live** CPAS tickets (existing `tkt_cpas_w2_*` rows visible).  
2. Open detail → description + events timeline.  
3. Create ticket from UI → INSERT + event `created`.  
4. Mark complete → `status=shipped` + event.  
5. Delete → ticket + events removed.  
6. Zero calls to `agentsam_todo` / `/api/agent/todo`.

### Swarm C
1. Nav Collaborate + tabs switch Calendar/Tasks/Mail without full reload breakage.  
2. Mail tab shows existing inbox (Gmail/Resend) with Compose still working.  
3. Cache-bust bumped; R2 assets synced for changed JSX/CSS.

### QC / Sam visual
Side-by-side vs IAM screenshots: tab chrome, Create affordance, task rows, calendar week header. Approve before production Worker+R2 promote if needed.

---

## 6. Dual-pass / ship rules

- Tier 1: implementer records proof (D1 row ids + URLs).  
- Tier 2: other swarm or QC raw `wrangler d1 execute` SELECT — not the implementer’s summary.  
- Umbrella `tkt_cpas_collab_suite_e2e_2026_07` ships only when A+B+C shippable.  
- CPAS deploy: Worker for APIs; dashboard JSX/CSS via R2 sync (`npm run sync` / project scripts). Never claim shipped on Worker-only.

---

## 7. Operator: create worktrees (once)

```bash
REPO="$HOME/companionscpas"
git -C "$REPO" fetch origin
mkdir -p "$HOME/agent-worktrees" /tmp/cpas-worktrees

git -C "$REPO" worktree add -B feat/cpas-collab-shell-mail \
  "$HOME/agent-worktrees/swarm-c-collab-mail/companionscpas" \
  origin/collaboration-integration-suite

git -C "$REPO" worktree add -B feat/cpas-collab-calendar-crud \
  "$HOME/agent-worktrees/swarm-a-collab-cal/companionscpas" \
  origin/collaboration-integration-suite

git -C "$REPO" worktree add -B feat/cpas-collab-tickets-tasks-crud \
  "$HOME/agent-worktrees/swarm-b-collab-tickets/companionscpas" \
  origin/collaboration-integration-suite
```

Preflight every writer:

```bash
EXPECTED_BRANCH="feat/cpas-collab-…"
EXPECTED_CWD="$HOME/agent-worktrees/<lane>/companionscpas"
cd "$EXPECTED_CWD" || exit 1
test "$(basename "$(pwd -P)")" = "companionscpas" || exit 1
test "$(git branch --show-current)" = "$EXPECTED_BRANCH" || exit 1
git status --porcelain
```

---

## 8. Paste prompts

### Swarm C — SHELL+MAIL (start first)

```text
You are Swarm C — SHELL+MAIL for Companions CPAS collaboration suite.

REPO: companionscpas
CWD: $HOME/agent-worktrees/swarm-c-collab-mail/companionscpas
BRANCH: feat/cpas-collab-shell-mail
BASE: origin/collaboration-integration-suite
TICKET: tkt_cpas_collab_mail_shell_refine_2026_07
PLAN: docs/plans/CPAS-COLLABORATION-SUITE-SWARM-BLAST-2026-07.md

GOAL: Ship Collaborate shell routes + nav + tab chrome; refine Mail to sit under Collaborate; wire empty/placeholder panes for Calendar/Tasks that A/B will fill — NO fake CRUD stubs that pretend to write. Prefer "Coming online" empty states that do not call fake APIs. You own app.jsx / ui.jsx / index.html.

DO:
1. Add /dashboard/collaborate (+ query seg=calendar|tasks|mail)
2. Sidebar ADMIN → Collaborate
3. Pill tabs Calendar | Tasks | Mail matching IAM screenshots
4. Mail seg renders existing EmailView / view-email with shared chrome
5. Export mount points: window.CollaborateCalendarPane / CollaborateTasksPane for A/B OR clear import contract in view-collaborate.jsx
6. Bump cache-bust; document R2 sync commands
7. Update docs/current-file-map.md

DO NOT: implement calendar event SQL, tickets CRUD, replace view-email wholesale with IAM MailPage.

PROOF: screenshots/URLs of tabs; git commit; PR into collaboration-integration-suite.
```

### Swarm A — CALENDAR

```text
You are Swarm A — CALENDAR for Companions CPAS.

REPO: companionscpas
CWD: $HOME/agent-worktrees/swarm-a-collab-cal/companionscpas
BRANCH: feat/cpas-collab-calendar-crud
BASE: rebase onto feat/cpas-collab-shell-mail after C merges (or onto collaboration-integration-suite if C already merged)
TICKET: tkt_cpas_collab_calendar_crud_2026_07
PLAN: docs/plans/CPAS-COLLABORATION-SUITE-SWARM-BLAST-2026-07.md
REFERENCE SEED: packages/collaboration-integration-suite/frontend/pages/LaunchDeskPage.tsx (+ calendar CSS)

GOAL: FULL CRUD calendar UX (week/day/month + mini-cal + Create) driven by D1 dashboard_calendar_events (extend schema) + dashboard_notifications hooks. No booking pages, timers, meet_rooms, time_entries.

DO:
1. Migration extending dashboard_calendar_events (unix times, all_day, location, etc.)
2. src/api/collaborate_calendar_api.js + wire src/index.js
3. Port calendar UI into public/dashboard (Babel JSX) mounted in Collaborate Calendar tab
4. Create/edit/delete events end-to-end against live D1
5. Optional Google Calendar = Phase 2 only — do not block v1

DO NOT: touch agentsam_tickets writers; do not use agentsam_todo; do not own app.jsx registry (coordinate with C).

PROOF: D1 SELECTs for created/updated/deleted event ids; /dashboard/collaborate week view shows them; Tier 1 on ticket.
```

### Swarm B — TICKETS-TASKS

```text
You are Swarm B — TICKETS-TASKS for Companions CPAS.

REPO: companionscpas
CWD: $HOME/agent-worktrees/swarm-b-collab-tickets/companionscpas
BRANCH: feat/cpas-collab-tickets-tasks-crud
BASE: same rebase rules as A (after C)
TICKET: tkt_cpas_collab_tickets_tasks_crud_2026_07
PLAN: docs/plans/CPAS-COLLABORATION-SUITE-SWARM-BLAST-2026-07.md
UX REFERENCE: packages/.../CollaborateTasksPanel.tsx + CollaborateTaskFocus.tsx
DATA REFERENCE: IAM src/core/agentsam-tickets.js + src/api/tickets.js
LIVE DATA: CPAS D1 already has agentsam_tickets + agentsam_ticket_events (tkt_cpas_w2_* etc.)

GOAL: Collaborate Tasks UX with FULL CRUD bound ONLY to agentsam_tickets / agentsam_ticket_events. Remap every former agentsam_todo call.

DO:
1. Port tickets API to CPAS (list/create/get/patch/status/delete/events/analytics)
2. Extend core for description, requested_by, due_at if needed
3. Tasks list + focus UI in Collaborate Tasks tab — show LIVE tickets on first paint
4. Create / edit / complete(shipped) / delete with events
5. Star/lists via tags JSON
6. Delete runtime use of agent-todo.excerpt.js

DO NOT: calendar schema; mail rewrite; agentsam_todo.

PROOF: wrangler d1 SELECT before/after CRUD; UI lists real tkt_cpas_* rows; Tier 1 on ticket.
```

### QC — EXTERNAL

```text
You are QC for CPAS collaboration suite. READ-ONLY on implementer branches.

PLAN: docs/plans/CPAS-COLLABORATION-SUITE-SWARM-BLAST-2026-07.md
CWD: /tmp/cpas-worktrees/qc-collab/companionscpas (detached worktree)

For each child ticket A/B/C:
1. Pull PR diff; refuse if stubs / fake success / todo API leakage
2. Raw D1 proof queries (events + tickets)
3. Browser: collaborate calendar/tasks/mail tabs
4. Record Tier 2; only then allow --set-shipped / umbrella close

Never push to feat/* implementer branches.
```

---

## 9. Done definition

- Collaborate Calendar/Tasks/Mail usable on companionsofcaddo.org dashboard  
- Calendar FULL CRUD on extended `dashboard_calendar_events`  
- Tasks FULL CRUD on `agentsam_tickets` + events (existing content visible)  
- Mail refined, not replaced  
- Package docs updated for reuse on future builds  
- Umbrella ticket dual-pass green  

---

## 10. Screenshot → owner quick map

| Screenshot | Owner |
|------------|-------|
| Calendar week + mini-cal + Create | Swarm A |
| Tasks My Tasks list | Swarm B |
| Task focus / documentation panel | Swarm B |
| IAM Mail (reference only) | Swarm C (cues) |
| CPAS Email current | Swarm C (refine) |
