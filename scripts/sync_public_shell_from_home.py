from pathlib import Path
import re

SOURCE = Path("public/index.html").read_text(errors="ignore")
TARGETS = {
  "public/adopt.html": "/adopt",
  "public/services.html": "/services",
  "public/donate.html": "/donate",
}

header = re.search(r"<header\b[\s\S]*?</header>", SOURCE, re.I).group(0)
footer = re.search(r"<footer\b[\s\S]*?</footer>", SOURCE, re.I).group(0)

def set_active(h, route):
    h = re.sub(r'\sclass="active"', "", h)
    labels = {"/":"Home","/about":"About","/adopt":"Adopt","/services":"Services","/donate":"Donate"}
    if route == "/donate":
        h = re.sub(r'<a[^>]*class="donate-link"[^>]*>Donate</a>',
                   '<a class="active donate-link" href="/donate">Donate</a>', h)
    else:
        h = re.sub(r'<a[^>]*class="donate-link"[^>]*>Donate</a>',
                   '<a href="/donate" class="donate-link">Donate</a>', h)
        h = h.replace(f'<a href="{route}">{labels[route]}</a>',
                      f'<a class="active" href="{route}">{labels[route]}</a>')
    return h

for file, route in TARGETS.items():
    p = Path(file)
    s = p.read_text(errors="ignore")
    s = re.sub(r"<header\b[\s\S]*?</header>", set_active(header, route), s, count=1, flags=re.I)
    s = re.sub(r"<footer\b[\s\S]*?</footer>", footer, s, count=1, flags=re.I)

    # Header/footer donate should route to /donate, not popup.
    s = re.sub(r'<a href="javascript:void\(0\)" data-open-demo-donate class="donate-link">Donate</a>',
               '<a href="/donate" class="donate-link">Donate</a>', s)
    s = re.sub(r'<a href="javascript:void\(0\)" data-open-demo-donate>Donate</a>',
               '<a href="/donate">Donate</a>', s)

    p.write_text(s)
    print("synced shell:", file)

