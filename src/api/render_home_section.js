import { escapeHtml, safeJson } from "./render_section.js";

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

function heroActionBtn(label, sub, action, variant = "primary") {
  if (!label) return "";
  const cls = variant === "ghost" ? "hero-cta hero-cta-ghost" : "hero-cta hero-cta-primary";
  const icon = variant === "ghost"
    ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>`
    : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>`;
  return `<button class="${cls}" type="button" data-action="${escAttr(action)}">
            <span class="hero-cta-icon">${icon}</span>
            <span class="hero-cta-text">
              <span class="hero-cta-label">${escapeHtml(label)}</span>
              ${sub ? `<span class="hero-cta-sub">${escapeHtml(sub)}</span>` : ""}
            </span>
          </button>`;
}

function renderHeroFragment(section) {
  const cfg = safeJson(section.config_json, {});
  const eyebrow = pick(section, ["eyebrow"]) || pick(cfg, ["eyebrow"]) || "Caddo Parish · Volunteer Powered";
  const heading = pick(section, ["heading"]) || pick(cfg, ["heading"]) || "Every dog deserves a way out.";
  const sub = pick(section, ["subheading"]) || pick(section, ["body"]) || pick(cfg, ["subheading"]);
  const image = safeUrl(pick(section, ["image_url"]) || pick(cfg, ["image_url"]), `${CDN}/media/animals/upclose.webp`);
  const alt = pick(cfg, ["image_alt"]) || "A dog at Caddo Parish Animal Services";
  const cta1 = heroActionBtn(
    pick(section, ["cta_label"]) || "Apply to Foster",
    pick(cfg, ["cta_sub"]) || "Open your home",
    pick(cfg, ["cta_action"]) || "foster",
    "primary"
  );
  const cta2 = heroActionBtn(
    pick(section, ["cta_secondary_label"]) || "Support Our Mission",
    pick(cfg, ["cta_secondary_sub"]) || "Donate or give supplies",
    pick(cfg, ["cta_secondary_action"]) || "donate",
    "ghost"
  );

  return `<style>
[data-cpas-section="hero"]{isolation:isolate}
@media(max-width:768px){[data-cpas-section="hero"] .hero-media-bg{position:relative;height:clamp(320px,62vw,520px)}[data-cpas-section="hero"] .hero-body{background:linear-gradient(180deg,#0b0f1a,#070b14)}}
</style>
<section class="hero-split" data-cpas-section="hero">
  <div class="hero-media-bg">
    <img src="${escAttr(image)}" alt="${escAttr(alt)}" />
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
        <p class="hero-sub">${escapeHtml(sub)}</p>
        <div class="hero-actions">${cta1}${cta2}</div>
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
  const steps = sortBlocks(blocks).filter((b) => Number(b.is_visible) !== 0);
  const stepHtml = steps.map((block, i) => {
    const label = pick(block, ["title"]) || pick(blockCfg(block), ["label"]) || "";
    const lines = label.split("\n").map((l) => escapeHtml(l)).join("<br>");
    const icon = pick(blockCfg(block), ["icon_svg"]) || MISSION_ICONS[i % MISSION_ICONS.length];
    return `<div class="mission-step">
            <div class="mission-step-icon">${icon}</div>
            <span>${lines}</span>
          </div>${i < steps.length - 1 ? '<div class="mission-arrow">→</div>' : ""}`;
  }).join("\n          ");

  return `<style>[data-cpas-section="mission"]{display:block;background:#ede8df}</style>
<section class="mission-wrap" data-cpas-section="mission">
  <div class="container">
    <div class="mission-card">
      <div class="mission-card-left">
        <div class="ey-purple">${escapeHtml(eyebrow)}</div>
        <h2 class="mission-heading">${escapeHtml(heading)}</h2>
        <p class="mission-body">${escapeHtml(body)}</p>
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
  const eyebrow = pick(section, ["eyebrow"]) || pick(section, ["heading"]) || "How Your Support Helps";
  const pillars = sortBlocks(blocks).filter((b) => Number(b.is_visible) !== 0);
  const pillarHtml = pillars.map((block, i) => {
    const cfg = blockCfg(block);
    const icon = pick(cfg, ["icon_svg"]) || PILLAR_ICONS[i % PILLAR_ICONS.length];
    const href = safeUrl(pick(block, ["href"]) || pick(cfg, ["href"]), "#");
    return `<div class="pillar">
        <div class="pillar-icon-wrap">${icon}</div>
        <h3>${escapeHtml(pick(block, ["title"]) || "")}</h3>
        <p>${escapeHtml(pick(block, ["body"]) || "")}</p>
        <a href="${escAttr(href)}">Learn more →</a>
      </div>`;
  }).join("\n      ");

  return `<style>[data-cpas-section="how-it-helps"]{background:#ede8df}</style>
<section class="section s-light" data-cpas-section="how-it-helps">
  <div class="container">
    <div class="ey-purple" style="text-align:center">${escapeHtml(eyebrow)}</div>
    <div class="pillars-row">${pillarHtml}</div>
  </div>
</section>`;
}

function renderTransportWinFragment(section) {
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

  return `<style>[data-cpas-section="transport-win"]{background:#ede8df}</style>
<section class="section s-light" data-cpas-section="transport-win">
  <div class="container">
    <div class="story-block">
      <div class="story-block-img story-block-img--contain">
        <img src="${escAttr(image)}" alt="${escAttr(alt)}" loading="lazy" decoding="async" />
      </div>
      <div class="story-block-body">
        <div class="ey-purple">${escapeHtml(eyebrow)}</div>
        <h2 class="story-heading">${escapeHtml(heading)}</h2>
        <p class="story-body">${escapeHtml(body)}</p>
        <a class="story-cta" href="#" data-action="${escAttr(ctaAction)}">
          ${escapeHtml(ctaLabel)}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </a>
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
    return `<div class="stat-cell">
        ${icon}
        <div class="stat-num">${escapeHtml(pick(block, ["title"]) || pick(cfg, ["value"]) || "")}</div>
        <div class="stat-lbl">${escapeHtml(pick(block, ["subtitle"]) || pick(cfg, ["label"]) || "")}</div>
        <div class="stat-sub-lbl">${escapeHtml(pick(block, ["body"]) || pick(cfg, ["sub"]) || "")}</div>
      </div>`;
  }).join("\n      ");

  return `<style>[data-cpas-section="impact-stats"]{display:block}</style>
<section class="stats-band s-purple" data-cpas-section="impact-stats">
  <div class="container">
    <div class="stats-row">${cells}</div>
  </div>
</section>`;
}

function renderCampaignItem(block) {
  const cfg = blockCfg(block);
  const raised = Number(cfg.raised || 0);
  const goal = Number(cfg.goal || 1);
  const pct = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;
  const image = safeUrl(pick(block, ["image_url"]), `${CDN}/media/animals/goinhomejustadopted.webp`);
  return `<div class="camp-item">
            <img src="${escAttr(image)}" alt="${escAttr(pick(block, ["alt_text"]) || pick(block, ["title"]) || "Campaign")}" />
            <div class="camp-item-body">
              <p class="camp-item-title">${escapeHtml(pick(block, ["title"]) || "")}</p>
              <p class="camp-item-desc">${escapeHtml(pick(block, ["body"]) || "")}</p>
              <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
              <p class="progress-label">$${raised.toLocaleString()} of $${goal.toLocaleString()} · ${pct}%</p>
            </div>
          </div>`;
}

function renderCommunityItem(block) {
  const cfg = blockCfg(block);
  const image = safeUrl(pick(block, ["image_url"]), `${CDN}/media/team/thefounders.webp`);
  return `<div class="comm-item">
            <img src="${escAttr(image)}" alt="${escAttr(pick(block, ["alt_text"]) || "Community update")}" />
            <div>
              <p class="comm-item-text">${escapeHtml(pick(block, ["body"]) || pick(block, ["title"]) || "")}</p>
              <p class="comm-item-date">${escapeHtml(pick(cfg, ["date"]) || "")}</p>
            </div>
          </div>`;
}

function renderCampaignsFragment(section, blocks) {
  const cfg = safeJson(section.config_json, {});
  const all = sortBlocks(blocks).filter((b) => Number(b.is_visible) !== 0);
  const campaigns = all.filter((b) => (b.block_type || "").includes("campaign") || pick(blockCfg(b), ["column"]) === "campaigns");
  const community = all.filter((b) => (b.block_type || "").includes("community") || pick(blockCfg(b), ["column"]) === "community");
  const campEyebrow = pick(cfg, ["campaigns_eyebrow"]) || pick(section, ["eyebrow"]) || "Featured Campaigns";
  const campLink = safeUrl(pick(cfg, ["campaigns_link"]) || "/donate", "/donate");
  const commEyebrow = pick(cfg, ["community_eyebrow"]) || "From Our Community";
  const commLink = safeUrl(pick(cfg, ["community_link"]) || "/community", "/community");

  return `<style>[data-cpas-section="campaigns"]{background:#ede8df}</style>
<section class="section s-light" data-cpas-section="campaigns">
  <div class="container">
    <div class="cc-grid">
      <div>
        <div class="cc-header">
          <div class="ey-purple">${escapeHtml(campEyebrow)}</div>
          <a class="cc-view-all" href="${escAttr(campLink)}">View all →</a>
        </div>
        <div class="camp-list">${campaigns.map(renderCampaignItem).join("\n          ")}</div>
      </div>
      <div>
        <div class="ey-purple">${escapeHtml(commEyebrow)}</div>
        <div class="comm-list">${community.map(renderCommunityItem).join("\n          ")}</div>
        <a class="comm-see-all" href="${escAttr(commLink)}">See all updates →</a>
      </div>
    </div>
  </div>
</section>`;
}

function renderNewsletterFragment(section) {
  const cfg = safeJson(section.config_json, {});
  const heading = pick(section, ["heading"]) || "Stay in the loop. Be part of the second chances.";
  const sub = pick(section, ["subheading"]) || pick(section, ["body"]) || "";
  const fosterLabel = pick(cfg, ["foster_label"]) || "Foster a Dog";
  const donateLabel = pick(cfg, ["donate_label"]) || "Donate Now";

  return `<style>[data-cpas-section="newsletter"]{display:block}.cta-email-status{width:100%;margin:.35rem 0 0;color:rgba(255,255,255,.78);font-size:.8rem}</style>
<section class="cta-band s-purple" data-cpas-section="newsletter">
  <div class="container cta-band-inner">
    <div class="cta-band-left">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
      <div>
        <p class="cta-band-heading">${escapeHtml(heading)}</p>
        <p class="cta-band-sub">${escapeHtml(sub)}</p>
      </div>
    </div>
    <div class="cta-band-right">
      <form class="cta-email-form" data-newsletter-form>
        <input type="email" name="email" class="cta-email-input" placeholder="Your email address" aria-label="Email" required />
        <button class="cta-email-btn" type="submit">Subscribe</button>
        <p class="cta-email-status" data-newsletter-status aria-live="polite"></p>
      </form>
      <div class="cta-action-row">
        <a class="cta-action-btn" href="#" data-action="foster">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
          ${escapeHtml(fosterLabel)}
        </a>
        <a class="cta-action-btn" href="#" data-action="donate">
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
  transport_win: renderTransportWinFragment,
  impact_stats: renderImpactStatsFragment,
  campaigns: renderCampaignsFragment,
  newsletter: renderNewsletterFragment,
};

export function renderHomeFragment(section, blocks = []) {
  const key = pick(section, ["section_key"]);
  const renderer = HOME_FRAGMENT_RENDERERS[key];
  if (!renderer) return null;
  if (Number(section.is_visible) === 0) return "<!-- cms: section hidden -->";
  return renderer(section, blocks);
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
