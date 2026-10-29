/**
 * Standalone Studio mounts the shared AgentSam SDK workbench through
 * studio-agent-host.js. If embedded by an older route, forward to the parent
 * instead of mounting a duplicate assistant.
 */
declare global {
  interface Window {
    initAgentsamDrawer?:()=>void;
    openAgentsamDrawer?:()=>void;
    closeAgentsamDrawer?:()=>void;
  }
}
if(window.parent!==window){
  window.initAgentsamDrawer=()=>{};
  window.openAgentsamDrawer=()=>{
    window.parent.postMessage({type:'cpas:agentsam-open'},window.location.origin);
  };
  window.closeAgentsamDrawer=()=>{};
}
export {};
