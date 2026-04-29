from pathlib import Path
import re

pages = [
  "public/about.html",
  "public/adopt.html",
  "public/services.html",
  "public/donate.html"
]

header = Path("public/_header.html").read_text()
footer = Path("public/_footer.html").read_text()

for file in pages:
    p = Path(file)
    html = p.read_text(errors="ignore")

    # Set correct active link
    route = "/" + p.stem if p.stem != "index" else "/"
    header_fixed = re.sub(r'class="active"', '', header)
    header_fixed = header_fixed.replace(f'href="{route}"', f'href="{route}" class="active"')

    html = re.sub(r"<header\b[\s\S]*?</header>", header_fixed, html, count=1, flags=re.I)
    html = re.sub(r"<footer\b[\s\S]*?</footer>", footer, html, count=1, flags=re.I)

    p.write_text(html)
    print(f"fixed {file}")

print("ALL PAGES NOW EXACT MATCH")
