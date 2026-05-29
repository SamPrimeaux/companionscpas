-- ============================================================
-- Migration 004 — OAuth Control Plane Unification
-- Purpose:
-- Keep one OAuth/control-plane system while separating:
-- - login identity via oauth_accounts
-- - org/provider integrations via oauth_integrations
-- - encrypted tokens/secrets via secret_vault_items
-- ============================================================

ALTER TABLE oauth_integrations ADD COLUMN connection_scope TEXT DEFAULT 'org_integration';
ALTER TABLE oauth_integrations ADD COLUMN access_secret_id TEXT;
ALTER TABLE oauth_integrations ADD COLUMN refresh_secret_id TEXT;
ALTER TABLE oauth_integrations ADD COLUMN client_secret_id TEXT;
ALTER TABLE oauth_integrations ADD COLUMN webhook_secret_id TEXT;

UPDATE oauth_integrations
SET connection_scope = 'org_integration'
WHERE connection_scope IS NULL OR connection_scope = '';

UPDATE oauth_integrations
SET updated_at = datetime('now');
