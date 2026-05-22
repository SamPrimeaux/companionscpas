/**
 * companionscpas_audit.js
 * ─────────────────────────────────────────────────────────────────
 * Playwright status audit — Companions of CPAS platform
 * Hits every public page + dashboard view, collects:
 *   - HTTP status / load success
 *   - Page title
 *   - Visible text sections / headings found
 *   - Images (loaded vs broken)
 *   - Console errors
 *   - Nav links present
 *   - CTA buttons found
 *   - Placeholder / empty content flags
 *   - Screenshot saved per page
 *
 * Usage:
 *   node companionscpas_audit.js
 *
 * Output:
 *   ./audit_output/report.json
 *   ./audit_output/report.html  ← human-readable status report
 *   ./audit_output/screenshots/ ← one PNG per page
 * ─────────────────────────────────────────────────────────────────
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'https://companionscpas.meauxbility.workers.dev';

const PUBLIC_PAGES = [
  { label: 'Home',     url: `${BASE}/`,        type: 'public' },
  { label: 'About',    url: `${BASE}/about`,   type: 'public' },
  { label: 'Adopt',    url: `${BASE}/adopt`,   type: 'public' },
  { label: 'Services', url: `${BASE}/services`,type: 'public' },
  { label: 'Donate',   url: `${BASE}/donate`,  type: 'public' },
];

const DASHBOARD_VIEWS = [
  { label: 'Login',        url: `${BASE}/admin/login`,                   type: 'auth'      },
  { label: 'Overview',     url: `${BASE}/dashboard?view=overview`,       type: 'dashboard' },
  { label: 'Animals',      url: `${BASE}/dashboard?view=animals`,        type: 'dashboard' },
  { label: 'Fosters',      url: `${BASE}/dashboard?view=fosters`,        type: 'dashboard' },
  { label: 'Adoptions',    url: `${BASE}/dashboard?view=adoptions`,      type: 'dashboard' },
  { label: 'Intakes',      url: `${BASE}/dashboard?view=intakes`,        type: 'dashboard' },
  { label: 'Medical',      url: `${BASE}/dashboard?view=medical`,        type: 'dashboard' },
  { label: 'Daily Care',   url: `${BASE}/dashboard?view=daily-care`,     type: 'dashboard' },
  { label: 'Volunteers',   url: `${BASE}/dashboard?view=volunteers`,     type: 'dashboard' },
  { label: 'Applications', url: `${BASE}/dashboard?view=applications`,   type: 'dashboard' },
  { label: 'Donations',    url: `${BASE}/dashboard?view=donations`,      type: 'dashboard' },
  { label: 'Fundraising',  url: `${BASE}/dashboard?view=fundraising`,    type: 'dashboard' },
  { label: 'CMS',          url: `${BASE}/dashboard?view=cms`,            type: 'dashboard' },
  { label: 'Reports',      url: `${BASE}/dashboard?view=reports`,        type: 'dashboard' },
  { label: 'Settings',     url: `${BASE}/dashboard?view=settings`,       type: 'dashboard' },
];

const ALL_PAGES = [...PUBLIC_PAGES, ...DASHBOARD_VIEWS];

const OUTPUT_DIR = path.join(__dirname, 'audit_output');
const SS_DIR    = path.join(OUTPUT_DIR, 'screenshots');
fs.mkdirSync(SS_DIR, { recursive: true });

// ── Placeholder / empty content heuristics ──────────────────────
const PLACEHOLDER_PATTERNS = [
  /lorem ipsum/i,
  /placeholder/i,
  /coming soon/i,
  /under construction/i,
  /TODO/,
  /\[.*?\]/,          // [content here] style
  /sample text/i,
  /your text here/i,
  /page not found/i,
  /404/,
  /500/,
  /error/i,
];

function flagPlaceholders(text) {
  return PLACEHOLDER_PATTERNS.filter(p => p.test(text)).map(p => p.toString());
}

// ── Status badge helper ──────────────────────────────────────────
function statusBadge(result) {
  if (result.loadError)          return '🔴 ERROR';
  if (result.httpStatus >= 500)  return '🔴 500';
  if (result.httpStatus === 404) return '🟠 404';
  if (result.httpStatus >= 400)  return '🟠 4xx';
  if (result.placeholderFlags?.length > 0) return '🟡 PARTIAL';
  if (result.consoleErrors?.length > 0)    return '🟡 WARN';
  if (result.brokenImages > 0)             return '🟡 IMG';
  return '🟢 OK';
}

// ── Audit a single page ──────────────────────────────────────────
async function auditPage(page, entry) {
  const result = {
    label:           entry.label,
    url:             entry.url,
    type:            entry.type,
    httpStatus:      null,
    finalUrl:        null,
    title:           null,
    loadError:       null,
    loadTimeMs:      null,
    consoleErrors:   [],
    consoleWarnings: [],
    h1s:             [],
    h2s:             [],
    navLinks:        [],
    ctaButtons:      [],
    images: {
      total:  0,
      broken: 0,
      srcs:   [],
    },
    brokenImages:    0,
    placeholderFlags:[],
    bodyTextLength:  0,
    visibleSections: [],
    redirected:      false,
    screenshot:      null,
  };

  // Collect console messages
  page.on('console', msg => {
    if (msg.type() === 'error')   result.consoleErrors.push(msg.text().slice(0, 200));
    if (msg.type() === 'warning') result.consoleWarnings.push(msg.text().slice(0, 200));
  });

  const t0 = Date.now();
  try {
    const response = await page.goto(entry.url, {
      waitUntil: 'domcontentloaded',
      timeout:   20000,
    });

    result.httpStatus  = response?.status() ?? null;
    result.finalUrl    = page.url();
    result.redirected  = result.finalUrl !== entry.url;
    result.loadTimeMs  = Date.now() - t0;

    // Wait a beat for any JS rendering
    await page.waitForTimeout(1500);

    result.title = await page.title();

    // Headings
    result.h1s = await page.$$eval('h1', els => els.map(e => e.innerText.trim()).filter(Boolean).slice(0, 5));
    result.h2s = await page.$$eval('h2', els => els.map(e => e.innerText.trim()).filter(Boolean).slice(0, 8));

    // Nav links
    result.navLinks = await page.$$eval('nav a, header a', els =>
      els.map(e => ({ text: e.innerText.trim(), href: e.href })).filter(e => e.text).slice(0, 20)
    );

    // CTA buttons
    result.ctaButtons = await page.$$eval(
      'button, a.btn, a[class*="cta"], a[class*="button"], [class*="btn"]',
      els => els.map(e => e.innerText.trim()).filter(Boolean).slice(0, 15)
    );

    // Images
    const imgData = await page.$$eval('img', imgs => imgs.map(img => ({
      src:      img.src,
      complete: img.complete,
      natural:  img.naturalWidth,
    })));
    result.images.total  = imgData.length;
    result.images.broken = imgData.filter(i => i.complete && i.natural === 0).length;
    result.images.srcs   = imgData.map(i => i.src).slice(0, 10);
    result.brokenImages  = result.images.broken;

    // Body text
    const bodyText = await page.$eval('body', el => el.innerText).catch(() => '');
    result.bodyTextLength = bodyText.length;
    result.placeholderFlags = flagPlaceholders(bodyText);

    // Visible sections (by common semantic selectors)
    result.visibleSections = await page.$$eval(
      'section, [class*="section"], main > div, article',
      els => els.slice(0, 12).map(el => ({
        tag:   el.tagName,
        class: el.className?.slice(0, 80) || '',
        text:  el.innerText?.slice(0, 100).trim() || '',
      }))
    );

  } catch (err) {
    result.loadError  = err.message.slice(0, 300);
    result.loadTimeMs = Date.now() - t0;
  }

  // Screenshot
  const ssFile = path.join(SS_DIR, `${entry.label.toLowerCase().replace(/\s+/g,'_')}.png`);
  try {
    await page.screenshot({ path: ssFile, fullPage: false });
    result.screenshot = ssFile;
  } catch (_) {}

  result.status = statusBadge(result);
  return result;
}

// ── HTML report generator ────────────────────────────────────────
function buildHtmlReport(results, generatedAt) {
  const rows = results.map(r => {
    const errList  = r.consoleErrors.length
      ? `<ul class="err-list">${r.consoleErrors.map(e=>`<li>${e}</li>`).join('')}</ul>` : '';
    const h1s      = r.h1s.length ? r.h1s.join(' / ') : '<em>none</em>';
    const navCount = r.navLinks.length;
    const ctaList  = r.ctaButtons.length
      ? r.ctaButtons.slice(0,6).join(', ') : '<em>none found</em>';
    const flags    = r.placeholderFlags.length
      ? `<span class="flag">${r.placeholderFlags.join(', ')}</span>` : '';
    const ssThumb  = r.screenshot
      ? `<img class="thumb" src="screenshots/${path.basename(r.screenshot)}" alt="${r.label}">` : '';
    const redirect = r.redirected
      ? `<span class="redir">↪ ${r.finalUrl}</span>` : '';
    const loadErr  = r.loadError
      ? `<div class="load-err">⚠ ${r.loadError}</div>` : '';

    return `
    <tr class="row-${r.type}">
      <td class="ss-cell">${ssThumb}</td>
      <td><strong>${r.label}</strong><br><a href="${r.url}" target="_blank" class="url">${r.url.replace('https://companionscpas.meauxbility.workers.dev','')}</a>${redirect}${loadErr}</td>
      <td class="center">${r.status}</td>
      <td class="center">${r.httpStatus ?? '—'}</td>
      <td class="center">${r.loadTimeMs ? r.loadTimeMs+'ms' : '—'}</td>
      <td>${h1s}</td>
      <td class="center">${r.images.total} / <span class="${r.brokenImages>0?'bad':'good'}">${r.brokenImages} broken</span></td>
      <td class="center">${navCount}</td>
      <td class="small">${ctaList}</td>
      <td class="small">${flags}${errList}</td>
    </tr>`;
  }).join('\n');

  const summary = {
    ok:      results.filter(r => r.status === '🟢 OK').length,
    warn:    results.filter(r => r.status.startsWith('🟡')).length,
    error:   results.filter(r => r.status.startsWith('🔴') || r.status.startsWith('🟠')).length,
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Companions CPAS — Platform Audit v1</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f0f13; color: #e2e8f0; font-size: 13px; }
  header { background: #1a1a2e; border-bottom: 2px solid #7c3aed; padding: 24px 32px; }
  header h1 { font-size: 22px; font-weight: 700; color: #a78bfa; }
  header p  { color: #94a3b8; margin-top: 4px; font-size: 12px; }
  .summary  { display: flex; gap: 16px; padding: 20px 32px; background: #12121c; }
  .stat     { background: #1e1e30; border-radius: 8px; padding: 14px 24px; text-align: center; min-width: 100px; }
  .stat .n  { font-size: 28px; font-weight: 800; }
  .stat .l  { font-size: 11px; color: #94a3b8; margin-top: 2px; }
  .green .n { color: #4ade80; }
  .yellow .n{ color: #facc15; }
  .red .n   { color: #f87171; }
  .section-header { padding: 16px 32px 8px; font-size: 11px; font-weight: 700; letter-spacing: .1em; color: #7c3aed; text-transform: uppercase; border-top: 1px solid #2d2d44; margin-top: 8px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #1e1e30; color: #94a3b8; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; padding: 10px 12px; text-align: left; position: sticky; top: 0; z-index: 10; }
  td { padding: 10px 12px; border-bottom: 1px solid #1e1e30; vertical-align: top; }
  tr.row-public   { background: #12121c; }
  tr.row-auth     { background: #13101e; }
  tr.row-dashboard{ background: #0f0f1a; }
  tr:hover        { background: #1a1a2e !important; }
  .thumb  { width: 120px; height: 70px; object-fit: cover; border-radius: 4px; border: 1px solid #2d2d44; display: block; }
  .url    { color: #7c3aed; font-size: 11px; word-break: break-all; }
  .center { text-align: center; }
  .small  { font-size: 11px; color: #94a3b8; max-width: 200px; }
  .good   { color: #4ade80; }
  .bad    { color: #f87171; font-weight: 600; }
  .flag   { background: #422006; color: #fb923c; padding: 2px 6px; border-radius: 3px; font-size: 10px; }
  .redir  { display: block; font-size: 10px; color: #94a3b8; margin-top: 2px; }
  .load-err { color: #f87171; font-size: 10px; margin-top: 4px; }
  .err-list { color: #f87171; font-size: 10px; padding-left: 14px; margin-top: 4px; }
  .ss-cell  { width: 130px; }
  .generated { padding: 12px 32px; font-size: 11px; color: #4b5563; border-top: 1px solid #1e1e30; margin-top: 16px; }
</style>
</head>
<body>
<header>
  <h1>🐾 Companions of CPAS — Platform Audit v1</h1>
  <p>Generated ${generatedAt} · ${results.length} pages audited · ${BASE}</p>
</header>

<div class="summary">
  <div class="stat green"><div class="n">${summary.ok}</div><div class="l">🟢 OK</div></div>
  <div class="stat yellow"><div class="n">${summary.warn}</div><div class="l">🟡 Needs Work</div></div>
  <div class="stat red"><div class="n">${summary.error}</div><div class="l">🔴 Broken</div></div>
  <div class="stat"><div class="n">${results.length}</div><div class="l">Total Pages</div></div>
</div>

<div class="section-header">Public Pages</div>
<table>
  <thead><tr>
    <th>Screenshot</th><th>Page</th><th>Status</th><th>HTTP</th><th>Load</th>
    <th>H1</th><th>Images</th><th>Nav Links</th><th>CTAs</th><th>Issues</th>
  </tr></thead>
  <tbody>
    ${results.filter(r=>r.type==='public').map(r => rows.split('\n').find(row=>row.includes(`>${r.label}</strong>`))||'').join('\n')}
  </tbody>
</table>

<div class="section-header">Auth</div>
<table>
  <thead><tr>
    <th>Screenshot</th><th>Page</th><th>Status</th><th>HTTP</th><th>Load</th>
    <th>H1</th><th>Images</th><th>Nav Links</th><th>CTAs</th><th>Issues</th>
  </tr></thead>
  <tbody>
    ${results.filter(r=>r.type==='auth').map(r => rows.split('\n').find(row=>row.includes(`>${r.label}</strong>`))||'').join('\n')}
  </tbody>
</table>

<div class="section-header">Dashboard Views</div>
<table>
  <thead><tr>
    <th>Screenshot</th><th>Page</th><th>Status</th><th>HTTP</th><th>Load</th>
    <th>H1</th><th>Images</th><th>Nav Links</th><th>CTAs</th><th>Issues</th>
  </tr></thead>
  <tbody>
    ${results.filter(r=>r.type==='dashboard').map(r => rows.split('\n').find(row=>row.includes(`>${r.label}</strong>`))||'').join('\n')}
  </tbody>
</table>

<div class="generated">Audit script: companionscpas_audit.js · Playwright ${require('playwright/package.json').version}</div>
</body>
</html>`;
}

// ── Main ─────────────────────────────────────────────────────────
(async () => {
  console.log('🐾 Companions CPAS — Platform Audit v1');
  console.log(`   ${ALL_PAGES.length} pages to audit\n`);

  const browser = await chromium.launch({ headless: true });
  const results  = [];

  for (const entry of ALL_PAGES) {
    const ctx  = await browser.newContext({
      viewport:  { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) CompanionsCPAS-Audit/1.0',
    });
    const page = await ctx.newPage();

    process.stdout.write(`  Auditing [${entry.type.padEnd(9)}] ${entry.label.padEnd(14)} ... `);
    const result = await auditPage(page, entry);
    results.push(result);
    console.log(result.status + (result.loadTimeMs ? ` (${result.loadTimeMs}ms)` : ''));

    await ctx.close();
  }

  await browser.close();

  // ── Write JSON ──────────────────────────────────────────────────
  const jsonPath = path.join(OUTPUT_DIR, 'report.json');
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));

  // ── Write HTML ──────────────────────────────────────────────────
  const generatedAt = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }) + ' CT';

  // Rebuild HTML properly using all rows
  const allRows = results.map(r => {
    const errList  = r.consoleErrors.length
      ? `<ul class="err-list">${r.consoleErrors.map(e=>`<li>${e}</li>`).join('')}</ul>` : '';
    const h1s      = r.h1s.length ? r.h1s.join(' / ') : '<em>none</em>';
    const navCount = r.navLinks.length;
    const ctaList  = r.ctaButtons.length
      ? r.ctaButtons.slice(0,6).join(', ') : '<em>none found</em>';
    const flags    = r.placeholderFlags.length
      ? `<span class="flag">${r.placeholderFlags.join(', ')}</span>` : '';
    const ssThumb  = r.screenshot
      ? `<img class="thumb" src="screenshots/${path.basename(r.screenshot)}" alt="${r.label}">` : '';
    const redirect = r.redirected
      ? `<span class="redir">↪ ${r.finalUrl}</span>` : '';
    const loadErr  = r.loadError
      ? `<div class="load-err">⚠ ${r.loadError}</div>` : '';
    return { type: r.type, label: r.label, html: `
    <tr class="row-${r.type}" data-label="${r.label}">
      <td class="ss-cell">${ssThumb}</td>
      <td><strong>${r.label}</strong><br><a href="${r.url}" target="_blank" class="url">${r.url.replace('https://companionscpas.meauxbility.workers.dev','')}</a>${redirect}${loadErr}</td>
      <td class="center">${r.status}</td>
      <td class="center">${r.httpStatus ?? '—'}</td>
      <td class="center">${r.loadTimeMs ? r.loadTimeMs+'ms' : '—'}</td>
      <td>${h1s}</td>
      <td class="center">${r.images.total} / <span class="${r.brokenImages>0?'bad':'good'}">${r.brokenImages} broken</span></td>
      <td class="center">${navCount}</td>
      <td class="small">${ctaList}</td>
      <td class="small">${flags}${errList}</td>
    </tr>` };
  });

  const summary = {
    ok:    results.filter(r => r.status === '🟢 OK').length,
    warn:  results.filter(r => r.status.startsWith('🟡')).length,
    error: results.filter(r => r.status.startsWith('🔴') || r.status.startsWith('🟠')).length,
  };

  const tableFor = type => allRows.filter(r=>r.type===type).map(r=>r.html).join('\n');
  const thead = `<thead><tr>
    <th>Screenshot</th><th>Page</th><th>Status</th><th>HTTP</th><th>Load</th>
    <th>H1</th><th>Images</th><th>Nav Links</th><th>CTAs</th><th>Issues</th>
  </tr></thead>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Companions CPAS — Platform Audit v1</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f0f13; color: #e2e8f0; font-size: 13px; }
  header { background: #1a1a2e; border-bottom: 2px solid #7c3aed; padding: 24px 32px; }
  header h1 { font-size: 22px; font-weight: 700; color: #a78bfa; }
  header p  { color: #94a3b8; margin-top: 4px; font-size: 12px; }
  .summary  { display: flex; gap: 16px; padding: 20px 32px; background: #12121c; flex-wrap: wrap; }
  .stat     { background: #1e1e30; border-radius: 8px; padding: 14px 24px; text-align: center; min-width: 100px; }
  .stat .n  { font-size: 28px; font-weight: 800; }
  .stat .l  { font-size: 11px; color: #94a3b8; margin-top: 2px; }
  .green .n { color: #4ade80; } .yellow .n { color: #facc15; } .red .n { color: #f87171; }
  .section-header { padding: 16px 32px 8px; font-size: 11px; font-weight: 700; letter-spacing: .1em; color: #7c3aed; text-transform: uppercase; border-top: 1px solid #2d2d44; margin-top: 8px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #1e1e30; color: #94a3b8; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; padding: 10px 12px; text-align: left; }
  td { padding: 10px 12px; border-bottom: 1px solid #1e1e30; vertical-align: top; }
  tr.row-public { background: #12121c; } tr.row-auth { background: #13101e; } tr.row-dashboard { background: #0f0f1a; }
  tr:hover { background: #1a1a2e !important; }
  .thumb { width: 120px; height: 70px; object-fit: cover; border-radius: 4px; border: 1px solid #2d2d44; display: block; }
  .url { color: #7c3aed; font-size: 11px; word-break: break-all; }
  .center { text-align: center; } .small { font-size: 11px; color: #94a3b8; max-width: 200px; }
  .good { color: #4ade80; } .bad { color: #f87171; font-weight: 600; }
  .flag { background: #422006; color: #fb923c; padding: 2px 6px; border-radius: 3px; font-size: 10px; }
  .redir { display: block; font-size: 10px; color: #94a3b8; margin-top: 2px; }
  .load-err { color: #f87171; font-size: 10px; margin-top: 4px; }
  .err-list { color: #f87171; font-size: 10px; padding-left: 14px; margin-top: 4px; }
  .ss-cell { width: 130px; }
  .generated { padding: 12px 32px; font-size: 11px; color: #4b5563; border-top: 1px solid #1e1e30; margin-top: 16px; }
</style>
</head>
<body>
<header>
  <h1>🐾 Companions of CPAS — Platform Audit v1</h1>
  <p>Generated ${generatedAt} · ${results.length} pages audited · ${BASE}</p>
</header>
<div class="summary">
  <div class="stat green"><div class="n">${summary.ok}</div><div class="l">🟢 OK</div></div>
  <div class="stat yellow"><div class="n">${summary.warn}</div><div class="l">🟡 Needs Work</div></div>
  <div class="stat red"><div class="n">${summary.error}</div><div class="l">🔴 Broken</div></div>
  <div class="stat"><div class="n">${results.length}</div><div class="l">Total Pages</div></div>
</div>
<div class="section-header">Public Pages</div>
<table>${thead}<tbody>${tableFor('public')}</tbody></table>
<div class="section-header">Auth</div>
<table>${thead}<tbody>${tableFor('auth')}</tbody></table>
<div class="section-header">Dashboard Views</div>
<table>${thead}<tbody>${tableFor('dashboard')}</tbody></table>
<div class="generated">Audit run: ${generatedAt} · companionscpas_audit.js</div>
</body>
</html>`;

  const htmlPath = path.join(OUTPUT_DIR, 'report.html');
  fs.writeFileSync(htmlPath, html);

  // ── Console summary ─────────────────────────────────────────────
  console.log('\n─────────────────────────────────────────');
  console.log(`  🟢 OK           ${summary.ok}`);
  console.log(`  🟡 Needs Work   ${summary.warn}`);
  console.log(`  🔴 Broken       ${summary.error}`);
  console.log('─────────────────────────────────────────');
  console.log(`  JSON  → ${jsonPath}`);
  console.log(`  HTML  → ${htmlPath}`);
  console.log(`  SS    → ${SS_DIR}/`);
  console.log('\nIssues found:');
  results.filter(r => !r.status.startsWith('🟢')).forEach(r => {
    console.log(`  ${r.status}  ${r.label.padEnd(14)} ${r.url.replace(BASE,'')}`);
    if (r.loadError)            console.log(`            Error: ${r.loadError.slice(0,100)}`);
    if (r.consoleErrors.length) console.log(`            Console errors: ${r.consoleErrors.length}`);
    if (r.brokenImages > 0)     console.log(`            Broken images: ${r.brokenImages}`);
    if (r.placeholderFlags.length) console.log(`            Placeholder flags: ${r.placeholderFlags.join(', ')}`);
  });
})();
