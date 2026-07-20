/**
 * Public resume-pay page for unpaid Wet Dog (etc.) competition entries.
 * URL: /wet-dog/pay/:token
 */

import {
  SHELL_VERSION,
  COMPETITION_PAYMENT_MODAL_VERSION,
  brandTokensStylesheetTag,
} from "./page_shell.js";

const TENANT_ID = "tenant_companionscpas";
const SITE = "https://companionsofcaddo.org";
const SHELL_CSS = "/static/global/cpas-shell.css";

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function competitionResumePayPath(token) {
  return `/wet-dog/pay/${encodeURIComponent(token)}`;
}

export function competitionResumePayUrl(token) {
  return `${SITE}${competitionResumePayPath(token)}`;
}

export function newResumePayToken() {
  return crypto.randomUUID().replace(/-/g, "");
}

export async function ensureResumePayToken(env, entryId) {
  const row = await env.DB.prepare(`
    SELECT id, resume_pay_token, payment_status, archived_at
    FROM competition_entries
    WHERE id = ? AND tenant_id = ?
    LIMIT 1
  `).bind(entryId, TENANT_ID).first().catch(() => null);
  if (!row?.id) return null;
  if (row.resume_pay_token) return row.resume_pay_token;
  const token = newResumePayToken();
  await env.DB.prepare(`
    UPDATE competition_entries
    SET resume_pay_token = ?, updated_at = datetime('now')
    WHERE id = ? AND tenant_id = ? AND resume_pay_token IS NULL
  `).bind(token, entryId, TENANT_ID).run();
  const again = await env.DB.prepare(`
    SELECT resume_pay_token FROM competition_entries WHERE id = ? AND tenant_id = ? LIMIT 1
  `).bind(entryId, TENANT_ID).first().catch(() => null);
  return again?.resume_pay_token || token;
}

export async function loadEntryByResumeToken(env, token) {
  if (!token) return null;
  return env.DB.prepare(`
    SELECT ce.id, ce.campaign_id, ce.dog_name, ce.owner_name, ce.owner_email,
           ce.expected_amount_cents, ce.payment_status, ce.submission_status,
           ce.moderation_status, ce.archived_at, ce.resume_pay_token, ce.photo_url,
           fc.title AS campaign_title, fc.status AS campaign_status, fc.is_public
    FROM competition_entries ce
    JOIN fundraising_campaigns fc ON fc.id = ce.campaign_id
    WHERE ce.resume_pay_token = ? AND ce.tenant_id = ?
    LIMIT 1
  `).bind(token, TENANT_ID).first().catch(() => null);
}

