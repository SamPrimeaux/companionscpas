
# CSS / Style System Audit

**Repo:** `/Users/samprimeaux/companionscpas`
**Generated:** 2026-05-28T22:30:33
**Shared CSS:** `/Users/samprimeaux/companionscpas/public/_shared.css`

---


## Summary

| Metric | Count |
|---|---|
| Unique selectors | 643 |
| Total rule definitions | 1014 |
| Selectors defined 2+ times | 201 |
| Selectors with inline HTML override | 32 |
| Selectors with 3+ !important | 39 |
| Inline `<style>` blocks in HTML files | 29 |
| CSS custom properties (--vars) | 39 |

---


## CSS Custom Properties (--vars)

Total: **39** vars defined in `_shared.css`

**23 vars defined multiple times (potential conflict):**


`--bg`:
  - Line 25: `#0b0f1a`
  - Line 42: `#f4f0e8`

`--bg-2`:
  - Line 26: `#111827`
  - Line 43: `#ede9df`

`--bg-glass`:
  - Line 27: `rgba(11, 15, 26, 0.82)`
  - Line 44: `rgba(244, 240, 232, 0.88)`

`--border`:
  - Line 29: `rgba(255,255,255,0.07)`
  - Line 46: `rgba(0,0,0,0.08)`

`--btn-ghost-border`:
  - Line 36: `rgba(255,255,255,0.15)`
  - Line 53: `rgba(0,0,0,0.18)`

`--btn-ghost-text`:
  - Line 37: `#f0ece6`
  - Line 54: `#1a1622`

`--btn-primary-bg`:
  - Line 34: `#7c3aed`
  - Line 51: `#ee2336`

`--btn-primary-text`:
  - Line 35: `#ffffff`
  - Line 52: `#ffffff`

`--cpas-bg`:
  - Line 732: `#080d18`
  - Line 763: `#f8f5ef`

`--cpas-bg-2`:
  - Line 733: `#0b1120`
  - Line 764: `#fffaf2`

`--cpas-border`:
  - Line 736: `rgba(255,255,255,0.10)`
  - Line 767: `rgba(23,32,51,0.10)`

`--cpas-border-strong`:
  - Line 737: `rgba(255,255,255,0.16)`
  - Line 768: `rgba(23,32,51,0.16)`

`--cpas-faint`:
  - Line 740: `rgba(232,238,250,0.46)`
  - Line 771: `rgba(23,32,51,0.48)`

`--cpas-header-h`:
  - Line 748: `76px`
  - Line 1135: `70px`

`--cpas-muted`:
  - Line 739: `rgba(232,238,250,0.66)`
  - Line 770: `rgba(23,32,51,0.68)`

`--cpas-surface`:
  - Line 734: `rgba(255,255,255,0.055)`
  - Line 765: `rgba(23,32,51,0.045)`

`--cpas-surface-strong`:
  - Line 735: `rgba(255,255,255,0.085)`
  - Line 766: `rgba(23,32,51,0.075)`

`--cpas-text`:
  - Line 738: `#f8f3ea`
  - Line 769: `#172033`

`--logo`:
  - Line 33: `url('https://assets.meauxxx.com/static/global/logo-dark.webp')`
  - Line 50: `url('https://assets.meauxxx.com/static/global/companionsofcpa-newlogo.webp')`

`--surface`:
  - Line 28: `rgba(255,255,255,0.04)`
  - Line 45: `rgba(0,0,0,0.03)`

`--text-1`:
  - Line 30: `#f0ece6`
  - Line 47: `#1a1622`

`--text-2`:
  - Line 31: `#9ca3af`
  - Line 48: `#4b4453`

`--text-3`:
  - Line 32: `#6b7280`
  - Line 49: `#9ca3af`

<details>
<summary>Full var list</summary>

- `--bg`: `#0b0f1a` (line 25)
- `--bg-2`: `#111827` (line 26)
- `--bg-glass`: `rgba(11, 15, 26, 0.82)` (line 27)
- `--border`: `rgba(255,255,255,0.07)` (line 29)
- `--btn-ghost-border`: `rgba(255,255,255,0.15)` (line 36)
- `--btn-ghost-text`: `#f0ece6` (line 37)
- `--btn-primary-bg`: `#7c3aed` (line 34)
- `--btn-primary-text`: `#ffffff` (line 35)
- `--cpas-bg`: `#080d18` (line 732)
- `--cpas-bg-2`: `#0b1120` (line 733)
- `--cpas-border`: `rgba(255,255,255,0.10)` (line 736)
- `--cpas-border-strong`: `rgba(255,255,255,0.16)` (line 737)
- `--cpas-container`: `1180px` (line 749)
- `--cpas-faint`: `rgba(232,238,250,0.46)` (line 740)
- `--cpas-header-h`: `76px` (line 748)
- `--cpas-muted`: `rgba(232,238,250,0.66)` (line 739)
- `--cpas-purple`: `#8b5cf6` (line 741)
- `--cpas-purple-2`: `#7c3aed` (line 742)
- `--cpas-radius-lg`: `24px` (line 745)
- `--cpas-radius-md`: `16px` (line 744)
- `--cpas-radius-xl`: `32px` (line 746)
- `--cpas-red`: `#ee2336` (line 743)
- `--cpas-shadow-soft`: `0 24px 80px rgba(0,0,0,0.26)` (line 747)
- `--cpas-surface`: `rgba(255,255,255,0.055)` (line 734)
- `--cpas-surface-strong`: `rgba(255,255,255,0.085)` (line 735)
- `--cpas-text`: `#f8f3ea` (line 738)
- `--ease`: `cubic-bezier(0.16, 1, 0.3, 1)` (line 20)
- `--font-body`: `'DM Sans', system-ui, sans-serif` (line 8)
- `--font-display`: `'Fraunces', Georgia, serif` (line 7)
- `--gold`: `#c9a84c` (line 14)
- `--header-h`: `68px` (line 17)
- `--logo`: `url('https://assets.meauxxx.com/static/global/logo-dark.webp')` (line 33)
- `--purple`: `#7c3aed` (line 11)
- `--purple-light`: `#a78bfa` (line 12)
- `--red`: `#ee2336` (line 13)
- `--surface`: `rgba(255,255,255,0.04)` (line 28)
- `--text-1`: `#f0ece6` (line 30)
- `--text-2`: `#9ca3af` (line 31)
- `--text-3`: `#6b7280` (line 32)

</details>

---


## Inline `<style>` Blocks in HTML Files

Found **29** inline style blocks across HTML files.
These bypass `_shared.css` and are the primary source of override chaos.

- `public/about.html` — 6 block(s), ~263 rules, starting at line 21
- `public/admin/dashboard.html` — 1 block(s), ~54 rules, starting at line 8
- `public/admin/index.html` — 1 block(s), ~9 rules, starting at line 7
- `public/admin/login.html` — 1 block(s), ~24 rules, starting at line 7
- `public/admin/reset-password.html` — 1 block(s), ~7 rules, starting at line 4
- `public/adopt.html` — 7 block(s), ~261 rules, starting at line 12
- `public/dashboard.html` — 2 block(s), ~18 rules, starting at line 13
- `public/dashboard/index.html` — 2 block(s), ~18 rules, starting at line 13
- `public/donate.html` — 1 block(s), ~11 rules, starting at line 10
- `public/services.html` — 6 block(s), ~107 rules, starting at line 12
- `scripts/companionscpas_audit_report.html` — 1 block(s), ~32 rules, starting at line 6

---


## Duplicate Selector Definitions

**201 selectors** are defined in more than one place.
Sorted by definition count (most duplicated first):


#### `body`
- 📄 shared_css `public/_shared.css` line 60
  - Props: `background: var(--bg)`, `color: var(--text-1)`, `font-family: var(--font-body)`, `font-size: 16px`, `line-height: 1.6`, `font-weight: 300`
- 📄 shared_css `public/_shared.css` line 226
  - Props: `padding-top: var(--header-h)`
- 🔴 inline_html `public/about.html` line 69
  - Props: `margin: 0`, `font-family: var(--font-body)`, `background: `, `color: var(--ink)`, `overflow-x: hidden`
- 🔴 inline_html `public/about.html` line 305 ⚠️ 1× !important
  - Props: `background: #fbf7f1 !important`
- 🔴 inline_html `public/about.html` line 548 ⚠️ 1× !important
  - Props: `padding-top: 0!important`
- 🔴 inline_html `public/admin/dashboard.html` line 17
  - Props: `margin: 0;background:`, `linear-gradient(135deg,#050812,#0d1727 55%,#03151b);color: var(--text)`
- 🔴 inline_html `public/admin/index.html` line 8
  - Props: `margin: 0;min-height:100vh;display:grid;place-items:center;font-family:Inter,Arial,sans-serif;background:#fff7f8;color:#172033`
- 🔴 inline_html `public/admin/login.html` line 9
  - Props: `margin: 0`, `min-height: 100vh`, `display: grid`, `place-items: center`, `font-family: Inter,Arial,sans-serif`, `color: #f8f7ff`
- 🔴 inline_html `public/admin/reset-password.html` line 5
  - Props: `margin: 0;min-height:100vh;display:grid;place-items:center;background:#07101a;color:white;font-family:Inter,Arial`
- 🔴 inline_html `public/adopt.html` line 922 ⚠️ 2× !important
  - Props: `background: `, `color: var(--cpas-text) !important`
- 🔴 inline_html `public/adopt.html` line 1100 ⚠️ 2× !important
  - Props: `background: `, `color: #F8F7FF!important`
- 🔴 inline_html `public/adopt.html` line 1377 ⚠️ 1× !important
  - Props: `padding-top: 0!important`
- 🔴 inline_html `public/dashboard/index.html` line 16
  - Props: `background: #0b0b14; color: #f0f0f5; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif`
- 🔴 inline_html `public/dashboard.html` line 16
  - Props: `background: #0b0b14; color: #f0f0f5; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif`
- 🔴 inline_html `public/services.html` line 68 ⚠️ 2× !important
  - Props: `background: `, `color: var(--cpas-text) !important`
- 🔴 inline_html `public/services.html` line 381 ⚠️ 1× !important
  - Props: `padding-top: 0!important`
- 🔴 inline_html `scripts/companionscpas_audit_report.html` line 8
  - Props: `font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f0f13; color: #e2e8f0; font-size: 13px`

#### `:root`
- 📄 shared_css `public/_shared.css` line 727
  - Props: `--cpas-bg: #080d18`, `--cpas-bg-2: #0b1120`, `--cpas-surface: rgba(255,255,255,0.055)`, `--cpas-surface-strong: rgba(255,255,255,0.085)`, `--cpas-border: rgba(255,255,255,0.10)`, `--cpas-border-strong: rgba(255,255,255,0.16)`
- 📄 shared_css `public/_shared.css` line 1133
  - Props: `--cpas-header-h: 70px`
- 🔴 inline_html `public/about.html` line 22
  - Props: `--font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace`, `color-scheme: light dark`, `--font-display: "Satoshi", "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`, `--font-body: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`, `--bg: #f8f3ee`, `--bg-soft: #fffaf6`
- 🔴 inline_html `public/about.html` line 55
  - Props: `--bg: #050a12`, `--bg-soft: #07111d`, `--surface: rgba(12,20,32,.72)`, `--surface-strong: #0c1420`, `--ink: #f6f2ec`, `--muted: #b7c0cf`
- 🔴 inline_html `public/about.html` line 227
  - Props: `--nav-h: 104px`
- 🔴 inline_html `public/about.html` line 508
  - Props: `--shell-max: 1160px;--shell-h:112px;--shell-dark:#050a12;--shell-light:#fbf7f1;--shell-text:#172033;--shell-muted:#526174;--shell-purple:#6d5593;--shell-radius:22px`
- 🔴 inline_html `public/admin/dashboard.html` line 9
  - Props: `--bg: #050812;--panel:#0b1220;--panel2:#111827;--card:rgba(17,24,39,.78)`, `--line: rgba(255,255,255,.1);--text:#f8f7ff;--muted:#a8b0c2`, `--purple: #8b5cf6;--purple2:#5b21b6;--cyan:#16bfd6;--green:#39d98a`, `--red: #ff5b6e;--orange:#ff9f43;--blue:#48a8ff;--radius:22px`, `font-family: Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,Arial,sans-serif`
- 🔴 inline_html `public/adopt.html` line 883
  - Props: `--font-display: "Satoshi", "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`, `--font-body: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`, `--font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace`
- 🔴 inline_html `public/adopt.html` line 909
  - Props: `--cpas-bg: #05080D`, `--cpas-bg-alt: #101927`, `--cpas-surface: rgba(18,25,36,.72)`, `--cpas-surface-soft: rgba(255,255,255,.055)`, `--cpas-border: rgba(255,255,255,.12)`, `--cpas-text: #F8F7FF`
- 🔴 inline_html `public/adopt.html` line 992
  - Props: `--cpas-purple: #6D5593`, `--cpas-purple-light: #C7A7FF`, `--cpas-cyan: #16BFD6`, `--cpas-dark: #05080D`, `--cpas-navy: #101927`
- 🔴 inline_html `public/adopt.html` line 1091
  - Props: `--cpas-dark: #05080D`, `--cpas-navy: #101927`, `--cpas-panel: rgba(18,25,36,.72)`, `--cpas-border: rgba(255,255,255,.13)`, `--cpas-purple: #6D5593`, `--cpas-purple-light: #C7A7FF`
- 🔴 inline_html `public/adopt.html` line 1337
  - Props: `--shell-max: 1160px;--shell-h:112px;--shell-dark:#050a12;--shell-light:#fbf7f1;--shell-text:#172033;--shell-muted:#526174;--shell-purple:#6d5593;--shell-radius:22px`
- 🔴 inline_html `public/services.html` line 29
  - Props: `--font-display: "Satoshi", "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`, `--font-body: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`, `--font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace`
- 🔴 inline_html `public/services.html` line 55
  - Props: `--cpas-bg: #05080D`, `--cpas-bg-alt: #101927`, `--cpas-surface: rgba(18,25,36,.72)`, `--cpas-surface-soft: rgba(255,255,255,.055)`, `--cpas-border: rgba(255,255,255,.12)`, `--cpas-text: #F8F7FF`
- 🔴 inline_html `public/services.html` line 138
  - Props: `--cpas-purple: #6D5593`, `--cpas-purple-light: #C7A7FF`, `--cpas-cyan: #16BFD6`, `--cpas-dark: #05080D`, `--cpas-navy: #101927`
- 🔴 inline_html `public/services.html` line 341
  - Props: `--shell-max: 1160px;--shell-h:112px;--shell-dark:#050a12;--shell-light:#fbf7f1;--shell-text:#172033;--shell-muted:#526174;--shell-purple:#6d5593;--shell-radius:22px`

#### `.site-header`
- 📄 shared_css `public/_shared.css` line 143
  - Props: `position: fixed`, `top: 0`, `left: 0`, `right: 0`, `z-index: 200`, `height: var(--header-h)`
- 📄 shared_css `public/_shared.css` line 811
  - Props: `position: sticky`, `top: 0`, `z-index: 80`, `width: 100%`, `min-height: var(--cpas-header-h)`, `background: rgba(8, 13, 24, 0.72)`
- 🔴 inline_html `public/about.html` line 84
  - Props: `position: fixed`, `top: 0`, `left: 0`, `right: 0`, `z-index: 60`, `height: var(--nav-h)`
- 🔴 inline_html `public/about.html` line 509 ⚠️ 4× !important
  - Props: `position: sticky;top:0;z-index:9999;width:100%;height:var(--shell-h);background:transparent!important;border:0!important;box-shadow:none!important;backdrop-filter:none!important;transition:background .25s ease,box-shadow .25s ease,backdrop-filter .25s ease`
- 🔴 inline_html `public/about.html` line 536
  - Props: `height: 86px`
- 🔴 inline_html `public/about.html` line 549 ⚠️ 7× !important
  - Props: `position: fixed!important`, `top: 0!important`, `left: 0!important`, `right: 0!important`, `margin: 0!important`, `transform: none!important`
- 🔴 inline_html `public/adopt.html` line 1338 ⚠️ 4× !important
  - Props: `position: sticky;top:0;z-index:9999;width:100%;height:var(--shell-h);background:transparent!important;border:0!important;box-shadow:none!important;backdrop-filter:none!important;transition:background .25s ease,box-shadow .25s ease,backdrop-filter .25s ease`
- 🔴 inline_html `public/adopt.html` line 1365
  - Props: `height: 86px`
- 🔴 inline_html `public/adopt.html` line 1378 ⚠️ 7× !important
  - Props: `position: fixed!important`, `top: 0!important`, `left: 0!important`, `right: 0!important`, `margin: 0!important`, `transform: none!important`
- 🔴 inline_html `public/services.html` line 342 ⚠️ 4× !important
  - Props: `position: sticky;top:0;z-index:9999;width:100%;height:var(--shell-h);background:transparent!important;border:0!important;box-shadow:none!important;backdrop-filter:none!important;transition:background .25s ease,box-shadow .25s ease,backdrop-filter .25s ease`
- 🔴 inline_html `public/services.html` line 369
  - Props: `height: 86px`
- 🔴 inline_html `public/services.html` line 382 ⚠️ 7× !important
  - Props: `position: fixed!important`, `top: 0!important`, `left: 0!important`, `right: 0!important`, `margin: 0!important`, `transform: none!important`

#### `h1, h2, h3`
- 📄 shared_css `public/_shared.css` line 798
  - Props: `text-wrap: balance`
- 🔴 inline_html `public/about.html` line 125
  - Props: `font-family: var(--font-display); letter-spacing: -.055em; margin: 0`
