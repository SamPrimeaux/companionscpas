/**
 * Companions bridge onto the SDK-owned navigation and AgentSam workbench.
 * Existing routes, API transports, page components and brand data stay in
 * their host application; this module owns no application business logic.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Nav, useNav } from '@inneranimalmedia/agentsam-nav';
import { AgentPanel, AgentComposer, MiniAgentSam } from '@inneranimalmedia/agentsam-workbench';
import { LayoutDashboard,PawPrint,ClipboardList,Stethoscope,Heart,Users,
  HandHeart,Globe,Image,FileText,Settings,Mail,BarChart3,LogOut,
  PanelLeftClose, MousePointer2, Maximize2, Building2 } from 'lucide-react';

type RouteItem={key:string;label:string;icon?:string;path:string;children?:RouteItem[]};
type RouteGroup={group:string;items:RouteItem[]};
type AgentMessage={role:'user'|'assistant'|'system';content:string;meta?:string};
const icons:Record<string,React.ComponentType<any>>={
  dashboard:LayoutDashboard,paw:PawPrint,clipboard:ClipboardList,medical:Stethoscope,
  heart:Heart,check:Heart,docs:FileText,people:Users,trending:HandHeart,
  edit:Globe,image:Image,gear:Settings,email:Mail,report:BarChart3,
};
function MenuEventBridge(){
 const nav=useNav();
 useEffect(()=>{
  const open=()=>nav.setOpen(true);
  window.addEventListener('cpas:sdk-nav-open',open);
  return ()=>window.removeEventListener('cpas:sdk-nav-open',open);
 },[nav.setOpen]);
 return null;
}
function SidebarContents({groups,view,navigate,onLogout}:{
 groups:RouteGroup[];view:string;navigate:(view:string)=>void;onLogout:()=>void
}){
 const nav=useNav();
 const go=(key:string)=>{navigate(key);if(nav.isMobile)nav.close();};
 return <Nav aria-label="Companions dashboard navigation">
  <Nav.Header className="cpas-sdk-nav-header">
   <button type="button" className="cpas-sdk-brand" onClick={()=>go('overview')}
    title="Companions of CPAS overview">
    <img src="/static/global/companionsofcpa-newlogo.webp" alt="" />
    <span>Companions <small>of CPAS</small></span>
   </button>
   <Nav.Trigger aria-label="Collapse or expand sidebar"><PanelLeftClose size={17}/></Nav.Trigger>
  </Nav.Header>
  <Nav.Content>
   {groups.map(group=><Nav.Group key={group.group}>
    <Nav.GroupLabel>{group.group}</Nav.GroupLabel>
    <Nav.Menu>
     {group.items.map(item=><Nav.MenuItem key={item.key}>
      <Nav.MenuButton itemId={item.key} icon={icons[item.icon||'']||Building2}
       active={view===item.key||Boolean(item.children?.some(c=>c.key===view))}
       onClick={()=>go(item.key)}>{item.label}</Nav.MenuButton>
      {item.children?.length&&(
       <Nav.MenuSub>
        {item.children.map(child=><li key={child.path}>
         <Nav.MenuSubButton href={child.path} active={view===child.key}
          onClick={event=>{event.preventDefault();go(child.key);}}>
          {child.label}</Nav.MenuSubButton>
        </li>)}
       </Nav.MenuSub>
      )}
     </Nav.MenuItem>)}
    </Nav.Menu>
   </Nav.Group>)}
  </Nav.Content>
  <Nav.Footer>
   <div className="cpas-sdk-account">
    <span className="cpas-sdk-account-mark">CP</span>
    <span className="cpas-sdk-account-text"><strong>Companions of CPAS</strong><small>Local Studio QA</small></span>
    <button type="button" onClick={onLogout} aria-label="Sign out"><LogOut size={16}/></button>
   </div>
  </Nav.Footer>
 </Nav>;
}
export function HostNav(props:{
 groups:RouteGroup[];view:string;navigate:(view:string)=>void;onLogout:()=>void
}){
 return <Nav.Provider theme="light" defaultOpen={true} accentColor="#8233d7"
   mobileBreakpoint={768} peekable={false} resizable={false}>
  <MenuEventBridge/>
  <SidebarContents {...props}/>
 </Nav.Provider>;
}
export function HostMiniAgent(){
 const [draft,setDraft]=useState('');
 const [selecting,setSelecting]=useState(false);
 const [visible,setVisible]=useState(true);
 const scope=useCallback(()=>document.getElementById('main-scroll'),[]);
 const openPrompt=(input:string)=>{
  const prompt=input.trim();if(!prompt)return;
  window.dispatchEvent(new CustomEvent('agentsam:open',{detail:{prompt}}));
  setDraft('');
 };
 return <>
  {visible?<div className="cpas-sdk-mini" data-annotation-control="true">
   <AgentComposer value={draft} onChange={setDraft} onSend={()=>openPrompt(draft)}
    placeholder="Ask AgentSam…" maxHeight={72}
    toolbarStart={<button type="button" className={selecting?'is-active':''}
     title="Select dashboard element" aria-label="Select an element"
     aria-pressed={selecting} onClick={()=>setSelecting(s=>!s)}>
     <MousePointer2 size={16}/></button>}
    toolbarEnd={<>
     <button type="button" title="Open AgentSam conversation" aria-label="Open conversation"
      onClick={()=>window.dispatchEvent(new CustomEvent('agentsam:open'))}>
      <Maximize2 size={16}/></button>
     <button type="button" title="Minimize MiniAgentSam" onClick={()=>setVisible(false)}>×</button>
    </>}/>
  </div>:<button type="button" className="cpas-sdk-mini-restore"
   onClick={()=>setVisible(true)} aria-label="Show MiniAgentSam">AgentSam</button>}
  <MiniAgentSam selecting={selecting} onSelectingChange={setSelecting}
   scope={scope} onSubmit={(prompt,selection)=>{
    openPrompt(`Page: ${selection.page}. Element: ${selection.label}. ${prompt}`);
   }}/>
 </>;
}
export function HostAgentPanel({
 messages,draft,onDraftChange,onSend,onCancel,streaming,onClose,steps,
}:{
 messages:AgentMessage[];draft:string;onDraftChange:(s:string)=>void;
 onSend:()=>void;onCancel:()=>void;streaming:boolean;onClose:()=>void;
 steps:Array<{title?:string;status?:string}>;
}){
 const items=messages.map((m,i)=>({
  id:'cpas-msg-'+i,role:m.role,content:m.content,createdAt:new Date().toISOString(),
 }));
 return <aside className="cpas-sdk-agentsam-drawer" aria-label="AgentSam side assistant">
  <header className="cpas-sdk-agent-header">
   <strong>AgentSam <small>Companions workspace</small></strong>
   <button type="button" onClick={onClose} aria-label="Close AgentSam">×</button>
  </header>
  {steps.length>0&&<div className="cpas-sdk-agent-progress" role="status">
   {steps.slice(-2).map((s,i)=><span key={i}>{s.title||'Working'}</span>)}
  </div>}
  <AgentPanel messages={items as any} draft={draft} onDraftChange={onDraftChange}
   onSend={onSend} onCancel={onCancel} streaming={streaming}/>
 </aside>;
}
