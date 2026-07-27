# Collaboration Suite Manifest

## Runtime ownership

| Path | Owner | Purpose |
|---|---|---|
| `public/dashboard/js/view-collaborate.jsx` | Swarm C (done) | Shared shell — Calendar/Tasks **must not** remain on CollaboratePendingPane after A/B |
| `public/dashboard/css/collaborate.css` | Swarm C + A/B append | Shared shell; A/B add surface CSS files rather than freestyle shell |
| `public/dashboard/js/view-email.jsx` | Swarm C (done) | Existing CPAS mailbox with embedded mode |
| `public/dashboard/js/app.jsx` | Swarm C (done) | Route registry already owns collaborate query keys |
| `public/dashboard/js/ui.jsx` | Swarm C (done) | Collaborate nav entry |
| `public/dashboard/js/view-collaborate-calendar.jsx` | Swarm A | **IAM-parity** calendar pane — week grid + mini-cal + Create + CRUD |
| `public/dashboard/css/collaborate-calendar.css` | Swarm A | Calendar-only styles ported from IAM seed |
| `public/dashboard/js/view-collaborate-tasks.jsx` | Swarm B | **IAM-parity** tickets-backed Tasks list + focus |
| `public/dashboard/css/collaborate-tasks.css` | Swarm B | Tasks-only styles ported from IAM seed |

## Reference inventory

| Directory | Contents | Use |
|---|---|---|
| `frontend/components/collaborate` | IAM shell, rail, and layout examples | Visual and interaction reference |
| `frontend/pages/launch-desk` | Calendar, Tasks, focus, and insights examples | Pane-level reference; remap data contracts |
| `frontend/api` and `frontend/lib` | IAM client helpers and navigation models | Reference only |
| `worker/api` and `worker/core` | IAM calendar, personal data, todo, and sync excerpts | Reference only; do not copy todo assumptions |
| `db/reference-migrations` | Calendar and IAM task-spine examples | Schema reference; CPAS migrations are separately owned |
| `docs/SWARM-BLAST.md` | Original execution plan | Coordination reference |

Nothing under this package is loaded by `public/dashboard/index.html` or imported by the Worker.