- 🔴 inline_html `public/adopt.html` line 878
  - Props: `font-family: var(--font-display)`, `letter-spacing: -.055em`
- 🔴 inline_html `public/adopt.html` line 984
  - Props: `font-family: var(--font-display)`, `letter-spacing: -.055em`
- 🔴 inline_html `public/adopt.html` line 1083
  - Props: `font-family: var(--font-display)`, `letter-spacing: -.055em`
- 🔴 inline_html `public/adopt.html` line 1225
  - Props: `font-family: var(--font-display)`, `letter-spacing: -.055em`
- 🔴 inline_html `public/adopt.html` line 1328
  - Props: `font-family: var(--font-display)`, `letter-spacing: -.055em`
- 🔴 inline_html `public/services.html` line 24
  - Props: `font-family: var(--font-display)`, `letter-spacing: -.055em`
- 🔴 inline_html `public/services.html` line 130
  - Props: `font-family: var(--font-display)`, `letter-spacing: -.055em`
- 🔴 inline_html `public/services.html` line 229
  - Props: `font-family: var(--font-display)`, `letter-spacing: -.055em`
- 🔴 inline_html `public/services.html` line 332
  - Props: `font-family: var(--font-display)`, `letter-spacing: -.055em`

#### `.site-header .container.nav`
- 🔴 inline_html `public/about.html` line 511 ⚠️ 8× !important
  - Props: `width: min(var(--shell-max),calc(100% - 48px))!important;height:100%!important;margin:0 auto!important;padding:0!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:28px!important`
- 🔴 inline_html `public/about.html` line 537 ⚠️ 1× !important
  - Props: `width: min(100% - 28px, var(--shell-max))!important`
- 🔴 inline_html `public/about.html` line 558 ⚠️ 1× !important
  - Props: `margin-top: 0!important`
- 🔴 inline_html `public/adopt.html` line 1340 ⚠️ 8× !important
  - Props: `width: min(var(--shell-max),calc(100% - 48px))!important;height:100%!important;margin:0 auto!important;padding:0!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:28px!important`
- 🔴 inline_html `public/adopt.html` line 1366 ⚠️ 1× !important
  - Props: `width: min(100% - 28px, var(--shell-max))!important`
- 🔴 inline_html `public/adopt.html` line 1387 ⚠️ 1× !important
  - Props: `margin-top: 0!important`
- 🔴 inline_html `public/services.html` line 344 ⚠️ 8× !important
  - Props: `width: min(var(--shell-max),calc(100% - 48px))!important;height:100%!important;margin:0 auto!important;padding:0!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:28px!important`
- 🔴 inline_html `public/services.html` line 370 ⚠️ 1× !important
  - Props: `width: min(100% - 28px, var(--shell-max))!important`
- 🔴 inline_html `public/services.html` line 391 ⚠️ 1× !important
  - Props: `margin-top: 0!important`

#### `.site-header .desktop-links`
- 📄 shared_css `public/_shared.css` line 662
  - Props: `display: flex`, `align-items: center`, `gap: 14px`
- 📄 shared_css `public/_shared.css` line 984
  - Props: `display: flex`, `align-items: center`, `gap: 10px`
- 🔴 inline_html `public/about.html` line 519 ⚠️ 10× !important
  - Props: `display: flex!important;align-items:center!important;justify-content:flex-end!important;gap:32px!important;margin:0!important;padding:0!important;font-weight:800!important;font-size:15px!important;line-height:1!important;white-space:nowrap!important`
- 🔴 inline_html `public/about.html` line 538 ⚠️ 1× !important
  - Props: `display: none!important`
- 🔴 inline_html `public/adopt.html` line 1348 ⚠️ 10× !important
  - Props: `display: flex!important;align-items:center!important;justify-content:flex-end!important;gap:32px!important;margin:0!important;padding:0!important;font-weight:800!important;font-size:15px!important;line-height:1!important;white-space:nowrap!important`
- 🔴 inline_html `public/adopt.html` line 1367 ⚠️ 1× !important
  - Props: `display: none!important`
- 🔴 inline_html `public/services.html` line 352 ⚠️ 10× !important
  - Props: `display: flex!important;align-items:center!important;justify-content:flex-end!important;gap:32px!important;margin:0!important;padding:0!important;font-weight:800!important;font-size:15px!important;line-height:1!important;white-space:nowrap!important`
- 🔴 inline_html `public/services.html` line 371 ⚠️ 1× !important
  - Props: `display: none!important`

#### `.developer`
- 🔴 inline_html `public/about.html` line 193
  - Props: `display: flex; align-items: center; justify-content: flex-end; gap: 12px; color: rgba(255,255,255,.62)`
- 🔴 inline_html `public/about.html` line 243
  - Props: `justify-content: flex-start`
- 🔴 inline_html `public/about.html` line 533 ⚠️ 4× !important
  - Props: `display: flex!important;gap:14px!important;align-items:center!important;justify-content:flex-end!important`
- 🔴 inline_html `public/about.html` line 541 ⚠️ 1× !important
  - Props: `justify-content: flex-start!important`
- 🔴 inline_html `public/adopt.html` line 1362 ⚠️ 4× !important
  - Props: `display: flex!important;gap:14px!important;align-items:center!important;justify-content:flex-end!important`
- 🔴 inline_html `public/adopt.html` line 1370 ⚠️ 1× !important
  - Props: `justify-content: flex-start!important`
- 🔴 inline_html `public/services.html` line 366 ⚠️ 4× !important
  - Props: `display: flex!important;gap:14px!important;align-items:center!important;justify-content:flex-end!important`
- 🔴 inline_html `public/services.html` line 374 ⚠️ 1× !important
  - Props: `justify-content: flex-start!important`

#### `a`
- 📄 shared_css `public/_shared.css` line 73
  - Props: `color: inherit; text-decoration: none`
- 🔴 inline_html `public/about.html` line 79
  - Props: `color: inherit; text-decoration: none`
- 🔴 inline_html `public/admin/dashboard.html` line 20
  - Props: `color: inherit;text-decoration:none`
- 🔴 inline_html `public/adopt.html` line 959
  - Props: `color: inherit`
- 🔴 inline_html `public/dashboard/index.html` line 23
  - Props: `color: inherit; text-decoration: none`
- 🔴 inline_html `public/dashboard.html` line 23
  - Props: `color: inherit; text-decoration: none`
- 🔴 inline_html `public/services.html` line 105
  - Props: `color: inherit`

#### `.site-header .hamburger`
- 📄 shared_css `public/_shared.css` line 695
  - Props: `display: none`
- 🔴 inline_html `public/about.html` line 526 ⚠️ 1× !important
  - Props: `display: none!important`
- 🔴 inline_html `public/about.html` line 539 ⚠️ 1× !important
  - Props: `display: flex!important`
- 🔴 inline_html `public/adopt.html` line 1355 ⚠️ 1× !important
  - Props: `display: none!important`
- 🔴 inline_html `public/adopt.html` line 1368 ⚠️ 1× !important
  - Props: `display: flex!important`
- 🔴 inline_html `public/services.html` line 359 ⚠️ 1× !important
  - Props: `display: none!important`
- 🔴 inline_html `public/services.html` line 372 ⚠️ 1× !important
  - Props: `display: flex!important`

#### `img`
- 📄 shared_css `public/_shared.css` line 71
  - Props: `display: block; max-width: 100%`
- 🔴 inline_html `public/about.html` line 82
  - Props: `max-width: 100%; display: block`
- 🔴 inline_html `public/admin/index.html` line 10
  - Props: `width: 92px;height:92px;object-fit:contain;display:block;margin:0 auto 18px`
- 🔴 inline_html `public/admin/reset-password.html` line 7
  - Props: `width: 180px;display:block;margin:0 auto 30px`
- 🔴 inline_html `public/adopt.html` line 975
  - Props: `border-radius: 18px`
- 🔴 inline_html `public/services.html` line 121
  - Props: `border-radius: 18px`

#### `.hero-split`
- 📄 shared_css `public/_shared.css` line 1300
  - Props: `position: relative`, `overflow: hidden`, `min-height: 100svh`, `display: flex`, `align-items: flex-end`
- 📄 shared_css `public/_shared.css` line 1413
  - Props: `min-height: 92vh`, `align-items: center`
- 🔴 inline_html `public/adopt.html` line 1036 ⚠️ 1× !important
  - Props: `background: `
- 🔴 inline_html `public/adopt.html` line 1082 ⚠️ 1× !important
  - Props: `background: linear-gradient(180deg,rgba(255,255,255,.94),rgba(16,25,39,.25),rgba(5,8,13,.92))!important`
- 🔴 inline_html `public/services.html` line 182 ⚠️ 1× !important
  - Props: `background: `
- 🔴 inline_html `public/services.html` line 228 ⚠️ 1× !important
  - Props: `background: linear-gradient(180deg,rgba(255,255,255,.94),rgba(16,25,39,.25),rgba(5,8,13,.92))!important`

#### `footer`
- 🔴 inline_html `public/about.html` line 185
  - Props: `padding: 56px 0; background: #050a12; color: #f6f2ec`
- 🔴 inline_html `public/about.html` line 285
  - Props: `background: #f7f1ea;color:#172033;border-top:1px solid rgba(23,32,51,.1)`
- 🔴 inline_html `public/about.html` line 406 ⚠️ 1× !important
  - Props: `margin-top: 0!important`
- 🔴 inline_html `public/about.html` line 527 ⚠️ 4× !important
  - Props: `background: #fbf7f1!important;color:#172033!important;border-top:1px solid rgba(23,32,51,.08)!important;padding:70px 0!important`
- 🔴 inline_html `public/adopt.html` line 1356 ⚠️ 4× !important
  - Props: `background: #fbf7f1!important;color:#172033!important;border-top:1px solid rgba(23,32,51,.08)!important;padding:70px 0!important`
- 🔴 inline_html `public/services.html` line 360 ⚠️ 4× !important
  - Props: `background: #fbf7f1!important;color:#172033!important;border-top:1px solid rgba(23,32,51,.08)!important;padding:70px 0!important`

#### `footer .container.footer-grid`
- 🔴 inline_html `public/about.html` line 528 ⚠️ 6× !important
  - Props: `width: min(var(--shell-max),calc(100% - 48px))!important;margin:0 auto!important;display:grid!important;grid-template-columns:1.2fr .75fr .9fr .75fr!important;gap:34px!important;align-items:start!important`
- 🔴 inline_html `public/about.html` line 540 ⚠️ 1× !important
  - Props: `grid-template-columns: 1fr!important`
- 🔴 inline_html `public/adopt.html` line 1357 ⚠️ 6× !important
  - Props: `width: min(var(--shell-max),calc(100% - 48px))!important;margin:0 auto!important;display:grid!important;grid-template-columns:1.2fr .75fr .9fr .75fr!important;gap:34px!important;align-items:start!important`
- 🔴 inline_html `public/adopt.html` line 1369 ⚠️ 1× !important
  - Props: `grid-template-columns: 1fr!important`
- 🔴 inline_html `public/services.html` line 361 ⚠️ 6× !important
  - Props: `width: min(var(--shell-max),calc(100% - 48px))!important;margin:0 auto!important;display:grid!important;grid-template-columns:1.2fr .75fr .9fr .75fr!important;gap:34px!important;align-items:start!important`
- 🔴 inline_html `public/services.html` line 373 ⚠️ 1× !important
  - Props: `grid-template-columns: 1fr!important`

#### `.container`
- 📄 shared_css `public/_shared.css` line 99
  - Props: `width: 100%`, `max-width: 1200px`, `margin: 0 auto`, `padding: 0 2rem`
- 📄 shared_css `public/_shared.css` line 610
  - Props: `padding: 0 1.25rem`
- 📄 shared_css `public/_shared.css` line 776
  - Props: `width: min(var(--cpas-container), calc(100vw - 48px))`, `margin-inline: auto`
- 📄 shared_css `public/_shared.css` line 1136
  - Props: `width: min(var(--cpas-container), calc(100vw - 32px))`
- 🔴 inline_html `public/about.html` line 83
  - Props: `width: min(var(--container), calc(100vw - 40px)); margin: 0 auto`

#### `.footer-links`
- 📄 shared_css `public/_shared.css` line 271
  - Props: `list-style: none`, `display: flex`, `flex-direction: column`, `gap: 0.6rem`
- 🔴 inline_html `public/about.html` line 242
  - Props: `display: grid; grid-template-columns: 1fr 1fr; gap: 0 18px`
- 🔴 inline_html `public/about.html` line 530 ⚠️ 3× !important
  - Props: `display: flex!important;flex-direction:column!important;gap:10px!important`
- 🔴 inline_html `public/adopt.html` line 1359 ⚠️ 3× !important
  - Props: `display: flex!important;flex-direction:column!important;gap:10px!important`
- 🔴 inline_html `public/services.html` line 363 ⚠️ 3× !important
  - Props: `display: flex!important;flex-direction:column!important;gap:10px!important`

#### `.card`
- 📄 shared_css `public/_shared.css` line 355
  - Props: `background: var(--surface)`, `border: 1px solid var(--border)`, `border-radius: 16px`, `overflow: hidden`, `transition: transform 0.3s var(--ease), border-color 0.3s`
- 🔴 inline_html `public/about.html` line 161
  - Props: `border-radius: var(--radius-lg); overflow: hidden; border: 1px solid var(--line); background: var(--surface); box-shadow: var(--shadow-soft)`
- 🔴 inline_html `public/admin/dashboard.html` line 28
  - Props: `background: linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.035));border:1px solid var(--line);border-radius:var(--radius);padding:18px;box-shadow:0 20px 80px rgba(0,0,0,.26)`
- 🔴 inline_html `public/admin/index.html` line 9
  - Props: `width: min(420px,92vw);background:white;border:1px solid #f1d6dc;border-radius:24px;box-shadow:0 18px 50px rgba(231,37,53,.12);padding:32px`
- 🔴 inline_html `public/admin/reset-password.html` line 6
  - Props: `width: min(430px,92vw);padding:34px;border:1px solid rgba(255,255,255,.14);border-radius:24px;background:rgba(18,25,36,.76);box-shadow:0 40px 110px rgba(0,0,0,.45)`

#### `.site-header .brand`
- 📄 shared_css `public/_shared.css` line 647
  - Props: `display: inline-flex`, `align-items: center`, `text-decoration: none`, `flex-shrink: 0`
- 📄 shared_css `public/_shared.css` line 969
  - Props: `display: inline-flex`, `align-items: center`, `text-decoration: none`, `flex-shrink: 0`
- 🔴 inline_html `public/about.html` line 512 ⚠️ 6× !important
  - Props: `display: flex!important;align-items:center!important;width:122px!important;height:58px!important;text-decoration:none!important;flex:0 0 auto!important`
- 🔴 inline_html `public/adopt.html` line 1341 ⚠️ 6× !important
  - Props: `display: flex!important;align-items:center!important;width:122px!important;height:58px!important;text-decoration:none!important;flex:0 0 auto!important`
- 🔴 inline_html `public/services.html` line 345 ⚠️ 6× !important
  - Props: `display: flex!important;align-items:center!important;width:122px!important;height:58px!important;text-decoration:none!important;flex:0 0 auto!important`

#### `.site-header .desktop-links a`
- 📄 shared_css `public/_shared.css` line 668
  - Props: `display: inline-flex`, `align-items: center`, `min-height: 38px`, `padding: 0 15px`, `border-radius: 14px`, `text-decoration: none`
- 📄 shared_css `public/_shared.css` line 990
  - Props: `display: inline-flex`, `align-items: center`, `min-height: 38px`, `padding: 0 15px`, `border-radius: 13px`, `text-decoration: none`
- 🔴 inline_html `public/about.html` line 520 ⚠️ 12× !important
  - Props: `display: inline-flex!important;align-items:center!important;justify-content:center!important;color:#172033!important;text-decoration:none!important;opacity:.74!important;padding:0!important;margin:0!important;background:transparent!important;border:0!important;box-shadow:none!important;transition:.2s ease!important`
- 🔴 inline_html `public/adopt.html` line 1349 ⚠️ 12× !important
  - Props: `display: inline-flex!important;align-items:center!important;justify-content:center!important;color:#172033!important;text-decoration:none!important;opacity:.74!important;padding:0!important;margin:0!important;background:transparent!important;border:0!important;box-shadow:none!important;transition:.2s ease!important`
- 🔴 inline_html `public/services.html` line 353 ⚠️ 12× !important
  - Props: `display: inline-flex!important;align-items:center!important;justify-content:center!important;color:#172033!important;text-decoration:none!important;opacity:.74!important;padding:0!important;margin:0!important;background:transparent!important;border:0!important;box-shadow:none!important;transition:.2s ease!important`

#### `.site-header .desktop-links .donate-link`
- 📄 shared_css `public/_shared.css` line 685
  - Props: `min-height: 42px`, `padding: 0 24px`, `border-radius: 16px`, `border: 1px solid rgba(255, 255, 255, 0.18)`, `background: `, `color: #fff`
- 📄 shared_css `public/_shared.css` line 1007
  - Props: `min-height: 42px`, `padding: 0 24px`, `border-radius: 15px`, `border: 1px solid rgba(255,255,255,0.18)`, `background: `, `color: #fff`
- 🔴 inline_html `public/about.html` line 524 ⚠️ 7× !important
  - Props: `opacity: 1!important;padding:15px 22px!important;border-radius:18px!important;color:#fff!important;background:rgba(109,85,147,.9)!important;border:1px solid rgba(109,85,147,.28)!important;box-shadow:0 16px 38px rgba(109,85,147,.18)!important`
