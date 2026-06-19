#!/usr/bin/env python3
"""
audit_public_images.py
Scrapes every image on the Companions of CPAS public pages and reports:
- src URL
- alt text (or missing flag)
- which page(s) it appears on
- whether it resolves (HTTP status)
- whether it's served from assets.companionsofcaddo.org (good) or elsewhere (flag)

Usage:
  python3 audit_public_images.py
  python3 audit_public_images.py --json -o docs/public-image-audit.json
"""

import argparse
import json
import sys
import urllib.request
import urllib.error
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse
from collections import defaultdict

PAGES = [
    "https://companionsofcaddo.org/",
    "https://companionsofcaddo.org/about",
    "https://companionsofcaddo.org/adopt",
    "https://companionsofcaddo.org/community",
    "https://companionsofcaddo.org/donate",
]

EXPECTED_CDN = "assets.companionsofcaddo.org"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (audit-bot/1.0; companionsofcaddo.org image audit)"
}


class ImageParser(HTMLParser):
    def __init__(self, base_url):
        super().__init__()
        self.base_url = base_url
        self.images = []
        self._in_picture = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)

        if tag == "picture":
            self._in_picture = True

        if tag == "img":
            src = attrs.get("src") or attrs.get("data-src") or attrs.get("data-lazy-src")
            if not src:
                return
            abs_src = urljoin(self.base_url, src)
            self.images.append({
                "src": abs_src,
                "raw_src": src,
                "alt": attrs.get("alt"),
                "alt_missing": "alt" not in attrs,
                "alt_empty": attrs.get("alt") == "",
                "loading": attrs.get("loading"),
                "width": attrs.get("width"),
                "height": attrs.get("height"),
                "in_picture": self._in_picture,
                "tag": "img",
            })

        if tag == "source" and self._in_picture:
            srcset = attrs.get("srcset", "")
            for part in srcset.split(","):
                url = part.strip().split()[0]
                if url:
                    abs_src = urljoin(self.base_url, url)
                    self.images.append({
                        "src": abs_src,
                        "raw_src": url,
                        "alt": None,
                        "alt_missing": True,
                        "alt_empty": False,
                        "loading": None,
                        "width": attrs.get("width"),
                        "height": attrs.get("height"),
                        "in_picture": True,
                        "tag": "source",
                    })

        # background images in style attributes
        if "style" in attrs:
            style = attrs["style"]
            if "url(" in style:
                start = style.find("url(") + 4
                end = style.find(")", start)
                raw = style[start:end].strip("'\"")
                if raw:
                    abs_src = urljoin(self.base_url, raw)
                    self.images.append({
                        "src": abs_src,
                        "raw_src": raw,
                        "alt": None,
                        "alt_missing": True,
                        "alt_empty": False,
                        "loading": None,
                        "width": None,
                        "height": None,
                        "in_picture": False,
                        "tag": f"{tag}[style]",
                    })

    def handle_endtag(self, tag):
        if tag == "picture":
            self._in_picture = False


def fetch_html(url):
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.read().decode("utf-8", errors="replace"), resp.status
    except urllib.error.HTTPError as e:
        return None, e.code
    except Exception as e:
        return None, str(e)


