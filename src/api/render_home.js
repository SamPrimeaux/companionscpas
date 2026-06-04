import { pageShell } from './_shell.js';

/**
 * PRIMETECH v1 — Home Page Renderer
 * Reads cms_page_sections + cms_navigation_items from D1.
 * Falls back to R2-stored static page on any DB error.
 */

const TENANT   = "tenant_companionscpas";
const R2_CSS   = "/static/global/cpas-shell.css";
const R2_FALLBACK_HTML = "/static/global/index.html";

// ─── Escape ────────────────────────────────────────────────────
function esc(s) {
  return (s || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function cfg(s) {
  try { return JSON.parse(s.config_json || "{}"); } catch { return {}; }
}

function href(path, fallback = "#") {
  const v = String(path || fallback).trim();
  if (!v || v === "#") return fallback;
  if (/^(https?:|mailto:|tel:|#|javascript:)/i.test(v)) return v;
  return v.startsWith("/") ? v : `/${v}`;
}

// ─── D1 Queries ────────────────────────────────────────────────
async function getSections(env) {
  const { results } = await env.DB.prepare(`
    SELECT section_key, section_type, eyebrow, heading, subheading,
           body, cta_label, cta_href, cta_action,
           cta_secondary_label, cta_secondary_href, cta_secondary_action,
           image_url, config_json, sort_order
    FROM cms_page_sections
    WHERE tenant_id = ? AND page_route = '/'
    ORDER BY sort_order ASC
  `).bind(TENANT).all();
  return results || [];
}

async function getBrand(env) {
  if (env.CMS_CACHE) {
    const cached = await env.CMS_CACHE.get('brand:tenant_companionscpas', { type: 'json' }).catch(() => null);
    if (cached) return cached;
  }
  const row = await env.DB.prepare(
    "SELECT organization_json, logo_dark_url, logo_light_url, footer_logo_dark_url FROM cms_brand_settings WHERE id = 'brand_companionscpas' LIMIT 1"
  ).bind().first().catch(() => null);
  const brand = {
    orgData:    (() => { try { return JSON.parse(row?.organization_json || '{}'); } catch { return {}; } })(),
    logoDark:   row?.logo_dark_url   || '/static/global/companionsofcpa-newlogo.webp',
    logoLight:  row?.logo_light_url  || '/static/global/companionsofcpa-newlogo.webp',
    footerLogo: row?.footer_logo_dark_url || '/static/global/companionsofcpa-newlogo.webp',
  };
  if (env.CMS_CACHE) {
    await env.CMS_CACHE.put('brand:tenant_companionscpas', JSON.stringify(brand), { expirationTtl: 60 }).catch(() => {});
  }
  return brand;
}

// ─── Section Renderers ─────────────────────────────────────────

function renderHero(s) {
  const img  = s.image_url || '/assets/animals/upclose.webp';
  // Normalize image: replace meauxxx.com asset URLs with R2-served relative paths
  const imgSrc = img.replace(/https:\/\/assets\.meauxxx\.com\/static\/pages\/home\//, '/assets/animals/');
  const cta1 = s.cta_label
    ? `<a class="btn btn-primary hero-cta-primary" href="${esc(href(s.cta_href))}">${esc(s.cta_label)}</a>` : "";
  const cta2 = s.cta_secondary_label
    ? `<button class="btn btn-ghost hero-cta-secondary" onclick="document.getElementById('donateModal')?.showModal()">${esc(s.cta_secondary_label)}</button>` : "";

  return `
<section class="section-hero hero-split" aria-label="Site hero">
  <!-- Mobile: full-bleed image behind text | Desktop: split layout -->
  <div class="hero-media-bg" aria-hidden="true">
    <img src="${esc(imgSrc)}" alt="" loading="eager" fetchpriority="high" />
    <div class="hero-scrim"></div>
  </div>
  <div class="container hero-body">
    <div class="hero-content">
      ${s.eyebrow ? `<div class="hero-badge">${esc(s.eyebrow)}</div>` : ""}
      <h1 class="hero-heading">${esc(s.heading)}</h1>
      ${s.body ? `<p class="hero-sub">${esc(s.body)}</p>` : ""}
      ${cta1 || cta2 ? `<div class="hero-actions">${cta1}${cta2}</div>` : ""}
    </div>
  </div>
</section>`;
}

function renderTextImage(s) {
  const c    = cfg(s);
  const side = c.image_position === "left" ? "row-reverse" : "row";
  const features = (c.feature_list || []).map(f =>
    `<li>${esc(f)}</li>`).join("");
  const cta = s.cta_label
    ? `<a class="btn btn-primary mt-md" href="${esc(href(s.cta_href))}">${esc(s.cta_label)}</a>` : "";

  return `
<section class="section">
  <div class="container section-text-image" style="flex-direction:${side}">
    <div class="text-col" style="flex:1;min-width:0">
      ${s.eyebrow ? `<div class="eyebrow">${esc(s.eyebrow)}</div>` : ""}
      <h2>${esc(s.heading)}</h2>
      ${s.body ? `<p class="text-muted mt-sm">${esc(s.body)}</p>` : ""}
      ${features ? `<ul class="feature-list">${features}</ul>` : ""}
      ${cta}
    </div>
    <div class="img-col" style="flex:1;min-width:0">
      ${s.image_url ? `<img src="${esc(s.image_url)}" alt="${esc(s.heading)}" />` : ""}
    </div>
  </div>
</section>`;
}

function renderCardGrid(s) {
  const c     = cfg(s);
  const cards = (c.cards || []).map(card => `
    <article class="card">
      ${card.image_url ? `<img class="card-img" src="${esc(card.image_url)}" alt="${esc(card.heading)}" />` : ""}
      <div class="card-body">
        <p class="card-title">${esc(card.heading)}</p>
        ${card.body ? `<p class="card-text">${esc(card.body)}</p>` : ""}
      </div>
    </article>`).join("");

  return `
<section class="section">
  <div class="container">
    ${s.eyebrow ? `<div class="eyebrow">${esc(s.eyebrow)}</div>` : ""}
    <h2>${esc(s.heading)}</h2>
    ${s.body ? `<p class="text-muted mt-sm mb-md" style="max-width:680px">${esc(s.body)}</p>` : ""}
    <div class="card-grid mt-md">${cards}</div>
  </div>
</section>`;
}

function renderCampaignGrid(s) {
  const c     = cfg(s);
  const cards = (c.cards || []).map(card => `
    <article class="card">
      ${card.image_url ? `<img class="card-img" src="${esc(card.image_url)}" alt="${esc(card.heading)}" />` : ""}
      <div class="card-body">
        ${card.eyebrow ? `<div class="eyebrow">${esc(card.eyebrow)}</div>` : ""}
        <p class="card-title">${esc(card.heading)}</p>
        ${card.body ? `<p class="card-text">${esc(card.body)}</p>` : ""}
      </div>
    </article>`).join("");

  return `
<section class="section">
  <div class="container">
    ${s.eyebrow ? `<div class="eyebrow">${esc(s.eyebrow)}</div>` : ""}
    <h2>${esc(s.heading)}</h2>
    <div class="card-grid mt-md">${cards}</div>
  </div>
</section>`;
}

function renderTestimonial(s) {
  return `
<section class="section-testimonial">
  <div class="container">
    ${s.eyebrow ? `<div class="eyebrow">${esc(s.eyebrow)}</div>` : ""}
    <p class="testimonial-quote">&ldquo;${esc(s.heading)}&rdquo;</p>
    ${s.subheading ? `<p class="testimonial-attr">— ${esc(s.subheading)}</p>` : ""}
  </div>
</section>`;
}

function renderOrgInfo(s) {
  const c   = cfg(s);
  const org = c.org_data || {};
  const con = c.contact  || {};

  const rows = [
    ["Tax status",       org.tax_status],
    ["EIN",              org.ein],
    ["Parish served",    org.parish],
    ["Operating budget", org.budget],
    ["Sector",           org.sector],
  ].filter(([,v]) => v).map(([label, val]) =>
    `<div style="display:flex;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid var(--border)">
      <span class="text-muted" style="font-size:13px">${esc(label)}</span>
      <span style="font-size:13px">${esc(val)}</span>
    </div>`).join("");

  return `
<section class="section">
  <div class="container" style="display:grid;grid-template-columns:1fr 1fr;gap:3rem">
    <div>
      <div class="eyebrow">Organization Data</div>
      <h3 class="mt-sm mb-md">${esc(s.heading)}</h3>
      ${rows}
    </div>
    <div>
      <div class="eyebrow">Contact</div>
      ${con.city  ? `<h3 class="mt-sm">${esc(con.city)}</h3>` : ""}
      ${con.email ? `<p class="text-muted mt-sm">Email: <a href="mailto:${esc(con.email)}" style="color:var(--purple-light)">${esc(con.email)}</a></p>` : ""}
      ${con.social_desc ? `<p class="text-muted mt-sm" style="font-size:13px">${esc(con.social_desc)}</p>` : ""}
    </div>
  </div>
</section>`;
}

function renderSection(s) {
  switch (s.section_type) {
    case "hero":          return renderHero(s);
    case "text_image":    return renderTextImage(s);
    case "card_grid":     return renderCardGrid(s);
    case "campaign_grid": return renderCampaignGrid(s);
    case "testimonial":   return renderTestimonial(s);
    case "org_info":      return renderOrgInfo(s);
    default: return "";
  }
}

// ─── Main Export ───────────────────────────────────────────────
export async function renderHome(env) {
  try {
    const [sections, brand] = await Promise.all([
      getSections(env),
      getBrand(env),
    ]);
    const { orgData, logoDark, logoLight, footerLogo } = brand || {};

    if (!sections.length) return null;

    const body = sections.map(renderSection).join("\n");

    return pageShell(
      "Companions of CPAS — Second Chances for Caddo Dogs",
      "Companions of CPAS funds critical care, opens transport pathways, and helps dogs at Caddo Parish Animal Services reach the families waiting for them.",
      body,
      { theme: 'dark', activePage: '/', orgData: orgData || {}, logoDark, logoLight, footerLogo }
    );

  } catch (err) {
    console.error("[renderHome] error:", err.message || err);
    // Fallback: fetch the R2-stored static homepage
    try {
      const r2  = await env.WEBSITE_ASSETS.get("static/global/index.html");
      if (r2) {
        const html = await r2.text();
        return html;
      }
    } catch { /* ignore */ }
    return null;
  }
}
