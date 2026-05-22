from pathlib import Path
import re

PAGES = [
  ("public/adopt.html", "/adopt", "dark"),
  ("public/services.html", "/services", "dark"),
  ("public/donate.html", "/donate", "dark"),
]

src = Path("public/about.html").read_text(errors="ignore")
header = re.search(r"<header\b[\s\S]*?</header>", src, re.I).group(0)
footer = re.search(r"<footer\b[\s\S]*?</footer>", src, re.I).group(0)

HARD_CSS = r"""
<style id="cpas-hard-shell-modal-v1">
html,body{margin:0!important;padding:0!important}
body{overflow-x:hidden!important}

.site-header{
  position:fixed!important;
  inset:0 0 auto 0!important;
  width:100vw!important;
  max-width:none!important;
  height:104px!important;
  margin:0!important;
  padding:0!important;
  z-index:99999!important;
  background:transparent!important;
  border:0!important;
  box-shadow:none!important;
  backdrop-filter:none!important;
}

.site-header.scrolled{
  background:rgba(5,10,18,.78)!important;
  backdrop-filter:blur(18px)!important;
  box-shadow:0 18px 70px rgba(0,0,0,.28)!important;
}

.site-header .container.nav{
  width:min(1200px,calc(100vw - 48px))!important;
  max-width:1200px!important;
  height:104px!important;
  margin:0 auto!important;
  padding:0!important;
  display:flex!important;
  align-items:center!important;
  justify-content:space-between!important;
  gap:28px!important;
}

.site-header .brand{
  display:flex!important;
  align-items:center!important;
  width:auto!important;
  height:auto!important;
  margin:0!important;
  padding:0!important;
  text-decoration:none!important;
}

.logo-wrap{
  position:relative!important;
  display:inline-grid!important;
  place-items:center!important;
  width:76px!important;
  height:76px!important;
}

.logo{
  grid-area:1 / 1!important;
  width:76px!important;
  height:76px!important;
  object-fit:contain!important;
  transition:opacity .22s ease!important;
}

.logo-dark{opacity:0!important}
.logo-light{opacity:1!important}
body[data-theme="light"] .logo-dark{opacity:1!important}
body[data-theme="light"] .logo-light{opacity:0!important}
.site-header.scrolled .logo-dark{opacity:0!important}
.site-header.scrolled .logo-light{opacity:1!important}

.site-header .desktop-links{
  display:flex!important;
  align-items:center!important;
  justify-content:flex-end!important;
  gap:34px!important;
  margin:0!important;
  padding:0!important;
  background:transparent!important;
  width:auto!important;
  max-width:none!important;
  position:static!important;
}

.site-header .desktop-links a{
  display:inline-flex!important;
  align-items:center!important;
  justify-content:center!important;
  color:#f7f1ff!important;
  font-weight:800!important;
  font-size:15px!important;
  text-decoration:none!important;
  opacity:.72!important;
  background:transparent!important;
  border:0!important;
  padding:0!important;
  margin:0!important;
  box-shadow:none!important;
}

.site-header .desktop-links a.active{
  opacity:1!important;
  color:#fff!important;
  text-shadow:0 0 22px rgba(134,100,183,.85)!important;
}

.site-header .desktop-links .donate-link{
  opacity:1!important;
  color:#fff!important;
  background:rgba(134,100,183,.28)!important;
  border:1px solid rgba(134,100,183,.42)!important;
  border-radius:18px!important;
  padding:13px 21px!important;
  box-shadow:0 16px 42px rgba(134,100,183,.18)!important;
}

.site-header .hamburger{display:none!important}

main,.hero,.hero-parallax-wrap{
  padding-top:120px!important;
}

.cpas-donate-modal{
  position:fixed!important;
  inset:0!important;
  z-index:100000!important;
  display:none;
  align-items:center;
  justify-content:center;
  padding:20px;
  background:rgba(0,0,0,.68);
  backdrop-filter:blur(14px);
}

.cpas-donate-modal.open{display:flex}

.cpas-donate-panel{
  width:min(560px,100%);
  max-height:min(760px,92vh);
  overflow:auto;
  background:linear-gradient(180deg,#fff,#f8f6fb);
  color:#172033;
  border-radius:28px;
  box-shadow:0 40px 140px rgba(0,0,0,.45);
  border:1px solid rgba(23,32,51,.12);
}

.cpas-donate-head{
  position:sticky;
  top:0;
  background:linear-gradient(180deg,#fff,#fbf9ff);
  z-index:2;
  padding:28px 28px 18px;
  text-align:center;
  border-bottom:1px solid rgba(23,32,51,.08);
}

.cpas-donate-head h3{margin:0;color:#172033;font-size:28px;letter-spacing:-.04em}
.cpas-donate-head p{margin:10px 0 0;color:#526174;font-weight:700}
.cpas-close{
  position:absolute;right:20px;top:18px;
  width:42px;height:42px;border:0;border-radius:50%;
  background:#fff;color:#172033;font-size:22px;font-weight:900;
  box-shadow:0 12px 30px rgba(23,32,51,.14);cursor:pointer;
}

.cpas-donate-body{padding:22px 28px 28px}
.cpas-toggle,.cpas-amounts{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.cpas-amounts{grid-template-columns:repeat(4,1fr);margin:18px 0}
.cpas-pill{
  border:1px solid rgba(23,32,51,.12);background:#fff;color:#172033;
  border-radius:12px;padding:15px 12px;font-weight:900;cursor:pointer;
}
.cpas-pill.active{background:#7c3aed;color:#fff;border-color:#7c3aed}
.cpas-label{display:block;margin:18px 0 8px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;font-weight:900;color:#172033}
.cpas-field{width:100%;height:52px;border-radius:12px;border:1px solid rgba(23,32,51,.12);background:#fff;color:#172033;padding:0 16px;font-weight:700;box-sizing:border-box}
.cpas-card-field{display:flex;align-items:center;justify-content:space-between;gap:12px}
.cpas-submit{width:100%;height:58px;margin-top:22px;border:0;border-radius:14px;background:#7c3aed;color:#fff;font-weight:950;font-size:16px;cursor:pointer;box-shadow:0 18px 44px rgba(124,58,237,.24)}
@media(max-width:760px){
  .site-header .desktop-links{display:none!important}
  .site-header .hamburger{display:block!important}
  .cpas-amounts{grid-template-columns:1fr 1fr}
}
</style>
"""

