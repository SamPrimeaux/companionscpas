-- Per-row restore history on soft-deleted sections (no event table).
-- Soft-delete leaves these alone; Undo increments restore_count and stamps last_restored_at.

ALTER TABLE cms_page_sections ADD COLUMN restore_count INTEGER DEFAULT 0;
ALTER TABLE cms_page_sections ADD COLUMN last_restored_at TEXT;
