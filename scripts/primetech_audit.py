#!/usr/bin/env python3
"""
primetech_audit.py
==================
PrimeTech Site Audit Tool — Companions of CPAS
Greps every public HTML page for:
  - Page metadata (title, theme, route, data-route)
  - All text content by section (headings, body, eyebrows, CTAs)
  - All images (src, alt, context/section they appear in)
  - Inline <style> blocks (size, presence = anti-pattern flag)
  - Inline <header>/<footer> (presence = anti-pattern flag)
  - Shell CSS/JS references (old vs new name)
  - Line count + estimated KB
  - Section schema candidates (maps to cms_section_schemas)

Outputs:
  audit/primetech_audit.json     — machine-readable, feeds D1/GPT
  audit/primetech_audit.md       — human-readable report for review
  audit/content_[page].json      — per-page content for GPT revision

Usage:
  python3 primetech_audit.py
  (run from repo root where public/ lives)

PrimeTech Pipeline Contract:
  Every content change must:
  1. Start here (audit establishes baseline)
  2. Go through cms_pages / cms_page_sections in D1
  3. Be published via /api/cms/publish (render_page.js)
  4. Never edit public/*.html directly once pipeline is live
  5. Every commit must reference a todo_id or ctx_id
"""

import os
import json
import re
from pathlib import Path
from datetime import datetime
from html.parser import HTMLParser

# ── CONFIG ────────────────────────────────────────────────────
REPO_ROOT     = Path(__file__).parent.parent
PUBLIC_DIR    = REPO_ROOT / "public"
OUTPUT_DIR    = REPO_ROOT / "audit"
PAGES         = ["index.html", "about.html", "adopt.html", "services.html", "donate.html"]
OLD_SHELL_CSS = "/_shared.css"
OLD_SHELL_JS  = "/_shared.js"
NEW_SHELL_CSS = "/static/global/cpas-shell.css"
NEW_SHELL_JS  = "/static/global/cpas-shell.js"

# Section type hints — maps HTML patterns to cms_section_schemas
SECTION_TYPE_HINTS = {
    "hero":        ["section-hero", "hero-split", "hero-content", "hero-heading"],
    "text_image":  ["section-text-image", "text-col", "img-col"],
    "card_grid":   ["card-grid", "card-body", "card-title"],
    "testimonial": ["section-testimonial", "testimonial-quote"],
    "cta_banner":  ["section-cta", "hero-actions"],
    "org_info":    ["org-info", "footer-org", "ein", "501"],
    "animal_grid": ["animal-card", "animalGrid", "adopt"],
    "campaign":    ["campaign", "fundraiser", "fundraising"],
    "faq":         ["faq-item", "faq-q", "faq-a"],
    "nav":         ["site-header", "site-nav", "header-inner"],
    "footer":      ["site-footer", "footer-grid", "footer-brand"],
}

