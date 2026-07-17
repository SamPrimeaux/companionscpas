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
    || "Every approved entry is here. Cast one vote per pup — come back and vote for as many dogs as you like.";
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
    const captionHtml = entry.caption ? `<p class="wdg-caption">"${esc(entry.caption)}"</p>` : "";
    const catLabel = humanizeCategory(entry.category);
    return `
    <article class="wdg-card" data-entry-id="${esc(entry.id)}">
      <div class="wdg-photo">
        ${photo
          ? `<img src="${esc(photo)}" alt="${esc(dogName)}" loading="lazy" decoding="async">`
          : `<div class="wdg-photo-ph" aria-hidden="true">No photo</div>`}
        ${catLabel ? `<span class="wdg-cat-badge">${esc(catLabel)}</span>` : ""}
      </div>
      <div class="wdg-body">
        <h3 class="wdg-name">${esc(dogName)}</h3>
        ${captionHtml}
        <div class="wdg-actions">
          <button type="button" class="wdg-vote-btn" data-wdg-vote data-entry-id="${esc(entry.id)}" ${votingOpen ? "" : "disabled"}>
            ${heartIcon()}
            <span class="wdg-vote-count" data-wdg-count>${Number(entry.vote_count) || 0}</span>
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
#${sectionId} .wdg-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:18px}
#${sectionId} .wdg-card{border-radius:16px;overflow:hidden;background:#fff;border:1px solid var(--wdg-line);box-shadow:0 2px 10px rgba(26,22,34,.06);display:flex;flex-direction:column}
#${sectionId} .wdg-photo{position:relative;aspect-ratio:4/3;background:#e8e4de;overflow:hidden}
#${sectionId} .wdg-photo img{width:100%;height:100%;object-fit:cover;display:block}
#${sectionId} .wdg-photo-ph{width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#bbb;font-size:12px}
#${sectionId} .wdg-cat-badge{position:absolute;top:8px;left:8px;background:rgba(0,0,0,.55);color:#fff;font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;padding:4px 9px;border-radius:999px;backdrop-filter:blur(4px)}
#${sectionId} .wdg-body{padding:12px 14px 14px;display:flex;flex-direction:column;gap:6px;flex:1}
#${sectionId} .wdg-name{margin:0;font-size:16px;font-weight:800}
#${sectionId} .wdg-caption{margin:0;font-size:12px;font-style:italic;color:var(--wdg-muted);line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
#${sectionId} .wdg-actions{margin-top:auto;padding-top:8px;display:flex;gap:8px}
#${sectionId} .wdg-vote-btn,#${sectionId} .wdg-share-btn{display:flex;align-items:center;gap:6px;padding:7px 12px;border-radius:999px;border:1.5px solid var(--wdg-line);background:transparent;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .15s ease}
#${sectionId} .wdg-vote-btn{color:var(--wdg-accent);border-color:rgba(111,47,168,.3);flex:1;justify-content:center}
#${sectionId} .wdg-vote-btn:hover:not(:disabled){background:rgba(111,47,168,.08)}
#${sectionId} .wdg-vote-btn[data-voted="true"]{background:var(--wdg-accent);color:#fff;border-color:var(--wdg-accent)}
#${sectionId} .wdg-vote-btn:disabled{opacity:.45;cursor:not-allowed}
#${sectionId} .wdg-share-btn{color:var(--wdg-fb);border-color:rgba(24,119,242,.3)}
#${sectionId} .wdg-share-btn:hover{background:rgba(24,119,242,.07)}
#${sectionId} .wdg-empty,#${sectionId} .wdg-closed-note{text-align:center;color:var(--wdg-muted);font-size:14px;padding:24px 0}
@media(max-width:640px){
  #${sectionId}{padding:24px 14px}
  #${sectionId} .wdg-grid{grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}
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
</section>
<script>
(() => {
  const root = document.getElementById(${JSON.stringify(sectionId)});
  if (!root || root.dataset.wdgReady === "1") return;
  root.dataset.wdgReady = "1";

  const STORAGE_KEY = "wdg_voted_" + (root.dataset.campaignId || "");
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

  const voted = getVoted();
  root.querySelectorAll("[data-wdg-vote]").forEach((btn) => {
    const id = btn.getAttribute("data-entry-id");
    if (voted[id]) btn.dataset.voted = "true";
  });

  root.querySelectorAll("[data-wdg-vote]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (btn.disabled || btn.dataset.busy === "1") return;
      const entryId = btn.getAttribute("data-entry-id");
      btn.dataset.busy = "1";
      try {
        const res = await fetch("/api/public/competition-entries/" + encodeURIComponent(entryId) + "/vote", {
          method: "POST",
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok) {
          const countEl = btn.querySelector("[data-wdg-count]");
          if (countEl) countEl.textContent = data.vote_count;
          btn.dataset.voted = "true";
          setVoted(entryId);
        }
      } catch {}
      btn.dataset.busy = "";
    });
  });

  root.querySelectorAll("[data-wdg-share]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const entryId = btn.getAttribute("data-entry-id");
      const dogName = btn.getAttribute("data-dog-name") || "this pup";
      const shareUrl = ${JSON.stringify(shareBase)} + "?entry=" + encodeURIComponent(entryId) + "#" + ${JSON.stringify(sectionId)};
      const quote = "Vote for " + dogName + " in the " + ${JSON.stringify(eyebrow)} + "! " + shareUrl;
      const fbUrl = "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(shareUrl) + "&quote=" + encodeURIComponent(quote);
      window.open(fbUrl, "wdg-share", "width=620,height=460,resizable=yes,scrollbars=yes,noopener");
    });
  });
})();
</script>`;
}
