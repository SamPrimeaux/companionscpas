/* ============================================================
   COMPANIONS OF CPAS — Global JS
   PRIMETECH v2 | shared.js
   - Mobile nav: full-screen overlay + right glass drawer
   - Active nav link from window.location.pathname
   - Footer injection (no Admin Dashboard link)
   - Body scroll lock when drawer open
   ============================================================ */

(function () {
  'use strict';

  /* ── 1. ACTIVE NAV STATE ─────────────────────────────────── */
  function setActiveLinks() {
    const path = window.location.pathname.replace(/\/$/, '') || '/';
    document.querySelectorAll('.site-nav a, .nav-drawer a').forEach(function (a) {
      const href = a.getAttribute('href');
      if (!href) return;
      const linkPath = href.replace(/\/$/, '') || '/';
      if (linkPath === path) {
        a.classList.add('active');
      } else {
        a.classList.remove('active');
      }
    });
  }

  /* ── 2. HEADER SCROLL BEHAVIOR ─────────────────────────────── */
  function initHeaderScroll() {
    const header = document.querySelector('.site-header');
    if (!header) return;
    let lastY = window.scrollY;
    let ticking = false;
    const THRESHOLD = 80;
    const HIDE_THRESHOLD = 40;

    function update() {
      const currentY = window.scrollY;
      const delta = currentY - lastY;

      if (currentY > THRESHOLD) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }

      if (delta > 8 && currentY > HIDE_THRESHOLD) {
        header.classList.add('header-hidden');
      } else if (delta < -4) {
        header.classList.remove('header-hidden');
      }

      lastY = currentY;
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
  }

  /* ── 2. MOBILE NAV ───────────────────────────────────────── */
  function initMobileNav() {
    const header = document.querySelector('.site-header');
    if (!header || header.dataset.mobileNavReady === '1') return;
    header.dataset.mobileNavReady = '1';

    const inner = header.querySelector('.header-inner') || header;

    /* Hamburger toggle */
    let toggle = header.querySelector('.mobile-menu-toggle');
    if (!toggle) {
      toggle = document.createElement('button');
      toggle.className = 'mobile-menu-toggle';
      toggle.type = 'button';
      toggle.setAttribute('aria-label', 'Open navigation');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.style.position = 'relative'; /* needed for absolute spans */
      toggle.innerHTML = '<span></span><span></span><span></span>';
      inner.appendChild(toggle);
    }

    /* Full-screen overlay scrim */
    let overlay = document.querySelector('.nav-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'nav-overlay';
      overlay.setAttribute('aria-hidden', 'true');
      document.body.appendChild(overlay);
    }

    /* Glass drawer — mobile first */
    let drawer = document.querySelector('.nav-drawer');
    if (!drawer) {
      const b = window.__BRAND || {};
      const theme = document.body.dataset.theme || 'dark';
      const headerLogo = theme === 'dark'
        ? (b.logo_light_url || '/static/global/companionsofcpa-newlogo.webp')
        : (b.logo_dark_url || '/static/global/logo-dark.webp');
      const currentPath = window.location.pathname;
      const links = [
        { href: '/', label: 'Home' },
        { href: '/about', label: 'About' },
        { href: '/adopt', label: 'Adopt' },
        { href: '/services', label: 'Services' },
        { href: '/donate', label: 'Donate' },
      ];
      const linksHtml = links.map(({ href, label }) => {
        const isActive = currentPath === href || (href !== '/' && currentPath.startsWith(href));
        return `<a href="${href}" class="drawer-link${isActive ? ' is-active' : ''}">${label}</a>`;
      }).join('');
      drawer = document.createElement('nav');
      drawer.className = 'nav-drawer';
      drawer.setAttribute('aria-label', 'Mobile navigation');
      drawer.innerHTML = `
        <div class="nav-drawer-inner">
          <div class="nav-drawer-header">
            <img src="${headerLogo}" alt="Companions of CPAS" class="drawer-logo" />
            <button class="drawer-close" aria-label="Close navigation">&times;</button>
          </div>
          <div class="nav-drawer-links">${linksHtml}</div>
        </div>`;
      document.body.appendChild(drawer);
      drawer.querySelector('.drawer-close').addEventListener('click', closeMenu);
    }

    /* Active state */
    setActiveLinks();

    /* Open / close helpers */
    function openMenu() {
      toggle.classList.add('is-open');
      overlay.classList.add('is-open');
      drawer.classList.add('is-open');
      toggle.setAttribute('aria-label', 'Close navigation');
      toggle.setAttribute('aria-expanded', 'true');
      document.body.classList.add('menu-open');
    }

    function closeMenu() {
      toggle.classList.remove('is-open');
      overlay.classList.remove('is-open');
      drawer.classList.remove('is-open');
      toggle.setAttribute('aria-label', 'Open navigation');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('menu-open');
    }

    /* Events */
    toggle.addEventListener('click', function () {
      toggle.classList.contains('is-open') ? closeMenu() : openMenu();
    });

    overlay.addEventListener('click', closeMenu);

    drawer.addEventListener('click', function (e) {
      if (e.target.closest('a')) closeMenu();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMenu();
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 760) closeMenu();
    });
  }

  /* ── 3. FOOTER ───────────────────────────────────────────── */
  function injectFooterStyles() {
    const style = document.createElement('style');
    style.textContent = [
      '.site-footer{position:relative;overflow:hidden;padding:72px 22px 32px;',
      'background:radial-gradient(circle at 20% 0%,rgba(124,58,237,.18),transparent 36%),',
      'radial-gradient(circle at 88% 20%,rgba(34,211,238,.12),transparent 40%),',
      'linear-gradient(180deg,#0c1222 0%,#050810 100%);',
      'color:rgba(255,255,255,.78);border-top:1px solid rgba(255,255,255,.07)}',

      '.footer-glow{position:absolute;inset:auto 0 0 0;height:200px;pointer-events:none;',
      'background:radial-gradient(80% 60% at 20% 100%,rgba(124,58,237,.38),transparent 60%),',
      'radial-gradient(80% 60% at 80% 100%,rgba(34,211,238,.28),transparent 62%);',
      'filter:blur(16px);transform:translateY(30%);',
      'animation:footerGlow 18s ease-in-out infinite alternate}',

      '@keyframes footerGlow{from{transform:translate(-2%,30%) scale(1)}to{transform:translate(2%,26%) scale(1.04)}}',

      '.footer-inner{position:relative;z-index:1;max-width:1180px;margin:auto;',
      'padding:36px 32px 28px;border-radius:28px;',
      'background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.08);',
      'box-shadow:0 20px 70px rgba(0,0,0,.3);backdrop-filter:blur(16px)}',

      '.footer-grid{display:grid;grid-template-columns:1.5fr 1fr 1fr .8fr;gap:28px;',
      'padding-bottom:28px;border-bottom:1px solid rgba(255,255,255,.07);margin-bottom:24px}',

      '.footer-logo{width:80px;height:80px;object-fit:contain;',
      'filter:drop-shadow(0 14px 28px rgba(124,58,237,.3));margin-bottom:14px}',

      '.footer-brand p{font-size:13px;line-height:1.7;color:rgba(255,255,255,.56);max-width:280px}',

      '.footer-col h4{font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;',
      'color:rgba(255,255,255,.38);margin-bottom:14px}',

      '.footer-col a,.footer-col p,.footer-col span{display:block;font-size:13px;',
      'color:rgba(255,255,255,.62);margin-bottom:8px;line-height:1.55;transition:color 180ms}',

      '.footer-col a:hover{color:#a78bfa}',

      '.footer-bottom{display:flex;align-items:center;justify-content:space-between;gap:16px;',
      'font-size:13px;color:rgba(255,255,255,.38)}',

      '.footer-bottom strong{color:#a78bfa}',

      '.footer-socials{display:flex;gap:16px}',

      '.footer-socials a{font-size:12px;letter-spacing:.06em;text-transform:uppercase;',
      'color:rgba(255,255,255,.38);transition:color 180ms}',

      '.footer-socials a:hover{color:rgba(255,255,255,.7)}',

      '@media(max-width:860px){',
      '.footer-grid{grid-template-columns:1fr 1fr;gap:20px}',
      '.footer-inner{padding:24px 18px}}',

      '@media(max-width:560px){',
      '.footer-grid{grid-template-columns:1fr}',
      '.footer-bottom{flex-direction:column;align-items:flex-start}}',

      '@media(prefers-reduced-motion:reduce){.footer-glow{animation:none}}',
    ].join('');
    document.head.appendChild(style);
  }

  function renderFooter() {
    const placeholder = document.getElementById('site-footer');
    const b = window.__BRAND || {};
    const theme = document.body.dataset.theme || 'dark';
    const clientLogo = theme === 'dark'
      ? (b.footer_logo_dark_url || '/static/global/companionsofcpa-newlogo.webp')
      : (b.footer_logo_light_url || '/static/global/logo-dark.webp');
    const devLogo = theme === 'dark'
      ? (b.developer_logo_dark_url || '')
      : (b.developer_logo_light_url || '');
    const logoWidth = b.footer_logo_width || 120;
    const brandName = b.brand_name || 'Companions of CPAS';
    const footerHTML = [
      '<footer class="site-footer">',
      '  <div class="footer-glow" aria-hidden="true"></div>',
      '  <div class="footer-inner">',
      '    <div class="footer-grid">',

      '      <div class="footer-brand footer-col">',
      `        <img src="${clientLogo}" alt="${brandName}" class="footer-logo" style="width:${logoWidth}px;height:auto" />`,
      '        <p>Companions of CPAS gives dogs at Caddo Parish Animal Services',
      '           a second chance through medical support, rescue transport, and community awareness.</p>',
      '      </div>',

      '      <div class="footer-col">',
      '        <h4>Pages</h4>',
      '        <a href="/">Home</a>',
      '        <a href="/about">About</a>',
      '        <a href="/adopt">Adopt</a>',
      '        <a href="/services">Services</a>',
      '        <a href="/donate">Donate</a>',
      '      </div>',

      '      <div class="footer-col">',
      '        <h4>Nonprofit Info</h4>',
      '        <p>501(c)(3) Tax-Exempt</p>',
      '        <p>EIN: 88-4156327</p>',
      '        <p>Parish: Caddo</p>',
      '        <p>Sector: Animals</p>',
      '        <a href="mailto:companionsCPAS@gmail.com">companionsCPAS@gmail.com</a>',
      '        <p>Shreveport, LA 71106</p>',
      '      </div>',

      devLogo ? [
      '      <div class="footer-col">',
      '        <p class="footer-col-label">Developed by</p>',
      '        <a href="https://inneranimalmedia.com" target="_blank" rel="noopener">',
      `          <img src="${devLogo}" alt="Inner Animal Media" style="height:32px;width:auto;opacity:.6;transition:opacity 180ms" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.6" />`,
      '        </a>',
      '      </div>',
      ].join('\n') : '',

      '    </div>',

      '    <div class="footer-bottom">',
      '      <span>Companions of CPAS &nbsp;&middot;&nbsp; 501(c)(3) Tax-Exempt &nbsp;&middot;&nbsp; EIN 88-4156327</span>',
      '      <div class="footer-socials">',
      '        <a href="https://www.facebook.com/people/Companions-of-CPAS/100069291576354/?mibextid=hu50Ix"',
      '           target="_blank" rel="noopener">Facebook</a>',
      '        <a href="https://www.instagram.com/companionscpas"',
      '           target="_blank" rel="noopener">Instagram</a>',
      '      </div>',
      '    </div>',

      '  </div>',
      '</footer>',
    ].join('\n');

    if (placeholder) {
      placeholder.outerHTML = footerHTML;
    } else {
      /* If no placeholder, replace any existing <footer> or append */
      const existing = document.querySelector('footer.site-footer');
      if (existing) {
        existing.outerHTML = footerHTML;
      }
    }
  }

  /* ── INIT ────────────────────────────────────────────────── */
  function init() {
    injectFooterStyles();
    renderFooter();
    setActiveLinks();
    initHeaderScroll();
    initMobileNav();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

}());
