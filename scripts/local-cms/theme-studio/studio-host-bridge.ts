/**
 * Embed contract: the SDK Theme Studio shares the already mounted parent
 * AgentSam workbench. It must never load a second legacy assistant in iframe.
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
