#!/usr/bin/env python3
"""
PRIMETECH v1 — Wire render_home into src/index.js
---------------------------------------------------
Adds the import and 5-line route intercept.
Everything else in the worker stays identical.

Run from companionscpas-platform repo root:
    python3 patch_render_home.py
"""

import sys
from pathlib import Path

INDEX  = Path("src/index.js")
RENDER = Path("src/api/render_home.js")

if not INDEX.exists():
    print("ERROR: src/index.js not found — run from repo root")
    sys.exit(1)

# ── 1. Copy render_home.js into src/api/ ─────────────────────────────────────
src_render = Path("render_home.js")  # downloaded to repo root
if src_render.exists():
    RENDER.write_text(src_render.read_text())
    print(f"ok  copied render_home.js -> {RENDER}")
elif RENDER.exists():
    print(f"ok  {RENDER} already in place")
else:
    print("ERROR: render_home.js not found. Download it first.")
    sys.exit(1)

# ── 2. Patch src/index.js ─────────────────────────────────────────────────────
content = INDEX.read_text()

IMPORT_LINE = 'import { renderHome } from "./api/render_home.js";\n'

# Check already patched
if "renderHome" in content:
    print("ok  src/index.js already patched — nothing to do")
    sys.exit(0)

# Add import after the last existing import line
LAST_IMPORT = 'import { socialRoutes } from \'./api/social.js\';'
if LAST_IMPORT not in content:
    print("ERROR: could not find import anchor in src/index.js")
    sys.exit(1)

content = content.replace(
    LAST_IMPORT,
    LAST_IMPORT + "\n" + IMPORT_LINE
)

# Add route intercept just before "// ── Everything else: static assets"
INTERCEPT_ANCHOR = "    // ── Everything else: static assets ───────────────────────────────────────\n    return env.ASSETS.fetch(request);"

INTERCEPT_BLOCK = """    // ── PRIMETECH: DB-driven home page ──────────────────────────────────────────
    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "")) {
      try {
        const html = await renderHome(env);
        if (html) {
          return new Response(html, {
            headers: {
              "Content-Type": "text/html;charset=UTF-8",
              "Cache-Control": "no-store",
            },
          });
        }
      } catch (e) {
        console.error("[renderHome] failed, falling back to static:", e.message);
      }
    }
    // ── END PRIMETECH ─────────────────────────────────────────────────────────

    // ── Everything else: static assets ───────────────────────────────────────
    return env.ASSETS.fetch(request);"""

if INTERCEPT_ANCHOR not in content:
    print("ERROR: could not find static assets anchor in src/index.js")
    print("       Looking for:")
    print(f"       {repr(INTERCEPT_ANCHOR[:80])}")
    sys.exit(1)

content = content.replace(INTERCEPT_ANCHOR, INTERCEPT_BLOCK)

INDEX.write_text(content)
print("ok  src/index.js patched")

# ── 3. Verify ─────────────────────────────────────────────────────────────────
result = INDEX.read_text()
checks = [
    ('import renderHome', 'import { renderHome }' in result),
    ('route intercept',   'PRIMETECH: DB-driven home page' in result),
    ('try/catch fallback','falling back to static' in result),
    ('static assets still present', 'env.ASSETS.fetch(request)' in result),
]
print(f"\n  Verify:")
for label, ok in checks:
    print(f"  {'ok' if ok else 'FAIL'}  {label}")

all_ok = all(ok for _, ok in checks)
print(f"\n{'  All checks passed — deploy when ready:' if all_ok else '  PATCH INCOMPLETE — check errors above'}")
if all_ok:
    print("  npm run deploy")
