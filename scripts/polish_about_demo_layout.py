from pathlib import Path
import re

p = Path("public/about.html")
s = p.read_text(errors="ignore")

patch = r"""
<style id="about-demo-polish-final">
/* invisible header on light hero */
body[data-theme="light"] .site-header {
  background: transparent !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
  border-bottom: 0 !important;
}

body[data-theme="light"] .site-header .desktop-links a {
  color: #121826 !important;
  opacity: .78 !important;
}

body[data-theme="light"] .site-header .desktop-links a.active {
  color: #121826 !important;
  opacity: 1 !important;
}

body[data-theme="light"] .site-header .desktop-links .donate-link {
  color: #121826 !important;
  background: rgba(255,255,255,.48) !important;
  border: 1px solid rgba(18,24,38,.14) !important;
  box-shadow: 0 18px 50px rgba(18,24,38,.08) !important;
}

.site-header.scrolled {
  background: rgba(5,10,18,.74) !important;
  backdrop-filter: blur(18px) !important;
  box-shadow: 0 18px 70px rgba(0,0,0,.22) !important;
}

/* remove carded hero feel */
.about-hero {
  padding-top: 120px !important;
}

.about-hero-grid {
  align-items: center !important;
}

.about-team {
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  border: 0 !important;
  overflow: visible !important;
}

.about-team img {
  width: 100% !important;
  height: auto !important;
  aspect-ratio: auto !important;
  object-fit: contain !important;
  border-radius: 28px !important;
  display: block !important;
}

.about-hero-copy {
  background: transparent !important;
  box-shadow: none !important;
  border: 0 !important;
  padding: clamp(22px, 4vw, 54px) !important;
}

.about-hero-copy h1,
.about-hero-copy p {
  color: #111827 !important;
}

/* fix “why companions exists” text visibility and transition */
.need-scene {
  padding-top: 72px !important;
  background:
    linear-gradient(180deg,#fbf7f1 0%,#fbf7f1 24%,#07111d 24%,#050a12 100%) !important;
}

.need-scene:before {
  display: none !important;
}

.need-copy {
  position: relative !important;
  z-index: 2 !important;
  padding: 34px 0 44px !important;
}

.need-copy .eyebrow,
.need-copy h2,
.need-copy > p {
  color: #111827 !important;
}

.need-copy h2 {
  max-width: 920px !important;
}

.path-list {
  margin-top: 42px !important;
}

.path-item {
  border-top-color: rgba(255,255,255,.16) !important;
}

.path-item h3,
.path-item p {
  color: #f7f1ff !important;
}

.need-photo {
  margin-top: 80px !important;
}

/* fundraising section */
.campaign-story {
  margin-top: -1px !important;
  padding-top: 90px !important;
}

.campaign-intro h2,
.campaign-intro p {
  color: #f7f1ff !important;
}

.campaign-card {
  border-radius: 30px !important;
}

.campaign-card img {
  height: 390px !important;
  object-fit: cover !important;
}

/* testimonials on dark bg need light heading */
.testimonials {
  background: #050a12 !important;
  color: #f7f1ff !important;
}

.testimonials h2 {
  color: #f7f1ff !important;
}

.testimonials .eyebrow {
  color: #ff4d5e !important;
}

/* stronger modal demo */
.demo-modal.open {
  display: flex !important;
}

.demo-panel {
  border: 1px solid rgba(23,32,51,.12) !important;
}

.demo-full,
.demo-grid button {
  cursor: pointer !important;
}

/* light footer + org data belongs there */
.connect-section {
  padding-bottom: 0 !important;
  background: #fbf7f1 !important;
}

.site-footer,
footer {
  background: #f8f1e9 !important;
  color: #172033 !important;
  border-top: 0 !important;
}

.site-footer .footer-grid,
footer .footer-grid {
  padding-top: 64px !important;
}

footer:before {
  display: none !important;
}

@media(max-width:900px){
  .about-hero { padding-top: 92px !important; }
  .need-scene {
    background: linear-gradient(180deg,#fbf7f1 0%,#fbf7f1 38%,#07111d 38%,#050a12 100%) !important;
  }
}
</style>
"""

# remove older polish patch if rerun
s = re.sub(r'<style id="about-demo-polish-final">[\s\S]*?</style>', '', s, flags=re.I)
s = s.replace("</head>", patch + "\n</head>", 1)

# ensure transport fundraiser image is used in Transport Costs card
s = re.sub(
    r'(<article class="campaign-card">\s*<img src=")[^"]+(" alt="Happy rescue dog after support">)',
    r'\1/assets/animals/transport-fundraiser.webp\2',
    s,
    flags=re.I
)
s = s.replace('alt="Happy rescue dog after support"', 'alt="Dog awaiting transport fundraiser support"')

# convert any support mission anchor to modal button if needed
s = s.replace('href="/donate" data-open-donation="true"', 'href="javascript:void(0)" data-open-demo-donate')
s = s.replace('href="/donate"', 'href="javascript:void(0)" data-open-demo-donate')

# add organization data block into footer if missing
if "footer-org-data" not in s:
    s = s.replace(
        '<div><h3>Nonprofit Info</h3><p>501(c)(3) Tax-Exempt<br/>EIN: 88-4156327<br/>Shreveport, LA 71106</p></div>',
        '''<div class="footer-org-data"><h3>Organization Data</h3>
<p><strong>Companions of CPAS</strong><br/>
Tax status: 501(c)(3)<br/>
EIN: 88-4156327<br/>
Parish served: Caddo<br/>
Operating budget: Under $100,000<br/>
Email: companionsCPAS@gmail.com</p></div>'''
    )

p.write_text(s)
print("polished /about demo: invisible header, natural hero image, fixed blends, modal CTAs, transport image, light footer org data")
