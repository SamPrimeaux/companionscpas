import { getBrand } from "./render_page.js";

const TENANT_ID = "tenant_companionscpas";

// Cloudflare Images — avatar variant (square crop). Double the rendered size via CSS.
const DEFAULT_LOGO = "https://imagedelivery.net/g7wf09fCONpnidkRnR_5vw/9a00de35-fa41-49da-e431-a5f004cf5e00/avatar";

/** Public nav order + labels. */
export const SITE_NAV_ITEMS = [
  { route: "/", label: "Home", sort: 10, inHeader: true, inFooter: true },
  { route: "/about", label: "About", sort: 20, inHeader: true, inFooter: true },
  { route: "/adopt", label: "Adopt", sort: 30, inHeader: true, inFooter: true },
  { route: "/community", label: "Community", sort: 40, inHeader: true, inFooter: true },
  { route: "/contact", label: "Contact", sort: 50, inHeader: true, inFooter: true },
  { route: "/services", label: "Foster", sort: 60, inHeader: false, inFooter: false },
  { route: "/donate", label: "Donate", sort: 70, inHeader: false, inFooter: true, headerButton: true },
];

function esc(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function loadNavVisibility(env) {
  const map = new Map();
  if (!env?.DB) return map;
  try {
    const { results } = await env.DB.prepare(
      "SELECT route_path, nav_visible FROM cms_pages WHERE tenant_id = ?"
    ).bind(TENANT_ID).all();
    for (const row of results || []) {
      map.set(String(row.route_path), Number(row.nav_visible) !== 0);
    }
  } catch {
    // nav_visible column may not exist yet — treat all as visible
  }
  return map;
}

function isRouteNavVisible(visibilityMap, route) {
  if (visibilityMap.has(route)) return visibilityMap.get(route);
  return true;
}

function headerNavItems(visibilityMap) {
  return SITE_NAV_ITEMS
    .filter((item) => item.inHeader && !item.headerButton)
    .filter((item) => isRouteNavVisible(visibilityMap, item.route))
    .sort((a, b) => a.sort - b.sort);
}

function footerNavItems(visibilityMap) {
  return SITE_NAV_ITEMS
    .filter((item) => item.inFooter)
    .filter((item) => isRouteNavVisible(visibilityMap, item.route))
    .sort((a, b) => a.sort - b.sort);
}

function headerLogoSrc(brand) {
  // Prefer brand logo from D1; fall back to CFI avatar
  const raw = brand?.logo_light_url || brand?.logo_url || DEFAULT_LOGO;
  if (typeof raw !== "string" || !raw.trim()) return DEFAULT_LOGO;
  return raw.trim();
}

export async function renderSiteHeader(env) {
  const [visibilityMap, brand] = await Promise.all([
    loadNavVisibility(env),
    getBrand(env).catch(() => ({})),
  ]);
  const navItems = headerNavItems(visibilityMap);
  const showDonate = isRouteNavVisible(visibilityMap, "/donate");
  const logoSrc = esc(headerLogoSrc(brand));
  const logoAlt = esc(brand?.brand_name || "Companions of CPAS");

  const navLis = navItems
    .map((item) => `<li><a href="${esc(item.route)}">${esc(item.label)}</a></li>`)
    .join("\n        ");

  const mobileLinks = [
    ...navItems.map((item) => `<a href="${esc(item.route)}">${esc(item.label)}</a>`),
    ...(showDonate ? ['<a href="/donate" class="mobile-donate">Donate</a>'] : []),
  ].join("\n  ");

  return `<header class="site-header">
  <div class="container header-inner">
    <a href="/" class="logo-link" aria-label="${logoAlt} — home">
      <img src="${logoSrc}" alt="${logoAlt}" class="header-logo-img" />
    </a>
    <nav aria-label="Main navigation">
      <ul class="site-nav">
        ${navLis}
      </ul>
    </nav>
    <div class="header-actions">
      ${showDonate ? '<a class="nav-donate" href="/donate">Donate</a>' : ""}
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
  const visibilityMap = await loadNavVisibility(env);
  const navItems = footerNavItems(visibilityMap);

  const footerLis = navItems
    .map((item) => `<li><a href="${esc(item.route)}">${esc(item.label)}</a></li>`)
    .join("\n          ");

  return `<footer class="site-footer">
  <div class="container">
    <div class="footer-grid">
      <div class="footer-brand">
        <img src="/static/global/companionsofcpa-newlogo.webp" alt="Companions of CPAS" />
        <p class="footer-tagline">A volunteer-run nonprofit helping dogs at Caddo Parish Animal Services receive medical care, transport support, and second chances.</p>
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
          <span><strong>Companions of CPAS</strong></span>
          <span>501(c)(3) Tax-Exempt</span>
          <span>EIN: 88-4156327</span>
          <span>Caddo Parish, Louisiana</span>
          <span><a href="mailto:companionsCPAS@gmail.com">companionsCPAS@gmail.com</a></span>
        </div>
      </div>
      <div>
        <p class="footer-col-label">Follow Us</p>
        <div class="footer-social-buttons">
          <a href="https://www.facebook.com/people/Companions-of-CPAS/100069291576354/" target="_blank" rel="noopener" class="footer-social-btn footer-social-btn--fb" aria-label="Facebook">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            <span>Facebook</span>
          </a>
          <a href="https://www.instagram.com/companionscpas" target="_blank" rel="noopener" class="footer-social-btn footer-social-btn--ig" aria-label="Instagram">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
            <span>Instagram</span>
          </a>
        </div>
        <p class="footer-col-label" style="margin-top:1.5rem;">Staff</p>
        <ul class="footer-links">
          <li><a href="/admin/login" style="opacity:0.4;font-size:11px;">Admin login</a></li>
        </ul>
      </div>
      <div class="footer-dev">
        <p class="footer-dev-label">Developed by</p>
        <a href="https://inneranimalmedia.com" target="_blank" rel="noopener">
          <img src="https://imagedelivery.net/g7wf09fCONpnidkRnR_5vw/238de9d1-a470-4fe5-5424-9182f4bc0500/avatar" alt="Inner Animal Media" />
        </a>
      </div>
    </div>
    <div class="footer-bottom">
      <p class="footer-ein">Companions of CPAS &nbsp;·&nbsp; 501(c)(3) &nbsp;·&nbsp; EIN 88-4156327</p>
      <div class="footer-socials">
        <a href="https://www.facebook.com/people/Companions-of-CPAS/100069291576354/" target="_blank" rel="noopener">Facebook</a>
        <a href="https://www.instagram.com/companionscpas" target="_blank" rel="noopener">Instagram</a>
      </div>
    </div>
  </div>
</footer>`;
}

export async function getSiteShellPartial(name, env) {
  if (name === "header") return renderSiteHeader(env);
  if (name === "footer") return renderSiteFooter(env);
  return "";
}
