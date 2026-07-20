-- Store outbound HTML so Sent can show the real message (not metadata stubs).
ALTER TABLE email_logs ADD COLUMN body_html TEXT;
ALTER TABLE email_logs ADD COLUMN body_text TEXT;
ALTER TABLE email_logs ADD COLUMN preview_text TEXT;

-- Opaque resume-pay token for unpaid competition entries.
ALTER TABLE competition_entries ADD COLUMN resume_pay_token TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_competition_entries_resume_token
  ON competition_entries(resume_pay_token)
  WHERE resume_pay_token IS NOT NULL;
