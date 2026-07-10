-- Fix camp_kita_amputation: goal_amount_cents was 0 (ON CONFLICT block in donate_v2 seed omitted it).
-- raised_amount_cents set to $325 — includes PayPal/Venmo donations not in Stripe donations table.
-- Run: npx wrangler d1 execute companionscpas --remote \
--        --file=db/migrations/20260710_kita_amounts_fix.sql

UPDATE fundraising_campaigns
SET
  goal_amount_cents   = 60000,
  raised_amount_cents = 32500,
  updated_at          = datetime('now')
WHERE id = 'camp_kita_amputation';