# ── HTML PARSER ───────────────────────────────────────────────
class PageParser(HTMLParser):
    def __init__(self, filename):
        super().__init__()
        self.filename    = filename
        self.route       = "/" + filename.replace("index.html", "").replace(".html", "")
        if self.route == "/": pass
        else: self.route = "/" + filename.replace(".html", "")

        # Findings
        self.title           = ""
        self.theme           = "unknown"
        self.data_route      = ""
        self.headings        = []       # {level, text, line_hint}
        self.paragraphs      = []       # plain text
        self.eyebrows        = []       # .eyebrow text
        self.cta_texts       = []       # button/link text
        self.images          = []       # {src, alt, context}
        self.sections        = []       # {type_hint, classes, id}
        self.inline_styles   = []       # {line, size_chars}
        self.inline_headers  = []       # line numbers
        self.inline_footers  = []       # line numbers
        self.shell_css_ref   = None     # which css it references
        self.shell_js_ref    = None     # which js it references

        # Parser state
        self._in_title       = False
        self._in_heading     = False
        self._current_tag    = ""
        self._in_style       = False
        self._style_start    = 0
        self._style_buf      = ""
        self._in_body_text   = False
        self._current_classes= []
        self._depth          = 0
        self._last_section_classes = []
        self._capture_text   = False
        self._text_buf       = ""
        self._text_tag       = ""
        self._line           = 0

    def handle_starttag(self, tag, attrs):
        self._depth += 1
        attrs_dict = dict(attrs)
        classes    = attrs_dict.get("class", "").split()
        el_id      = attrs_dict.get("id", "")

        # Title
        if tag == "title":
            self._in_title = True
            self._text_buf = ""

        # Body theme
        if tag == "body":
            cls = attrs_dict.get("class", "")
            if "theme-light" in cls: self.theme = "light"
            elif "theme-dark" in cls: self.theme = "dark"
            self.data_route = attrs_dict.get("data-route", self.route)

        # Stylesheet reference
        if tag == "link" and attrs_dict.get("rel") == "stylesheet":
            href = attrs_dict.get("href", "")
            self.shell_css_ref = href

        # Script reference
        if tag == "script" and "src" in attrs_dict:
            src = attrs_dict.get("src", "")
            if "shared" in src or "cpas-shell" in src:
                self.shell_js_ref = src

        # Inline style blocks
        if tag == "style":
            self._in_style   = True
            self._style_buf  = ""

        # Header / footer (inline = anti-pattern)
        if tag == "header":
            self.inline_headers.append(self._depth)
        if tag == "footer":
            self.inline_footers.append(self._depth)

        # Sections — detect type hints
        if tag in ("section", "div", "article") and classes:
            type_hint = "unknown"
            for schema, hints in SECTION_TYPE_HINTS.items():
                if any(h in " ".join(classes) or h in el_id for h in hints):
                    type_hint = schema
                    break
            if type_hint != "unknown" or "section" in classes:
                self.sections.append({
                    "tag":       tag,
                    "type_hint": type_hint,
                    "classes":   classes,
                    "id":        el_id,
                })
            self._last_section_classes = classes

        # Images
        if tag == "img":
            src = attrs_dict.get("src", "")
            alt = attrs_dict.get("alt", "")
            # Determine context from nearest section
            context = "unknown"
            for schema, hints in SECTION_TYPE_HINTS.items():
                if any(h in " ".join(self._last_section_classes) for h in hints):
                    context = schema
                    break
            self.images.append({
                "src":     src,
                "alt":     alt,
                "context": context,
            })

        # Headings
        if tag in ("h1", "h2", "h3", "h4"):
            self._in_heading  = True
            self._text_tag    = tag
            self._text_buf    = ""
            self._capture_text = True

        # Eyebrow / CTA / paragraph
        if tag == "p":
            self._capture_text = True
            self._text_tag     = "p"
            self._text_buf     = ""
            if "eyebrow" in classes:
                self._text_tag = "eyebrow"

        if tag in ("a", "button") and classes:
            cls_str = " ".join(classes)
            if "btn" in cls_str:
                self._capture_text = True
                self._text_tag     = "cta"
                self._text_buf     = ""

    def handle_endtag(self, tag):
        self._depth -= 1

        if tag == "title":
            self._in_title = False
            self.title = self._text_buf.strip()

        if tag == "style" and self._in_style:
            self._in_style = False
            self.inline_styles.append({
                "size_chars": len(self._style_buf),
                "size_kb":    round(len(self._style_buf.encode()) / 1024, 1),
            })
            self._style_buf = ""

        if tag in ("h1","h2","h3","h4") and self._capture_text and self._text_tag == tag:
            text = self._text_buf.strip()
            if text:
                self.headings.append({"level": tag, "text": text})
            self._capture_text = False
            self._text_buf     = ""

        if tag == "p" and self._capture_text and self._text_tag in ("p", "eyebrow"):
            text = self._text_buf.strip()
            if text and len(text) > 10:
                if self._text_tag == "eyebrow":
                    self.eyebrows.append(text)
                else:
                    self.paragraphs.append(text)
            self._capture_text = False
            self._text_buf     = ""

        if tag in ("a", "button") and self._capture_text and self._text_tag == "cta":
            text = self._text_buf.strip()
            if text and len(text) > 1:
                self.cta_texts.append(text)
            self._capture_text = False
            self._text_buf     = ""

    def handle_data(self, data):
        if self._in_title:
            self._text_buf += data
        if self._in_style:
            self._style_buf += data
        if self._capture_text:
            self._text_buf += data

