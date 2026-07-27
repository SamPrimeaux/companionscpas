# Companions CPAS — Collaboration suite swarm blast (Calendar + Tickets-Tasks + Mail)

**Date:** 2026-07-26 · **Updated:** 2026-07-27  
**Integration base (LOCKED):** `origin/main` @ `cdadf91` (Swarm C shell+Mail shipped; do **not** base on deleted `feat/cpas-collab-shell-mail`)  
**Repo:** `github.com/SamPrimeaux/companionscpas`  
**Live site:** `https://companionsofcaddo.org` · Collaborate: `/dashboard/collaborate`  
**Visual SSOT (IAM screenshots):** Calendar `/dashboard/collaborate` · Tasks `/dashboard/collaborate?seg=tasks` · Mail `/dashboard/mail` (CPAS already has `/dashboard/email`)  

**Coordination tickets (IAM D1 `agentsam_tickets` — also mirrored intent on CPAS D1):**
| ID | Role | Status |
|----|------|--------|
| `tkt_cpas_collab_suite_e2e_2026_07` | Umbrella — do not ship until A+B+C Tier 1+2 | open |
| `tkt_cpas_collab_calendar_crud_2026_07` | Swarm A — Calendar FULL CRUD | **next** |
| `tkt_cpas_collab_tickets_tasks_crud_2026_07` | Swarm B — Tasks UX on `agentsam_tickets` FULL CRUD | **next** (after or parallel to A; rebase onto A if A lands first) |
| `tkt_cpas_collab_mail_shell_refine_2026_07` | Swarm C — Mail UX refine + Collaborate shell tabs | **DONE** — PR #4 → `main` (`4ac7a68` / merge+deploy `cdadf91`) |

**Law:** no stubs · **full IAM UI/UX parity** · full CRUD · dual-pass E2E · deploy ≠ pass · unique branch + unique worktree per swarm · QC does not edit implementer branches  

Paste **Swarm A / B** into **separate** agent sessions. Do not run two writing swarms in one chat.

---

## 0A. PARITY LOCK (NON-NEGOTIABLE — 2026-07-27)

Operator feedback after Swarm C: the live CPAS Collaborate Calendar tab still shows a **"Calendar is coming online"** placeholder. That was an intentional shell mount for C only. **Swarm A and Swarm B are forbidden from shipping any similar placeholder.**

### Visual SSOT (attach / open these while coding)

| # | Surface | IAM live URL (look + layout) | What must appear on CPAS |
|---|---------|------------------------------|---------------------------|
| 1 | Calendar workspace | `https://inneranimalmedia.com/dashboard/collaborate` | Left rail: **Create**, **mini-month**, optional people search. Main: **week grid** with day headers, time axis, Today / ◀ ▶ / Week selector / refresh. Not a hero empty state. |
| 2 | Tasks list | `https://inneranimalmedia.com/dashboard/collaborate?seg=tasks` | Left: **+ Create**, **My Tasks** (+ count), **Starred**, client/project lists. Main: **My Tasks** title, **+ Add a task**, real rows (checkbox, title, description, project pill, due, star). |
| 3 | Task focus | `https://inneranimalmedia.com/dashboard/collaborate?seg=tasks&ticket=<id>` (IAM may show `task=` — **CPAS uses `ticket=`**) | Close + **Save**, large title, status/priority/project pills, **DOCUMENTATION** body, due + project fields, Created/Updated, footer **Schedule / Mark complete / Delete**. |

CPAS brand colors (plum/purple) may replace IAM blue accents — **layout, density, controls, and information architecture must match IAM**, not a freestyle redesign.

### Banned deliverables (instant reject / no merge)

- "Coming online", "Coming soon", "mount here", disabled Create that does nothing, fake static demo rows  
- API handlers that return `{ ok: true, events: [] }` / empty lists when D1 has data or when write was requested  
- Half-CSS that looks "dashboard-y" but is not week-grid / My Tasks / focus parity  
- Leaving `CollaboratePendingPane` as the Calendar or Tasks surface after your PR  
- Inventing a different Tasks data model (`agentsam_todo`, localStorage, hard-coded arrays)

