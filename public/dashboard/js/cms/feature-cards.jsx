// CMS feature-card editor helpers (Babel global). Loaded before view-cms.jsx.
// Tenant URLs come from GET /api/cms/bootstrap — never hardcode the public domain.

function cmsRememberCatalog(catalog) {
  if (catalog && typeof catalog === "object") {
    window.__CMS_EDITOR_CATALOG__ = catalog;
  }
  return window.__CMS_EDITOR_CATALOG__ || {};
}

function cmsBrandDomain(catalog) {
  const cat = catalog || window.__CMS_EDITOR_CATALOG__ || {};
  const raw = String(cat.brand?.site_domain || cat.site_domain || window.CPAS_CONFIG?.brand?.site_domain || "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");
  if (raw) return raw;
  const host = (typeof location !== "undefined" && location.hostname) || "";
  if (host.startsWith("assets.")) return host.slice("assets.".length);
  if (host && !/localhost|127\.0\.0\.1|workers\.dev/i.test(host)) {
    return host.replace(/^admin\./i, "").replace(/^www\./i, "");
  }
  return "";
}

function cmsPublicOrigin(catalog) {
  const domain = cmsBrandDomain(catalog);
  return domain ? `https://${domain}` : "";
}

function cmsCdnBase(catalog) {
  const cat = catalog || window.__CMS_EDITOR_CATALOG__ || {};
  const fromCat = String(cat.cdn_base || "").trim().replace(/\/+$/, "");
  if (fromCat) return fromCat;
  const domain = cmsBrandDomain(cat);
  return domain ? `https://assets.${domain}` : "";
}

function cmsRewriteAssetUrl(url, catalog) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  const cdn = cmsCdnBase(catalog);
  const origin = cmsPublicOrigin(catalog);
  let next = raw;
  if (cdn) next = next.replace(/^https?:\/\/[^/]*workers\.dev\/static\//i, `${cdn}/`);
  if (origin) next = next.replace(/^https?:\/\/[^/]*workers\.dev\//i, `${origin}/`);
  return next;
}

function cmsUrlPlaceholder(catalog, kind) {
  const cdn = cmsCdnBase(catalog);
  const origin = cmsPublicOrigin(catalog);
  if (kind === "cdn") return cdn ? `${cdn}/…` : "https://…";
  if (kind === "page") return origin ? `${origin}/…` : "/…";
  if (kind === "host") return cmsBrandDomain(catalog) || "this site";
  return "https://…";
}

function cmsDefaultPaymentMethods(catalog) {
  const base = cmsCdnBase(catalog);
  const logo = (name) => (base ? `${base}/static/assets/${name}` : `/static/assets/${name}`);
  return [
    { id:'zeffy', enabled:true, label:'', tooltip:'Donate with Zeffy — 100% goes to animals (fee-free)', show_label:false, note:'fee-free', url_field:'zeffy_donate_url', component_id:'payment_zeffy', style:'zeffy', logo_height:22, background:'#141018', border_color:'#141018', text_color:'#faf7f3', note_color:'#49e9d5', logo_url: logo('zeffy-wordmark.webp') },
    { id:'paypal', enabled:true, label:'', tooltip:'Donate via PayPal', show_label:false, note:'', url_field:'paypal_donate_url', component_id:'payment_paypal', style:'paypal', logo_height:22, background:'#eef5ff', border_color:'#9ec0ef', text_color:'#003087', logo_url: logo('PayPal.svg.webp') },
    { id:'venmo', enabled:true, label:'', tooltip:'Pay on Venmo', show_label:false, note:'', url_field:'venmo_donate_url', component_id:'payment_venmo', style:'venmo', logo_height:22, background:'#eaf6fc', border_color:'#7ec0e8', text_color:'#008CFF', logo_url: logo('venmo-official-logo.svg') },
    { id:'amazon_wishlist', enabled:true, label:'', tooltip:'Send supplies via Amazon Wishlist', show_label:false, note:'', url_field:'amazon_wishlist_url', component_id:'wishlist_amazon', style:'amazon', logo_height:28, background:'#fff6e8', border_color:'#f0c078', text_color:'#232f3e', logo_url: logo('amz-wishlist-bttn.webp') },
    { id:'stripe', enabled:true, label:'', tooltip:'Card or bank donation', show_label:false, note:'', action:'donate', component_id:'payment_stripe_donation_modal', style:'stripe', logo_height:22, background:'#f3f0ff', border_color:'#b8a9ff', text_color:'#3d348b', logo_url: logo('stripe-wordmark.webp') },
  ];
}

const CMS_IMAGE_DISPLAY_PRESETS = [
  { value: 'natural', label: 'Natural' },
  { value: 'crop', label: '4:3' },
  { value: 'square', label: '1:1' },
  { value: 'portrait', label: '3:4' },
  { value: 'portrait_45', label: '4:5' },
  { value: 'story', label: '9:16' },
];

const CMS_FEATURE_CARD_SECTION_TYPES = ['feature_cards', 'card_grid', 'home_pillars'];

function cmsCardSectionKey(key) {
  return String(key || "").replace(/-/g, "_");
}

function cmsFeatureCardBlocks(section, blocks) {
  if (!section || !CMS_FEATURE_CARD_SECTION_TYPES.includes(String(section.section_type || ''))) return [];
  const want = cmsCardSectionKey(section.section_key);
  return [...(blocks || [])]
    .filter((b) => cmsCardSectionKey(b.section_key) === want)
    .sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0));
}

