// CMS page editor — /dashboard/cms/pages/:pageId

function CmsPageEditorView({ pageId, onNavigate }) {
  const bp = useBp();
  const isDesktop = bp === 'desktop';
  const isTablet = bp === 'tablet';
  const isMobile = bp === 'mobile';
  const route = React.useMemo(() => cmsRouteFromPageId(pageId), [pageId]);

  const [pageData, setPageData] = React.useState({ page:null, sections:[], blocks:[] });
  const [selectedKey, setSelectedKey] = React.useState(null);
  const [selectedField, setSelectedField] = React.useState(null);
  const [selectedBlockKey, setSelectedBlockKey] = React.useState(null);
  const [chromeTarget, setChromeTarget] = React.useState(null); // 'header' | 'footer' | null
  const [chromeBrand, setChromeBrand] = React.useState(null);
  const [chromeOrg, setChromeOrg] = React.useState({});
  const [chromeSocials, setChromeSocials] = React.useState({});
  const [chromeTrustBadges, setChromeTrustBadges] = React.useState([]);
  const [chromeColumnLabels, setChromeColumnLabels] = React.useState({ ...DEFAULT_FOOTER_COLUMN_LABELS });
  const [chromeLabelSize, setChromeLabelSize] = React.useState(15);
  const [chromeFocusBadgeId, setChromeFocusBadgeId] = React.useState(null);
  const [chromeFocusField, setChromeFocusField] = React.useState(null);
  const [chromeDragBadgeId, setChromeDragBadgeId] = React.useState(null);
  const [chromeFooterLogo, setChromeFooterLogo] = React.useState("");
  const [chromeSaving, setChromeSaving] = React.useState(false);
  const [chromeUploading, setChromeUploading] = React.useState(false);
  const [previewMode, setPreviewMode] = React.useState('desktop');
  const [mobileTab, setMobileTab] = React.useState('sections');
  const [notice, setNotice] = React.useState({});
  const [busy, setBusy] = React.useState(false);
  const [dragKey, setDragKey] = React.useState(null);
  const [dragOverKey, setDragOverKey] = React.useState(null);
  const [editorCatalog, setEditorCatalog] = React.useState({
    cta_actions: CMS_CTA_ACTIONS,
    cdn_base: cmsCdnBase(),
    templates: [],
  });
  const [showImagePicker, setShowImagePicker] = React.useState(false);
  const [imageSearch, setImageSearch] = React.useState('');
  const [assets, setAssets] = React.useState([]);
  const [showAddSection, setShowAddSection] = React.useState(false);
  const [showCopyModal, setShowCopyModal] = React.useState(false);
  const [pagesList, setPagesList] = React.useState([]);
  const [pageSwitcherOpen, setPageSwitcherOpen] = React.useState(false);
  const [showQuickAddPage, setShowQuickAddPage] = React.useState(false);
  const [quickPage, setQuickPage] = React.useState({ title:'', slug:'', template_key:'default' });
  const [quickPageSaving, setQuickPageSaving] = React.useState(false);
  const [copyTargetRoute, setCopyTargetRoute] = React.useState('/');
  const [copyInsertAfter, setCopyInsertAfter] = React.useState('hero');
  const [copyPages, setCopyPages] = React.useState([]);
  const [copyTargetSections, setCopyTargetSections] = React.useState([]);
  const [addableSections, setAddableSections] = React.useState([]);
  const [addableSectionsErr, setAddableSectionsErr] = React.useState("");
  const [activeFont, setActiveFont] = React.useState('fraunces_dm');
  const [showFontPicker, setShowFontPicker] = React.useState(false);
  const [uploadingAsset, setUploadingAsset] = React.useState(false);
  const [sidenavOpen, setSidenavOpen] = React.useState(true);
  const [inspectorCollapsed, setInspectorCollapsed] = React.useState(true);
  const [hasUnsaved, setHasUnsaved] = React.useState(false);
  const imagePickTargetRef = React.useRef({ kind: 'section' });
  const dragKeyRef = React.useRef(null);
  const pageSwitcherRef = React.useRef(null);
  const notify = (t, type='ok') => cmsNotify(setNotice, t, type);
  const ctaActions = (editorCatalog.cta_actions && editorCatalog.cta_actions.length)
    ? editorCatalog.cta_actions
    : CMS_CTA_ACTIONS;

  const sortedSections = React.useMemo(() => [...(pageData.sections || [])].sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)), [pageData.sections]);
  const selected = React.useMemo(() => {
    if (!selectedKey || !sortedSections.length) return null;
    const want = cmsNormalizeSectionKey(selectedKey);
    return sortedSections.find(s => cmsNormalizeSectionKey(s.section_key) === want) || null;
  }, [sortedSections, selectedKey]);
  const inspectorOpen = !inspectorCollapsed;

  const [previewVersion, setPreviewVersion] = React.useState(0);
  const bumpPreview = React.useCallback(() => setPreviewVersion(v => v + 1), []);
  const previewIframeRef = React.useRef(null);

  const clearSelection = React.useCallback(() => {
    setSelectedKey(null);
    setSelectedField(null);
    setSelectedBlockKey(null);
    setChromeTarget(null);
    setInspectorCollapsed(true);
    try {
      previewIframeRef.current?.contentWindow?.postMessage({ type: 'cms:clear-selection' }, '*');
    } catch (_) {}
  }, []);

  const selectChrome = React.useCallback((target) => {
    setSelectedKey(null);
    setSelectedField(null);
    setSelectedBlockKey(null);
    setChromeTarget(target);
    if (target !== 'footer') {
      setChromeFocusBadgeId(null);
      setChromeFocusField(null);
    }
    setInspectorCollapsed(false);
    setHasUnsaved(false);
    if (isMobile) setMobileTab('edit');
    try {
      previewIframeRef.current?.contentWindow?.postMessage({ type: 'cms:clear-selection' }, '*');
    } catch (_) {}
  }, [isMobile]);

  const collapseInspector = React.useCallback(() => {
    setInspectorCollapsed(true);
  }, []);

  const expandInspector = React.useCallback(() => {
    setInspectorCollapsed(false);
  }, []);

  const enterFullPreview = React.useCallback(() => {
    setSidenavOpen(false);
    setInspectorCollapsed(true);
  }, []);

  const selectSection = React.useCallback((key, opts = {}) => {
    if (!key) return;
    const normalized = cmsNormalizeSectionKey(key);
    const match = (pageData.sections || []).find(s => cmsNormalizeSectionKey(s.section_key) === normalized);
    const resolved = match?.section_key || key;
    setChromeTarget(null);
    setSelectedKey(resolved);
    setSelectedField(opts.field || null);
    setSelectedBlockKey(opts.blockKey || null);
    setInspectorCollapsed(false);
    if (opts.clearUnsaved) setHasUnsaved(false);
    if (isMobile) setMobileTab('edit');
    const row = document.getElementById('cms-section-row-' + resolved);
    if (row) row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    try {
      previewIframeRef.current?.contentWindow?.postMessage({ type: 'cms:scroll-to-section', key: resolved }, '*');
    } catch (_) {}
  }, [pageData.sections, isMobile]);

  const postHighlight = React.useCallback((key, field, blockKey = null) => {
    try {
      const iframe = previewIframeRef.current;
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage({
          type: 'cms:highlight-section',
          key,
          field: field || null,
          blockKey: blockKey || null,
        }, '*');
      }
    } catch (_) {}
  }, []);

  // Listen for clicks / image drag from the inspector injected into the preview iframe
  React.useEffect(() => {
    const handler = (e) => {
      if (!e.data) return;
      if (e.data.type === 'cms:image-focal') {
        const key = e.data.sectionKey;
        if (!key) return;
        const fx = Math.min(100, Math.max(0, Number(e.data.focalX)));
        const fy = Math.min(100, Math.max(0, Number(e.data.focalY)));
        const live = !!e.data.live;
        const safeX = Number.isFinite(fx) ? fx : 50;
        const safeY = Number.isFinite(fy) ? fy : 50;
        setSelectedKey(key);
        setSelectedField('image_url');
        setSelectedBlockKey(null);
        setInspectorCollapsed(false);
        setHasUnsaved(true);
        setPageData((prev) => {
          const want = cmsNormalizeSectionKey(key);
          let saved = null;
          const sections = (prev.sections || []).map((s) => {
            if (cmsNormalizeSectionKey(s.section_key) !== want) return s;
            const cfg = {
              ...cmsParseConfig(s),
              image_focal_x: safeX,
              image_focal_y: safeY,
              image_object_position: 'custom',
            };
            const next = { ...s, config_json: JSON.stringify(cfg) };
            saved = next;
            return next;
          });
          if (!live && saved) {
            queueMicrotask(() => {
              saveSectionObject(saved, true).catch((err) => notify(err.message || 'Could not save image position', 'error'));
            });
          }
          return { ...prev, sections };
        });
        return;
      }
      if (e.data.type === 'cms:chrome-selected' && e.data.chrome === 'footer') {
        selectChrome('footer');
        setChromeFocusBadgeId(e.data.badgeId || null);
        setChromeFocusField(e.data.field || null);
        return;
      }
      if (e.data.type === 'cms:element-selected') {
        selectSection(e.data.sectionKey, { field: e.data.field || null, blockKey: e.data.blockKey || null });
        return;
      }
      if (e.data.type !== 'cms:section-clicked') return;
      selectSection(e.data.key);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [selectSection, selectChrome]);

  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (pageSwitcherOpen) {
        setPageSwitcherOpen(false);
        return;
      }
      if (showImagePicker || showAddSection || showFontPicker || showCopyModal || showQuickAddPage) return;
      // Esc: collapse inspector first (keep selection), then clear selection
      if (!inspectorCollapsed) {
        setInspectorCollapsed(true);
        return;
      }
      clearSelection();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [clearSelection, showImagePicker, showAddSection, showFontPicker, showCopyModal, showQuickAddPage, pageSwitcherOpen, inspectorCollapsed]);

  React.useEffect(() => {
    if (!pageSwitcherOpen) return;
    const close = (event) => {
      if (!pageSwitcherRef.current?.contains(event.target)) setPageSwitcherOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [pageSwitcherOpen]);

  React.useEffect(() => {
    setPageSwitcherOpen(false);
  }, [route]);

  React.useEffect(() => {
    if (selectedKey) postHighlight(selectedKey, selectedField, selectedBlockKey);
  }, [selectedKey, selectedField, selectedBlockKey, previewVersion, postHighlight]);

  React.useEffect(() => {
    if (chromeTarget !== 'footer') return;
    let el = null;
    if (chromeFocusBadgeId) {
      el = document.getElementById(
        chromeFocusField === 'caption'
          ? `cms-footer-badge-${chromeFocusBadgeId}-caption`
          : `cms-footer-badge-${chromeFocusBadgeId}`
      );
    } else if (chromeFocusField === 'organization.mission') {
      el = document.getElementById('cms-footer-field-mission');
    } else if (String(chromeFocusField || '').startsWith('column_labels.')) {
      const key = String(chromeFocusField).slice('column_labels.'.length);
      el = document.getElementById(`cms-footer-field-label-${key}`);
    }
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [chromeTarget, chromeFocusBadgeId, chromeFocusField]);

  const applyChromeBrand = React.useCallback((row) => {
    if (!row) return;
    const org = cmsParseJsonObject(row.organization_json, {});
    const socials = cmsParseJsonObject(row.socials_json, {});
    const footer = cmsParseJsonObject(row.footer_json, {});
    const chrome = cmsNormalizeFooterChrome(footer);
    setChromeBrand(row);
    setChromeOrg(org);
    setChromeSocials(socials);
    setChromeTrustBadges(chrome.trust_badges);
    setChromeColumnLabels(chrome.column_labels);
    setChromeLabelSize(chrome.col_label_size_px);
    setChromeFooterLogo(String(row.footer_logo_light_url || row.footer_logo_dark_url || "").trim());
  }, []);

  const loadPage = React.useCallback(async () => {
    try {
      const [pageRes, bootRes, brandRes] = await Promise.all([
        fetch(`/api/cms/page?route=${encodeURIComponent(route)}`, { credentials:'include' }),
        fetch('/api/cms/bootstrap', { credentials:'include' }),
        fetch('/api/cms/brand', { credentials:'include' }),
      ]);
      const pd = await pageRes.json().catch(() => ({}));
      const bd = await bootRes.json().catch(() => ({}));
      const brandData = await brandRes.json().catch(() => ({}));
      const bootPages = (Array.isArray(bd.pages) ? bd.pages : []).filter((page) => page?.route_path);
      setPagesList(bootPages.length ? bootPages : [
        { route_path: route, title: pd.page?.title || route, sort_order: 0 },
      ]);
      if (pd.success || pd.page || pd.sections) {
        const secs = [...(pd.sections || [])].sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
        setPageData({ page:pd.page || { title:route, route_path:route }, sections:secs, blocks:pd.blocks || [] });
        setSelectedKey(current => current && secs.some(s => s.section_key === current) ? current : null);
      } else {
        setPageData({ page:{ title:route, route_path:route, status:'draft' }, sections:[], blocks:[] });
        setSelectedKey(null);
      }
      if (bd.success || bd.brand) {
        let cfg = {}; try { cfg = JSON.parse(bd.brand?.config_json || '{}'); } catch {}
        setActiveFont(cfg.active_font_preset || 'fraunces_dm');
        setEditorCatalog({
          cta_actions: Array.isArray(bd.cta_actions) && bd.cta_actions.length ? bd.cta_actions : CMS_CTA_ACTIONS,
          cdn_base: bd.cdn_base || cmsCdnBase(bd),
          templates: Array.isArray(bd.templates) ? bd.templates : [],
          brand: bd.brand || null,
        });
        cmsRememberCatalog({ ...bd, cdn_base: bd.cdn_base || cmsCdnBase(bd) });
      }
      if (brandData.brand) applyChromeBrand(brandData.brand);
      bumpPreview();
    } catch (e) { notify('Could not load page editor', 'error'); }
  }, [route, bumpPreview, applyChromeBrand]);

  React.useEffect(() => { loadPage(); }, [loadPage]);

  React.useEffect(() => {
    const onRestored = (e) => {
      const detail = e?.detail || {};
      if (detail.page_route && detail.page_route !== route) return;
      loadPage().then(() => bumpPreview()).catch(() => {});
    };
    window.addEventListener("cpas:section-restored", onRestored);
    return () => window.removeEventListener("cpas:section-restored", onRestored);
  }, [loadPage, bumpPreview, route]);

  React.useEffect(() => {
    if (!showAddSection) return;
    let cancelled = false;
    (async () => {
      setAddableSectionsErr("");
      try {
        const res = await fetch("/api/cms/section/templates", { credentials: "include" });
        const data = await res.json().catch(() => ({}));
        const list = (Array.isArray(data.templates) ? data.templates : [])
          .filter((t) => !t.kind || t.kind === "section");
        if (cancelled) return;
        if (!list.length) {
          setAddableSectionsErr(data.error || "No templates returned");
          setAddableSections([]);
          return;
        }
        setAddableSections(list.map((t) => ({
          type: t.type,
          label: t.label || String(t.type || "").replace(/_/g, " "),
          desc: t.desc || t.description || "",
        })));
      } catch (e) {
        if (!cancelled) {
          setAddableSectionsErr(e?.message || "Failed to load templates");
          setAddableSections([]);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [showAddSection]);

  const saveSectionObject = async (section, silent=false) => {
    let res;
    try {
      res = await fetch('/api/cms/section/save', { method:'POST', credentials:'include', headers:{ 'content-type':'application/json' }, body:JSON.stringify({ section }) });
    } catch (e) {
      const msg = String(e?.message || e || '');
      throw new Error(msg.includes('Failed to fetch')
        ? 'Network error while saving — request did not complete. Wait a moment and try again.'
        : (msg || 'Section save failed'));
    }
    const d = await res.json().catch(() => ({}));
    if (!res.ok || (!d.success && d.success !== true)) {
      throw new Error(d.error || `Section save failed (${res.status})`);
    }
    if (!silent) notify('Section saved as draft');
    return d;
  };

  const saveSelected = async (silent=false) => {
    if (!selected) return;
    setBusy(true);
    try { await saveSectionObject(selected, silent); if (!silent) await loadPage(); else bumpPreview(); }
    catch (e) { notify(e.message, 'error'); }
    setBusy(false);
  };

  const setField = (key, val) => {
    if (!selected) return;
    setPageData(prev => ({ ...prev, sections:(prev.sections || []).map(s => s.section_key === selected.section_key ? { ...s, [key]:val } : s) }));
  };

  const setFieldAndSave = async (key, val) => {
    if (!selected) return;
    const next = { ...selected, [key]:val };
    setPageData(prev => ({ ...prev, sections:(prev.sections || []).map(s => s.section_key === selected.section_key ? next : s) }));
    try { await saveSectionObject(next, true); bumpPreview(); } catch (e) { notify(e.message, 'error'); }
  };

  const selectedBlock = React.useMemo(() => {
    if (!selectedKey || !selectedBlockKey) return null;
    const wantSec = cmsNormalizeSectionKey(selectedKey);
    return (pageData.blocks || []).find(b =>
      cmsNormalizeSectionKey(b.section_key) === wantSec && String(b.block_key) === String(selectedBlockKey)
    ) || null;
  }, [pageData.blocks, selectedKey, selectedBlockKey]);

  const setBlockField = (key, val) => {
    if (!selectedBlock) return;
    setPageData(prev => ({
      ...prev,
      blocks: (prev.blocks || []).map(b =>
        b.block_key === selectedBlock.block_key && cmsNormalizeSectionKey(b.section_key) === cmsNormalizeSectionKey(selectedBlock.section_key)
          ? { ...b, [key]: val }
          : b
      ),
    }));
  };

  const setBlockConfigPatch = (patch) => {
    if (!selectedBlock) return;
    let cfg = {};
    try { cfg = JSON.parse(selectedBlock.config_json || '{}'); } catch { cfg = {}; }
    const nextCfg = { ...cfg, ...patch };
    setBlockField('config_json', JSON.stringify(nextCfg));
  };

  const saveSelectedBlock = async (silent = false) => {
    if (!selectedBlock || !selected) return;
    setBusy(true);
    try {
      const res = await fetch('/api/cms/block/save', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          block: {
            ...selectedBlock,
            page_route: route,
            section_key: selected.section_key,
          },
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!d.success) throw new Error(d.error || 'Block save failed');
      if (!silent) notify('Block saved as draft');
      bumpPreview();
    } catch (e) {
      notify(e.message, 'error');
    }
    setBusy(false);
  };

  const persistBlock = async (block, sectionKey) => {
    const res = await fetch('/api/cms/block/save', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        block: {
          ...block,
          page_route: route,
          section_key: sectionKey || selected?.section_key || block.section_key,
        },
      }),
    });
    const d = await res.json().catch(() => ({}));
    if (!d.success) throw new Error(d.error || 'Block save failed');
  };

  const addCard = async () => {
    if (!selected) return;
    const existing = (pageData.blocks || []).filter(
      (b) => cmsNormalizeSectionKey(b.section_key) === cmsNormalizeSectionKey(selected.section_key)
    );
    const maxOrder = existing.reduce((m, b) => Math.max(m, Number(b.sort_order) || 0), 0);
    const block_key = `card_${Date.now()}`;
    setBusy(true);
    try {
      await persistBlock({
        page_route: route,
        section_key: selected.section_key,
        block_key,
        block_type: 'card',
        title: 'New card',
        body: '',
        image_url: '',
        sort_order: maxOrder + 10,
        is_visible: 1,
        config_json: '{}',
      }, selected.section_key);
      await loadPage();
      setSelectedBlockKey(block_key);
      setSelectedField('block_title');
      notify('Card added');
    } catch (e) {
      notify(e.message, 'error');
    }
    setBusy(false);
  };

  const deleteCard = async (block, section = selected) => {
    const owner = section || selected;
    if (!owner || !block) return;
    if (!window.confirm(`Remove “${block.title || block.block_key}” from this section?`)) return;
    setBusy(true);
    try {
      const res = await fetch('/api/cms/block/delete', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          page_route: route,
          section_key: owner.section_key,
          block_key: block.block_key,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!d.success) throw new Error(d.error || 'Could not delete card');
      if (selectedBlockKey === block.block_key) {
        setSelectedBlockKey(null);
        setSelectedField(null);
      }
      await loadPage();
      notify('Card removed');
    } catch (e) {
      notify(e.message, 'error');
    }
    setBusy(false);
  };

  const nudgeCard = async (blockKey, dir, section = selected) => {
    const owner = section || selected;
    if (!owner) return;
    const list = [...(pageData.blocks || [])]
      .filter((b) => cmsNormalizeSectionKey(b.section_key) === cmsNormalizeSectionKey(owner.section_key))
      .sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0));
    const i = list.findIndex((b) => b.block_key === blockKey);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    const next = [...list];
    const [moved] = next.splice(i, 1);
    next.splice(j, 0, moved);
    const keys = next.map((b) => b.block_key);
    const prev = pageData.blocks;
    setPageData((p) => ({
      ...p,
      blocks: (p.blocks || []).map((b) => {
        if (cmsNormalizeSectionKey(b.section_key) !== cmsNormalizeSectionKey(owner.section_key)) return b;
        const idx = keys.indexOf(b.block_key);
        return idx >= 0 ? { ...b, sort_order: (idx + 1) * 10 } : b;
      }),
    }));
    try {
      const res = await fetch('/api/cms/blocks/reorder', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          page_route: route,
          section_key: owner.section_key,
          block_keys: keys,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!d.success) throw new Error(d.error || 'Card reorder failed');
      bumpPreview();
    } catch (e) {
      setPageData((p) => ({ ...p, blocks: prev }));
      notify(e.message, 'error');
    }
  };

  const publishPage = async () => {
    setBusy(true);
    try {
      let res;
      try {
        res = await fetch('/api/cms/publish', { method:'POST', credentials:'include', headers:{ 'content-type':'application/json' }, body:JSON.stringify({ route_path:route }) });
      } catch (e) {
        const msg = String(e?.message || e || '');
        throw new Error(msg.includes('Failed to fetch')
          ? 'Network error while publishing — page may still be a draft. Try Publish Live again.'
          : (msg || 'Publish failed'));
      }
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.success) throw new Error(d.error || `Publish failed (${res.status})`);
      notify(`Published ${route} — live in ~5s`, 'ok');
      await loadPage();
    } catch (e) { notify(String(e.message || e), 'error'); }
    setBusy(false);
  };

  const setPageTheme = async (theme) => {
    setBusy(true);
    try {
      const res = await fetch('/api/cms/page/theme', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ route_path: route, theme }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || d.success === false) throw new Error(d.error || 'Theme save failed');
      setPageData((prev) => ({
        ...prev,
        page: { ...(prev.page || {}), theme },
      }));
      notify(d.message || `Theme → ${theme}`);
      bumpPreview();
    } catch (e) {
      notify(String(e.message || e), 'error');
    }
    setBusy(false);
  };

  const toggleVisible = async (section) => {
    const next = { ...section, is_visible: section.is_visible === 0 ? 1 : 0 };
    setPageData(prev => ({ ...prev, sections:(prev.sections || []).map(s => s.section_key === section.section_key ? next : s) }));
    try { await saveSectionObject(next, true); bumpPreview(); notify(next.is_visible === 0 ? 'Section hidden' : 'Section visible'); } catch(e) { notify(e.message, 'error'); }
  };

  const deleteSectionByKey = async (section, { skipConfirm = false } = {}) => {
    if (!section?.section_key) return;
    if (!skipConfirm && !confirm('Delete this section? You can Undo for 30 seconds.')) return;
    setBusy(true);
    try {
      const res = await fetch('/api/cms/section/delete', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ section_key: section.section_key, page_route: route }),
      });
      const d = await res.json().catch(() => ({}));
      if (!d.success) {
        notify(d.error || 'Delete failed', 'error');
        setBusy(false);
        return;
      }
      try {
        sessionStorage.setItem('cpas.sectionUndo', JSON.stringify({
          page_route: route,
          section_key: section.section_key,
          label: section.heading || section.section_key,
          started_at: Date.now(),
          duration_ms: 30000,
          expires_at: Date.now() + 30000,
        }));
        window.dispatchEvent(new CustomEvent('cpas:section-undo'));
      } catch (_) {}
      if (selectedKey === section.section_key) clearSelection();
      await loadPage();
      bumpPreview();
      notify('Section deleted — Undo available for 30s');
    } catch (e) {
      notify('Delete failed: ' + e.message, 'error');
    }
    setBusy(false);
  };

  const deleteSection = async () => {
    if (!selected) return;
    await deleteSectionByKey(selected);
  };

  const reorderSections = async (fromKey, toKey) => {
    if (!fromKey || !toKey || fromKey === toKey) return;
    const list = [...sortedSections];
    const from = list.findIndex(s => s.section_key === fromKey);
    const to = list.findIndex(s => s.section_key === toKey);
    if (from < 0 || to < 0) return;
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    const reordered = list.map((s,i) => ({ ...s, sort_order:(i+1)*10 }));
    const prevSections = pageData.sections;
    setPageData(prev => ({ ...prev, sections:reordered }));
    setDragKey(null); setDragOverKey(null);
    dragKeyRef.current = null;
    try {
      const res = await fetch('/api/cms/sections/reorder', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          page_route: route,
          section_keys: reordered.map((s) => s.section_key),
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!d.success) throw new Error(d.error || 'Section save failed');
      bumpPreview();
      notify('Section order saved');
    } catch (e) {
      setPageData(prev => ({ ...prev, sections: prevSections }));
      notify('Reorder failed: ' + e.message, 'error');
    }
  };

  const nudgeSection = (key, dir) => {
    const list = sortedSections;
    const i = list.findIndex((s) => s.section_key === key);
    const target = list[i + dir];
    if (i < 0 || !target) return;
    reorderSections(key, target.section_key);
  };

  const addSection = async (type) => {
    const maxOrder = sortedSections.reduce((m,s)=>Math.max(m, Number(s.sort_order)||0), 0);
    const newKey = `${type}_${cmsSlugForKey(route)}_${Date.now()}`;
    const isRawHtml = type === 'raw_html';
    const section = {
      section_key: newKey,
      section_type: type,
      page_route: route,
      heading: isRawHtml ? 'Custom Code' : ('New ' + type.replace(/_/g,' ')),
      subheading: '',
      body: '',
      sort_order: maxOrder + 10,
      is_visible: 1,
      tenant_id: 'tenant_companionscpas',
      ...(isRawHtml
        ? { config_json: JSON.stringify({ html_source: 'r2', html: '', r2_key: '', source_url: '' }) }
        : type === 'feature_cards'
          ? { config_json: JSON.stringify({ image_display: 'natural', columns: 'auto' }) }
          : {}),
    };
    setBusy(true);
    try {
      await saveSectionObject(section, true);
      if (['feature_cards', 'card_grid', 'home_pillars'].includes(type)) {
        await fetch('/api/cms/block/save', {
          method: 'POST',
          credentials: 'include',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            block: {
              page_route: route,
              section_key: newKey,
              block_key: 'card_1',
              block_type: 'card',
              title: 'New card',
              body: '',
              image_url: '',
              sort_order: 10,
              is_visible: 1,
              config_json: '{}',
            },
          }),
        });
      }
      setShowAddSection(false);
      await loadPage();
      setSelectedKey(newKey);
      setMobileTab('edit');
      notify('Section added');
    }
    catch(e) { notify(e.message, 'error'); }
    setBusy(false);
  };

  const openCopyModal = async () => {
    if (!selected) return;
    setShowCopyModal(true);
    setCopyTargetRoute('/');
    setCopyInsertAfter('hero');
    try {
      const res = await fetch('/api/cms/bootstrap', { credentials: 'include' });
      const d = await res.json().catch(() => ({}));
      if (d.success) cmsRememberCatalog(d);
      const pages = (d.pages || []).filter((p) => p.route_path && p.route_path !== route);
      setCopyPages(pages);
    } catch {
      setCopyPages([]);
    }
  };

  React.useEffect(() => {
    if (!showCopyModal || !copyTargetRoute) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/cms/page?route=${encodeURIComponent(copyTargetRoute)}`, { credentials: 'include' });
        const d = await res.json().catch(() => ({}));
        if (cancelled) return;
        const secs = (d.sections || [])
          .filter((s) => !s.deleted_at)
          .sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0));
        setCopyTargetSections(secs);
        const hero = secs.find((s) => s.section_key === 'hero' || s.section_type === 'hero');
        setCopyInsertAfter(hero?.section_key || (secs[0]?.section_key || ''));
      } catch {
        if (!cancelled) setCopyTargetSections([]);
      }
    })();
    return () => { cancelled = true; };
  }, [showCopyModal, copyTargetRoute]);

  const copySectionToPage = async () => {
    if (!selected || !copyTargetRoute) return;
    setBusy(true);
    try {
      const body = {
        source_page_route: route,
        source_section_key: selected.section_key,
        target_page_route: copyTargetRoute,
      };
      if (copyInsertAfter) body.insert_after_section_key = copyInsertAfter;
      const res = await fetch('/api/cms/section/copy', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await res.json().catch(() => ({}));
      if (!d.success) throw new Error(d.error || 'Copy failed');
      setShowCopyModal(false);
      notify(d.message || `Copied to ${copyTargetRoute}`);
      const targetPageId = cmsPageIdFromPublicRoute(copyTargetRoute);
      if (confirm(`Section copied to ${copyTargetRoute}. Open that page editor now?`)) {
        onNavigate('cms-page-editor', { pageId: targetPageId });
      }
    } catch (e) {
      notify(e.message || 'Copy failed', 'error');
    }
    setBusy(false);
  };

  const loadAssets = async () => {
    try { const res = await fetch('/api/cms/assets', { credentials:'include' }); const d = await res.json(); setAssets(d.assets || []); }
    catch { setAssets([]); }
  };
  const openImagePicker = (target) => {
    imagePickTargetRef.current = target && typeof target === 'object' ? target : { kind: 'section' };
    setShowImagePicker(true);
    if (!assets.length) loadAssets();
  };
  const pickImage = (url) => {
    const target = imagePickTargetRef.current || { kind: 'section' };
    if (target.kind === 'config_card' && target.cardId) {
      patchConfigCard(target.cardId, { image: url });
    } else if (target.kind === 'block' && target.blockKey) {
      setPageData((prev) => ({
        ...prev,
        blocks: (prev.blocks || []).map((b) =>
          b.block_key === target.blockKey ? { ...b, image_url: url } : b
        ),
      }));
      const block = (pageData.blocks || []).find((b) => b.block_key === target.blockKey);
      if (block) {
        persistBlock({ ...block, image_url: url }).then(() => bumpPreview()).catch((e) => notify(e.message, 'error'));
      }
    } else {
      setFieldAndSave('image_url', url);
    }
    setShowImagePicker(false);
    imagePickTargetRef.current = { kind: 'section' };
  };
  const uploadAsset = async (file) => {
    if (!file) return;
    setUploadingAsset(true);
    try { const fd = new FormData(); fd.append('file', file); const res = await fetch('/api/cms/asset/upload', { method:'POST', credentials:'include', body:fd }); const d = await res.json().catch(() => ({})); if (d.success || d.asset || d.url) { await loadAssets(); notify('Image uploaded'); } else notify(d.error || 'Upload failed', 'error'); }
    catch(e) { notify('Upload failed: ' + e.message, 'error'); }
    setUploadingAsset(false);
  };

  const saveFont = async (key) => {
    setActiveFont(key); setShowFontPicker(false);
    try { await fetch('/api/cms/brand/config', { method:'POST', credentials:'include', headers:{ 'content-type':'application/json' }, body:JSON.stringify({ active_font_preset:key }) }); notify('Font changed — publish to apply'); } catch {}
  };

  const setConfigPatch = async (patch, silent = true) => {
    if (!selected) return;
    const cfg = { ...cmsParseConfig(selected), ...patch };
    const next = { ...selected, config_json: JSON.stringify(cfg) };
    setPageData(prev => ({ ...prev, sections: (prev.sections || []).map(s => s.section_key === selected.section_key ? next : s) }));
    setHasUnsaved(true);
    try {
      await saveSectionObject(next, true);
      bumpPreview();
      if (!silent) setHasUnsaved(false);
    } catch (e) { notify(e.message, 'error'); }
  };

  const patchConfigCard = async (cardId, patch) => {
    if (!selected || !cardId) return;
    const cfg = cmsParseConfig(selected);
    const cards = Array.isArray(cfg.cards) ? cfg.cards.map((c) => ({ ...c })) : [];
    const idx = cards.findIndex((c) => String(c.id || c.title || '') === String(cardId));
    if (idx < 0) {
      notify('Card not found in section config', 'error');
      return;
    }
    cards[idx] = { ...cards[idx], ...patch };
    await setConfigPatch({ cards });
  };

  const setConfigCardLocal = (cardId, patch) => {
    if (!selected || !cardId) return;
    const cfg = cmsParseConfig(selected);
    const cards = Array.isArray(cfg.cards) ? cfg.cards.map((c) => ({ ...c })) : [];
    const idx = cards.findIndex((c) => String(c.id || c.title || '') === String(cardId));
    if (idx < 0) return;
    cards[idx] = { ...cards[idx], ...patch };
    const next = { ...selected, config_json: JSON.stringify({ ...cfg, cards }) };
    setPageData((prev) => ({
      ...prev,
      sections: (prev.sections || []).map((s) => (s.section_key === selected.section_key ? next : s)),
    }));
    setHasUnsaved(true);
  };

  const switchEditorPage = (page) => {
    const nextRoute = String(page?.route_path || '/');
    setPageSwitcherOpen(false);
    if (nextRoute === route) return;
    onNavigate('cms-page-editor', { pageId: cmsPageIdFromPublicRoute(nextRoute) });
  };

  const quickAddPage = async () => {
    const title = String(quickPage.title || '').trim();
    if (!title) return notify('Page title is required', 'error');
    const slug = String(quickPage.slug || title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (!slug) return notify('Enter a valid page title or URL slug', 'error');
    const routePath = `/${slug}`;
    if (pagesList.some((page) => page.route_path === routePath)) {
      return notify(`A page already uses ${routePath}`, 'error');
    }

    setQuickPageSaving(true);
    try {
      const res = await fetch('/api/cms/page/save', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type':'application/json' },
        body: JSON.stringify({
          page: {
            title,
            route_path: routePath,
            slug,
            template_key: quickPage.template_key || 'default',
            status: 'draft',
          },
          seed_sections: true,
          add_to_nav: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || `Page creation failed (${res.status})`);
      setPagesList((current) => [
        ...current.filter((page) => page.route_path !== routePath),
        { route_path: routePath, title, slug, status:'draft', sort_order: current.length * 10 + 10 },
      ]);
      setShowQuickAddPage(false);
      setQuickPage({ title:'', slug:'', template_key:'default' });
      notify(data.bootstrap?.sections?.seeded
        ? `Page “${title}” created with starter sections and navigation.`
        : `Page “${title}” created.`);
      onNavigate('cms-page-editor', { pageId: data.editor_page_id || slug });
    } catch (error) {
      notify(error.message || 'Could not create page', 'error');
    } finally {
      setQuickPageSaving(false);
    }
  };

  const askAgent = () => {
    window.dispatchEvent(new CustomEvent('agentsam:open', { detail:{ prompt:`Improve the ${selected?.section_type || 'section'} copy for ${route}: ${selected?.heading || ''}` } }));
  };

  const pageTitle = pageData.page?.title || route;
  const liveUrl = `${cmsPublicOrigin(editorCatalog) || ''}${route}`;
  const previewSrc = `/api/cms/preview?route=${encodeURIComponent(route)}&v=${previewVersion}`;

  const handlePreviewNavigation = React.useCallback(() => {
    try {
      const iframe = previewIframeRef.current;
      if (!iframe?.contentWindow) return;
      const path = iframe.contentWindow.location.pathname;
      if (!path || path.startsWith('/api/cms/preview') || path.startsWith('/dashboard')) return;
      const nextPageId = cmsPageIdFromPublicRoute(path);
      const currentPageId = cmsSlugForKey(route);
      if (nextPageId !== currentPageId) {
        onNavigate('cms-page-editor', { pageId: nextPageId });
      }
    } catch (_) {}
  }, [route, onNavigate]);

  // Track unsaved state when fields change
  const setFieldTracked = (key, val) => { setField(key, val); setHasUnsaved(true); };

  const mode = isMobile ? 'mobile' : previewMode;
  const deviceWidth = CMS_DEVICE_FRAMES[mode]; // null = fill canvas (desktop)


  React.useEffect(() => {
    if (!selected) return;
    const cards = cmsConfigCards(selected);
    if (!cards?.length) return;
    // Always bind a card for two_cards grids so title/image/CTA fields are visible immediately.
    if (!selectedBlockKey) {
      const firstId = String(cards[0].id || cards[0].title || "card");
      setSelectedBlockKey(firstId);
      if (!selectedField || selectedField === "card_image") setSelectedField("card_image");
    }
  }, [selected, selectedField, selectedBlockKey]);


  const ed = {
    pageId,
    onNavigate,
    pageData,
    setPageData,
    selectedKey,
    setSelectedKey,
    selectedField,
    setSelectedField,
    selectedBlockKey,
    setSelectedBlockKey,
    chromeTarget,
    setChromeTarget,
    chromeBrand,
    setChromeBrand,
    chromeOrg,
    setChromeOrg,
    chromeSocials,
    setChromeSocials,
    chromeTrustBadges,
    setChromeTrustBadges,
    chromeColumnLabels,
    setChromeColumnLabels,
    chromeLabelSize,
    setChromeLabelSize,
    chromeFocusBadgeId,
    setChromeFocusBadgeId,
    chromeFocusField,
    setChromeFocusField,
    chromeDragBadgeId,
    setChromeDragBadgeId,
    chromeFooterLogo,
    setChromeFooterLogo,
    chromeSaving,
    setChromeSaving,
    chromeUploading,
    setChromeUploading,
    previewMode,
    setPreviewMode,
    mobileTab,
    setMobileTab,
    notice,
    setNotice,
    busy,
    setBusy,
    dragKey,
    setDragKey,
    dragOverKey,
    setDragOverKey,
    editorCatalog,
    setEditorCatalog,
    showImagePicker,
    setShowImagePicker,
    imageSearch,
    setImageSearch,
    assets,
    setAssets,
    showAddSection,
    setShowAddSection,
    showCopyModal,
    setShowCopyModal,
    pagesList,
    setPagesList,
    pageSwitcherOpen,
    setPageSwitcherOpen,
    showQuickAddPage,
    setShowQuickAddPage,
    quickPage,
    setQuickPage,
    quickPageSaving,
    setQuickPageSaving,
    copyTargetRoute,
    setCopyTargetRoute,
    copyInsertAfter,
    setCopyInsertAfter,
    copyPages,
    setCopyPages,
    copyTargetSections,
    setCopyTargetSections,
    addableSections,
    setAddableSections,
    addableSectionsErr,
    setAddableSectionsErr,
    activeFont,
    setActiveFont,
    showFontPicker,
    setShowFontPicker,
    uploadingAsset,
    setUploadingAsset,
    sidenavOpen,
    setSidenavOpen,
    inspectorCollapsed,
    setInspectorCollapsed,
    hasUnsaved,
    setHasUnsaved,
    previewVersion,
    setPreviewVersion,
    bp,
    isDesktop,
    isTablet,
    isMobile,
    route,
    imagePickTargetRef,
    dragKeyRef,
    pageSwitcherRef,
    notify,
    ctaActions,
    sortedSections,
    selected,
    inspectorOpen,
    bumpPreview,
    previewIframeRef,
    clearSelection,
    selectChrome,
    collapseInspector,
    expandInspector,
    enterFullPreview,
    selectSection,
    postHighlight,
    applyChromeBrand,
    loadPage,
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
    toggleVisible,
    deleteSectionByKey,
    deleteSection,
    reorderSections,
    nudgeSection,
    addSection,
    openCopyModal,
    copySectionToPage,
    loadAssets,
    openImagePicker,
    pickImage,
    uploadAsset,
    saveFont,
    setConfigPatch,
    patchConfigCard,
    setConfigCardLocal,
    switchEditorPage,
    quickAddPage,
    askAgent,
    pageTitle,
    liveUrl,
    previewSrc,
    handlePreviewNavigation,
    setFieldTracked,
    mode,
    deviceWidth,
  };
  Object.assign(ed, cmsBindEditorChrome(ed));
  Object.assign(ed, cmsBindEditorInspector(ed));
  Object.assign(ed, cmsBindEditorRail(ed));
  Object.assign(ed, cmsBindEditorModals(ed));
  Object.assign(ed, cmsBindEditorShell(ed));
  const {
    renderTopbar,
    renderSectionList,
    renderInspector,
    renderPreview,
    renderMobileTabs,
    renderImagePicker,
    renderAddSectionModal,
    renderQuickAddPageModal,
    renderCopyModal,
  } = ed;

  return React.createElement('div', { className:'cms-editor-shell', style:{ display:'flex', flexDirection:'column', flex:1, height:'100%', overflow:'hidden' } },
    renderTopbar(),
    isMobile && renderMobileTabs(),
    notice.text && isMobile && React.createElement('div', { style:{ padding:'8px 12px', color:notice.type === 'error' ? C.red : C.green, background:C.surface, borderBottom:`1px solid ${C.border}`, fontSize:12, fontWeight:800 } }, notice.text),
    isMobile
      ? React.createElement('div', { style:{ flex:1, minHeight:0, overflow:'hidden' } },
          mobileTab === 'sections' && renderSectionList(),
          mobileTab === 'edit' && React.createElement('div', { style:{ height:'100%', overflow:'auto' } }, renderInspector(true)),
          mobileTab === 'preview' && renderPreview()
        )
      : React.createElement('div', {
          className: 'cms-editor-grid' + (inspectorOpen ? ' has-inspector' : '') + (sidenavOpen ? ' has-sections' : ' sections-collapsed'),
          style: {
            flex: 1,
            minHeight: 0,
            display: 'grid',
            gridTemplateColumns: isDesktop
              ? (sidenavOpen
                  ? (inspectorOpen ? '240px minmax(0,1fr) 320px' : '240px minmax(0,1fr)')
                  : (inspectorOpen ? 'minmax(0,1fr) 320px' : 'minmax(0,1fr)'))
              : '220px minmax(0,1fr)',
            transition: 'grid-template-columns 0.2s ease'
          }
        },
          sidenavOpen && React.createElement('div', { className:'cms-sections-col', style:{ borderRight:`1px solid ${C.border}`, minHeight:0, overflow:'hidden' } }, renderSectionList()),
          isDesktop ? React.createElement('div', { className:'cms-canvas-col', style:{ minHeight:0, overflow:'hidden', position:'relative' } },
            renderPreview(),
            // Floating reopen chips when panels are collapsed
            !sidenavOpen && React.createElement('button', {
              type: 'button',
              className: 'cms-panel-reopen cms-panel-reopen-left',
              title: 'Show sections',
              onClick: () => setSidenavOpen(true),
              style: { position:'absolute', left:8, top:8, zIndex:5, height:32, padding:'0 10px', borderRadius:8, border:`1px solid ${C.border}`, background:C.surface, color:C.textSec, display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:11, fontWeight:700, boxShadow:'0 4px 14px rgba(0,0,0,.08)', fontFamily:'var(--font-ui)' }
            }, React.createElement(Icon, { name:'chevR', size:12 }), 'Sections'),
            inspectorCollapsed && React.createElement('button', {
              type: 'button',
              className: 'cms-panel-reopen cms-panel-reopen-right',
              title: selectedKey ? 'Show editor' : 'Show page settings',
              onClick: expandInspector,
              style: { position:'absolute', right:8, top:8, zIndex:5, height:32, padding:'0 10px', borderRadius:8, border:`1px solid ${C.border}`, background:C.surface, color:C.textSec, display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:11, fontWeight:700, boxShadow:'0 4px 14px rgba(0,0,0,.08)', fontFamily:'var(--font-ui)' }
            }, selectedKey ? 'Editor' : 'Page settings', React.createElement(Icon, { name:'chevL', size:12 }))
          ) : React.createElement('div', { style:{ minHeight:0, overflow:'hidden' } }, renderInspector(true)),
          isDesktop && inspectorOpen && React.createElement('div', { className:'cms-inspector-col', style:{ borderLeft:`1px solid ${C.border}`, minHeight:0, overflow:'hidden' } }, renderInspector(false))
        ),
    showFontPicker && React.createElement('div', { style:{ position:'fixed', top:60, right:16, zIndex:240, width:260, background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:10, boxShadow:'0 20px 50px rgba(0,0,0,.2)' } }, FONT_PRESETS_CMS.map(p => React.createElement('button', { key:p.key, onClick:()=>saveFont(p.key), style:{ width:'100%', padding:10, marginBottom:6, borderRadius:10, border:`1px solid ${activeFont === p.key ? C.purple : C.border}`, background:activeFont === p.key ? C.purpleDim : C.bg, color:C.text, textAlign:'left', cursor:'pointer' } }, React.createElement('div', { style:{ fontWeight:900 } }, p.label), React.createElement('div', { style:{ color:C.textMut, fontSize:11 } }, p.sub)))) ,
    renderImagePicker(),
    renderAddSectionModal(),
    renderQuickAddPageModal(),
    renderCopyModal()
  );
}


Object.assign(window, {
  CmsPageEditorView,
});
