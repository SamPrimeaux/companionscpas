// CMS page-editor inspector panel (Babel global).

function cmsBindEditorInspector(ed) {
  const {
    onNavigate,
    pageData,
    setPageData,
    selectedField,
    setSelectedField,
    selectedBlockKey,
    setSelectedBlockKey,
    chromeTarget,
    previewMode,
    setPreviewMode,
    setMobileTab,
    busy,
    setBusy,
    editorCatalog,
    assets,
    setPagesList,
    setHasUnsaved,
    isDesktop,
    isMobile,
    route,
    notify,
    ctaActions,
    selected,
    bumpPreview,
    collapseInspector,
    postHighlight,
    saveSectionObject,
    saveSelected,
    setField,
    setFieldAndSave,
    selectedBlock,
    setBlockField,
    setBlockConfigPatch,
    saveSelectedBlock,
    persistBlock,
    addCard,
    deleteCard,
    nudgeCard,
    publishPage,
    setPageTheme,
    deleteSection,
    openCopyModal,
    openImagePicker,
    setConfigPatch,
    patchConfigCard,
    setConfigCardLocal,
    askAgent,
    pageTitle,
    liveUrl,
    renderFooterChromeSettings,
  } = ed;

  function renderPresetRow(label, value, options, onPick) {
    return React.createElement('div', { key: label },
      cmsFieldLabel(label),
      React.createElement('div', { style:{ display:'flex', flexWrap:'wrap', gap:6 } },
        options.map(opt => React.createElement('button', {
          key: opt.value,
          type: 'button',
          onClick: () => onPick(opt.value),
          style: {
            padding: '6px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer',
            border: `1px solid ${value === opt.value ? C.purple : C.border}`,
            background: value === opt.value ? C.purpleDim : C.bg,
            color: value === opt.value ? C.purpleL : C.textSec,
            fontFamily: 'var(--font-ui)'
          }
        }, opt.label))
      )
    );
  }

  function parsePaymentMethods(cfg) {
    let raw = cfg?.payment_methods_json ?? cfg?.payment_methods;
    if (typeof raw === 'string') {
      try { raw = JSON.parse(raw); } catch { raw = null; }
    }
    if (Array.isArray(raw) && raw.length) {
      return raw.map((m) => {
        const tip = (m.tooltip != null && String(m.tooltip).trim())
          ? String(m.tooltip).trim()
          : String(m.label || '').trim();
        return {
          ...m,
          label: m.label != null ? m.label : '',
          tooltip: tip,
          show_label: m.show_label === true || m.show_label === 1 || m.show_label === '1',
          note: m.note != null ? m.note : '',
        };
      });
    }
    return [
      ...cmsDefaultPaymentMethods(editorCatalog),
    ];
  }

  function renderPaymentMethodsEditor(cfg) {
    const methods = parsePaymentMethods(cfg);
    const writeMethods = (next, saveNow) => {
      const nextCfg = { ...cmsParseConfig(selected), payment_methods_json: next };
      const nextSec = { ...selected, config_json: JSON.stringify(nextCfg) };
      setPageData((prev) => ({
        ...prev,
        sections: (prev.sections || []).map((s) => (s.section_key === selected.section_key ? nextSec : s)),
      }));
      setHasUnsaved(true);
      if (saveNow) {
        saveSectionObject(nextSec, true)
          .then(() => bumpPreview())
          .catch((e) => notify(e.message || 'Could not save payment buttons', 'error'));
      }
    };
    const patchMethod = (idx, patch, saveNow = false) => {
      const next = methods.map((m, i) => (i === idx ? { ...m, ...patch } : m));
      writeMethods(next, saveNow);
    };
    const moveMethod = (idx, dir) => {
      const j = idx + dir;
      if (j < 0 || j >= methods.length) return;
      const next = methods.slice();
      const tmp = next[idx];
      next[idx] = next[j];
      next[j] = tmp;
      writeMethods(next, true);
    };
    const colorField = (idx, m, key, label) => React.createElement('div', { key: key, style:{ display:'grid', gap:4 } },
      cmsFieldLabel(label),
      React.createElement('div', { style:{ display:'flex', gap:8, alignItems:'center' } },
        React.createElement('input', {
          type: 'color',
          value: /^#[0-9a-fA-F]{6}$/.test(String(m[key] || '')) ? m[key] : '#ffffff',
          onChange: (e) => patchMethod(idx, { [key]: e.target.value }, true),
          style: { width:36, height:28, border:'none', background:'transparent', cursor:'pointer' }
        }),
        cmsTextInput(m[key] || '', (v) => patchMethod(idx, { [key]: v }, false), () => saveSelected(true), '#hex or rgb()')
      )
    );

    return React.createElement('div', { style:{ display:'grid', gap:12 } },
      React.createElement('h4', { style:groupTitleStyle() }, 'Payment buttons'),
      React.createElement('div', { style:{ fontSize:11, color:C.textMut, lineHeight:1.45 } },
        'Logo-first buttons. Tooltip is hover/accessibility text. Optional on-button label stays off unless you turn it on. Publish Live — no worker deploy.'
      ),
      methods.map((m, idx) => React.createElement('div', {
        key: m.id || idx,
        style: {
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          padding: 12,
          background: C.bg,
          display: 'grid',
          gap: 10,
        }
      },
        React.createElement('div', { style:{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 } },
          React.createElement('label', { style:{ display:'flex', alignItems:'center', gap:8, fontWeight:800, fontSize:13, color:C.text, cursor:'pointer' } },
            React.createElement('input', {
              type: 'checkbox',
              checked: m.enabled !== false && m.enabled !== 0 && m.enabled !== '0',
              onChange: (e) => patchMethod(idx, { enabled: e.target.checked }, true)
            }),
            m.id || ('method_' + idx)
          ),
          React.createElement('div', { style:{ display:'flex', gap:4 } },
            React.createElement('button', { type:'button', title:'Move up', onClick:() => moveMethod(idx, -1), style:{ width:28, height:28, borderRadius:8, border:`1px solid ${C.border}`, background:C.surface, cursor:'pointer' } }, '↑'),
            React.createElement('button', { type:'button', title:'Move down', onClick:() => moveMethod(idx, 1), style:{ width:28, height:28, borderRadius:8, border:`1px solid ${C.border}`, background:C.surface, cursor:'pointer' } }, '↓')
          )
        ),
        React.createElement('div', {
          title: m.tooltip || m.id || '',
          style:{
          display:'flex', flexDirection:'column', alignItems:'center', gap:6, padding:'12px 10px', borderRadius:12,
          background: m.background || '#fff', border:`1.5px solid ${m.border_color || '#ddd'}`, color: m.text_color || '#111'
        } },
          m.logo_url ? React.createElement('img', { src: m.logo_url, alt:'', style:{ height: Number(m.logo_height)||22, width:'auto', maxWidth:'70%' } }) : null,
          (m.show_label && m.label) ? React.createElement('div', { style:{ fontWeight:800, fontSize:12, textAlign:'center' } }, m.label) : null,
          m.note ? React.createElement('div', { style:{ fontSize:10, fontWeight:700, letterSpacing:'.06em', textTransform:'uppercase', color: m.note_color || 'inherit', opacity:0.85 } }, m.note) : null
        ),
        React.createElement('div', null,
          cmsFieldLabel('Tooltip (hover / accessibility)'),
          cmsTextInput(m.tooltip || '', (v) => patchMethod(idx, { tooltip: v }, false), () => saveSelected(true), 'Shown on hover')
        ),
        React.createElement('label', { style:{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:C.textSec, cursor:'pointer' } },
          React.createElement('input', {
            type: 'checkbox',
            checked: !!m.show_label,
            onChange: (e) => patchMethod(idx, { show_label: e.target.checked }, true)
          }),
          'Show label text on button'
        ),
        m.show_label && React.createElement('div', null,
          cmsFieldLabel('On-button label'),
          cmsTextInput(m.label || '', (v) => patchMethod(idx, { label: v }, false), () => saveSelected(true), 'Optional visible text')
        ),
        React.createElement('div', null, cmsFieldLabel('Note (optional)'), cmsTextInput(m.note || '', (v) => patchMethod(idx, { note: v }, false), () => saveSelected(true), 'fee-free')),
        m.action !== 'donate' && React.createElement('div', null,
          cmsFieldLabel('URL'),
          cmsTextInput(m.url || '', (v) => patchMethod(idx, { url: v }, false), () => saveSelected(true), 'https://…', true)
        ),
        m.action === 'donate' && React.createElement('div', { style:{ fontSize:11, color:C.textMut } }, 'Opens the in-site donation modal (Stripe).'),
        React.createElement('div', null, cmsFieldLabel('Logo URL'), cmsTextInput(m.logo_url || '', (v) => patchMethod(idx, { logo_url: v }, false), () => saveSelected(true), 'https://assets…', true)),
        React.createElement('div', null,
          cmsFieldLabel('Logo height (px)'),
          cmsTextInput(String(m.logo_height || 22), (v) => patchMethod(idx, { logo_height: Number(v) || 22 }, false), () => saveSelected(true), '22')
        ),
        React.createElement('div', { style:{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 } },
          colorField(idx, m, 'background', 'Background'),
          colorField(idx, m, 'border_color', 'Border'),
          colorField(idx, m, 'text_color', 'Text'),
          colorField(idx, m, 'note_color', 'Note color')
        )
      ))
    );
  }

  function savePageChrome(patch) {
    setBusy(true);
    return fetch('/api/cms/page/chrome', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ route_path: route, ...patch }),
    })
      .then((res) => res.json().then((data) => ({ res, data })))
      .then(({ res, data }) => {
        if (!res.ok || !data.success) throw new Error(data.error || 'Chrome update failed');
        setPageData((prev) => ({
          ...prev,
          page: { ...(prev.page || {}), ...(data.page || patch) },
        }));
        setPagesList((list) => list.map((p) => (
          p.route_path === route ? { ...p, ...(data.page || patch) } : p
        )));
        bumpPreview();
        notify(data.message || 'Header/footer updated sitewide');
        return data;
      })
      .catch((e) => {
        notify(e.message || 'Could not update navigation', 'error');
        throw e;
      })
      .finally(() => setBusy(false));
  }

  function renderPageSettings() {
    const pageThemeRaw = String(pageData.page?.theme || 'plum_glass').toLowerCase().replace(/-/g, '_');
    const pageTheme = pageThemeRaw === 'light' ? 'light' : pageThemeRaw === 'dark' ? 'dark' : 'plum_glass';
    const themeOptions = [
      { value:'plum_glass', label:'Plum' },
      { value:'light', label:'Light' },
      { value:'dark', label:'Dark' },
    ];
    const deviceOptions = ['desktop', 'tablet', 'mobile'];
    const navVisible = pageData.page?.nav_visible !== 0 && pageData.page?.nav_visible !== false;
    const navLabel = pageData.page?.nav_label || '';
    const navPlacement = String(pageData.page?.nav_placement || 'more').toLowerCase();
    const sortOrder = pageData.page?.sort_order ?? 50;
    const placementOptions = [
      { value: 'primary', label: 'Primary bar' },
      { value: 'more', label: 'More menu' },
      { value: 'cta', label: 'Donate button' },
      { value: 'footer_only', label: 'Footer only' },
      { value: 'none', label: 'Hidden from chrome' },
    ];

    return React.createElement('div', {
      style:{ display:'grid', gap:14, padding:13, borderRadius:13, border:`1px solid ${C.border}`, background:C.bg }
    },
      React.createElement('div', { style:{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10 } },
        React.createElement('div', null,
          React.createElement('div', { style:{ fontSize:11, fontWeight:900, color:C.textSec, letterSpacing:'.1em', textTransform:'uppercase' } }, 'Page Settings'),
          React.createElement('div', { style:{ fontSize:11, color:C.textMut, marginTop:4 } }, pageTitle, ' · ', route)
        ),
        React.createElement('button', {
          type:'button',
          title:`Open ${liveUrl}`,
          onClick:()=>window.open(liveUrl, '_blank', 'noopener,noreferrer'),
          style:{ width:30, height:30, borderRadius:8, border:`1px solid ${C.border}`, background:C.surface, color:C.textSec, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }
        }, React.createElement(Icon, { name:'eye', size:14 }))
      ),
      React.createElement('div', {
        style:{ display:'grid', gap:12, padding:12, borderRadius:12, border:`1px solid ${C.purple}44`, background:'rgba(124,58,237,0.06)' }
      },
        React.createElement('div', { style:{ fontSize:11, fontWeight:900, color:C.purpleL, letterSpacing:'.08em', textTransform:'uppercase' } }, 'Header & Footer (sitewide)'),
        React.createElement('div', { style:{ fontSize:11, color:C.textMut, lineHeight:1.45 } },
          'Controls live navigation from this page row in the database. Publish republishes the whole site header/footer.'
        ),
        React.createElement('label', { style:{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:C.text, cursor:'pointer' } },
          React.createElement('input', {
            type:'checkbox',
            checked: !!navVisible,
            disabled: busy,
            onChange:(e) => {
              const next = e.target.checked ? 1 : 0;
              setPageData((prev) => ({ ...prev, page: { ...(prev.page || {}), nav_visible: next } }));
              savePageChrome({ nav_visible: next });
            },
          }),
          'Show in site navigation'
        ),
        React.createElement('div', null,
          cmsFieldLabel('Nav label'),
          cmsTextInput(
            navLabel,
            (v) => setPageData((prev) => ({ ...prev, page: { ...(prev.page || {}), nav_label: v } })),
            () => savePageChrome({ nav_label: String(pageData.page?.nav_label || '').trim() }),
            'e.g. About Us'
          )
        ),
        React.createElement('div', null,
          cmsFieldLabel('Placement'),
          React.createElement('select', {
            value: navPlacement,
            disabled: busy,
            onChange: (e) => {
              const v = e.target.value;
              setPageData((prev) => ({ ...prev, page: { ...(prev.page || {}), nav_placement: v } }));
              savePageChrome({ nav_placement: v });
            },
            style: {
              width: '100%', boxSizing: 'border-box', padding: '9px 11px', borderRadius: 9,
              border: `1px solid ${C.border}`, background: C.surface, color: C.text, fontSize: 13,
            },
          }, placementOptions.map((o) => React.createElement('option', { key: o.value, value: o.value }, o.label)))
        ),
        React.createElement('div', null,
          cmsFieldLabel('Sort order'),
          cmsTextInput(
            String(sortOrder),
            (v) => setPageData((prev) => ({ ...prev, page: { ...(prev.page || {}), sort_order: v } })),
            () => {
              const n = Number(pageData.page?.sort_order);
              if (!Number.isFinite(n)) return notify('Sort order must be a number', 'error');
              savePageChrome({ sort_order: n });
            },
            '10',
            true
          )
        )
      ),
      React.createElement('div', null,
        cmsFieldLabel('Page theme'),
        React.createElement('div', { style:{ display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:6 } },
          themeOptions.map((option) => React.createElement('button', {
            key:option.value,
            type:'button',
            disabled:busy,
            onClick:()=>{ if (pageTheme !== option.value) setPageTheme(option.value); },
            style:{
              minHeight:34, padding:'6px 8px', borderRadius:9, fontSize:11, fontWeight:800,
              cursor:busy ? 'wait' : 'pointer', fontFamily:'var(--font-ui)',
              border:`1px solid ${pageTheme === option.value ? C.purple : C.border}`,
              background:pageTheme === option.value ? C.purpleDim : C.surface,
              color:pageTheme === option.value ? C.purpleL : C.textSec
            }
          }, option.label))
        )
      ),
      isDesktop && React.createElement('div', null,
        cmsFieldLabel('Preview size'),
        React.createElement('div', { style:{ display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:6 } },
          deviceOptions.map((device) => React.createElement('button', {
            key:device,
            type:'button',
            onClick:()=>setPreviewMode(device),
            style:{
              minHeight:34, padding:'6px 8px', borderRadius:9, fontSize:11, fontWeight:800,
              cursor:'pointer', textTransform:'capitalize', fontFamily:'var(--font-ui)',
              border:`1px solid ${previewMode === device ? C.purple : C.border}`,
              background:previewMode === device ? C.purpleDim : C.surface,
              color:previewMode === device ? C.purpleL : C.textSec
            }
          }, device))
        )
      )
    );
  }

  function renderInspector(compact=false) {
    if (!selected) {
      const chromeTitle = chromeTarget === 'footer' ? 'Footer' : chromeTarget === 'header' ? 'Header' : 'Page editor';
      const chromeSub = chromeTarget === 'footer'
        ? 'Sitewide footer content'
        : chromeTarget === 'header'
          ? 'Sitewide navigation for this page'
          : 'No section selected';
      return React.createElement('div', { className:'cms-inspector-panel', style:{ height:'100%', display:'flex', flexDirection:'column', background:C.surface } },
        React.createElement('div', { style:{ padding:16, borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 } },
          React.createElement('div', { style:{ minWidth:0 } },
            React.createElement('div', { style:{ color:C.text, fontSize:15, fontWeight:900, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' } }, chromeTitle),
            React.createElement('div', { style:{ color:C.textMut, fontSize:11, marginTop:3 } }, chromeSub)
          ),
          React.createElement('button', {
            type:'button', title:'Hide editor (Esc)',
            onClick:()=>{ if (isMobile) setMobileTab('preview'); else collapseInspector(); },
            style:{ width:28, height:28, borderRadius:8, border:`1px solid ${C.border}`, background:C.bg, color:C.textSec, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }
          }, React.createElement(Icon, { name:'close', size:14 }))
        ),
        React.createElement('div', { style:{ padding:16, overflowY:'auto', flex:1, display:'grid', alignContent:'start', gap:16 } },
          chromeTarget === 'footer'
            ? renderFooterChromeSettings()
            : React.createElement(React.Fragment, null,
                renderPageSettings(),
                !chromeTarget && React.createElement('div', { style:{ padding:14, borderRadius:12, border:`1px dashed ${C.border}`, color:C.textMut, fontSize:12, lineHeight:1.55 } }, 'Select Header, Footer, or a section in the left panel — or click content in the preview — to edit.')
              )
        )
      );
    }
    const cfg = cmsParseConfig(selected);
    const configCards = cmsConfigCards(selected);
    const usesConfigCards = !!configCards?.length;
    const needsImage = !usesConfigCards && (
      ['hero','text_image','text_image_split','contact_hero','contact_team','campaign_grid','donate_payment_hero','donate_campaign_grid','split_info_card'].includes(selected.section_type)
      || !!(selected.image_url && String(selected.image_url).trim())
    );
    const isPaymentHero = String(selected.section_type || '') === 'donate_payment_hero';
    const isRawHtml = String(selected.section_type || '') === 'raw_html';
    const isEmbeddedForm = String(selected.section_type || '') === 'embedded_form';
    const isSplitInfoCard = String(selected.section_type || '') === 'split_info_card';
    const splitSuppliesText = Array.isArray(cfg.supplies)
      ? cfg.supplies.join('\n')
      : String(cfg.supplies || '');
    const splitContact = (cfg.contact && typeof cfg.contact === 'object') ? cfg.contact : {};
    const sectionBlocks = (pageData.blocks || []).filter(
      (b) => cmsNormalizeSectionKey(b.section_key) === cmsNormalizeSectionKey(selected.section_key)
    );
    const usesCards = !usesConfigCards && !isRawHtml && (CMS_FEATURE_CARD_SECTION_TYPES.includes(selected.section_type) || sectionBlocks.length > 0);
    const field = (label, key, type='text', opts={}) => React.createElement('div', { key, id: 'cms-field-' + key }, cmsFieldLabel(label), type === 'textarea' ? cmsTextArea(selected[key], v=>{ setField(key,v); setHasUnsaved(true); }, ()=>{ saveSelected(true).then(()=>setHasUnsaved(false)); }, opts.rows || 5) : cmsTextInput(selected[key], v=>{ setField(key,v); setHasUnsaved(true); }, ()=>{ saveSelected(true).then(()=>setHasUnsaved(false)); }, opts.placeholder, opts.mono));

    const isBlockField = selectedField === 'block_title' || selectedField === 'block_body' || selectedField === 'block_subtitle' || selectedField === 'block_image';
    const isConfigCardField = selectedField === 'card_image';
    const resolvedCardKey = selectedBlockKey
      || (usesConfigCards ? String(configCards[0].id || configCards[0].title || '') : '');
    const selectedConfigCard = usesConfigCards && resolvedCardKey
      ? configCards.find((c) => String(c.id || c.title || '') === String(resolvedCardKey)) || configCards[0]
      : null;
    const showElementFocus = !!selectedField && !(isConfigCardField && usesConfigCards);
    const elementLabel = CMS_FIELD_LABELS[selectedField] || selectedField;
    const isTextEl = CMS_TEXT_FIELDS.has(selectedField) && !isBlockField && !isConfigCardField;
    const isImageEl = CMS_IMAGE_FIELDS.has(selectedField) && !isBlockField && !isConfigCardField;

    const styleTweaks = (isTextEl || isImageEl) && React.createElement('div', { style:{ display:'grid', gap:12 } },
      isTextEl && renderPresetRow('Size', cfg.text_size || 'm', [
        { value:'s', label:'S' }, { value:'m', label:'M' }, { value:'l', label:'L' }
      ], v => setConfigPatch({ text_size: v })),
      isTextEl && renderPresetRow('Align', cfg.text_align || 'left', [
        { value:'left', label:'Left' }, { value:'center', label:'Center' }, { value:'right', label:'Right' }
      ], v => setConfigPatch({ text_align: v })),
      isTextEl && renderPresetRow('Weight', cfg.text_weight || 'bold', [
        { value:'normal', label:'Regular' }, { value:'bold', label:'Bold' }
      ], v => setConfigPatch({ text_weight: v })),
      isImageEl && renderPresetRow('Focal point', cfg.image_object_position || 'center', [
        { value:'center', label:'Center' }, { value:'top', label:'Top' }, { value:'left', label:'Left' }, { value:'right', label:'Right' }
      ], v => setConfigPatch({ image_object_position: v }))
    );

    const cardEditId = selectedConfigCard
      ? String(selectedConfigCard.id || selectedConfigCard.title || resolvedCardKey || '')
      : '';

    const configCardFields = selectedConfigCard && React.createElement('div', { style:{ display:'grid', gap:12, padding:12, borderRadius:12, border:`1px solid ${C.purple}55`, background:'rgba(124,58,237,0.05)' } },
      React.createElement('div', { style:{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 } },
        React.createElement('div', { style:{ fontSize:12, fontWeight:800, color:C.purpleL } },
          'Editing card: ', selectedConfigCard.title || cardEditId || 'card'
        ),
        React.createElement('div', { style:{ fontSize:10, color:C.textMut, fontFamily:'var(--font-mono)' } }, cardEditId)
      ),
      React.createElement('div', null,
        cmsFieldLabel('Eyebrow'),
        cmsTextInput(selectedConfigCard.eyebrow || '', (v) => setConfigCardLocal(cardEditId, { eyebrow: v }), () => patchConfigCard(cardEditId, { eyebrow: selectedConfigCard.eyebrow || '' }))
      ),
      React.createElement('div', null,
        cmsFieldLabel('Title'),
        cmsTextInput(selectedConfigCard.title || '', (v) => setConfigCardLocal(cardEditId, { title: v }), () => patchConfigCard(cardEditId, { title: selectedConfigCard.title || '' }), 'e.g. Wishlist')
      ),
      React.createElement('div', null,
        cmsFieldLabel('Image URL'),
        React.createElement('div', { style:{ display:'flex', gap:8 } },
          React.createElement('div', { style:{ flex:1 } },
            cmsTextInput(selectedConfigCard.image || '', (v) => setConfigCardLocal(cardEditId, { image: v }), () => patchConfigCard(cardEditId, { image: selectedConfigCard.image || '' }), cmsUrlPlaceholder(editorCatalog, 'cdn'), true)
          ),
          React.createElement(Btn, {
            size:'sm', variant:'secondary', icon:'image',
            onClick: () => openImagePicker({ kind: 'config_card', cardId: cardEditId }),
          }, 'Pick')
        )
      ),
      selectedConfigCard.image && React.createElement('div', { style:{ width:'100%', maxHeight:220, borderRadius:12, border:`1px solid ${C.border}`, background:C.bg, overflow:'auto', display:'flex', alignItems:'center', justifyContent:'center' } },
        React.createElement('img', { src: selectedConfigCard.image, alt: '', style:{ width:'100%', height:'auto', maxHeight:220, objectFit:'contain', display:'block' } })
      ),
      React.createElement('div', null,
        cmsFieldLabel('CTA label'),
        cmsTextInput(selectedConfigCard.cta_label || '', (v) => setConfigCardLocal(cardEditId, { cta_label: v }), () => patchConfigCard(cardEditId, { cta_label: selectedConfigCard.cta_label || '' }), 'Vote Now')
      ),
      React.createElement('div', null,
        cmsFieldLabel('CTA URL'),
        cmsTextInput(selectedConfigCard.cta_href || '', (v) => setConfigCardLocal(cardEditId, { cta_href: v }), () => patchConfigCard(cardEditId, { cta_href: selectedConfigCard.cta_href || '' }), cmsUrlPlaceholder(editorCatalog, 'page'), true)
      ),
      React.createElement('label', { style:{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:C.textSec, cursor:'pointer' } },
        React.createElement('input', {
          type: 'checkbox',
          checked: !!selectedConfigCard.cta_external,
          onChange: (e) => patchConfigCard(cardEditId, { cta_external: e.target.checked }),
        }),
        'Open CTA in new tab'
      )
    );

    const blockPanel = isBlockField && React.createElement('div', { style:{ display:'grid', gap:12 } },
      selectedBlock
        ? React.createElement(React.Fragment, null,
            React.createElement('div', { style:{ fontSize:11, color:C.textMut, fontFamily:'var(--font-mono)' } }, selectedBlock.block_key),
            React.createElement('div', null,
              cmsFieldLabel('Title'),
              cmsTextInput(selectedBlock.title, v => { setBlockField('title', v); setHasUnsaved(true); }, () => { saveSelectedBlock(true).then(() => setHasUnsaved(false)); })
            ),
            React.createElement('div', null,
              cmsFieldLabel('Subtitle'),
              cmsTextInput(selectedBlock.subtitle, v => { setBlockField('subtitle', v); setHasUnsaved(true); }, () => { saveSelectedBlock(true).then(() => setHasUnsaved(false)); })
            ),
            React.createElement('div', null,
              cmsFieldLabel('Body'),
              cmsTextArea(selectedBlock.body, v => { setBlockField('body', v); setHasUnsaved(true); }, () => { saveSelectedBlock(true).then(() => setHasUnsaved(false)); }, 5)
            ),
            React.createElement('div', null,
              cmsFieldLabel('Image URL'),
              React.createElement('div', { style:{ display:'flex', gap:8 } },
                React.createElement('div', { style:{ flex:1 } },
                  cmsTextInput(selectedBlock.image_url, v => setBlockField('image_url', v), () => saveSelectedBlock(true), cmsUrlPlaceholder(editorCatalog, 'cdn'), true)
                ),
                React.createElement(Btn, {
                  size:'sm', variant:'secondary', icon:'image',
                  onClick: () => openImagePicker({ kind: 'block', blockKey: selectedBlock.block_key }),
                }, 'Pick')
              )
            ),
            selectedBlock.image_url && React.createElement('div', { style:{ width:'100%', maxHeight:220, borderRadius:12, border:`1px solid ${C.border}`, background:C.bg, overflow:'auto', display:'flex', alignItems:'center', justifyContent:'center' } },
              /\.(mp4|webm|mov)(\?|$)/i.test(String(selectedBlock.image_url || ''))
                ? React.createElement('video', { src: selectedBlock.image_url, controls: true, playsInline: true, style:{ width:'100%', height:'auto', maxHeight:220, display:'block' } })
                : React.createElement('img', { src: selectedBlock.image_url, alt: '', style:{ width:'100%', height:'auto', maxHeight:220, objectFit:'contain', display:'block' } })
            ),
            renderPresetRow('Card crop', (() => {
              let cfg = {};
              try { cfg = JSON.parse(selectedBlock.config_json || '{}'); } catch { cfg = {}; }
              return cfg.image_display || '';
            })(), [{ value: '', label: 'Section default' }, ...CMS_IMAGE_DISPLAY_PRESETS], (v) => {
              setBlockConfigPatch({ image_display: v });
              let cfg = {};
              try { cfg = JSON.parse(selectedBlock.config_json || '{}'); } catch { cfg = {}; }
              persistBlock({ ...selectedBlock, config_json: JSON.stringify({ ...cfg, image_display: v }) })
                .then(() => { bumpPreview(); setHasUnsaved(false); })
                .catch((e) => notify(e.message, 'error'));
            })
          )
        : React.createElement('div', { style:{ color:C.textMut, fontSize:13 } }, 'Block not found in page data. Try reloading the editor.')
    );

    const elementPanel = showElementFocus && React.createElement('div', { style:{ display:'grid', gap:14 } },
      React.createElement('div', { style:{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 } },
        React.createElement('div', { style:{ fontSize:12, color:C.textSec } },
          React.createElement('span', { style:{ fontWeight:800, color:C.purpleL } }, selected.section_type || 'section'),
          React.createElement('span', { style:{ margin:'0 6px', color:C.textMut } }, '/'),
          React.createElement('span', { style:{ fontWeight:800, color:C.text } }, elementLabel)
        ),
        React.createElement('button', {
          type:'button',
          onClick:()=>{ setSelectedField(null); setSelectedBlockKey(null); postHighlight(selected.section_key, null); },
          style:{ background:'none', border:`1px solid ${C.border}`, borderRadius:8, padding:'4px 8px', fontSize:11, cursor:'pointer', color:C.textSec }
        }, 'Full section')
      ),
      isBlockField ? blockPanel : React.createElement(React.Fragment, null,
        selectedField === 'heading' && field('Heading', 'heading'),
        selectedField === 'eyebrow' && field('Eyebrow', 'eyebrow'),
        selectedField === 'subheading' && field('Subheading', 'subheading'),
        selectedField === 'body' && field('Body', 'body', 'textarea', { rows: 6 }),
        selectedField === 'image_url' && renderMediaControls(),
        selectedField === 'cta_label' && renderCtaFields('cta_label', 'cta_href', 'Primary CTA'),
        selectedField === 'cta_secondary_label' && renderCtaFields('cta_secondary_label', 'cta_secondary_href', 'Secondary CTA'),
        styleTweaks
      )
    );

    const configCardsPanel = usesConfigCards && React.createElement('div', { style:{ display:'grid', gap:10 } },
      React.createElement('h4', { style:groupTitleStyle() }, 'Campaign cards'),
      React.createElement('div', { style:{ fontSize:12, color:C.textMut, lineHeight:1.45 } },
        'Card title, image, and CTA live here (not in section Eyebrow/Heading). Select a card to edit.'
      ),
      configCards.map((card) => {
        const cardId = String(card.id || card.title || '');
        const active = String(resolvedCardKey) === cardId;
        return React.createElement('button', {
          key: cardId || card.title,
          type: 'button',
          onClick: () => {
            setSelectedBlockKey(cardId);
            setSelectedField('card_image');
            postHighlight(selected.section_key, 'card_image', cardId);
            setMobileTab('edit');
          },
          style: {
            textAlign: 'left',
            padding: '10px 12px',
            borderRadius: 10,
            border: `1px solid ${active ? C.purple : C.border}`,
            background: active ? 'rgba(124,58,237,0.08)' : C.bg,
            cursor: 'pointer',
            display: 'grid',
            gridTemplateColumns: '56px 1fr',
            gap: 10,
            alignItems: 'center',
          },
        },
          React.createElement('div', {
            style: {
              width: 56, height: 56, borderRadius: 8, overflow: 'hidden',
              border: `1px solid ${C.border}`, background: C.bg2 || C.bg, flexShrink: 0,
            },
          },
            card.image
              ? React.createElement('img', { src: card.image, alt: '', style: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' } })
              : React.createElement('div', { style: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: C.textMut } }, 'No img')
          ),
          React.createElement('div', { style: { minWidth: 0 } },
            React.createElement('div', { style:{ fontWeight:800, color:C.text, fontSize:13 } }, card.title || cardId || 'Card'),
            React.createElement('div', { style:{ color:C.textMut, fontSize:11, marginTop:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' } },
              [card.eyebrow, card.cta_label].filter(Boolean).join(' · ') || 'Edit title, image, CTA'
            )
          )
        );
      }),
      configCardFields
    );

    const fullPanel = !showElementFocus && React.createElement(React.Fragment, null,
      isEmbeddedForm && React.createElement('div', { style:{ display:'grid', gap:12 } },
        React.createElement('h4', { style:groupTitleStyle() }, 'Forms Studio embed'),
        React.createElement('div', { style:{ fontSize:12, color:C.textMut, lineHeight:1.45 } },
          'This section renders a published form from CMS → Forms. Edit fields there; Publish the form, then Publish this page.'
        ),
        React.createElement('div', null,
          cmsFieldLabel('Form key'),
          cmsTextInput(
            cfg.form_key || '',
            (v) => setConfigPatch({ form_key: String(v || '').trim() }),
            (e) => setConfigPatch({ form_key: String(e?.target?.value ?? '').trim() }),
            'join_our_team'
          )
        ),
        React.createElement('a', {
          href: '/dashboard/cms/forms',
          style: { fontSize:12, fontWeight:700, color:C.purpleL },
        }, 'Open Forms Studio →')
      ),
      isRawHtml && React.createElement('div', { style:{ display:'grid', gap:12 } },
        React.createElement('h4', { style:groupTitleStyle() }, 'Custom Code'),
        React.createElement('div', { style:{ fontSize:12, color:C.textMut, lineHeight:1.45 } },
          'Paste HTML here or load from a URL. Save stores HTML in site storage (R2) — not the database — then Publish writes the live page fragment and busts cache.'
        ),
        renderPresetRow('Source', (cfg.html_source === 'url' || (!cfg.html && !cfg.r2_key && cfg.source_url)) ? 'url' : 'paste', [
          { value:'paste', label:'Paste HTML' }, { value:'url', label:'From URL' }
        ], (v) => setConfigPatch({ html_source: v === 'url' ? 'url' : 'r2' })),
        ((cfg.html_source === 'url' || (!cfg.html && !cfg.r2_key && cfg.source_url && cfg.html_source !== 'paste' && cfg.html_source !== 'r2'))
          ? React.createElement('div', null,
              cmsFieldLabel('Source URL'),
              cmsTextInput(
                cfg.source_url || '',
                (v) => {
                  const nextCfg = { ...cmsParseConfig(selected), source_url: v, html_source: 'url' };
                  delete nextCfg.html;
                  const next = { ...selected, config_json: JSON.stringify(nextCfg) };
                  setPageData((prev) => ({
                    ...prev,
                    sections: (prev.sections || []).map((s) => (s.section_key === selected.section_key ? next : s)),
                  }));
                  setHasUnsaved(true);
                },
                (e) => setConfigPatch({ source_url: String(e?.target?.value ?? cfg.source_url ?? '').trim(), html_source: 'url' }),
                cmsUrlPlaceholder(editorCatalog, 'cdn'),
                true
              )
            )
          : React.createElement('div', null,
              cmsFieldLabel('HTML'),
              cmsTextArea(
                cfg.html || '',
                (v) => {
                  const nextCfg = { ...cmsParseConfig(selected), html: v, html_source: 'r2' };
                  const next = { ...selected, config_json: JSON.stringify(nextCfg) };
                  setPageData((prev) => ({
                    ...prev,
                    sections: (prev.sections || []).map((s) => (s.section_key === selected.section_key ? next : s)),
                  }));
                  setHasUnsaved(true);
                },
                (e) => setConfigPatch({
                  html: String(e?.target?.value ?? cfg.html ?? ''),
                  html_source: 'r2',
                }),
                16
              ),
              React.createElement('div', { style:{ fontSize:11, color:C.textMut, marginTop:6, lineHeight:1.4 } },
                cfg.r2_key
                  ? `Stored at ${cfg.r2_key}. Paste a fragment (section markup, not a full document).`
                  : 'Paste a fragment (section markup, not a full document). Save stores it in R2.'
              )
            )
        ),
        field('Label', 'heading')
      ),
      !isRawHtml && configCardsPanel,
      !isRawHtml && React.createElement('div', { style:{ display:'grid', gap:12 } },
        React.createElement('h4', { style:groupTitleStyle() }, usesConfigCards ? 'Section intro' : 'Content'),
        !usesConfigCards && field('Eyebrow','eyebrow'),
        field('Heading','heading'),
        !usesConfigCards && field('Subheading','subheading'),
        field('Body','body','textarea',{ rows:5 }),
        usesConfigCards && React.createElement('div', { style:{ fontSize:11, color:C.textMut, lineHeight:1.4 } },
          'Per-card titles (Wishlist, Wet Dog…) are under Campaign cards above — not these section fields.'
        )
      ),
      !isRawHtml && needsImage && renderMediaControls(),
      isSplitInfoCard && React.createElement('div', { style:{ display:'grid', gap:12 } },
        React.createElement('h4', { style:groupTitleStyle() }, 'Supplies list'),
        React.createElement('div', { style:{ fontSize:12, color:C.textMut, lineHeight:1.45 } },
          'One item per line. Shown as a vertical bullet list on the live page.'
        ),
        React.createElement('div', null,
          cmsFieldLabel('Items'),
          cmsTextArea(
            splitSuppliesText,
            (v) => {
              const nextCfg = { ...cmsParseConfig(selected), supplies: String(v || '').split(/\r?\n/) };
              const next = { ...selected, config_json: JSON.stringify(nextCfg) };
              setPageData((prev) => ({
                ...prev,
                sections: (prev.sections || []).map((s) => (s.section_key === selected.section_key ? next : s)),
              }));
              setHasUnsaved(true);
            },
            () => {
              const items = String(splitSuppliesText || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
              setConfigPatch({ supplies: items });
            },
            6
          )
        ),
        React.createElement('h4', { style:groupTitleStyle() }, 'Contact card'),
        React.createElement('div', null,
          cmsFieldLabel('Contact eyebrow'),
          cmsTextInput(
            splitContact.eyebrow || '',
            (v) => {
              const nextCfg = { ...cmsParseConfig(selected), contact: { ...splitContact, eyebrow: v } };
              const next = { ...selected, config_json: JSON.stringify(nextCfg) };
              setPageData((prev) => ({
                ...prev,
                sections: (prev.sections || []).map((s) => (s.section_key === selected.section_key ? next : s)),
              }));
              setHasUnsaved(true);
            },
            () => setConfigPatch({ contact: { ...cmsParseConfig(selected).contact, eyebrow: splitContact.eyebrow || '' } }),
            'Questions about fostering'
          )
        ),
        React.createElement('div', null,
          cmsFieldLabel('Contact name'),
          cmsTextInput(
            splitContact.name || '',
            (v) => {
              const nextCfg = { ...cmsParseConfig(selected), contact: { ...splitContact, name: v } };
              const next = { ...selected, config_json: JSON.stringify(nextCfg) };
              setPageData((prev) => ({
                ...prev,
                sections: (prev.sections || []).map((s) => (s.section_key === selected.section_key ? next : s)),
              }));
              setHasUnsaved(true);
            },
            () => setConfigPatch({ contact: { ...cmsParseConfig(selected).contact, name: splitContact.name || '' } }),
            'Amanda Norris'
          )
        ),
        React.createElement('div', null,
          cmsFieldLabel('Email'),
          cmsTextInput(
            splitContact.email || '',
            (v) => {
              const nextCfg = { ...cmsParseConfig(selected), contact: { ...splitContact, email: v } };
              const next = { ...selected, config_json: JSON.stringify(nextCfg) };
              setPageData((prev) => ({
                ...prev,
                sections: (prev.sections || []).map((s) => (s.section_key === selected.section_key ? next : s)),
              }));
              setHasUnsaved(true);
            },
            () => setConfigPatch({ contact: { ...cmsParseConfig(selected).contact, email: splitContact.email || '' } }),
            'name@example.org',
            true
          )
        ),
        React.createElement('div', null,
          cmsFieldLabel('Phone'),
          cmsTextInput(
            splitContact.phone || '',
            (v) => {
              const nextCfg = { ...cmsParseConfig(selected), contact: { ...splitContact, phone: v } };
              const next = { ...selected, config_json: JSON.stringify(nextCfg) };
              setPageData((prev) => ({
                ...prev,
                sections: (prev.sections || []).map((s) => (s.section_key === selected.section_key ? next : s)),
              }));
              setHasUnsaved(true);
            },
            () => setConfigPatch({ contact: { ...cmsParseConfig(selected).contact, phone: splitContact.phone || '' } }),
            '318-226-6624'
          )
        ),
        React.createElement('div', null,
          cmsFieldLabel('Image alt text'),
          cmsTextInput(
            cfg.image_alt || '',
            (v) => {
              const nextCfg = { ...cmsParseConfig(selected), image_alt: v };
              const next = { ...selected, config_json: JSON.stringify(nextCfg) };
              setPageData((prev) => ({
                ...prev,
                sections: (prev.sections || []).map((s) => (s.section_key === selected.section_key ? next : s)),
              }));
              setHasUnsaved(true);
            },
            () => setConfigPatch({ image_alt: cfg.image_alt || '' }),
            'Foster dog'
          )
        ),
        renderPresetRow('Image side', (cfg.image_position || 'left') === 'right' ? 'right' : 'left', [
          { value:'left', label:'Left' }, { value:'right', label:'Right' }
        ], (v) => setConfigPatch({ image_position: v }))
      ),
      isPaymentHero && renderPaymentMethodsEditor(cfg),
      isPaymentHero && React.createElement('div', { style:{ display:'grid', gap:12 } },
        React.createElement('h4', { style:groupTitleStyle() }, 'Media card'),
        renderPresetRow('Presentation', cfg.media_presentation || 'card', [
          { value:'card', label:'Logo card' }, { value:'photo', label:'Full photo' }
        ], v => setConfigPatch({ media_presentation: v })),
        React.createElement('div', null,
          cmsFieldLabel('Button gap'),
          cmsTextInput(cfg.button_gap || '1rem', v => setConfigPatch({ button_gap: v }), () => {}, '1rem')
        )
      ),
      usesCards && renderCmsFeatureCardsInspector({
        cfg,
        sectionBlocks,
        selectedBlockKey,
        busy,
        renderPresetRow,
        onAddCard: addCard,
        onSelectCard: (b) => {
          setSelectedBlockKey(b.block_key);
          setSelectedField('block_title');
          postHighlight(selected.section_key, 'block_title');
          setMobileTab('edit');
        },
        onNudgeCard: (key, dir) => nudgeCard(key, dir, selected),
        onDeleteCard: (b) => deleteCard(b, selected),
        onCrop: (v) => setConfigPatch({ image_display: v }),
        onColumns: (v) => setConfigPatch({ columns: v }),
      }),
      !isRawHtml && !usesConfigCards && !isSplitInfoCard && React.createElement('div', { style:{ display:'grid', gap:12 } },
        React.createElement('h4', { style:groupTitleStyle() }, 'Links'),
        renderCtaFields('cta_label', 'cta_href', 'Primary CTA'),
        renderCtaFields('cta_secondary_label', 'cta_secondary_href', 'Secondary CTA')
      ),
      !isRawHtml && React.createElement('div', { style:{ display:'grid', gap:12 } },
        React.createElement('h4', { style:groupTitleStyle() }, 'Section style'),
        renderPresetRow('Text size', cfg.text_size || 'm', [
          { value:'s', label:'S' }, { value:'m', label:'M' }, { value:'l', label:'L' }
        ], v => setConfigPatch({ text_size: v })),
        renderPresetRow('Text align', cfg.text_align || 'left', [
          { value:'left', label:'Left' }, { value:'center', label:'Center' }, { value:'right', label:'Right' }
        ], v => setConfigPatch({ text_align: v }))
      )
    );

    return React.createElement('div', { className:'cms-inspector-panel', style:{ height:'100%', display:'flex', flexDirection:'column', background:C.surface } },
      React.createElement('div', { style:{ padding:16, borderBottom:`1px solid ${C.border}` } },
        React.createElement('div', { style:{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10 } },
          React.createElement('div', { style:{ minWidth:0 } }, cmsTypeBadge(selected.section_type), React.createElement('div', { style:{ marginTop:8, color:C.text, fontSize:15, fontWeight:900, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' } }, selected.heading || selected.section_key)),
          React.createElement('div', { style:{ display:'flex', alignItems:'center', gap:8, flexShrink:0 } },
            React.createElement('label', { style:{ display:'flex', alignItems:'center', gap:6, color:C.textSec, fontSize:12, cursor:'pointer' } }, React.createElement('input', { type:'checkbox', checked:selected.is_visible !== 0, onChange:e=>setFieldAndSave('is_visible', e.target.checked ? 1 : 0) }), 'Visible'),
            React.createElement('button', {
              type: 'button',
              title: 'Hide editor (Esc)',
              onClick:()=>{ if (isMobile) setMobileTab('preview'); else collapseInspector(); },
              style: { width:28, height:28, borderRadius:8, border:`1px solid ${C.border}`, background:C.bg, color:C.textSec, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }
            }, React.createElement(Icon, { name:'close', size:14 }))
          )
        )
      ),
      React.createElement('div', { style:{ padding:16, overflowY:'auto', flex:1, display:'grid', gap:16 } },
        renderPageSettings(),
        React.createElement('div', { style:{ height:1, background:C.border } }),
        elementPanel || fullPanel
      ),
      React.createElement('div', { style:{ position:'sticky', bottom:0, padding:12, background:C.surface, borderTop:`1px solid ${C.border}`, display:'grid', gap:8 } },
        React.createElement('div', { style:{ display:'grid', gridTemplateColumns:compact ? '1fr 1fr' : '1fr', gap:8 } },
          React.createElement(Btn, { onClick:()=>saveSelected(false), disabled:busy, icon:'check2', variant:'secondary' }, busy ? 'Saving...' : 'Save Draft'),
          React.createElement(Btn, { onClick:publishPage, disabled:busy, icon:'publish' }, busy ? 'Publishing...' : 'Publish Live')
        ),
        React.createElement('button', { onClick:askAgent, style:{ padding:'10px 12px', borderRadius:10, border:`1px solid ${C.border}`, background:C.purpleDim, color:C.purpleL, fontWeight:800, cursor:'pointer', fontSize:12, fontFamily:'var(--font-ui)' } }, 'Ask Agent Sam to improve this section'),
        React.createElement('button', { onClick:openCopyModal, disabled:busy || !selected, style:{ padding:'9px 12px', borderRadius:10, border:`1px solid ${C.border}`, background:C.bg, color:C.text, fontWeight:800, cursor:'pointer', fontSize:12, fontFamily:'var(--font-ui)' } }, 'Copy to another page…'),
        React.createElement('button', { onClick:deleteSection, style:{ padding:'9px 12px', borderRadius:10, border:`1px solid ${C.red}55`, background:'transparent', color:C.red, fontWeight:800, cursor:'pointer', fontSize:12, fontFamily:'var(--font-ui)' } }, 'Delete Section')
      )
    );
  }

  function groupTitleStyle() { return { margin:'0 0 2px', fontSize:11, fontWeight:900, color:C.textSec, letterSpacing:'.12em', textTransform:'uppercase' }; }

  function renderCtaFields(labelKey, hrefKey, title) {
    const hrefVal = selected[hrefKey] || '';
    const actionId = cmsMatchCtaAction(hrefVal, ctaActions);
    const action = ctaActions.find((a) => a.id === actionId) || ctaActions[ctaActions.length - 1];
    const cfg = cmsParseConfig(selected);
    const styleKey = hrefKey === 'cta_secondary_href' ? 'cta_secondary_style' : 'cta_style';
    const styleVal = cfg[styleKey] || (hrefKey === 'cta_secondary_href' ? 'outline' : 'solid');
    return React.createElement('div', { key: hrefKey, style:{ display:'grid', gap:10, padding:12, borderRadius:12, border:`1px solid ${C.border}`, background:C.bg } },
      React.createElement('div', { style:{ fontSize:11, fontWeight:800, letterSpacing:'.06em', textTransform:'uppercase', color:C.textMut } }, title),
      React.createElement('div', null,
        cmsFieldLabel('Label'),
        cmsTextInput(selected[labelKey], (v) => { setField(labelKey, v); setHasUnsaved(true); }, () => saveSelected(true).then(() => setHasUnsaved(false)), 'Button text')
      ),
      React.createElement('div', null,
        cmsFieldLabel('Action'),
        React.createElement('select', {
          value: actionId,
          onChange: (e) => {
            const next = ctaActions.find((a) => a.id === e.target.value);
            if (!next) return;
            if (next.id === 'custom') {
              setField(hrefKey, hrefVal && !ctaActions.some((a) => a.href === hrefVal) ? hrefVal : '');
              setHasUnsaved(true);
              return;
            }
            setFieldAndSave(hrefKey, next.href);
          },
          style: { width:'100%', height:38, borderRadius:10, border:`1px solid ${C.border}`, background:C.surface, color:C.text, padding:'0 10px', fontSize:13 }
        }, ctaActions.map((a) => React.createElement('option', { key: a.id, value: a.id }, a.label)))
      ),
      actionId === 'custom' && React.createElement('div', null,
        cmsFieldLabel('Custom URL or modal:key'),
        cmsTextInput(hrefVal, (v) => { setField(hrefKey, v); setHasUnsaved(true); }, () => saveSelected(true).then(() => setHasUnsaved(false)), 'modal:foster or /path or #anchor', true)
      ),
      renderPresetRow('Style', styleVal, [
        { value:'solid', label:'Solid' },
        { value:'soft', label:'Soft' },
        { value:'outline', label:'Outline' },
        { value:'light', label:'Light' },
        { value:'dark', label:'Dark' },
      ], (v) => setConfigPatch({ [styleKey]: v })),
      React.createElement('div', { style:{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, flexWrap:'wrap' } },
        React.createElement('div', { style:{ fontSize:11, color:C.textMut } }, 'Publishes as: ', React.createElement('code', { style:{ color:C.purpleL, fontSize:11 } }, hrefVal || '—')),
        action.formId
          ? React.createElement('button', {
              type: 'button',
              onClick: () => onNavigate('cms-form-editor', { formId: action.formId }),
              style: { border:'none', background:'transparent', color:C.purpleL, fontSize:12, fontWeight:800, cursor:'pointer', padding:0 }
            }, 'Edit form →')
          : null
      )
    );
  }

  function renderMediaControls() {
    const cfg = cmsParseConfig(selected);
    const focalX = Number.isFinite(Number(cfg.image_focal_x)) ? Number(cfg.image_focal_x) : 50;
    const focalY = Number.isFinite(Number(cfg.image_focal_y)) ? Number(cfg.image_focal_y) : 50;
    const zoom = Number.isFinite(Number(cfg.image_zoom)) ? Number(cfg.image_zoom) : 1;
    const side = String(cfg.image_side || 'right').toLowerCase() === 'left' ? 'left' : 'right';
    const layout = String(cfg.hero_layout || (route === '/about' ? 'contained_split' : 'soft_split')).toLowerCase().replace(/-/g, '_');
    const layoutNorm = (layout === 'contained' || layout === 'contained_split' || layout === 'inset' || layout === 'guttered')
      ? 'contained_split'
      : (layout === 'true' || layout === 'true_split' || layout === 'split' || layout === 'panel' || layout === 'edge_bleed')
        ? 'true_split'
        : (layout === 'overlay' || layout === 'full_bleed' ? 'overlay' : 'soft_split');
    const overlay = String(cfg.overlay_strength || (layoutNorm === 'true_split' || layoutNorm === 'contained_split' ? 'none' : 'medium')).toLowerCase();
    const fit = String(cfg.image_fit || (route === '/about' ? 'contain' : 'cover')).toLowerCase() === 'contain' ? 'contain' : 'cover';
    const width = Number.isFinite(Number(cfg.image_width)) ? Number(cfg.image_width) : (layoutNorm === 'contained_split' ? 48 : 55);
    const imgUrl = selected.image_url || '';
    const isHero = String(selected.section_type || '').toLowerCase() === 'hero';
    const layoutLocked = cfg.layout_locked === true || cfg.layout_locked === 1 || cfg.layout_locked === '1';

    const onFocalPointer = (e) => {
      const el = e.currentTarget;
      const rect = el.getBoundingClientRect();
      const x = Math.round(((e.clientX - rect.left) / Math.max(1, rect.width)) * 100);
      const y = Math.round(((e.clientY - rect.top) / Math.max(1, rect.height)) * 100);
      setConfigPatch({
        image_focal_x: Math.min(100, Math.max(0, x)),
        image_focal_y: Math.min(100, Math.max(0, y)),
        image_object_position: 'custom',
      });
    };

    return React.createElement('div', { style:{ display:'grid', gap:12 } },
      React.createElement('h4', { style:groupTitleStyle() }, 'Media'),
      React.createElement('div', null, cmsFieldLabel('Image'), React.createElement('div', { style:{ display:'flex', gap:8 } },
        React.createElement('div', { style:{ flex:1 } }, cmsTextInput(selected.image_url, v=>setField('image_url', v), ()=>saveSelected(true), cmsUrlPlaceholder(editorCatalog, 'cdn'), true)),
        React.createElement(Btn, { size:'sm', variant:'secondary', icon:'image', onClick:openImagePicker }, 'Pick')
      )),
      imgUrl && React.createElement('div', { style:{ display:'grid', gap:10 } },
        React.createElement('div', {
          className: 'cms-focal-preview',
          onClick: onFocalPointer,
          title: 'Click to set focal point',
          style: {
            position:'relative', width:'100%', aspectRatio:'4 / 3', borderRadius:12, border:`1px solid ${C.border}`,
            overflow:'hidden', cursor:'crosshair', background:C.bg
          }
        },
          React.createElement('img', {
            src: imgUrl,
            alt: '',
            style: {
              width:'100%', height:'100%', objectFit: fit,
              objectPosition: `${focalX}% ${focalY}%`,
              transform: `scale(${zoom})`,
              transformOrigin: `${focalX}% ${focalY}%`,
              display:'block', pointerEvents:'none'
            },
            onError: (e) => { e.target.style.opacity = 0.2; }
          }),
          React.createElement('div', {
            style: {
              position:'absolute', left:`${focalX}%`, top:`${focalY}%`, width:14, height:14,
              marginLeft:-7, marginTop:-7, borderRadius:'50%', border:'2px solid #fff',
              boxShadow:'0 0 0 2px rgba(124,58,237,.85)', background:'rgba(124,58,237,.35)', pointerEvents:'none'
            }
          })
        ),
        React.createElement('div', { style:{ fontSize:11, color:C.textMut } },
          isHero
            ? 'Hover the photo in the preview to select it, then drag to reposition. Or click the thumbnail below.'
            : 'Click the preview to set the focal point (crop center).'
        ),
        isHero && layoutLocked && React.createElement('div', {
          style: {
            fontSize: 12, lineHeight: 1.45, padding: '10px 12px', borderRadius: 10,
            background: 'rgba(124,58,237,.08)', border: `1px solid ${C.border}`, color: C.textSec,
          }
        }, 'Layout locked to Contained split (even side gutters). Edit copy, photo, and CTAs — theme is under Page Settings in the editor panel.'),
        isHero && !layoutLocked && renderPresetRow('Layout / scene', layoutNorm, [
          { value:'contained_split', label:'Inset + gutters' },
          { value:'soft_split', label:'Soft fade' },
          { value:'overlay', label:'Overlay' },
          { value:'true_split', label:'Edge to edge' },
        ], (v) => setConfigPatch({
          hero_layout: v,
          overlay_strength: (v === 'true_split' || v === 'contained_split') ? 'none' : (cfg.overlay_strength || 'medium'),
          image_fit: v === 'contained_split' && route === '/about' ? (cfg.image_fit || 'contain') : (cfg.image_fit || 'cover'),
          image_width: Number(cfg.image_width) || (v === 'contained_split' ? 48 : 55),
        })),
        isHero && !layoutLocked && React.createElement('div', {
          style: { fontSize: 11, color: C.textMut, lineHeight: 1.45, marginTop: -4 }
        }, layoutNorm === 'contained_split'
          ? 'Inset + gutters: photo sits in a rounded panel with page margins (not edge-bleed).'
          : layoutNorm === 'true_split'
            ? 'Edge to edge: photo fills half the viewport with no outer gutter. Use Inset + gutters for breathing room.'
            : null),
        isHero && !layoutLocked && layoutNorm !== 'true_split' && layoutNorm !== 'contained_split' && renderPresetRow('Overlay', overlay, [
          { value:'none', label:'None' },
          { value:'soft', label:'Soft' },
          { value:'medium', label:'Med' },
          { value:'strong', label:'Strong' },
        ], (v) => setConfigPatch({ overlay_strength: v })),
        isHero && !layoutLocked && (layoutNorm === 'true_split' || layoutNorm === 'contained_split') && renderPresetRow('Photo width', String(width), [
          { value:'45', label:'45%' },
          { value:'48', label:'48%' },
          { value:'55', label:'55%' },
        ], (v) => setConfigPatch({ image_width: Number(v) })),
        isHero && renderPresetRow('Fit', fit, [
          { value:'cover', label:'Cover' },
          { value:'contain', label:'Contain' },
        ], (v) => setConfigPatch({ image_fit: v })),
        React.createElement('div', null,
          cmsFieldLabel(`Zoom ${zoom.toFixed(2)}×`),
          React.createElement('input', {
            type: 'range', min: 0.85, max: 1.6, step: 0.05, value: zoom,
            onChange: (e) => setConfigPatch({ image_zoom: Number(e.target.value) }),
            style: { width:'100%' }
          })
        ),
        renderPresetRow('Image side', side, [
          { value:'left', label:'Left' }, { value:'right', label:'Right' }
        ], (v) => setConfigPatch({ image_side: v })),
        renderPresetRow('Quick focal', cfg.image_object_position === 'custom' ? 'center' : (cfg.image_object_position || 'center'), [
          { value:'center', label:'Center' }, { value:'top', label:'Top' }, { value:'left', label:'Left' }, { value:'right', label:'Right' }
        ], (v) => setConfigPatch({
          image_object_position: v,
          image_focal_x: v === 'left' ? 20 : v === 'right' ? 80 : 50,
          image_focal_y: v === 'top' ? 20 : 50,
        }))
      )
    );
  }

  return { renderPresetRow, parsePaymentMethods, renderPaymentMethodsEditor, savePageChrome, renderPageSettings, renderInspector, groupTitleStyle, renderCtaFields, renderMediaControls };
}

Object.assign(window, {
  cmsBindEditorInspector,
});