# ── AUDIT RUNNER ──────────────────────────────────────────────
def audit_page(filename):
    path = PUBLIC_DIR / filename
    if not path.exists():
        return None

    raw      = path.read_text(encoding="utf-8", errors="replace")
    lines    = raw.splitlines()
    size_kb  = round(len(raw.encode()) / 1024, 1)
    line_cnt = len(lines)

    parser = PageParser(filename)
    parser.feed(raw)

    # Budget analysis
    inline_style_kb = sum(s["size_kb"] for s in parser.inline_styles)
    budget_flags = []
    if line_cnt > 300:
        budget_flags.append(f"LINE_COUNT_HIGH: {line_cnt} lines (target <300)")
    if inline_style_kb > 5:
        budget_flags.append(f"INLINE_CSS_HEAVY: {inline_style_kb}KB inline styles (target 0)")
    if len(parser.inline_headers) > 0:
        budget_flags.append(f"INLINE_HEADER: hardcoded <header> found (use cpas-header.html)")
    if len(parser.inline_footers) > 0:
        budget_flags.append(f"INLINE_FOOTER: hardcoded <footer> found (use cpas-footer.html)")
    if parser.shell_css_ref and "cpas-shell" not in parser.shell_css_ref:
        budget_flags.append(f"OLD_CSS_REF: {parser.shell_css_ref} (update to cpas-shell.css)")
    if parser.shell_js_ref and "cpas-shell" not in parser.shell_js_ref:
        budget_flags.append(f"OLD_JS_REF: {parser.shell_js_ref} (update to cpas-shell.js)")

    # Deduplicate images
    seen_imgs = set()
    unique_images = []
    for img in parser.images:
        key = img["src"]
        if key not in seen_imgs:
            seen_imgs.add(key)
            unique_images.append(img)

    return {
        "filename":        filename,
        "route":           parser.route,
        "theme":           parser.theme,
        "data_route":      parser.data_route,
        "title":           parser.title,
        "line_count":      line_cnt,
        "size_kb":         size_kb,
        "inline_style_kb": inline_style_kb,
        "inline_style_blocks": len(parser.inline_styles),
        "has_inline_header":   len(parser.inline_headers) > 0,
        "has_inline_footer":   len(parser.inline_footers) > 0,
        "shell_css_ref":   parser.shell_css_ref,
        "shell_js_ref":    parser.shell_js_ref,
        "budget_flags":    budget_flags,
        "content": {
            "headings":   parser.headings,
            "eyebrows":   parser.eyebrows,
            "paragraphs": parser.paragraphs,
            "ctas":       list(dict.fromkeys(parser.cta_texts)),  # dedup preserving order
        },
        "images":    unique_images,
        "sections":  parser.sections,
    }

