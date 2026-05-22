#!/usr/bin/env python3
"""
PRIMETECH v1 — companionscpas DB Repair
-----------------------------------------
Brings cms_assets up to IAM-standard unified schema.
Adds missing columns, backfills existing 25 rows where possible,
then verifies the result.

Run from companionscpas-platform repo root:
    python3 repair_cms_assets.py
"""

import subprocess, json, re, sys
from pathlib import Path
from urllib.parse import urlparse
from pathlib import PurePosixPath

DB        = "companionscpas"
TENANT_ID = "tenant_companionscpas"
R2_BUCKET = "companionscpas"
R2_DOMAIN = "https://assets.meauxxx.com"

# ─── Helpers ──────────────────────────────────────────────────────────────────

def d1_run(sql, label=""):
    result = subprocess.run(
        ["npx", "wrangler", "d1", "execute", DB,
         "--remote", "--command", sql.strip()],
        capture_output=True, text=True
    )
    ok = result.returncode == 0
    if not ok:
        err = result.stderr.strip()
        # Ignore "duplicate column" — means column already exists, that's fine
        if "duplicate column" in err.lower():
            print(f"  [already exists] {label}")
            return True
        print(f"  [FAIL {label}] {err[:200]}")
    return ok

def d1_query(sql, label=""):
    result = subprocess.run(
        ["npx", "wrangler", "d1", "execute", DB,
         "--remote", "--json", "--command", sql.strip()],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        print(f"  [D1 error {label}] {result.stderr.strip()[:200]}")
        return []
    try:
        data = json.loads(result.stdout)
        return data[0].get("results", []) if data else []
    except:
        return []

def q(s):
    return str(s or "").replace("'", "''")

def mime_from_filename(filename):
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    return {
        "jpg": "image/jpeg", "jpeg": "image/jpeg",
        "png": "image/png",  "webp": "image/webp",
        "gif": "image/gif",  "svg": "image/svg+xml",
        "avif": "image/avif","pdf": "application/pdf",
    }.get(ext, "application/octet-stream")

def filename_from_url(url):
    try:
        return PurePosixPath(urlparse(url).path).name
    except:
        return "unknown"

# ─── Step 1: Add missing columns ──────────────────────────────────────────────

def add_columns():
    print("\n[1/4] Adding missing columns to cms_assets...")

    alterations = [
        # IAM-standard columns missing from cpas
        ("filename",             "TEXT"),
        ("original_filename",    "TEXT"),
        ("size",                 "INTEGER"),
        ("mime_type",            "TEXT"),
        ("cloudflare_image_id",  "TEXT"),
        ("thumbnail_url",        "TEXT"),
        ("r2_bucket",            "TEXT"),
        ("is_live",              "INTEGER NOT NULL DEFAULT 0"),
        ("created_by",           "TEXT"),
        ("preferred_bg",         "TEXT"),
        ("builds",               "TEXT"),
        ("path",                 "TEXT"),
        # cpas additions that should also be official
        ("alt_text",             "TEXT"),
        ("usage_context",        "TEXT"),
        ("asset_key",            "TEXT"),
        ("label",                "TEXT"),
    ]

    for col, typedef in alterations:
        sql = f"ALTER TABLE cms_assets ADD COLUMN {col} {typedef};"
        ok  = d1_run(sql, col)
        if ok:
            print(f"  + {col} {typedef}")

    # Ensure UNIQUE index on (tenant_id, asset_key) exists
    d1_run(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_cms_assets_tenant_key ON cms_assets(tenant_id, asset_key);",
        "unique_index"
    )
    print("  + UNIQUE INDEX on (tenant_id, asset_key)")

# ─── Step 2: Backfill existing rows ───────────────────────────────────────────

def backfill_rows():
    print("\n[2/4] Backfilling existing cms_assets rows...")

    rows = d1_query(
        f"SELECT id, url, alt_text, asset_key, usage_context, metadata_json FROM cms_assets WHERE tenant_id='{TENANT_ID}'",
        "fetch_rows"
    )
    print(f"  {len(rows)} rows to backfill")

    for row in rows:
        rid          = row.get("id","")
        url          = row.get("url","") or row.get("public_url","")
        alt          = row.get("alt_text","") or ""
        asset_key    = row.get("asset_key","")
        usage_ctx    = row.get("usage_context","")

        fname        = filename_from_url(url)
        mime         = mime_from_filename(fname)
        r2_key       = url.replace(f"{R2_DOMAIN}/","") if R2_DOMAIN in url else ""
        is_shared    = "static/assets/" in r2_key
        slug         = r2_key.split("/")[2] if not is_shared and r2_key else "shared"

        # Derive asset_key if missing
        if not asset_key and r2_key:
            asset_key = re.sub(r"[^a-zA-Z0-9_]", "_",
                                r2_key.replace("static/","").replace("/","_"))[:80]

        # Derive usage_context if missing
        if not usage_ctx:
            usage_ctx = "shared" if is_shared else f"page:{slug}"

        # Derive label from alt or filename
        label = alt or fname

        if not rid:
            continue

        sql = f"""
UPDATE cms_assets SET
  filename          = '{q(fname)}',
  original_filename = '{q(fname)}',
  mime_type         = '{q(mime)}',
  r2_key            = '{q(r2_key)}',
  r2_bucket         = '{R2_BUCKET}',
  path              = '{q(r2_key)}',
  asset_key         = '{q(asset_key)}',
  label             = '{q(label)}',
  alt_text          = '{q(alt)}',
  usage_context     = '{q(usage_ctx)}',
  is_live           = 1,
  updated_at        = datetime('now')
WHERE id = '{rid}';
""".strip()

        ok = d1_run(sql, f"backfill_{fname[:30]}")
        print(f"  {'ok' if ok else 'FAIL'} — {fname} ({mime})")

# ─── Step 3: Fix the url/public_url column naming ─────────────────────────────

def fix_url_column():
    """
    companionscpas uses 'url' but IAM standard is 'public_url'.
    We can't rename columns in SQLite, so we keep both:
    ensure public_url column exists and is populated from url.
    """
    print("\n[3/4] Syncing url -> public_url column...")

    # Add public_url if missing
    d1_run("ALTER TABLE cms_assets ADD COLUMN public_url TEXT;", "public_url")

    # Backfill public_url from url where empty
    ok = d1_run(
        f"UPDATE cms_assets SET public_url = url WHERE public_url IS NULL AND url IS NOT NULL AND tenant_id='{TENANT_ID}';",
        "sync_public_url"
    )
    print(f"  public_url synced from url: {'ok' if ok else 'FAIL'}")

    # And vice versa — ensure url is populated from public_url
    d1_run(
        f"UPDATE cms_assets SET url = public_url WHERE url IS NULL AND public_url IS NOT NULL AND tenant_id='{TENANT_ID}';",
        "sync_url"
    )

# ─── Step 4: Verify ───────────────────────────────────────────────────────────

def verify():
    print("\n[4/4] Verification...")

    rows = d1_query(
        f"""SELECT asset_key, filename, mime_type, r2_bucket, is_live,
                   usage_context, url
            FROM cms_assets
            WHERE tenant_id='{TENANT_ID}'
            ORDER BY usage_context, asset_key
            LIMIT 30""",
        "verify"
    )
    print(f"  {len(rows)} rows in cms_assets:\n")
    print(f"  {'asset_key':<40} {'mime_type':<20} {'r2_bucket':<16} {'is_live':<8} {'usage_context'}")
    print(f"  {'-'*40} {'-'*20} {'-'*16} {'-'*8} {'-'*20}")
    for r in rows:
        print(f"  {str(r.get('asset_key','')):<40} "
              f"{str(r.get('mime_type','')):<20} "
              f"{str(r.get('r2_bucket','')):<16} "
              f"{str(r.get('is_live','')):<8} "
              f"{str(r.get('usage_context',''))}")

    # Check schema columns
    schema = d1_query(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='cms_assets'",
        "schema"
    )
    if schema:
        ddl = schema[0].get("sql","")
        expected = ["filename","original_filename","mime_type","r2_bucket",
                    "is_live","cloudflare_image_id","thumbnail_url","alt_text",
                    "usage_context","asset_key","label","public_url","path"]
        print(f"\n  Column check:")
        for col in expected:
            present = col in ddl
            print(f"    {'ok' if present else 'MISSING'} — {col}")

# ─── Main ─────────────────────────────────────────────────────────────────────

def run():
    print("\n" + "="*68)
    print("  PRIMETECH v1 — companionscpas cms_assets repair")
    print("="*68)

    add_columns()
    backfill_rows()
    fix_url_column()
    verify()

    print(f"\n{'='*68}")
    print("  cms_assets repair complete.")
    print("  Next: python3 phase3_cms_seed.py")
    print(f"{'='*68}\n")


if __name__ == "__main__":
    run()
