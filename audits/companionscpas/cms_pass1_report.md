# CompanionsCPAs Platform — Pass 1 Inspection Report
Generated: 2026-05-26 22:45
Repo: `.`

---
# ╔══ SECTION A — STABLE INVENTORY (prompt cache prefix) ══╗
# Cache this entire section. It does not change between passes.

## A1. File Inventory

| File | Status |
|------|--------|
| `index.js` | ✅ 153 lines |
| `agentsam_api.js` | ✅ 500 lines |
| `agentsam_tools.js` | ✅ 672 lines |
| `resolveModel.js` | ✅ 323 lines |
| `cms_api.js` | ✅ 404 lines |
| `render_home.js` | ✅ 245 lines |
| `render_section.js` | ❌ MISSING |
| `render_page.js` | ❌ MISSING |
| `render_global.js` | ❌ MISSING |
| `_shell.js` | ✅ 182 lines |
| `wrangler.toml` | ✅ 47 lines |
| `wrangler.jsonc` | ❌ MISSING |
| `package.json` | ✅ 18 lines |

## A2. Wrangler Bindings

```
KV:  ['ASSETS', 'DB', 'AGENTSAM_WAI', 'WEBSITE_ASSETS', 'CMS_CACHE']
R2:  []
D1:  []
```

## A3. Registered AGENT_TOOLS (1 total)

```
- /
```

### Tool keys found in agentsam_tools.js
```

```

## A4. Model Config (`resolveModel.js`)

Exports: `MODELS`, `thompsonRoute`, `recordOutcome`, `syncToIAM`, `callAI`, `callAIJson`, `generateImage`, `classifyIntent`

MODELS entries:
```json
{
  "Content-Type": "application/json",
  "X-Tenant-ID": "tenant_companionscpas"
}
```

## A5. Reusable Helpers

### `_shell.js` exports
`renderHeader`, `renderFooter`, `pageShell`

### `render_home.js` exports
`renderHome`

### `render_home.js` KV/R2 access pattern
KV bindings: ['CMS_CACHE', 'WEBSITE_ASSETS']
R2 bindings: ['CMS_CACHE']
DB bindings: ['DB']

## A6. `agentsam_api.js` — Imports & Tool Loop Shape

### Imports
- import { callAI, thompsonRoute, recordOutcome, syncToIAM, classifyIntent, MODELS } from './resolveModel.js';
- import { AGENT_TOOLS, executeTool, modelSupportsTools, writeToolChain, resolveToolChain } from './agentsam_tools.js';

