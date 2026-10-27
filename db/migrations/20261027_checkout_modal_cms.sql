-- Add registration receipts, using the existing cms_modals table as configuration SSOT.
-- The new event checkout is intentionally inactive until tested/published.
CREATE TABLE IF NOT EXISTS event_registrations (
 id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL DEFAULT 'tenant_companionscpas',
 campaign_id TEXT,modal_key TEXT,stripe_payment_intent_id TEXT NOT NULL UNIQUE,
 donation_id TEXT,donation_intent_id TEXT,attendee_name TEXT,attendee_email TEXT,
 attendee_phone TEXT,lines_json TEXT NOT NULL DEFAULT '[]',
 participant_count INTEGER NOT NULL DEFAULT 0,total_cents INTEGER NOT NULL DEFAULT 0,
 fields_json TEXT NOT NULL DEFAULT '{}',checked_in_at TEXT,notes TEXT,
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_event_registrations_campaign ON event_registrations(tenant_id,campaign_id,created_at DESC);

INSERT OR IGNORE INTO cms_modals(id,tenant_id,modal_key,title,subtitle,is_active,config_json)
VALUES('modal_freedom_ride_checkout','tenant_companionscpas','freedom_ride_checkout','Freedom Ride Registration','Driver and passenger admissions',0,'{"checkout_kind":"registration","mode":"items","campaign_id":"campaign_freedom-ride-poker-run_1792800874305","title":"Freedom Ride Registration","subtitle":"Register a driver and optionally one passenger.","eyebrow":"Companions of CPAS","items_title":"Admission","details_title":"Participant details","submit_label":"Register • {total}","success_title":"Registration received","success_message":"Thank you for registering. Keep your receipt for check-in.","note_prefix":"Freedom Ride registration","cover_fees":{"enabled":true,"default":false},"theme":{"accent":"#7c3aed","radius":14,"compact":false},"items":[{"key":"driver","label":"Driver","price_cents":2000,"min":1,"max":1,"default_qty":1},{"key":"passenger","label":"Additional passenger","price_cents":1000,"min":0,"max":1,"default_qty":0}],"fields":[{"key":"name","label":"Driver name","type":"text","required":true,"placeholder":"First and last name"},{"key":"passenger_name","label":"Passenger name","type":"text","required":false,"placeholder":"Required when adding a passenger"},{"key":"phone","label":"Phone","type":"tel","required":false,"placeholder":"Day-of contact (optional)"}]}');
