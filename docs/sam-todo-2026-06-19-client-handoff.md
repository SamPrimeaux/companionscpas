# Sam To-Do — Friday, June 19, 2026
## Companions of CPAS · Client handoff prep

**Site:** https://companionsofcaddo.org  
**Repo:** `/Users/samprimeaux/companionscpas`  
**Worker:** `companionscpas` · D1 `companionscpas` · R2 `companionscpas` · KV `CMS_CACHE`

---

## North star for tomorrow

1. **Fix Google Drive** so the org’s shared/media folder is browsable and importable in CMS → Images.
2. **Final client-ready sweep** — walk every public page + key dashboard flows; note only real issues or polish items worth offering as last-minute revisions.

Do not start new features. Ship confidence.

---

## Priority 1 — Google Drive (CMS → Images → Google Drive tab)

### Current symptom
- UI shows **“Google Drive connected”** but **“No image files found in Drive”**
- Screenshot path: `/dashboard/cms/images` → Google Drive tab

### Root cause (likely)
| Issue | Detail |
|-------|--------|
| **OAuth scope too narrow** | App uses `https://www.googleapis.com/auth/drive.file` (`drive_api.js` line 24). This only lists files **created by or explicitly opened through this app** — not the org’s existing shared Drive folders. |
| **Missing Shared Drive flags** | If CPAS uses a **Shared drive** (Team Drive), list calls need `supportsAllDrives=true` and `includeItemsFromAllDrives=true` on Drive API v3. |
| **Connection metadata incomplete** | D1 row `conn_gdrive_tenant_companionscpas` is `connected` but `provider_account_email` is **null** — callback may not be storing account info; worth verifying after reconnect. |

### Fix plan (in order)

#### Step 1 — Confirm what the client has
- [ ] Ask / confirm: personal Drive vs **Shared drive** name (e.g. “Companions CPAS Media”)
- [ ] Get folder ID or path they expect to browse
- [ ] Confirm which Google account should OAuth (org admin vs shared service account — service account is a bigger change)

#### Step 2 — Reconnect with correct scope
**File:** `src/api/drive_api.js`

```javascript
// Change from drive.file → drive.readonly (list + download existing org files)
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly";
```

Also update OAuth connect UI copy in `view-cms.jsx` (ImagesDriveTab) — stop saying `drive.file` only.

- [ ] Disconnect in UI (or `POST /api/integrations/google-drive/disconnect`)
- [ ] Reconnect via `/api/integrations/google-drive/connect`
- [ ] Verify Google Cloud Console OAuth client has redirect URI:  
  `https://companionsofcaddo.org/api/social/oauth/google/callback`

#### Step 3 — Shared Drive support in list + download
**File:** `src/api/drive_api.js` → `handleFiles` and import download URLs

Add to Drive API query params:
```
supportsAllDrives=true
includeItemsFromAllDrives=true
```

Optional: `corpora=allDrives` if listing across shared drives.

#### Step 4 — Optional folder scoping (recommended for org)
Add env or D1 config: `GOOGLE_DRIVE_FOLDER_ID` — append to query:
```
'FOLDER_ID' in parents
```
So they only see their media folder, not entire Drive.

#### Step 5 — Verify end-to-end
- [ ] `GET /api/integrations/google-drive/status` → `connected: true`, email populated
- [ ] `GET /api/integrations/google-drive/test` → healthy
- [ ] `GET /api/integrations/google-drive/files?pageSize=30` → returns images
- [ ] Select 1–2 files → Import → appear in R2 Library tab with `source: google_drive`
- [ ] Confirm public URL pattern: `https://assets.companionsofcaddo.org/static/cms/imports/google-drive/...`

### Key files
| File | Purpose |
|------|---------|
| `src/api/drive_api.js` | OAuth, list, import, disconnect |
| `public/dashboard/js/view-cms.jsx` | `ImagesDriveTab` UI (~line 1071) |
| `src/index.js` | Routes `driveRoutes` |
| D1 `social_provider_connections` | Encrypted tokens (`conn_gdrive_tenant_companionscpas`) |
| D1 `integration_oauth_states` | CSRF state for OAuth |

### Wrangler secrets required
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `DRIVE_ENCRYPT_KEY` (token encryption)

---

## Priority 2 — Client handoff sweep (final look)

Walk as a **new visitor** and as **admin**. Hard refresh (Cmd+Shift+R) on dashboard after any deploy.

### Public pages — 5 min each

