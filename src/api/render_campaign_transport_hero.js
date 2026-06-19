import { escapeHtml, safeJson } from "./render_section.js";

const TENANT_ID = "tenant_companionscpas";
const CDN = "https://assets.companionsofcaddo.org";

function text(value) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function pickText(source, keys) {
  for (const key of keys) {
    const value = source?.[key];
    if (value === null || value === undefined) continue;
    const normalized = String(value).trim();
    if (normalized) return normalized;
  }
  return "";
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function safePhotoUrl(value) {
  const raw = text(value).trim();
  if (!raw) return "";
  if (raw.startsWith("/media/") || raw.startsWith("/static/")) {
    return escapeAttr(CDN + raw);
  }
  try {
    const parsed = new URL(raw);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return escapeAttr(parsed.toString());
    }
  } catch {
    return "";
  }
  return "";
}

async function loadCampaignAnimals(env, campaignId, limit = 3) {
  if (!env?.DB || !campaignId) return [];
  const rows = await env.DB.prepare(
    `SELECT ap.id, ap.name, ap.campaign_sort_order, ap.campaign_status_note,
            COALESCE(ca.cdn_url, ca.public_url, ap.photo_url) AS photo_url
     FROM animal_profiles ap
     LEFT JOIN cms_assets ca ON ca.asset_key = ap.id AND ca.tenant_id = ?
     WHERE ap.tenant_id = ? AND ap.campaign_id = ?
     ORDER BY ap.campaign_sort_order ASC, ap.name ASC
     LIMIT ?`
  ).bind(TENANT_ID, TENANT_ID, campaignId, limit).all().catch(() => ({ results: [] }));

  const animals = (rows?.results || []).filter((a) => safePhotoUrl(a.photo_url));
  if (animals.length >= limit) return animals;

  const usedIds = new Set(animals.map((a) => a.id));
  const fallback = await env.DB.prepare(
    `SELECT ap.id, ap.name,
            COALESCE(ca.cdn_url, ca.public_url, ap.photo_url) AS photo_url
     FROM animal_profiles ap
     LEFT JOIN cms_assets ca ON ca.asset_key = ap.id AND ca.tenant_id = ?
     WHERE ap.tenant_id = ? AND ap.public_visible = 1
       AND (ap.photo_url IS NOT NULL OR ca.cdn_url IS NOT NULL OR ca.public_url IS NOT NULL)
     ORDER BY ap.featured DESC, ap.updated_at DESC
     LIMIT 12`
  ).bind(TENANT_ID, TENANT_ID).all().catch(() => ({ results: [] }));

  for (const row of fallback?.results || []) {
    if (animals.length >= limit) break;
    if (usedIds.has(row.id)) continue;
    const photo = safePhotoUrl(row.photo_url);
    if (!photo) continue;
    animals.push({ ...row, photo_url: row.photo_url });
    usedIds.add(row.id);
  }
  return animals.slice(0, limit);
}

function renderVipCard(animal) {
  const name = escapeHtml((animal.name || "Guest").toUpperCase());
  const photo = safePhotoUrl(animal.photo_url);
  return `
    <article class="ff-pass">
      <header class="ff-pass-hd"><span class="ff-pass-star" aria-hidden="true">★</span>${name}<span class="ff-pass-star" aria-hidden="true">★</span></header>
      <div class="ff-pass-media">
        ${photo ? `<img src="${photo}" alt="${escapeAttr(animal.name || "VIP guest")}" loading="lazy" decoding="async" />` : ""}
        <div class="ff-seal" aria-hidden="true">
          <span class="ff-seal-inner">VIP<br>GUEST</span>
        </div>
      </div>
      <div class="ff-pass-tear" aria-hidden="true"></div>
    </article>`;
}

function renderCtaButton(label, amountDollars, campaignId) {
  const safeLabel = escapeHtml(label).toUpperCase();
  const amount = Number(amountDollars) || 175;
  const camp = escapeAttr(campaignId || "");
  return `
    <div class="ff-actions">
      <button class="ff-btn" type="button" data-action="donate" data-amount="${amount}" data-campaign-id="${camp}">
        <span>${safeLabel}</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M3 8a2 2 0 012-2h2l1.5-5h9L18 6h2a2 2 0 012 2v2H3V8z"/><path d="M3 10h18v7a2 2 0 01-2 2H5a2 2 0 01-2-2v-7z"/><path d="M8 14h8"/>
        </svg>
      </button>
    </div>`;
}

