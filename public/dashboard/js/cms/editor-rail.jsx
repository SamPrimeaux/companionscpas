// CMS page-editor section rail (Babel global).

function cmsBindEditorRail(ed) {
  const {
    pageData,
    selectedKey,
    selectedBlockKey,
    chromeTarget,
    busy,
    dragKey,
    setDragKey,
    dragOverKey,
    setDragOverKey,
    setShowAddSection,
    setSidenavOpen,
    isDesktop,
    dragKeyRef,
    sortedSections,
    selected,
    selectChrome,
    selectSection,
    deleteCard,
    nudgeCard,
    toggleVisible,
    deleteSectionByKey,
    reorderSections,
    nudgeSection,
  } = ed;

  function renderSectionList() {
    const chromeRow = (target, label, hint) => {
      const chromeActive = chromeTarget === target && !selectedKey;
      return React.createElement('div', {
        key: target,
        onClick: () => selectChrome(target),
        style: {
          display: 'grid', gridTemplateColumns: '18px minmax(0,1fr) auto', alignItems: 'center', gap: 8,
          padding: '10px 8px', marginBottom: 6, borderRadius: 12, cursor: 'pointer',
          border: `2px solid ${chromeActive ? C.purple : C.border}`,
          borderLeft: `5px solid ${chromeActive ? C.purple : '#7c3aed'}`,
          background: chromeActive ? C.purpleDim : C.bg,
        },
      },
        React.createElement('span', { style: { color: C.textMut, fontSize: 12 } }, '◈'),
        React.createElement('div', { style: { minWidth: 0 } },
          React.createElement('div', { style: { color: chromeActive ? C.purpleL : C.text, fontSize: 12, fontWeight: 800 } }, label),
          chromeActive && React.createElement('div', { style: { fontSize: 9, fontWeight: 900, color: C.purpleL, letterSpacing: '.1em', textTransform: 'uppercase', marginTop: 2 } }, 'EDITING'),
          React.createElement('div', { style: { color: C.textMut, fontSize: 10, marginTop: 2 } }, hint)
        ),
        React.createElement('span', {
          style: {
            fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 99,
            background: 'rgba(124,58,237,0.12)', color: C.purpleL, border: `1px solid ${C.purple}44`,
          },
        }, 'chrome')
      );
    };

    return React.createElement('div', { className:'cms-sections-panel', style:{ height:'100%', display:'flex', flexDirection:'column', background:C.surface, position:'relative' } },
      React.createElement('div', { style:{ padding:'14px 14px 10px', borderBottom:`1px solid ${C.border}` } },
        React.createElement('div', { style:{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 } },
          React.createElement('div', { style:{ fontSize:11, fontWeight:800, color:C.textMut, letterSpacing:'.1em', textTransform:'uppercase' } }, 'Sections'),
          React.createElement('div', { style:{ display:'flex', gap:6, alignItems:'center' } },
            React.createElement(Btn, { size:'sm', variant:'secondary', icon:'plus', onClick:()=>setShowAddSection(true) }, 'Add'),
            isDesktop && React.createElement('button', {
              type: 'button',
              title: 'Hide sections',
              onClick: () => setSidenavOpen(false),
              style: { width:28, height:28, borderRadius:8, border:`1px solid ${C.border}`, background:C.bg, color:C.textSec, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }
            }, React.createElement(Icon, { name:'chevL', size:13 }))
          )
        )
      ),
      React.createElement('div', { style:{ overflowY:'auto', padding:10, flex:1 } },
        chromeRow('header', 'Header', 'Nav label · placement · More · Donate CTA'),
        sortedSections.length === 0
          ? React.createElement('div', { style:{ padding:16, border:`1px dashed ${C.border}`, borderRadius:12, color:C.textMut, fontSize:12, textAlign:'center', marginBottom:6 } }, 'No body sections yet. Add the first section.')
          : sortedSections.map(s => {
              const active = selected?.section_key === s.section_key;
              const hidden = s.is_visible === 0;
              const color = CMS_TYPE_COLOR[s.section_type] || CMS_TYPE_COLOR.content;
              const row = React.createElement('div', {
                id:'cms-section-row-' + s.section_key,
                onDragOver:e=>{ e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'; setDragOverKey(s.section_key); },
                onDrop:e=>{
                  e.preventDefault();
                  const from = dragKeyRef.current || (e.dataTransfer && e.dataTransfer.getData('text/plain')) || dragKey;
                  reorderSections(from, s.section_key);
                },
                onClick:()=>{
                  selectSection(s.section_key, { clearUnsaved: true });
                },
                style:{ display:'grid', gridTemplateColumns:'18px minmax(0,1fr) auto 22px 22px 28px 28px', alignItems:'center', gap:6, padding:'10px 8px', borderRadius:12, cursor:'pointer', border:`2px solid ${active ? C.purple : dragOverKey === s.section_key ? C.purple + '55' : C.border}`, borderLeft:`5px solid ${active ? C.purple : color}`, background:active ? C.purpleDim : C.bg, opacity:hidden ? .55 : 1, boxShadow: active ? `0 0 0 2px ${C.purple}44` : 'none', transition:'all 0.12s' }
              },
                React.createElement('span', {
                  draggable: true,
                  title: 'Drag to reorder',
                  onDragStart: (e) => {
                    e.stopPropagation();
                    dragKeyRef.current = s.section_key;
                    setDragKey(s.section_key);
                    try {
                      e.dataTransfer.setData('text/plain', s.section_key);
                      e.dataTransfer.effectAllowed = 'move';
                    } catch (_) {}
                  },
                  onDragEnd: () => {
                    dragKeyRef.current = null;
                    setDragKey(null);
                    setDragOverKey(null);
                  },
                  onClick: (e) => e.stopPropagation(),
                  style:{ color:C.textMut, fontSize:14, cursor:'grab', display:'flex', alignItems:'center', justifyContent:'center' }
                }, '≡'),
                React.createElement('div', { style:{ minWidth:0 } },
                  React.createElement('div', { style:{ color:active ? C.purpleL : C.text, fontSize:12, fontWeight:800, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', textDecoration:hidden ? 'line-through' : 'none' } }, s.heading || s.section_key),
                  active && React.createElement('div', { style:{ fontSize:9, fontWeight:900, color:C.purpleL, letterSpacing:'.1em', textTransform:'uppercase', marginTop:2 } }, 'EDITING'),
                  React.createElement('div', { style:{ color:active ? C.purple : C.textMut, fontSize:10, fontFamily:'var(--font-mono)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' } }, s.section_key)
                ),
                cmsTypeBadge(s.section_type),
                React.createElement('button', {
                  title: 'Move up',
                  onClick: (e) => { e.stopPropagation(); nudgeSection(s.section_key, -1); },
                  style: { width:22, height:22, border:`1px solid ${C.border}`, borderRadius:6, background:C.surface, color:C.textSec, cursor:'pointer', fontSize:11, lineHeight:1 }
                }, '↑'),
                React.createElement('button', {
                  title: 'Move down',
                  onClick: (e) => { e.stopPropagation(); nudgeSection(s.section_key, 1); },
                  style: { width:22, height:22, border:`1px solid ${C.border}`, borderRadius:6, background:C.surface, color:C.textSec, cursor:'pointer', fontSize:11, lineHeight:1 }
                }, '↓'),
                React.createElement('button', { title:hidden ? 'Show section' : 'Hide section', onClick:e=>{ e.stopPropagation(); toggleVisible(s); }, style:{ width:28, height:28, border:`1px solid ${C.border}`, borderRadius:8, background:C.surface, color:hidden ? C.textMut : C.purpleL, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' } }, React.createElement(Icon, { name:hidden ? 'eyeOff' : 'eye', size:13 })),
                React.createElement('button', {
                  title: 'Delete section',
                  onClick: (e) => { e.stopPropagation(); deleteSectionByKey(s); },
                  style: {
                    width: 28, height: 28, border: `1px solid ${C.red}44`, borderRadius: 8,
                    background: C.surface, color: C.red, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', cursor: 'pointer',
                  },
                }, React.createElement(Icon, { name: 'trash', size: 13 }))
              );
              return React.createElement('div', { key: s.section_key, style: { marginBottom: 6 } },
                row,
                renderCmsFeatureCardNest({
                  section: s,
                  blocks: pageData.blocks,
                  selectedKey,
                  selectedBlockKey,
                  busy,
                  onSelectCard: (section, b) => selectSection(section.section_key, { field: 'block_title', blockKey: b.block_key, clearUnsaved: true }),
                  onNudgeCard: (section, key, dir) => nudgeCard(key, dir, section),
                  onDeleteCard: (section, b) => deleteCard(b, section),
                })
              );
            }),
        chromeRow('footer', 'Footer', 'Mission · org · socials · trust badges · sitewide')
      )
    );
  }

  return { renderSectionList };
}

Object.assign(window, {
  cmsBindEditorRail,
});
