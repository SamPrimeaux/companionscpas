#!/usr/bin/env python3
"""
install_shell.py
Copies new _shared.css and _shell.js into repo,
R2 uploads _shared.css, patches render_home.js to use new shell,
git commits + pushes.
Run from: ~/companionscpas-platform
"""

import os, subprocess, shutil

REPO = os.path.expanduser("~/companionscpas-platform")
DL   = os.path.expanduser("~/Downloads")
os.chdir(REPO)

def run(cmd, **kw):
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True, **kw)
    print(r.stdout.strip() or r.stderr.strip())
    return r.returncode == 0

print("\n=== install_shell.py ===\n")

# 1. Copy files from Downloads into repo
for src, dst in [
    (f"{DL}/_shared.css", f"{REPO}/public/_shared.css"),
    (f"{DL}/_shell.js",   f"{REPO}/src/api/_shell.js"),
]:
    shutil.copy2(src, dst)
    print(f"✓ copied {os.path.basename(src)}")

# 2. Upload _shared.css to R2
print("\nUploading _shared.css to R2...")
run("wrangler r2 object put companionscpas/static/global/shared.css --file public/_shared.css --remote")

# 3. Patch render_home.js to import from _shell.js
rh = open("src/api/render_home.js").read()

# Add import at top if not already there
if "_shell.js" not in rh and "from './_shell.js'" not in rh:
    rh = "import { pageShell, renderHeader, renderFooter } from './_shell.js';\n" + rh
    print("✓ added _shell.js import to render_home.js")

# Replace old pageShell function with call to imported one
import re
# Remove the old pageShell function definition entirely
rh = re.sub(
    r'function pageShell\(.*?\n\}',
    '// pageShell now imported from ./_shell.js',
    rh, flags=re.DOTALL
)

# Ensure renderHome passes theme + activePage into pageShell
# Replace bare pageShell(title, meta, body) calls with the new signature
rh = re.sub(
    r'pageShell\(([^,]+),\s*([^,]+),\s*([^)]+)\)',
    r"pageShell(\1, \2, \3, { theme: 'dark', activePage: '/', orgData: orgData || {} })",
    rh
)

open("src/api/render_home.js", "w").write(rh)
print("✓ patched render_home.js")

# 4. Git add + commit + push
run("git add public/_shared.css src/api/_shell.js src/api/render_home.js")
run('git commit -m "feat(shell): PRIMETECH global header/footer + theme CSS"')
run("git push origin main")
print("\n✓ pushed — Cloudflare building now\n")
print("Live in ~60s: https://companionscpas.meauxbility.workers.dev/")
