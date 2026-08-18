// CMS page-editor kit: fonts, type colors, preview inspector, field widgets.

// ── /dashboard/cms/pages/:pageId — Page Editor ────────────────────────────────

const FONT_PRESETS_CMS = [
  { key: "fraunces_dm",    label: "Editorial",  sub: "Fraunces + DM Sans",            display: "Fraunces, Georgia, serif",          body: "DM Sans, system-ui, sans-serif" },
  { key: "playfair_inter", label: "Classic",    sub: "Playfair Display + Inter",       display: "Playfair Display, Georgia, serif",   body: "Inter, system-ui, sans-serif" },
  { key: "lora_nunito",    label: "Warm",       sub: "Lora + Nunito",                  display: "Lora, Georgia, serif",               body: "Nunito, system-ui, sans-serif" },
  { key: "dm_only",        label: "Clean Sans", sub: "DM Sans (full)",                 display: "DM Sans, system-ui, sans-serif",     body: "DM Sans, system-ui, sans-serif" },
  { key: "cormorant_jost", label: "Luxury",     sub: "Cormorant Garamond + Jost",      display: "Cormorant Garamond, Georgia, serif",  body: "Jost, system-ui, sans-serif" },
];

const CMS_TYPE_COLOR = {
  hero: '#a78bfa', text_image: '#60a5fa', text_image_split: '#60a5fa', feature_cards: '#34d399',
  foster_grid: '#fbbf24', campaign_grid: '#f87171', testimonial: '#94a3b8', cta_banner: '#fb923c',
  animal_grid: '#4ade80', content: '#94a3b8', service_cards: '#34d399', donate_tiers: '#fbbf24',
  raw_html: '#64748b', split_info_card: '#7B2FBE',
};

const CMS_DEVICE_FRAMES = { desktop: null, tablet: 834, mobile: 390 };
const CMS_FIELD_LABELS = {
  eyebrow: "Eyebrow",
  heading: "Heading",
  subheading: "Subheading",
  body: "Body",
  image_url: "Image",
  cta_label: "Primary CTA",
  cta_href: "Primary CTA link",
  cta_secondary_label: "Secondary CTA",
  cta_secondary_href: "Secondary CTA link",
  block_title: "Block title",
  block_body: "Block body",
  block_subtitle: "Block subtitle",
  block_image: "Block image",
  card_image: "Card image",
};
const CMS_TEXT_FIELDS = new Set(["eyebrow", "heading", "subheading", "body", "cta_label", "cta_secondary_label", "block_title", "block_body"]);
const CMS_IMAGE_FIELDS = new Set(["image_url", "card_image"]);

function cmsNormalizeSectionKey(key) {
  return String(key || "").replace(/-/g, "_");
}

