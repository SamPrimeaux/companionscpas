# Collaboration Suite Manifest

## Runtime ownership

| Path | Owner | Purpose |
|---|---|---|
| `public/dashboard/js/view-collaborate.jsx` | Swarm C | Shared shell, tabs, Mail embedding, Calendar and Tasks mount points |
| `public/dashboard/css/collaborate.css` | Swarm C | Shared shell and responsive layout |
| `public/dashboard/js/view-email.jsx` | Swarm C | Existing CPAS mailbox with embedded mode |
| `public/dashboard/js/app.jsx` | Swarm C coordination | Route registry, query parsing, history |
| `public/dashboard/js/ui.jsx` | Swarm C | Collaborate navigation entry |
| `public/dashboard/js/view-collaborate-calendar.jsx` | Swarm A | Calendar pane and calendar-only UI |
| `public/dashboard/css/collaborate-calendar.css` | Swarm A | Calendar-only styles |
| `public/dashboard/js/view-collaborate-tasks.jsx` | Swarm B | Tickets-backed Tasks pane and focus view |
| `public/dashboard/css/collaborate-tasks.css` | Swarm B | Tasks-only styles |

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
