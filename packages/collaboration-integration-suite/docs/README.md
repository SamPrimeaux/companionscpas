# CPAS Collaboration Integration Suite

This package preserves the IAM LaunchDesk implementation as source reference for the CPAS Collaborate workspace. It is not shipped to the browser and it is not a second runtime.

## Runtime contract

The production dashboard runtime lives in:

- `public/dashboard/js/view-collaborate.jsx` — shared shell and pane mount contract.
- `public/dashboard/css/collaborate.css` — shared responsive shell styles.
- `public/dashboard/js/view-email.jsx` — existing CPAS Mail implementation, embedded without replacing its APIs.
- `public/dashboard/js/app.jsx` — route and query-state ownership.
- `src/api` and `src/index.js` — API handlers and Worker routing.

The route is `/dashboard/collaborate`. Its supported URL state is:

| Query | Values | Behavior |
|---|---|---|
| `seg` | `calendar`, `tasks`, `mail` | Selects the active surface; Calendar is the default. |
| `ticket` | ticket id | Retained only while Tasks is active. |

Calendar exports `window.CollaborateCalendarPane`. Tasks exports `window.CollaborateTasksPane`. The shell renders truthful pending states until those globals are loaded.

## Data boundaries

- Calendar: `dashboard_calendar_events` plus `dashboard_notifications`.
- Tasks: `agentsam_tickets` plus `agentsam_ticket_events` only.
- Mail: existing CPAS email and Gmail APIs plus current notification behavior.

Do not copy the reference todo endpoint into CPAS. The seed still contains IAM `agentsam_todo` assumptions that Swarm B must remap.

## Integration order

1. Shell + Mail.
2. Calendar, rebased onto Shell + Mail.
3. Tasks, rebased onto the combined Shell + Mail + Calendar result.

Because the original integration branch was merged and removed, current feature work targets `main` in this order.

## Static delivery

The dashboard is Babel-CDN React with no import or bundle step. Keep `view-collaborate.jsx` before `app.jsx` in `public/dashboard/index.html`. Ship dashboard static changes through `scripts/sync-r2.sh`; do not edit R2 objects manually.
