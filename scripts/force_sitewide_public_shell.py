from pathlib import Path
import re

PAGES = {
  "public/index.html": "/",
  "public/about.html": "/about",
  "public/adopt.html": "/adopt",
  "public/services.html": "/services",
  "public/donate.html": "/donate",
}

SHELL_CSS = r'''
<style id="cpas-sitewide-shell-final-v1">
:root{--shell-max:1160px;--shell-h:112px;--shell-dark:#050a12;--shell-light:#fbf7f1;--shell-text:#172033;--shell-muted:#526174;--shell-purple:#6d5593;--shell-radius:22px}
.site-header{position:sticky;top:0;z-index:9999;width:100%;height:var(--shell-h);background:transparent!important;border:0!important;box-shadow:none!important;backdrop-filter:none!important;transition:background .25s ease,box-shadow .25s ease,backdrop-filter .25s ease}
.site-header.scrolled,body[data-theme="dark"] .site-header{background:rgba(5,10,18,.78)!important;border-bottom:1px solid rgba(255,255,255,.08)!important;box-shadow:0 18px 60px rgba(0,0,0,.34)!important;backdrop-filter:blur(22px)!important}
.site-header .container.nav{width:min(var(--shell-max),calc(100% - 48px))!important;height:100%!important;margin:0 auto!important;padding:0!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:28px!important}
.site-header .brand{display:flex!important;align-items:center!important;width:122px!important;height:58px!important;text-decoration:none!important;flex:0 0 auto!important}
.logo-wrap{position:relative!important;display:block!important;width:122px!important;height:58px!important}
.site-header .logo{position:absolute!important;inset:0!important;width:122px!important;height:58px!important;object-fit:contain!important;transition:opacity .2s ease!important;filter:drop-shadow(0 10px 24px rgba(0,0,0,.18))!important}
body[data-theme="light"] .site-header:not(.scrolled) .logo-dark{opacity:1!important}
body[data-theme="light"] .site-header:not(.scrolled) .logo-light{opacity:0!important}
body[data-theme="dark"] .site-header .logo-light,.site-header.scrolled .logo-light{opacity:1!important}
body[data-theme="dark"] .site-header .logo-dark,.site-header.scrolled .logo-dark{opacity:0!important}
.site-header .desktop-links{display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:32px!important;margin:0!important;padding:0!important;font-weight:800!important;font-size:15px!important;line-height:1!important;white-space:nowrap!important}
.site-header .desktop-links a{display:inline-flex!important;align-items:center!important;justify-content:center!important;color:#172033!important;text-decoration:none!important;opacity:.74!important;padding:0!important;margin:0!important;background:transparent!important;border:0!important;box-shadow:none!important;transition:.2s ease!important}
.site-header .desktop-links a:hover,.site-header .desktop-links a.active{opacity:1!important;color:#111827!important;text-shadow:0 0 22px rgba(109,85,147,.38)!important}
body[data-theme="dark"] .site-header .desktop-links a,.site-header.scrolled .desktop-links a{color:#e9edf7!important;opacity:.72!important}
body[data-theme="dark"] .site-header .desktop-links a:hover,body[data-theme="dark"] .site-header .desktop-links a.active,.site-header.scrolled .desktop-links a:hover,.site-header.scrolled .desktop-links a.active{opacity:1!important;color:#fff!important;text-shadow:0 0 24px rgba(139,116,183,.75)!important}
.site-header .desktop-links .donate-link{opacity:1!important;padding:15px 22px!important;border-radius:18px!important;color:#fff!important;background:rgba(109,85,147,.9)!important;border:1px solid rgba(109,85,147,.28)!important;box-shadow:0 16px 38px rgba(109,85,147,.18)!important}
body[data-theme="light"] .site-header:not(.scrolled) .desktop-links .donate-link{color:#172033!important;background:rgba(255,255,255,.72)!important;border:1px solid rgba(23,32,51,.11)!important}
.site-header .hamburger{display:none!important}
footer{background:#fbf7f1!important;color:#172033!important;border-top:1px solid rgba(23,32,51,.08)!important;padding:70px 0!important}
footer .container.footer-grid{width:min(var(--shell-max),calc(100% - 48px))!important;margin:0 auto!important;display:grid!important;grid-template-columns:1.2fr .75fr .9fr .75fr!important;gap:34px!important;align-items:start!important}
.footer-logo{width:150px!important;height:auto!important;object-fit:contain!important;margin-bottom:18px!important}
.footer-links{display:flex!important;flex-direction:column!important;gap:10px!important}
.footer-links a,footer p,footer span{color:#4b5563!important;text-decoration:none!important;font-weight:700!important;line-height:1.7!important}
footer h3{color:#172033!important;font-size:28px!important;line-height:1!important;margin:0 0 14px!important}
.developer{display:flex!important;gap:14px!important;align-items:center!important;justify-content:flex-end!important}
.developer img{width:54px!important;height:auto!important;object-fit:contain!important}
@media(max-width:820px){
  .site-header{height:86px}
  .site-header .container.nav{width:min(100% - 28px, var(--shell-max))!important}
  .site-header .desktop-links{display:none!important}
  .site-header .hamburger{display:flex!important}
  footer .container.footer-grid{grid-template-columns:1fr!important}
  .developer{justify-content:flex-start!important}
}
</style>
'''