MODAL = r"""
<div class="cpas-donate-modal" id="cpasDonateModal" aria-hidden="true">
  <div class="cpas-donate-panel" role="dialog" aria-modal="true" aria-label="Donation form">
    <div class="cpas-donate-head">
      <button class="cpas-close" type="button" data-close-donate>×</button>
      <h3>Support Our Mission</h3>
      <p>Your donation helps Caddo Parish dogs receive care, transport, and second chances.</p>
    </div>
    <div class="cpas-donate-body">
      <div class="cpas-toggle">
        <button class="cpas-pill active" type="button">One-Time<br><small>Single donation</small></button>
        <button class="cpas-pill" type="button">Monthly<br><small>Recurring support</small></button>
      </div>

      <label class="cpas-label">Select amount</label>
      <div class="cpas-amounts">
        <button class="cpas-pill" type="button">$25</button>
        <button class="cpas-pill active" type="button">$50</button>
        <button class="cpas-pill" type="button">$100</button>
        <button class="cpas-pill" type="button">$250</button>
      </div>

      <label class="cpas-label">Your name *</label>
      <input class="cpas-field" placeholder="Jane Doe">

      <label class="cpas-label">Email address *</label>
      <input class="cpas-field" placeholder="jane@example.com">

      <label class="cpas-label">Campaign</label>
      <select class="cpas-field">
        <option>Emergency Medical Fund</option>
        <option>Transport Costs</option>
        <option>General Support</option>
      </select>

      <label class="cpas-label">Card information *</label>
      <div class="cpas-field cpas-card-field">
        <span>Card number</span>
        <strong>Stripe Element mounts here</strong>
      </div>

      <button class="cpas-submit" type="button">Donate Now</button>
    </div>
  </div>
</div>
<script id="cpas-donate-modal-js">
(() => {
  const modal = document.getElementById("cpasDonateModal");
  if (!modal) return;
  const open = () => { modal.classList.add("open"); modal.setAttribute("aria-hidden","false"); };
  const close = () => { modal.classList.remove("open"); modal.setAttribute("aria-hidden","true"); };
  document.querySelectorAll("[data-open-demo-donate], .donate-link, [href='/donate']").forEach(el => {
    el.addEventListener("click", e => { e.preventDefault(); open(); });
  });
  modal.addEventListener("click", e => { if (e.target === modal) close(); });
  document.querySelectorAll("[data-close-donate]").forEach(el => el.addEventListener("click", close));
  document.querySelectorAll(".cpas-pill").forEach(btn => {
    btn.addEventListener("click", () => {
      const group = btn.parentElement;
      if (group) group.querySelectorAll(".cpas-pill").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
})();
</script>
"""

def active(h, route):
    h = re.sub(r'\sclass="active"', "", h)
    h = re.sub(r'<a href="/donate"[^>]*>Donate</a>', '<a href="javascript:void(0)" data-open-demo-donate class="donate-link">Donate</a>', h)
    label = {"public/adopt.html":"Adopt","public/services.html":"Services","public/donate.html":"Donate"}.get(route, "")
    return h

for file, route, theme in PAGES:
    p = Path(file)
    s = p.read_text(errors="ignore")

    s = re.sub(r'<style id="cpas-hard-shell-modal-v1">[\s\S]*?</style>', "", s, flags=re.I)
    s = re.sub(r'<div class="cpas-donate-modal"[\s\S]*?<script id="cpas-donate-modal-js">[\s\S]*?</script>', "", s, flags=re.I)

    s = re.sub(r'<header\b[\s\S]*?</header>', "", s, count=1, flags=re.I)
    s = re.sub(r'(<body[^>]*>)', r'\1\n' + header, s, count=1, flags=re.I)

    # fix active route
    s = re.sub(r'<nav class="desktop-links"[\s\S]*?</nav>', lambda m: re.sub(r'class="active"\s*', "", m.group(0)), s, count=1, flags=re.I)
    s = s.replace(f'<a href="{route}">', f'<a class="active" href="{route}">')
    s = re.sub(r'<a href="/donate" class="donate-link">Donate</a>', '<a href="javascript:void(0)" data-open-demo-donate class="donate-link">Donate</a>', s)
    s = re.sub(r'<a class="active" href="/donate"[^>]*>Donate</a>', '<a class="active donate-link" href="javascript:void(0)" data-open-demo-donate>Donate</a>', s)

    s = re.sub(r'<body[^>]*>', f'<body data-theme="{theme}" data-default-theme="{theme}">', s, count=1, flags=re.I)
    s = s.replace("</head>", HARD_CSS + "\n</head>", 1)
    s = s.replace("</body>", MODAL + "\n</body>", 1)

    p.write_text(s)
    print("hard fixed shell/modal:", file)

print("done")
