/**
 * Public per-entry share page for Wet Dog (and similar) competitions.
 * URL: /wet-dog/:entryId — Facebook scrapes og:* from this document.
 */

const TENANT_ID = "tenant_companionscpas";
const SITE = "https://companionsofcaddo.org";
const GALLERY_URL = `${SITE}/donate#wdg-donate_wetdog`;

function text(value) {
  return value == null ? "" : String(value).trim();
}

function esc(value) {
  return text(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeUrl(value) {
  const raw = text(value);
  if (!raw) return "";
  if (raw.startsWith("/")) return `${SITE}${raw}`;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") return parsed.toString();
  } catch {}
  return "";
}

export function competitionEntrySharePath(entryId) {
  return `/wet-dog/${encodeURIComponent(entryId)}`;
}

export function competitionEntryShareUrl(entryId) {
  return `${SITE}${competitionEntrySharePath(entryId)}`;
}

export async function loadApprovedCompetitionEntry(env, entryId) {
  if (!env?.DB || !entryId) return null;
  return env.DB.prepare(`
    SELECT ce.id, ce.dog_name, ce.caption, ce.photo_url, ce.vote_count, ce.campaign_id,
           ce.is_approved, ce.archived_at, ce.payment_status,
           fc.title AS campaign_title, fc.is_public, fc.status AS campaign_status
    FROM competition_entries ce
    JOIN fundraising_campaigns fc ON fc.id = ce.campaign_id
    WHERE ce.id = ? AND ce.tenant_id = ?
    LIMIT 1
  `).bind(entryId, TENANT_ID).first().catch(() => null);
}

export function isEntryShareable(entry) {
  if (!entry?.id) return false;
  if (Number(entry.is_approved) !== 1 || entry.archived_at) return false;
  if (entry.payment_status !== "paid") return false;
  if (Number(entry.is_public) !== 1 || entry.campaign_status !== "active") return false;
  return true;
}

export function buildEntrySharePageMeta(entry) {
  const dogName = text(entry.dog_name) || "Competition entry";
  const campaign = text(entry.campaign_title) || "Wet Dog Competition";
  const caption = text(entry.caption);
  const photo = safeUrl(entry.photo_url);
  const path = competitionEntrySharePath(entry.id);
  const description = caption
    ? `"${caption}" — Vote for ${dogName} in the ${campaign}. Every vote helps shelter animals.`
    : `Vote for ${dogName} in the ${campaign}. Every vote helps shelter animals at Caddo Parish Animal Services.`;
  return {
    route_path: path,
    canonical_path: path,
    canonical_url: competitionEntryShareUrl(entry.id),
    title: `Vote for ${dogName}`,
    seo_title: `Vote for ${dogName} · ${campaign}`,
    meta_description: description.slice(0, 220),
    og_image_url: photo || null,
    og_type: "article",
  };
}

export function renderCompetitionEntryShareSection(entry) {
  const dogName = text(entry.dog_name) || "Competition entry";
  const caption = text(entry.caption);
  const photo = safeUrl(entry.photo_url);
  const votes = Number(entry.vote_count) || 0;
  const campaign = text(entry.campaign_title) || "Wet Dog Competition";
  const entryId = text(entry.id);
  const shareUrl = competitionEntryShareUrl(entryId);
  const fbShare = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(`Vote for ${dogName} in the ${campaign}!`)}`;

  return `
<style>
.wes{--a:#6f2fa8;--fb:#1877f2;--ink:#191722;--muted:#66616e;max-width:760px;margin:0 auto;padding:clamp(28px,5vw,56px) 20px 64px;font-family:var(--font-body,'DM Sans',system-ui,sans-serif);color:var(--ink)}
.wes-card{border:1px solid rgba(70,45,90,.14);border-radius:22px;overflow:hidden;background:#fff;box-shadow:0 10px 36px rgba(26,22,34,.08)}
.wes-photo{background:#111;display:flex;align-items:center;justify-content:center;min-height:240px}
.wes-photo img{width:100%;height:auto;max-height:min(70vh,720px);object-fit:contain;display:block}
.wes-body{padding:22px 22px 24px}
.wes-kicker{margin:0 0 8px;color:var(--a);font-size:11px;font-weight:850;letter-spacing:.12em;text-transform:uppercase}
.wes-name{margin:0 0 10px;font-family:var(--font-display,'Fraunces',Georgia,serif);font-size:clamp(28px,4vw,40px);letter-spacing:-.03em;line-height:1.05}
.wes-caption{margin:0 0 18px;color:var(--muted);font-size:16px;line-height:1.55;font-style:italic}
.wes-actions{display:flex;flex-wrap:wrap;gap:10px}
.wes-btn{min-height:44px;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:10px 16px;border-radius:12px;border:0;font:inherit;font-size:14px;font-weight:800;cursor:pointer;text-decoration:none}
.wes-btn--vote{background:var(--a);color:#fff;flex:1}
.wes-btn--vote[data-voted="true"]{opacity:.85}
.wes-btn--fb{background:var(--fb);color:#fff}
.wes-btn--ghost{background:#f3eef6;color:#4d4454}
.wes-note{margin:14px 0 0;color:var(--muted);font-size:13px;line-height:1.45}
</style>
<section class="wes" data-entry-id="${esc(entryId)}">
  <article class="wes-card">
    <div class="wes-photo">
      ${photo ? `<img src="${esc(photo)}" alt="${esc(dogName)}">` : `<div style="color:#bbb;padding:40px">No photo</div>`}
    </div>
    <div class="wes-body">
      <p class="wes-kicker">${esc(campaign)}</p>
      <h1 class="wes-name">${esc(dogName)}</h1>
      ${caption ? `<p class="wes-caption">"${esc(caption)}"</p>` : ""}
      <div class="wes-actions">
        <button type="button" class="wes-btn wes-btn--vote" data-wes-vote>
          ♥ <span data-wes-count>${votes}</span> Vote for ${esc(dogName)}
        </button>
        <a class="wes-btn wes-btn--fb" href="${esc(fbShare)}" target="_blank" rel="noopener noreferrer">Share on Facebook</a>
        <a class="wes-btn wes-btn--ghost" href="${esc(GALLERY_URL)}">See all entries</a>
      </div>
      <p class="wes-note">Every vote helps shelter animals at Caddo Parish Animal Services. Share this pup so friends can vote too.</p>
    </div>
  </article>
</section>
<script>
(() => {
  const root = document.querySelector(".wes");
  if (!root || root.dataset.ready === "1") return;
  root.dataset.ready = "1";
  const entryId = root.getAttribute("data-entry-id");
  const btn = root.querySelector("[data-wes-vote]");
  const countEl = root.querySelector("[data-wes-count]");
  const storageKey = "wes_voted_" + entryId;
  try {
    if (localStorage.getItem(storageKey) === "1" && btn) btn.dataset.voted = "true";
  } catch {}
  btn?.addEventListener("click", async () => {
    if (!btn || btn.disabled || btn.dataset.busy === "1") return;
    btn.dataset.busy = "1";
    try {
      const res = await fetch("/api/public/competition-entries/" + encodeURIComponent(entryId) + "/vote", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        if (countEl) countEl.textContent = data.vote_count;
        btn.dataset.voted = "true";
        try { localStorage.setItem(storageKey, "1"); } catch {}
      }
    } catch {}
    btn.dataset.busy = "";
  });
})();
</script>`;
}
