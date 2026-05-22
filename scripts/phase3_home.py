#!/usr/bin/env python3
"""
PRIMETECH v1 — Phase 3: Home Page CMS Seed (v3)
-------------------------------------------------
Selectors derived from live HTML inspection.
Sections targeted by exact class/id — no broad text search.
CTAs use data-open-modal attribute, stored in cta_action.
Eyebrow uses exact class="eyebrow".
Cards use article.card > div.card-body structure.

Run from companionscpas-platform repo root:
    python3 phase3_home.py
"""

import subprocess, json, re, sys
from urllib.parse import urljoin

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    subprocess.run([sys.executable, "-m", "pip", "install",
                    "requests", "beautifulsoup4", "--break-system-packages"], check=True)
    import requests
    from bs4 import BeautifulSoup

DB         = "companionscpas"
TENANT_ID  = "tenant_companionscpas"
PAGE_URL   = "https://companionscpas.meauxbility.workers.dev/"
PAGE_ROUTE = "/"

# Ground truth: section slot -> exact cms_assets.asset_key
# Verified from live page inspection by Sam Primeaux, 2026-05-21
ASSET_MAP = {
    "nav_logo":        "assets_logo_dark_webp",
    "hero":            "pages_home_upclose_webp",
    "mission":         "pages_home_pup_webp",
    "foster_card_1":   "pages_home_2cute_webp",
    "foster_card_2":   "pages_home_sus_webp",
    "foster_card_3":   "pages_home_bluepit_webp",
    "campaign_card_1": "pages_home_thinboy_webp",
    "campaign_card_2": "pages_home_conehead_webp",
    "crisis_care":     "pages_home_miniscoobydoo_webp",
    "footer_logo":     "assets_logo_dark_webp",
    "footer_badge":    "assets_iam_badge_jpg",
}

# ─── Helpers ──────────────────────────────────────────────────────────────────

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
        print(f"  [D1 error {label}] {result.stderr.strip()[:150]}")
        return []
    try:
        data = json.loads(result.stdout)
        return data[0].get("results", []) if data else []
    except:
        return []

def q(s):
    """Escape single quotes and strip problematic unicode for SQL."""
    s = str(s or "")
    replacements = {
        "\u2014": "-", "\u2013": "-", "\u2018": "'", "\u2019": "'",
        "\u201c": '"', "\u201d": '"', "\u2026": "...", "\u00e2": "",
        "\u00c2": "", "\u00a2": "", "\u2022": "-", "\u00b7": "-",
        "\u2019": "'", "\u00e2\u0080\u0099": "'",
    }
    for char, rep in replacements.items():
        s = s.replace(char, rep)
    s = s.encode("ascii", "ignore").decode("ascii")
    return s.replace("'", "''").strip()

def tx(el):
    """Get clean text from element."""
    return el.get_text(" ", strip=True) if el else ""

def eyebrow(el):
    """Get eyebrow text using exact class name from live HTML."""
    if not el:
        return ""
    ey = el.find(class_="eyebrow")
    return tx(ey)

def cta_from(el):
    """
    Find CTA button. Live site uses:
      <button class="btn btn-primary" data-open-modal="foster">Label</button>
    Returns (label, modal_target_or_href, action_type)
    """
    # Try modal buttons first
    btns = el.find_all("button", class_=re.compile(r"btn"))
    if btns:
        label  = tx(btns[0])
        modal  = btns[0].get("data-open-modal", "")
        return label, modal, "modal"
    # Fallback to anchor tags
    a = el.find("a", class_=re.compile(r"btn|button"))
    if a:
        return tx(a), a.get("href",""), "link"
    return "", "", ""

def asset(assets, slot):
    key = ASSET_MAP.get(slot, "")
    return assets.get(key, {})

# ─── Load assets ──────────────────────────────────────────────────────────────

