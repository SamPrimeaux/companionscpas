from pathlib import Path
import re

files = ["public/about.html","public/adopt.html","public/services.html","public/donate.html"]

for f in files:
    p = Path(f)
    s = p.read_text(errors="ignore")

    # remove existing font vars wherever they landed
    s = re.sub(r'\s*--font-display:[^;]+;\n?', '\n', s)
    s = re.sub(r'\s*--font-body:[^;]+;\n?', '\n', s)
    s = re.sub(r'\s*--font-mono:[^;]+;\n?', '\n', s)

    vars_block = '''  --font-display: "Satoshi", "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-body: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
'''

    s = re.sub(r':root\s*\{', ':root {\n' + vars_block, s, count=1)

    p.write_text(s)
    print("reordered vars", f)

print("done")
