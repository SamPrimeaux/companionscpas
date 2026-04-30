from pathlib import Path
import re

cms = Path("public/dashboard/js/view-cms.jsx")
s = cms.read_text(errors="ignore")

# Fix missing Page component by defining a safe local wrapper near top.
if "function CMSPageShell" not in s:
    s = s.replace(
        "function CMSView({ onNavigate }) {",
        '''function CMSPageShell({ children }) {
  return React.createElement("div", { style:{ minHeight:"100%", width:"100%" } }, children);
}

function CMSView({ onNavigate }) {''',
        1
    )

# Replace accidental <Page> references if Babel/JSX remnants exist.
s = s.replace("React.createElement(Page,", "React.createElement(CMSPageShell,")
s = s.replace("React.createElement(window.Page,", "React.createElement(CMSPageShell,")

# Ensure global export exists.
if "window.CMSView = CMSView;" not in s:
    s += "\nwindow.CMSView = CMSView;\n"

cms.write_text(s)

app = Path("public/dashboard/js/app.jsx")
a = app.read_text(errors="ignore")

# Guard CMS route so the whole dashboard doesn't blank if CMS fails loading.
a = a.replace(
    'case "cms":                return React.createElement(CMSView,               { onNavigate:navigate });',
    '''case "cms":
        return typeof CMSView === "function"
          ? React.createElement(CMSView, { onNavigate:navigate })
          : React.createElement("div", { style:{ padding:28, color:"#f0f0f5" } }, "CMS is loading...");'''
)

app.write_text(a)

print("fixed CMS isolated crash guards")
