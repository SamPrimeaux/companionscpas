/** Real local API + canonical SDK bridge smoke. Never writes production data. */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const base='http://127.0.0.1:4473';
const line=readFileSync('.wrangler/companions-local-cms/local-login.txt','utf8');
const credentials=Object.fromEntries(line.split('\n').filter(s=>s.includes('=')).map(s=>[
 s.slice(0,s.indexOf('=')),s.slice(s.indexOf('=')+1)
]));
const originalFetch=globalThis.fetch;
const session=await originalFetch(base+'/api/auth/login',{
 method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(credentials)
});
if(!session.ok)throw Error('Local-only credentials are not accepted');
const cookie=session.headers.get('set-cookie')?.split(';')[0];
if(!cookie)throw Error('Local session cookie missing');
globalThis.fetch=(path,opts={})=>originalFetch(new URL(path,base),{
 ...opts,headers:{...opts.headers,cookie}
});
globalThis.window={};
globalThis.location={host:'127.0.0.1:4473',href:base+'/dashboard/sdk/forms-theme-shell.html',search:''};
globalThis.history={replaceState(){}};
const loaded=[];
const onScript={append(el){loaded.push(el.src);queueMicrotask(()=>el.onload?.());}};
globalThis.document={
 createElement(){return {src:'',onload:null,onerror:null};},
 head:onScript,body:{...onScript,set textContent(message){throw Error(message);}}
};
const source=readFileSync('public/dashboard/sdk/forms-theme-boot.mjs','utf8');
const bridge='file://'+resolve('public/dashboard/sdk/theme-editor-lib/bridge.mjs');
const sourcePath=resolve('.wrangler/companions-local-cms/studio-smoke-module.mjs');
writeFileSync(sourcePath,source.replace(
 "from '/dashboard/sdk/theme-editor-lib/bridge.mjs'","from '"+bridge+"'"
));
await import('file://'+sourcePath+'?'+Date.now());
await new Promise(ok=>setTimeout(ok,175));
const studio=window.AgentSamThemeEditorHost;
if(!studio?.adapter)throw Error('The installed Theme Studio host did not initialize');
const catalog=await studio.adapter.request('/api/admin/cms/pages');
const initial=await studio.adapter.request('/api/admin/cms/pages/'+encodeURIComponent(studio.page));
const registry=await studio.adapter.getRegistry();
const preview=await studio.adapter.resolvePreview(studio.page,initial.page);
if(catalog.pages.length!==10)throw Error('Form catalog does not match local D1');
if(initial.page.sections.length<1)throw Error('Form field sections missing');
if(!registry.pages[studio.page]?.sections)throw Error('Schema registry not connected');
if(!preview.html?.includes('Form preview'))throw Error('Preview is not rendering real form schema');
if(studio.adapter.capabilities.publish!==false)throw Error('Unverified publisher unexpectedly enabled');
const published=catalog.pages.find(p=>p.title==='Foster Application');
if(published){
 const form=await studio.adapter.request('/api/admin/cms/pages/'+published.slug);
 await studio.adapter.request('/api/admin/cms/pages/'+published.slug+'/sections/'+form.page.sections[0].key,{
  method:'PUT',body:JSON.stringify({content:form.page.sections[0].content})
 }).then(()=>{throw Error('Published write was accepted');},e=>{
  if(!String(e.message).includes('read-only'))throw e;
 });
}
const required=['/admin/js/pages-shared.js','/admin/js/theme-editor.js'];
if(JSON.stringify(loaded)!==JSON.stringify(required))
 throw Error('The canonical Theme Studio runtime was not loaded');
const shell=await fetch('/dashboard/sdk/forms-theme-shell.html').then(r=>r.text());
if(!shell.includes('/dashboard/sdk/forms-theme-boot.mjs')
  || shell.includes('<script src="/admin/js/theme-editor.js"></script>'))
 throw Error('Theme Studio package boot did not load');
console.log(JSON.stringify({
 status:'PASS',
 shell:'installed ecommerce Theme Studio original HTML/CSS/JS',
 forms:catalog.pages.length,form:initial.page.title,fields:initial.page.sections.length,
 publishedWriteGuard:'PASS',publisher:'disabled until safely migrated',
 runtime:loaded
},null,2));
