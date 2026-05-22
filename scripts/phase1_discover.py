#!/usr/bin/env python3
"""
Phase 1 — CompanionsCPAS CMS Discovery
----------------------------------------
Crawls all 5 public pages + queries D1 schema, then prints a full manifest:
  - Every image found -> proposed R2 path + assets.meauxxx.com URL
  - Every text section -> proposed cms table, column mapping, section type
  - Org-specific operational tables -> Agent Sam tool + intent rule suggestions
  - Existing agentsam_tools + agentsam_intent_rules already seeded

NO writes. Review output, confirm, then run phase2_r2_upload.py.
"""

import subprocess, json, re, sys
from urllib.parse import urljoin, urlparse
from pathlib import PurePosixPath

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("Installing dependencies...")
    subprocess.run([sys.executable, "-m", "pip", "install", "requests", "beautifulsoup4", "--break-system-packages"], check=True)
    import requests
    from bs4 import BeautifulSoup

BASE_URL  = "https://companionscpas.meauxbility.workers.dev"
R2_DOMAIN = "https://assets.meauxxx.com"
DB_NAME   = "companionscpas"
TENANT_ID = "tenant_companionscpas"

PAGES = [
    {"slug": "home",     "url": f"{BASE_URL}/",         "route": "/"},
    {"slug": "about",    "url": f"{BASE_URL}/about",    "route": "/about"},
    {"slug": "adopt",    "url": f"{BASE_URL}/adopt",    "route": "/adopt"},
    {"slug": "services", "url": f"{BASE_URL}/services", "route": "/services"},
    {"slug": "donate",   "url": f"{BASE_URL}/donate",   "route": "/donate"},
]

# Org-specific tables and what Agent Sam should do with each
ORG_TABLES = {
    "animals": {
        "description": "Animal profiles available for adoption",
        "key_cols":    "id, name, species, breed, status, photo_url",
        "agentsam_tools": ["query_database", "write_database"],
        "intent_patterns": [
            r"how many animals|list.*animals|available.*adopt",
            r"add.*animal|update.*animal|remove.*listing",
            r"show me.*dogs|cats.*available|who needs.*foster",
        ],
        "r2_folder":  "static/animals/",
        "note":       "photo_url column should point to R2 after migration",
    },
    "animal_profiles": {
        "description": "Extended bio/medical info per animal",
        "key_cols":    "animal_id, bio, medical_notes, weight, age",
        "agentsam_tools": ["query_database", "update_cms_section"],
        "intent_patterns": [
            r"bio.*for|update.*profile|edit.*description",
            r"medical.*notes|weight|age.*animal",
        ],
        "r2_folder":  None,
        "note":       "Agent Sam can draft/improve animal bios from here",
    },
    "applications": {
        "description": "Adoption applications submitted",
        "key_cols":    "id, applicant_name, animal_id, status, submitted_at",
        "agentsam_tools": ["query_database"],
        "intent_patterns": [
            r"pending.*application|how many.*applic|review.*applic",
            r"approve|deny|application.*status",
        ],
        "r2_folder":  None,
        "note":       "Read-only — status changes need human approval",
    },
    "donations": {
        "description": "Donation transaction records",
        "key_cols":    "id, donor_id, amount, status, created_at",
        "agentsam_tools": ["query_database"],
        "intent_patterns": [
            r"how much.*raised|total.*donation|recent.*donor",
            r"donation.*this month|giving.*report",
        ],
        "r2_folder":  None,
        "note":       "Read-only — financial data, never write via Agent Sam",
    },
    "donors": {
        "description": "Donor contact records",
        "key_cols":    "id, name, email, total_given, last_gift_at",
        "agentsam_tools": ["query_database"],
        "intent_patterns": [
            r"top.*donor|who.*donated|lapsed.*donor",
            r"donor.*list|contact.*donor",
        ],
        "r2_folder":  None,
        "note":       "PII — Agent Sam should never surface full emails in chat",
    },
    "volunteer_records": {
        "description": "Volunteer roster and records",
        "key_cols":    "id, name, email, role, status, joined_at",
        "agentsam_tools": ["query_database"],
        "intent_patterns": [
            r"volunteer.*list|active.*volunteer|who.*helping",
            r"schedule.*volunteer|need.*help",
        ],
        "r2_folder":  None,
        "note":       "Read-only queries only",
    },
    "foster_records": {
        "description": "Active and past foster placements",
        "key_cols":    "id, animal_id, foster_name, start_date, end_date, status",
        "agentsam_tools": ["query_database"],
        "intent_patterns": [
            r"foster.*list|who.*fostering|animal.*foster",
            r"available.*foster|foster.*capacity",
        ],
        "r2_folder":  None,
        "note":       "Useful for capacity planning queries",
    },
    "fundraising_campaigns": {
        "description": "Fundraising campaigns with goals and progress",
        "key_cols":    "id, title, goal_amount, raised_amount, status, end_date",
        "agentsam_tools": ["query_database", "update_cms_section"],
        "intent_patterns": [
            r"campaign.*progress|how.*campaign|fundrais",
            r"update.*campaign|goal.*reached",
        ],
        "r2_folder":  None,
        "note":       "Agent Sam can pull live progress and update CMS campaign blocks",
    },
    "care_tasks": {
        "description": "Daily care tasks assigned per animal",
        "key_cols":    "id, animal_id, task_type, assigned_to, due_date, status",
        "agentsam_tools": ["query_database"],
        "intent_patterns": [
            r"care.*task|overdue|assigned.*today|task.*due",
        ],
        "r2_folder":  None,
        "note":       "Good for daily briefing queries",
    },
    "contact_requests": {
        "description": "Public contact form submissions",
        "key_cols":    "id, name, email, subject, message, created_at, status",
        "agentsam_tools": ["query_database"],
        "intent_patterns": [
            r"new.*contact|unread.*message|contact.*request",
            r"inquiry.*pending|follow.*up",
        ],
        "r2_folder":  None,
        "note":       "Read-only — Agent Sam can summarize but never auto-reply",
    },
}

