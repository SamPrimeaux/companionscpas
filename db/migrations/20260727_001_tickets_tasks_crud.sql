-- Collaborate Tasks uses agentsam_tickets as its only task spine.
ALTER TABLE agentsam_tickets ADD COLUMN due_at INTEGER;

CREATE INDEX IF NOT EXISTS idx_agentsam_tickets_status_priority
  ON agentsam_tickets(status, priority);
CREATE INDEX IF NOT EXISTS idx_agentsam_tickets_project
  ON agentsam_tickets(project);
CREATE INDEX IF NOT EXISTS idx_agentsam_tickets_updated_at
  ON agentsam_tickets(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_agentsam_ticket_events_ticket_created
  ON agentsam_ticket_events(ticket_id, created_at DESC);
