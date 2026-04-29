from pathlib import Path
import re

home = Path("public/index.html").read_text(errors="ignore")

header = re.search(r"<header\b[\s\S]*?</header>", home, re.I).group(0)
footer = re.search(r"<footer\b[\s\S]*?</footer>", home, re.I).group(0)

Path("public/_header.html").write_text(header)
Path("public/_footer.html").write_text(footer)

print("extracted exact header/footer from homepage")
