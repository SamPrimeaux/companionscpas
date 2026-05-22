import { pageShell, renderHeader, renderFooter } from './_shell.js';
/**
 * PRIMETECH v1 — Home Page Renderer
 * render_home.js
 *
 * Reads cms_page_sections + cms_navigation_items from D1,
 * renders the home page HTML using the exact same class/id
 * structure as the current static page so existing CSS applies.
 *
 * Falls back to null on any DB error — caller serves static asset.
 */

const TENANT = "tenant_companionscpas";

// ─── D1 helpers ───────────────────────────────────────────────────────────────

async function getSections(env) {
  const { results } = await env.DB.prepare(`
    SELECT section_key, section_type, eyebrow, heading, subheading,
           body, cta_label, cta_href, cta_action,
           cta_secondary_label, cta_secondary_href, cta_secondary_action,
           primary_asset_id, image_url, secondary_asset_id,
           config_json, sort_order
    FROM cms_page_sections
    WHERE tenant_id = ? AND page_route = '/'
    ORDER BY sort_order ASC
  `).bind(TENANT).all();
  return results || [];
}

async function getFooter(env) {
  return await env.DB.prepare(`
    SELECT heading, body, image_url, secondary_asset_id, config_json
    FROM cms_page_sections
    WHERE tenant_id = ? AND page_route = 'global' AND section_key = 'footer'
    LIMIT 1
  `).bind(TENANT).first();
}

async function getNav(env) {
  const { results } = await env.DB.prepare(`
    SELECT label, href, css_class, requires_auth, sort_order
    FROM cms_navigation_items
    WHERE tenant_id = ? AND nav_group = 'primary' AND is_visible = 1
    ORDER BY sort_order ASC
  `).bind(TENANT).all();
  return results || [];
}

async function getFooterNav(env) {
  const { results } = await env.DB.prepare(`
    SELECT label, href, requires_auth
    FROM cms_navigation_items
    WHERE tenant_id = ? AND nav_group = 'footer' AND is_visible = 1
      AND requires_auth = 0
    ORDER BY sort_order ASC
  `).bind(TENANT).all();
  return results || [];
}

function cfg(section) {
  try {
    return JSON.parse(section.config_json || "{}");
  } catch {
    return {};
  }
}