function renderPriceLine(amountDollars) {
  const amount = Number(amountDollars) || 175;
  return `<p class="ff-price"><span aria-hidden="true">★</span> $${amount} PER PASSENGER <span aria-hidden="true">★</span></p>`;
}

const FF_FIREWORKS = `
<svg class="ff-fw ff-fw-c" viewBox="0 0 120 120" aria-hidden="true" data-ff-parallax="0.16">
  <g fill="none" stroke-width="2.5" stroke-linecap="round"><g stroke="#c41e3a"><line x1="60" y1="60" x2="60" y2="20"/><line x1="60" y1="60" x2="88" y2="32"/><line x1="60" y1="60" x2="100" y2="60"/><line x1="60" y1="60" x2="88" y2="88"/><line x1="60" y1="60" x2="60" y2="100"/><line x1="60" y1="60" x2="32" y2="88"/><line x1="60" y1="60" x2="20" y2="60"/><line x1="60" y1="60" x2="32" y2="32"/></g><circle cx="60" cy="60" r="6" fill="#c41e3a"/></g>
</svg>
<svg class="ff-fw ff-fw-l" viewBox="0 0 80 80" aria-hidden="true" data-ff-parallax="0.14">
  <g fill="none" stroke="#d4622a" stroke-width="2" stroke-linecap="round"><line x1="40" y1="40" x2="40" y2="14"/><line x1="40" y1="40" x2="58" y2="22"/><line x1="40" y1="40" x2="66" y2="40"/><line x1="40" y1="40" x2="58" y2="58"/><line x1="40" y1="40" x2="40" y2="66"/><line x1="40" y1="40" x2="22" y2="58"/><line x1="40" y1="40" x2="14" y2="40"/><line x1="40" y1="40" x2="22" y2="22"/></g>
</svg>
<svg class="ff-fw ff-fw-r" viewBox="0 0 80 80" aria-hidden="true" data-ff-parallax="0.14">
  <g fill="none" stroke="#1a3a6e" stroke-width="2" stroke-linecap="round"><line x1="40" y1="40" x2="40" y2="14"/><line x1="40" y1="40" x2="58" y2="22"/><line x1="40" y1="40" x2="66" y2="40"/><line x1="40" y1="40" x2="58" y2="58"/><line x1="40" y1="40" x2="40" y2="66"/><line x1="40" y1="40" x2="22" y2="58"/><line x1="40" y1="40" x2="14" y2="40"/><line x1="40" y1="40" x2="22" y2="22"/></g>
</svg>`;

const FF_FLAG = `
<svg class="ff-flag" viewBox="0 0 200 120" aria-hidden="true" data-ff-parallax="0.1">
  <path d="M8 8v104" stroke="#1a2b45" stroke-width="4" stroke-linecap="round"/>
  <path d="M8 12 C50 28, 90 4, 130 20 S190 36, 192 44 L192 72 C150 56, 110 80, 70 64 S30 48, 8 56 Z" fill="#b22234"/>
  <rect x="8" y="12" width="72" height="48" fill="#1a2b45"/>
  <g fill="#fff"><circle cx="20" cy="22" r="2.5"/><circle cx="32" cy="22" r="2.5"/><circle cx="44" cy="22" r="2.5"/><circle cx="56" cy="22" r="2.5"/><circle cx="68" cy="22" r="2.5"/><circle cx="26" cy="32" r="2.5"/><circle cx="38" cy="32" r="2.5"/><circle cx="50" cy="32" r="2.5"/><circle cx="62" cy="32" r="2.5"/><circle cx="20" cy="42" r="2.5"/><circle cx="32" cy="42" r="2.5"/><circle cx="44" cy="42" r="2.5"/><circle cx="56" cy="42" r="2.5"/><circle cx="68" cy="42" r="2.5"/><circle cx="26" cy="52" r="2.5"/><circle cx="38" cy="52" r="2.5"/><circle cx="50" cy="52" r="2.5"/><circle cx="62" cy="52" r="2.5"/></g>
  <path d="M8 60 C50 76, 90 52, 130 68 S190 84, 192 92 L192 100 C150 84, 110 108, 70 92 S30 76, 8 84 Z" fill="#fff"/>
  <path d="M8 84 C50 100, 90 76, 130 92 S190 108, 192 116" fill="none" stroke="#b22234" stroke-width="8"/>
</svg>`;

