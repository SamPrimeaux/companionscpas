from pathlib import Path
import re

ABOUT = Path("public/about.html")
HOME = Path("public/index.html")

home = HOME.read_text(errors="ignore")
old = ABOUT.read_text(errors="ignore")

header = re.search(r"<header\b[\s\S]*?</header>", home, re.I).group(0)
footer = re.search(r"<footer\b[\s\S]*?</footer>", home, re.I).group(0)
home_style = re.search(r"<style>[\s\S]*?</style>", home, re.I).group(0)

header = re.sub(r'\s*class="active"', "", header)
header = header.replace('<a href="/about">About</a>', '<a class="active" href="/about">About</a>')

about_css = r"""
<style id="about-schema-remaster-v2">
main.about-page{padding-top:var(--nav-h);background:linear-gradient(180deg,#f7f1ea 0%,#fbf7f1 33%,#07111d 33%,#050a12 76%,#f7f1ea 76%,#fbf7f1 100%)}
.about-hero{padding:54px 0 86px}
.about-hero-grid{display:grid;grid-template-columns:1.02fr .98fr;gap:34px;align-items:stretch}
.about-photo,.about-copy,.about-card,.quote-card,.org-box,.cta-box{border-radius:var(--radius-xl);border:1px solid rgba(23,32,51,.12);box-shadow:var(--shadow-soft)}
.about-photo{overflow:hidden;background:#fff}.about-photo img{width:100%;height:100%;min-height:570px;object-fit:cover;display:block}
.about-copy{padding:clamp(30px,5vw,62px);background:linear-gradient(135deg,rgba(255,255,255,.94),rgba(255,255,255,.62));display:flex;flex-direction:column;justify-content:center}
.about-copy h1{color:#172033;font-size:clamp(48px,6vw,86px)}.about-copy p{color:rgba(23,32,51,.78);font-weight:650}
.about-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:28px}.about-stat{border-radius:20px;background:#fff;padding:18px;border:1px solid rgba(23,32,51,.1)}.about-stat b{display:block;font-size:30px;color:#172033}.about-stat span{color:var(--muted);font-weight:800;font-size:13px}
.about-dark{color:#f6f2ec;padding:88px 0}.about-dark p{color:#c8d1df}.about-narrative{max-width:980px}.about-narrative h2{max-width:900px}
.impact-paths,.campaign-mini-grid,.testimonial-grid,.org-cta-grid{display:grid;gap:22px}.impact-paths{grid-template-columns:repeat(2,1fr);margin-top:34px}.impact-card{border-radius:var(--radius-xl);padding:32px;background:linear-gradient(135deg,rgba(255,255,255,.1),rgba(255,255,255,.04));border:1px solid rgba(255,255,255,.14);box-shadow:var(--shadow-dark)}.impact-card h3{color:#fff}
.story-strip{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:34px}.story-tile{position:relative;min-height:320px;border-radius:28px;overflow:hidden;background:#08111d;border:1px solid rgba(255,255,255,.12)}.story-tile img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.story-tile:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.78))}.story-tile div{position:absolute;z-index:1;left:20px;right:20px;bottom:20px}.story-tile strong{display:block;color:#fff;font-size:20px}.story-tile span{color:rgba(255,255,255,.72)}
.campaign-panel{margin-top:42px;border-radius:var(--radius-xl);padding:34px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.13)}.progress-line{height:12px;border-radius:999px;background:rgba(255,255,255,.14);overflow:hidden;margin:18px 0 10px}.progress-line span{display:block;height:100%;width:5%;background:linear-gradient(90deg,var(--rose),var(--gold))}
.campaign-mini-grid{grid-template-columns:repeat(2,1fr);margin-top:24px}.campaign-mini{border-radius:24px;overflow:hidden;background:#08111d;border:1px solid rgba(255,255,255,.12)}.campaign-mini img{width:100%;height:260px;object-fit:cover;display:block}.campaign-mini div{padding:24px}
.about-light{padding:88px 0;color:#172033}.testimonial-grid{grid-template-columns:repeat(2,1fr);margin-top:34px}.quote-card{background:rgba(255,255,255,.88);padding:28px}.quote-card p{font-size:16px;color:rgba(23,32,51,.76)}.quote-card strong{display:block;margin-top:16px;color:#172033}
.gallery-grid{display:grid;grid-template-columns:1.1fr .9fr .9fr;gap:18px;margin:48px 0}.gallery-grid img{width:100%;height:300px;object-fit:cover;border-radius:28px;box-shadow:var(--shadow-soft)}.gallery-grid img:first-child{height:420px;grid-row:span 2}
.org-cta-grid{grid-template-columns:.9fr 1.1fr;margin-top:56px}.org-box,.cta-box{background:#fff;padding:30px}.org-row{display:flex;justify-content:space-between;gap:18px;padding:12px 0;border-bottom:1px solid rgba(23,32,51,.1);font-weight:800}.org-row span:first-child{color:var(--muted)}
.cta-actions{display:flex;flex-wrap:wrap;gap:14px;margin-top:24px}.schema-note{margin-top:18px;font-size:13px;color:var(--muted);font-weight:800}
.newsletter-box{margin-top:22px;padding:22px;border-radius:24px;background:#f6f1fb;border:1px solid rgba(134,100,183,.18)}.newsletter-box input{min-height:54px;border-radius:16px;border:1px solid rgba(23,32,51,.14);padding:0 16px;background:#fff;color:#172033}
footer{background:#f7f1ea;color:#172033;border-top:1px solid rgba(23,32,51,.1)}footer p,footer a,footer span{color:rgba(23,32,51,.72)!important}footer h3{color:#172033}
@media(max-width:860px){.about-hero-grid,.impact-paths,.testimonial-grid,.org-cta-grid,.campaign-mini-grid,.story-strip,.gallery-grid{grid-template-columns:1fr}.about-photo img{min-height:360px}.about-stats{grid-template-columns:1fr}.gallery-grid img,.gallery-grid img:first-child{height:280px}}
</style>
"""

