/**
 * Companions data adapter for the canonical packaged Ecommerce Theme Studio.
 *
 * All visual controls and shell behavior remain SDK-owned. This adapter maps
 * real customer pages, R2-backed Custom Code and isolated localhost drafts.
 * It deliberately has no publish path.
 */
import { createThemeEditorBridge } from '../../../node_modules/@inneranimalmedia/ecommerce-cms-agentsam/frontend/theme-editor/bridge.mjs';

type Page = {
  id:string;slug:string;route_path:string;title:string;status:string;
  meta_description?:string;
};
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
type Draft = {
  section_key:string;content:Record<string,string>;version:number;updated_at?:string;
};
type DraftResponse = {success:true;drafts:Draft[]};
type SaveResponse = {success:true;version:number;updated_at?:string};
type FieldType = 'text'|'textarea';
type Field = readonly [string,string,FieldType];
const textProps:readonly Field[] = [
  ['eyebrow','Eyebrow','text'],['heading','Heading','text'],
  ['subheading','Subheading','text'],['body','Body','textarea'],
  ['image_url','Image URL','text'],['cta_label','Button label','text'],
  ['cta_href','Button URL','text'],['cta_secondary_label','Secondary button','text'],
  ['cta_secondary_href','Secondary URL','text'],
];
const customHtmlProps:readonly Field[] = [
  ['html','Custom HTML (R2 source)','textarea'],
  ['source_url','External HTML URL','text'],
];
const api=async <T extends {success?:boolean;error?:string}>(
  path:string,options:RequestInit={}
):Promise<T>=>{
  const result=await fetch(path,{credentials:'same-origin',cache:'no-store',...options});
  const data=await result.json().catch(()=>null) as T|null;
  if(!result.ok||!data?.success)throw Error(data?.error||'CMS API failed: '+result.status);
  return data;
};
function config(section:Section):Record<string,unknown>{
  try {return JSON.parse(section.config_json||'{}') as Record<string,unknown>;}
  catch {return {};}
}
const fields=(section:Section):readonly Field[] =>
  section.section_type==='raw_html' ? customHtmlProps : textProps;
