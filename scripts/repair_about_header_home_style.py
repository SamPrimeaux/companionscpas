from pathlib import Path
import re

home = Path("public/index.html").read_text(errors="ignore")
about_path = Path("public/about.html")
about = about_path.read_text(errors="ignore")

home_style = re.search(r"<style>([\s\S]*?)</style>", home)
home_header = re.search(r"<header[\s\S]*?</header>", home)

if not home_style or not home_header:
    raise SystemExit("Could not find homepage style/header")

header_css = """
/* === Homepage Header Compatibility Patch === */
.site-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(5, 10, 18, .92);
  backdrop-filter: blur(18px);
  border-bottom: 1px solid rgba(255,255,255,.08);
}

.site-header .nav-inner {
  max-width: 1180px;
  margin: 0 auto;
  padding: 28px 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.site-header .brand img {
  width: 130px;
  height: 72px;
  object-fit: contain;
  filter: drop-shadow(0 10px 24px rgba(0,0,0,.26));
}

.site-header .desktop-nav {
  display: flex;
  align-items: center;
  gap: 34px;
}

.site-header .desktop-nav a {
  color: rgba(245,246,255,.68);
  font-weight: 800;
  font-size: 15px;
  text-decoration: none;
}

.site-header .desktop-nav a.active {
  color: #fff;
}

.site-header .desktop-nav a.donate-link,
.site-header .desktop-nav a[href="/donate"] {
  color: #fff;
  padding: 14px 24px;
  border-radius: 20px;
  background: rgba(124,58,237,.28);
  border: 1px solid rgba(255,255,255,.14);
}

.site-header .hamburger,
.side-nav {
  display: none;
}

@media (max-width: 760px) {
  .site-header .desktop-nav { display: none; }
  .site-header .hamburger { display: block; }
}
"""

# Replace about header with exact homepage header
about = re.sub(r"<header[\s\S]*?</header>", home_header.group(0), about, count=1)

# Mark About active
about = re.sub(r'class="active"', "", about)
about = about.replace('<a href="/about">About</a>', '<a class="active" href="/about">About</a>')

# Remove broken duplicate old mobile nav directly after header if present
about = re.sub(r'\s*<div class="mobile-nav-overlay"></div>\s*<nav class="mobile-nav">[\s\S]*?</nav>', "", about, count=1)

# Inject header CSS once
about = about.replace("/* === Homepage Header Compatibility Patch === */", "/* old patch removed */")
about = about.replace("</style>", header_css + "\n</style>", 1)

about_path.write_text(about)
print("repaired /about header to match homepage")
