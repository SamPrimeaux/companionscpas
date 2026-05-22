from pathlib import Path
import re

SOURCE = Path("public/about.html").read_text(errors="ignore")
TARGETS = [
    ("public/adopt.html", "/adopt", "light"),
    ("public/services.html", "/services", "dark"),
    ("public/donate.html", "/donate", "light"),
]

header = re.search(r"<header\b[\s\S]*?</header>", SOURCE, re.I).group(0)
footer = re.search(r"<footer\b[\s\S]*?</footer>", SOURCE, re.I).group(0)
shell_css = re.search(r'<style id="global-cpas-shell-v1">[\s\S]*?</style>', SOURCE, re.I).group(0)
shell_js = re.search(r'<script id="global-cpas-shell-js">[\s\S]*?</script>', SOURCE, re.I).group(0)

def make_active(h, route):
    h = re.sub(r'\sclass="active"', "", h)
    labels = {
        "/": "Home",
        "/about": "About",
        "/adopt": "Adopt",
        "/services": "Services",
        "/donate": "Donate",
    }
    label = labels[route]
    h = h.replace(f'<a href="{route}">{label}</a>', f'<a class="active" href="{route}">{label}</a>')
    h = h.replace(f'<a href="{route}" class="donate-link">Donate</a>', f'<a class="active donate-link" href="{route}">Donate</a>')
    return h

for file, route, theme in TARGETS:
    p = Path(file)
    s = p.read_text(errors="ignore")

    s = re.sub(r'<style id="global-cpas-shell-v1">[\s\S]*?</style>', "", s, flags=re.I)
    s = re.sub(r'<script id="global-cpas-shell-js">[\s\S]*?</script>', "", s, flags=re.I)
    s = re.sub(r'<style id="unified-header-theme">[\s\S]*?</style>', "", s, flags=re.I)
    s = re.sub(r'<script id="unified-header-theme-js">[\s\S]*?</script>', "", s, flags=re.I)

    s = re.sub(r'<header\b[\s\S]*?</header>', "", s, count=1, flags=re.I)
    s = re.sub(r'<footer\b[\s\S]*?</footer>', "", s, count=1, flags=re.I)

    # remove legacy nav wrappers that caused the trashed header
    s = re.sub(r'<nav class="desktop-nav"[\s\S]*?</nav>', "", s, flags=re.I)
    s = re.sub(r'<nav class="mobile-nav"[\s\S]*?</nav>', "", s, flags=re.I)
    s = re.sub(r'<div class="mobile-nav-overlay"[\s\S]*?</div>', "", s, flags=re.I)

    # kill known header-conflict rules
    s = re.sub(r'\.site-header\.header-scrolled\s*\{[^}]*\}', "", s)
    s = re.sub(r'main\s*\{\s*padding-top:\s*var\(--nav-h\);\s*\}', "", s)
    s = s.replace("padding-top: var(--nav-h);", "")
    s = s.replace("padding-top:var(--nav-h);", "")

    s = s.replace("</head>", shell_css + "\n</head>", 1)
    s = re.sub(r'<body[^>]*>', f'<body data-theme="{theme}" data-default-theme="{theme}">', s, count=1, flags=re.I)
    s = re.sub(r'(<body[^>]*>)', r'\1\n' + make_active(header, route), s, count=1, flags=re.I)
    s = s.replace("</body>", footer + "\n" + shell_js + "\n</body>", 1)

    p.write_text(s)
    print("synced good shell:", file)

print("done")
