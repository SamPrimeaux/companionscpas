#!/usr/bin/env python3
"""
cms_pass1_inspect.py  —  CompanionsCPAs Platform Audit
Zero API cost. Reads source files, emits a cache-optimized prompt context block.

Usage:
    python3 cms_pass1_inspect.py [repo_root]
    python3 cms_pass1_inspect.py ~/Downloads/companionscpas-platform

Output:
    cms_pass1_report.md   (written next to this script)
    Also printed to stdout.

Prompt cache strategy
---------------------
Section A  — stable inventory (file list, tool registry, model config, D1 tables)
             → becomes the CACHED prefix in every pass 2-5 prompt
Section B  — dynamic findings (gaps, insertion points, handler blocks)
             → appended after the cache boundary; changes per-pass
"""

import re
import sys
import json
from pathlib import Path
from datetime import datetime

# ── repo layout ───────────────────────────────────────────────────────────────

REPO_ROOT = Path(sys.argv[1]).expanduser() if len(sys.argv) > 1 else Path("~/Downloads/companionscpas-platform").expanduser()

SRC = REPO_ROOT / "src"
API = SRC / "api"
PUBLIC = REPO_ROOT / "public"

KEY_FILES = {
    "index":           SRC  / "index.js",
    "agentsam_api":    API  / "agentsam_api.js",
    "agentsam_tools":  API  / "agentsam_tools.js",
    "resolveModel":    API  / "resolveModel.js",
    "cms_api":         API  / "cms_api.js",
    "render_home":     API  / "render_home.js",
    "render_section":  API  / "render_section.js",
    "render_page":     API  / "render_page.js",
    "render_global":   API  / "render_global.js",
    "_shell":          API  / "_shell.js",
    "wrangler":        REPO_ROOT / "wrangler.toml",
    "wrangler_jsonc":  REPO_ROOT / "wrangler.jsonc",
    "package_json":    REPO_ROOT / "package.json",
}

OUTPUT_FILE = Path(__file__).parent / "cms_pass1_report.md"

# ── helpers ───────────────────────────────────────────────────────────────────

def read(path: Path) -> str:
    if not path.exists():
        return f"[MISSING: {path.name}]"
    try:
        return path.read_text(encoding="utf-8", errors="replace")
    except Exception as e:
        return f"[READ ERROR: {e}]"

def ln(src: str) -> list[str]:
    return src.splitlines()

def is_missing(src: str) -> bool:
    return src.startswith("[MISSING") or src.startswith("[READ ERROR")

def extract_block(src: str, pattern: str, max_lines: int = 80) -> str:
    """Extract a brace-balanced block starting at the first line matching pattern."""
    src_lines = ln(src)
    re_pat = re.compile(pattern, re.IGNORECASE)
    result, capturing, depth, count = [], False, 0, 0
    for i, line in enumerate(src_lines, 1):
        if not capturing and re_pat.search(line):
            capturing = True
        if capturing:
            result.append(f"{i:5d}  {line}")
            depth += line.count("{") - line.count("}")
            count += 1
            if count > 3 and depth <= 0:
                break
            if count >= max_lines:
                result.append("       ... (truncated)")
                break
    return "\n".join(result) if result else "(not found)"

def grep_n(src: str, pattern: str, flags=re.IGNORECASE) -> list[tuple[int, str]]:
    """Return [(line_no, line)] for all matching lines."""
    return [
        (i + 1, line)
        for i, line in enumerate(ln(src))
        if re.search(pattern, line, flags)
    ]

def find_exports(src: str) -> list[str]:
    return re.findall(r'export\s+(?:async\s+)?(?:function|const|class)\s+(\w+)', src)

def find_imports(src: str) -> list[str]:
    return re.findall(r'^import\s+.+$', src, re.MULTILINE)

def find_routes(src: str) -> list[tuple[str, int, str]]:
    """Return (method, line_no, route_string) for all route definitions."""
    results = []
    route_re = re.compile(
        r"""(?:pathname|url\.pathname|path)\s*(?:===|\.startsWith\(|\.includes\()\s*['"`]([^'"`]+)['"`]""",
        re.IGNORECASE
    )
    method_re = re.compile(r'\b(GET|POST|PUT|DELETE|PATCH)\b', re.IGNORECASE)
    for i, line in enumerate(ln(src), 1):
        for m in route_re.finditer(line):
            method_m = method_re.search(line)
            method = method_m.group(1).upper() if method_m else "ANY"
            results.append((method, i, m.group(1)))
    seen, deduped = set(), []
    for item in results:
        key = item[2]
        if key not in seen:
            seen.add(key)
            deduped.append(item)
    return deduped

