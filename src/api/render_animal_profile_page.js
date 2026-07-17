import { escapeHtml } from "./render_section.js";

function text(value) {
  return value == null ? "" : String(value).trim();
}

function esc(value) {
  return escapeHtml(value);
}

function isYes(value) {
  return Number(value) === 1 || text(value).toLowerCase() === "yes";
}

function collectGalleryPhotos(primaryUrl, metadata) {
  const items = [];
  const seen = new Set();
  function add(url) {
    const clean = text(url);
    if (!clean || seen.has(clean)) return;
    seen.add(clean);
    items.push(clean);
  }
  add(primaryUrl);
  if (Array.isArray(metadata?.photos)) metadata.photos.forEach(add);
  return items;
}

/**
 * Renders the section markup (to be wrapped by assembleFullPage) for a single
 * animal's public profile page — driven entirely by fields the team already
 * edits in the dashboard (bio, tags, photos, good-with flags).
 */
export function renderAnimalProfileSection(animal) {
  const a = animal || {};
  const name = text(a.name) || "This dog";
  const photo = a.asset_cdn_url || a.asset_public_url || a.photo_url
    || "https://assets.companionsofcaddo.org/media/animals/goinhomejustadopted.webp";
  const metadata = a.metadata || {};
  const gallery = collectGalleryPhotos(photo, metadata);
  const extraPhotos = gallery.slice(1);

  const metaParts = [a.breed, a.sex, a.age_label, a.weight_label].filter(Boolean).map(text);
  const tags = [];
  if (isYes(a.good_with_dogs)) tags.push("Good with dogs");
  if (isYes(a.good_with_kids)) tags.push("Good with kids");
  if (isYes(a.good_with_cats)) tags.push("Good with cats");
  if (a.energy_level) tags.push(`${text(a.energy_level)} energy`);

  const fosterNeeded = Number(a.foster_needed) === 1 && text(a.status).toLowerCase() !== "foster";
  const bio = text(a.bio) || `${esc(name)} is looking for a home. Reach out to learn more.`;
  const mailto = `mailto:companionsCPAS@gmail.com?subject=${encodeURIComponent(`Inquiry about ${name}`)}`;

  return `
<style>
.aap{ background:#f5f2ee; padding:clamp(40px,6vw,72px) 20px; font-family:var(--font-body,'DM Sans',system-ui,sans-serif); }
.aap *{ box-sizing:border-box; }
.aap .aap-shell{ max-width:1000px; margin:0 auto; }
.aap .aap-back{ display:inline-flex; align-items:center; gap:6px; font-size:.82rem; font-weight:700; color:#6d28d9; text-decoration:none; margin-bottom:24px; }
.aap .aap-back:hover{ text-decoration:underline; }
.aap .aap-grid{ display:grid; grid-template-columns:1fr 1fr; gap:40px; align-items:start; }
.aap .aap-photo-main{ border-radius:18px; overflow:hidden; background:#e8e4df; aspect-ratio:1/1; display:flex; align-items:center; justify-content:center; }
.aap .aap-photo-main img{ width:100%; height:100%; object-fit:contain; display:block; }
.aap .aap-thumbs{ display:flex; gap:8px; margin-top:10px; flex-wrap:wrap; }
.aap .aap-thumb{ width:64px; height:64px; border-radius:10px; overflow:hidden; background:#e8e4df; }
.aap .aap-thumb img{ width:100%; height:100%; object-fit:cover; display:block; }
.aap .aap-eyebrow{ font-size:10px; font-weight:800; letter-spacing:.14em; text-transform:uppercase; color:#7c3aed; margin:0 0 8px; }
.aap .aap-name{ font-family:var(--font-display,'Fraunces',Georgia,serif); font-size:clamp(2rem,4vw,2.8rem); font-weight:700; color:#0f1623; line-height:1.05; letter-spacing:-.02em; margin:0 0 10px; }
.aap .aap-meta{ font-size:.92rem; color:#8a94a6; margin:0 0 16px; }
.aap .aap-tags{ display:flex; flex-wrap:wrap; gap:8px; margin-bottom:20px; }
.aap .aap-tag{ padding:5px 13px; border-radius:999px; background:rgba(124,58,237,.08); font-size:.78rem; font-weight:600; color:#6d28d9; }
.aap .aap-foster-flag{ display:inline-flex; align-items:center; gap:8px; padding:10px 14px; border-radius:12px; background:rgba(217,119,6,.1); color:#b45309; font-size:.85rem; font-weight:700; margin-bottom:20px; }
.aap .aap-bio{ font-size:.98rem; color:#3d3529; line-height:1.7; margin:0 0 28px; white-space:pre-wrap; }
.aap .aap-cta{ display:inline-flex; align-items:center; justify-content:center; padding:13px 26px; border-radius:11px; background:#7c3aed; color:#fff; font-size:.92rem; font-weight:700; text-decoration:none; transition:opacity .15s; }
.aap .aap-cta:hover{ opacity:.88; }
@media(max-width:767px){
  .aap .aap-grid{ grid-template-columns:1fr; gap:24px; }
}
</style>
<section class="aap" aria-label="${esc(name)} adoption profile">
  <div class="aap-shell">
    <a class="aap-back" href="/adopt">&larr; Back to all dogs</a>
    <div class="aap-grid">
      <div>
        <div class="aap-photo-main">
          <img src="${esc(photo)}" alt="${esc(name)}" loading="eager" />
        </div>
        ${extraPhotos.length ? `<div class="aap-thumbs">${extraPhotos.map((url) => `<div class="aap-thumb"><img src="${esc(url)}" alt="${esc(name)} additional photo" loading="lazy" /></div>`).join("")}</div>` : ""}
      </div>
      <div>
        <p class="aap-eyebrow">Available for adoption</p>
        <h1 class="aap-name">${esc(name)}</h1>
        <p class="aap-meta">${esc(metaParts.join(" · ") || "Dog")}</p>
        ${tags.length ? `<div class="aap-tags">${tags.map((t) => `<span class="aap-tag">${esc(t)}</span>`).join("")}</div>` : ""}
        ${fosterNeeded ? `<div class="aap-foster-flag">This dog needs a foster home.</div>` : ""}
        <p class="aap-bio">${esc(bio)}</p>
        <a class="aap-cta" href="${esc(mailto)}">Ask about ${esc(name)}</a>
      </div>
    </div>
  </div>
</section>`;
}
