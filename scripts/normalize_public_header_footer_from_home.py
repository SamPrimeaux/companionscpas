from pathlib import Path
import re

home = Path("public/index.html").read_text(errors="ignore")

header = re.search(r"<header[\s\S]*?</header>", home)
footer = re.search(r"<footer[\s\S]*?</footer>", home)

if not header or not footer:
    raise SystemExit("Could not find homepage header/footer.")

HEADER = header.group(0)
FOOTER = footer.group(0)

targets = [
    "public/about.html",
    "public/adopt.html",
    "public/services.html",
    "public/donate.html",
]

for f in targets:
    p = Path(f)
    s = p.read_text(errors="ignore")
    o = s

    s = re.sub(r"<header[\s\S]*?</header>", HEADER, s, count=1)
    s = re.sub(r"<footer[\s\S]*?</footer>", FOOTER, s, count=1)

    # mark active nav based on page
    page = "/" + p.stem if p.stem != "index" else "/"
    s = re.sub(r'class="active"', '', s)
    s = re.sub(
        rf'(<a\s+href="{re.escape(page)}")',
        r'\1 class="active"',
        s,
        count=1
    )

    if s != o:
        p.write_text(s)
        print("normalized header/footer", f)

print("done")
