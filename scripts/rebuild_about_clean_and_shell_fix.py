from pathlib import Path
import re

about = Path("public/about.html")
s = about.read_text(errors="ignore")

# Remove old CTA/card remnants
s = re.sub(r'<div class="org-cta-grid">[\s\S]*?</div>\s*</div>\s*</section>', '</div></section>', s, flags=re.I)
s = re.sub(r'<div class="newsletter-box"[\s\S]*?</div>', '', s, flags=re.I)

cta = '''
<section class="about-cta-clean">
  <div class="container about-cta-clean-inner">
    <div>
      <div class="eyebrow">Give them a way out</div>
      <h2>Help fund medical care, transport, and second chances.</h2>
      <p>Your gift helps dogs at Caddo Parish Animal Services receive the treatment, visibility, and rescue pathways they need.</p>
    </div>
    <div class="about-cta-clean-actions">
      <button class="btn btn-primary" data-open-demo-donate>Donate Now</button>
      <a class="btn btn-secondary" href="/adopt">View Adoptable Dogs</a>
    </div>
  </div>
</section>
'''

# Insert CTA before </main>
if "about-cta-clean" not in s:
    s = s.replace("</main>", cta + "\n</main>", 1)

css = r'''
<style id="about-clean-final-v1">
.about-light{
  padding-bottom:0!important;
  margin-bottom:0!important;
}
.gallery-grid{
  margin-bottom:0!important;
}
.about-cta-clean{
  padding:76px 0 72px;
  background:linear-gradient(180deg,#fbf7f1,#f3eee7);
  color:#172033;
}
.about-cta-clean-inner{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:42px;
  flex-wrap:wrap;
}
.about-cta-clean h2{
  margin:0;
  max-width:760px;
  color:#172033;
  font-size:clamp(40px,5vw,68px);
  letter-spacing:-.06em;
  line-height:.96;
}
.about-cta-clean p{
  max-width:680px;
  color:#475467;
  font-weight:700;
  line-height:1.65;
}
.about-cta-clean-actions{
  display:flex;
  gap:14px;
  flex-wrap:wrap;
}
footer{
  margin-top:0!important;
}
.cpas-donate-modal{
  position:fixed;
  inset:0;
  z-index:100000;
  display:none;
  align-items:center;
  justify-content:center;
  padding:20px;
  background:rgba(0,0,0,.68);
  backdrop-filter:blur(16px);
}
.cpas-donate-modal.open{display:flex}
.cpas-donate-panel{
  width:min(620px,100%);
  max-height:92vh;
  overflow:auto;
  border-radius:30px;
  background:linear-gradient(180deg,#fff,#f7f1ea);
  color:#172033;
  box-shadow:0 44px 140px rgba(0,0,0,.45);
}
.cpas-donate-head{
  position:relative;
  padding:30px 30px 18px;
  text-align:center;
  border-bottom:1px solid rgba(23,32,51,.1);
}
.cpas-donate-head h3{
  margin:0;
  color:#172033;
  font-size:34px;
  letter-spacing:-.05em;
}
.cpas-donate-head p{color:#526174;font-weight:700}
.cpas-close{
  position:absolute;
  right:18px;
  top:18px;
  border:0;
  width:42px;
  height:42px;
  border-radius:50%;
  background:#172033;
  color:#fff;
  cursor:pointer;
}
.cpas-donate-body{padding:24px 30px 30px}
.cpas-toggle,.cpas-amounts{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:12px;
}
.cpas-amounts{grid-template-columns:repeat(4,1fr)}
.cpas-pill{
  border:1px solid rgba(23,32,51,.12);
  border-radius:14px;
  background:#fff;
  color:#172033;
  padding:14px 12px;
  font-weight:900;
  cursor:pointer;
}
.cpas-pill.active{background:#7c3aed;color:#fff;border-color:#7c3aed}
.cpas-label{
  display:block;
  margin:18px 0 8px;
  font-size:12px;
  letter-spacing:.08em;
  text-transform:uppercase;
  font-weight:900;
  color:#172033;
}
.cpas-field{
  width:100%;
  height:54px;
  box-sizing:border-box;
  border-radius:14px;
  border:1px solid rgba(23,32,51,.12);
  background:#fff;
  color:#172033;
  padding:0 16px;
  font-weight:750;
}
.cpas-submit{
  width:100%;
  height:58px;
  margin-top:22px;
  border:0;
  border-radius:16px;
  background:#7c3aed;
  color:#fff;
  font-weight:950;
  font-size:16px;
  cursor:pointer;
}
</style>
'''
s = re.sub(r'<style id="about-clean-final-v1">[\s\S]*?</style>', '', s, flags=re.I)
s = s.replace("</head>", css + "\n</head>", 1)

modal = r'''
<div class="cpas-donate-modal" id="cpasDonateModal" aria-hidden="true">
  <div class="cpas-donate-panel" role="dialog" aria-modal="true" aria-label="Donation form">
    <div class="cpas-donate-head">
      <button class="cpas-close" type="button" data-close-donate>×</button>
      <h3>Support Our Mission</h3>
      <p>Choose a one-time gift or monthly support for medical care, transport, and rescue pathways.</p>
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
      <div class="cpas-field" style="display:flex;align-items:center;justify-content:space-between;">
        <span>Card number</span><strong>Stripe Element mounts here</strong>
      </div>
      <label style="display:block;margin-top:14px;color:#475467;font-weight:800">
        <input type="checkbox" checked> Send me rescue updates and campaign progress
      </label>
      <button class="cpas-submit" type="button">Donate Now</button>
    </div>
  </div>
</div>
<script id="cpas-about-donate-modal-js">
(() => {
  const modal = document.getElementById("cpasDonateModal");
  if (!modal) return;
  const open = () => { modal.classList.add("open"); modal.setAttribute("aria-hidden","false"); };
  const close = () => { modal.classList.remove("open"); modal.setAttribute("aria-hidden","true"); };
  document.querySelectorAll("[data-open-demo-donate], .donate-link").forEach(el => {
    el.addEventListener("click", e => { e.preventDefault(); open(); });
  });
  modal.addEventListener("click", e => { if (e.target === modal) close(); });
  document.querySelectorAll("[data-close-donate]").forEach(el => el.addEventListener("click", close));
})();
</script>
'''
s = re.sub(r'<div class="cpas-donate-modal"[\s\S]*?<script id="cpas-about-donate-modal-js">[\s\S]*?</script>', '', s, flags=re.I)
s = s.replace("</body>", modal + "\n</body>", 1)
about.write_text(s)

# Remove header rules from hard modal CSS on pages where it conflicts
for file in ["public/adopt.html","public/services.html","public/donate.html"]:
    p = Path(file)
    html = p.read_text(errors="ignore")
    html = re.sub(r'<style id="cpas-hard-shell-modal-v1">[\s\S]*?</style>', lambda m: re.sub(
        r'\.site-header[\s\S]*?(?=\.cpas-donate-modal)', '', m.group(0), flags=re.I
    ), html, flags=re.I)
    p.write_text(html)
    print("cleaned modal/header conflict:", file)

print("rebuilt about clean CTA + modal")