- 🔴 inline_html `public/adopt.html` line 1353 ⚠️ 7× !important
  - Props: `opacity: 1!important;padding:15px 22px!important;border-radius:18px!important;color:#fff!important;background:rgba(109,85,147,.9)!important;border:1px solid rgba(109,85,147,.28)!important;box-shadow:0 16px 38px rgba(109,85,147,.18)!important`
- 🔴 inline_html `public/services.html` line 357 ⚠️ 7× !important
  - Props: `opacity: 1!important;padding:15px 22px!important;border-radius:18px!important;color:#fff!important;background:rgba(109,85,147,.9)!important;border:1px solid rgba(109,85,147,.28)!important;box-shadow:0 16px 38px rgba(109,85,147,.18)!important`

#### `h1`
- 📄 shared_css `public/_shared.css` line 83
  - Props: `font-size: clamp(2.8rem, 7vw, 5.5rem)`
- 🔴 inline_html `public/about.html` line 126
  - Props: `font-size: clamp(52px, 7.5vw, 104px); line-height: .9; max-width: 720px`
- 🔴 inline_html `public/admin/dashboard.html` line 26
  - Props: `font-size: 38px;line-height:1;margin:0 0 8px`
- 🔴 inline_html `public/admin/index.html` line 11
  - Props: `text-align: center;margin:0 0 8px;font-size:26px`

#### `.footer-grid`
- 📄 shared_css `public/_shared.css` line 239
  - Props: `display: grid`, `grid-template-columns: 1.6fr 1fr 1.4fr 1fr`, `gap: 3rem`, `padding-bottom: 3rem`, `border-bottom: 1px solid rgba(255,255,255,0.06)`
- 📄 shared_css `public/_shared.css` line 614
  - Props: `grid-template-columns: 1fr 1fr`, `gap: 2rem`
- 📄 shared_css `public/_shared.css` line 635
  - Props: `grid-template-columns: 1fr`
- 🔴 inline_html `public/about.html` line 187
  - Props: `display: grid; grid-template-columns: 1.2fr .75fr .75fr .8fr; gap: 28px; align-items: start`

#### `"] .site-main > .section:first-child`
- 📄 shared_css `public/_shared.css` line 796
  - Props: `padding-top: 0`
- 📄 shared_css `public/_shared.css` line 1150
  - Props: `padding-top: 0`
- 📄 shared_css `public/_shared.css` line 1223
  - Props: `padding-top: clamp(72px, 8vw, 112px)`
- 📄 shared_css `public/_shared.css` line 1228
  - Props: `padding-top: clamp(56px, 12vw, 88px)`

#### `p`
- 📄 shared_css `public/_shared.css` line 803
  - Props: `text-wrap: pretty`
- 🔴 inline_html `public/about.html` line 129
  - Props: `color: var(--muted); line-height: 1.75; font-size: 18px`
- 🔴 inline_html `public/admin/dashboard.html` line 27
  - Props: `color: var(--muted);line-height:1.5`
- 🔴 inline_html `public/admin/index.html` line 12
  - Props: `text-align: center;color:#60718f;margin:0 0 24px`

#### `*`
- 🔴 inline_html `public/about.html` line 66
  - Props: `box-sizing: border-box`
- 🔴 inline_html `public/admin/dashboard.html` line 16
  - Props: `box-sizing: border-box`
- 🔴 inline_html `public/admin/login.html` line 8
  - Props: `box-sizing: border-box`
- 🔴 inline_html `scripts/companionscpas_audit_report.html` line 7
  - Props: `box-sizing: border-box; margin: 0; padding: 0`

#### `.footer-logo`
- 🔴 inline_html `public/about.html` line 188
  - Props: `width: 150px; height: auto; margin-bottom: 18px`
- 🔴 inline_html `public/about.html` line 529 ⚠️ 4× !important
  - Props: `width: 150px!important;height:auto!important;object-fit:contain!important;margin-bottom:18px!important`
- 🔴 inline_html `public/adopt.html` line 1358 ⚠️ 4× !important
  - Props: `width: 150px!important;height:auto!important;object-fit:contain!important;margin-bottom:18px!important`
- 🔴 inline_html `public/services.html` line 362 ⚠️ 4× !important
  - Props: `width: 150px!important;height:auto!important;object-fit:contain!important;margin-bottom:18px!important`

#### `.developer img`
- 🔴 inline_html `public/about.html` line 194
  - Props: `width: 52px; height: 52px; object-fit: contain; border-radius: 999px`
- 🔴 inline_html `public/about.html` line 534 ⚠️ 3× !important
  - Props: `width: 54px!important;height:auto!important;object-fit:contain!important`
- 🔴 inline_html `public/adopt.html` line 1363 ⚠️ 3× !important
  - Props: `width: 54px!important;height:auto!important;object-fit:contain!important`
- 🔴 inline_html `public/services.html` line 367 ⚠️ 3× !important
  - Props: `width: 54px!important;height:auto!important;object-fit:contain!important`

#### `.gallery-grid`
- 🔴 inline_html `public/about.html` line 282
  - Props: `display: grid;grid-template-columns:1.1fr .9fr .9fr;gap:18px;margin:48px 0`
- 🔴 inline_html `public/about.html` line 372 ⚠️ 1× !important
  - Props: `margin-bottom: 0!important`
- 🔴 inline_html `public/adopt.html` line 556
  - Props: `display: grid`, `grid-template-columns: repeat(auto-fit, minmax(200px, 1fr))`, `gap: 24px`, `margin-top: 40px`
- 🔴 inline_html `public/adopt.html` line 601
  - Props: `grid-template-columns: 1fr`, `gap: 20px`

#### `footer h3`
- 🔴 inline_html `public/about.html` line 287
  - Props: `color: #172033`
- 🔴 inline_html `public/about.html` line 532 ⚠️ 4× !important
  - Props: `color: #172033!important;font-size:28px!important;line-height:1!important;margin:0 0 14px!important`
- 🔴 inline_html `public/adopt.html` line 1361 ⚠️ 4× !important
  - Props: `color: #172033!important;font-size:28px!important;line-height:1!important;margin:0 0 14px!important`
- 🔴 inline_html `public/services.html` line 365 ⚠️ 4× !important
  - Props: `color: #172033!important;font-size:28px!important;line-height:1!important;margin:0 0 14px!important`

#### `body::before`
- 🔴 inline_html `public/adopt.html` line 999
  - Props: `content: ""`, `position: fixed`, `inset: 0`, `pointer-events: none`, `z-index: -1`, `background: `
- 🔴 inline_html `public/adopt.html` line 1083
  - Props: `transition: none`
- 🔴 inline_html `public/services.html` line 145
  - Props: `content: ""`, `position: fixed`, `inset: 0`, `pointer-events: none`, `z-index: -1`, `background: `
- 🔴 inline_html `public/services.html` line 229
  - Props: `transition: none`

#### `.cpas-contact-grid`
- 🔴 inline_html `public/adopt.html` line 1069
  - Props: `display: grid;grid-template-columns:1fr 1fr;gap:14px`
- 🔴 inline_html `public/adopt.html` line 1082
  - Props: `grid-template-columns: 1fr`
- 🔴 inline_html `public/services.html` line 215
  - Props: `display: grid;grid-template-columns:1fr 1fr;gap:14px`
- 🔴 inline_html `public/services.html` line 228
  - Props: `grid-template-columns: 1fr`

<details>
<summary>171 more duplicate selectors</summary>


#### `*, *::before, *::after`
- 📄 shared_css `public/_shared.css` line 55
  - Props: `box-sizing: border-box; margin: 0; padding: 0`
- 🔴 inline_html `public/dashboard/index.html` line 14
  - Props: `box-sizing: border-box; margin: 0; padding: 0`
- 🔴 inline_html `public/dashboard.html` line 14
  - Props: `box-sizing: border-box; margin: 0; padding: 0`

#### `.section`
- 📄 shared_css `public/_shared.css` line 107
  - Props: `padding: 6rem 0`
- 📄 shared_css `public/_shared.css` line 611
  - Props: `padding: 4rem 0`
- 🔴 inline_html `public/about.html` line 149
  - Props: `padding: 84px 0`

#### `.btn`
- 📄 shared_css `public/_shared.css` line 111
  - Props: `display: inline-flex`, `align-items: center`, `gap: 8px`, `padding: 0.65rem 1.5rem`, `border-radius: 100px`, `font-family: var(--font-body)`
- 🔴 inline_html `public/about.html` line 139
  - Props: `border: 1px solid var(--line); border-radius: var(--radius-cta); min-height: 58px; padding: 0 26px; display: inline-flex; align-items: center; justify-content: center; gap: 10px; font-weight: 900; cursor: pointer; transition: transform .2s ease, box-shadow .2s ease, background .2s ease`
- 🔴 inline_html `public/admin/dashboard.html` line 27
  - Props: `border: 0;border-radius:14px;padding:12px 16px;color:white;font-weight:800;background:linear-gradient(135deg,var(--purple),var(--purple2));box-shadow:0 16px 40px rgba(139,92,246,.28);cursor:pointer`

#### `.hero-actions`
- 📄 shared_css `public/_shared.css` line 421
  - Props: `display: flex`, `gap: 1rem`, `margin-top: 2.25rem`, `flex-wrap: wrap`
- 📄 shared_css `public/_shared.css` line 1388
  - Props: `display: flex`, `flex-wrap: wrap`, `gap: 0.75rem`, `align-items: center`
- 🔴 inline_html `public/about.html` line 137
  - Props: `display: flex; flex-wrap: wrap; gap: 16px; margin-top: 30px`

#### `.site-header .header-inner`
- 📄 shared_css `public/_shared.css` line 701
  - Props: `min-height: 70px`, `display: flex`, `justify-content: space-between`, `gap: 16px`
- 📄 shared_css `public/_shared.css` line 829
  - Props: `min-height: var(--cpas-header-h)`, `display: grid`, `grid-template-columns: minmax(132px, 1fr) auto minmax(132px, 1fr)`, `align-items: center`, `gap: 28px`
- 📄 shared_css `public/_shared.css` line 1152
  - Props: `min-height: var(--cpas-header-h)`, `display: flex`, `justify-content: space-between`, `gap: 16px`

#### `.mobile-menu-panel`
- 📄 shared_css `public/_shared.css` line 1071
  - Props: `position: fixed`, `top: calc(var(--cpas-header-h) + 12px)`, `right: 12px`, `z-index: 79`, `width: clamp(220px, 42vw, 360px)`, `max-width: calc(100vw - 24px)`
- 📄 shared_css `public/_shared.css` line 1175
  - Props: `top: 82px`, `width: clamp(218px, 58vw, 340px)`
- 📄 shared_css `public/_shared.css` line 1183
  - Props: `width: min(78vw, 320px)`

#### `.brand img`
- 🔴 inline_html `public/about.html` line 103
  - Props: `width: var(--logo-size); height: var(--logo-size); object-fit: contain; filter: drop-shadow(0 10px 24px rgba(0,0,0,.26))`
- 🔴 inline_html `public/about.html` line 230
  - Props: `width: var(--logo-size-mobile); height: var(--logo-size-mobile)`
- 🔴 inline_html `public/admin/dashboard.html` line 23
  - Props: `width: 48px;height:48px;object-fit:contain`

#### `.modal`
- 🔴 inline_html `public/about.html` line 198
  - Props: `width: min(780px, 100%); max-height: calc(100dvh - 40px); background: linear-gradient(180deg, #fff, #f5f0fb); color: #172033; border-radius: 30px; box-shadow: 0 40px 120px rgba(0,0,0,.48); position: relative; overflow: hidden; display: grid; grid-template-rows: auto 1fr`
- 🔴 inline_html `public/about.html` line 244
  - Props: `max-height: calc(100dvh - 24px)`
- 🔴 inline_html `public/adopt.html` line 742 ⚠️ 1× !important
  - Props: `max-height: 95vh !important`

#### `html, body, body, p, a, button, input, select, textarea, label, li, span, small, strong, em, td, th, dd, dt`
- 🔴 inline_html `public/about.html` line 248
  - Props: `font-family: var(--font-body)`
- 🔴 inline_html `public/adopt.html` line 890
  - Props: `font-family: var(--font-body)`
- 🔴 inline_html `public/services.html` line 36
  - Props: `font-family: var(--font-body)`

#### `h1, h2, h3, .hero-title, .section-title`
- 🔴 inline_html `public/about.html` line 255
  - Props: `font-family: var(--font-display)`, `letter-spacing: -0.055em`
- 🔴 inline_html `public/adopt.html` line 896
  - Props: `font-family: var(--font-display)`, `letter-spacing: -0.055em`
- 🔴 inline_html `public/services.html` line 42
  - Props: `font-family: var(--font-display)`, `letter-spacing: -0.055em`

#### `code, pre, kbd, samp, .mono, .id, [data-mono]`
- 🔴 inline_html `public/about.html` line 260
  - Props: `font-family: var(--font-mono)`
- 🔴 inline_html `public/adopt.html` line 901
  - Props: `font-family: var(--font-mono)`
- 🔴 inline_html `public/services.html` line 47
  - Props: `font-family: var(--font-mono)`

#### `.progress-line`
- 🔴 inline_html `public/about.html` line 280
  - Props: `height: 12px;border-radius:999px;background:rgba(255,255,255,.14);overflow:hidden;margin:18px 0 10px`
- 🔴 inline_html `public/adopt.html` line 685
  - Props: `width: 60px`, `height: 2px`, `background: #e2e8f0`, `transition: background 0.3s`
- 🔴 inline_html `public/adopt.html` line 738
  - Props: `width: 30px`

#### `.cpas-donate-panel`
- 🔴 inline_html `public/about.html` line 421
  - Props: `width: min(620px,100%)`, `max-height: 92vh`, `overflow: auto`, `border-radius: 30px`, `background: linear-gradient(180deg,#fff,#f7f1ea)`, `color: #172033`
- 🔴 inline_html `public/adopt.html` line 1196
  - Props: `width: min(780px,96vw);max-height:90vh;overflow:auto;border-radius:30px`, `background: rgba(13,20,33,.90);border:1px solid rgba(255,255,255,.13)`, `box-shadow: 0 40px 140px rgba(0,0,0,.56), inset 0 1px 0 rgba(255,255,255,.08)`, `color: #F8F7FF;padding:28px;position:relative`
- 🔴 inline_html `public/adopt.html` line 1225
  - Props: `padding: 22px`

#### `.cpas-close`
- 🔴 inline_html `public/about.html` line 443
  - Props: `position: absolute`, `right: 18px`, `top: 18px`, `border: 0`, `width: 42px`, `height: 42px`
- 🔴 inline_html `public/adopt.html` line 1068
  - Props: `border: 1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:white;border-radius:14px;padding:10px 12px;cursor:pointer`
- 🔴 inline_html `public/services.html` line 214
  - Props: `border: 1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:white;border-radius:14px;padding:10px 12px;cursor:pointer`

#### `.cpas-submit`
- 🔴 inline_html `public/about.html` line 492
  - Props: `width: 100%`, `height: 58px`, `margin-top: 22px`, `border: 0`, `border-radius: 16px`, `background: #7c3aed`
- 🔴 inline_html `public/adopt.html` line 1079
  - Props: `margin-top: 14px;width:100%;border:0;border-radius:16px;padding:15px;background:linear-gradient(135deg,#6D5593,#8B74B7);color:white;font-weight:900;cursor:pointer`
- 🔴 inline_html `public/services.html` line 225
  - Props: `margin-top: 14px;width:100%;border:0;border-radius:16px;padding:15px;background:linear-gradient(135deg,#6D5593,#8B74B7);color:white;font-weight:900;cursor:pointer`

#### `.site-header.scrolled,body[data-theme="dark"] .site-header`
- 🔴 inline_html `public/about.html` line 510 ⚠️ 4× !important
  - Props: `background: rgba(5,10,18,.78)!important;border-bottom:1px solid rgba(255,255,255,.08)!important;box-shadow:0 18px 60px rgba(0,0,0,.34)!important;backdrop-filter:blur(22px)!important`
- 🔴 inline_html `public/adopt.html` line 1339 ⚠️ 4× !important
  - Props: `background: rgba(5,10,18,.78)!important;border-bottom:1px solid rgba(255,255,255,.08)!important;box-shadow:0 18px 60px rgba(0,0,0,.34)!important;backdrop-filter:blur(22px)!important`
- 🔴 inline_html `public/services.html` line 343 ⚠️ 4× !important
  - Props: `background: rgba(5,10,18,.78)!important;border-bottom:1px solid rgba(255,255,255,.08)!important;box-shadow:0 18px 60px rgba(0,0,0,.34)!important;backdrop-filter:blur(22px)!important`

#### `.logo-wrap`
- 🔴 inline_html `public/about.html` line 513 ⚠️ 4× !important
  - Props: `position: relative!important;display:block!important;width:122px!important;height:58px!important`
- 🔴 inline_html `public/adopt.html` line 1342 ⚠️ 4× !important
  - Props: `position: relative!important;display:block!important;width:122px!important;height:58px!important`
- 🔴 inline_html `public/services.html` line 346 ⚠️ 4× !important
  - Props: `position: relative!important;display:block!important;width:122px!important;height:58px!important`

#### `.site-header .logo`
- 🔴 inline_html `public/about.html` line 514 ⚠️ 7× !important
  - Props: `position: absolute!important;inset:0!important;width:122px!important;height:58px!important;object-fit:contain!important;transition:opacity .2s ease!important;filter:drop-shadow(0 10px 24px rgba(0,0,0,.18))!important`
