// ── CMS Views — website, pages, page-editor, images, brand, templates ─────────
// Routes: cms-website, cms-pages, cms-page-editor, cms-images, cms-brand, cms-templates
// Removed: cms-navigation (merged into pages), cms-publish (inline Save/Publish buttons)

const R2_CDN_BASE = "https://assets.companionsofcaddo.org";

function cmsNotify(setter, text, type = "ok") {
  setter({ text, type });
  setTimeout(() => setter({ text: "", type: "" }), 4000);
}

function CmsNotice({ n }) {
  if (!n?.text) return null;
  const isErr = n.type === "error";
  return React.createElement("div", {
    style: {
      padding: "10px 16px", borderRadius: 10, marginBottom: 16,
      background: isErr ? C.redDim : C.greenDim,
      border: `1px solid ${isErr ? C.red + "66" : C.green + "66"}`,
      color: isErr ? C.red : C.green, fontSize: 13, fontWeight: 500
    }
  }, n.text);
}

function CmsPageWrapper({ children, padding = "28px 28px 60px" }) {
  return React.createElement("div", { style: { padding, flex: 1 } }, children);
}

function PageStatusBadge({ status }) {
  const map = {
    published: { bg: "#d1fae5", color: "#065f46", border: "#6ee7b7", label: "Published" },
    draft:     { bg: "#fef3c7", color: "#92400e", border: "#fcd34d", label: "Draft" },
    archived:  { bg: "#f3f4f6", color: "#4b5563", border: "#d1d5db", label: "Archived" },
  };
  const s = map[status] || map.draft;
  return React.createElement("span", {
    style: { display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color, border: `1px solid ${s.border}`, whiteSpace: "nowrap" }
  },
    React.createElement("span", { style: { width: 5, height: 5, borderRadius: "50%", background: s.color } }),
    s.label
  );
}

// ── /dashboard/cms/website ────────────────────────────────────────────────────
function CmsWebsiteView({ onNavigate }) {
  const [data, setData] = React.useState(null);
  const [publishing, setPublishing] = React.useState(null);
  const [notice, setNotice] = React.useState({});
  const notify = (t, type) => cmsNotify(setNotice, t, type);

  React.useEffect(() => {
    fetch("/api/cms/bootstrap", { credentials: "include" })
      .then(r => r.json()).then(d => { if (d.success) setData(d); }).catch(() => {});
  }, []);

  const pages = data?.pages?.length ? data.pages : [
    { route_path: "/",          title: "Home",      status: "published", sort_order: 10 },
    { route_path: "/about",     title: "About",     status: "published", sort_order: 20 },
    { route_path: "/adopt",     title: "Adopt",     status: "published", sort_order: 30 },
    { route_path: "/services",  title: "Foster",    status: "published", sort_order: 40 },
    { route_path: "/donate",    title: "Donate",    status: "published", sort_order: 50 },
    { route_path: "/community", title: "Community", status: "published", sort_order: 60 },
  ];

  const publishPage = async (route) => {
    setPublishing(route);
    try {
      const res = await fetch("/api/cms/publish", { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ route_path: route }) });
      const d = await res.json();
      notify(d.success ? `Published ${route} — live in ~5s` : (d.error || "Publish failed"), d.success ? "ok" : "error");
    } catch (e) { notify("Publish failed: " + e.message, "error"); }
    setPublishing(null);
  };

  const draftCount = pages.filter(p => p.status === "draft").length;
  const lastPub = pages.filter(p => p.published_at || p.updated_at).sort((a, b) => new Date(b.published_at || b.updated_at) - new Date(a.published_at || a.updated_at))[0];

  return React.createElement(CmsPageWrapper, null,
    React.createElement(PageHeader, {
      title: "CMS Website", subtitle: "Manage and publish your public website",
      action: React.createElement("div", { style: { display: "flex", gap: 8 } },
        React.createElement(Btn, { variant: "secondary", size: "sm", icon: "eye", onClick: () => window.open("https://companionsofcaddo.org", "_blank") }, "Preview Site"),
        React.createElement(Btn, { size: "sm", icon: "edit", onClick: () => onNavigate("cms-pages") }, "Manage Pages")
      )
    }),
    React.createElement(CmsNotice, { n: notice }),
    React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 12, marginBottom: 28 } },
      React.createElement(StatCard, { icon: "globe", iconColor: C.green, label: "Site Status", value: "Live", sub: "companionsofcaddo.org", subPositive: true }),
      React.createElement(StatCard, { icon: "edit", iconColor: draftCount > 0 ? C.yellow : C.textMut, label: "Draft Changes", value: String(draftCount), sub: draftCount > 0 ? "Unpublished edits" : "All published" }),
      React.createElement(StatCard, { icon: "publish", iconColor: C.purple, label: "Last Published", value: lastPub ? new Date(lastPub.published_at || lastPub.updated_at).toLocaleDateString() : "—", sub: lastPub?.title || "" }),
      React.createElement(StatCard, { icon: "layers", iconColor: C.teal, label: "Total Pages", value: String(pages.length), sub: "Active pages" }),
    ),
    React.createElement("h3", { style: { fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 14 } }, "Your Pages"),
    React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 12, marginBottom: 28 } },
      pages.map(p =>
        React.createElement(Card, { key: p.route_path, style: { padding: "16px 18px" } },
          React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 } },
            React.createElement("div", null,
              React.createElement("div", { style: { fontSize: 15, fontWeight: 700, color: C.text } }, p.title || p.route_path),
              React.createElement("div", { style: { fontSize: 11, color: C.textMut, marginTop: 2, fontFamily: "var(--font-mono)" } }, p.route_path)
            ),
            React.createElement(PageStatusBadge, { status: p.status })
          ),
          p.updated_at && React.createElement("div", { style: { fontSize: 11, color: C.textMut, marginBottom: 10 } }, "Updated " + new Date(p.updated_at).toLocaleDateString()),
          React.createElement("div", { style: { display: "flex", gap: 6 } },
            React.createElement(Btn, { size: "sm", variant: "secondary", icon: "edit", onClick: () => onNavigate("cms-page-editor", { pageId: p.route_path.replace(/\//g, "_") || "_home" }) }, "Edit"),
            React.createElement(Btn, { size: "sm", variant: "ghost", icon: "publish", disabled: publishing === p.route_path, onClick: () => publishPage(p.route_path) }, publishing === p.route_path ? "Publishing…" : "Publish")
          )
        )
      )
    ),
    React.createElement("h3", { style: { fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 14 } }, "Quick Actions"),
    React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 10 } },
      [
        { key: "cms-pages",     icon: "layers",   color: C.purpleDim, iconColor: C.purpleL, label: "Manage Pages",     sub: "Add, edit, reorder pages" },
        { key: "cms-images",    icon: "image",    color: C.tealDim,   iconColor: C.teal,    label: "Image Library",    sub: "Upload and manage media" },
        { key: "cms-brand",     icon: "tag",      color: C.yellowDim, iconColor: C.yellow,  label: "Brand & Settings", sub: "Colors, logos, org info" },
        { key: "cms-templates", icon: "sparkles", color: C.greenDim,  iconColor: C.green,   label: "Templates",        sub: "Browse section types" },
      ].map(item =>
        React.createElement(Card, { key: item.key, hover: true, onClick: () => onNavigate(item.key),
          style: { padding: "16px 20px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", minWidth: 180 } },
          React.createElement("div", { style: { width: 38, height: 38, borderRadius: 10, background: item.color, display: "flex", alignItems: "center", justifyContent: "center" } },
            React.createElement(Icon, { name: item.icon, size: 18, style: { color: item.iconColor } })),
          React.createElement("div", null,
            React.createElement("div", { style: { fontWeight: 700, fontSize: 13, color: C.text } }, item.label),
            React.createElement("div", { style: { fontSize: 11, color: C.textSec } }, item.sub)
          )
        )
      )
    )
  );
}