# ── REPORT WRITER ─────────────────────────────────────────────
def write_markdown_report(pages_data):
    lines = [
        "# PrimeTech Site Audit — Companions of CPAS",
        f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}",
        "",
        "## Summary",
        "",
        "| Page | Lines | Size | Inline CSS | Flags |",
        "|------|-------|------|------------|-------|",
    ]

    for p in pages_data:
        flag_count = len(p["budget_flags"])
        flag_str   = f"{'🔴' * min(flag_count,3)} {flag_count} issues"
        lines.append(
            f"| {p['filename']} | {p['line_count']} | {p['size_kb']}KB "
            f"| {p['inline_style_kb']}KB | {flag_str} |"
        )

    lines += ["", "---", ""]

    for p in pages_data:
        route = p["route"] or "/"
        lines += [
            f"## {p['filename']}  (`{route}`)",
            f"- **Theme:** `{p['theme']}`  |  **Lines:** {p['line_count']}  |  **Size:** {p['size_kb']}KB",
            f"- **Inline CSS:** {p['inline_style_kb']}KB across {p['inline_style_blocks']} style blocks",
            f"- **Inline header:** {'YES — remove' if p['has_inline_header'] else 'clean'}",
            f"- **Inline footer:** {'YES — remove' if p['has_inline_footer'] else 'clean'}",
            f"- **CSS ref:** `{p['shell_css_ref'] or 'none'}`",
            f"- **JS ref:** `{p['shell_js_ref'] or 'none'}`",
            "",
        ]

        if p["budget_flags"]:
            lines.append("### Budget Flags")
            for f in p["budget_flags"]:
                lines.append(f"- `{f}`")
            lines.append("")

        c = p["content"]

        if c["headings"]:
            lines.append("### Headings (content to preserve)")
            for h in c["headings"]:
                lines.append(f"- **{h['level'].upper()}:** {h['text']}")
            lines.append("")

        if c["eyebrows"]:
            lines.append("### Eyebrow Labels")
            for e in c["eyebrows"]:
                lines.append(f"- `{e}`")
            lines.append("")

        if c["paragraphs"]:
            lines.append("### Body Copy")
            for idx, para in enumerate(c["paragraphs"][:10], 1):   # cap at 10 for readability
                preview = para[:140] + ("..." if len(para) > 140 else "")
                lines.append(f"{idx}. {preview}")
            if len(c["paragraphs"]) > 10:
                lines.append(f"_...and {len(c['paragraphs']) - 10} more paragraphs_")
            lines.append("")

        if c["ctas"]:
            lines.append("### CTAs / Buttons")
            for cta in c["ctas"]:
                lines.append(f"- `{cta}`")
            lines.append("")

        if p["images"]:
            lines.append("### Images")
            lines.append("| src | alt | context |")
            lines.append("|-----|-----|---------|")
            for img in p["images"]:
                src_short = img["src"].replace("https://assets.meauxxx.com", "[assets]")
                src_short = src_short.replace("https://companionscpas.meauxbility.workers.dev", "[cdn]")
                lines.append(f"| `{src_short}` | {img['alt']} | `{img['context']}` |")
            lines.append("")

        if p["sections"]:
            lines.append("### Detected Sections → cms_section_schemas candidates")
            seen = set()
            for s in p["sections"]:
                key = s["type_hint"]
                if key not in seen and key != "unknown":
                    seen.add(key)
                    lines.append(f"- `{key}` → schema_type: `{key}`")
            lines.append("")

        lines.append("---")
        lines.append("")

    # PrimeTech pipeline reminder
    lines += [
        "## PrimeTech Pipeline Contract",
        "",
        "Every content/layout change must flow through:",
        "",
        "```",
        "1. Edit content in D1: cms_pages + cms_page_sections",
        "2. Trigger /api/cms/publish",
        "3. render_page.js assembles HTML using theme tokens from cms_themes",
        "4. Output written to KV (edge cache) + R2 (archive)",
        "5. Worker serves from KV on public request",
        "6. git commit references todo_id or ctx_id",
        "7. Never edit public/*.html directly once pipeline is live",
        "```",
        "",
        "### File Budget Targets",
        "",
        "| File type | Target |",
        "|-----------|--------|",
        "| Page HTML | < 200 lines, < 15KB |",
        "| Page CSS  | < 15KB |",
        "| Page JS   | < 20KB |",
        "| cpas-shell.css | < 50KB (currently " +
            str(round((PUBLIC_DIR / "cpas-shell.css").stat().st_size / 1024, 1) 
                if (PUBLIC_DIR / "cpas-shell.css").exists() else "?") + "KB) |",
        "| cpas-shell.js  | < 30KB |",
        "| Any section    | < 50KB total (Shopify discipline) |",
    ]

    return "\n".join(lines)

# ── PER-PAGE CONTENT JSON (for GPT revision) ─────────────────
def write_content_json(page_data):
    """
    Stripped content-only JSON — feed this to GPT for copy revision.
    No CSS, no HTML structure — pure content contract.
    """
    return {
        "meta": {
            "page":    page_data["filename"],
            "route":   page_data["route"],
            "theme":   page_data["theme"],
            "title":   page_data["title"],
            "audit_date": datetime.now().isoformat(),
        },
        "instructions": (
            "Revise copy for clarity, emotional impact, and nonprofit voice. "
            "Preserve all factual info (EIN, address, names). "
            "Output must map to cms_section_schemas section types. "
            "Every section gets: eyebrow, heading, body, cta_text, cta_href. "
            "No emojis. No filler. Donors and adopters are the audience."
        ),
        "current_content": {
            "headings":   page_data["content"]["headings"],
            "eyebrows":   page_data["content"]["eyebrows"],
            "paragraphs": page_data["content"]["paragraphs"],
            "ctas":       page_data["content"]["ctas"],
        },
        "images": page_data["images"],
        "detected_sections": [
            s["type_hint"] for s in page_data["sections"]
            if s["type_hint"] != "unknown"
        ],
    }