def load_assets():
    keys = "','".join(set(ASSET_MAP.values()))
    rows = d1_query(
        f"SELECT id, asset_key, filename, cdn_url, pub_url FROM cms_assets "
        f"WHERE tenant_id='{TENANT_ID}' AND asset_key IN ('{keys}')",
        "load_assets"
    )
    assets = {r["asset_key"]: r for r in rows}
    print(f"\n  Asset resolution ({len(rows)}/{len(set(ASSET_MAP.values()))} loaded):")
    for slot, key in ASSET_MAP.items():
        a = assets.get(key)
        status = "ok  " if a else "MISS"
        url = a['cdn_url'] if a else "NOT IN DB"
        print(f"  {status} {slot:20s} -> {key:38s} {url}")
    return assets

# ─── Crawl ────────────────────────────────────────────────────────────────────

def crawl():
    print(f"\n  Fetching {PAGE_URL}...")
    resp = requests.get(PAGE_URL, timeout=15)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")
    for tag in soup.find_all(["script","style","noscript"]):
        tag.decompose()
    print(f"  ok — {len(str(soup)):,} chars")
    return soup

# ─── Schemas ──────────────────────────────────────────────────────────────────

def seed_schemas():
    print("\n[2/7] Seeding cms_section_schemas...")
    schemas = [
        ("hero",          "Hero",          "layout",       "Full-bleed hero, dual modal CTAs, image, overlay card"),
        ("text_image",    "Text + Image",  "layout",       "Split section: rich text one side, image the other"),
        ("card_grid",     "Card Grid",     "layout",       "Eyebrow, heading, body, then article.card grid"),
        ("campaign_grid", "Campaign Grid", "fundraising",  "Featured fundraising cards with progress bars"),
        ("testimonial",   "Testimonial",   "social_proof", "Pull quote with attribution"),
        ("org_info",      "Org Info",      "content",      "Organization data and contact cards side by side"),
        ("footer",        "Footer",        "global",       "Global footer: logo, nav, org data, IAM badge"),
        ("nav",           "Navigation",    "global",       "Global top nav: logo, links, donate CTA"),
    ]
    for stype, label, cat, desc in schemas:
        ok = d1_run(f"""
INSERT OR REPLACE INTO cms_section_schemas
  (section_type, label, category, description, tenant_id, is_active, sort_order)
VALUES ('{stype}','{label}','{cat}','{q(desc)}','{TENANT_ID}',1,50);
""", f"schema_{stype}")
        print(f"  {'ok' if ok else 'FAIL'} {stype}")

# ─── cms_pages ────────────────────────────────────────────────────────────────

def seed_page(soup):
    print("\n[3/7] Seeding cms_pages (home)...")
    raw   = tx(soup.find("title")) or "Companions of CPAS"
    title = q(raw) or "Companions of CPAS - Second Chances for Caddo Dogs"
    meta  = soup.find("meta", attrs={"name":"description"})
    desc  = q(meta.get("content","")) if meta else ""
    ok = d1_run(f"""
INSERT OR REPLACE INTO cms_pages
  (id, tenant_id, route_path, slug, title, meta_description,
   status, is_homepage, show_header, show_footer, robots, created_by)
VALUES
  ('page_home','{TENANT_ID}','/','home',
   '{title}','{desc}',
   'published',1,1,1,'index,follow','Sam Primeaux');
""", "cms_pages")
    print(f"  {'ok' if ok else 'FAIL'} / — {title[:60]}")

# ─── Navigation ───────────────────────────────────────────────────────────────