def find_tool_keys(src: str) -> list[str]:
    """Extract tool_key string values from agentsam_tools.js."""
    return re.findall(r"tool_key\s*[=:]\s*['\"]([^'\"]+)['\"]", src)

def find_agent_tools_array(src: str) -> list[str]:
    """Extract AGENT_TOOLS entries (name fields)."""
    return re.findall(r"""name\s*:\s*['"]([^'"]+)['"]""", src)

def find_models(src: str) -> dict[str, str]:
    """Extract MODELS object entries from resolveModel.js."""
    matches = re.findall(r"""['"](\w[\w_-]+)['"]\s*:\s*['"]([^'"]+)['"]""", src)
    return dict(matches)

def find_kv_r2_bindings(src: str) -> dict[str, set]:
    bindings: dict[str, set] = {"kv": set(), "r2": set(), "db": set()}
    for b, op in re.findall(r'env\.(\w+)\.(get|put|delete|list)\(', src):
        op_lower = op.lower()
        if "DB" in b or "db" in b.lower():
            bindings["db"].add(b)
        elif op_lower in ("put",):
            bindings["r2"].add(b)
        else:
            bindings["kv"].add(b)
    # also catch env.DB.prepare
    for b in re.findall(r'env\.(\w+)\.prepare\(', src):
        bindings["db"].add(b)
    return bindings

def find_wrangler_bindings(src: str) -> dict[str, list[str]]:
    """Parse wrangler.toml/jsonc for kv_namespaces, r2_buckets, d1_databases."""
    result = {"kv": [], "r2": [], "d1": [], "vars": []}
    result["kv"]   = re.findall(r'binding\s*=\s*"(\w+)"(?=[^}]*kv_namespaces)', src, re.DOTALL) or \
                     re.findall(r'"binding"\s*:\s*"(\w+)"', src)
    result["kv"]   = re.findall(r'(?:kv_namespaces[^]]*binding\s*=\s*"(\w+)")', src)
    result["r2"]   = re.findall(r'(?:r2_buckets[^]]*binding\s*=\s*"(\w+)")', src)
    result["d1"]   = re.findall(r'(?:d1_databases[^]]*binding\s*=\s*"(\w+)")', src)
    # fallback: just grab all binding= values
    all_bindings   = re.findall(r'\bbinding\s*[=:]\s*["\'](\w+)["\']', src)
    if not any(result.values()):
        result["all"] = all_bindings
    return result

def summarise_publish_pipeline(tools_src: str, cms_src: str) -> dict:
    """Check which publish pipeline pieces exist."""
    checks = {
        "cms_create_publish_job tool":    bool(re.search(r'cms_create_publish_job', tools_src)),
        "cms_kv_prime tool":              bool(re.search(r'cms_kv_prime', tools_src)),
        "cms_kv_bust tool":               bool(re.search(r'cms_kv_bust', tools_src)),
        "cms_diff_sections tool":         bool(re.search(r'cms_diff_sections', tools_src)),
        "cms_write_revision tool":        bool(re.search(r'cms_write_revision', tools_src)),
        "/api/cms/publish route":         bool(re.search(r"['\"/]api/cms/publish['\"]", cms_src or "")),
        "render_section.js exists":       not is_missing(read(API / "render_section.js")),
        "render_page.js exists":          not is_missing(read(API / "render_page.js")),
        "render_global.js exists":        not is_missing(read(API / "render_global.js")),
        "cms_publish_jobs D1 table ref":  bool(re.search(r'cms_publish_jobs', tools_src + (cms_src or ""))),
        "cms_publish_artifacts D1 ref":   bool(re.search(r'cms_publish_artifacts', tools_src + (cms_src or ""))),
    }
    return checks

