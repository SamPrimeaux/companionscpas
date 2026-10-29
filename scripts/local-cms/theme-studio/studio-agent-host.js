(function () {
  "use strict";
  // If an older embedding route is ever used, the host bridge forwards AgentSam
  // actions to the parent instead of mounting a second workbench.
  if (window.parent !== window) return;

  let root = null;
  function emit(name, detail) {
    window.dispatchEvent(new CustomEvent(name, detail ? { detail } : undefined));
  }
  function mountAgentSam() {
    if (root) return;
    const sdk = window.CompanionsSDKChrome;
    if (!window.React || !window.ReactDOM?.createRoot ||
        !sdk?.HostMiniAgent || typeof window.AgentSamDrawer !== "function") {
      console.error("[companions-studio-agent] Updated AgentSam workbench could not initialize.");
      return;
    }
    let mount = document.getElementById("companions-studio-agent-root");
    if (!mount) {
      mount = document.createElement("div");
      mount.id = "companions-studio-agent-root";
      mount.setAttribute("data-agent-overlay-root", "true");
      document.body.appendChild(mount);
    }
    root = window.ReactDOM.createRoot(mount);
    root.render(window.React.createElement(window.React.Fragment, null,
      window.React.createElement(sdk.HostMiniAgent),
      window.React.createElement(window.AgentSamDrawer)
    ));
  }

  window.initAgentsamDrawer = mountAgentSam;
  window.openAgentsamDrawer = function (prompt) {
    emit("agentsam:open", typeof prompt === "string" && prompt.trim() ? { prompt: prompt.trim() } : undefined);
  };
  window.closeAgentsamDrawer = function () { emit("agentsam:close"); };
  window.toggleAgentsamDrawer = function () { emit("agentsam:toggle"); };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountAgentSam, { once: true });
  } else {
    mountAgentSam();
  }
})();