- 🔴 inline_html `public/adopt.html` line 1343 ⚠️ 7× !important
  - Props: `position: absolute!important;inset:0!important;width:122px!important;height:58px!important;object-fit:contain!important;transition:opacity .2s ease!important;filter:drop-shadow(0 10px 24px rgba(0,0,0,.18))!important`
- 🔴 inline_html `public/services.html` line 347 ⚠️ 7× !important
  - Props: `position: absolute!important;inset:0!important;width:122px!important;height:58px!important;object-fit:contain!important;transition:opacity .2s ease!important;filter:drop-shadow(0 10px 24px rgba(0,0,0,.18))!important`

#### `body[data-theme="light"] .site-header:not(.scrolled) .logo-dark`
- 🔴 inline_html `public/about.html` line 515 ⚠️ 1× !important
  - Props: `opacity: 1!important`
- 🔴 inline_html `public/adopt.html` line 1344 ⚠️ 1× !important
  - Props: `opacity: 1!important`
- 🔴 inline_html `public/services.html` line 348 ⚠️ 1× !important
  - Props: `opacity: 1!important`

#### `body[data-theme="light"] .site-header:not(.scrolled) .logo-light`
- 🔴 inline_html `public/about.html` line 516 ⚠️ 1× !important
  - Props: `opacity: 0!important`
- 🔴 inline_html `public/adopt.html` line 1345 ⚠️ 1× !important
  - Props: `opacity: 0!important`
- 🔴 inline_html `public/services.html` line 349 ⚠️ 1× !important
  - Props: `opacity: 0!important`

#### `body[data-theme="dark"] .site-header .logo-light,.site-header.scrolled .logo-light`
- 🔴 inline_html `public/about.html` line 517 ⚠️ 1× !important
  - Props: `opacity: 1!important`
- 🔴 inline_html `public/adopt.html` line 1346 ⚠️ 1× !important
  - Props: `opacity: 1!important`
- 🔴 inline_html `public/services.html` line 350 ⚠️ 1× !important
  - Props: `opacity: 1!important`

#### `body[data-theme="dark"] .site-header .logo-dark,.site-header.scrolled .logo-dark`
- 🔴 inline_html `public/about.html` line 518 ⚠️ 1× !important
  - Props: `opacity: 0!important`
- 🔴 inline_html `public/adopt.html` line 1347 ⚠️ 1× !important
  - Props: `opacity: 0!important`
- 🔴 inline_html `public/services.html` line 351 ⚠️ 1× !important
  - Props: `opacity: 0!important`

#### `.site-header .desktop-links a:hover,.site-header .desktop-links a.active`
- 🔴 inline_html `public/about.html` line 521 ⚠️ 3× !important
  - Props: `opacity: 1!important;color:#111827!important;text-shadow:0 0 22px rgba(109,85,147,.38)!important`
- 🔴 inline_html `public/adopt.html` line 1350 ⚠️ 3× !important
  - Props: `opacity: 1!important;color:#111827!important;text-shadow:0 0 22px rgba(109,85,147,.38)!important`
- 🔴 inline_html `public/services.html` line 354 ⚠️ 3× !important
  - Props: `opacity: 1!important;color:#111827!important;text-shadow:0 0 22px rgba(109,85,147,.38)!important`

#### `body[data-theme="dark"] .site-header .desktop-links a,.site-header.scrolled .desktop-links a`
- 🔴 inline_html `public/about.html` line 522 ⚠️ 2× !important
  - Props: `color: #e9edf7!important;opacity:.72!important`
- 🔴 inline_html `public/adopt.html` line 1351 ⚠️ 2× !important
  - Props: `color: #e9edf7!important;opacity:.72!important`
- 🔴 inline_html `public/services.html` line 355 ⚠️ 2× !important
  - Props: `color: #e9edf7!important;opacity:.72!important`

#### `body[data-theme="dark"] .site-header .desktop-links a:hover,body[data-theme="dark"] .site-header .desktop-links a.active,.site-header.scrolled .desktop-links a:hover,.site-header.scrolled .desktop-links a.active`
- 🔴 inline_html `public/about.html` line 523 ⚠️ 3× !important
  - Props: `opacity: 1!important;color:#fff!important;text-shadow:0 0 24px rgba(139,116,183,.75)!important`
- 🔴 inline_html `public/adopt.html` line 1352 ⚠️ 3× !important
  - Props: `opacity: 1!important;color:#fff!important;text-shadow:0 0 24px rgba(139,116,183,.75)!important`
- 🔴 inline_html `public/services.html` line 356 ⚠️ 3× !important
  - Props: `opacity: 1!important;color:#fff!important;text-shadow:0 0 24px rgba(139,116,183,.75)!important`

#### `body[data-theme="light"] .site-header:not(.scrolled) .desktop-links .donate-link`
- 🔴 inline_html `public/about.html` line 525 ⚠️ 3× !important
  - Props: `color: #172033!important;background:rgba(255,255,255,.72)!important;border:1px solid rgba(23,32,51,.11)!important`
- 🔴 inline_html `public/adopt.html` line 1354 ⚠️ 3× !important
  - Props: `color: #172033!important;background:rgba(255,255,255,.72)!important;border:1px solid rgba(23,32,51,.11)!important`
- 🔴 inline_html `public/services.html` line 358 ⚠️ 3× !important
  - Props: `color: #172033!important;background:rgba(255,255,255,.72)!important;border:1px solid rgba(23,32,51,.11)!important`

#### `.footer-links a,footer p,footer span`
- 🔴 inline_html `public/about.html` line 531 ⚠️ 4× !important
  - Props: `color: #4b5563!important;text-decoration:none!important;font-weight:700!important;line-height:1.7!important`
- 🔴 inline_html `public/adopt.html` line 1360 ⚠️ 4× !important
  - Props: `color: #4b5563!important;text-decoration:none!important;font-weight:700!important;line-height:1.7!important`
- 🔴 inline_html `public/services.html` line 364 ⚠️ 4× !important
  - Props: `color: #4b5563!important;text-decoration:none!important;font-weight:700!important;line-height:1.7!important`

#### `html,body`
- 🔴 inline_html `public/about.html` line 547 ⚠️ 1× !important
  - Props: `margin: 0!important`
- 🔴 inline_html `public/adopt.html` line 1376 ⚠️ 1× !important
  - Props: `margin: 0!important`
- 🔴 inline_html `public/services.html` line 380 ⚠️ 1× !important
  - Props: `margin: 0!important`

#### `main,.page,section:first-of-type`
- 🔴 inline_html `public/about.html` line 561 ⚠️ 1× !important
  - Props: `margin-top: 0!important`
- 🔴 inline_html `public/adopt.html` line 1390 ⚠️ 1× !important
  - Props: `margin-top: 0!important`
- 🔴 inline_html `public/services.html` line 394 ⚠️ 1× !important
  - Props: `margin-top: 0!important`

#### `input`
- 🔴 inline_html `public/admin/index.html` line 14
  - Props: `width: 100%;box-sizing:border-box;border:1px solid #f1d6dc;border-radius:14px;padding:14px;font-size:16px`
- 🔴 inline_html `public/admin/login.html` line 50
  - Props: `width: 100%`, `border: 0`, `outline: 0`, `background: transparent`, `color: #fff`, `font-size: 18px`
- 🔴 inline_html `public/admin/reset-password.html` line 8
  - Props: `background: rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);color:white`

#### `button`
- 🔴 inline_html `public/admin/index.html` line 15
  - Props: `width: 100%;margin-top:20px;border:0;border-radius:14px;padding:14px 16px;background:#e72535;color:white;font-weight:800;font-size:16px;cursor:pointer`
- 🔴 inline_html `public/admin/login.html` line 61
  - Props: `border: 0`, `background: transparent`, `color: #a985ff`, `font-size: 20px`, `font-weight: 900`, `letter-spacing: .08em`
- 🔴 inline_html `public/admin/reset-password.html` line 9
  - Props: `border: 0;background:#6D5593;color:white;font-weight:900`

#### `.animals-grid`
- 🔴 inline_html `public/adopt.html` line 13
  - Props: `display: grid`, `grid-template-columns: 1fr`, `gap: 1.5rem`, `margin: 2rem 0`
- 🔴 inline_html `public/adopt.html` line 21
  - Props: `grid-template-columns: repeat(2, 1fr)`
- 🔴 inline_html `public/adopt.html` line 24
  - Props: `grid-template-columns: repeat(3, 1fr); gap: 1.75rem`

#### `.animal-stagger-item`
- 🔴 inline_html `public/adopt.html` line 160
  - Props: `display: grid`, `grid-template-columns: 1fr 1fr`, `gap: 4rem`, `align-items: center`, `margin-bottom: 100px`, `min-height: 500px`
- 🔴 inline_html `public/adopt.html` line 401
  - Props: `gap: 3rem`, `margin-bottom: 80px`, `min-height: 400px`
- 🔴 inline_html `public/adopt.html` line 413 ⚠️ 1× !important
  - Props: `grid-template-columns: 1fr`, `gap: 2rem`, `margin-bottom: 60px`, `min-height: auto`, `direction: ltr !important`

#### `.animal-stagger-name`
- 🔴 inline_html `public/adopt.html` line 213
  - Props: `font-size: 42px`, `font-weight: 800`, `margin-bottom: 12px`, `color: var(--ink)`, `line-height: 1.2`
- 🔴 inline_html `public/adopt.html` line 406
  - Props: `font-size: 36px`
- 🔴 inline_html `public/adopt.html` line 424
  - Props: `font-size: 32px`

#### `to`
- 🔴 inline_html `public/adopt.html` line 707
  - Props: `opacity: 1`, `transform: translateY(0)`
- 🔴 inline_html `public/adopt.html` line 825
  - Props: `transform: rotate(360deg)`
- 🔴 inline_html `public/services.html` line 23
  - Props: `transform: rotate(360deg)`

#### `#donationamountother:focus`
- 🔴 inline_html `public/adopt.html` line 767
  - Props: `outline: none`, `border-color: var(--accent)`, `box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.15)`
- 🔴 inline_html `public/adopt.html` line 834
  - Props: `outline: none`, `border-color: var(--accent)`, `box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.15)`
- 🔴 inline_html `public/services.html` line 20
  - Props: `outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.15)`

#### `.cpas-donate-msg`
- 🔴 inline_html `public/adopt.html` line 1223
  - Props: `margin-top: 12px;color:#C7A7FF;font-weight:800`
- 🔴 inline_html `public/adopt.html` line 1324 ⚠️ 1× !important
  - Props: `color: #6D5593 !important`
- 🔴 inline_html `public/services.html` line 328 ⚠️ 1× !important
  - Props: `color: #6D5593 !important`

#### `html`
- 📄 shared_css `public/_shared.css` line 58
  - Props: `scroll-behavior: smooth`
- 🔴 inline_html `public/about.html` line 68
  - Props: `scroll-behavior: smooth`

#### `h2`
- 📄 shared_css `public/_shared.css` line 85
  - Props: `font-size: clamp(2rem, 4.5vw, 3.5rem)`
- 🔴 inline_html `public/about.html` line 127
  - Props: `font-size: clamp(38px, 5vw, 72px); line-height: .94`

#### `h3`
- 📄 shared_css `public/_shared.css` line 86
  - Props: `font-size: clamp(1.25rem, 2.5vw, 1.75rem)`
- 🔴 inline_html `public/about.html` line 128
  - Props: `font-size: clamp(24px, 2.5vw, 36px); line-height: 1.02`

#### `.eyebrow`
- 📄 shared_css `public/_shared.css` line 87
  - Props: `font-family: var(--font-body)`, `font-size: 11px`, `font-weight: 500`, `letter-spacing: 0.12em`, `text-transform: uppercase`, `color: var(--purple-light)`
- 🔴 inline_html `public/about.html` line 124
  - Props: `color: var(--rose); letter-spacing: .22em; text-transform: uppercase; font-weight: 900; font-size: 13px`

#### `.btn:hover`
- 📄 shared_css `public/_shared.css` line 127
  - Props: `transform: translateY(-1px); opacity: 0.92`
- 🔴 inline_html `public/about.html` line 140
  - Props: `transform: translateY(-2px)`

#### `.btn-primary`
- 📄 shared_css `public/_shared.css` line 130
  - Props: `background: var(--btn-primary-bg)`, `color: var(--btn-primary-text)`
- 🔴 inline_html `public/about.html` line 141
  - Props: `background: linear-gradient(135deg, var(--purple), var(--purple-strong)); color: #fff; box-shadow: 0 18px 42px rgba(134,100,183,.34)`

#### `.site-nav`
- 📄 shared_css `public/_shared.css` line 180
  - Props: `display: flex`, `align-items: center`, `gap: 0.25rem`, `list-style: none`
- 📄 shared_css `public/_shared.css` line 612
  - Props: `display: none`

#### `.site-footer`
- 📄 shared_css `public/_shared.css` line 229
  - Props: `background: #080c14`, `border-top: 1px solid rgba(255,255,255,0.06)`, `padding: 4rem 0 2.5rem`, `color: #9ca3af`, `font-size: 14px`, `font-weight: 300`
- 🔴 inline_html `public/about.html` line 317 ⚠️ 2× !important
  - Props: `margin-top: 0 !important`, `border-top: none !important`

#### `.footer-links a`
- 📄 shared_css `public/_shared.css` line 278
  - Props: `color: #6b7280`, `font-size: 13px`, `transition: color 0.2s`
- 🔴 inline_html `public/about.html` line 189
  - Props: `display: block; color: rgba(255,255,255,.72); margin: 10px 0; font-weight: 700`

#### `.footer-bottom`
- 📄 shared_css `public/_shared.css` line 326
  - Props: `padding-top: 2rem`, `display: flex`, `align-items: center`, `justify-content: space-between`, `gap: 1rem`
- 📄 shared_css `public/_shared.css` line 627
  - Props: `flex-direction: column`, `align-items: flex-start`

#### `.card-body`
- 📄 shared_css `public/_shared.css` line 375
  - Props: `padding: 1.25rem 1.5rem 1.5rem`
- 🔴 inline_html `public/about.html` line 163
  - Props: `padding: 22px`

#### `.hero-content`
- 📄 shared_css `public/_shared.css` line 402
  - Props: `position: relative`, `z-index: 2`, `max-width: 700px`
- 📄 shared_css `public/_shared.css` line 1349
  - Props: `max-width: 600px`

#### `.hero-badge`
- 📄 shared_css `public/_shared.css` line 408
  - Props: `display: inline-flex`, `align-items: center`, `gap: 8px`, `padding: 6px 14px`, `border: 1px solid var(--border)`, `border-radius: 100px`
- 📄 shared_css `public/_shared.css` line 1353
  - Props: `display: inline-flex`, `align-items: center`, `gap: 6px`, `font-size: 12px`, `font-weight: 600`, `letter-spacing: 0.08em`

#### `.section-text-image`
- 📄 shared_css `public/_shared.css` line 428
  - Props: `display: grid`, `grid-template-columns: 1fr 1fr`, `gap: 5rem`, `align-items: center`
- 📄 shared_css `public/_shared.css` line 619
  - Props: `grid-template-columns: 1fr`, `gap: 2.5rem`

#### `.section-text-image.image-right .text-col`
- 📄 shared_css `public/_shared.css` line 436
  - Props: `order: 1`
- 📄 shared_css `public/_shared.css` line 624
  - Props: `order: 2`

#### `.section-text-image.image-right .img-col`
- 📄 shared_css `public/_shared.css` line 438
  - Props: `order: 2`
- 📄 shared_css `public/_shared.css` line 626
  - Props: `order: 1`

#### `.animal-name`
- 📄 shared_css `public/_shared.css` line 592
  - Props: `font-weight: 500`, `font-size: 15px`, `color: var(--text-1)`
- 🔴 inline_html `public/adopt.html` line 309
  - Props: `font-size: 24px`, `font-weight: 800`, `margin-bottom: 8px`, `color: var(--ink)`

#### `.text-muted`
- 📄 shared_css `public/_shared.css` line 598
  - Props: `color: var(--text-2)`
- 📄 shared_css `public/_shared.css` line 807
  - Props: `color: var(--cpas-muted)`

#### `.site-header .nav`
- 📄 shared_css `public/_shared.css` line 637
  - Props: `min-height: 76px`, `display: flex`, `align-items: center`, `justify-content: space-between`, `gap: 24px`
- 📄 shared_css `public/_shared.css` line 960
  - Props: `min-height: var(--cpas-header-h)`, `display: flex`, `align-items: center`, `justify-content: space-between`, `gap: 24px`

#### `.site-header .brand img`
- 📄 shared_css `public/_shared.css` line 654
  - Props: `display: block`, `width: auto`, `height: 40px`, `max-width: 160px`, `object-fit: contain`
- 📄 shared_css `public/_shared.css` line 976
  - Props: `display: block`, `width: auto`, `height: 36px`, `max-width: 152px`, `object-fit: contain`

#### `.site-header .desktop-links a:hover, .site-header .desktop-links a.active`
- 📄 shared_css `public/_shared.css` line 679
  - Props: `color: #fff`, `background: rgba(255, 255, 255, 0.075)`
- 📄 shared_css `public/_shared.css` line 1001
  - Props: `color: #fff`, `background: rgba(255,255,255,0.08)`

#### `.site-header .logo-link img, .site-header .brand img`
- 📄 shared_css `public/_shared.css` line 712
  - Props: `height: 32px`, `max-width: 132px`
- 📄 shared_css `public/_shared.css` line 1165
  - Props: `height: 32px`, `max-width: 132px`

#### `.site-main > .section`
- 📄 shared_css `public/_shared.css` line 786
  - Props: `padding-block: clamp(76px, 9vw, 132px)`
