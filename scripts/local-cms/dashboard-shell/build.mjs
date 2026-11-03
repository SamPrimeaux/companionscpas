/** Build from immutable SDK package archives. No copied component source. */
import { mkdir, cp, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolve,join } from 'node:path';
import { build } from 'esbuild';
const root=resolve('.');
const cache=resolve('.wrangler/companions-local-cms/sdk-host');
const archive=resolve('packages/sdk-artifacts');
const dest=resolve('public/dashboard/sdk');
await mkdir(cache,{recursive:true});
for(const [name,short] of [['agentsam-nav','nav'],['agentsam-workbench','workbench']]){
 const file=join(archive,'inneranimalmedia-'+name+'-2.6.13.tgz');
 const target=join(cache,short);
 await mkdir(target,{recursive:true});
 const result=spawnSync('tar',['xzf',file,'-C',target,'--strip-components=1'],{encoding:'utf8'});
 if(result.status!==0)throw Error('SDK tar extraction failed: '+name+' '+result.stderr);
}
// Typecheck the host adapter against SDK-package .d.ts contracts rather
// than trusting an esbuild-only TSX transform.
const typecheck=spawnSync(process.execPath,[
 resolve('node_modules/typescript/bin/tsc'),
 '--project',resolve('scripts/local-cms/dashboard-shell/tsconfig.json')
],{cwd:root,encoding:'utf8'});
if(typecheck.status!==0)throw Error('Packaged SDK shell TypeScript contract failed: '+(typecheck.stdout||'')+(typecheck.stderr||''));
console.log('SDK shell TypeScript typecheck: PASS');
const shim=resolve('scripts/local-cms/dashboard-shell/react-shim.mjs');
const jsx=resolve('scripts/local-cms/dashboard-shell/jsx-shim.mjs');
const sdkNodeModules=resolve('/Users/samprimeaux/agentsam-sdk/node_modules');
await mkdir(dest,{recursive:true});
const result=await build({
 entryPoints:[resolve('scripts/local-cms/dashboard-shell/host.tsx')],
 outfile:join(dest,'dashboard-shell-sdk.js'),
 bundle:true,platform:'browser',format:'iife',globalName:'CompanionsSDKChrome',
 target:['es2022'],logLevel:'warning',metafile:true,
 nodePaths:[sdkNodeModules],
 plugins:[{name:'canonical-packaged-components',setup(b){
  b.onResolve({filter:/^@inneranimalmedia\/agentsam-(nav|workbench)$/},args=>({
   path:args.path.endsWith('-nav')?join(cache,'nav/dist/index.js'):join(cache,'workbench/dist/agent/index.js')
  }));
  b.onResolve({filter:/^react$/},()=>({path:shim}));
  b.onResolve({filter:/^react\/(jsx-runtime|jsx-dev-runtime)$/},()=>({path:jsx}));
 }}]
});
for(const [path,file] of [
 [join(cache,'nav/dist/legacy.css'),'dashboard-nav-sdk.css'],
 [join(cache,'nav/dist/shell.css'),'shell.css'],
 [join(cache,'workbench/dist/agent/mini-agentsam.css'),'dashboard-mini-sdk.css']])
 await cp(path,join(dest,file));
await cp(resolve('scripts/local-cms/dashboard-shell/host.css'),join(dest,'dashboard-host.css'));
const roots=Object.keys(result.metafile.inputs);
if(!roots.some(p=>p.includes('sdk-host/nav/dist/')))throw Error('SDK Nav not bundled');
if(!roots.some(p=>p.includes('sdk-host/workbench/dist/')))throw Error('SDK Workbench not bundled');
const proof={ sdkNav:'@inneranimalmedia/agentsam-nav@2.6.13',
 sdkWorkbench:'@inneranimalmedia/agentsam-workbench@2.6.13',
 source:'immutable packaged tarballs; host React global',
 outputBytes:(await readFile(join(dest,'dashboard-shell-sdk.js'))).length,
 inputCount:roots.length};
await writeFile(join(dest,'dashboard-shell-proof.json'),JSON.stringify(proof,null,2));
console.log('Packaged SDK dashboard shell:',JSON.stringify(proof));
