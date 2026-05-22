#!/usr/bin/env python3
"""
PRIMETECH v1 — Populate cms_assets size + tags
------------------------------------------------
size  -> HEAD request to pub_url, reads Content-Length header
tags  -> derived from filename + alt_text + path + usage_context
         stored as comma-separated string, no NULLs

Run from companionscpas-platform repo root:
    python3 populate_asset_metadata.py
"""

import subprocess, json, re, sys
from pathlib import Path

try:
    import requests
except ImportError:
    subprocess.run([sys.executable, "-m", "pip", "install",
                    "requests", "--break-system-packages"], check=True)
    import requests

DB        = "companionscpas"
TENANT_ID = "tenant_companionscpas"

# ─── Tag derivation rules ─────────────────────────────────────────────────────
# Order matters — first match wins for category tags,
# all keyword matches accumulate into the tag list

CATEGORY_RULES = [
    # path/usage signals
    (r"static/assets",           ["branding", "shared"]),
    (r"static/pages/home",       ["home", "hero"]),
    (r"static/pages/about",      ["about"]),
    (r"static/pages/adopt",      ["adopt"]),
    (r"static/pages/services",   ["services"]),
    (r"static/pages/donate",     ["donate"]),
    (r"static/animals",          ["animals"]),
]

KEYWORD_RULES = [
    # filename/alt keywords -> tags
    (r"logo|brand",              "branding"),
    (r"team|staff|volunteer",    "team"),
    (r"dog|pup|pit|mutt|hound|canine|brindle|retriev", "dog"),
    (r"cat|feline|kitten",       "cat"),
    (r"rescue|shelter|cpas|caddo", "rescue"),
    (r"foster",                  "foster"),
    (r"adopt|adoptable|available", "adoptable"),
    (r"medical|vet|cone|injury|recover|thin|skinny|malnourish", "medical"),
    (r"donat|giving|fund|campaign", "fundraising"),
    (r"service|spay|neuter|vaccin|food|assist", "services"),
    (r"smil|happy|joy|cute|sweet|friend",        "happy"),
    (r"hero|banner|splash",      "hero"),
    (r"badge|partner|iam|inner.animal", "partner"),
]

MIME_TAGS = {
    "image/jpeg":  "jpeg",
    "image/webp":  "webp",
    "image/png":   "png",
    "image/gif":   "gif",
    "image/avif":  "avif",
    "image/svg+xml": "svg",
}

def derive_tags(filename, alt_text, r2_key, usage_context, mime_type):
    tags = set()
    corpus = " ".join([filename, alt_text or "", r2_key or "", usage_context or ""]).lower()

    # Category tags from path
    for pattern, tag_list in CATEGORY_RULES:
        if re.search(pattern, corpus):
            tags.update(tag_list)

    # Keyword tags from content
    for pattern, tag in KEYWORD_RULES:
        if re.search(pattern, corpus):
            tags.add(tag)

    # Mime type tag
    mime_tag = MIME_TAGS.get(mime_type or "")
    if mime_tag:
        tags.add(mime_tag)

    # Always add base type
    tags.add("image")

    # Clean and sort
    return ",".join(sorted(t.strip() for t in tags if t.strip()))

# ─── Helpers ──────────────────────────────────────────────────────────────────

def d1_run(sql, label=""):
    result = subprocess.run(
        ["npx", "wrangler", "d1", "execute", DB,
         "--remote", "--command", sql.strip()],
        capture_output=True, text=True
    )
    ok = result.returncode == 0
    if not ok:
        print(f"  [FAIL {label}] {result.stderr.strip()[:150]}")
    return ok

