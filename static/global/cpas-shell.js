/* CPAS shared.js — canonical June 2026 */

/* ── SCROLL-HIDE HEADER ──────────────────────────────────────── */
(function () {
  const header = document.querySelector('.site-header');
  if (!header) return;
  let lastY = window.scrollY;
  let ticking = false;

  // Apply scrolled class immediately if page loads mid-scroll
  if (window.scrollY > 10) header.classList.add('scrolled');

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const y = window.scrollY;

        // Scrolled state — glass background kicks in after 10px
        if (y > 10) {
          header.classList.add('scrolled');
        } else {
          header.classList.remove('scrolled');
        }

        // Hide on scroll down, reveal on scroll up
        if (y < 80) {
          header.classList.remove('header-hidden');
        } else if (y > lastY + 6) {
          header.classList.add('header-hidden');
        } else if (y < lastY - 6) {
          header.classList.remove('header-hidden');
        }

        lastY = y;
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
})();

/* ── MOBILE NAV DRAWER ───────────────────────────────────────── */
(function () {
  const toggle  = document.querySelector('.mobile-menu-toggle');
  const overlay = document.getElementById('navOverlay');
  const drawer  = document.getElementById('navDrawer');
  const close   = document.getElementById('drawerClose');
  if (!toggle || !drawer) return;

  function openNav() {
    drawer.classList.add('is-open');
    overlay && overlay.classList.add('is-open');
    toggle.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    document.body.classList.add('menu-open');
  }

  function closeNav() {
    drawer.classList.remove('is-open');
    overlay && overlay.classList.remove('is-open');
    toggle.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
  }

  toggle.addEventListener('click', () => {
    drawer.classList.contains('is-open') ? closeNav() : openNav();
  });

  close && close.addEventListener('click', closeNav);
  overlay && overlay.addEventListener('click', closeNav);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeNav();
  });

  /* Mark active link */
  const path = window.location.pathname;
  drawer.querySelectorAll('.drawer-link').forEach(a => {
    if (a.getAttribute('href') === path) a.classList.add('is-active');
  });
  document.querySelectorAll('.site-nav a').forEach(a => {
    if (a.getAttribute('href') === path) a.classList.add('active');
  });
})();
