-- One-time Companions D1 cutover. DO NOT apply before deploying the
-- v2-compatible readers/writers from the CMS integration PR.
-- Capture the current D1 Time Travel bookmark immediately before running.
-- Example: npx wrangler d1 time-travel info companionscpas
--
-- Preconditions (verify separately before executing):
--  * cms_components and cms_components_new exist; each has 10 rows.
--  * Only legacy id missing from _new is payment_stripe_donation_modal.
--  * All payment URLs and styles have been compared against the latest live rows.
--  * Public storefront and CMS renderers use the v2 status/action/style contract.
--  * cms_modals remains untouched (Forms Studio still depends on it).
--
-- Preserve the original Stripe donor CTA identifier, which is referenced by
-- donation page configuration. Keep historical release metadata, including
-- the rollback artifact/sha, inside a dedicated namespace rather than
-- discarding the legacy row during the swap.
UPDATE cms_components_new
   SET id = 'payment_stripe_donation_modal',
       config_json = json_set(
         config_json, '$.release',
         json((SELECT config_json FROM cms_components
               WHERE id = 'payment_stripe_donation_modal'))
       ),
       updated_at = datetime('now')
 WHERE id = 'payment_stripe'
   AND EXISTS (SELECT 1 FROM cms_components
               WHERE id = 'payment_stripe_donation_modal')
   AND NOT EXISTS (SELECT 1 FROM cms_components_new
                   WHERE id = 'payment_stripe_donation_modal');

-- Intentionally no .bak/_old runtime table: D1 Time Travel is the rollback
-- authority. Never run a blind DROP without verifying the bookmark first.
DROP TABLE cms_components;
ALTER TABLE cms_components_new RENAME TO cms_components;

-- The existing idx_cms_components_lookup index follows the SQLite rename.
-- Do not attempt to rebuild this indexed table after consumers go live.
