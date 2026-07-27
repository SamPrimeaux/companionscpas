# CPAS Collaborate Sprint — Upcoming Events · Tasks Phases · Mail Canonical

**Date:** 2026-07-27  
**Repo:** `companionscpas` (`/Users/samprimeaux/companionscpas`)  
**Live:** `https://companionsofcaddo.org`  
**Purpose:** Methodical multi-agent blast for Agent Sam / Cursor. Ambiguity = fail. Each swarm owns one lane, one branch, one worktree.

**Coordination (create in CPAS D1 `agentsam_tickets` before launch):**

| Ticket ID | Role |
|-----------|------|
| `tkt_cpas_collab_sprint_2026_07_27` | Umbrella — do not ship until A–E Tier 1+2 |
| `tkt_cpas_cal_upcoming_events_2026_07_27` | Swarm A — Upcoming Events CRUD + purple grid |
| `tkt_cpas_tasks_phases_folders_docs_2026_07_27` | Swarm B — phases · folders · copy · description backfill |
| `tkt_cpas_cms_media_add_folder_2026_07_27` | Swarm C — CMS Images `+ Add Folder` (extends existing `tkt_cpas_w2_cms_images_add_folder_20260726`) |
| `tkt_cpas_mail_canonical_ux_2026_07_27` | Swarm D — Canonical mail URL + Quick actions fix |
| `tkt_cpas_w2_ticket_bodies_backfill_2026_07_27` | Swarm E (or human+agent) — Verbatim Lori descriptions into D1 |

**Law (non-negotiable):**
1. One writing agent = one unique branch + one unique worktree directory whose basename is `companionscpas`.
2. No stubs. Fake UI that looks like CRUD is a bug.
3. Proof = raw D1 / curl / screenshot IDs — not “looks fine.”
4. Dual-pass E2E before `shipped`. Deploy ≠ pass.
5. Do not invent Lori’s acceptance text. If source is missing, Swarm E **blocks** and asks operator.

Paste **Swarm A / B / C / D / E** into **separate** agent sessions. Do not run two writing swarms in one chat.

---

## 0. Verified facts (do not re-debate)

### 0.1 Calendar “Meet with…” is fake today

| Fact | Proof |
|------|-------|
| Label + search exist in UI only | `public/dashboard/js/view-collaborate-calendar.jsx` ~L545–550 — no API call |
| CSS shell | `.cpas-cal-meet` in `public/dashboard/css/collaborate-calendar.css` |
| Real calendar CRUD already exists | `src/api/collaborate_calendar_api.js` → `dashboard_calendar_events` |

### 0.2 Grid lines are grey and soft

| Token | Value | File |
|-------|-------|------|
| `--cal-line` | `#d8dce5` | `collaborate-calendar.css` L5 |
| `--cal-line-soft` | `#e7e9ef` | L6 |
| Hour rows | `border-bottom: 1px solid var(--cal-line-soft)` on `.cpas-cal-time-axis span` + `.cpas-cal-hour-slot` | L166–172 |

Uneven alignment: time-axis row height vs day-column hour slots must share the **same** `--hour-height` and **identical** border model (no double borders / subpixel drift). Fix in CSS + verify week view at 100% zoom.

### 0.3 Task descriptions are empty in D1 (UI is not lying)

Proof query (already run 2026-07-27):

```sql
SELECT id, title, length(COALESCE(description,'')) AS dlen,
  (SELECT COUNT(*) FROM agentsam_ticket_events e
   WHERE e.ticket_id=t.id AND e.event_type='reference_attached') AS refs
FROM agentsam_tickets t
WHERE t.id LIKE 'tkt_cpas_w2_%'
ORDER BY t.id;
```

Result: **every week-2 ticket has `dlen = 0`**. Titles exist. Descriptions do not.  
`reference_attached` events (image URLs) appear in ACTIVITY — that is why “the same image URL is stamped on the bottom.” **Data gap, not a read-path bug.**

