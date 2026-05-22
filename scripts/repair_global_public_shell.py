from pathlib import Path
import re

PAGES = [
  ("public/index.html", "/"),
  ("public/about.html", "/about"),
  ("public/adopt.html", "/adopt"),
  ("public/services.html", "/services"),
  ("public/donate.html", "/donate"),
]

HOME = Path("public/about.html").read_text(errors="ignore")

header = re.search(r"<header\b[\s\S]*?</header>", HOME, re.I).group(0)
footer = re.search(r"<footer\b[\s\S]*?</footer>", HOME, re.I).group(0)

SHELL_CSS = r"""
<style id="global-cpas-shell-v1">
html,body{margin:0!important;padding:0!important}
body[data-theme="light"]{background:#fbf7f1!important}
body[data-theme="dark"]{background:#050a12!important}

main{padding-top:0!important}
main.about-page{padding-top:0!important}

.site-header{
  position:fixed!important;
  top:0!important;
  left:0!important;
  width:100%!important;
  z-index:9999!important;
  background:transparent!important;
  border-bottom:0!important;
  box-shadow:none!important;
  backdrop-filter:none!important;
  transition:background .28s ease, box-shadow .28s ease, backdrop-filter .28s ease;
}

.site-header.scrolled{
  background:rgba(5,10,18,.76)!important;
  backdrop-filter:blur(18px)!important;
  box-shadow:0 18px 70px rgba(0,0,0,.24)!important;
}

body[data-theme="light"] .site-header .desktop-links a{
  color:#121826!important;
  opacity:.78!important;
}

body[data-theme="light"] .site-header .desktop-links a.active{
  color:#121826!important;
  opacity:1!important;
}

body[data-theme="light"] .site-header .desktop-links .donate-link{
  color:#121826!important;
  background:rgba(255,255,255,.52)!important;
  border:1px solid rgba(18,24,38,.14)!important;
}

.site-header.scrolled .desktop-links a,
.site-header.scrolled .desktop-links a.active{
  color:#f7f1ff!important;
}

.logo-wrap{
  position:relative!important;
  display:inline-grid!important;
  place-items:center!important;
  width:var(--logo-size,72px)!important;
  height:var(--logo-size,72px)!important;
}

.logo{
  grid-area:1 / 1!important;
  width:var(--logo-size,72px)!important;
  height:var(--logo-size,72px)!important;
  object-fit:contain!important;
  transition:opacity .22s ease!important;
}

.logo-dark{opacity:0}
.logo-light{opacity:1}

body[data-theme="light"] .logo-dark{opacity:1}
body[data-theme="light"] .logo-light{opacity:0}

.site-header.scrolled .logo-dark{opacity:0!important}
.site-header.scrolled .logo-light{opacity:1!important}

footer,.site-footer{
  background:#f8f1e9!important;
  color:#172033!important;
  border-top:0!important;
}

footer p,footer a,footer span,
.site-footer p,.site-footer a,.site-footer span{
  color:rgba(23,32,51,.72)!important;
}

footer h3,.site-footer h3{color:#172033!important}

footer .footer-logo,.site-footer .footer-logo{
  width:150px!important;
  height:auto!important;
}

footer .developer img,.site-footer .developer img{
  max-width:110px!important;
  opacity:.82!important;
  filter:none!important;
}

.about-hero,.hero{
  padding-top:140px!important;
}
</style>
"""

SHELL_JS = r"""
<script id="global-cpas-shell-js">
(() => {
  const header = document.querySelector(".site-header");
  if (!header) return;

  const defaultTheme = document.body.dataset.defaultTheme || document.body.dataset.theme || "light";

  const sync = () => {
    const scrolled = window.scrollY > 40;
    header.classList.toggle("scrolled", scrolled);
    document.body.setAttribute("data-theme", scrolled ? "dark" : defaultTheme);
  };

  sync();
  window.addEventListener("scroll", sync, { passive: true });
})();
</script>
"""

def active_header(route):
    h = re.sub(r'\sclass="active"', '', header)
    if route == "/":
        h = h.replace('<a href="/">Home</a>', '<a class="active" href="/">Home</a>')
    else:
        h = h.replace(f'<a href="{route}">', f'<a class="active" href="{route}">')
    return h

for file, route in PAGES:
    p = Path(file)
    if not p.exists():
        print("missing", file)
        continue

    s = p.read_text(errors="ignore")

    # remove old/global shell patches to avoid stacking
    s = re.sub(r'<style id="global-cpas-shell-v1">[\s\S]*?</style>', '', s, flags=re.I)
    s = re.sub(r'<style id="unified-header-theme">[\s\S]*?</style>', '', s, flags=re.I)
    s = re.sub(r'<style id="about-demo-polish-final">[\s\S]*?</style>', '', s, flags=re.I)
    s = re.sub(r'<script id="global-cpas-shell-js">[\s\S]*?</script>', '', s, flags=re.I)
    s = re.sub(r'<script id="unified-header-theme-js">[\s\S]*?</script>', '', s, flags=re.I)

    # remove legacy header/footer/mobile shell
    s = re.sub(r'<header\b[\s\S]*?</header>', '', s, count=1, flags=re.I)
    s = re.sub(r'<footer\b[\s\S]*?</footer>', '', s, count=1, flags=re.I)
    s = re.sub(r'\s*<div class="mobile-nav-overlay"></div>\s*', '\n', s, flags=re.I)
    s = re.sub(r'\s*<nav class="mobile-nav"[\s\S]*?</nav>\s*', '\n', s, flags=re.I)

    # remove bad top-padding rules
    s = s.replace('padding-top: var(--nav-h);', '')
    s = s.replace('padding-top:var(--nav-h);', '')
    s = s.replace('padding-top: 120px !important;', '')
    s = s.replace('padding-top: 72px !important;', '')

    # force body theme
    theme = "light" if route in ["/about", "/adopt", "/donate"] else "dark"
    s = re.sub(r'<body[^>]*>', f'<body data-theme="{theme}" data-default-theme="{theme}">', s, count=1, flags=re.I)

    # insert header immediately after body
    s = re.sub(r'(<body[^>]*>)', r'\1\n' + active_header(route), s, count=1, flags=re.I)

    # insert footer before closing body
    s = s.replace('</body>', footer + '\n' + SHELL_JS + '\n</body>', 1)

    # inject css before head close
    s = s.replace('</head>', SHELL_CSS + '\n</head>', 1)

    p.write_text(s)
    print("repaired shell:", file)

print("done: global CPAS public shell repaired")
