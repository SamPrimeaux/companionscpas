import { escapeHtml, safeJson } from "./render_section.js";
import { COMPONENT_ICONS } from "./cms_components.js";
import {
  campaignCoverUrl,
  campaignSummary,
  formatCampaignMoney,
  loadHomeFeaturedCampaigns,
} from "./campaign_public.js";

const CDN = "https://assets.companionsofcaddo.org";

function text(v) {
  if (v == null) return "";
  return String(v);
}

function pick(obj, keys) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return "";
}

function safeUrl(value, fallback = "") {
  const raw = text(value).trim();
  if (!raw) return fallback;
  if (raw.startsWith("/media/") || raw.startsWith("/static/")) return CDN + raw;
  if (raw.startsWith("/") || raw.startsWith("#")) return raw;
  try {
    const u = new URL(raw);
    if (["http:", "https:", "mailto:", "tel:"].includes(u.protocol)) return u.toString();
  } catch {}
  return fallback;
}

function escAttr(v) {
  return escapeHtml(v);
}

function sortBlocks(blocks) {
  return [...(blocks || [])].sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
}

function blockCfg(block) {
  return safeJson(block?.config_json, {});
}

function heroActionBtn(label, sub, action, variant = "primary", fieldAttrs = "") {
  if (!label) return "";
  const cls = variant === "ghost" ? "hero-cta hero-cta-ghost" : "hero-cta hero-cta-primary";
  const normalized = String(action || "").trim().toLowerCase();
  let triggerAttr = "";
  if (normalized === "contact") triggerAttr = 'data-modal="contact"';
  else if (normalized === "donate") triggerAttr = 'data-action="donate"';
  else triggerAttr = `data-action="${escAttr(normalized || "foster")}"`;

  const icons = {
    contact: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
    donate: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>`,
    foster: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>`,
  };
  const icon = icons[normalized] || icons.foster;

  return `<button class="${cls}" type="button" ${triggerAttr}${fieldAttrs ? " " + fieldAttrs : ""}>
            <span class="hero-cta-icon">${icon}</span>
            <span class="hero-cta-text">
              <span class="hero-cta-label">${escapeHtml(label)}</span>
              ${sub ? `<span class="hero-cta-sub">${escapeHtml(sub)}</span>` : ""}
            </span>
          </button>`;
}

function fieldStyleCss(cfg, kind = "text") {
  const parts = [];
  if (kind === "text" || kind === "heading") {
    const size = pick(cfg, ["text_size"]);
    const align = pick(cfg, ["text_align"]);
    const weight = pick(cfg, ["text_weight"]);
    if (size === "s") parts.push(kind === "heading" ? "font-size:clamp(1.4rem,3vw,2rem)" : "font-size:0.9rem");
    if (size === "l") parts.push(kind === "heading" ? "font-size:clamp(2.2rem,5vw,3.4rem)" : "font-size:1.15rem");
    if (align === "center" || align === "left" || align === "right") parts.push(`text-align:${align}`);
    if (weight === "bold") parts.push("font-weight:800");
    if (weight === "normal") parts.push("font-weight:400");
  }
  if (kind === "image") {
    const pos = pick(cfg, ["image_object_position"]) || pick(cfg, ["object_position"]);
    if (pos === "top") parts.push("object-position:center top");
    else if (pos === "left") parts.push("object-position:left center");
    else if (pos === "right") parts.push("object-position:right center");
    else if (pos === "center") parts.push("object-position:center center");
  }
  return parts.join(";");
}

function fieldStyleAttrs(cfg, kind = "text") {
  const css = fieldStyleCss(cfg, kind);
  return css ? ` style="${css}"` : "";
}

function sectionAttrs(sectionKey, cpasSlug) {
  const slug = cpasSlug || String(sectionKey || "").replace(/_/g, "-");
  return `data-cpas-section="${escAttr(slug)}" data-section-key="${escAttr(sectionKey)}"`;
}

