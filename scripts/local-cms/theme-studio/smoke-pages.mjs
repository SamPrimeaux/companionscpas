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
await host.adapter.request('/api/admin/cms/pages/home/sections/'+
 encodeURIComponent(data.page.sections[0].key),{
  method:'PUT',body:JSON.stringify({content:data.page.sections[0].content}),
 }).then(()=>{throw Error('Unexpected published-page mutation success');},e=>{
  if(!String(e.message).includes('read-only'))throw e;
 });
if(loaded.join(',')!=='/admin/js/pages-shared.js,/admin/js/theme-editor.js')
 throw Error('The canonical ecommerce runtime was not loaded');
const shell=await fetch('/dashboard/sdk/forms-theme-shell.html').then(r=>r.text());
if(!shell.includes('/dashboard/sdk/studio-boot.mjs'))throw Error('Shared ecommerce shell not configured');
const switcher=await fetch('/dashboard/sdk/studio-boot.mjs').then(r=>r.text());
if(!switcher.includes('pages-theme-boot.mjs'))throw Error('Pages bridge missing from shell switcher');
const app=await fetch('/dashboard/js/app.jsx').then(r=>r.text());
if(!app.includes('packagedStudioFrame("pages"'))throw Error('Companions Pages routes still use V1');
console.log(JSON.stringify({
 status:'PASS',editor:'canonical ecommerce Theme Studio',
 pages:listing.pages.length,sections:data.page.sections.length,
 page:data.page.title,livePreviewBytes:rendered.html.length,
 registryFields:Object.keys(registry.pages.home.sections).length,
 publishedWriteGuard:'PASS',publishedPublisher:'disabled',
 scripts:loaded,
},null,2));
