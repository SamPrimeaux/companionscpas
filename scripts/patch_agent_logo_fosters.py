from pathlib import Path

ui = Path("public/dashboard/js/ui.jsx")
agent = Path("public/dashboard/js/agentsam.jsx")

# ----------------------------
# ui.jsx: sidebar logo + header bot icon
# ----------------------------
s = ui.read_text()

old_logo = '''    // Logo
    React.createElement("div", { style:{ padding:"20px 20px 16px", borderBottom:`1px solid ${C.border}`, flexShrink:0 } },
      React.createElement("div", { style:{ display:"flex", alignItems:"center", gap:10 } },
        React.createElement("div", { dangerouslySetInnerHTML:{ __html:`<svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="36" height="36" rx="10" fill="#2d1b5e"/><circle cx="14" cy="11" r="2.5" fill="#a78bfa"/><circle cx="22" cy="11" r="2.5" fill="#a78bfa"/><circle cx="10" cy="17" r="2" fill="#a78bfa"/><circle cx="26" cy="17" r="2" fill="#a78bfa"/><path d="M18 15c-4 0-8 3.2-8 8 0 2.4 1.6 4 3.2 4 1 0 2.4-.8 3.2-.8h3.2c.8 0 2.2.8 3.2.8 1.6 0 3.2-1.6 3.2-4 0-4.8-4-8-8-8z" fill="#7c3aed"/></svg>` } }),
        React.createElement("div", null,
          React.createElement("div", { style:{ fontSize:13, fontWeight:700, color:"#f0f0f5", lineHeight:1 } }, "Companions"),
          React.createElement("div", { style:{ fontSize:10, color:"#a78bfa", letterSpacing:"0.08em", textTransform:"uppercase" } }, "of CPAS")
        )
      )
    ),'''

new_logo = '''    // Logo
    React.createElement("div", { style:{ padding:"18px 18px 14px", borderBottom:`1px solid ${C.border}`, flexShrink:0 } },
      React.createElement("a", {
        href:"/dashboard?view=overview",
        title:"Companions of CPAS Dashboard",
        style:{ display:"flex", alignItems:"center", textDecoration:"none" }
      },
        React.createElement("img", {
          src:"https://companionscpas-platform.samprimeauxwork.workers.dev/logo.png",
          alt:"Companions of CPAS",
          style:{ width:108, height:"auto", display:"block", objectFit:"contain" }
        })
      )
    ),'''

if old_logo not in s:
    raise SystemExit("Could not find exact sidebar logo block.")
s = s.replace(old_logo, new_logo)

# Make topbar Agent Sam launcher icon-only/no visible rounded button background
old_bot_style = '''style: {
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
        }'''
new_bot_style = '''style: {
          width:34,
          height:34,
          borderRadius:12,
          border:"none",
          background:"transparent",
          color:C.purpleL,
          display:"grid",
          placeItems:"center",
          cursor:"pointer"
        }'''
s = s.replace(old_bot_style, new_bot_style)

ui.write_text(s)

# ----------------------------
# agentsam.jsx: remove mode buttons + move close toggle into header icon area
# ----------------------------
a = agent.read_text()

# Replace header sparkles badge with close/toggle button
old_header_icon = '''React.createElement("div", { style:{ width:34, height:34, borderRadius:12, background:"linear-gradient(135deg,#7c3aed,#a78bfa)", display:"grid", placeItems:"center", color:"#fff" } },
          React.createElement(Icon, { name:"sparkles", size:17 })
        ),'''
new_header_icon = '''React.createElement("button", {
          onClick:()=>setOpen(false),
          title:"Collapse Agent Sam",
          style:{ width:34, height:34, borderRadius:12, border:`1px solid ${C.border}`, background:C.raised, color:C.textSec, display:"grid", placeItems:"center", cursor:"pointer" }
        },
          React.createElement(Icon, { name:"panel-right-close", size:17 })
        ),'''
a = a.replace(old_header_icon, new_header_icon)

# Remove the old far-right close icon button in header
old_right_close = '''React.createElement("button", { onClick:()=>setOpen(false), style:{ background:"transparent", border:"none", color:C.textSec, cursor:"pointer" } },
        React.createElement(Icon, { name:"panel-right-close", size:18 })
      )'''
a = a.replace(old_right_close, "null")

# Remove Ask/Plan/Agent/Debug visible mode switcher
start = '''    React.createElement("div", { style:{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6, padding:12, borderBottom:`1px solid ${C.border}` } },
      ["ask","plan","agent","debug"].map(m =>
        React.createElement("button", {
          key:m,
          onClick:()=>setMode(m),
          style:{ padding:"8px 0", borderRadius:10, border:`1px solid ${mode===m ? C.purple : C.border}`, background:mode===m ? "rgba(124,58,237,.18)" : C.raised, color:mode===m ? C.text : C.textSec, textTransform:"capitalize", cursor:"pointer", fontSize:12, fontWeight:700 }
        }, m)
      )
    ),

'''
a = a.replace(start, "")

# Keep internal mode auto
a = a.replace('const [mode, setMode] = React.useState("ask");', 'const [mode] = React.useState("auto");')

agent.write_text(a)

print("patched: sidebar logo, header bot launcher, AgentSam header/modes")