### 0.4 “Unassigned” is a project filter, not a workflow phase

In `view-collaborate-tasks.jsx` ~L251, sidenav under **Project work** shows `"Unassigned"` when `ticket.project` is empty.  
User request is **status phases**, not project rename. Swarm B must **add a Phase rail** (Incomplete → … → Completed) and stop presenting empty-project as the primary workflow.

### 0.5 CMS media folders are hardcoded

`MEDIA_FOLDERS` constant in `view-cms.jsx` ~L2863–2875. There is **no** `+ Add Folder` writer today. Existing ticket: `tkt_cpas_w2_cms_images_add_folder_20260726`.

### 0.6 Mail dual surface

| URL | What loads |
|-----|------------|
| `/dashboard/collaborate?seg=mail` | `CollaborateView` → `EmailView({ embedded: true })` + Collaborate chrome |
| `/dashboard/email` | `EmailView` alone (same component file, different chrome) |

“Quick actions” banner: `view-email.jsx` ~L1083 / L1089 — mangled on every message (CSS/layout). Fix once; both routes benefit if they share the component.

---

## 1. Product contract (LOCKED)

### 1.1 Upcoming Events (replaces Meet with)

| Requirement | Spec |
|-------------|------|
| UI label | **Upcoming events** (exact) |
| Remove | “Meet with…” + “Search people” |
| Data | Same table as calendar CRUD: `dashboard_calendar_events` |
| Query | Next N events for tenant where `starts_at >= now` (unix INTEGER), order ASC, limit 8 |
| Row UI | Title · relative/absolute time · optional event_type chip · click opens existing edit form |
| Empty | “No upcoming events” + Create CTA |
| CRUD | Create/edit/delete already on calendar API — list must refresh after save/delete |
| Forbidden | People search, attendee stubs, Google “Meet with” faux UI |

### 1.2 Calendar grid purple

| Requirement | Spec |
|-------------|------|
| Brand purple | Use `--cal-accent` / brand primary (`#7b2fbe` / `--collab-accent`) |
| Lines | Day columns + hour rows: purple at **low alpha** (e.g. `rgba(123,47,190,.22)` strong / `.12` soft) — readable, not neon |
| Alignment | Single `--hour-height`; axis labels and day slots must share borders so lines meet |
| Views | Week + Day (TimeGrid). Month grid uses same purple separators |

### 1.3 Task folders + CMS Add Folder

| Surface | Spec |
|---------|------|
| Tasks | Operator can create named folders; assign ticket → folder; sidenav lists folders with counts; filter by folder |
| Schema | Prefer extend existing tickets table: `folder_id TEXT NULL` + new `agentsam_ticket_folders` (`id, tenant_id, name, sort_order, created_at INTEGER, updated_at INTEGER`). **No new sprawl table if a suitable one exists — prove first.** |
| CMS Images | `+ Add Folder` creates a durable folder (D1 row + optional R2 prefix under `static/cms/folders/<slug>/` or `media/<slug>/`). Persist in D1, not only `MEDIA_FOLDERS` const |
| Ticket note | Close/link `tkt_cpas_w2_cms_images_add_folder_20260726` with Tier proofs |

### 1.4 Documentation placeholder rewrite

Replace:

> Describe what done looks like, paste URLs, and capture client feedback.

With (exact):

> Work notes for this task — what to change, where on the site, and any links or assets. Internal team use only.

List card fallback currently:

> Open to add documentation, context, and acceptance notes.

Replace with:

> No work notes yet — open to add instructions.

### 1.5 Status phase sidenav (replaces Unassigned-as-workflow)

| Label (UI) | D1 `status` values included | Sort |
|------------|------------------------------|------|
| Incomplete | `backlog` | 1 |
| In-Progress | `active`, `in_progress` | 2 |
| Waiting Review | `in_review` | 3 |
| Completed | `shipped`, `done`, `complete` | 4 |

