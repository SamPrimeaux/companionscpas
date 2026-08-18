// CMS page-editor modals (Babel global).

function cmsBindEditorModals(ed) {
  const {
    busy,
    showImagePicker,
    setShowImagePicker,
    imageSearch,
    setImageSearch,
    assets,
    showAddSection,
    setShowAddSection,
    showCopyModal,
    setShowCopyModal,
    showQuickAddPage,
    setShowQuickAddPage,
    quickPage,
    setQuickPage,
    quickPageSaving,
    copyTargetRoute,
    setCopyTargetRoute,
    copyInsertAfter,
    setCopyInsertAfter,
    copyPages,
    copyTargetSections,
    addableSections,
    addableSectionsErr,
    uploadingAsset,
    isMobile,
    route,
    selected,
    addSection,
    copySectionToPage,
    pickImage,
    uploadAsset,
    quickAddPage,
  } = ed;

  function renderImagePicker() {
    if (!showImagePicker) return null;
    const imageAssets = (assets || []).filter(mediaIsImageAsset);
    const filtered = imageAssets.filter((a) => {
      if (!imageSearch) return true;
      const q = imageSearch.toLowerCase();
      return [a.filename, a.label, a.r2_key, a.public_url, a.cdn_url].some((v) => String(v || "").toLowerCase().includes(q));
    });
    return React.createElement('div', { className: 'cms-image-picker-overlay', style:{ position:'fixed', inset:0, zIndex:260, background:'rgba(0,0,0,.52)', display:'flex', alignItems:'center', justifyContent:'center', padding:isMobile ? 0 : 24 } },
      React.createElement('div', { className: 'cms-image-picker', style:{ width:isMobile ? '100%' : 820, height:isMobile ? '100%' : '84vh', background:C.surface, border:`1px solid ${C.border}`, borderRadius:isMobile ? 0 : 18, overflow:'hidden', display:'flex', flexDirection:'column' } },
        React.createElement('div', { style:{ padding:'14px 16px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:10 } },
          React.createElement('div', { style:{ flex:1, color:C.text, fontWeight:900, fontSize:15 } }, 'Pick from Library'),
          React.createElement(Btn, { size:'sm', variant:'secondary', onClick:()=>setShowImagePicker(false) }, 'Close')
        ),
        React.createElement('div', { style:{ padding:14, display:'grid', gridTemplateColumns:isMobile ? '1fr' : '1fr 160px', gap:10, borderBottom:`1px solid ${C.border}` } },
          cmsTextInput(imageSearch, setImageSearch, null, 'Search filename…'),
          React.createElement('label', { className:'cms-image-picker-upload', style:{ height:38, border:`1px dashed ${C.border}`, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', color:C.textSec, fontSize:12, fontWeight:800, cursor:'pointer' } },
            uploadingAsset ? 'Uploading…' : 'Upload new',
            React.createElement('input', { type:'file', accept:'image/*', style:{ display:'none' }, onChange:e=>uploadAsset(e.target.files?.[0]) })
          )
        ),
        React.createElement('div', { className:'cms-image-picker-scroll', style:{ flex:1, minHeight:0, overflowY:'auto', padding:14 } },
          !assets.length
            ? React.createElement('div', { style:{ color:C.textMut, fontSize:13, padding:24, textAlign:'center' } }, 'Loading library…')
            : !filtered.length
              ? React.createElement('div', { style:{ color:C.textMut, fontSize:13, padding:24, textAlign:'center' } }, imageSearch ? 'No images match your search.' : 'No images in the library yet. Upload one to get started.')
              : React.createElement('div', { className:'cms-image-picker-grid', style:{ display:'grid', gridTemplateColumns:isMobile ? 'repeat(2,minmax(0,1fr))' : 'repeat(4,minmax(0,1fr))', gap:12 } },
                  filtered.map((a) => {
                    const url = mediaAssetUrl(a);
                    return React.createElement('button', {
                      key: a.id || a.r2_key || url,
                      type: 'button',
                      className: 'cms-image-picker-card',
                      onClick: () => { if (url) pickImage(url); },
                      disabled: !url,
                      style: { border:`1px solid ${C.border}`, background:C.bg, borderRadius:12, overflow:'hidden', padding:0, textAlign:'left', cursor: url ? 'pointer' : 'not-allowed', display:'flex', flexDirection:'column' }
                    },
                      React.createElement('div', { className:'cms-image-picker-thumb', style:{ aspectRatio:'1 / 1', background:C.bg2 || C.bg, overflow:'hidden', position:'relative' } },
                        url
                          ? React.createElement('img', {
                              src: url,
                              alt: a.alt_text || a.filename || '',
                              loading: 'lazy',
                              style: { width:'100%', height:'100%', objectFit:'cover', display:'block' },
                              onError: (e) => { e.target.style.display = 'none'; if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex'; }
                            })
                          : null,
                        React.createElement('div', {
                          className: 'cms-image-picker-fallback',
                          style: { display: url ? 'none' : 'flex', position:'absolute', inset:0, alignItems:'center', justifyContent:'center', color:C.textMut, fontSize:11, background:C.bg2 || '#efeae4' }
                        }, 'Unavailable')
                      ),
                      React.createElement('div', { style:{ padding:'8px 10px', color:C.textSec, fontSize:10, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', borderTop:`1px solid ${C.border}` } }, a.label || a.filename || a.r2_key || 'Asset')
                    );
                  })
                )
        )
      )
    );
  }

  function renderAddSectionModal() {
    if (!showAddSection) return null;
    const types = addableSections.length
      ? addableSections
      : CMS_SECTION_TYPES;
    return React.createElement('div', { style:{ position:'fixed', inset:0, zIndex:250, background:'rgba(0,0,0,.5)', display:'flex', alignItems:'center', justifyContent:'center', padding:isMobile ? 0 : 24 } },
      React.createElement('div', { style:{ width:isMobile ? '100%' : 720, maxHeight:isMobile ? '100%' : '82vh', overflowY:'auto', background:C.surface, border:`1px solid ${C.border}`, borderRadius:isMobile ? 0 : 18, padding:18 } },
        React.createElement('div', { style:{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, marginBottom:16 } }, React.createElement('h3', { style:{ margin:0, color:C.text } }, 'Add Section'), React.createElement(Btn, { size:'sm', variant:'secondary', onClick:()=>setShowAddSection(false) }, 'Close')),
        addableSectionsErr && !addableSections.length
          ? React.createElement('div', { style:{ color:C.amber || '#b45309', fontSize:12, marginBottom:12 } }, 'Catalog load failed — showing local fallback. ', addableSectionsErr)
          : null,
        React.createElement('div', { style:{ display:'grid', gridTemplateColumns:isMobile ? '1fr' : 'repeat(3,minmax(0,1fr))', gap:12 } }, types.map(t => { const color = CMS_TYPE_COLOR[t.type] || CMS_TYPE_COLOR.content; return React.createElement('button', { key:t.type, onClick:()=>addSection(t.type), style:{ textAlign:'left', padding:16, borderRadius:14, border:`1px solid ${color}55`, background:color + '12', cursor:'pointer' } }, React.createElement('div', { style:{ color, fontWeight:900, fontSize:14, marginBottom:6 } }, t.label), React.createElement('div', { style:{ color:C.textSec, fontSize:12, lineHeight:1.45 } }, t.desc)); }))
      )
    );
  }

  function renderQuickAddPageModal() {
    if (!showQuickAddPage) return null;
    return React.createElement('div', {
      style:{ position:'fixed', inset:0, zIndex:270, background:'rgba(0,0,0,.52)', display:'flex', alignItems:'center', justifyContent:'center', padding:isMobile ? 0 : 24 }
    },
      React.createElement('div', {
        style:{ width:isMobile ? '100%' : 520, maxHeight:isMobile ? '100%' : '88vh', overflowY:'auto', background:C.surface, border:`1px solid ${C.border}`, borderRadius:isMobile ? 0 : 18, padding:18, display:'grid', gap:16 }
      },
        React.createElement('div', { style:{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 } },
          React.createElement('div', null,
            React.createElement('h3', { style:{ margin:0, color:C.text, fontSize:16 } }, 'Add New Page'),
            React.createElement('div', { style:{ color:C.textMut, fontSize:11, marginTop:4 } }, 'Creates starter sections and adds the page to navigation.')
          ),
          React.createElement(Btn, { size:'sm', variant:'secondary', onClick:()=>setShowQuickAddPage(false) }, 'Close')
        ),
        React.createElement('div', null,
          cmsFieldLabel('Page title'),
          cmsTextInput(quickPage.title, (value)=>setQuickPage((current)=>({ ...current, title:value })), null, 'e.g. Success Stories')
        ),
        React.createElement('div', null,
          cmsFieldLabel('URL slug'),
          React.createElement('div', { style:{ display:'flex', alignItems:'center' } },
            React.createElement('span', { style:{ height:38, display:'flex', alignItems:'center', padding:'0 10px', background:C.bg2, border:`1px solid ${C.border}`, borderRight:'none', borderRadius:'9px 0 0 9px', fontSize:13, color:C.textMut } }, '/'),
            React.createElement('input', {
              value:quickPage.slug,
              onChange:(event)=>setQuickPage((current)=>({ ...current, slug:event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })),
              placeholder:'auto-generated from title',
              style:{ flex:1, minWidth:0, height:38, boxSizing:'border-box', padding:'0 11px', border:`1px solid ${C.border}`, borderRadius:'0 9px 9px 0', background:C.bg, color:C.text, fontSize:13, outline:'none', fontFamily:'var(--font-mono)' }
            })
          )
        ),
        React.createElement('div', null,
          cmsFieldLabel('Template'),
          React.createElement('div', { style:{ display:'grid', gridTemplateColumns:isMobile ? '1fr' : '1fr 1fr', gap:8 } },
            PAGE_TEMPLATES.map((template) => {
              const active = quickPage.template_key === template.key;
              return React.createElement('button', {
                key:template.key,
                type:'button',
                onClick:()=>setQuickPage((current)=>({ ...current, template_key:template.key })),
                style:{ padding:'11px 12px', borderRadius:11, cursor:'pointer', textAlign:'left', border:`2px solid ${active ? C.purple : C.border}`, background:active ? C.purpleDim : C.bg, color:C.text, fontFamily:'var(--font-ui)' }
              },
                React.createElement('div', { style:{ display:'flex', alignItems:'center', gap:7, fontWeight:800, fontSize:12 } }, React.createElement(Icon, { name:template.icon, size:13, style:{ color:active ? C.purpleL : C.textSec } }), template.label),
                React.createElement('div', { style:{ color:C.textMut, fontSize:10, lineHeight:1.4, marginTop:4 } }, template.desc)
              );
            })
          )
        ),
        React.createElement('div', { style:{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 } },
          React.createElement(Btn, { variant:'secondary', onClick:()=>setShowQuickAddPage(false), disabled:quickPageSaving }, 'Cancel'),
          React.createElement(Btn, { onClick:quickAddPage, disabled:quickPageSaving || !String(quickPage.title || '').trim(), icon:'plus' }, quickPageSaving ? 'Creating…' : 'Create Page')
        )
      )
    );
  }

  function renderCopyModal() {
    if (!showCopyModal || !selected) return null;
    return React.createElement('div', {
      style: { position:'fixed', inset:0, zIndex:260, background:'rgba(0,0,0,.5)', display:'flex', alignItems:'center', justifyContent:'center', padding:isMobile ? 0 : 24 }
    },
      React.createElement('div', {
        style: { width:isMobile ? '100%' : 440, background:C.surface, border:`1px solid ${C.border}`, borderRadius:isMobile ? 0 : 18, padding:18, display:'grid', gap:14 }
      },
        React.createElement('div', { style:{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12 } },
          React.createElement('h3', { style:{ margin:0, color:C.text, fontSize:16 } }, 'Copy section to page'),
          React.createElement(Btn, { size:'sm', variant:'secondary', onClick:()=>setShowCopyModal(false) }, 'Close')
        ),
        React.createElement('div', { style:{ color:C.textSec, fontSize:13, lineHeight:1.5 } },
          'Duplicates "', selected.heading || selected.section_key, '" onto another page. The original stays on ', route, '.'
        ),
        React.createElement('label', { style:{ display:'grid', gap:6, fontSize:11, fontWeight:900, color:C.textSec, letterSpacing:'.08em', textTransform:'uppercase' } },
          'Target page',
          React.createElement('select', {
            value: copyTargetRoute,
            onChange: (e) => setCopyTargetRoute(e.target.value),
            style: { height:40, borderRadius:10, border:`1px solid ${C.border}`, background:C.bg, color:C.text, padding:'0 10px', fontFamily:'var(--font-ui)' }
          }, copyPages.map((p) => React.createElement('option', { key:p.route_path, value:p.route_path }, (p.title || p.route_path) + ' (' + p.route_path + ')')))
        ),
        React.createElement('label', { style:{ display:'grid', gap:6, fontSize:11, fontWeight:900, color:C.textSec, letterSpacing:'.08em', textTransform:'uppercase' } },
          'Place after',
          React.createElement('select', {
            value: copyInsertAfter,
            onChange: (e) => setCopyInsertAfter(e.target.value),
            style: { height:40, borderRadius:10, border:`1px solid ${C.border}`, background:C.bg, color:C.text, padding:'0 10px', fontFamily:'var(--font-ui)' }
          },
            React.createElement('option', { value:'' }, 'End of page'),
            copyTargetSections.map((s) => React.createElement('option', { key:s.section_key, value:s.section_key },
              (s.heading || s.section_key) + ' · ' + (s.section_type || '')
            ))
          )
        ),
        React.createElement('div', { style:{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 } },
          React.createElement(Btn, { variant:'secondary', onClick:()=>setShowCopyModal(false) }, 'Cancel'),
          React.createElement(Btn, { onClick:copySectionToPage, disabled:busy }, busy ? 'Copying…' : 'Copy section')
        )
      )
    );
  }

  return { renderImagePicker, renderAddSectionModal, renderQuickAddPageModal, renderCopyModal };
}

Object.assign(window, {
  cmsBindEditorModals,
});