function renderHeroTitle(heading, cfg = {}) {
  const raw = String(heading || "Every dog deserves a brighter tomorrow.").trim();
  const accent = pick(cfg, ["accent_phrase"]) || "a brighter tomorrow.";
  const doodleHeart = `<svg class="hero-doodle-heart" viewBox="0 0 100 90" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" aria-hidden="true"><path d="M50 80 C24 60 10 42 10 27 C10 14 20 7 29 7 C38 7 46 13 50 22 C54 13 62 7 71 7 C80 7 90 14 90 27 C90 42 76 60 50 80 Z"/></svg>`;
  const idx = raw.toLowerCase().indexOf(accent.toLowerCase());
  if (idx >= 0) {
    const before = raw.slice(0, idx).trim();
    const tail = raw.slice(idx).trim();
    return `${escapeHtml(before)} <span class="hero-title-accent">${escapeHtml(tail)}${doodleHeart}</span>`;
  }
  return escapeHtml(raw);
}

const HERO_WAVES = `<div class="hero-waves" aria-hidden="true">
    <svg class="wave-a" viewBox="0 0 1200 600" xmlns="http://www.w3.org/2000/svg"><path d="M0,180 C220,60 480,300 720,200 C960,100 1100,260 1200,180 L1200,0 L0,0 Z" fill="#c23689"/></svg>
    <svg class="wave-b" viewBox="0 0 1200 600" xmlns="http://www.w3.org/2000/svg"><path d="M0,420 C260,540 520,320 780,430 C1020,530 1140,400 1200,460 L1200,600 L0,600 Z" fill="#8e3a7d"/></svg>
    <svg class="wave-c" viewBox="0 0 1200 600" xmlns="http://www.w3.org/2000/svg"><path d="M0,300 C300,200 500,420 800,320 C1050,240 1150,360 1200,300 L1200,380 C1000,460 700,340 400,420 C200,470 80,380 0,400 Z" fill="#ffffff"/></svg>
    <svg class="wave-d" viewBox="0 0 1200 400" xmlns="http://www.w3.org/2000/svg"><path d="M0,180 C240,100 520,260 800,170 C1020,100 1140,200 1200,160 L1200,400 L0,400 Z" fill="#8e3a7d"/></svg>
  </div>`;

const HERO_MARK_PAW = `<svg class="hero-mark paw" viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
    <ellipse cx="50" cy="66" rx="20" ry="17"/>
    <ellipse cx="26" cy="42" rx="9" ry="12" transform="rotate(-18 26 42)"/>
    <ellipse cx="42" cy="30" rx="9" ry="12" transform="rotate(-6 42 30)"/>
    <ellipse cx="60" cy="30" rx="9" ry="12" transform="rotate(6 60 30)"/>
    <ellipse cx="76" cy="42" rx="9" ry="12" transform="rotate(18 76 42)"/>
  </svg>`;

const HERO_MARK_HEART = `<svg class="hero-mark heart" viewBox="0 0 100 90" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true">
    <path d="M50 82 C20 60 6 42 6 26 C6 12 17 4 28 4 C38 4 46 10 50 19 C54 10 62 4 72 4 C83 4 94 12 94 26 C94 42 80 60 50 82 Z"/>
  </svg>`;

