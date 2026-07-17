import { escapeHtml, safeJson } from "./render_section.js";

const TENANT_ID = "tenant_companionscpas";
const PUBLIC_ANIMAL_STATUSES = ["available", "foster", "pending"];

function text(value) {
  return value == null ? "" : String(value).trim();
}

function esc(value) {
  return escapeHtml(value);
}

function truncateText(value, max = 120) {
  const raw = text(value);
  if (!raw) return "";
  if (raw.length <= max) return raw;
  return `${raw.slice(0, max - 1).trimEnd()}…`;
}

async function loadLiveAnimals(env) {
  if (!env?.DB) return [];
  const rows = await env.DB.prepare(`
    SELECT
      ap.id, ap.name, ap.species, ap.breed, ap.sex, ap.age_label, ap.weight_label,
      ap.energy_level, ap.status, ap.bio,
      ap.good_with_dogs, ap.good_with_cats, ap.good_with_kids,
      ap.foster_needed, ap.featured, ap.photo_url,
      ca.cdn_url AS asset_cdn_url, ca.public_url AS asset_public_url
    FROM animal_profiles ap
    LEFT JOIN cms_assets ca ON ca.asset_key = ap.id AND ca.tenant_id = ?
    WHERE ap.tenant_id = ?
      AND ap.public_visible = 1
      AND lower(ap.status) IN ('available', 'foster', 'pending')
    ORDER BY ap.featured DESC, ap.sort_order ASC, ap.updated_at DESC
    LIMIT 60
  `).bind(TENANT_ID, TENANT_ID).all().catch(() => ({ results: [] }));

  return (rows?.results || []).filter((row) =>
    PUBLIC_ANIMAL_STATUSES.includes(String(row.status || "available").toLowerCase())
  );
}

function statusBadge(status, fosterNeeded) {
  if (fosterNeeded) return `<span class="aag-status aag-status--foster">Needs foster</span>`;
  const s = String(status || "").toLowerCase();
  if (s === "available") return `<span class="aag-status">Available</span>`;
  if (s === "pending") return `<span class="aag-status" style="color:#fcd34d">Pending</span>`;
  return "";
}

function buildCard(a) {
  const img = a.asset_cdn_url || a.asset_public_url || a.photo_url
    || "https://assets.companionsofcaddo.org/media/animals/goinhomejustadopted.webp";
  const name = text(a.name) || "This dog";
  const tags = [];
  if (Number(a.good_with_dogs) || text(a.good_with_dogs).toLowerCase() === "yes") tags.push("Good with dogs");
  if (Number(a.good_with_kids) || text(a.good_with_kids).toLowerCase() === "yes") tags.push("Good with kids");
  if (Number(a.good_with_cats) || text(a.good_with_cats).toLowerCase() === "yes") tags.push("Good with cats");
  if (a.energy_level) tags.push(text(a.energy_level));
  const metaParts = [a.breed, a.sex, a.age_label].filter(Boolean).map(text);
  const bio = truncateText(a.bio, 120);
  const mailto = `mailto:companionsCPAS@gmail.com?subject=${encodeURIComponent(`Inquiry about ${name}`)}`;
  const fosterFlag = Number(a.foster_needed) === 1 && String(a.status || "").toLowerCase() !== "foster";

  return `
  <article class="aag-card">
    <div class="aag-card__img-wrap">
      <img class="aag-card__img" src="${esc(img)}" alt="${esc(name)}" loading="lazy" />
      ${statusBadge(a.status, fosterFlag)}
    </div>
    <div class="aag-card__body">
      <h3 class="aag-card__name">${esc(name)}</h3>
      <p class="aag-card__meta">${esc(metaParts.join(" · ") || "Dog")}</p>
      ${tags.length ? `<div class="aag-card__tags">${tags.slice(0, 3).map((t) => `<span class="aag-card__tag">${esc(t)}</span>`).join("")}</div>` : ""}
      ${bio ? `<p class="aag-card__bio">${esc(bio)}</p>` : ""}
      <a class="aag-card__cta" href="${esc(mailto)}">Ask about ${esc(name)}</a>
    </div>
  </article>`.trim();
}

