import { escapeHtml, safeJson } from "./render_section.js";

const TENANT_ID = "tenant_companionscpas";
const DEFAULT_IMAGE = "https://assets.companionsofcaddo.org/static/cms/uploads/2026/07/1784219444043-wet-dog-comp..jpg";

function text(value) {
  return value == null ? "" : String(value).trim();
}

function esc(value) {
  return escapeHtml(value);
}

function safeUrl(value, fallback = "") {
  const raw = text(value);
  if (!raw) return fallback;
  if (raw.startsWith("/")) return raw;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") return parsed.toString();
  } catch {}
  return fallback;
}

async function loadCampaign(env, campaignId) {
  if (!env?.DB || !campaignId) return null;
  const row = await env.DB.prepare(`
    SELECT fc.*,
           COALESCE(ca.public_url, ca.cdn_url, ca.pub_url) AS asset_cover_url
    FROM fundraising_campaigns fc
    LEFT JOIN cms_assets ca ON ca.id = fc.cover_asset_id
    WHERE fc.id = ? AND (fc.tenant_id = ? OR fc.organization_id = ?)
    LIMIT 1
  `).bind(campaignId, TENANT_ID, TENANT_ID).first().catch(() => null);
  return row ? { ...row, config: safeJson(row.config_json, {}) } : null;
}

function highlightedHeading(heading, accentText) {
  const title = text(heading);
  const accent = text(accentText);
  if (!accent) return esc(title);
  const index = title.toLocaleLowerCase().indexOf(accent.toLocaleLowerCase());
  if (index < 0) return esc(title);
  return `${esc(title.slice(0, index))}<em>${esc(title.slice(index, index + accent.length))}</em>${esc(title.slice(index + accent.length))}`;
}

function uploadIcon() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/></svg>`;
}

function facebookIcon() {
  return `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.025 4.388 11.02 10.125 11.927v-8.438H7.078v-3.489h3.047V9.414c0-3.025 1.792-4.696 4.533-4.696 1.312 0 2.686.236 2.686.236v2.97H15.83c-1.491 0-1.956.93-1.956 1.885v2.264h3.328l-.532 3.489h-2.796V24C19.612 23.093 24 18.098 24 12.073Z"/></svg>`;
}

