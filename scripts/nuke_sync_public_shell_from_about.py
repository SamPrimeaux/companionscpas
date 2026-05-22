from pathlib import Path
import re

SOURCE = Path("public/about.html").read_text(errors="ignore")
TARGETS = {
    "public/adopt.html": "/adopt",
    "public/services.html": "/services",
    "public/donate.html": "/donate",
}

GOOD_HEADER = re.search(r"<header\b[\s\S]*?</header>", SOURCE, re.I).group(0)
GOOD_FOOTER = re.search(r"<footer\b[\s\S]*?</footer>", SOURCE, re.I).group(0)

def set_active(header, route):
    h = re.sub(r'\sclass="active"', "", header)
    h = re.sub(r'<a href="/donate" class="donate-link">Donate</a>',
               '<a href="/donate" class="donate-link">Donate</a>', h)

    labels = {
        "/adopt": "Adopt",
        "/services": "Services",
        "/donate": "Donate",
    }

    if route == "/donate":
        h = re.sub(
            r'<a href="/donate" class="donate-link">Donate</a>',
            '<a class="active donate-link" href="/donate">Donate</a>',
            h
        )
    else:
        h = h.replace(
            f'<a href="{route}">{labels[route]}</a>',
            f'<a class="active" href="{route}">{labels[route]}</a>'
        )

    return h

for file, route in TARGETS.items():
    p = Path(file)
    s = p.read_text(errors="ignore")

    # hard replace first real header/footer
    s = re.sub(r"<header\b[\s\S]*?</header>", set_active(GOOD_HEADER, route), s, count=1, flags=re.I)
    s = re.sub(r"<footer\b[\s\S]*?</footer>", GOOD_FOOTER, s, count=1, flags=re.I)

    # force nav donate to real page, not modal
    s = s.replace('href="javascript:void(0)" data-open-demo-donate class="donate-link"', 'href="/donate" class="donate-link"')
    s = s.replace('href="javascript:void(0)" data-open-demo-donate>Donate</a>', 'href="/donate">Donate</a>')

    p.write_text(s)
    print("NUKED + synced shell:", file)

