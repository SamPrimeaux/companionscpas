-- Prevent duplicate Stripe payment_intent rows in donations
CREATE UNIQUE INDEX IF NOT EXISTS idx_donations_pi_id
  ON donations(stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;