// ── /dashboard/cms/pages ──────────────────────────────────────────────────────
const PAGE_TEMPLATES = [
  { key: "default",   label: "Content Page",  icon: "docs",   desc: "Flexible content with sections" },
  { key: "home",      label: "Homepage",       icon: "home",   desc: "Hero, stats, CTAs" },
  { key: "adoption",  label: "Adoption Page",  icon: "paw",    desc: "Animal grid + application CTA" },
  { key: "donation",  label: "Donation Page",  icon: "dollar", desc: "Fundraising layout with giving tiers" },
  { key: "services",  label: "Services Page",  icon: "heart",  desc: "Program + service listings" },
];

function CmsPagesView({ onNavigate }) {
  const [pages, setPages] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [notice, setNotice] = React.useState({});
  const [showAdd, setShowAdd] = React.useState(false);
  const [newPage, setNewPage] = React.useState({ title: "", slug: "", template_key: "default" });
  const [saving, setSaving] = React.useState(false);
  const [publishing, setPublishing] = React.useState(null);
  const notify = (t, type) => cmsNotify(setNotice, t, type);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cms/bootstrap", { credentials: "include" });
      const d = await res.json();
      if (d.success) setPages(d.pages?.length ? d.pages : [
        { route_path: "/", slug: "home", title: "Home", status: "published", sort_order: 10, is_homepage: 1, updated_at: new Date().toISOString() },
        { route_path: "/about", slug: "about", title: "About", status: "published", sort_order: 20, updated_at: new Date().toISOString() },
        { route_path: "/adopt", slug: "adopt", title: "Adopt", status: "published", sort_order: 30, updated_at: new Date().toISOString() },
        { route_path: "/services", slug: "services", title: "Foster", status: "published", sort_order: 40, updated_at: new Date().toISOString() },
        { route_path: "/donate", slug: "donate", title: "Donate", status: "published", sort_order: 50, updated_at: new Date().toISOString() },
        { route_path: "/community", slug: "community", title: "Community", status: "published", sort_order: 60, updated_at: new Date().toISOString() },
      ]);
    } catch {}
    setLoading(false);
  };

  React.useEffect(() => { load(); }, []);

  const addPage = async () => {
    if (!newPage.title.trim()) return notify("Title is required", "error");
    setSaving(true);
    const slug = newPage.slug || newPage.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    try {
      const res = await fetch("/api/cms/page/save", { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ page: { title: newPage.title, route_path: `/${slug}`, slug, template_key: newPage.template_key, status: "draft" } }) });
      const d = await res.json();
      if (d.success) { notify(`Page "${newPage.title}" created`); setShowAdd(false); setNewPage({ title: "", slug: "", template_key: "default" }); await load(); }
      else notify(d.error || "Failed to create page", "error");
    } catch (e) { notify("Error: " + e.message, "error"); }
    setSaving(false);
  };

  const publishPage = async (route) => {
    setPublishing(route);
    try {
      const res = await fetch("/api/cms/publish", { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ route_path: route }) });
      const d = await res.json();
      notify(d.success ? `Published ${route}` : (d.error || "Publish failed"), d.success ? "ok" : "error");
      if (d.success) await load();
    } catch { notify("Publish failed", "error"); }
    setPublishing(null);
  };

  const PAGE_COLS = [
    { key: "title", label: "Page",
      render: (v, row) => React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10 } },
        React.createElement("div", { style: { width: 6, height: 6, borderRadius: "50%", background: row.is_homepage ? C.purple : C.border, flexShrink: 0 } }),
        React.createElement("div", null,
          React.createElement("div", { style: { fontWeight: 600, fontSize: 13, color: C.text } }, v || row.route_path),
          React.createElement("div", { style: { fontSize: 11, color: C.textMut, fontFamily: "var(--font-mono)" } }, row.route_path)
        )
      )
    },
    { key: "status", label: "Status", render: v => React.createElement(PageStatusBadge, { status: v }) },
    { key: "updated_at", label: "Last Updated", render: v => React.createElement("span", { style: { fontSize: 12, color: C.textSec } }, v ? new Date(v).toLocaleDateString() : "—") },
    { key: "route_path", label: "",
      render: (v, row) => React.createElement("div", { style: { display: "flex", gap: 6, justifyContent: "flex-end" } },
        React.createElement(Btn, { size: "sm", variant: "secondary", icon: "edit", onClick: (e) => { e.stopPropagation(); onNavigate("cms-page-editor", { pageId: v.replace(/\//g, "_") || "_home" }); } }, "Edit"),
        React.createElement(Btn, { size: "sm", variant: "ghost", icon: "eye", onClick: (e) => { e.stopPropagation(); window.open(v, "_blank"); } }, ""),
        React.createElement(Btn, { size: "sm", icon: "publish", disabled: publishing === v, onClick: (e) => { e.stopPropagation(); publishPage(v); } }, publishing === v ? "…" : "Publish")
      )
    },
  ];

  return React.createElement(CmsPageWrapper, null,
    React.createElement(PageHeader, { title: "Pages", subtitle: "Add, edit, and publish your website pages", action: React.createElement(Btn, { icon: "plus", onClick: () => setShowAdd(true) }, "Add Page") }),
    React.createElement(CmsNotice, { n: notice }),
    loading
      ? React.createElement("div", { style: { color: C.textSec, fontSize: 13, padding: 20 } }, "Loading pages…")
      : React.createElement(Card, { style: { overflow: "hidden" } }, React.createElement(Table, { cols: PAGE_COLS, rows: pages, onRowClick: row => onNavigate("cms-page-editor", { pageId: row.route_path.replace(/\//g, "_") || "_home" }), emptyMsg: "No pages found" })),
    React.createElement(Modal, { open: showAdd, onClose: () => setShowAdd(false), title: "Add New Page", width: 520 },
      React.createElement("div", { style: { display: "grid", gap: 16 } },
        React.createElement("div", null,
          React.createElement("label", { style: { display: "block", fontSize: 12, fontWeight: 600, color: C.textSec, marginBottom: 6 } }, "Page Title"),
          React.createElement(Input, { value: newPage.title, onChange: v => setNewPage(p => ({ ...p, title: v })), placeholder: "e.g. About Us" })
        ),
        React.createElement("div", null,
          React.createElement("label", { style: { display: "block", fontSize: 12, fontWeight: 600, color: C.textSec, marginBottom: 6 } }, "URL Slug"),
          React.createElement("div", { style: { display: "flex", alignItems: "center" } },
            React.createElement("span", { style: { padding: "9px 10px", background: C.bg2, border: `1px solid ${C.border}`, borderRight: "none", borderRadius: "8px 0 0 8px", fontSize: 13, color: C.textMut } }, "/"),
            React.createElement("input", { value: newPage.slug, onChange: e => setNewPage(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })), placeholder: "auto-generated from title", style: { flex: 1, padding: "9px 12px", border: `1px solid ${C.border}`, borderRadius: "0 8px 8px 0", background: C.surface, color: C.text, fontSize: 13, outline: "none", fontFamily: "var(--font-mono)" } })
          )
        ),
        React.createElement("div", null,
          React.createElement("label", { style: { display: "block", fontSize: 12, fontWeight: 600, color: C.textSec, marginBottom: 10 } }, "Template"),
          React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 } },
            PAGE_TEMPLATES.map(t =>
              React.createElement("div", { key: t.key, onClick: () => setNewPage(p => ({ ...p, template_key: t.key })),
                style: { padding: "12px 14px", borderRadius: 10, cursor: "pointer", border: `2px solid ${newPage.template_key === t.key ? C.purple : C.border}`, background: newPage.template_key === t.key ? C.purpleDim : C.surface, transition: "all .12s" } },
                React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 4 } },
                  React.createElement(Icon, { name: t.icon, size: 14, style: { color: newPage.template_key === t.key ? C.purpleL : C.textSec } }),
                  React.createElement("span", { style: { fontWeight: 600, fontSize: 13, color: C.text } }, t.label)
                ),
                React.createElement("div", { style: { fontSize: 11, color: C.textSec } }, t.desc)
              )
            )
          )
        ),
        React.createElement("div", { style: { display: "flex", gap: 8, justifyContent: "flex-end" } },
          React.createElement(Btn, { variant: "secondary", onClick: () => setShowAdd(false) }, "Cancel"),
          React.createElement(Btn, { onClick: addPage, disabled: saving }, saving ? "Creating…" : "Create Page")
        )
      )
    )
  );
}

// ── /dashboard/cms/pages/:pageId — Page Editor ────────────────────────────────
const FONT_PRESETS_CMS = [
  { key: "fraunces_dm",    label: "Editorial",  sub: "Fraunces + DM Sans",            display: "Fraunces, Georgia, serif",          body: "DM Sans, system-ui, sans-serif" },
  { key: "playfair_inter", label: "Classic",    sub: "Playfair Display + Inter",       display: "Playfair Display, Georgia, serif",   body: "Inter, system-ui, sans-serif" },
  { key: "lora_nunito",    label: "Warm",       sub: "Lora + Nunito",                  display: "Lora, Georgia, serif",               body: "Nunito, system-ui, sans-serif" },
  { key: "dm_only",        label: "Clean Sans", sub: "DM Sans (full)",                 display: "DM Sans, system-ui, sans-serif",     body: "DM Sans, system-ui, sans-serif" },
  { key: "cormorant_jost", label: "Luxury",     sub: "Cormorant Garamond + Jost",      display: "Cormorant Garamond, Georgia, serif",  body: "Jost, system-ui, sans-serif" },
];

function CmsPageEditorView({ pageId, onNavigate }) {
  const route = React.useMemo(() => {
    if (!pageId || pageId === "_home" || pageId === "_") return "/";
    return "/" + pageId.replace(/^_/, "").replace(/_/g, "/");
  }, [pageId]);

  const [pageData, setPageData] = React.useState({ page: null, sections: [], blocks: [] });
  const [selectedKey, setSelectedKey] = React.useState(null);
  const [mode, setMode] = React.useState("desktop");
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState({});
  const [activeFont, setActiveFont] = React.useState("fraunces_dm");
  const [showFontPicker, setShowFontPicker] = React.useState(false);
  const notify = (t, type) => cmsNotify(setNotice, t, type);

  const loadPage = async () => {
    try {
      const [pageRes, bootRes] = await Promise.all([
        fetch(`/api/cms/page?route=${encodeURIComponent(route)}`, { credentials: "include" }),
        fetch("/api/cms/bootstrap", { credentials: "include" })
      ]);
      const pd = await pageRes.json();
      const bd = await bootRes.json();
      if (pd.success) { setPageData(pd); setSelectedKey((pd.sections || [])[0]?.section_key || null); }
      if (bd.success) {
        const cfg = (() => { try { return JSON.parse(bd.brand?.config_json || "{}"); } catch { return {}; } })();
        setActiveFont(cfg.active_font_preset || "fraunces_dm");
      }
    } catch {}
  };

  React.useEffect(() => { loadPage(); }, [route]);

  const selected = React.useMemo(() => (pageData.sections || []).find(s => s.section_key === selectedKey) || null, [pageData, selectedKey]);

  const setField = (key, val) => {
    if (!selected) return;
    setPageData(prev => ({ ...prev, sections: prev.sections.map(s => s.section_key === selected.section_key ? { ...s, [key]: val } : s) }));
  };

  const saveSection = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const res = await fetch("/api/cms/section/save", { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ section: selected }) });
      const d = await res.json();
      notify(d.success ? "Section saved as draft" : (d.error || "Save failed"), d.success ? "ok" : "error");
      if (d.success) await loadPage();
    } catch (e) { notify("Save failed: " + e.message, "error"); }
    setBusy(false);
  };

  const publishPage = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/cms/publish", { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ route_path: route }) });
      const d = await res.json();
      notify(d.success ? `Published ${route} — live in ~5s` : (d.error || "Publish failed"), d.success ? "ok" : "error");
      if (d.success) await loadPage();
    } catch (e) { notify("Publish failed: " + e.message, "error"); }
    setBusy(false);
  };

  const saveFont = async (key) => {
    setActiveFont(key);
    try { await fetch("/api/cms/brand/config", { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ active_font_preset: key }) }); notify(`Font changed to "${FONT_PRESETS_CMS.find(p => p.key === key)?.label}" — re-publish to apply`); } catch {}
    setShowFontPicker(false);
  };

  const fontDef = FONT_PRESETS_CMS.find(p => p.key === activeFont) || FONT_PRESETS_CMS[0];
  const previewWidth = mode === "mobile" ? 390 : mode === "tablet" ? 768 : "100%";
  const pageTitle = pageData.page?.title || route;

  const inpStyle = { width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 8, background: C.bg, color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "var(--font-ui)" };
  const lblStyle = { display: "block", fontSize: 11, fontWeight: 700, color: C.textSec, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" };

  return React.createElement("div", { style: { display: "flex", flexDirection: "column", flex: 1, height: "100%", overflow: "hidden" } },
    // Editor topbar
    React.createElement("div", { style: { height: 52, background: C.surface, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", padding: "0 16px", gap: 10, flexShrink: 0 } },
      React.createElement("button", { onClick: () => onNavigate("cms-pages"), style: { background: "none", border: "none", color: C.textSec, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontFamily: "var(--font-ui)" } }, React.createElement(Icon, { name: "chevL", size: 14 }), "Pages"),
      React.createElement("div", { style: { width: 1, height: 20, background: C.border } }),
      React.createElement("div", { style: { flex: 1, fontSize: 13, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, pageTitle),
      notice.text && React.createElement("div", { style: { fontSize: 11, color: notice.type === "error" ? C.red : C.green, fontWeight: 500 } }, notice.text),
      ...["desktop", "tablet", "mobile"].map(m => React.createElement("button", { key: m, onClick: () => setMode(m), style: { padding: "5px 10px", borderRadius: 7, border: `1px solid ${mode === m ? C.purple : C.border}`, background: mode === m ? C.purpleDim : "transparent", color: mode === m ? C.purpleL : C.textSec, fontSize: 12, cursor: "pointer", fontFamily: "var(--font-ui)" } }, m.charAt(0).toUpperCase() + m.slice(1))),
      React.createElement("button", { onClick: () => setShowFontPicker(v => !v), style: { padding: "5px 10px", borderRadius: 7, border: `1px solid ${C.border}`, background: "transparent", color: C.textSec, fontSize: 12, cursor: "pointer", fontFamily: "var(--font-ui)" } }, "Aa"),
      React.createElement("button", { onClick: () => window.open(route, "_blank"), style: { padding: "5px 10px", borderRadius: 7, border: `1px solid ${C.border}`, background: "transparent", color: C.textSec, fontSize: 12, cursor: "pointer", fontFamily: "var(--font-ui)" } }, "Preview"),
      React.createElement(Btn, { size: "sm", variant: "secondary", onClick: saveSection, disabled: busy || !selected }, "Save Draft"),
      React.createElement(Btn, { size: "sm", onClick: publishPage, disabled: busy }, busy ? "Publishing…" : "Publish")
    ),

    // Font picker
    showFontPicker && React.createElement("div", { style: { position: "absolute", top: 112, right: 16, zIndex: 300, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, width: 340, boxShadow: "0 8px 32px rgba(0,0,0,.12)" } },
      React.createElement("div", { style: { fontSize: 11, fontWeight: 700, color: C.textSec, marginBottom: 12 } }, "FONT PRESETS"),
      FONT_PRESETS_CMS.map(p => React.createElement("div", { key: p.key, onClick: () => saveFont(p.key), style: { padding: "10px 12px", borderRadius: 9, cursor: "pointer", border: `2px solid ${activeFont === p.key ? C.purple : C.border}`, background: activeFont === p.key ? C.purpleDim : "transparent", marginBottom: 6, transition: "all .12s" } },
        React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 } },
          React.createElement("span", { style: { fontWeight: 700, fontSize: 12, color: C.text } }, p.label),
          React.createElement("span", { style: { fontSize: 10, color: C.textSec } }, p.sub)
        ),
        React.createElement("div", { style: { fontFamily: p.display, fontSize: 17, color: C.text } }, "Every dog deserves a way out."),
        activeFont === p.key && React.createElement("div", { style: { fontSize: 10, color: C.purple, fontWeight: 700, marginTop: 3 } }, "ACTIVE")
      ))
    ),

    // 3-panel
    React.createElement("div", { style: { display: "grid", gridTemplateColumns: "210px 1fr 290px", flex: 1, overflow: "hidden" } },

      // Sections list
      React.createElement("div", { style: { borderRight: `1px solid ${C.border}`, overflowY: "auto", padding: 12, background: C.surface } },
        React.createElement("div", { style: { fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.textMut, marginBottom: 10, padding: "2px 4px" } }, "Sections"),
        (pageData.sections || []).length === 0
          ? React.createElement("p", { style: { fontSize: 12, color: C.textMut, padding: 8 } }, "No sections found")
          : (pageData.sections || []).map(s =>
              React.createElement("div", { key: s.section_key, onClick: () => setSelectedKey(s.section_key),
                style: { padding: "10px 12px", borderRadius: 9, marginBottom: 6, cursor: "pointer", border: `1px solid ${selectedKey === s.section_key ? C.purple : C.border}`, background: selectedKey === s.section_key ? C.purpleDim : C.bg, transition: "all .12s" } },
                React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
                  React.createElement("div", { style: { fontSize: 13, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 130 } }, s.heading || s.title || s.section_key),
                  s.is_visible === 0 && React.createElement("span", { style: { fontSize: 10, color: C.red } }, "Hidden")
                ),
                React.createElement("div", { style: { fontSize: 10, color: C.textMut, marginTop: 3 } }, `${s.section_type} · ${s.section_key}`)
              )
            )
      ),

      // Preview
      React.createElement("div", { style: { overflowY: "auto", padding: 16, background: C.bg2 } },
        React.createElement("div", { style: { width: previewWidth, maxWidth: "100%", margin: "0 auto", border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden", background: "#090d18", minHeight: 500, transition: "width .2s ease" } },
          React.createElement("div", { style: { padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,.08)", display: "flex", justifyContent: "space-between", alignItems: "center" } },
            React.createElement("img", { src: "https://assets.companionsofcaddo.org/static/global/companionsofcpa-newlogo.webp", style: { height: 30, objectFit: "contain" } }),
            mode !== "mobile" && React.createElement("div", { style: { display: "flex", gap: 16, fontSize: 12, color: "rgba(255,255,255,.6)", fontFamily: fontDef.body } }, "Home", "About", "Foster", "Adopt", "Donate")
          ),
          (pageData.sections || []).map(s =>
            React.createElement("div", { key: s.section_key, onClick: () => setSelectedKey(s.section_key),
              style: { padding: "24px", borderBottom: "1px solid rgba(255,255,255,.06)", cursor: "pointer", outline: selectedKey === s.section_key ? `2px solid ${C.purple}` : "none", outlineOffset: -2, background: selectedKey === s.section_key ? "rgba(124,58,237,.06)" : "transparent" } },
              s.eyebrow && React.createElement("div", { style: { color: "#a78bfa", fontSize: 10, fontWeight: 800, letterSpacing: ".15em", textTransform: "uppercase", marginBottom: 8 } }, s.eyebrow),
              React.createElement("div", { style: { fontFamily: fontDef.display, fontSize: mode === "mobile" ? 22 : 28, fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.1, color: "#f0ece6", marginBottom: 10 } }, s.heading || s.title || s.section_key),
              s.subheading && React.createElement("div", { style: { fontFamily: fontDef.body, fontSize: 14, color: "rgba(255,255,255,.7)", marginBottom: 8 } }, s.subheading),
              s.body && React.createElement("p", { style: { fontFamily: fontDef.body, fontSize: 13, color: "#9ca3af", lineHeight: 1.65, maxWidth: 600, margin: 0 } }, s.body.slice(0, 180) + (s.body.length > 180 ? "…" : "")),
              s.image_url && React.createElement("img", { src: s.image_url, style: { width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 12, marginTop: 12 } }),
              (s.cta_label || s.cta_secondary_label) && React.createElement("div", { style: { display: "flex", gap: 8, marginTop: 14 } },
                s.cta_label && React.createElement("span", { style: { padding: "8px 16px", borderRadius: 9, background: "#7c3aed", color: "#fff", fontSize: 13, fontWeight: 700 } }, s.cta_label),
                s.cta_secondary_label && React.createElement("span", { style: { padding: "8px 16px", borderRadius: 9, border: "1px solid rgba(255,255,255,.2)", fontSize: 13, color: "rgba(255,255,255,.7)" } }, s.cta_secondary_label)
              )
            )
          )
        )
      ),

      // Inspector
      React.createElement("div", { style: { borderLeft: `1px solid ${C.border}`, overflowY: "auto", padding: 16, background: C.surface } },
        React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 } },
          React.createElement("div", { style: { fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.textMut } }, "Inspector"),
          selected && React.createElement("label", { style: { display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.textSec, cursor: "pointer" } },
            React.createElement("input", { type: "checkbox", checked: selected.is_visible !== 0, onChange: e => setField("is_visible", e.target.checked ? 1 : 0) }),
            "Visible"
          )
        ),
        selected ? React.createElement("div", { style: { display: "grid", gap: 12 } },
          React.createElement("div", { style: { fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 4 } }, selected.heading || selected.section_key),
          ...["eyebrow", "heading", "subheading"].map(key =>
            React.createElement("div", { key },
              React.createElement("label", { style: lblStyle }, key.charAt(0).toUpperCase() + key.slice(1)),
              React.createElement("input", { value: selected[key] || "", onChange: e => setField(key, e.target.value), style: inpStyle })
            )
          ),
          React.createElement("div", null,
            React.createElement("label", { style: lblStyle }, "Body"),
            React.createElement("textarea", { value: selected.body || "", rows: 4, onChange: e => setField("body", e.target.value), style: { ...inpStyle, resize: "vertical" } })
          ),
          React.createElement("div", null,
            React.createElement("label", { style: lblStyle }, "Image URL"),
            React.createElement("input", { value: selected.image_url || "", onChange: e => setField("image_url", e.target.value), placeholder: "https://assets.companionsofcaddo.org/…", style: { ...inpStyle, fontSize: 11, fontFamily: "var(--font-mono)" } })
          ),
          ...["cta_label", "cta_href", "cta_secondary_label", "cta_secondary_href"].map(key =>
            React.createElement("div", { key },
              React.createElement("label", { style: lblStyle }, key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())),
              React.createElement("input", { value: selected[key] || "", onChange: e => setField(key, e.target.value), style: inpStyle })
            )
          ),
          React.createElement("div", { style: { display: "grid", gap: 6, marginTop: 4 } },
            React.createElement(Btn, { onClick: saveSection, disabled: busy, icon: "check2", variant: "secondary" }, busy ? "Saving…" : "Save Draft"),
            React.createElement(Btn, { onClick: publishPage, disabled: busy, icon: "publish" }, busy ? "Publishing…" : "Publish Live"),
            React.createElement("button", { onClick: () => window.dispatchEvent(new CustomEvent("agentsam:open")), style: { padding: "9px 12px", borderRadius: 9, border: `1px solid ${C.border}`, background: C.purpleDim, color: C.purpleL, fontWeight: 600, cursor: "pointer", fontSize: 12, fontFamily: "var(--font-ui)" } }, "Ask Agent Sam to improve this section")
          )
        ) : React.createElement("div", { style: { color: C.textMut, fontSize: 13 } }, "Click a section to edit.")
      )
    )
  );
}