function esc(s) {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── Section renderers ────────────────────────────────────────────────────────

function renderNav(navItems, logoUrl) {
  const links = navItems.map(n => {
    const cls = n.css_class ? ` class="${esc(n.css_class)}"` : "";
    return `<a href="${esc(n.href)}"${cls}>${esc(n.label)}</a>`;
  }).join("\n        ");

  return `
  <header class="site-header">
    <div class="container header-inner">
      <a href="/" class="logo-link">
        <img src="${esc(logoUrl)}" alt="Companions of CPAS" class="logo" />
      </a>
      <nav class="main-nav">
        ${links}
      </nav>
    </div>
  </header>`;
}

function renderHero(s) {
  const c = cfg(s);
  const cta1Modal = s.cta_action === "modal" ? `data-open-modal="${esc(s.cta_href)}"` : `href="${esc(s.cta_href)}"`;
  const cta2Modal = s.cta_secondary_action === "modal" ? `data-open-modal="${esc(s.cta_secondary_href)}"` : `href="${esc(s.cta_secondary_href)}"`;
  const cta1Tag   = s.cta_action === "modal" ? "button" : "a";
  const cta2Tag   = s.cta_secondary_action === "modal" ? "button" : "a";

  const overlay = c.overlay_heading ? `
          <div class="hero-card">
            <strong>${esc(c.overlay_heading)}</strong>
            <span>${esc(c.overlay_body || "")}</span>
          </div>` : "";

  const cta1 = s.cta_label ? `<${cta1Tag} class="btn btn-primary" ${cta1Modal}>${esc(s.cta_label)}</${cta1Tag}>` : "";
  const cta2 = s.cta_secondary_label ? `<${cta2Tag} class="btn btn-ghost" ${cta2Modal}>${esc(s.cta_secondary_label)}</${cta2Tag}>` : "";

  const heroImg = s.image_url || '/assets/animals/upclose.webp';

  return `
  <section class="section-hero">
    <div class="container">
      <div class="hero-content">
        ${s.eyebrow ? `<div class="hero-badge">${esc(s.eyebrow)}</div>` : ""}
        <h1>${esc(s.heading)}</h1>
        ${s.body ? `<p class="text-muted mt-sm" style="max-width:600px;font-size:1.1rem;line-height:1.7">${esc(s.body)}</p>` : ""}
        ${cta1 || cta2 ? `<div class="hero-actions">${cta1}${cta2}</div>` : ""}
      </div>
    </div>
    <div style="position:absolute;inset:0;z-index:0;overflow:hidden;pointer-events:none">
      <img src="${esc(heroImg)}"
           alt="${esc(s.heading)}"
           style="position:absolute;right:0;top:0;height:100%;width:50%;object-fit:cover;object-position:center top" />
      <div style="position:absolute;inset:0;background:linear-gradient(90deg,var(--bg) 45%,transparent 75%)"></div>
    </div>
  </section>`;
}

function renderTextImage(s) {
  const c     = cfg(s);
  const side  = c.image_position === "left" ? "image-left" : "image-right";
  const ctaTag = s.cta_action === "modal" ? "button" : "a";
  const ctaAttr = s.cta_action === "modal"
    ? `data-open-modal="${esc(s.cta_href)}"`
    : `href="${esc(s.cta_href)}"`;

  const featureList = (c.feature_list || []).length > 0 ? `
      <ul class="feature-list">
        ${c.feature_list.map(f => `<li>${esc(f)}</li>`).join("\n        ")}
      </ul>` : "";

  const cta = s.cta_label
    ? `<${ctaTag} class="btn btn-primary" ${ctaAttr}>${esc(s.cta_label)}</${ctaTag}>`
    : "";

  return `
  <section class="section ${side}">
    <div class="container story-grid">
      <div class="copy-side">
        ${s.eyebrow ? `<div class="eyebrow">${esc(s.eyebrow)}</div>` : ""}
        <h2>${esc(s.heading)}</h2>
        ${s.body ? `<p>${esc(s.body)}</p>` : ""}
        ${featureList}
        ${cta}
      </div>
      <div class="media-side rounded-photo">
        ${s.image_url ? `<img src="${esc(s.image_url)}" alt="${esc(s.heading)}" />` : ""}
      </div>
    </div>
  </section>`;
}

function renderCardGrid(s) {
  const c     = cfg(s);
  const cards = (c.cards || []);
  const ctaTag  = s.cta_action === "modal" ? "button" : "a";
  const ctaAttr = s.cta_action === "modal"
    ? `data-open-modal="${esc(s.cta_href)}"`
    : `href="${esc(s.cta_href)}"`;

  const cardHtml = cards.map(card => `
      <article class="card">
        ${card.image_url ? `<img src="${esc(card.image_url)}" alt="${esc(card.heading)}" />` : ""}
        <div class="card-body">
          <h3>${esc(card.heading)}</h3>
          ${card.body ? `<p>${esc(card.body)}</p>` : ""}
        </div>
      </article>`).join("");

  const cta = s.cta_label
    ? `<div style="margin-top:30px"><${ctaTag} class="btn btn-primary" ${ctaAttr}>${esc(s.cta_label)}</${ctaTag}></div>`
    : "";

  return `
  <section id="${esc(s.section_key)}" class="section">
    <div class="container">
      ${s.eyebrow ? `<div class="eyebrow">${esc(s.eyebrow)}</div>` : ""}
      <h2>${esc(s.heading)}</h2>
      ${s.body ? `<p style="max-width:760px">${esc(s.body)}</p>` : ""}
      <div class="cards">${cardHtml}</div>
      ${cta}
    </div>
  </section>`;
}

function renderCampaignGrid(s) {
  const c     = cfg(s);
  const cards = (c.cards || []);

  const cardHtml = cards.map(card => `
      <article class="card campaign-card">
        ${card.image_url ? `<img src="${esc(card.image_url)}" alt="${esc(card.heading)}" />` : ""}
        <div class="card-body">
          ${card.eyebrow ? `<div class="eyebrow">${esc(card.eyebrow)}</div>` : ""}
          <h3>${esc(card.heading)}</h3>
          ${card.body ? `<p>${esc(card.body)}</p>` : ""}
          <div class="progress-bar"><span class="progress-fill"></span></div>
          <p class="raised-label">$0 raised &bull; Click to support</p>
        </div>
      </article>`).join("");

  return `
  <section class="section campaigns">
    <div class="container">
      ${s.eyebrow ? `<div class="eyebrow">${esc(s.eyebrow)}</div>` : ""}
      <h2>${esc(s.heading)}</h2>
      <div class="cards cards-2">${cardHtml}</div>
    </div>
  </section>`;
}

function renderTestimonial(s) {
  return `
  <section class="section testimonial-section">
    <div class="container">
      <div class="testimonial-card">
        ${s.eyebrow ? `<div class="eyebrow">${esc(s.eyebrow)}</div>` : ""}
        <blockquote>${esc(s.heading)}</blockquote>
        ${s.subheading ? `<cite>${esc(s.subheading)}</cite>` : ""}
      </div>
    </div>
  </section>`;
}

function renderOrgInfo(s) {
  const c    = cfg(s);
  const org  = c.org_data || {};
  const cont = c.contact  || {};

  const rows = [
    ["Tax status",       org.tax_status],
    ["EIN",              org.ein],
    ["Parish served",    org.parish],
    ["Operating budget", org.budget],
    ["Sector",           org.sector],
  ].filter(([, v]) => v).map(([label, val]) => `
          <div class="org-row">
            <span class="org-label">${esc(label)}</span>
            <span class="org-value">${esc(val)}</span>
          </div>`).join("");

  return `
  <section class="section org-info">
    <div class="container org-grid">
      <div class="org-card">
        <div class="eyebrow">Organization Data</div>
        <h2>${esc(s.heading)}</h2>
        ${rows}
      </div>
      <div class="org-card contact-card">
        <div class="eyebrow">Contact</div>
        ${cont.city ? `<h2>${esc(cont.city)}</h2>` : ""}
        ${cont.email ? `<p>Email: <a href="${esc(cont.email_href || "#")}">${esc(cont.email)}</a></p>` : ""}
        ${cont.social_desc ? `<p>${esc(cont.social_desc)}</p>` : ""}
      </div>
    </div>
  </section>`;
}

function renderFooter(footer, footerNav, logoUrl, badgeUrl) {
  const c    = footer ? cfg(footer) : {};
  const body = footer?.body || "";

  const navLinks = (footerNav || []).map(n =>
    `<a href="${esc(n.href)}">${esc(n.label)}</a>`
  ).join("\n          ");

  return `
  <footer class="site-footer">
    <div class="container footer-grid">
      <div class="footer-brand">
        <a href="/">
          <img src="${esc(logoUrl)}" alt="Companions of CPAS" class="footer-logo" />
        </a>
        ${body ? `<p>${esc(body)}</p>` : ""}
      </div>
      <div class="footer-nav">
        <p class="footer-nav-heading">Pages</p>
        ${navLinks}
      </div>
      <div class="footer-badge">
        <span>Developed by</span>
        <a href="${esc(c.badge_href || "https://inneranimalmedia.com")}" target="_blank" rel="noopener">
          <img src="${esc(badgeUrl)}" alt="Inner Animal Media" class="iam-badge" />
        </a>
      </div>
    </div>
  </footer>`;
}

// ─── Section dispatcher ───────────────────────────────────────────────────────

function renderSection(s) {
  switch (s.section_type) {
    case "hero":          return renderHero(s);
    case "text_image":    return renderTextImage(s);
    case "card_grid":     return renderCardGrid(s);
    case "campaign_grid": return renderCampaignGrid(s);
    case "testimonial":   return renderTestimonial(s);
    case "org_info":      return renderOrgInfo(s);
    default:              return `<!-- unknown section type: ${esc(s.section_type)} -->`;
  }
}

// ─── Page shell ───────────────────────────────────────────────────────────────

// pageShell now imported from ./_shell.js

// ─── Main export ──────────────────────────────────────────────────────────────

export async function renderHome(env) {
  try {
    const [sections, footer, navItems, footerNav] = await Promise.all([
      getSections(env),
      getFooter(env),
      getNav(env),
      getFooterNav(env),
    ]);

    if (!sections.length) return null; // fall back to static

    // Asset URLs
    const logoUrl  = "https://assets.meauxxx.com/static/assets/logo-dark.webp";
    const badgeUrl = "https://assets.meauxxx.com/static/assets/iam_badge.jpg";

    // Build page
    const nav      = renderNav(navItems, logoUrl);
    const body     = sections.map(renderSection).join("\n");
    const foot     = renderFooter(footer, footerNav, logoUrl, badgeUrl);
    const fullBody = `${nav}\n<main>${body}\n</main>\n${foot}`;

    return pageShell(
      "Companions of CPAS - Second Chances for Caddo Dogs", "Companions of CPAS funds critical care, opens transport pathways, and helps dogs at Caddo Parish Animal Services reach the families waiting for them.",
      fullBody
    , { theme: 'dark', activePage: '/', orgData: orgData || {} });
  } catch (err) {
    console.error("[renderHome] DB error:", err.message || err);
    return null; // fall back to static asset
  }
}
