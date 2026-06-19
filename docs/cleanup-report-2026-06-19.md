# Cleanup Report — 2026-06-19

**Repo:** `companionscpas`  
**R2 bucket:** `companionscpas`  
**Total repo bytes removed:** 434 KB (445,068 bytes)  
**Repo files deleted:** 24  
**R2 objects deleted:** 17  

Machine-readable: `docs/cleanup-report-2026-06-19.json`

---

## Repo — deleted (24)

| Path | Size | Reason |
|------|------|--------|
| `public/about.html` | 40 KB | Legacy monolithic page |
| `public/adopt.html` | 132 KB | Legacy monolithic page |
| `public/services.html` | 42 KB | Legacy monolithic page |
| `public/index.html` | 17 KB | Legacy home |
| `public/donate.html` | 9 KB | Legacy monolithic page |
| `public/dashboard.html` | 7 KB | Replaced by `dashboard/index.html` |
| `public/cpas-shell.css` | 31 KB | Duplicate of `_shared.css` |
| `public/cpas-shell.js` | 13 KB | Legacy shell JS |
| `public/dashboard/js/view-animals-notes.jsx` | 19 KB | Not loaded in shell |
| `scripts/companionscpas_audit_report.json` | 39 KB | Generated artifact |
| `src/api/render_section.js.bak` | 22 KB | Backup |
| `src/api/render_page.js.bak` | 11 KB | Backup |
| `src/api/render_home.js` | 10 KB | Superseded by fragments |
| `src/api/cms_api_additions.js` | 8 KB | Duplicate API |
| `src/api/_shell.js` | 6 KB | Superseded by `page_shell.js` |
| `src/api/_shell.js.bak` | 6 KB | Backup |
| `public/admin/dashboard.html` | 13 KB | Legacy admin |
| `public/admin/index.html` | 3 KB | Legacy redirect |
| `public/_header.html` | 1 KB | Legacy partial |
| `public/_footer.html` | 1 KB | Legacy partial |
| `public/cpas-header.html` | 1 KB | Legacy partial |
| `public/cpas-footer.html` | 0.2 KB | Legacy partial |
| `public/shared.js` | 1.5 KB | Duplicate of `_shared.js` |
| `scripts/filetree.py` | 2 KB | Old inspector |

## R2 — deleted (17)

Legacy keys removed from bucket `companionscpas`:

- `about.html`, `adopt.html`, `donate.html`, `services.html`, `index.html`, `dashboard.html`
- `cpas-header.html`, `cpas-footer.html`, `_header.html`, `_footer.html`
- `cpas-shell.css`, `cpas-shell.js`, `shared.js`
- `admin/dashboard.html`, `admin/index.html`
- `static/global/cpas-shell.css`, `static/global/cpas-shell.js`

**Not touched (live):** `dashboard/*`, `static/pages/**`, `static/global/shared.css`, `static/global/shared.js`, `admin/login.html`, fragment CMS artifacts.

---

## Also deployed

- Google Drive scope: `drive.file` → `drive.readonly`
- Shared Drive list params: `supportsAllDrives`, `includeItemsFromAllDrives`, `corpora=allDrives`
- Optional env: `GOOGLE_DRIVE_FOLDER_ID` to pin a single media folder
