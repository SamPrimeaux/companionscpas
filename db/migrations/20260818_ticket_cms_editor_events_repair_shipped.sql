-- Close the Events CMS product ticket after surgical editor/render/CSS ship.
-- Modularize of cms_api / view-cms / cpas-shell was blocked on this ticket.

UPDATE agentsam_tickets
SET
  status = 'shipped',
  status_reason = 'Shipped: D1 catalog bootstrap, section drag/↑↓ persist, crop presets, 1-card Upcoming grid, card CRUD. Editor file split remains on modularize tickets.',
  closed_at = strftime('%s','now'),
  updated_at = strftime('%s','now')
WHERE id = 'tkt_cpas_cms_editor_events_repair_20260818';

INSERT INTO agentsam_ticket_events (
  id, ticket_id, event_type, from_status, to_status, detail,
  commit_sha, actor_type, actor_id, created_at
) VALUES (
  'tktevt_cpas_cms_editor_events_repair_shipped',
  'tkt_cpas_cms_editor_events_repair_20260818',
  'status',
  'active',
  'shipped',
  'Events CMS editor repair live. Staff can reorder sections, pick crop ratios, and run Upcoming as one card. Publish Live still writes public KV/R2.',
  NULL,
  'agent',
  'cursor',
  strftime('%s','now')
);

UPDATE agentsam_tickets
SET
  status = 'backlog',
  blocked_by = NULL,
  status_reason = 'Unblocked: Events product ticket shipped. PR-only modularize; do not self-merge or deploy.',
  updated_at = strftime('%s','now')
WHERE id IN (
  'tkt_cpas_mod_cms_api_20260818',
  'tkt_cpas_mod_view_cms_20260818',
  'tkt_cpas_mod_cpas_shell_css_20260818'
)
AND status = 'blocked';
