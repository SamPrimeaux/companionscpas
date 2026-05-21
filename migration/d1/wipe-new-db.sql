PRAGMA defer_foreign_keys=TRUE;

DROP TABLE IF EXISTS "sessions";
DROP TABLE IF EXISTS "oauth_accounts";
DROP TABLE IF EXISTS "role_permissions";
DROP TABLE IF EXISTS "tenant_memberships";
DROP TABLE IF EXISTS "user_credentials";
DROP TABLE IF EXISTS "social_connections";
DROP TABLE IF EXISTS "social_post_drafts";
DROP TABLE IF EXISTS "social_publish_jobs";
DROP TABLE IF EXISTS "donation_checkout_sessions";
DROP TABLE IF EXISTS "donations";
DROP TABLE IF EXISTS "applications";
DROP TABLE IF EXISTS "animals";
DROP TABLE IF EXISTS "contact_requests";
DROP TABLE IF EXISTS "email_logs";
DROP TABLE IF EXISTS "newsletter_subscribers";
DROP TABLE IF EXISTS "audit_log";
DROP TABLE IF EXISTS "admin_users";
DROP TABLE IF EXISTS "tenants";
DROP TABLE IF EXISTS "users";

PRAGMA defer_foreign_keys=FALSE;