// ── /dashboard/cms/images ─────────────────────────────────────────────────────
function CmsImagesView({ onNavigate }) {
  const [assets, setAssets] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const [uploading, setUploading] = React.useState(false);
  const [notice, setNotice] = React.useState({});
  const [editAlt, setEditAlt] = React.useState(null);
  const [viewMode, setViewMode] = React.useState("grid");
  const notify = (t, type) => cmsNotify(setNotice, t, type);
  const fileInputRef = React.useRef(null);

  const load = async () => {
    setLoading(true);
    try { const res = await fetch("/api/cms/assets", { credentials: "include" }); const d = await res.json(); if (d.success) setAssets(d.assets || []); } catch {}
    setLoading(false);
  };

  React.useEffect(() => { load(); }, []);

  const contexts = ["all", ...Array.from(new Set(assets.map(a => a.usage_context).filter(Boolean)))];
  const filtered = assets.filter(a => {
    const matchCtx = filter === "all" || a.usage_context === filter;
    const matchSearch = !search || (a.label || a.filename || "").toLowerCase().includes(search.toLowerCase());
    return matchCtx && matchSearch;
  });

  const handleUpload = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    let uploaded = 0;
    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("usage_context", filter === "all" ? "general" : filter);
        const res = await fetch("/api/cms/asset/upload", { method: "POST", credentials: "include", body: formData });
        const d = await res.json();
        if (d.success) uploaded++; else notify(`Failed: ${file.name}`, "error");
      } catch { notify(`Error uploading ${file.name}`, "error"); }
    }
    if (uploaded > 0) { notify(`${uploaded} image${uploaded > 1 ? "s" : ""} uploaded`); await load(); }
    setUploading(false);
  };

  const saveAltText = async (asset, altText) => {
    try {
      const res = await fetch("/api/cms/asset/save", { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ asset: { ...asset, alt_text: altText } }) });
      const d = await res.json();
      if (d.success) { notify("Alt text saved"); await load(); } else notify(d.error || "Save failed", "error");
    } catch { notify("Save failed", "error"); }
    setEditAlt(null);
  };

  const copyUrl = (url) => { navigator.clipboard.writeText(url).then(() => notify("URL copied")); };

  return React.createElement(CmsPageWrapper, null,
    React.createElement(PageHeader, {
      title: "Images", subtitle: `${assets.length} images in your media library`,
      action: React.createElement("div", { style: { display: "flex", gap: 8 } },
        React.createElement("button", { onClick: () => fileInputRef.current?.click(), disabled: uploading, style: { display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 8, border: `1px solid ${C.purple}`, background: C.purple, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-ui)" } }, React.createElement(Icon, { name: "plus", size: 14 }), uploading ? "Uploading…" : "Upload Images"),
        React.createElement("input", { ref: fileInputRef, type: "file", accept: "image/*", multiple: true, style: { display: "none" }, onChange: e => handleUpload(e.target.files) })
      )
    }),
    React.createElement(CmsNotice, { n: notice }),
    React.createElement("div", { style: { marginBottom: 16, padding: "10px 14px", borderRadius: 10, background: C.bg2, border: `1px solid ${C.border}`, fontSize: 12, color: C.textSec, display: "flex", alignItems: "center", gap: 8 } },
      React.createElement(Icon, { name: "link", size: 14 }), "Google Drive integration coming soon — drag files directly from Drive."
    ),
    React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" } },
      React.createElement(Input, { value: search, onChange: setSearch, placeholder: "Search images…", icon: "search", style: { width: 240 } }),
      React.createElement("div", { style: { display: "flex", gap: 4, flexWrap: "wrap" } },
        contexts.map(ctx => React.createElement("button", { key: ctx, onClick: () => setFilter(ctx),
          style: { padding: "5px 12px", borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: "pointer", border: `1px solid ${filter === ctx ? C.purple : C.border}`, background: filter === ctx ? C.purpleDim : "transparent", color: filter === ctx ? C.purpleL : C.textSec, fontFamily: "var(--font-ui)" }
        }, ctx === "all" ? `All (${assets.length})` : `${ctx} (${assets.filter(a => a.usage_context === ctx).length})`))
      ),
      React.createElement("div", { style: { marginLeft: "auto", display: "flex", gap: 2, background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 8, padding: 3 } },
        [["grid", "image"], ["list", "docs"]].map(([m, icon]) => React.createElement("button", { key: m, onClick: () => setViewMode(m), style: { padding: "4px 8px", borderRadius: 6, border: "none", background: viewMode === m ? C.purple : "none", color: viewMode === m ? "#fff" : C.textSec, cursor: "pointer" } }, React.createElement(Icon, { name: icon, size: 14 })))
      )
    ),
    React.createElement("div", { onDragOver: e => e.preventDefault(), onDrop: e => { e.preventDefault(); handleUpload(e.dataTransfer.files); }, style: { border: `2px dashed ${C.border}`, borderRadius: 12, padding: 24, textAlign: "center", marginBottom: 20, color: C.textMut, fontSize: 13, cursor: "pointer", transition: "border-color .15s" }, onMouseEnter: e => e.currentTarget.style.borderColor = C.purple, onMouseLeave: e => e.currentTarget.style.borderColor = C.border, onClick: () => fileInputRef.current?.click() },
      React.createElement(Icon, { name: "image", size: 24, style: { opacity: .4, display: "block", margin: "0 auto 8px" } }),
      "Drag and drop images here, or click to upload",
      React.createElement("div", { style: { fontSize: 11, marginTop: 4 } }, "Uploads to assets.companionsofcaddo.org/media/")
    ),
    loading ? React.createElement("div", { style: { color: C.textSec, fontSize: 13, padding: 20 } }, "Loading images…")
    : filtered.length === 0 ? React.createElement(EmptyState, { message: "No images found", icon: "image" })
    : viewMode === "grid"
      ? React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(175px,1fr))", gap: 12 } },
          filtered.map(a => React.createElement("div", { key: a.id, style: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" } },
            React.createElement("div", { style: { height: 140, background: C.bg2, overflow: "hidden", position: "relative" } },
              React.createElement("img", { src: a.cdn_url || a.public_url, alt: a.alt_text || a.label, style: { width: "100%", height: "100%", objectFit: "cover" }, onError: e => { e.target.style.opacity = 0; } }),
              React.createElement("div", { style: { position: "absolute", top: 6, right: 6 } },
                React.createElement("span", { style: { fontSize: 10, padding: "2px 6px", borderRadius: 99, background: "rgba(0,0,0,.6)", color: "#fff" } }, a.usage_context || "general")
              )
            ),
            React.createElement("div", { style: { padding: "10px 12px" } },
              React.createElement("div", { style: { fontSize: 12, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, a.label || a.filename),
              editAlt?.id === a.id
                ? React.createElement("div", { style: { marginTop: 6, display: "flex", gap: 4 } },
                    React.createElement("input", { autoFocus: true, defaultValue: a.alt_text || "", placeholder: "Alt text…", onKeyDown: e => { if (e.key === "Enter") saveAltText(a, e.target.value); if (e.key === "Escape") setEditAlt(null); }, style: { flex: 1, padding: "4px 8px", fontSize: 11, border: `1px solid ${C.border}`, borderRadius: 6, background: C.bg, color: C.text, outline: "none" } }),
                    React.createElement("button", { onClick: e => saveAltText(a, e.target.previousSibling?.value || ""), style: { padding: "4px 8px", borderRadius: 6, border: "none", background: C.purple, color: "#fff", fontSize: 11, cursor: "pointer" } }, "Save")
                  )
                : React.createElement("div", { style: { fontSize: 11, color: C.textMut, marginTop: 2, fontStyle: a.alt_text ? "normal" : "italic" } }, a.alt_text || "No alt text"),
              React.createElement("div", { style: { display: "flex", gap: 4, marginTop: 8 } },
                React.createElement("button", { onClick: () => copyUrl(a.cdn_url || a.public_url), style: { flex: 1, padding: "5px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.textSec, fontSize: 11, cursor: "pointer" } }, "Copy URL"),
                React.createElement("button", { onClick: () => setEditAlt(editAlt?.id === a.id ? null : a), style: { padding: "5px 8px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.textSec, fontSize: 11, cursor: "pointer" } }, "Alt")
              )
            )
          ))
        )
      : React.createElement(Card, { style: { overflow: "hidden" } },
          React.createElement(Table, {
            cols: [
              { key: "filename", label: "File", render: (v, row) => React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10 } }, React.createElement("img", { src: row.cdn_url || row.public_url, style: { width: 40, height: 40, objectFit: "cover", borderRadius: 6, border: `1px solid ${C.border}` }, onError: e => e.target.style.opacity = 0 }), React.createElement("div", null, React.createElement("div", { style: { fontWeight: 600, fontSize: 13 } }, row.label || v), React.createElement("div", { style: { fontSize: 11, color: C.textMut, fontFamily: "var(--font-mono)" } }, v))) },
              { key: "usage_context", label: "Context", render: v => React.createElement(Badge, { label: v || "general" }) },
              { key: "alt_text", label: "Alt Text", render: v => React.createElement("span", { style: { fontSize: 12, color: v ? C.text : C.textMut, fontStyle: v ? "normal" : "italic" } }, v || "None") },
              { key: "cdn_url", label: "URL", render: v => React.createElement("button", { onClick: () => copyUrl(v), style: { fontSize: 11, background: "none", border: "none", color: C.purple, cursor: "pointer", fontFamily: "var(--font-mono)", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, v?.replace("https://assets.companionsofcaddo.org/", "…/") || "—") },
            ],
            rows: filtered, emptyMsg: "No images"
          })
        )
  );
}

// ── /dashboard/cms/brand ──────────────────────────────────────────────────────
function CmsBrandView({ onNavigate }) {
  const [brand, setBrand] = React.useState(null);
  const [org, setOrg] = React.useState({});
  const [socials, setSocials] = React.useState({});
  const [saving, setSaving] = React.useState(false);
  const [notice, setNotice] = React.useState({});
  const notify = (t, type) => cmsNotify(setNotice, t, type);

  React.useEffect(() => {
    fetch("/api/cms/brand", { credentials: "include" }).then(r => r.json()).then(d => {
      if (d.brand) {
        setBrand(d.brand);
        setOrg((() => { try { return JSON.parse(d.brand.organization_json || "{}"); } catch { return {}; } })());
        setSocials((() => { try { return JSON.parse(d.brand.socials_json || "{}"); } catch { return {}; } })());
      }
    }).catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/cms/brand/save", { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ brand: { ...brand, organization_json: JSON.stringify(org), socials_json: JSON.stringify(socials) } }) });
      const d = await res.json();
      notify(d.success ? "Brand settings saved" : (d.error || "Save failed"), d.success ? "ok" : "error");
    } catch (e) { notify("Save failed: " + e.message, "error"); }
    setSaving(false);
  };

  const fStyle = { width: "100%", padding: "9px 12px", border: `1px solid ${C.border}`, borderRadius: 8, background: C.surface, color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "var(--font-ui)" };
  const lStyle = { display: "block", fontSize: 11, fontWeight: 700, color: C.textSec, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" };
  const F = (label, key, obj, setter, type = "text", ph = "") => React.createElement("div", { key: label },
    React.createElement("label", { style: lStyle }, label),
    React.createElement("input", { type, value: (obj || {})[key] || "", onChange: e => setter(p => ({ ...p, [key]: e.target.value })), placeholder: ph, style: fStyle })
  );

  if (!brand) return React.createElement(CmsPageWrapper, null, React.createElement("div", { style: { color: C.textSec, fontSize: 13, padding: 20 } }, "Loading brand settings…"));

  return React.createElement(CmsPageWrapper, null,
    React.createElement(PageHeader, { title: "Brand & Settings", subtitle: "Global site identity, colors, and organization info", action: React.createElement(Btn, { icon: saving ? undefined : "check2", onClick: save, disabled: saving }, saving ? "Saving…" : "Save Changes") }),
    React.createElement(CmsNotice, { n: notice }),
    React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 900 } },
      // Identity
      React.createElement(Card, { style: { padding: 24, gridColumn: "1 / -1" } },
        React.createElement("h3", { style: { fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 16 } }, "Site Identity"),
        React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 } },
          F("Brand Name", "brand_name", brand, setBrand, "text", "Companions of CPAS"),
          F("Site Domain", "site_domain", brand, setBrand, "text", "companionsofcaddo.org"),
          React.createElement("div", null,
            React.createElement("label", { style: lStyle }, "Primary Color"),
            React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } },
              React.createElement("input", { type: "color", value: brand.primary_color || "#7c3aed", onChange: e => setBrand(p => ({ ...p, primary_color: e.target.value })), style: { width: 48, height: 36, padding: 2, border: `1px solid ${C.border}`, borderRadius: 8, cursor: "pointer" } }),
              React.createElement("input", { value: brand.primary_color || "#7c3aed", onChange: e => setBrand(p => ({ ...p, primary_color: e.target.value })), style: { ...fStyle, flex: 1, fontFamily: "var(--font-mono)" } })
            )
          ),
          React.createElement("div", null,
            React.createElement("label", { style: lStyle }, "Accent Color"),
            React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } },
              React.createElement("input", { type: "color", value: brand.accent_color || "#ee2336", onChange: e => setBrand(p => ({ ...p, accent_color: e.target.value })), style: { width: 48, height: 36, padding: 2, border: `1px solid ${C.border}`, borderRadius: 8, cursor: "pointer" } }),
              React.createElement("input", { value: brand.accent_color || "#ee2336", onChange: e => setBrand(p => ({ ...p, accent_color: e.target.value })), style: { ...fStyle, flex: 1, fontFamily: "var(--font-mono)" } })
            )
          )
        )
      ),
      // Logos
      React.createElement(Card, { style: { padding: 24 } },
        React.createElement("h3", { style: { fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 16 } }, "Logos"),
        React.createElement("div", { style: { display: "grid", gap: 14 } },
          React.createElement("div", null,
            React.createElement("label", { style: lStyle }, "Logo Light (dark backgrounds)"),
            brand.logo_light_url && React.createElement("img", { src: brand.logo_light_url, style: { height: 36, marginBottom: 8, objectFit: "contain", display: "block", background: "#111", padding: 6, borderRadius: 6 }, onError: e => e.target.style.display = "none" }),
            React.createElement("input", { value: brand.logo_light_url || "", onChange: e => setBrand(p => ({ ...p, logo_light_url: e.target.value })), style: { ...fStyle, fontSize: 11, fontFamily: "var(--font-mono)" } })
          ),
          React.createElement("div", null,
            React.createElement("label", { style: lStyle }, "Logo Dark (light backgrounds)"),
            brand.logo_dark_url && React.createElement("img", { src: brand.logo_dark_url, style: { height: 36, marginBottom: 8, objectFit: "contain", display: "block", background: "#f5f5f5", padding: 6, borderRadius: 6 }, onError: e => e.target.style.display = "none" }),
            React.createElement("input", { value: brand.logo_dark_url || "", onChange: e => setBrand(p => ({ ...p, logo_dark_url: e.target.value })), style: { ...fStyle, fontSize: 11, fontFamily: "var(--font-mono)" } })
          )
        )
      ),
      // Organization
      React.createElement(Card, { style: { padding: 24 } },
        React.createElement("h3", { style: { fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 16 } }, "Organization"),
        React.createElement("div", { style: { display: "grid", gap: 14 } },
          F("Legal Name", "legal_name", org, setOrg, "text", "Companions of CPAS"),
          F("EIN / Tax ID", "ein", org, setOrg, "text", "88-4156327"),
          F("Contact Email", "email", org, setOrg, "email", "companionsCPAS@gmail.com"),
          F("City / Parish", "city", org, setOrg, "text", "Shreveport"),
          React.createElement("div", null, React.createElement("label", { style: lStyle }, "Mission Statement"), React.createElement("textarea", { value: org.mission || "", rows: 3, onChange: e => setOrg(p => ({ ...p, mission: e.target.value })), style: { ...fStyle, resize: "vertical" } }))
        )
      ),
      // Socials
      React.createElement(Card, { style: { padding: 24 } },
        React.createElement("h3", { style: { fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 16 } }, "Social & Links"),
        React.createElement("div", { style: { display: "grid", gap: 14 } },
          F("Facebook URL", "facebook", socials, setSocials, "url", "https://facebook.com/…"),
          F("Instagram URL", "instagram", socials, setSocials, "url", "https://instagram.com/…"),
          F("Donation Link", "donation_url", socials, setSocials, "url", "https://…"),
          F("Announcement Banner", "banner", socials, setSocials, "text", "Optional header banner text")
        )
      )
    )
  );
}

