from pathlib import Path

ui = Path("public/dashboard/js/ui.jsx")
agent = Path("public/dashboard/js/agentsam.jsx")

s = ui.read_text()

s = s.replace(
'''onClick: () => window.dispatchEvent(new Event("agentsam:toggle")),''',
'''onClick: () => {
          if (typeof window.__toggleAgentSam === "function") window.__toggleAgentSam();
          else window.dispatchEvent(new Event("agentsam:toggle"));
        },'''
)

s = s.replace(
'''width:34,
          height:34,''',
'''width:38,
          height:38,''',
1
)

s = s.replace(
'''React.createElement(Icon, { name:"bot", size:18 })''',
'''React.createElement(Icon, { name:"bot", size:22 })'''
)

ui.write_text(s)

a = agent.read_text()

# install reliable global functions inside component
if "window.__toggleAgentSam" not in a:
    a = a.replace(
'''  React.useEffect(() => {
    const openDrawer = () => setOpen(true);
    const closeDrawer = () => setOpen(false);
    const toggleDrawer = () => setOpen(v => !v);''',
'''  React.useEffect(() => {
    const openDrawer = () => setOpen(true);
    const closeDrawer = () => setOpen(false);
    const toggleDrawer = () => setOpen(v => !v);

    window.__openAgentSam = openDrawer;
    window.__closeAgentSam = closeDrawer;
    window.__toggleAgentSam = toggleDrawer;'''
    )

    a = a.replace(
'''      window.removeEventListener("agentsam:toggle", toggleDrawer);
    };
  }, []);''',
'''      window.removeEventListener("agentsam:toggle", toggleDrawer);
      delete window.__openAgentSam;
      delete window.__closeAgentSam;
      delete window.__toggleAgentSam;
    };
  }, []);'''
    )

agent.write_text(a)

print("patched direct AgentSam toggle + icon sizing")
