import { escapeHtml, safeJson, renderBandCta } from "./render_section.js";

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
  // Legacy /assets/pages/* uploads → R2 static/pages/*
  if (raw.startsWith("/assets/pages/")) return CDN + raw.replace(/^\/assets\//, "/static/");
  if (raw.startsWith("/media/") || raw.startsWith("/static/") || raw.startsWith("/assets/")) return CDN + raw;
  if (raw.startsWith("/") || raw.startsWith("#")) return raw;
  if (raw.startsWith("http")) return raw;
  return fb;
}

function resolveAboutHeroLayout(config) {
  const raw = pick(config, ["hero_layout", "layout"]).toLowerCase().replace(/-/g, "_");
  if (raw === "contained" || raw === "contained_split" || raw === "inset" || raw === "guttered") return "contained_split";
  if (raw === "true" || raw === "true_split" || raw === "split" || raw === "panel" || raw === "edge_bleed") return "true_split";
  if (raw === "overlay" || raw === "full_bleed" || raw === "fullbleed") return "overlay";
  if (raw === "soft" || raw === "soft_split" || raw === "fade") return "soft_split";
  // About heroes look best inset with gutters (not edge-bleed).
  return "contained_split";
}

function resolveAboutOverlay(config, layout) {
  const raw = pick(config, ["overlay_strength"]).toLowerCase();
  if (raw === "none" || raw === "soft" || raw === "medium" || raw === "strong") return raw;
  if (layout === "overlay") return "medium";
  if (layout === "true_split" || layout === "contained_split") return "none";
  return "medium";
}

function aboutScrimCss(layout, strength, imageSide) {
  if (layout === "true_split" || layout === "contained_split" || strength === "none") return "transparent";
  const dir = imageSide === "left" ? "270deg" : "90deg";
  if (layout === "overlay") {
    if (strength === "soft") {
      return `linear-gradient(${dir}, rgba(28,20,32,0.72) 0%, rgba(28,20,32,0.45) 42%, rgba(28,20,32,0.12) 70%, transparent 100%)`;
    }
    if (strength === "strong") {
      return `linear-gradient(${dir}, rgba(28,20,32,0.92) 0%, rgba(28,20,32,0.78) 48%, rgba(28,20,32,0.35) 78%, transparent 100%)`;
    }
    return `linear-gradient(${dir}, rgba(28,20,32,0.82) 0%, rgba(28,20,32,0.58) 46%, rgba(28,20,32,0.2) 74%, transparent 100%)`;
  }
  if (strength === "soft") {
    return `linear-gradient(${dir}, var(--bg) 0%, var(--bg) 58%, rgba(250,248,244,0.45) 82%, transparent 100%)`;
  }
  if (strength === "strong") {
    return `linear-gradient(${dir}, var(--bg) 0%, var(--bg) 88%, rgba(250,248,244,0.65) 96%, transparent 100%)`;
  }
  return `linear-gradient(${dir}, var(--bg) 0%, var(--bg) 72%, rgba(250,248,244,0.55) 90%, transparent 100%)`;
}

function objectPosition(config) {
  const focalX = Number(config.image_focal_x);
  const focalY = Number(config.image_focal_y);
  if (Number.isFinite(focalX) && Number.isFinite(focalY)) {
    return `${Math.min(100, Math.max(0, focalX))}% ${Math.min(100, Math.max(0, focalY))}%`;
  }
  const focal = pick(config, ["image_object_position"]) || "center";
  if (focal === "top") return "center top";
  if (focal === "left") return "left center";
  if (focal === "right") return "right center";
  return "center 35%";
}

function escAttr(v) { return escapeHtml(v); }
function sortBlocks(blocks) {
  return [...(blocks || [])].sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
}
function blockCfg(block) { return safeJson(block?.config_json, {}); }

