/**
 * Gmail OAuth + inbox sync for /dashboard/email
 * Pattern mirrors drive_api.js — tokens encrypted in social_provider_connections.
 */

import { getAuthUser } from "./session_api.js";

const TENANT_ID = "tenant_companionscpas";
const ONBOARDING_FOLDER_ID = "fld_onboarding";
const PROVIDER = "google_gmail";
const CONN_ID = `conn_gmail_${TENANT_ID}`;
const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function redirect(url, status = 302) {
  return new Response(null, { status, headers: { Location: url } });
}

function id(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

async function encrypt(text, key) {
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const rawKey = await crypto.subtle.importKey(
    "raw", enc.encode(key.slice(0, 32).padEnd(32, "0")),
    { name: "AES-GCM" }, false, ["encrypt"]
  );
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, rawKey, enc.encode(text));
  const combined = new Uint8Array(iv.byteLength + cipher.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipher), iv.byteLength);
  return btoa(String.fromCharCode(...combined));
}

async function decrypt(cipher64, key) {
  try {
    const enc = new TextEncoder();
    const raw = Uint8Array.from(atob(cipher64), (c) => c.charCodeAt(0));
    const iv = raw.slice(0, 12);
    const data = raw.slice(12);
    const rawKey = await crypto.subtle.importKey(
      "raw", enc.encode(key.slice(0, 32).padEnd(32, "0")),
      { name: "AES-GCM" }, false, ["decrypt"]
    );
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, rawKey, data);
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}

function encKey(env) {
  return env.DRIVE_ENCRYPT_KEY || env.GOOGLE_CLIENT_SECRET || "";
}

async function getConnection(env) {
  return env.DB.prepare(
    "SELECT * FROM social_provider_connections WHERE id = ? AND tenant_id = ? LIMIT 1"
  ).bind(CONN_ID, TENANT_ID).first().catch(() => null);
}