### Required proof before claiming done

1. Side-by-side screenshots: IAM vs CPAS for your surface (same viewport width).  
2. Live CRUD against CPAS D1 with row ids in the ticket Tier 1 note.  
3. Zero remaining "coming online" / pending copy for **your** surface in `view-collaborate*.jsx`.

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
| **Branch** | `feat/cpas-collab-calendar-crud` | `feat/cpas-collab-tickets-tasks-crud` | `feat/cpas-collab-shell-mail` (**merged/deleted**) | none (detached) |
| **Worktree** | `$HOME/agent-worktrees/swarm-a-collab-cal/companionscpas` | `$HOME/agent-worktrees/swarm-b-collab-tickets/companionscpas` | ~~swarm-c~~ removed | `/tmp/cpas-worktrees/qc-collab/companionscpas` |
| **Base** | `origin/main` (`cdadf91`+) | same (rebase onto A after A merges if parallel) | shipped | `origin/main` |
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

1. **C** ✅ landed shell + Mail mounts on `main` (PR #4). Mount contracts: `window.CollaborateCalendarPane` / `window.CollaborateTasksPane`.  
2. **A** next — branch from `origin/main`, implement calendar pane + API; prefer merge before B if both conflict on `collaborate.css` / `index.html` script tags.  
3. **B** next — branch from `origin/main` (rebase onto A after A merges if needed); tickets API + Tasks pane.  
4. Prefer remaining: **A → B → QC visual pass → umbrella dual-pass**.

If parallel: A/B must not both rewrite `app.jsx` route registry — shell already owns routes. A/B only add their pane scripts in `index.html` + CSS; do not regress Mail.

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

### Swarm A — Calendar (parity + CRUD)

**UI/UX (fail without these):**
1. `/dashboard/collaborate` shows the **real calendar workspace**, not `CollaboratePendingPane` / "coming online".  
2. Left rail matches IAM structure: Create · mini-calendar · (optional Meet/search).  
3. Main pane: week view with 7 day columns, time gutter, Today + prev/next + view switcher (Week/Day/Month) + refresh.  
4. Side-by-side screenshot vs IAM calendar passes Sam/QC visual accept.

**CRUD:**
5. Create event → `dashboard_calendar_events` row + visible block on grid.  
6. Edit title/time → D1 UPDATE proven.  
7. Delete → row gone; UI removes block.  
8. Notification row created **or** deferred with explicit ticket note (prefer implement).

### Swarm B — Tasks (parity + CRUD)

**UI/UX (fail without these):**
1. `/dashboard/collaborate?seg=tasks` shows **My Tasks list UI** matching IAM (lists rail + rows), not pending placeholder.  
2. Live CPAS tickets render on first paint (existing `tkt_cpas_*` / suite tickets visible — not hard-coded demo).  
3. Focus view at `?seg=tasks&ticket=<id>` matches IAM focus: title, pills, DOCUMENTATION, due, project, Save, Mark complete, Delete.  
4. Side-by-side screenshots vs IAM Tasks list + focus pass visual accept.

**CRUD:**
5. Create → INSERT + `agentsam_ticket_events` `created`.  
6. Mark complete → `status=shipped` + event.  
7. Delete → ticket + events removed.  
8. Zero calls to `agentsam_todo` / `/api/agent/todo`.

### Swarm C — DONE (shell only)
Shell + Mail mounts shipped. C was allowed temporary Calendar/Tasks pending panes; **A/B must replace them**.

### QC / Sam visual
Refuse merge if Calendar or Tasks still shows coming-online copy. Side-by-side vs IAM screenshots required.

---

## 6. Dual-pass / ship rules

- Tier 1: implementer records proof (D1 row ids + URLs).  
- Tier 2: other swarm or QC raw `wrangler d1 execute` SELECT — not the implementer’s summary.  
- Umbrella `tkt_cpas_collab_suite_e2e_2026_07` ships only when A+B+C shippable.  
- CPAS deploy: Worker for APIs; dashboard JSX/CSS via R2 sync (`npm run sync` / project scripts). Never claim shipped on Worker-only.

---

## 7. Operator: create worktrees (A/B — base `origin/main`)

```bash
REPO="$HOME/companionscpas"
git -C "$REPO" fetch origin
mkdir -p "$HOME/agent-worktrees"

git -C "$REPO" worktree add -B feat/cpas-collab-calendar-crud \
  "$HOME/agent-worktrees/swarm-a-collab-cal/companionscpas" \
  origin/main

git -C "$REPO" worktree add -B feat/cpas-collab-tickets-tasks-crud \
  "$HOME/agent-worktrees/swarm-b-collab-tickets/companionscpas" \
  origin/main
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

### Swarm C — SHELL+MAIL — COMPLETED (do not re-run)

Shipped PR #4. Calendar/Tasks pending panes are **debt for A/B to erase**, not a pattern to copy.

### Swarm A — CALENDAR (parity mandatory)

```text
You are Swarm A — CALENDAR for Companions CPAS.

REPO: companionscpas
CWD: $HOME/agent-worktrees/swarm-a-collab-cal/companionscpas
BRANCH: feat/cpas-collab-calendar-crud
BASE: origin/main (latest — includes Swarm C shell)
TICKET: tkt_cpas_collab_calendar_crud_2026_07
PLAN: docs/plans/CPAS-COLLABORATION-SUITE-SWARM-BLAST-2026-07.md  (read §0A PARITY LOCK first)
IAM LIVE SSOT: https://inneranimalmedia.com/dashboard/collaborate
REFERENCE CODE: packages/collaboration-integration-suite/frontend/pages/LaunchDeskPage.tsx + collaborate-calendar.css + CollaborateWorkShell patterns
MOUNT: replace CollaboratePendingPane by setting window.CollaborateCalendarPane (or equivalent wired in view-collaborate.jsx)

OPERATOR LAW (violations = failed delivery):
- FULL UI/UX PARITY with IAM Collaborate Calendar — not a freestyle redesign, not a stub.
- NO "coming online", "mount here", disabled Create, empty hero placeholders.
- FULL CRUD against live D1. Deploy ≠ done. Proof = screenshots side-by-side + D1 row ids.

MUST SHIP (visual):
1. Left rail: Create button, working mini-month calendar, optional people search (can be non-functional search UI but present like IAM).
2. Main week grid: day headers (Sun–Sat), hourly time axis, event blocks, Today / prev/next / Week|Day|Month / refresh — match IAM information architecture.
3. Creating an event from Create or grid opens a real form and persists.
4. CPAS may keep plum accent colors; layout/controls must still read as the IAM calendar.

MUST SHIP (backend):
1. Migration extending dashboard_calendar_events (unix times, all_day, location, attendees_json, created_by, updated_at, …)
2. src/api/collaborate_calendar_api.js + wire src/index.js — GET/POST/PATCH/DELETE
3. Optional dashboard_notifications on CRUD (prefer implement)

OUT OF SCOPE: Google Calendar sync (Phase 2), booking pages, timers, meet_rooms, agentsam_tickets, view-email core, rewriting app.jsx route registry (shell already owns routes — only add your script/CSS includes in index.html).

REJECT YOUR OWN PR if /dashboard/collaborate still shows "Calendar is coming online".

PROOF: side-by-side IAM vs CPAS screenshots; wrangler d1 SELECT for create/update/delete ids; Tier 1 on ticket; PR to main.
```

### Swarm B — TICKETS-TASKS (parity mandatory)

```text
You are Swarm B — TICKETS-TASKS for Companions CPAS.

REPO: companionscpas
CWD: $HOME/agent-worktrees/swarm-b-collab-tickets/companionscpas
BRANCH: feat/cpas-collab-tickets-tasks-crud
BASE: origin/main (rebase onto A after A merges if index.html/CSS collide)
TICKET: tkt_cpas_collab_tickets_tasks_crud_2026_07
PLAN: docs/plans/CPAS-COLLABORATION-SUITE-SWARM-BLAST-2026-07.md  (read §0A PARITY LOCK first)
IAM LIVE SSOT:
  https://inneranimalmedia.com/dashboard/collaborate?seg=tasks
  https://inneranimalmedia.com/dashboard/collaborate?seg=tasks&task=…  (CPAS param is ticket=, not task=/todo_*)
REFERENCE CODE: packages/.../CollaborateTasksPanel.tsx + CollaborateTaskFocus.tsx + userTaskLists.ts
DATA: agentsam_tickets + agentsam_ticket_events ONLY — port IAM tickets API behavior
MOUNT: window.CollaborateTasksPane — erase Tasks "coming online" pending pane

OPERATOR LAW (violations = failed delivery):
- FULL UI/UX PARITY with IAM Collaborate Tasks list + focus — not freestyle, not stubs.
- NO agentsam_todo / /api/agent/todo / hard-coded demo tasks.
- FULL CRUD. Live tickets visible on first paint. Proof = screenshots + D1 ids.

MUST SHIP (visual — match IAM):
1. Left rail: + Create, My Tasks (with count), Starred, client/project list groups as applicable to CPAS data.
2. Main: "My Tasks" header, + Add a task, rows with checkbox, title, description preview, project pill, due affordance, star.
3. Focus/detail: close, Save, title, status/priority/project pills, DOCUMENTATION section, due datetime, project select, Created/Updated, Schedule on calendar / Mark complete / Delete.
4. URL: /dashboard/collaborate?seg=tasks&ticket=<id> for focus.

MUST SHIP (backend):
1. /api/tickets CRUD + status + events (+ analytics if needed)
2. due_at / description fields as required by plan §1.3
3. Mark complete → status shipped + event
4. Remove any runtime path through agent-todo.excerpt.js

OUT OF SCOPE: calendar event schema/API, mail rewrite, IAM Drive/artifacts shell.

REJECT YOUR OWN PR if Tasks tab still shows "Tasks are coming online" or only stub rows.

PROOF: side-by-side IAM vs CPAS (list + focus); D1 SELECT before/after CRUD; Tier 1 on ticket; PR to main.
```

### QC — EXTERNAL

```text
You are QC for CPAS collaboration suite. READ-ONLY on implementer branches.

PLAN: docs/plans/CPAS-COLLABORATION-SUITE-SWARM-BLAST-2026-07.md §0A + §5
CWD: /tmp/cpas-worktrees/qc-collab/companionscpas (detached worktree)

FAIL IMMEDIATELY if:
- Calendar or Tasks still shows "coming online" / CollaboratePendingPane for that surface
- UI does not side-by-side match IAM Collaborate calendar/tasks screenshots
- Any agentsam_todo / stub CRUD / empty-success writers

For each child ticket A/B:
1. Pull PR diff
2. Raw D1 proof queries
3. Browser parity check vs IAM
4. Tier 2 only when visual + data both pass

Never push to feat/* implementer branches.
```

---

## 9. Done definition

- Collaborate Calendar/Tasks/Mail usable on companionsofcaddo.org dashboard  
- **Calendar UI matches IAM week workspace** + FULL CRUD on extended `dashboard_calendar_events`  
- **Tasks UI matches IAM My Tasks + focus** + FULL CRUD on `agentsam_tickets` + events  
- Mail refined, not replaced  
- Zero "coming online" placeholders on Calendar or Tasks  
- Package docs updated for reuse on future builds  
- Umbrella ticket dual-pass green  

---

## 10. Screenshot → owner quick map

| Screenshot | Owner | Bar |
|------------|-------|-----|
| IAM Calendar week + mini-cal + Create | Swarm A | Pixel-adjacent layout parity + live CRUD |
| IAM Tasks My Tasks list | Swarm B | Layout parity + live tickets |
| IAM Task focus / documentation | Swarm B | Layout parity + save/complete/delete |
| IAM Mail (reference only) | Swarm C | Done — cues only |
| CPAS Email current | Swarm C | Done — embedded under Mail tab |
