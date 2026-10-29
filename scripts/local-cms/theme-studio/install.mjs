/**
 * Stage the EXACT installed ecommerce Theme Studio shell.
 * The only HTML delta is replacing its script loader with the Companions
 * host adapter bootstrap; the app's GUI source is never rewritten.
 */
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { createRequire } from 'node:module';
const req=createRequire(import.meta.url);
const pkgRoot=dirname(req.resolve('@inneranimalmedia/ecommerce-cms-agentsam/manifest'));
const source=join(pkgRoot,'frontend/static');
const dest=resolve('public/dashboard/sdk');
const files=[
  ['css/admin.css'],['css/console.css'],['css/theme-editor.css'],
  ['css/theme-settings-live.css'],['css/agentsam.css'],['css/revise-atlas.css'],
  ['js/shell.js'],['js/cms-authoring-engine.js'],['js/pages-shared.js'],
  ['js/portable-sections.js'],['js/revise-atlas.js'],
  ['js/theme-preview-registry.js'],['js/miniagentsam-codepreview.js'],
  ['js/resolve-studio.js'],['js/theme-editor.js'],
  ['js/theme-settings-live.js'],['js/resolve-theme-settings.js'],
  ['js/theme-editor-mini-agentsam.mjs'],
  ['brand/agentsam-gorilla-tiny.svg']
].map(([p])=>p);
for(const file of files){
 await mkdir(dirname(join(dest,file)),{recursive:true});
 const from=join(source,file),to=join(dest,file);
 try { await copyFile(from,to); } catch(error) {
   if(error.code!=="ENOENT") throw error;
   const fallback=join("/Users/samprimeaux/agentsam-sdk/apps/local-studio/frontend/public/admin",file);
   await copyFile(fallback,to);
   console.warn("[SDK package dependency]",file,"loaded from canonical Local Studio");
 }
}
await mkdir(join(dest,'theme-editor-lib'),{recursive:true});
await copyFile(join(pkgRoot,'frontend/theme-editor/bridge.mjs'),join(dest,'theme-editor-lib/bridge.mjs'));
let html=await readFile(join(source,'theme-editor.html'),'utf8');
if (!html.includes('<script src="/admin/js/theme-editor.js"></script>')) throw Error('Unexpected upstream Theme Studio HTML');
html=html.replace('<script src="/admin/js/theme-editor.js"></script>',
  '<script type="module" src="/dashboard/sdk/forms-theme-boot.mjs"></script>');
html=html.replace('<script type="module" src="/admin/js/theme-editor-generation-bootstrap.mjs"></script>','');
await writeFile(join(dest,'forms-theme-shell.html'),html);
await copyFile(resolve('scripts/local-cms/theme-studio/forms-theme-boot.mjs'),
  join(dest,'forms-theme-boot.mjs'));
console.log('Canonical ecommerce Theme Studio shell staged:',files.length,'original package assets + bridge');