# ─── D1 helper ────────────────────────────────────────────────────────────────

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

# ─── Classifiers ─────────────────────────────────────────────────────────────

def classify_section(tag, text, img_count):
    cls      = " ".join(tag.get("class", []))
    id_      = tag.get("id", "")
    combined = (cls + " " + id_).lower()

    if any(k in combined for k in ["hero", "banner", "jumbotron", "splash"]):
        return "hero", "class/id match"
    if any(k in combined for k in ["cta", "call-to-action", "action"]):
        return "cta", "class/id match"
    if any(k in combined for k in ["card", "grid", "listing", "tiles"]):
        return "card_grid", "class/id match"
    if any(k in combined for k in ["team", "staff", "board"]):
        return "text_image", "class/id match"
    if any(k in combined for k in ["donate", "giving", "support", "fund"]):
        return "cta", "donate keyword"
    if any(k in combined for k in ["adopt", "animal", "pets", "rescue"]):
        return "card_grid", "adopt keyword"
    if any(k in combined for k in ["footer"]):
        return "footer", "footer tag"
    if any(k in combined for k in ["nav", "header"]):
        return "header", "nav/header tag"
    h = tag.find(["h1", "h2", "h3"])
    if h and img_count > 0:
        return "text_image", "heading + image"
    if h and len(text) > 200:
        return "rich_text", "heading + long text"
    if h:
        return "text_block", "heading only"
    if img_count > 1:
        return "image_gallery", "multiple images"
    return "text_block", "fallback"

