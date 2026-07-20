-- Generic form submissions for Forms Studio (non-foster / non-contact).
CREATE TABLE IF NOT EXISTS cpas_form_submissions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  form_id TEXT NOT NULL,
  form_key TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  source TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cpas_form_submissions_form
  ON cpas_form_submissions (tenant_id, form_key, created_at DESC);
