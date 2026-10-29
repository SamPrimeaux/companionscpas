/**
 * Stage the EXACT installed ecommerce Theme Studio shell.
 * The only HTML delta is replacing its script loader with the Companions
 * host adapter bootstrap; the app's GUI source is never rewritten.
 */
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { resolve, join, dirname } from 'node:path';
import { createRequire } from 'node:module';
const req=createRequire(import.meta.url);
const pkgRoot=dirname(req.resolve('@inneranimalmedia/ecommerce-cms-agentsam/manifest'));
// Use the assembled *packaged* distribution, not Local Studio or raw
// source fallbacks. Missing files fail the build instead of drifting.
const source=join(pkgRoot,'dist/assets/admin');
const dest=resolve('public/dashboard/sdk');
const files=[
  ['css/admin.css'],['css/console.css'],['css/theme-editor.css'],
  ['css/theme-settings-live.css'],['css/agentsam.css'],['css/revise-atlas.css'],
  ['js/shell.js'],['js/agentsam.js'],['js/inspector.js'],['js/cms-authoring-engine.js'],['js/pages-shared.js'],
  ['js/portable-sections.js'],['js/revise-atlas.js'],
  ['js/theme-preview-registry.js'],['js/miniagentsam-codepreview.js'],
  ['js/resolve-studio.js'],['js/theme-editor.js'],
  ['js/theme-settings-live.js'],['js/resolve-theme-settings.js'],
  ['js/theme-editor-mini-agentsam.mjs'],
  ['brand/agentsam-gorilla-tiny.svg']
].map(([p])=>p);
for(const file of files){
 await mkdir(dirname(join(dest,file)),{recursive:true});
 await copyFile(join(source,file),join(dest,file));
}

