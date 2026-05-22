from pathlib import Path
import re

FILES = [
    "public/adopt.html",
    "public/services.html",
    "public/donate.html",
]

for f in FILES:
    p = Path(f)
    s = p.read_text(errors="ignore")

    # ❌ remove OLD modal builders (JS template ones)
    s = re.sub(
        r'return\s+`<div class="cpas-donate-modal"[\s\S]*?`;',
        '',
        s,
        flags=re.I
    )

    # ❌ remove duplicate modal HTML blocks (keep only last one)
    modals = list(re.finditer(r'<div class="cpas-donate-modal"[\s\S]*?</script>', s, re.I))
    if len(modals) > 1:
        # keep LAST one
        for m in modals[:-1]:
            s = s.replace(m.group(0), '')

    # ❌ remove old header CSS blocks (keep only hard shell)
    s = re.sub(
        r'\.site-header\{[\s\S]*?\}',
        '',
        s,
        flags=re.I
    )

    # ❌ remove any stray header JS except new modal script
    s = re.sub(
        r'const header = document\.querySelector\("\.site-header"\);[\s\S]*?\}',
        '',
        s,
        flags=re.I
    )

    # clean duplicate blank lines
    s = re.sub(r'\n{3,}', '\n\n', s)

    p.write_text(s)
    print("cleaned:", f)

print("done")
