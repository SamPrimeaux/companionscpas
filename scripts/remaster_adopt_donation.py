from pathlib import Path

p = Path("public/adopt.html")
s = p.read_text()

css = r'''
<style id="cpas-adopt-remaster-v1">
:root{
  --cpas-dark:#05080D;
  --cpas-navy:#101927;
  --cpas-panel:rgba(18,25,36,.72);
  --cpas-border:rgba(255,255,255,.13);
  --cpas-purple:#6D5593;
  --cpas-purple-light:#C7A7FF;
  --cpas-cyan:#16BFD6;
}
body{
  background:
    radial-gradient(circle at 15% 8%,rgba(109,85,147,.30),transparent 32%),
    radial-gradient(circle at 85% 28%,rgba(22,191,214,.16),transparent 34%),
    linear-gradient(135deg,#05080D,#101927 52%,#04060A)!important;
  color:#F8F7FF!important;
}
.header-wrap,header,.nav{
  background:rgba(5,8,13,.82)!important;
  border-bottom:1px solid rgba(255,255,255,.12)!important;
  backdrop-filter:blur(24px) saturate(140%)!important;
}
.nav a.active,.nav a[aria-current="page"]{
  color:var(--cpas-purple-light)!important;
  text-shadow:0 0 22px rgba(199,167,255,.74);
}
.nav a.active::after,.nav a[aria-current="page"]::after{
  background:linear-gradient(90deg,transparent,var(--cpas-purple-light),transparent)!important;
  box-shadow:0 0 22px rgba(199,167,255,.85)!important;
}
.adopt-hero,
.hero,
.hero-section{
  position:relative!important;
  overflow:hidden!important;
  background:
    radial-gradient(circle at 22% 0%,rgba(109,85,147,.26),transparent 38%),
    radial-gradient(circle at 82% 20%,rgba(22,191,214,.15),transparent 36%),
    linear-gradient(180deg,rgba(16,25,39,.92),rgba(5,8,13,.82))!important;
  border:1px solid rgba(255,255,255,.10)!important;
  box-shadow:0 28px 100px rgba(0,0,0,.34)!important;
}
.adopt-hero::after,.hero::after,.hero-section::after{
  content:"";
  position:absolute;
  inset:auto -10% -18% -10%;
  height:260px;
  background:
    radial-gradient(70% 60% at 20% 100%,rgba(109,85,147,.46),transparent 62%),
    radial-gradient(70% 60% at 78% 100%,rgba(22,191,214,.34),transparent 60%);
  filter:blur(22px);
  pointer-events:none;
}
.adopt-hero h1,.hero h1,.hero-section h1{
  color:#fff!important;
  text-shadow:0 20px 80px rgba(0,0,0,.34);
}
.adopt-hero p,.hero p,.hero-section p{
  color:rgba(255,255,255,.72)!important;
}
.adopt-hero small,
.hero small,
.hero .tax-line,
.adopt-tax-line{
  color:rgba(255,255,255,.54)!important;
}
.btn,.btn-primary,button,.hero-cta-primary,.hero-cta-secondary{
  border-radius:16px!important;
}
.hero-cta-primary,
.btn-primary,
button[data-contact],
a[href="#contact"]{
  background:rgba(109,85,147,.82)!important;
  border:1px solid rgba(255,255,255,.16)!important;
  color:#fff!important;
  box-shadow:0 18px 46px rgba(109,85,147,.32)!important;
}
.hero-cta-secondary,
button[data-donate],
a[href="#donate"],
.support-btn{
  background:linear-gradient(135deg,rgba(109,85,147,.92),rgba(22,191,214,.58))!important;
  border:1px solid rgba(255,255,255,.16)!important;
  color:#fff!important;
  box-shadow:0 18px 46px rgba(22,191,214,.20)!important;
}
.animal-card,.pet-card,.adopt-card,.card{
  background:rgba(18,25,36,.72)!important;
  border:1px solid rgba(255,255,255,.12)!important;
  box-shadow:0 24px 80px rgba(0,0,0,.34), inset 0 1px 0 rgba(255,255,255,.07)!important;
  backdrop-filter:blur(18px)!important;
}
.animal-card img,.pet-card img,.adopt-card img{
  border-radius:20px!important;
}
body > main,
main,
.adopt-main{
  background:transparent!important;
}
.cpas-donate-modal{
  position:fixed;inset:0;z-index:9998;display:none;align-items:center;justify-content:center;padding:22px;
  background:rgba(0,0,0,.68);backdrop-filter:blur(18px);
}
.cpas-donate-modal.open{display:flex}
.cpas-donate-panel{
  width:min(780px,96vw);max-height:90vh;overflow:auto;border-radius:30px;
  background:rgba(13,20,33,.90);border:1px solid rgba(255,255,255,.13);
  box-shadow:0 40px 140px rgba(0,0,0,.56), inset 0 1px 0 rgba(255,255,255,.08);
  color:#F8F7FF;padding:28px;position:relative;
}
.cpas-donate-panel::after{
  content:"";position:absolute;left:0;right:0;bottom:0;height:140px;pointer-events:none;opacity:.52;
  background:radial-gradient(70% 70% at 20% 100%,rgba(109,85,147,.56),transparent 62%),
             radial-gradient(70% 70% at 80% 100%,rgba(22,191,214,.42),transparent 60%);
  filter:blur(16px);transform:translateY(45%);
}
.cpas-donate-head,.cpas-donate-form{position:relative;z-index:1}
.cpas-donate-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;margin-bottom:20px}
.cpas-donate-head h2{margin:0 0 8px;font-size:32px;color:white}
.cpas-donate-head p{margin:0;color:rgba(255,255,255,.66)}
.cpas-donate-close{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:white;border-radius:14px;padding:10px 12px;cursor:pointer}
.cpas-donate-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.cpas-donate-grid .full{grid-column:1/-1}
.cpas-donate-form input,.cpas-donate-form select,.cpas-donate-form textarea{
  width:100%;border:1px solid rgba(255,255,255,.13);border-radius:16px;background:rgba(255,255,255,.07);
  color:white;padding:14px;font:inherit;outline:none;
}
.cpas-amounts{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px}
.cpas-amounts button{padding:13px;background:rgba(255,255,255,.06)!important;color:#fff!important;border:1px solid rgba(255,255,255,.12)!important}
.cpas-amounts button.active{background:rgba(109,85,147,.72)!important;box-shadow:0 0 24px rgba(199,167,255,.25)!important}
.cpas-donate-submit{margin-top:14px;width:100%;border:0;border-radius:16px;padding:15px;background:linear-gradient(135deg,#6D5593,#16BFD6);color:white;font-weight:900;cursor:pointer}
.cpas-donate-msg{margin-top:12px;color:#C7A7FF;font-weight:800}
@media(max-width:720px){.cpas-donate-grid,.cpas-amounts{grid-template-columns:1fr}.cpas-donate-panel{padding:22px}}
</style>
'''

