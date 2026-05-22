from pathlib import Path
import re

targets = [
    Path("public/index.html"),
    Path("public/about.html"),
    Path("public/adopt.html"),
    Path("public/services.html"),
    Path("public/donate.html"),
]

FONT_VARS = '''
  --font-display: "Satoshi", "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-body: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
'''

GLOBAL_FONT_RULES = '''
/* === Global CPAS Font Normalization === */
html, body {
  font-family: var(--font-body);
}

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

for p in targets:
    if not p.exists():
        print("missing", p)
        continue

    s = p.read_text(errors="ignore")
    o = s

    # Remove old Outfit import/font refs
    s = re.sub(r"@import url\(['\"]https://fonts\.googleapis\.com/css2\?family=Outfit[^;]+;", "", s)
    s = re.sub(r"'Outfit'\s*,\s*", "", s)
    s = re.sub(r'"Outfit"\s*,\s*', "", s)

    # Add font vars to :root if missing
    if "--font-display:" not in s:
        s = re.sub(r":root\s*\{", ":root {\n" + FONT_VARS, s, count=1)

    if "--font-body:" not in s:
        s = re.sub(r":root\s*\{", ":root {\n" + '  --font-body: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;\n', s, count=1)

    if "--font-mono:" not in s:
        s = re.sub(r":root\s*\{", ":root {\n" + '  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;\n', s, count=1)

    # Remove prior duplicate global normalization block
    s = re.sub(
        r"/\* === Global CPAS Font Normalization === \*/.*?code, pre, kbd, samp, \.mono, \.id, \[data-mono\]\s*\{[^}]*\}\s*",
        "",
        s,
        flags=re.S
    )

    # Insert final rules before </style>
    s = s.replace("</style>", GLOBAL_FONT_RULES + "\n</style>", 1)

    if s != o:
        p.write_text(s)
        print("normalized", p)

print("done: normalized public font system")
