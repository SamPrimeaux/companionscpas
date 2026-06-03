# companionscpas — Post-Sprint Deploy Checklist
# Sprint: 2026-06-03
# Run all commands from: ~/companionscpas

---

## Status

| Item | Status |
|---|---|
| Worker (src/index.js) | Live — auto-deployed via CF Builds |
| D1 migration (3 social tables) | Live — ran via CF MCP |
| /community route | Live — returns 503 until CMS artifact created |
| /api/social/status | Live |
| /api/social/embed/facebook-page | Live |
| Dashboard JS (app/ui/overview) | NOT live — needs R2 sync |
| cpas-header.html (desktop nav) | NOT live — needs R2 upload |
| cpas-shell.js (mobile nav) | NOT live — needs R2 upload |

---

## Step 1 — Sync dashboard JS to R2

```bash
wrangler r2 object put companionscpas/dashboard/js/app.jsx \
  --file public/dashboard/js/app.jsx \
  --content-type application/javascript --remote

wrangler r2 object put companionscpas/dashboard/js/ui.jsx \
  --file public/dashboard/js/ui.jsx \
  --content-type application/javascript --remote

wrangler r2 object put companionscpas/dashboard/js/view-overview.jsx \
  --file public/dashboard/js/view-overview.jsx \
  --content-type application/javascript --remote

wrangler r2 object put companionscpas/dashboard/index.html \
  --file public/dashboard/index.html \
  --content-type text/html --remote
```

---

## Step 2 — Upload patched desktop nav header to R2

```bash
curl -s "https://assets.meauxxx.com/static/global/cpas-header.html" \
  | sed 's|<li><a href="/services">Services</a></li>|<li><a href="/services">Services</a></li>\n        <li><a href="/community">Community</a></li>|' \
  > /tmp/cpas-header.html

wrangler r2 object put companionscpas/static/global/cpas-header.html \
  --file /tmp/cpas-header.html \
  --content-type text/html --remote
```

---

## Step 3 — Upload patched mobile nav shell to R2

```bash
wrangler r2 object put companionscpas/static/global/cpas-shell.js \
  --file public/cpas-shell.js \
  --content-type application/javascript --remote
```

---

## Step 4 — Purge KV cache

```bash
wrangler kv key delete --binding=CMS_CACHE "page:/" --remote
wrangler kv key delete --binding=CMS_CACHE "page:/community" --remote
wrangler kv key delete --binding=CMS_CACHE "header" --remote
```

---

## Step 5 — Verify

```bash
# Worker health
curl https://companionscpas.meauxbility.workers.dev/api/health

# Community route (expect 503 until CMS artifact published, NOT 404)
curl -o /dev/null -w "%{http_code}" https://companionscpas.meauxbility.workers.dev/community

# Social status endpoint
curl https://companionscpas.meauxbility.workers.dev/api/social/status

# Facebook embed config (expect configured:false until page URL is saved)
curl https://companionscpas.meauxbility.workers.dev/api/social/embed/facebook-page

# Community nav visible in mobile drawer
# Open https://companionscpas.meauxbility.workers.dev on iPhone
# Tap hamburger — Community should appear between Services and Donate

# Dashboard mobile shell
# Open https://companionscpas.meauxbility.workers.dev/dashboard on iPhone
# Sidebar should be hidden, hamburger in top bar, drawer slides in from left
```

---

## Still TODO after deploy

- Create CMS page record for /community in D1 so route returns content not 503
- Configure Facebook Page embed URL via dashboard or:
  curl -X POST https://companionscpas.meauxbility.workers.dev/api/social/embed/facebook-page \
    -H "Content-Type: application/json" \
    -d '{"page_url":"https://www.facebook.com/YOUR_PAGE"}'
- Add META_APP_ID and META_APP_SECRET via wrangler secret put when Meta app is ready

---

## What was changed in this sprint (reference)

- src/index.js — added /community to PUBLIC_ROUTES
- src/api/social.js — added /api/social/status, /api/social/embed/facebook-page, /api/social/facebook/page-posts scaffold
- src/api/_shell.js — added Community to NAV_LINKS and FOOTER_LINKS
- public/cpas-shell.js — added Community to mobile drawer nav and footer
- public/dashboard/index.html — mobile CSS helpers, overflow guards, drawer animations
- public/dashboard/js/app.jsx — isMobile state, mobileNavOpen state, body scroll lock, MobileNavDrawer mount
- public/dashboard/js/ui.jsx — useIsMobile hook, MobileNavDrawer component, TopBar mobile mode
- public/dashboard/js/view-overview.jsx — responsive grids for all breakpoints
- migration/d1/social_integrations.sql — social_provider_connections, social_embed_settings, social_post_drafts_v2
- README.md — full rewrite
