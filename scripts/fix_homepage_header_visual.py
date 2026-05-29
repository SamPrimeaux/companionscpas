from pathlib import Path
import re

PUBLIC = Path("public/index.html")
CSS = Path("public/_shared.css")

CANONICAL_HEADER = """<header class="site-header">
  <div class="container header-inner">
    <a href="/admin/login" class="logo-link" aria-label="Companions of CPAS admin login">
      <img src="/static/global/companionsofcpa-newlogo.webp" alt="Companions of CPAS" />
    </a>
    <nav aria-label="Main navigation">
      <ul class="site-nav">
        <li><a href="/" class="active">Home</a></li>
        <li><a href="/about">About</a></li>
        <li><a href="/adopt">Adopt</a></li>
        <li><a href="/services">Services</a></li>
      </ul>
    </nav>
    <div class="header-actions">
      <a class="btn btn-primary nav-donate" href="/donate">Donate</a>
    </div>
  </div>
</header>"""

HOME_FIX_CSS = r"""
/* Homepage final visual header/hero normalization */
body[data-route="/"] .site-header,
body[data-route="home"] .site-header,
body.home .site-header {
  height: var(--cpas-header-h, 76px) !important;
  min-height: var(--cpas-header-h, 76px) !important;
  padding: 0 !important;
  display: block !important;
}

body[data-route="/"] .site-header .header-inner,
body[data-route="home"] .site-header .header-inner,
body.home .site-header .header-inner {
  height: var(--cpas-header-h, 76px) !important;
  min-height: var(--cpas-header-h, 76px) !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  display: grid !important;
  grid-template-columns: minmax(132px, 1fr) auto minmax(132px, 1fr) !important;
  align-items: center !important;
}

body[data-route="/"] .site-header .logo-link,
body[data-route="/"] .site-header nav,
body[data-route="/"] .site-header .header-actions,
body[data-route="home"] .site-header .logo-link,
body[data-route="home"] .site-header nav,
body[data-route="home"] .site-header .header-actions,
body.home .site-header .logo-link,
body.home .site-header nav,
body.home .site-header .header-actions {
  transform: none !important;
  margin-top: 0 !important;
  margin-bottom: 0 !important;
  align-self: center !important;
}

/* Remove homepage-only dead air between header and hero */
body[data-route="/"] .site-header + .site-main,
body[data-route="home"] .site-header + .site-main,
body.home .site-header + .site-main {
  margin-top: 0 !important;
  padding-top: 0 !important;
}

body[data-route="/"] .site-main > .section:first-child,
body[data-route="home"] .site-main > .section:first-child,
body.home .site-main > .section:first-child {
  padding-top: clamp(64px, 7vw, 104px) !important;
}

@media (max-width: 760px) {
  body[data-route="/"] .site-header,
  body[data-route="/"] .site-header .header-inner,
  body[data-route="home"] .site-header,
  body[data-route="home"] .site-header .header-inner,
  body.home .site-header,
  body.home .site-header .header-inner {
    height: var(--cpas-header-h, 70px) !important;
    min-height: var(--cpas-header-h, 70px) !important;
  }

  body[data-route="/"] .site-main > .section:first-child,
  body[data-route="home"] .site-main > .section:first-child,
  body.home .site-main > .section:first-child {
    padding-top: clamp(48px, 10vw, 76px) !important;
  }
}
"""

def patch_public_index():
    if not PUBLIC.exists():
        print("public/index.html missing; skipping")
        return

    html = PUBLIC.read_text()

    html = re.sub(
        r"<header[\s\S]*?</header>",
        CANONICAL_HEADER,
        html,
        count=1,
        flags=re.I,
    )

    html = html.replace(
        "https://assets.meauxxx.com/static/global/companionsofcpa-newlogo.webp",
        "/static/global/companionsofcpa-newlogo.webp",
    )
    html = html.replace(
        "https://assets.meauxxx.com/static/global/logo-dark.webp",
        "/static/global/companionsofcpa-newlogo.webp",
    )

    # Make sure the homepage can be targeted by CSS.
    html = re.sub(
        r'<body([^>]*)>',
        lambda m: '<body' + (
            m.group(1)
            if 'data-route=' in m.group(1)
            else m.group(1) + ' data-route="/"'
        ) + '>',
        html,
        count=1,
        flags=re.I,
    )

    PUBLIC.write_text(html)
    print("patched public/index.html")

def patch_css():
    css = CSS.read_text()

    marker = "/* Homepage final visual header/hero normalization */"
    if marker in css:
        css = css[:css.index(marker)].rstrip()

    css = css.rstrip() + "\n\n" + HOME_FIX_CSS.strip() + "\n"
    CSS.write_text(css)
    print("patched public/_shared.css")

def main():
    patch_public_index()
    patch_css()

if __name__ == "__main__":
    main()
