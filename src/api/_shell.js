/**
 * _shell.js
 * PRIMETECH v1 — Global Header + Footer Template Strings
 * Drop into src/api/ and import into any page renderer.
 *
 * Usage:
 *   import { renderHeader, renderFooter, pageShell } from './shell.js';
 *   const html = pageShell('Title', 'desc', bodyHtml, { theme: 'dark', activePage: '/adopt' });
 */

function esc(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ── NAV LINKS ─────────────────────────────────────────────── */
const NAV_LINKS = [
  { label: 'Home',     href: '/' },
  { label: 'About',   href: '/about' },
  { label: 'Adopt',   href: '/adopt' },
  { label: 'Services',href: '/services' },
  { label: 'Community', href: '/community' },
];

/* ── LOGOS ─────────────────────────────────────────────────── */
const LOGO_DARK  = '/static/global/logo-dark.webp';
const LOGO_LIGHT = '/static/global/companionsofcpa-newlogo.webp';
const IAM_BADGE  = '/static/global/logo.webp';

/* ── HEADER ─────────────────────────────────────────────────── */
export function renderHeader({ theme = 'dark', activePage = '/', logoDark = LOGO_DARK, logoLight = LOGO_LIGHT } = {}) {
  const logo    = theme === 'dark' ? logoDark : logoLight;
  const navHtml = NAV_LINKS.map(({ label, href }) => {
    const isActive = activePage === href ? ' class="active"' : '';
    return `<li><a href="${esc(href)}"${isActive}>${esc(label)}</a></li>`;
  }).join('\n      ');

  return `
<header class="site-header">
  <div class="container header-inner">
    <a href="/admin/login" class="logo-link" aria-label="Companions of CPAS admin login">
      <img src="${esc(logo)}" alt="Companions of CPAS" />
    </a>
    <nav aria-label="Main navigation">
      <ul class="site-nav">
        ${navHtml}
      </ul>
    </nav>
    <div class="header-actions">
      <a class="btn btn-primary nav-donate" href="/donate">Donate</a>
    </div>
  </div>
</header>`.trim();
}

/* ── FOOTER ─────────────────────────────────────────────────── */
export function renderFooter({ orgData = {}, footerLogo = LOGO_DARK } = {}) {
  const {
    name            = 'Companions of CPAS',
    tax_status      = '501(c)(3) Tax-Exempt',
    ein             = '88-4156327',
    parish          = 'Caddo',
    operating_budget= 'Under $100,000',
    email           = 'companionsCPAS@gmail.com',
  } = orgData;

  const FOOTER_LINKS = [
    { label: 'Home',     href: '/' },
    { label: 'About',   href: '/about' },
    { label: 'Adopt',   href: '/adopt' },
    { label: 'Services',href: '/services' },
    { label: 'Community', href: '/community' },
    { label: 'Donate',  href: '/donate' },
  ];

  const footerLinksHtml = FOOTER_LINKS.map(({ label, href }) =>
    `<li><a href="${esc(href)}">${esc(label)}</a></li>`
  ).join('\n          ');

  return `
<footer class="site-footer">
  <div class="container">
    <div class="footer-grid">

      <!-- Brand -->
      <div class="footer-brand">
        <img src="${esc(footerLogo)}" alt="Companions of CPAS" />
        <p class="footer-tagline">
          A volunteer-run nonprofit helping dogs at Caddo Parish
          Animal Services receive medical care, transport support,
          and second chances.
        </p>
      </div>

      <!-- Pages -->
      <div>
        <p class="footer-col-label">Pages</p>
        <ul class="footer-links">
          ${footerLinksHtml}
        </ul>
      </div>

      <!-- Org Data -->
      <div>
        <p class="footer-col-label">Organization</p>
        <div class="footer-org-row">
          <span><strong>${esc(name)}</strong></span>
          <span>${esc(tax_status)}</span>
          <span>EIN: ${esc(ein)}</span>
          <span>Parish served: ${esc(parish)}</span>
          <span>Operating budget: ${esc(operating_budget)}</span>
          <span>Email: <a href="mailto:${esc(email)}">${esc(email)}</a></span>
        </div>
      </div>

      <!-- Developer -->
      <div class="footer-dev">
        <p class="footer-dev-label">Developed by</p>
        <a href="https://inneranimalmedia.com" target="_blank" rel="noopener">
          <img src="${esc(IAM_BADGE)}" alt="Inner Animal Media" />
        </a>
      </div>

    </div>

    <!-- Bottom bar -->
    <div class="footer-bottom">
      <p class="footer-ein">
        ${esc(name)} &nbsp;·&nbsp; ${esc(tax_status)} &nbsp;·&nbsp; EIN ${esc(ein)}
      </p>
      <div class="footer-socials">
        <a href="https://www.facebook.com/people/Companions-of-CPAS/100069291576354/?mibextid=hu50Ix"
           target="_blank" rel="noopener">Facebook</a>
        <a href="https://www.instagram.com/companionscpas"
           target="_blank" rel="noopener">Instagram</a>
      </div>
    </div>
  </div>
</footer>`.trim();
}

/* ── PAGE SHELL ─────────────────────────────────────────────── */
export function pageShell(title, metaDesc, bodyHtml, {
  theme      = 'dark',
  activePage = '/',
  orgData    = {},
  logoDark   = LOGO_DARK,
  logoLight  = LOGO_LIGHT,
  footerLogo = LOGO_DARK,
} = {}) {
  const header = renderHeader({ theme, activePage, logoDark, logoLight });
  const footer = renderFooter({ orgData, footerLogo });

  return `<!DOCTYPE html>
<html lang="en" class="${esc(theme === 'dark' ? 'theme-dark' : 'theme-light')}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="${esc(metaDesc)}" />
  <title>${esc(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="/static/global/shared.css" />
  <link rel="icon" href="/logo.png" />
</head>
<body class="${esc(theme === 'dark' ? 'theme-dark' : 'theme-light')}" data-theme="${esc(theme)}" data-route="${esc(activePage || '/')}" data-tenant="tenant_companionscpas">

${header}

<main class="site-main">
${bodyHtml}
</main>

${footer}

<script src="/static/global/shared.js"></script>
</body>
</html>`;
}
