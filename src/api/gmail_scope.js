const TENANT_ID = "tenant_companionscpas";

/** Mailboxes appropriate for the CPAS org dashboard Gmail sync. */
export function isTenantOrgMailbox(email) {
  const e = String(email || "").toLowerCase().trim();
  if (!e) return false;
  if (e.endsWith("@companionsofcaddo.org")) return true;
  if (e === "companionscpas@gmail.com") return true;
  return false;
}

export function gmailWarningsForAccounts(accounts = []) {
  const warnings = [];
  for (const acct of accounts) {
    const email = acct.email || acct.provider_account_email;
    if (email && !isTenantOrgMailbox(email)) {
      warnings.push({
        email,
        code: "personal_gmail",
        message: `Personal Gmail detected — this inbox is connected to ${email}. Disconnect and reconnect with your org account to avoid sharing personal email.`,
      });
    }
  }
  return warnings;
}

export function normalizeMailboxList(env) {
  const raw = env.EMAIL_INBOX_MAILBOXES || "support@companionsofcaddo.org";
  return String(raw)
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export async function listUserGmailConnections(env, userId) {
  if (!userId) return [];
  const rows = await env.DB.prepare(
    `SELECT id, status, provider_account_email, provider_account_name,
            last_connected_at, connected_by_user_id
     FROM social_provider_connections
     WHERE tenant_id = ? AND provider = 'google_gmail' AND status = 'connected'
       AND connected_by_user_id = ?
     ORDER BY last_connected_at DESC`
  ).bind(TENANT_ID, userId).all().catch(() => ({ results: [] }));
  return rows?.results || [];
}

export async function allowedInboxMailboxes(env, session) {
  const shared = normalizeMailboxList(env);
  const connections = await listUserGmailConnections(env, session?.user_id);
  const gmail = connections
    .map((c) => String(c.provider_account_email || "").toLowerCase().trim())
    .filter(Boolean);
  return [...new Set([...shared, ...gmail])];
}

export function appendInboxMailboxGuard(sql, binds, allowedMailboxes) {
  const allowed = (allowedMailboxes || []).map((m) => String(m).toLowerCase()).filter(Boolean);
  if (!allowed.length) {
    return { sql: `${sql} AND (source IS NULL OR source != 'gmail')`, binds };
  }
  const clauses = allowed.map(() => "lower(?)").join(", ");
  return {
    sql: `${sql} AND (source IS NULL OR source != 'gmail' OR lower(mailbox) IN (${clauses}))`,
    binds: [...binds, ...allowed],
  };
}
