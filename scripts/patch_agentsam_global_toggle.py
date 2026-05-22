from pathlib import Path
import re

ui = Path("public/dashboard/js/ui.jsx")
agent = Path("public/dashboard/js/agentsam.jsx")
overview = Path("public/dashboard/js/view-overview.jsx")
app = Path("public/dashboard/js/app.jsx")

# ----------------------------
# 1) Header bot launcher: icon-only, same size/color as topbar icons, toggle drawer
# ----------------------------
s = ui.read_text()

s = s.replace(
'''onClick: () => window.dispatchEvent(new Event("agentsam:open")),
        title: "Open Agent Sam",''',
'''onClick: () => window.dispatchEvent(new Event("agentsam:toggle")),
        title: "Toggle Agent Sam",
        className:"agentsam-launcher",'''
)

s = re.sub(
r'''style: \{
\s*width:34,
\s*height:34,
\s*borderRadius:12,
\s*border:"none",
\s*background:"transparent",
\s*color:C\.purpleL,
\s*display:"grid",
\s*placeItems:"center",
\s*cursor:"pointer"
\s*\}''',
'''style: {
          width:34,
          height:34,
          borderRadius:10,
          border:"none",
          background:"transparent",
          color:C.textSec,
          display:"grid",
          placeItems:"center",
          cursor:"pointer",
          padding:0
        }''',
s
)

s = s.replace('React.createElement(Icon, { name:"bot", size:19 })', 'React.createElement(Icon, { name:"bot", size:18 })')
ui.write_text(s)

# ----------------------------
# 2) AgentSam drawer: hide completely when closed, toggle events, remove sparkles remnants
# ----------------------------
a = agent.read_text()

# Add CSS for active bot icon if not present
if "agentsam-launcher" not in a.split("function AgentSamDrawer")[0]:
    a = a.replace(
'''function AgentSamDrawer() {''',
'''if (!document.getElementById("agentsam-global-style")) {
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

function AgentSamDrawer() {'''
    )

# open default false so it doesn't steal right side until clicked
a = a.replace('const [open, setOpen] = React.useState(true);', 'const [open, setOpen] = React.useState(false);')

# replace open-only listener with open/toggle/close listeners + body class sync
a = re.sub(
r'''React\.useEffect\(\(\) => \{
\s*const openDrawer = \(\) => setOpen\(true\);
\s*window\.addEventListener\("agentsam:open", openDrawer\);
\s*return \(\) => window\.removeEventListener\("agentsam:open", openDrawer\);
\s*\}, \[\]\);''',
'''React.useEffect(() => {
    const openDrawer = () => setOpen(true);
    const closeDrawer = () => setOpen(false);
    const toggleDrawer = () => setOpen(v => !v);
    window.addEventListener("agentsam:open", openDrawer);
    window.addEventListener("agentsam:close", closeDrawer);
    window.addEventListener("agentsam:toggle", toggleDrawer);
    return () => {
      window.removeEventListener("agentsam:open", openDrawer);
      window.removeEventListener("agentsam:close", closeDrawer);
      window.removeEventListener("agentsam:toggle", toggleDrawer);
    };
  }, []);

  React.useEffect(() => {
    document.body.classList.toggle("agentsam-open", open);
  }, [open]);''',
a
)

# closed drawer should fully disappear, not leave rail/sparkle
a = re.sub(
r'''if \(!open\) \{
[\s\S]*?return React\.createElement\("aside",[\s\S]*?\);
\s*\}''',
'''if (!open) return null;''',
a,
count=1
)

# Remove old sparkles from menu item
a = a.replace('["sparkles", "Generate campaign"],', '["edit", "Generate campaign"],')

agent.write_text(a)

# ----------------------------
# 3) Remove AgentSam mount from overview only
# ----------------------------
o = overview.read_text()
o = o.replace('    // Right panel\n    React.createElement(AgentSamDrawer, null)', '    // AgentSam is mounted globally in App')
o = o.replace(',\n    // AgentSam is mounted globally in App\n  );', '\n  );')
overview.write_text(o)

# ----------------------------
# 4) Mount AgentSam globally in app.jsx, across all dashboard views
# ----------------------------
ap = app.read_text()

if "AgentSamDrawer, null" not in ap:
    # Most common structure: return React.createElement("div", ..., Sidebar, main)
    # Add drawer as final child before the last close of main app return.
    ap = re.sub(
        r'''(return React\.createElement\("div",\s*\{[^;]+?)(\n\s*\);)''',
        lambda m: m.group(1).rstrip() + ',\n    React.createElement(AgentSamDrawer, null)' + m.group(2),
        ap,
        count=1,
        flags=re.S
    )

app.write_text(ap)

print("patched AgentSam global toggle/drawer/header")