const SCENE_SVG = `
<svg class="ff-scene" viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true" data-ff-parallax="0.06">
  <path d="M0 40 C180 20, 320 50, 520 30 C720 10, 900 45, 1100 25 C1250 12, 1350 28, 1440 34 L1440 120 L0 120 Z" fill="#d9cfbe" opacity=".35"/>
</svg>`;

const PARALLAX_SCRIPT = `
<script>
(function(){
  var hero=document.querySelector('.ff[data-section-key="donate_hero"]');
  if(!hero||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  var layers=hero.querySelectorAll('[data-ff-parallax]');
  var copy=hero.querySelector('.ff-copy');
  var passes=hero.querySelector('.ff-passes-wrap');
  var ticking=false;
  function update(){
    var rect=hero.getBoundingClientRect();
    var vh=window.innerHeight||1;
    var visible=rect.bottom>0&&rect.top<vh;
    if(!visible){ticking=false;return;}
    var center=rect.top+rect.height*.5;
    var delta=(center-vh*.5)/vh;
    layers.forEach(function(el){
      var speed=parseFloat(el.getAttribute('data-ff-parallax'))||0.1;
      var y=(delta*speed*48);
      if(el.classList.contains('ff-fw-c')){
        el.style.transform='translate3d(-50%,'+y+'px,0)';
      }else{
        el.style.transform='translate3d(0,'+y+'px,0)';
      }
    });
    if(copy)copy.style.transform='translate3d(0,'+(delta*-6)+'px,0)';
    if(passes)passes.style.transform='translate3d(0,'+(delta*10)+'px,0)';
    ticking=false;
  }
  function onScroll(){
    if(!ticking){ticking=true;requestAnimationFrame(update);}
  }
  window.addEventListener('scroll',onScroll,{passive:true});
  window.addEventListener('resize',onScroll,{passive:true});
  update();
})();
</script>`;

/**
 * Freedom Fest transport-ticket hero.
 */
