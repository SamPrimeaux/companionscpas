from pathlib import Path

app = Path("public/dashboard/js/app.jsx")
agent = Path("public/dashboard/js/agentsam.jsx")
ui = Path("public/dashboard/js/ui.jsx")

for p in [app, agent, ui]:
    if not p.exists():
        raise SystemExit(f"missing file: {p}")

s = app.read_text()

# Remove AgentSamDrawer from loading screen if it was accidentally injected there
s = s.replace(
'''      React.createElement("div", { style:{ color:"#8888aa", fontSize:13 } }, "Loading dashboard…"),
    React.createElement(AgentSamDrawer, null)
    );''',
'''      React.createElement("div", { style:{ color:"#8888aa", fontSize:13 } }, "Loading dashboard…")
    );'''
)

# Ensure AgentSamDrawer is mounted in the real app tree
needle = '''      React.createElement("main", { id:"main-scroll", style:{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", minHeight:0 } },
        renderView()
      )
    )
  );
}'''

replacement = '''      React.createElement("main", { id:"main-scroll", style:{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", minHeight:0 } },
        renderView()
      )
    ),
    React.createElement(AgentSamDrawer, null)
  );
}'''

if "React.createElement(AgentSamDrawer, null)" not in s[s.find("return React.createElement(\"div\""):]:
    s = s.replace(needle, replacement)
elif '''    ),
    React.createElement(AgentSamDrawer, null)
  );''' not in s:
    s = s.replace(needle, replacement)

app.write_text(s)

a = agent.read_text()

# Make globals reliable + add explicit debug-safe fallback
if "window.__agentSamMounted = true;" not in a:
    a = a.replace(
'''    window.__openAgentSam = openDrawer;
    window.__closeAgentSam = closeDrawer;
    window.__toggleAgentSam = toggleDrawer;''',
'''    window.__agentSamMounted = true;
    window.__openAgentSam = openDrawer;
    window.__closeAgentSam = closeDrawer;
    window.__toggleAgentSam = toggleDrawer;'''
    )

if "delete window.__agentSamMounted;" not in a:
    a = a.replace(
'''      delete window.__openAgentSam;
      delete window.__closeAgentSam;
      delete window.__toggleAgentSam;''',
'''      delete window.__agentSamMounted;
      delete window.__openAgentSam;
      delete window.__closeAgentSam;
      delete window.__toggleAgentSam;'''
    )

agent.write_text(a)

u = ui.read_text()

# Make header click never show undefined / never depend only on direct global
old = '''if (typeof window.__toggleAgentSam === "function") window.__toggleAgentSam();
          else window.dispatchEvent(new Event("agentsam:toggle"));'''

new = '''if (typeof window.__toggleAgentSam === "function") {
            window.__toggleAgentSam();
          } else {
            window.dispatchEvent(new Event("agentsam:toggle"));
          }'''

u = u.replace(old, new)

ui.write_text(u)

print("repaired Agent Sam undefined toggle: drawer now mounts in active app tree")
