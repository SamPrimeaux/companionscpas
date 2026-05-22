#!/usr/bin/env python3
"""
PRIMETECH v1 — Phase 2: R2 Asset Upload
-----------------------------------------
CompanionsCPAS client build.

Takes the image manifest from Phase 1 (re-runs discovery internally),
deduplicates shared assets (logos, branding, repeated animal photos),
downloads each image, uploads to the companionscpas R2 bucket,
then seeds cms_assets in D1 with the new assets.meauxxx.com URLs.

Does NOT touch cms_page_sections yet — that's Phase 3.

Run from repo root:
    python3 phase2_r2_upload.py

Outputs:
    url_mapping.json  — old URL -> new R2 URL, used by Phase 3
"""

import subprocess, json, re, sys, os, time, hashlib, tempfile
from urllib.parse import urljoin, urlparse
from pathlib import PurePosixPath, Path
from collections import defaultdict

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    subprocess.run([sys.executable, "-m", "pip", "install",
                    "requests", "beautifulsoup4", "--break-system-packages"], check=True)
    import requests
    from bs4 import BeautifulSoup

# ─── Config ───────────────────────────────────────────────────────────────────

BASE_URL   = "https://companionscpas.meauxbility.workers.dev"
R2_BUCKET  = "companionscpas"
R2_DOMAIN  = "https://assets.meauxxx.com"
DB_NAME    = "companionscpas"
TENANT_ID  = "tenant_companionscpas"

PAGES = [
    {"slug": "home",     "url": f"{BASE_URL}/",         "route": "/"},
    {"slug": "about",    "url": f"{BASE_URL}/about",    "route": "/about"},
    {"slug": "adopt",    "url": f"{BASE_URL}/adopt",    "route": "/adopt"},
    {"slug": "services", "url": f"{BASE_URL}/services", "route": "/services"},
    {"slug": "donate",   "url": f"{BASE_URL}/donate",   "route": "/donate"},
]

# These src patterns are shared across every page — goes in static/assets/
# not static/pages/{slug}/ — dedup to one canonical copy
SHARED_PATTERNS = [
    r"/logo\.png",
    r"/logo-dark\.webp",
    r"/assets/branding",
    r"imagedelivery\.net",   # CF Images / IAM branding badge
]

# ─── Helpers ──────────────────────────────────────────────────────────────────

