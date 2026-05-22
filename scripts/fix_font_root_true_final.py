from pathlib import Path
import re

files = ["public/about.html","public/adopt.html","public/services.html","public/donate.html"]

vars_lines = '''  --font-display: "Satoshi", "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-body: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
'''

for f in files:
    p = Path(f)
    s = p.read_text(errors="ignore")

    # remove all font vars wherever they are
    s = re.sub(r'\s*--font-display:[^;]+;\n?', '\n', s)
    s = re.sub(r'\s*--font-body:[^;]+;\n?', '\n', s)
    s = re.sub(r'\s*--font-mono:[^;]+;\n?', '\n', s)

    # insert into FIRST actual :root block, including :root{ or :root {
    m = re.search(r':root\s*\{', s)
    if not m:
        raise SystemExit(f"no :root found in {f}")

    insert_at = m.end()
    s = s[:insert_at] + "\n" + vars_lines + s[insert_at:]

    p.write_text(s)
    print("fixed true root", f)

print("done")
