from pathlib import Path

p = Path("public/about.html")
s = p.read_text(errors="ignore")

css = """
<style id="force-home-shell-about">
body .site-header {
  position: sticky !important;
  top: 0 !important;
  z-index: 999 !important;
  background: rgba(5,10,18,.92) !important;
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
}

body .site-header .brand img {
  width: 130px !important;
  height: 72px !important;
  object-fit: contain !important;
}

body .site-header .desktop-links {
  display: flex !important;
  align-items: center !important;
  justify-content: flex-end !important;
  gap: 34px !important;
}

body .site-header .desktop-links a {
  color: rgba(245,246,255,.72) !important;
  text-decoration: none !important;
  font-weight: 800 !important;
  font-size: 15px !important;
}

body .site-header .desktop-links a.active {
  color: #fff !important;
}

body .site-header .desktop-links a.donate-link {
  color: #fff !important;
  padding: 14px 24px !important;
  border-radius: 20px !important;
  background: rgba(124,58,237,.28) !important;
  border: 1px solid rgba(255,255,255,.14) !important;
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

@media (max-width: 760px) {
  body .site-header .container.nav {
    width: calc(100% - 36px) !important;
    padding: 18px 0 !important;
  }

  body .site-header .desktop-links {
    gap: 12px !important;
    flex-wrap: wrap !important;
  }

  body .site-header .desktop-links a {
    font-size: 13px !important;
  }

  body footer .footer-grid {
    grid-template-columns: 1fr !important;
  }
}
</style>
"""

# remove old force patches
for marker in [
    '<style id="force-home-header-about">',
    '<style id="about-footer-fix">',
    '<style id="force-home-shell-about">'
]:
    while marker in s:
        start = s.find(marker)
        end = s.find("</style>", start)
        if end == -1:
            break
        s = s[:start] + s[end+8:]

s = s.replace("</head>", css + "\n</head>", 1)
p.write_text(s)
print("forced /about homepage header + footer shell CSS")
