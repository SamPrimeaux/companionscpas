-- Branded Wet Dog / competition entry email templates (edit copy in D1, not Worker JS).
-- Logo: https://assets.companionsofcaddo.org/companionsofcpa-newlogo.webp

INSERT OR REPLACE INTO email_templates
  (id, tenant_id, provider, template_key, subject, body_text, body_html, status, created_at, updated_at)
VALUES
(
  'tpl_competition_entry_thank_you',
  'tenant_companionscpas',
  'resend',
  'competition_entry_thank_you',
  'You''re in! {{dog_name}} is entered in {{campaign_title}}',
  'Hi {{first_name}},

Thank you! {{dog_name}} is officially entered in {{campaign_title}}.

We received your ${{amount}} entry gift and your photo. Our team will review the submission before it appears in the public gallery.

Entry reference: {{entry_id}}
{{caption_line}}

Questions? Email companionsCPAS@gmail.com

Companions of CPAS · 501(c)(3) · EIN 88-4156327 · Shreveport, LA
https://companionsofcaddo.org/donate',
  '<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Entry confirmed — Companions of CPAS</title>
</head>
<body style="margin:0;padding:0;background:#f2ede4;font-family:Arial,Helvetica,sans-serif;color:#1c1420;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f2ede4;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid rgba(107,33,168,0.12);">
        <tr>
          <td style="padding:28px 32px 20px;background:linear-gradient(135deg,#6f2270 0%,#4e1a52 55%,#8e3a7d 100%);text-align:center;">
            <img src="https://assets.companionsofcaddo.org/companionsofcpa-newlogo.webp" width="112" alt="Companions of CPAS" style="display:block;margin:0 auto 14px;border:0;" />
            <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:rgba(255,255,255,0.82);">Entry confirmed</p>
            <h1 style="margin:10px 0 0;font-size:26px;line-height:1.2;font-weight:800;color:#ffffff;">Thank you, {{first_name}}!</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px 8px;font-size:16px;line-height:1.65;color:#2a2230;">
            <p style="margin:0 0 14px;"><strong style="color:#4e1a52;">{{dog_name}}</strong> is officially entered in <strong>{{campaign_title}}</strong>.</p>
            <p style="margin:0 0 14px;">We received your <strong>${{amount}}</strong> entry gift and your photo. Our volunteer team will review the submission before it appears in the public gallery.</p>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:18px 0;background:#f8f4fb;border-radius:12px;">
              <tr><td style="padding:16px 18px;font-size:14px;line-height:1.55;color:#3d3348;">
                <p style="margin:0 0 6px;"><strong>Entry reference:</strong> {{entry_id}}</p>
                <p style="margin:0 0 6px;"><strong>Pet:</strong> {{dog_name}}</p>
                {{caption_html}}
              </td></tr>
            </table>
            <p style="margin:0 0 8px;">Questions? Reply to this email or write <a href="mailto:companionsCPAS@gmail.com" style="color:#6f2270;font-weight:600;">companionsCPAS@gmail.com</a>.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 32px 28px;text-align:center;">
            <a href="https://companionsofcaddo.org/donate" style="display:inline-block;background:#6f2270;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 22px;border-radius:999px;">Visit Companions of CPAS</a>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px 24px;border-top:1px solid #efe8f4;font-size:12px;line-height:1.5;color:#6b5f72;text-align:center;">
            Companions of CPAS · 501(c)(3) · EIN 88-4156327 · Shreveport, LA
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>',
  'active',
  datetime('now'),
  datetime('now')
),
(
  'tpl_competition_entry_paid_admin',
  'tenant_companionscpas',
  'resend',
  'competition_entry_paid_admin',
  'Paid competition entry: {{dog_name}} — {{owner_name}}',
  'Paid competition entry

Pet: {{dog_name}}
Campaign: {{campaign_title}}
Owner: {{owner_name}}
Email: {{owner_email}}
Phone: {{owner_phone}}
Entry fee: ${{amount}}
Entry reference: {{entry_id}}
{{caption_line}}
Stripe PaymentIntent: {{stripe_payment_intent_id}}
Photo: {{photo_url}}
Dashboard: {{dashboard_url}}

The submitted image is attached when available.',
  '<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>Paid entry</title></head>
<body style="margin:0;padding:0;background:#f2ede4;font-family:Arial,Helvetica,sans-serif;color:#1c1420;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f2ede4;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid rgba(107,33,168,0.12);">
        <tr>
          <td style="padding:24px 28px;background:linear-gradient(135deg,#6f2270 0%,#4e1a52 100%);text-align:center;">
            <img src="https://assets.companionsofcaddo.org/companionsofcpa-newlogo.webp" width="96" alt="Companions of CPAS" style="display:block;margin:0 auto 10px;border:0;" />
            <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.85);">Paid entry</p>
            <h1 style="margin:8px 0 0;font-size:22px;color:#fff;">{{dog_name}}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 28px;font-size:14px;line-height:1.6;color:#2a2230;">
            <p style="margin:0 0 12px;">A competition entry payment cleared for <strong>{{campaign_title}}</strong>.</p>
            <p style="margin:0 0 6px;"><strong>Owner:</strong> {{owner_name}}</p>
            <p style="margin:0 0 6px;"><strong>Email:</strong> {{owner_email}}</p>
            <p style="margin:0 0 6px;"><strong>Phone:</strong> {{owner_phone}}</p>
            <p style="margin:0 0 6px;"><strong>Entry fee:</strong> ${{amount}}</p>
            <p style="margin:0 0 6px;"><strong>Entry reference:</strong> {{entry_id}}</p>
            {{caption_html}}
            <p style="margin:12px 0 6px;"><strong>Stripe PaymentIntent:</strong> {{stripe_payment_intent_id}}</p>
            <p style="margin:0 0 16px;"><a href="{{photo_url}}" style="color:#6f2270;">View submitted photo</a></p>
            <a href="{{dashboard_url}}" style="display:inline-block;background:#6f2270;color:#fff;text-decoration:none;font-weight:700;font-size:13px;padding:10px 18px;border-radius:999px;">Open campaign in dashboard</a>
            <p style="margin:16px 0 0;font-size:12px;color:#6b5f72;">The submitted image is attached when available.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>',
  'active',
  datetime('now'),
  datetime('now')
),
(
  'tpl_competition_entry_followup_admin',
  'tenant_companionscpas',
  'resend',
  'competition_entry_followup_admin',
  'Action needed: {{status_label}} — {{dog_name}}',
  '{{status_label}}

Pet: {{dog_name}}
Campaign: {{campaign_title}}
Owner: {{owner_name}}
Email: {{owner_email}}
Phone: {{owner_phone}}
Expected fee: ${{amount}}
Entry reference: {{entry_id}}
Reason: {{reason}}
{{caption_line}}
Photo: {{photo_url}}
Dashboard: {{dashboard_url}}

The submitted image is attached when available.',
  '<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>Entry follow-up</title></head>
<body style="margin:0;padding:0;background:#f2ede4;font-family:Arial,Helvetica,sans-serif;color:#1c1420;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f2ede4;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid rgba(107,33,168,0.12);">
        <tr>
          <td style="padding:24px 28px;background:linear-gradient(135deg,#8a1f3d 0%,#4e1a52 100%);text-align:center;">
            <img src="https://assets.companionsofcaddo.org/companionsofcpa-newlogo.webp" width="96" alt="Companions of CPAS" style="display:block;margin:0 auto 10px;border:0;" />
            <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.85);">{{status_label}}</p>
            <h1 style="margin:8px 0 0;font-size:22px;color:#fff;">{{dog_name}}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 28px;font-size:14px;line-height:1.6;color:#2a2230;">
            <p style="margin:0 0 12px;color:#a61b38;"><strong>Follow-up reason:</strong> {{reason}}</p>
            <p style="margin:0 0 6px;"><strong>Owner:</strong> {{owner_name}}</p>
            <p style="margin:0 0 6px;"><strong>Email:</strong> {{owner_email}}</p>
            <p style="margin:0 0 6px;"><strong>Phone:</strong> {{owner_phone}}</p>
            <p style="margin:0 0 6px;"><strong>Expected fee:</strong> ${{amount}}</p>
            <p style="margin:0 0 6px;"><strong>Entry reference:</strong> {{entry_id}}</p>
            {{caption_html}}
            <p style="margin:12px 0 16px;"><a href="{{photo_url}}" style="color:#6f2270;">View submitted photo</a></p>
            <a href="{{dashboard_url}}" style="display:inline-block;background:#6f2270;color:#fff;text-decoration:none;font-weight:700;font-size:13px;padding:10px 18px;border-radius:999px;">Open campaign in dashboard</a>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>',
  'active',
  datetime('now'),
  datetime('now')
);
