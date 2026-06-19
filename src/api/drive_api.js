/**
 * drive_api.js — Google Drive OAuth + import pipeline for /dashboard/cms/images
 *
 * Routes:
 *   GET  /api/integrations/google-drive/status
 *   GET  /api/integrations/google-drive/connect        → redirects to Google
 *   GET  /api/social/oauth/google/callback             → handles token exchange
 *   POST /api/integrations/google-drive/disconnect
 *   GET  /api/integrations/google-drive/test
 *   GET  /api/integrations/google-drive/files          → list Drive images
 *   POST /api/integrations/google-drive/import         → download → R2 → cms_assets
 *
 * Token storage: access_token and refresh_token stored AES-GCM encrypted in
 * social_provider_connections (access_token_cipher / refresh_token_cipher).
 * Never logged, never returned to the browser.
 *
 * Architecture rule: Drive is an import/source only.
 *   public_url always = https://assets.companionsofcaddo.org/<r2_key>
 */

const TENANT_ID     = "tenant_companionscpas";
const CDN_ORIGIN    = "https://assets.companionsofcaddo.org";
const R2_BUCKET     = "companionscpas";
const DRIVE_SCOPE   = "https://www.googleapis.com/auth/drive.readonly";
const PROVIDER      = "google_drive";
const CONN_ID       = `conn_gdrive_${TENANT_ID}`;  // stable ID per tenant

// ── Helpers ──────────────────────────────────────────────────────────────────

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function redirect(url, status = 302) {
  return new Response(null, { status, headers: { Location: url } });
}

