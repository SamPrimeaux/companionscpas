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

      const resetUrl = `https://${env.APP_DOMAIN || "companionscpas.meauxbility.workers.dev"}/admin/reset-password?token=${encodeURIComponent(token)}`;
      const fromEmail = env.RESEND_FROM_EMAIL || "Companions of CPAS <no-reply@companionscpas.org>";
      const emailHtml = `
        <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#090d18;color:#f0ece6;border-radius:16px">
          <img src="https://imagedelivery.net/g7wf09fCONpnidkRnR_5vw/9a00de35-fa41-49da-e431-a5f004cf5e00/avatar" alt="Companions of CPAS" style="height:48px;width:auto;margin-bottom:24px" />
          <h2 style="margin:0 0 12px;font-size:22px;color:#fff">Reset your password</h2>
          <p style="margin:0 0 24px;color:rgba(255,255,255,.62);font-size:15px;line-height:1.6">
            Click the button below to reset your password. This link expires in 30 minutes.
          </p>
          <a href="${resetUrl}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,rgba(160,104,255,0.92),rgba(109,58,220,0.84));color:#fff;border-radius:12px;font-weight:700;font-size:15px;text-decoration:none;margin-bottom:24px">
            Reset Password
          </a>
          <p style="margin:0;color:rgba(255,255,255,.38);font-size:12px">
            If you didn't request this, ignore this email. Link expires at ${expires}.
          </p>
        </div>`;

      let emailSent = false;
      let emailError = null;

      // Primary: Resend
      if (env.RESEND_API_KEY || env.RESEND_API_TOKEN) {
        const key = env.RESEND_API_KEY || env.RESEND_API_TOKEN;
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: fromEmail,
            to: [user.email],
            subject: "Reset your Companions of CPAS password",
            html: emailHtml,
          })
        }).catch(e => ({ ok: false, _err: e.message }));
        emailSent = res.ok;
        if (!res.ok) emailError = `Resend failed: ${res.status || res._err}`;
      } else {
        // Fallback: log Gmail mailto for manual send
        emailError = "RESEND_API_KEY not set";
        console.warn(`[password_reset] Email not sent — mailto fallback: mailto:${user.email}?subject=Reset+Password&body=${encodeURIComponent(resetUrl)}`);
      }

      // Always log to email_events if table exists
      await env.DB.prepare(`
        INSERT OR IGNORE INTO email_events
        (id, tenant_id, type, to_email, subject, status, related_id, created_at)
        VALUES (?, 'tenant_companionscpas', 'password_reset', ?, 'Reset your password', ?, ?, datetime('now'))
      `).bind(
        'email_' + crypto.randomUUID(),
        user.email,
        emailSent ? 'sent' : 'failed',
        resetId
      ).run().catch(() => {});

      return json({
        success: true,
        message: "If that account exists, a reset link has been sent.",
        ...(env.APP_ENV === 'development' ? { reset_url: resetUrl, email_sent: emailSent, email_error: emailError } : {})
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
