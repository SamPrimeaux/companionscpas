---
doc_type: feature
feature_id: auth-sessions
product: companionscpas
title: Authentication and Sessions
status: live
last_verified: 2026-06-19
tenant_id: tenant_companionscpas
tags:
  - auth
  - login
  - sessions
  - oauth
  - security
surfaces:
  routes:
    - /dashboard
    - /admin/login
  frontend:
    - public/dashboard/js/app.jsx
  backend:
    - src/api/auth_login.js
    - src/api/auth_google.js
    - src/api/session_api.js
    - src/api/password_reset.js
    - src/index.js
  d1_tables:
    - users
    - user_credentials
    - sessions
    - admin_users
    - password_reset_tokens
    - user_security_events
    - tenant_memberships
    - role_permissions
  bindings:
    - DB
related_docs:
  - docs/features/dashboard-shell.md
  - docs/HANDOFF.md
---

## Summary

Dashboard access is gated at the Cloudflare Worker: unauthenticated requests to `/dashboard/*` redirect to login. Sessions use HTTP-only cookies signed with `JWT_SECRET`. Password login still supports legacy `admin_users`; migration target is `users` + `user_credentials`. Google OAuth available for staff login.

## User goals

- Log in with email/password or Google.
- Stay signed in across dashboard navigation via session cookie.
- Log out securely.
- Reset password when forgotten (flow via `password_reset.js`).

## Entry points

| Path | Behavior |
|---|---|
| `/dashboard/*` | Session required; `app.jsx` reads user from bootstrap |
| `/admin/login` | Legacy admin login form |
| `/api/auth/login` | Password auth |
| `/api/auth/google/login` | Google OAuth start |
| `/api/auth/logout` | Clear session |

## Data model (canonical)

| Table | Role |
|---|---|
| `users` | Canonical dashboard users |
| `user_credentials` | Password hashes linked to users |
| `sessions` | Active session rows + cookie mapping |
| `tenant_memberships` | User ↔ org |
| `role_permissions` | RBAC |

**Legacy (still used):** `admin_users` for `/admin/login` — defer drop until migration complete (HANDOFF.md).

## API contract

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/auth/login` | Email/password |
| `POST` | `/api/auth/logout` | End session |
| `GET` | `/api/auth/google/login` | OAuth redirect |
| `GET` | `/api/auth/google/callback` | OAuth callback |
| Session | `session_api.js` | `getAuthUser`, cookie helpers |

Worker secrets: `JWT_SECRET`, `ADMIN_PASSWORD_HASH`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.

## Worker gate

`src/index.js` checks session before serving dashboard HTML and API routes (dashboard + CMS + email namespaces).

## Constraints and safety

- Never commit secrets; use `wrangler secret put`.
- `GOOGLE_REDIRECT_URI` in wrangler.toml is unused — URIs built from `url.origin`.
- Log security events to `user_security_events` where implemented.

## Known gaps

| Gap | Severity | Tracking |
|---|---|---|
| Full `admin_users` deprecation | low | HANDOFF defer |
| Settings UI for user/role admin | medium | README backlog |

## Test checklist

- [ ] Unauthenticated `/dashboard` redirects to login
- [ ] Login sets session; overview loads
- [ ] Logout clears access
- [ ] Google login completes on production domain

## Vectorization notes

**Synonyms:** login, sign in, session cookie, dashboard auth, Google OAuth, password reset, staff access, JWT.