/** Allow only <em>/<strong>/<br> in mission copy so approved design can keep italics. */
function softHtml(value) {
  const raw = t(value);
  if (!raw) return "";
  if (/[<>]/.test(raw)) {
    return raw
      .replace(/<(?!\/?(?:em|strong|br)\b)[^>]*>/gi, "")
      .replace(/on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  }
  return escapeHtml(raw);
}

function heroModalBtn(label, sub, action, variant = "primary", cmsField = "") {
  if (!label) return "";
  const cls = variant === "ghost" ? "hero-cta hero-cta-ghost" : "hero-cta hero-cta-primary";
  const fieldAttr = cmsField ? ` data-cms-field="${escAttr(cmsField)}"` : "";
  const icon = variant === "ghost"
    ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>`
    : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>`;
  return `<button class="${cls}" type="button" data-action="${escAttr(action)}"${fieldAttr}>
            <span class="hero-cta-icon">${icon}</span>
            <span class="hero-cta-text">
              <span class="hero-cta-label">${escapeHtml(label)}</span>
              ${sub ? `<span class="hero-cta-sub">${escapeHtml(sub)}</span>` : ""}
            </span>
          </button>`;
}

function heroCtaButton(label, sub, href, variant = "primary", cmsField = "") {
  if (!label) return "";
  const dest = t(href).trim() || "/adopt";
  if (dest === "/donate" || dest === "donate") {
    return heroModalBtn(label, sub, "donate", variant, cmsField);
  }
  const cls = variant === "ghost" ? "hero-cta hero-cta-ghost" : "hero-cta hero-cta-primary";
  const fieldAttr = cmsField ? ` data-cms-field="${escAttr(cmsField)}"` : "";
  const icon = variant === "ghost"
    ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>`
    : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>`;
  return `<a class="${cls}" href="${escAttr(escUrl(dest, "/adopt"))}"${fieldAttr}>
            <span class="hero-cta-icon">${icon}</span>
            <span class="hero-cta-text">
              <span class="hero-cta-label">${escapeHtml(label)}</span>
              ${sub ? `<span class="hero-cta-sub">${escapeHtml(sub)}</span>` : ""}
            </span>
          </a>`;
}

function renderMissionStatement(section) {
  const c = safeJson(section.config_json, {});
  const eyebrow = pick(section, ["eyebrow"]) || "Our Mission";
  let heading = pick(section, ["heading"]) || "To promote, educate, and advocate for <em>every animal</em> at Caddo Parish Animal Services.";
  // Restore approved italic when D1 has plain "every animal"
  if (heading && !/[<>]/.test(heading) && /every animal/i.test(heading)) {
    heading = heading.replace(/every animal/i, "<em>every animal</em>");
  }
  const body = pick(section, ["body"]) || "Companions of CPAS works to achieve a positive outcome for all animals at the CPAS open-intake shelter. We do this by <strong>heavily networking the animals</strong>, providing <strong>medical care for emergency cases</strong>, raising donations, educating the public, assisting in transports conducted by shelter staff, enrichment, and other needs where the shelter needs assistance.";
  const pillars = [
    pick(c, ["pillar_1"]) || "Network animals",
    pick(c, ["pillar_2"]) || "Emergency medical care",
    pick(c, ["pillar_3"]) || "Fundraising",
    pick(c, ["pillar_4"]) || "Public education",
    pick(c, ["pillar_5"]) || "Transport support",
    pick(c, ["pillar_6"]) || "Enrichment",
  ];
  const pillarHtml = pillars.map((p, i) =>
    `<div class="ms-pillar" data-cms-field="config.pillar_${i + 1}"><div class="ms-pillar-dot"></div><span class="ms-pillar-text">${escapeHtml(p)}</span></div>`
  ).join("\n    ");

  return `<style>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500&display=swap');
.ms-wrap{background:#f9f4f0;border-radius:16px;padding:56px 64px;position:relative;overflow:hidden;font-family:'DM Sans',sans-serif}
.ms-wrap::before{content:'';position:absolute;top:-40px;right:-40px;width:220px;height:220px;background:radial-gradient(circle,#6b2d8b18 0%,transparent 70%);border-radius:50%}
.ms-wrap::after{content:'';position:absolute;bottom:-20px;left:40px;width:140px;height:140px;background:radial-gradient(circle,#c0608018 0%,transparent 70%);border-radius:50%}
.ms-eyebrow{display:flex;align-items:center;gap:10px;margin-bottom:20px}
.ms-eyebrow-line{width:32px;height:2px;background:#6b2d8b;border-radius:2px}
.ms-eyebrow-text{font-family:'DM Sans',sans-serif;font-size:11px;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:#6b2d8b}
.ms-heading{font-family:'Playfair Display',Georgia,serif;font-size:36px;font-weight:700;color:#1a0a24;line-height:1.2;margin:0 0 28px;max-width:560px}
.ms-heading em{font-style:italic;color:#6b2d8b}
.ms-divider{width:48px;height:3px;background:linear-gradient(90deg,#6b2d8b,#c06080);border-radius:2px;margin-bottom:28px}
.ms-body{font-size:16px;line-height:1.8;color:#3d2a4a;max-width:680px;margin:0 0 32px;font-weight:300}
.ms-body strong{font-weight:500;color:#1a0a24}
.ms-pillars{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:36px}
.ms-pillar{background:white;border:1px solid #e8dff0;border-radius:10px;padding:14px 16px;display:flex;align-items:center;gap:10px}
.ms-pillar-dot{width:8px;height:8px;border-radius:50%;background:#6b2d8b;flex-shrink:0}
.ms-pillar-text{font-size:13px;font-weight:500;color:#3d2a4a;line-height:1.3}
.ms-footer{display:flex;align-items:center;gap:24px;padding-top:28px;border-top:1px solid #e8dff0;flex-wrap:wrap}
.ms-badge{background:#6b2d8b;color:white;font-size:11px;font-weight:500;letter-spacing:.08em;padding:6px 14px;border-radius:20px}
.ms-meta{font-size:13px;color:#7a6a85;font-weight:300}
.ms-meta span{color:#3d2a4a;font-weight:500}
@media(max-width:768px){.ms-wrap{padding:36px 24px}}
</style>
<section class="section s-light" data-section-key="mission_statement" data-cpas-section="mission_statement" style="padding-top:3rem;padding-bottom:3rem;">
  <div class="container">
    <div class="ms-wrap">
      <div class="ms-eyebrow">
        <div class="ms-eyebrow-line"></div>
        <span class="ms-eyebrow-text" data-cms-field="eyebrow">${escapeHtml(eyebrow)}</span>
      </div>
      <h2 class="ms-heading" data-cms-field="heading">${softHtml(heading)}</h2>
      <div class="ms-divider"></div>
      <p class="ms-body" data-cms-field="body">${softHtml(body)}</p>
      <div class="ms-pillars">
    ${pillarHtml}
      </div>
      <div class="ms-footer">
        <span class="ms-badge">501(c)(3) Nonprofit</span>
        <span class="ms-meta">EIN <span>88-4156327</span></span>
        <span class="ms-meta">Shreveport, LA <span>71106</span></span>
        <span class="ms-meta">Contact <span>companionsCPAS@gmail.com</span></span>
      </div>
    </div>
  </div>
</section>`;
}

function renderHero(section) {
  const c = safeJson(section.config_json, {});
  const eyebrow = pick(section, ["eyebrow"]) || "Caddo Parish · 100% Volunteer-Based";
  const heading = pick(section, ["heading"]) || "Giving Caddo dogs the second chance they might not get otherwise.";
  const body = pick(section, ["body"]) || pick(section, ["subheading"]) || "";
  const img = escUrl(
    pick(section, ["image_url"]) || pick(c, ["image_url"]),
    `${CDN}/static/pages/about/theteam.webp`
  );
  const alt = pick(c, ["image_alt"]) || heading || "Companions of CPAS volunteer team";
  const cta2Label = pick(section, ["cta_secondary_label"]) || pick(c, ["cta_secondary_label"]) || "Meet Adoptable Dogs";
  const cta2Href = pick(section, ["cta_secondary_href"]) || pick(c, ["cta_secondary_href"]) || "/adopt";
  const cta2Sub = pick(c, ["cta_secondary_sub"]) || (cta2Href === "/donate" || cta2Href === "donate" ? "Donate or give supplies" : "See who needs a home");

  const layout = resolveAboutHeroLayout(c);
  const overlayStrength = resolveAboutOverlay(c, layout);
  const imageSide = pick(c, ["image_side"]).toLowerCase() === "left" ? "left" : "right";
  let imageWidth = Number(c.image_width);
  if (!Number.isFinite(imageWidth)) imageWidth = layout === "contained_split" ? 48 : 55;
  imageWidth = Math.min(70, Math.max(40, Math.round(imageWidth)));
  const imageFit = pick(c, ["image_fit"]).toLowerCase() === "contain" ? "contain" : "cover";
  const pos = objectPosition(c);
  let zoom = Number(c.image_zoom);
  if (!Number.isFinite(zoom)) zoom = 1;
  zoom = Math.min(1.6, Math.max(0.85, zoom));
  const zoomCss = zoom !== 1 ? `transform:scale(${zoom});transform-origin:${pos};` : "";
  const scrimBg = aboutScrimCss(layout, overlayStrength, imageSide);
  const textPanelPct = Math.max(30, 100 - imageWidth);

  const layoutClass =
    layout === "true_split" ? " hero-split--true" :
    layout === "contained_split" ? " hero-split--contained" :
    layout === "overlay" ? " hero-split--overlay" :
    " hero-split--soft";
  const sideClass = imageSide === "left" ? " hero-split--image-left" : "";

  return `<style>
[data-cpas-section="hero"]{isolation:isolate;--hero-image-width:${imageWidth}%;--hero-text-width:${textPanelPct}%;}
[data-cpas-section="hero"] .hero-media-bg{background:var(--bg2, #efeae3);}
[data-cpas-section="hero"] .hero-media-bg img{object-fit:${imageFit};object-position:${pos};width:100%;height:100%;${zoomCss}}
[data-cpas-section="hero"].hero-split--contained .hero-media-bg{aspect-ratio:4 / 3;min-height:0;height:auto;max-height:min(520px, 58vh);}
[data-cpas-section="hero"] .hero-scrim{background:${scrimBg};}
[data-cpas-section="hero"].hero-split--image-left .hero-media-bg img{left:0;right:auto;}
[data-cpas-section="hero"].hero-split--image-left .hero-content{margin-left:auto;}
@media(max-width:768px){
  [data-cpas-section="hero"] .hero-media-bg{position:relative;height:clamp(280px,58vw,440px)}
  [data-cpas-section="hero"].hero-split--contained .hero-media-bg{aspect-ratio:4 / 3;height:auto;max-height:none;min-height:240px}
  [data-cpas-section="hero"] .hero-body{background:var(--bg)}
  [data-cpas-section="hero"].hero-split--image-left .hero-media-bg img{left:0;right:0;width:100%}
}
</style>
<section class="hero-split${layoutClass}${sideClass}" data-cpas-section="hero" data-section-key="hero" data-hero-layout="${layout}">
  <div class="hero-media-bg" data-cms-field="image_url">
    <img src="${escAttr(img)}" alt="${escAttr(alt)}" loading="eager" fetchpriority="high" decoding="async" />
    <div class="hero-scrim"></div>
  </div>
  <div class="hero-body">
    <div class="container">
      <div class="hero-content">
        <div class="hero-badge" data-cms-field="eyebrow">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
          ${escapeHtml(eyebrow)}
        </div>
        <h1 class="hero-heading" data-cms-field="heading">${escapeHtml(heading)}</h1>
        <p class="hero-sub" data-cms-field="body">${escapeHtml(body)}</p>
        <div class="hero-actions">${heroModalBtn("Contact Us", "Let's work together", "contact", "primary")}${heroCtaButton(cta2Label, cta2Sub, cta2Href, "ghost", "cta_secondary_label")}</div>
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
    ? `<div class="story-block-img story-block-img--map" data-cms-field="image_url">
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
    : `<div class="story-block-img" data-cms-field="image_url">
        <img src="${escAttr(escUrl(pick(section, ["image_url"]) || pick(c, ["image_url"]), `${CDN}/media/animals/thefounders.webp`))}" alt="${escAttr(pick(c, ["image_alt"]) || heading || "Why Companions Exists")}" loading="lazy" />
      </div>`;

  return `<style>[data-cpas-section="why-we-exist"]{background:#ede8df}</style>
<section class="section s-light" data-cpas-section="why-we-exist" data-section-key="why_we_exist">
  <div class="container">
    <div class="story-block">
      ${mediaCol}
      <div class="story-block-body">
        <div class="ey-purple" data-cms-field="eyebrow">${escapeHtml(eyebrow)}</div>
        <h2 class="story-heading" data-cms-field="heading">${escapeHtml(heading)}</h2>
        <p class="story-body" data-cms-field="body">${escapeHtml(body)}</p>
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
    const href = escUrl(pick(b, ["href"]) || pick(cfg, ["href"]), "/donate");
    const bk = escAttr(pick(b, ["block_key"]) || `path_${i}`);
    return `<div class="pillar" data-cms-field="block_title" data-cms-block="${bk}">
        <div class="pillar-icon-wrap">${icon}</div>
        <h3 data-cms-field="block_title" data-cms-block="${bk}">${escapeHtml(pick(b, ["title"]) || "")}</h3>
        <p data-cms-field="block_body" data-cms-block="${bk}">${escapeHtml(pick(b, ["body"]) || "")}</p>
        <a href="${escAttr(href)}">Learn more →</a>
      </div>`;
  }).join("\n      ");

  return `<style>
[data-cpas-section="paths"]{background:var(--bg-2)}
[data-cpas-section="paths"] .paths-heading{text-align:center;font-family:var(--font-display);font-size:clamp(1.5rem,2.5vw,2rem);font-weight:700;color:var(--text-1);margin-bottom:0.25rem}
</style>
<section class="section s-light" data-cpas-section="paths" data-section-key="paths">
  <div class="container">
    <h2 class="paths-heading" data-cms-field="heading">${escapeHtml(heading)}</h2>
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
    <div class="ey-purple" data-cms-field="eyebrow">${escapeHtml(eyebrow)}</div>
    <div class="about-camp-featured">
      <img src="${escAttr(image)}" alt="${escAttr(campTitle)}" loading="lazy" data-cms-field="image_url" />
      <div class="about-camp-body">
        <h2 class="about-camp-heading" data-cms-field="heading">${escapeHtml(campTitle)}</h2>
        <p class="about-camp-meta">$${raised.toLocaleString()} raised by ${donors} donor${donors === 1 ? "" : "s"}. Every gift fuels medical support, transport, and second chances.</p>
        <p class="story-body" data-cms-field="body">${escapeHtml(campDesc)}</p>
        <div class="progress-bar" style="margin:1rem 0 0.35rem"><div class="progress-fill" style="width:${pct}%"></div></div>
        <p class="progress-label">$${raised.toLocaleString()} of $${goal.toLocaleString()} · ${pct}%</p>
        <a class="story-cta" href="${escAttr(donateHref)}" style="margin-top:1.25rem" data-cms-field="cta_label">
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
  const ctaLabel = pick(section, ["cta_label"]) || pick(c, ["cta_label"]) || "Donate Now";
  const ctaHref = pick(section, ["cta_href"]) || pick(c, ["cta_href"]) || "data-action:donate";
  const secondaryLabel =
    pick(section, ["cta_secondary_label"]) ||
    pick(c, ["cta_secondary_label"]) ||
    pick(c, ["donate_label"]) ||
    "View Adoptable Dogs";
  const secondaryHref =
    pick(section, ["cta_secondary_href"]) ||
    pick(c, ["cta_secondary_href"]) ||
    pick(c, ["donate_href"]) ||
    "/adopt";

  const primaryBtn = renderBandCta(ctaLabel, ctaHref, pick(section, ["cta_action"]) || pick(c, ["cta_action"]), "cta_label");
  const secondaryBtn = renderBandCta(
    secondaryLabel,
    secondaryHref,
    pick(section, ["cta_secondary_action"]) || pick(c, ["cta_secondary_action"]),
    "cta_secondary_label"
  );

  return `<style>[data-cpas-section="cta"]{display:block}</style>
<section class="cta-band s-purple" data-cpas-section="cta" data-section-key="cta" id="cta">
  <div class="container cta-band-inner">
    <div class="cta-band-left">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
      <div>
        <p class="ey-white" style="margin-bottom:0.35rem" data-cms-field="eyebrow">${escapeHtml(eyebrow)}</p>
        <p class="cta-band-heading" data-cms-field="heading">${escapeHtml(heading)}</p>
        <p class="cta-band-sub" data-cms-field="body">${escapeHtml(body)}</p>
      </div>
    </div>
    <div class="cta-band-right">
      <div class="cta-action-row">
        ${primaryBtn}
        ${secondaryBtn}
      </div>
    </div>
  </div>
</section>`;
}

export const ABOUT_FRAGMENT_RENDERERS = {
  mission_statement: renderMissionStatement,
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
    mission_statement: "mission_statement.html",
    hero: "hero.html",
    why_we_exist: "why_we_exist.html",
    paths: "paths.html",
    campaigns: "campaigns.html",
    cta: "cta.html",
  };
  const file = map[sectionKey];
  return file ? `static/pages/about/${file}` : null;
}
