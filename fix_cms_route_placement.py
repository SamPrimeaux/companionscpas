from pathlib import Path
import re

p = Path("src/index.js")
s = p.read_text(errors="ignore")

# Remove wrongly inserted API routing from asset()
s = re.sub(
    r'\n\s*// CMS \+ dashboard API routes must run before static/R2 HTML fallback\.\n'
    r'\s*const __cmsRouteResponse = await cmsRoutes\(request, env, url\);\n'
    r'\s*if \(__cmsRouteResponse\) return __cmsRouteResponse;\n\n'
    r'\s*const __dashboardRouteResponse = await dashboardApiRoutes\(request, env, url\);\n'
    r'\s*if \(__dashboardRouteResponse\) return __dashboardRouteResponse;\n',
    '\n',
    s
)

# Insert cmsRoutes inside /api block before routes array
needle = '      const routes = [\n'
patch = '''      const cmsResult = await cmsRoutes(request, env, url);
      if (cmsResult) return cmsResult;

'''
if patch.strip() not in s:
    s = s.replace(needle, patch + needle, 1)

p.write_text(s)
print("fixed cms route placement inside /api block")
