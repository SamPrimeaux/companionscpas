---
doc_type: feature
feature_id: donations-fundraising
product: companionscpas
title: Donations and Fundraising
status: live
last_verified: 2026-06-19
tenant_id: tenant_companionscpas
tags:
  - donations
  - stripe
  - fundraising
  - campaigns
surfaces:
  routes:
    - /dashboard/donations
    - /dashboard/fundraising
    - /dashboard/fundraising/:id
  frontend:
    - public/dashboard/js/view-finance.jsx
    - public/dashboard/js/view-campaign.jsx
  backend:
    - src/api/dashboard_api.js
    - src/api/payments_email.js
    - src/api/donation_api.js
    - src/api/donation_fees.js
  d1_tables:
    - donations
    - donors
    - donation_payments
    - donation_intents
    - donation_settings
    - fundraising_campaigns
    - stripe_webhooks
  bindings:
    - DB
related_docs:
  - docs/donate-readme.md
  - docs/features/public-publish-pipeline.md
---

## Summary

Donations and fundraising cover Stripe checkout on the public `/donate` page (test mode), dashboard donation ledger, and campaign workspace for `fundraising_campaigns`. Demo table `fundraising_campaigns_demo` is not used by production UI.

## User goals

- View donations and donors in the dashboard.
- Record or reconcile donation activity (Stripe test).
- Create and edit fundraising campaigns.
- Open campaign workspace for updates and transport/donate hero content.
- (Future) switch to live Stripe keys after client sign-off.

## Routes and navigation

| Route | View | Status |
|---|---|---|
| `/dashboard/donations` | `DonationsView` | Live (test mode) |
| `/dashboard/fundraising` | `FundraisingView` | Live |
| `/dashboard/fundraising/:id` | `CampaignWorkspaceView` | Live |

Public: `/donate` — Stripe Payment Element via `donate-modal.js` / `payments_email.js`.

## Data model (canonical)

| Table | Role |
|---|---|
| `donations` | Donation records |
| `donors` | Donor profiles |
| `donation_payments` | Stripe payment linkage |
| `donation_intents` | Pre-payment intents |
| `donation_settings` | Stripe/config |
| `fundraising_campaigns` | Campaign SSOT |
| `stripe_webhooks` | Webhook audit log |

## API contract

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/dashboard/donations` | List donations |
| `POST` | `/api/dashboard/donations` | Manual entry |
| `GET/POST/PUT` | `/api/dashboard/fundraising` | Campaign CRUD |
| Stripe | `/api/payments/*` | Config, intent, webhook (`payments_email.js`) |

Worker secrets: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.

## Frontend behavior

- `view-finance.jsx`: donations table, fundraising list.
- `view-campaign.jsx`: single campaign editor workspace.
- Public donate modal: cover-fees math via `donation_fees.js`.

## Backend behavior

- Webhook verifies signature, writes `donation_payments` / `donations`.
- Receipt email via Resend when configured.
- Donate page CMS sections in D1; publish via fragment pipeline.

## Constraints and safety

- Test mode until client provides live Stripe keys.
- Never log full card data; Stripe handles PCI.
- Webhook endpoint must match Stripe dashboard configuration.

## Known gaps

| Gap | Severity | Tracking |
|---|---|---|
| Live Stripe keys | medium | README handoff backlog |
| `contact_requests` legacy insert on one path | low | HANDOFF.md |

## Test checklist

- [ ] Test donation on `/donate` completes in Stripe test mode
- [ ] Donation appears in dashboard
- [ ] Create campaign, open workspace
- [ ] Reports Financial tab shows data

## Vectorization notes

**Synonyms:** Stripe donations, donate page, fundraising campaigns, donor management, payment webhook, campaign workspace, transport fund.
