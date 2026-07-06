-- Home campaigns featured flags + branded newsletter welcome email
-- Run: npx wrangler d1 execute companionscpas --remote --file=db/migrations/20260707_home_campaigns_newsletter_email.sql

UPDATE fundraising_campaigns
SET config_json = json_set(COALESCE(NULLIF(config_json, ''), '{}'), '$.home_featured', 1),
    updated_at = datetime('now')
WHERE id IN (
  'camp_meet_toffee',
  'camp_kita_amputation',
  'camp_freedom_fest_2026'
);

INSERT OR REPLACE INTO email_templates (
  id, tenant_id, provider, template_key, subject,
  body_text, body_html, status, created_at, updated_at
) VALUES (
  'tpl_newsletter_welcome',
  'tenant_companionscpas',
  'resend',
  'newsletter_welcome',
  'Welcome to Companions of CPAS — you''re on the list',
  'Hi {{first_name}},

Thank you for subscribing to Companions of CPAS updates.

You''ll hear about rescue transports, urgent medical needs, foster openings, and ways to help dogs at Caddo Parish Animal Services — all from our volunteer team.

Give: https://companionsofcaddo.org/donate
Adopt: https://companionsofcaddo.org/adopt
Contact: companionsCPAS@gmail.com

Companions of CPAS · 501(c)(3) · EIN 88-4156327 · Shreveport, LA',
  '<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="color-scheme" content="light" />
<title>Welcome — Companions of CPAS</title>
</head>
<body style="margin:0;padding:0;background:#f2ede4;font-family:''DM Sans'',Arial,sans-serif;color:#1c1420;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f2ede4;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid rgba(107,33,168,0.12);box-shadow:0 18px 48px rgba(78,26,82,0.10);">
        <tr>
          <td style="padding:0;background:linear-gradient(135deg,#6f2270 0%,#4e1a52 55%,#8e3a7d 100%);">
            <div style="padding:28px 32px 24px;text-align:center;">
              <img src="https://assets.companionsofcaddo.org/companionsofcpa-newlogo.webp" width="120" alt="Companions of CPAS" style="display:block;margin:0 auto 16px;border-radius:12px;" />
              <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:rgba(255,255,255,0.82);">Newsletter</p>
              <h1 style="margin:10px 0 0;font-size:26px;line-height:1.15;font-weight:800;color:#ffffff;">Welcome, {{first_name}}.</h1>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 32px 8px;">
            <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#4a2a44;">Thank you for joining our community. You''ll receive occasional updates on <strong style="color:#4e1a52;">rescue stories, transport wins, urgent needs, and foster pathways</strong> for dogs at Caddo Parish Animal Services.</p>
            <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#5a4e6a;">Companions of CPAS is 100% volunteer-run. Every share, gift, and foster home helps create second chances.</p>
            <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 8px;">
              <tr>
                <td style="padding-right:10px;padding-bottom:10px;">
                  <a href="https://companionsofcaddo.org/donate" style="display:inline-block;background:linear-gradient(135deg,#6f2270,#4e1a52);color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 22px;border-radius:999px;">Donate</a>
                </td>
                <td style="padding-bottom:10px;">
                  <a href="https://companionsofcaddo.org/adopt" style="display:inline-block;background:#fdf1e3;color:#4e1a52;text-decoration:none;font-size:14px;font-weight:700;padding:12px 20px;border-radius:999px;border:1px solid rgba(78,26,82,0.18);">Meet adoptable dogs</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 32px 28px;">
            <div style="border-top:1px solid rgba(107,33,168,0.10);padding-top:20px;">
              <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#5a4e6a;">Questions? Reply to this email or write <a href="mailto:companionsCPAS@gmail.com" style="color:#6f2270;font-weight:600;text-decoration:none;">companionsCPAS@gmail.com</a>.</p>
              <p style="margin:0;font-size:12px;line-height:1.6;color:#a89fba;">Companions of CPAS · 501(c)(3) · EIN 88-4156327 · Shreveport, LA<br/><a href="https://companionsofcaddo.org" style="color:#6f2270;text-decoration:none;">companionsofcaddo.org</a></p>
            </div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>',
  'active',
  datetime('now'), datetime('now')
);
