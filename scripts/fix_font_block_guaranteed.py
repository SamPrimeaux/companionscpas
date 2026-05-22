from pathlib import Path
import re

files = ["public/about.html","public/adopt.html","public/services.html","public/donate.html"]

font_block = '''
/* === CPAS Font Tokens === */
:root {
  --font-display: "Satoshi", "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-body: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
}
'''

for f in files:
    p = Path(f)
    s = p.read_text(errors="ignore")

    # remove old token blocks + loose font vars
    s = re.sub(r"/\* === CPAS Font Tokens === \*/\s*:root\s*\{.*?\}\s*", "", s, flags=re.S)
    s = re.sub(r'\s*--font-display:[^;]+;\n?', '\n', s)
    s = re.sub(r'\s*--font-body:[^;]+;\n?', '\n', s)
    s = re.sub(r'\s*--font-mono:[^;]+;\n?', '\n', s)

    # insert tokens immediately before normalization block
    s = s.replace("/* === Global CPAS Font Normalization === */", font_block + "\n/* === Global CPAS Font Normalization === */", 1)

    p.write_text(s)
    print("fixed guaranteed font block", f)

print("done")
