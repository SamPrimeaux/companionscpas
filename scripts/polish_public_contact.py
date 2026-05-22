from pathlib import Path

public = Path("public")
targets = [public / p for p in ["index.html", "about.html", "adopt.html", "services.html", "donate.html"]]

css = r'''
<style id="cpas-public-polish-v2">
:root{
  --cpas-purple:#6D5593;
  --cpas-purple-light:#C7A7FF;
  --cpas-cyan:#16BFD6;
  --cpas-dark:#05080D;
  --cpas-navy:#101927;
}
body::before{
  content:"";
  position:fixed;
  inset:0;
  pointer-events:none;
  z-index:-1;
  background:
    radial-gradient(circle at 18% calc(10% + var(--scrollY,0px)), rgba(109,85,147,.34), transparent 32%),
    radial-gradient(circle at 88% calc(28% + var(--scrollY,0px)), rgba(22,191,214,.18), transparent 34%),
    linear-gradient(135deg,#05080D,#101927 52%,#04060A);
  transition:background .2s linear;
}
.header-wrap .nav a,
.nav a,
.mobile-nav a{
  position:relative;
}
.header-wrap .nav a.active,
.nav a.active,
.header-wrap .nav a[aria-current="page"],
.nav a[aria-current="page"]{
  color:var(--cpas-purple-light)!important;
  text-shadow:0 0 18px rgba(199,167,255,.68),0 0 36px rgba(109,85,147,.38);
}
.header-wrap .nav a.active::after,
.nav a.active::after,
.header-wrap .nav a[aria-current="page"]::after,
.nav a[aria-current="page"]::after{
  background:linear-gradient(90deg,transparent,var(--cpas-purple-light),transparent)!important;
  box-shadow:0 0 18px rgba(199,167,255,.75);
}
.hero,
.hero-split,
.home-section,
section{
  transition:background .8s ease, color .8s ease, border-color .8s ease;
}
.hero-split{
  background:
    linear-gradient(90deg,rgba(255,255,255,.94),rgba(255,255,255,.82) 44%,rgba(16,25,39,.30) 100%)!important;
}
.home-section,
.story-section,
.about-section{
  background:
    radial-gradient(circle at 78% 10%,rgba(22,191,214,.14),transparent 34%),
    linear-gradient(180deg,rgba(16,25,39,.20),rgba(5,8,13,.92))!important;
}
.cpas-contact-modal{
  position:fixed;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;padding:22px;
  background:rgba(0,0,0,.68);backdrop-filter:blur(18px);
}
.cpas-contact-modal.open{display:flex}
.cpas-contact-panel{
  width:min(760px,96vw);max-height:90vh;overflow:auto;border-radius:30px;
  background:rgba(13,20,33,.86);border:1px solid rgba(255,255,255,.13);
  box-shadow:0 40px 140px rgba(0,0,0,.56), inset 0 1px 0 rgba(255,255,255,.08);
  color:#F8F7FF;padding:28px;position:relative;
}
.cpas-contact-panel::after{
  content:"";position:absolute;left:0;right:0;bottom:0;height:140px;pointer-events:none;opacity:.5;
  background:radial-gradient(70% 70% at 20% 100%,rgba(109,85,147,.55),transparent 62%),
             radial-gradient(70% 70% at 80% 100%,rgba(22,191,214,.42),transparent 60%);
  filter:blur(16px);transform:translateY(45%);
}
.cpas-contact-head,.cpas-contact-form{position:relative;z-index:1}
.cpas-contact-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;margin-bottom:20px}
.cpas-contact-head h2{margin:0 0 8px;font-size:30px;color:white}
.cpas-contact-head p{margin:0;color:rgba(255,255,255,.66)}
.cpas-close{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:white;border-radius:14px;padding:10px 12px;cursor:pointer}
.cpas-contact-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.cpas-contact-grid .full{grid-column:1/-1}
.cpas-contact-form input,.cpas-contact-form select,.cpas-contact-form textarea{
  width:100%;border:1px solid rgba(255,255,255,.13);border-radius:16px;background:rgba(255,255,255,.07);
  color:white;padding:14px;font:inherit;outline:none;
}
.cpas-contact-form textarea{min-height:130px;resize:vertical}
.cpas-contact-form input:focus,.cpas-contact-form select:focus,.cpas-contact-form textarea:focus{
  border-color:rgba(199,167,255,.75);box-shadow:0 0 0 4px rgba(109,85,147,.24);
}
.cpas-submit{margin-top:14px;width:100%;border:0;border-radius:16px;padding:15px;background:linear-gradient(135deg,#6D5593,#8B74B7);color:white;font-weight:900;cursor:pointer}
.cpas-form-msg{margin-top:12px;color:#C7A7FF;font-weight:800}
@media(max-width:720px){.cpas-contact-grid{grid-template-columns:1fr}.hero-split{background:linear-gradient(180deg,rgba(255,255,255,.94),rgba(16,25,39,.25),rgba(5,8,13,.92))!important}}
@media(prefers-reduced-motion:reduce){body::before{transition:none}}
</style>
'''