js = r'''
<script id="cpas-adopt-donation-v1">
(function(){
  function markAdoptActive(){
    document.querySelectorAll('a[href="/adopt"], a[href="/adopt.html"]').forEach(a=>{
      a.classList.add("active"); a.setAttribute("aria-current","page");
    });
  }
  function ensureButtons(){
    document.querySelectorAll("a,button").forEach(el=>{
      const txt=(el.textContent||"").trim().toLowerCase();
      if(txt.includes("have questions")){
        el.setAttribute("data-contact","true");
        el.addEventListener("click",e=>{
          e.preventDefault();
          const modal=document.getElementById("cpasContactModal");
          if(modal) modal.classList.add("open");
        });
      }
      if(txt.includes("support our work")){
        el.setAttribute("data-donate","true");
        el.addEventListener("click",e=>{e.preventDefault();openDonateModal();});
      }
    });
  }
  function modalHtml(){
    return `<div class="cpas-donate-modal" id="cpasDonateModal" aria-hidden="true">
      <div class="cpas-donate-panel" role="dialog" aria-modal="true" aria-labelledby="cpasDonateTitle">
        <div class="cpas-donate-head">
          <div>
            <h2 id="cpasDonateTitle">Support Our Work</h2>
            <p>Demo-safe donation flow prepared for Stripe Checkout, donor records, campaign tracking, and Resend receipts.</p>
          </div>
          <button class="cpas-donate-close" type="button" data-donate-close>Close</button>
        </div>
        <form class="cpas-donate-form" id="cpasDonateForm">
          <div class="cpas-amounts">
            <button type="button" data-amount="2500">$25</button>
            <button type="button" data-amount="5000">$50</button>
            <button type="button" data-amount="10000" class="active">$100</button>
            <button type="button" data-amount="25000">$250</button>
          </div>
          <div class="cpas-donate-grid">
            <input name="donor_name" placeholder="Full name" required>
            <input name="donor_email" type="email" placeholder="Email address" required>
            <select name="frequency">
              <option value="one_time">One-time donation</option>
              <option value="monthly">Monthly recurring donation</option>
            </select>
            <input name="custom_amount" type="number" min="1" step="1" placeholder="Custom amount in dollars">
            <select class="full" name="campaign_id">
              <option value="camp_medical">Emergency Medical Fund</option>
              <option value="camp_food">Feed the Shelter</option>
              <option value="camp_transport">Transport Support</option>
              <option value="general">General Support</option>
            </select>
            <textarea class="full" name="note" placeholder="Optional note or dedication"></textarea>
          </div>
          <input type="hidden" name="amount_cents" id="cpasDonateAmount" value="10000">
          <button class="cpas-donate-submit" type="submit">Continue to Donation</button>
          <div class="cpas-donate-msg" id="cpasDonateMsg"></div>
        </form>
      </div>
    </div>`;
  }
  function openDonateModal(){
    document.getElementById("cpasDonateModal").classList.add("open");
    document.getElementById("cpasDonateModal").setAttribute("aria-hidden","false");
  }
  function closeDonateModal(){
    document.getElementById("cpasDonateModal").classList.remove("open");
    document.getElementById("cpasDonateModal").setAttribute("aria-hidden","true");
  }
  document.addEventListener("DOMContentLoaded",()=>{
    markAdoptActive();
    if(!document.getElementById("cpasDonateModal")) document.body.insertAdjacentHTML("beforeend",modalHtml());
    ensureButtons();
    document.addEventListener("click",e=>{
      if(e.target.matches("[data-donate-close]") || e.target.id==="cpasDonateModal") closeDonateModal();
      if(e.target.matches("[data-amount]")){
        document.querySelectorAll("[data-amount]").forEach(b=>b.classList.remove("active"));
        e.target.classList.add("active");
        document.getElementById("cpasDonateAmount").value=e.target.dataset.amount;
      }
    });
    document.getElementById("cpasDonateForm").addEventListener("submit",async e=>{
      e.preventDefault();
      const msg=document.getElementById("cpasDonateMsg");
      msg.textContent="Preparing donation...";
      const payload=Object.fromEntries(new FormData(e.currentTarget).entries());
      if(payload.custom_amount){
        payload.amount_cents=Math.round(Number(payload.custom_amount)*100);
      }
      const res=await fetch("/api/donations/create-intent",{
        method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)
      });
      const data=await res.json().catch(()=>({}));
      msg.textContent=data.message || data.error || "Donation intent created.";
      if(data.checkout_url && data.mode !== "demo") location.href=data.checkout_url;
    });
  });
})();
</script>
'''

if "cpas-adopt-remaster-v1" not in s:
    s = s.replace("</head>", css + "\n</head>")
if "cpas-adopt-donation-v1" not in s:
    s = s.replace("</body>", js + "\n</body>")

# Fix wrong EIN/tax line if present
s = s.replace("EIN #93-2791656", "EIN: 88-4156327")
s = s.replace("501(c)(3) Tax-Exempt EIN #93-2791656", "501(c)(3) Tax-Exempt · EIN: 88-4156327")

p.write_text(s)
print("Remastered adopt page UI and donation modal.")