def seed_nav(soup, assets):
    print("\n[4/7] Seeding cms_navigation_items...")
    d1_run(f"DELETE FROM cms_navigation_items WHERE tenant_id='{TENANT_ID}';", "clear")

    # Primary — from <nav> or <header>
    nav_el = soup.find("nav") or soup.find("header")
    seen, sort = set(), 10
    if nav_el:
        for a in nav_el.find_all("a", href=True):
            label = tx(a)
            href  = a["href"].strip()
            if not label or label in seen or href.startswith("javascript"):
                continue
            seen.add(label)
            css = "btn-primary" if "donate" in label.lower() else ""
            d1_run(f"""
INSERT OR REPLACE INTO cms_navigation_items
  (id,tenant_id,label,href,sort_order,is_visible,nav_group,css_class,requires_auth,created_by)
VALUES ('nav_p_{sort}','{TENANT_ID}','{q(label)}','{q(href)}',
        {sort},1,'primary','{css}',0,'Sam Primeaux');
""", f"nav_{label}")
            print(f"  ok  primary: {label:20s} -> {href}")
            sort += 10

    # Nav logo asset
    nav_logo = asset(assets, "nav_logo")
    d1_run(f"""
INSERT OR REPLACE INTO cms_navigation_items
  (id,tenant_id,label,href,sort_order,is_visible,nav_group,created_by)
VALUES ('nav_logo','{TENANT_ID}','Logo','/',1,1,'primary','Sam Primeaux');
""", "nav_logo")
    print(f"  ok  primary: Logo -> / (asset: {nav_logo.get('cdn_url','')})")

    # Footer — from <footer>
    footer_el = soup.find("footer")
    seen_f, sort_f = set(), 10
    if footer_el:
        for a in footer_el.find_all("a", href=True):
            label = tx(a)
            href  = a["href"].strip()
            if not label or label in seen_f or href.startswith("javascript"):
                continue
            seen_f.add(label)
            auth = 1 if "admin" in label.lower() else 0
            d1_run(f"""
INSERT OR REPLACE INTO cms_navigation_items
  (id,tenant_id,label,href,sort_order,is_visible,nav_group,requires_auth,created_by)
VALUES ('nav_f_{sort_f}','{TENANT_ID}','{q(label)}','{q(href)}',
        {sort_f},1,'footer',{auth},'Sam Primeaux');
""", f"nav_f_{label}")
            print(f"  ok  footer:  {label:20s} -> {href}{'  [auth]' if auth else ''}")
            sort_f += 10

# ─── Sections ─────────────────────────────────────────────────────────────────

