/** Integration proof: actual Companions D1 pages + installed SDK bridge.
 * Never mutates production or local CMS pages.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const base='http://127.0.0.1:4473';
const secret=readFileSync('.wrangler/companions-local-cms/local-login.txt','utf8');
const credentials=Object.fromEntries(secret.split('\n').filter(s=>s.includes('=')).map(s=>{
 const i=s.indexOf('=');return [s.slice(0,i),s.slice(i+1)];
}));
const nativeFetch=globalThis.fetch;
const auth=await nativeFetch(base+'/api/auth/login',{
 method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(credentials),
});
if(!auth.ok)throw Error('Local authentication failed');
const cookie=auth.headers.get('set-cookie')?.split(';')[0];
if(!cookie)throw Error('No local authenticated session');
globalThis.fetch=(path,opts={})=>nativeFetch(new URL(path,base),{
 ...opts,headers:{...opts.headers,cookie},
});
globalThis.window={};
globalThis.location={host:'127.0.0.1:4473',href:base+'/dashboard/sdk/forms-theme-shell.html?surface=pages&slug=home',search:'?surface=pages&slug=home'};
globalThis.history={replaceState(){}};
const loaded=[];
const load={appendChild(element){loaded.push(element.src);queueMicrotask(()=>element.onload?.());}};
globalThis.document={
 createElement(){return {src:'',onload:null,onerror:null};},
 head:load,body:{...load,set textContent(message){throw Error(message);}},
};
const path=resolve('.wrangler/companions-local-cms/studio-pages-smoke.mjs');
writeFileSync(path,readFileSync('public/dashboard/sdk/pages-theme-boot.mjs','utf8'));
await import('file://'+path+'?'+Date.now());
await new Promise(ok=>setTimeout(ok,250));
const host=window.AgentSamThemeEditorHost;
if(!host?.adapter)throw Error('Ecommerce Studio Pages host unavailable');
const listing=await host.adapter.request('/api/admin/cms/pages');
const data=await host.adapter.request('/api/admin/cms/pages/home');
const registry=await host.adapter.getRegistry();
const rendered=await host.adapter.resolvePreview('home',data.page);
if(listing.pages.length!==9)throw Error('Pages mismatch: '+listing.pages.length);
if(!data.page.sections.length)throw Error('Home sections not loaded');
if(!registry.pages.home?.sections)throw Error('No Home section inspector schema');
if(!rendered.html.includes('Companions of CPAS'))throw Error('Real preview missing');
if(!rendered.html.includes('data-section-key'))throw Error('Real section identity absent');
if(!rendered.html.includes('cpas-shell.css'))throw Error('Real stylesheet absent from preview');
if(host.adapter.capabilities.publish!==false)throw Error('Unsafe publisher enabled');
const key='freedom_ride_promo';
const initial=data.page.sections.find(s=>s.key===key);
if(!initial)throw Error('Expected canonical Companions section missing');
const baseline=await fetch('/api/cms/page?route=%2F').then(r=>r.json());
const original=baseline.sections.find(s=>s.section_key===key)?.heading;
const proposed='CPAS isolated draft acceptance marker';
const sectionPath='/api/admin/cms/pages/home/sections/'+encodeURIComponent(key);
const saved=await host.adapter.request(sectionPath,{method:'PUT',body:JSON.stringify({
 content:{...initial.content,heading:proposed},expected_version:Number(initial.version||0)
})});
if(!saved.version)throw Error('Draft version not advanced');
const draftPage=await host.adapter.request('/api/admin/cms/pages/home');
if(draftPage.page.status!=='draft')throw Error('Draft not indicated in editor');
if(draftPage.page.sections.find(s=>s.key===key)?.content.heading!==proposed)
 throw Error('Saved draft not present in editor state');
const previewWithDraft=await host.adapter.resolvePreview('home',draftPage.page);
if(!previewWithDraft.html.includes(proposed))throw Error('Server-rendered draft is missing');
const after=await fetch('/api/cms/page?route=%2F').then(r=>r.json());
if(after.sections.find(s=>s.section_key===key)?.heading!==original)
 throw Error('Draft polluted published section row');
await host.adapter.request(sectionPath,{method:'PUT',body:JSON.stringify({
 content:{...initial.content,heading:'conflict'},expected_version:0
})}).then(()=>{throw Error('Stale editor write unexpectedly succeeded');},e=>{
 if(!String(e.message).includes('another editor'))throw e;
});
const discarded=await apiDelete('/api/cms/local-studio/draft',{
 route:'/',section_key:key,expected_version:saved.version
});
if(!discarded.success)throw Error('Test draft cleanup failed');
const clean=await fetch('/api/cms/local-studio/draft?route=%2F').then(r=>r.json());
if(clean.drafts.some(d=>d.section_key===key))throw Error('Draft cleanup incomplete');
if(rendered.html.includes('No HTML in site storage yet'))
 throw Error('Local R2 Custom Code sources were not restored');
if(!rendered.html.includes('Every dog deserves'))
 throw Error('Actual R2-authored homepage HTML missing');

async function apiDelete(path,body){
 const response=await fetch(path,{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
 const value=await response.json();
 if(!response.ok)throw Error(value.error||'Could not discard draft');
 return value;
}
if(loaded.join(',')!=='/admin/js/pages-shared.js,/admin/js/theme-editor.js')
 throw Error('The canonical ecommerce runtime was not loaded');
const shell=await fetch('/dashboard/sdk/forms-theme-shell.html').then(r=>r.text());
if(!shell.includes('/dashboard/sdk/studio-boot.mjs'))throw Error('Shared ecommerce shell not configured');
const switcher=await fetch('/dashboard/sdk/studio-boot.mjs').then(r=>r.text());
if(!switcher.includes('pages-theme-boot.mjs'))throw Error('Pages bridge missing from shell switcher');
const app=await fetch('/dashboard/js/app.jsx').then(r=>r.text());
if(!app.includes('window.location.assign(studioPath)')||app.includes('packagedStudioFrame'))throw Error('Companions Pages routes must full-document navigate to the canonical ecommerce Theme Studio');
console.log(JSON.stringify({
 status:'PASS',editor:'canonical ecommerce Theme Studio',
 pages:listing.pages.length,sections:data.page.sections.length,
 page:data.page.title,livePreviewBytes:rendered.html.length,
 registryFields:Object.keys(registry.pages.home.sections).length,
 draftPersistence:'PASS',draftPreview:'PASS',draftIsolation:'PASS',staleWriteGuard:'PASS',publishedPublisher:'disabled',
 scripts:loaded,
},null,2));
