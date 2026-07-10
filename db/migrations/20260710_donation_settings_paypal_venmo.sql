-- Migration: add PayPal and Venmo hosted button URLs to donation_settings
-- Date: 2026-07-10
-- Adds two optional columns for alternate payment methods displayed on the /donate page.

ALTER TABLE donation_settings ADD COLUMN paypal_donate_url TEXT;
ALTER TABLE donation_settings ADD COLUMN venmo_donate_url TEXT;

UPDATE donation_settings
SET
  paypal_donate_url = 'https://www.paypal.com/donate/?hosted_button_id=5ZT6KX23KPP6U',
  venmo_donate_url  = 'https://account.venmo.com/u/companionscpas',
  updated_at        = datetime('now')
WHERE id = 'dsettings_companionscpas';