function renderHeroFragment(section) {
  const cfg = safeJson(section.config_json, {});
  const eyebrow = pick(section, ["eyebrow"]) || pick(cfg, ["eyebrow"]) || "Caddo Parish · Volunteer Powered";
  const heading = pick(section, ["heading"]) || pick(cfg, ["heading"]) || "Every dog deserves a brighter tomorrow.";
  const sub = pick(section, ["subheading"]) || pick(section, ["body"]) || pick(cfg, ["subheading"])
    || "We move dogs from crisis to care—providing safe transport, veterinary support, foster connections, and loving homes. Together, we can give every dog the second chance they deserve.";
  const image = safeUrl(pick(section, ["image_url"]) || pick(cfg, ["image_url"]), `${CDN}/media/animals/upclose.webp`);
  const alt = pick(cfg, ["image_alt"]) || "A happy grey dog looking up at the camera on green grass";
  const headingStyle = fieldStyleAttrs(cfg, "heading");
  const textStyle = fieldStyleAttrs(cfg, "text");
  const imageStyle = fieldStyleAttrs(cfg, "image");
  const cta1 = heroActionBtn(
    pick(section, ["cta_label"]) || "Contact Us",
    pick(cfg, ["cta_sub"]) || "Let's work together",
    pick(cfg, ["cta_action"]) || "contact",
    "primary",
    'data-cms-field="cta_label"'
  );
  const cta2 = heroActionBtn(
    pick(section, ["cta_secondary_label"]) || "Support Our Mission",
    pick(cfg, ["cta_secondary_sub"]) || "Donate or give supplies",
    pick(cfg, ["cta_secondary_action"]) || "donate",
    "ghost",
    'data-cms-field="cta_secondary_label"'
  );

  return `<section class="hero-mockup hero-watercolor" ${sectionAttrs("hero")}>
  <div class="hero-header-bridge" aria-hidden="true"></div>
  ${HERO_WAVES}
  ${HERO_MARK_PAW}
  ${HERO_MARK_HEART}
  <div class="hero-mockup-fade" aria-hidden="true"></div>
  <div class="container hero-mockup-inner">
    <div class="hero-grid">
      <div class="hero-copy">
        <span class="hero-eyebrow" data-cms-field="eyebrow"${textStyle}>
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21 C5.4 16.2 2 12 2 8.2 C2 5 4.5 3 7.2 3 C9.2 3 11 4.2 12 6 C13 4.2 14.8 3 16.8 3 C19.5 3 22 5 22 8.2 C22 12 18.6 16.2 12 21 Z"/></svg>
          ${escapeHtml(eyebrow)}
        </span>
        <h1 class="hero-title" data-cms-field="heading"${headingStyle}>${renderHeroTitle(heading, cfg)}</h1>
        <p class="hero-lede" data-cms-field="subheading"${textStyle}>${escapeHtml(sub)}</p>
        <div class="hero-cta-slot">
          <div class="hero-actions">${cta1}${cta2}</div>
        </div>
      </div>
      <div class="hero-media">
        <div class="hero-photo" data-cms-field="image_url">
          <img src="${escAttr(image)}" alt="${escAttr(alt)}" loading="eager" decoding="async"${imageStyle} />
        </div>
      </div>
    </div>
  </div>
</section>`;
}

const MISSION_ICONS = [
  `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="1.5"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
  `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>`,
  `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a4 4 0 014-4h4a4 4 0 014 4v2"/></svg>`,
];

function renderMissionFragment(section, blocks) {
  const cfg = safeJson(section.config_json, {});
  const eyebrow = pick(section, ["eyebrow"]) || "Our Mission";
  const heading = pick(section, ["heading"]) || "We are the bridge from urgent to safe.";
  const body = pick(section, ["body"]) || pick(section, ["subheading"]);
  const headingStyle = fieldStyleAttrs(cfg, "heading");
  const textStyle = fieldStyleAttrs(cfg, "text");
  const steps = sortBlocks(blocks).filter((b) => Number(b.is_visible) !== 0);
  const stepHtml = steps.map((block, i) => {
    const label = pick(block, ["title"]) || pick(blockCfg(block), ["label"]) || "";
    const lines = label.split("\n").map((l) => escapeHtml(l)).join("<br>");
    const icon = pick(blockCfg(block), ["icon_svg"]) || MISSION_ICONS[i % MISSION_ICONS.length];
    const bk = escAttr(block.block_key || `step_${i + 1}`);
    return `<div class="mission-step" data-cms-field="block_title" data-cms-block="${bk}">
            <div class="mission-step-icon">${icon}</div>
            <span>${lines}</span>
          </div>${i < steps.length - 1 ? '<div class="mission-arrow">→</div>' : ""}`;
  }).join("\n          ");

  return `<section class="mission-wrap" ${sectionAttrs("mission")}>
  <div class="container">
    <div class="mission-card">
      <div class="mission-card-left">
        <div class="ey-purple" data-cms-field="eyebrow"${textStyle}>${escapeHtml(eyebrow)}</div>
        <h2 class="mission-heading" data-cms-field="heading"${headingStyle}>${escapeHtml(heading)}</h2>
        <p class="mission-body" data-cms-field="body"${textStyle}>${escapeHtml(body)}</p>
      </div>
      <div class="mission-card-right">
        <div class="mission-flow">${stepHtml}</div>
      </div>
    </div>
  </div>
</section>`;
}

