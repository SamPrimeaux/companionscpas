# Companions CMS components — v2 cutover runbook

Target D1: **companionscpas** (`fd6dd6fb-156b-4b6a-8ff0-505422652391`).
**Do not run against inneranimalmedia-business** (`cf87b717-d4e2-4cf8-bab0-a81268e32d49`).

## Preflight (no writes)

1. Review, merge, and **deploy** the v2-compatible Worker changes in PR #21.
   The D1 migration is **not** an ordinary incremental migration to apply before the code deploy.
2. Confirm the donation options, social links, and Candid badge still render from the
   current production table. Confirm CMS section edits and footer badge edits are usable.
3. Stop content publishing briefly during cutover; avoid racing edits to either table.
4. Confirm old/new table counts are 10/10 and no row has changed since the audited
   state. The SQL file includes a fail-closed preflight guard.
5. Record a **current D1 Time Travel bookmark** immediately before changing data:

```bash
npx wrangler d1 time-travel info companionscpas
```

Cloudflare Time Travel covers the **entire** D1 database. A restore may
discard transactions that occurred after the bookmark. Arrange a quiet window.

## Execute only after Worker compatibility is deployed

From the checked-out repo with the migration file:

```bash
npx wrangler d1 execute companionscpas --remote --file=db/migrations/20261028_cms_components_v2_cutover.sql
```

This file:
- Aborts before destructive work if counts, existing component IDs, statuses,
  URLs, or update times no longer match the audited set.
- Moves the staged Stripe button onto the original
  `payment_stripe_donation_modal` ID, preserving its old release metadata
  in `config_json.release`.
- Drops the legacy `cms_components` table and renames
  `cms_components_new` to `cms_components`. The lookup index follows.
- Does **not** drop `cms_modals`, change the Form Studio records, or rewrite
  the published `cms_globals` checkout.

Run the SQL file as a **single controlled maintenance operation**. If the
preflight fails, do not run the individual DROP/ALTER statements manually.

## Validate after cutover

```bash
npx wrangler d1 execute companionscpas --remote --command="PRAGMA table_info(cms_components)"
npx wrangler d1 execute companionscpas --remote --command="SELECT type, provider, status, COUNT(*) AS n FROM cms_components GROUP BY type, provider, status"
npx wrangler d1 execute companionscpas --remote --command="SELECT id, action_type, action_value, logo_asset_key, json_extract(config_json, '$.release.active_version') AS prior_release FROM cms_components WHERE id='payment_stripe_donation_modal'"
npx wrangler d1 execute companionscpas --remote --command="SELECT COUNT(*) AS legacy_staging_tables FROM sqlite_master WHERE type='table' AND name='cms_components_new'"
```

Expected: 10 component rows, one active Stripe button with the original ID,
0 staging tables, action/style/status columns present, index bound to
`cms_components`.

Smoke test:
- Zeffy, PayPal, Venmo, Stripe and Amazon wishlist links/buttons.
- Home/footer Facebook and Instagram links, trust badge.
- Donation method save/reload to verify `action_value` and `style_json` actually
  persist (not just legacy `config_json`).
- Footer badge save/reload to verify `action_value`, `placement`, `status`.
- Site publishing and the separate Form Studio modals.
- Check production Worker logs for missing-column and render errors.

## Rollback

Use the recorded Time Travel bookmark only if necessary, recognizing that it
reverts **all D1 writes** since that bookmark, not only CMS components:

```bash
npx wrangler d1 time-travel restore companionscpas --bookmark=<RECORDED_BOOKMARK>
```

If the Worker has already been switched to the v2 schema, the compatibility
reader/writer remains dual-shape, so it can tolerate the old component table
during rollback. Coordinate site cache invalidation/republish afterward.
