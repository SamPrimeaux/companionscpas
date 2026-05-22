from pathlib import Path
import re, shutil, json

root = Path(".")
public = root / "public"
animals_dir = public / "assets" / "animals"
animals_dir.mkdir(parents=True, exist_ok=True)

source_exts = {".webp", ".jpg", ".jpeg", ".png"}
skip_names = {
    "logo.png",
    "logo.webp",
    "companionsofcpa-newlogo-512x512.png",
    "companionsofcpa-newlogo.webp",
}

# 1) collect local brand/dog images from repo root
images = []
for p in root.iterdir():
    if p.is_file() and p.suffix.lower() in source_exts and p.name not in skip_names:
        dest = animals_dir / p.name.replace(" ", "-").lower()
        shutil.copy2(p, dest)
        images.append("/assets/animals/" + dest.name)

if not images:
    raise SystemExit("No local dog images found in repo root. Move images into repo root and rerun.")

print("Registered animal assets:")
for img in images:
    print(" -", img)

# 2) replace old external images across public pages, cycling new images
targets = [
    public / "index.html",
    public / "about.html",
    public / "adopt.html",
    public / "services.html",
    public / "donate.html",
]

external_patterns = [
    r'https://imagedelivery\.net/g7wf09fCONpnidkRnR_5vw/[^"\')\s<>]+',
    r'https://images\.unsplash\.com/[^"\')\s<>]+',
]

idx = 0
for file in targets:
    if not file.exists():
        continue
    s = file.read_text()

    for pat in external_patterns:
        def repl(match):
            global idx
            val = images[idx % len(images)]
            idx += 1
            return val
        s = re.sub(pat, repl, s)

    # Replace common public color direction with dark glass theme tokens.
    theme_css = """
<style id="cpas-public-dark-glass-theme">
:root{
  --cpas-bg:#05080D;
  --cpas-bg-alt:#101927;
  --cpas-surface:rgba(18,25,36,.72);
  --cpas-surface-soft:rgba(255,255,255,.055);
  --cpas-border:rgba(255,255,255,.12);
  --cpas-text:#F8F7FF;
  --cpas-muted:rgba(248,247,255,.68);
  --cpas-purple:#6D5593;
  --cpas-purple-2:#8B74B7;
  --cpas-cyan:#16BFD6;
}
body{
  background:
    radial-gradient(circle at 20% 0%,rgba(109,85,147,.24),transparent 32%),
    radial-gradient(circle at 86% 18%,rgba(22,191,214,.15),transparent 34%),
    linear-gradient(135deg,var(--cpas-bg),var(--cpas-bg-alt) 52%,#04060A) !important;
  color:var(--cpas-text) !important;
}
.header-wrap,
.nav,
header{
  background:rgba(5,8,13,.72) !important;
  border-bottom:1px solid var(--cpas-border) !important;
  backdrop-filter:blur(22px) saturate(135%) !important;
}
section,
.home-section,
.about-section,
.services-section,
.donate-section,
.adopt-section{
  background:transparent !important;
}
.card,
.service-card,
.animal-card,
.donation-card,
.story-card,
.value-card,
.form-card,
.info-card{
  background:var(--cpas-surface) !important;
  border:1px solid var(--cpas-border) !important;
  box-shadow:0 24px 80px rgba(0,0,0,.32), inset 0 1px 0 rgba(255,255,255,.07) !important;
  backdrop-filter:blur(18px) saturate(130%) !important;
}
h1,h2,h3,h4,p,li,label{color:inherit}
p,.subheadline,.muted{color:var(--cpas-muted) !important}
a{color:inherit}
.btn,
button,
.btn-primary,
.hero-cta-primary{
  background:linear-gradient(135deg,var(--cpas-purple),var(--cpas-purple-2)) !important;
  border:1px solid rgba(255,255,255,.14) !important;
  color:white !important;
  box-shadow:0 18px 42px rgba(109,85,147,.30) !important;
}
.btn-secondary,
.hero-cta-secondary{
  background:rgba(255,255,255,.055) !important;
  border:1px solid rgba(255,255,255,.14) !important;
  color:white !important;
}
img{
  border-radius:18px;
}
.logo,
.footer-logo,
.brand img,
header img{
  border-radius:0 !important;
}
</style>
"""
    if "cpas-public-dark-glass-theme" not in s:
        s = s.replace("</head>", theme_css + "\n</head>")

    file.write_text(s)

# 3) seed cms_assets with new local assets
sql_lines = []
for i, img in enumerate(images, 1):
    key = Path(img).stem.replace("-", "_")
    sql_lines.append(f"""
INSERT OR REPLACE INTO cms_assets
(id, tenant_id, asset_key, asset_type, label, url, alt_text, source_provider, usage_context, metadata_json, updated_at)
VALUES
('asset_animal_{i:03d}', 'tenant_companionscpas', 'animal.gallery.{i:03d}', 'image',
 'Companions Animal Image {i}', '{img}', 'Companions of CPAS animal photo',
 'static', 'public_site_gallery', '{{"demo":true,"local_asset":true}}', datetime('now'));
""")

(root / "db" / "seed_cms_animal_assets.sql").write_text("\n".join(sql_lines))

print("\\nWrote db/seed_cms_animal_assets.sql")
print("Done.")