const PILLAR_ICONS = [
  `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="1.5"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
  `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="1.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`,
  `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>`,
];

function renderHowItHelpsFragment(section, blocks) {
  const cfg = safeJson(section.config_json, {});
  const eyebrow = pick(section, ["eyebrow"]) || pick(section, ["heading"]) || "How Your Support Helps";
  const pillars = sortBlocks(blocks).filter((b) => Number(b.is_visible) !== 0);
  const pillarHtml = pillars.map((block, i) => {
    const bcfg = blockCfg(block);
    const icon = pick(bcfg, ["icon_svg"]) || PILLAR_ICONS[i % PILLAR_ICONS.length];
    const href = safeUrl(pick(block, ["href"]) || pick(bcfg, ["href"]), "#");
    const bk = escAttr(block.block_key || `pillar_${i + 1}`);
    return `<div class="pillar" data-cms-field="block_title" data-cms-block="${bk}">
        <div class="pillar-icon-wrap">${icon}</div>
        <h3 data-cms-field="block_title" data-cms-block="${bk}">${escapeHtml(pick(block, ["title"]) || "")}</h3>
        <p data-cms-field="block_body" data-cms-block="${bk}">${escapeHtml(pick(block, ["body"]) || "")}</p>
        <a href="${escAttr(href)}" data-cms-field="block_title" data-cms-block="${bk}">Learn more →</a>
      </div>`;
  }).join("\n      ");

  const extra = fieldStyleCss(cfg, "text");
  return `<section class="section s-light" ${sectionAttrs("how_it_helps", "how-it-helps")}>
  <div class="container">
    <div class="ey-purple" data-cms-field="eyebrow" style="text-align:center${extra ? ";" + extra : ""}">${escapeHtml(eyebrow)}</div>
    <div class="pillars-row">${pillarHtml}</div>
  </div>
</section>`;
}