export async function renderAdoptAnimalGallery(section = {}, blocks = [], brand = {}, env = null) {
  const config = safeJson(section?.config_json, {});
  const heading = text(section.heading || config.heading) || "Dogs looking for a home.";
  const eyebrow = text(section.eyebrow || config.eyebrow) || "Available Now";
  const sectionKey = text(section.section_key) || "adopt_live_animals";
  const sectionId = `aag-${sectionKey.replace(/[^a-z0-9_-]+/gi, "-")}`;

  const animals = await loadLiveAnimals(env);
  const cards = animals.map(buildCard).join("");
  const emptyState = `<div class="aag-empty"><h3>No dogs available right now</h3><p>Check back soon — new arrivals happen regularly.</p></div>`;

  return `
<style>
#${sectionId}{ background:#f5f2ee; padding:clamp(48px,7vw,80px) 20px; font-family:var(--font-body,'DM Sans',system-ui,sans-serif); }
#${sectionId} *{ box-sizing:border-box; }
#${sectionId} .aag-shell{ max-width:1180px; margin:0 auto; }
#${sectionId} .aag-head{ display:flex; align-items:flex-end; justify-content:space-between; margin-bottom:32px; gap:20px; flex-wrap:wrap; }
#${sectionId} .aag-eyebrow{ font-size:10px; font-weight:800; letter-spacing:.14em; text-transform:uppercase; color:#7c3aed; margin:0 0 8px; }
#${sectionId} .aag-heading{ font-family:var(--font-display,'Fraunces',Georgia,serif); font-size:clamp(1.7rem,3vw,2.4rem); font-weight:700; color:#0f1623; line-height:1.1; letter-spacing:-.02em; margin:0; }
#${sectionId} .aag-filters{ display:flex; gap:8px; flex-wrap:wrap; }
#${sectionId} .aag-filter{ padding:7px 16px; border-radius:999px; border:1.5px solid rgba(15,22,35,.14); background:#fff; font-size:.82rem; font-weight:600; color:#5e6b7f; cursor:pointer; transition:all .14s; }
#${sectionId} .aag-filter:hover, #${sectionId} .aag-filter.is-active{ border-color:#7c3aed; background:rgba(124,58,237,.08); color:#6d28d9; }
#${sectionId} .aag-grid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:20px; }
#${sectionId} .aag-card{ background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 2px 12px rgba(15,22,35,.08); transition:box-shadow .2s, transform .15s; display:flex; flex-direction:column; }
#${sectionId} .aag-card:hover{ box-shadow:0 8px 32px rgba(15,22,35,.13); transform:translateY(-3px); }
#${sectionId} .aag-card__img-wrap{ position:relative; aspect-ratio:4/3; overflow:hidden; background:#e8e4df; }
#${sectionId} .aag-card__img{ width:100%; height:100%; object-fit:cover; object-position:center top; display:block; }
#${sectionId} .aag-status{ position:absolute; top:12px; left:12px; padding:4px 10px; border-radius:999px; font-size:10px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; background:rgba(9,13,24,.72); color:#a78bfa; backdrop-filter:blur(6px); }
#${sectionId} .aag-status--foster{ color:#6ee7b7; }
#${sectionId} .aag-card__body{ padding:18px 20px 20px; flex:1; display:flex; flex-direction:column; }
#${sectionId} .aag-card__name{ font-family:var(--font-display,'Fraunces',Georgia,serif); font-size:1.15rem; font-weight:700; color:#0f1623; margin:0 0 4px; }
#${sectionId} .aag-card__meta{ font-size:.8rem; color:#8a94a6; margin:0 0 12px; }
#${sectionId} .aag-card__tags{ display:flex; flex-wrap:wrap; gap:6px; margin-bottom:16px; }
#${sectionId} .aag-card__tag{ padding:3px 10px; border-radius:999px; background:rgba(124,58,237,.08); font-size:.74rem; font-weight:600; color:#6d28d9; }
#${sectionId} .aag-card__bio{ font-size:.82rem; color:#5e6b7f; line-height:1.5; margin:0 0 16px; flex:1; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; }
#${sectionId} .aag-card__cta{ display:block; text-align:center; width:100%; padding:10px; border:none; border-radius:9px; background:#7c3aed; color:#fff; font-size:.86rem; font-weight:700; text-decoration:none; transition:opacity .15s; }
#${sectionId} .aag-card__cta:hover{ opacity:.88; }
#${sectionId} .aag-empty{ grid-column:1 / -1; text-align:center; padding:60px 20px; color:#8a94a6; }
#${sectionId} .aag-empty h3{ font-family:var(--font-display,'Fraunces',Georgia,serif); font-size:1.3rem; color:#0f1623; margin:0 0 8px; }
@media(max-width:600px){ #${sectionId} .aag-head{ flex-direction:column; align-items:flex-start; } }
</style>
<section id="${sectionId}" class="adopt-live-gallery" data-section-key="${esc(sectionKey)}" aria-label="Available dogs">
  <div class="aag-shell">
    <div class="aag-head">
      <div>
        <p class="aag-eyebrow">${esc(eyebrow)}</p>
        <h2 class="aag-heading">${esc(heading)}</h2>
      </div>
      <div class="aag-filters" data-aag-filters>
        <button type="button" class="aag-filter is-active" data-filter="all">All</button>
        <button type="button" class="aag-filter" data-filter="available">Available</button>
        <button type="button" class="aag-filter" data-filter="foster_needed">Needs Foster</button>
      </div>
    </div>
    <div class="aag-grid" data-aag-grid>
      ${cards || emptyState}
    </div>
  </div>
</section>
<script>
(() => {
  const root = document.getElementById(${JSON.stringify(sectionId)});
  if (!root || root.dataset.aagReady === "1") return;
  root.dataset.aagReady = "1";
  const cards = Array.from(root.querySelectorAll(".aag-card"));
  const buttons = Array.from(root.querySelectorAll("[data-filter]"));
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.toggle("is-active", b === btn));
      const filter = btn.getAttribute("data-filter");
      cards.forEach((card) => {
        if (filter === "all") { card.style.display = ""; return; }
        if (filter === "foster_needed") {
          card.style.display = card.querySelector(".aag-status--foster") ? "" : "none";
          return;
        }
        if (filter === "available") {
          const badge = card.querySelector(".aag-status");
          card.style.display = (badge && badge.textContent.trim() === "Available") ? "" : "none";
        }
      });
    });
  });
})();
</script>`;
}