function renderCmsFeatureCardNest({
  section,
  blocks,
  selectedKey,
  selectedBlockKey,
  onSelectCard,
  onNudgeCard,
  onDeleteCard,
  busy,
}) {
  const cards = cmsFeatureCardBlocks(section, blocks);
  if (!cards.length) return null;
  const parentActive = selectedKey === section.section_key;
  return React.createElement('div', {
    style: { margin: '-2px 0 8px 22px', display: 'grid', gap: 4 },
  },
    cards.map((b) => {
      const active = parentActive && selectedBlockKey === b.block_key;
      return React.createElement('div', {
        key: b.block_key,
        style: {
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1fr) 22px 22px 22px',
          alignItems: 'center',
          gap: 4,
          padding: '7px 8px',
          borderRadius: 10,
          border: `1px solid ${active ? C.purple : C.border}`,
          background: active ? C.purpleDim : C.surface,
        },
      },
        React.createElement('button', {
          type: 'button',
          title: 'Edit this card',
          onClick: (e) => { e.stopPropagation(); onSelectCard(section, b); },
          style: { textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, minWidth: 0 },
        },
          React.createElement('div', {
            style: { fontSize: 12, fontWeight: 800, color: active ? C.purpleL : C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
          }, b.title || b.block_key),
          React.createElement('div', {
            style: { fontSize: 10, color: C.textMut, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
          }, 'Card')
        ),
        React.createElement('button', {
          type: 'button', title: 'Move up', disabled: busy,
          onClick: (e) => { e.stopPropagation(); onNudgeCard(section, b.block_key, -1); },
          style: { width: 22, height: 22, border: `1px solid ${C.border}`, borderRadius: 6, background: C.bg, cursor: 'pointer', fontSize: 11 },
        }, '↑'),
        React.createElement('button', {
          type: 'button', title: 'Move down', disabled: busy,
          onClick: (e) => { e.stopPropagation(); onNudgeCard(section, b.block_key, 1); },
          style: { width: 22, height: 22, border: `1px solid ${C.border}`, borderRadius: 6, background: C.bg, cursor: 'pointer', fontSize: 11 },
        }, '↓'),
        React.createElement('button', {
          type: 'button', title: 'Remove this card', disabled: busy,
          onClick: (e) => { e.stopPropagation(); onDeleteCard(section, b); },
          style: { width: 22, height: 22, border: `1px solid ${C.red}44`, borderRadius: 6, background: C.bg, color: C.red, cursor: 'pointer', fontSize: 14, lineHeight: 1 },
        }, '×')
      );
    })
  );
}

function renderCmsFeatureCardsInspector({
  cfg,
  sectionBlocks,
  selectedBlockKey,
  onAddCard,
  onSelectCard,
  onNudgeCard,
  onDeleteCard,
  onCrop,
  onColumns,
  busy,
  renderPresetRow,
}) {
  const cards = [...(sectionBlocks || [])].sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0));
  return React.createElement('div', { style: { display: 'grid', gap: 10 } },
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 } },
      React.createElement('h4', { style: { margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: C.textSec } }, 'Cards in this section'),
      React.createElement(Btn, { size: 'sm', variant: 'secondary', onClick: onAddCard, disabled: busy }, 'Add card')
    ),
    React.createElement('div', { style: { fontSize: 12, color: C.textMut, lineHeight: 1.45 } },
      'Each event is its own card. Delete one from this list or the left rail — one card is enough.'
    ),
    renderPresetRow('Image crop', cfg.image_display || 'natural', CMS_IMAGE_DISPLAY_PRESETS, onCrop),
    renderPresetRow('Cards per row', String(cfg.columns || 'auto'), [
      { value: '1', label: '1' }, { value: 'auto', label: 'Auto' }, { value: '2', label: '2' }, { value: '3', label: '3' }, { value: '4', label: '4' },
    ], onColumns),
    cards.length
      ? cards.map((b) => React.createElement('div', {
          key: b.id || b.block_key,
          style: {
            display: 'grid',
            gridTemplateColumns: '1fr auto auto auto',
            gap: 6,
            alignItems: 'center',
            padding: '8px 10px',
            borderRadius: 10,
            border: `1px solid ${selectedBlockKey === b.block_key ? C.purple : C.border}`,
            background: selectedBlockKey === b.block_key ? 'rgba(124,58,237,0.08)' : C.bg,
          },
        },
          React.createElement('button', {
            type: 'button',
            onClick: () => onSelectCard(b),
            style: { textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 },
          },
            React.createElement('div', { style: { fontWeight: 800, color: C.text, fontSize: 13 } }, b.title || b.block_key || 'Card'),
            React.createElement('div', { style: { color: C.textMut, fontSize: 11, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, b.body || 'Edit card copy')
          ),
          React.createElement('button', { type: 'button', title: 'Move up', onClick: () => onNudgeCard(b.block_key, -1), style: { width: 22, height: 22, border: `1px solid ${C.border}`, borderRadius: 6, background: C.surface, cursor: 'pointer' } }, '↑'),
          React.createElement('button', { type: 'button', title: 'Move down', onClick: () => onNudgeCard(b.block_key, 1), style: { width: 22, height: 22, border: `1px solid ${C.border}`, borderRadius: 6, background: C.surface, cursor: 'pointer' } }, '↓'),
          React.createElement('button', { type: 'button', title: 'Remove card', onClick: () => onDeleteCard(b), style: { width: 22, height: 22, border: `1px solid ${C.red}44`, borderRadius: 6, background: C.surface, color: C.red, cursor: 'pointer', fontSize: 14, lineHeight: 1 } }, '×')
        ))
      : React.createElement('div', { style: { color: C.textMut, fontSize: 12 } }, 'No cards yet — Add card to put one event in this section.')
  );
}

Object.assign(window, {
  cmsRememberCatalog,
  cmsBrandDomain,
  cmsPublicOrigin,
  cmsCdnBase,
  cmsRewriteAssetUrl,
  cmsUrlPlaceholder,
  cmsDefaultPaymentMethods,
  CMS_IMAGE_DISPLAY_PRESETS,
  CMS_FEATURE_CARD_SECTION_TYPES,
  cmsCardSectionKey,
  cmsFeatureCardBlocks,
  renderCmsFeatureCardNest,
  renderCmsFeatureCardsInspector,
});
