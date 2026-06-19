#!/usr/bin/env python3
"""
Companions of CPAS — live URL → repo file map + cleanup audit.

Outputs machine-readable JSON (jq-friendly) and an optional human summary.

Usage:
  python3 scripts/live_url_file_map.py                    # human summary to stdout
  python3 scripts/live_url_file_map.py --json             # full JSON to stdout
  python3 scripts/live_url_file_map.py --json -o map.json
  python3 scripts/live_url_file_map.py --json | jq '.cleanup.safe_to_delete[].path'

  python3 scripts/live_url_file_map.py --json | jq '.live_urls[] | {url, repo_files}'
  python3 scripts/live_url_file_map.py --json | jq '.live_urls[] | select(.route=="/")'
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DOMAIN = "companionsofcaddo.org"
BASE_URL = f"https://{DOMAIN}"
ASSETS_URL = f"https://assets.{DOMAIN}"

SKIP_DIRS = {
    ".git",
    "node_modules",
    ".wrangler",
    "__pycache__",
    ".cursor",
    ".vscode",
}

# One-off migration / repair scripts — not part of live runtime.
LEGACY_SCRIPT_PREFIXES = (
    "fix_",
    "patch_",
    "repair_",
    "nuke_",
    "phase",
    "build_",
    "install_",
    "inject_",
    "force_",
    "hard_",
    "normalize_",
    "polish_",
    "purge_",
    "rebrand_",
    "rebuild_",
    "remaster_",
    "replace_",
    "resolveModel_",
    "sync_good_",
    "sync_public_",
    "wire_",
    "quality_",
    "extract_",
    "populate_",
    "reseed_",
    "migrate_r2",
    "primetech_",
    "audit_public_",
    "filetree",
    "companionscpas_audit",
)

# Operational scripts to KEEP even if they look like one-offs.
OPS_SCRIPTS = {
    "scripts/sync-r2.sh",
    "scripts/cache-bust.sh",
    "scripts/republish-shell-pages.mjs",
    "scripts/publish-generic-page.mjs",
    "scripts/sync-page-fragments.mjs",
    "scripts/bootstrap_r2.mjs",
    "scripts/ops/cpas_sync_pipeline.sh",
    "scripts/live_url_file_map.py",
    "scripts/audits/cms_pass1_inspect.py",
}

# Curated live URL registry — each route → files that make it work.
URL_REGISTRY: list[dict[str, Any]] = [
    # ── Public pages (fragment CMS) ─────────────────────────────────────────
    {
        "route": "/",
        "category": "public_page",
        "label": "Home",
        "pipeline": "D1 cms_page_sections → R2 fragments → Worker assemble → KV page:/",
        "repo_files": [
            "src/api/page_cms_registry.js",
            "src/api/home_cms_sync.js",
            "src/api/render_home_section.js",
            "src/api/render_home_fragments.js",
            "src/api/render_page.js",
            "src/api/render_site_nav.js",
            "src/api/page_shell.js",
            "public/_shared.css",
            "public/_shared.js",
            "src/global/shared.js",
            "public/static/js/donate-modal.js",
            "public/static/global/cpas-modals.js",
            "static/pages/home/hero.html",
            "static/pages/home/mission.html",
            "static/pages/home/how-it-helps.html",
            "static/pages/home/transport-win.html",
            "static/pages/home/impact-stats.html",
            "static/pages/home/campaigns.html",
            "static/pages/home/newsletter.html",
        ],
        "r2_keys": [
            "static/pages/index.html",
            "static/pages/home/*.html",
            "static/global/shared.css",
            "static/global/shared.js",
            "static/global/cpas-modals.js",
            "static/js/donate-modal.js",
        ],
        "api": ["/api/newsletter/subscribe", "/api/cms/publish", "/api/cms/bootstrap"],
        "d1": ["cms_pages", "cms_page_sections", "cms_page_content_blocks", "cms_brand_settings", "newsletter_subscribers"],
        "kv": ["page:/"],
    },
    {
        "route": "/about",
        "category": "public_page",
        "label": "About",
        "pipeline": "D1 sections → R2 static/pages/about/*.html → assemble → KV",
        "repo_files": [
            "src/api/about_cms_sync.js",
            "src/api/render_about_section.js",
            "src/api/render_about_fragments.js",
            "src/api/render_page.js",
            "src/api/render_site_nav.js",
            "src/api/page_shell.js",
            "public/_shared.css",
            "public/_shared.js",
            "static/pages/about/hero.html",
            "static/pages/about/why_we_exist.html",
            "static/pages/about/paths.html",
            "static/pages/about/campaigns.html",
            "static/pages/about/cta.html",
        ],
        "r2_keys": ["static/pages/about/index.html", "static/pages/about/*.html"],
        "api": ["/api/cms/publish", "/api/cms/page"],
        "d1": ["cms_page_sections", "cms_page_content_blocks"],
        "kv": ["page:/about"],
    },
    {
        "route": "/services",
        "category": "public_page",
        "label": "Foster (hidden from nav)",
        "pipeline": "Generic fragment CMS via render_section.js",
        "repo_files": [
            "src/api/generic_page_cms_sync.js",
            "src/api/render_generic_fragments.js",
            "src/api/render_section.js",
            "src/api/render_page.js",
            "src/api/page_shell.js",
            "public/_shared.css",
            "public/_shared.js",
            "public/static/js/donate-modal.js",
            "public/static/global/cpas-modals.js",
        ],
        "r2_keys": ["static/pages/services/index.html", "static/pages/services/*.html"],
        "api": ["/api/cms/publish", "/api/foster/apply", "/api/cms/modal/foster_cta"],
        "d1": ["cms_pages", "cms_page_sections", "cpas_foster_applications"],
        "kv": ["page:/services"],
    },
    {
        "route": "/adopt",
        "category": "public_page",
        "label": "Adopt",
        "pipeline": "Generic fragment CMS",
        "repo_files": [
            "src/api/generic_page_cms_sync.js",
            "src/api/render_generic_fragments.js",
            "src/api/render_section.js",
            "src/api/render_page.js",
            "src/api/page_shell.js",
            "public/_shared.css",
            "public/_shared.js",
        ],
        "r2_keys": ["static/pages/adopt/index.html", "static/pages/adopt/*.html"],
        "api": ["/api/cms/publish", "/api/public/animals"],
        "d1": ["cms_page_sections", "animal_profiles", "cms_assets"],
        "kv": ["page:/adopt"],
    },
    {
        "route": "/donate",
        "category": "public_page",
        "label": "Donate",
        "pipeline": "Generic fragment CMS + donate v2 renderer",
        "repo_files": [
            "src/api/generic_page_cms_sync.js",
            "src/api/render_generic_fragments.js",
            "src/api/render_section.js",
            "src/api/render_donate_v2.js",
            "src/api/render_campaign_transport_hero.js",
            "src/api/render_page.js",
            "src/api/page_shell.js",
            "public/_shared.css",
            "public/static/js/donate-modal.js",
        ],
        "r2_keys": ["static/pages/donate/index.html", "static/pages/donate/*.html"],
        "api": [
            "/api/donations/config",
            "/api/donations/checkout",
            "/api/donations/intent",
            "/api/webhooks/stripe",
        ],
        "d1": ["cms_page_sections", "donations", "donation_intents"],
        "kv": ["page:/donate"],
    },
    {
        "route": "/community",
        "category": "public_page",
        "label": "Community",
        "pipeline": "Generic fragment CMS + Facebook embed",
        "repo_files": [
            "src/api/generic_page_cms_sync.js",
            "src/api/render_generic_fragments.js",
            "src/api/render_section.js",
            "src/api/render_page.js",
            "src/api/page_shell.js",
            "src/api/social.js",
            "public/_shared.css",
        ],
        "r2_keys": ["static/pages/community/index.html", "static/pages/community/*.html"],
        "api": ["/api/social/embed/facebook-page"],
        "d1": ["cms_page_sections", "social_embed_settings"],
        "kv": ["page:/community"],
    },
    # ── Auth ──────────────────────────────────────────────────────────────────
    {
        "route": "/admin/login",
        "category": "auth",
        "label": "Admin login",
        "pipeline": "R2 admin/login.html + Worker logo inject",
        "repo_files": [
            "public/admin/login.html",
            "src/api/auth_login.js",
            "src/api/auth_google.js",
            "src/api/session_api.js",
        ],
        "r2_keys": ["admin/login.html"],
        "api": ["/api/auth/login", "/api/auth/google"],
        "d1": ["users", "sessions"],
        "kv": [],
    },
    {
        "route": "/admin/reset-password",
        "category": "auth",
        "label": "Password reset",
        "pipeline": "R2 admin/reset-password.html",
        "repo_files": ["public/admin/reset-password.html", "src/api/password_reset.js"],
        "r2_keys": ["admin/reset-password.html"],
        "api": ["/api/auth/reset-password"],
        "d1": ["password_reset_tokens"],
        "kv": [],
    },
    # ── Dashboard SPA ───────────────────────────────────────────────────────
    {
        "route": "/dashboard/overview",
        "category": "dashboard",
        "label": "Overview",
        "view": "overview",
        "repo_files": [
            "public/dashboard/index.html",
            "public/dashboard/dash.css",
            "public/dashboard/js/app.jsx",
            "public/dashboard/js/ui.jsx",
            "public/dashboard/js/config.js",
            "public/dashboard/js/data.js",
            "public/dashboard/js/view-overview.jsx",
            "src/api/dashboard_api.js",
        ],
        "r2_keys": ["dashboard/index.html", "dashboard/js/*", "dashboard/dash.css"],
        "api": ["/api/dashboard/overview", "/api/dashboard/team", "/api/auth/me"],
        "d1": ["animal_profiles", "cpas_foster_applications", "volunteer_records"],
        "kv": [],
    },
    {
        "route": "/dashboard/animals",
        "category": "dashboard",
        "label": "Animals",
        "view": "animals",
        "repo_files": ["public/dashboard/js/view-animals.jsx", "src/api/dashboard_api.js"],
        "r2_keys": ["dashboard/js/view-animals.jsx"],
        "api": ["/api/dashboard/animals"],
        "d1": ["animal_profiles", "cms_assets"],
        "kv": [],
    },
    {
        "route": "/dashboard/cms/images",
        "category": "dashboard",
        "label": "CMS Images",
        "view": "cms-images",
        "repo_files": [
            "public/dashboard/js/view-cms.jsx",
            "src/api/cms_api.js",
            "src/api/drive_api.js",
        ],
        "r2_keys": ["dashboard/js/view-cms.jsx"],
        "api": [
            "/api/cms/assets",
            "/api/cms/asset/upload",
            "/api/integrations/google-drive/status",
            "/api/integrations/google-drive/files",
            "/api/integrations/google-drive/import",
        ],
        "d1": ["cms_assets", "social_provider_connections"],
        "kv": [],
    },
    {
        "route": "/dashboard/cms/brand",
        "category": "dashboard",
        "label": "Brand & Settings",
        "view": "cms-brand",
        "repo_files": ["public/dashboard/js/view-cms.jsx", "src/api/cms_api.js"],
        "r2_keys": ["dashboard/js/view-cms.jsx"],
        "api": ["/api/cms/brand", "/api/cms/brand/save"],
        "d1": ["cms_brand_settings", "cms_themes", "cms_navigation_items"],
        "kv": ["bootstrap:tenant_companionscpas"],
    },
    {
        "route": "/dashboard/email",
        "category": "dashboard",
        "label": "Email inbox",
        "view": "email",
        "repo_files": [
            "public/dashboard/js/view-email.jsx",
            "src/api/email_api.js",
            "src/api/gmail_api.js",
        ],
        "r2_keys": ["dashboard/js/view-email.jsx"],
        "api": ["/api/email/inbox", "/api/email/send", "/api/email/inbound"],
        "d1": ["inbound_emails", "email_logs", "email_folders"],
        "kv": [],
    },
]

# Worker entry + always-required runtime files.
WORKER_CORE = [
    "src/index.js",
    "wrangler.toml",
    "package.json",
]

WORKER_API_MODULES = [
    "src/api/auth_login.js",
    "src/api/auth_google.js",
    "src/api/session_api.js",
    "src/api/password_reset.js",
    "src/api/dashboard_api.js",
    "src/api/dashboard_config_api.js",
    "src/api/members_api.js",
    "src/api/public_api.js",
    "src/api/contact_api.js",
    "src/api/donation_api.js",
    "src/api/payments_email.js",
    "src/api/social.js",
    "src/api/drive_api.js",
    "src/api/cms_api.js",
    "src/api/email_api.js",
    "src/api/gmail_api.js",
    "src/api/foster_api.js",
    "src/api/agentsam_api.js",
    "src/api/agentsam_tools.js",
    "src/api/resolveModel.js",
    "src/api/page_cms_registry.js",
    "src/api/render_page.js",
    "src/api/render_section.js",
    "src/api/render_home_fragments.js",
    "src/api/render_about_fragments.js",
    "src/api/render_generic_fragments.js",
    "src/api/render_home_section.js",
    "src/api/render_about_section.js",
    "src/api/render_donate_v2.js",
    "src/api/render_campaign_transport_hero.js",
    "src/api/render_site_nav.js",
    "src/api/page_shell.js",
    "src/api/home_cms_sync.js",
    "src/api/about_cms_sync.js",
    "src/api/generic_page_cms_sync.js",
]

VIEW_TO_FILES: dict[str, list[str]] = {
    "overview": ["public/dashboard/js/view-overview.jsx", "src/api/dashboard_api.js"],
    "animals": ["public/dashboard/js/view-animals.jsx", "src/api/dashboard_api.js"],
    "animal-profile": ["public/dashboard/js/view-animals.jsx", "src/api/dashboard_api.js"],
    "fosters": ["public/dashboard/js/view-animals.jsx", "src/api/dashboard_api.js"],
    "adoptions": ["public/dashboard/js/view-animals.jsx", "src/api/dashboard_api.js"],
    "intakes": ["public/dashboard/js/view-ops.jsx", "src/api/dashboard_api.js"],
    "medical": ["public/dashboard/js/view-ops.jsx", "src/api/dashboard_api.js"],
    "daily-care": ["public/dashboard/js/view-ops.jsx", "src/api/dashboard_api.js"],
    "volunteers": ["public/dashboard/js/view-ops.jsx", "src/api/dashboard_api.js"],
    "applications": ["public/dashboard/js/view-applications.jsx", "src/api/foster_api.js", "src/api/dashboard_api.js"],
    "application-detail": ["public/dashboard/js/view-applications.jsx", "src/api/foster_api.js", "src/api/dashboard_api.js"],
    "donations": ["public/dashboard/js/view-finance.jsx", "src/api/dashboard_api.js", "src/api/payments_email.js"],
    "fundraising": ["public/dashboard/js/view-finance.jsx", "src/api/dashboard_api.js"],
    "campaign-detail": ["public/dashboard/js/view-campaign.jsx", "src/api/dashboard_api.js"],
    "cms-website": ["public/dashboard/js/view-cms.jsx", "src/api/cms_api.js"],
    "cms-pages": ["public/dashboard/js/view-cms.jsx", "src/api/cms_api.js"],
    "cms-page-editor": ["public/dashboard/js/view-cms.jsx", "src/api/cms_api.js"],
    "cms-images": ["public/dashboard/js/view-cms.jsx", "src/api/cms_api.js", "src/api/drive_api.js"],
    "cms-brand": ["public/dashboard/js/view-cms.jsx", "src/api/cms_api.js"],
    "cms-templates": ["public/dashboard/js/view-cms.jsx", "src/api/cms_api.js"],
    "email": ["public/dashboard/js/view-email.jsx", "src/api/email_api.js", "src/api/gmail_api.js"],
    "reports": ["public/dashboard/js/view-reports.jsx", "src/api/dashboard_api.js", "src/api/agentsam_api.js"],
    "settings": ["public/dashboard/js/view-admin.jsx", "src/api/dashboard_api.js", "src/api/members_api.js"],
    "notifications": ["public/dashboard/js/view-admin.jsx", "src/api/dashboard_api.js"],
}

DASHBOARD_SHELL_COMMON = [
    "public/dashboard/index.html",
    "public/dashboard/dash.css",
    "public/dashboard/js/app.jsx",
    "public/dashboard/js/ui.jsx",
    "public/dashboard/js/config.js",
    "public/dashboard/js/data.js",
    "public/dashboard/js/agentsam.jsx",
    "src/api/session_api.js",
]

DASHBOARD_SHELL = [
    "public/dashboard/index.html",
    "public/dashboard/dash.css",
    "public/dashboard/js/app.jsx",
    "public/dashboard/js/ui.jsx",
    "public/dashboard/js/config.js",
    "public/dashboard/js/data.js",
    "public/dashboard/js/agentsam.jsx",
    "public/dashboard/js/view-overview.jsx",
    "public/dashboard/js/view-animals.jsx",
    "public/dashboard/js/view-applications.jsx",
    "public/dashboard/js/view-ops.jsx",
    "public/dashboard/js/view-finance.jsx",
    "public/dashboard/js/view-campaign.jsx",
    "public/dashboard/js/view-admin.jsx",
    "public/dashboard/js/view-cms.jsx",
    "public/dashboard/js/view-reports.jsx",
    "public/dashboard/js/view-email.jsx",
]


def parse_route_registry(root: Path) -> list[dict[str, str]]:
    app = root / "public/dashboard/js/app.jsx"
    if not app.exists():
        return []
    text = app.read_text(encoding="utf-8", errors="ignore")
    routes: list[dict[str, str]] = []
    for m in re.finditer(
        r'\{\s*path:\s*"([^"]+)"\s*,\s*view:\s*"([^"]+)"(?:\s*,\s*paramKey:\s*"[^"]+")?\s*\}',
        text,
    ):
        path, view = m.group(1), m.group(2)
        if "paramKey" in m.group(0):
            continue
        path = path.rstrip("/") or path
        routes.append({"path": path, "view": view})
    return routes


def expand_dashboard_urls(root: Path, base_registry: list[dict[str, Any]]) -> list[dict[str, Any]]:
    existing_routes = {e["route"] for e in base_registry}
    out = list(base_registry)

    for r in parse_route_registry(root):
        route = r["path"]
        if route in existing_routes:
            continue
        view = r["view"]
        repo_files = list(DASHBOARD_SHELL_COMMON)
        repo_files.extend(VIEW_TO_FILES.get(view, []))
        out.append(
            {
                "route": route,
                "category": "dashboard",
                "label": view.replace("-", " ").title(),
                "view": view,
                "pipeline": "Dashboard SPA → app.jsx ROUTE_REGISTRY → view component",
                "repo_files": sorted(set(repo_files)),
                "r2_keys": ["dashboard/index.html", "dashboard/js/*"],
                "api": ["/api/auth/me", "/api/dashboard/config"],
                "d1": [],
                "kv": [],
            }
        )
        existing_routes.add(route)

    return sorted(out, key=lambda x: (x.get("category", ""), x["route"]))


# Explicit legacy / duplicate candidates (not imported by Worker or dashboard shell).
LEGACY_CANDIDATES: list[tuple[str, str]] = [
    ("src/api/render_home.js", "Superseded by render_home_fragments.js + page_shell.js; not imported by index.js"),
    ("src/api/_shell.js", "Superseded by page_shell.js + render_site_nav.js; not imported by index.js"),
    ("src/api/cms_api_additions.js", "Duplicate CMS routes; cms_api.js is the active module"),
    ("src/api/render_page.js.bak", "Backup file"),
    ("src/api/render_section.js.bak", "Backup file"),
    ("src/api/_shell.js.bak", "Backup file"),
    ("public/dashboard/js/view-animals-notes.jsx", "Not loaded in dashboard/index.html"),
    ("public/about.html", "Legacy monolithic page; live site uses fragment CMS"),
    ("public/adopt.html", "Legacy monolithic page"),
    ("public/donate.html", "Legacy monolithic page"),
    ("public/services.html", "Legacy monolithic page"),
    ("public/index.html", "Legacy; home is Worker-rendered from R2 fragments"),
    ("public/dashboard.html", "Legacy; replaced by dashboard/index.html"),
    ("public/cpas-header.html", "Legacy shell partial; use static/global or D1-driven nav"),
    ("public/cpas-footer.html", "Legacy shell partial"),
    ("public/_header.html", "Legacy partial"),
    ("public/_footer.html", "Legacy partial"),
    ("public/cpas-shell.js", "Legacy; live uses static/global/cpas-modals.js + shared.js"),
    ("public/cpas-shell.css", "Legacy shell CSS"),
    ("public/shared.js", "Duplicate of public/_shared.js"),
    ("public/admin/dashboard.html", "Legacy admin shell"),
    ("public/admin/index.html", "Legacy redirect stub"),
    ("scripts/filetree.py", "Old inspector pointed at companionscpas-platform clone"),
    ("scripts/companionscpas_audit_report.json", "Generated audit artifact"),
]

KEEP_DOCS = {
    "README.md",
    "ARCHITECTURE.md",
    "DEPLOY.md",
    "docs/current-file-map.md",
    "docs/live-url-sitemap.md",
    "docs/ops/companionscpas_change_contract.md",
    "docs/sam-todo-2026-06-19-client-handoff.md",
    "docs/homepage-readme.md",
    "docs/about-readme.md",
    "docs/donate-readme.md",
    "docs/community-page-spec.md",
}


def repo_root() -> Path:
    here = Path(__file__).resolve().parent
    return here.parent


def rel(path: Path, root: Path) -> str:
    try:
        return str(path.relative_to(root)).replace("\\", "/")
    except ValueError:
        return str(path).replace("\\", "/")


def file_size(path: Path) -> int:
    try:
        return path.stat().st_size
    except OSError:
        return 0


def walk_repo(root: Path) -> list[str]:
    files: list[str] = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = sorted(d for d in dirnames if d not in SKIP_DIRS and not d.startswith("."))
        for name in sorted(filenames):
            if name.startswith("."):
                continue
            p = Path(dirpath) / name
            files.append(rel(p, root))
    return files


def parse_dashboard_scripts(root: Path) -> list[str]:
    index = root / "public/dashboard/index.html"
    if not index.exists():
        return []
    text = index.read_text(encoding="utf-8", errors="ignore")
    hits = re.findall(r'src="(/dashboard/[^"?]+)', text)
    return [h.lstrip("/") for h in hits]


def trace_worker_imports(root: Path) -> set[str]:
    """BFS import graph from src/index.js (relative ./api/*.js only)."""
    seen: set[str] = set()
    queue = ["src/index.js"]
    api_dir = root / "src/api"

    while queue:
        current = queue.pop(0)
        if current in seen:
            continue
        seen.add(current)
        path = root / current
        if not path.exists():
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        for m in re.finditer(r"""from\s+['"](\./[^'"]+)['"]""", text):
            imp = m.group(1)
            if imp.startswith("./"):
                resolved = (path.parent / imp).resolve()
                if resolved.suffix == ".js" or resolved.with_suffix(".js").exists():
                    if not resolved.suffix:
                        resolved = resolved.with_suffix(".js")
                    if resolved.is_relative_to(root):
                        queue.append(rel(resolved, root))
        for m in re.finditer(r"""from\s+['"]\./api/([^'"]+)['"]""", text):
            candidate = f"src/api/{m.group(1)}"
            if not candidate.endswith(".js"):
                candidate += ".js"
            queue.append(candidate)
    return seen


def classify_script(path: str) -> str:
    if path in OPS_SCRIPTS:
        return "script_ops"
    name = Path(path).name
    if path.startswith("scripts/audits/"):
        return "script_audit"
    if any(name.startswith(p) for p in LEGACY_SCRIPT_PREFIXES):
        return "script_legacy"
    if path.startswith("scripts/"):
        return "script_misc"
    return "other"


def build_live_urls(root: Path) -> list[dict[str, Any]]:
    registry = expand_dashboard_urls(root, URL_REGISTRY)
    urls: list[dict[str, Any]] = []
    for entry in registry:
        route = entry["route"]
        urls.append(
            {
                "url": f"{BASE_URL}{route}" if route != "/" else f"{BASE_URL}/",
                "route": route,
                "category": entry.get("category"),
                "label": entry.get("label"),
                "view": entry.get("view"),
                "pipeline": entry.get("pipeline"),
                "repo_files": sorted(set(entry.get("repo_files", []))),
                "r2_keys": entry.get("r2_keys", []),
                "api": entry.get("api", []),
                "d1_tables": entry.get("d1", []),
                "kv_keys": entry.get("kv", []),
            }
        )
    return urls


def collect_required_files(root: Path) -> set[str]:
    required: set[str] = set(WORKER_CORE + WORKER_API_MODULES + DASHBOARD_SHELL)
    required |= trace_worker_imports(root)
    required |= set(parse_dashboard_scripts(root))

    registry = expand_dashboard_urls(root, URL_REGISTRY)
    for entry in registry:
        required.update(entry.get("repo_files", []))

    # R2 source mappings
    required.update(
        {
            "public/_shared.css",
            "public/_shared.js",
            "public/static/js/donate-modal.js",
            "public/static/global/cpas-modals.js",
            "public/admin/login.html",
            "public/admin/reset-password.html",
        }
    )

    # static/ tree is publish source for fragments
    for p in walk_repo(root):
        if p.startswith("static/"):
            required.add(p)
        if p.startswith("db/migrations/"):
            required.add(p)

    return {p for p in required if (root / p).exists()}


def build_cleanup(root: Path, all_files: list[str], required: set[str]) -> dict[str, list[dict[str, Any]]]:
    safe: list[dict[str, Any]] = []
    review: list[dict[str, Any]] = []

    for path, reason in LEGACY_CANDIDATES:
        fp = root / path
        if fp.exists():
            safe.append({"path": path, "reason": reason, "bytes": file_size(fp), "tier": "safe"})

    for path in all_files:
        fp = root / path

        if path.endswith(".bak"):
            safe.append(
                {
                    "path": path,
                    "reason": "Backup file (*.bak)",
                    "bytes": file_size(fp),
                    "tier": "safe",
                }
            )
            continue

        if path.startswith("audits/"):
            review.append(
                {
                    "path": path,
                    "reason": "Historical audit output — archive outside repo if no longer needed",
                    "bytes": file_size(fp),
                    "tier": "review",
                }
            )
            continue

        if classify_script(path) == "script_legacy":
            review.append(
                {
                    "path": path,
                    "reason": "One-off migration/repair script — not used at runtime",
                    "bytes": file_size(fp),
                    "tier": "review",
                }
            )
            continue

        if path.startswith("db/seed") or path.startswith("db/schema") or path == "db/seed.sql":
            if path not in required:
                review.append(
                    {
                        "path": path,
                        "reason": "DB seed/schema reference — keep until migrations are fully documented",
                        "bytes": file_size(fp),
                        "tier": "review",
                    }
                )
            continue

        if path.startswith("public/static/") and path not in required:
            # public/static often mirrors static/ — check overlap
            alt = path.replace("public/static/", "static/", 1)
            if (root / alt).exists():
                review.append(
                    {
                        "path": path,
                        "reason": f"Possible duplicate of {alt} — verify R2 upload path before deleting",
                        "bytes": file_size(fp),
                        "tier": "review",
                    }
                )

    # De-dupe by path
    def dedupe(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
        seen_paths: set[str] = set()
        out: list[dict[str, Any]] = []
        for item in sorted(items, key=lambda x: x["path"]):
            if item["path"] in seen_paths:
                continue
            seen_paths.add(item["path"])
            out.append(item)
        return out

    return {
        "safe_to_delete": dedupe(safe),
        "review_before_delete": dedupe(review),
    }


def build_file_index(root: Path, all_files: list[str], required: set[str]) -> dict[str, dict[str, Any]]:
    index: dict[str, dict[str, Any]] = {}
    worker_graph = trace_worker_imports(root)

    for path in all_files:
        fp = root / path
        category = "other"
        if path in required:
            category = "live_required"
        elif path.endswith(".bak"):
            category = "backup"
        elif path.startswith("audits/"):
            category = "audit"
        elif path.startswith("docs/") or path in KEEP_DOCS:
            category = "doc"
        elif path.startswith("db/migrations/"):
            category = "migration"
        elif path.startswith("db/"):
            category = "db_reference"
        elif path.startswith("scripts/"):
            category = classify_script(path)
        elif path in {r for r, _ in LEGACY_CANDIDATES}:
            category = "legacy_orphan"

        r2_key = None
        if path.startswith("public/"):
            r2_key = path[len("public/") :]
        elif path == "public/_shared.css":
            r2_key = "static/global/shared.css"
        elif path == "public/_shared.js":
            r2_key = "static/global/shared.js"

        index[path] = {
            "bytes": file_size(fp),
            "category": category,
            "in_worker_graph": path in worker_graph,
            "r2_key": r2_key,
        }
    return index


def human_summary(data: dict[str, Any]) -> str:
    lines: list[str] = []
    m = data["meta"]
    lines.append(f"Companions of CPAS — Live URL File Map")
    lines.append(f"Generated: {m['generated_at']}")
    lines.append(f"Repo: {m['repo']}")
    lines.append(f"Domain: {m['domain']}")
    lines.append("")
    lines.append(f"Files: {m['total_files']} total | {m['live_required']} live-required | "
                 f"{m['safe_delete_count']} safe-delete | {m['review_delete_count']} review")
    lines.append("")
    lines.append("── LIVE URLS (route → repo files) ──")
    for u in data["live_urls"]:
        lines.append(f"\n{u['url']}  [{u.get('label', '')}]")
        if u.get("pipeline"):
            lines.append(f"  pipeline: {u['pipeline']}")
        lines.append(f"  repo ({len(u['repo_files'])}):")
        for f in u["repo_files"][:12]:
            lines.append(f"    • {f}")
        if len(u["repo_files"]) > 12:
            lines.append(f"    … +{len(u['repo_files']) - 12} more")
        if u.get("api"):
            lines.append(f"  api: {', '.join(u['api'][:6])}" + (" …" if len(u["api"]) > 6 else ""))

    lines.append("\n── WORKER RUNTIME (always deployed) ──")
    lines.append(f"  entry: src/index.js")
    lines.append(f"  api modules: {len(data['worker']['api_modules'])}")
    lines.append(f"  dashboard shell scripts: {len(data['dashboard']['shell_scripts'])}")

    lines.append("\n── SAFE TO DELETE ──")
    for item in data["cleanup"]["safe_to_delete"][:25]:
        kb = item["bytes"] / 1024
        lines.append(f"  {item['path']}  ({kb:.1f} KB) — {item['reason']}")
    if len(data["cleanup"]["safe_to_delete"]) > 25:
        lines.append(f"  … +{len(data['cleanup']['safe_to_delete']) - 25} more (see JSON)")

    lines.append("\n── REVIEW BEFORE DELETE ──")
    for item in data["cleanup"]["review_before_delete"][:15]:
        kb = item["bytes"] / 1024
        lines.append(f"  {item['path']}  ({kb:.1f} KB) — {item['reason']}")
    if len(data["cleanup"]["review_before_delete"]) > 15:
        lines.append(f"  … +{len(data['cleanup']['review_before_delete']) - 15} more (see JSON)")

    lines.append("\n── JQ CHEATSHEET ──")
    lines.append("  jq '.live_urls[] | {url, repo_files}' map.json")
    lines.append("  jq '.cleanup.safe_to_delete[].path' map.json")
    lines.append("  jq '[.cleanup.safe_to_delete[].bytes] | add' map.json  # bytes reclaimable")
    return "\n".join(lines)


def build_report(root: Path) -> dict[str, Any]:
    all_files = walk_repo(root)
    required = collect_required_files(root)
    cleanup = build_cleanup(root, all_files, required)
    live_urls = build_live_urls(root)
    file_index = build_file_index(root, all_files, required)
    worker_graph = sorted(trace_worker_imports(root))
    dash_scripts = parse_dashboard_scripts(root)

    safe_bytes = sum(i["bytes"] for i in cleanup["safe_to_delete"])
    review_bytes = sum(i["bytes"] for i in cleanup["review_before_delete"])

    return {
        "meta": {
            "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "repo": str(root),
            "domain": DOMAIN,
            "base_url": BASE_URL,
            "assets_url": ASSETS_URL,
            "r2_bucket": "companionscpas",
            "d1_database": "companionscpas",
            "kv_namespace": "CMS_CACHE",
            "total_files": len(all_files),
            "live_required": len(required),
            "safe_delete_count": len(cleanup["safe_to_delete"]),
            "review_delete_count": len(cleanup["review_before_delete"]),
            "safe_delete_bytes": safe_bytes,
            "review_delete_bytes": review_bytes,
        },
        "live_urls": live_urls,
        "worker": {
            "entry": "src/index.js",
            "config": "wrangler.toml",
            "import_graph": worker_graph,
            "api_modules": WORKER_API_MODULES,
        },
        "dashboard": {
            "shell": "public/dashboard/index.html",
            "shell_scripts": dash_scripts,
            "route_registry_source": "public/dashboard/js/app.jsx (ROUTE_REGISTRY)",
        },
        "r2_publish_map": {
            "public/dashboard/*": "dashboard/*",
            "public/admin/*": "admin/*",
            "public/_shared.css": "static/global/shared.css",
            "public/_shared.js": "static/global/shared.js",
            "public/static/js/donate-modal.js": "static/js/donate-modal.js",
            "public/static/global/cpas-modals.js": "static/global/cpas-modals.js",
            "static/**": "static/** (fragments + global assets)",
        },
        "files": file_index,
        "cleanup": cleanup,
        "docs_keep": sorted(KEEP_DOCS),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Live URL → file map + cleanup audit")
    parser.add_argument("--json", action="store_true", help="Output JSON only (jq-friendly)")
    parser.add_argument("-o", "--output", help="Write JSON to file")
    parser.add_argument("--root", help="Repo root (default: parent of scripts/)")
    args = parser.parse_args()

    root = Path(args.root).resolve() if args.root else repo_root()
    if not (root / "src/index.js").exists():
        print(f"error: not a companionscpas repo: {root}", file=sys.stderr)
        return 1

    report = build_report(root)

    if args.output:
        out_path = Path(args.output)
        out_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
        if not args.json:
            print(human_summary(report))
            print(f"\nJSON written: {out_path}")
    elif args.json:
        json.dump(report, sys.stdout, indent=2)
        sys.stdout.write("\n")
    else:
        print(human_summary(report))
        print("\nTip: --json -o docs/live-url-file-map.json for machine-readable output")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