export async function serveCompetitionResumePay(token, env) {
  const entry = await loadEntryByResumeToken(env, token);
  if (!entry?.id) {
    return new Response(simplePage("Link not found", "This payment link is invalid or expired."), {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  if (entry.archived_at) {
    return new Response(simplePage("Entry closed", "This competition entry is no longer accepting payment."), {
      status: 410,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  if (entry.payment_status === "paid") {
    return Response.redirect(`${SITE}/wet-dog/${encodeURIComponent(entry.id)}`, 302);
  }

  const fee = Math.max(100, Number(entry.expected_amount_cents) || 1000);
  const dog = entry.dog_name || "your pet";
  const note = `Wet Dog Competition entry — ${dog} (${entry.id})`;
  const bootstrap = {
    entry_id: entry.id,
    campaign_id: entry.campaign_id,
    amount_cents: fee,
    donor_email: entry.owner_email,
    donor_name: entry.owner_name || "",
    dog_name: dog,
    note,
  };

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <meta name="robots" content="noindex,nofollow"/>
  <title>Complete ${esc(dog)}’s entry · Companions of CPAS</title>
  <link rel="stylesheet" href="${SHELL_CSS}?v=${SHELL_VERSION}">
  ${brandTokensStylesheetTag()}
  <style>
    body{margin:0;min-height:100vh;background:linear-gradient(160deg,#f7f2ea,#efe6f3 55%,#f4eef8);font-family:"DM Sans",system-ui,sans-serif;color:#211b25}
    .rp-wrap{max-width:520px;margin:0 auto;padding:48px 20px 80px}
    .rp-card{border-radius:22px;background:#fff;border:1px solid rgba(79,40,87,.12);box-shadow:0 18px 50px rgba(33,16,40,.1);overflow:hidden}
    .rp-head{padding:28px 24px 20px;background:linear-gradient(145deg,#6f2270,#4e1a52);color:#fff;text-align:center}
    .rp-head h1{margin:0;font-family:"Fraunces",Georgia,serif;font-size:28px;line-height:1.15}
    .rp-head p{margin:10px 0 0;opacity:.85;font-size:14px}
    .rp-body{padding:22px 24px 28px}
    .rp-photo{width:100%;max-height:220px;object-fit:cover;border-radius:14px;display:block;margin-bottom:16px;background:#efeae4}
    .rp-meta{font-size:14px;color:#5d5163;line-height:1.55;margin:0 0 18px}
    .rp-btn{display:inline-flex;align-items:center;justify-content:center;width:100%;min-height:48px;border:0;border-radius:12px;background:#6f2270;color:#fff;font:800 15px "DM Sans",system-ui,sans-serif;cursor:pointer}
    .rp-btn:hover{background:#5a1d5c}
    .rp-hint{margin:14px 0 0;text-align:center;font-size:12px;color:#786d7c}
  </style>
</head>
<body>
  <main class="rp-wrap">
    <div class="rp-card">
      <header class="rp-head">
        <h1>Finish ${esc(dog)}’s entry</h1>
        <p>${esc(entry.campaign_title || "Wet Dog Competition")} · $${(fee / 100).toFixed(2)} one-time</p>
      </header>
      <div class="rp-body">
        ${entry.photo_url ? `<img class="rp-photo" src="${esc(entry.photo_url)}" alt="${esc(dog)}"/>` : ""}
        <p class="rp-meta">Complete payment to publish <strong>${esc(dog)}</strong>.</p>
        <button type="button" class="rp-btn" id="rp-open">Pay $${(fee / 100).toFixed(2)} to finish entry</button>
        <p class="rp-hint">Confirmation email: ${esc(entry.owner_email)}</p>
      </div>
    </div>
  </main>
  <script src="/static/js/competition-entry-payment-modal.js?v=${COMPETITION_PAYMENT_MODAL_VERSION}" defer></script>
  <script>
    (function () {
      var payload = ${JSON.stringify(bootstrap)};
      function openPay() {
        if (window.CompetitionEntryPaymentModal && window.CompetitionEntryPaymentModal.open) {
          window.CompetitionEntryPaymentModal.open(Object.assign({}, payload, {
            pay_url: location.href,
          }));
          return true;
        }
        return false;
      }
      document.getElementById("rp-open")?.addEventListener("click", function () {
        if (!openPay()) alert("Payment form is still loading — try again in a moment.");
      });
      function tryAuto() {
        if (openPay()) return;
        setTimeout(tryAuto, 120);
      }
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () { setTimeout(tryAuto, 80); });
      } else {
        setTimeout(tryAuto, 80);
      }
    })();
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function simplePage(title, message) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${esc(title)}</title></head>
<body style="margin:0;font-family:system-ui,sans-serif;background:#f7f2ea;color:#211b25">
<main style="max-width:480px;margin:72px auto;padding:24px;border-radius:16px;background:#fff;border:1px solid #e8e0ea">
<h1 style="margin:0 0 10px;font-size:22px">${esc(title)}</h1>
<p style="margin:0;line-height:1.5;color:#5d5163">${esc(message)}</p>
<p style="margin:18px 0 0"><a href="${SITE}/donate">Back to donate</a></p>
</main></body></html>`;
}