# ── MAIN ──────────────────────────────────────────────────────
def main():
    OUTPUT_DIR.mkdir(exist_ok=True)

    print("PrimeTech Site Audit — Companions of CPAS")
    print("=" * 50)

    all_pages = []
    for filename in PAGES:
        print(f"  Auditing {filename}...", end=" ")
        data = audit_page(filename)
        if data:
            all_pages.append(data)
            flags = len(data["budget_flags"])
            print(f"{data['line_count']} lines, {data['size_kb']}KB, {flags} flags")

            # Per-page content JSON for GPT
            content_out = OUTPUT_DIR / f"content_{filename.replace('.html','')}.json"
            content_out.write_text(
                json.dumps(write_content_json(data), indent=2, ensure_ascii=False),
                encoding="utf-8"
            )
        else:
            print("NOT FOUND — skipping")

    # Master audit JSON
    audit_json = {
        "generated":    datetime.now().isoformat(),
        "project":      "companionscpas",
        "tenant_id":    "tenant_companionscpas",
        "primetech_version": "v2",
        "pages":        all_pages,
        "summary": {
            "total_lines":      sum(p["line_count"] for p in all_pages),
            "total_size_kb":    sum(p["size_kb"] for p in all_pages),
            "total_inline_css_kb": round(sum(p["inline_style_kb"] for p in all_pages), 1),
            "pages_with_inline_header": sum(1 for p in all_pages if p["has_inline_header"]),
            "pages_with_inline_footer": sum(1 for p in all_pages if p["has_inline_footer"]),
            "pages_with_old_css_ref":   sum(1 for p in all_pages if p["shell_css_ref"] and "cpas-shell" not in p["shell_css_ref"]),
            "total_images":     sum(len(p["images"]) for p in all_pages),
            "total_flags":      sum(len(p["budget_flags"]) for p in all_pages),
        }
    }

    (OUTPUT_DIR / "primetech_audit.json").write_text(
        json.dumps(audit_json, indent=2, ensure_ascii=False),
        encoding="utf-8"
    )

    # Markdown report
    report = write_markdown_report(all_pages)
    (OUTPUT_DIR / "primetech_audit.md").write_text(report, encoding="utf-8")

    # Print summary
    print()
    print("Summary")
    print("-" * 40)
    s = audit_json["summary"]
    print(f"  Total lines:       {s['total_lines']}")
    print(f"  Total size:        {s['total_size_kb']}KB")
    print(f"  Inline CSS total:  {s['total_inline_css_kb']}KB  ← should be 0")
    print(f"  Inline headers:    {s['pages_with_inline_header']} pages  ← should be 0")
    print(f"  Inline footers:    {s['pages_with_inline_footer']} pages  ← should be 0")
    print(f"  Old CSS refs:      {s['pages_with_old_css_ref']} pages  ← should be 0")
    print(f"  Total images:      {s['total_images']}")
    print(f"  Total flags:       {s['total_flags']}")
    print()
    print("Output files:")
    print(f"  audit/primetech_audit.json  ← machine-readable master")
    print(f"  audit/primetech_audit.md    ← human-readable report")
    print(f"  audit/content_*.json        ← per-page content for GPT")
    print()
    print("Next steps:")
    print("  1. Review audit/primetech_audit.md")
    print("  2. Feed audit/content_[page].json to GPT for copy revision")
    print("  3. Strip inline headers/footers/styles from each page")
    print("  4. Run again to confirm flags = 0")
    print("  5. git add audit/ && git commit -m 'primetech: baseline audit'")

if __name__ == "__main__":
    main()
