-- Settings remaster: org phone + notification preference JSON
ALTER TABLE organizations ADD COLUMN phone TEXT;
ALTER TABLE organizations ADD COLUMN notification_prefs_json TEXT DEFAULT '{}';

UPDATE organizations
SET notification_prefs_json = '{"new_application":true,"application_status_changed":true,"new_donation":true,"medical_overdue":true,"daily_care_incomplete":false,"new_intake":true,"campaign_goal_reached":true,"weekly_digest":false}',
    updated_at = datetime('now')
WHERE id = 'org_companionscpas'
  AND (notification_prefs_json IS NULL OR notification_prefs_json = '' OR notification_prefs_json = '{}');
