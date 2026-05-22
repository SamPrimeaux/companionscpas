#!/usr/bin/env python3
"""
PRIMETECH v1 — Phase 4: Fix CSS/JS paths + push to CF autobuild
----------------------------------------------------------------
1. Reads every <link> and <script> from public/index.html
2. Patches render_home.js pageShell() with exact paths
3. git commit + push -> CF autobuild proves the render end-to-end

Run from companionscpas-platform repo root:
    python3 phase4_fix_and_push.py
"""

import subprocess, sys, re
from pathlib import Path

ROOT        = Path.home() / "companionscpas-platform"
INDEX_HTML  = ROOT / "public/index.html"
RENDER_HOME = ROOT / "src/api/render_home.js"

def sh(cmd):
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd=ROOT)
    return r.returncode == 0, r.stdout.strip(), r.stderr.strip()

print("\n" + "="*60)
print("  PRIMETECH v1 — Phase 4: Fix CSS/JS paths + push")
print("="*60)

# ── 1. Read public/index.html ─────────────────────────────────────────────────
print("\n[1/4] Reading public/index.html...")
html = INDEX_HTML.read_text(errors="ignore")

# Extract <link rel="stylesheet"> — both attribute orders
css = re.findall(r'<link\b[^>]*rel=["\']stylesheet["\'][^>]*href=["\']([^"\']+)["\'][^>]*/?>',html)
css += re.findall(r'<link\b[^>]*href=["\']([^"\']+)["\'][^>]*rel=["\']stylesheet["\'][^>]*/?>',html)
css = list(dict.fromkeys(css))  # deduplicate, preserve order

# Extract <script src="..."> — skip inline scripts
js = re.findall(r'<script\b[^>]+src=["\']([^"\']+)["\'][^>]*>', html)
js = list(dict.fromkeys(js))

# Extract favicon
fav = re.findall(r'<link\b[^>]*rel=["\'](?:icon|shortcut icon)["\'][^>]*href=["\']([^"\']+)["\']',html)
fav += re.findall(r'<link\b[^>]*href=["\']([^"\']+)["\'][^>]*rel=["\'](?:icon|shortcut icon)["\']',html)

# Extract <link rel="preconnect"> and font links
pre = re.findall(r'<link\b[^>]*rel=["\']preconnect["\'][^>]*/?>',html)
fonts = re.findall(r'<link\b[^>]*href=["\'][^"\']*(?:fonts\.googleapis|fonts\.gstatic)[^"\']*["\'][^>]*/?>',html)

print(f"  css:      {css}")
print(f"  js:       {js}")
print(f"  favicon:  {fav}")
print(f"  preconn:  {len(pre)} tags")
print(f"  fonts:    {len(fonts)} tags")

if not css:
    print("\n  WARNING: no CSS links found.")
    print("  Searching for any <link> tags in the file...")
    all_links = re.findall(r'<link\b[^>]*/?>',html)
    for l in all_links[:10]:
        print(f"    {l}")
    sys.exit(1)

# Build head tags
preconn_block = "\n  ".join(pre + fonts)
favicon_tag   = f'<link rel="icon" href="{fav[0]}" />' if fav else ""
css_block     = "\n  ".join(f'<link rel="stylesheet" href="{h}" />' for h in css)
js_block      = "\n  ".join(f'<script src="{s}"></script>' for s in js)

# ── 2. Patch pageShell() in render_home.js ────────────────────────────────────
print("\n[2/4] Patching render_home.js pageShell()...")

render = RENDER_HOME.read_text()

# Match the whole pageShell function
match = re.search(
    r'(function pageShell\([^)]*\)\s*\{)(.*?)(^\})',
    render, re.DOTALL | re.MULTILINE
)

if not match:
    print("  ERROR: pageShell() not found in render_home.js")
    print("  Searching for it...")
    for i, line in enumerate(render.split("\n")):
        if "pageShell" in line:
            print(f"    line {i+1}: {line}")
    sys.exit(1)

new_shell = f'''function pageShell(title, metaDesc, bodyHtml) {{
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${{esc(title)}}</title>
  <meta name="description" content="${{esc(metaDesc)}}" />
  {favicon_tag}
  {preconn_block}
  {css_block}
</head>
<body>
${{bodyHtml}}
  {js_block}
</body>
</html>`;
}}'''

# Replace the full pageShell function
render_patched = re.sub(
    r'function pageShell\([^)]*\)\s*\{.*?^\}',
    new_shell,
    render,
    flags=re.DOTALL | re.MULTILINE
)

if render_patched == render:
    print("  ERROR: regex replacement had no effect — function may have changed shape")
    sys.exit(1)

RENDER_HOME.write_text(render_patched)
print("  ok  pageShell patched")
print(f"      css:    {css}")
print(f"      js:     {js}")
print(f"      fonts:  {len(fonts)} preconnect/font tags included")

# ── 3. git add + commit + push → triggers CF autobuild ───────────────────────
print("\n[3/4] Committing and pushing to main...")

ok, out, err = sh("git add src/api/render_home.js")
print(f"  {'ok' if ok else 'FAIL'} git add  {err[:80] if not ok else ''}")

ok, out, err = sh('git commit -m "fix(primetech): correct CSS/JS paths in render_home pageShell"')
if not ok and "nothing to commit" in err:
    print("  already committed — nothing new to push")
else:
    print(f"  {'ok' if ok else 'FAIL'} git commit  {err[:80] if not ok else out[:60]}")

ok, out, err = sh("git push origin main")
print(f"  {'ok' if ok else 'FAIL'} git push  {err[:100] if not ok else out[:60]}")

# ── 4. Verify ─────────────────────────────────────────────────────────────────
print("\n[4/4] Verify pageShell in patched file:")
patched = RENDER_HOME.read_text()
for tag in css + js + (fav[:1] if fav else []):
    found = tag in patched
    print(f"  {'ok' if found else 'MISSING'} {tag}")

print(f"\n{'='*60}")
print("  Pushed. CF autobuild will deploy in ~30 seconds.")
print("  Then hit: https://companionscpas.meauxbility.workers.dev")
print("  Expect: styled page, R2 images, DB-driven content.")
print(f"{'='*60}\n")