async function getAccessToken(env) {
  const key = encKey(env);
  if (!key) return { error: "DRIVE_ENCRYPT_KEY not set" };

  const conn = await getConnection(env);
  if (!conn || conn.status !== "connected") return { error: "not_connected" };

  const expired = conn.token_expires_at
    ? Date.now() > new Date(conn.token_expires_at).getTime() - 60_000
    : true;

  if (!expired && conn.access_token_cipher) {
    const token = await decrypt(conn.access_token_cipher, key);
    if (token) return { token };
  }

  if (!conn.refresh_token_cipher) return { error: "no_refresh_token" };
  const refreshToken = await decrypt(conn.refresh_token_cipher, key);
  if (!refreshToken) return { error: "refresh_token_decrypt_failed" };

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!data.access_token) return { error: "refresh_failed", detail: data.error };

  const newCipher = await encrypt(data.access_token, key);
  const expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString();
  await env.DB.prepare(
    `UPDATE social_provider_connections
     SET access_token_cipher = ?, token_expires_at = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).bind(newCipher, expiresAt, CONN_ID).run().catch(() => {});

  return { token: data.access_token };
}

function decodeBase64Url(data) {
  const normalized = String(data || "").replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4 ? "=".repeat(4 - (normalized.length % 4)) : "";
  try {
    return decodeURIComponent(escape(atob(normalized + pad)));
  } catch {
    try { return atob(normalized + pad); } catch { return ""; }
  }
}

function extractGmailBody(payload) {
  if (!payload) return { html: null, text: null };
  if (payload.body?.data) {
    const raw = decodeBase64Url(payload.body.data);
    if (payload.mimeType === "text/html") return { html: raw, text: null };
    return { html: null, text: raw };
  }
  const parts = payload.parts || [];
  let html = null;
  let text = null;
  for (const part of parts) {
    const nested = extractGmailBody(part);
    if (!html && nested.html) html = nested.html;
    if (!text && nested.text) text = nested.text;
  }
  return { html, text };
}

function headerValue(headers, name) {
  const h = (headers || []).find((x) => String(x.name || "").toLowerCase() === name.toLowerCase());
  return h?.value || "";
}

async function syncGmailInbox(env, maxResults = 25) {
  const { token, error } = await getAccessToken(env);
  if (error) return { ok: false, error };

  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&labelIds=INBOX`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const listData = await listRes.json();
  if (!listRes.ok) return { ok: false, error: listData.error?.message || "Gmail list failed" };

  let synced = 0;
  const messages = listData.messages || [];

  for (const item of messages) {
    const gmailId = item.id;
    const exists = await env.DB.prepare(
      "SELECT id FROM inbound_emails WHERE tenant_id = ? AND gmail_id = ? LIMIT 1"
    ).bind(TENANT_ID, gmailId).first().catch(() => null);
    if (exists?.id) continue;

    const msgRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${gmailId}?format=full`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const msg = await msgRes.json();
    if (!msgRes.ok) continue;

    const { html, text } = extractGmailBody(msg.payload);
    const from = headerValue(msg.payload?.headers, "From");
    const subject = headerValue(msg.payload?.headers, "Subject") || "(no subject)";
    const toRaw = headerValue(msg.payload?.headers, "To");
    const toList = toRaw ? toRaw.split(",").map((s) => s.trim()) : [];
    const preview = (text || html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 280);
    const isUnread = (msg.labelIds || []).includes("UNREAD");
    const folderId = /onboarding/i.test(subject) ? ONBOARDING_FOLDER_ID : null;

    await env.DB.prepare(
      `INSERT INTO inbound_emails
       (id, tenant_id, gmail_id, message_id, thread_key, mailbox, from_email, to_json, subject,
        preview_text, body_html, body_text, status, source, folder_id, is_deleted, is_important, received_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'gmail', ?, 0, 0, datetime('now'), datetime('now'))`
    ).bind(
      id("inb"),
      TENANT_ID,
      gmailId,
      headerValue(msg.payload?.headers, "Message-ID") || gmailId,
      msg.threadId || gmailId,
      "gmail",
      from,
      JSON.stringify(toList),
      subject,
      preview,
      html,
      text,
      isUnread ? "unread" : "read",
      folderId
    ).run();
    synced += 1;
  }

  return { ok: true, synced, total: messages.length };
}

async function handleStatus(env) {
  const conn = await getConnection(env);
  if (!conn || conn.status !== "connected") {
    return json({ ok: true, connected: false });
  }
  return json({
    ok: true,
    connected: true,
    account_email: conn.provider_account_email || null,
    account_name: conn.provider_account_name || null,
    scopes: conn.scopes || GMAIL_SCOPES,
    last_connected_at: conn.last_connected_at || null,
  });
}

async function handleConnect(request, env, url) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return json({ error: "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not configured" }, 503);
  }

  const state = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  await env.DB.prepare(
    `INSERT INTO integration_oauth_states
       (id, tenant_id, provider, state, redirect_after, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'), ?)
     ON CONFLICT(state) DO NOTHING`
  ).bind(
    `ostate_${crypto.randomUUID().slice(0, 8)}`,
    TENANT_ID,
    PROVIDER,
    state,
    `${url.origin}/dashboard/email?connected=gmail`,
    expiresAt
  ).run().catch(() => {});

  const redirectUri = `${url.origin}/api/social/oauth/google/callback`;
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("scope", GMAIL_SCOPES);
  authUrl.searchParams.set("state", state);

  return redirect(authUrl.toString());
}

async function handleCallback(request, env, url) {
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const fallbackRedirect = `${url.origin}/dashboard/email`;

  if (error || !code || !state) {
    return redirect(`${fallbackRedirect}?error=gmail_denied`);
  }

  const stateRow = await env.DB.prepare(
    "SELECT * FROM integration_oauth_states WHERE state = ? AND provider = ? AND consumed_at IS NULL LIMIT 1"
  ).bind(state, PROVIDER).first().catch(() => null);

  if (!stateRow) return redirect(`${fallbackRedirect}?error=state_invalid`);

  await env.DB.prepare(
    "UPDATE integration_oauth_states SET consumed_at = datetime('now') WHERE state = ?"
  ).bind(state).run().catch(() => {});

  const redirectAfter = stateRow.redirect_after || `${fallbackRedirect}?connected=gmail`;
  const redirectUri = `${url.origin}/api/social/oauth/google/callback`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    return redirect(`${fallbackRedirect}?error=token_failed`);
  }

  let accountEmail = null;
  let accountName = null;
  try {
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();
    accountEmail = profile.email || null;
    accountName = profile.name || null;
  } catch {}

  const key = encKey(env);
  const accessCipher = await encrypt(tokenData.access_token, key);
  const refreshCipher = tokenData.refresh_token ? await encrypt(tokenData.refresh_token, key) : null;
  const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();

  await env.DB.prepare(
    `INSERT INTO social_provider_connections
       (id, tenant_id, provider, account_label, status, scopes,
        access_token_cipher, refresh_token_cipher, token_ciphertext,
        token_expires_at, provider_account_email, provider_account_name,
        last_connected_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'connected', ?,
             ?, ?, ?,
             ?, ?, ?,
             datetime('now'), datetime('now'), datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       status = 'connected',
       scopes = excluded.scopes,
       access_token_cipher = excluded.access_token_cipher,
       refresh_token_cipher = COALESCE(excluded.refresh_token_cipher, refresh_token_cipher),
       token_ciphertext = excluded.token_ciphertext,
       token_expires_at = excluded.token_expires_at,
       provider_account_email = excluded.provider_account_email,
       provider_account_name = excluded.provider_account_name,
       last_connected_at = datetime('now'),
       error_message = NULL,
       updated_at = datetime('now')`
  ).bind(
    CONN_ID, TENANT_ID, PROVIDER,
    accountEmail || "Gmail",
    GMAIL_SCOPES,
    accessCipher, refreshCipher, accessCipher,
    expiresAt, accountEmail, accountName
  ).run();

  return redirect(redirectAfter);
}

async function handleDisconnect(env) {
  const conn = await getConnection(env);
  if (conn?.access_token_cipher) {
    const key = encKey(env);
    const token = await decrypt(conn.access_token_cipher, key);
    if (token) {
      fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, { method: "POST" }).catch(() => {});
    }
  }
  await env.DB.prepare(
    `UPDATE social_provider_connections
     SET status = 'disconnected', access_token_cipher = NULL, refresh_token_cipher = NULL,
         token_ciphertext = NULL, updated_at = datetime('now')
     WHERE id = ?`
  ).bind(CONN_ID).run().catch(() => {});
  return json({ ok: true, message: "Gmail disconnected." });
}

async function requireSession(request, env) {
  const session = await getAuthUser(request, env);
  if (!session) return json({ error: "Not authenticated" }, 401);
  return session;
}

export async function gmailRoutes(request, env, url) {
  const path = url.pathname;
  const method = request.method;

  // OAuth callback — no session cookie (cross-site redirect from Google)
  if (path === "/api/social/oauth/google/callback" && method === "GET") {
    const stateParam = url.searchParams.get("state");
    if (stateParam) {
      const stateRow = await env.DB.prepare(
        "SELECT provider FROM integration_oauth_states WHERE state = ? AND consumed_at IS NULL LIMIT 1"
      ).bind(stateParam).first().catch(() => null);
      if (stateRow?.provider === PROVIDER) {
        return handleCallback(request, env, url);
      }
    }
    return null;
  }

  if (path === "/api/integrations/gmail/status" && method === "GET") {
    const session = await requireSession(request, env);
    if (session instanceof Response) return session;
    return handleStatus(env);
  }
  if (path === "/api/integrations/gmail/connect" && method === "GET") {
    const session = await requireSession(request, env);
    if (session instanceof Response) return session;
    return handleConnect(request, env, url);
  }
  if (path === "/api/integrations/gmail/disconnect" && method === "POST") {
    const session = await requireSession(request, env);
    if (session instanceof Response) return session;
    return handleDisconnect(env);
  }
  if (path === "/api/integrations/gmail/sync" && method === "POST") {
    const session = await requireSession(request, env);
    if (session instanceof Response) return session;
    const result = await syncGmailInbox(env, 30);
    if (!result.ok) return json(result, 400);
    return json(result);
  }

  return null;
}

export { getAccessToken as getGmailAccessToken, syncGmailInbox };
