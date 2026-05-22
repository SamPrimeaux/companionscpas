from pathlib import Path
import re

pages = ["public/about.html","public/adopt.html","public/services.html","public/donate.html"]

LOCK = '''
<style id="cpas-header-top-lock-v1">
html,body{margin:0!important}
body{padding-top:0!important}
.site-header{
  position:fixed!important;
  top:0!important;
  left:0!important;
  right:0!important;
  margin:0!important;
  transform:none!important;
  z-index:99999!important;
}
.site-header .container.nav{
  margin-top:0!important;
}
main,.page,section:first-of-type{
  margin-top:0!important;
}
</style>
'''

for file in pages:
    p = Path(file)
    s = p.read_text(errors="ignore")
    s = re.sub(r'\n?<style id="cpas-header-top-lock-v1">[\s\S]*?</style>\s*', '\n', s)
    s = s.replace("</head>", LOCK + "\n</head>", 1)
    p.write_text(s)
    print("locked header top:", file)
