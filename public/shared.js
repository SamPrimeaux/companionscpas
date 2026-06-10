/* CPAS shared.js — canonical June 2026 */

/* ── SCROLL-HIDE HEADER ──────────────────────────────────────── */
(function () {
  const header = document.querySelector('.site-header');
  if (!header) return;
  let lastY = window.scrollY;
  let ticking = false;

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (y < 80) {
          header.classList.remove('header-hidden');
        } else if (y > lastY + 4) {
          header.classList.add('header-hidden');
        } else if (y < lastY - 4) {
          header.classList.remove('header-hidden');
        }
        lastY = y;
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
})();

/* ── MOBILE MENU TOGGLE ──────────────────────────────────────── */
(function () {
  const btn = document.querySelector('.mobile-menu-toggle');
  const panel = document.querySelector('.mobile-menu-panel');
  if (!btn || !panel) return;

  btn.addEventListener('click', () => {
    const open = panel.classList.toggle('is-open');
    btn.setAttribute('aria-expanded', open);
  });

  document.addEventListener('click', (e) => {
    if (!btn.contains(e.target) && !panel.contains(e.target)) {
      panel.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
    }
  });
})();