| Route | Check |
|-------|-------|
| `/` | Hero, CTAs, newsletter subscribe, footer nav (no hidden `/services` in nav), images load |
| `/about` | Map preview in “Why Companions Exists”, campaigns, donate CTA |
| `/adopt` | Hero/mission from services consolidation, shelter hub, Caddo dogs links |
| `/donate` | Stripe modal (test mode OK), hero cards, shelter hub |
| `/community` | Stories load, no broken sections |
| `/services` | **Hidden from nav** but URL still works for future edit — confirm intentional |

### Dashboard — critical paths

| Route | Check |
|-------|-------|
| `/dashboard/cms/website` | Page cards, eye icon hide/show nav, publish |
| `/dashboard/cms/brand` | **Tweaks panel** — live preview, drag-drop logos, save |
| `/dashboard/cms/images` | R2 upload, Google Drive (after fix), alt text |
| `/dashboard/cms/pages` | Edit + publish home/about/adopt |
| `/admin/login` | Login + redirect to dashboard |

### Integrations smoke

| System | Check |
|--------|-------|
| **Resend** | Newsletter subscribe on homepage → welcome email to inbox |
| **Stripe** | Donate modal completes in test mode |
| **D1 → R2 → KV** | Publish one section change → live in ~60s after KV bust |

### Known good (recent — don’t re-break)
- `/services` hidden from header/footer via `nav_visible` on `cms_pages`
- Newsletter `newsletter_subscribers` table + welcome email via Resend
- About “Why Companions Exists” = CPAS shelter map embed
- Brand editor = tweaks-style split layout (cache bust: `brand-tweaks-*` on dashboard assets)

### Offer client as optional revisions (only if you find issues)
- Copy tweaks per page (they edit in CMS)
- Re-enable Foster (`/services`) in nav when page is ready
- Google Drive folder pinned to their shared media folder
- Stripe live mode when they’re ready (currently test)

---

## Quick reference docs (read tonight / keep open tomorrow)

| Doc | Use for |
|-----|---------|
| `docs/current-file-map.md` | Route → file → API → table mapping |
| `docs/live-url-sitemap.md` | All public + dashboard routes |
| `docs/ops/companionscpas_change_contract.md` | Deploy: Worker → R2 fragments → KV purge |
| `docs/homepage-readme.md` | Home fragment CMS |
| `docs/about-readme.md` | About sections |
| `docs/donate-readme.md` | Donate v2 + Stripe |
| `ARCHITECTURE.md` | D1 tables, Drive OAuth, integrations |
| `README.md` | Sectionalized CMS pipeline |

---

## Deploy cheat sheet (if you change code)

```bash
cd ~/companionscpas

# Worker
npx wrangler deploy

# D1 migration (if any)
npx wrangler d1 execute companionscpas --remote --file=db/migrations/XXXX.sql

# Dashboard JS (always bump cache in index.html)
# Edit public/dashboard/index.html ?v=NEW_VERSION on all jsx/css
npx wrangler r2 object put companionscpas/dashboard/index.html --file public/dashboard/index.html --content-type "text/html; charset=utf-8" --remote
npx wrangler r2 object put companionscpas/dashboard/js/view-cms.jsx --file public/dashboard/js/view-cms.jsx --content-type "application/javascript; charset=utf-8" --remote

# Public page KV bust
npx wrangler kv key delete "page:/" --namespace-id 0b410337a8494fc982ea04c5bde1eab4 --remote
npx wrangler kv key delete "page:/about" --namespace-id 0b410337a8494fc982ea04c5bde1eab4 --remote
# ... repeat per route

# Or republish all shell pages
node scripts/republish-shell-pages.mjs
```

---

## Suggested time blocks

| Block | Focus |
|-------|-------|
| **Morning (2–3h)** | Google Drive scope + shared drive fix, reconnect org account, test import |
| **Midday (1–2h)** | Public page sweep + mobile check |
| **Afternoon (1h)** | Dashboard CMS publish test, brand tweaks save, newsletter |
| **End of day (30m)** | Short client handoff note: what’s live, what’s test mode, optional revisions |

---

## Client handoff talking points

- **Live:** companionsofcaddo.org — CMS-editable pages, media library, brand tweaks panel
- **Hidden for now:** Foster page (`/services`) — still editable in CMS, not in nav
- **Test mode:** Stripe donations until they approve live keys
- **Email:** Resend working for newsletter + transactional; dashboard inbox at `/dashboard/email`
- **Media:** R2 at assets.companionsofcaddo.org; Google Drive = import source (after tomorrow fix)
- **Support:** Inner Animal Media built; they edit content in `/dashboard/cms/*`

---

*Generated for Sam Primeaux · Inner Animal Media · Companions of CPAS handoff sprint*
