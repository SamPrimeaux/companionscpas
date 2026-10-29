/** Local-only Companions pages adapter for the canonical ecommerce Theme Studio.
 * Renders actual D1-backed pages; keeps published pages read-only until draft
 * isolation is ready. No UI rendering or product-owned editor code lives here.
 */
import { createThemeEditorBridge } from '../../../node_modules/@inneranimalmedia/ecommerce-cms-agentsam/frontend/theme-editor/bridge.mjs';

type Page = { id:string; slug:string; route_path:string; title:string; status:string; meta_description?:string };
type Section = {
 id:string;section_key:string;section_type:string;page_route:string;
 sort_order:number;is_visible:number;config_json?:string;
 eyebrow?:string;heading?:string;subheading?:string;body?:string;
 image_url?:string;cta_label?:string;cta_href?:string;
 cta_secondary_label?:string;cta_secondary_href?:string;
 [key:string]:unknown;
};
type PageResponse = {success:true;page:Page;sections:Section[];blocks:unknown[]};
type Catalog = {
 success:true;pages:Page[];
 brand?:{brand_name?:string};
 themes?:Array<{theme_name:string;is_active:number}>;
};
const props=[
 ['eyebrow','Eyebrow','text'],['heading','Heading','text'],
 ['subheading','Subheading','text'],['body','Body','textarea'],
 ['image_url','Image URL','text'],['cta_label','Button label','text'],
 ['cta_href','Button URL','text'],
 ['cta_secondary_label','Secondary button','text'],
 ['cta_secondary_href','Secondary URL','text'],
] as const;
const api=async <T extends {success?:boolean;error?:string}>(path:string,options:RequestInit={}):Promise<T>=>{
 const r=await fetch(path,{credentials:'same-origin',cache:'no-store',...options});
 const value=await r.json().catch(()=>null) as T|null;
 if(!r.ok||!value?.success)throw Error(value?.error||'CMS API failed: '+r.status);
 return value;
};
const values=(r:Section)=>Object.fromEntries(props.map(([key])=>[key,String(r[key]??'')]));
const studioSection=(r:Section)=>({
 key:r.section_key,type:r.section_type,version:0,
 status:Number(r.is_visible)===0?'hidden':'published',content:values(r),
});
const studioPage=(data:PageResponse)=>({
 slug:data.page.slug,title:data.page.title,status:data.page.status,
 content_authority:'cms',sections:data.sections.map(studioSection),
});
export function makeCompanionsPagesStudio(){
 const rows=new Map<string,PageResponse>();
 const routes=new Map<string,string>();
 const pages:Array<{slug:string;title:string;route:string}>=[];
 let catalog:Catalog|null=null;
 const requirePage=(slug:string)=>{
  const data=rows.get(slug);
  if(!data)throw Error('CMS page unavailable: '+slug);
  return data;
 };
 const model={
  capabilities:{publish:false},
  async listPages(){return pages;},
  async getPage(slug:string){return studioPage(requirePage(slug));},
  async getRegistry(){return {definitions:[],pages:Object.fromEntries(
   [...rows.entries()].map(([slug,data])=>[slug,{sections:Object.fromEntries(
    data.sections.map(r=>[r.section_key,{
     label:r.heading||r.section_type.replaceAll('_',' '),
     type:r.section_type,
     fields:props.map(([key,label,type])=>({key,label,type})),
     capabilities:{edit:true,media:false,settings:false,reorder:false,
      duplicate:false,remove:false,blocks:false},
    }]),
   )}]),
  )};},
  async getThemeIdentity(){return {
   name:catalog?.brand?.brand_name||'Companions of CPAS',
   status:'draft',theme:catalog?.themes?.find(t=>Number(t.is_active)===1)?.theme_name,
  };},
  async resolvePreview(slug:string){
   const route=routes.get(slug);
   if(!route)throw Error('Page route missing');
   const r=await fetch('/api/cms/preview?route='+encodeURIComponent(route),{
    credentials:'same-origin',cache:'no-store',
   });
   if(!r.ok)throw Error('CMS preview failed: '+r.status);
   const html=(await r.text()).replace(/<head\b[^>]*>/i,'$&<base href="/">');
   return {html};
  },
  async saveDraft(slug:string,key:string,content:Record<string,string>){
   const data=requirePage(slug);
   if(data.page.status!=='draft')throw Error(
    'Published pages are read-only until versioned draft staging is connected.');
   const row=data.sections.find(s=>s.section_key===key);
   if(!row)throw Error('Section not found');
   const patch:Record<string,unknown>={...row,page_route:data.page.route_path};
   for(const [field] of props)patch[field]=String(content[field]??row[field]??'');
   await api<{success:true}>('/api/cms/section/save',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({section:patch}),
   });
   rows.set(slug,await api<PageResponse>(
    '/api/cms/page?route='+encodeURIComponent(data.page.route_path)));
   return {success:true,content_version:0};
  },
  async publish(){throw Error('Versioned CMS publish is not connected.');},
  async listMedia(){return [];},
  async uploadMedia(){throw Error('CMS Media Library is not connected.');},
  async addSection(){throw Error('Use the original section catalog until creation is verified.');},
  async removeSection(){throw Error('Section removal is not enabled.');},
  async duplicateSection(){throw Error('Section duplication is not enabled.');},
  async moveSection(){throw Error('Section ordering is not enabled.');},
  async setSectionVisibility(){throw Error('Visibility changes need safe publish.');},
  async addBlock(){throw Error('Block editor is not connected.');},
  async removeBlock(){throw Error('Block editor is not connected.');},
  async duplicateBlock(){throw Error('Block editor is not connected.');},
  async moveBlock(){throw Error('Block editor is not connected.');},
 };
 return {
  bridge:createThemeEditorBridge(model),
  async initialize(){
   catalog=await api<Catalog>('/api/cms/bootstrap');
   if(!catalog.pages?.length)throw Error('No authorized CMS pages');
   for(const page of catalog.pages){
    if(routes.has(page.slug))throw Error('Duplicate page: '+page.slug);
    routes.set(page.slug,page.route_path);
    pages.push({slug:page.slug,title:page.title,route:page.route_path});
   }
   await Promise.all(pages.map(async p=>rows.set(p.slug,await api<PageResponse>(
    '/api/cms/page?route='+encodeURIComponent(p.route)))));
   const requested=new URLSearchParams(location.search).get('slug');
   return requested&&rows.has(requested)?requested:(rows.has('home')?'home':pages[0].slug);
  },
  routes(){return Object.fromEntries(pages.map(p=>[p.slug,p.route]));},
 };
}
