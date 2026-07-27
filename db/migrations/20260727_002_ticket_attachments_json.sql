-- Collaborate Tasks: link existing CMS/R2 assets on tickets (no second blob store).
ALTER TABLE agentsam_tickets ADD COLUMN attachments_json TEXT NOT NULL DEFAULT '[]';
