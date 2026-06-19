import { escapeHtml, safeJson } from "./render_section.js";

const CDN = "https://assets.companionsofcaddo.org";
const SHELTER_MAP_EMBED =
  "https://maps.google.com/maps?q=1500+Monty+Street,+Shreveport,+LA+71107&hl=en&z=15&output=embed";

function t(v) { return v == null ? "" : String(v); }
function pick(o, keys) {
  for (const k of keys) {
    const v = o?.[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return "";
}
function escUrl(v, fb = "") {
  const raw = t(v).trim();
  if (!raw) return fb;
  if (raw.startsWith("/media/") || raw.startsWith("/static/")) return CDN + raw;
  if (raw.startsWith("/") || raw.startsWith("#")) return raw;
  if (raw.startsWith("http")) return raw;
  return fb;
}
function escAttr(v) { return escapeHtml(v); }
function sortBlocks(blocks) {
  return [...(blocks || [])].sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
}
function blockCfg(block) { return safeJson(block?.config_json, {}); }

function heroLinkBtn(label, sub, href, variant = "primary") {
  if (!label) return "";
  const cls = variant === "ghost" ? "hero-cta hero-cta-ghost" : "hero-cta hero-cta-primary";
  const icon = variant === "ghost"
    ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>`
    : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>`;
  return `<a class="${cls}" href="${escAttr(href)}">
            <span class="hero-cta-icon">${icon}</span>
            <span class="hero-cta-text">
              <span class="hero-cta-label">${escapeHtml(label)}</span>
              ${sub ? `<span class="hero-cta-sub">${escapeHtml(sub)}</span>` : ""}
            </span>
          </a>`;
}

function renderHero(section) {
  const c = safeJson(section.config_json, {});
  const eyebrow = pick(section, ["eyebrow"]) || "Caddo Parish · 100% Volunteer-Based";
  const heading = pick(section, ["heading"]) || "Giving Caddo dogs the second chance they might not get otherwise.";
  const body = pick(section, ["body"]) || pick(section, ["subheading"]) || "";
  const img = escUrl(pick(section, ["image_url"]) || pick(c, ["image_url"]), `${CDN}/static/pages/about/theteam.webp`);
  const alt = pick(c, ["image_alt"]) || heading || "Companions of CPAS volunteer team";
  const ctaLabel = pick(section, ["cta_label"]) || pick(c, ["cta_label"]) || "Meet Adoptable Dogs";
  const ctaHref = pick(section, ["cta_href"]) || pick(c, ["cta_href"]) || "/adopt";
  const cta2Label = pick(section, ["cta_secondary_label"]) || pick(c, ["cta_secondary_label"]) || "Support Our Mission";
  const cta2Href = pick(section, ["cta_secondary_href"]) || pick(c, ["cta_secondary_href"]) || "/donate";
  const cta2Sub = pick(c, ["cta_secondary_sub"]) || "Donate or give supplies";

  return `<style>
[data-cpas-section="hero"]{isolation:isolate}
@media(max-width:768px){[data-cpas-section="hero"] .hero-media-bg{position:relative;height:clamp(320px,62vw,520px)}[data-cpas-section="hero"] .hero-body{background:linear-gradient(180deg,#0b0f1a,#070b14)}}
</style>
<section class="hero-split" data-cpas-section="hero" data-section-key="hero">
  <div class="hero-media-bg">
    <img src="${escAttr(img)}" alt="${escAttr(alt)}" loading="eager" fetchpriority="high" decoding="async" />
    <div class="hero-scrim"></div>
  </div>
  <div class="hero-body">
    <div class="container">
      <div class="hero-content">
        <div class="hero-badge">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
          ${escapeHtml(eyebrow)}
        </div>
        <h1 class="hero-heading">${escapeHtml(heading)}</h1>
        <p class="hero-sub">${escapeHtml(body)}</p>
        <div class="hero-actions">${heroLinkBtn(ctaLabel, "Browse adoptable dogs", ctaHref, "primary")}${heroLinkBtn(cta2Label, cta2Sub, cta2Href, "ghost")}</div>
      </div>
    </div>
  </div>
</section>`;
}

function renderWhyWeExist(section) {
  const c = safeJson(section.config_json, {});
  const eyebrow = pick(section, ["eyebrow"]) || "Why Companions Exists";
  const heading = pick(section, ["heading"]) || "";
  const body = pick(section, ["body"]) || "";
  const mediaType = pick(c, ["media_type"]) || "shelter_map";
  const shelterName = pick(c, ["shelter_name"]) || "Caddo Parish Animal Services";
  const shelterAddress = pick(c, ["shelter_address"]) || "1500 Monty Street, Shreveport, LA 71107";
  const mapEmbed = escUrl(pick(c, ["map_embed_url"]), SHELTER_MAP_EMBED);

  const mediaCol = mediaType === "shelter_map"
    ? `<div class="story-block-img story-block-img--map">
        <iframe
          title="${escAttr(shelterName)} location"
          src="${escAttr(mapEmbed)}"
          width="100%"
          height="100%"
          style="border:0;"
          allowfullscreen=""
          loading="lazy"
          referrerpolicy="no-referrer-when-downgrade"></iframe>
        <div class="story-block-map-cap">
          <span class="story-block-map-ey">Partner shelter</span>
          <strong>${escapeHtml(shelterName)}</strong>
          <span>${escapeHtml(shelterAddress)}</span>
        </div>
      </div>`
    : `<div class="story-block-img">
        <img src="${escAttr(escUrl(pick(section, ["image_url"]) || pick(c, ["image_url"]), `${CDN}/media/animals/thefounders.webp`))}" alt="${escAttr(pick(c, ["image_alt"]) || heading || "Why Companions Exists")}" loading="lazy" />
      </div>`;

  return `<style>[data-cpas-section="why-we-exist"]{background:#ede8df}</style>
<section class="section s-light" data-cpas-section="why-we-exist" data-section-key="why_we_exist">
  <div class="container">
    <div class="story-block">
      ${mediaCol}
      <div class="story-block-body">
        <div class="ey-purple">${escapeHtml(eyebrow)}</div>
        <h2 class="story-heading">${escapeHtml(heading)}</h2>
        <p class="story-body">${escapeHtml(body)}</p>
      </div>
    </div>
  </div>
</section>`;
}

const PATH_ICONS = [
  `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="1.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`,
  `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="1.5"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
];

function renderPaths(section, blocks) {
  const heading = pick(section, ["heading"]) || "Two ways we create pathways to safety.";
  const cards = sortBlocks(blocks).filter((b) => Number(b.is_visible) !== 0);
  const cardHtml = cards.map((b, i) => {
    const cfg = blockCfg(b);
    const icon = pick(cfg, ["icon_svg"]) || PATH_ICONS[i % PATH_ICONS.length];
    const href = escUrl(pick(b, ["href"]) || pick(cfg, ["href"]), "/services");
    return `<div class="pillar">
        <div class="pillar-icon-wrap">${icon}</div>
        <h3>${escapeHtml(pick(b, ["title"]) || "")}</h3>
        <p>${escapeHtml(pick(b, ["body"]) || "")}</p>
        <a href="${escAttr(href)}">Learn more →</a>
      </div>`;
  }).join("\n      ");

  return `<style>
[data-cpas-section="paths"]{background:var(--dark-bg)}
[data-cpas-section="paths"] .paths-heading{text-align:center;font-family:var(--font-display);font-size:clamp(1.5rem,2.5vw,2rem);font-weight:700;color:#f0ece6;margin-bottom:0.25rem}
[data-cpas-section="paths"] .pillars-row .pillar{background:rgba(255,255,255,0.04);border-color:rgba(255,255,255,0.1)}
[data-cpas-section="paths"] .pillars-row .pillar h3{color:#f0ece6;font-family:var(--font-body)}
[data-cpas-section="paths"] .pillars-row .pillar p{color:var(--dark-muted)}
</style>
<section class="section s-dark" data-cpas-section="paths" data-section-key="paths">
  <div class="container">
    <h2 class="paths-heading">${escapeHtml(heading)}</h2>
    <div class="pillars-row" style="grid-template-columns:repeat(${Math.min(cards.length || 2, 2)},1fr);max-width:880px;margin-left:auto;margin-right:auto">${cardHtml}</div>
  </div>
</section>`;
}

function renderCampaigns(section) {
  const c = safeJson(section.config_json, {});
  const eyebrow = pick(section, ["eyebrow"]) || "Featured Campaign";
  const heading = pick(section, ["heading"]) || "$10,000 lifesaving goal";
  const body = pick(section, ["body"]) || pick(section, ["subheading"]) || "";
  const raised = Number(c.raised ?? 465);
  const goal = Number(c.goal ?? 10000);
  const donors = Number(c.donors ?? 7);
  const pct = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;
  const campTitle = pick(c, ["campaign_title"]) || heading;
  const campDesc = pick(c, ["campaign_desc"]) || body;
  const image = escUrl(pick(c, ["image_url"]), `${CDN}/media/animals/goinhomejustadopted.webp`);
  const donateHref = escUrl(pick(c, ["donate_href"]) || "/donate", "/donate");

  return `<style>
[data-cpas-section="campaigns"]{background:#ede8df}
[data-cpas-section="campaigns"] .about-camp-featured{display:grid;grid-template-columns:1fr 1.4fr;gap:2rem;align-items:center;margin-top:1.5rem;background:var(--light-card);border:1px solid var(--light-border);border-radius:20px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,0.08)}
[data-cpas-section="campaigns"] .about-camp-featured img{width:100%;height:100%;min-height:280px;object-fit:cover;display:block}
[data-cpas-section="campaigns"] .about-camp-body{padding:2rem 2rem 2rem 0}
[data-cpas-section="campaigns"] .about-camp-heading{font-family:var(--font-display);font-size:clamp(1.4rem,2.2vw,1.9rem);font-weight:700;color:var(--light-text);line-height:1.15;margin:0.4rem 0 0.85rem}
[data-cpas-section="campaigns"] .about-camp-meta{font-size:13px;color:var(--light-muted);margin-bottom:1rem}
@media(max-width:768px){[data-cpas-section="campaigns"] .about-camp-featured{grid-template-columns:1fr}[data-cpas-section="campaigns"] .about-camp-body{padding:1.5rem}}
</style>
<section class="section s-light" data-cpas-section="campaigns" data-section-key="campaigns">
  <div class="container">
    <div class="ey-purple">${escapeHtml(eyebrow)}</div>
    <div class="about-camp-featured">
      <img src="${escAttr(image)}" alt="${escAttr(campTitle)}" loading="lazy" />
      <div class="about-camp-body">
        <h2 class="about-camp-heading">${escapeHtml(campTitle)}</h2>
        <p class="about-camp-meta">$${raised.toLocaleString()} raised by ${donors} donor${donors === 1 ? "" : "s"}. Every gift fuels medical support, transport, and second chances.</p>
        <p class="story-body">${escapeHtml(campDesc)}</p>
        <div class="progress-bar" style="margin:1rem 0 0.35rem"><div class="progress-fill" style="width:${pct}%"></div></div>
        <p class="progress-label">$${raised.toLocaleString()} of $${goal.toLocaleString()} · ${pct}%</p>
        <a class="story-cta" href="${escAttr(donateHref)}" style="margin-top:1.25rem">
          Give now
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </a>
      </div>
    </div>
  </div>
</section>`;
}

function renderCta(section) {
  const c = safeJson(section.config_json, {});
  const heading = pick(section, ["heading"]) || "Help fund medical care, transport, and second chances.";
  const body = pick(section, ["body"]) || pick(section, ["subheading"]) || "";
  const eyebrow = pick(section, ["eyebrow"]) || "Give them a way out";
  const ctaLabel = pick(section, ["cta_label"]) || pick(c, ["cta_label"]) || "View Adoptable Dogs";
  const ctaHref = pick(section, ["cta_href"]) || pick(c, ["cta_href"]) || "/adopt";
  const donateLabel = pick(c, ["donate_label"]) || "Donate Now";

  return `<style>[data-cpas-section="cta"]{display:block}</style>
<section class="cta-band s-purple" data-cpas-section="cta" data-section-key="cta" id="cta">
  <div class="container cta-band-inner">
    <div class="cta-band-left">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
      <div>
        <p class="ey-white" style="margin-bottom:0.35rem">${escapeHtml(eyebrow)}</p>
        <p class="cta-band-heading">${escapeHtml(heading)}</p>
        <p class="cta-band-sub">${escapeHtml(body)}</p>
      </div>
    </div>
    <div class="cta-band-right">
      <div class="cta-action-row">
        <a class="cta-action-btn" href="${escAttr(ctaHref)}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
          ${escapeHtml(ctaLabel)}
        </a>
        <a class="cta-action-btn" href="${escAttr(pick(c, ["donate_href"]) || "/donate")}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
          ${escapeHtml(donateLabel)}
        </a>
      </div>
    </div>
  </div>
</section>`;
}

export const ABOUT_FRAGMENT_RENDERERS = {
  hero: renderHero,
  why_we_exist: renderWhyWeExist,
  paths: renderPaths,
  campaigns: renderCampaigns,
  cta: renderCta,
};

export function renderAboutFragment(section, blocks = []) {
  const key = pick(section, ["section_key"]);
  const fn = ABOUT_FRAGMENT_RENDERERS[key];
  if (!fn) return null;
  if (Number(section.is_visible) === 0) return "<!-- cms: section hidden -->";
  return fn(section, blocks);
}

export function fragmentKeyForAboutSection(sectionKey) {
  const map = {
    hero: "hero.html",
    why_we_exist: "why_we_exist.html",
    paths: "paths.html",
    campaigns: "campaigns.html",
    cta: "cta.html",
  };
  const file = map[sectionKey];
  return file ? `static/pages/about/${file}` : null;
}
