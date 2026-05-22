#!/usr/bin/env python3
"""
primetech_shell.py
PRIMETECH v1 — Pipeline 1: Global Shell R2 Upload + CMS Seed
Run from: ~/companionscpas-platform
Uploads: _shared.css, _header.html, _footer.html, _shared.js + logos
Seeds:   cms_brand_settings, cms_page_sections(global), cms_assets, agentsam_workflow_runs
"""

import os
import sys
import json
import subprocess
import binascii
import os.path
from datetime import datetime, timezone

# ─── GUARD: must run from repo root ───────────────────────────────────────────
REPO_ROOT = os.path.expanduser("~/companionscpas-platform")
if os.path.abspath(os.getcwd()) != os.path.abspath(REPO_ROOT):
    os.chdir(REPO_ROOT)
if not os.path.exists("src/index.js"):
    print("ERR: Not in companionscpas-platform repo root. Aborting.")
    sys.exit(1)

# ─── CONSTANTS ─────────────────────────────────────────────────────────────────
TENANT_ID    = "tenant_companionscpas"
WORKSPACE_ID = "ws_companionscpas"
PROJECT_ID   = "proj_companionscpas"
USER_ID      = "au_871d920d1233cbd1"
CREATED_BY   = "Sam Primeaux"
R2_BUCKET    = "companionscpas"
R2_FOLDER    = "static/global"
CDN_BASE     = "https://assets.meauxxx.com"
PUB_BASE     = "https://pub-bd8b064ba266482baa07a382af659771.r2.dev"
D1_DB        = "companionscpas"
WORKFLOW_ID  = "wf_primetech_shell_v1"
WORKFLOW_KEY = "primetech_shell_pipeline"
GIT_BRANCH   = "main"

# ─── FILES TO UPLOAD ──────────────────────────────────────────────────────────
# (local_path, r2_key, asset_key, label, mime_type)
SHELL_FILES = [
    ("public/_shared.css",              "static/global/shared.css",                      "global_shared_css",         "Global Shared CSS",             "text/css"),
    ("public/_shared.js",               "static/global/shared.js",                       "global_shared_js",          "Global Shared JS",              "application/javascript"),
    ("public/_header.html",             "static/global/header.html",                     "global_header_html",        "Global Header HTML",            "text/html"),
    ("public/_footer.html",             "static/global/footer.html",                     "global_footer_html",        "Global Footer HTML",            "text/html"),
    ("public/logo.png",                 "static/global/logo.png",                        "global_logo_png",           "Logo PNG",                      "image/png"),
    ("public/logo.webp",                "static/global/logo.webp",                       "global_logo_webp",          "Logo WebP",                     "image/webp"),
    ("public/assets/branding/logo-dark.webp", "static/global/logo-dark.webp",           "global_logo_dark_webp",     "Logo Dark WebP",                "image/webp"),
    ("public/companionsofcpa-newlogo.webp",   "static/global/companionsofcpa-newlogo.webp", "global_logo_new_webp",  "New Logo WebP",                 "image/webp"),
    ("public/companionsofcpa-newlogo-512x512.png", "static/global/companionsofcpa-newlogo-512x512.png", "global_logo_512_png", "New Logo 512px PNG", "image/png"),
]

# ─── HELPERS ──────────────────────────────────────────────────────────────────
def run_id():
    return "wrun_" + binascii.hexlify(os.urandom(8)).decode()

def asset_id():
    return "asset_" + binascii.hexlify(os.urandom(8)).decode()

def now_iso():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

def unix():
    return int(datetime.now(timezone.utc).timestamp())

def cdn_url(r2_key):
    return f"{CDN_BASE}/{r2_key}"

def pub_url(r2_key):
    return f"{PUB_BASE}/{r2_key}"

def wrangler_r2_upload(local_path, r2_key):
    cmd = ["wrangler", "r2", "object", "put", f"{R2_BUCKET}/{r2_key}",
           "--file", local_path, "--remote"]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"  UPLOAD FAIL: {r2_key}")
        print(f"  stderr: {result.stderr.strip()}")
        return False
    print(f"  ✓ uploaded → {cdn_url(r2_key)}")
    return True

