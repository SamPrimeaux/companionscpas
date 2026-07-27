-- Swarm A: extend the existing CPAS dashboard calendar for unix-range CRUD.
-- Apply once to the companionscpas D1 database.

ALTER TABLE dashboard_calendar_events ADD COLUMN starts_at_unix INTEGER;
ALTER TABLE dashboard_calendar_events ADD COLUMN ends_at_unix INTEGER;
ALTER TABLE dashboard_calendar_events ADD COLUMN all_day INTEGER NOT NULL DEFAULT 0;
ALTER TABLE dashboard_calendar_events ADD COLUMN location TEXT;
ALTER TABLE dashboard_calendar_events ADD COLUMN attendees_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE dashboard_calendar_events ADD COLUMN created_by TEXT;
ALTER TABLE dashboard_calendar_events ADD COLUMN updated_at INTEGER;
ALTER TABLE dashboard_calendar_events ADD COLUMN source TEXT NOT NULL DEFAULT 'local';
ALTER TABLE dashboard_calendar_events ADD COLUMN external_event_id TEXT;
ALTER TABLE dashboard_calendar_events ADD COLUMN metadata_json TEXT NOT NULL DEFAULT '{}';

UPDATE dashboard_calendar_events
SET starts_at_unix = CAST(strftime('%s', starts_at) AS INTEGER),
    ends_at_unix = CASE
      WHEN ends_at IS NULL OR CAST(strftime('%s', ends_at) AS INTEGER) <= CAST(strftime('%s', starts_at) AS INTEGER)
      THEN CAST(strftime('%s', starts_at) AS INTEGER)
        + CASE WHEN length(trim(COALESCE(starts_at, ''))) <= 10 THEN 86400 ELSE 3600 END
      ELSE CAST(strftime('%s', ends_at) AS INTEGER)
    END,
    all_day = CASE WHEN length(trim(COALESCE(starts_at, ''))) <= 10 THEN 1 ELSE all_day END,
    updated_at = COALESCE(updated_at, CAST(strftime('%s', COALESCE(created_at, 'now')) AS INTEGER))
WHERE starts_at_unix IS NULL;

CREATE INDEX IF NOT EXISTS idx_dashboard_calendar_events_tenant_range
  ON dashboard_calendar_events(tenant_id, starts_at_unix, ends_at_unix);
CREATE INDEX IF NOT EXISTS idx_dashboard_calendar_events_updated
  ON dashboard_calendar_events(tenant_id, updated_at);