Rules:
- Counts = tickets matching that phase (tenant-scoped).
- Clicking a phase filters the list (does not change project filter).
- Keep **My Tasks** / **Starred**; keep **Project work** as secondary (optional). Empty project may still show under projects, but **must not** be labeled as the primary workflow “Unassigned.”
- Status dropdown in detail pane must use the same four labels (map to D1 values above).

### 1.6 Mail canonical URL

| Requirement | Spec |
|-------------|------|
| Canonical path | `/dashboard/mail` |
| Behavior | Same UX as today’s Collaborate Mail (`EmailView` + Collaborate top chrome OR equivalent flush shell that matches `?seg=mail`) |
| Redirects | `/dashboard/email` → `302/replace` to `/dashboard/mail` (preserve `?view=` / query where relevant) |
| Nav | ADMIN **Email** link → `/dashboard/mail` |
| Collaborate tab | Mail tab may navigate to `/dashboard/mail` **or** keep `?seg=mail` as alias that renders identical surface — pick one SSOT in code comments |
| Quick actions | Fix layout so banner is not distorted/overlapping; one clean strip per message |

---

## 2. Swarm assignments

### Swarm A — Calendar Upcoming + Purple grid  
**Ticket:** `tkt_cpas_cal_upcoming_events_2026_07_27`  
**Branch:** `feat/cpas-cal-upcoming-events-2026-07-27`  
**Worktree:** `$HOME/agent-worktrees/cpas-swarm-a-cal/companionscpas`  
**Files (only):**
- `public/dashboard/js/view-collaborate-calendar.jsx`
- `public/dashboard/css/collaborate-calendar.css`
- `src/api/collaborate_calendar_api.js` (add `GET .../upcoming?limit=` if list endpoint insufficient)
- migration only if query needs indexed column (prefer none)

**Done when:**
1. No “Meet with” / “Search people” strings in calendar JSX.
2. Upcoming list shows real rows from `dashboard_calendar_events` (create event in UI → appears in list within refresh).
3. Week grid lines are brand purple; hour lines visually align with day columns at 100% zoom (screenshot proof).
4. `node --check` on touched JS; commit; push; Mac `npm run deploy:full` (or host-correct ship).

**Tier 1 proof:** event id + SQL `SELECT id,title,starts_at FROM dashboard_calendar_events WHERE id=?`  
**Tier 2:** independent actor re-queries D1 + hard-refresh calendar.

---

### Swarm B — Tasks phases · folders · copy  
**Ticket:** `tkt_cpas_tasks_phases_folders_docs_2026_07_27`  
**Branch:** `feat/cpas-tasks-phases-folders-2026-07-27`  
**Worktree:** `$HOME/agent-worktrees/cpas-swarm-b-tasks/companionscpas`  
**Files:**
- `public/dashboard/js/view-collaborate-tasks.jsx`
- `public/dashboard/css/collaborate-tasks.css`
- `src/api/*tickets*` (whatever serves `/api/tickets` — locate before edit; do not invent second API)
- `db/migrations/20260727_ticket_folders.sql` (if schema needed)

**Done when:**
1. Placeholder strings updated to exact copy in §1.4.
2. Phase rail: Incomplete / In-Progress / Waiting Review / Completed with live counts + filter.
3. Task folders: create + assign + filter (CRUD).
4. Status dropdown aligned to phase labels.
5. No reliance on empty `project` as “Unassigned” primary nav.

**Tier 1:** create folder id; move ticket; SQL shows `folder_id`; phase filter returns expected ids.  
**Tier 2:** independent D1 pull.

---