- 📄 shared_css `public/_shared.css` line 1140
  - Props: `padding-block: clamp(64px, 14vw, 104px)`

#### `.site-main > .section:first-child`
- 📄 shared_css `public/_shared.css` line 790
  - Props: `padding-top: clamp(92px, 12vw, 164px)`
- 📄 shared_css `public/_shared.css` line 1144
  - Props: `padding-top: clamp(76px, 16vw, 116px)`

#### `.mobile-menu-toggle`
- 📄 shared_css `public/_shared.css` line 1017
  - Props: `display: none`, `position: relative`, `width: 44px`, `height: 44px`, `border: 1px solid rgba(255,255,255,0.14)`, `border-radius: 14px`
- 📄 shared_css `public/_shared.css` line 1171
  - Props: `display: inline-flex`

#### `"] .site-main > .section:first-child, body[data-route="home"] .site-main > .section:first-child, body.home .site-main > .section:first-child`
- 📄 shared_css `public/_shared.css` line 1278 ⚠️ 1× !important
  - Props: `padding-top: clamp(64px, 7vw, 104px) !important`
- 📄 shared_css `public/_shared.css` line 1295 ⚠️ 1× !important
  - Props: `padding-top: clamp(48px, 10vw, 76px) !important`

#### `.hero-media-bg img`
- 📄 shared_css `public/_shared.css` line 1319
  - Props: `width: 100%`, `height: 100%`, `object-fit: cover`, `object-position: center top`, `display: block`
- 📄 shared_css `public/_shared.css` line 1417
  - Props: `width: 55%`, `height: 100%`, `object-fit: cover`, `object-position: center top`, `position: absolute`, `right: 0`

#### `.hero-scrim`
- 📄 shared_css `public/_shared.css` line 1327
  - Props: `position: absolute`, `inset: 0`, `background: linear-gradient(`
- 📄 shared_css `public/_shared.css` line 1427
  - Props: `background: linear-gradient(`

#### `.hero-body`
- 📄 shared_css `public/_shared.css` line 1340
  - Props: `position: relative`, `z-index: 2`, `width: 100%`, `padding-top: 6rem`, `padding-bottom: 3.5rem`
- 📄 shared_css `public/_shared.css` line 1436
  - Props: `padding-top: 0`, `padding-bottom: 0`, `display: flex`, `align-items: center`, `min-height: 92vh`

#### `.hero-heading`
- 📄 shared_css `public/_shared.css` line 1370
  - Props: `font-family: var(--font-display)`, `font-size: clamp(2.6rem, 8vw, 4.8rem)`, `font-weight: 900`, `line-height: 0.95`, `letter-spacing: -0.04em`, `color: var(--text-1)`
- 📄 shared_css `public/_shared.css` line 1444
  - Props: `font-size: clamp(3rem, 5vw, 5.5rem)`

#### `.theme-light .hero-scrim`
- 📄 shared_css `public/_shared.css` line 1449
  - Props: `background: linear-gradient(`
- 📄 shared_css `public/_shared.css` line 1462
  - Props: `background: linear-gradient(`

#### `.nav`
- 🔴 inline_html `public/about.html` line 101
  - Props: `display: flex; align-items: center; justify-content: space-between; gap: 28px`
- 🔴 inline_html `public/admin/dashboard.html` line 23
  - Props: `display: grid;gap:8px`

#### `.desktop-links`
- 🔴 inline_html `public/about.html` line 104
  - Props: `display: flex; align-items: center; gap: 34px; color: #c5cedc; font-weight: 700`
- 🔴 inline_html `public/about.html` line 228
  - Props: `display: none`

#### `.hamburger`
- 🔴 inline_html `public/about.html` line 109
  - Props: `width: 54px; height: 54px; border: 0; background: transparent; display: none; place-items: center; cursor: pointer; position: relative`
- 🔴 inline_html `public/about.html` line 229
  - Props: `display: grid`

#### `.side-nav`
- 🔴 inline_html `public/about.html` line 116
  - Props: `position: fixed; top: var(--nav-h); right: 0; bottom: 0; width: min(50vw, 380px); min-width: 270px; z-index: 59; padding: 34px 28px; background: rgba(5,10,18,.88); border-left: 1px solid rgba(255,255,255,.14); backdrop-filter: blur(28px); transform: translateX(110%); transition: transform .32s ease; box-shadow: -24px 0 80px rgba(0,0,0,.42)`
- 🔴 inline_html `public/about.html` line 239
  - Props: `width: 50vw; min-width: 260px`

#### `.hero`
- 🔴 inline_html `public/about.html` line 120
  - Props: `position: relative; padding: 44px 0 74px`
- 🔴 inline_html `public/about.html` line 231
  - Props: `padding-top: 0`

#### `.hero-grid`
- 🔴 inline_html `public/about.html` line 122
  - Props: `display: grid; grid-template-columns: .93fr 1.07fr; min-height: 680px; border: 1px solid var(--line); border-radius: var(--radius-xl); overflow: hidden; background: linear-gradient(135deg, rgba(255,255,255,.82), rgba(255,255,255,.38)); box-shadow: var(--shadow-soft)`
- 🔴 inline_html `public/about.html` line 232
  - Props: `grid-template-columns: 1fr; border-radius: 0; width: 100vw; margin-left: calc(50% - 50vw); min-height: 0; border-inline: 0`

#### `.hero-copy`
- 🔴 inline_html `public/about.html` line 123
  - Props: `padding: clamp(34px, 6vw, 78px); display: flex; flex-direction: column; justify-content: center`
- 🔴 inline_html `public/about.html` line 234
  - Props: `text-align: center; align-items: center; padding: 42px 24px 56px`

#### `.hero-media`
- 🔴 inline_html `public/about.html` line 143
  - Props: `min-height: 680px; position: relative; background: #0a111d; overflow: hidden`
- 🔴 inline_html `public/about.html` line 233
  - Props: `order: -1; min-height: 390px`

#### `.cards`
- 🔴 inline_html `public/about.html` line 159
  - Props: `display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 34px`
- 🔴 inline_html `public/admin/dashboard.html` line 33
  - Props: `display: grid;grid-template-columns:repeat(4,1fr);gap:14px`

#### `.campaign`
- 🔴 inline_html `public/about.html` line 167
  - Props: `min-height: 500px; position: relative; border-radius: var(--radius-xl); overflow: hidden; border: 1px solid rgba(255,255,255,.18); box-shadow: var(--shadow-dark); display: flex; align-items: flex-end; background: #08111d; cursor: pointer`
- 🔴 inline_html `public/about.html` line 238
  - Props: `min-height: 460px`

#### `.modal-head`
- 🔴 inline_html `public/about.html` line 200
  - Props: `padding: 28px 30px 18px; text-align: center; border-bottom: 1px solid rgba(23,32,51,.1)`
- 🔴 inline_html `public/about.html` line 246
  - Props: `padding: 24px 58px 16px 18px`

#### `.modal-body`
- 🔴 inline_html `public/about.html` line 203
  - Props: `padding: 22px 28px 28px`
- 🔴 inline_html `public/about.html` line 245
  - Props: `padding: 18px`

#### `label`
- 🔴 inline_html `public/about.html` line 205
  - Props: `font-weight: 900; letter-spacing: .08em; text-transform: uppercase; font-size: 13px`
- 🔴 inline_html `public/admin/index.html` line 13
  - Props: `display: block;font-weight:700;margin:14px 0 6px`

#### `.two-col`
- 🔴 inline_html `public/about.html` line 209
  - Props: `display: grid; grid-template-columns: 1fr 1fr; gap: 14px`
- 🔴 inline_html `public/about.html` line 241
  - Props: `grid-template-columns: 1fr`

#### `.amounts`
- 🔴 inline_html `public/about.html` line 212
  - Props: `display: grid; grid-template-columns: repeat(4,1fr); gap: 10px`
- 🔴 inline_html `public/about.html` line 240
  - Props: `grid-template-columns: repeat(2,1fr)`

#### `.about-photo img`
- 🔴 inline_html `public/about.html` line 273
  - Props: `width: 100%;height:100%;min-height:570px;object-fit:cover;display:block`
- 🔴 inline_html `public/about.html` line 288
  - Props: `min-height: 360px`

#### `.about-stats`
- 🔴 inline_html `public/about.html` line 275
  - Props: `display: grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:28px`
- 🔴 inline_html `public/about.html` line 288
  - Props: `grid-template-columns: 1fr`

#### `.about-light`
- 🔴 inline_html `public/about.html` line 281
  - Props: `padding: 88px 0;color:#172033`
- 🔴 inline_html `public/about.html` line 368 ⚠️ 2× !important
  - Props: `padding-bottom: 0!important`, `margin-bottom: 0!important`

#### `.cpas-donate-modal`
- 🔴 inline_html `public/about.html` line 409
  - Props: `position: fixed`, `inset: 0`, `z-index: 100000`, `display: none`, `align-items: center`, `justify-content: center`
- 🔴 inline_html `public/adopt.html` line 1191
  - Props: `position: fixed;inset:0;z-index:9998;display:none;align-items:center;justify-content:center;padding:22px`, `background: rgba(0,0,0,.68);backdrop-filter:blur(18px)`

#### `.cpas-donate-modal.open`
- 🔴 inline_html `public/about.html` line 420
  - Props: `display: flex`
- 🔴 inline_html `public/adopt.html` line 1195
  - Props: `display: flex`

#### `.cpas-donate-head`
- 🔴 inline_html `public/about.html` line 430
  - Props: `position: relative`, `padding: 30px 30px 18px`, `text-align: center`, `border-bottom: 1px solid rgba(23,32,51,.1)`
- 🔴 inline_html `public/adopt.html` line 1209
  - Props: `display: flex;justify-content:space-between;gap:18px;align-items:flex-start;margin-bottom:20px`

#### `.cpas-donate-head p`
- 🔴 inline_html `public/about.html` line 442
  - Props: `color: #526174;font-weight:700`
- 🔴 inline_html `public/adopt.html` line 1211
  - Props: `margin: 0;color:rgba(255,255,255,.66)`

#### `.cpas-amounts`
- 🔴 inline_html `public/about.html` line 461
  - Props: `grid-template-columns: repeat(4,1fr)`
- 🔴 inline_html `public/adopt.html` line 1219
  - Props: `display: grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px`

#### `.app`
- 🔴 inline_html `public/admin/dashboard.html` line 21
  - Props: `min-height: 100vh;display:grid;grid-template-columns:290px 1fr`
- 🔴 inline_html `public/admin/dashboard.html` line 38
  - Props: `grid-template-columns: 1fr`

#### `.side`
- 🔴 inline_html `public/admin/dashboard.html` line 21
  - Props: `position: sticky;top:0;height:100vh;padding:28px 22px;background:rgba(5,8,18,.76);border-right:1px solid var(--line);backdrop-filter:blur(20px)`
- 🔴 inline_html `public/admin/dashboard.html` line 38
  - Props: `position: relative;height:auto`

#### `.main`
- 🔴 inline_html `public/admin/dashboard.html` line 25
  - Props: `padding: 30px 34px 60px`
- 🔴 inline_html `public/admin/dashboard.html` line 38
  - Props: `padding: 22px`

#### `.error`
- 🔴 inline_html `public/admin/index.html` line 16
  - Props: `display: none;margin-top:14px;color:#b91625;background:#fff1f2;border:1px solid #fecdd3;border-radius:12px;padding:10px`
- 🔴 inline_html `public/admin/login.html` line 80
  - Props: `display: none`, `margin: 22px 0 0 74px`, `color: #ff8ba0`, `font-weight: 800`, `font-size: 13px`

#### `.login-shell`
- 🔴 inline_html `public/admin/login.html` line 21
  - Props: `width: min(430px,92vw)`, `min-height: 720px`, `position: relative`, `overflow: hidden`, `border-radius: 20px`, `border: 1px solid rgba(255,255,255,.13)`
- 🔴 inline_html `public/admin/login.html` line 117
  - Props: `min-height: 680px`

#### `.inner`
- 🔴 inline_html `public/admin/login.html` line 32
  - Props: `position: relative;z-index:2;padding:78px 52px 38px`
- 🔴 inline_html `public/admin/login.html` line 118
  - Props: `padding: 62px 34px 38px`

#### `.logo`
- 🔴 inline_html `public/admin/login.html` line 33
  - Props: `display: block`, `width: 235px`, `max-width: 82%`, `margin: 0 auto 72px`, `filter: drop-shadow(0 16px 28px rgba(109,85,147,.45))`
- 🔴 inline_html `public/admin/login.html` line 119
  - Props: `width: 220px;margin-bottom:64px`

#### `.animal-stagger-item:nth-child(even)`
- 🔴 inline_html `public/adopt.html` line 169
  - Props: `direction: rtl`
- 🔴 inline_html `public/adopt.html` line 420
  - Props: `direction: ltr`

#### `.animal-stagger-image`
- 🔴 inline_html `public/adopt.html` line 177
  - Props: `width: 100%`, `display: flex`, `align-items: center`, `justify-content: center`
- 🔴 inline_html `public/adopt.html` line 428
  - Props: `order: -1`

#### `.modal-image-gallery`
- 🔴 inline_html `public/adopt.html` line 370
  - Props: `display: grid`, `grid-template-columns: repeat(auto-fit, minmax(150px, 1fr))`, `gap: 12px`, `margin-top: 16px`
- 🔴 inline_html `public/adopt.html` line 432
  - Props: `grid-template-columns: repeat(3, 1fr)`

#### `.hero-right`
- 🔴 inline_html `public/adopt.html` line 437
  - Props: `display: flex`, `flex-direction: column`, `gap: 24px`, `margin-top: 40px`
- 🔴 inline_html `public/adopt.html` line 526
  - Props: `margin-top: 24px`, `gap: 20px`

#### `.hero-images-wrap`
- 🔴 inline_html `public/adopt.html` line 446
  - Props: `display: grid`, `grid-template-columns: 1fr 1fr 1fr`, `gap: 24px`, `align-items: start`
- 🔴 inline_html `public/adopt.html` line 530
  - Props: `grid-template-columns: 1fr`, `gap: 20px`

#### `.hero-image img`
- 🔴 inline_html `public/adopt.html` line 460
  - Props: `width: 100%`, `height: auto`, `display: block`, `object-fit: contain`, `max-height: 420px`, `margin: 0 auto`
- 🔴 inline_html `public/adopt.html` line 534
  - Props: `max-height: 320px`

#### `.hero-mobile-bio`
- 🔴 inline_html `public/adopt.html` line 510
  - Props: `display: none`, `padding: 20px 16px 0`, `text-align: center`, `border-top: 1px solid rgba(0, 0, 0, 0.06)`
- 🔴 inline_html `public/adopt.html` line 538
  - Props: `display: block`

#### `.gallery-item`
- 🔴 inline_html `public/adopt.html` line 563
  - Props: `position: relative`, `border-radius: 16px`, `overflow: hidden`, `background: #f8fafc`, `display: flex`, `align-items: center`
- 🔴 inline_html `public/adopt.html` line 605
  - Props: `min-height: 280px`, `aspect-ratio: auto`

#### `.progress-steps`
- 🔴 inline_html `public/adopt.html` line 628
  - Props: `display: flex`, `align-items: center`, `justify-content: center`, `gap: 8px`
- 🔴 inline_html `public/adopt.html` line 725
  - Props: `gap: 4px`

#### `.step-number`
- 🔴 inline_html `public/adopt.html` line 653
  - Props: `width: 40px`, `height: 40px`, `border-radius: 50%`, `background: #e2e8f0`, `color: var(--muted)`, `display: flex`
- 🔴 inline_html `public/adopt.html` line 728
  - Props: `width: 32px`, `height: 32px`, `font-size: 14px`

#### `.step-label`
- 🔴 inline_html `public/adopt.html` line 673
  - Props: `font-size: 12px`, `font-weight: 600`, `color: var(--muted)`, `text-transform: uppercase`, `letter-spacing: 0.05em`
- 🔴 inline_html `public/adopt.html` line 734
  - Props: `font-size: 10px`

#### `.donation-type-btn, .amount-option`
- 🔴 inline_html `public/adopt.html` line 756
  - Props: `padding: 12px 20px`, `border: 2px solid #e2e8f0`, `border-radius: 10px`, `background: #fff`, `font-weight: 600`, `font-size: 15px`
- 🔴 inline_html `public/services.html` line 13
  - Props: `padding: 12px 20px; border: 2px solid #e2e8f0; border-radius: 10px; background: #fff; font-weight: 600; cursor: pointer; transition: all 0.2s`

#### `.donation-type-btn.active, .amount-option.selected`
- 🔴 inline_html `public/adopt.html` line 773
  - Props: `border-color: var(--accent)`, `background: #fef2f2`, `color: var(--accent)`
- 🔴 inline_html `public/services.html` line 14
  - Props: `border-color: var(--accent); background: #fef2f2; color: var(--accent)`

#### `#card-element`
- 🔴 inline_html `public/adopt.html` line 779
  - Props: `padding: 1rem`, `border: 2px solid #e2e8f0`, `border-radius: 12px`, `background: white`
- 🔴 inline_html `public/services.html` line 19
  - Props: `padding: 1rem; border: 2px solid var(--border); border-radius: 12px; background: white`

#### `.payment-amount`
- 🔴 inline_html `public/adopt.html` line 787
  - Props: `display: grid`, `grid-template-columns: repeat(auto-fit, minmax(100px, 1fr))`, `gap: 0.75rem`, `margin-bottom: 1.5rem`
