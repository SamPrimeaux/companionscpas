from pathlib import Path
import re

ABOUT = Path("public/about.html")
html = ABOUT.read_text(errors="ignore")

html = re.sub(r"<style[^>]*force-home-shell-about.*?</style>", "", html, flags=re.S)
html = re.sub(r"<style[^>]*about-home-shell-override.*?</style>", "", html, flags=re.S)
html = re.sub(r"<style[^>]*unified-header-theme.*?</style>", "", html, flags=re.S)
html = re.sub(r"<script[^>]*unified-header-theme-js.*?</script>", "", html, flags=re.S)

html = re.sub(
    r'<a class="brand"[\s\S]*?</a>',
    '''<a class="brand" href="/">
  <span class="logo-wrap">
    <img class="logo logo-light" src="/logo.png" alt="Companions of CPAS">
    <img class="logo logo-dark" src="/assets/branding/logo-dark.webp" alt="Companions of CPAS">
  </span>
</a>''',
    html,
    count=1,
    flags=re.I
)

html = re.sub(
    r'<img class="footer-logo"[^>]*>',
    '<img class="footer-logo" src="/assets/branding/logo-dark.webp" alt="Companions of CPAS logo">',
    html,
    flags=re.I
)

html = re.sub(
    r'<div class="developer">[\s\S]*?</div>',
    '''<div class="developer">
  <span>Developed by</span>
  <img src="https://imagedelivery.net/g7wf09fCONpnidkRnR_5vw/87aac7e9-d6c7-4a53-df89-605e8020e000/avatar" alt="InnerAnimalMedia">
</div>''',
    html,
    flags=re.I
)

css = r'''
<style id="unified-header-theme">
body[data-theme="light"] .site-header {
  background: transparent;
}

body[data-theme="light"] .site-header .desktop-links a {
  color: #172033;
}

body[data-theme="light"] .site-header .desktop-links a.active {
  color: #172033;
}

body[data-theme="light"] .site-header .desktop-links .donate-link {
  color: #172033;
}

.site-header.scrolled {
  background: rgba(5,10,18,.78);
  backdrop-filter: blur(16px);
}

.site-header.scrolled .desktop-links a,
.site-header.scrolled .desktop-links a.active {
  color: #f7f1ff;
}

.logo-wrap {
  position: relative;
  display: inline-grid;
  place-items: center;
  width: var(--logo-size);
  height: var(--logo-size);
}

.logo {
  grid-area: 1 / 1;
  width: var(--logo-size);
  height: var(--logo-size);
  object-fit: contain;
  transition: opacity .22s ease;
}

.logo-dark {
  opacity: 0;
}

.logo-light {
  opacity: 1;
}

body[data-theme="light"] .logo-dark {
  opacity: 1;
}

body[data-theme="light"] .logo-light {
  opacity: 0;
}

.site-header.scrolled .logo-dark {
  opacity: 0;
}

.site-header.scrolled .logo-light {
  opacity: 1;
}

.site-footer {
  background: #f8f1e9;
  color: #172033;
}

.site-footer p,
.site-footer a,
.site-footer span {
  color: rgba(23,32,51,.72) !important;
}

.site-footer h3 {
  color: #172033;
}

.site-footer .footer-logo {
  width: 150px;
  height: auto;
}

.site-footer .developer img {
  max-width: 110px;
  opacity: .82;
  filter: none;
}
</style>
'''

js = r'''
<script id="unified-header-theme-js">
(() => {
  const header = document.querySelector(".site-header");
  if (!header) return;

  const sync = () => {
    const isScrolled = window.scrollY > 40;
    header.classList.toggle("scrolled", isScrolled);
    document.body.setAttribute("data-theme", isScrolled ? "dark" : "light");
  };

  sync();
  window.addEventListener("scroll", sync, { passive: true });
})();
</script>
'''

html = re.sub(r"<body[^>]*>", '<body data-theme="light">', html, count=1, flags=re.I)
html = html.replace("</head>", css + "\n</head>", 1)
html = html.replace("</body>", js + "\n</body>", 1)

ABOUT.write_text(html)
print("done: dual-theme header/footer applied")
