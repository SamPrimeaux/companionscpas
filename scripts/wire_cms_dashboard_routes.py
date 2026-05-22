from pathlib import Path
import re

p = Path("src/index.js")
s = p.read_text(errors="ignore")

if "const __cmsRouteResponse = await cmsRoutes" in s:
    print("already wired")
    raise SystemExit

# Find URL construction inside fetch handler.
m = re.search(r'(const\s+url\s*=\s*new\s+URL\(request\.url\);\s*)', s)
if not m:
    raise SystemExit("Could not find: const url = new URL(request.url);")

patch = r'''
    // CMS + dashboard API routes must run before static/R2 HTML fallback.
    const __cmsRouteResponse = await cmsRoutes(request, env, url);
    if (__cmsRouteResponse) return __cmsRouteResponse;

    const __dashboardRouteResponse = await dashboardApiRoutes(request, env, url);
    if (__dashboardRouteResponse) return __dashboardRouteResponse;

'''

s = s[:m.end()] + patch + s[m.end():]

p.write_text(s)
print("wired cmsRoutes + dashboardApiRoutes in src/index.js")
