/** Acceptance for the standalone Ecommerce website hub and its draft handoff. */
import { readFileSync } from 'node:fs';
const base = 'http://127.0.0.1:4473';
const source = readFileSync('.wrangler/companions-local-cms/local-login.txt', 'utf8');
const credentials = Object.fromEntries(source.split('\n').filter(line => line.includes('=')).map(line => {
  const index = line.indexOf('=');
  return [line.slice(0, index), line.slice(index + 1)];
}));
const login = await fetch(base + '/api/auth/login', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(credentials),
});
if (!login.ok) throw Error('Local authentication failed');
const cookie = login.headers.get('set-cookie')?.split(';')[0];
if (!cookie) throw Error('No authenticated session cookie');
const request = (path, options = {}) => fetch(base + path, {
  ...options,
  headers: { ...(options.headers || {}), cookie },
});
const hubResponse = await request('/dashboard/cms/website');
const hubHtml = await hubResponse.text();
if (!hubResponse.ok) throw Error('Website hub failed: ' + hubResponse.status);
for (const marker of [
  '<title>Website — Companions of CPAS</title>',
  'id="theme-preview-desktop"',
  'id="theme-preview-mobile"',
  'Website drafts',
  'Published pages',
  'Pages with drafts',
  '/dashboard/cms/website/editor?surface=pages&amp;slug=home',
  'No website drafts yet',
]) if (!hubHtml.includes(marker)) throw Error('Website hub missing marker: ' + marker);
if (hubHtml.includes('cpas-sidebar') || hubHtml.includes('id="root"')) {
  throw Error('Legacy Companions dashboard shell wrapped the Ecommerce website hub');
}
if (hubHtml.includes('theme-product-marketplace') || hubHtml.includes('A storefront with room to grow')) {
  throw Error('Foreign template catalog or generic fake storefront leaked into tenant hub');
}
const pagesAlias = await request('/dashboard/cms/pages', { redirect: 'manual' });
if (pagesAlias.status !== 302 ||
    pagesAlias.headers.get('location') !== base + '/dashboard/cms/website/editor?surface=pages&slug=home') {
  throw Error('Pages route did not enter the canonical full-screen Studio');
}
const formsAlias = await request('/dashboard/cms/forms', { redirect: 'manual' });
if (formsAlias.status !== 302 ||
    formsAlias.headers.get('location') !== base + '/dashboard/cms/website/editor?surface=forms') {
  throw Error('Forms route did not enter the canonical full-screen Studio');
}
const editorResponse = await request('/dashboard/cms/website/editor?surface=pages&slug=home');
const editorHtml = await editorResponse.text();
if (!editorResponse.ok || !editorHtml.includes('Theme Studio — AgentSam Commerce') ||
    !editorHtml.includes('/dashboard/sdk/studio-boot.mjs')) {
  throw Error('Edit website does not open the canonical full-screen Theme Studio');
}
const assistantAsset = await request('/admin/js/agentsam.js');
if (!assistantAsset.ok || !(await assistantAsset.text()).includes('initAgentsamDrawer')) {
  throw Error('Canonical AgentSam assistant runtime was not staged');
}
const overviewResponse = await request('/api/admin/store/online');
const overview = await overviewResponse.json();
if (!overviewResponse.ok || overview.store?.visibility !== 'public' ||
    overview.active_theme?.preview_href !== '/' ||
    !overview.active_theme?.edit_href ||
    Number(overview.performance?.published_pages) < 1 ||
    Number(overview.performance?.sections) < 1) {
  throw Error('Website overview API did not return real Companions CMS data: ' + JSON.stringify(overview));
}

// Exercise the draft handoff against a temporary local-only draft, then remove it.
let temporaryDraft = null;
try {
  const pageResponse = await request('/api/cms/page?route=%2F');
  const pageData = await pageResponse.json();
  const section = (pageData.sections || []).find(item => item.section_type !== 'raw_html');
  if (!pageResponse.ok || !section?.section_key) throw Error('Could not find a safe home content section for draft smoke');
  const saved = await request('/api/cms/local-studio/draft', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      route: '/',
      section_key: section.section_key,
      content: { heading: 'Website hub draft acceptance marker' },
      expected_version: 0,
    }),
  });
  const savedData = await saved.json();
  if (!saved.ok || !savedData.success || Number(savedData.version) !== 1) {
    throw Error('Temporary draft save failed: ' + JSON.stringify(savedData));
  }
  temporaryDraft = { route: '/', section_key: section.section_key, expected_version: 1 };
  const updatedResponse = await request('/api/admin/store/online');
  const updated = await updatedResponse.json();
  const row = (updated.draft_themes || []).find(item => item.id === 'home');
  if (!row || row.section_count !== 1 || !row.edit_href.includes('slug=home')) {
    throw Error('Saved page draft did not appear in website hub: ' + JSON.stringify(updated.draft_themes));
  }
} finally {
  if (temporaryDraft) {
    const cleanup = await request('/api/cms/local-studio/draft', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(temporaryDraft),
    });
    if (!cleanup.ok) throw Error('Could not clean up temporary local draft');
  }
}
const alias = await request('/admin/store', { redirect: 'manual' });
if (alias.status !== 302 || alias.headers.get('location') !== base + '/dashboard/cms/website') {
  throw Error('Canonical Studio exit target does not return to the website hub');
}
console.log(JSON.stringify({
  status: 'PASS',
  hub: '/dashboard/cms/website',
  preview: 'published Companions home page, desktop + mobile',
  pages: overview.performance.published_pages,
  sections: overview.performance.sections,
  drafts: 'saved draft appears and opens canonical editor',
  editor: '/dashboard/cms/website/editor?surface=pages&slug=home',
  legacyShell: 'not mounted on hub',
  assistantRuntime: 'present',
  production: 'untouched',
}, null, 2));