def seed_sections(soup, assets):
    print("\n[5/7] Seeding cms_page_sections (home — 7 sections)...")

    # Clean stale rows first
    d1_run(f"""
DELETE FROM cms_page_sections
WHERE tenant_id='{TENANT_ID}' AND page_route='/'
AND section_key NOT IN
  ('hero_main','mission','foster_grid','campaigns','testimonial','crisis_care','org_info');
""", "clean_stale")

    # ── 1. Hero ───────────────────────────────────────────────────────────────
    print("\n  [10] hero_main")
    # Exact selector: <section class="hero">
    hero = soup.find("section", class_="hero")
    ey = h1 = body = ""
    cta1_lbl = cta1_target = cta2_lbl = cta2_target = ""
    overlay_h = overlay_b = ""

    if hero:
        ey   = eyebrow(hero)
        h1   = tx(hero.find("h1"))
        p    = hero.find("p")
        body = tx(p)

        # Buttons: <button class="btn ..." data-open-modal="...">
        btns = hero.find_all("button", class_=re.compile(r"btn"))
        if btns:
            cta1_lbl    = tx(btns[0])
            cta1_target = btns[0].get("data-open-modal", btns[0].get("href",""))
        if len(btns) > 1:
            cta2_lbl    = tx(btns[1])
            cta2_target = btns[1].get("data-open-modal", btns[1].get("href",""))

        # Overlay card: <div class="hero-card">
        card = hero.find(class_="hero-card")
        if card:
            overlay_h = tx(card.find("strong"))
            overlay_b = tx(card.find("span"))
    else:
        print("  WARNING: <section class='hero'> not found on live page")

    a   = asset(assets, "hero")
    cfg = q(json.dumps({
        "overlay_heading": overlay_h,
        "overlay_body":    overlay_b,
        "image_position":  "right",
        "cta1_action":     "modal",
        "cta2_action":     "modal",
    }))
    ok = d1_run(f"""
INSERT OR REPLACE INTO cms_page_sections
  (id,tenant_id,page_route,section_key,section_type,
   eyebrow,heading,body,
   cta_label,cta_href,cta_action,
   cta_secondary_label,cta_secondary_href,cta_secondary_action,
   primary_asset_id,image_url,
   sort_order,is_visible,config_json,created_by)
VALUES
  ('ps_home_hero','{TENANT_ID}','/','hero_main','hero',
   '{q(ey)}','{q(h1)}','{q(body)}',
   '{q(cta1_lbl)}','{q(cta1_target)}','modal',
   '{q(cta2_lbl)}','{q(cta2_target)}','modal',
   '{a.get("id","")}','{a.get("cdn_url","")}',
   10,1,'{cfg}','Sam Primeaux');
""", "hero_main")
    print(f"  {'ok' if ok else 'FAIL'}  eyebrow='{ey}'")
    print(f"         heading='{h1}'")
    print(f"         cta1='{cta1_lbl}' modal={cta1_target}")
    print(f"         cta2='{cta2_lbl}' modal={cta2_target}")
    print(f"         overlay='{overlay_h}'")
    print(f"         asset={a.get('cdn_url','MISSING')}")

    # ── 2. Mission ────────────────────────────────────────────────────────────
    print("\n  [20] mission")
    # Find section containing "second chance starts" - use id or data attr if present
    mission = soup.find("section", id="mission")
    if not mission:
        # Fallback: find section whose h2 contains the mission heading
        for s in soup.find_all("section"):
            h = s.find(["h2","h3"])
            if h and "second chance" in tx(h).lower():
                mission = s
                break

    m_ey = m_h = m_body = ""
    m_bullets = []
    if mission:
        m_ey  = eyebrow(mission)
        h     = mission.find(["h2","h3"])
        m_h   = tx(h)
        p     = mission.find("p")
        m_body = tx(p)
        # Feature items — look for structured list items
        for el in mission.find_all(["li","div"], class_=re.compile(r"feature|item|point|bullet|check")):
            txt = tx(el)
            if txt and len(txt) > 15:
                m_bullets.append(txt)
        # Also check for <strong> + text patterns
        if not m_bullets:
            for el in mission.find_all("strong"):
                parent = el.parent
                txt = tx(parent)
                if txt and len(txt) > 15:
                    m_bullets.append(txt)
    else:
        print("  WARNING: mission section not found — check live HTML for id/class")

    a   = asset(assets, "mission")
    cfg = q(json.dumps({"feature_list": m_bullets, "image_position": "left"}))
    ok  = d1_run(f"""
INSERT OR REPLACE INTO cms_page_sections
  (id,tenant_id,page_route,section_key,section_type,
   eyebrow,heading,body,primary_asset_id,image_url,
   sort_order,is_visible,config_json,created_by)
VALUES
  ('ps_home_mission','{TENANT_ID}','/','mission','text_image',
   '{q(m_ey)}','{q(m_h)}','{q(m_body)}',
   '{a.get("id","")}','{a.get("cdn_url","")}',
   20,1,'{cfg}','Sam Primeaux');
""", "mission")
    print(f"  {'ok' if ok else 'FAIL'}  eyebrow='{m_ey}'")
    print(f"         heading='{m_h}'")
    print(f"         bullets={len(m_bullets)}")
    print(f"         asset={a.get('cdn_url','MISSING')}")

    # ── 3. Foster grid ────────────────────────────────────────────────────────
    print("\n  [30] foster_grid")
    # Exact selector: <section id="foster" class="section">
    foster = soup.find("section", id="foster")
    f_ey = f_h = f_body = f_cta = f_target = ""
    f_cards = []

    if foster:
        f_ey   = eyebrow(foster)
        h      = foster.find(["h2","h3"])
        f_h    = tx(h)
        p      = foster.find("p")
        f_body = tx(p)

        # CTA button: <button data-open-modal="foster">
        btn    = foster.find("button", class_=re.compile(r"btn"))
        f_cta    = tx(btn)
        f_target = btn.get("data-open-modal","") if btn else ""

        # Cards: <article class="card">
        card_slots = ["foster_card_1","foster_card_2","foster_card_3"]
        for i, card_el in enumerate(foster.find_all("article", class_="card")[:3]):
            body_el = card_el.find(class_="card-body")
            ch = body_el.find(["h3","h4","h5"]) if body_el else None
            cp = body_el.find("p") if body_el else None
            ca = asset(assets, card_slots[i]) if i < len(card_slots) else {}
            f_cards.append({
                "heading":   tx(ch),
                "body":      tx(cp),
                "image_url": ca.get("cdn_url",""),
                "asset_id":  ca.get("id",""),
            })
    else:
        print("  WARNING: <section id='foster'> not found")

    cfg = q(json.dumps({"cards": f_cards, "columns": 3}))
    ok  = d1_run(f"""
INSERT OR REPLACE INTO cms_page_sections
  (id,tenant_id,page_route,section_key,section_type,
   eyebrow,heading,body,cta_label,cta_href,cta_action,
   sort_order,is_visible,config_json,created_by)
VALUES
  ('ps_home_foster','{TENANT_ID}','/','foster_grid','card_grid',
   '{q(f_ey)}','{q(f_h)}','{q(f_body)}',
   '{q(f_cta)}','{q(f_target)}','modal',
   30,1,'{cfg}','Sam Primeaux');
""", "foster_grid")
    print(f"  {'ok' if ok else 'FAIL'}  eyebrow='{f_ey}'")
    print(f"         heading='{f_h}'")
    for i, c in enumerate(f_cards):
        print(f"         card {i+1}: '{c['heading']}'  asset={c['image_url'] or 'MISSING'}")

    # ── 4. Campaigns ──────────────────────────────────────────────────────────
    print("\n  [40] campaigns")
    # Find by heading content since no id — look for h2 with "gift saves lives"
    campaigns = None
    for s in soup.find_all("section"):
        h = s.find(["h2","h3"])
        if h and ("gift saves lives" in tx(h).lower() or "featured campaigns" in tx(h).lower()):
            campaigns = s
            break

    c_ey = c_h = ""
    c_cards = []
    if campaigns:
        c_ey = eyebrow(campaigns)
        h    = campaigns.find(["h2","h3"])
        c_h  = tx(h)
        card_slots = ["campaign_card_1","campaign_card_2"]
        for i, card_el in enumerate(
            campaigns.find_all("article", class_=re.compile(r"card|campaign"))[:2]
        ):
            ch  = card_el.find(["h3","h4","h5"])
            cp  = card_el.find("p")
            c_ey_inner = eyebrow(card_el)
            ca  = asset(assets, card_slots[i]) if i < len(card_slots) else {}
            c_cards.append({
                "eyebrow":   c_ey_inner,
                "heading":   tx(ch),
                "body":      tx(cp),
                "image_url": ca.get("cdn_url",""),
                "asset_id":  ca.get("id",""),
            })
    else:
        print("  WARNING: campaigns section not found by heading — seeding with assets only")
        # Still seed with correct assets even if text not found
        card_slots = ["campaign_card_1","campaign_card_2"]
        for slot in card_slots:
            ca = asset(assets, slot)
            c_cards.append({"eyebrow":"","heading":"","body":"","image_url":ca.get("cdn_url",""),"asset_id":ca.get("id","")})

    cfg = q(json.dumps({"cards": c_cards, "columns": 2}))
    ok  = d1_run(f"""
INSERT OR REPLACE INTO cms_page_sections
  (id,tenant_id,page_route,section_key,section_type,
   eyebrow,heading,
   sort_order,is_visible,config_json,created_by)
VALUES
  ('ps_home_campaigns','{TENANT_ID}','/','campaigns','campaign_grid',
   '{q(c_ey)}','{q(c_h)}',
   40,1,'{cfg}','Sam Primeaux');
""", "campaigns")
    print(f"  {'ok' if ok else 'FAIL'}  eyebrow='{c_ey}'")
    print(f"         heading='{c_h}'")
    for i, c in enumerate(c_cards):
        print(f"         card {i+1}: '{c['heading']}'  asset={c['image_url'] or 'MISSING'}")

    # ── 5. Testimonial ────────────────────────────────────────────────────────
    print("\n  [50] testimonial")
    testimonial = None
    for s in soup.find_all("section"):
        txt = tx(s)
        if "gave me the chance" in txt.lower() or "real impact" in txt.lower():
            testimonial = s
            break

    t_ey = t_quote = t_attr = ""
    if testimonial:
        t_ey = eyebrow(testimonial)
        # Quote — find blockquote or element with opening quote char
        for el in testimonial.find_all(["blockquote","p","h2","h3"]):
            txt = tx(el)
            if "gave me the chance" in txt.lower() or "\u201c" in txt:
                t_quote = txt
                break
        # Attribution — element containing "Ramsey" or "foster and board"
        for el in testimonial.find_all(["p","span","cite","small","div"]):
            txt = tx(el)
            if any(w in txt.lower() for w in ["ramsey","foster and","board member"]):
                t_attr = txt
                break

    ok = d1_run(f"""
INSERT OR REPLACE INTO cms_page_sections
  (id,tenant_id,page_route,section_key,section_type,
   eyebrow,heading,subheading,
   sort_order,is_visible,created_by)
VALUES
  ('ps_home_testimonial','{TENANT_ID}','/','testimonial','testimonial',
   '{q(t_ey)}','{q(t_quote)}','{q(t_attr)}',
   50,1,'Sam Primeaux');
""", "testimonial")
    print(f"  {'ok' if ok else 'FAIL'}  eyebrow='{t_ey}'")
    print(f"         quote='{t_quote[:70]}'")
    print(f"         attr='{t_attr[:50]}'")

    # ── 6. Crisis care ────────────────────────────────────────────────────────
    print("\n  [60] crisis_care")
    # Exact: <section class="section dark-band"> with inner class="story-grid"
    crisis = soup.find("section", class_=re.compile(r"dark-band"))
    if not crisis:
        for s in soup.find_all("section"):
            if s.find(class_="story-grid"):
                crisis = s
                break

    cr_ey = cr_h = cr_body = cr_cta = cr_target = ""
    if crisis:
        cr_ey   = eyebrow(crisis)
        h       = crisis.find(["h2","h3"])
        cr_h    = tx(h)
        p       = crisis.find("p")
        cr_body = tx(p)
        btn     = crisis.find("button", class_=re.compile(r"btn"))
        cr_cta    = tx(btn)
        cr_target = btn.get("data-open-modal","") if btn else ""
    else:
        print("  WARNING: crisis section (dark-band/story-grid) not found")

    a   = asset(assets, "crisis_care")
    cfg = q(json.dumps({"image_position": "right"}))
    ok  = d1_run(f"""
INSERT OR REPLACE INTO cms_page_sections
  (id,tenant_id,page_route,section_key,section_type,
   eyebrow,heading,body,cta_label,cta_href,cta_action,
   primary_asset_id,image_url,
   sort_order,is_visible,config_json,created_by)
VALUES
  ('ps_home_crisis','{TENANT_ID}','/','crisis_care','text_image',
   '{q(cr_ey)}','{q(cr_h)}','{q(cr_body)}',
   '{q(cr_cta)}','{q(cr_target)}','modal',
   '{a.get("id","")}','{a.get("cdn_url","")}',
   60,1,'{cfg}','Sam Primeaux');
""", "crisis_care")
    print(f"  {'ok' if ok else 'FAIL'}  eyebrow='{cr_ey}'")
    print(f"         heading='{cr_h}'")
    print(f"         cta='{cr_cta}' modal={cr_target}")
    print(f"         asset={a.get('cdn_url','MISSING')}")

    # ── 7. Org info ───────────────────────────────────────────────────────────
    print("\n  [70] org_info")
    # Find section containing EIN number — unique enough
    org = None
    for s in soup.find_all("section"):
        if "88-4156327" in tx(s) or "501(c)(3)" in tx(s):
            org = s
            break

    org_data = {}
    contact  = {}
    if org:
        # Parse structured rows — look for label:value pairs in table-like divs
        # The live HTML uses a grid/table structure
        full = tx(org)

        # Use targeted regex with word boundary stops
        field_patterns = [
            (r"Tax status\s+(501\(c\)\(3\))", "tax_status"),
            (r"EIN\s+([\d-]+)",               "ein"),
            (r"Parish served\s+(\w+)",         "parish"),
            (r"Operating budget\s+(Under \$[\d,]+)", "budget"),
            (r"Sector\s+(\w+)",               "sector"),
        ]
        for pattern, key in field_patterns:
            m = re.search(pattern, full)
            if m:
                org_data[key] = m.group(1).strip()

        email_a = org.find("a", href=re.compile(r"mailto:", re.I))
        if email_a:
            contact["email"]      = tx(email_a)
            contact["email_href"] = email_a["href"]

        city_el = org.find(class_=re.compile(r"address|city|location", re.I))
        if city_el:
            contact["city"] = tx(city_el)
        else:
            m = re.search(r"(Shreveport, LA \d+)", full)
            if m:
                contact["city"] = m.group(1)

        for el in org.find_all(["p","div","span"]):
            txt = tx(el)
            if re.search(r"follow along|adoptable|stories from", txt, re.I) and len(txt) < 200:
                contact["social_desc"] = txt
                break

    cfg = q(json.dumps({"org_data": org_data, "contact": contact}))
    ok  = d1_run(f"""
INSERT OR REPLACE INTO cms_page_sections
  (id,tenant_id,page_route,section_key,section_type,
   heading,sort_order,is_visible,config_json,created_by)
VALUES
  ('ps_home_orginfo','{TENANT_ID}','/','org_info','org_info',
   'Companions of CPAS',70,1,'{cfg}','Sam Primeaux');
""", "org_info")
    print(f"  {'ok' if ok else 'FAIL'}  org_data={org_data}")
    print(f"         contact={contact}")