body = f"""
<body>
{header}

<main class="about-page" id="top">
  <section class="about-hero">
    <div class="container about-hero-grid">
      <div class="about-photo"><img src="/assets/animals/theteam.webp" alt="Companions of CPAS volunteer team"></div>
      <div class="about-copy">
        <div class="eyebrow">Caddo Parish • 100% Volunteer-Based</div>
        <h1>Giving Caddo dogs the second chance they might not get otherwise.</h1>
        <p>Companions of CPAS helps dogs at Caddo Parish Animal Services leave uncertainty behind through medical care, transport pathways, rescue partnerships, and community support.</p>
        <div class="about-stats">
          <div class="about-stat"><b>$465</b><span>raised by 7 donors</span></div>
          <div class="about-stat"><b>5%</b><span>toward $10,000 goal</span></div>
          <div class="about-stat"><b>100%</b><span>volunteer-based</span></div>
        </div>
        <div class="hero-actions">
          <a class="btn btn-primary" href="/donate" data-open-donation="true">Support the Mission</a>
          <a class="btn btn-secondary" href="/adopt">Meet Adoptable Dogs</a>
        </div>
      </div>
    </div>
  </section>

  <section class="about-dark">
    <div class="container">
      <div class="about-narrative">
        <div class="eyebrow">Why Companions Exists</div>
        <h2>When space is limited, support becomes the difference between fear and a future.</h2>
        <p>Caddo Parish Animal Services is an open-intake shelter, where dogs can be at risk simply because there is not enough space. Companions of CPAS is not here to compete with rescues or claim animals as our own. We step in where support matters most.</p>
      </div>

      <div class="story-strip">
        <article class="story-tile"><img src="/assets/animals/bigsmiles.webp" alt="Happy rescue dog smiling"><div><strong>Joy worth fighting for</strong><span>Every adoption story starts with a chance.</span></div></article>
        <article class="story-tile"><img src="/assets/animals/brindle.jpg" alt="Brindle rescue dog"><div><strong>Visibility saves lives</strong><span>Support helps overlooked dogs be seen.</span></div></article>
        <article class="story-tile"><img src="/assets/animals/happyboy.webp" alt="Happy rescue dog"><div><strong>More time, more hope</strong><span>Medical and transport support create options.</span></div></article>
      </div>

      <div class="impact-paths">
        <article class="impact-card"><div class="eyebrow">Path One</div><h3>Funding critical medical care</h3><p>We help fund surgery, diagnostics, urgent treatment, and heartworm care for dogs whose medical needs would otherwise keep them stuck.</p></article>
        <article class="impact-card"><div class="eyebrow">Path Two</div><h3>Transporting dogs to no-kill rescue partners</h3><p>When local options are limited, transport connects Caddo dogs with rescue partners and communities where adoption demand is higher.</p></article>
      </div>

      <div class="campaign-panel" data-cms-section="about_campaign_progress">
        <div class="eyebrow">Featured Campaigns</div>
        <h2>$10,000 lifesaving goal</h2>
        <p>$465 raised by 7 donors. Every gift fuels medical support, transport, and second chances.</p>
        <div class="progress-line"><span></span></div><strong>5% complete</strong>
        <div class="campaign-mini-grid">
          <article class="campaign-mini"><img src="/assets/animals/skinnyman.webp" alt="Dog needing medical support"><div><h3>Medical Support</h3><p>Heartworm treatment, surgery, diagnostics, and urgent care.</p><strong>$0 raised</strong></div></article>
          <article class="campaign-mini"><img src="/assets/animals/redeye.webp" alt="Rescue dog needing care"><div><h3>Transport Costs</h3><p>Fuel, travel, and rescue-partner coordination for dogs leaving Caddo.</p><strong>$0 raised</strong></div></article>
        </div>
      </div>
    </div>
  </section>

  <section class="about-light">
    <div class="container">
      <div class="eyebrow">Testimonials</div>
      <h2>Second chances become real stories.</h2>
      <div class="testimonial-grid">
        <article class="quote-card"><p>“Daisy came to me just hours from euthanasia. Companions covered her surgery and lifesaving treatment, giving her the second chance she never would have had.”</p><strong>— Brittany Ramsey</strong></article>
        <article class="quote-card"><p>“Because of their dedicated team, deserving dogs are given a second chance and continue their journey to safe, loving homes.”</p><strong>— MADE New Dog Rescue</strong></article>
        <article class="quote-card"><p>“Onyx changed me. Because of him, I became a volunteer with Companions of CPAS.”</p><strong>— Michelle Miller, President</strong></article>
        <article class="quote-card"><p>“Companions became a critical partner in expanding rescue partnerships that provide lifesaving opportunities.”</p><strong>— Suzanne Zortman</strong></article>
      </div>

      <div class="gallery-grid" data-cms-section="about_gallery">
        <img src="/assets/animals/theteam.webp" alt="Companions team">
        <img src="/assets/animals/bigsmiles.webp" alt="Smiling rescue dog">
        <img src="/assets/animals/brindle.jpg" alt="Brindle rescue dog">
        <img src="/assets/animals/happyboy.webp" alt="Happy rescue dog">
        <img src="/assets/animals/redeye.webp" alt="Rescue dog closeup">
      </div>

      <div class="org-cta-grid">
        <div class="org-box">
          <div class="eyebrow">Organization Data</div><h3>Companions of CPAS</h3>
          <div class="org-row"><span>Tax status</span><strong>501(c)(3)</strong></div>
          <div class="org-row"><span>EIN</span><strong>88-4156327</strong></div>
          <div class="org-row"><span>Parish served</span><strong>Caddo</strong></div>
          <div class="org-row"><span>Operating budget</span><strong>Under $100,000</strong></div>
          <div class="org-row"><span>Email</span><strong>companionsCPAS@gmail.com</strong></div>
        </div>

        <div class="cta-box" data-cms-section="about_modular_ctas">
          <div class="eyebrow">Donation + Contact Ready</div>
          <h3>Built for one-time gifts, monthly support, contact requests, and newsletter growth.</h3>
          <p>This demo is structured so Stripe, Resend, donor records, campaign tracking, and newsletter subscriptions can be fully wired after project approval.</p>
          <div class="cta-actions">
            <a class="btn btn-primary" href="/donate" data-open-donation="true">One-Time Donation</a>
            <a class="btn btn-secondary" href="/donate?recurring=true" data-open-donation="monthly">Monthly Giving</a>
            <a class="btn btn-secondary" href="mailto:companionsCPAS@gmail.com" data-open-contact="true">Contact CPAS</a>
          </div>
          <div class="newsletter-box" data-cms-section="newsletter_signup">
            <strong>Newsletter subscription ready</strong>
            <p>Mailchimp replacement path: store subscriber intent now, migrate to owned Resend/email workflow later.</p>
            <input type="email" placeholder="Email address for rescue updates">
          </div>
          <div class="schema-note">Hooks: donation_intents, donation_campaigns, contact_requests, newsletter_subscribers, cms_assets.</div>
        </div>
      </div>
    </div>
  </section>
</main>

{footer}
</body>
"""

head = re.search(r"[\s\S]*?</head>", old, re.I).group(0)
head = re.sub(r"<style[\s\S]*?</style>", "", head, flags=re.I)
head = head.replace("</head>", home_style + "\n" + about_css + "\n</head>", 1)

ABOUT.write_text(head + "\n" + body + "\n</html>\n")
print("rebuilt /about v2 with real assets + modular CTA hooks")
