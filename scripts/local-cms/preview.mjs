/**
 * Companions local-only worker resources.
 * Existing site's Worker and R2 assets are used; no SDK UI duplication.
 * All R2/D1 invocations explicitly use --local and a separate persistence dir.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, resolve, extname } from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const wrangler=join(root, 'node_modules/wrangler/bin/wrangler.js');
const persist=join(root,'.wrangler/companions-local-cms');
const config=join(root,'scripts/local-cms/wrangler.local.toml');
const site=join(root,'public');
const args=process.argv.slice(2);
const task=args[0]||'doctor';
const port=Number(args[1]||4391);
function wranglerLocal(argv, options={}){
  const cmd=['--config',config,...argv];
  if(argv.some(x=>x==='--remote')) throw Error('Remote operations are forbidden in the local CMS preview');
  const result=spawnSync(process.execPath,[wrangler,...cmd],{cwd:root,encoding:'utf8',stdio:options.silent?'pipe':'inherit',env:{...process.env,WRANGLER_SEND_METRICS:'false'}});
  if(result.status!==0) throw Error('Local Wrangler command failed: '+cmd.join(' ')+' '+(result.stderr||'').slice(-300));
  return result;
}
function walk(folder){
 const out=[];for(const dirent of readdirSync(folder,{withFileTypes:true})){
  const p=join(folder,dirent.name);
  if(dirent.isDirectory())out.push(...walk(p));
  else if(dirent.isFile()&&!dirent.name.startsWith('.'))out.push(p);
 }return out;
}
function readPackage(name){
 const manifest=join(root,'node_modules',...name.split('/'),'package.json');
 if(!existsSync(manifest))throw Error('Missing installed package '+name+'. Run npm ci first.');
 return JSON.parse(readFileSync(manifest,'utf8'));
}
const cms=readPackage('@inneranimalmedia/client-cms-editor');
const ecom=readPackage('@inneranimalmedia/ecommerce-cms-agentsam');
if(cms.version!==ecom.version)throw Error('CMS engine and ecommerce app versions are not aligned');
if(task==='doctor'){
 const archiveDir=join(root,'packages/sdk-artifacts');
 const hashes=JSON.parse(readFileSync(join(archiveDir,'manifest.json'),'utf8'));
 for(const [filename,expected] of Object.entries(hashes.files)){
  const bytes=readFileSync(join(archiveDir,filename));
  const actual=createHash('sha256').update(bytes).digest('hex');
  if(actual!==expected)throw Error('CMS package archive checksum mismatch: '+filename);
 }
 console.log('Pinned local archives verified:',Object.keys(hashes.files).length);
 console.log('Local package baseline:',ecom.name+'@'+ecom.version,cms.name+'@'+cms.version);
 console.log('Local storage:',persist);
 console.log('Remote binding mode: DISABLED (local config + --local)');
 console.log('Existing site preserved; no production CMS routes are replaced.');
}else if(task==='assets'){
 const types={'.mjs':'application/javascript','.js':'application/javascript','.jsx':'application/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2'};
 const list=walk(site).filter(p=>types[extname(p).toLowerCase()]);
 let n=0;
 for(const p of list){
  const rel=relative(site,p).split('\\').join('/');
  wranglerLocal(['r2','object','put','companionscpas/'+rel,'--local','--persist-to',persist,'--file',p,'--content-type',types[extname(p).toLowerCase()]],{silent:true});
  n++;if(n%15===0)console.log('Local R2 assets:',n,'/',list.length);
 }
 console.log('Local R2 snapshot seeded from working tree:',n,'files');
}else if(task==='start'){
 if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid local port');
 const cmd=['--config',config,'dev','--local','--ip','127.0.0.1','--port',String(port),'--persist-to',persist,'--log-level','warn'];
 const proc=spawnSync(process.execPath,[wrangler,...cmd],{cwd:root,env:{...process.env,WRANGLER_SEND_METRICS:'false'},stdio:'inherit'});
 process.exitCode=proc.status||0;
}else throw Error('Usage: node scripts/local-cms/preview.mjs doctor|assets|start [port]');