def find_insertion_candidates(src: str, label: str) -> list[str]:
    patterns = [
        re.compile(r"hardcoded|fallback|static[\s_]page", re.IGNORECASE),
        re.compile(r"return\s+new\s+Response.*text/html", re.IGNORECASE),
        re.compile(r"render_home|renderHome", re.IGNORECASE),
        re.compile(r"CMS_CACHE|KV_CACHE|kv.*get\(.*page:", re.IGNORECASE),
        re.compile(r"404|not\s*found", re.IGNORECASE),
        re.compile(r"/about|/adopt|/services|/donate", re.IGNORECASE),
    ]
    candidates, seen = [], set()
    for i, line in enumerate(ln(src)):
        for p in patterns:
            if p.search(line):
                start = max(0, i - 2)
                end   = min(len(ln(src)), i + 5)
                snippet = "\n".join(f"{j+1:5d}  {ln(src)[j]}" for j in range(start, end))
                key = ln(src)[i]
                if key not in seen:
                    seen.add(key)
                    candidates.append(snippet)
                break
    return candidates[:8]

# ── report builder ────────────────────────────────────────────────────────────

def build_report() -> str:
    srcs  = {k: read(v) for k, v in KEY_FILES.items()}
    sizes = {k: len(ln(v)) for k, v in srcs.items() if not is_missing(v)}

    S = []

    # ═══════════════════════════════════════════════════════════════════
    # SECTION A — STABLE INVENTORY  (cache this prefix in every pass)
    # ═══════════════════════════════════════════════════════════════════

    S.append(f"""# CompanionsCPAs Platform — Pass 1 Inspection Report
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}
Repo: `{REPO_ROOT}`

---
# ╔══ SECTION A — STABLE INVENTORY (prompt cache prefix) ══╗
# Cache this entire section. It does not change between passes.
""")

    # A1: file inventory
    file_rows = "\n".join(
        f"| `{v.name}` | {'✅ ' + str(sizes.get(k,'?')) + ' lines' if not is_missing(srcs[k]) else '❌ MISSING'} |"
        for k, v in KEY_FILES.items()
    )
    S.append(f"""## A1. File Inventory

| File | Status |
|------|--------|
{file_rows}
""")

    # A2: wrangler bindings
    wrangler_src = srcs["wrangler"] if not is_missing(srcs["wrangler"]) else srcs["wrangler_jsonc"]
    bindings = find_wrangler_bindings(wrangler_src)
    S.append(f"""## A2. Wrangler Bindings

```
KV:  {bindings.get('kv') or bindings.get('all', ['(parse manually)'])}
R2:  {bindings.get('r2', [])}
D1:  {bindings.get('d1', [])}
```
""")

    # A3: AGENT_TOOLS registry
    tool_names  = find_agent_tools_array(srcs["agentsam_tools"])
    tool_keys   = find_tool_keys(srcs["agentsam_tools"])
    S.append(f"""## A3. Registered AGENT_TOOLS ({len(tool_names)} total)

```
{chr(10).join('- ' + t for t in sorted(set(tool_names)))}
```

### Tool keys found in agentsam_tools.js
```
{chr(10).join('- ' + t for t in sorted(set(tool_keys)))}
```
""")

    # A4: model config from resolveModel.js
    models = find_models(srcs["resolveModel"]) if not is_missing(srcs["resolveModel"]) else {}
    S.append(f"""## A4. Model Config (`resolveModel.js`)

Exports: {', '.join(f'`{e}`' for e in find_exports(srcs["resolveModel"])) if not is_missing(srcs["resolveModel"]) else '(file missing)'}

MODELS entries:
```json
{json.dumps(dict(list(models.items())[:20]), indent=2)}
```
""")

    # A5: shell/render_home exports
    shell_exports = find_exports(srcs["_shell"]) if not is_missing(srcs["_shell"]) else []
    rh_exports    = find_exports(srcs["render_home"]) if not is_missing(srcs["render_home"]) else []
    rh_kv_r2      = find_kv_r2_bindings(srcs["render_home"]) if not is_missing(srcs["render_home"]) else {}
    S.append(f"""## A5. Reusable Helpers

### `_shell.js` exports
{', '.join(f'`{e}`' for e in shell_exports) or '(missing or none)'}

### `render_home.js` exports
{', '.join(f'`{e}`' for e in rh_exports) or '(missing or none)'}

### `render_home.js` KV/R2 access pattern
KV bindings: {sorted(rh_kv_r2.get('kv', []))}
R2 bindings: {sorted(rh_kv_r2.get('r2', []))}
DB bindings: {sorted(rh_kv_r2.get('db', []))}
""")

    # A6: agentsam_api imports + top-level structure
    S.append(f"""## A6. `agentsam_api.js` — Imports & Tool Loop Shape

### Imports
{chr(10).join('- ' + i for i in find_imports(srcs["agentsam_api"])) if not is_missing(srcs["agentsam_api"]) else '(missing)'}

### Tool loop entry points (grep)
""" + "\n".join(
        f"  line {i:4d}: {l.strip()}"
        for i, l in grep_n(srcs["agentsam_api"], r"executeTool|toolCalls|tool_key|AGENT_TOOLS")[:20]
    ))

    # ═══════════════════════════════════════════════════════════════════
    # SECTION B — DYNAMIC FINDINGS  (do NOT cache; varies per pass)
    # ═══════════════════════════════════════════════════════════════════

    S.append(f"""

---
# ╔══ SECTION B — DYNAMIC FINDINGS (append after cache boundary) ══╗
# Do NOT cache this section. Regenerate for each pass.
""")

    # B1: publish pipeline gap analysis
    cms_src   = srcs["cms_api"] if not is_missing(srcs["cms_api"]) else ""
    pipeline  = summarise_publish_pipeline(srcs["agentsam_tools"], cms_src)
    gap_rows  = "\n".join(
        f"| {'✅' if v else '❌ MISSING'} | `{k}` |"
        for k, v in pipeline.items()
    )
    gaps      = [k for k, v in pipeline.items() if not v]
    S.append(f"""## B1. Publish Pipeline Gap Analysis

| Status | Component |
|--------|-----------|
{gap_rows}

### ❌ Missing ({len(gaps)} items — these are what passes 2-5 must create/wire):
{chr(10).join('- ' + g for g in gaps) if gaps else '- none, all present'}
""")

    # B2: /api/cms/publish handler
    publish_block = extract_block(cms_src, r"['\"/]api/cms/publish['\"]", max_lines=80) if cms_src else "(cms_api.js missing)"
    S.append(f"""## B2. Current `/api/cms/publish` Handler

```js
{publish_block}
```
""")

    # B3: public routes in index.js
    index_routes = find_routes(srcs["index"]) if not is_missing(srcs["index"]) else []
    public_routes = [(m, ln, r) for m, ln, r in index_routes if not r.startswith("/api")]
    api_routes    = [(m, ln, r) for m, ln, r in index_routes if r.startswith("/api")]
    S.append(f"""## B3. Route Map from `src/index.js`

### Public routes (KV/R2 serving goes here — Pass 5 target)
""" + "\n".join(f"  {m:6s} line {ln:4d}  {r}" for m, ln, r in public_routes) + f"""

### API routes
""" + "\n".join(f"  {m:6s} line {ln:4d}  {r}" for m, ln, r in api_routes[:30]))

    # B4: safe insertion points
    candidates = find_insertion_candidates(srcs["index"], "index") if not is_missing(srcs["index"]) else []
    cand_blocks = "\n\n".join(
        f"**Candidate {i+1}** (Pass 5 insertion point)\n```js\n{c}\n```"
        for i, c in enumerate(candidates)
    )
    S.append(f"""

## B4. Safe Insertion Points in `src/index.js` (for Pass 5)

{cand_blocks or '(none detected — check manually)'}
""")

    # B5: cms_api.js existing routes
    if not is_missing(srcs["cms_api"]):
        cms_routes = find_routes(srcs["cms_api"])
        S.append(f"""## B5. Existing CMS API Routes (`cms_api.js`)

""" + "\n".join(f"  {m:6s} line {ln:4d}  {r}" for m, ln, r in cms_routes))

    # ═══════════════════════════════════════════════════════════════════
    # SECTION C — PASTE-READY CONTEXT BLOCKS
    # ═══════════════════════════════════════════════════════════════════

    S.append(f"""

---
# ╔══ SECTION C — PASTE-READY CONTEXT BLOCKS ══╗

## C1. Cached System Prefix (paste once, cache hit on passes 2-5)

Paste this as the SYSTEM message or first USER block. It is stable across all passes.

```
COMPANIONSCPAS PLATFORM CONTEXT
================================
Repo: companionscpas-platform (Cloudflare Workers + D1 + KV + R2)
Tenant: tenant_companionscpas

Reusable helpers
  _shell.js:       {', '.join(shell_exports) or 'see file'}
  render_home.js:  {', '.join(rh_exports) or 'see file'}

KV bindings in use: {sorted(rh_kv_r2.get('kv', set()))}
R2 bindings in use: {sorted(rh_kv_r2.get('r2', set()))}
DB binding:         env.DB

AGENT_TOOLS count: {len(set(tool_names))}
Publish tools present: cms_create_publish_job={pipeline.get('cms_create_publish_job tool')}, cms_kv_prime={pipeline.get('cms_kv_prime tool')}, cms_kv_bust={pipeline.get('cms_kv_bust tool')}

Non-negotiables:
- No inline CSS or JS in section HTML
- Escape all user-provided text
- Reuse getBrand / _shell helpers, do not reinvent
- cms_publish_jobs: status running → done/failed
- Do not remove hardcoded page fallbacks
- Do not touch agentsam_api.js tool loop
- Surgical edits only to cms_api.js and index.js
```

## C2. Per-Pass Task Block (append AFTER system prefix, do NOT cache)

**Pass 2 — Create src/api/render_section.js**
```
TASK: Create src/api/render_section.js
Export: renderSection(section, blocks, brand, env)
Dispatch by: section.section_type
Required renderers: hero, text_image, text_image_split, card_grid, feature_cards,
  testimonial, testimonials, impact_stats, cta_banner, donation_block, org_info, faq
Placeholder only: animal_grid, campaign_grid
Unknown type: return HTML comment, never throw
Missing pieces confirmed: {', '.join(g for g in gaps if 'render_section' in g) or 'none'}
```

**Pass 3 — Create src/api/render_page.js**
```
TASK: Create src/api/render_page.js
Import: renderSection from ./render_section.js
Import: getBrand (or equivalent) from ./_shell.js or ./render_home.js
Export: renderPage(route, jobId, env)
D1 read order:
  1. cms_pages WHERE route_path=? AND tenant_id='tenant_companionscpas'
  2. cms_page_sections WHERE page_id=? AND is_visible=1 ORDER BY sort_order
  3. cms_page_content_blocks WHERE section_id IN (...) ORDER BY section_key, sort_order
R2 write pattern:  static/pages{{route}}/{{section_key}}.html  and  static/pages{{route}}/index.html
KV cache key:      page:{{route}}
Insert cms_publish_artifacts row on success.
Return full HTML string.
Missing pieces confirmed: {', '.join(g for g in gaps if 'render_page' in g) or 'none'}
```

**Pass 4 — Wire cms_api.js publish handler**
```
TASK: Modify src/api/cms_api.js — POST /api/cms/publish only
Current state: {('handler exists, needs renderPage wired in' if not '(not found)' in publish_block else 'handler NOT FOUND — must be created')}
Changes:
  1. Auth-check (existing pattern)
  2. Accept route_path or page_route from JSON body
  3. INSERT cms_publish_jobs status='running'
  4. Call renderPage(route, jobId, env)
  5. On success: UPDATE status='done'
  6. On failure: UPDATE status='failed', error_message=e.message
  7. Return JSON {{success, job_id, route_path}}
Do NOT touch any other route in this file.
```

**Pass 5 — Serve KV/R2 from src/index.js**
```
TASK: Modify src/index.js — add KV/R2 serving for /about /adopt /services /donate
Do NOT replace / (render_home handles it)
For each route:
  1. KV get: env.[KV_BINDING].get('page:' + pathname)  → return text/html if hit
  2. R2 get: env.[R2_BINDING].get('static/pages' + pathname + '/index.html')
             → cache in KV 3600s, return text/html
  3. Fall through to existing hardcoded behavior if both miss
KV binding to use: {list(rh_kv_r2.get('kv', ['CHECK_WRANGLER']))[0] if rh_kv_r2.get('kv') else 'CHECK_WRANGLER_TOML'}
R2 binding to use: {list(rh_kv_r2.get('r2', ['CHECK_WRANGLER']))[0] if rh_kv_r2.get('r2') else 'CHECK_WRANGLER_TOML'}
Insertion point: see Section B4 above
Do not break: dashboard, API routes, assets, auth, donation modal
```
""")

    return "\n".join(S)


# ── entry ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print(f"Auditing: {REPO_ROOT}\n")
    for k, p in KEY_FILES.items():
        print(f"  {'✅' if p.exists() else '❌'} {p.relative_to(REPO_ROOT) if p.exists() else p.name}")

    print()
    report = build_report()
    OUTPUT_FILE.write_text(report, encoding="utf-8")
    print(report)
    print(f"\n✅ Written to: {OUTPUT_FILE}")
