#!/usr/bin/env python3
"""
PRIMETECH v1 — Reseed cms_assets (post rebuild)
-------------------------------------------------
Table was dropped and recreated with proper unified schema.
This reads url_mapping.json (from Phase 2) and reseeds every
asset with BOTH full URLs stored:

  pub_url   = https://pub-bd8b064ba266482baa07a382af659771.r2.dev/static/...
  cdn_url   = https://assets.meauxxx.com/static/...
  public_url = cdn_url (canonical — swap to pub_url before custom domain is live)

Run from companionscpas-platform repo root:
    python3 reseed_cms_assets.py
"""

import subprocess, json, re, sys
from pathlib import Path, PurePosixPath
from urllib.parse import urlparse

DB        = "companionscpas"
TENANT_ID = "tenant_companionscpas"
R2_BUCKET = "companionscpas"
PUB_URL   = "https://pub-bd8b064ba266482baa07a382af659771.r2.dev"
CDN_URL   = "https://assets.meauxxx.com"

def d1_run(sql, label=""):
    result = subprocess.run(
        ["npx", "wrangler", "d1", "execute", DB,
         "--remote", "--command", sql.strip()],
        capture_output=True, text=True
    )
    ok = result.returncode == 0
    if not ok:
        print(f"  [FAIL {label}] {result.stderr.strip()[:200]}")
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

def mime_from(filename):
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    return {
        "jpg": "image/jpeg", "jpeg": "image/jpeg",
        "png": "image/png",  "webp": "image/webp",
        "gif": "image/gif",  "svg": "image/svg+xml",
        "avif": "image/avif","pdf": "application/pdf",
    }.get(ext, "application/octet-stream")

def filename_from(url):
    try:
        return PurePosixPath(urlparse(url).path).name or "unknown"
    except:
        return "unknown"

def run():
    print("\n" + "="*68)
    print("  PRIMETECH v1 — Reseed cms_assets (full URLs)")
    print("="*68)

    mapping_path = Path("url_mapping.json")
    if not mapping_path.exists():
        print("  url_mapping.json not found. Run phase2_r2_upload.py first.")
        sys.exit(1)

    with open(mapping_path) as f:
        url_map = json.load(f)

    print(f"\n  {len(url_map)} assets to seed from url_mapping.json")
    print(f"  pub_url base:  {PUB_URL}")
    print(f"  cdn_url base:  {CDN_URL}")

    # Also define known assets not in url_mapping
    # (logo appears on every page — ensure it's seeded once)
    extra_assets = [
        {
            "old_url":     f"https://companionscpas.meauxbility.workers.dev/logo.png",
            "r2_key":      "static/assets/logo.png",
            "alt":         "Companions of CPAS",
            "usage":       "shared",
            "asset_key":   "assets_logo_png",
        },
        {
            "old_url":     f"https://companionscpas.meauxbility.workers.dev/assets/branding/logo-dark.webp",
            "r2_key":      "static/assets/logo-dark.webp",
            "alt":         "Companions of CPAS dark logo",
            "usage":       "shared",
            "asset_key":   "assets_logo_dark_webp",
        },
    ]

    success = 0
    fail    = 0

    def seed_asset(r2_key, old_url="", alt="", usage=""):
        nonlocal success, fail

        fname     = filename_from(r2_key)
        mime      = mime_from(fname)
        pub_full  = f"{PUB_URL}/{r2_key}"
        cdn_full  = f"{CDN_URL}/{r2_key}"
        is_shared = "static/assets/" in r2_key
        slug      = r2_key.split("/")[2] if not is_shared and "/" in r2_key else "shared"
        usage_ctx = usage or ("shared" if is_shared else f"page:{slug}")
        asset_key = re.sub(r"[^a-zA-Z0-9_]", "_",
                           r2_key.replace("static/","").replace("/","_"))[:80]
        label     = alt or fname
        meta      = json.dumps({
            "r2_key":         r2_key,
            "migrated_from":  old_url[:150],
            "pub_url":        pub_full,
            "cdn_url":        cdn_full,
        })

        sql = f"""
INSERT OR REPLACE INTO cms_assets
  (tenant_id, asset_key, label, filename, original_filename, alt_text,
   mime_type, category, asset_type, r2_key, r2_bucket,
   pub_url, cdn_url, public_url, thumbnail_url,
   usage_context, path, status, is_live, metadata_json)
VALUES
  ('{TENANT_ID}', '{q(asset_key)}', '{q(label)}',
   '{q(fname)}', '{q(fname)}', '{q(alt)}',
   '{q(mime)}', 'image', 'image',
   '{q(r2_key)}', '{R2_BUCKET}',
   '{q(pub_full)}', '{q(cdn_full)}', '{q(cdn_full)}', NULL,
   '{q(usage_ctx)}', '{q(r2_key)}', 'active', 1,
   '{q(meta)}');
""".strip()

        ok = d1_run(sql, asset_key)
        if ok:
            success += 1
            print(f"  ok  {asset_key}")
            print(f"      pub: {pub_full}")
            print(f"      cdn: {cdn_full}")
        else:
            fail += 1
            print(f"  FAIL {asset_key}")

    # Seed from url_mapping.json
    print("\n  Seeding from url_mapping.json...")
    for old_url, cdn_url_stored in url_map.items():
        r2_key = cdn_url_stored.replace(f"{CDN_URL}/", "")
        fname  = filename_from(old_url)
        seed_asset(r2_key, old_url=old_url, alt=fname)

    # Seed extras not caught by mapping
    print("\n  Seeding shared branding assets...")
    for extra in extra_assets:
        already = any(
            extra["r2_key"] in v for v in url_map.values()
        )
        if not already:
            seed_asset(
                extra["r2_key"],
                old_url=extra["old_url"],
                alt=extra["alt"],
                usage=extra["usage"],
            )

    # Verify
    print(f"\n{'─'*68}")
    rows = d1_query(
        f"""SELECT asset_key, mime_type, pub_url, cdn_url, usage_context
            FROM cms_assets WHERE tenant_id='{TENANT_ID}'
            ORDER BY usage_context, asset_key""",
        "verify"
    )
    print(f"\n  {len(rows)} rows in cms_assets:\n")
    for r in rows:
        print(f"  {str(r.get('asset_key','')):<42} {str(r.get('mime_type','')):<20} {r.get('usage_context','')}")
        print(f"    pub: {r.get('pub_url','')}")
        print(f"    cdn: {r.get('cdn_url','')}")

    print(f"\n{'='*68}")
    print(f"  Seeded: {success}   Failed: {fail}")
    print(f"  cms_assets rebuilt with full dual URLs.")
    print(f"  Next: python3 phase3_cms_seed.py")
    print(f"{'='*68}\n")


if __name__ == "__main__":
    run()