- 🔴 inline_html `public/services.html` line 15
  - Props: `display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 0.75rem; margin-bottom: 1.5rem`

#### `.success-message`
- 🔴 inline_html `public/adopt.html` line 793
  - Props: `display: none`, `text-align: center`, `padding: 3rem 2rem`
- 🔴 inline_html `public/services.html` line 16
  - Props: `display: none; text-align: center; padding: 3rem 2rem`

#### `.success-message.active`
- 🔴 inline_html `public/adopt.html` line 798
  - Props: `display: block`
- 🔴 inline_html `public/services.html` line 17
  - Props: `display: block`

#### `.success-icon`
- 🔴 inline_html `public/adopt.html` line 801
  - Props: `width: 80px`, `height: 80px`, `background: var(--accent)`, `border-radius: 50%`, `display: flex`, `align-items: center`
- 🔴 inline_html `public/services.html` line 18
  - Props: `width: 80px; height: 80px; background: var(--success); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; font-size: 3rem; color: white`

#### `.spinner`
- 🔴 inline_html `public/adopt.html` line 815
  - Props: `display: inline-block`, `width: 20px`, `height: 20px`, `border: 3px solid rgba(255, 255, 255, 0.3)`, `border-top-color: white`, `border-radius: 50%`
- 🔴 inline_html `public/services.html` line 21
  - Props: `display: inline-block; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,.3); border-radius: 50%; border-top-color: white; animation: spin 0.6s linear infinite`

#### `.btn.btn-primary`
- 🔴 inline_html `public/adopt.html` line 825
  - Props: `padding: 0.75rem 1.5rem`, `background: var(--accent)`, `color: #fff`, `border: none`, `border-radius: 8px`, `font-weight: 600`
- 🔴 inline_html `public/services.html` line 23
  - Props: `padding: 1rem 2rem; background: var(--primary); color: white; border: none; border-radius: 12px; font-weight: 600; cursor: pointer`

#### `.header-wrap, .nav, header`
- 🔴 inline_html `public/adopt.html` line 929 ⚠️ 3× !important
  - Props: `background: rgba(5,8,13,.72) !important`, `border-bottom: 1px solid var(--cpas-border) !important`, `backdrop-filter: blur(22px) saturate(135%) !important`
- 🔴 inline_html `public/services.html` line 75 ⚠️ 3× !important
  - Props: `background: rgba(5,8,13,.72) !important`, `border-bottom: 1px solid var(--cpas-border) !important`, `backdrop-filter: blur(22px) saturate(135%) !important`

#### `section, .home-section, .about-section, .services-section, .donate-section, .adopt-section`
- 🔴 inline_html `public/adopt.html` line 936 ⚠️ 1× !important
  - Props: `background: transparent !important`
- 🔴 inline_html `public/services.html` line 82 ⚠️ 1× !important
  - Props: `background: transparent !important`

#### `.card, .service-card, .animal-card, .donation-card, .story-card, .value-card, .form-card, .info-card`
- 🔴 inline_html `public/adopt.html` line 944 ⚠️ 4× !important
  - Props: `background: var(--cpas-surface) !important`, `border: 1px solid var(--cpas-border) !important`, `box-shadow: 0 24px 80px rgba(0,0,0,.32), inset 0 1px 0 rgba(255,255,255,.07) !important`, `backdrop-filter: blur(18px) saturate(130%) !important`
- 🔴 inline_html `public/services.html` line 90 ⚠️ 4× !important
  - Props: `background: var(--cpas-surface) !important`, `border: 1px solid var(--cpas-border) !important`, `box-shadow: 0 24px 80px rgba(0,0,0,.32), inset 0 1px 0 rgba(255,255,255,.07) !important`, `backdrop-filter: blur(18px) saturate(130%) !important`

#### `h1,h2,h3,h4,p,li,label`
- 🔴 inline_html `public/adopt.html` line 957
  - Props: `color: inherit`
- 🔴 inline_html `public/services.html` line 103
  - Props: `color: inherit`

#### `p,.subheadline,.muted`
- 🔴 inline_html `public/adopt.html` line 958 ⚠️ 1× !important
  - Props: `color: var(--cpas-muted) !important`
- 🔴 inline_html `public/services.html` line 104 ⚠️ 1× !important
  - Props: `color: var(--cpas-muted) !important`

#### `.btn, button, .btn-primary, .hero-cta-primary`
- 🔴 inline_html `public/adopt.html` line 960 ⚠️ 4× !important
  - Props: `background: linear-gradient(135deg,var(--cpas-purple),var(--cpas-purple-2)) !important`, `border: 1px solid rgba(255,255,255,.14) !important`, `color: white !important`, `box-shadow: 0 18px 42px rgba(109,85,147,.30) !important`
- 🔴 inline_html `public/services.html` line 106 ⚠️ 4× !important
  - Props: `background: linear-gradient(135deg,var(--cpas-purple),var(--cpas-purple-2)) !important`, `border: 1px solid rgba(255,255,255,.14) !important`, `color: white !important`, `box-shadow: 0 18px 42px rgba(109,85,147,.30) !important`

#### `.btn-secondary, .hero-cta-secondary`
- 🔴 inline_html `public/adopt.html` line 969 ⚠️ 3× !important
  - Props: `background: rgba(255,255,255,.055) !important`, `border: 1px solid rgba(255,255,255,.14) !important`, `color: white !important`
- 🔴 inline_html `public/services.html` line 115 ⚠️ 3× !important
  - Props: `background: rgba(255,255,255,.055) !important`, `border: 1px solid rgba(255,255,255,.14) !important`, `color: white !important`

#### `.logo, .footer-logo, .brand img, header img`
- 🔴 inline_html `public/adopt.html` line 978 ⚠️ 1× !important
  - Props: `border-radius: 0 !important`
- 🔴 inline_html `public/services.html` line 124 ⚠️ 1× !important
  - Props: `border-radius: 0 !important`

#### `.header-wrap .nav a, .nav a, .mobile-nav a`
- 🔴 inline_html `public/adopt.html` line 1011
  - Props: `position: relative`
- 🔴 inline_html `public/services.html` line 157
  - Props: `position: relative`

#### `.header-wrap .nav a.active, .nav a.active, .header-wrap .nav a[aria-current="page"], .nav a[aria-current="page"]`
- 🔴 inline_html `public/adopt.html` line 1016 ⚠️ 1× !important
  - Props: `color: var(--cpas-purple-light)!important`, `text-shadow: 0 0 18px rgba(199,167,255,.68),0 0 36px rgba(109,85,147,.38)`
- 🔴 inline_html `public/services.html` line 162 ⚠️ 1× !important
  - Props: `color: var(--cpas-purple-light)!important`, `text-shadow: 0 0 18px rgba(199,167,255,.68),0 0 36px rgba(109,85,147,.38)`

#### `.header-wrap .nav a.active::after, .nav a.active::after, .header-wrap .nav a[aria-current="page"]::after, .nav a[aria-current="page"]::after`
- 🔴 inline_html `public/adopt.html` line 1023 ⚠️ 1× !important
  - Props: `background: linear-gradient(90deg,transparent,var(--cpas-purple-light),transparent)!important`, `box-shadow: 0 0 18px rgba(199,167,255,.75)`
- 🔴 inline_html `public/services.html` line 169 ⚠️ 1× !important
  - Props: `background: linear-gradient(90deg,transparent,var(--cpas-purple-light),transparent)!important`, `box-shadow: 0 0 18px rgba(199,167,255,.75)`

#### `.hero, .hero-split, .home-section, section`
- 🔴 inline_html `public/adopt.html` line 1030
  - Props: `transition: background .8s ease, color .8s ease, border-color .8s ease`
- 🔴 inline_html `public/services.html` line 176
  - Props: `transition: background .8s ease, color .8s ease, border-color .8s ease`

#### `.home-section, .story-section, .about-section`
- 🔴 inline_html `public/adopt.html` line 1040 ⚠️ 1× !important
  - Props: `background: `
- 🔴 inline_html `public/services.html` line 186 ⚠️ 1× !important
  - Props: `background: `

#### `.cpas-contact-modal`
- 🔴 inline_html `public/adopt.html` line 1047
  - Props: `position: fixed;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;padding:22px`, `background: rgba(0,0,0,.68);backdrop-filter:blur(18px)`
- 🔴 inline_html `public/services.html` line 193
  - Props: `position: fixed;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;padding:22px`, `background: rgba(0,0,0,.68);backdrop-filter:blur(18px)`

#### `.cpas-contact-modal.open`
- 🔴 inline_html `public/adopt.html` line 1051
  - Props: `display: flex`
- 🔴 inline_html `public/services.html` line 197
  - Props: `display: flex`

#### `.cpas-contact-panel`
- 🔴 inline_html `public/adopt.html` line 1052
  - Props: `width: min(760px,96vw);max-height:90vh;overflow:auto;border-radius:30px`, `background: rgba(13,20,33,.86);border:1px solid rgba(255,255,255,.13)`, `box-shadow: 0 40px 140px rgba(0,0,0,.56), inset 0 1px 0 rgba(255,255,255,.08)`, `color: #F8F7FF;padding:28px;position:relative`
- 🔴 inline_html `public/services.html` line 198
  - Props: `width: min(760px,96vw);max-height:90vh;overflow:auto;border-radius:30px`, `background: rgba(13,20,33,.86);border:1px solid rgba(255,255,255,.13)`, `box-shadow: 0 40px 140px rgba(0,0,0,.56), inset 0 1px 0 rgba(255,255,255,.08)`, `color: #F8F7FF;padding:28px;position:relative`

#### `.cpas-contact-panel::after`
- 🔴 inline_html `public/adopt.html` line 1058
  - Props: `content: "";position:absolute;left:0;right:0;bottom:0;height:140px;pointer-events:none;opacity:.5`, `background: radial-gradient(70% 70% at 20% 100%,rgba(109,85,147,.55),transparent 62%),`, `filter: blur(16px);transform:translateY(45%)`
- 🔴 inline_html `public/services.html` line 204
  - Props: `content: "";position:absolute;left:0;right:0;bottom:0;height:140px;pointer-events:none;opacity:.5`, `background: radial-gradient(70% 70% at 20% 100%,rgba(109,85,147,.55),transparent 62%),`, `filter: blur(16px);transform:translateY(45%)`

#### `.cpas-contact-head,.cpas-contact-form`
- 🔴 inline_html `public/adopt.html` line 1064
  - Props: `position: relative;z-index:1`
- 🔴 inline_html `public/services.html` line 210
  - Props: `position: relative;z-index:1`

#### `.cpas-contact-head`
- 🔴 inline_html `public/adopt.html` line 1065
  - Props: `display: flex;justify-content:space-between;gap:18px;align-items:flex-start;margin-bottom:20px`
- 🔴 inline_html `public/services.html` line 211
  - Props: `display: flex;justify-content:space-between;gap:18px;align-items:flex-start;margin-bottom:20px`

#### `.cpas-contact-head h2`
- 🔴 inline_html `public/adopt.html` line 1066
  - Props: `margin: 0 0 8px;font-size:30px;color:white`
- 🔴 inline_html `public/services.html` line 212
  - Props: `margin: 0 0 8px;font-size:30px;color:white`

#### `.cpas-contact-head p`
- 🔴 inline_html `public/adopt.html` line 1067
  - Props: `margin: 0;color:rgba(255,255,255,.66)`
- 🔴 inline_html `public/services.html` line 213
  - Props: `margin: 0;color:rgba(255,255,255,.66)`

#### `.cpas-contact-grid .full`
- 🔴 inline_html `public/adopt.html` line 1070
  - Props: `grid-column: 1/-1`
- 🔴 inline_html `public/services.html` line 216
  - Props: `grid-column: 1/-1`

#### `.cpas-contact-form input,.cpas-contact-form select,.cpas-contact-form textarea`
- 🔴 inline_html `public/adopt.html` line 1071
  - Props: `width: 100%;border:1px solid rgba(255,255,255,.13);border-radius:16px;background:rgba(255,255,255,.07)`, `color: white;padding:14px;font:inherit;outline:none`
- 🔴 inline_html `public/services.html` line 217
  - Props: `width: 100%;border:1px solid rgba(255,255,255,.13);border-radius:16px;background:rgba(255,255,255,.07)`, `color: white;padding:14px;font:inherit;outline:none`

#### `.cpas-contact-form textarea`
- 🔴 inline_html `public/adopt.html` line 1075
  - Props: `min-height: 130px;resize:vertical`
- 🔴 inline_html `public/services.html` line 221
  - Props: `min-height: 130px;resize:vertical`

#### `.cpas-contact-form input:focus,.cpas-contact-form select:focus,.cpas-contact-form textarea:focus`
- 🔴 inline_html `public/adopt.html` line 1076
  - Props: `border-color: rgba(199,167,255,.75);box-shadow:0 0 0 4px rgba(109,85,147,.24)`
- 🔴 inline_html `public/services.html` line 222
  - Props: `border-color: rgba(199,167,255,.75);box-shadow:0 0 0 4px rgba(109,85,147,.24)`

#### `.cpas-form-msg`
- 🔴 inline_html `public/adopt.html` line 1080
  - Props: `margin-top: 12px;color:#C7A7FF;font-weight:800`
- 🔴 inline_html `public/services.html` line 226
  - Props: `margin-top: 12px;color:#C7A7FF;font-weight:800`

#### `.cpas-donate-modal, .donation-modal, #donatemodal`
- 🔴 inline_html `public/adopt.html` line 1233 ⚠️ 1× !important
  - Props: `color: #111827 !important`
- 🔴 inline_html `public/services.html` line 237 ⚠️ 1× !important
  - Props: `color: #111827 !important`

#### `.cpas-donate-panel, .donation-modal .modal-content, #donatemodal .modal-content, #donatemodal form`
- 🔴 inline_html `public/adopt.html` line 1238 ⚠️ 4× !important
  - Props: `background: #F8F7FF !important`, `color: #111827 !important`, `border: 1px solid rgba(15,23,42,.12) !important`, `box-shadow: 0 40px 140px rgba(0,0,0,.58) !important`
- 🔴 inline_html `public/services.html` line 242 ⚠️ 4× !important
  - Props: `background: #F8F7FF !important`, `color: #111827 !important`, `border: 1px solid rgba(15,23,42,.12) !important`, `box-shadow: 0 40px 140px rgba(0,0,0,.58) !important`

#### `.cpas-donate-panel h1, .cpas-donate-panel h2, .cpas-donate-panel h3, .cpas-donate-panel label, .donation-modal h1, .donation-modal h2, .donation-modal h3, .donation-modal label, #donatemodal h1, #donatemodal h2, #donatemodal h3, #donatemodal label`
- 🔴 inline_html `public/adopt.html` line 1248 ⚠️ 1× !important
  - Props: `color: #111827 !important`
- 🔴 inline_html `public/services.html` line 252 ⚠️ 1× !important
  - Props: `color: #111827 !important`

#### `.cpas-donate-panel p, .cpas-donate-panel span, .cpas-donate-panel small, .donation-modal p, .donation-modal span, .donation-modal small, #donatemodal p, #donatemodal span, #donatemodal small`
- 🔴 inline_html `public/adopt.html` line 1263 ⚠️ 1× !important
  - Props: `color: #475569 !important`
- 🔴 inline_html `public/services.html` line 267 ⚠️ 1× !important
  - Props: `color: #475569 !important`

#### `.cpas-donate-form input, .cpas-donate-form select, .cpas-donate-form textarea, #donatemodal input, #donatemodal select, #donatemodal textarea`
- 🔴 inline_html `public/adopt.html` line 1275 ⚠️ 3× !important
  - Props: `background: #FFFFFF !important`, `color: #111827 !important`, `border: 1px solid rgba(15,23,42,.16) !important`
- 🔴 inline_html `public/services.html` line 279 ⚠️ 3× !important
  - Props: `background: #FFFFFF !important`, `color: #111827 !important`, `border: 1px solid rgba(15,23,42,.16) !important`

#### `.cpas-donate-form input::placeholder, .cpas-donate-form textarea::placeholder, #donatemodal input::placeholder, #donatemodal textarea::placeholder`
- 🔴 inline_html `public/adopt.html` line 1286 ⚠️ 1× !important
  - Props: `color: #64748B !important`
- 🔴 inline_html `public/services.html` line 290 ⚠️ 1× !important
  - Props: `color: #64748B !important`

#### `.cpas-amounts button, .amount-button, #donatemodal .amount-btn`
- 🔴 inline_html `public/adopt.html` line 1293 ⚠️ 3× !important
  - Props: `background: #FFFFFF !important`, `color: #111827 !important`, `border: 1px solid rgba(15,23,42,.16) !important`
- 🔴 inline_html `public/services.html` line 297 ⚠️ 3× !important
  - Props: `background: #FFFFFF !important`, `color: #111827 !important`, `border: 1px solid rgba(15,23,42,.16) !important`

#### `.cpas-amounts button.active, .amount-button.active, #donatemodal .amount-btn.active`
- 🔴 inline_html `public/adopt.html` line 1301 ⚠️ 3× !important
  - Props: `background: #6D5593 !important`, `color: #FFFFFF !important`, `border-color: #6D5593 !important`
- 🔴 inline_html `public/services.html` line 305 ⚠️ 3× !important
  - Props: `background: #6D5593 !important`, `color: #FFFFFF !important`, `border-color: #6D5593 !important`

#### `.cpas-donate-submit, #donatemodal button[type="submit"], #donatemodal .donate-submit`
- 🔴 inline_html `public/adopt.html` line 1309 ⚠️ 3× !important
  - Props: `background: #6D5593 !important`, `color: #FFFFFF !important`, `border: 1px solid rgba(15,23,42,.08) !important`
