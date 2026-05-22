#!/usr/bin/env python3
"""
Remove try/catch fallback from renderHome intercept.
Hard fail so errors are visible.

Run from repo root:
    python3 patch_remove_fallback.py
"""
from pathlib import Path

INDEX = Path("src/index.js")
content = INDEX.read_text()

OLD = """    // ── PRIMETECH: DB-driven home page ──────────────────────────────────────────
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
    // ── END PRIMETECH ─────────────────────────────────────────────────────────"""

NEW = """    // ── PRIMETECH: DB-driven home page ──────────────────────────────────────────
    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "")) {
      const html = await renderHome(env);
      return new Response(html, {
        headers: {
          "Content-Type": "text/html;charset=UTF-8",
          "Cache-Control": "no-store",
        },
      });
    }
    // ── END PRIMETECH ─────────────────────────────────────────────────────────"""

if OLD in content:
    content = content.replace(OLD, NEW)
    INDEX.write_text(content)
    print("ok  fallback removed — hard fail on renderHome")
else:
    print("pattern not found — printing current intercept block:")
    for i, line in enumerate(content.split("\n")):
        if "PRIMETECH" in line or "renderHome" in line:
            print(f"  {i+1}: {line}")
