-- Newsletter subscribers table + welcome email template
-- Run: npx wrangler d1 execute companionscpas --remote --file=db/migrations/20260622_newsletter_subscribers.sql

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  status TEXT DEFAULT 'subscribed',
  source TEXT DEFAULT 'website',
  created_at TEXT DEFAULT (datetime('now')),
  unsubscribed_at TEXT,
  UNIQUE(tenant_id, email)
);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_tenant ON newsletter_subscribers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_email ON newsletter_subscribers(tenant_id, email);

INSERT OR REPLACE INTO email_templates (
  id, tenant_id, provider, template_key, subject,
  body_text, body_html, status, created_at, updated_at
) VALUES (
  'tpl_newsletter_welcome',
  'tenant_companionscpas',
  'resend',
  'newsletter_welcome',
  'You''re on the list — Companions of CPAS',
  'Hi {{first_name}}, thanks for subscribing to Companions of CPAS updates. You''ll hear about rescue stories, urgent needs, and ways to help dogs at Caddo Parish Animal Services. Visit https://companionsofcaddo.org/donate to give or https://companionsofcaddo.org/adopt to meet adoptable dogs.',
  '<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Newsletter Welcome</title>
<style>
  body { margin:0; padding:0; background:#0b0f1a; font-family: ''DM Sans'', Arial, sans-serif; color:#f0ece6; }
  .wrap { max-width:560px; margin:0 auto; padding:40px 24px; }
  .logo { display:block; width:140px; margin:0 auto 32px; }
  .card { background:#111827; border:1px solid rgba(255,255,255,0.07); border-radius:16px; padding:36px 32px; }
  .eyebrow { font-size:11px; font-weight:700; letter-spacing:0.14em; text-transform:uppercase; color:#7c3aed; margin-bottom:12px; }
  h1 { font-size:24px; font-weight:800; color:#f0ece6; margin:0 0 16px; line-height:1.2; }
  p { font-size:15px; line-height:1.7; color:#9ca3af; margin:0 0 20px; }
  .highlight { color:#f0ece6; }
  .btn { display:inline-block; background:#7c3aed; color:#fff; font-size:14px; font-weight:700; padding:14px 28px; border-radius:100px; text-decoration:none; margin:8px 8px 8px 0; }
  .btn-secondary { background:transparent; border:1px solid rgba(255,255,255,0.18); color:#f0ece6; }
  .divider { border:0; border-top:1px solid rgba(255,255,255,0.07); margin:28px 0; }
  .footer { font-size:12px; color:#6b7280; text-align:center; margin-top:28px; }
  .footer a { color:#7c3aed; text-decoration:none; }
</style>
</head>
<body>
<div class="wrap">
  <img class="logo" src="https://assets.companionsofcaddo.org/static/global/companionsofcpa-newlogo.webp" alt="Companions of CPAS" />
  <div class="card">
    <div class="eyebrow">Newsletter</div>
    <h1>Welcome, {{first_name}}.</h1>
    <p>Thanks for subscribing. You''ll get occasional updates on <span class="highlight">rescue stories, urgent needs, and ways to help</span> dogs at Caddo Parish Animal Services.</p>
    <p>Companions of CPAS is 100% volunteer-run. Every share, foster application, and gift helps create second chances.</p>
    <a class="btn" href="https://companionsofcaddo.org/donate">Donate</a>
    <a class="btn btn-secondary" href="https://companionsofcaddo.org/adopt">Meet adoptable dogs</a>
    <hr class="divider" />
    <p style="font-size:13px;color:#6b7280">Questions? Email <a href="mailto:companionsCPAS@gmail.com" style="color:#7c3aed">companionsCPAS@gmail.com</a></p>
  </div>
  <div class="footer">
    Companions of CPAS &nbsp;·&nbsp; 501(c)(3) &nbsp;·&nbsp; EIN 88-4156327<br/>
    Shreveport, LA &nbsp;·&nbsp; <a href="https://companionsofcaddo.org">companionsofcaddo.org</a>
  </div>
</div>
</body>
</html>',
  'active',
  datetime('now'), datetime('now')
);
