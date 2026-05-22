from pathlib import Path
import re

p = Path("public/about.html")
html = p.read_text(errors="ignore")

# Remove old header systems
html = re.sub(r'\.header-wrap[\s\S]*?\}', '', html)
html = re.sub(r'header\s*\{[^}]*\}', '', html)

# Remove duplicate nav systems
html = re.sub(r'\.nav-inner[\s\S]*?\}', '', html)

# Remove any desktop-nav definitions (we are using desktop-links)
html = re.sub(r'\.desktop-nav[\s\S]*?\}', '', html)

# Remove duplicate site-header blocks (keep only first)
html = re.sub(r'(\.site-header[\s\S]*?\})[\s\S]*?(\.site-header)', r'\1\n\2', html, count=1)

# Clean spacing
html = re.sub(r'\n{3,}', '\n\n', html)

p.write_text(html)
print("cleaned /about header CSS conflicts")