// Keep the package-owned shell, but replace its generic commerce navigation
// with real Companions destinations. These are routes in the existing host app.
const shellPath=join(dest,'js/shell.js');
let shellJs=await readFile(shellPath,'utf8');
const navStart=shellJs.indexOf('const NAV = {');
const navEnd=shellJs.indexOf('\n};',navStart);
if(navStart<0||navEnd<0) throw Error('Could not locate canonical package navigation config');
const companionsNav = `const NAV = {
  main: [
    { href: "/dashboard/overview", label: "Home", icon: "home" },
    {
      id: "animal-care",
      href: "/dashboard/animals",
      label: "Animal Care",
      icon: "products",
      children: [
        { href: "/dashboard/animals", label: "Animals" },
        { href: "/dashboard/intakes", label: "Intakes" },
        { href: "/dashboard/medical", label: "Medical" },
      ],
    },
    {
      id: "placement",
      href: "/dashboard/fosters",
      label: "Placement",
      icon: "customers",
      children: [
        { href: "/dashboard/fosters", label: "Fosters" },
        { href: "/dashboard/adoptions", label: "Adoptions" },
        { href: "/dashboard/applications", label: "Applications" },
      ],
    },
    { href: "/dashboard/volunteers", label: "Community", icon: "customers" },
    { href: "/dashboard/fundraising", label: "Giving", icon: "finance" },
    { href: "/dashboard/reports", label: "Reports & Analytics", icon: "analytics" },
    { href: "/dashboard/settings", label: "Organization Settings", icon: "settings" },
  ],
  channels: [
    {
      id: "online-store",
      href: "/dashboard/cms/website",
      label: "Website & Content",
      icon: "store",
      children: [
        { href: "/dashboard/cms/website", label: "Website Overview" },
        { href: "/dashboard/cms/pages", label: "Pages" },
        { href: "/dashboard/cms/images", label: "Media Library" },
        { href: "/dashboard/cms/forms", label: "Forms" },
        { href: "/dashboard/cms/brand", label: "Brand & Settings" },
      ],
    },
  ],
  apps: [
    {
      id: "companions-email",
      label: "Email & Outreach",
      icon: "email",
      href: "/dashboard/email",
      children: [
        { href: "/dashboard/email", label: "Inbox" },
      ],
    },
  ],
};`;
shellJs=shellJs.slice(0,navStart)+companionsNav+shellJs.slice(navEnd+3);
const logoAnchor='const LOGO_URL =\n  "https://imagedelivery.net/g7wf09fCONpnidkRnR_5vw/ad23b2d9-e2e4-4ad6-eb81-9e4c983df000/thumbnail";';
if(!shellJs.includes(logoAnchor)) throw Error('Could not locate package shell logo');
shellJs=shellJs.replace(logoAnchor,'const LOGO_URL = "/static/global/logo-header.png";');
const appsLabel='<div class="console-nav-label console-nav-label--apps"><span>Apps</span>';
if(!shellJs.includes(appsLabel)) throw Error('Could not locate package Apps nav label');
shellJs=shellJs.replace(appsLabel,'<div class="console-nav-label console-nav-label--apps"><span>Communication</span>');
const appsStart=shellJs.indexOf('      <div class="console-nav-label console-nav-label--apps">');
const appsEnd=shellJs.indexOf('      <div class="console-nav-group">${apps}</div>',appsStart);
if(appsStart<0||appsEnd<0) throw Error('Could not locate package app catalog menu');
const compactApps='      <div class="console-nav-label console-nav-label--apps"><span>Communication</span></div>\n      <div class="console-nav-group">${apps}</div>';
shellJs=shellJs.slice(0,appsStart)+compactApps+shellJs.slice(appsEnd+'      <div class="console-nav-group">${apps}</div>'.length);
shellJs=shellJs.replace('<div class="console-nav-label">Sales channels</div>','<div class="console-nav-label">Website</div>');
shellJs=shellJs.replace('label: "Sales channels"','label: "Website"');
shellJs=shellJs.replace('<strong>Fuel &amp; Free Time</strong>','<strong>Companions of CPAS</strong>');
const preferencesLink='<a href="/admin/preferences" class="console-menu-item" role="menuitem">Store preferences</a>';
if(!shellJs.includes(preferencesLink)) throw Error('Could not locate package profile preferences link');
shellJs=shellJs.replace(preferencesLink,'<a href="/dashboard/cms/brand" class="console-menu-item" role="menuitem">Brand &amp; website settings</a>');
const accountLink='<a href="/admin/account" class="console-menu-item" role="menuitem">Account &amp; password</a>';
if(!shellJs.includes(accountLink)) throw Error('Could not locate package account settings link');
shellJs=shellJs.replace(accountLink,'<a href="/dashboard/settings" class="console-menu-item" role="menuitem">Organization settings</a>');
await writeFile(shellPath,shellJs);
await copyFile(resolve('scripts/local-cms/theme-studio/studio-agent-host.js'),join(dest,'studio-agent-host.js'));
await mkdir(join(dest,'theme-editor-lib'),{recursive:true});
await copyFile(join(pkgRoot,'frontend/theme-editor/bridge.mjs'),join(dest,'theme-editor-lib/bridge.mjs'));
let html=await readFile(join(source,'theme-editor.html'),'utf8');
if (!html.includes('<script src="/admin/js/theme-editor.js"></script>')) throw Error('Unexpected upstream Theme Studio HTML');
html=html.replace('<title>Theme Studio — AgentSam Commerce</title>','<title>Website Studio — Companions of CPAS</title>');
html=html.replace('<link rel="stylesheet" href="/admin/css/revise-atlas.css">',
  '<link rel="stylesheet" href="/admin/css/revise-atlas.css">\n' +
  '<link rel="stylesheet" href="/dashboard/sdk/shell.css">\n' +
  '<link rel="stylesheet" href="/dashboard/sdk/dashboard-mini-sdk.css">\n' +
  '<link rel="stylesheet" href="/dashboard/sdk/dashboard-host.css">');
const agentRuntime = [
  '<script src="https://unpkg.com/react@18.3.1/umd/react.development.js" integrity="sha384-hD6/rw4ppMLGNu3tX5cjIb+uRZ7UkRJ6BPkLpg4hAu/6onKUg4lLsHAs9EBPT82L" crossorigin="anonymous"></script>',
  '<script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js" integrity="sha384-u6aeetuaXnQ38mYT8rp6sbXaQe3NL9t+IBXmnYxwkUI2Hw4bsp2Wvmx4yRQF1uAm" crossorigin="anonymous"></script>',
  '<script src="/dashboard/sdk/dashboard-shell-sdk.js"></script>',
  '<script src="/dashboard/js/agentsam.jsx?v=companions-studio-agent-20261029"></script>',
  '<script src="/dashboard/sdk/studio-agent-host.js"></script>',
  '<script src="/dashboard/sdk/studio-host-bridge.js"></script>',
  '<script src="/admin/js/shell.js"></script>',
].join('\n');
html=html.replace('<script src="/admin/js/shell.js"></script>',agentRuntime);
html=html.replace('<script src="/admin/js/theme-editor.js"></script>',
  '<script type="module" src="/dashboard/sdk/studio-boot.mjs"></script>');
