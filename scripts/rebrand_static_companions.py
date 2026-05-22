from pathlib import Path

ROOT = Path("public")
REPLACEMENTS = {
  "PawLove Rescue & Services": "Companions of CPAS",
  "PawLove Rescue": "Companions of CPAS",
  "PawLove": "Companions of CPAS",
  "pawloverescue.org": "companionscpas.org",
  "hey@pawloverescue.org": "no-reply@companionscpas.org",
  "Grant Parish, Louisiana": "Companions of CPAS"
}

for path in ROOT.rglob("*"):
    if path.suffix.lower() not in [".html", ".css", ".js"]:
        continue
    text = path.read_text(errors="replace")
    old = text
    for a,b in REPLACEMENTS.items():
        text = text.replace(a,b)
    if text != old:
        path.write_text(text)
        print("updated", path)