def check_url(url):
    req = urllib.request.Request(url, method="HEAD", headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status, resp.headers.get("Content-Type", "")
    except urllib.error.HTTPError as e:
        return e.code, ""
    except Exception as e:
        return None, str(e)


def classify_host(src):
    host = urlparse(src).netloc
    if host == EXPECTED_CDN:
        return "cdn_ok"
    elif host in ("companionsofcaddo.org", "www.companionsofcaddo.org"):
        return "same_origin"
    elif host == "":
        return "relative"
    else:
        return f"external:{host}"


def run(output_json=False, outfile=None):
    # page_slug → label
    page_labels = {url: url.replace("https://companionsofcaddo.org", "") or "/" for url in PAGES}

    # Collect: src → {pages, meta}
    image_index = {}   # src → entry
    page_images = {}   # page_url → list of src

    print("Scraping pages...", file=sys.stderr)
    for page_url in PAGES:
        label = page_labels[page_url]
        html, status = fetch_html(page_url)
        if not html:
            print(f"  ✗ {label} → HTTP {status}", file=sys.stderr)
            page_images[page_url] = []
            continue

        parser = ImageParser(page_url)
        parser.feed(html)
        imgs = parser.images
        page_images[page_url] = [i["src"] for i in imgs]
        print(f"  ✓ {label} → {len(imgs)} image refs found", file=sys.stderr)

        for img in imgs:
            src = img["src"]
            if src not in image_index:
                image_index[src] = {
                    "src": src,
                    "alt": img["alt"],
                    "alt_missing": img["alt_missing"],
                    "alt_empty": img["alt_empty"],
                    "tag": img["tag"],
                    "in_picture": img["in_picture"],
                    "host_class": classify_host(src),
                    "pages": [],
                    "http_status": None,
                    "content_type": None,
                }
            if label not in image_index[src]["pages"]:
                image_index[src]["pages"].append(label)
            # Keep alt from first img tag that has one
            if img["alt"] and not image_index[src]["alt"]:
                image_index[src]["alt"] = img["alt"]
                image_index[src]["alt_missing"] = False
                image_index[src]["alt_empty"] = img["alt_empty"]

    # Check each unique image URL
    unique = list(image_index.values())
    print(f"\nChecking {len(unique)} unique image URLs...", file=sys.stderr)
    for i, entry in enumerate(unique):
        status, ct = check_url(entry["src"])
        entry["http_status"] = status
        entry["content_type"] = ct
        ok = "✓" if status == 200 else "✗"
        print(f"  [{i+1}/{len(unique)}] {ok} {status} {entry['src'][:80]}", file=sys.stderr)

    # Build summary
    total = len(unique)
    broken = [e for e in unique if e["http_status"] != 200]
    missing_alt = [e for e in unique if e["alt_missing"] or e["alt_empty"]]
    not_on_cdn = [e for e in unique if e["host_class"] not in ("cdn_ok",)]
    external = [e for e in unique if e["host_class"].startswith("external:")]
    by_page = {page_labels[p]: len(imgs) for p, imgs in page_images.items()}

    summary = {
        "total_unique_images": total,
        "broken_urls": len(broken),
        "missing_or_empty_alt": len(missing_alt),
        "not_on_cdn": len(not_on_cdn),
        "external_sources": len(external),
        "images_per_page": by_page,
    }

    result = {
        "summary": summary,
        "images": unique,
        "broken": broken,
        "missing_alt": missing_alt,
        "not_on_cdn": not_on_cdn,
        "external": external,
    }

    if output_json:
        out = json.dumps(result, indent=2)
        if outfile:
            with open(outfile, "w") as f:
                f.write(out)
            print(f"\nSaved to {outfile}", file=sys.stderr)
        else:
            print(out)
    else:
        # Human-readable summary
        print("\n" + "="*60)
        print("COMPANIONS OF CPAS — PUBLIC IMAGE AUDIT")
        print("="*60)
        print(f"\nTotal unique images:        {total}")
        print(f"Broken URLs (non-200):      {len(broken)}")
        print(f"Missing/empty alt text:     {len(missing_alt)}")
        print(f"Not on CDN:                 {len(not_on_cdn)}")
        print(f"External sources:           {len(external)}")
        print(f"\nImages per page:")
        for page, count in by_page.items():
            print(f"  {page or '/':30s} {count}")

        if broken:
            print(f"\n{'─'*60}")
            print("BROKEN URLs:")
            for e in broken:
                print(f"  [{e['http_status']}] {e['src']}")
                print(f"        pages: {', '.join(e['pages'])}")

        if not_on_cdn:
            print(f"\n{'─'*60}")
            print("NOT SERVED FROM assets.companionsofcaddo.org:")
            for e in not_on_cdn:
                print(f"  [{e['host_class']}] {e['src'][:80]}")
                print(f"        pages: {', '.join(e['pages'])}")

        if missing_alt:
            print(f"\n{'─'*60}")
            print("MISSING / EMPTY ALT TEXT:")
            for e in missing_alt:
                flag = "MISSING" if e["alt_missing"] else "EMPTY"
                print(f"  [{flag}] {e['src'][:80]}")
                print(f"        pages: {', '.join(e['pages'])}")

        print(f"\n{'─'*60}")
        print("ALL IMAGES (unique):")
        for e in unique:
            status_icon = "✓" if e["http_status"] == 200 else f"✗{e['http_status']}"
            alt_flag = "" if (e["alt"] and not e["alt_empty"]) else " ⚠ no-alt"
            cdn_flag = "" if e["host_class"] == "cdn_ok" else f" ⚠ {e['host_class']}"
            print(f"  [{status_icon}]{alt_flag}{cdn_flag}")
            print(f"    {e['src']}")
            print(f"    pages: {', '.join(e['pages'])}")

    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Audit public images on companionsofcaddo.org")
    parser.add_argument("--json", action="store_true", help="Output JSON instead of human-readable")
    parser.add_argument("-o", "--output", help="Save JSON output to file")
    args = parser.parse_args()
    run(output_json=args.json, outfile=args.output)