- 🔴 inline_html `public/services.html` line 313 ⚠️ 3× !important
  - Props: `background: #6D5593 !important`, `color: #FFFFFF !important`, `border: 1px solid rgba(15,23,42,.08) !important`

#### `.cpas-donate-close, #donatemodal .close, #donatemodal .modal-close`
- 🔴 inline_html `public/adopt.html` line 1317 ⚠️ 2× !important
  - Props: `background: #6D5593 !important`, `color: #FFFFFF !important`
- 🔴 inline_html `public/services.html` line 321 ⚠️ 2× !important
  - Props: `background: #6D5593 !important`, `color: #FFFFFF !important`

#### `html, body, #root`
- 🔴 inline_html `public/dashboard/index.html` line 15
  - Props: `height: 100%`
- 🔴 inline_html `public/dashboard.html` line 15
  - Props: `height: 100%`

#### `::-webkit-scrollbar`
- 🔴 inline_html `public/dashboard/index.html` line 17
  - Props: `width: 6px; height: 6px`
- 🔴 inline_html `public/dashboard.html` line 17
  - Props: `width: 6px; height: 6px`

#### `::-webkit-scrollbar-track`
- 🔴 inline_html `public/dashboard/index.html` line 18
  - Props: `background: transparent`
- 🔴 inline_html `public/dashboard.html` line 18
  - Props: `background: transparent`

#### `::-webkit-scrollbar-thumb`
- 🔴 inline_html `public/dashboard/index.html` line 19
  - Props: `background: #2c2c44; border-radius: 99px`
- 🔴 inline_html `public/dashboard.html` line 19
  - Props: `background: #2c2c44; border-radius: 99px`

#### `::-webkit-scrollbar-thumb:hover`
- 🔴 inline_html `public/dashboard/index.html` line 20
  - Props: `background: #3d3d5a`
- 🔴 inline_html `public/dashboard.html` line 20
  - Props: `background: #3d3d5a`

#### `input, select, textarea, button`
- 🔴 inline_html `public/dashboard/index.html` line 21
  - Props: `font-family: inherit`
- 🔴 inline_html `public/dashboard.html` line 21
  - Props: `font-family: inherit`

#### `select option`
- 🔴 inline_html `public/dashboard/index.html` line 22
  - Props: `background: #191928; color: #f0f0f5`
- 🔴 inline_html `public/dashboard.html` line 22
  - Props: `background: #191928; color: #f0f0f5`

#### `.brand-logo, .logo img, img[alt*="companions"]`
- 🔴 inline_html `public/dashboard/index.html` line 27 ⚠️ 1× !important
  - Props: `object-fit: contain !important`
- 🔴 inline_html `public/dashboard.html` line 27 ⚠️ 1× !important
  - Props: `object-fit: contain !important`

#### `.icon-paw,.icon-heart,.icon-home,.icon-medical,.icon-dollar,.icon-alert`
- 🔴 inline_html `public/dashboard/index.html` line 30
  - Props: `display: inline-flex`, `width: 1em`, `height: 1em`, `vertical-align: -0.15em`, `background: currentColor`, `-webkit-mask-repeat: no-repeat`
- 🔴 inline_html `public/dashboard.html` line 30
  - Props: `display: inline-flex`, `width: 1em`, `height: 1em`, `vertical-align: -0.15em`, `background: currentColor`, `-webkit-mask-repeat: no-repeat`

#### `.icon-paw`
- 🔴 inline_html `public/dashboard/index.html` line 43
  - Props: `-webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='4' r='2'/%3E%3Ccircle cx='18' cy='8' r='2'/%3E%3Ccircle cx='20' cy='16' r='2'/%3E%3Cpath d='M9 10a5 5 0 0 1 6.7 6.7l-.6.6a3 3 0 0 1-4.2 0l-.6-.6A5 5 0 0 1 9 10Z'/%3E%3Ccircle cx='4' cy='16' r='2'/%3E%3Ccircle cx='6' cy='8' r='2'/%3E%3C/svg%3E"); mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='4' r='2'/%3E%3Ccircle cx='18' cy='8' r='2'/%3E%3Ccircle cx='20' cy='16' r='2'/%3E%3Cpath d='M9 10a5 5 0 0 1 6.7 6.7l-.6.6a3 3 0 0 1-4.2 0l-.6-.6A5 5 0 0 1 9 10Z'/%3E%3Ccircle cx='4' cy='16' r='2'/%3E%3Ccircle cx='6' cy='8' r='2'/%3E%3C/svg%3E")`
- 🔴 inline_html `public/dashboard.html` line 43
  - Props: `-webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='4' r='2'/%3E%3Ccircle cx='18' cy='8' r='2'/%3E%3Ccircle cx='20' cy='16' r='2'/%3E%3Cpath d='M9 10a5 5 0 0 1 6.7 6.7l-.6.6a3 3 0 0 1-4.2 0l-.6-.6A5 5 0 0 1 9 10Z'/%3E%3Ccircle cx='4' cy='16' r='2'/%3E%3Ccircle cx='6' cy='8' r='2'/%3E%3C/svg%3E"); mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='4' r='2'/%3E%3Ccircle cx='18' cy='8' r='2'/%3E%3Ccircle cx='20' cy='16' r='2'/%3E%3Cpath d='M9 10a5 5 0 0 1 6.7 6.7l-.6.6a3 3 0 0 1-4.2 0l-.6-.6A5 5 0 0 1 9 10Z'/%3E%3Ccircle cx='4' cy='16' r='2'/%3E%3Ccircle cx='6' cy='8' r='2'/%3E%3C/svg%3E")`

#### `.icon-heart`
- 🔴 inline_html `public/dashboard/index.html` line 44
  - Props: `-webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 12 5a5.5 5.5 0 0 0-10 3.5c0 2.3 1.5 4 3 5.5l7 7Z'/%3E%3C/svg%3E"); mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 12 5a5.5 5.5 0 0 0-10 3.5c0 2.3 1.5 4 3 5.5l7 7Z'/%3E%3C/svg%3E")`
- 🔴 inline_html `public/dashboard.html` line 44
  - Props: `-webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 12 5a5.5 5.5 0 0 0-10 3.5c0 2.3 1.5 4 3 5.5l7 7Z'/%3E%3C/svg%3E"); mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 12 5a5.5 5.5 0 0 0-10 3.5c0 2.3 1.5 4 3 5.5l7 7Z'/%3E%3C/svg%3E")`

#### `.icon-home`
- 🔴 inline_html `public/dashboard/index.html` line 45
  - Props: `-webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'/%3E%3Cpolyline points='9 22 9 12 15 12 15 22'/%3E%3C/svg%3E"); mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'/%3E%3Cpolyline points='9 22 9 12 15 12 15 22'/%3E%3C/svg%3E")`
- 🔴 inline_html `public/dashboard.html` line 45
  - Props: `-webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'/%3E%3Cpolyline points='9 22 9 12 15 12 15 22'/%3E%3C/svg%3E"); mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'/%3E%3Cpolyline points='9 22 9 12 15 12 15 22'/%3E%3C/svg%3E")`

#### `.icon-medical`
- 🔴 inline_html `public/dashboard/index.html` line 46
  - Props: `-webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 3v12'/%3E%3Ccircle cx='18' cy='6' r='3'/%3E%3Cpath d='M18 9v4a4 4 0 0 1-8 0V5'/%3E%3Cpath d='M4 3h4'/%3E%3C/svg%3E"); mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 3v12'/%3E%3Ccircle cx='18' cy='6' r='3'/%3E%3Cpath d='M18 9v4a4 4 0 0 1-8 0V5'/%3E%3Cpath d='M4 3h4'/%3E%3C/svg%3E")`
- 🔴 inline_html `public/dashboard.html` line 46
  - Props: `-webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 3v12'/%3E%3Ccircle cx='18' cy='6' r='3'/%3E%3Cpath d='M18 9v4a4 4 0 0 1-8 0V5'/%3E%3Cpath d='M4 3h4'/%3E%3C/svg%3E"); mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 3v12'/%3E%3Ccircle cx='18' cy='6' r='3'/%3E%3Cpath d='M18 9v4a4 4 0 0 1-8 0V5'/%3E%3Cpath d='M4 3h4'/%3E%3C/svg%3E")`

#### `.icon-dollar`
- 🔴 inline_html `public/dashboard/index.html` line 47
  - Props: `-webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cline x1='12' x2='12' y1='2' y2='22'/%3E%3Cpath d='M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6'/%3E%3C/svg%3E"); mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cline x1='12' x2='12' y1='2' y2='22'/%3E%3Cpath d='M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6'/%3E%3C/svg%3E")`
- 🔴 inline_html `public/dashboard.html` line 47
  - Props: `-webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cline x1='12' x2='12' y1='2' y2='22'/%3E%3Cpath d='M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6'/%3E%3C/svg%3E"); mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cline x1='12' x2='12' y1='2' y2='22'/%3E%3Cpath d='M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6'/%3E%3C/svg%3E")`

#### `.icon-alert`
- 🔴 inline_html `public/dashboard/index.html` line 48
  - Props: `-webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z'/%3E%3Cpath d='M12 9v4'/%3E%3Cpath d='M12 17h.01'/%3E%3C/svg%3E"); mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z'/%3E%3Cpath d='M12 9v4'/%3E%3Cpath d='M12 17h.01'/%3E%3C/svg%3E")`
- 🔴 inline_html `public/dashboard.html` line 48
  - Props: `-webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z'/%3E%3Cpath d='M12 9v4'/%3E%3Cpath d='M12 17h.01'/%3E%3C/svg%3E"); mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z'/%3E%3Cpath d='M12 9v4'/%3E%3Cpath d='M12 17h.01'/%3E%3C/svg%3E")`

#### `donate"] .donation-layout`
- 🔴 inline_html `public/donate.html` line 13
  - Props: `display: grid`, `grid-template-columns: minmax(0, 1.05fr) minmax(280px, .95fr)`, `gap: clamp(1.5rem, 4vw, 3rem)`, `align-items: center`
- 🔴 inline_html `public/donate.html` line 73
  - Props: `grid-template-columns: 1fr`

#### `donate"] .media-card img`
- 🔴 inline_html `public/donate.html` line 25
  - Props: `display: block`, `width: 100%`, `min-height: 360px`, `object-fit: cover`
- 🔴 inline_html `public/donate.html` line 77
  - Props: `min-height: 260px`

</details>

---


## Inline HTML Overrides of `_shared.css`

**32 selectors** are defined in both `_shared.css` AND inline `<style>` blocks.
These are the most dangerous — inline wins via source order and often abuses `!important`.


**`*, *::before, *::after`**
  - _shared.css: 1 def(s) — lines 55
  - INLINE `public/dashboard/index.html` line 14
  - INLINE `public/dashboard.html` line 14

**`.animal-name`**
  - _shared.css: 1 def(s) — lines 592
  - INLINE `public/adopt.html` line 309
  - **Conflicting props:** `color`, `font-size`, `font-weight`

**`.btn`**
  - _shared.css: 1 def(s) — lines 111
  - INLINE `public/about.html` line 139
  - INLINE `public/admin/dashboard.html` line 27
  - **Conflicting props:** `border`

**`.btn-primary`**
  - _shared.css: 1 def(s) — lines 130
  - INLINE `public/about.html` line 141
  - **Conflicting props:** `background`

**`.btn:hover`**
  - _shared.css: 1 def(s) — lines 127
  - INLINE `public/about.html` line 140
  - **Conflicting props:** `transform`

**`.card`**
  - _shared.css: 1 def(s) — lines 355
  - INLINE `public/about.html` line 161
  - INLINE `public/admin/dashboard.html` line 28
  - INLINE `public/admin/index.html` line 9
  - INLINE `public/admin/reset-password.html` line 6

**`.card-body`**
  - _shared.css: 1 def(s) — lines 375
  - INLINE `public/about.html` line 163
  - **Conflicting props:** `padding`

**`.container`**
  - _shared.css: 4 def(s) — lines 99, 610, 776, 1136
  - INLINE `public/about.html` line 83
  - **Conflicting props:** `width`

**`.eyebrow`**
  - _shared.css: 1 def(s) — lines 87
  - INLINE `public/about.html` line 124
  - **Conflicting props:** `color`

**`.footer-grid`**
  - _shared.css: 3 def(s) — lines 239, 614, 635
  - INLINE `public/about.html` line 187

**`.footer-links`**
  - _shared.css: 1 def(s) — lines 271
  - INLINE `public/about.html` line 242
  - INLINE `public/about.html` line 530, 3× !important
  - INLINE `public/adopt.html` line 1359, 3× !important
  - INLINE `public/services.html` line 363, 3× !important
  - **Conflicting props:** `display`

**`.footer-links a`**
  - _shared.css: 1 def(s) — lines 278
  - INLINE `public/about.html` line 189

**`.hero-actions`**
  - _shared.css: 2 def(s) — lines 421, 1388
  - INLINE `public/about.html` line 137
  - **Conflicting props:** `display`

**`.hero-split`**
  - _shared.css: 2 def(s) — lines 1300, 1413
  - INLINE `public/adopt.html` line 1036, 1× !important
  - INLINE `public/adopt.html` line 1082, 1× !important
  - INLINE `public/services.html` line 182, 1× !important
  - INLINE `public/services.html` line 228, 1× !important

**`.section`**
  - _shared.css: 2 def(s) — lines 107, 611
  - INLINE `public/about.html` line 149
  - **Conflicting props:** `padding`

**`.site-footer`**
  - _shared.css: 1 def(s) — lines 229
  - INLINE `public/about.html` line 317, 2× !important
  - **Conflicting props:** `border-top`

**`.site-header`**
  - _shared.css: 2 def(s) — lines 143, 811
  - INLINE `public/about.html` line 84
  - INLINE `public/about.html` line 509, 4× !important
  - INLINE `public/about.html` line 536
  - INLINE `public/about.html` line 549, 7× !important
  - INLINE `public/adopt.html` line 1338, 4× !important
  - INLINE `public/adopt.html` line 1365
  - INLINE `public/adopt.html` line 1378, 7× !important
  - INLINE `public/services.html` line 342, 4× !important
  - INLINE `public/services.html` line 369
  - INLINE `public/services.html` line 382, 7× !important
  - **Conflicting props:** `position`, `top`, `z-index`

**`.site-header .brand`**
  - _shared.css: 2 def(s) — lines 647, 969
  - INLINE `public/about.html` line 512, 6× !important
  - INLINE `public/adopt.html` line 1341, 6× !important
  - INLINE `public/services.html` line 345, 6× !important
  - **Conflicting props:** `display`

**`.site-header .desktop-links`**
  - _shared.css: 2 def(s) — lines 662, 984
  - INLINE `public/about.html` line 519, 10× !important
  - INLINE `public/about.html` line 538, 1× !important
  - INLINE `public/adopt.html` line 1348, 10× !important
  - INLINE `public/adopt.html` line 1367, 1× !important
  - INLINE `public/services.html` line 352, 10× !important
  - INLINE `public/services.html` line 371, 1× !important
  - **Conflicting props:** `display`

**`.site-header .desktop-links .donate-link`**
  - _shared.css: 2 def(s) — lines 685, 1007
  - INLINE `public/about.html` line 524, 7× !important
  - INLINE `public/adopt.html` line 1353, 7× !important
  - INLINE `public/services.html` line 357, 7× !important

**`.site-header .desktop-links a`**
  - _shared.css: 2 def(s) — lines 668, 990
  - INLINE `public/about.html` line 520, 12× !important
  - INLINE `public/adopt.html` line 1349, 12× !important
  - INLINE `public/services.html` line 353, 12× !important
  - **Conflicting props:** `display`

**`.site-header .hamburger`**
  - _shared.css: 1 def(s) — lines 695
  - INLINE `public/about.html` line 526, 1× !important
  - INLINE `public/about.html` line 539, 1× !important
  - INLINE `public/adopt.html` line 1355, 1× !important
  - INLINE `public/adopt.html` line 1368, 1× !important
  - INLINE `public/services.html` line 359, 1× !important
  - INLINE `public/services.html` line 372, 1× !important
  - **Conflicting props:** `display`

**`:root`**
  - _shared.css: 2 def(s) — lines 727, 1133
  - INLINE `public/about.html` line 22
  - INLINE `public/about.html` line 55
  - INLINE `public/about.html` line 227
  - INLINE `public/about.html` line 508
  - INLINE `public/admin/dashboard.html` line 9
  - INLINE `public/adopt.html` line 883
  - INLINE `public/adopt.html` line 909
  - INLINE `public/adopt.html` line 992
  - INLINE `public/adopt.html` line 1091
  - INLINE `public/adopt.html` line 1337
  - INLINE `public/services.html` line 29
  - INLINE `public/services.html` line 55
  - INLINE `public/services.html` line 138
  - INLINE `public/services.html` line 341

**`a`**
  - _shared.css: 1 def(s) — lines 73
  - INLINE `public/about.html` line 79
  - INLINE `public/admin/dashboard.html` line 20
  - INLINE `public/adopt.html` line 959
  - INLINE `public/dashboard/index.html` line 23
  - INLINE `public/dashboard.html` line 23
  - INLINE `public/services.html` line 105
  - **Conflicting props:** `color`