/** AES-GCM encrypt a string using the DRIVE_ENCRYPT_KEY Worker secret. */
async function encrypt(text, key) {
  const enc   = new TextEncoder();
  const iv    = crypto.getRandomValues(new Uint8Array(12));
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

/** AES-GCM decrypt. Returns null on failure (expired/wrong key). */
async function decrypt(cipher64, key) {
  try {
    const enc = new TextEncoder();
    const raw = Uint8Array.from(atob(cipher64), c => c.charCodeAt(0));
    const iv      = raw.slice(0, 12);
    const data    = raw.slice(12);
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

/** Return the active google_drive connection row, or null. */
async function getConnection(env) {
  return env.DB.prepare(
    "SELECT * FROM social_provider_connections WHERE id = ? AND tenant_id = ? LIMIT 1"
  ).bind(CONN_ID, TENANT_ID).first().catch(() => null);
}

/**
 * Get a valid access token. Refreshes automatically if expired.
 * Returns { token } or { error }.
 */
async function getAccessToken(env) {
  const encKey = env.DRIVE_ENCRYPT_KEY || env.GOOGLE_CLIENT_SECRET || "";
  if (!encKey) return { error: "DRIVE_ENCRYPT_KEY not set" };

  const conn = await getConnection(env);
  if (!conn || conn.status !== "connected") return { error: "not_connected" };

  // Check expiry (stored in token_expires_at ISO string)
  const expired = conn.token_expires_at
    ? Date.now() > new Date(conn.token_expires_at).getTime() - 60_000
    : true;

  if (!expired && conn.access_token_cipher) {
    const token = await decrypt(conn.access_token_cipher, encKey);
    if (token) return { token };
  }

  // Refresh
  if (!conn.refresh_token_cipher) return { error: "no_refresh_token" };
  const refreshToken = await decrypt(conn.refresh_token_cipher, encKey);
  if (!refreshToken) return { error: "refresh_token_decrypt_failed" };

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type:    "refresh_token",
    }),
  });
  const data = await res.json();
  if (!data.access_token) return { error: "refresh_failed", detail: data.error };

  const newCipher    = await encrypt(data.access_token, encKey);
  const expiresAt    = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString();

  await env.DB.prepare(
    `UPDATE social_provider_connections
     SET access_token_cipher = ?, token_expires_at = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).bind(newCipher, expiresAt, CONN_ID).run().catch(() => {});

  return { token: data.access_token };
}

/** Sanitise a filename for use as part of an R2 key. */
function safeFilename(name) {
  return name
    .normalize("NFC")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 120);
}

/** Generate the R2 key for a Drive import. */
function importKey(fileId, filename) {
  const now = new Date();
  const y   = now.getUTCFullYear();
  const m   = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `static/cms/imports/google-drive/${y}/${m}/${fileId}-${safeFilename(filename)}`;
}

const ALLOWED_MIME = new Set([
  "image/jpeg", "image/jpg", "image/png", "image/webp",
  "image/gif", "image/svg+xml", "image/avif",
]);

// ── Route handlers ────────────────────────────────────────────────────────────

async function handleStatus(env) {
  const conn = await getConnection(env);
  if (!conn || conn.status !== "connected") {
    return json({ ok: true, connected: false });
  }
  return json({
    ok: true,
    connected: true,
    account_email: conn.provider_account_email || null,
    account_name:  conn.provider_account_name  || null,
    scopes:        conn.scopes                 || DRIVE_SCOPE,
    token_expires_at: conn.token_expires_at    || null,
    last_connected_at: conn.last_connected_at  || null,
    last_tested_at:    conn.last_tested_at     || null,
    error_message:     conn.error_message      || null,
  });
}

async function handleConnect(request, env, url) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return json({ error: "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not configured" }, 503);
  }
  const encKey = env.DRIVE_ENCRYPT_KEY || env.GOOGLE_CLIENT_SECRET || "";

  const state = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  // Store state in D1 for CSRF validation
  await env.DB.prepare(
    `INSERT INTO integration_oauth_states
       (id, tenant_id, provider, state, redirect_after, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'), ?)
     ON CONFLICT(state) DO NOTHING`
  ).bind(
    `ostate_${crypto.randomUUID().slice(0, 8)}`,
    TENANT_ID, PROVIDER, state,
    `${url.origin}/dashboard/cms/images?connected=google-drive`,
    expiresAt
  ).run().catch(() => {});

  const redirectUri = `${url.origin}/api/social/oauth/google/callback`;

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id",     env.GOOGLE_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri",  redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("access_type",   "offline");
  authUrl.searchParams.set("prompt",        "consent");
  authUrl.searchParams.set("scope",         DRIVE_SCOPE);
  authUrl.searchParams.set("state",         state);

  return redirect(authUrl.toString());
}

async function handleCallback(request, env, url) {
  const code  = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const fallbackRedirect = `${url.origin}/dashboard/cms/images`;

  if (error || !code || !state) {
    console.warn("[drive-oauth] denied or missing params:", error);
    return redirect(`${fallbackRedirect}?error=drive_denied`);
  }

  // Validate state
  const stateRow = await env.DB.prepare(
    "SELECT * FROM integration_oauth_states WHERE state = ? AND provider = ? AND consumed_at IS NULL LIMIT 1"
  ).bind(state, PROVIDER).first().catch(() => null);

  if (!stateRow) {
    console.warn("[drive-oauth] invalid or expired state");
    return redirect(`${fallbackRedirect}?error=state_invalid`);
  }

  // Mark state consumed
  await env.DB.prepare(
    "UPDATE integration_oauth_states SET consumed_at = datetime('now') WHERE state = ?"
  ).bind(state).run().catch(() => {});

  const redirectAfter = stateRow.redirect_after || `${fallbackRedirect}?connected=google-drive`;
  const redirectUri   = `${url.origin}/api/social/oauth/google/callback`;

  // Exchange code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id:     env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri:  redirectUri,
      grant_type:    "authorization_code",
    }),
  });
  const tokenData = await tokenRes.json();

  if (!tokenData.access_token) {
    console.error("[drive-oauth] token exchange failed:", tokenData.error);
    return redirect(`${fallbackRedirect}?error=token_failed`);
  }

  // Fetch Drive account info
  let accountEmail = null;
  let accountName  = null;
  try {
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();
    accountEmail = profile.email || null;
    accountName  = profile.name  || null;
  } catch {}

  const encKey     = env.DRIVE_ENCRYPT_KEY || env.GOOGLE_CLIENT_SECRET || "";
  const accessCipher  = await encrypt(tokenData.access_token,  encKey);
  const refreshCipher = tokenData.refresh_token
    ? await encrypt(tokenData.refresh_token, encKey)
    : null;
  const expiresAt  = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();

  // Upsert connection row
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
       status                 = 'connected',
       scopes                 = excluded.scopes,
       access_token_cipher    = excluded.access_token_cipher,
       refresh_token_cipher   = COALESCE(excluded.refresh_token_cipher, refresh_token_cipher),
       token_ciphertext       = excluded.token_ciphertext,
       token_expires_at       = excluded.token_expires_at,
       provider_account_email = excluded.provider_account_email,
       provider_account_name  = excluded.provider_account_name,
       last_connected_at      = datetime('now'),
       error_message          = NULL,
       updated_at             = datetime('now')`
  ).bind(
    CONN_ID, TENANT_ID, PROVIDER,
    accountEmail || "Google Drive",
    DRIVE_SCOPE,
    accessCipher,
    refreshCipher,
    accessCipher,   // token_ciphertext compat column
    expiresAt,
    accountEmail,
    accountName
  ).run();

  return redirect(redirectAfter);
}

