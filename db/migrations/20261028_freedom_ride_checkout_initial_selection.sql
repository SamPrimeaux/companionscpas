-- Customer preset data only. Reusable checkout runtime remains generic.
-- Run AFTER the checkout initial-selection / auto-prepare Worker and JS deploy.
-- BEFORE running: capture the companionscpas D1 Time Travel bookmark.
--
-- This seeds the existing published Freedom Ride checkout (cms_globals)
-- with the Driver ticket as an OPTIONAL initial selection. A customer may
-- decrement Driver to zero and choose any lower-priced available ticket.
-- No ticket price, per-item minimum, fundraising record, or payment status
-- is changed. Auto prepare creates only an unpaid PaymentIntent.
--
-- Stop if the published checkout or event tickets drift from the audited
-- state. Re-audit and update intentionally, never bypass the guard.
SELECT CASE WHEN (
  SELECT COUNT(*) FROM cms_globals
  WHERE account_id = 'tenant_companionscpas'
    AND global_type = 'checkout_modal'
    AND global_key = 'freedom_ride_checkout'
    AND status = 'published'
    AND content_version = 4
    AND json_extract(inline_content_json,'$.items_source')='campaign_event_tickets'
    AND json_extract(inline_content_json,'$.initial_item_key') IS NULL
    AND instr(json_extract(inline_content_json,'$.selected_item_keys'),'driver') > 0
) = 1 AND (
  SELECT COUNT(*) FROM fundraising_campaigns
  WHERE id = 'campaign_freedom-ride-poker-run_1792800874305'
    AND json_extract(config_json,'$.event.tickets[0].key') = 'driver'
    AND json_extract(config_json,'$.event.tickets[0].price_cents') = 2000
    AND json_extract(config_json,'$.event.tickets[0].min') = 0
) = 1 THEN 1 ELSE json_extract('checkout_seed_preflight_failed','$') END AS preflight_ok;

UPDATE cms_globals
   SET inline_content_json = json_set(inline_content_json,
         '$.initial_item_key','driver',
         '$.auto_prepare_payment',json('true')),
       content_version = content_version + 1,
       updated_at = datetime('now')
 WHERE account_id = 'tenant_companionscpas'
   AND global_type = 'checkout_modal'
   AND global_key = 'freedom_ride_checkout'
   AND status = 'published'
   AND content_version = 4
   AND json_extract(inline_content_json,'$.initial_item_key') IS NULL;

SELECT global_key, status, content_version,
       json_extract(inline_content_json,'$.initial_item_key') AS initial_item_key,
       json_extract(inline_content_json,'$.auto_prepare_payment') AS auto_prepare_payment
FROM cms_globals WHERE account_id='tenant_companionscpas'
 AND global_key='freedom_ride_checkout';
