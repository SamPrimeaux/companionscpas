#!/usr/bin/env python3
"""
Audit R2 images + D1 cms_assets — dedupe groups, orphans, UX actions.

Outputs jq-friendly JSON.

Usage:
  python3 scripts/audit_r2_images.py                    # human summary
  python3 scripts/audit_r2_images.py --json             # stdout JSON
  python3 scripts/audit_r2_images.py --json -o docs/r2-image-audit.json

  # jq examples
  jq '.summary' docs/r2-image-audit.json
  jq '.duplicates.by_etag[] | {etag, keep: .keep.key, remove: [.remove[].key]}' docs/r2-image-audit.json
  jq '.ux_recommendations[]' docs/r2-image-audit.json
  jq '[.duplicates.by_etag[].remove[]] | length' docs/r2-image-audit.json

Requires: wrangler, CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN (.dev.vars or env)
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DB = "companionscpas"
TENANT = "tenant_companionscpas"
BUCKET = "companionscpas"
CDN = "https://assets.companionsofcaddo.org"

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".svg", ".bmp"}
IMAGE_PREFIXES = (
    "static/cms/",
    "static/animals/",
    "media/",
    "static/global/",
    "static/pages/",
)

REPO_ROOT = Path(__file__).resolve().parent.parent


def load_dotenv() -> None:
    dev = REPO_ROOT / ".dev.vars"
    if not dev.exists():
        return
    for line in dev.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def cf_creds() -> tuple[str, str]:
    load_dotenv()
    account = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "")
    token = os.environ.get("CLOUDFLARE_API_TOKEN", "")
    if not account or not token:
        raise SystemExit(
            "Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN. "
            "Set in .dev.vars or environment."
        )
    return account, token


def d1_query(sql: str) -> list[dict[str, Any]]:
    result = subprocess.run(
        ["npx", "wrangler", "d1", "execute", DB, "--remote", "--json", "--command", sql],
        capture_output=True,
        text=True,
        cwd=REPO_ROOT,
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "D1 query failed")
    data = json.loads(result.stdout)
    return data[0].get("results", []) if data else []


def list_r2_images(account: str, token: str, prefix: str = "") -> list[dict[str, Any]]:
    """Paginate Cloudflare R2 object list; filter to image-like keys."""
    out: list[dict[str, Any]] = []
    cursor = ""
    while True:
        params = f"limit=1000"
        if prefix:
            params += f"&prefix={urllib.request.quote(prefix, safe='')}"
        if cursor:
            params += f"&cursor={urllib.request.quote(cursor, safe='')}"
        url = f"https://api.cloudflare.com/client/v4/accounts/{account}/r2/buckets/{BUCKET}/objects?{params}"
        req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
        with urllib.request.urlopen(req, timeout=60) as resp:
            payload = json.loads(resp.read().decode())
        if not payload.get("success"):
            raise RuntimeError(json.dumps(payload.get("errors", payload)))

        for obj in payload.get("result", []):
            key = obj.get("key") or ""
            ext = Path(key).suffix.lower()
            ctype = (obj.get("http_metadata") or {}).get("contentType") or ""
            if ext in IMAGE_EXTS or ctype.startswith("image/"):
                out.append(
                    {
                        "key": key,
                        "etag": obj.get("etag"),
                        "size": int(obj.get("size") or 0),
                        "content_type": ctype,
                        "last_modified": obj.get("last_modified"),
                        "public_url": f"{CDN}/{key}",
                    }
                )

        info = payload.get("result_info") or {}
        if not info.get("is_truncated"):
            break
        cursor = info.get("cursor") or ""
        if not cursor:
            break
    return out


def normalize_basename(name: str) -> str:
    """Strip upload timestamps for fuzzy name matching."""
    base = Path(name).name.lower()
    base = re.sub(r"^\d{10,}-", "", base)
    base = re.sub(r"^[a-f0-9]{8,}-", "", base)
    return base


def pick_keep(rows: list[dict[str, Any]]) -> dict[str, Any]:
    """Prefer cms-linked, newest import, largest label completeness."""

    def score(r: dict[str, Any]) -> tuple:
        has_d1 = 1 if r.get("cms_id") else 0
        has_alt = 1 if (r.get("alt_text") or "").strip() else 0
        imported = r.get("imported_at") or r.get("cms_updated_at") or r.get("last_modified") or ""
        return (has_d1, has_alt, imported, r.get("size") or 0)

    return sorted(rows, key=score, reverse=True)[0]


def head_status(url: str) -> dict[str, Any]:
    if not url:
        return {"ok": False, "status": 0}
    req = urllib.request.Request(
        url,
        method="HEAD",
        headers={"User-Agent": "companionscpas-audit/1.0"},
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return {
                "ok": resp.status == 200,
                "status": resp.status,
                "etag": resp.headers.get("ETag", "").strip('"'),
                "content_length": int(resp.headers.get("Content-Length") or 0),
            }
    except urllib.error.HTTPError as e:
        return {"ok": False, "status": e.code}
    except Exception:
        return {"ok": False, "status": 0}


def build_report(hash_sample: int = 0) -> dict[str, Any]:
    account, token = cf_creds()

    cms_rows = d1_query(
        f"""
        SELECT id, asset_key, label, filename, original_filename, alt_text,
               mime_type, size, category, asset_type, r2_key, r2_bucket,
               pub_url, cdn_url, public_url, usage_context, status, is_live,
               source_provider, source_file_id, source_account_id, source_url,
               imported_at, created_at, updated_at
        FROM cms_assets
        WHERE tenant_id = '{TENANT}' AND status != 'archived'
        ORDER BY created_at DESC
        """
    )

    image_cms = [
        r for r in cms_rows
        if (r.get("mime_type") or "").startswith("image/")
        or (r.get("asset_type") or "") == "image"
        or Path(r.get("filename") or "").suffix.lower() in IMAGE_EXTS
    ]

    r2_objects: list[dict[str, Any]] = []
    seen_keys: set[str] = set()
    for prefix in IMAGE_PREFIXES:
        for obj in list_r2_images(account, token, prefix=prefix):
            if obj["key"] not in seen_keys:
                seen_keys.add(obj["key"])
                r2_objects.append(obj)

    cms_by_r2: dict[str, dict] = {}
    cms_by_url: dict[str, dict] = {}
    for row in image_cms:
        key = (row.get("r2_key") or "").strip()
        if key:
            cms_by_r2[key] = row
        for url_field in ("public_url", "cdn_url", "pub_url"):
            url = (row.get(url_field) or "").strip()
            if url:
                cms_by_url[url] = row

    merged: dict[str, dict[str, Any]] = {}

    def ensure(key: str, **fields) -> dict[str, Any]:
        if key not in merged:
            merged[key] = {"key": key}
        merged[key].update({k: v for k, v in fields.items() if v is not None})
        return merged[key]

    for obj in r2_objects:
        row = ensure(
            obj["key"],
            r2_key=obj["key"],
            etag=obj.get("etag"),
            size=obj.get("size"),
            content_type=obj.get("content_type"),
            last_modified=obj.get("last_modified"),
            public_url=obj.get("public_url"),
            in_r2=True,
        )
        cms = cms_by_r2.get(obj["key"])
        if cms:
            row.update(
                {
                    "cms_id": cms.get("id"),
                    "filename": cms.get("filename"),
                    "label": cms.get("label"),
                    "alt_text": cms.get("alt_text"),
                    "usage_context": cms.get("usage_context"),
                    "category": cms.get("category"),
                    "source_provider": cms.get("source_provider"),
                    "source_file_id": cms.get("source_file_id"),
                    "imported_at": cms.get("imported_at"),
                    "cms_updated_at": cms.get("updated_at"),
                    "in_cms": True,
                }
            )

    for row in image_cms:
        key = (row.get("r2_key") or "").strip()
        if not key:
            url = row.get("public_url") or row.get("cdn_url") or row.get("pub_url")
            ensure(
                f"cms-only:{row.get('id')}",
                cms_id=row.get("id"),
                filename=row.get("filename"),
                public_url=url,
                size=row.get("size"),
                in_cms=True,
                in_r2=False,
                missing_r2_key=True,
            )
        elif key not in merged:
            ensure(
                key,
                r2_key=key,
                cms_id=row.get("id"),
                filename=row.get("filename"),
                in_cms=True,
                in_r2=False,
            )

    records = list(merged.values())

    # Duplicate groups
    by_etag: dict[str, list] = defaultdict(list)
    by_size_name: dict[str, list] = defaultdict(list)
    by_drive_id: dict[str, list] = defaultdict(list)
    by_url: dict[str, list] = defaultdict(list)

    for rec in records:
        if rec.get("etag"):
            by_etag[rec["etag"]].append(rec)
        size = rec.get("size") or 0
        name = normalize_basename(rec.get("filename") or Path(rec.get("key", "")).name)
        if size and name:
            by_size_name[f"{size}:{name}"].append(rec)
        drive_id = rec.get("source_file_id")
        if drive_id:
            by_drive_id[drive_id].append(rec)
        url = rec.get("public_url")
        if url:
            by_url[url].append(rec)

    def dup_groups(bucket: dict[str, list], min_size: int = 2) -> list[dict]:
        groups = []
        for group_key, items in sorted(bucket.items(), key=lambda x: -len(x[1])):
            if len(items) < min_size:
                continue
            keep = pick_keep(items)
            remove = [i for i in items if i is not keep]
            groups.append(
                {
                    "group_key": group_key,
                    "count": len(items),
                    "wasted_bytes": sum((i.get("size") or 0) for i in remove),
                    "keep": slim(keep),
                    "remove": [slim(i) for i in remove],
                }
            )
        return groups

    dup_etag = dup_groups(by_etag)
    dup_size_name = dup_groups(by_size_name)
    dup_drive = dup_groups(by_drive_id)

    orphans_r2 = [
        slim(r)
        for r in records
        if r.get("in_r2") and not r.get("in_cms") and r.get("key", "").startswith(tuple(IMAGE_PREFIXES))
    ]

    orphans_cms = [
        slim(r)
        for r in records
        if r.get("in_cms") and (not r.get("in_r2") or r.get("missing_r2_key"))
    ]

    no_alt = [slim(r) for r in records if r.get("in_cms") and not (r.get("alt_text") or "").strip()]
    drive_imports = [slim(r) for r in records if r.get("source_provider") == "google_drive"]

    # Broken URL check (sample cms rows with URLs)
    broken: list[dict] = []
    for row in image_cms[:120]:
        url = row.get("public_url") or row.get("cdn_url") or row.get("pub_url")
        if not url:
            continue
        st = head_status(url)
        if not st.get("ok"):
            broken.append(
                {
                    "cms_id": row.get("id"),
                    "filename": row.get("filename"),
                    "url": url,
                    "http_status": st.get("status"),
                }
            )

    wasted_etag = sum(g["wasted_bytes"] for g in dup_etag)
    wasted_name = sum(g["wasted_bytes"] for g in dup_size_name)

    ux: list[dict[str, str]] = []

    if dup_etag:
        ux.append(
            {
                "priority": "high",
                "area": "dedupe",
                "action": f"Archive {sum(len(g['remove']) for g in dup_etag)} exact duplicate R2 objects (same ETag) — saves ~{wasted_etag // 1024} KB",
                "dashboard": "Usage / Cleanup tab → show ETag duplicate groups with one-click archive",
            }
        )
    if dup_drive:
        ux.append(
            {
                "priority": "medium",
                "area": "drive_imports",
                "action": f"Skip re-importing {len(dup_drive)} Drive files already in R2 (same source_file_id)",
                "dashboard": "Google Drive tab → mark already-imported files before import",
            }
        )
    if no_alt:
        ux.append(
            {
                "priority": "medium",
                "area": "accessibility",
                "action": f"Add alt text to {len(no_alt)} images (SEO + screen readers)",
                "dashboard": "R2 Library → Alt button; Cleanup tab already lists missing alt",
            }
        )
    if orphans_r2:
        ux.append(
            {
                "priority": "low",
                "area": "orphans",
                "action": f"Review {len(orphans_r2)} R2 image objects with no cms_assets row",
                "dashboard": "Cleanup tab → orphan R2 list with link-to-asset or delete",
            }
        )
    if broken:
        ux.append(
            {
                "priority": "high",
                "area": "broken",
                "action": f"Fix {len(broken)} cms_assets rows pointing to missing/broken URLs",
                "dashboard": "Cleanup tab → broken references table",
            }
        )

    ux.append(
        {
            "priority": "medium",
            "area": "library_ux",
            "action": "Add category filter chips (animal_profile, pagehome, cms) — data already in usage_context/category",
            "dashboard": "R2 Library toolbar already has context chips; extend to category + source badges",
        }
    )
    ux.append(
        {
            "priority": "medium",
            "area": "library_ux",
            "action": "Show duplicate badge on grid cards when ETag matches another asset",
            "dashboard": "R2 Library grid overlay: 'Duplicate of …'",
        }
    )
    if len(image_cms) >= 70:
        ux.append(
            {
                "priority": "low",
                "area": "api",
                "action": "Raise /api/cms/assets LIMIT above 200 so library count matches audit",
                "dashboard": "cms_api.js assets query LIMIT 200 → 500",
            }
        )

    return {
        "meta": {
            "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "bucket": BUCKET,
            "cdn": CDN,
            "tenant": TENANT,
        },
        "summary": {
            "cms_image_assets": len(image_cms),
            "r2_image_objects": len(r2_objects),
            "duplicate_etag_groups": len(dup_etag),
            "duplicate_etag_files_removable": sum(len(g["remove"]) for g in dup_etag),
            "wasted_bytes_etag": wasted_etag,
            "duplicate_size_name_groups": len(dup_size_name),
            "wasted_bytes_size_name": wasted_name,
            "drive_duplicate_groups": len(dup_drive),
            "missing_alt_text": len(no_alt),
            "drive_imports": len(drive_imports),
            "orphan_r2_images": len(orphans_r2),
            "orphan_cms_rows": len(orphans_cms),
            "broken_urls": len(broken),
        },
        "duplicates": {
            "by_etag": dup_etag,
            "by_size_and_basename": dup_size_name,
            "by_drive_file_id": dup_drive,
        },
        "orphans": {
            "r2_without_cms": orphans_r2,
            "cms_without_r2": orphans_cms,
        },
        "quality": {
            "missing_alt_text": no_alt,
            "broken_urls": broken,
            "drive_imports": drive_imports,
        },
        "ux_recommendations": ux,
        "assets": [slim(r) for r in sorted(records, key=lambda x: x.get("key", ""))],
    }


def slim(rec: dict[str, Any]) -> dict[str, Any]:
    return {
        k: rec[k]
        for k in (
            "key", "r2_key", "cms_id", "filename", "label", "alt_text",
            "size", "etag", "public_url", "usage_context", "category",
            "source_provider", "source_file_id", "imported_at", "in_r2", "in_cms",
        )
        if k in rec and rec[k] is not None and rec[k] != ""
    }


def human_summary(data: dict[str, Any]) -> str:
    s = data["summary"]
    lines = [
        "R2 Image Audit — Companions of CPAS",
        f"Generated: {data['meta']['generated_at']}",
        "",
        f"CMS image assets:     {s['cms_image_assets']}",
        f"R2 image objects:     {s['r2_image_objects']}",
        f"Exact dupes (ETag):   {s['duplicate_etag_groups']} groups, {s['duplicate_etag_files_removable']} removable (~{s['wasted_bytes_etag'] // 1024} KB)",
        f"Name+size dupes:      {s['duplicate_size_name_groups']} groups (~{s['wasted_bytes_size_name'] // 1024} KB)",
        f"Missing alt text:     {s['missing_alt_text']}",
        f"Orphan R2 (no D1):    {s['orphan_r2_images']}",
        f"Broken CMS URLs:      {s['broken_urls']}",
        "",
        "Top ETag duplicate groups:",
    ]
    for g in data["duplicates"]["by_etag"][:8]:
        keep = g["keep"].get("filename") or g["keep"].get("key", "")
        lines.append(f"  • {g['count']}x {keep} — keep {g['keep'].get('key','')}, remove {len(g['remove'])}")
    lines.append("")
    lines.append("UX recommendations:")
    for u in data["ux_recommendations"]:
        lines.append(f"  [{u['priority']}] {u['action']}")
    lines.append("")
    lines.append("jq: jq '.duplicates.by_etag' docs/r2-image-audit.json")
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit R2 images + cms_assets for dedupe")
    parser.add_argument("--json", action="store_true", help="JSON output")
    parser.add_argument("-o", "--output", help="Write JSON to file")
    args = parser.parse_args()

    try:
        report = build_report()
    except Exception as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    if args.output:
        Path(args.output).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

    if args.json and not args.output:
        json.dump(report, sys.stdout, indent=2)
        sys.stdout.write("\n")
    elif not args.json:
        print(human_summary(report))
        if args.output:
            print(f"\nJSON written: {args.output}")
    elif args.output:
        print(human_summary(report))
        print(f"\nJSON written: {args.output}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
