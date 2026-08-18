// CMS page-editor topbar + preview shell (Babel global).

function cmsBindEditorShell(ed) {
  const {
    onNavigate,
    selectedKey,
    selectedField,
    chromeTarget,
    chromeBrand,
    chromeSaving,
    mobileTab,
    setMobileTab,
    notice,
    busy,
    pagesList,
    pageSwitcherOpen,
    setPageSwitcherOpen,
    setShowQuickAddPage,
    sidenavOpen,
    setSidenavOpen,
    hasUnsaved,
    setHasUnsaved,
    isDesktop,
    isMobile,
    route,
    pageSwitcherRef,
    selected,
    inspectorOpen,
    previewIframeRef,
    collapseInspector,
    expandInspector,
    enterFullPreview,
    saveSelected,
    publishPage,
    switchEditorPage,
    pageTitle,
    liveUrl,
    previewSrc,
    handlePreviewNavigation,
    deviceWidth,
    saveChromeFooter,
  } = ed;

  function renderTopbar() {
    const bothCollapsed = !sidenavOpen && !inspectorOpen;
    const orderedPages = [...pagesList].sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0));
    const topbarButton = (active = false) => ({
      height:30, padding:'0 10px', borderRadius:8,
      border:`1px solid ${active ? C.purple : C.border}`,
      background:active ? C.purpleDim : C.bg2,
      color:active ? C.purpleL : C.textSec,
      display:'flex', alignItems:'center', gap:6, cursor:'pointer', flexShrink:0,
      fontSize:11, fontWeight:700, fontFamily:'var(--font-ui)'
    });

    return React.createElement('div', {
      style:{
        height:52, background:C.surface, borderBottom:`1px solid ${C.border}`,
        display:'grid', gridTemplateColumns:isDesktop ? 'minmax(0,1fr) minmax(180px,260px) minmax(0,1fr)' : 'auto minmax(100px,1fr) auto',
        alignItems:'center', padding:isMobile ? '0 8px' : '0 14px', gap:isMobile ? 6 : 10, flexShrink:0, position:'relative', zIndex:30
      }
    },
      React.createElement('div', { style:{ display:'flex', alignItems:'center', gap:8, minWidth:0, overflow:'hidden' } },
        React.createElement('button', {
          onClick:()=>onNavigate('cms-pages'),
          style:{ background:'none', border:'none', color:C.textSec, cursor:'pointer', display:'flex', alignItems:'center', gap:4, fontSize:12, fontFamily:'var(--font-ui)', flexShrink:0 }
        }, React.createElement(Icon, { name:'chevL', size:14 }), 'Pages'),
        React.createElement('div', { style:{ width:1, height:20, background:C.border, flexShrink:0 } }),
        isDesktop && React.createElement('button', {
          type:'button',
          title:sidenavOpen ? 'Hide sections' : 'Show sections',
          onClick:()=>setSidenavOpen((value)=>!value),
          style:topbarButton(sidenavOpen)
        }, React.createElement(Icon, { name:sidenavOpen ? 'chevL' : 'chevR', size:13 }), 'Sections'),
        isDesktop && React.createElement('button', {
          type:'button',
          title:inspectorOpen ? 'Hide editor panel' : (selectedKey ? 'Show editor panel' : 'Show page settings'),
          onClick:()=>{ if (inspectorOpen) collapseInspector(); else expandInspector(); },
          style:topbarButton(inspectorOpen)
        }, React.createElement(Icon, { name:inspectorOpen ? 'chevR' : 'chevL', size:13 }), 'Editor'),
        isDesktop && React.createElement('button', {
          type:'button',
          title:bothCollapsed ? 'Panels already hidden' : 'Hide both panels for full-width preview',
          onClick:enterFullPreview,
          style:topbarButton(bothCollapsed)
        }, React.createElement(Icon, { name:'eye', size:13 }), 'Full preview'),
        isDesktop && React.createElement('button', {
          type:'button',
          title:`Open the live ${route} page in a new tab`,
          onClick:()=>window.open(liveUrl, '_blank', 'noopener,noreferrer'),
          style:topbarButton(false)
        }, React.createElement(Icon, { name:'eye', size:13 }), 'View Live')
      ),

      React.createElement('div', { ref:pageSwitcherRef, style:{ position:'relative', minWidth:0, justifySelf:'stretch' } },
        React.createElement('button', {
          type:'button',
          'aria-haspopup':'menu',
          'aria-expanded':pageSwitcherOpen,
          onClick:()=>setPageSwitcherOpen((value)=>!value),
          style:{
            width:'100%', minWidth:0, height:36, padding:'0 12px', borderRadius:10,
            border:`1px solid ${pageSwitcherOpen ? C.purple : C.border}`,
            background:pageSwitcherOpen ? C.purpleDim : C.bg,
            color:C.text, cursor:'pointer', display:'grid', gridTemplateColumns:'minmax(0,1fr) auto',
            alignItems:'center', gap:8, textAlign:'left', fontFamily:'var(--font-ui)'
          }
        },
          React.createElement('span', { style:{ minWidth:0 } },
            React.createElement('span', { style:{ display:'block', fontSize:12, fontWeight:800, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' } }, pageTitle),
            React.createElement('span', { style:{ display:'block', fontSize:9, color:C.textMut, fontFamily:'var(--font-mono)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginTop:1 } }, route)
          ),
          React.createElement(Icon, { name:'chevD', size:13, style:{ color:C.textMut } })
        ),
        pageSwitcherOpen && React.createElement('div', {
          role:'menu',
          style:{
            position:'absolute', top:'calc(100% + 8px)', left:'50%', transform:'translateX(-50%)',
            width:300, maxWidth:'calc(100vw - 28px)', maxHeight:360, overflowY:'auto',
            padding:6, borderRadius:14, border:`1px solid ${C.border}`, background:C.surface,
            boxShadow:'0 20px 50px rgba(0,0,0,.22)', zIndex:80
          }
        },
          orderedPages.length
            ? orderedPages.map((page) => {
                const active = String(page.route_path || '/') === route;
                return React.createElement('button', {
                  key:page.route_path || page.title,
                  type:'button', role:'menuitem',
                  onClick:()=>switchEditorPage(page),
                  style:{
                    width:'100%', border:'none', borderRadius:10, padding:'9px 10px',
                    background:active ? C.purpleDim : 'transparent', color:active ? C.purpleL : C.text,
                    cursor:'pointer', display:'grid', gridTemplateColumns:'minmax(0,1fr) auto',
                    alignItems:'center', gap:8, textAlign:'left', fontFamily:'var(--font-ui)'
                  }
                },
                  React.createElement('span', { style:{ minWidth:0 } },
                    React.createElement('span', { style:{ display:'block', fontSize:12, fontWeight:800, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' } }, page.title || page.route_path),
                    React.createElement('span', { style:{ display:'block', fontSize:10, color:active ? C.purple : C.textMut, fontFamily:'var(--font-mono)', marginTop:2 } }, page.route_path)
                  ),
                  active && React.createElement(Icon, { name:'check2', size:13 })
                );
              })
            : React.createElement('div', { style:{ padding:'12px 10px', fontSize:12, color:C.textMut } }, 'No pages returned.'),
          React.createElement('div', { style:{ height:1, background:C.border, margin:'6px 2px' } }),
          React.createElement('button', {
            type:'button', role:'menuitem',
            onClick:()=>{ setPageSwitcherOpen(false); setShowQuickAddPage(true); },
            style:{
              width:'100%', border:'none', borderRadius:10, padding:'10px', background:'transparent',
              color:C.purpleL, cursor:'pointer', display:'flex', alignItems:'center', gap:8,
              fontSize:12, fontWeight:900, fontFamily:'var(--font-ui)', textAlign:'left'
            }
          }, React.createElement(Icon, { name:'plus', size:14 }), 'Add Page')
        )
      ),

      React.createElement('div', { style:{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:8, minWidth:0 } },
        hasUnsaved && React.createElement('div', { style:{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:99, background:'#fef3c7', color:'#92400e', border:'1px solid #fcd34d', whiteSpace:'nowrap', flexShrink:0 } }, 'Unsaved draft'),
        notice.text && !isMobile && React.createElement('div', { style:{ maxWidth:150, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:11, color:notice.type === 'error' ? C.red : C.green, fontWeight:700, flexShrink:1 } }, notice.text),
        !isDesktop && React.createElement(Btn, { size:'sm', variant:'secondary', icon:'eye', onClick:()=>window.open(liveUrl, '_blank', 'noopener,noreferrer') }, 'Preview'),
        hasUnsaved && React.createElement(Btn, {
          size: 'sm',
          variant: 'secondary',
          disabled: busy || chromeSaving || (chromeTarget === 'footer' ? !chromeBrand : !selected),
          onClick: () => {
            if (chromeTarget === 'footer') {
              saveChromeFooter(false).then(() => setHasUnsaved(false)).catch(() => {});
              return;
            }
            saveSelected(false).then(() => setHasUnsaved(false));
          },
        }, (busy || chromeSaving) ? 'Saving…' : 'Save Draft'),
        React.createElement(Btn, { size:'sm', icon:'publish', disabled:busy, onClick:()=>{ publishPage().then(()=>setHasUnsaved(false)); } }, isMobile ? 'Publish' : 'Publish Live')
      )
    );
  }

  function renderPreview() {
    if (!isDesktop && mobileTab !== 'preview') return null;
    const iframe = React.createElement('iframe', {
      ref: previewIframeRef,
      key: previewSrc,
      src: previewSrc,
      title: `Preview ${route}`,
      onLoad: (e) => {
        handlePreviewNavigation();
        injectPreviewSectionInspector(e.target);
        try {
          if (selectedKey && e.target?.contentWindow) {
            setTimeout(() => {
              e.target.contentWindow.postMessage({ type:'cms:scroll-to-section', key:selectedKey }, '*');
              if (selectedField) {
                e.target.contentWindow.postMessage({ type:'cms:highlight-section', key:selectedKey, field:selectedField }, '*');
              }
            }, 200);
          }
        } catch(_) {}
      },
      style: { width:'100%', height:'100%', border:0, display:'block', background:'#fff' }
    });
    const banner = React.createElement('div', {
      style: {
        flexShrink: 0,
        padding: '7px 12px',
        fontSize: 11,
        color: C.textSec,
        background: C.surface,
        borderBottom: `1px solid ${C.border}`,
        lineHeight: 1.4,
      }
    }, 'Preview is live from D1. Drag sections in the left rail (or use ↑↓). Publish Live updates the public site.');
    const framed = React.createElement('div', {
      style: { display:'flex', flexDirection:'column', width:'100%', height:'100%', minHeight:0 }
    }, banner, React.createElement('div', { style:{ flex:1, minHeight:0 } }, iframe));
    if (isMobile && mobileTab === 'preview') {
      return React.createElement('div', { className:'cms-canvas-stage', style:{ height:'calc(100vh - 110px)', minHeight:0 } }, framed);
    }
    // Desktop/tablet: fill canvas column at 100% scale. Tablet/mobile modes only cap width (no zoom).
    return React.createElement('div', {
      className: 'cms-canvas-stage',
      style: {
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
        background: '#ebe8f0',
        display: 'flex',
        justifyContent: 'center'
      }
    },
      React.createElement('div', {
        className: 'cms-device-frame' + (deviceWidth ? ' is-capped' : ' is-fluid'),
        style: {
          width: '100%',
          maxWidth: deviceWidth || 'none',
          height: '100%',
          background: '#fff',
          overflow: 'hidden',
          boxShadow: deviceWidth ? '0 0 0 1px rgba(26,22,34,0.08)' : 'none'
        }
      }, framed)
    );
  }

  function renderMobileTabs() {
    return React.createElement('div', { style:{ display:'flex', borderBottom:`1px solid ${C.border}`, background:C.surface } }, ['sections','edit','preview'].map(t => React.createElement('button', { key:t, onClick:()=>setMobileTab(t), style:{ flex:1, height:42, border:'none', borderBottom:`2px solid ${mobileTab === t ? C.purple : 'transparent'}`, background:'transparent', color:mobileTab === t ? C.purpleL : C.textSec, fontWeight:900, fontSize:13, textTransform:'capitalize' } }, t)));
  }

  return { renderTopbar, renderPreview, renderMobileTabs };
}

Object.assign(window, {
  cmsBindEditorShell,
});