def d1_query(sql, label=""):
    result = subprocess.run(
        ["npx", "wrangler", "d1", "execute", DB_NAME,
         "--remote", "--json", "--command", sql],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        print(f"  [D1 error {label}] {result.stderr.strip()[:200]}")
        return []
    try:
        data = json.loads(result.stdout)
        if isinstance(data, list) and data:
            return data[0].get("results", [])
        return []
    except Exception as e:
        print(f"  [D1 parse error {label}] {e}")
        return []

def d1_run(sql, label=""):
    result = subprocess.run(
        ["npx", "wrangler", "d1", "execute", DB_NAME,
         "--remote", "--command", sql],
        capture_output=True, text=True
    )
    ok = result.returncode == 0
    if not ok:
        print(f"  [D1 write error {label}] {result.stderr.strip()[:200]}")
    return ok

def sanitize_filename(src):
    parsed   = urlparse(src)
    filename = PurePosixPath(parsed.path).name
    if not filename or "." not in filename:
        h = hashlib.md5(src.encode()).hexdigest()[:8]
        filename = f"asset_{h}.jpg"
    filename = re.sub(r"[^a-zA-Z0-9._-]", "_", filename).lower()
    return filename

def is_shared(src):
    return any(re.search(pat, src) for pat in SHARED_PATTERNS)

def r2_key_for(src, slug):
    filename = sanitize_filename(src)
    if is_shared(src):
        # Branding / logos / IAM badge → shared static/assets/
        if "imagedelivery.net" in src:
            return f"static/assets/iam_badge.jpg"
        if "logo-dark" in src or "logo_dark" in src:
            return "static/assets/logo-dark.webp"
        if "logo" in filename:
            return "static/assets/logo.png"
        return f"static/assets/{filename}"
    return f"static/pages/{slug}/{filename}"

def r2_upload(local_path, r2_key):
    """Upload a local file to R2 via wrangler."""
    result = subprocess.run(
        ["npx", "wrangler", "r2", "object", "put",
         f"{R2_BUCKET}/{r2_key}",
         "--file", str(local_path),
         "--remote"],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        print(f"    [R2 error] {result.stderr.strip()[:200]}")
        return False
    return True

def download_image(src, dest_path):
    """Download image to a local temp file. Returns True on success."""
    try:
        resp = requests.get(src, timeout=20, stream=True)
        resp.raise_for_status()
        with open(dest_path, "wb") as f:
            for chunk in resp.iter_content(8192):
                f.write(chunk)
        size = os.path.getsize(dest_path)
        if size < 100:
            return False  # likely an error page not an image
        return True
    except Exception as e:
        print(f"    [download error] {e}")
        return False

def content_type_for(filename):
    ext = filename.rsplit(".", 1)[-1].lower()
    return {
        "jpg": "image/jpeg", "jpeg": "image/jpeg",
        "png": "image/png", "webp": "image/webp",
        "gif": "image/gif", "svg": "image/svg+xml",
        "avif": "image/avif",
    }.get(ext, "application/octet-stream")

# ─── Phase 1 re-run (image manifest only) ─────────────────────────────────────

def collect_images():
    """Re-crawl all pages and return deduplicated image manifest."""
    seen_r2_keys = {}   # r2_key -> first entry (dedup by destination)
    seen_src     = {}   # normalized src -> r2_key (dedup by source)
    all_images   = []

    existing_assets = d1_query(
        f"SELECT asset_key, url FROM cms_assets WHERE tenant_id='{TENANT_ID}'"
    )
    existing_urls = {a["url"] for a in existing_assets}

    for page in PAGES:
        slug = page["slug"]
        url  = page["url"]
        try:
            resp = requests.get(url, timeout=15)
            resp.raise_for_status()
        except Exception as e:
            print(f"  [fetch error] {slug}: {e}")
            continue

        soup = BeautifulSoup(resp.text, "html.parser")
        for tag in soup.find_all(["script","style","noscript"]):
            tag.decompose()

        for i, img in enumerate(soup.find_all("img")):
            src = img.get("src","").strip()
            if not src or src.startswith("data:"):
                continue

            abs_src = urljoin(url, src)
            key     = r2_key_for(abs_src, slug)
            alt     = img.get("alt","").strip() or ""

            # Dedup by destination R2 key — first occurrence wins
            if key in seen_r2_keys:
                seen_r2_keys[key]["pages"].append(slug)
                continue

            entry = {
                "src":         abs_src,
                "alt":         alt,
                "r2_key":      key,
                "r2_url":      f"{R2_DOMAIN}/{key}",
                "slug":        slug,
                "pages":       [slug],
                "asset_key":   re.sub(r"[^a-zA-Z0-9_]", "_",
                                      key.replace("static/","").replace("/","_")),
                "is_shared":   is_shared(abs_src),
                "in_db":       abs_src in existing_urls,
                "old_in_db_url": abs_src if abs_src in existing_urls else None,
            }
            seen_r2_keys[key] = entry
            all_images.append(entry)

    return all_images

# ─── Main ─────────────────────────────────────────────────────────────────────

def run():
    print("\n" + "="*68)
    print("  PRIMETECH v1 — Phase 2: R2 Asset Upload")
    print("  Client: CompanionsCPAS")
    print("="*68)

    # ── Collect manifest ──────────────────────────────────────────────────────
    print("\n[1/4] Collecting image manifest (deduped)...")
    images = collect_images()

    shared  = [i for i in images if i["is_shared"]]
    page_imgs = [i for i in images if not i["is_shared"]]
    new_imgs  = [i for i in images if not i["in_db"]]
    old_imgs  = [i for i in images if i["in_db"]]

    print(f"  Total unique images:   {len(images)}")
    print(f"  Shared assets:         {len(shared)}  (-> static/assets/)")
    print(f"  Page-specific:         {len(page_imgs)}  (-> static/pages/slug/)")
    print(f"  Already in cms_assets: {len(old_imgs)}  (old workers.dev URL — will update)")
    print(f"  New to DB:             {len(new_imgs)}")

    print("\n  Deduped manifest:")
    for img in images:
        pages_str = ", ".join(img["pages"])
        status    = "[shared]" if img["is_shared"] else f"[{img['slug']}]"
        print(f"    {status:12s} {img['r2_key']}")
        print(f"               src: {img['src'][:70]}")
        if len(img["pages"]) > 1:
            print(f"               used on: {pages_str}")

    # ── Confirm before uploading ──────────────────────────────────────────────
    print(f"\n[2/4] Ready to download + upload {len(images)} images to R2.")
    confirm = input("  Proceed? (y/n): ").strip().lower()
    if confirm != "y":
        print("  Aborted.")
        sys.exit(0)

    # ── Download + upload ─────────────────────────────────────────────────────
    print(f"\n[3/4] Uploading to R2 bucket '{R2_BUCKET}'...")
    url_mapping    = {}   # old src URL -> new R2 URL
    upload_success = []
    upload_fail    = []

    with tempfile.TemporaryDirectory() as tmpdir:
        for i, img in enumerate(images):
            src      = img["src"]
            r2_key   = img["r2_key"]
            r2_url   = img["r2_url"]
            filename = sanitize_filename(src)
            dest     = Path(tmpdir) / filename

            print(f"\n  [{i+1}/{len(images)}] {r2_key}")
            print(f"    src: {src[:70]}")

            # Download
            ok = download_image(src, dest)
            if not ok:
                print(f"    [SKIP] download failed or file too small")
                upload_fail.append(img)
                continue

            size_kb = os.path.getsize(dest) / 1024
            print(f"    downloaded: {size_kb:.1f} KB")

            # Upload to R2
            ok = r2_upload(dest, r2_key)
            if not ok:
                upload_fail.append(img)
                continue

            print(f"    uploaded -> {r2_url}")
            url_mapping[src] = r2_url
            img["uploaded"]  = True
            img["r2_url"]    = r2_url
            upload_success.append(img)

            time.sleep(0.3)  # gentle rate limit

    # ── Seed cms_assets in D1 ─────────────────────────────────────────────────
    print(f"\n[4/4] Seeding cms_assets in D1 ({len(upload_success)} rows)...")

    for img in upload_success:
        asset_key    = img["asset_key"][:80]
        label        = (img["alt"] or asset_key)[:120].replace("'","''")
        r2_url       = img["r2_url"]
        usage_ctx    = "shared" if img["is_shared"] else f"page:{img['slug']}"
        asset_type   = "image"
        pages_used   = ",".join(img["pages"])[:200]

        sql = f"""
INSERT INTO cms_assets
  (tenant_id, asset_key, label, url, alt_text, asset_type, usage_context, status, metadata_json)
VALUES
  ('{TENANT_ID}', '{asset_key}', '{label}', '{r2_url}', '{label}',
   '{asset_type}', '{usage_ctx}', 'active',
   '{{"pages":"{pages_used}","r2_key":"{img['r2_key']}","migrated_from":"{img['src'][:150]}"}}'
  )
ON CONFLICT(tenant_id, asset_key) DO UPDATE SET
  url=excluded.url, alt_text=excluded.alt_text,
  usage_context=excluded.usage_context, status='active',
  metadata_json=excluded.metadata_json;
""".strip().replace("\n", " ")

        ok = d1_run(sql, asset_key)
        if ok:
            print(f"  seeded: {asset_key}")
        else:
            print(f"  FAILED: {asset_key}")

    # ── Save url_mapping.json for Phase 3 ────────────────────────────────────
    mapping_path = Path("url_mapping.json")
    with open(mapping_path, "w") as f:
        json.dump(url_mapping, f, indent=2)
    print(f"\n  url_mapping.json written ({len(url_mapping)} entries) — Phase 3 will use this")

    # ── Summary ───────────────────────────────────────────────────────────────
    print(f"\n{'='*68}")
    print("  PRIMETECH v1 — Phase 2 Complete")
    print(f"{'='*68}")
    print(f"  Uploaded:  {len(upload_success)}/{len(images)} images")
    print(f"  Failed:    {len(upload_fail)}")
    if upload_fail:
        print("  Failed items:")
        for f in upload_fail:
            print(f"    {f['src'][:70]}")
    print(f"\n  R2 structure created:")
    keys_by_dir = defaultdict(list)
    for img in upload_success:
        folder = "/".join(img["r2_key"].split("/")[:-1])
        keys_by_dir[folder].append(img["r2_key"].split("/")[-1])
    for folder, files in sorted(keys_by_dir.items()):
        print(f"    {folder}/  ({len(files)} files)")

    print(f"\n  cms_assets table: {len(upload_success)} rows seeded")
    print(f"  url_mapping.json: ready for Phase 3")
    print(f"\n  Next: python3 phase3_cms_seed.py")
    print(f"{'='*68}\n")


if __name__ == "__main__":
    run()
