import {createThemeEditorBridge} from '/dashboard/sdk/theme-editor-lib/bridge.mjs';

const formApi='/api/cms/forms';
const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const response=async(url,options)=>{
 const r=await fetch(url,{cache:'no-store',credentials:'same-origin',...options});
 const data=await r.json().catch(()=>null);
 if(!r.ok || !data?.success)throw Error(data?.error||'Companions resource not available');
 return data;
};
const records=new Map();
const pages=[];
const definitions={};
const readForm=async id=>{
 const data=await response(formApi+'/'+encodeURIComponent(id));
 records.set(data.form.id,data);
 return data;
};
const formStatus=x=>x==='active'?'published':x;
const sectionFor=f=>({
 key:f.id,type:'form_field',version:0,
 status:Number(f.is_active)===0?'hidden':'published',
 content:{
  label:String(f.label||''),placeholder:String(f.placeholder||''),
  field_type:String(f.field_type||'text'),
  is_required:!!f.is_required?'true':'false'
 }
});
const pageFor=data=>({
 slug:data.form.id,title:data.form.title,status:formStatus(data.form.status),
 content_authority:'cms',
 sections:(data.fields||[]).map(sectionFor)
});
const sectionSchemas=data=>Object.fromEntries((data.fields||[]).map(f=>[
 f.id,{
  label:f.label||'Form field',type:'form_field',
  fields:[
   {key:'label',label:'Question label',type:'text'},
   {key:'placeholder',label:'Placeholder',type:'text'},
   {key:'is_required',label:'Required (true/false)',type:'text'}
  ],
  capabilities:{edit:true,media:false,settings:false,reorder:false,duplicate:false,remove:false,blocks:false}
 }
]));
const model={
 capabilities:{publish:false},
 async listPages(){return pages;},
 async getPage(id){const data=records.get(id)||await readForm(id);return pageFor(data);},
 async getRegistry(){
  return {definitions:[],pages:Object.fromEntries([...records.values()].map(d=>[d.form.id,{sections:sectionSchemas(d)}]))};
 },
 async getThemeIdentity(){return {name:'Companions of CPAS',status:'draft'};},
 async saveDraft(slug,key,content){
  const original=records.get(slug)||await readForm(slug);
  if(original.form.status!=='draft')throw Error('Published forms are read-only until versioned draft staging is connected.');
  const originalField=original.fields.find(f=>f.id===key);
  if(!originalField)throw Error('Field not found in this form');
  if(!original.fields.every(f=>f.id&&f.field_key))throw Error('Incomplete form definition: cannot safely save');
  const updated=original.fields.map(f=>f.id===key?{
   ...f,
   label:String(content.label??f.label),
   placeholder:String(content.placeholder??f.placeholder),
   // Editors cannot rekey or retype existing fields without a validated migration.
   field_type:f.field_type,
   is_required:String(content.is_required)==='true'
  }:f);
  // Keep steps and form identity intact; the host already owns persistence.
  await response(formApi+'/'+encodeURIComponent(slug)+'/save',{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({status:'draft',steps:original.steps,fields:updated})
  });
  await readForm(slug);
  return {success:true,content_version:0};
 },
 async resolvePreview(id,draft){
  const item=records.get(id)||await readForm(id);
  const type=f=>['email','tel','number','date'].includes(f.field_type)?f.field_type:'text';
  const sectionById=new Map((draft?.sections||[]).map(x=>[x.key,x]));
  const fields=item.fields.filter(f=>Number(f.is_active)!==0).map(f=>{
   const x=sectionById.get(f.id)?.content||{};
   const label=esc(x.label??f.label),placeholder=esc(x.placeholder??f.placeholder);
   const name=esc(f.field_key),required=String(x.is_required??f.is_required)==='true'||x.is_required===1;
   const field=f.field_type==='textarea'
    ? '<textarea disabled placeholder="'+placeholder+'"></textarea>'
    : '<input disabled type="'+type(f)+'" placeholder="'+placeholder+'">';
   return '<label><strong>'+label+(required?' *':'')+'</strong>'+field+'</label>';
  }).join('');
  const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
   +'<style>body{margin:0;background:#e9e4ec;padding:5vw;font:14px Inter,system-ui;color:#1b1631}.sheet{max-width:690px;margin:auto;background:#fff;border-radius:16px;padding:clamp(18px,4vw,42px);box-shadow:0 15px 45px #281b3117}h1{font-size:29px;letter-spacing:-.04em}.eyebrow{color:#8133d2;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase}form{display:grid;grid-template-columns:repeat(auto-fit,minmax(225px,1fr));gap:15px;margin:30px 0}label{display:grid;gap:8px;font-size:12px}input,textarea{border:1px solid #ded9e6;border-radius:8px;padding:12px;width:100%;box-sizing:border-box;font:inherit;background:#faf9fd}button{border:0;padding:12px 24px;color:white;background:#8133d2;border-radius:8px}.note{font-size:11px;color:#756b83}</style></head><body>'
   +'<div class="sheet"><div class="eyebrow">Companions of CPAS / Form preview</div><h1>'+esc(item.form.title)+'</h1><p>'+esc(item.form.description||'')+'</p><form>'+fields+'</form><button disabled>Submit (preview)</button><p class="note">Preview only — no submissions or payments</p></div></body></html>';
  return {html};
 },
 async listMedia(){return [];},
 async uploadMedia(){throw Error('Media upload is not available in the Forms surface.');},
 async publish(){throw Error('Publishing is disabled until versioned draft promotion is available.');},
 async addSection(){throw Error('Form field creation is not yet connected to this editor.');},
 async removeSection(){throw Error('Field deletion must use the validated form workflow.');},
 async duplicateSection(){throw Error('Field duplication is not yet connected.');},
 async moveSection(){throw Error('Field ordering is not yet connected.');},
 async setSectionVisibility(){throw Error('Field visibility editing is not yet connected.');},
 async addBlock(){throw Error('Nested form blocks are unsupported.');},
 async removeBlock(){throw Error('Nested form blocks are unsupported.');},
 async duplicateBlock(){throw Error('Nested form blocks are unsupported.');},
 async moveBlock(){throw Error('Nested form blocks are unsupported.');},
};
try{
 const all=await response(formApi);
 pages.push(...(all.forms||[]).map(f=>({slug:f.id,title:f.title,route:null})));
 await Promise.all(pages.map(p=>readForm(p.slug)));
 if(!pages.length)throw Error('No Companions forms found');
 const wanted=new URLSearchParams(location.search).get('formId');
 const first=pages.find(p=>p.slug===wanted)?.slug||pages[0].slug;
 window.AgentSamThemeEditorHost={
  page:first,adapter:createThemeEditorBridge(model),
  pageRoutes:Object.fromEntries(pages.map(p=>[p.slug,''])),
  onPageChange(slug){const next=new URL(location.href);next.searchParams.set('formId',slug);history.replaceState({},'',next);}
 };
 // Reinitialise the unchanged package pages registry now that host data exists.
 await new Promise((ok,fail)=>{
  const el=document.createElement('script');el.src='/admin/js/pages-shared.js';
  el.onload=ok;el.onerror=()=>fail(Error('Package pages-shared.js could not load'));document.head.append(el);
 });
 await new Promise((ok,fail)=>{
  const el=document.createElement('script');el.src='/admin/js/theme-editor.js';
  el.onload=ok;el.onerror=()=>fail(Error('Package Theme Studio could not load'));document.body.append(el);
 });
}catch(error){
 console.error('[companions-sdk-theme-host]',error);
 document.body.textContent='Ecommerce Theme Studio could not load: '+(error.message||String(error));
}