**`body`**
  - _shared.css: 2 def(s) — lines 60, 226
  - INLINE `public/about.html` line 69
  - INLINE `public/about.html` line 305, 1× !important
  - INLINE `public/about.html` line 548, 1× !important
  - INLINE `public/admin/dashboard.html` line 17
  - INLINE `public/admin/index.html` line 8
  - INLINE `public/admin/login.html` line 9
  - INLINE `public/admin/reset-password.html` line 5
  - INLINE `public/adopt.html` line 922, 2× !important
  - INLINE `public/adopt.html` line 1100, 2× !important
  - INLINE `public/adopt.html` line 1377, 1× !important
  - INLINE `public/dashboard/index.html` line 16
  - INLINE `public/dashboard.html` line 16
  - INLINE `public/services.html` line 68, 2× !important
  - INLINE `public/services.html` line 381, 1× !important
  - INLINE `scripts/companionscpas_audit_report.html` line 8

**`h1`**
  - _shared.css: 1 def(s) — lines 83
  - INLINE `public/about.html` line 126
  - INLINE `public/admin/dashboard.html` line 26
  - INLINE `public/admin/index.html` line 11

**`h1, h2, h3`**
  - _shared.css: 1 def(s) — lines 798
  - INLINE `public/about.html` line 125
  - INLINE `public/adopt.html` line 878
  - INLINE `public/adopt.html` line 984
  - INLINE `public/adopt.html` line 1083
  - INLINE `public/adopt.html` line 1225
  - INLINE `public/adopt.html` line 1328
  - INLINE `public/services.html` line 24
  - INLINE `public/services.html` line 130
  - INLINE `public/services.html` line 229
  - INLINE `public/services.html` line 332

**`h2`**
  - _shared.css: 1 def(s) — lines 85
  - INLINE `public/about.html` line 127
  - **Conflicting props:** `font-size`

**`h3`**
  - _shared.css: 1 def(s) — lines 86
  - INLINE `public/about.html` line 128
  - **Conflicting props:** `font-size`

**`html`**
  - _shared.css: 1 def(s) — lines 58
  - INLINE `public/about.html` line 68

**`img`**
  - _shared.css: 1 def(s) — lines 71
  - INLINE `public/about.html` line 82
  - INLINE `public/admin/index.html` line 10
  - INLINE `public/admin/reset-password.html` line 7
  - INLINE `public/adopt.html` line 975
  - INLINE `public/services.html` line 121

**`p`**
  - _shared.css: 1 def(s) — lines 803
  - INLINE `public/about.html` line 129
  - INLINE `public/admin/dashboard.html` line 27
  - INLINE `public/admin/index.html` line 12

---


## !important Usage

Total `!important` declarations: **556**
Affected selectors: **89**

| Selector | File | Line | Count |
|---|---|---|---|
| `.site-header .desktop-links a` | `public/about.html` | 520 | 12 |
| `.site-header .desktop-links a` | `public/adopt.html` | 1349 | 12 |
| `.site-header .desktop-links a` | `public/services.html` | 353 | 12 |
| `.site-header .desktop-links` | `public/about.html` | 519 | 10 |
| `.site-header .desktop-links` | `public/adopt.html` | 1348 | 10 |
| `.site-header .desktop-links` | `public/services.html` | 352 | 10 |
| `.site-header .container.nav` | `public/about.html` | 511 | 8 |
| `.site-header .container.nav` | `public/adopt.html` | 1340 | 8 |
| `.site-header .container.nav` | `public/services.html` | 344 | 8 |
| `.site-header` | `public/about.html` | 549 | 7 |
| `.site-header` | `public/adopt.html` | 1378 | 7 |
| `.site-header` | `public/services.html` | 382 | 7 |
| `.site-header .desktop-links .donate-link` | `public/about.html` | 524 | 7 |
| `.site-header .desktop-links .donate-link` | `public/adopt.html` | 1353 | 7 |
| `.site-header .desktop-links .donate-link` | `public/services.html` | 357 | 7 |
| `"] .site-header .header-inner, body[data-route="home"] .site…` | `public/_shared.css` | 1243 | 7 |
| `.site-header .logo` | `public/about.html` | 514 | 7 |
| `.site-header .logo` | `public/adopt.html` | 1343 | 7 |
| `.site-header .logo` | `public/services.html` | 347 | 7 |
| `.site-header .brand` | `public/about.html` | 512 | 6 |
| `.site-header .brand` | `public/adopt.html` | 1341 | 6 |
| `.site-header .brand` | `public/services.html` | 345 | 6 |
| `footer .container.footer-grid` | `public/about.html` | 528 | 6 |
| `footer .container.footer-grid` | `public/adopt.html` | 1357 | 6 |
| `footer .container.footer-grid` | `public/services.html` | 361 | 6 |
| `.adopt-hero, .hero, .hero-section` | `public/adopt.html` | 1120 | 5 |
| `.site-header` | `public/about.html` | 509 | 4 |
| `.site-header` | `public/adopt.html` | 1338 | 4 |
| `.site-header` | `public/services.html` | 342 | 4 |
| `"] .site-header, body[data-route="home"] .site-header, body.…` | `public/_shared.css` | 1234 | 4 |
| `"] .site-header .header-actions, body[data-route="home"] .si…` | `public/_shared.css` | 1257 | 4 |
| `footer` | `public/about.html` | 527 | 4 |
| `footer` | `public/adopt.html` | 1356 | 4 |
| `footer` | `public/services.html` | 360 | 4 |
| `.footer-logo` | `public/about.html` | 529 | 4 |
| `.footer-logo` | `public/adopt.html` | 1358 | 4 |
| `.footer-logo` | `public/services.html` | 362 | 4 |
| `.developer` | `public/about.html` | 533 | 4 |
| `.developer` | `public/adopt.html` | 1362 | 4 |
| `.developer` | `public/services.html` | 366 | 4 |

_...and 159 more_

---


## .site-header Deep-Dive

Given the volume of `.site-header` rules, here is every definition location:

Found **49 unique `.site-header*` selectors** across 119 definitions.


**`"] .site-header`** (1 def)
  📄 `public/_shared.css` line 1201

**`"] .site-header + .site-main`** (1 def)
  📄 `public/_shared.css` line 1218

**`"] .site-header + .site-main, body[data-route="home"] .site-header + .site-main, body.home .site-header + .site-main`** (1 def)
  📄 `public/_shared.css` line 1271 — 2× !important

**`"] .site-header .header-actions`** (1 def)
  📄 `public/_shared.css` line 1214

**`"] .site-header .header-actions, body[data-route="home"] .site-header .logo-link, body[data-route="home"] .site-header nav, body[data-route="home"] .site-header .header-actions, body.home .site-header .logo-link, body.home .site-header nav, body.home .site-header .header-actions`** (1 def)
  📄 `public/_shared.css` line 1257 — 4× !important

**`"] .site-header .header-inner`** (1 def)
  📄 `public/_shared.css` line 1207

**`"] .site-header .header-inner, body[data-route="home"] .site-header .header-inner, body.home .site-header .header-inner`** (1 def)
  📄 `public/_shared.css` line 1243 — 7× !important

**`"] .site-header .header-inner, body[data-route="home"] .site-header, body[data-route="home"] .site-header .header-inner, body.home .site-header, body.home .site-header .header-inner`** (1 def)
  📄 `public/_shared.css` line 1286 — 2× !important

**`"] .site-header, body[data-route="home"] .site-header, body.home .site-header`** (1 def)
  📄 `public/_shared.css` line 1234 — 4× !important

**`.mobile-menu-toggle span, .mobile-menu-panel, .site-header .site-nav a, .site-header .header-actions .btn-primary, .site-header .header-actions .nav-donate`** (1 def)
  📄 `public/_shared.css` line 1189

**`.site-header`** (12 defs)
  📄 `public/_shared.css` line 143
  📄 `public/_shared.css` line 811
  🔴 `public/about.html` line 84
  🔴 `public/about.html` line 509 — 4× !important
  🔴 `public/about.html` line 536
  🔴 `public/about.html` line 549 — 7× !important
  🔴 `public/adopt.html` line 1338 — 4× !important
  🔴 `public/adopt.html` line 1365
  🔴 `public/adopt.html` line 1378 — 7× !important
  🔴 `public/services.html` line 342 — 4× !important
  🔴 `public/services.html` line 369
  🔴 `public/services.html` line 382 — 7× !important

**`.site-header .brand`** (5 defs)
  📄 `public/_shared.css` line 647
  📄 `public/_shared.css` line 969
  🔴 `public/about.html` line 512 — 6× !important
  🔴 `public/adopt.html` line 1341 — 6× !important
  🔴 `public/services.html` line 345 — 6× !important

**`.site-header .brand img`** (2 defs)
  📄 `public/_shared.css` line 654
  📄 `public/_shared.css` line 976

**`.site-header .container.nav`** (9 defs)
  🔴 `public/about.html` line 511 — 8× !important
  🔴 `public/about.html` line 537 — 1× !important
  🔴 `public/about.html` line 558 — 1× !important
  🔴 `public/adopt.html` line 1340 — 8× !important
  🔴 `public/adopt.html` line 1366 — 1× !important
  🔴 `public/adopt.html` line 1387 — 1× !important
  🔴 `public/services.html` line 344 — 8× !important
  🔴 `public/services.html` line 370 — 1× !important
  🔴 `public/services.html` line 391 — 1× !important

**`.site-header .desktop-links`** (8 defs)
  📄 `public/_shared.css` line 662
  📄 `public/_shared.css` line 984
  🔴 `public/about.html` line 519 — 10× !important
  🔴 `public/about.html` line 538 — 1× !important
  🔴 `public/adopt.html` line 1348 — 10× !important
  🔴 `public/adopt.html` line 1367 — 1× !important
  🔴 `public/services.html` line 352 — 10× !important
  🔴 `public/services.html` line 371 — 1× !important

**`.site-header .desktop-links .donate-link`** (5 defs)
  📄 `public/_shared.css` line 685
  📄 `public/_shared.css` line 1007
  🔴 `public/about.html` line 524 — 7× !important
  🔴 `public/adopt.html` line 1353 — 7× !important
  🔴 `public/services.html` line 357 — 7× !important

**`.site-header .desktop-links a`** (5 defs)
  📄 `public/_shared.css` line 668
  📄 `public/_shared.css` line 990
  🔴 `public/about.html` line 520 — 12× !important
  🔴 `public/adopt.html` line 1349 — 12× !important
  🔴 `public/services.html` line 353 — 12× !important

**`.site-header .desktop-links a:hover, .site-header .desktop-links a.active`** (2 defs)
  📄 `public/_shared.css` line 679
  📄 `public/_shared.css` line 1001

**`.site-header .desktop-links a:hover,.site-header .desktop-links a.active`** (3 defs)
  🔴 `public/about.html` line 521 — 3× !important
  🔴 `public/adopt.html` line 1350 — 3× !important
  🔴 `public/services.html` line 354 — 3× !important

**`.site-header .hamburger`** (7 defs)
  📄 `public/_shared.css` line 695
  🔴 `public/about.html` line 526 — 1× !important
  🔴 `public/about.html` line 539 — 1× !important
  🔴 `public/adopt.html` line 1355 — 1× !important
  🔴 `public/adopt.html` line 1368 — 1× !important
  🔴 `public/services.html` line 359 — 1× !important
  🔴 `public/services.html` line 372 — 1× !important

**`.site-header .header-actions`** (1 def)
  📄 `public/_shared.css` line 915

**`.site-header .header-actions .btn-primary, .site-header .header-actions .nav-donate`** (1 def)
  📄 `public/_shared.css` line 922

**`.site-header .header-actions .btn-primary, .site-header .header-actions .nav-donate, .site-header .desktop-links .donate-link`** (1 def)
  📄 `public/_shared.css` line 718

**`.site-header .header-actions .btn-primary:hover, .site-header .header-actions .nav-donate:hover`** (1 def)
  📄 `public/_shared.css` line 949

**`.site-header .header-inner`** (3 defs)
  📄 `public/_shared.css` line 701
  📄 `public/_shared.css` line 829
  📄 `public/_shared.css` line 1152

**`.site-header .logo`** (3 defs)
  🔴 `public/about.html` line 514 — 7× !important
  🔴 `public/adopt.html` line 1343 — 7× !important
  🔴 `public/services.html` line 347 — 7× !important

**`.site-header .logo-link`** (1 def)
  📄 `public/_shared.css` line 837

**`.site-header .logo-link img`** (1 def)
  📄 `public/_shared.css` line 845

**`.site-header .logo-link img, .site-header .brand img`** (2 defs)
  📄 `public/_shared.css` line 712
  📄 `public/_shared.css` line 1165

**`.site-header .nav`** (2 defs)
  📄 `public/_shared.css` line 637
  📄 `public/_shared.css` line 960

**`.site-header .site-nav`** (1 def)
  📄 `public/_shared.css` line 857

**`.site-header .site-nav a`** (1 def)
  📄 `public/_shared.css` line 874

**`.site-header .site-nav a:hover, .site-header .site-nav a.active`** (1 def)
  📄 `public/_shared.css` line 898

**`.site-header .site-nav li`** (1 def)
  📄 `public/_shared.css` line 870

**`.site-header .site-nav, .site-header .desktop-links`** (1 def)
  📄 `public/_shared.css` line 707

**`.site-header .site-nav, .site-header .desktop-links, .site-header .header-actions`** (1 def)
  📄 `public/_shared.css` line 1159

**`.site-header nav`** (1 def)
  📄 `public/_shared.css` line 853

**`.site-header.header-hidden`** (1 def)
  🔴 `public/about.html` line 99

**`.site-header.scrolled,body[data-theme="dark"] .site-header`** (3 defs)
  🔴 `public/about.html` line 510 — 4× !important
  🔴 `public/adopt.html` line 1339 — 4× !important
  🔴 `public/services.html` line 343 — 4× !important

**`body.theme-light .site-header .site-nav a, body[data-theme="light"] .site-header .site-nav a`** (1 def)
  📄 `public/_shared.css` line 893

**`body.theme-light .site-header .site-nav a:hover, body.theme-light .site-header .site-nav a.active, body[data-theme="light"] .site-header .site-nav a:hover, body[data-theme="light"] .site-header .site-nav a.active`** (1 def)
  📄 `public/_shared.css` line 907

**`body.theme-light .site-header, body[data-theme="light"] .site-header`** (1 def)
  📄 `public/_shared.css` line 824

**`body[data-theme="dark"] .site-header .desktop-links a,.site-header.scrolled .desktop-links a`** (3 defs)
  🔴 `public/about.html` line 522 — 2× !important
  🔴 `public/adopt.html` line 1351 — 2× !important
  🔴 `public/services.html` line 355 — 2× !important

**`body[data-theme="dark"] .site-header .desktop-links a:hover,body[data-theme="dark"] .site-header .desktop-links a.active,.site-header.scrolled .desktop-links a:hover,.site-header.scrolled .desktop-links a.active`** (3 defs)
  🔴 `public/about.html` line 523 — 3× !important
  🔴 `public/adopt.html` line 1352 — 3× !important
  🔴 `public/services.html` line 356 — 3× !important

**`body[data-theme="dark"] .site-header .logo-dark,.site-header.scrolled .logo-dark`** (3 defs)
  🔴 `public/about.html` line 518 — 1× !important
  🔴 `public/adopt.html` line 1347 — 1× !important
  🔴 `public/services.html` line 351 — 1× !important

**`body[data-theme="dark"] .site-header .logo-light,.site-header.scrolled .logo-light`** (3 defs)
  🔴 `public/about.html` line 517 — 1× !important
  🔴 `public/adopt.html` line 1346 — 1× !important
  🔴 `public/services.html` line 350 — 1× !important

**`body[data-theme="light"] .site-header:not(.scrolled) .desktop-links .donate-link`** (3 defs)
  🔴 `public/about.html` line 525 — 3× !important
  🔴 `public/adopt.html` line 1354 — 3× !important
  🔴 `public/services.html` line 358 — 3× !important

**`body[data-theme="light"] .site-header:not(.scrolled) .logo-dark`** (3 defs)
  🔴 `public/about.html` line 515 — 1× !important
  🔴 `public/adopt.html` line 1344 — 1× !important
  🔴 `public/services.html` line 348 — 1× !important

**`body[data-theme="light"] .site-header:not(.scrolled) .logo-light`** (3 defs)
  🔴 `public/about.html` line 516 — 1× !important
  🔴 `public/adopt.html` line 1345 — 1× !important
  🔴 `public/services.html` line 349 — 1× !important

---


## File Inventory


### CSS Files

- `public/_shared.css` (33,859 bytes)

### HTML Files with Style Blocks

- `public/about.html`
- `public/admin/dashboard.html`
- `public/admin/index.html`
- `public/admin/login.html`
- `public/admin/reset-password.html`
- `public/adopt.html`
- `public/dashboard/index.html`
- `public/dashboard.html`
- `public/donate.html`
- `public/services.html`
- `scripts/companionscpas_audit_report.html`

---


## Recommended Actions

### Immediate (before any new CSS work)
1. **Extract all inline `<style>` blocks** from `about.html`, `services.html`, `adopt.html` into `_shared.css`. These files each have a full copy of the header CSS — that's the root of every conflict.
2. **Consolidate `.site-header` blocks in `_shared.css`** — there are 3+ separate definition zones. Merge into one block + one `@media` block.
3. **Audit `!important`** — most are defensive responses to specificity wars caused by the duplication above. Once consolidated, most can be removed.
4. **Kill the `body[data-route]` header overrides** at lines 1210–1299 unless you have a hard requirement for per-route header styling.

### Medium term
5. Build a `_header.html` partial (you already have the stub) and inject it server-side rather than copy-pasting into each page.
6. Move all `--shell-h`, `--shell-max` etc. CSS vars into one `:root` block at the top of `_shared.css`.
7. Remove `about.html` / `services.html` / `adopt.html` inline `<style>` blocks entirely once step 1 is done.

---