# ─── Verify ───────────────────────────────────────────────────────────────────

def verify():
    print("\n[6/7] Verification...")

    sections = d1_query(f"""
SELECT section_key, section_type, eyebrow, heading, cta_label, image_url, sort_order
FROM cms_page_sections
WHERE tenant_id='{TENANT_ID}' AND page_route='/'
ORDER BY sort_order""", "verify")

    print(f"\n  cms_page_sections '/' — {len(sections)} rows:")
    missing = []
    for s in sections:
        img = s.get("image_url","")
        # Grids store assets in config_json not image_url — that's ok
        needs_img = s.get("section_type") in ("hero","text_image")
        img_status = "ok" if img else ("ok(grid)" if not needs_img else "MISSING")
        if needs_img and not img:
            missing.append(s.get("section_key"))
        ey = s.get("eyebrow","") or ""
        print(f"  [{str(s.get('sort_order','')):>3}] {s.get('section_key',''):20s} "
              f"{s.get('section_type',''):14s} asset={img_status}")
        print(f"        eyebrow: '{ey[:50]}'")
        print(f"        heading: '{str(s.get('heading',''))[:60]}'")
        if s.get("cta_label"):
            print(f"        cta:     '{s.get('cta_label')}'")

    nav = d1_query(f"""
SELECT nav_group, label, href, css_class, requires_auth
FROM cms_navigation_items WHERE tenant_id='{TENANT_ID}'
ORDER BY nav_group, sort_order""", "verify_nav")

    print(f"\n  cms_navigation_items — {len(nav)} rows:")
    for n in nav:
        auth = " [auth]" if n.get("requires_auth") else ""
        css  = f" [{n.get('css_class')}]" if n.get("css_class") else ""
        print(f"  [{n.get('nav_group',''):8s}] {n.get('label',''):22s} -> {n.get('href','')}{css}{auth}")

    nulls = d1_query(f"""
SELECT COUNT(*) as n FROM cms_page_sections
WHERE tenant_id='{TENANT_ID}' AND page_route='/'
AND (heading IS NULL OR heading='')""", "nulls")

    print(f"\n  Sections missing image (hero/text_image only): {missing or 'none'}")
    print(f"  NULL heading count: {nulls[0].get('n',0) if nulls else '?'}")

# ─── Main ─────────────────────────────────────────────────────────────────────

def run():
    print("\n" + "="*68)
    print("  PRIMETECH v1 — Phase 3: Home Page (v3)")
    print("  Selectors: exact class/id from live HTML inspection")
    print("  Assets: exact asset_key lookup from D1")
    print("="*68)

    print("\n[1/7] Loading assets from cms_assets...")
    assets = load_assets()

    missing = [s for s, k in ASSET_MAP.items() if k not in assets]
    if missing:
        print(f"\n  WARNING — {len(missing)} asset(s) not in DB: {missing}")
        cont = input("  Continue anyway? (y/n): ").strip().lower()
        if cont != "y":
            sys.exit(0)

    soup = crawl()
    seed_schemas()
    seed_page(soup)
    seed_nav(soup, assets)
    seed_sections(soup, assets)
    verify()

    print(f"\n{'='*68}")
    print("  Phase 3 home page complete.")
    print("  If verify is clean — run phase3_about.py next.")
    print(f"{'='*68}\n")

if __name__ == "__main__":
    run()