def agentsam_suggestion(slug, section_type):
    m = {
        "hero":          ("update_cms_section",                  r"update.*hero|change.*headline|edit.*banner",  "high"),
        "cta":           ("update_cms_section",                  r"donate.*button|cta|call.to.action|giving",    "high"),
        "card_grid":     ("query_database + update_cms_section", r"list.*animal|update.*adopt|add.*pet",         "medium"),
        "text_image":    ("update_cms_section",                  r"about.*us|team|mission|update.*story",        "low"),
        "rich_text":     ("update_cms_section",                  r"update.*content|edit.*page|change.*text",     "medium"),
        "image_gallery": ("update_cms_section + R2 upload",      r"add.*photo|upload.*image|gallery",            "medium"),
    }
    tool, pattern, reward = m.get(section_type, ("update_cms_section", rf"edit.*{slug}", "medium"))
    return {"tool": tool, "intent_pattern": pattern, "reward_hint": reward}

def r2_path(slug, src, idx):
    parsed   = urlparse(src)
    filename = PurePosixPath(parsed.path).name
    if not filename or "." not in filename:
        filename = f"image_{idx:02d}.jpg"
    filename = re.sub(r"[^a-zA-Z0-9._-]", "_", filename).lower()
    return f"static/pages/{slug}/{filename}"

# ─── Main ─────────────────────────────────────────────────────────────────────