html=html.replace('<script type="module" src="/admin/js/theme-editor-generation-bootstrap.mjs"></script>','');
await writeFile(join(dest,'forms-theme-shell.html'),html);
await build({
  entryPoints:[resolve('scripts/local-cms/theme-studio/studio-host-bridge.ts')],
  outfile:join(dest,'studio-host-bridge.js'),
  bundle:true,platform:'browser',format:'iife',target:'es2022',logLevel:'warning',
});
for (const entry of ['forms-theme-boot', 'pages-theme-boot', 'studio-boot']) {
 await build({
  entryPoints:[resolve('scripts/local-cms/theme-studio',entry+'.ts')],
  outfile:join(dest,entry+'.mjs'),
  bundle:true,platform:'browser',format:'esm',target:'es2022',
  logLevel:'warning'
 });
}

// Stage the package-owned Online Store overview as the CMS landing page.
// The SDK still owns the page layout; the local adapter only changes tenant copy/data.
function replaceStoreOnce(sourceText, from, to, label) {
 const index=sourceText.indexOf(from);
 if(index<0) throw Error('Missing Online Store template anchor: '+label);
 return sourceText.slice(0,index)+to+sourceText.slice(index+from.length);
}
function replaceStoreAll(sourceText, from, to, label) {
 const count=sourceText.split(from).length-1;
 if(!count) throw Error('Missing Online Store template anchor: '+label);
 return sourceText.split(from).join(to);
}
let storeHtml=await readFile(join(source,'store.html'),'utf8');
storeHtml=replaceStoreAll(storeHtml,'<title>Online Store — Fuel & Free Time Admin</title>','<title>Website — Companions of CPAS</title>','document title');
storeHtml=replaceStoreAll(storeHtml,'<link rel="stylesheet" href="/admin/css/theme-product-browser.css">','','foreign template css');
const backtick=String.fromCharCode(96);
const storeRenderAnchor='<script>\nrenderShell("/admin/store", '+backtick;
storeHtml=replaceStoreOnce(storeHtml,storeRenderAnchor,'<script>\nconst COMPANIONS_EDITOR_URL="/dashboard/cms/website/editor?surface=pages&slug=home";\nrenderShell("/dashboard/cms/website", '+backtick,'editor URL');
storeHtml=replaceStoreAll(storeHtml,'<h1>Online Store</h1>','<h1>Website</h1>','page heading');
storeHtml=replaceStoreAll(storeHtml,'<a href="#theme-product-marketplace" class="btn ghost small" id="browse-themes-shortcut">Browse templates</a>','<a href="/dashboard/cms/website/editor?surface=pages&amp;slug=home" class="btn ghost small" id="browse-themes-shortcut">Open editor</a>','editor link');
storeHtml=replaceStoreAll(storeHtml,'title="Connect a site to preview the published storefront"','title="Open the published website"','view site title');
storeHtml=replaceStoreAll(storeHtml,'aria-label="Current theme"','aria-label="Published website preview"','preview label');
storeHtml=replaceStoreAll(storeHtml,'Desktop · Verified live only','Desktop · Published content · local preview','preview caption');
storeHtml=replaceStoreAll(storeHtml,'id="active-theme-name">No active theme','id="active-theme-name">Companions of CPAS website','site name');
storeHtml=replaceStoreAll(storeHtml,'<section class="online-store-card online-store-drafts" id="draft-themes" aria-label="Draft themes">','<section class="online-store-card online-store-drafts" id="draft-themes" aria-label="Website drafts">','draft list accessibility');
storeHtml=replaceStoreAll(storeHtml,'<div class="online-store-draft-thumb" aria-hidden="true"><span>Draft</span></div>','<div class="online-store-draft-thumb" aria-hidden="true"><span>Page draft</span></div>','page draft thumb');
storeHtml=replaceStoreAll(storeHtml,'<div class="online-store-version">Private draft · Not published</div>','<div class="online-store-version">Saved privately · Not published</div>','page draft status');
storeHtml=replaceStoreAll(storeHtml,'theme.name||"Untitled theme"','theme.name||"Untitled page"','draft fallback name');
storeHtml=replaceStoreAll(storeHtml,'theme.meta||theme.package||"Packaged theme"','theme.meta||theme.route||"Website page"','draft fallback metadata');

