-- Soft-delete for CMS page sections (3-day trash; Undo restores from D1 within 30s).
-- R2 archive copies live under cms/section-trash/ and expire via bucket lifecycle.

ALTER TABLE cms_page_sections ADD COLUMN deleted_at TEXT;

CREATE INDEX IF NOT EXISTS idx_cms_page_sections_deleted
  ON cms_page_sections (tenant_id, deleted_at);