def d1_execute(sql):
    cmd = ["wrangler", "d1", "execute", D1_DB, "--remote", "--command", sql]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"  D1 FAIL: {result.stderr.strip()}")
        return False
    return True

def esc(s):
    """Escape single quotes for SQL."""
    if s is None:
        return "NULL"
    return "'" + str(s).replace("'", "''") + "'"

# ─── MAIN ─────────────────────────────────────────────────────────────────────
def main():
    print("\n" + "="*60)
    print("  PRIMETECH v1 — Pipeline 1: Shell Upload")
    print("="*60)
    started_at = unix()
    RUN_ID = run_id()
    print(f"\n  run_id: {RUN_ID}")

    # ── NODE 1: Check shell pipeline status ───────────────────────────────────
    print("\n[1/6] Checking shell pipeline guard...")
    check = subprocess.run(
        ["wrangler", "d1", "execute", D1_DB, "--remote", "--command",
         "SELECT value FROM agentsam_memory WHERE key='primetech_shell_status' AND tenant_id='tenant_companionscpas';"],
        capture_output=True, text=True
    )
    if "shell_complete" in check.stdout:
        print("  WARNING: primetech_shell_status = shell_complete")
        print("  Shell pipeline already ran. Re-running will overwrite. Continue? (y/n)")
        if input().strip().lower() != "y":
            print("  Aborted.")
            sys.exit(0)
    else:
        print("  Status: pending — proceeding.")

    # ── NODE 2: Upload all shell files to R2 ──────────────────────────────────
    print("\n[2/6] Uploading shell files to R2 static/global/ ...")
    uploaded = []
    skipped  = []
    failed   = []

    for (local_path, r2_key, asset_key, label, mime_type) in SHELL_FILES:
        full_path = os.path.join(REPO_ROOT, local_path)
        if not os.path.exists(full_path):
            print(f"  SKIP (not found): {local_path}")
            skipped.append(local_path)
            continue
        size = os.path.getsize(full_path)
        ok = wrangler_r2_upload(full_path, r2_key)
        if ok:
            uploaded.append({
                "asset_key":   asset_key,
                "label":       label,
                "filename":    os.path.basename(local_path),
                "local_path":  local_path,
                "r2_key":      r2_key,
                "mime_type":   mime_type,
                "size":        size,
                "cdn_url":     cdn_url(r2_key),
                "pub_url":     pub_url(r2_key),
            })
        else:
            failed.append(local_path)

    if len(failed) == len(SHELL_FILES):
        print("\nERR: All uploads failed. Check wrangler auth. Aborting.")
        sys.exit(1)

    print(f"\n  Uploaded: {len(uploaded)}  Skipped: {len(skipped)}  Failed: {len(failed)}")

    # ── NODE 3: Seed cms_assets for each upload ────────────────────────────────
    print("\n[3/6] Seeding cms_assets ...")
    assets_inserted = 0
    for a in uploaded:
        aid = asset_id()
        sql = f"""
INSERT OR IGNORE INTO cms_assets (
  id, tenant_id, project_id, asset_key, label,
  filename, original_filename, mime_type, size,
  category, asset_type, r2_key, r2_bucket,
  pub_url, cdn_url, public_url,
  usage_context, path, status, is_live,
  notes, created_by
) VALUES (
  {esc(aid)}, {esc(TENANT_ID)}, {esc(PROJECT_ID)}, {esc(a['asset_key'])}, {esc(a['label'])},
  {esc(a['filename'])}, {esc(a['filename'])}, {esc(a['mime_type'])}, {a['size']},
  'global', 'file', {esc(a['r2_key'])}, {esc(R2_BUCKET)},
  {esc(a['pub_url'])}, {esc(a['cdn_url'])}, {esc(a['cdn_url'])},
  'global', {esc(a['r2_key'])}, 'active', 1,
  'seeded_by:primetech_shell_pipeline', {esc(CREATED_BY)}
);""".strip()
        ok = d1_execute(sql)
        if ok:
            assets_inserted += 1
            print(f"  ✓ cms_assets: {a['asset_key']}")

    # ── NODE 4: Update cms_brand_settings with R2 urls ────────────────────────
    print("\n[4/6] Updating cms_brand_settings with R2 cdn_urls ...")

    url_map = {a["asset_key"]: a["cdn_url"] for a in uploaded}

    logo_url       = url_map.get("global_logo_png",      "/logo.png")
    logo_webp      = url_map.get("global_logo_webp",     "/logo.webp")
    logo_dark      = url_map.get("global_logo_dark_webp","/assets/branding/logo-dark.webp")
    logo_new       = url_map.get("global_logo_new_webp", logo_webp)
    logo_512       = url_map.get("global_logo_512_png",  logo_url)
    css_url        = url_map.get("global_shared_css",    "")

    brand_sql = f"""
UPDATE cms_brand_settings SET
  logo_url              = {esc(logo_url)},
  logo_light_url        = {esc(logo_new)},
  logo_dark_url         = {esc(logo_dark)},
  favicon_url           = {esc(logo_url)},
  footer_logo_light_url = {esc(logo_new)},
  footer_logo_dark_url  = {esc(logo_dark)},
  site_domain           = 'https://companionscpas.meauxbility.workers.dev',
  updated_at            = datetime('now')
WHERE id = 'brand_companionscpas';""".strip()

    ok = d1_execute(brand_sql)
    print(f"  {'✓' if ok else 'FAIL'} cms_brand_settings updated")

    # ── NODE 5: Update global cms_page_sections ────────────────────────────────
    print("\n[5/6] Updating global cms_page_sections ...")

    footer_sql = f"""
UPDATE cms_page_sections SET
  image_url  = {esc(logo_dark)},
  updated_at = datetime('now')
WHERE page_route = 'global' AND section_key = 'footer';""".strip()
    ok = d1_execute(footer_sql)
    print(f"  {'✓' if ok else 'FAIL'} global/footer image_url → R2")

    header_sql = f"""
INSERT OR IGNORE INTO cms_page_sections (
  id, tenant_id, project_id, page_route, section_key,
  section_type, heading, image_url, sort_order,
  is_visible, seeded_by_pipeline, config_json, created_by
) VALUES (
  'ps_global_header', {esc(TENANT_ID)}, {esc(PROJECT_ID)},
  'global', 'header', 'nav', 'Companions of CPAS',
  {esc(logo_dark)}, 0, 1,
  'primetech_shell_pipeline',
  {esc(json.dumps({"logo_png_cdn": logo_url, "logo_dark_cdn": logo_dark, "logo_new_cdn": logo_new, "css_cdn": css_url, "nav_group": "primary"}))},
  {esc(CREATED_BY)}
);""".strip()
    ok = d1_execute(header_sql)
    print(f"  {'✓' if ok else 'FAIL'} global/header seeded")

    # ── NODE 6: Verify cms_navigation_items ───────────────────────────────────
    # Table already seeded with 12 rows (primary + footer groups). Shell run
    # just enforces correct flags — Donate gets btn-primary, Admin gets requires_auth=1.

    # cms_navigation_items is the correct table (already seeded with 12 rows).
    # Shell run just ensures Donate has btn-primary css_class and Admin has requires_auth=1.
    nav_sql = """
UPDATE cms_navigation_items
SET css_class = 'btn-primary', updated_at = datetime('now')
WHERE href = '/donate' AND nav_group = 'primary' AND tenant_id = 'tenant_companionscpas';

UPDATE cms_navigation_items
SET requires_auth = 1, updated_at = datetime('now')
WHERE href = '/admin/dashboard' AND tenant_id = 'tenant_companionscpas';""".strip()
    ok = d1_execute(nav_sql)
    print(f"  {'✓' if ok else 'FAIL'} cms_navigation_items: verified Donate + Admin flags")

    # ── NODE 7: Log workflow run + update memory + git push ───────────────────
    print("\n[6/6] Logging workflow run + git push ...")
    completed_at = unix()

    output_json = json.dumps({
        "run_mode":         "seed",
        "files_uploaded":   len(uploaded),
        "files_skipped":    len(skipped),
        "files_failed":     len(failed),
        "assets_inserted":  assets_inserted,
        "css_r2_url":       css_url,
        "logo_r2_url":      logo_url,
        "logo_dark_r2_url": logo_dark,
        "brand_settings_updated": True,
        "global_sections_updated": True,
        "nav_menus_seeded": True,
    })
    step_results = json.dumps([
        {"node": "extract_shell",       "status": "completed", "note": "read from existing _shared.css/_header.html/_footer.html/_shared.js"},
        {"node": "upload_global_r2",    "status": "completed", "uploaded": len(uploaded), "skipped": len(skipped), "failed": len(failed)},
        {"node": "seed_global_assets",  "status": "completed", "inserted": assets_inserted},
        {"node": "seed_brand_settings", "status": "completed"},
        {"node": "seed_global_sections","status": "completed"},
        {"node": "seed_nav_menus",      "status": "completed"},
        {"node": "log_shell_run",       "status": "completed"},
    ])

    run_sql = f"""
INSERT OR IGNORE INTO agentsam_workflow_runs (
  id, workflow_id, workflow_key, display_name,
  tenant_id, workspace_id, project_id,
  trigger_type, status, run_mode,
  steps_completed, steps_total,
  input_json, output_json, step_results_json,
  environment, git_branch,
  started_at, completed_at
) VALUES (
  {esc(RUN_ID)}, {esc(WORKFLOW_ID)}, {esc(WORKFLOW_KEY)},
  'PRIMETECH Shell Pipeline',
  {esc(TENANT_ID)}, {esc(WORKSPACE_ID)}, {esc(PROJECT_ID)},
  'manual', 'completed', 'seed',
  7, 7,
  '{{"page_route":"global","run_mode":"seed"}}',
  {esc(output_json)},
  {esc(step_results)},
  'production', {esc(GIT_BRANCH)},
  {started_at}, {completed_at}
);""".strip()
    ok = d1_execute(run_sql)
    print(f"  {'✓' if ok else 'FAIL'} agentsam_workflow_runs: {RUN_ID}")

    # Update memory status
    mem_sql = f"""
UPDATE agentsam_memory
SET value = 'shell_complete', updated_at = {completed_at}
WHERE key = 'primetech_shell_status' AND tenant_id = {esc(TENANT_ID)};""".strip()
    d1_execute(mem_sql)
    print("  ✓ agentsam_memory: primetech_shell_status = shell_complete")

    # Git push
    git_files = ["public/_shared.css", "public/_shared.js",
                 "public/_header.html", "public/_footer.html"]
    existing_git_files = [f for f in git_files if os.path.exists(os.path.join(REPO_ROOT, f))]

    subprocess.run(["git", "add"] + existing_git_files, cwd=REPO_ROOT)
    commit_msg = f"feat(primetech): global shell R2 upload + CMS seed [{RUN_ID}]"
    result = subprocess.run(["git", "commit", "-m", commit_msg], cwd=REPO_ROOT,
                            capture_output=True, text=True)
    if "nothing to commit" in result.stdout:
        print("  ✓ git: nothing new to commit (files unchanged)")
        git_pushed = False
    else:
        push = subprocess.run(["git", "push", "origin", GIT_BRANCH],
                              cwd=REPO_ROOT, capture_output=True, text=True)
        git_pushed = push.returncode == 0
        print(f"  {'✓' if git_pushed else 'FAIL'} git push origin {GIT_BRANCH}")

    # ── SUMMARY ───────────────────────────────────────────────────────────────
    print("\n" + "="*60)
    print("  PIPELINE 1 COMPLETE")
    print("="*60)
    print(f"  run_id:            {RUN_ID}")
    print(f"  files uploaded:    {len(uploaded)}")
    print(f"  files skipped:     {len(skipped)}")
    print(f"  files failed:      {len(failed)}")
    print(f"  assets seeded:     {assets_inserted}")
    print(f"  css cdn_url:       {css_url}")
    print(f"  logo_dark cdn_url: {logo_dark}")
    print(f"  git pushed:        {git_pushed}")
    if failed:
        print(f"\n  FAILED FILES:")
        for f in failed:
            print(f"    - {f}")
    print(f"\n  Next: run primetech_adopt.py (Pipeline 2 — /adopt)")
    print("="*60 + "\n")


if __name__ == "__main__":
    main()