async function renderTransportWinFragment(section, _blocks, env) {
  const cfg = safeJson(section.config_json, {});
  const eyebrow = pick(section, ["eyebrow"]) || "Recent Transport Win";
  const heading = pick(section, ["heading"]) || "";
  const body = pick(section, ["body"]) || pick(section, ["subheading"]);
  const image = safeUrl(
    pick(section, ["image_url"]) || pick(cfg, ["image_url", "campaign_image_url"]),
    `${CDN}/media/campaign/freedomfest.webp`
  );
  const alt = pick(cfg, ["image_alt"]) || "2026 Freedom Fest: Red, White & Rescued";
  const ctaLabel = pick(section, ["cta_label"]) || "Sponsor a Transport Seat";
  const ctaAction = pick(cfg, ["cta_action"]) || "donate";
  const ctaHref = safeUrl(pick(cfg, ["cta_href"]), "");
  const isExternalLink = ctaHref && ctaHref.startsWith("http");
  const headingStyle = fieldStyleAttrs(cfg, "heading");
  const textStyle = fieldStyleAttrs(cfg, "text");
  const imageStyle = fieldStyleAttrs(cfg, "image");
  let fbHref = "https://www.facebook.com/people/Companions-of-CPAS/100069291576354/";
  let igHref = "https://www.instagram.com/companionscpas";
  if (env?.DB) {
    try {
      const [fb, ig] = await Promise.all([
        env.DB.prepare("SELECT config_json FROM cms_components WHERE id = 'social_facebook' AND active = 1 LIMIT 1").first(),
        env.DB.prepare("SELECT config_json FROM cms_components WHERE id = 'social_instagram' AND active = 1 LIMIT 1").first(),
      ]);
      if (fb?.config_json) { const c = JSON.parse(fb.config_json); if (c.url) fbHref = c.url; }
      if (ig?.config_json) { const c = JSON.parse(ig.config_json); if (c.url) igHref = c.url; }
    } catch {}
  }
  const ctaEl = `<a class="dv2-social-pill dv2-social-pill--fb" href="${escAttr(fbHref)}" target="_blank" rel="noopener noreferrer" aria-label="Follow the journey on Facebook">${COMPONENT_ICONS.facebook}<span>Follow the journey</span></a>`;
  const socialHtml = `<a class="dv2-social-pill dv2-social-pill--ig" href="${escAttr(igHref)}" target="_blank" rel="noopener noreferrer" aria-label="See updates on Instagram">${COMPONENT_ICONS.instagram}<span>See updates on Instagram</span></a>`;

  return `<section class="section s-light" ${sectionAttrs("transport_win", "transport-win")}>
  <div class="container">
    <div class="story-block">
      <div class="story-block-img story-block-img--contain" data-cms-field="image_url">
        <img src="${escAttr(image)}" alt="${escAttr(alt)}" loading="lazy" decoding="async"${imageStyle} />
      </div>
      <div class="story-block-body">
        <div class="ey-purple" data-cms-field="eyebrow"${textStyle}>${escapeHtml(eyebrow)}</div>
        <h2 class="story-heading" data-cms-field="heading"${headingStyle}>${escapeHtml(heading)}</h2>
        <p class="story-body" data-cms-field="body"${textStyle}>${escapeHtml(body)}</p>
        <div class="story-cta-row">${ctaEl}${socialHtml}</div>
      </div>
    </div>
  </div>
</section>`;
}