// ── /dashboard/cms/templates ──────────────────────────────────────────────────
const SECTION_TEMPLATES_DATA = [
  { type: "hero",          label: "Hero",             category: "structure", icon: "home",     desc: "Full-width headline, subheading, dual CTAs, hero image" },
  { type: "text_image",    label: "Text + Image",     category: "content",   icon: "image",    desc: "Side-by-side text block with photo" },
  { type: "card_grid",     label: "Card Grid",         category: "content",   icon: "layers",   desc: "3-up or 4-up feature/benefit cards" },
  { type: "animal_grid",   label: "Animal Grid",       category: "animals",   icon: "paw",      desc: "Dynamic grid from animal_profiles" },
  { type: "foster_grid",   label: "Foster CTA",        category: "animals",   icon: "heart",    desc: "Foster program info with application CTA" },
  { type: "campaign_grid", label: "Fundraising",       category: "giving",    icon: "dollar",   desc: "Active campaigns with progress bars" },
  { type: "testimonial",   label: "Testimonial",       category: "social",    icon: "people",   desc: "Quote + attribution from foster/adopter" },
  { type: "stats_bar",     label: "Impact Stats",      category: "structure", icon: "chart",    desc: "Horizontal impact numbers" },
  { type: "org_info",      label: "Org Info",          category: "content",   icon: "docs",     desc: "Mission, history, team info block" },
  { type: "donation_block",label: "Donation Block",    category: "giving",    icon: "trending", desc: "Suggested amounts with Stripe integration" },
  { type: "faq",           label: "FAQ",               category: "content",   icon: "docs",     desc: "Expandable question/answer pairs" },
  { type: "map_embed",     label: "Location Map",      category: "content",   icon: "home",     desc: "Google Maps embed with address" },
];