### Swarm C — CMS Images + Add Folder  
**Ticket:** `tkt_cpas_cms_media_add_folder_2026_07_27` (close parent `tkt_cpas_w2_cms_images_add_folder_20260726`)  
**Branch:** `feat/cpas-cms-add-folder-2026-07-27`  
**Worktree:** `$HOME/agent-worktrees/cpas-swarm-c-cms-folder/companionscpas`  
**Files:**
- `public/dashboard/js/view-cms.jsx` (media library section only — minimize blast radius in 4k-line file)
- `src/api/cms_api.js` (folder create/list endpoints)
- migration for `cms_media_folders` **or** reuse proven table after `PRAGMA`/`d1_schema` check

**Done when:**
1. UI button **+ Add Folder** visible in CMS Images rail.
2. Folder survives reload (D1), appears in rail, upload can target it.
3. Not only a JS array push.

---

### Swarm D — Mail canonical + Quick actions  
**Ticket:** `tkt_cpas_mail_canonical_ux_2026_07_27`  
**Branch:** `feat/cpas-mail-canonical-2026-07-27`  
**Worktree:** `$HOME/agent-worktrees/cpas-swarm-d-mail/companionscpas`  
**Files:**
- `public/dashboard/js/app.jsx` (routes + redirects)
- `public/dashboard/js/view-collaborate.jsx` (Mail tab → canonical)
- `public/dashboard/js/view-email.jsx` (Quick actions layout)
- `public/dashboard/dash.css` or email-specific CSS for Quick actions
- Sidebar nav config wherever ADMIN Email href is defined

**Done when:**
1. `/dashboard/mail` loads the Collaborate-quality mail UX.
2. `/dashboard/email` redirects to `/dashboard/mail`.
3. Quick actions banner is single-line, not mangled, on ≥3 different messages.
4. Sidebar Email → `/dashboard/mail`.

**Note:** Prefer Cursor/operator for this lane if Agent Sam mail session is flaky — still same ticket + proofs.

---

### Swarm E — Verbatim ticket body backfill (BLOCKED on source)  
**Ticket:** `tkt_cpas_w2_ticket_bodies_backfill_2026_07_27`  
**Branch:** `chore/cpas-w2-ticket-bodies-2026-07-27`  
**Worktree:** `$HOME/agent-worktrees/cpas-swarm-e-bodies/companionscpas`

**Gate before coding:** Operator provides Lori’s instructions as one of:
- pasted markdown brief, or
- path to source file / email export, or
- IAM/CPAS row ids that actually contain bodies (none on week-2 today).

**Work:**
1. For each `tkt_cpas_w2_*` with `dlen=0`, `UPDATE agentsam_tickets SET description = ?` with **verbatim** Lori text (full unicode, no truncation).
2. Optionally clear erroneous blanket `reference_attached` if Lori did not attach that asset to that ticket (confirm per-id).
3. Proof: re-run §0.3 query — every targeted ticket `dlen > 0`.
4. UI check: open task → Documentation shows description (not placeholder).

**Forbidden:** LLM-invented acceptance criteria presented as Lori’s words.

---

## 3. Integration / Part-4 merge order

1. A (calendar) — low collision  
2. C (cms folders) — isolated to cms  
3. B (tasks) — may touch tickets API; merge after A  
4. E (D1 backfill) — can parallel anytime after gate; no UI conflict  
5. D (mail routes) — merge last (touches `app.jsx`)

After each merge: `npm run deploy:full` from Mac operator checkout (or `ship:remote` on VM).  
Umbrella ticket ships only when A–E have Tier 2 (and control-plane items Tier 3 if required).

---

## 4. Agent Sam paste packs (copy exactly)

### Swarm A paste

```
REPO: companionscpas
CWD: $HOME/agent-worktrees/cpas-swarm-a-cal/companionscpas
BRANCH: feat/cpas-cal-upcoming-events-2026-07-27
TICKET: tkt_cpas_cal_upcoming_events_2026_07_27
PLAN: docs/plans/CPAS-COLLAB-SPRINT-2026-07-27.md §1.1 §1.2 §Swarm A
DO: Replace Meet with… with Upcoming events backed by dashboard_calendar_events; purple aligned grid lines.
DON'T: touch tasks/mail/cms; don't invent people-search.
PROOF: SQL event row + screenshot week grid + no Meet with string in jsx.
SHIP: validate, commit, push, deploy by host lane.
```