storeHtml=replaceStoreAll(storeHtml,'href="/admin/theme-editor?slug=home" class="btn primary" id="edit-theme-btn">Edit theme','href="/dashboard/cms/website/editor?surface=pages&amp;slug=home" class="btn primary" id="edit-theme-btn">Edit website','main editor link');
storeHtml=replaceStoreAll(storeHtml,'<h2>Draft themes</h2>','<h2>Website drafts</h2>','draft heading');
storeHtml=replaceStoreAll(storeHtml,'<p>These themes are only visible to you. Publishing a theme from your library will switch it to your current theme.</p>','<p>Private page edits saved in this local studio. Published website content stays unchanged until a reviewed publish workflow is connected.</p>','draft description');
storeHtml=replaceStoreAll(storeHtml,'id="import-theme-btn">Import ','id="import-theme-btn">Open editor ','draft CTA label');
storeHtml=replaceStoreAll(storeHtml,'<span>30 days</span>','<span>Website content</span>','metric period');
storeHtml=replaceStoreAll(storeHtml,'<div class="label">LCP P75</div>','<div class="label">Published pages</div>','published count label');
storeHtml=replaceStoreAll(storeHtml,'<div class="label">INP P75</div>','<div class="label">Pages with drafts</div>','draft count label');
storeHtml=replaceStoreAll(storeHtml,'<div class="label">Cumulative Layout Shift</div>','<div class="label">Content sections</div>','section count label');
storeHtml=replaceStoreAll(storeHtml,'<div class="label">Sessions by Device Type</div>','<div class="label">Page status</div>','page status label');
storeHtml=replaceStoreAll(storeHtml,'<span class="device desktop">— Desktop</span>','<span class="device desktop">— Published</span>','published status placeholder');
storeHtml=replaceStoreAll(storeHtml,'<span class="device mobile">— Mobile</span>','<span class="device mobile">— Draft</span>','draft status placeholder');

// Do not show the generic starter-store mock if the real tenant preview fails.
const fallbackStart=storeHtml.indexOf('function showThemeUnavailable(state, message) {');
const fallbackEnd=storeHtml.indexOf('\nfunction showActiveTheme',fallbackStart);
if(fallbackStart<0||fallbackEnd<0) throw Error('Could not isolate Online Store preview fallback');
const fallback=[
'function showThemeUnavailable(state, message) {',
'  const status=document.getElementById("active-theme-status");',
'  const name=document.getElementById("active-theme-name");',
'  const saved=document.getElementById("active-theme-saved");',
'  const edit=document.getElementById("edit-theme-btn");',
'  if(status){status.className="online-store-badge online-store-badge--pending";status.textContent="Preview unavailable";}',
'  if(name)name.textContent="Website preview unavailable";',
'  if(saved)saved.textContent=message||"The published website could not be rendered in this local preview."; ',
'  if(edit){edit.href=COMPANIONS_EDITOR_URL;edit.textContent="Open editor";}',
'  const version=document.getElementById("active-theme-version");if(version)version.hidden=true;',
'  for(const id of ["theme-preview-desktop","theme-preview-mobile"]){',
'    const frame=document.getElementById(id);if(!frame)continue;frame.removeAttribute("src");',
'    const shell=frame.parentElement;if(!shell)continue;shell.dataset.previewStatus="failed";',
'    shell.querySelector(".online-store-preview-message")?.remove();',
'    const note=document.createElement("div");note.className="online-store-preview-message";',
'    note.textContent="Preview unavailable — refresh or open the editor.";shell.appendChild(note);',
'  }',
'}'
].join('\n');
storeHtml=storeHtml.slice(0,fallbackStart)+fallback+storeHtml.slice(fallbackEnd+1);
storeHtml=replaceStoreAll(storeHtml,'status.textContent = theme.verified === true ? "Active" : "Unverified";','status.textContent = theme.verified === true ? "Published" : "Unverified";','published badge');
storeHtml=replaceStoreAll(storeHtml,'edit.href = theme.edit_href || "/admin/theme-editor?slug=home";','edit.href = theme.edit_href || COMPANIONS_EDITOR_URL;','active edit target');
storeHtml=replaceStoreAll(storeHtml,'edit.textContent = "Edit theme";','edit.textContent = "Edit website";','active edit label');
storeHtml=replaceStoreAll(storeHtml,'lcp.textContent = formatMs(perf.lcp_ms);','lcp.textContent = formatSessions(perf.published_pages);','published page metric');
storeHtml=replaceStoreAll(storeHtml,'inp.textContent = formatMs(perf.inp_ms);','inp.textContent = formatSessions(perf.draft_pages);','draft page metric');
storeHtml=replaceStoreAll(storeHtml,'cls.textContent = formatShift(perf.cls);','cls.textContent = formatSessions(perf.sections);','section metric');
storeHtml=replaceStoreAll(storeHtml,'    labelMetricAvailability(lcp, perf.lcp_ms);\n    labelMetricAvailability(inp, perf.inp_ms);\n    labelMetricAvailability(cls, perf.cls);\n','','remove web-vitals labels');
storeHtml=replaceStoreAll(storeHtml,'const desktop = formatSessions(perf.sessions_desktop);','const desktop = formatSessions(perf.published_pages);','published status count');
storeHtml=replaceStoreAll(storeHtml,'const mobile = formatSessions(perf.sessions_mobile);','const mobile = formatSessions(perf.draft_pages);','draft status count');
storeHtml=replaceStoreAll(storeHtml,'span.textContent = count + " " + (type === "desktop" ? "Desktop" : "Mobile");','span.textContent = count + " " + (type === "desktop" ? "Published" : "Draft");','page status values');
storeHtml=replaceStoreAll(storeHtml,'sessions.title = "Storefront sessions are not measured yet when shown as —";','sessions.title = "Published pages and pages with private drafts.";','page status tooltip');
storeHtml=replaceStoreAll(storeHtml,'editLink.href = theme?.edit_href || "/admin/theme-editor?slug=home";','editLink.href = theme?.edit_href || COMPANIONS_EDITOR_URL;','edit fallback target');
storeHtml=replaceStoreAll(storeHtml,'document.getElementById("import-theme-btn")?.addEventListener("click", () => {\n  alert("Theme import is coming soon. Use the theme editor to customize your live storefront.");\n});','document.getElementById("import-theme-btn")?.addEventListener("click", () => { window.location.href=COMPANIONS_EDITOR_URL; });','draft CTA behavior');