const STAT_ICONS = [
  `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>`,
  `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
  `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>`,
  `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>`,
];

function renderImpactStatsFragment(section, blocks) {
  const stats = sortBlocks(blocks).filter((b) => Number(b.is_visible) !== 0);
  const cells = stats.map((block, i) => {
    const cfg = blockCfg(block);
    const icon = pick(cfg, ["icon_svg"]) || STAT_ICONS[i % STAT_ICONS.length];
    const bk = escAttr(block.block_key || `stat_${i + 1}`);
    return `<div class="stat-cell" data-cms-field="block_title" data-cms-block="${bk}">
        ${icon}
        <div class="stat-num" data-cms-field="block_title" data-cms-block="${bk}">${escapeHtml(pick(block, ["title"]) || pick(cfg, ["value"]) || "")}</div>
        <div class="stat-lbl" data-cms-field="block_subtitle" data-cms-block="${bk}">${escapeHtml(pick(block, ["subtitle"]) || pick(cfg, ["label"]) || "")}</div>
        <div class="stat-sub-lbl" data-cms-field="block_body" data-cms-block="${bk}">${escapeHtml(pick(block, ["body"]) || pick(cfg, ["sub"]) || "")}</div>
      </div>`;
  }).join("\n      ");

  return `<style>[data-cpas-section="impact-stats"]{display:block}</style>
<section class="stats-band s-purple" ${sectionAttrs("impact_stats", "impact-stats")}>
  <div class="container">
    <div class="stats-row">${cells}</div>
  </div>
</section>`;
}

function renderCampaignItemFromRow(campaign) {
  const raised = Number(campaign.raised_cents ?? campaign.raised_amount_cents) || 0;
  const goal = Number(campaign.goal_amount_cents) || 0;
  const pct = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;
  const image = campaignCoverUrl(campaign);
  const title = pick(campaign, ["title"]) || "Campaign";
  const desc = campaignSummary(campaign);
  const donateHref = `/donate?campaign=${encodeURIComponent(campaign.id)}`;
  const progressHtml = goal > 0
    ? `<div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
              <p class="progress-label">${formatCampaignMoney(raised)} of ${formatCampaignMoney(goal)} · ${pct}%</p>`
    : raised > 0
      ? `<p class="progress-label progress-label--open">${formatCampaignMoney(raised)} raised · ongoing</p>`
      : `<p class="progress-label progress-label--open">Support this campaign →</p>`;

  return `<a class="camp-item camp-item-link" href="${escAttr(donateHref)}" data-campaign-id="${escAttr(campaign.id)}">
            <div class="camp-item-thumb">
              <img src="${escAttr(image)}" alt="${escAttr(title)}" loading="lazy" decoding="async" />
            </div>
            <div class="camp-item-body">
              <p class="camp-item-title">${escapeHtml(title)}</p>
              <p class="camp-item-desc">${escapeHtml(desc)}</p>
              ${progressHtml}
            </div>
          </a>`;
}

function renderCampaignItem(block) {
  const cfg = blockCfg(block);
  const raised = Number(cfg.raised || 0);
  const goal = Number(cfg.goal || 1);
  const pct = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;
  const image = safeUrl(pick(block, ["image_url"]), `${CDN}/media/animals/goinhomejustadopted.webp`);
  const bk = escAttr(block.block_key || "campaign");
  return `<div class="camp-item" data-cms-field="block_title" data-cms-block="${bk}">
            <img src="${escAttr(image)}" alt="${escAttr(pick(block, ["alt_text"]) || pick(block, ["title"]) || "Campaign")}" data-cms-field="block_image" data-cms-block="${bk}" />
            <div class="camp-item-body">
              <p class="camp-item-title" data-cms-field="block_title" data-cms-block="${bk}">${escapeHtml(pick(block, ["title"]) || "")}</p>
              <p class="camp-item-desc" data-cms-field="block_body" data-cms-block="${bk}">${escapeHtml(pick(block, ["body"]) || "")}</p>
              <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
              <p class="progress-label">$${raised.toLocaleString()} of $${goal.toLocaleString()} · ${pct}%</p>
            </div>
          </div>`;
}

function renderCommunityItem(block) {
  const cfg = blockCfg(block);
  const image = safeUrl(pick(block, ["image_url"]), `${CDN}/media/team/thefounders.webp`);
  const bk = escAttr(block.block_key || "community");
  return `<div class="comm-item" data-cms-field="block_body" data-cms-block="${bk}">
            <img src="${escAttr(image)}" alt="${escAttr(pick(block, ["alt_text"]) || "Community update")}" data-cms-field="block_image" data-cms-block="${bk}" />
            <div>
              <p class="comm-item-text" data-cms-field="block_body" data-cms-block="${bk}">${escapeHtml(pick(block, ["body"]) || pick(block, ["title"]) || "")}</p>
              <p class="comm-item-date">${escapeHtml(pick(cfg, ["date"]) || "")}</p>
            </div>
          </div>`;
}

async function renderCampaignsFragment(section, blocks, env) {
  const cfg = safeJson(section.config_json, {});

  // Two-card layout — image cards with CTA, no live campaign data needed
  if (cfg.layout === "two_cards" && Array.isArray(cfg.cards) && cfg.cards.length) {
    const heading = pick(section, ["heading"]) || "";
    const cardHtml = cfg.cards.map((card) => {
      const href = escAttr(card.cta_href || "#");
      const external = card.cta_external ? ' target="_blank" rel="noopener noreferrer"' : "";
      return `<a class="home-action-card" href="${href}"${external}>
        <div class="home-action-card-img">
          <img src="${escAttr(card.image)}" alt="${escAttr(card.title)}" loading="lazy" decoding="async" />
        </div>
        <div class="home-action-card-body">
          ${card.eyebrow ? `<p class="ey-purple">${escapeHtml(card.eyebrow)}</p>` : ""}
          <h3>${escapeHtml(card.title)}</h3>
          <p>${escapeHtml(card.body)}</p>
          <span class="home-action-card-cta">${escapeHtml(card.cta_label)} →</span>
        </div>
      </a>`;
    }).join("\n");
    return `<section class="section s-light home-campaigns" ${sectionAttrs("campaigns")}>
  <div class="container">
    ${heading ? `<h2 class="section-heading" style="text-align:center;margin-bottom:2rem">${escapeHtml(heading)}</h2>` : ""}
    <div class="home-action-cards">${cardHtml}</div>
  </div>
</section>
<style>
.home-action-cards{display:grid;grid-template-columns:repeat(2,1fr);gap:1.5rem}
.home-action-card{display:flex;flex-direction:column;border-radius:16px;overflow:hidden;border:1px solid var(--border);background:var(--bg);text-decoration:none;color:inherit;transition:transform .2s,box-shadow .2s}
.home-action-card:hover{transform:translateY(-4px);box-shadow:0 12px 32px rgba(91,45,142,.12)}
.home-action-card-img img{width:100%;height:220px;object-fit:cover;display:block}
.home-action-card-body{padding:1.25rem 1.5rem 1.5rem;display:flex;flex-direction:column;gap:.5rem;flex:1}
.home-action-card-body h3{font-size:1.1rem;font-weight:700;color:var(--text-1);margin:0}
.home-action-card-body p{font-size:.9rem;color:var(--text-2);line-height:1.6;margin:0;flex:1}
.home-action-card-cta{font-size:.85rem;font-weight:600;color:#5b2d8e;margin-top:.5rem}
@media(max-width:640px){.home-action-cards{grid-template-columns:1fr}}
</style>`;
  }

  const all = sortBlocks(blocks).filter((b) => Number(b.is_visible) !== 0);
  const community = all.filter((b) => (b.block_type || "").includes("community") || pick(blockCfg(b), ["column"]) === "community");
  const campEyebrow = pick(cfg, ["campaigns_eyebrow"]) || pick(section, ["eyebrow"]) || "Featured Campaigns";
  const campLink = safeUrl(pick(cfg, ["campaigns_link"]) || "/donate", "/donate");
  const commEyebrow = pick(cfg, ["community_eyebrow"]) || "From Our Community";
  const commLink = safeUrl(pick(cfg, ["community_link"]) || "/community", "/community");
  const limit = Number(cfg.home_campaign_limit) || 3;

  let campaignHtml = "";
  if (env?.DB) {
    const liveCampaigns = await loadHomeFeaturedCampaigns(env, { limit });
    if (liveCampaigns.length) {
      campaignHtml = liveCampaigns.map(renderCampaignItemFromRow).join("\n          ");
    }
  }
  if (!campaignHtml) {
    const fallbackBlocks = all.filter((b) => (b.block_type || "").includes("campaign") || pick(blockCfg(b), ["column"]) === "campaigns");
    campaignHtml = fallbackBlocks.length
      ? fallbackBlocks.map(renderCampaignItem).join("\n          ")
      : `<p class="camp-empty">Active campaigns appear here as you publish them in <a href="/dashboard/fundraising">Fundraising</a>. <a href="${escAttr(campLink)}">Give now →</a></p>`;
  }

  return `<section class="section s-light home-campaigns" ${sectionAttrs("campaigns")}>
  <div class="container">
    <div class="cc-grid">
      <div class="cc-col cc-col-campaigns">
        <div class="cc-header">
          <div class="ey-purple" data-cms-field="eyebrow">${escapeHtml(campEyebrow)}</div>
          <a class="cc-view-all" href="${escAttr(campLink)}">View all →</a>
        </div>
        <div class="camp-list">${campaignHtml}</div>
      </div>
      <div class="cc-col cc-col-community">
        <div class="ey-purple cc-community-label" data-cms-field="subheading">${escapeHtml(commEyebrow)}</div>
        <div class="comm-list">${community.map(renderCommunityItem).join("\n          ")}</div>
        <a class="comm-see-all" href="${escAttr(commLink)}" data-cms-field="cta_secondary_label">See all updates →</a>
      </div>
    </div>
  </div>
</section>`;
}

function renderNewsletterFragment(section) {
  const cfg = safeJson(section.config_json, {});
  const heading = pick(section, ["heading"]) || "Stay in the loop. Be part of the second chances.";
  const sub = pick(section, ["subheading"]) || pick(section, ["body"]) || "";
  const fosterLabel = pick(section, ["cta_label"]) || pick(cfg, ["foster_label"]) || "Foster a Dog";
  const donateLabel = pick(section, ["cta_secondary_label"]) || pick(cfg, ["donate_label"]) || "Donate Now";

  return `<style>[data-cpas-section="newsletter"]{display:block}.cta-email-status{width:100%;margin:.35rem 0 0;color:rgba(255,255,255,.78);font-size:.8rem}</style>
<section class="cta-band s-purple" ${sectionAttrs("newsletter")}>
  <div class="container cta-band-inner">
    <div class="cta-band-left">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
      <div>
        <p class="cta-band-heading" data-cms-field="heading">${escapeHtml(heading)}</p>
        <p class="cta-band-sub" data-cms-field="subheading">${escapeHtml(sub)}</p>
      </div>
    </div>
    <div class="cta-band-right">
      <form class="cta-email-form" data-newsletter-form>
        <input type="email" name="email" class="cta-email-input" placeholder="Your email address" aria-label="Email" required />
        <button class="cta-email-btn" type="submit">Subscribe</button>
        <p class="cta-email-status" data-newsletter-status aria-live="polite"></p>
      </form>
      <div class="cta-action-row">
        <a class="cta-action-btn" href="#" data-action="foster" data-cms-field="cta_label">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
          ${escapeHtml(fosterLabel)}
        </a>
        <a class="cta-action-btn" href="#" data-action="donate" data-cms-field="cta_secondary_label">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
          ${escapeHtml(donateLabel)}
        </a>
      </div>
    </div>
  </div>
</section>`;
}

export const HOME_FRAGMENT_RENDERERS = {
  hero: renderHeroFragment,
  mission: renderMissionFragment,
  how_it_helps: renderHowItHelpsFragment,
  transport_win: (section, blocks, env) => renderTransportWinFragment(section, blocks, env),
  impact_stats: renderImpactStatsFragment,
  campaigns: renderCampaignsFragment,
  newsletter: renderNewsletterFragment,
};

export async function renderHomeFragment(env, section, blocks = []) {
  const key = pick(section, ["section_key"]);
  const renderer = HOME_FRAGMENT_RENDERERS[key];
  if (!renderer) return null;
  if (Number(section.is_visible) === 0) return "<!-- cms: section hidden -->";
  const result = renderer(section, blocks, env);
  return result instanceof Promise ? await result : result;
}

export function fragmentKeyForSection(sectionKey) {
  const map = {
    hero: "hero.html",
    mission: "mission.html",
    how_it_helps: "how-it-helps.html",
    transport_win: "transport-win.html",
    impact_stats: "impact-stats.html",
    campaigns: "campaigns.html",
    newsletter: "newsletter.html",
  };
  const file = map[sectionKey];
  return file ? `static/pages/home/${file}` : null;
}
