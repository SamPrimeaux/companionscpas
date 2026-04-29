from pathlib import Path
import re
import subprocess

# Restore about page from previous commit before destructive CSS purge
prev = subprocess.check_output(
    ["git", "show", "HEAD~1:public/about.html"],
    text=True
)

home = Path("public/index.html").read_text(errors="ignore")

header = re.search(r"<header\b[\s\S]*?</header>", home, re.I).group(0)
footer = re.search(r"<footer\b[\s\S]*?</footer>", home, re.I).group(0)

# about active state
header = re.sub(r'\s*class="active"', "", header)
header = header.replace('<a href="/about">About</a>', '<a class="active" href="/about">About</a>')

# remove old header/footer/mobile nav from restored about
s = re.sub(r"<header\b[\s\S]*?</header>", "", prev, count=1, flags=re.I)
s = re.sub(r"<footer\b[\s\S]*?</footer>", footer, s, count=1, flags=re.I)
s = re.sub(r'\s*<div class="mobile-nav-overlay"></div>\s*', "\n", s, flags=re.I)
s = re.sub(r'\s*<nav class="mobile-nav"[\s\S]*?</nav>\s*', "\n", s, flags=re.I)

# insert header immediately after <body>, so it locks to top of viewport/document
s = re.sub(r"(<body[^>]*>)", r"\1\n" + header, s, count=1, flags=re.I)

# add only minimal override, do not delete page CSS
override = """
<style id="about-home-shell-override">
body {
  margin: 0 !important;
}

body .site-header {
  position: sticky !important;
  top: 0 !important;
  z-index: 9999 !important;
}

body .site-header .container.nav {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
}

body .site-header .desktop-links {
  display: flex !important;
  align-items: center !important;
  gap: 34px !important;
}

body .site-header .hamburger {
  display: none !important;
}

body footer {
  background: #050a12 !important;
  color: #f6f2ec !important;
}

body footer h3,
body footer a {
  color: #f6f2ec !important;
}

body footer p,
body footer span {
  color: rgba(255,255,255,.72) !important;
}
</style>
"""

s = re.sub(r'<style id="about-home-shell-override">[\s\S]*?</style>', "", s, flags=re.I)
s = s.replace("</head>", override + "\n</head>", 1)

Path("public/about.html").write_text(s)
print("safely restored /about hero CSS and moved homepage header to top")
