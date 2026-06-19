# Donate Page — How It Works

Live URL: [https://companionsofcaddo.org/donate](https://companionsofcaddo.org/donate)

The `/donate` route uses the **generic sectionalized CMS pipeline** (same as `/services`, `/adopt`, `/community`). Content is edited in D1, rendered into R2 fragments, assembled by the Worker, and cached in KV.

---

## Section files (in order)

| # | D1 `section_key` | `section_type` | R2 key | Role |
|---|------------------|----------------|--------|------|
| 1 | `donate_hero` | `campaign_transport_hero` | `static/pages/donate/donate_hero.html` | Freedom Fest transport campaign hero (D1-driven VIP dogs) |
| 2 | `donate_intro` | `fundraising` | `static/pages/donate/donate_intro.html` | Cream intro / mission copy |
| 3 | `donate_tiers` | `feature_cards` | `static/pages/donate/donate_tiers.html` | “What your gift does” ($25–$250) |
| 4 | `donate_cta` | `cta_banner` | `static/pages/donate/donate_cta.html` | Bottom “Ready to help?” banner |

**Note:** `donate_hero` is a **dynamic section** — at page assembly time the Worker re-renders from D1 (campaign + `animal_profiles`) instead of serving a stale R2 snapshot. R2 still gets a snapshot on CMS publish for backup/preview tooling.

Local legacy monolith (not primary live source): [`public/static/pages/donate/index.html`](../public/static/pages/donate/index.html).

---

## Pipeline

```
Dashboard CMS → D1 cms_page_sections + cms_page_content_blocks
  → render_section.js OR render_campaign_transport_hero.js (dynamic)
  → R2 static/pages/donate/{section_key}.html
  → assembleGenericPageFromFragments() in render_generic_fragments.js
  → header (cpas-header.html) + sections + footer
  → KV cache page:/donate
```

| File | Role |
|------|------|
| [`src/api/generic_page_cms_sync.js`](../src/api/generic_page_cms_sync.js) | Donate module: sync sections → R2, publish |
| [`src/api/render_generic_fragments.js`](../src/api/render_generic_fragments.js) | Stitch fragments + shell; dynamic hero override |
| [`src/api/render_section.js`](../src/api/render_section.js) | Generic section types (`fundraising`, `feature_cards`, `cta_banner`, …) |
| [`src/api/render_campaign_transport_hero.js`](../src/api/render_campaign_transport_hero.js) | Freedom Fest / transport-ticket hero (async, D1-backed) |
| [`src/api/page_cms_registry.js`](../src/api/page_cms_registry.js) | Maps `/donate` → `donate` CMS module |

**Editor:** `/dashboard/cms/pages/donate`

**Publish (logged in):**

```javascript
fetch('/api/cms/publish', {
  method: 'POST',
  credentials: 'include',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ route_path: '/donate', force: true })
}).then(r => r.json()).then(console.log)
```

**CLI sync (static sections only; hero re-renders live on next request after KV bust):**

```bash
node scripts/sync-page-fragments.mjs /donate
npx wrangler kv key delete "page:/donate" \
  --namespace-id 0b410337a8494fc982ea04c5bde1eab4 --remote
```

---

## Freedom Fest hero (`donate_hero`)

### Campaign row

| Field | Value |
|-------|-------|
| `fundraising_campaigns.id` | `camp_freedom_fest_2026` |
| `slug` | `freedom-fest-2026` |
| `campaign_type` | `transport` |
| Ticket price | **$175** — passed as `amount_cents: 17500` (no new Stripe Price product) |

### VIP passengers (Option A — `animal_profiles`)

Campaign dogs are linked directly on `animal_profiles` (no join table):

| Column | Purpose |
|--------|---------|
| `campaign_id` | FK → `fundraising_campaigns.id` |
| `campaign_role` | e.g. `passenger`, `vip_guest` |
| `campaign_sort_order` | Card order in hero |
| `campaign_ticket_goal` | Optional per-dog ticket target |
| `campaign_tickets_sponsored` | Counter (manual or future automation) |
| `campaign_status_note` | Optional status line on card |

Query VIP dogs:

```sql
SELECT * FROM animal_profiles
WHERE campaign_id = 'camp_freedom_fest_2026'
ORDER BY campaign_sort_order;
```

### Section `config_json` (on `donate_hero`)

```json
{
  "campaign_id": "camp_freedom_fest_2026",
  "ticket_amount_cents": 17500,
  "ribbon_text": "RED, WHITE & RESCUED",
  "tagline": "Celebrate Freedom. Change a Life.",
  "price_label": "$175 PER PASSENGER"
}
```

### CTA behavior

Single centered button: **Sponsor a Ticket**

```html
<button type="button" data-action="donate"
  data-amount="175"
  data-campaign-id="camp_freedom_fest_2026"
  data-ticket-mode="1">…</button>
```

Opens [`public/static/js/donate-modal.js`](../public/static/js/donate-modal.js) — **always the same standard modal** (tiers + custom amount). Hero passes `data-amount="175"` and `data-campaign-id` to pre-fill custom amount; no alternate modal UI.

Header nav **Donate** still links to `/donate` (full page). In-page CTAs use `data-action="donate"` for the modal.

---

## Stripe / donations

| Endpoint | Purpose |
|----------|---------|
| `GET /api/donations/config` | Publishable key + test mode flag |
| `GET /api/donations/tiers` | D1 tier cards (modal default amounts) |
| `POST /api/donations/intent` | PaymentIntent (`amount_cents`, optional `campaign_id`) |
| `POST /api/donations/after-payment` | Post-confirm bookkeeping |
| Webhooks | `payment_intent.succeeded`, `checkout.session.completed` → `payments_email.js` |

Implementation: [`src/api/payments_email.js`](../src/api/payments_email.js)

---

## Blocks

| Section | Blocks |
|---------|--------|
| `donate_tiers` | 4 D1 blocks ($25, $50, $100, $250 impact cards) |
| Other sections | Section-level fields only |

---

## Seed / migration

Freedom Fest bootstrap SQL: [`db/migrations/20260618_freedom_fest_donate_hero.sql`](../db/migrations/20260618_freedom_fest_donate_hero.sql)

Applies campaign row, links 3 VIP animals, updates `donate_hero` section fields.

---

## Related docs

- [README — Sectionalized CMS System](../README.md#sectionalized-cms-system)
- [Homepage](homepage-readme.md) · [About](about-readme.md)
- Agent context SQL: `db/agent_context/companionscpas_fragment_cms_context.sql`
