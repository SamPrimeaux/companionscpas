/**
 * Public site header/footer — SSOT: cms_pages (nav_visible, nav_label, nav_placement, sort_order).
 * No route allowlists. No fallback nav arrays. Empty D1 → empty chrome (fail loud in logs).
 */
import { getBrand } from "./render_page.js";
import { preferHeaderLogoUrl } from "./brand_tokens.js";

const TENANT_ID = "tenant_companionscpas";
const DEFAULT_LOGO = "https://imagedelivery.net/g7wf09fCONpnidkRnR_5vw/9a00de35-fa41-49da-e431-a5f004cf5e00/public";
const DEFAULT_CANDID_BADGE = {
  label: "Candid Seal of Transparency",
  href: "https://app.candid.org/profile/14607574/companions-of-cpas-88-4156327/?pkId=ef6a3773-8ef0-42a2-b7df-ad52ac334f0e",
  image_url: "https://widgets.guidestar.org/prod/v1/pdp/transparency-seal/14607574/svg",
  enabled: true,
};

const PLACEMENTS = new Set(["primary", "more", "cta", "footer_only", "none"]);

function esc(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizeRoute(route) {
  const raw = String(route || "").trim();
  if (!raw || raw === "/") return "/";
  let n = raw.startsWith("/") ? raw : `/${raw}`;
  if (n.length > 1) n = n.replace(/\/+$/, "");
  return n;
}

function normalizePlacement(raw) {
  const p = String(raw || "more").trim().toLowerCase();
  return PLACEMENTS.has(p) ? p : "more";
}

function shortLabelFromTitle(title, route) {
  const t = String(title || "").trim();
  if (!t) return normalizeRoute(route) === "/" ? "Home" : normalizeRoute(route);
  const cut = t.split(/[—–|-]/)[0]?.trim() || t;
  return cut.length > 32 ? cut.slice(0, 32).trim() : cut;
}

/**
 * @returns {Promise<Array<{route:string,label:string,placement:string,sort_order:number}>>}
 */
export async function loadNavPages(env) {
  if (!env?.DB) {
    console.error("[nav] DB binding missing — header/footer will be empty");
    return [];
  }
  try {
    const { results } = await env.DB.prepare(
      `SELECT route_path, title, nav_label, nav_placement, sort_order, nav_visible, status
       FROM cms_pages
       WHERE tenant_id = ?
         AND nav_visible = 1
         AND LOWER(COALESCE(status, '')) = 'published'
         AND LOWER(COALESCE(nav_placement, 'more')) != 'none'
       ORDER BY sort_order ASC, route_path ASC`
    ).bind(TENANT_ID).all();

    const pages = (results || []).map((row) => {
      const route = normalizeRoute(row.route_path);
      const label = String(row.nav_label || "").trim() || shortLabelFromTitle(row.title, route);
      return {
        route,
        label,
        placement: normalizePlacement(row.nav_placement),
        sort_order: Number(row.sort_order) || 50,
      };
    });

    if (!pages.length) {
      console.error("[nav] cms_pages returned zero chrome rows (published + nav_visible=1). Header/footer empty by design.");
    }
    return pages;
  } catch (err) {
    console.error("[nav] loadNavPages failed:", err?.message || err);
    return [];
  }
}

export async function resolveNavModel(env) {
  const pages = await loadNavPages(env);
  const byPlacement = (p) =>
    pages
      .filter((x) => x.placement === p)
      .sort((a, b) => (a.sort_order - b.sort_order) || a.label.localeCompare(b.label));

  const primary = byPlacement("primary");
  const more = byPlacement("more");
  const ctaList = byPlacement("cta");
  const donate = ctaList[0] || null;
  const footerOnly = byPlacement("footer_only");

  // Footer: all chrome pages except placement none (already filtered); include cta as text link
  const footer = pages
    .filter((p) => p.placement !== "none")
    .sort((a, b) => (a.sort_order - b.sort_order) || a.label.localeCompare(b.label));

  const mobile = [...primary, ...more, ...ctaList];

  return {
    primary,
    more,
    donate,
    footer,
    footerOnly,
    mobile,
    source: "cms_pages",
    pages,
  };
}

function headerLogoSrc(brand) {
  const raw = brand?.logo_light_url || brand?.logo_url || DEFAULT_LOGO;
  if (typeof raw !== "string" || !raw.trim()) return DEFAULT_LOGO;
  return preferHeaderLogoUrl(raw.trim()) || DEFAULT_LOGO;
}

function renderMoreDropdown(moreItems) {
  if (!moreItems.length) return "";
  const links = moreItems
    .map((item) => `<li role="none"><a role="menuitem" href="${esc(item.route)}">${esc(item.label)}</a></li>`)
    .join("\n            ");
  return `<li class="nav-more">
          <button type="button" class="nav-more-toggle" aria-expanded="false" aria-haspopup="true">More</button>
          <ul class="nav-more-menu" role="menu">
            ${links}
          </ul>
        </li>`;
}

export async function renderSiteHeader(env) {
  const [nav, brand] = await Promise.all([
    resolveNavModel(env),
    getBrand(env).catch(() => ({})),
  ]);
  const logoSrc = esc(headerLogoSrc(brand));
  const logoAlt = esc(brand?.brand_name || "Companions of CPAS");

  const primaryLis = nav.primary
    .map((item) => `<li><a href="${esc(item.route)}">${esc(item.label)}</a></li>`)
    .join("\n        ");
  const moreLis = renderMoreDropdown(nav.more);

  const mobileLinks = nav.mobile
    .map((item) => {
      const cls = item.placement === "cta" ? ' class="mobile-donate"' : "";
      return `<a href="${esc(item.route)}"${cls}>${esc(item.label)}</a>`;
    })
    .join("\n  ");

  const donateBtn = nav.donate
    ? `<a class="btn btn-primary" href="${esc(nav.donate.route)}">${esc(nav.donate.label)}</a>`
    : "";

  return `<header class="site-header" data-nav-source="cms_pages">
  <div class="container header-inner">
    <a href="/" class="logo-link" aria-label="${logoAlt} — home">
      <img src="${logoSrc}" alt="${logoAlt}" class="header-logo-img" />
    </a>
    <nav aria-label="Main navigation">
      <ul class="site-nav">
        ${primaryLis}
        ${moreLis}
      </ul>
    </nav>
    <div class="header-actions">
      ${donateBtn}
    </div>
    <button class="mobile-menu-toggle" type="button" aria-label="Open navigation">
      <span></span><span></span><span></span>
    </button>
  </div>
</header>

<div class="mobile-menu-panel" id="mobileMenuPanel">
  ${mobileLinks}
</div>`;
}

export async function renderSiteFooter(env) {
  const [nav, brand] = await Promise.all([
    resolveNavModel(env),
    getBrand(env).catch(() => ({})),
  ]);

  const org = brand?.organization || {};
  const socials = brand?.socials || {};
  const footerCfg = brand?.footer && typeof brand.footer === "object" ? brand.footer : {};
  // Until CMS saves footer_json.trust_badges, show Candid by default. Explicit [] hides all badges.
  const trustBadges = Object.prototype.hasOwnProperty.call(footerCfg, "trust_badges")
    ? (Array.isArray(footerCfg.trust_badges) ? footerCfg.trust_badges : [])
    : [DEFAULT_CANDID_BADGE];

  const orgName = brand?.brand_name || org.legal_name || org.name || "Companions of CPAS";
  const ein = org.ein || "88-4156327";
  const email = org.email || "companionsCPAS@gmail.com";
  const locationLine = String(org.city || org.parish || "Caddo Parish, Louisiana").trim() || "Caddo Parish, Louisiana";
  const tagline = org.mission || "A volunteer-run nonprofit helping dogs at Caddo Parish Animal Services receive medical care, transport support, and second chances.";
  const fbUrl = socials.facebook || "https://www.facebook.com/people/Companions-of-CPAS/100069291576354/";
  const igUrl = socials.instagram || "https://www.instagram.com/companionscpas";

  const logoSrc = String(brand?.footer_logo_light_url || brand?.footer_logo_dark_url || "").trim() || headerLogoSrc(brand);
  const iamLogo = brand?.developer_logo_light_url
    || "https://imagedelivery.net/g7wf09fCONpnidkRnR_5vw/238de9d1-a470-4fe5-5424-9182f4bc0500/avatar";

  const footerLis = nav.footer
    .map((item) => `<li><a href="${esc(item.route)}">${esc(item.label)}</a></li>`)
    .join("\n          ");

  const trustBadgesHtml = trustBadges
    .filter((b) => b && b.enabled !== false && b.enabled !== 0 && String(b.image_url || "").trim() && String(b.href || "").trim())
    .map((b) => {
      const label = String(b.label || "Trust badge").trim() || "Trust badge";
      return `<a class="footer-trust" href="${esc(b.href)}" target="_blank" rel="noopener" aria-label="${esc(label)}"><img src="${esc(b.image_url)}" alt="${esc(label)}" /></a>`;
    })
    .join("\n        ");
  const trustBlock = trustBadgesHtml
    ? `<div class="footer-trust-badges">${trustBadgesHtml}</div>`
    : "";

  const fbIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`;
  const igIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>`;
  const loginIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m10 17 5-5-5-5"/><path d="M15 12H3"/><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/></svg>`;

  return `<footer class="site-footer" data-nav-source="cms_pages">
  <div class="container">
    <div class="footer-grid">
      <div class="footer-brand">
        <img src="${esc(logoSrc)}" alt="${esc(orgName)}" class="footer-brand-logo" />
        <p class="footer-tagline">${esc(tagline)}</p>
      </div>
      <div>
        <p class="footer-col-label">Pages</p>
        <ul class="footer-links">
          ${footerLis}
        </ul>
      </div>
      <div>
        <p class="footer-col-label">Organization</p>
        <div class="footer-org-row">
          <span><strong>${esc(orgName)}</strong></span>
          <span>501(c)(3) Tax-Exempt</span>
          <span>EIN: ${esc(ein)}</span>
          <span>${esc(locationLine)}</span>
          <span><a href="mailto:${esc(email)}">${esc(email)}</a></span>
        </div>
      </div>
      <div>
        <p class="footer-col-label">Follow Us</p>
        <div class="footer-social-icons">
          <a href="${esc(fbUrl)}" target="_blank" rel="noopener" class="footer-social-icon footer-social-icon--fb" aria-label="Facebook">${fbIcon}</a>
          <a href="${esc(igUrl)}" target="_blank" rel="noopener" class="footer-social-icon footer-social-icon--ig" aria-label="Instagram">${igIcon}</a>
        </div>
        <p class="footer-col-label footer-staff-label">Staff</p>
        <a href="/admin/login" class="footer-admin-link" aria-label="Staff admin login">
          ${loginIcon}<span>Admin login</span>
        </a>
      </div>
    </div>
    <div class="footer-bottom">
      <p class="footer-ein">${esc(orgName)} &nbsp;·&nbsp; 501(c)(3) &nbsp;·&nbsp; EIN ${esc(ein)}</p>
      ${trustBlock}
      <a href="https://inneranimalmedia.com" target="_blank" rel="noopener" class="footer-iam-mark" aria-label="Built by Inner Animal Media">
        <span class="footer-iam-label">Built by</span>
        <img src="${esc(iamLogo)}" alt="Inner Animal Media" class="footer-iam-logo" />
      </a>
    </div>
  </div>
</footer>`;
}

export async function getSiteShellPartial(name, env) {
  if (name === "header") return renderSiteHeader(env);
  if (name === "footer") return renderSiteFooter(env);
  return "";
}

/** @deprecated — use loadNavPages. Kept empty-compat for accidental imports. */
export async function loadNavVisibility(env) {
  const map = new Map();
  const pages = await loadNavPages(env);
  for (const p of pages) map.set(p.route, true);
  return map;
}
