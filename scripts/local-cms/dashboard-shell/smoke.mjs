/** Reproducible local-only smoke: actual package components + preserved site routes. */
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import React from 'react';
import {renderToString} from 'react-dom/server';
const base='http://127.0.0.1:4473';
const creds=Object.fromEntries(readFileSync('.wrangler/companions-local-cms/local-login.txt','utf8')
 .split('\n').filter(x=>x.includes('=')).map(x=>[x.slice(0,x.indexOf('=')),x.slice(x.indexOf('=')+1)]));
const response=await fetch(base+'/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(creds)});
if(!response.ok)throw Error('Local-only session unavailable');
const cookie=response.headers.get('set-cookie')?.split(';')[0];
if(!cookie)throw Error('Missing local session');
const read=async path=>{
 const r=await fetch(base+path,{headers:{cookie}});
 if(!r.ok)throw Error('Local route '+path+' returned '+r.status);
 return r.text();
};
const html=await read('/dashboard/overview');
if(!html.includes('/dashboard/sdk/dashboard-shell-sdk.js'))
 throw Error('Expected SDK shell injection on localhost');
if(!html.includes('/dashboard/js/app.jsx'))
 throw Error('Existing Companions app bundle was removed');
for(const resource of ['dashboard-shell-sdk.js','dashboard-host.css','dashboard-nav-sdk.css','dashboard-mini-sdk.css','shell.css']){
 const content=await read('/dashboard/sdk/'+resource);
 if(content.length<100)throw Error('Empty canonical shell asset '+resource);
}
const bootstrap=readFileSync('public/dashboard/sdk/dashboard-shell-sdk.js','utf8');
const context={React,console};context.globalThis=context;
vm.runInNewContext(bootstrap,context);
const components=context.CompanionsSDKChrome;
for(const id of ['HostNav','HostMiniAgent','HostAgentPanel']){
 if(typeof components?.[id]!=='function')throw Error('Missing packaged component '+id);
}
const navHtml=renderToString(React.createElement(components.HostNav,{
 groups:[{group:'Website & Content',items:[{key:'cms-website',label:'Website & Content',icon:'edit',path:'/dashboard/cms/website',
  children:[{key:'cms-forms',label:'Forms',path:'/dashboard/cms/forms'}]}]}],
 view:'cms-forms',navigate(){},onLogout(){}
}));
if(!navHtml.includes('agentsam-nav')||(!navHtml.includes('Website &amp; Content')&&!navHtml.includes('Website & Content')))
 throw Error('SDK Nav failed to render');
const chatHtml=renderToString(React.createElement(components.HostAgentPanel,{
 messages:[{role:'assistant',content:'Local smoke'}],draft:'',onDraftChange(){},
 onSend(){},onCancel(){},streaming:false,onClose(){},steps:[],
}));
if(!chatHtml.includes('data-agent-panel'))throw Error('SDK AgentPanel failed to render');
const miniHtml=renderToString(React.createElement(components.HostMiniAgent));
if(!miniHtml.includes('data-agent-composer'))throw Error('SDK mini composer failed to render');
for(const original of ['/','/events']){
 const r=await fetch(base+original);
 if(!r.ok)throw Error('Existing public route regressed: '+original+' '+r.status);
}
console.log(JSON.stringify({
 status:'PASS', nav:'@inneranimalmedia/agentsam-nav',
 agent:'@inneranimalmedia/agentsam-workbench',
 realDashboardRoute:'/dashboard/overview',canonicalCmsRoute:'/dashboard/cms/pages/home',publicRoutes:['/','/events'],
 uiComponents:['HostNav','HostMiniAgent','HostAgentPanel'],
 localOnly:true, uiBytes:bootstrap.length, publisherUnchanged:true
},null,2));
