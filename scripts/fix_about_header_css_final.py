from pathlib import Path
import re

p = Path("public/about.html")
s = p.read_text(errors="ignore")

FORCE_CSS = """
<style id="force-home-shell-about">
body .site-header {
  position: sticky !important;
  top: 0 !important;
  z-index: 1000 !important;
  backdrop-filter: blur(16px) !important;
  background: rgba(5,10,18,.48) !important;
  box-shadow: 0 16px 50px rgba(0,0,0,.20) !important;
  border-bottom: 1px solid rgba(255,255,255,.08) !important;
}

body .site-header .container.nav {
  max-width: 1180px !important;
  width: min(1180px, calc(100% - 64px)) !important;
  margin: 0 auto !important;
  padding: 28px 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 28px !important;
}

body .site-header .brand img {
  width: 52px !important;
  height: 52px !important;
  object-fit: contain !important;
}

body .site-header .desktop-links {
  display: flex !important;
  align-items: center !important;
  gap: 34px !important;
  color: #c5cedc !important;
  font-weight: 700 !important;
}

body .site-header .desktop-links a {
  opacity: .72 !important;
  color: #c5cedc !important;
  text-decoration: none !important;
  transition: .22s ease !important;
}

body .site-header .desktop-links a:hover,
body .site-header .desktop-links a.active {
  opacity: 1 !important;
  color: #f7f1ff !important;
  text-shadow: 0 0 22px rgba(134,100,183,.9) !important;
}

body .site-header .desktop-links .donate-link {
  color: #fff !important;
  background: rgba(134,100,183,.26) !important;
  border: 1px solid rgba(134,100,183,.35) !important;
  padding: 12px 18px !important;
  border-radius: 14px !important;
  opacity: 1 !important;
}

body .site-header .hamburger {
  display: none !important;
}

body footer {
  padding: 56px 0 !important;
  background: #050a12 !important;
  color: #f6f2ec !important;
  border-top: 1px solid rgba(255,255,255,.08) !important;
}

body footer .footer-grid {
  display: grid !important;
  grid-template-columns: 1.2fr .75fr .75fr .8fr !important;
  gap: 28px !important;
  align-items: start !important;
}

body footer .footer-logo {
  width: 150px !important;
  height: auto !important;
  margin-bottom: 18px !important;
}

body footer h3 {
  color: #f6f2ec !important;
}

body footer p,
body footer a,
body footer span {
  color: rgba(255,255,255,.72) !important;
}

body footer .footer-links a {
  display: block !important;
  margin: 10px 0 !important;
  font-weight: 700 !important;
  text-decoration: none !important;
}

body footer .developer img {
  max-width: 160px !important;
  opacity: .85 !important;
  filter: none !important;
}
</style>
"""

def clean_style_block(match):
    block = match.group(0)

    # Remove every prior force/header/footer patch.
    if any(marker in block for marker in [
        "force-home-header-about",
        "force-home-shell-about",
        "about-footer-fix",
        "Homepage Header Compatibility Patch"
    ]):
        return ""

    # Remove legacy style blocks that touch the shell.
    if any(token in block for token in [
        "site-header",
        "desktop-links",
        "desktop-nav",
        ".header-wrap",
        ".mobile-nav",
        "mobile-menu",
        "brand img",
        ".hamburger",
        ".footer-logo",
        "footer {",
        "footer{",
        ".footer-grid",
        ".footer-links"
    ]):
        return ""

    return block

s = re.sub(r"<style[^>]*>[\s\S]*?</style>", clean_style_block, s, flags=re.I)

# Insert the one true shell override before </head>.
if "</head>" not in s:
    raise SystemExit("No </head> found in public/about.html")

s = s.replace("</head>", FORCE_CSS + "\n</head>", 1)

# Clean orphan mobile nav markup if any.
s = re.sub(r'\s*<div class="mobile-nav-overlay"></div>\s*', "\n", s, flags=re.I)
s = re.sub(r'\s*<nav class="mobile-nav"[\s\S]*?</nav>\s*', "\n", s, flags=re.I)

p.write_text(s)
print("fixed /about: removed conflicting shell CSS and installed one homepage-style header/footer override")
