from pathlib import Path
import re

public = Path("public")
pages = [
    public / "index.html",
    public / "about.html",
    public / "adopt.html",
    public / "services.html",
    public / "donate.html",
]

desktop_nav = '''<nav class="desktop-links" aria-label="Primary navigation">
        <a href="/">Home</a>
        <a href="/about">About</a>
        <a href="/adopt">Adopt</a>
        <a href="/services">Services</a>
        <a href="/donate" class="donate-link">Donate</a>
        <a href="/admin/login">Admin</a>
      </nav>'''

side_nav = '''<aside class="side-nav" id="sideNav" aria-label="Mobile navigation">
    <a href="/">Home</a>
    <a href="/about">About</a>
    <a href="/adopt">Adopt</a>
    <a href="/services">Services</a>
    <a href="/donate">Donate</a>
    <a href="/admin/login">Admin Login</a>
  </aside>'''

footer_links = '''<nav class="footer-links" aria-label="Footer pages">
          <h3>Pages</h3>
          <a href="/">Home</a>
          <a href="/about">About</a>
          <a href="/adopt">Adopt</a>
          <a href="/services">Services</a>
          <a href="/donate">Donate</a>
          <a href="/admin/login">Admin Login</a>
          <a href="/admin/dashboard">Admin Dashboard</a>
        </nav>'''

for path in pages:
    if not path.exists():
        print(f"SKIP missing {path}")
        continue

    html = path.read_text()

    html = re.sub(
        r'<nav class="desktop-links"[\s\S]*?</nav>',
        desktop_nav,
        html,
        count=1
    )

    html = re.sub(
        r'<aside class="side-nav"[\s\S]*?</aside>',
        side_nav,
        html,
        count=1
    )

    html = re.sub(
        r'<nav class="footer-links"[\s\S]*?</nav>',
        footer_links,
        html,
        count=1
    )

    path.write_text(html)
    print(f"patched {path}")

