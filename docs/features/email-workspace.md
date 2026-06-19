---
doc_type: feature
feature_id: email-workspace
product: companionscpas
title: Email Workspace
status: live
last_verified: 2026-06-19
tenant_id: tenant_companionscpas
tags:
  - email
  - inbox
  - gmail
  - resend
  - notifications
surfaces:
  routes:
    - /dashboard/email
    - /dashboard/notifications
  frontend:
    - public/dashboard/js/view-email.jsx
  backend:
    - src/api/email_api.js
    - src/api/gmail_api.js
    - src/api/gmail_scope.js
    - src/api/payments_email.js
  d1_tables:
    - inbound_emails
    - email_folders
    - email_drafts
    - email_campaigns
    - dashboard_notifications
    - social_provider_connections
  bindings:
    - DB
related_docs:
  - docs/gmail-setup.md
  - docs/features/foster-applications.md
---

## Summary

The email workspace is the dashboard mail hub: Resend inbound for `support@companionsofcaddo.org`, optional per-user Gmail sync, drafts, outbound send, campaigns list, and dashboard notifications. Legacy `/dashboard/notifications` redirects to `/dashboard/email?view=notifications`.

## User goals

- Read inbound mail (donations, contact, foster applications).
- Reply or dismiss messages from the toolbar.
- Connect personal Gmail for send/sync (per-user scope).
- Compose drafts and send outbound email.
- View system notifications tied to dashboard events.

## Routes and navigation

| Route | View | Notes |
|---|---|---|
| `/dashboard/email` | `EmailWorkspaceView` | Primary |
| `/dashboard/notifications` | redirect → email | Legacy URL |

Sidebar: **Admin → Email**.

## Data model (canonical)

| Table | Role |
|---|---|
| `inbound_emails` | Resend/webhook captured messages |
| `email_folders` | Folder organization |
| `email_drafts` | Composed drafts |
| `email_campaigns` | Campaign records |
| `dashboard_notifications` | In-app notification rows |
| `social_provider_connections` | Gmail OAuth tokens (encrypted) |

## API contract

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/email/config` | Workspace config |
| `GET` | `/api/email/inbox` | Inbound list |
| `POST` | `/api/email/inbound` | Webhook ingest (Resend) |
| `GET` | `/api/email/folders` | List folders |
| `POST` | `/api/email/folders` | Create folder |
| `GET` | `/api/email/drafts` | List drafts |
| `POST` | `/api/email/drafts` | Save draft |
| `POST` | `/api/email/send` | Send outbound |
| `GET` | `/api/email/outbound` | Sent log |
| `POST` | `/api/email/sync-gmail` | Trigger Gmail sync |
| `GET` | `/api/email/templates` | Email templates |
| `GET` | `/api/email/campaigns` | Campaign list |
| `POST` | `/api/email/campaigns` | Create campaign |
| `GET` | `/api/email/notifications` | Dashboard notifications |

**Gmail OAuth:** `/api/integrations/google/*` and social OAuth callbacks — see `docs/gmail-setup.md`.

## Frontend behavior

- **File:** `view-email.jsx` — multi-pane inbox, Gmail connect, notifications sub-view via `?view=notifications`.
- Empty state copy references donations, contact forms, foster applications.

## Backend behavior

- Resend inbound webhook → `inbound_emails`.
- Gmail tokens isolated per user via `gmail_scope.js`.
- Outbound uses `RESEND_API_KEY` Worker secret; from address in wrangler vars.

## Operational commands

```bash
# Verify Resend webhook points to production Worker /api/email/inbound
wrangler secret list   # RESEND_API_KEY present
```

## Constraints and safety

- Gmail app must be in Google Cloud project `companions-of-cpas`; test users while in Testing mode.
- Per-user mailbox isolation — do not leak one user's Gmail to another session.
- Inbound webhook must be configured for production reliability (README handoff note).

## Known gaps

| Gap | Severity | Tracking |
|---|---|---|
| Resend inbound webhook hardening | medium | README infra backlog |
| `contact_requests` legacy table still written on one payments path | low | HANDOFF defer |

## Test checklist

- [ ] Inbound test email appears in inbox
- [ ] Gmail connect completes OAuth
- [ ] Send reply via `/api/email/send`
- [ ] Notifications view loads at `?view=notifications`

## Vectorization notes

**Synonyms:** inbox, email UI, mail dashboard, Gmail connect, Resend, support email, notifications, reply to applicant, email workspace.