def discover():
    print("\n" + "="*68)
    print("  CompanionsCPAS - Phase 1 CMS + Agent Sam Discovery")
    print("="*68)

    # ── D1: CMS current state ─────────────────────────────────────────────────
    print("\n[D1] CMS tables current state...")

    existing_pages    = d1_query(f"SELECT page_route, page_title, status FROM cms_pages WHERE tenant_id='{TENANT_ID}'", "cms_pages")
    existing_sections = d1_query(f"SELECT section_key, section_type, page_route FROM cms_page_sections WHERE tenant_id='{TENANT_ID}' LIMIT 50", "cms_page_sections")
    cms_sections_alt  = d1_query(f"SELECT section_key, section_type, page_route FROM cms_sections WHERE tenant_id='{TENANT_ID}' LIMIT 20", "cms_sections")
    existing_assets   = d1_query(f"SELECT asset_key, url, usage_context FROM cms_assets WHERE tenant_id='{TENANT_ID}'", "cms_assets")

    print(f"  cms_pages rows:               {len(existing_pages)}")
    for r in existing_pages:
        print(f"    route={r.get('page_route','?'):15s}  title={r.get('page_title','?'):30s}  status={r.get('status','?')}")

    print(f"  cms_page_sections rows:       {len(existing_sections)}")
    print(f"  cms_sections rows (alt):      {len(cms_sections_alt)}")
    if cms_sections_alt:
        print("    NOTE: cms_sections also has data - verify which is canonical")
        for r in cms_sections_alt[:4]:
            print(f"      {r}")
    print(f"  cms_assets rows:              {len(existing_assets)}")

    existing_section_keys = {f"{r['page_route']}:{r['section_key']}" for r in existing_sections}

    # ── D1: Existing Agent Sam wiring ─────────────────────────────────────────
    print("\n[D1] Existing Agent Sam wiring...")

    sam_tools   = d1_query(f"SELECT tool_key, tool_name, category, is_enabled FROM agentsam_tools WHERE tenant_id='{TENANT_ID}' ORDER BY category, tool_key", "agentsam_tools")
    sam_intents = d1_query(f"SELECT intent_pattern, required_tools, force_tool_model FROM agentsam_intent_rules WHERE tenant_id='{TENANT_ID}' ORDER BY priority DESC", "agentsam_intent_rules")
    sam_policy  = d1_query(f"SELECT task_type, min_tier, force_tool_capable FROM agentsam_model_policy WHERE tenant_id='{TENANT_ID}'", "agentsam_model_policy")

    print(f"  agentsam_tools seeded:        {len(sam_tools)}")
    for t in sam_tools:
        flag = "ON " if t.get("is_enabled") else "OFF"
        print(f"    [{flag}] {t.get('tool_key','?'):38s} ({t.get('category','?')})")

    print(f"\n  agentsam_intent_rules seeded: {len(sam_intents)}")
    for r in sam_intents:
        print(f"    rx: {str(r.get('intent_pattern',''))[:50]:52s} -> {r.get('required_tools','')}")

    print(f"\n  agentsam_model_policy rows:   {len(sam_policy)}")
    for r in sam_policy:
        print(f"    {r.get('task_type','?'):22s} tier={r.get('min_tier','?')}  force_tools={r.get('force_tool_capable','?')}")

    # ── D1: Org table row counts ───────────────────────────────────────────────
    print("\n[D1] Org operational table counts...")
    for tname, meta in ORG_TABLES.items():
        rows  = d1_query(f"SELECT COUNT(*) as n FROM {tname}", tname)
        count = rows[0].get("n", "?") if rows else "error"
        print(f"  {tname:35s} {count:>6} rows  - {meta['description']}")

    # ── Crawl pages ───────────────────────────────────────────────────────────
    all_images   = []
    all_sections = []

    for page in PAGES:
        slug  = page["slug"]
        route = page["route"]
        url   = page["url"]

        print(f"\n{'─'*68}")
        print(f"  PAGE: {slug.upper()}  ->  {url}")
        print(f"{'─'*68}")

        try:
            resp = requests.get(url, timeout=15)
            resp.raise_for_status()
        except Exception as e:
            print(f"  [FETCH ERROR] {e}")
            continue

        soup = BeautifulSoup(resp.text, "html.parser")
        for tag in soup.find_all(["script", "style", "noscript"]):
            tag.decompose()

        # Images
        imgs = soup.find_all("img")
        print(f"\n  Images ({len(imgs)}):")
        for i, img in enumerate(imgs):
            src = img.get("src", "").strip()
            if not src or src.startswith("data:"):
                continue
            abs_src  = urljoin(url, src)
            key      = r2_path(slug, abs_src, i)
            r2_url   = f"{R2_DOMAIN}/{key}"
            alt      = img.get("alt", "").strip() or "(no alt)"
            is_known = any(a["url"] == abs_src for a in existing_assets)
            status   = "[IN DB]" if is_known else "[NEW  ]"

            all_images.append({
                "page_slug": slug, "page_route": route,
                "src": abs_src, "alt": alt,
                "r2_key": key, "r2_url": r2_url,
                "in_db": is_known,
                "asset_key": f"{slug}_img_{i:02d}",
                "usage_context": f"page:{slug}",
            })
            print(f"    {status} {abs_src[:62]}")
            print(f"           alt: {alt[:55]}")
            print(f"           r2:  {r2_url}")

        # Sections
        section_tags = soup.find_all(
            ["section", "article", "main", "div"],
            class_=re.compile(
                r"hero|banner|cta|card|grid|team|about|adopt|donate|service|content|section|block|container",
                re.I
            )
        )
        if not section_tags:
            section_tags = soup.find_all(["section", "article", "main"])

        print(f"\n  Sections (up to 10 of {len(section_tags)} candidates):")
        seen_texts = set()

        for i, tag in enumerate(section_tags[:10]):
            text    = tag.get_text(" ", strip=True)
            preview = " ".join(text.split())[:120]
            if preview in seen_texts or len(preview) < 20:
                continue
            seen_texts.add(preview)

            imgs_in   = tag.find_all("img")
            stype, conf = classify_section(tag, text, len(imgs_in))
            h_tag     = tag.find(["h1","h2","h3","h4"])
            heading   = h_tag.get_text(strip=True)[:70] if h_tag else ""
            p_tag     = tag.find("p")
            body      = p_tag.get_text(strip=True)[:120] if p_tag else ""
            cta_a     = tag.find("a", class_=re.compile(r"btn|button|cta", re.I))
            cta_label = cta_a.get_text(strip=True) if cta_a else ""
            cta_href  = cta_a.get("href","") if cta_a else ""

            section_key = f"{stype}_{i+1:02d}"
            in_db       = f"{route}:{section_key}" in existing_section_keys
            hint        = agentsam_suggestion(slug, stype)
            status      = "[IN DB]" if in_db else "[NEW  ]"

            all_sections.append({
                "page_slug": slug, "page_route": route,
                "section_key": section_key, "section_type": stype,
                "heading": heading, "body_preview": body,
                "cta_label": cta_label, "cta_href": cta_href,
                "image_count": len(imgs_in), "in_db": in_db,
                "cms_table": "cms_page_sections",
                "agentsam_tool": hint["tool"],
                "intent_pattern": hint["intent_pattern"],
                "reward_hint": hint["reward_hint"],
            })

            print(f"\n    {status} [{stype}]  key={section_key}  ({conf})")
            if heading:   print(f"      heading:  {heading}")
            if body:      print(f"      body:     {body[:80]}...")
            if cta_label: print(f"      cta:      '{cta_label}' -> {cta_href}")
            if imgs_in:   print(f"      images:   {len(imgs_in)}")
            print(f"      table:    cms_page_sections")
            print(f"      tool:     {hint['tool']}")
            print(f"      intent:   {hint['intent_pattern']}")
            print(f"      reward:   {hint['reward_hint']}")

    # ── Org table Agent Sam wiring plan ───────────────────────────────────────
    print(f"\n{'='*68}")
    print("  AGENT SAM WIRING - ORG OPERATIONAL TABLES")
    print(f"{'='*68}")
    for tname, meta in ORG_TABLES.items():
        already = any(tname in str(r.get("required_tools","")) for r in sam_intents)
        status  = "[wired ]" if already else "[NEEDED]"
        print(f"\n  {status} {tname}")
        print(f"    desc:    {meta['description']}")
        print(f"    cols:    {meta['key_cols']}")
        print(f"    tools:   {', '.join(meta['agentsam_tools'])}")
        for p in meta["intent_patterns"]:
            print(f"    rx:      {p}")
        if meta.get("r2_folder"):
            print(f"    r2:      {meta['r2_folder']}")
        if meta.get("note"):
            print(f"    note:    {meta['note']}")

    # ── Final summary ──────────────────────────────────────────────────────────
    new_imgs     = [i for i in all_images   if not i["in_db"]]
    new_sections = [s for s in all_sections if not s["in_db"]]

    print(f"\n{'='*68}")
    print("  PHASE 1 SUMMARY")
    print(f"{'='*68}")
    print(f"  Pages crawled:              {len(PAGES)}")
    print(f"  Images:                     {len(all_images)} total  /  {len(new_imgs)} NEW -> need R2 + asset seed")
    print(f"  Sections:                   {len(all_sections)} total  /  {len(new_sections)} NEW -> need cms_page_sections seed")
    print(f"  Agent Sam tools seeded:     {len(sam_tools)}")
    print(f"  Intent rules seeded:        {len(sam_intents)}")
    print(f"  Org tables to wire:         {len(ORG_TABLES)}")

    print(f"\n  R2 directory plan:")
    for s in sorted(set(i["page_slug"] for i in new_imgs)):
        count = sum(1 for i in new_imgs if i["page_slug"] == s)
        print(f"    static/pages/{s}/   <- {count} image(s)")
    print(f"    static/animals/          <- animal photos (phase 4, after table check)")
    print(f"    static/assets/           <- logo, favicon (manual)")

    print(f"\n  Phases remaining:")
    print(f"    2. phase2_r2_upload.py   - download images, upload to R2, get URL map")
    print(f"    3. phase3_cms_seed.py    - seed cms_pages + cms_page_sections 1 page at a time")
    print(f"    4. phase4_agentsam.py    - seed org intent rules + tool wiring into D1")
    print(f"{'='*68}\n")

    return all_images, all_sections


if __name__ == "__main__":
    discover()
