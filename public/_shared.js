(function () {
  const FOOTER_HTML = `
    <footer class="site-footer">
      <div class="footer-waves" aria-hidden="true"></div>
      <div class="footer-card">
        <div class="footer-grid">
          <section class="footer-brand">
            <img src="/logo.png" alt="Companions of CPAS" class="footer-logo">
            <p>Companions of CPAS gives dogs at Caddo Parish Animal Services a second chance through medical support, rescue transport, and community awareness.</p>
          </section>

          <section>
            <h4>Contact</h4>
            <a href="mailto:companionsCPAS@gmail.com">companionsCPAS@gmail.com</a>
            <p>Shreveport, LA 71106</p>
            <a href="https://www.companionscpas.org">companionscpas.org</a>
          </section>

          <section>
            <h4>Nonprofit Info</h4>
            <p>501(c)(3) Tax-Exempt</p>
            <p>EIN: 88-4156327</p>
            <p>Parish: Caddo</p>
            <p>Sector: Animals</p>
          </section>

          <section>
            <h4>Quick Links</h4>
            <a href="/">Home</a>
            <a href="/about">About</a>
            <a href="/adopt">Adopt</a>
            <a href="/services">Services</a>
            <a href="/donate">Donate</a>
          </section>
        </div>

        <div class="footer-bottom">
          <span>© 2026 Companions of CPAS. All rights reserved.</span>
          <span>Developed by <strong>Inner Animal Media</strong></span>
        </div>
      </div>
    </footer>
  `;

  const style = document.createElement('style');
  style.textContent = `
    .site-footer{position:relative;overflow:hidden;padding:72px 22px 28px;background:radial-gradient(circle at 20% 0%,rgba(124,58,237,.22),transparent 34%),radial-gradient(circle at 90% 20%,rgba(34,211,238,.18),transparent 38%),linear-gradient(180deg,#0b1220 0%,#05070d 100%);color:rgba(255,255,255,.86);border-top:1px solid rgba(255,255,255,.08)}
    .footer-waves{position:absolute;inset:auto 0 0 0;height:220px;pointer-events:none;opacity:.7;background:radial-gradient(80% 60% at 20% 100%,rgba(124,58,237,.45),transparent 60%),radial-gradient(80% 60% at 70% 100%,rgba(14,165,233,.38),transparent 62%),radial-gradient(80% 60% at 100% 100%,rgba(34,211,238,.34),transparent 58%);filter:blur(18px);transform:translateY(38%);animation:footerWaveDrift 16s ease-in-out infinite alternate}
    @keyframes footerWaveDrift{from{transform:translate3d(-2%,38%,0) scale(1)}to{transform:translate3d(2%,34%,0) scale(1.05)}}
    .footer-card{position:relative;z-index:1;max-width:1180px;margin:auto;padding:34px;border-radius:28px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.09);box-shadow:0 24px 80px rgba(0,0,0,.32);backdrop-filter:blur(18px)}
    .footer-grid{display:grid;grid-template-columns:1.5fr 1fr 1fr .8fr;gap:28px}
    .footer-logo{width:86px;height:86px;object-fit:contain;filter:drop-shadow(0 18px 34px rgba(124,58,237,.36));margin-bottom:14px}
    .site-footer h4{margin:0 0 14px;color:#fff;font-size:14px;text-transform:uppercase;letter-spacing:.08em}
    .site-footer p,.site-footer a{display:block;margin:0 0 10px;color:rgba(255,255,255,.78);text-decoration:none;line-height:1.55}
    .site-footer a:hover{color:#a78bfa}
    .footer-brand p{max-width:420px}
    .footer-bottom{display:flex;justify-content:space-between;gap:18px;border-top:1px solid rgba(255,255,255,.08);margin-top:28px;padding-top:20px;color:rgba(255,255,255,.66);font-size:14px}
    .footer-bottom strong{color:#a78bfa}
    @media(max-width:860px){.footer-grid{grid-template-columns:1fr}.footer-bottom{flex-direction:column}.footer-card{padding:24px}}
    @media(prefers-reduced-motion:reduce){.footer-waves{animation:none}}
  `;
  document.head.appendChild(style);

  function renderFooter() {
    const el = document.getElementById('site-footer');
    if (el) el.outerHTML = FOOTER_HTML;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderFooter);
  } else {
    renderFooter();
  }
})();