### Tool loop entry points (grep)
  line    4: import { AGENT_TOOLS, executeTool, modelSupportsTools, writeToolChain, resolveToolChain } from './agentsam_tools.js';
  line  276: tools:     AGENT_TOOLS,
  line  283: const toolCalls = result.toolCalls || [];
  line  285: if (toolCalls.length === 0) {
  line  293: for (const tc of toolCalls) {
  line  309: const toolResult = await executeTool(env, toolName, toolArgs);
  line  345: if (toolCalls.every(tc => {


---
# ╔══ SECTION B — DYNAMIC FINDINGS (append after cache boundary) ══╗
# Do NOT cache this section. Regenerate for each pass.

## B1. Publish Pipeline Gap Analysis

| Status | Component |
|--------|-----------|
| ✅ | `cms_create_publish_job tool` |
| ✅ | `cms_kv_prime tool` |
| ✅ | `cms_kv_bust tool` |
| ✅ | `cms_diff_sections tool` |
| ✅ | `cms_write_revision tool` |
| ✅ | `/api/cms/publish route` |
| ❌ MISSING | `render_section.js exists` |
| ❌ MISSING | `render_page.js exists` |
| ❌ MISSING | `render_global.js exists` |
| ✅ | `cms_publish_jobs D1 table ref` |
| ❌ MISSING | `cms_publish_artifacts D1 ref` |

### ❌ Missing (4 items — these are what passes 2-5 must create/wire):
- render_section.js exists
- render_page.js exists
- render_global.js exists
- cms_publish_artifacts D1 ref

## B2. Current `/api/cms/publish` Handler

```js
  226    if (path === "/api/cms/publish" && method === "POST") {
  227      const data = await body(request);
  228      const route = data.route_path || data.route || "/";
  229  
  230      await env.DB.prepare(`
  231        UPDATE cms_pages
  232        SET status = 'published',
  233            published_at = datetime('now'),
  234            updated_at = datetime('now'),
  235            published_by = ?
  236        WHERE tenant_id = ? AND route_path = ?
  237      `).bind(sessionUser?.email || sessionUser?.id || "dashboard", TENANT_ID, route).run();
  238  
  239      return json({
  240        success: true,
  241        route_path: route,
  242        preview_url: route === "/" ? "/" : route,
  243        message: "Page marked published. Static page regeneration can be wired after the client approves the build."
  244      });
  245    }
```

## B3. Route Map from `src/index.js`

### Public routes (KV/R2 serving goes here — Pass 5 target)
  ANY    line  107  /admin/reset
  ANY    line  112  /admin/dashboard
  ANY    line  117  /dashboard
  GET    line  134  /

### API routes
  ANY    line   62  /api/agentsam/tools/
  ANY    line   71  /api/agentsam/
  ANY    line   79  /api/
  ANY    line   80  /api/health


## B4. Safe Insertion Points in `src/index.js` (for Pass 5)

**Candidate 1** (Pass 5 insertion point)
```js
   11  import { paymentsEmailRoutes } from './api/payments_email.js';
   12  import { socialRoutes } from './api/social.js';
   13  import { renderHome } from "./api/render_home.js";
   14  
   15  
   16  function json(data, status = 200) {
   17    return new Response(JSON.stringify(data, null, 2), {
```

**Candidate 2** (Pass 5 insertion point)
```js
   42      }
   43    } catch {}
   44    // Fallback: ASSETS (static binding — being migrated out)
   45    try {
   46      const url = new URL(request.url);
   47      const res = await env.ASSETS.fetch(new Request(url.origin + path, request));
   48      if (res.ok) return res;
```

**Candidate 3** (Pass 5 insertion point)
```js
   48      if (res.ok) return res;
   49    } catch {}
   50    return new Response('Not found', { status: 404 });
   51  }
   52  
   53  // ── Session validation — delegates to agentsam_sessions via session_api.js ─────
   54  // getAuthUser(request, env) reads agentsam_sessions WHERE status='active'
```

**Candidate 4** (Pass 5 insertion point)
```js
  101        }
  102  
  103        return json({ error: "API route not found", path: url.pathname }, 404);
  104      }
  105  
  106      // ── Admin password reset ──────────────────────────────────────────────────
  107      if (url.pathname === "/admin/reset") {
```

**Candidate 5** (Pass 5 insertion point)
```js
  133      // ── PRIMETECH: DB-driven home page ──────────────────────────────────────────
  134      if (request.method === "GET" && (url.pathname === "/" || url.pathname === "")) {
  135        const html = await renderHome(env);
  136        return new Response(html, {
  137          headers: {
  138            "Content-Type": "text/html;charset=UTF-8",
  139            "Cache-Control": "no-store",
```

## B5. Existing CMS API Routes (`cms_api.js`)

  GET    line   34  /api/cms/bootstrap
  GET    line   54  /api/cms/page
  POST   line   70  /api/cms/section/save
  POST   line  125  /api/cms/block/save
  POST   line  180  /api/cms/page/save
  ANY    line  184  /
  POST   line  226  /api/cms/publish
  GET    line  248  /api/cms/assets
  POST   line  261  /api/cms/asset/save
  GET    line  315  /api/cms/brand
  POST   line  332  /api/cms/brand/save
  DELETE line  386  /api/cms/section/delete


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
  _shell.js:       renderHeader, renderFooter, pageShell
  render_home.js:  renderHome

KV bindings in use: ['CMS_CACHE', 'WEBSITE_ASSETS']
R2 bindings in use: ['CMS_CACHE']
DB binding:         env.DB

AGENT_TOOLS count: 1
Publish tools present: cms_create_publish_job=True, cms_kv_prime=True, cms_kv_bust=True

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
Missing pieces confirmed: render_section.js exists
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
R2 write pattern:  static/pages{route}/{section_key}.html  and  static/pages{route}/index.html
KV cache key:      page:{route}
Insert cms_publish_artifacts row on success.
Return full HTML string.
Missing pieces confirmed: render_page.js exists
```

**Pass 4 — Wire cms_api.js publish handler**
```
TASK: Modify src/api/cms_api.js — POST /api/cms/publish only
Current state: handler exists, needs renderPage wired in
Changes:
  1. Auth-check (existing pattern)
  2. Accept route_path or page_route from JSON body
  3. INSERT cms_publish_jobs status='running'
  4. Call renderPage(route, jobId, env)
  5. On success: UPDATE status='done'
  6. On failure: UPDATE status='failed', error_message=e.message
  7. Return JSON {success, job_id, route_path}
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
KV binding to use: CMS_CACHE
R2 binding to use: CMS_CACHE
Insertion point: see Section B4 above
Do not break: dashboard, API routes, assets, auth, donation modal
```
