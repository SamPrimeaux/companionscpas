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

function humanizeCategory(key) {
  const raw = text(key).replace(/[_-]+/g, " ").trim();
  if (!raw) return "";
  return raw.replace(/\b\w/g, (c) => c.toUpperCase());
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

function heartIcon() {
  return `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>`;
}

function facebookIcon() {
  return `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>`;
}

export async function renderWetDogGallery(section = {}, blocks = [], brand = {}, env = null) {
  const config = safeJson(section?.config_json, {});
  const campaignId = text(config.campaign_id);
  const campaign = await loadCampaign(env, campaignId);
  const entries = await loadApprovedEntries(env, campaignId);

  const heading = text(section.heading || config.public_heading) || "Vote for Your Favorite";
  const eyebrow = text(section.eyebrow || config.eyebrow) || (campaign?.title || "Wet Dog Competition");
  const description = text(section.subheading || section.body || config.public_description)
    || "Every approved entry is here. Tap a photo for a larger preview, then vote or share.";
  const shareBase = safeUrl(config.share_url, "https://companionsofcaddo.org/donate");
  const categories = Array.isArray(config.categories) ? config.categories : [];
  const sectionKey = text(section.section_key) || "wet_dog_gallery";
  const sectionId = `wdg-${sectionKey.replace(/[^a-z0-9_-]+/gi, "-")}`;

  const votingOpen = Number(campaign?.is_public) === 1 && campaign?.status === "active";

  const categoryChips = categories.length
    ? `<div class="wdg-cats" aria-label="Competition categories">${categories.map((c) => `<span class="wdg-cat-chip">${esc(humanizeCategory(c))}</span>`).join("")}</div>`
    : "";

  const cards = entries.map((entry) => {
    const photo = safeUrl(entry.photo_url);
    const dogName = text(entry.dog_name) || "Untitled";
    const caption = text(entry.caption);
    const captionHtml = caption ? `<p class="wdg-caption">"${esc(caption)}"</p>` : "";
    const catLabel = humanizeCategory(entry.category);
    const votes = Number(entry.vote_count) || 0;
    return `
    <article class="wdg-card" data-entry-id="${esc(entry.id)}"
      data-dog-name="${esc(dogName)}"
      data-caption="${esc(caption)}"
      data-photo-url="${esc(photo)}"
      data-vote-count="${votes}">
      <button type="button" class="wdg-photo" data-wdg-open aria-label="Preview ${esc(dogName)}">
        ${photo
          ? `<img src="${esc(photo)}" alt="${esc(dogName)}" loading="lazy" decoding="async">`
          : `<div class="wdg-photo-ph" aria-hidden="true">No photo</div>`}
        ${catLabel ? `<span class="wdg-cat-badge">${esc(catLabel)}</span>` : ""}
        <span class="wdg-photo-hint">View</span>
      </button>
      <div class="wdg-body">
        <h3 class="wdg-name">${esc(dogName)}</h3>
        ${captionHtml}
        <div class="wdg-actions">
          <button type="button" class="wdg-vote-btn" data-wdg-vote data-entry-id="${esc(entry.id)}" ${votingOpen ? "" : "disabled"}>
            ${heartIcon()}
            <span class="wdg-vote-count" data-wdg-count>${votes}</span>
          </button>
          <button type="button" class="wdg-share-btn" data-wdg-share data-entry-id="${esc(entry.id)}" data-dog-name="${esc(dogName)}">
            ${facebookIcon()}
            <span>Share</span>
          </button>
        </div>
      </div>
    </article>`.trim();
  }).join("");

  const emptyState = `<p class="wdg-empty">Entries are still being reviewed — check back soon to vote.</p>`;
  const closedNotice = !votingOpen
    ? `<p class="wdg-closed-note">Voting isn't open yet for this competition.</p>`
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
#${sectionId} .wdg-cats{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:16px 0 0}
#${sectionId} .wdg-cat-chip{padding:5px 12px;border-radius:999px;background:#f3ecfa;color:var(--wdg-accent);font-size:12px;font-weight:700}
#${sectionId} .wdg-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:18px;align-items:start}
#${sectionId} .wdg-card{border-radius:16px;overflow:hidden;background:#fff;border:1px solid var(--wdg-line);box-shadow:0 2px 10px rgba(26,22,34,.06);display:flex;flex-direction:column}
#${sectionId} .wdg-photo{position:relative;display:block;width:100%;margin:0;padding:0;border:0;background:#efeae4;cursor:pointer;min-height:180px}
#${sectionId} .wdg-photo img{width:100%;height:auto;max-height:360px;object-fit:contain;object-position:center;display:block;background:#efeae4}
#${sectionId} .wdg-photo-ph{min-height:180px;display:flex;align-items:center;justify-content:center;color:#bbb;font-size:12px}
#${sectionId} .wdg-cat-badge{position:absolute;top:8px;left:8px;background:rgba(0,0,0,.55);color:#fff;font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;padding:4px 9px;border-radius:999px;backdrop-filter:blur(4px)}
#${sectionId} .wdg-photo-hint{position:absolute;right:8px;bottom:8px;padding:4px 9px;border-radius:999px;background:rgba(255,255,255,.92);color:var(--wdg-ink);font-size:11px;font-weight:700;opacity:0;transition:opacity .15s ease}
#${sectionId} .wdg-photo:hover .wdg-photo-hint,#${sectionId} .wdg-photo:focus-visible .wdg-photo-hint{opacity:1}
#${sectionId} .wdg-body{padding:12px 14px 14px;display:flex;flex-direction:column;gap:6px}
#${sectionId} .wdg-name{margin:0;font-size:16px;font-weight:800}
#${sectionId} .wdg-caption{margin:0;font-size:12px;font-style:italic;color:var(--wdg-muted);line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
#${sectionId} .wdg-actions{margin-top:auto;padding-top:8px;display:flex;gap:8px}
#${sectionId} .wdg-vote-btn,#${sectionId} .wdg-share-btn,#${sectionId} .wdg-lb-vote,#${sectionId} .wdg-lb-share{display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border-radius:999px;border:1.5px solid var(--wdg-line);background:transparent;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .15s ease}
#${sectionId} .wdg-vote-btn,#${sectionId} .wdg-lb-vote{color:var(--wdg-accent);border-color:rgba(111,47,168,.3);flex:1;justify-content:center}
#${sectionId} .wdg-vote-btn:hover:not(:disabled),#${sectionId} .wdg-lb-vote:hover:not(:disabled){background:rgba(111,47,168,.08)}
#${sectionId} .wdg-vote-btn[data-voted="true"],#${sectionId} .wdg-lb-vote[data-voted="true"]{background:var(--wdg-accent);color:#fff;border-color:var(--wdg-accent)}
#${sectionId} .wdg-vote-btn:disabled,#${sectionId} .wdg-lb-vote:disabled{opacity:.45;cursor:not-allowed}
#${sectionId} .wdg-share-btn,#${sectionId} .wdg-lb-share{color:var(--wdg-fb);border-color:rgba(24,119,242,.3)}
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
      ${categoryChips}
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
          <button type="button" class="wdg-lb-vote" data-wdg-lb-vote ${votingOpen ? "" : "disabled"}>
            ${heartIcon()}
            <span data-wdg-lb-count>0</span>
            <span>Vote</span>
          </button>
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

  const SHARE_BASE = ${JSON.stringify(shareBase)};
  const SECTION_ID = ${JSON.stringify(sectionId)};
  const EYEBROW = ${JSON.stringify(eyebrow)};
  const STORAGE_KEY = "wdg_voted_" + (root.dataset.campaignId || "");
  const lightbox = root.querySelector("[data-wdg-lightbox]");
  const lbImg = root.querySelector("[data-wdg-lb-img]");
  const lbName = root.querySelector("[data-wdg-lb-name]");
  const lbCaption = root.querySelector("[data-wdg-lb-caption]");
  const lbVote = root.querySelector("[data-wdg-lb-vote]");
  const lbCount = root.querySelector("[data-wdg-lb-count]");
  const lbShare = root.querySelector("[data-wdg-lb-share]");
  let activeEntryId = "";

  function getVoted() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
  }
  function setVoted(entryId) {
    try {
      const voted = getVoted();
      voted[entryId] = true;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(voted));
    } catch {}
  }
  function shareEntry(entryId, dogName) {
    const shareUrl = SHARE_BASE + "?entry=" + encodeURIComponent(entryId) + "#" + SECTION_ID;
    const quote = "Vote for " + (dogName || "this pup") + " in the " + EYEBROW + "! " + shareUrl;
    const fbUrl = "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(shareUrl) + "&quote=" + encodeURIComponent(quote);
    window.open(fbUrl, "wdg-share", "width=620,height=460,resizable=yes,scrollbars=yes,noopener");
  }
  function syncVotedUi() {
    const voted = getVoted();
    root.querySelectorAll("[data-wdg-vote]").forEach((btn) => {
      const id = btn.getAttribute("data-entry-id");
      if (voted[id]) btn.dataset.voted = "true";
    });
    if (activeEntryId && voted[activeEntryId] && lbVote) lbVote.dataset.voted = "true";
  }
  async function castVote(entryId, countEls, voteBtns) {
    if (!entryId) return;
    try {
      const res = await fetch("/api/public/competition-entries/" + encodeURIComponent(entryId) + "/vote", {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        (countEls || []).forEach((el) => { if (el) el.textContent = data.vote_count; });
        (voteBtns || []).forEach((btn) => { if (btn) btn.dataset.voted = "true"; });
        const card = root.querySelector('.wdg-card[data-entry-id="' + entryId + '"]');
        if (card) card.dataset.voteCount = String(data.vote_count);
        setVoted(entryId);
      }
    } catch {}
  }
  function openLightbox(card) {
    if (!lightbox || !card) return;
    activeEntryId = card.getAttribute("data-entry-id") || "";
    const dogName = card.getAttribute("data-dog-name") || "Untitled";
    const caption = card.getAttribute("data-caption") || "";
    const photo = card.getAttribute("data-photo-url") || "";
    const votes = card.getAttribute("data-vote-count") || "0";
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
    if (lbCount) lbCount.textContent = votes;
    if (lbVote) {
      lbVote.dataset.entryId = activeEntryId;
      lbVote.dataset.voted = getVoted()[activeEntryId] ? "true" : "";
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

  syncVotedUi();

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

  root.querySelectorAll("[data-wdg-vote]").forEach((btn) => {
    btn.addEventListener("click", async (event) => {
      event.stopPropagation();
      if (btn.disabled || btn.dataset.busy === "1") return;
      const entryId = btn.getAttribute("data-entry-id");
      btn.dataset.busy = "1";
      await castVote(entryId, [btn.querySelector("[data-wdg-count]"), lbCount], [btn, lbVote]);
      btn.dataset.busy = "";
    });
  });

  lbVote?.addEventListener("click", async () => {
    if (lbVote.disabled || lbVote.dataset.busy === "1") return;
    const entryId = lbVote.dataset.entryId || activeEntryId;
    lbVote.dataset.busy = "1";
    const cardBtn = root.querySelector('.wdg-vote-btn[data-entry-id="' + entryId + '"]');
    await castVote(entryId, [lbCount, cardBtn?.querySelector("[data-wdg-count]")], [lbVote, cardBtn]);
    lbVote.dataset.busy = "";
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
