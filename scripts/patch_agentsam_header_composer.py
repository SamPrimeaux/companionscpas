from pathlib import Path
import re

ui = Path("public/dashboard/js/ui.jsx")
agent = Path("public/dashboard/js/agentsam.jsx")

# ----------------------------
# 1) Patch ui.jsx icons, logo, Add New CTA
# ----------------------------
s = ui.read_text()

# Add missing icon aliases/svgs before closing ICONS object.
if "bot:" not in s:
    s = s.replace(
'''  warning:   `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3L2 17h16L10 3z"/><path d="M10 8v4M10 14v.5"/></svg>`,
};''',
'''  warning:   `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3L2 17h16L10 3z"/><path d="M10 8v4M10 14v.5"/></svg>`,
  bot:       `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="6" width="12" height="10" rx="3"/><path d="M10 3v3"/><circle cx="8" cy="11" r="1"/><circle cx="12" cy="11" r="1"/><path d="M7.5 14h5"/></svg>`,
  sparkles:  `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2l1.6 4.4L16 8l-4.4 1.6L10 14l-1.6-4.4L4 8l4.4-1.6L10 2z"/><path d="M16 12l.8 2.2L19 15l-2.2.8L16 18l-.8-2.2L13 15l2.2-.8L16 12z"/></svg>`,
  arrowUp:   `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 16V4"/><path d="M5 9l5-5 5 5"/></svg>`,
  stop:      `<svg viewBox="0 0 20 20" fill="currentColor"><rect x="6" y="6" width="8" height="8" rx="1.5"/></svg>`,
  panelRightClose:`<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="14" height="14" rx="2"/><path d="M13 3v14"/><path d="M9 7l-3 3 3 3"/></svg>`,
  paperclip: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M16 9l-7 7a4 4 0 0 1-5.7-5.7l8-8a3 3 0 0 1 4.2 4.2l-8 8a2 2 0 0 1-2.8-2.8l7-7"/></svg>`,
  image:     `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="14" height="12" rx="2"/><circle cx="8" cy="9" r="1.5"/><path d="M17 13l-3.5-3.5L6 16"/></svg>`,
};'''
    )

# Support hyphen icon names used in agentsam.jsx
s = s.replace(
'''function Icon({ name, size = 16, style = {} }) {
  const svg = ICONS[name] || ICONS.docs;''',
'''function Icon({ name, size = 16, style = {} }) {
  const aliases = { "arrow-up":"arrowUp", "panel-right-close":"panelRightClose" };
  const key = aliases[name] || name;
  const svg = ICONS[key] || ICONS.docs;'''
)

# Replace topbar Add New button
s = s.replace(
'''React.createElement(Btn, { icon:"plus", onClick:()=>{} }, "Add New")''',
'''React.createElement("button", {
        onClick: () => window.dispatchEvent(new Event("agentsam:open")),
        title: "Open Agent Sam",
        style: {
          width:40,
          height:40,
          borderRadius:14,
          border:`1px solid ${C.border}`,
          background:"linear-gradient(135deg,#7c3aed,#a78bfa)",
          color:"#fff",
          display:"grid",
          placeItems:"center",
          cursor:"pointer",
          boxShadow:"0 10px 26px rgba(124,58,237,.24)"
        }
      }, React.createElement(Icon, { name:"bot", size:19 }))'''
)

# Replace sidebar brand block by matching the two text divs cluster.
brand_pattern = re.compile(
r'''React\.createElement\("div", \{ style:\{ width:36, height:36, borderRadius:10,[\s\S]*?React\.createElement\("div", \{ style:\{ fontSize:10, fontWeight:700, color:C\.purpleL, letterSpacing:"0\.08em" \} \}, "OF CPAS"\)
\s*\)''',
re.M
)

