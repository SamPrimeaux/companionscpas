-- One-time Companions D1 cutover. DO NOT apply before deploying the
-- v2-compatible readers/writers from the CMS integration PR.
-- Capture the D1 Time Travel bookmark immediately before running.
-- npx wrangler d1 time-travel info companionscpas
--
-- This migration is intentionally destructive but scoped to cms_components.
-- cms_modals stays in place; the live Form Studio still uses it.
-- Stop if the exact audited 10-row cohort has changed.
SELECT CASE WHEN
  (SELECT COUNT(*) FROM cms_components) = 10
  AND (SELECT COUNT(*) FROM cms_components_new) = 10
  AND (SELECT COUNT(*) FROM cms_components WHERE id = 'payment_stripe_donation_modal') = 1
  AND (SELECT COUNT(*) FROM cms_components_new WHERE id = 'payment_stripe') = 1
  AND (SELECT COUNT(*) FROM cms_components_new WHERE id = 'payment_stripe_donation_modal') = 0
  AND (SELECT COUNT(*) FROM cms_components c LEFT JOIN cms_components_new n ON c.id = n.id
       WHERE n.id IS NULL AND c.id <> 'payment_stripe_donation_modal') = 0
  AND (SELECT COUNT(*) FROM cms_components c JOIN cms_components_new n ON c.id = n.id
       WHERE c.updated_at > n.updated_at
          OR (c.active = 1 AND n.status <> 'active')
          OR (c.active = 0 AND n.status = 'active')
          OR (json_extract(c.config_json, '$.url') IS NOT NULL
              AND json_extract(c.config_json, '$.url') <> n.action_value)
  ) = 0
  THEN 1 ELSE json_extract('CUTOVER_ABORTED_reaudit_live_data', '$')
  END AS preflight_ok;

-- Keep the Stripe component ID already referenced by donation page content.
-- Historical release artifact, rollback URL and SHA stay in config.release.
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

-- D1 Time Travel is the rollback authority; do not leave duplicate legacy
-- runtime tables. Execute this during a quiet publishing window.
DROP TABLE cms_components;
ALTER TABLE cms_components_new RENAME TO cms_components;

-- SQLite automatically reattaches idx_cms_components_lookup to renamed table.
