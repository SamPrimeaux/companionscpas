-- Remove board-demo foster application workflow data so /dashboard/applications
-- starts empty and reflects real public form submissions only.
-- Safe to re-run: targets known demo IDs and @example.com addresses.

PRAGMA foreign_keys = OFF;

DELETE FROM cpas_application_email_logs
WHERE application_id IN ('cpas_app_001','cpas_app_002','cpas_app_003','cpas_app_004');

DELETE FROM cpas_application_events
WHERE application_id IN ('cpas_app_001','cpas_app_002','cpas_app_003','cpas_app_004');

DELETE FROM foster_records
WHERE id IN (
  'foster_blue_001',
  'foster_joy_002',
  'foster_patches_003',
  'foster_mischief_004',
  'foster_chance_005'
)
OR foster_email LIKE '%@example.com';

DELETE FROM cpas_foster_applications
WHERE id IN ('cpas_app_001','cpas_app_002','cpas_app_003','cpas_app_004')
   OR email LIKE '%@example.com';

DELETE FROM applications
WHERE id IN ('app_compat_001','app_compat_002','app_compat_003','app_compat_004')
   OR applicant_email LIKE '%@example.com';

DELETE FROM dashboard_calendar_events
WHERE id IN ('cal_homevisit_001','cal_vet_001','cal_transport_001');

PRAGMA foreign_keys = ON;
