const TENANT_ID = "tenant_companionscpas";

/** Public nav order + labels (route may differ from page title, e.g. Foster → /services). */
export const SITE_NAV_ITEMS = [
  { route: "/", label: "Home", sort: 10, inHeader: true, inFooter: true },
  { route: "/about", label: "About", sort: 20, inHeader: true, inFooter: true },
  { route: "/services", label: "Foster", sort: 30, inHeader: true, inFooter: true },
  { route: "/adopt", label: "Adopt", sort: 40, inHeader: true, inFooter: true },
  { route: "/community", label: "Community", sort: 50, inHeader: true, inFooter: true },
  { route: "/donate", label: "Donate", sort: 60, inHeader: false, inFooter: true, headerButton: true },
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

export async function renderSiteHeader(env) {
  const visibilityMap = await loadNavVisibility(env);
  const navItems = headerNavItems(visibilityMap);
  const showDonate = isRouteNavVisible(visibilityMap, "/donate");

  const navLis = navItems
    .map((item) => `<li><a href="${esc(item.route)}">${esc(item.label)}</a></li>`)
    .join("\n        ");

  const mobileLinks = [
    ...navItems.map((item) => `<a href="${esc(item.route)}">${esc(item.label)}</a>`),
    ...(showDonate ? ['<a href="/donate" class="mobile-donate">Donate</a>'] : []),
  ].join("\n  ");

  return `<header class="site-header">
  <div class="container header-inner">
    <a href="/admin/login" class="logo-link" aria-label="Companions of CPAS — staff login">
      <img src="/static/global/companionsofcpa-newlogo.webp" alt="Companions of CPAS" />
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
