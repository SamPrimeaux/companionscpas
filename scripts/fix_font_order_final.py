from pathlib import Path
import re

targets = ["public/index.html","public/about.html","public/adopt.html","public/services.html","public/donate.html"]

for name in targets:
    p = Path(name)
    s = p.read_text(errors="ignore")

    # remove prior normalization blocks
    s = re.sub(r"/\* === Global CPAS Font Normalization === \*/.*?code, pre, kbd, samp, \.mono, \.id, \[data-mono\]\s*\{[^}]*\}\s*", "", s, flags=re.S)

    # ensure vars are inside first :root
    if "--font-display:" not in s:
        s = s.replace(":root {", ':root {\n  --font-display: "Satoshi", "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;\n  --font-body: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;\n  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;', 1)

    # append final rules at END of first style block so they win
    rules = '''
/* === Global CPAS Font Normalization === */
html, body,
body, p, a, button, input, select, textarea, label, li, span, small, strong, em, td, th, dd, dt {
  font-family: var(--font-body);
}

h1, h2, h3, .hero-title, .section-title {
  font-family: var(--font-display);
  letter-spacing: -0.055em;
}

code, pre, kbd, samp, .mono, .id, [data-mono] {
  font-family: var(--font-mono);
}
'''
    s = s.replace("</style>", rules + "\n</style>", 1)
    p.write_text(s)
    print("fixed", p)

print("done")