js = r'''
<script id="cpas-public-contact-v2">
(function(){
  function setActiveNav(){
    const path = location.pathname === "/" ? "/" : location.pathname.replace(/\/$/,"");
    document.querySelectorAll("nav a,.nav a,.mobile-nav a").forEach(a=>{
      const href = a.getAttribute("href");
      if(!href) return;
      const normalized = href === "/" ? "/" : href.replace(/\/$/,"");
      if(normalized === path){ a.classList.add("active"); a.setAttribute("aria-current","page"); }
    });
  }
  function setParallax(){
    const y = Math.round(window.scrollY * 0.08);
    document.documentElement.style.setProperty("--scrollY", y + "px");
  }
  function modalHtml(){
    return `<div class="cpas-contact-modal" id="cpasContactModal" aria-hidden="true">
      <div class="cpas-contact-panel" role="dialog" aria-modal="true" aria-labelledby="cpasContactTitle">
        <div class="cpas-contact-head">
          <div>
            <h2 id="cpasContactTitle">Get Connected</h2>
            <p>Tell Companions of CPAS how we can help. This is wired for D1 logging and demo-safe email prep.</p>
          </div>
          <button class="cpas-close" type="button" data-cpas-close>Close</button>
        </div>
        <form class="cpas-contact-form" id="cpasContactForm">
          <div class="cpas-contact-grid">
            <input name="name" placeholder="Full name" required>
            <input name="email" type="email" placeholder="Email address" required>
            <input name="phone" placeholder="Phone">
            <select name="request_type">
              <option value="general">General Help</option>
              <option value="adoption">Adoption</option>
              <option value="foster">Foster / Volunteer</option>
              <option value="donation">Donation / Fundraising</option>
              <option value="medical_support">Medical Support</option>
            </select>
            <textarea class="full" name="message" placeholder="How can we help?" required></textarea>
          </div>
          <button class="cpas-submit" type="submit">Send Request</button>
          <div class="cpas-form-msg" id="cpasContactMsg"></div>
        </form>
      </div>
    </div>`;
  }
  function openModal(){
    document.getElementById("cpasContactModal").classList.add("open");
    document.getElementById("cpasContactModal").setAttribute("aria-hidden","false");
  }
  function closeModal(){
    document.getElementById("cpasContactModal").classList.remove("open");
    document.getElementById("cpasContactModal").setAttribute("aria-hidden","true");
  }
  document.addEventListener("DOMContentLoaded",()=>{
    setActiveNav(); setParallax();
    if(!document.getElementById("cpasContactModal")) document.body.insertAdjacentHTML("beforeend", modalHtml());
    window.addEventListener("scroll", setParallax, {passive:true});
    document.querySelectorAll('a[href="#contact"],button[data-contact],.hero-cta-primary,.btn-primary').forEach(el=>{
      if((el.textContent||"").toLowerCase().includes("get connected") || el.getAttribute("href")==="#contact"){
        el.addEventListener("click", e=>{e.preventDefault(); openModal();});
      }
    });
    document.addEventListener("click",e=>{
      if(e.target.matches("[data-cpas-close]") || e.target.id==="cpasContactModal") closeModal();
    });
    document.getElementById("cpasContactForm").addEventListener("submit",async e=>{
      e.preventDefault();
      const msg=document.getElementById("cpasContactMsg");
      msg.textContent="Sending...";
      const payload=Object.fromEntries(new FormData(e.currentTarget).entries());
      const res=await fetch("/api/contact/request",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      const data=await res.json().catch(()=>({}));
      msg.textContent=data.message || (res.ok ? "Request saved. We will follow up soon." : "Could not send request.");
      if(res.ok) e.currentTarget.reset();
    });
  });
})();
</script>
'''

for f in targets:
    if not f.exists(): continue
    s = f.read_text()
    if "cpas-public-polish-v2" not in s:
        s = s.replace("</head>", css + "\n</head>")
    if "cpas-public-contact-v2" not in s:
        s = s.replace("</body>", js + "\n</body>")
    f.write_text(s)

print("Patched public theme, active nav glow, parallax blend, contact modal.")