function CmsTemplatesView({ onNavigate }) {
  const [filter, setFilter] = React.useState("all");
  const categories = ["all", ...Array.from(new Set(SECTION_TEMPLATES_DATA.map(t => t.category)))];
  const filtered = filter === "all" ? SECTION_TEMPLATES_DATA : SECTION_TEMPLATES_DATA.filter(t => t.category === filter);
  const catColors = {
    structure: { bg: C.purpleDim, color: C.purpleL },
    content:   { bg: C.tealDim,   color: C.teal },
    animals:   { bg: C.greenDim,  color: C.green },
    giving:    { bg: C.yellowDim, color: C.yellow },
    social:    { bg: C.redDim,    color: C.red },
  };

  return React.createElement(CmsPageWrapper, null,
    React.createElement(PageHeader, { title: "Section Templates", subtitle: "Browse available section types to add to your pages" }),
    React.createElement("div", { style: { display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" } },
      categories.map(cat => React.createElement("button", { key: cat, onClick: () => setFilter(cat),
        style: { padding: "5px 14px", borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: "pointer", border: `1px solid ${filter === cat ? C.purple : C.border}`, background: filter === cat ? C.purpleDim : "transparent", color: filter === cat ? C.purpleL : C.textSec, fontFamily: "var(--font-ui)" }
      }, cat.charAt(0).toUpperCase() + cat.slice(1)))
    ),
    React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 12 } },
      filtered.map(t => {
        const col = catColors[t.category] || catColors.content;
        return React.createElement(Card, { key: t.type, hover: true, style: { padding: 20 } },
          React.createElement("div", { style: { display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 } },
            React.createElement("div", { style: { width: 40, height: 40, borderRadius: 10, background: col.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 } }, React.createElement(Icon, { name: t.icon, size: 18, style: { color: col.color } })),
            React.createElement("div", null,
              React.createElement("div", { style: { fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 3 } }, t.label),
              React.createElement("div", { style: { fontSize: 11, color: C.textSec } }, t.desc)
            )
          ),
          React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" } },
            React.createElement("span", { style: { fontSize: 10, fontWeight: 700, color: col.color, background: col.bg, padding: "2px 8px", borderRadius: 99 } }, t.category),
            React.createElement(Btn, { size: "sm", variant: "secondary", icon: "plus", onClick: () => onNavigate("cms-pages") }, "Use on Page")
          )
        );
      })
    )
  );
}

Object.assign(window, {
  CMSView: CmsWebsiteView,
  CmsWebsiteView, CmsPagesView, CmsPageEditorView,
  CmsImagesView, CmsBrandView, CmsTemplatesView,
});