def d1_query(sql, label=""):
    result = subprocess.run(
        ["npx", "wrangler", "d1", "execute", DB,
         "--remote", "--json", "--command", sql.strip()],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        print(f"  [D1 error {label}] {result.stderr.strip()[:150]}")
        return []
    try:
        data = json.loads(result.stdout)
        return data[0].get("results", []) if data else []
    except:
        return []

def q(s):
    return str(s or "").replace("'", "''")

def get_file_size(url):
    """HEAD request — returns Content-Length in bytes or None."""
    try:
        resp = requests.head(url, timeout=10, allow_redirects=True)
        cl = resp.headers.get("Content-Length") or resp.headers.get("content-length")
        if cl:
            return int(cl)
        # If HEAD gives no Content-Length, do a streaming GET and count bytes
        resp = requests.get(url, timeout=15, stream=True)
        resp.raise_for_status()
        size = sum(len(chunk) for chunk in resp.iter_content(8192))
        return size if size > 0 else None
    except Exception as e:
        return None

def human_size(b):
    if b is None: return "unknown"
    if b < 1024: return f"{b} B"
    if b < 1024**2: return f"{b/1024:.1f} KB"
    return f"{b/1024**2:.2f} MB"

# ─── Main ─────────────────────────────────────────────────────────────────────

def run():
    print("\n" + "="*68)
    print("  PRIMETECH v1 — Populate cms_assets size + tags")
    print("="*68)

    rows = d1_query(
        f"""SELECT id, asset_key, filename, alt_text, r2_key,
                   usage_context, mime_type, pub_url, size, tags
            FROM cms_assets
            WHERE tenant_id='{TENANT_ID}'
            ORDER BY usage_context, asset_key""",
        "fetch"
    )
    print(f"\n  {len(rows)} assets to process\n")

    size_ok   = 0
    size_fail = 0
    tags_ok   = 0

    for row in rows:
        rid          = row.get("id","")
        asset_key    = row.get("asset_key","")
        filename     = row.get("filename","") or ""
        alt          = row.get("alt_text","") or ""
        r2_key       = row.get("r2_key","") or ""
        usage_ctx    = row.get("usage_context","") or ""
        mime         = row.get("mime_type","") or ""
        pub_url      = row.get("pub_url","") or ""
        current_size = row.get("size")
        current_tags = row.get("tags")

        print(f"  {asset_key}")

        # ── Size ──────────────────────────────────────────────────────────────
        if current_size:
            size_bytes = current_size
            print(f"    size:  {human_size(size_bytes)} (already set)")
            size_ok += 1
        else:
            size_bytes = get_file_size(pub_url) if pub_url else None
            if size_bytes:
                print(f"    size:  {human_size(size_bytes)}")
                size_ok += 1
            else:
                print(f"    size:  could not determine")
                size_fail += 1

        # ── Tags ──────────────────────────────────────────────────────────────
        tags = derive_tags(filename, alt, r2_key, usage_ctx, mime)
        print(f"    tags:  {tags}")
        tags_ok += 1

        # ── Update row ────────────────────────────────────────────────────────
        size_sql = f"size = {size_bytes}," if size_bytes else ""
        sql = f"""
UPDATE cms_assets SET
  {size_sql}
  tags       = '{q(tags)}',
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE id = '{rid}';
""".strip()

        ok = d1_run(sql, asset_key)
        if not ok:
            print(f"    UPDATE failed")

    # ── Final verify ──────────────────────────────────────────────────────────
    print(f"\n{'─'*68}")
    check = d1_query(
        f"""SELECT asset_key, size, tags
            FROM cms_assets
            WHERE tenant_id='{TENANT_ID}'
            ORDER BY usage_context, asset_key""",
        "verify"
    )

    null_size = sum(1 for r in check if not r.get("size"))
    null_tags = sum(1 for r in check if not r.get("tags"))

    print(f"\n  {'asset_key':<42} {'size':>10}    tags")
    print(f"  {'-'*42} {'-'*10}    {'-'*30}")
    for r in check:
        sz = human_size(r.get("size")) if r.get("size") else "NULL"
        print(f"  {str(r.get('asset_key','')):<42} {sz:>10}    {r.get('tags','NULL')}")

    print(f"\n{'='*68}")
    print(f"  size populated:  {size_ok}/{len(rows)}  ({size_fail} could not resolve)")
    print(f"  tags populated:  {tags_ok}/{len(rows)}")
    print(f"  NULL size remaining: {null_size}")
    print(f"  NULL tags remaining: {null_tags}")
    print(f"{'='*68}\n")


if __name__ == "__main__":
    run()