### Swarm B paste

```
REPO: companionscpas
CWD: $HOME/agent-worktrees/cpas-swarm-b-tasks/companionscpas
BRANCH: feat/cpas-tasks-phases-folders-2026-07-27
TICKET: tkt_cpas_tasks_phases_folders_docs_2026_07_27
PLAN: docs/plans/CPAS-COLLAB-SPRINT-2026-07-27.md §1.3–1.5 §Swarm B
DO: Phase rail Incomplete/In-Progress/Waiting Review/Completed; task folders CRUD; exact doc placeholder rewrite.
DON'T: invent Lori descriptions; don't rewrite mail/cms.
PROOF: folder_id SQL; phase counts; screenshot sidenav.
SHIP: validate, commit, push, deploy by host lane.
```

### Swarm C paste

```
REPO: companionscpas
CWD: $HOME/agent-worktrees/cpas-swarm-c-cms-folder/companionscpas
BRANCH: feat/cpas-cms-add-folder-2026-07-27
TICKET: tkt_cpas_cms_media_add_folder_2026_07_27
PLAN: docs/plans/CPAS-COLLAB-SPRINT-2026-07-27.md §1.3 CMS §Swarm C
DO: Durable + Add Folder for CMS Images; D1-backed; wire uploads.
DON'T: edit collaborate calendar/tasks/mail.
PROOF: folder row in D1 + UI reload persistence.
SHIP: validate, commit, push, deploy by host lane.
```

### Swarm D paste

```
REPO: companionscpas
CWD: $HOME/agent-worktrees/cpas-swarm-d-mail/companionscpas
BRANCH: feat/cpas-mail-canonical-2026-07-27
TICKET: tkt_cpas_mail_canonical_ux_2026_07_27
PLAN: docs/plans/CPAS-COLLAB-SPRINT-2026-07-27.md §1.6 §Swarm D
DO: Canonical /dashboard/mail matching collaborate?seg=mail UX; redirect /dashboard/email; fix Quick actions mangling.
DON'T: rewrite Gmail sync; don't touch calendar/tasks schema.
PROOF: curl -I redirects; screenshots Quick actions on 3 messages.
SHIP: validate, commit, push, deploy by host lane.
```

### Swarm E paste

```
REPO: companionscpas
CWD: $HOME/agent-worktrees/cpas-swarm-e-bodies/companionscpas
BRANCH: chore/cpas-w2-ticket-bodies-2026-07-27
TICKET: tkt_cpas_w2_ticket_bodies_backfill_2026_07_27
PLAN: docs/plans/CPAS-COLLAB-SPRINT-2026-07-27.md §0.3 §Swarm E
DO: Backfill agentsam_tickets.description for tkt_cpas_w2_* from OPERATOR-PROVIDED Lori verbatim source only.
DON'T: invent copy; don't ship UI features.
PROOF: SQL dlen>0 for each id; UI shows notes.
BLOCK: if operator has not provided Lori source, stop and ask.
```

---

## 5. Operator checklist before launch

- [ ] Create the six tickets in CPAS D1 (or IAM mirrors if that’s the control plane for this sprint).
- [ ] Provision five worktrees with basename `companionscpas`.
- [ ] Paste Lori week-2 brief into Swarm E session (or attach file path).
- [ ] Confirm brand purple hex for grid: `#7b2fbe` (Brand primary).
- [ ] Mac deploy lane available for sequential merges (`npm run deploy:full`).

---

## 6. Explicit non-goals

- Growing public header / logo work (done).  
- Replacing Gmail/Resend providers.  
- IAM LaunchDesk wholesale port.  
- Inventing week-2 acceptance criteria.  
- Multi-writer on `view-cms.jsx` outside Swarm C’s media folder section.
