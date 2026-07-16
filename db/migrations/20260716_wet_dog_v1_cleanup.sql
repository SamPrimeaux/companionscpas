-- Drop invented outbox table. Admin alerts use dashboard_notifications + email_logs.
DROP TABLE IF EXISTS competition_entry_events;

-- admin_notification_status may still exist as an unused leftover column from an earlier
-- apply; SQLite cannot cheaply DROP COLUMN here. Application code must never read/write it.
