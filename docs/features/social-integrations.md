---
doc_type: feature
feature_id: social-integrations
product: companionscpas
title: Social Integrations
status: mixed
last_verified: 2026-06-19
tenant_id: tenant_companionscpas
tags:
  - social
  - facebook
  - meta
  - youtube
  - embed
  - oauth
surfaces:
  routes:
    - /dashboard/settings
    - /community
  frontend:
    - public/dashboard/js/view-admin.jsx
  backend:
    - src/api/social.js
    - src/api/drive_api.js
    - src/api/gmail_api.js
  d1_tables:
    - social_provider_connections
    - social_embed_settings
    - social_post_drafts
    - social_post_drafts_v2
    - scheduled_posts
    - integration_oauth_states
  bindings:
    - DB
related_docs:
  - README.md
  - docs/features/cms-website-admin.md
---

## Summary

Social integrations span **Lane A** (live): Facebook page embed on `/community`, connection status, draft storage. **Lane B** (future, higher risk): Meta OAuth publishing to Facebook pages — stubs return **501** until Meta app review, client approval, CSRF persistence, and token encryption are complete. **Real publish must never silently succeed.**

## Lane A — Live today

| Capability | API | Notes |
|---|---|---|
| Connection status | `GET /api/social/status` | Whether credentials exist |
| Facebook embed config | `GET/POST /api/social/embed/facebook-page` | Community page embed |
| Drafts (legacy table) | `GET/POST /api/social/drafts` | `social_post_drafts` |
| YouTube OAuth | `/api/social/oauth/youtube/*` | Start/callback |

Public `/community` reads embed settings from D1.

## Lane B — Future (not active)

| Endpoint | Current behavior |
|---|---|
| `GET /api/social/oauth/meta/start` | Starts OAuth when `META_APP_ID` exists |
| `GET /api/social/oauth/meta/callback` | Stubbed — needs secret, CSRF, encryption |
| `POST /api/social/facebook/page-posts` | **501** until page token + real Graph API |

Requirements: Meta Developer App, app review, Facebook Login for Business, explicit client approval.

Plaintext var: `META_REDIRECT_URI` in wrangler.toml.

## Data model

| Table | Role |
|---|---|
| `social_provider_connections` | OAuth tokens (AES-GCM) — Drive, Gmail, future Meta |
| `social_embed_settings` | Page embed plugin config |
| `social_post_drafts_v2` | Lane B draft SSOT (future) |
| `social_post_drafts` | Legacy drafts — still used by `social.js` |
| `integration_oauth_states` | CSRF for OAuth flows |

## Constraints and safety

- Lane B blocked until client sign-off documented in README.
- `POST /api/social/facebook/page-posts` must not fake success.
- Encrypt page tokens before storing; never expose in API responses.

## Known gaps

| Gap | Severity | Tracking |
|---|---|---|
| Meta callback stub | expected | Lane B sprint |
| Migrate drafts to `social_post_drafts_v2` | low | HANDOFF defer |
| Settings integrations UI shell | medium | README backlog |

## Test checklist

- [ ] `GET /api/social/status` returns expected shape
- [ ] Community page embed renders when configured
- [ ] `POST /api/social/facebook/page-posts` returns 501 (not 200 fake)

## Vectorization notes

**Synonyms:** Facebook publish, Meta OAuth, social posting, page embed, Lane B, Instagram, YouTube connect, social media dashboard.
