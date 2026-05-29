-- ============================================================
-- SEED 002 — Email Templates (Resend-ready HTML)
-- companionscpas D1: fd6dd6fb-156b-4b6a-8ff0-505422652391
-- Run: npx wrangler d1 execute companionscpas --remote --file=db/seed_002_email_templates.sql
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- Template: Foster Application Received (applicant-facing)
-- Trigger: POST /api/foster/apply → on D1 insert success
-- Variables: {{first_name}}, {{application_id}}
-- ────────────────────────────────────────────────────────────
INSERT OR REPLACE INTO email_templates (
  id, tenant_id, provider, template_key, subject,
  body_text, body_html, status, created_at, updated_at
) VALUES (
  'tpl_foster_received',
  'tenant_companionscpas',
  'resend',
  'foster_application_received',
  'We received your foster application — Companions of CPAS',
  'Hi {{first_name}}, thank you for applying to foster with Companions of CPAS. We review every application personally and will be in touch within 2-3 business days. Your application ID is {{application_id}}. Questions? Email companionsCPAS@gmail.com.',
  '<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Foster Application Received</title>
<style>
  body { margin:0; padding:0; background:#0b0f1a; font-family: ''DM Sans'', Arial, sans-serif; color:#f0ece6; }
  .wrap { max-width:560px; margin:0 auto; padding:40px 24px; }
  .logo { display:block; width:140px; margin:0 auto 32px; }
  .card { background:#111827; border:1px solid rgba(255,255,255,0.07); border-radius:16px; padding:36px 32px; }
  .eyebrow { font-size:11px; font-weight:700; letter-spacing:0.14em; text-transform:uppercase; color:#7c3aed; margin-bottom:12px; }
  h1 { font-size:24px; font-weight:800; color:#f0ece6; margin:0 0 16px; line-height:1.2; }
  p { font-size:15px; line-height:1.7; color:#9ca3af; margin:0 0 20px; }
  .highlight { color:#f0ece6; }
  .btn { display:inline-block; background:#7c3aed; color:#fff; font-size:14px; font-weight:700; padding:14px 28px; border-radius:100px; text-decoration:none; margin:8px 0 24px; }
  .divider { border:0; border-top:1px solid rgba(255,255,255,0.07); margin:28px 0; }
  .footer { font-size:12px; color:#6b7280; text-align:center; margin-top:28px; }
  .footer a { color:#7c3aed; text-decoration:none; }
</style>
</head>
<body>
<div class="wrap">
  <img class="logo" src="https://companionscpas.meauxbility.workers.dev/static/global/companionsofcpa-newlogo.webp" alt="Companions of CPAS" />
  <div class="card">
    <div class="eyebrow">Foster Application</div>
    <h1>We got your application, {{first_name}}.</h1>
    <p>Thank you for taking the first step. Every foster home we add gives a dog at Caddo Parish Animal Services a real chance at a second one.</p>
    <p>We review every application personally. <span class="highlight">Expect to hear from us within 2–3 business days.</span></p>
    <hr class="divider" />
    <p style="font-size:13px;color:#6b7280;margin-bottom:4px;">Application reference</p>
    <p style="font-size:14px;font-weight:700;color:#a78bfa;margin-bottom:24px;">{{application_id}}</p>
    <a class="btn" href="https://companionscpas.meauxbility.workers.dev/adopt">Meet dogs who need foster homes</a>
    <hr class="divider" />
    <p style="font-size:13px;color:#6b7280">Questions? Reply to this email or reach us at <a href="mailto:companionsCPAS@gmail.com" style="color:#7c3aed">companionsCPAS@gmail.com</a></p>
  </div>
  <div class="footer">
    Companions of CPAS &nbsp;·&nbsp; 501(c)(3) &nbsp;·&nbsp; EIN 88-4156327<br/>
    Shreveport, LA &nbsp;·&nbsp; <a href="https://companionscpas.meauxbility.workers.dev">companionscpas.org</a>
  </div>
</div>
</body>
</html>',
  'active',
  datetime('now'), datetime('now')
);


-- ────────────────────────────────────────────────────────────
-- Template: Home Visit Follow-up (admin-triggered)
-- Trigger: Admin clicks "Send Home Visit Email" in dashboard
-- Variables: {{first_name}}, {{coordinator_name}}, {{scheduled_date}}
-- ────────────────────────────────────────────────────────────
INSERT OR REPLACE INTO email_templates (
  id, tenant_id, provider, template_key, subject,
  body_text, body_html, status, created_at, updated_at
) VALUES (
  'tpl_home_visit',
  'tenant_companionscpas',
  'resend',
  'home_visit_followup',
  'Next step for your foster application — home visit',
  'Hi {{first_name}}, great news — your foster application has been reviewed and we would like to schedule a home visit. {{coordinator_name}} will be reaching out to confirm a time. Proposed date: {{scheduled_date}}. Questions? Email companionsCPAS@gmail.com.',
  '<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Home Visit — Next Step</title>
<style>
  body { margin:0; padding:0; background:#0b0f1a; font-family: ''DM Sans'', Arial, sans-serif; color:#f0ece6; }
  .wrap { max-width:560px; margin:0 auto; padding:40px 24px; }
  .logo { display:block; width:140px; margin:0 auto 32px; }
  .card { background:#111827; border:1px solid rgba(255,255,255,0.07); border-radius:16px; padding:36px 32px; }
  .eyebrow { font-size:11px; font-weight:700; letter-spacing:0.14em; text-transform:uppercase; color:#10b981; margin-bottom:12px; }
  h1 { font-size:24px; font-weight:800; color:#f0ece6; margin:0 0 16px; line-height:1.2; }
  p { font-size:15px; line-height:1.7; color:#9ca3af; margin:0 0 20px; }
  .highlight { color:#f0ece6; font-weight:600; }
  .info-box { background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.2); border-radius:10px; padding:16px 20px; margin:20px 0; }
  .info-box p { margin:0; color:#6ee7b7; font-size:14px; }
  .btn { display:inline-block; background:#7c3aed; color:#fff; font-size:14px; font-weight:700; padding:14px 28px; border-radius:100px; text-decoration:none; margin:8px 0 24px; }
  .divider { border:0; border-top:1px solid rgba(255,255,255,0.07); margin:28px 0; }
  .footer { font-size:12px; color:#6b7280; text-align:center; margin-top:28px; }
  .footer a { color:#7c3aed; text-decoration:none; }
</style>
</head>
<body>
<div class="wrap">
  <img class="logo" src="https://companionscpas.meauxbility.workers.dev/static/global/companionsofcpa-newlogo.webp" alt="Companions of CPAS" />
  <div class="card">
    <div class="eyebrow">Application Update</div>
    <h1>Good news, {{first_name}} — next step is a home visit.</h1>
    <p>Your foster application has been reviewed and we are excited to move forward. A home visit is the next step in our process — it is quick, friendly, and helps us match the right dog to your home.</p>
    <div class="info-box">
      <p><strong>Proposed date:</strong> {{scheduled_date}}</p>
      <p style="margin-top:6px"><strong>Your coordinator:</strong> {{coordinator_name}}</p>
    </div>
    <p>{{coordinator_name}} will be in touch shortly to confirm the time and answer any questions you have.</p>
    <hr class="divider" />
    <p style="font-size:13px;color:#6b7280">Questions? Reply to this email or reach us at <a href="mailto:companionsCPAS@gmail.com" style="color:#7c3aed">companionsCPAS@gmail.com</a></p>
  </div>
  <div class="footer">
    Companions of CPAS &nbsp;·&nbsp; 501(c)(3) &nbsp;·&nbsp; EIN 88-4156327<br/>
    Shreveport, LA &nbsp;·&nbsp; <a href="https://companionscpas.meauxbility.workers.dev">companionscpas.org</a>
  </div>
</div>
</body>
</html>',
  'active',
  datetime('now'), datetime('now')
);


-- ────────────────────────────────────────────────────────────
-- Template: Donation Receipt (Stripe webhook → Resend)
-- Trigger: stripe_webhooks processor on checkout.session.completed
-- Variables: {{first_name}}, {{amount}}, {{campaign}}, {{receipt_url}}
-- ────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO email_templates (
  id, tenant_id, provider, template_key, subject,
  body_text, body_html, status, created_at, updated_at
) VALUES (
  'tpl_donation_receipt',
  'tenant_companionscpas',
  'resend',
  'donation_receipt',
  'Thank you for your gift — Companions of CPAS',
  'Hi {{first_name}}, thank you for your donation of {{amount}} to Companions of CPAS. Your gift goes directly to dogs at Caddo Parish Animal Services. Receipt: {{receipt_url}}. EIN 88-4156327.',
  '<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Donation Receipt</title>
<style>
  body { margin:0; padding:0; background:#0b0f1a; font-family: ''DM Sans'', Arial, sans-serif; color:#f0ece6; }
  .wrap { max-width:560px; margin:0 auto; padding:40px 24px; }
  .logo { display:block; width:140px; margin:0 auto 32px; }
  .card { background:#111827; border:1px solid rgba(255,255,255,0.07); border-radius:16px; padding:36px 32px; }
  .eyebrow { font-size:11px; font-weight:700; letter-spacing:0.14em; text-transform:uppercase; color:#7c3aed; margin-bottom:12px; }
  h1 { font-size:24px; font-weight:800; color:#f0ece6; margin:0 0 16px; line-height:1.2; }
  p { font-size:15px; line-height:1.7; color:#9ca3af; margin:0 0 20px; }
  .amount-box { background:rgba(124,58,237,0.10); border:1px solid rgba(124,58,237,0.25); border-radius:10px; padding:20px 24px; margin:20px 0; text-align:center; }
  .amount { font-size:36px; font-weight:900; color:#a78bfa; }
  .campaign { font-size:13px; color:#6b7280; margin-top:4px; }
  .btn { display:inline-block; background:#7c3aed; color:#fff; font-size:14px; font-weight:700; padding:14px 28px; border-radius:100px; text-decoration:none; margin:8px 0 24px; }
  .divider { border:0; border-top:1px solid rgba(255,255,255,0.07); margin:28px 0; }
  .tax-note { font-size:12px; color:#6b7280; background:rgba(255,255,255,0.03); border-radius:8px; padding:12px 16px; }
  .footer { font-size:12px; color:#6b7280; text-align:center; margin-top:28px; }
  .footer a { color:#7c3aed; text-decoration:none; }
</style>
</head>
<body>
<div class="wrap">
  <img class="logo" src="https://companionscpas.meauxbility.workers.dev/static/global/companionsofcpa-newlogo.webp" alt="Companions of CPAS" />
  <div class="card">
    <div class="eyebrow">Donation Receipt</div>
    <h1>Thank you, {{first_name}}.</h1>
    <p>Your gift goes directly to dogs at Caddo Parish Animal Services — medical care, transport support, and second chances.</p>
    <div class="amount-box">
      <div class="amount">{{amount}}</div>
      <div class="campaign">{{campaign}}</div>
    </div>
    <a class="btn" href="{{receipt_url}}">View Receipt</a>
    <hr class="divider" />
    <div class="tax-note">
      <strong style="color:#f0ece6">Tax deductible gift</strong><br/>
      Companions of CPAS is a registered 501(c)(3) nonprofit.<br/>
      EIN: 88-4156327 &nbsp;·&nbsp; No goods or services were provided in exchange for this gift.
    </div>
  </div>
  <div class="footer">
    Companions of CPAS &nbsp;·&nbsp; Shreveport, LA<br/>
    <a href="https://companionscpas.meauxbility.workers.dev">companionscpas.org</a> &nbsp;·&nbsp;
    <a href="mailto:companionsCPAS@gmail.com">companionsCPAS@gmail.com</a>
  </div>
</div>
</body>
</html>',
  'active',
  datetime('now'), datetime('now')
);


-- ────────────────────────────────────────────────────────────
-- Template: Contact Request Notification (admin-facing)
-- Trigger: POST /api/contact → notify admin
-- Variables: {{name}}, {{email}}, {{message}}, {{subject}}
-- ────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO email_templates (
  id, tenant_id, provider, template_key, subject,
  body_text, body_html, status, created_at, updated_at
) VALUES (
  'tpl_contact_notify',
  'tenant_companionscpas',
  'resend',
  'contact_request_notify',
  'New contact request — Companions of CPAS',
  'New contact from {{name}} ({{email}}). Subject: {{subject}}. Message: {{message}}',
  '<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>New Contact Request</title>
<style>
  body { margin:0; padding:0; background:#0b0f1a; font-family: Arial, sans-serif; color:#f0ece6; }
  .wrap { max-width:560px; margin:0 auto; padding:32px 24px; }
  .card { background:#111827; border:1px solid rgba(255,255,255,0.07); border-radius:12px; padding:28px; }
  .label { font-size:11px; color:#6b7280; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:4px; }
  .value { font-size:15px; color:#f0ece6; margin-bottom:20px; }
  .msg { background:rgba(255,255,255,0.03); border-left:3px solid #7c3aed; padding:12px 16px; border-radius:4px; font-size:14px; color:#9ca3af; line-height:1.6; }
</style>
</head>
<body>
<div class="wrap">
  <div class="card">
    <p style="font-size:18px;font-weight:700;margin:0 0 24px">New contact request</p>
    <div class="label">Name</div><div class="value">{{name}}</div>
    <div class="label">Email</div><div class="value"><a href="mailto:{{email}}" style="color:#a78bfa">{{email}}</a></div>
    <div class="label">Subject</div><div class="value">{{subject}}</div>
    <div class="label">Message</div>
    <div class="msg">{{message}}</div>
  </div>
</div>
</body>
</html>',
  'active',
  datetime('now'), datetime('now')
);