async function handleDisconnect(env) {
  const conn = await getConnection(env);
  if (conn?.access_token_cipher) {
    const encKey = env.DRIVE_ENCRYPT_KEY || env.GOOGLE_CLIENT_SECRET || "";
    const token  = await decrypt(conn.access_token_cipher, encKey);
    if (token) {
      // Best-effort token revocation
      fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, { method: "POST" }).catch(() => {});
    }
  }

  await env.DB.prepare(
    `UPDATE social_provider_connections
     SET status = 'disconnected', access_token_cipher = NULL, refresh_token_cipher = NULL,
         token_ciphertext = NULL, updated_at = datetime('now')
     WHERE id = ?`
  ).bind(CONN_ID).run().catch(() => {});

  return json({ ok: true, message: "Google Drive disconnected. Imported R2 assets are preserved." });
}

async function handleTest(env) {
  const { token, error } = await getAccessToken(env);
  if (error) return json({ ok: false, error }, 400);

  try {
    const params = new URLSearchParams({
      pageSize: "1",
      fields: "files(id)",
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true",
      corpora: "allDrives",
    });
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      await env.DB.prepare(
        "UPDATE social_provider_connections SET error_message = ?, last_tested_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
      ).bind(err.error?.message || "API error", CONN_ID).run().catch(() => {});
      return json({ ok: false, error: err.error?.message || "Drive API error" }, 400);
    }
    await env.DB.prepare(
      "UPDATE social_provider_connections SET error_message = NULL, last_tested_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
    ).bind(CONN_ID).run().catch(() => {});
    return json({ ok: true, message: "Google Drive connection is healthy." });
  } catch (err) {
    return json({ ok: false, error: err.message }, 500);
  }
}

async function handleFiles(env, url) {
  const { token, error } = await getAccessToken(env);
  if (error) return json({ ok: false, error, connected: false }, 401);

  const q          = url.searchParams.get("q") || "";
  const pageToken  = url.searchParams.get("pageToken") || "";
  const pageSize   = Math.min(parseInt(url.searchParams.get("pageSize") || "50"), 100);

  // Build query: images only, not trashed, optional name search
  const mimeFilters = [
    "mimeType='image/jpeg'",
    "mimeType='image/png'",
    "mimeType='image/webp'",
    "mimeType='image/gif'",
    "mimeType='image/avif'",
    "mimeType='image/svg+xml'",
  ].join(" or ");

  let driveQ = `(${mimeFilters}) and trashed=false`;
  if (q) driveQ += ` and name contains '${q.replace(/'/g, "\\'")}'`;

  const folderId = env.GOOGLE_DRIVE_FOLDER_ID || "";
  if (folderId) driveQ += ` and '${folderId}' in parents`;

  const params = new URLSearchParams({
    q: driveQ,
    pageSize: String(pageSize),
    orderBy: "modifiedTime desc",
    fields: "nextPageToken,files(id,name,mimeType,size,thumbnailLink,webContentLink,createdTime,modifiedTime)",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
    corpora: folderId ? "user" : "allDrives",
  });
  if (pageToken) params.set("pageToken", pageToken);

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return json({ ok: false, error: err.error?.message || "Drive list failed" }, 500);
  }

  const data = await res.json();
  return json({
    ok:            true,
    files:         data.files         || [],
    nextPageToken: data.nextPageToken || null,
  });
}