SHELL_JS = r'''
<script id="cpas-sitewide-shell-final-js">
(() => {
  const body = document.body;
  const header = document.getElementById("siteHeader") || document.querySelector(".site-header");
  if (!header) return;
  const defaultTheme = body.getAttribute("data-default-theme") || body.getAttribute("data-theme") || "light";
  body.setAttribute("data-default-theme", defaultTheme);
  function syncShell(){
    const scrolled = window.scrollY > 24;
    header.classList.toggle("scrolled", scrolled);
    body.setAttribute("data-theme", scrolled ? "dark" : defaultTheme);
  }
  syncShell();
  window.addEventListener("scroll", syncShell, {passive:true});
})();
</script>
'''

HEADER_TMPL = '''<header class="site-header" id="siteHeader">
  <div class="container nav">
    <a class="brand" href="/admin/login" aria-label="Companions of CPAS admin login">
      <span class="logo-wrap">
        <img class="logo logo-light" src="/logo.png" alt="Companions of CPAS">
        <img class="logo logo-dark" src="/assets/branding/logo-dark.webp" alt="Companions of CPAS">
      </span>
    </a>
    <nav class="desktop-links" aria-label="Primary navigation">
      <a href="/">Home</a>
      <a href="/about">About</a>
      <a href="/adopt">Adopt</a>
      <a href="/services">Services</a>
      <a href="/donate" class="donate-link">Donate</a>
    </nav>
    <button class="hamburger" type="button" aria-label="Open navigation" aria-controls="sideNav" aria-expanded="false"><span></span><span></span><span></span></button>
  </div>
</header>'''

def active_header(route):
    h = HEADER_TMPL
    if route == "/":
        h = h.replace('<a href="/">Home</a>', '<a class="active" href="/">Home</a>')
    else:
        label = route.strip("/").capitalize()
        if route == "/donate":
            h = h.replace('<a href="/donate" class="donate-link">Donate</a>', '<a class="active donate-link" href="/donate">Donate</a>')
        else:
            h = h.replace(f'<a href="{route}">{label}</a>', f'<a class="active" href="{route}">{label}</a>')
    return h

def remove_style_by_id(s, style_id):
    return re.sub(rf'\n?<style id="{re.escape(style_id)}">[\s\S]*?</style>\s*', '\n', s, flags=re.I)

for file, route in PAGES.items():
    p = Path(file)
    s = p.read_text(errors="ignore")

    for sid in [
      "global-cpas-shell-v1",
      "force-home-shell-about",
      "about-home-shell-override",
      "cpas-hard-shell-modal-v1",
    ]:
        s = remove_style_by_id(s, sid)

    s = re.sub(r"<header\b[\s\S]*?</header>", active_header(route), s, count=1, flags=re.I)

    if 'id="cpas-sitewide-shell-final-v1"' not in s:
        s = s.replace("</head>", SHELL_CSS + "\n</head>", 1)

    s = re.sub(r'<script id="global-cpas-shell-js">[\s\S]*?</script>\s*', '', s, flags=re.I)
    if 'id="cpas-sitewide-shell-final-js"' not in s:
        s = s.replace("</body>", SHELL_JS + "\n</body>", 1)

    # explicit page defaults
    default = "dark" if route in ["/", "/adopt", "/services", "/donate"] else "light"
    s = re.sub(r"<body\b([^>]*)>", lambda m: re.sub(r'\sdata-theme="[^"]*"', '', re.sub(r'\sdata-default-theme="[^"]*"', '', m.group(0)))[:-1] + f' data-theme="{default}" data-default-theme="{default}">', s, count=1, flags=re.I)

    p.write_text(s)
    print("forced sitewide shell:", file)