export async function renderCampaignEntryHero(section = {}, blocks = [], brand = {}, env = null) {
  const sectionConfig = safeJson(section?.config_json, {});
  const campaignId = text(sectionConfig.campaign_id);
  const campaign = await loadCampaign(env, campaignId);
  const campaignConfig = campaign?.config || {};
  const config = { ...campaignConfig, ...sectionConfig };
  const attachments = Array.isArray(campaignConfig.attachments) ? campaignConfig.attachments : [];
  const attachmentImage = attachments.find((item) => item?.type === "image" && item?.url)?.url;

  const heading = text(section.heading || config.public_heading || campaign?.title) || "Virtual Wet Dog Competition";
  const accentText = text(config.accent_text) || "Wet Dog";
  const eyebrow = text(section.eyebrow || config.eyebrow) || "Fundraiser — Benefiting Shelter Animals";
  const description = text(section.subheading || section.body || config.public_description || campaign?.description)
    || "Enter your soggiest pup for $10 and help support animals at Caddo Parish Animal Services. Upload one photo, complete your secure entry, then share the competition with friends.";
  const imageUrl = safeUrl(
    section.image_url || config.hero_image_url || campaign?.asset_cover_url || campaignConfig.cover_url || attachmentImage,
    DEFAULT_IMAGE
  );
  const imageAlt = text(config.image_alt) || "Two wet dogs in a bathtub during bath time";
  const imagePosition = text(config.image_position) || "center 45%";
  const feeCents = Math.max(100, Number(config.entry_fee_cents) || 1000);
  const feeLabel = `$${(feeCents / 100).toFixed(feeCents % 100 ? 2 : 0)}`;
  const feeExact = `$${(feeCents / 100).toFixed(2)}`;
  const primaryLabel = text(section.cta_label || config.primary_cta_label) || `Enter the Competition — ${feeLabel}`;
  const secondaryLabel = text(section.cta_secondary_label || config.secondary_cta_label) || "Share on Facebook";
  // Prefer the org's original Facebook post URL for the hero CTA (amplify the campaign post).
  // Falls back to facebook_share_url / share_url / site donate anchor.
  const DEFAULT_FB_POST =
    "https://www.facebook.com/permalink.php?story_fbid=pfbid02FijZY8jSJGdCD6Tg5pWo3mrrpqgytkS4FbBqCv6rYgFMgH1Ka8M9Yo9hUdCNNNoSl&id=100069291576354";
  const facebookPostUrl = safeUrl(
    config.facebook_post_url || campaignConfig.facebook_post_url || section.cta_secondary_href,
    DEFAULT_FB_POST
  );
  const shareUrl = safeUrl(
    config.facebook_share_url || config.share_url,
    facebookPostUrl
  );
  const shareMode = text(config.facebook_share_mode || "post").toLowerCase() === "sharer" ? "sharer" : "post";
  const metaLines = Array.isArray(config.meta_lines) && config.meta_lines.length
    ? config.meta_lines.map(text).filter(Boolean).slice(0, 4)
    : [
      "Voting open July 20–25",
      "Win a $200 Amazon Gift Card",
      "Every $10 entry directly supports shelter animals at Caddo Parish Animal Services.",
    ];
  const steps = Array.isArray(config.steps) && config.steps.length
    ? config.steps.slice(0, 3).map(text)
    : [
      "Upload your pet’s photo and details",
      `Pay the ${feeLabel} entry fee securely`,
      "Share the competition on Facebook",
    ];
  const sectionKey = text(section.section_key) || "campaign_entry_hero";
  const sectionId = `campaign-entry-${sectionKey.replace(/[^a-z0-9_-]+/gi, "-")}`;
  const modalId = `${sectionId}-modal`;

  return `
<style>
#${sectionId}{
  --campaign-accent:#6f2fa8;
  --campaign-accent-dark:#52217f;
  --campaign-accent-soft:#f3ecfa;
  --campaign-fb:#1877f2;
  --campaign-ink:#191722;
  --campaign-muted:#66616e;
  --campaign-line:rgba(70,45,90,.14);
  color:var(--campaign-ink);
  background:radial-gradient(circle at 12% 8%,rgba(111,47,168,.07),transparent 28rem),#fbfafc;
  padding:clamp(34px,6vw,82px) 20px 32px;
  font-family:var(--font-body,'DM Sans',system-ui,sans-serif);
}
#${sectionId} *{box-sizing:border-box}
#${sectionId} .ceh-shell{width:min(100%,1240px);margin:0 auto}
#${sectionId} .ceh-grid{display:grid;grid-template-columns:minmax(0,.88fr) minmax(470px,1.12fr);gap:clamp(42px,6vw,78px);align-items:center}
#${sectionId} .ceh-eyebrow{display:inline-flex;align-items:center;gap:10px;margin:0 0 18px;color:var(--campaign-accent);font-size:12px;font-weight:820;letter-spacing:.13em;text-transform:uppercase}
#${sectionId} .ceh-eyebrow::before{content:"";width:8px;height:8px;border-radius:50%;background:#f04f70;box-shadow:0 0 0 5px rgba(240,79,112,.11)}
#${sectionId} .ceh-title{margin:0;max-width:680px;font-family:var(--font-display,'Fraunces',Georgia,serif);font-size:clamp(48px,6vw,78px);line-height:.97;letter-spacing:-.045em;font-weight:700}
#${sectionId} .ceh-title em{color:var(--campaign-accent);font-style:italic;font-weight:500}
#${sectionId} .ceh-lede{max-width:560px;margin:22px 0 24px;color:var(--campaign-muted);font-size:clamp(16px,1.4vw,18px);line-height:1.65}
#${sectionId} .ceh-steps{display:grid;gap:12px;margin:0 0 28px;padding:0;list-style:none}
#${sectionId} .ceh-step{display:grid;grid-template-columns:28px 1fr;gap:12px;align-items:center;color:#2f2a33;font-size:15px;font-weight:700}
#${sectionId} .ceh-step span{display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:var(--campaign-accent-soft);color:var(--campaign-accent);font-size:12px;font-weight:800}
#${sectionId} .ceh-actions{display:flex;flex-wrap:wrap;gap:12px}
#${sectionId} .ceh-btn{min-height:48px;display:inline-flex;align-items:center;justify-content:center;gap:10px;padding:12px 18px;border:0;border-radius:14px;font:inherit;font-size:14px;font-weight:800;cursor:pointer;text-decoration:none;transition:transform .15s ease,background .15s ease}
#${sectionId} .ceh-btn:hover{transform:translateY(-1px)}
#${sectionId} .ceh-btn--primary{background:var(--campaign-accent);color:#fff}
#${sectionId} .ceh-btn--primary:hover{background:var(--campaign-accent-dark)}
#${sectionId} .ceh-btn--fb{background:var(--campaign-fb);color:#fff}
#${sectionId} .ceh-btn--quiet{background:#f4f1f6;color:#4d4454}
#${sectionId} .ceh-media{position:relative;min-height:clamp(360px,43vw,560px);margin:0;overflow:hidden;border-radius:34px;background:#e5e0dc;box-shadow:0 22px 70px rgba(52,25,69,.10)}
#${sectionId} .ceh-media img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:${esc(imagePosition)}}
#${sectionId} .ceh-meta{display:flex;flex-wrap:wrap;justify-content:flex-start;gap:8px 18px;margin:10px 4px 0;color:#706a73;font-size:12px}
#${sectionId} .ceh-meta strong{color:#2b2630}
#${modalId}{position:fixed;inset:0;z-index:1200;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(19,11,26,.66);backdrop-filter:blur(8px)}
#${modalId}[data-open="true"]{display:flex}
#${modalId} .ceh-panel{width:min(100%,720px);max-height:min(92vh,860px);overflow:auto;border-radius:28px;background:#fff;box-shadow:0 34px 110px rgba(20,8,31,.35)}
#${modalId} .ceh-panel-head{position:sticky;top:0;z-index:2;display:flex;justify-content:space-between;gap:16px;padding:22px 24px 16px;background:rgba(255,255,255,.96);backdrop-filter:blur(12px);border-bottom:1px solid var(--campaign-line)}
#${modalId} .ceh-kicker{margin:0 0 4px;color:var(--campaign-accent);font-size:11px;font-weight:850;letter-spacing:.12em;text-transform:uppercase}
#${modalId} .ceh-panel-title{margin:0;font-family:var(--font-display,'Fraunces',Georgia,serif);font-size:28px;letter-spacing:-.03em}
#${modalId} .ceh-close{width:36px;height:36px;border:0;border-radius:50%;background:#f4f1f5;color:#554b59;font-size:22px;line-height:1;cursor:pointer}
#${modalId} .ceh-panel-body{padding:22px 24px 24px}
#${modalId} .ceh-progress{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:18px}
#${modalId} .ceh-progress-item{display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:12px;background:#f4f1f6;color:#7a727f;font-size:13px;font-weight:700}
#${modalId} .ceh-progress-item[data-active="true"]{background:var(--campaign-accent-soft);color:var(--campaign-accent)}
#${modalId} .ceh-progress-num{display:grid;place-items:center;width:22px;height:22px;border-radius:50%;background:#fff;font-size:11px;font-weight:850}
#${modalId} .ceh-error{display:none;margin:0 0 14px;padding:10px 12px;border:1px solid rgba(180,35,61,.2);border-radius:12px;background:rgba(180,35,61,.06);color:#b4233d;font-size:13px}
#${modalId} .ceh-error[data-show="true"]{display:block}
#${modalId} .ceh-grid-fields{display:grid;grid-template-columns:1fr 1fr;gap:14px}
#${modalId} .ceh-field{display:grid;gap:6px}
#${modalId} .ceh-field--full{grid-column:1/-1}
#${modalId} .ceh-field label{color:#504751;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
#${modalId} .ceh-field label span{color:#d3447b}
#${modalId} .ceh-field input,#${modalId} .ceh-field textarea{width:100%;border:1.5px solid #ddd6df;border-radius:12px;padding:12px 14px;background:#fff;color:#211b25;font:inherit;font-size:15px;outline:none}
#${modalId} .ceh-field textarea{min-height:84px;resize:vertical}
#${modalId} .ceh-field input:focus,#${modalId} .ceh-field textarea:focus{border-color:var(--campaign-accent);box-shadow:0 0 0 3px rgba(111,47,168,.12)}
#${modalId} .ceh-upload{display:grid;grid-template-columns:72px 1fr;gap:14px;align-items:center;min-height:96px;padding:14px;border:1.5px dashed rgba(111,47,168,.35);border-radius:16px;background:#fcfaff;cursor:pointer}
#${modalId} .ceh-upload:hover{border-color:var(--campaign-accent);background:#f8f2fc}
#${modalId} .ceh-upload-preview{display:grid;place-items:center;width:72px;height:72px;overflow:hidden;border-radius:14px;background:var(--campaign-accent-soft);color:var(--campaign-accent)}
#${modalId} .ceh-upload-preview img{display:none;width:100%;height:100%;object-fit:cover}
#${modalId} .ceh-upload strong{display:block;color:var(--campaign-accent);font-size:14px}
#${modalId} .ceh-upload small{display:block;margin-top:4px;color:#817783;font-size:12px;line-height:1.4}
#${modalId} .ceh-consent{display:flex;gap:10px;align-items:flex-start;margin-top:4px;color:#6f6672;font-size:13px;line-height:1.45}
#${modalId} .ceh-consent input{margin-top:3px;accent-color:var(--campaign-accent)}
#${modalId} .ceh-footer{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:18px}
#${modalId} .ceh-summary{display:grid;grid-template-columns:88px 1fr;gap:14px;align-items:center;padding:14px;border:1px solid var(--campaign-line);border-radius:16px;margin-bottom:16px}
#${modalId} .ceh-summary img{width:88px;height:88px;object-fit:cover;border-radius:14px;background:#eee}
#${modalId} .ceh-summary h3{margin:0 0 4px;font-size:20px}
#${modalId} .ceh-summary p{margin:0;color:#756c78;font-size:13px}
#${modalId} .ceh-handoff{padding:16px;border-radius:16px;background:var(--campaign-accent-soft)}
#${modalId} .ceh-handoff-top{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:8px}
#${modalId} .ceh-handoff-amount{font-family:var(--font-display,'Fraunces',Georgia,serif);font-size:28px;color:var(--campaign-accent)}
#${modalId} .ceh-handoff p{margin:0;color:#5d5163;font-size:13px;line-height:1.5}
@media(max-width:900px){
  #${sectionId} .ceh-grid{grid-template-columns:1fr}
  #${sectionId} .ceh-media{order:-1;min-height:clamp(320px,68vw,520px);border-radius:24px}
}
@media(max-width:640px){
  #${sectionId}{padding:24px 14px}
  #${sectionId} .ceh-actions,#${modalId} .ceh-grid-fields{display:grid;grid-template-columns:1fr}
  #${sectionId} .ceh-btn,#${modalId} .ceh-btn{width:100%}
  #${sectionId} .ceh-meta,#${modalId} .ceh-footer{display:grid}
  #${modalId}{align-items:flex-end;padding:0}
  #${modalId} .ceh-panel{border-radius:22px 22px 0 0;max-height:94vh}
}
</style>
<section id="${sectionId}"
  class="campaign-entry-hero"
  data-section-key="${esc(sectionKey)}"
  data-campaign-id="${esc(campaignId)}"
  data-entry-fee-cents="${feeCents}"
  data-share-url="${esc(shareUrl)}">
  <div class="ceh-shell">
    <div class="ceh-grid">
      <div>
        <p class="ceh-eyebrow">${esc(eyebrow)}</p>
        <h1 class="ceh-title">${highlightedHeading(heading, accentText)}</h1>
        <p class="ceh-lede">${esc(description)}</p>
        <ol class="ceh-steps" aria-label="How to enter">
          ${steps.map((step, i) => `<li class="ceh-step"><span>${i + 1}</span>${esc(step)}</li>`).join("")}
        </ol>
        <div class="ceh-actions">
          <button class="ceh-btn ceh-btn--primary" type="button" data-ceh-open>${uploadIcon()}<span>${esc(primaryLabel)}</span></button>
          <button class="ceh-btn ceh-btn--fb" type="button" data-ceh-share data-share-mode="${esc(shareMode)}" data-share-url="${esc(shareUrl)}" data-facebook-post-url="${esc(facebookPostUrl)}">${facebookIcon()}<span>${esc(secondaryLabel)}</span></button>
        </div>
      </div>
      <div>
        <figure class="ceh-media">
          <img src="${esc(imageUrl)}" alt="${esc(imageAlt)}" decoding="async" fetchpriority="high">
        </figure>
        <div class="ceh-meta">
          ${metaLines.map((line) => {
            let out = esc(line);
            out = out.replace("July 20–25", "<strong>July 20–25</strong>");
            out = out.replace("$200 Amazon Gift Card", "<strong>$200 Amazon Gift Card</strong>");
            return `<span>${out}</span>`;
          }).join("")}
        </div>
      </div>
    </div>
  </div>

  <div id="${modalId}" class="ceh-modal" role="dialog" aria-modal="true" aria-labelledby="${modalId}-title" data-open="false">
    <div class="ceh-panel">
      <header class="ceh-panel-head">
        <div>
          <p class="ceh-kicker">${esc(heading)}</p>
          <h2 class="ceh-panel-title" id="${modalId}-title">Enter your pet</h2>
        </div>
        <button class="ceh-close" type="button" data-ceh-close aria-label="Close">×</button>
      </header>
      <div class="ceh-panel-body">
        <div class="ceh-progress" aria-label="Entry progress">
          <div class="ceh-progress-item" data-ceh-progress="entry" data-active="true"><span class="ceh-progress-num">1</span>Pet entry</div>
          <div class="ceh-progress-item" data-ceh-progress="payment"><span class="ceh-progress-num">2</span>Secure payment</div>
        </div>
        <p class="ceh-error" data-ceh-error></p>
        <form data-ceh-form novalidate>
          <section data-ceh-step="entry">
            <div class="ceh-grid-fields">
              <div class="ceh-field"><label for="${modalId}-first">First name <span>*</span></label><input id="${modalId}-first" name="owner_first_name" autocomplete="given-name" inputmode="text" pattern="[A-Za-z]+(?:['-][A-Za-z]+)*" maxlength="40" required placeholder="Letters only"></div>
              <div class="ceh-field"><label for="${modalId}-last">Last name <span>*</span></label><input id="${modalId}-last" name="owner_last_name" autocomplete="family-name" inputmode="text" pattern="[A-Za-z]+(?:['-][A-Za-z]+)*" maxlength="40" required placeholder="Letters only"></div>
              <div class="ceh-field"><label for="${modalId}-phone">Phone number <span>*</span></label><input id="${modalId}-phone" name="owner_phone" type="tel" autocomplete="tel" inputmode="numeric" maxlength="14" required placeholder="10-digit US phone"></div>
              <div class="ceh-field"><label for="${modalId}-email">Email address <span>*</span></label><input id="${modalId}-email" name="owner_email" type="email" autocomplete="email" required placeholder="name@example.com"></div>
              <div class="ceh-field ceh-field--full"><label for="${modalId}-pet">Pet’s name <span>*</span></label><input id="${modalId}-pet" name="dog_name" required maxlength="60"></div>
              <div class="ceh-field ceh-field--full">
                <label>Pet photo <span>*</span></label>
                <label class="ceh-upload" for="${modalId}-photo">
                  <span class="ceh-upload-preview">
                    <svg data-ceh-photo-placeholder width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
                    <img data-ceh-photo-preview alt="Selected pet photo preview">
                  </span>
                  <span>
                    <strong>Choose one wet-dog photo</strong>
                    <small>JPG, PNG, WEBP, or HEIC (iPhone). Previewed before payment, then reviewed by the team.</small>
                  </span>
                </label>
                <input id="${modalId}-photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" required hidden>
              </div>
              <div class="ceh-field ceh-field--full">
                <label for="${modalId}-caption">Short caption</label>
                <textarea id="${modalId}-caption" name="caption" maxlength="240" placeholder="Optional: tell us what was happening in the photo."></textarea>
              </div>
              <label class="ceh-consent ceh-field--full">
                <input name="photo_consent" type="checkbox" value="1" required>
                <span>I confirm that I have permission to submit this photo and allow Companions of Caddo to display or share it for this fundraiser. <strong>Required.</strong></span>
              </label>
            </div>
            <div class="ceh-footer">
              <span style="color:#7a727f;font-size:12px">Fields marked * are required.</span>
              <button class="ceh-btn ceh-btn--primary" type="button" data-ceh-continue>Continue to Secure Payment</button>
            </div>
          </section>
          <section data-ceh-step="payment" hidden>
            <div class="ceh-summary">
              <img data-ceh-summary-photo alt="">
              <div>
                <p style="margin:0 0 4px;color:#7b7280;font-size:11px;font-weight:850;letter-spacing:.1em;text-transform:uppercase">Entry summary</p>
                <h3 data-ceh-summary-pet>Your pet</h3>
                <p data-ceh-summary-owner></p>
                <p data-ceh-summary-contact></p>
              </div>
            </div>
            <div class="ceh-handoff">
              <div class="ceh-handoff-top">
                <strong>Competition entry fee</strong>
                <span class="ceh-handoff-amount">${esc(feeExact)}</span>
              </div>
              <p>We’ll save your pending entry and photo, then open a dedicated ${esc(feeLabel)} Stripe checkout. This is a one-time competition fee with no donation tiers or recurring option.</p>
            </div>
            <div class="ceh-footer">
              <button class="ceh-btn ceh-btn--quiet" type="button" data-ceh-back>Back to entry</button>
              <button class="ceh-btn ceh-btn--primary" type="button" data-ceh-pay>Open Secure Stripe Checkout</button>
            </div>
          </section>
        </form>
      </div>
    </div>
  </div>
</section>
<script>
(() => {
  const root = document.getElementById(${JSON.stringify(sectionId)});
  if (!root || root.dataset.cehReady === "1") return;
  root.dataset.cehReady = "1";

  const campaignId = root.dataset.campaignId || "";
  const feeCents = Number(root.dataset.entryFeeCents || 1000);
  const shareUrl = root.dataset.shareUrl || location.href;
  const modal = document.getElementById(${JSON.stringify(modalId)});
  const form = root.querySelector("[data-ceh-form]");
  const errorEl = root.querySelector("[data-ceh-error]");
  const photoInput = root.querySelector('input[name="photo"]');
  const photoPreview = root.querySelector("[data-ceh-photo-preview]");
  const photoPlaceholder = root.querySelector("[data-ceh-photo-placeholder]");
  const summaryPhoto = root.querySelector("[data-ceh-summary-photo]");
  const titleEl = document.getElementById(${JSON.stringify(modalId + "-title")});
  let objectUrl = "";
  let paying = false;

  function setError(message) {
    errorEl.textContent = message || "";
    errorEl.dataset.show = message ? "true" : "false";
  }

  function setStep(step) {
    root.querySelectorAll("[data-ceh-step]").forEach((node) => {
      node.hidden = node.dataset.cehStep !== step;
    });
    root.querySelectorAll("[data-ceh-progress]").forEach((node) => {
      node.dataset.active = node.dataset.cehProgress === step ? "true" : "false";
    });
    if (titleEl) titleEl.textContent = step === "entry" ? "Enter your pet" : "Review and pay";
    setError("");
  }

  const ALPHA_NAME = /^[A-Za-z]+(?:['-][A-Za-z]+)*$/;
  const EMAIL_RE = /^[A-Za-z0-9.!#$%&'*+/=?^_\`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;
  const ALLOWED_PHOTO = /^(image\\/(jpeg|jpg|png|webp|heic|heif))$/i;

  function digitsOnly(value) {
    return String(value || "").replace(/\\D/g, "");
  }

  function ownerFullName() {
    const first = String(form.elements.namedItem("owner_first_name")?.value || "").trim();
    const last = String(form.elements.namedItem("owner_last_name")?.value || "").trim();
    return [first, last].filter(Boolean).join(" ");
  }

  function openModal() {
    modal.dataset.open = "true";
    document.body.style.overflow = "hidden";
    setStep("entry");
    setTimeout(() => root.querySelector('input[name="owner_first_name"]')?.focus(), 40);
  }

  function closeModal() {
    modal.dataset.open = "false";
    document.body.style.overflow = "";
    setError("");
  }

  function validateEntry() {
    const firstField = form.elements.namedItem("owner_first_name");
    const lastField = form.elements.namedItem("owner_last_name");
    const phoneField = form.elements.namedItem("owner_phone");
    const emailField = form.elements.namedItem("owner_email");
    const petField = form.elements.namedItem("dog_name");
    const first = String(firstField?.value || "").trim();
    const last = String(lastField?.value || "").trim();
    const phoneDigits = digitsOnly(phoneField?.value);
    const email = String(emailField?.value || "").trim().toLowerCase();
    const pet = String(petField?.value || "").trim();

    if (!first || !ALPHA_NAME.test(first)) {
      firstField?.focus?.();
      setError("First name is required and may only include letters A–Z (hyphen or apostrophe allowed).");
      return false;
    }
    if (!last || !ALPHA_NAME.test(last)) {
      lastField?.focus?.();
      setError("Last name is required and may only include letters A–Z (hyphen or apostrophe allowed).");
      return false;
    }
    if (phoneDigits.length !== 10) {
      phoneField?.focus?.();
      setError("Phone number must be exactly 10 digits.");
      return false;
    }
    if (!email || !EMAIL_RE.test(email)) {
      emailField?.focus?.();
      setError("Enter a valid email address (example: name@example.com).");
      return false;
    }
    if (!pet) {
      petField?.focus?.();
      setError("Pet’s name is required.");
      return false;
    }
    if (!photoInput.files || !photoInput.files[0]) {
      setError("Choose one pet photo before continuing.");
      return false;
    }
    const file = photoInput.files[0];
    const mime = String(file.type || "").toLowerCase();
    const name = String(file.name || "").toLowerCase();
    const heicByExt = name.endsWith(".heic") || name.endsWith(".heif");
    if (mime && !ALLOWED_PHOTO.test(mime) && !heicByExt) {
      setError("Photo must be JPG, PNG, WEBP, or HEIC.");
      return false;
    }
    if (!mime && !heicByExt) {
      setError("Photo must be JPG, PNG, WEBP, or HEIC.");
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Photo must be under 10 MB.");
      return false;
    }
    if (!form.elements.namedItem("photo_consent")?.checked) {
      setError("Photo-use consent is required before continuing.");
      return false;
    }
    if (phoneField) phoneField.value = phoneDigits.replace(/(\\d{3})(\\d{3})(\\d{4})/, "($1) $2-$3");
    if (emailField) emailField.value = email;
    return true;
  }

  function populateSummary() {
    const pet = String(form.elements.namedItem("dog_name").value || "").trim();
    const owner = ownerFullName();
    const email = String(form.elements.namedItem("owner_email").value || "").trim();
    const phone = String(form.elements.namedItem("owner_phone").value || "").trim();
    root.querySelector("[data-ceh-summary-pet]").textContent = pet;
    root.querySelector("[data-ceh-summary-owner]").textContent = "Submitted by " + owner;
    root.querySelector("[data-ceh-summary-contact]").textContent = email + " · " + phone;
    if (objectUrl) summaryPhoto.src = objectUrl;
  }

  async function openStripeCheckout() {
    if (paying) return;
    if (!validateEntry()) {
      setStep("entry");
      return;
    }
    paying = true;
    const payBtn = root.querySelector("[data-ceh-pay]");
    if (payBtn) {
      payBtn.disabled = true;
      payBtn.textContent = "Saving entry…";
    }
    setError("");

    try {
      if (!campaignId) throw new Error("This section is missing a campaign_id in CMS config.");
      const first = String(form.elements.namedItem("owner_first_name").value || "").trim();
      const last = String(form.elements.namedItem("owner_last_name").value || "").trim();
      const ownerName = ownerFullName();
      const phoneDigits = digitsOnly(form.elements.namedItem("owner_phone").value);
      const donorEmail = String(form.elements.namedItem("owner_email").value || "").trim().toLowerCase();
      const petName = String(form.elements.namedItem("dog_name").value || "").trim();

      const payload = new FormData();
      payload.set("campaign_id", campaignId);
      payload.set("entry_fee_cents", String(feeCents));
      payload.set("owner_first_name", first);
      payload.set("owner_last_name", last);
      payload.set("owner_name", ownerName);
      payload.set("owner_phone", phoneDigits);
      payload.set("owner_email", donorEmail);
      payload.set("dog_name", petName);
      payload.set("caption", String(form.elements.namedItem("caption").value || "").trim());
      payload.set("photo_consent", "1");
      payload.set("category", "general");
      payload.set("photo", photoInput.files[0]);

      const res = await fetch("/api/public/competition-entries", { method: "POST", body: payload });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok || !data.entry_id) {
        throw new Error(data.error || "Could not save your entry.");
      }

      const note = "Wet Dog Competition entry — " + petName + " (" + data.entry_id + ")";

      closeModal();

      if (window.CompetitionEntryPaymentModal?.open) {
        window.CompetitionEntryPaymentModal.open({
          amount_cents: feeCents,
          campaign_id: campaignId,
          entry_id: data.entry_id,
          donor_email: donorEmail,
          donor_name: ownerName,
          dog_name: petName,
          note,
        });
      } else {
        throw new Error("The competition payment form is still loading. Please wait a moment and try again.");
      }
    } catch (err) {
      setError(err?.message || "Could not continue to payment.");
    } finally {
      paying = false;
      if (payBtn) {
        payBtn.disabled = false;
        payBtn.textContent = "Open Secure Stripe Checkout";
      }
    }
  }

  root.querySelector("[data-ceh-open]")?.addEventListener("click", openModal);
  root.querySelectorAll("[data-ceh-close]").forEach((btn) => btn.addEventListener("click", closeModal));
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.dataset.open === "true") closeModal();
  });
  root.querySelector("[data-ceh-share]")?.addEventListener("click", () => {
    const btn = root.querySelector("[data-ceh-share]");
    const mode = (btn?.getAttribute("data-share-mode") || "post").toLowerCase();
    const postUrl = btn?.getAttribute("data-facebook-post-url") || ${JSON.stringify(facebookPostUrl)};
    const fallbackShare = btn?.getAttribute("data-share-url") || ${JSON.stringify(shareUrl)};
    if (mode === "sharer") {
      window.open(
        "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(fallbackShare),
        "facebook-share",
        "popup=yes,width=720,height=640,noopener,noreferrer"
      );
      return;
    }
    // Default: open the original campaign Facebook post so staff/public can reshare it.
    window.open(postUrl, "facebook-post", "noopener,noreferrer");
  });
  root.querySelector("[data-ceh-continue]")?.addEventListener("click", () => {
    if (!validateEntry()) return;
    populateSummary();
    setStep("payment");
  });
  root.querySelector("[data-ceh-back]")?.addEventListener("click", () => setStep("entry"));
  root.querySelector("[data-ceh-pay]")?.addEventListener("click", openStripeCheckout);
  photoInput?.addEventListener("change", () => {
    const file = photoInput.files && photoInput.files[0];
    if (!file) return;
    const mime = String(file.type || "").toLowerCase();
    const name = String(file.name || "").toLowerCase();
    const isHeic = mime.includes("heic") || mime.includes("heif") || name.endsWith(".heic") || name.endsWith(".heif");
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(file);
    if (isHeic) {
      // Many browsers cannot preview HEIC — still accept the file for upload
      photoPreview.removeAttribute("src");
      photoPreview.style.display = "none";
      if (photoPlaceholder) photoPlaceholder.style.display = "block";
      setError("");
      return;
    }
    photoPreview.src = objectUrl;
    photoPreview.style.display = "block";
    if (photoPlaceholder) photoPlaceholder.style.display = "none";
    setError("");
  });
})();
</script>`;
}

export const CAMPAIGN_ENTRY_HERO_DEFAULTS = {
  entry_fee_cents: 1000,
  accent_text: "Wet Dog",
  secondary_cta_label: "Share on Facebook",
  image_position: "center 45%",
};
