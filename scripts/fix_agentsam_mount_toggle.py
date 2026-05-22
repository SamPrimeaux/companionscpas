from pathlib import Path
import re

app = Path("public/dashboard/js/app.jsx")
ui = Path("public/dashboard/js/ui.jsx")
agent = Path("public/dashboard/js/agentsam.jsx")

# 1) Ensure header bot dispatches toggle
s = ui.read_text()
s = s.replace(
  'onClick: () => window.dispatchEvent(new Event("agentsam:open"))',
  'onClick: () => window.dispatchEvent(new Event("agentsam:toggle"))'
)
s = s.replace(
  'onClick:()=>window.dispatchEvent(new CustomEvent("agentsam:open"))',
  'onClick:()=>window.dispatchEvent(new Event("agentsam:toggle"))'
)
ui.write_text(s)

# 2) Ensure drawer listens to toggle and is mounted even when closed
a = agent.read_text()

a = a.replace(
  'const [open, setOpen] = React.useState(true);',
  'const [open, setOpen] = React.useState(false);'
)

if 'agentsam:toggle' not in a:
    a = a.replace(
'''  React.useEffect(() => {
    const openDrawer = () => setOpen(true);
    window.addEventListener("agentsam:open", openDrawer);
    return () => window.removeEventListener("agentsam:open", openDrawer);
  }, []);''',
'''  React.useEffect(() => {
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
  }, [open]);'''
    )

# closed = fully hidden
a = re.sub(r'if \(!open\) \{[\s\S]*?return React\.createElement\("aside"[\s\S]*?\);\s*\}', 'if (!open) return null;', a, count=1)
agent.write_text(a)

# 3) Mount AgentSam globally in App if missing
p = app.read_text()

if 'React.createElement(AgentSamDrawer' not in p:
    # Find final return render tree and append drawer as last child before closing );
    p = re.sub(
        r'(\n\s*React\.createElement\(DashboardLayout,[\s\S]*?\)\n\s*\);)',
        lambda m: m.group(0).replace('\n  );', ',\n    React.createElement(AgentSamDrawer, null)\n  );'),
        p,
        count=1
    )

# Fallback: if still not mounted, wrap root render with fragment manually is too risky, print warning.
app.write_text(p)

print("AgentSam mounted?", "React.createElement(AgentSamDrawer" in p)