function baseValues(section:Section):Record<string,string>{
  const source=section.section_type==='raw_html'?config(section):section;
  return Object.fromEntries(fields(section).map(([key])=>[key,String(source[key]??'')]));
}
function studioSection(section:Section,draft?:Draft){
  return {
    key:section.section_key,
    type:section.section_type,
    version:draft?.version||0,
    status:draft?'draft':Number(section.is_visible)===0?'hidden':'published',
    content:{...baseValues(section),...draft?.content},
  };
}
export function makeCompanionsPagesStudio(){
  const rows=new Map<string,PageResponse>();
  const routes=new Map<string,string>();
  const drafts=new Map<string,Map<string,Draft>>();
  const pages:Array<{slug:string;title:string;route:string}>=[];
  let catalog:Catalog|null=null;

  function requirePage(slug:string){
    const page=rows.get(slug);
    if(!page)throw Error('CMS page unavailable: '+slug);
    return page;
  }
  const getDraft=(slug:string,key:string)=>drafts.get(slug)?.get(key);
  const studioPage=(slug:string)=>{
    const data=requirePage(slug);
    const hasDraft=Boolean(drafts.get(slug)?.size);
    return {
      slug:data.page.slug,title:data.page.title,
      status:hasDraft?'draft':data.page.status,
      content_authority:'cms',
      sections:data.sections.map(s=>studioSection(s,getDraft(slug,s.section_key))),
    };
  };
  const model={
    capabilities:{publish:false},
    async listPages(){return pages;},
    async getPage(slug:string){return studioPage(slug);},
    async getRegistry(){
      return {definitions:[],pages:Object.fromEntries(
        [...rows.entries()].map(([slug,data])=>[slug,{
          sections:Object.fromEntries(data.sections.map(section=>[
            section.section_key,{
              label:section.section_type==='raw_html'
                ? 'Custom Code · '+section.section_key
                : section.heading||section.section_type.replaceAll('_',' '),
              type:section.section_type,
              fields:fields(section).map(([key,label,type])=>({key,label,type})),
              capabilities:{edit:true,media:false,settings:false,reorder:false,
                duplicate:false,remove:false,blocks:false},
            },
          ])),
        }])
      )};
    },
    async getThemeIdentity(){
      const hasDraft=[...drafts.values()].some(page=>page.size>0);
      return {
        name:catalog?.brand?.brand_name||'Companions of CPAS',
        status:hasDraft?'draft':'published',
        theme:catalog?.themes?.find(t=>Number(t.is_active)===1)?.theme_name,
      };
    },
    async resolvePreview(slug:string){
      const route=routes.get(slug);
      if(!route)throw Error('Page route missing: '+slug);
      // Server applies isolated draft overrides to the real site render.
      // Unlike the legacy /api/cms/preview, this never syncs fragments to R2.
      const result=await fetch('/api/cms/local-studio/preview',{
        method:'POST',credentials:'same-origin',cache:'no-store',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({route}),
      });
      if(!result.ok){
        const error=await result.json().catch(()=>null) as {error?:string}|null;
        throw Error(error?.error||'Draft preview failed: '+result.status);
      }
      const html=(await result.text()).replace(/<head\b[^>]*>/i,'$&<base href="/">');
      return {html};
    },
    async saveDraft(
      slug:string,key:string,content:Record<string,string>,expectedVersion:number
    ){
      const data=requirePage(slug);
      if(!data.sections.some(s=>s.section_key===key))throw Error('Unknown section: '+key);
      const saved=await api<SaveResponse>('/api/cms/local-studio/draft',{
        method:'POST',headers:{'content-type':'application/json'},
        body:JSON.stringify({
          route:data.page.route_path,section_key:key,content,
          expected_version:expectedVersion,
        }),
      });
      if(!drafts.has(slug))drafts.set(slug,new Map());
      drafts.get(slug)!.set(key,{
        section_key:key,content:{...content},version:saved.version,updated_at:saved.updated_at,
      });
      return {success:true,version:saved.version,updated_at:saved.updated_at};
    },
    async publish(){throw Error('Publishing remains disabled until versioned promotion is approved.');},
    async listMedia(){return [];},
    async uploadMedia(){throw Error('Media Library integration is not connected.');},
    async addSection(){throw Error('Section creation needs validated templates.');},
    async removeSection(){throw Error('Section removal is disabled.');},
    async duplicateSection(){throw Error('Section duplication is disabled.');},
    async moveSection(){throw Error('Section ordering is disabled.');},
    async setSectionVisibility(){throw Error('Visibility changes need safe publish.');},
    async addBlock(){throw Error('Block editing is not connected.');},
    async removeBlock(){throw Error('Block editing is not connected.');},
    async duplicateBlock(){throw Error('Block editing is not connected.');},
    async moveBlock(){throw Error('Block editing is not connected.');},
  };
  return {
    bridge:createThemeEditorBridge(model),
    async initialize(){
      catalog=await api<Catalog>('/api/cms/bootstrap');
      if(!catalog.pages?.length)throw Error('No authorized CMS pages');
      for(const page of catalog.pages){
        if(routes.has(page.slug))throw Error('Duplicate CMS slug: '+page.slug);
        routes.set(page.slug,page.route_path);
        pages.push({slug:page.slug,title:page.title,route:page.route_path});
      }
      await Promise.all(pages.map(async page=>{
        const [cms,staged]=await Promise.all([
          api<PageResponse>('/api/cms/page?route='+encodeURIComponent(page.route)),
          api<DraftResponse>('/api/cms/local-studio/draft?route='+encodeURIComponent(page.route)),
        ]);
        rows.set(page.slug,cms);
        drafts.set(page.slug,new Map(staged.drafts.map(d=>[d.section_key,d])));
      }));
      const requested=new URLSearchParams(location.search).get('slug');
      return requested&&rows.has(requested)?requested:(rows.has('home')?'home':pages[0].slug);
    },
    routes(){return Object.fromEntries(pages.map(p=>[p.slug,p.route]));},
  };
}