async function handleImport(request, env, url) {
  const { token, error } = await getAccessToken(env);
  if (error) return json({ ok: false, error, connected: false }, 401);

  const body = await request.json().catch(() => ({}));
  const fileIds      = body.fileIds || [];
  const targetPrefix = body.targetPrefix || "static/cms/imports/google-drive";

  if (!fileIds.length) return json({ error: "fileIds is required" }, 400);
  if (fileIds.length > 20) return json({ error: "Max 20 files per import" }, 400);

  const encKey = env.DRIVE_ENCRYPT_KEY || env.GOOGLE_CLIENT_SECRET || "";
  const conn   = await getConnection(env);
  const accountId = conn?.provider_account_email || null;

  const imported = [];
  const errors   = [];

  for (const fileId of fileIds) {
    try {
      // Get file metadata
      const metaRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,size&supportsAllDrives=true`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!metaRes.ok) { errors.push({ fileId, error: "metadata fetch failed" }); continue; }
      const meta = await metaRes.json();

      if (!ALLOWED_MIME.has(meta.mimeType)) {
        errors.push({ fileId, error: `MIME type not allowed: ${meta.mimeType}` });
        continue;
      }

      const fileSize = parseInt(meta.size || "0");
      if (fileSize > 15 * 1024 * 1024) {
        errors.push({ fileId, error: "File exceeds 15 MB limit" });
        continue;
      }

      // Download bytes from Drive
      const dlRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!dlRes.ok) { errors.push({ fileId, error: "download failed" }); continue; }
      const fileBytes = await dlRes.arrayBuffer();

      // Determine R2 key
      const now   = new Date();
      const y     = now.getUTCFullYear();
      const m     = String(now.getUTCMonth() + 1).padStart(2, "0");
      const r2Key = `${targetPrefix}/${y}/${m}/${fileId}-${safeFilename(meta.name)}`;
      const publicUrl = `${CDN_ORIGIN}/${r2Key}`;

      // Write to R2
      await env.WEBSITE_ASSETS.put(r2Key, fileBytes, {
        httpMetadata: {
          contentType: meta.mimeType,
          cacheControl: "public, max-age=31536000, immutable",
        },
        customMetadata: {
          source:    "google_drive",
          drive_id:  fileId,
          filename:  meta.name,
          tenant_id: TENANT_ID,
        },
      });

      // Upsert cms_assets row
      const assetId  = `asset_drive_${fileId.slice(0, 12)}`;
      const assetKey = `drive_${fileId.slice(0, 16)}`;
      await env.DB.prepare(
        `INSERT INTO cms_assets
           (id, tenant_id, project_id, asset_key, label, filename, original_filename,
            mime_type, size, category, asset_type, r2_key, r2_bucket,
            pub_url, cdn_url, public_url,
            usage_context, status, is_live,
            source_provider, source_file_id, source_account_id, source_url,
            imported_at, created_at, updated_at)
         VALUES (?, ?, 'proj_companionscpas', ?, ?, ?, ?,
                 ?, ?, 'image', 'image', ?, ?,
                 ?, ?, ?,
                 'cms', 'active', 1,
                 'google_drive', ?, ?, ?,
                 datetime('now'), datetime('now'), datetime('now'))
         ON CONFLICT(tenant_id, asset_key) DO UPDATE SET
           label          = excluded.label,
           public_url     = excluded.public_url,
           cdn_url        = excluded.cdn_url,
           pub_url        = excluded.pub_url,
           r2_key         = excluded.r2_key,
           size           = excluded.size,
           source_url     = excluded.source_url,
           imported_at    = datetime('now'),
           updated_at     = datetime('now')`
      ).bind(
        assetId, TENANT_ID, assetKey,
        meta.name, meta.name, meta.name,
        meta.mimeType,
        fileSize,
        r2Key, R2_BUCKET,
        publicUrl, publicUrl, publicUrl,
        fileId, accountId,
        `https://drive.google.com/file/d/${fileId}`
      ).run();

      imported.push({
        fileId,
        filename:   meta.name,
        public_url: publicUrl,
        r2_key:     r2Key,
        asset_key:  assetKey,
        size:       fileSize,
        mime_type:  meta.mimeType,
      });
    } catch (err) {
      console.error("[drive-import] error for", fileId, ":", err.message);
      errors.push({ fileId, error: err.message });
    }
  }

  return json({
    ok:       errors.length === 0,
    imported: imported.length,
    assets:   imported,
    errors,
  });
}

// ── Router ────────────────────────────────────────────────────────────────────

export async function driveRoutes(request, env, url) {
  const path   = url.pathname;
  const method = request.method;

  // Status — no auth needed (just shows connected/not)
  if (path === "/api/integrations/google-drive/status" && method === "GET") {
    return handleStatus(env);
  }

  // Start OAuth flow
  if (path === "/api/integrations/google-drive/connect" && method === "GET") {
    return handleConnect(request, env, url);
  }

  // OAuth callback — shared with YouTube, routed by state provider
  if (path === "/api/social/oauth/google/callback" && method === "GET") {
    // Only handle if the state is for google_drive; YouTube callback is handled
    // in social.js — check state row to see which provider this belongs to
    const stateParam = url.searchParams.get("state");
    if (stateParam) {
      const stateRow = await env.DB.prepare(
        "SELECT provider FROM integration_oauth_states WHERE state = ? AND consumed_at IS NULL LIMIT 1"
      ).bind(stateParam).first().catch(() => null);
      if (stateRow?.provider === PROVIDER) {
        return handleCallback(request, env, url);
      }
    }
    return null; // Fall through to social.js YouTube handler
  }

  // Disconnect
  if (path === "/api/integrations/google-drive/disconnect" && method === "POST") {
    return handleDisconnect(env);
  }

  // Test connection
  if (path === "/api/integrations/google-drive/test" && method === "GET") {
    return handleTest(env);
  }

  // List Drive files
  if (path === "/api/integrations/google-drive/files" && method === "GET") {
    return handleFiles(env, url);
  }

  // Import from Drive → R2
  if (path === "/api/integrations/google-drive/import" && method === "POST") {
    return handleImport(request, env, url);
  }

  return null;
}
