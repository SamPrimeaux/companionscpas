
if (!document.getElementById("agentsam-global-style")) {
  const style = document.createElement("style");
  style.id = "agentsam-global-style";
  style.textContent = `
    body.agentsam-open .agentsam-launcher {
      color: #a78bfa !important;
      filter: drop-shadow(0 0 8px rgba(167,139,250,.45));
    }
  `;
  document.head.appendChild(style);
}

function AgentSamDrawer() {
  const [open, setOpen] = React.useState(false);
  const [mode] = React.useState("auto");
  const [prompt, setPrompt] = React.useState("");
  const [messages, setMessages] = React.useState([
    { role:"assistant", content:"Agent Sam is ready. I can help review applications, draft donor updates, improve animal bios, plan campaigns, and guide CMS edits." }
  ]);
  const [steps, setSteps] = React.useState([]);
  const [busy, setBusy] = React.useState(false);
  const [sessionId, setSessionId] = React.useState(null);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const abortRef = React.useRef(null);

  React.useEffect(() => {
    const openDrawer = () => setOpen(true);
    const closeDrawer = () => setOpen(false);
    const toggleDrawer = () => setOpen(v => !v);

    window.__agentSamMounted = true;
    window.__openAgentSam = openDrawer;
    window.__closeAgentSam = closeDrawer;
    window.__toggleAgentSam = toggleDrawer;
    window.addEventListener("agentsam:open", openDrawer);
    window.addEventListener("agentsam:close", closeDrawer);
    window.addEventListener("agentsam:toggle", toggleDrawer);
    return () => {
      window.removeEventListener("agentsam:open", openDrawer);
      window.removeEventListener("agentsam:close", closeDrawer);
      window.removeEventListener("agentsam:toggle", toggleDrawer);
      delete window.__agentSamMounted;
      delete window.__openAgentSam;
      delete window.__closeAgentSam;
      delete window.__toggleAgentSam;
    };
  }, []);

  React.useEffect(() => {
    document.body.classList.toggle("agentsam-open", open);
  }, [open]);

  function stopPrompt() {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setBusy(false);
    setSteps(s => [...s, { title:"Stopped by user", status:"stopped" }]);
  }

  async function sendPrompt() {
    const text = prompt.trim();
    if (!text || busy) return;
    setPrompt("");
    setBusy(true);
    setMessages(m => [...m, { role:"user", content:text }]);
    setSteps([]);

    try {
      const controller = new AbortController();
      abortRef.current = controller;
      const res = await fetch("/api/agentsam/chat", {
        method:"POST",
        credentials:"include",
        headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({ prompt:text, mode, session_id:sessionId, route_path:location.pathname + location.search }),
        signal:controller.signal
      });

      if (!res.ok || !res.body) throw new Error("Agent Sam request failed.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream:true });

        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";

        for (const chunk of chunks) {
          const eventLine = chunk.split("\n").find(l => l.startsWith("event:"));
          const dataLine = chunk.split("\n").find(l => l.startsWith("data:"));
          if (!dataLine) continue;

          const event = eventLine ? eventLine.replace("event:", "").trim() : "message";
          const data = JSON.parse(dataLine.replace("data:", "").trim());

          if (event === "step") setSteps(s => [...s, data]);
          if (event === "answer") {
            if (data.session_id) setSessionId(data.session_id);
            setMessages(m => [...m, { role:"assistant", content:data.content, meta:`${data.provider} · ${data.model_key}` }]);
          }
          if (event === "error") setMessages(m => [...m, { role:"assistant", content:`Agent Sam hit an error: ${data.error}` }]);
        }
      }
    } catch (err) {
      if (err && err.name === "AbortError") {
        setMessages(m => [...m, { role:"assistant", content:"Stopped. I paused the current Agent Sam run." }]);
      } else {
        setMessages(m => [...m, { role:"assistant", content:String(err.message || err) }]);
      }
    } finally {
      abortRef.current = null;
      setBusy(false);
    }
  }

  if (!open) return null;

  const NV = {
    bg:      "var(--nav-bg)",
    bg2:     "rgba(255,255,255,0.04)",
    border:  "var(--nav-border)",
    raised:  "rgba(255,255,255,0.06)",
    text:    "var(--nav-text)",
    textSec: "var(--nav-text-sec)",
    textMut: "var(--nav-text-muted)",
    hover:   "rgba(255,255,255,0.08)",
  };
  return React.createElement("aside", { style:{ width:330, borderLeft:`1px solid ${NV.border}`, background:NV.bg, display:"flex", flexDirection:"column", minHeight:0 } },
    React.createElement("div", { style:{ padding:16, borderBottom:`1px solid ${NV.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 } },
      React.createElement("div", { style:{ display:"flex", alignItems:"center", gap:10 } },
        React.createElement("button", {
          onClick:()=>setOpen(false),
          title:"Collapse Agent Sam",
          style:{ width:34, height:34, borderRadius:12, border:`1px solid ${NV.border}`, background:NV.raised, color:NV.textSec, display:"grid", placeItems:"center", cursor:"pointer" }
        },
          React.createElement(Icon, { name:"panel-right-close", size:17 })
        ),
        React.createElement("div", null,
          React.createElement("div", { style:{ fontWeight:800, color:NV.text } }, "Agent Sam"),
          React.createElement("div", { style:{ fontSize:11, color:NV.textSec } }, busy ? "Working..." : "Dashboard assistant")
        )
      ),
      null
    ),

    React.createElement("div", { style:{ flex:1, overflow:"auto", padding:14, display:"flex", flexDirection:"column", gap:10 } },
      steps.length > 0 && React.createElement("div", { style:{ border:`1px solid ${NV.border}`, borderRadius:14, padding:10, background:NV.raised } },
        React.createElement("div", { style:{ fontWeight:800, fontSize:12, marginBottom:8, color:NV.text } }, "Live steps"),
        steps.slice(-5).map((s,i) =>
          React.createElement("div", { key:i, style:{ display:"flex", gap:8, color:NV.textSec, fontSize:12, marginTop:6 } },
            React.createElement(Icon, { name:"check", size:13 }),
            React.createElement("span", null, s.title || "Working")
          )
        )
      ),
      messages.map((m,i) =>
        React.createElement("div", { key:i, style:{ alignSelf:m.role==="user" ? "flex-end" : "flex-start", maxWidth:"92%" } },
          React.createElement("div", { style:{ padding:"10px 12px", borderRadius:14, background:m.role==="user" ? "rgba(124,58,237,.30)" : NV.raised, border:`1px solid ${NV.border}`, color:NV.text, fontSize:13, lineHeight:1.5, whiteSpace:"pre-wrap" } }, m.content),
          m.meta && React.createElement("div", { style:{ color:NV.textSec, fontSize:10, marginTop:4 } }, m.meta)
        )
      )
    ),

    React.createElement("div", { style:{ padding:12, borderTop:`1px solid ${NV.border}` } },
      React.createElement("div", {
        style:{
          position:"relative",
          display:"flex",
          alignItems:"flex-end",
          gap:8,
          border:`1px solid ${NV.border}`,
          background:"rgba(255,255,255,0.05)",
          borderRadius:24,
          padding:"8px 8px 8px 10px",
          boxShadow:"0 12px 30px rgba(0,0,0,.35)"
        }
      },
        React.createElement("button", {
          type:"button",
          title:"Add image or file",
          onClick:()=>setMenuOpen(v=>!v),
          style:{
            width:34, height:34, borderRadius:17, border:`1px solid ${NV.border}`,
            background:NV.raised, color:NV.textSec, display:"grid", placeItems:"center",
            cursor:"pointer", flexShrink:0, transition:"background .12s"
          },
          onMouseEnter:e=>e.currentTarget.style.background=NV.hover,
          onMouseLeave:e=>e.currentTarget.style.background=NV.raised
        }, React.createElement(Icon, { name:"plus", size:17 })),

        menuOpen && React.createElement(React.Fragment, null,
          React.createElement("div", {
            onClick:()=>setMenuOpen(false),
            style:{ position:"fixed", inset:0, zIndex:19 }
          }),
          React.createElement("div", {
            style:{
              position:"absolute", left:8, bottom:54, width:220,
              border:`1px solid ${NV.border}`,
              background:"#1a1728",
              borderRadius:16, padding:8,
              boxShadow:"0 18px 55px rgba(0,0,0,.55)", zIndex:20
            }
          },
            React.createElement("div", { style:{ fontSize:10, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:NV.textMut, padding:"4px 10px 8px" } }, "Add to message"),
            // Upload from computer → POST /api/cms/asset/upload
            React.createElement("label", {
              style:{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"9px 11px", border:"none", borderRadius:12, background:"transparent", color:NV.text, cursor:"pointer", fontWeight:600, fontSize:13, transition:"background .12s" },
              onMouseEnter:e=>e.currentTarget.style.background=NV.hover,
              onMouseLeave:e=>e.currentTarget.style.background="transparent"
            },
              React.createElement(Icon, { name:"image", size:15, style:{ color:"#a78bfa", flexShrink:0 } }),
              React.createElement("span", null, "Upload image to R2"),
              React.createElement("input", {
                type:"file", accept:"image/*", multiple:true, style:{ display:"none" },
                onChange: async e => {
                  setMenuOpen(false);
                  const files = Array.from(e.target.files || []);
                  if (!files.length) return;
                  const names = files.map(f=>f.name).join(", ");
                  setPrompt(p => (p ? p + " " : "") + `[Uploading: ${names}]`);
                  let uploaded = 0;
                  const urls = [];
                  for (const file of files) {
                    const fd = new FormData();
                    fd.append("file", file);
                    fd.append("usage_context", "cms");
                    try {
                      const res = await fetch("/api/cms/asset/upload", { method:"POST", credentials:"include", body:fd });
                      const d = await res.json();
                      if (d.success) { uploaded++; urls.push(d.public_url); }
                    } catch {}
                  }
                  if (urls.length) {
                    setPrompt(p => p.replace(`[Uploading: ${names}]`, `[Uploaded ${uploaded} image${uploaded>1?"s":""}: ${urls.join(", ")}]`));
                  } else {
                    setPrompt(p => p.replace(`[Uploading: ${names}]`, "[Upload failed]"));
                  }
                  e.target.value = "";
                }
              })
            ),
            // Pick from Drive
            React.createElement("button", {
              type:"button",
              onClick: async () => {
                setMenuOpen(false);
                // Check Drive connection first
                try {
                  const st = await fetch("/api/integrations/google-drive/status", { credentials:"include" }).then(r=>r.json());
                  if (!st.connected) {
                    setMessages(m => [...m, { role:"assistant", content:"Google Drive isn't connected yet. Go to CMS → Images → Google Drive tab to connect it first." }]);
                    return;
                  }
                  // List recent Drive images and append to prompt for Sam to reference
                  const files = await fetch("/api/integrations/google-drive/files?pageSize=9", { credentials:"include" }).then(r=>r.json());
                  if (files.ok && files.files.length) {
                    const list = files.files.slice(0,9).map(f=>`${f.name} (${f.id})`).join(", ");
                    setPrompt(p => (p ? p + " " : "") + `[Recent Drive images: ${list}] — which of these should I import?`);
                  } else {
                    setMessages(m => [...m, { role:"assistant", content:"No image files found in your connected Drive. Upload some images to Drive first, then try again." }]);
                  }
                } catch {
                  setMessages(m => [...m, { role:"assistant", content:"Couldn't reach Google Drive. Check your connection in CMS → Images." }]);
                }
              },
              style:{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"9px 11px", border:"none", borderRadius:12, background:"transparent", color:NV.text, cursor:"pointer", fontWeight:600, fontSize:13, textAlign:"left", transition:"background .12s" },
              onMouseEnter:e=>e.currentTarget.style.background=NV.hover,
              onMouseLeave:e=>e.currentTarget.style.background="transparent"
            },
              React.createElement(Icon, { name:"link", size:15, style:{ color:"#4285F4", flexShrink:0 } }),
              React.createElement("span", null, "Pick from Drive")
            ),
            React.createElement("div", { style:{ height:1, background:NV.border, margin:"6px 0" } }),
            // Context shortcuts
            ...[
              ["edit", "#a78bfa", "Website edit mode"],
              ["edit", "#22c55e", "Generate campaign"],
              ["mail", "#60a5fa", "Draft response"]
            ].map(([icon, col, label]) =>
              React.createElement("button", {
                key:label, type:"button",
                onClick:()=>{ setMenuOpen(false); setPrompt(p=>(p?p+" ":"")+"["+label+"] "); },
                style:{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"9px 11px", border:"none", borderRadius:12, background:"transparent", color:NV.text, cursor:"pointer", fontWeight:600, fontSize:13, textAlign:"left", transition:"background .12s" },
                onMouseEnter:e=>e.currentTarget.style.background=NV.hover,
                onMouseLeave:e=>e.currentTarget.style.background="transparent"
              },
                React.createElement(Icon, { name:icon, size:15, style:{ color:col, flexShrink:0 } }),
                React.createElement("span", null, label)
              )
            )
          )
        ),

        React.createElement("textarea", {
          value:prompt,
          onChange:e=>setPrompt(e.target.value),
          onKeyDown:e=>{ if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); sendPrompt(); } },
          placeholder:"Ask Agent Sam anything",
          rows:1,
          style:{
            flex:1, minHeight:34, maxHeight:110, resize:"none",
            border:"none", background:"transparent",
            color:NV.text, padding:"8px 2px", outline:"none",
            fontFamily:"inherit", fontSize:13, lineHeight:1.35
          }
        }),

        React.createElement("button", {
          type:"button",
          title: busy ? "Stop Agent Sam" : "Send",
          onClick: busy ? stopPrompt : sendPrompt,
          disabled:!busy && !prompt.trim(),
          style:{
            width:38, height:38, borderRadius:19, border:"none",
            background:busy ? "linear-gradient(135deg,#ef4444,#f87171)" : (!prompt.trim() ? "rgba(255,255,255,0.08)" : "linear-gradient(135deg,#7c3aed,#a78bfa)"),
            color:"#fff", display:"grid", placeItems:"center",
            cursor:(!busy && !prompt.trim()) ? "not-allowed" : "pointer",
            flexShrink:0,
            boxShadow: busy || prompt.trim() ? "0 10px 24px rgba(124,58,237,.25)" : "none"
          }
        }, React.createElement(Icon, { name:busy ? "stop" : "arrow-up", size:17 }))
      )
    )
  );
}