brand_repl = '''React.createElement("a", {
        href:"/dashboard?view=overview",
        title:"Companions of CPAS Dashboard",
        style:{ display:"flex", alignItems:"center", gap:10, textDecoration:"none", minWidth:0 }
      },
        React.createElement("img", {
          src:"https://companionscpas-platform.samprimeauxwork.workers.dev/logo.png",
          alt:"Companions of CPAS",
          style:{ width:92, height:"auto", display:"block", objectFit:"contain" }
        })
      )'''

s2 = brand_pattern.sub(brand_repl, s, count=1)
if s2 == s:
    print("WARN: sidebar brand pattern not replaced; inspect Sidebar block.")
s = s2

ui.write_text(s)

# ----------------------------
# 2) Patch AgentSam composer send/stop + abort support
# ----------------------------
a = agent.read_text()

# Add abort controller state
a = a.replace(
'''  const [menuOpen, setMenuOpen] = React.useState(false);''',
'''  const [menuOpen, setMenuOpen] = React.useState(false);
  const abortRef = React.useRef(null);'''
)

# Add stop function before sendPrompt
a = a.replace(
'''  async function sendPrompt() {''',
'''  function stopPrompt() {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setBusy(false);
    setSteps(s => [...s, { title:"Stopped by user", status:"stopped" }]);
  }

  async function sendPrompt() {'''
)

# Add AbortController into request
a = a.replace(
'''    try {
      const res = await fetch("/api/agentsam/chat", {''',
'''    try {
      const controller = new AbortController();
      abortRef.current = controller;
      const res = await fetch("/api/agentsam/chat", {'''
)

a = a.replace(
'''        body:JSON.stringify({ prompt:text, mode, session_id:sessionId, route_path:location.pathname + location.search })
      });''',
'''        body:JSON.stringify({ prompt:text, mode, session_id:sessionId, route_path:location.pathname + location.search }),
        signal:controller.signal
      });'''
)

# Better abort catch/finally
a = a.replace(
'''    } catch (err) {
      setMessages(m => [...m, { role:"assistant", content:String(err.message || err) }]);
    } finally {
      setBusy(false);
    }''',
'''    } catch (err) {
      if (err && err.name === "AbortError") {
        setMessages(m => [...m, { role:"assistant", content:"Stopped. I paused the current Agent Sam run." }]);
      } else {
        setMessages(m => [...m, { role:"assistant", content:String(err.message || err) }]);
      }
    } finally {
      abortRef.current = null;
      setBusy(false);
    }'''
)

# Replace send button render block only
a = a.replace(
'''        React.createElement("button", {
          type:"button",
          title:"Send",
          onClick:sendPrompt,
          disabled:busy || !prompt.trim(),
          style:{
            width:36, height:36, borderRadius:18, border:"none",
            background:busy || !prompt.trim() ? C.raised : "linear-gradient(135deg,#7c3aed,#a78bfa)",
            color:"#fff", display:"grid", placeItems:"center",
            cursor:busy || !prompt.trim() ? "not-allowed" : "pointer",
            flexShrink:0
          }
        }, React.createElement(Icon, { name:"arrow-up", size:17 }))''',
'''        React.createElement("button", {
          type:"button",
          title: busy ? "Stop Agent Sam" : "Send",
          onClick: busy ? stopPrompt : sendPrompt,
          disabled:!busy && !prompt.trim(),
          style:{
            width:38,
            height:38,
            borderRadius:19,
            border:"none",
            background:busy ? "linear-gradient(135deg,#ef4444,#f87171)" : (!prompt.trim() ? C.raised : "linear-gradient(135deg,#7c3aed,#a78bfa)"),
            color:"#fff",
            display:"grid",
            placeItems:"center",
            cursor:(!busy && !prompt.trim()) ? "not-allowed" : "pointer",
            flexShrink:0,
            boxShadow: busy || prompt.trim() ? "0 10px 24px rgba(124,58,237,.25)" : "none"
          }
        }, React.createElement(Icon, { name:busy ? "stop" : "arrow-up", size:17 }))'''
)

agent.write_text(a)

print("patched ui.jsx + agentsam.jsx")
