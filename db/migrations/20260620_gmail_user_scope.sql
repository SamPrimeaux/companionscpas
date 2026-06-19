-- Scope Gmail OAuth connections per dashboard user; purge leaked personal inbox
ALTER TABLE social_provider_connections ADD COLUMN connected_by_user_id TEXT;

CREATE INDEX IF NOT EXISTS idx_social_connections_gmail_user
  ON social_provider_connections(tenant_id, provider, connected_by_user_id);

-- Disconnect all tenant-wide Gmail tokens (legacy unscoped connections)
UPDATE social_provider_connections
SET status = 'disconnected',
    access_token_cipher = NULL,
    refresh_token_cipher = NULL,
    token_ciphertext = NULL,
    error_message = 'Disconnected: Gmail must be connected per user with an org account',
    updated_at = datetime('now')
WHERE tenant_id = 'tenant_companionscpas'
  AND provider = 'google_gmail';

-- Remove personal inbox rows synced into CPAS D1
DELETE FROM inbound_emails WHERE lower(mailbox) = 'meauxbility@gmail.com';
