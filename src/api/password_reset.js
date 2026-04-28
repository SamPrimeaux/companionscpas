function json(data,status=200,headers={}) {
  return new Response(JSON.stringify(data,null,2), {
    status,
    headers:{ "Content-Type":"application/json", ...headers }
  });
}

async function sha256Hex(value) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,"0")).join("");
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name:"PBKDF2", hash:"SHA-256", salt, iterations:100000 },
    key,
    512
  );
  return {
    salt: [...salt].map(b=>b.toString(16).padStart(2,"0")).join(""),
    hash: [...new Uint8Array(bits)].map(b=>b.toString(16).padStart(2,"0")).join("")
  };
}

export async function passwordResetRoutes(request, env, url) {
  if (url.pathname === "/api/auth/password/request" && request.method === "POST") {
    const data = await request.json().catch(()=>({}));
    const email = String(data.email || "").trim().toLowerCase();

    const user = await env.DB.prepare("SELECT id,email FROM users WHERE lower(email)=lower(?) AND status='active' LIMIT 1")
      .bind(email).first();

    if (user) {
      const token = crypto.randomUUID() + "." + crypto.randomUUID();
      const tokenHash = await sha256Hex(token + "." + env.PASSWORD_RESET_SECRET);
      const resetId = "reset_" + crypto.randomUUID();
      const expires = new Date(Date.now() + 1000 * 60 * 30).toISOString();

      await env.DB.prepare(`
        INSERT INTO password_reset_tokens
        (id,user_id,token_hash,expires_at,created_at)
        VALUES (?,?,?,?,datetime('now'))
      `).bind(resetId,user.id,tokenHash,expires).run();

      return json({
        success:true,
        message:"Reset token created for demo.",
        reset_url:`/admin/reset-password?token=${encodeURIComponent(token)}`
      });
    }

    return json({ success:true, message:"If that account exists, a reset link will be available." });
  }

  if (url.pathname === "/api/auth/password/reset" && request.method === "POST") {
    const data = await request.json().catch(()=>({}));
    if (!data.token || !data.password || String(data.password).length < 8) {
      return json({ error:"Valid token and password with at least 8 characters required." },400);
    }

    const tokenHash = await sha256Hex(data.token + "." + env.PASSWORD_RESET_SECRET);
    const row = await env.DB.prepare(`
      SELECT id,user_id,expires_at,used_at
      FROM password_reset_tokens
      WHERE token_hash=?
      LIMIT 1
    `).bind(tokenHash).first();

    if (!row || row.used_at || new Date(row.expires_at).getTime() < Date.now()) {
      return json({ error:"Reset link is invalid or expired." },400);
    }

    const hp = await hashPassword(data.password);

    await env.DB.prepare(`
      UPDATE user_credentials
      SET password_hash=?, password_salt=?, password_algo='pbkdf2-sha256-100000', updated_at=datetime('now')
      WHERE user_id=? AND provider='password'
    `).bind(hp.hash,hp.salt,row.user_id).run();

    await env.DB.prepare("UPDATE password_reset_tokens SET used_at=datetime('now') WHERE id=?")
      .bind(row.id).run();

    return json({ success:true, message:"Password updated." });
  }

  return null;
}