function cmsParseConfig(section) {
  const raw = section?.config_json;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return { ...raw };
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

/** two_cards / campaign grids store per-item copy in config.cards — not section eyebrow/heading. */
function cmsConfigCards(section) {
  const cfg = cmsParseConfig(section);
  const cards = Array.isArray(cfg.cards) ? cfg.cards.filter((c) => c && typeof c === "object") : [];
  if (!cards.length) return null;
  const type = String(section?.section_type || "");
  const layoutOk = cfg.layout === "two_cards" || type === "donate_campaign_grid" || type === "campaign_grid";
  return layoutOk ? cards : null;
}

/**
 * Preview already gets field-level inspector from /api/cms/preview (injectCmsInspector).
 * Only inject a dashboard fallback when that script is missing — never double-bind,
 * or section-only clicks steal element selection.
 */
function injectPreviewSectionInspector(iframe) {
  try {
    const doc = iframe?.contentDocument;
    if (!doc) return;
    if (doc.body) doc.body.classList.add("cms-preview");
    // API inspector already present — do not overlay a section-only handler.
    if (doc.getElementById("cms-inspector-style") || doc.getElementById("cms-dash-inspector-style")) return;
    if (doc.defaultView && doc.defaultView.__cmsDashInspector) return;

    const style = doc.createElement("style");
    style.id = "cms-dash-inspector-style";
    style.textContent = `
      body.cms-preview [data-section-key], body.cms-preview [data-cpas-section] { position: relative; cursor: pointer; }
      body.cms-preview .cms-sec-hover:not(.cms-sec-active) { outline: 1.5px dashed rgba(124,58,237,0.55); outline-offset: -2px; }
      body.cms-preview .cms-sec-active { outline: 2px solid #7c3aed; outline-offset: -2px; box-shadow: inset 0 0 0 1px rgba(124,58,237,0.25); }
      body.cms-preview [data-cms-field] { cursor: pointer; }
      body.cms-preview [data-cms-field].cms-field-hover { outline: 1.5px solid rgba(124,58,237,0.7); outline-offset: 2px; border-radius: 4px; }
      body.cms-preview [data-cms-field].cms-field-active { outline: 2px solid #7c3aed; outline-offset: 2px; border-radius: 4px; box-shadow: 0 0 0 3px rgba(124,58,237,0.18); }
      #cms-dash-inspector-chip {
        position: fixed; z-index: 2147483646; pointer-events: none; display: none;
        background: #7c3aed; color: #fff; font: 700 11px/1.2 system-ui,sans-serif;
        padding: 4px 9px; border-radius: 4px 4px 4px 0; white-space: nowrap;
        box-shadow: 0 4px 14px rgba(76,29,149,0.35); letter-spacing: 0.02em;
      }
    `;
    (doc.head || doc.documentElement).appendChild(style);

    const script = doc.createElement("script");
    script.id = "cms-dash-inspector-script";
    script.textContent = `
(function(){
  if (window.__cmsDashInspector) return;
  window.__cmsDashInspector = true;
  var activeKey = null, activeField = null, hoverSec = null, chip = null;

  function sectionKey(el){
    if (!el) return '';
    return el.getAttribute('data-section-key') || el.getAttribute('data-cpas-section') || '';
  }
  function findSection(el){
    var cur = el;
    while (cur && cur !== document.body) {
      if (cur.getAttribute && (cur.getAttribute('data-section-key') || cur.getAttribute('data-cpas-section'))) return cur;
      cur = cur.parentElement;
    }
    return null;
  }
  function findField(el){
    var cur = el;
    while (cur && cur !== document.body) {
      if (cur.getAttribute && cur.getAttribute('data-cms-field')) return cur;
      if (cur.getAttribute && (cur.getAttribute('data-section-key') || cur.getAttribute('data-cpas-section'))) break;
      cur = cur.parentElement;
    }
    return null;
  }
  function allSections(){
    return Array.prototype.slice.call(document.querySelectorAll('[data-section-key], [data-cpas-section]'));
  }
  function resolve(key){
    if (!key) return null;
    var el = document.querySelector('[data-section-key=\"' + key + '\"]');
    if (el) return el;
    el = document.querySelector('[data-cpas-section=\"' + key + '\"]');
    if (el) return el;
    var kebab = String(key).replace(/_/g,'-');
    el = document.querySelector('[data-cpas-section=\"' + kebab + '\"]');
    if (el) return el;
    var snake = String(key).replace(/-/g,'_');
    return document.querySelector('[data-section-key=\"' + snake + '\"]');
  }
  function ensureChip(){
    if (chip) return chip;
    chip = document.createElement('div');
    chip.id = 'cms-dash-inspector-chip';
    document.body.appendChild(chip);
    return chip;
  }
  function placeChip(el, text){
    var c = ensureChip();
    if (!el) { c.style.display = 'none'; return; }
    var r = el.getBoundingClientRect();
    c.textContent = text || sectionKey(el);
    c.style.display = 'block';
    c.style.top = Math.max(8, r.top - 26) + 'px';
    c.style.left = Math.max(8, Math.min(r.left, window.innerWidth - 160)) + 'px';
  }
  function clearFieldChrome(){
    document.querySelectorAll('[data-cms-field].cms-field-hover, [data-cms-field].cms-field-active').forEach(function(n){
      n.classList.remove('cms-field-hover', 'cms-field-active');
    });
  }
  function paint(){
    allSections().forEach(function(sec){
      var key = sectionKey(sec);
      var isActive = activeKey && (key === activeKey || key.replace(/-/g,'_') === String(activeKey).replace(/-/g,'_') || key.replace(/_/g,'-') === String(activeKey).replace(/_/g,'-'));
      sec.classList.toggle('cms-sec-active', !!isActive);
      sec.classList.toggle('cms-sec-hover', hoverSec === sec && !isActive);
    });
    var activeEl = activeKey ? resolve(activeKey) : null;
    if (activeEl) placeChip(activeEl, activeField ? (sectionKey(activeEl) + ' / ' + activeField) : sectionKey(activeEl));
    else if (hoverSec) placeChip(hoverSec, sectionKey(hoverSec));
    else { var c = ensureChip(); c.style.display = 'none'; }
  }

  document.addEventListener('mouseover', function(e){
    var field = findField(e.target);
    hoverSec = findSection(e.target);
    clearFieldChrome();
    if (field) field.classList.add('cms-field-hover');
    paint();
  }, true);
  document.addEventListener('mouseout', function(e){
    if (!e.relatedTarget) { hoverSec = null; clearFieldChrome(); paint(); }
  }, true);
  document.addEventListener('click', function(e){
    var sec = findSection(e.target);
    if (!sec) return;
    e.preventDefault();
    e.stopPropagation();
    var key = sectionKey(sec);
    var fieldEl = findField(e.target);
    activeKey = key;
    activeField = fieldEl ? fieldEl.getAttribute('data-cms-field') : null;
    var blockKey = fieldEl ? (fieldEl.getAttribute('data-cms-block') || null) : null;
    clearFieldChrome();
    if (fieldEl) fieldEl.classList.add('cms-field-active');
    paint();
    if (fieldEl && activeField) {
      window.parent.postMessage({ type: 'cms:element-selected', sectionKey: key, field: activeField, blockKey: blockKey, tag: (fieldEl.tagName || '').toLowerCase() }, '*');
    } else {
      window.parent.postMessage({ type: 'cms:section-clicked', key: key }, '*');
    }
  }, true);
  window.addEventListener('scroll', function(){ paint(); }, true);
  window.addEventListener('message', function(e){
    if (!e.data) return;
    if (e.data.type === 'cms:scroll-to-section' || e.data.type === 'cms:highlight-section') {
      activeKey = e.data.key || null;
      activeField = e.data.field || null;
      clearFieldChrome();
      var el = resolve(activeKey);
      if (el && e.data.type === 'cms:scroll-to-section') el.scrollIntoView({ behavior:'smooth', block:'start' });
      if (el && activeField) {
        var f = el.querySelector('[data-cms-field=\"' + activeField + '\"]');
        if (f) f.classList.add('cms-field-active');
      }
      paint();
    }
    if (e.data.type === 'cms:clear-selection') {
      activeKey = null; activeField = null; clearFieldChrome(); paint();
    }
  });
})();`;
    (doc.body || doc.documentElement).appendChild(script);
  } catch (_) {}
}

const CMS_SECTION_TYPES = [
  { type:'campaign_entry_hero', label:'Campaign Entry Hero', desc:'Split campaign opener with image, steps, entry, and sharing actions' },
  { type:'hero', label:'Hero', desc:'Large page opener with headline, image, and CTAs' },
  { type:'text_image', label:'Text + Image', desc:'Balanced story block with optional media' },
  { type:'split_info_card', label:'Split Info Card', desc:'Image + copy with bullet list and contact card' },
  { type:'feature_cards', label:'Feature Cards', desc:'Reusable card grid for services or benefits' },
  { type:'foster_grid', label:'Foster Grid', desc:'Animal/foster focused grid section' },
  { type:'campaign_grid', label:'Campaign Grid', desc:'Donation or fundraising campaign grid' },
  { type:'testimonial', label:'Testimonial', desc:'Quote, story, or social proof block' },
  { type:'cta_banner', label:'CTA Banner', desc:'High-emphasis call to action strip' },
  { type:'animal_grid', label:'Animal Grid', desc:'Adoptable or foster-needed animals' },
  { type:'contact_hero', label:'Contact Hero', desc:'Contact page opener with social pills' },
  { type:'contact_form', label:'Contact Form', desc:'Inline message form for contact pages' },
  { type:'embedded_form', label:'Form (Forms Studio)', desc:'Embed a published Forms Studio form' },
  { type:'contact_socials', label:'Contact Info Cards', desc:'Email, location, org cards' },
  { type:'contact_team', label:'Team', desc:'Group photo + member list' },
  { type:'content', label:'Content', desc:'Simple copy section for flexible text' },
  { type:'raw_html', label:'Custom Code', desc:'Paste HTML or embed from a URL' },
];

function useBp() {
  const [bp, setBp] = React.useState(() => window.innerWidth < 768 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop');
  React.useEffect(() => {
    const h = () => setBp(window.innerWidth < 768 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop');
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return bp;
}

function cmsRouteFromPageId(pageId) {
  if (!pageId || pageId === '_home' || pageId === '_' || pageId === 'home') return '/';
  if (String(pageId).startsWith('new_')) return '/' + pageId;
  return '/' + String(pageId).replace(/^_/, '').replace(/_/g, '/');
}

function cmsSlugForKey(route) {
  return route === '/' ? 'home' : route.replace(/^\//, '').replace(/\//g, '_') || 'home';
}

function cmsPageIdFromPublicRoute(pathname) {
  if (!pathname || pathname === '/') return 'home';
  return pathname.replace(/^\//, '').replace(/\//g, '_') || 'home';
}

function cmsTypeBadge(type) {
  const color = CMS_TYPE_COLOR[type] || CMS_TYPE_COLOR.content;
  return React.createElement('span', { style:{ fontSize:10, fontWeight:800, padding:'2px 8px', borderRadius:99, background:color + '22', color, border:'1px solid ' + color + '44', whiteSpace:'nowrap' } }, type || 'content');
}

function cmsFieldLabel(label) {
  return React.createElement('label', { style:{ display:'block', fontSize:11, fontWeight:800, color:C.textSec, marginBottom:6, textTransform:'uppercase', letterSpacing:'.06em' } }, label);
}

function cmsTextInput(value, onChange, onBlur, placeholder, mono) {
  return React.createElement('input', { value:value || '', onChange:e=>onChange(e.target.value), onBlur, placeholder:placeholder || '', style:{ width:'100%', boxSizing:'border-box', padding:'9px 11px', border:`1px solid ${C.border}`, borderRadius:9, background:C.bg, color:C.text, fontSize:13, outline:'none', fontFamily:mono ? 'var(--font-mono)' : 'var(--font-ui)' } });
}

function cmsTextArea(value, onChange, onBlur, rows) {
  return React.createElement('textarea', { value:value || '', rows:rows || 5, onChange:e=>onChange(e.target.value), onBlur, style:{ width:'100%', boxSizing:'border-box', padding:'10px 11px', border:`1px solid ${C.border}`, borderRadius:9, background:C.bg, color:C.text, fontSize:13, lineHeight:1.65, resize:'vertical', outline:'none', fontFamily:'var(--font-ui)' } });
}


Object.assign(window, {
  FONT_PRESETS_CMS,
  CMS_TYPE_COLOR,
  CMS_DEVICE_FRAMES,
  CMS_FIELD_LABELS,
  CMS_TEXT_FIELDS,
  CMS_IMAGE_FIELDS,
  cmsNormalizeSectionKey,
  cmsParseConfig,
  cmsConfigCards,
  injectPreviewSectionInspector,
  CMS_SECTION_TYPES,
  useBp,
  cmsRouteFromPageId,
  cmsSlugForKey,
  cmsPageIdFromPublicRoute,
  cmsTypeBadge,
  cmsFieldLabel,
  cmsTextInput,
  cmsTextArea,
});
