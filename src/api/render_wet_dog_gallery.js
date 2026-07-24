import { escapeHtml, safeJson } from "./render_section.js";

const TENANT_ID = "tenant_companionscpas";

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
    SELECT id, title, is_public, status, config_json
    FROM fundraising_campaigns
    WHERE id = ? AND (tenant_id = ? OR organization_id = ?)
    LIMIT 1
  `).bind(campaignId, TENANT_ID, TENANT_ID).first().catch(() => null);
  return row ? { ...row, config: safeJson(row.config_json, {}) } : null;
}

async function loadApprovedEntries(env, campaignId, limit = 60) {
  if (!env?.DB || !campaignId) return [];
  const rows = await env.DB.prepare(`
    SELECT id, dog_name, caption, photo_url, category, vote_count
    FROM competition_entries
    WHERE campaign_id = ? AND tenant_id = ?
      AND payment_status = 'paid' AND is_approved = 1 AND archived_at IS NULL
    ORDER BY vote_count DESC, created_at DESC
    LIMIT ?
  `).bind(campaignId, TENANT_ID, limit).all().catch(() => ({ results: [] }));
  return rows?.results || [];
}

function facebookIcon() {
  return `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>`;
}

export async function renderWetDogGallery(section = {}, blocks = [], brand = {}, env = null) {
  const config = safeJson(section?.config_json, {});
  const campaignId = text(config.campaign_id);
  const campaign = await loadCampaign(env, campaignId);
  const entries = await loadApprovedEntries(env, campaignId);

  const heading = text(section.heading || config.public_heading) || "Meet the Entries";
  const eyebrow = text(section.eyebrow || config.eyebrow) || (campaign?.title || "Wet Dog Competition");
  const description = text(section.subheading || section.body || config.public_description)
    || "Every approved entry is here. Tap a photo for a larger preview, then share your favorite.";
  const entryShareBase = "https://companionsofcaddo.org/wet-dog/";
  const sectionKey = text(section.section_key) || "wet_dog_gallery";
  const sectionId = `wdg-${sectionKey.replace(/[^a-z0-9_-]+/gi, "-")}`;

  const votingOpen = Number(campaign?.is_public) === 1 && campaign?.status === "active";

  const cards = entries.map((entry) => {
    const photo = safeUrl(entry.photo_url);
    const dogName = text(entry.dog_name) || "Untitled";
    const caption = text(entry.caption);
    const captionHtml = caption ? `<p class="wdg-caption">"${esc(caption)}"</p>` : "";
    const votes = Number(entry.vote_count) || 0;
    const entryShareUrl = entryShareBase + encodeURIComponent(entry.id);
    return `
    <article class="wdg-card" data-entry-id="${esc(entry.id)}"
      data-dog-name="${esc(dogName)}"
      data-caption="${esc(caption)}"
      data-photo-url="${esc(photo)}"
      data-vote-count="${votes}"
      data-share-url="${esc(entryShareUrl)}">
      <button type="button" class="wdg-photo" data-wdg-open aria-label="Preview ${esc(dogName)}">
        ${photo
          ? `<img src="${esc(photo)}" alt="${esc(dogName)}" loading="lazy" decoding="async">`
          : `<div class="wdg-photo-ph" aria-hidden="true">No photo</div>`}
        <span class="wdg-photo-hint">View</span>
      </button>
      <div class="wdg-body">
        <h3 class="wdg-name">${esc(dogName)}</h3>
        ${captionHtml}
        <div class="wdg-actions">
          <button type="button" class="wdg-share-btn" data-wdg-share data-entry-id="${esc(entry.id)}" data-dog-name="${esc(dogName)}">
            ${facebookIcon()}
            <span>Share</span>
          </button>
        </div>
      </div>
    </article>`.trim();
  }).join("");

  const emptyState = `<p class="wdg-empty">Entries are still being reviewed — check back soon to see them here.</p>`;
  const closedNotice = !votingOpen
    ? `<p class="wdg-closed-note">This gallery isn't open yet — check back soon.</p>`
    : "";

  return `
<style>
#${sectionId}{
  --wdg-accent:#6f2fa8;
  --wdg-accent-dark:#52217f;
  --wdg-fb:#1877f2;
  --wdg-ink:#191722;
  --wdg-muted:#66616e;
  --wdg-line:rgba(70,45,90,.14);
  color:var(--wdg-ink);
  background:#fbfafc;
  padding:clamp(34px,6vw,72px) 20px;
  font-family:var(--font-body,'DM Sans',system-ui,sans-serif);
}
#${sectionId} *{box-sizing:border-box}
#${sectionId} .wdg-shell{width:min(100%,1240px);margin:0 auto}
#${sectionId} .wdg-head{max-width:680px;margin:0 auto 28px;text-align:center}
#${sectionId} .wdg-eyebrow{margin:0 0 10px;color:var(--wdg-accent);font-size:12px;font-weight:820;letter-spacing:.13em;text-transform:uppercase}
#${sectionId} .wdg-heading{margin:0 0 12px;font-family:var(--font-display,'Fraunces',Georgia,serif);font-size:clamp(30px,4vw,44px);letter-spacing:-.03em;line-height:1.05}
#${sectionId} .wdg-desc{margin:0;color:var(--wdg-muted);font-size:15px;line-height:1.6}
#${sectionId} .wdg-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:18px;align-items:start}
#${sectionId} .wdg-card{border-radius:16px;overflow:hidden;background:#fff;border:1px solid var(--wdg-line);box-shadow:0 2px 10px rgba(26,22,34,.06);display:flex;flex-direction:column}
#${sectionId} .wdg-photo{position:relative;display:block;width:100%;margin:0;padding:0;border:0;background:#efeae4;cursor:pointer;min-height:180px}
#${sectionId} .wdg-photo img{width:100%;height:auto;max-height:360px;object-fit:contain;object-position:center;display:block;background:#efeae4}
#${sectionId} .wdg-photo-ph{min-height:180px;display:flex;align-items:center;justify-content:center;color:#bbb;font-size:12px}
#${sectionId} .wdg-photo-hint{position:absolute;right:8px;bottom:8px;padding:4px 9px;border-radius:999px;background:rgba(255,255,255,.92);color:var(--wdg-ink);font-size:11px;font-weight:700;opacity:0;transition:opacity .15s ease}
#${sectionId} .wdg-photo:hover .wdg-photo-hint,#${sectionId} .wdg-photo:focus-visible .wdg-photo-hint{opacity:1}
#${sectionId} .wdg-body{padding:12px 14px 14px;display:flex;flex-direction:column;gap:6px}
#${sectionId} .wdg-name{margin:0;font-size:16px;font-weight:800}
#${sectionId} .wdg-caption{margin:0;font-size:12px;font-style:italic;color:var(--wdg-muted);line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
#${sectionId} .wdg-actions{margin-top:auto;padding-top:8px;display:flex;gap:8px}
#${sectionId} .wdg-vote-btn,#${sectionId} .wdg-share-btn,#${sectionId} .wdg-lb-vote,#${sectionId} .wdg-lb-share{display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border-radius:999px;border:1.5px solid var(--wdg-line);background:transparent;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .15s ease}
#${sectionId} .wdg-share-btn,#${sectionId} .wdg-lb-share{color:var(--wdg-fb);border-color:rgba(24,119,242,.3);flex:1;justify-content:center}
#${sectionId} .wdg-share-btn:hover,#${sectionId} .wdg-lb-share:hover{background:rgba(24,119,242,.07)}
#${sectionId} .wdg-empty,#${sectionId} .wdg-closed-note{text-align:center;color:var(--wdg-muted);font-size:14px;padding:24px 0}
#${sectionId} .wdg-lightbox{position:fixed;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(18,12,24,.72);backdrop-filter:blur(6px)}
#${sectionId} .wdg-lightbox[data-open="true"]{display:flex}
#${sectionId} .wdg-lb-panel{width:min(100%,720px);max-height:min(92vh,900px);overflow:auto;border-radius:22px;background:#fff;box-shadow:0 28px 90px rgba(10,6,18,.35)}
#${sectionId} .wdg-lb-media{background:#111;display:flex;align-items:center;justify-content:center;min-height:220px}
#${sectionId} .wdg-lb-media img{width:100%;height:auto;max-height:min(62vh,640px);object-fit:contain;display:block}
#${sectionId} .wdg-lb-body{padding:18px 20px 20px;display:flex;flex-direction:column;gap:10px}
#${sectionId} .wdg-lb-top{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
#${sectionId} .wdg-lb-name{margin:0;font-family:var(--font-display,'Fraunces',Georgia,serif);font-size:28px;letter-spacing:-.03em;line-height:1.1}
#${sectionId} .wdg-lb-close{width:36px;height:36px;border:0;border-radius:50%;background:#f3eef6;color:#4d4454;font-size:22px;line-height:1;cursor:pointer;flex-shrink:0}
#${sectionId} .wdg-lb-caption{margin:0;color:var(--wdg-muted);font-size:15px;line-height:1.55;font-style:italic}
#${sectionId} .wdg-lb-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:4px}
@media(max-width:640px){
  #${sectionId}{padding:24px 14px}
  #${sectionId} .wdg-grid{grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}
  #${sectionId} .wdg-photo img{max-height:280px}
  #${sectionId} .wdg-lb-name{font-size:22px}
}
</style>
<section id="${sectionId}" class="wet-dog-gallery" data-section-key="${esc(sectionKey)}" data-campaign-id="${esc(campaignId)}">
  <div class="wdg-shell">
    <div class="wdg-head">
      <p class="wdg-eyebrow">${esc(eyebrow)}</p>
      <h2 class="wdg-heading">${esc(heading)}</h2>
      <p class="wdg-desc">${esc(description)}</p>
    </div>
    ${closedNotice}
    <div class="wdg-grid">
      ${cards || (votingOpen ? emptyState : "")}
    </div>
  </div>
  <div class="wdg-lightbox" data-wdg-lightbox aria-hidden="true">
    <div class="wdg-lb-panel" role="dialog" aria-modal="true" aria-label="Competition entry preview">
      <div class="wdg-lb-media"><img data-wdg-lb-img alt=""></div>
      <div class="wdg-lb-body">
        <div class="wdg-lb-top">
          <h3 class="wdg-lb-name" data-wdg-lb-name></h3>
          <button type="button" class="wdg-lb-close" data-wdg-lb-close aria-label="Close preview">&times;</button>
        </div>
        <p class="wdg-lb-caption" data-wdg-lb-caption hidden></p>
        <div class="wdg-lb-actions">
          <button type="button" class="wdg-lb-share" data-wdg-lb-share>
            ${facebookIcon()}
            <span>Share on Facebook</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</section>
<script>
(() => {
  const root = document.getElementById(${JSON.stringify(sectionId)});
  if (!root || root.dataset.wdgReady === "1") return;
  root.dataset.wdgReady = "1";

  const ENTRY_SHARE_BASE = ${JSON.stringify(entryShareBase)};
  const EYEBROW = ${JSON.stringify(eyebrow)};
  const lightbox = root.querySelector("[data-wdg-lightbox]");
  const lbImg = root.querySelector("[data-wdg-lb-img]");
  const lbName = root.querySelector("[data-wdg-lb-name]");
  const lbCaption = root.querySelector("[data-wdg-lb-caption]");
  const lbShare = root.querySelector("[data-wdg-lb-share]");
  let activeEntryId = "";

  function entryShareUrl(entryId) {
    return ENTRY_SHARE_BASE + encodeURIComponent(entryId);
  }
  function shareEntry(entryId, dogName) {
    const shareUrl = entryShareUrl(entryId);
    const quote = "Check out " + (dogName || "this pup") + " in the " + EYEBROW + "! " + shareUrl;
    const fbUrl = "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(shareUrl) + "&quote=" + encodeURIComponent(quote);
    window.open(fbUrl, "wdg-share", "width=620,height=460,resizable=yes,scrollbars=yes,noopener");
  }
  function openLightbox(card) {
    if (!lightbox || !card) return;
    activeEntryId = card.getAttribute("data-entry-id") || "";
    const dogName = card.getAttribute("data-dog-name") || "Untitled";
    const caption = card.getAttribute("data-caption") || "";
    const photo = card.getAttribute("data-photo-url") || "";
    if (lbImg) {
      lbImg.src = photo;
      lbImg.alt = dogName;
    }
    if (lbName) lbName.textContent = dogName;
    if (lbCaption) {
      if (caption) {
        lbCaption.hidden = false;
        lbCaption.textContent = '"' + caption + '"';
      } else {
        lbCaption.hidden = true;
        lbCaption.textContent = "";
      }
    }
    if (lbShare) {
      lbShare.dataset.entryId = activeEntryId;
      lbShare.dataset.dogName = dogName;
    }
    lightbox.dataset.open = "true";
    lightbox.setAttribute("aria-hidden", "false");
    document.documentElement.style.overflow = "hidden";
  }
  function closeLightbox() {
    if (!lightbox) return;
    lightbox.dataset.open = "false";
    lightbox.setAttribute("aria-hidden", "true");
    activeEntryId = "";
    document.documentElement.style.overflow = "";
  }

  root.querySelectorAll("[data-wdg-open]").forEach((btn) => {
    btn.addEventListener("click", () => openLightbox(btn.closest(".wdg-card")));
  });
  root.querySelector("[data-wdg-lb-close]")?.addEventListener("click", closeLightbox);
  lightbox?.addEventListener("click", (event) => {
    if (event.target === lightbox) closeLightbox();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && lightbox?.dataset.open === "true") closeLightbox();
  });

  root.querySelectorAll("[data-wdg-share]").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      shareEntry(btn.getAttribute("data-entry-id"), btn.getAttribute("data-dog-name"));
    });
  });
  lbShare?.addEventListener("click", () => {
    shareEntry(lbShare.dataset.entryId || activeEntryId, lbShare.dataset.dogName);
  });

  const params = new URLSearchParams(window.location.search);
  const deepEntry = params.get("entry");
  if (deepEntry) {
    const card = root.querySelector('.wdg-card[data-entry-id="' + CSS.escape(deepEntry) + '"]');
    if (card) openLightbox(card);
  }
})();
</script>`;
}