export async function renderCampaignTransportHero(section, blocks = [], brand = {}, env = null) {
  const config = safeJson(section?.config_json, {});
  const sectionKey = pickText(section, ["section_key"]);
  const campaignId = pickText(config, ["campaign_id"]);
  const ticketCents = Number(config.ticket_amount_cents) || 17500;
  const ticketDollars = Math.round(ticketCents / 100);
  const title = pickText(section, ["eyebrow"]) || "FREEDOM FEST 2026";
  const ribbon = pickText(section, ["heading", "title"]) || pickText(config, ["ribbon_text"]) || "RED, WHITE & RESCUED";
  const tagline = pickText(section, ["subheading"]) || pickText(config, ["tagline"]) || "Celebrate Freedom. Change a Life.";
  const body = pickText(section, ["body"]) || "Sponsor a ticket and help rescue dogs travel to a brighter, better future.";
  const ctaLabel = pickText(section, ["cta_label"]) || "Sponsor a Ticket";
  const footerTagline = pickText(config, ["footer_tagline"]) || "ONE TICKET. ONE LIFE. FOREVER.";
  const footerNote = pickText(config, ["footer_note"]) || "Thank you for helping us celebrate freedom and second chances.";
  const bgImage = pickText(config, ["background_image_url", "hero_image_url"]);

  const animals = await loadCampaignAnimals(env, campaignId, 3);
  const vipCards = animals.map(renderVipCard).join("");
  const bgStyle = bgImage ? `background-image:url('${escapeAttr(bgImage)}');background-size:cover;background-position:center top;` : "";

  return `
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Abril+Fatface&family=Great+Vibes&family=Libre+Baskerville:ital,wght@0,700;1,400&family=Source+Sans+3:wght@400;600;700&display=swap" rel="stylesheet" />
<style>
  .ff[data-section-key="${escapeAttr(sectionKey)}"]{
    --cream:#f5f2e9;--navy:#1a2b45;--red:#8b1e1e;--red-bright:#b22234;
    --ink:#2a3344;--muted:#4a5568;--gold:#d4a94a;
    position:relative;overflow:hidden;background:var(--cream);color:var(--ink);
    font-family:"Source Sans 3",system-ui,sans-serif;${bgStyle}
  }
  .ff[data-section-key="${escapeAttr(sectionKey)}"]::before{
    content:"";position:absolute;inset:0;pointer-events:none;z-index:0;
    background:
      radial-gradient(ellipse 50% 40% at 92% 8%,rgba(26,43,69,.05),transparent 50%),
      linear-gradient(180deg,rgba(255,255,255,.45) 0%,transparent 40%,rgba(217,207,190,.12) 100%);
  }
  .ff[data-section-key="${escapeAttr(sectionKey)}"]::after{
    content:"";position:absolute;inset:0;pointer-events:none;z-index:0;opacity:.18;mix-blend-mode:multiply;
    background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.75' numOctaves='5' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.65'/%3E%3C/svg%3E");
    background-size:220px 220px;
  }
  .ff-scene{position:absolute;left:0;right:0;bottom:48px;width:100%;height:80px;z-index:1;pointer-events:none;will-change:transform}
  .ff-fw{position:absolute;pointer-events:none;z-index:1;will-change:transform}
  .ff-fw-c{top:clamp(10px,2vw,22px);left:50%;transform:translateX(-50%);width:clamp(56px,8vw,80px);opacity:.8}
  .ff-fw-l{top:clamp(18px,3vw,34px);left:clamp(14%,18vw,24%);width:clamp(44px,6vw,60px);opacity:.65}
  .ff-fw-r{top:clamp(22px,3.5vw,38px);right:clamp(18%,22vw,28%);width:clamp(44px,6vw,60px);opacity:.6}
  .ff-flag{
    position:absolute;top:clamp(14px,2.5vw,28px);right:clamp(16px,3vw,36px);
    width:clamp(96px,13vw,140px);height:auto;z-index:1;pointer-events:none;
    filter:drop-shadow(2px 4px 6px rgba(0,0,0,.1));will-change:transform;
  }
  .ff-inner{position:relative;z-index:2;max-width:920px;margin:0 auto;padding:clamp(40px,6vw,72px) clamp(20px,4vw,40px) clamp(28px,4vw,40px)}
  .ff-stack{display:flex;flex-direction:column;align-items:center;text-align:center;gap:clamp(36px,5vw,52px)}
  .ff-copy{
    display:flex;flex-direction:column;align-items:center;width:100%;max-width:620px;
    will-change:transform;transition:transform .1s linear;
  }
  .ff-stars{display:flex;justify-content:center;gap:6px;margin:0 0 10px;color:var(--navy);font-size:clamp(.55rem,1.2vw,.72rem);letter-spacing:.2em}
  .ff-stars span{opacity:.9}
  .ff-title{
    margin:0 0 14px;font-family:"Abril Fatface",Georgia,serif;
    font-size:clamp(2.6rem,7.5vw,4.6rem);font-weight:400;line-height:.9;
    letter-spacing:.03em;text-transform:uppercase;color:var(--red);
    -webkit-text-stroke:1.5px #fff;paint-order:stroke fill;
    text-shadow:2px 3px 0 rgba(26,43,69,.18),3px 5px 14px rgba(139,30,30,.12);
  }
  .ff-ribbon-wrap{margin:0 0 20px}
  .ff-ribbon{
    display:inline-block;padding:11px 32px;background:var(--navy);color:#fff;
    font-family:"Libre Baskerville",Georgia,serif;font-size:clamp(.68rem,1.4vw,.8rem);
    font-weight:700;letter-spacing:.2em;text-transform:uppercase;
    box-shadow:0 3px 0 rgba(0,0,0,.12),inset 0 1px 0 rgba(255,255,255,.12);
    position:relative;
  }
  .ff-ribbon::before,.ff-ribbon::after{
    content:"";position:absolute;top:0;bottom:0;width:14px;background:var(--navy);
  }
  .ff-ribbon::before{left:-12px;clip-path:polygon(100% 0,100% 100%,0 50%)}
  .ff-ribbon::after{right:-12px;clip-path:polygon(0 0,0 100%,100% 50%)}
  .ff-tagline-row{display:flex;align-items:center;justify-content:center;gap:clamp(10px,2vw,18px);margin:0 0 16px;width:100%}
  .ff-tagline-rule{flex:0 0 clamp(28px,6vw,56px);height:1px;background:var(--navy);opacity:.55}
  .ff-tagline{
    margin:0;font-family:"Great Vibes",cursive;font-size:clamp(1.6rem,4vw,2.35rem);
    line-height:1.1;color:var(--navy);
  }
  .ff-body{margin:0 0 26px;font-size:clamp(.95rem,1.7vw,1.08rem);line-height:1.65;color:var(--muted);max-width:42ch}
  .ff-actions{display:flex;justify-content:center;width:100%}
  .ff-btn{
    display:inline-flex;align-items:center;justify-content:center;gap:10px;
    min-height:42px;padding:0 22px;border-radius:10px;
    background:linear-gradient(135deg,rgba(178,34,52,.9),rgba(139,30,30,.84));
    color:#fff;font-family:inherit;font-size:.88rem;font-weight:600;letter-spacing:.06em;
    text-transform:uppercase;cursor:pointer;
    border:1px solid rgba(255,255,255,.2);
    box-shadow:0 4px 18px rgba(139,30,30,.32),inset 0 1px 0 rgba(255,255,255,.18);
    backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);
    transition:transform .15s ease,box-shadow .15s ease;
  }
  .ff-btn:hover{transform:translateY(-1px);box-shadow:0 8px 28px rgba(178,34,52,.42),inset 0 1px 0 rgba(255,255,255,.22)}
  .ff-btn:active{transform:translateY(0)}
  .ff-passes-wrap{
    width:100%;max-width:720px;display:flex;flex-direction:column;align-items:center;
    will-change:transform;transition:transform .1s linear;
  }
  .ff-passes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(14px,2.5vw,22px);width:100%}
  .ff-pass{
    display:flex;flex-direction:column;background:#fff;border:2px solid var(--red-bright);
    border-radius:20px 20px 10px 10px;overflow:hidden;
    box-shadow:0 14px 36px rgba(26,43,69,.12),0 2px 0 rgba(255,255,255,.8) inset;
  }
  .ff-pass-hd{
    background:var(--navy);color:#fff;text-align:center;padding:11px 6px 10px;
    font-family:"Libre Baskerville",Georgia,serif;font-size:clamp(.72rem,1.5vw,.88rem);
    font-weight:700;letter-spacing:.14em;text-transform:uppercase;
    display:flex;align-items:center;justify-content:center;gap:6px;
  }
  .ff-pass-star{font-size:.55rem;color:var(--gold);opacity:.95}
  .ff-pass-media{position:relative;aspect-ratio:4/5;background:#e8e0d4;overflow:hidden}
  .ff-pass-media img{width:100%;height:100%;object-fit:cover;display:block}
  .ff-seal{
    position:absolute;right:5px;bottom:5px;width:50px;height:50px;border-radius:50%;
    background:radial-gradient(circle at 35% 30%,#d4384a 0%,#8b1e1e 55%,#6d1520 100%);
    border:3px double #f5e6c8;box-shadow:0 3px 10px rgba(0,0,0,.3);
    display:flex;align-items:center;justify-content:center;z-index:2;
  }
  .ff-seal-inner{
    font-size:.4rem;font-weight:800;line-height:1.1;letter-spacing:.04em;
    text-align:center;color:#fff;text-transform:uppercase;font-family:"Source Sans 3",sans-serif;
  }
  .ff-pass-tear{height:12px;margin:8px 14px 12px;border-top:2px dashed rgba(26,43,69,.32)}
  .ff-price{
    margin:20px 0 0;font-family:"Libre Baskerville",Georgia,serif;
    font-size:clamp(.74rem,1.4vw,.84rem);font-weight:700;letter-spacing:.12em;
    text-transform:uppercase;color:var(--red-bright);text-align:center;
  }
  .ff-price span{color:var(--red-bright);font-size:.62rem;vertical-align:middle}
  .ff-bar{
    position:relative;z-index:3;display:flex;flex-wrap:wrap;align-items:center;
    justify-content:space-between;gap:16px 28px;background:var(--navy);color:#fff;
    padding:18px clamp(20px,4vw,48px);font-size:clamp(.72rem,1.4vw,.86rem);
  }
  .ff-bar-left{
    font-family:"Libre Baskerville",Georgia,serif;font-weight:700;letter-spacing:.1em;text-transform:uppercase;
    display:flex;align-items:center;gap:8px;flex-wrap:wrap;
  }
  .ff-bar-stars{color:var(--red-bright);letter-spacing:.08em}
  .ff-bar-div{width:1px;height:28px;background:rgba(255,255,255,.35);flex-shrink:0}
  .ff-bar-right{
    font-family:"Libre Baskerville",Georgia,serif;font-style:italic;font-weight:400;
    opacity:.92;line-height:1.45;max-width:46ch;
  }
  @media(max-width:640px){
    .ff-passes{gap:10px}
    .ff-pass-hd{font-size:.62rem;padding:8px 4px}
    .ff-seal{width:44px;height:44px;right:4px;bottom:4px}
    .ff-seal-inner{font-size:.34rem}
    .ff-bar-div{display:none}
    .ff-bar{justify-content:center;text-align:center}
    .ff-flag{width:80px;top:10px;right:12px}
    .ff-fw-l,.ff-fw-r{display:none}
  }
  @media(prefers-reduced-motion:reduce){
    .ff-copy,.ff-passes-wrap,.ff-scene,[data-ff-parallax]{transform:none!important;transition:none!important}
  }
</style>
<section class="ff" data-section-key="${escapeAttr(sectionKey)}" data-campaign-id="${escapeAttr(campaignId)}">
  ${FF_FIREWORKS}
  ${FF_FLAG}
  ${SCENE_SVG}
  <div class="ff-inner">
    <div class="ff-stack">
      <div class="ff-copy">
        <div class="ff-stars" aria-hidden="true"><span>★</span><span>★</span><span>★</span><span>★</span><span>★</span></div>
        <h1 class="ff-title">${escapeHtml(title)}</h1>
        <div class="ff-ribbon-wrap">
          <div class="ff-ribbon">★ ${escapeHtml(ribbon)} ★</div>
        </div>
        <div class="ff-tagline-row">
          <span class="ff-tagline-rule" aria-hidden="true"></span>
          <p class="ff-tagline">${escapeHtml(tagline)}</p>
          <span class="ff-tagline-rule" aria-hidden="true"></span>
        </div>
        <p class="ff-body">${escapeHtml(body)}</p>
        ${renderCtaButton(ctaLabel, ticketDollars, campaignId)}
      </div>
      <div class="ff-passes-wrap">
        <div class="ff-passes" aria-label="VIP transport guests">${vipCards}</div>
        ${renderPriceLine(ticketDollars)}
      </div>
    </div>
  </div>
  <footer class="ff-bar">
    <div class="ff-bar-left"><span class="ff-bar-stars" aria-hidden="true">★★★</span> ${escapeHtml(footerTagline)}</div>
    <div class="ff-bar-div" aria-hidden="true"></div>
    <div class="ff-bar-right">${escapeHtml(footerNote)} <span aria-hidden="true">★★</span></div>
  </footer>
</section>${PARALLAX_SCRIPT}`.trim();
}

export const DYNAMIC_SECTION_TYPES = new Set(["campaign_transport_hero"]);

export function isDynamicSectionType(type) {
  return DYNAMIC_SECTION_TYPES.has(String(type || "").toLowerCase());
}