// The template marketplace is tied to Fuel & Free Time's product catalog.
storeHtml=storeHtml.replace(/\s*<section class="online-store-card theme-marketplace" id="theme-product-marketplace"[\s\S]*?<\/section>/,'');
storeHtml=replaceStoreAll(storeHtml,'<script src="/admin/js/theme-product-browser.js"></script>','','remove unrelated catalog runtime');

// Make each real page draft open the same canonical Theme Studio.
const dollar=String.fromCharCode(36);
const draftHref='<a href="'+dollar+'{escapeThemeText(theme.edit_href || "/dashboard/cms/website/editor?surface=pages&slug=home")}" class="btn primary small">Open draft</a>';
storeHtml=replaceStoreAll(storeHtml,'<button type="button" class="btn ghost small" disabled title="Connect this draft to a CMS site before editing">Connect site to edit</button>',draftHref,'draft editor link');
const emptyState='  if(!Array.isArray(drafts)||drafts.length===0){container.innerHTML = "<div class=\\\"online-store-drafts-empty\\\"><strong>No website drafts yet</strong><p>Saved edits appear here without changing the published site.</p><a class=\\\"btn ghost small\\\" href=\\\"" + COMPANIONS_EDITOR_URL + "\\">Open website editor</a></div>";return;}\n  container.innerHTML=(drafts||[]).map(renderDraftRow).join("");';
storeHtml=replaceStoreOnce(storeHtml,'  container.innerHTML=(drafts||[]).map(renderDraftRow).join("");',emptyState,'empty drafts state');
storeHtml=replaceStoreOnce(storeHtml,'<link rel="stylesheet" href="/admin/css/console.css">','<link rel="stylesheet" href="/admin/css/console.css">\n<style>.online-store-drafts-empty{padding:24px;display:grid;gap:8px;color:var(--c-ink)}.online-store-drafts-empty p{margin:0;color:#6b6b6b;font-size:13px;line-height:1.55}.online-store-drafts-empty strong{font-size:14px}.online-store-drafts-empty .btn{justify-self:start;margin-top:5px}.online-store-preview-caption{max-width:100%;white-space:normal}</style>','hub local styles');
await writeFile(join(dest,'store-theme-shell.html'),storeHtml);
console.log('Canonical ecommerce Online Store hub staged for Companions.');

console.log('Canonical ecommerce Theme Studio shell staged:',files.length,'original package assets + bridge');
