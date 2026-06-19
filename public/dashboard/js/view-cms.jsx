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

function CmsPageWrapper({ children, padding = "28px 28px 60px", className = "" }) {
  return React.createElement("div", { className: ("dash-page" + (className ? " " + className : "")), style: { padding, flex: 1 } }, children);
}

function PageStatusBadge({ status, navVisible }) {
  const map = {
    published: { bg: "#d1fae5", color: "#065f46", border: "#6ee7b7", label: "Published" },
    draft:     { bg: "#fef3c7", color: "#92400e", border: "#fcd34d", label: "Draft" },
    archived:  { bg: "#f3f4f6", color: "#4b5563", border: "#d1d5db", label: "Archived" },
  };
  const s = map[status] || map.draft;
  return React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 } },
    React.createElement("span", {
      style: { display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color, border: `1px solid ${s.border}`, whiteSpace: "nowrap" }
    },
      React.createElement("span", { style: { width: 5, height: 5, borderRadius: "50%", background: s.color } }),
      s.label
    ),
    navVisible === false && React.createElement("span", {
      style: { display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 600, background: "#f3f4f6", color: "#6b7280", border: "1px solid #d1d5db", whiteSpace: "nowrap" }
    }, "Hidden from nav")
  );
}

function pageNavVisible(page) {
  return page?.nav_visible !== 0 && page?.nav_visible !== false;
}

// ── /dashboard/cms/website ────────────────────────────────────────────────────
function CmsWebsiteView({ onNavigate }) {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [publishing, setPublishing] = React.useState(null);
  const [togglingNav, setTogglingNav] = React.useState(null);
  const [notice, setNotice] = React.useState({});
  const notify = (t, type) => cmsNotify(setNotice, t, type);

  const loadBootstrap = React.useCallback(() => {
    setLoading(true);
    fetch("/api/cms/bootstrap", { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        if (d.success) setData(d);
        else setData({ pages: [] });
      })
      .catch(() => setData({ pages: [] }))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => { loadBootstrap(); }, [loadBootstrap]);

  const pages = data?.pages || [];

  const publishPage = async (route) => {
    setPublishing(route);
    try {
      const res = await fetch("/api/cms/publish", { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ route_path: route }) });
      const d = await res.json();
      notify(d.success ? `Published ${route} — live in ~5s` : (d.error || "Publish failed"), d.success ? "ok" : "error");
    } catch (e) { notify("Publish failed: " + e.message, "error"); }
    setPublishing(null);
  };

  const toggleNavVisibility = async (page) => {
    const route = page.route_path;
    const nextVisible = pageNavVisible(page) ? 0 : 1;
    setTogglingNav(route);
    try {
      const res = await fetch("/api/cms/page/nav-visible", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ route_path: route, nav_visible: nextVisible }),
      });
      const d = await res.json();
      notify(
        d.success
          ? (nextVisible ? `${page.title || route} is visible in navigation` : `${page.title || route} hidden from navigation`)
          : (d.error || "Could not update navigation"),
        d.success ? "ok" : "error"
      );
      if (d.success) loadBootstrap();
    } catch (e) { notify("Navigation update failed: " + e.message, "error"); }
    setTogglingNav(null);
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
          React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, gap: 8 } },
            React.createElement("div", null,
              React.createElement("div", { style: { fontSize: 15, fontWeight: 700, color: C.text } }, p.title || p.route_path),
              React.createElement("div", { style: { fontSize: 11, color: C.textMut, marginTop: 2, fontFamily: "var(--font-mono)" } }, p.route_path)
            ),
            React.createElement("div", { style: { display: "flex", alignItems: "flex-start", gap: 6 } },
              React.createElement("button", {
                type: "button",
                title: pageNavVisible(p) ? "Hide from navigation" : "Show in navigation",
                disabled: togglingNav === p.route_path,
                onClick: (e) => { e.stopPropagation(); toggleNavVisibility(p); },
                style: {
                  width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.border}`,
                  background: pageNavVisible(p) ? C.surface : C.bg2,
                  color: pageNavVisible(p) ? C.purpleL : C.textMut,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: togglingNav === p.route_path ? "wait" : "pointer", flexShrink: 0,
                },
              }, React.createElement(Icon, { name: pageNavVisible(p) ? "eye" : "eyeOff", size: 14 })),
              React.createElement(PageStatusBadge, { status: p.status, navVisible: pageNavVisible(p) })
            )
          ),
          p.updated_at && React.createElement("div", { style: { fontSize: 11, color: C.textMut, marginBottom: 10 } }, "Updated " + new Date(p.updated_at).toLocaleDateString()),
          React.createElement("div", { style: { display: "flex", gap: 6 } },
            React.createElement(Btn, { size: "sm", variant: "secondary", icon: "edit", onClick: () => onNavigate("cms-page-editor", { pageId: p.route_path === "/" ? "home" : p.route_path.replace(/^\//, "").replace(/\//g, "_") || "home" }) }, "Edit"),
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
  const [togglingNav, setTogglingNav] = React.useState(null);
  const notify = (t, type) => cmsNotify(setNotice, t, type);

  const [sections, setSections] = React.useState({});  // keyed by route_path

  const load = async () => {
    setLoading(true);
    try {
      const [bootRes, secRes, dashRes] = await Promise.all([
        fetch("/api/cms/bootstrap", { credentials: "include" }),
        fetch("/api/cms/sections", { credentials: "include" }),
        fetch("/api/dashboard/cms", { credentials: "include" }),
      ]);
      const boot = await bootRes.json();
      const sec  = await secRes.json().catch(() => ({}));
      const dash = await dashRes.json().catch(() => ({}));

      const bootPages = boot.success && boot.pages?.length ? boot.pages : [];
      const dashPages = dash.pages?.length ? dash.pages : [];
      const mergedPages = bootPages.length ? bootPages : dashPages;
      if (mergedPages.length) {
        setPages(mergedPages.map(p => ({
          ...p,
          status: p.status || "draft",
          route_path: p.route_path || p.page_route || "/",
        })));
      }
      // Build sections map: { "/about": [{section_key, section_type, heading, sort_order}] }
      if (sec.success && sec.sections) {
        const map = {};
        for (const s of sec.sections) {
          if (!map[s.page_route]) map[s.page_route] = [];
          map[s.page_route].push(s);
        }
        // Sort each page's sections by sort_order
        for (const k of Object.keys(map)) map[k].sort((a,b) => a.sort_order - b.sort_order);
        setSections(map);
      }
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

  const toggleNavVisibility = async (page) => {
    const route = page.route_path;
    const nextVisible = pageNavVisible(page) ? 0 : 1;
    setTogglingNav(route);
    try {
      const res = await fetch("/api/cms/page/nav-visible", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ route_path: route, nav_visible: nextVisible }),
      });
      const d = await res.json();
      notify(
        d.success
          ? (nextVisible ? `${page.title || route} is visible in navigation` : `${page.title || route} hidden from navigation`)
          : (d.error || "Could not update navigation"),
        d.success ? "ok" : "error"
      );
      if (d.success) await load();
    } catch (e) { notify("Navigation update failed: " + e.message, "error"); }
    setTogglingNav(null);
  };

  const SECTION_TYPE_COLORS = {
    hero: "#a78bfa", text_image: "#60a5fa", cta_banner: "#34d399",
    animal_grid: "#f59e0b", feature_cards: "#f472b6", campaign_grid: "#fb923c",
    testimonial: "#a3e635", org_info: "#67e8f9", content: "#94a3b8",
  };

  const PAGE_COLS = [
    { key: "title", label: "Page",
      render: (v, row) => {
        const pageSecs = sections[row.route_path] || [];
        return React.createElement("div", { style: { display: "flex", alignItems: "flex-start", gap: 10 } },
          React.createElement("div", { style: { width: 6, height: 6, borderRadius: "50%", background: row.is_homepage ? C.purple : C.teal, flexShrink: 0, marginTop: 5 } }),
          React.createElement("div", null,
            React.createElement("div", { style: { fontWeight: 600, fontSize: 13, color: C.text, display: "flex", alignItems: "center", gap: 8 } },
              v || row.route_path,
              React.createElement("a", { href: `https://companionsofcaddo.org${row.route_path}`, target: "_blank", onClick: e => e.stopPropagation(), style: { color: C.textMut, display: "inline-flex", lineHeight: 1 } },
                React.createElement(Icon, { name: "eye", size: 12 })
              )
            ),
            React.createElement("div", { style: { fontSize: 11, color: C.textMut, fontFamily: "var(--font-mono)", marginBottom: pageSecs.length ? 6 : 0 } }, row.route_path),
            pageSecs.length > 0 && React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 4 } },
              pageSecs.slice(0, 6).map(s =>
                React.createElement("span", { key: s.id, style: {
                  fontSize: 10, padding: "2px 7px", borderRadius: 99, fontWeight: 600,
                  background: (SECTION_TYPE_COLORS[s.section_type] || "#94a3b8") + "22",
                  color: SECTION_TYPE_COLORS[s.section_type] || "#94a3b8",
                  border: "1px solid " + (SECTION_TYPE_COLORS[s.section_type] || "#94a3b8") + "44",
                }}, s.section_type)
              ),
              pageSecs.length > 6 && React.createElement("span", { style: { fontSize: 10, color: C.textMut } }, `+${pageSecs.length - 6} more`)
            )
          )
        );
      }
    },
    { key: "status", label: "Status", render: (v, row) => React.createElement(PageStatusBadge, { status: row.status || v || "draft" }) },
    { key: "route_path", label: "Sections",
      render: (v) => {
        const count = (sections[v] || []).length;
        return React.createElement("span", { style: { fontSize: 12, color: count ? C.text : C.textMut, fontWeight: count ? 600 : 400 } },
          count ? `${count} section${count > 1 ? "s" : ""}` : "—"
        );
      }
    },
    { key: "published_at", label: "Published", render: v => React.createElement("span", { style: { fontSize: 12, color: C.textSec } }, v ? new Date(v).toLocaleDateString() : "—") },
    { key: "route_path", label: "",
      render: (v, row) => React.createElement("div", { style: { display: "flex", gap: 6, justifyContent: "flex-end" } },
        React.createElement("button", {
          type: "button",
          title: pageNavVisible(row) ? "Hide from navigation" : "Show in navigation",
          disabled: togglingNav === v,
          onClick: (e) => { e.stopPropagation(); toggleNavVisibility(row); },
          style: {
            width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.border}`,
            background: pageNavVisible(row) ? C.surface : C.bg2,
            color: pageNavVisible(row) ? C.purpleL : C.textMut,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: togglingNav === v ? "wait" : "pointer",
          },
        }, React.createElement(Icon, { name: pageNavVisible(row) ? "eye" : "eyeOff", size: 14 })),
        React.createElement(Btn, { size: "sm", variant: "secondary", icon: "edit", onClick: (e) => { e.stopPropagation(); onNavigate("cms-page-editor", { pageId: v === "/" ? "home" : v.replace(/^\//, "").replace(/\//g, "_") || "home" }); } }, "Edit"),
        React.createElement(Btn, { size: "sm", icon: "publish", disabled: publishing === v, onClick: (e) => { e.stopPropagation(); publishPage(v); } }, publishing === v ? "…" : "Publish")
      )
    },
  ];

  return React.createElement(CmsPageWrapper, null,
    React.createElement(PageHeader, { title: "Pages", subtitle: "Add, edit, and publish your website pages", action: React.createElement(Btn, { icon: "plus", onClick: () => setShowAdd(true) }, "Add Page") }),
    React.createElement(CmsNotice, { n: notice }),
    loading
      ? React.createElement("div", { style: { color: C.textSec, fontSize: 13, padding: 20 } }, "Loading pages…")
      : React.createElement(Card, { style: { overflow: "hidden" } }, React.createElement(Table, { cols: PAGE_COLS, rows: pages, onRowClick: row => onNavigate("cms-page-editor", { pageId: row.route_path === "/" ? "home" : row.route_path.replace(/^\//, "").replace(/\//g, "_") || "home" }), emptyMsg: "No pages found" })),
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

const CMS_TYPE_COLOR = {
  hero: '#a78bfa', text_image: '#60a5fa', text_image_split: '#60a5fa', feature_cards: '#34d399',
  foster_grid: '#fbbf24', campaign_grid: '#f87171', testimonial: '#94a3b8', cta_banner: '#fb923c',
  animal_grid: '#4ade80', content: '#94a3b8', service_cards: '#34d399', donate_tiers: '#fbbf24'
};

const CMS_SECTION_TYPES = [
  { type:'hero', label:'Hero', desc:'Large page opener with headline, image, and CTAs' },
  { type:'text_image', label:'Text + Image', desc:'Balanced story block with optional media' },
  { type:'feature_cards', label:'Feature Cards', desc:'Reusable card grid for services or benefits' },
  { type:'foster_grid', label:'Foster Grid', desc:'Animal/foster focused grid section' },
  { type:'campaign_grid', label:'Campaign Grid', desc:'Donation or fundraising campaign grid' },
  { type:'testimonial', label:'Testimonial', desc:'Quote, story, or social proof block' },
  { type:'cta_banner', label:'CTA Banner', desc:'High-emphasis call to action strip' },
  { type:'animal_grid', label:'Animal Grid', desc:'Adoptable or foster-needed animals' },
  { type:'content', label:'Content', desc:'Simple copy section for flexible text' },
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

function CmsPageEditorView({ pageId, onNavigate }) {
  const bp = useBp();
  const isDesktop = bp === 'desktop';
  const isTablet = bp === 'tablet';
  const isMobile = bp === 'mobile';
  const route = React.useMemo(() => cmsRouteFromPageId(pageId), [pageId]);

  const [pageData, setPageData] = React.useState({ page:null, sections:[], blocks:[] });
  const [selectedKey, setSelectedKey] = React.useState(null);
  const [previewMode, setPreviewMode] = React.useState('desktop');
  const [mobileTab, setMobileTab] = React.useState('sections');
  const [notice, setNotice] = React.useState({});
  const [busy, setBusy] = React.useState(false);
  const [dragKey, setDragKey] = React.useState(null);
  const [dragOverKey, setDragOverKey] = React.useState(null);
  const [showImagePicker, setShowImagePicker] = React.useState(false);
  const [imageSearch, setImageSearch] = React.useState('');
  const [assets, setAssets] = React.useState([]);
  const [showAddSection, setShowAddSection] = React.useState(false);
  const [activeFont, setActiveFont] = React.useState('fraunces_dm');
  const [showFontPicker, setShowFontPicker] = React.useState(false);
  const [uploadingAsset, setUploadingAsset] = React.useState(false);
  const notify = (t, type='ok') => cmsNotify(setNotice, t, type);

  const sortedSections = React.useMemo(() => [...(pageData.sections || [])].sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)), [pageData.sections]);
  const selected = React.useMemo(() => sortedSections.find(s => s.section_key === selectedKey) || sortedSections[0] || null, [sortedSections, selectedKey]);

  const [previewVersion, setPreviewVersion] = React.useState(0);
  const bumpPreview = React.useCallback(() => setPreviewVersion(v => v + 1), []);
  const previewIframeRef = React.useRef(null);

  const loadPage = React.useCallback(async () => {
    try {
      const [pageRes, bootRes] = await Promise.all([
        fetch(`/api/cms/page?route=${encodeURIComponent(route)}`, { credentials:'include' }),
        fetch('/api/cms/bootstrap', { credentials:'include' })
      ]);
      const pd = await pageRes.json().catch(() => ({}));
      const bd = await bootRes.json().catch(() => ({}));
      if (pd.success || pd.page || pd.sections) {
        const secs = [...(pd.sections || [])].sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
        setPageData({ page:pd.page || { title:route, route_path:route }, sections:secs, blocks:pd.blocks || [] });
        setSelectedKey(current => current && secs.some(s => s.section_key === current) ? current : secs[0]?.section_key || null);
      } else {
        setPageData({ page:{ title:route, route_path:route, status:'draft' }, sections:[], blocks:[] });
        setSelectedKey(null);
      }
      if (bd.success || bd.brand) {
        let cfg = {}; try { cfg = JSON.parse(bd.brand?.config_json || '{}'); } catch {}
        setActiveFont(cfg.active_font_preset || 'fraunces_dm');
      }
      bumpPreview();
    } catch (e) { notify('Could not load page editor', 'error'); }
  }, [route, bumpPreview]);

  React.useEffect(() => { loadPage(); }, [loadPage]);

  const saveSectionObject = async (section, silent=false) => {
    const res = await fetch('/api/cms/section/save', { method:'POST', credentials:'include', headers:{ 'content-type':'application/json' }, body:JSON.stringify({ section }) });
    const d = await res.json().catch(() => ({}));
    if (!d.success && d.success !== true) throw new Error(d.error || 'Section save failed');
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

  const publishPage = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/cms/publish', { method:'POST', credentials:'include', headers:{ 'content-type':'application/json' }, body:JSON.stringify({ route_path:route }) });
      const d = await res.json().catch(() => ({}));
      notify(d.success ? `Published ${route} — live in ~5s` : (d.error || 'Publish failed'), d.success ? 'ok' : 'error');
      if (d.success) await loadPage();
    } catch (e) { notify('Publish failed: ' + e.message, 'error'); }
    setBusy(false);
  };

  const toggleVisible = async (section) => {
    const next = { ...section, is_visible: section.is_visible === 0 ? 1 : 0 };
    setPageData(prev => ({ ...prev, sections:(prev.sections || []).map(s => s.section_key === section.section_key ? next : s) }));
    try { await saveSectionObject(next, true); bumpPreview(); notify(next.is_visible === 0 ? 'Section hidden' : 'Section visible'); } catch(e) { notify(e.message, 'error'); }
  };

  const deleteSection = async () => {
    if (!selected || !confirm('Delete this section?')) return;
    setBusy(true);
    try {
      const res = await fetch('/api/cms/section/delete', { method:'POST', credentials:'include', headers:{ 'content-type':'application/json' }, body:JSON.stringify({ section_key:selected.section_key, page_route:route }) });
      const d = await res.json().catch(() => ({}));
      notify(d.success ? 'Section deleted' : (d.error || 'Delete failed'), d.success ? 'ok' : 'error');
      await loadPage();
    } catch(e) { notify('Delete failed: ' + e.message, 'error'); }
    setBusy(false);
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
    setPageData(prev => ({ ...prev, sections:reordered }));
    setDragKey(null); setDragOverKey(null);
    try { await Promise.all(reordered.map(s => saveSectionObject(s, true))); bumpPreview(); notify('Section order saved'); }
    catch(e) { notify('Reorder failed: ' + e.message, 'error'); }
  };

  const addSection = async (type) => {
    const maxOrder = sortedSections.reduce((m,s)=>Math.max(m, Number(s.sort_order)||0), 0);
    const newKey = `${type}_${cmsSlugForKey(route)}_${Date.now()}`;
    const section = { section_key:newKey, section_type:type, page_route:route, heading:'New ' + type.replace(/_/g,' '), subheading:'', body:'', sort_order:maxOrder+10, is_visible:1, tenant_id:'tenant_companionscpas' };
    setBusy(true);
    try { await saveSectionObject(section, true); setShowAddSection(false); await loadPage(); setSelectedKey(newKey); setMobileTab('edit'); notify('Section added'); }
    catch(e) { notify(e.message, 'error'); }
    setBusy(false);
  };

  const loadAssets = async () => {
    try { const res = await fetch('/api/cms/assets', { credentials:'include' }); const d = await res.json(); setAssets(d.assets || []); }
    catch { setAssets([]); }
  };
  const openImagePicker = () => { setShowImagePicker(true); if (!assets.length) loadAssets(); };
  const pickImage = (url) => { setFieldAndSave('image_url', url); setShowImagePicker(false); };
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

  const askAgent = () => {
    window.dispatchEvent(new CustomEvent('agentsam:open', { detail:{ prompt:`Improve the ${selected?.section_type || 'section'} copy for ${route}: ${selected?.heading || ''}` } }));
  };

  const pageTitle = pageData.page?.title || route;
  const liveUrl = `https://companionsofcaddo.org${route}`;
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

  function renderTopbar() {
    return React.createElement('div', { style:{ height:52, background:C.surface, borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', padding:'0 14px', gap:10, flexShrink:0 } },
      React.createElement('button', { onClick:()=>onNavigate('cms-pages'), style:{ background:'none', border:'none', color:C.textSec, cursor:'pointer', display:'flex', alignItems:'center', gap:4, fontSize:12, fontFamily:'var(--font-ui)' } }, React.createElement(Icon, { name:'chevL', size:14 }), 'Pages'),
      React.createElement('div', { style:{ width:1, height:20, background:C.border } }),
      React.createElement('div', { style:{ flex:1, minWidth:0 } },
        React.createElement('div', { style:{ fontSize:13, fontWeight:700, color:C.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' } }, pageTitle),
        React.createElement('div', { style:{ fontSize:10, color:C.textMut, fontFamily:'var(--font-mono)' } }, route)
      ),
      notice.text && !isMobile && React.createElement('div', { style:{ fontSize:11, color:notice.type === 'error' ? C.red : C.green, fontWeight:700 } }, notice.text),
      isDesktop && ['desktop','tablet','mobile'].map(m => React.createElement('button', { key:m, onClick:()=>setPreviewMode(m), style:{ padding:'5px 10px', borderRadius:7, border:`1px solid ${previewMode === m ? C.purple : C.border}`, background:previewMode === m ? C.purpleDim : 'transparent', color:previewMode === m ? C.purpleL : C.textSec, fontSize:11, cursor:'pointer', textTransform:'capitalize' } }, m)),
      !isDesktop && React.createElement(Btn, { size:'sm', variant:'secondary', icon:'eye', onClick:()=>window.open(liveUrl, '_blank') }, 'Preview'),
      React.createElement(Btn, { size:'sm', icon:'publish', disabled:busy, onClick:publishPage }, isMobile ? 'Publish' : 'Publish Live')
    );
  }

  function renderSectionList() {
    return React.createElement('div', { style:{ height:'100%', display:'flex', flexDirection:'column', background:C.surface } },
      React.createElement('div', { style:{ padding:'14px 14px 10px', borderBottom:`1px solid ${C.border}` } },
        React.createElement('div', { style:{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 } },
          React.createElement('div', { style:{ fontSize:11, fontWeight:800, color:C.textMut, letterSpacing:'.1em', textTransform:'uppercase' } }, 'Sections'),
          React.createElement(Btn, { size:'sm', variant:'secondary', icon:'plus', onClick:()=>setShowAddSection(true) }, 'Add')
        )
      ),
      React.createElement('div', { style:{ overflowY:'auto', padding:10, flex:1 } },
        sortedSections.length === 0
          ? React.createElement('div', { style:{ padding:16, border:`1px dashed ${C.border}`, borderRadius:12, color:C.textMut, fontSize:12, textAlign:'center' } }, 'No sections yet. Add the first section.')
          : sortedSections.map(s => {
              const active = selected?.section_key === s.section_key;
              const hidden = s.is_visible === 0;
              const color = CMS_TYPE_COLOR[s.section_type] || CMS_TYPE_COLOR.content;
              return React.createElement('div', {
                key:s.section_key,
                id:'cms-section-row-' + s.section_key,
                draggable:true,
                onDragStart:()=>setDragKey(s.section_key),
                onDragOver:e=>{ e.preventDefault(); setDragOverKey(s.section_key); },
                onDrop:e=>{ e.preventDefault(); reorderSections(dragKey, s.section_key); },
                onClick:()=>{ setSelectedKey(s.section_key); if (isMobile) setMobileTab('edit'); },
                style:{ display:'grid', gridTemplateColumns:'18px minmax(0,1fr) auto 28px', alignItems:'center', gap:8, padding:'10px 8px', marginBottom:6, borderRadius:12, cursor:'pointer', border:`1px solid ${active ? C.purple + '88' : dragOverKey === s.section_key ? C.purple + '55' : C.border}`, borderLeft:`3px solid ${active ? C.purple : color}`, background:active ? C.purpleDim : C.bg, opacity:hidden ? .55 : 1 }
              },
                React.createElement('span', { style:{ color:C.textMut, fontSize:14, cursor:'grab' } }, '≡'),
                React.createElement('div', { style:{ minWidth:0 } },
                  React.createElement('div', { style:{ color:C.text, fontSize:12, fontWeight:800, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', textDecoration:hidden ? 'line-through' : 'none' } }, s.heading || s.section_key),
                  React.createElement('div', { style:{ color:C.textMut, fontSize:10, fontFamily:'var(--font-mono)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' } }, s.section_key)
                ),
                cmsTypeBadge(s.section_type),
                React.createElement('button', { title:hidden ? 'Show section' : 'Hide section', onClick:e=>{ e.stopPropagation(); toggleVisible(s); }, style:{ width:28, height:28, border:`1px solid ${C.border}`, borderRadius:8, background:C.surface, color:hidden ? C.textMut : C.purpleL, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' } }, React.createElement(Icon, { name:hidden ? 'eyeOff' : 'eye', size:13 }))
              );
            })
      )
    );
  }

  function renderPreview() {
    if (!isDesktop && mobileTab !== 'preview') return null;
    const mode = isMobile ? 'mobile' : previewMode;
    const previewWidth = mode === 'mobile' ? 390 : mode === 'tablet' ? 768 : '100%';
    const iframeHeight = isMobile ? 'calc(100vh - 110px)' : '100%';
    const iframe = React.createElement('iframe', {
      ref: previewIframeRef,
      key: previewSrc,
      src: previewSrc,
      title: `Preview ${route}`,
      onLoad: handlePreviewNavigation,
      style: { width:'100%', height:iframeHeight, minHeight:isMobile ? iframeHeight : 720, border:0, display:'block', background:'#0b0f1a' }
    });
    if (isMobile && mobileTab === 'preview') {
      return iframe;
    }
    return React.createElement('div', { style:{ height:'100%', overflow:'auto', background:'#ebe8f0', padding:mode === 'desktop' ? 18 : '18px 0' } },
      React.createElement('div', { style:{ width:previewWidth, maxWidth:'100%', margin:'0 auto', background:'#0b0f1a', borderRadius:16, overflow:'hidden', boxShadow:'0 22px 60px rgba(20,16,32,.14)', height:'calc(100vh - 120px)', minHeight:720 } },
        iframe
      )
    );
  }

  function renderInspector(compact=false) {
    if (!selected) return React.createElement('div', { style:{ padding:18, color:C.textMut, fontSize:13 } }, 'Select a section to edit.');
    const needsImage = ['hero','text_image','text_image_split'].includes(selected.section_type);
    const field = (label, key, type='text', opts={}) => React.createElement('div', { key }, cmsFieldLabel(label), type === 'textarea' ? cmsTextArea(selected[key], v=>setField(key,v), ()=>saveSelected(true), opts.rows || 5) : cmsTextInput(selected[key], v=>setField(key,v), ()=>saveSelected(true), opts.placeholder, opts.mono));
    return React.createElement('div', { style:{ height:'100%', display:'flex', flexDirection:'column', background:C.surface } },
      React.createElement('div', { style:{ padding:16, borderBottom:`1px solid ${C.border}` } },
        React.createElement('div', { style:{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10 } },
          React.createElement('div', { style:{ minWidth:0 } }, cmsTypeBadge(selected.section_type), React.createElement('div', { style:{ marginTop:8, color:C.text, fontSize:15, fontWeight:900, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' } }, selected.heading || selected.section_key)),
          React.createElement('label', { style:{ display:'flex', alignItems:'center', gap:6, color:C.textSec, fontSize:12, cursor:'pointer' } }, React.createElement('input', { type:'checkbox', checked:selected.is_visible !== 0, onChange:e=>setFieldAndSave('is_visible', e.target.checked ? 1 : 0) }), 'Visible')
        )
      ),
      React.createElement('div', { style:{ padding:16, overflowY:'auto', flex:1, display:'grid', gap:16 } },
        React.createElement('div', { style:{ display:'grid', gap:12 } }, React.createElement('h4', { style:groupTitleStyle() }, 'Content'), field('Eyebrow','eyebrow'), field('Heading','heading'), field('Subheading','subheading'), field('Body','body','textarea',{ rows:5 })),
        needsImage && React.createElement('div', { style:{ display:'grid', gap:12 } },
          React.createElement('h4', { style:groupTitleStyle() }, 'Media'),
          React.createElement('div', null, cmsFieldLabel('Image'), React.createElement('div', { style:{ display:'flex', gap:8 } }, React.createElement('div', { style:{ flex:1 } }, cmsTextInput(selected.image_url, v=>setField('image_url', v), ()=>saveSelected(true), 'https://assets.companionsofcaddo.org/...', true)), React.createElement(Btn, { size:'sm', variant:'secondary', icon:'image', onClick:openImagePicker }, 'Pick'))),
          selected.image_url && React.createElement('img', { src:selected.image_url, style:{ width:'100%', height:86, objectFit:'cover', borderRadius:12, border:`1px solid ${C.border}` } })
        ),
        React.createElement('div', { style:{ display:'grid', gap:12 } }, React.createElement('h4', { style:groupTitleStyle() }, 'Links'), field('Primary CTA label','cta_label'), field('Primary CTA href','cta_href','text',{ placeholder:'/foster' }), field('Secondary CTA label','cta_secondary_label'), field('Secondary CTA href','cta_secondary_href','text',{ placeholder:'/donate' }))
      ),
      React.createElement('div', { style:{ position:'sticky', bottom:0, padding:12, background:C.surface, borderTop:`1px solid ${C.border}`, display:'grid', gap:8 } },
        React.createElement('div', { style:{ display:'grid', gridTemplateColumns:compact ? '1fr 1fr' : '1fr', gap:8 } },
          React.createElement(Btn, { onClick:()=>saveSelected(false), disabled:busy, icon:'check2', variant:'secondary' }, busy ? 'Saving...' : 'Save Draft'),
          React.createElement(Btn, { onClick:publishPage, disabled:busy, icon:'publish' }, busy ? 'Publishing...' : 'Publish Live')
        ),
        React.createElement('button', { onClick:askAgent, style:{ padding:'10px 12px', borderRadius:10, border:`1px solid ${C.border}`, background:C.purpleDim, color:C.purpleL, fontWeight:800, cursor:'pointer', fontSize:12, fontFamily:'var(--font-ui)' } }, 'Ask Agent Sam to improve this section'),
        React.createElement('button', { onClick:deleteSection, style:{ padding:'9px 12px', borderRadius:10, border:`1px solid ${C.red}55`, background:'transparent', color:C.red, fontWeight:800, cursor:'pointer', fontSize:12, fontFamily:'var(--font-ui)' } }, 'Delete Section')
      )
    );
  }

  function groupTitleStyle() { return { margin:'0 0 2px', fontSize:11, fontWeight:900, color:C.textSec, letterSpacing:'.12em', textTransform:'uppercase' }; }

  function renderMobileTabs() {
    return React.createElement('div', { style:{ display:'flex', borderBottom:`1px solid ${C.border}`, background:C.surface } }, ['sections','edit','preview'].map(t => React.createElement('button', { key:t, onClick:()=>setMobileTab(t), style:{ flex:1, height:42, border:'none', borderBottom:`2px solid ${mobileTab === t ? C.purple : 'transparent'}`, background:'transparent', color:mobileTab === t ? C.purpleL : C.textSec, fontWeight:900, fontSize:13, textTransform:'capitalize' } }, t)));
  }

  function renderImagePicker() {
    if (!showImagePicker) return null;
    const filtered = (assets || []).filter(a => !imageSearch || (a.filename || a.r2_key || a.public_url || '').toLowerCase().includes(imageSearch.toLowerCase()));
    return React.createElement('div', { style:{ position:'fixed', inset:0, zIndex:260, background:'rgba(0,0,0,.52)', display:'flex', alignItems:'center', justifyContent:'center', padding:isMobile ? 0 : 24 } },
      React.createElement('div', { style:{ width:isMobile ? '100%' : 760, height:isMobile ? '100%' : '82vh', background:C.surface, border:`1px solid ${C.border}`, borderRadius:isMobile ? 0 : 18, overflow:'hidden', display:'flex', flexDirection:'column' } },
        React.createElement('div', { style:{ padding:16, borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:10 } }, React.createElement('div', { style:{ flex:1, color:C.text, fontWeight:900 } }, 'Pick from Library'), React.createElement(Btn, { size:'sm', variant:'secondary', onClick:()=>setShowImagePicker(false) }, 'Close')),
        React.createElement('div', { style:{ padding:14, display:'grid', gridTemplateColumns:isMobile ? '1fr' : '1fr 180px', gap:10, borderBottom:`1px solid ${C.border}` } },
          cmsTextInput(imageSearch, setImageSearch, null, 'Search filename...'),
          React.createElement('label', { style:{ height:38, border:`1px dashed ${C.border}`, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', color:C.textSec, fontSize:12, fontWeight:800, cursor:'pointer' } }, uploadingAsset ? 'Uploading...' : 'Upload new', React.createElement('input', { type:'file', accept:'image/*', style:{ display:'none' }, onChange:e=>uploadAsset(e.target.files?.[0]) }))
        ),
        React.createElement('div', { style:{ padding:14, overflowY:'auto', flex:1, display:'grid', gridTemplateColumns:isMobile ? 'repeat(2,minmax(0,1fr))' : 'repeat(4,minmax(0,1fr))', gap:10 } },
          filtered.map(a => { const url = a.public_url || a.url || a.image_url || (a.r2_key ? `${R2_CDN_BASE}/${a.r2_key}` : ''); return React.createElement('button', { key:a.id || a.r2_key || url, onClick:()=>pickImage(url), style:{ border:`1px solid ${C.border}`, background:C.bg, borderRadius:12, overflow:'hidden', padding:0, textAlign:'left', cursor:'pointer' } }, React.createElement('img', { src:url, style:{ width:'100%', height:100, objectFit:'cover', display:'block' } }), React.createElement('div', { style:{ padding:8, color:C.textSec, fontSize:10, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' } }, a.filename || a.r2_key || 'Asset')); })
        )
      )
    );
  }

  function renderAddSectionModal() {
    if (!showAddSection) return null;
    return React.createElement('div', { style:{ position:'fixed', inset:0, zIndex:250, background:'rgba(0,0,0,.5)', display:'flex', alignItems:'center', justifyContent:'center', padding:isMobile ? 0 : 24 } },
      React.createElement('div', { style:{ width:isMobile ? '100%' : 720, maxHeight:isMobile ? '100%' : '82vh', overflowY:'auto', background:C.surface, border:`1px solid ${C.border}`, borderRadius:isMobile ? 0 : 18, padding:18 } },
        React.createElement('div', { style:{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, marginBottom:16 } }, React.createElement('h3', { style:{ margin:0, color:C.text } }, 'Add Section'), React.createElement(Btn, { size:'sm', variant:'secondary', onClick:()=>setShowAddSection(false) }, 'Close')),
        React.createElement('div', { style:{ display:'grid', gridTemplateColumns:isMobile ? '1fr' : 'repeat(3,minmax(0,1fr))', gap:12 } }, CMS_SECTION_TYPES.map(t => { const color = CMS_TYPE_COLOR[t.type] || CMS_TYPE_COLOR.content; return React.createElement('button', { key:t.type, onClick:()=>addSection(t.type), style:{ textAlign:'left', padding:16, borderRadius:14, border:`1px solid ${color}55`, background:color + '12', cursor:'pointer' } }, React.createElement('div', { style:{ color, fontWeight:900, fontSize:14, marginBottom:6 } }, t.label), React.createElement('div', { style:{ color:C.textSec, fontSize:12, lineHeight:1.45 } }, t.desc)); }))
      )
    );
  }

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
      : React.createElement('div', { style:{ flex:1, minHeight:0, display:'grid', gridTemplateColumns:isDesktop ? '240px minmax(400px,1fr) 320px' : '220px minmax(0,1fr)' } },
          React.createElement('div', { style:{ borderRight:`1px solid ${C.border}`, minHeight:0, overflow:'hidden' } }, renderSectionList()),
          isDesktop ? React.createElement('div', { style:{ minHeight:0, overflow:'hidden' } }, renderPreview()) : React.createElement('div', { style:{ minHeight:0, overflow:'hidden' } }, renderInspector(true)),
          isDesktop && React.createElement('div', { style:{ borderLeft:`1px solid ${C.border}`, minHeight:0, overflow:'hidden' } }, renderInspector(false))
        ),
    showFontPicker && React.createElement('div', { style:{ position:'fixed', top:60, right:16, zIndex:240, width:260, background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:10, boxShadow:'0 20px 50px rgba(0,0,0,.2)' } }, FONT_PRESETS_CMS.map(p => React.createElement('button', { key:p.key, onClick:()=>saveFont(p.key), style:{ width:'100%', padding:10, marginBottom:6, borderRadius:10, border:`1px solid ${activeFont === p.key ? C.purple : C.border}`, background:activeFont === p.key ? C.purpleDim : C.bg, color:C.text, textAlign:'left', cursor:'pointer' } }, React.createElement('div', { style:{ fontWeight:900 } }, p.label), React.createElement('div', { style:{ color:C.textMut, fontSize:11 } }, p.sub)))) ,
    renderImagePicker(),
    renderAddSectionModal()
  );
}

// ── /dashboard/cms/images ─────────────────────────────────────────────────────

function mediaFormatBytes(n) {
  const v = Number(n || 0);
  if (!v) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let x = v;
  while (x >= 1024 && i < units.length - 1) { x /= 1024; i += 1; }
  return `${x >= 10 || i === 0 ? Math.round(x) : x.toFixed(1)} ${units[i]}`;
}

function mediaAssetUrl(asset) {
  return asset?.cdn_url || asset?.public_url || "";
}

function mediaPathPrefix(key) {
  const k = String(key || "").replace(/^\/+/, "").toLowerCase();
  const parts = k.split("/").filter(Boolean);
  if (parts.length >= 2) return `${parts[0]}/${parts[1]}`;
  if (parts.length === 1) return parts[0];
  return "";
}

function mediaFolderKey(asset) {
  return mediaPathPrefix(asset?.r2_key || asset?.path || "");
}

function mediaFolderLabel(folderId) {
  const row = MEDIA_FOLDERS.find(f => f.id === folderId);
  return row?.label || folderId || "—";
}

function mediaUploadFolder(folderId) {
  if (!folderId || folderId === "all") return "";
  if (folderId.startsWith("media/")) return folderId;
  return "";
}

function mediaAssetKind(asset) {
  const mime = String(asset?.mime_type || "").toLowerCase();
  const type = String(asset?.asset_type || "").toLowerCase();
  const key = String(asset?.r2_key || "").toLowerCase();
  if (type === "video" || mime.startsWith("video/")) return "video";
  if (type === "document" || mime === "application/pdf" || key.endsWith(".pdf")) return "pdf";
  return "image";
}

function mediaSizeLabel(asset) {
  const v = Number(asset?.size || 0);
  if (v > 0) return mediaFormatBytes(v);
  const kind = mediaAssetKind(asset);
  if (kind === "pdf") return "PDF";
  if (kind === "video") return "Video";
  return "—";
}

function MediaThumbPreview({ asset, compact }) {
  const url = mediaAssetUrl(asset);
  const kind = mediaAssetKind(asset);
  if (!url) {
    return React.createElement("div", { className: "media-card-empty" },
      React.createElement(Icon, { name: "file", size: compact ? 16 : 22 })
    );
  }
  if (kind === "pdf") {
    return React.createElement("iframe", {
      src: url + "#toolbar=0&navpanes=0&view=FitH",
      title: asset.label || asset.filename || "PDF preview",
      className: "media-card-pdf" + (compact ? " is-compact" : ""),
      tabIndex: -1,
    });
  }
  if (kind === "video") {
    return React.createElement("video", {
      src: url,
      muted: true,
      playsInline: true,
      preload: "metadata",
      className: "media-card-video-el" + (compact ? " is-compact" : ""),
    });
  }
  return React.createElement("img", {
    src: url,
    alt: asset.alt_text || asset.label || "",
    loading: "lazy",
    className: "media-card-image" + (compact ? " is-compact" : ""),
    onError: e => { e.target.style.opacity = 0; },
  });
}

const MEDIA_FOLDERS = [
  { id: "all", label: "All media", icon: "image" },
  { id: "media/animals", label: "Animals", icon: "paw", group: "media", path: "media/animals/" },
  { id: "media/campaign", label: "Campaign", icon: "trending", group: "media", path: "media/campaign/" },
  { id: "media/intakes", label: "Intakes", icon: "intake", group: "media", path: "media/intakes/" },
  { id: "media/medical", label: "Medical", icon: "medical", group: "media", path: "media/medical/" },
  { id: "media/team", label: "Team", icon: "people", group: "media", path: "media/team/" },
  { id: "media/videos", label: "Videos", icon: "video", group: "media", path: "media/videos/" },
  { id: "static/pages", label: "Pages", icon: "globe", group: "static", path: "static/pages/" },
  { id: "static/cms", label: "CMS uploads", icon: "upload", group: "static", path: "static/cms/" },
  { id: "static/global", label: "Global", icon: "sparkles", group: "static", path: "static/global/" },
  { id: "static/assets", label: "Site assets", icon: "image", group: "static", path: "static/assets/" },
];

function mediaDedupeAssets(assets) {
  const seen = new Map();
  for (const a of assets || []) {
    const k = String(mediaAssetUrl(a) || a.r2_key || a.id || "").toLowerCase();
    if (!k) continue;
    const prev = seen.get(k);
    const ts = String(a.updated_at || a.created_at || "");
    const prevTs = String(prev?.updated_at || prev?.created_at || "");
    if (!prev || ts > prevTs) seen.set(k, a);
  }
  return Array.from(seen.values());
}

function MediaStorageMeter({ stats }) {
  if (!stats) return null;
  const used = Number(stats.total_bytes || 0);
  const quota = Number(stats.quota_bytes || 0);
  const pct = quota ? Math.min(100, (used / quota) * 100) : 0;
  const warn = pct >= 85;
  return React.createElement("div", { className: "media-storage-meter" },
    React.createElement("div", { className: "media-storage-meter-head" },
      React.createElement("span", null, `${mediaFormatBytes(used)} used`),
      React.createElement("span", { className: "media-storage-meter-sub" }, `${stats.asset_count || 0} files · ${mediaFormatBytes(quota)} plan`)
    ),
    React.createElement("div", { className: "media-storage-meter-track" },
      React.createElement("div", {
        className: "media-storage-meter-fill" + (warn ? " warn" : ""),
        style: { width: `${pct}%` },
      })
    )
  );
}

function MediaPreviewModal({ asset, onClose, onSave, onDelete, copyUrl, notify }) {
  const [altText, setAltText] = React.useState(asset?.alt_text || "");
  const [label, setLabel] = React.useState(asset?.label || asset?.filename || "");
  const [busy, setBusy] = React.useState(false);
  if (!asset) return null;
  const url = mediaAssetUrl(asset);
  const isVideo = String(asset.mime_type || "").startsWith("video/") || asset.asset_type === "video";
  const isPdf = asset.mime_type === "application/pdf" || asset.asset_type === "document";

  const save = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/cms/asset/save", {
        method: "POST", credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ asset: { ...asset, alt_text: altText, label } }),
      });
      const d = await res.json();
      if (d.success) { notify("Saved"); onSave(); onClose(); }
      else notify(d.error || "Save failed", "error");
    } catch { notify("Save failed", "error"); }
    setBusy(false);
  };

  const del = async () => {
    if (!window.confirm(`Delete ${label || asset.filename}? This removes the R2 file.`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/cms/asset/delete", {
        method: "POST", credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: asset.id }),
      });
      const d = await res.json();
      if (d.success) { notify("Deleted"); onDelete(); onClose(); }
      else notify(d.error || "Delete failed", "error");
    } catch { notify("Delete failed", "error"); }
    setBusy(false);
  };

  return React.createElement(Modal, {
    open: true,
    onClose: onClose,
    title: label || asset.filename || "Preview",
    width: 720,
  },
    React.createElement("div", { className: "media-preview-body" },
      isVideo
        ? React.createElement("video", { src: url, controls: true, className: "media-preview-media" })
        : isPdf
          ? React.createElement("iframe", { src: url, title: label, className: "media-preview-pdf" })
          : React.createElement("img", { src: url, alt: altText || label, className: "media-preview-media" }),
      React.createElement("div", { className: "media-preview-meta" },
        React.createElement("div", { className: "media-preview-row" },
          React.createElement("label", null, "Label"),
          React.createElement("input", { value: label, onChange: e => setLabel(e.target.value) })
        ),
        React.createElement("div", { className: "media-preview-row" },
          React.createElement("label", null, "Alt text"),
          React.createElement("input", { value: altText, onChange: e => setAltText(e.target.value), placeholder: "Describe image for accessibility" })
        ),
        React.createElement("div", { className: "media-preview-kv" },
          React.createElement("span", null, mediaFormatBytes(asset.size)),
          React.createElement("span", null, asset.mime_type || asset.asset_type || "file"),
          React.createElement("span", null, asset.r2_key || mediaFolderLabel(mediaFolderKey(asset)))
        ),
        React.createElement("code", { className: "media-preview-url" }, url)
      ),
      React.createElement("div", { className: "media-preview-actions" },
        React.createElement(Btn, { variant: "secondary", size: "sm", icon: "copy", onClick: () => copyUrl(url) }, "Copy URL"),
        React.createElement("a", { href: url, target: "_blank", rel: "noopener noreferrer", className: "media-preview-open" }, "Open"),
        React.createElement("div", { style: { flex: 1 } }),
        React.createElement(Btn, { variant: "danger", size: "sm", icon: "trash", disabled: busy, onClick: del }, "Delete"),
        React.createElement(Btn, { size: "sm", disabled: busy, onClick: save }, busy ? "Saving…" : "Save")
      )
    )
  );
}

function CmsImagesView({ onNavigate }) {
  const [tab, setTab] = React.useState("library");
  const [assets, setAssets] = React.useState([]);
  const [stats, setStats] = React.useState(null);
  const [assetsLoading, setAssetsLoading] = React.useState(true);
  const [libraryFolder, setLibraryFolder] = React.useState("all");
  const [notice, setNotice] = React.useState({});
  const notify = (t, type) => cmsNotify(setNotice, t, type);

  const loadAssets = async () => {
    setAssetsLoading(true);
    try {
      const [res, statsRes] = await Promise.all([
        fetch("/api/cms/assets", { credentials: "include" }),
        fetch("/api/cms/assets/stats", { credentials: "include" }),
      ]);
      const d = await res.json();
      const s = await statsRes.json();
      if (d.success) setAssets(mediaDedupeAssets(d.assets || []));
      if (s.success) setStats(s);
    } catch {}
    setAssetsLoading(false);
  };
  React.useEffect(() => { loadAssets(); }, []);

  const copyUrl = (url) => navigator.clipboard.writeText(url || "").then(() => notify("URL copied"));

  const tabStyle = (t) => ({
    padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer",
    fontSize: 13, fontWeight: 600, fontFamily: "var(--font-ui)",
    background: tab === t ? C.purple : "transparent",
    color: tab === t ? "#fff" : C.textSec,
  });

  return React.createElement(CmsPageWrapper, { className: "media-workspace" },
    React.createElement(CmsNotice, { n: notice }),
    React.createElement(MediaStorageMeter, { stats: stats }),
    React.createElement("div", { className: "media-toolbar" },
      React.createElement("div", { className: "media-tabs dash-hscroll" },
        React.createElement("button", { type: "button", style: tabStyle("library"), onClick: () => setTab("library") }, "Library"),
        React.createElement("button", { type: "button", style: tabStyle("drive"), onClick: () => setTab("drive") }, "Google Drive"),
        React.createElement("button", { type: "button", style: tabStyle("cleanup"), onClick: () => setTab("cleanup") }, "Cleanup")
      ),
      React.createElement("label", {
        className: "media-upload-btn",
        title: mediaUploadFolder(libraryFolder)
          ? `Upload to ${libraryFolder}/`
          : "Upload to static/cms/uploads/",
      },
        React.createElement(Icon, { name: "upload", size: 14 }),
        mediaUploadFolder(libraryFolder) ? `Upload to ${mediaFolderLabel(libraryFolder)}` : "Upload",
        React.createElement("input", {
          type: "file",
          accept: "image/*,video/mp4,video/webm,video/quicktime,application/pdf",
          multiple: true,
          style: { display: "none" },
          onChange: async e => {
            const files = Array.from(e.target.files || []);
            if (!files.length) return;
            const uploadFolder = mediaUploadFolder(libraryFolder);
            let ok = 0;
            for (const file of files) {
              const fd = new FormData();
              fd.append("file", file);
              fd.append("usage_context", uploadFolder ? uploadFolder.replace("media/", "") : "cms");
              if (uploadFolder) fd.append("r2_folder", uploadFolder);
              try {
                const res = await fetch("/api/cms/asset/upload", { method: "POST", credentials: "include", body: fd });
                const d = await res.json();
                if (d.success) ok += 1;
                else notify(`Failed: ${file.name}`, "error");
              } catch { notify(`Error: ${file.name}`, "error"); }
            }
            if (ok > 0) { notify(`${ok} file${ok > 1 ? "s" : ""} uploaded`); loadAssets(); setTab("library"); }
            e.target.value = "";
          },
        })
      )
    ),
    tab === "library" && React.createElement(ImagesLibraryTab, {
      assets,
      loading: assetsLoading,
      onReload: loadAssets,
      copyUrl,
      notify,
      folder: libraryFolder,
      onFolderChange: setLibraryFolder,
    }),
    tab === "drive" && React.createElement(ImagesDriveTab, { onImported: () => { loadAssets(); setTab("library"); }, notify }),
    tab === "cleanup" && React.createElement(ImagesCleanupTab, { assets, stats, loading: assetsLoading, onReload: loadAssets, notify }),
  );
}

function ImagesLibraryTab({ assets, loading, onReload, copyUrl, notify, folder, onFolderChange }) {
  const [search, setSearch] = React.useState("");
  const [viewMode, setViewMode] = React.useState("grid");
  const [preview, setPreview] = React.useState(null);

  const folderCounts = React.useMemo(() => {
    const counts = { all: assets.length };
    for (const a of assets) {
      const k = mediaFolderKey(a);
      if (!k) continue;
      counts[k] = (counts[k] || 0) + 1;
    }
    return counts;
  }, [assets]);

  const filtered = assets.filter(a => {
    const inFolder = folder === "all" || mediaFolderKey(a) === folder;
    const q = search.trim().toLowerCase();
    const matchQ = !q || [a.label, a.filename, a.alt_text, a.r2_key, a.usage_context].some(v => String(v || "").toLowerCase().includes(q));
    return inFolder && matchQ;
  });

  const folders = MEDIA_FOLDERS.filter(f => {
    if (f.id === "all") return true;
    if (f.group === "media") return true;
    return (folderCounts[f.id] || 0) > 0;
  });

  return React.createElement("div", { className: "media-library-layout" },
    React.createElement("aside", { className: "media-folder-rail" },
      folders.map(f => React.createElement("button", {
        key: f.id,
        type: "button",
        className: "media-folder-btn" + (folder === f.id ? " is-active" : ""),
        onClick: () => onFolderChange(f.id),
      },
        React.createElement(Icon, { name: f.icon, size: 16 }),
        React.createElement("span", { className: "media-folder-label", title: f.path || f.label }, f.label),
        React.createElement("span", { className: "media-folder-count" }, folderCounts[f.id] || 0)
      ))
    ),
    React.createElement("div", { className: "media-library-main" },
      React.createElement("div", { className: "media-library-toolbar" },
        React.createElement(Input, { value: search, onChange: setSearch, placeholder: "Search media…", icon: "search", style: { flex: "1 1 180px", maxWidth: 280 } }),
        React.createElement("div", { className: "media-view-toggle" },
          [["grid", "image"], ["list", "docs"]].map(([m, icon]) => React.createElement("button", {
            key: m, type: "button", className: viewMode === m ? "is-active" : "", onClick: () => setViewMode(m),
          }, React.createElement(Icon, { name: icon, size: 14 })))
        )
      ),
      loading
        ? React.createElement("div", { className: "media-empty-msg" }, "Loading…")
        : filtered.length === 0
          ? React.createElement(EmptyState, { message: "No media in this folder", icon: "folder" })
          : viewMode === "grid"
            ? React.createElement("div", { className: "media-grid" },
                filtered.map(a => {
                  return React.createElement("button", {
                    key: a.id, type: "button", className: "media-card",
                    onClick: () => setPreview(a),
                  },
                    React.createElement("div", { className: "media-card-thumb" },
                      React.createElement(MediaThumbPreview, { asset: a }),
                      mediaAssetKind(a) === "pdf" && React.createElement("span", { className: "media-card-badge pdf" }, "PDF"),
                      mediaAssetKind(a) === "video" && React.createElement("span", { className: "media-card-badge video" }, "Video"),
                      a.source_provider === "google_drive" && React.createElement("span", { className: "media-card-badge drive" }, "Drive")
                    ),
                    React.createElement("div", { className: "media-card-meta" },
                      React.createElement("strong", null, a.label || a.filename),
                      React.createElement("span", null, mediaSizeLabel(a))
                    )
                  );
                })
              )
            : React.createElement(Card, { style: { overflow: "hidden" } },
                React.createElement(Table, {
                  cols: [
                    { key: "filename", label: "File", render: (v, row) => React.createElement("button", {
                      type: "button", className: "media-list-name", onClick: () => setPreview(row),
                    },
                      React.createElement("span", { className: "media-list-thumb" },
                        React.createElement(MediaThumbPreview, { asset: row, compact: true })
                      ),
                      React.createElement("span", null, row.label || v)
                    ) },
                    { key: "size", label: "Size", render: (v, row) => mediaSizeLabel(row) },
                    { key: "r2_key", label: "Folder", render: (v, row) => mediaFolderLabel(mediaFolderKey(row)) },
                    { key: "cdn_url", label: "", render: (v, row) => React.createElement(Btn, { variant: "ghost", size: "sm", onClick: () => setPreview(row) }, "Open") },
                  ],
                  rows: filtered,
                  emptyMsg: "No media",
                })
              )
    ),
    preview && React.createElement(MediaPreviewModal, {
      asset: preview,
      onClose: () => setPreview(null),
      onSave: onReload,
      onDelete: onReload,
      copyUrl,
      notify,
    })
  );
}

// ── Tab: Upload ──────────────────────────────────────────────────────────────
function ImagesUploadTab({ onUploaded, notify }) {
  const [uploading, setUploading] = React.useState(false);
  const [queue, setQueue]         = React.useState([]);
  const [altInputs, setAltInputs] = React.useState({});
  const fileInputRef = React.useRef(null);

  const addFiles = (fileList) => {
    const newFiles = Array.from(fileList || []).map(f => ({ file: f, id: `${f.name}-${Date.now()}` }));
    setQueue(q => [...q, ...newFiles]);
  };

  const removeFromQueue = (id) => setQueue(q => q.filter(f => f.id !== id));

  const doUpload = async () => {
    if (!queue.length) return;
    setUploading(true);
    let ok = 0;
    for (const { file, id } of queue) {
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("alt_text", altInputs[id] || "");
        fd.append("usage_context", "cms");
        const res = await fetch("/api/cms/asset/upload", { method: "POST", credentials: "include", body: fd });
        const d   = await res.json();
        if (d.success) ok++;
        else notify(`Failed: ${file.name} — ${d.error || "unknown error"}`, "error");
      } catch { notify(`Error uploading ${file.name}`, "error"); }
    }
    setUploading(false);
    if (ok > 0) {
      notify(`${ok} image${ok > 1 ? "s" : ""} uploaded`);
      setQueue([]);
      setAltInputs({});
      onUploaded();
    }
  };

  return React.createElement("div", null,
    // Drop zone
    React.createElement("div", {
      onDragOver: e => { e.preventDefault(); e.currentTarget.style.borderColor = C.purple; },
      onDragLeave: e => { e.currentTarget.style.borderColor = C.border; },
      onDrop: e => { e.preventDefault(); e.currentTarget.style.borderColor = C.border; addFiles(e.dataTransfer.files); },
      onClick: () => fileInputRef.current?.click(),
      style: { border: `2px dashed ${C.border}`, borderRadius: 12, padding: 36, textAlign: "center", marginBottom: 20, color: C.textMut, fontSize: 13, cursor: "pointer", transition: "border-color .15s" }
    },
      React.createElement(Icon, { name: "image", size: 28, style: { opacity: .35, display: "block", margin: "0 auto 10px" } }),
      React.createElement("div", { style: { fontWeight: 600, color: C.text, marginBottom: 4 } }, "Drag images here or click to browse"),
      React.createElement("div", { style: { fontSize: 12 } }, "JPG, PNG, WebP, GIF, SVG, AVIF · Max 10 MB · Saves to assets.companionsofcaddo.org"),
      React.createElement("input", { ref: fileInputRef, type: "file", accept: "image/*", multiple: true, style: { display: "none" }, onChange: e => addFiles(e.target.files) })
    ),
    // Queue
    queue.length > 0 && React.createElement("div", { style: { marginBottom: 16 } },
      React.createElement("div", { style: { fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 10 } }, `${queue.length} file${queue.length > 1 ? "s" : ""} ready to upload`),
      React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8 } },
        queue.map(({ file, id }) => React.createElement("div", { key: id, style: { display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 } },
          React.createElement("div", { style: { width: 48, height: 48, borderRadius: 8, overflow: "hidden", background: C.bg2, flexShrink: 0 } },
            React.createElement("img", { src: URL.createObjectURL(file), style: { width: "100%", height: "100%", objectFit: "cover" } })
          ),
          React.createElement("div", { style: { flex: 1, minWidth: 0 } },
            React.createElement("div", { style: { fontSize: 13, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, file.name),
            React.createElement("div", { style: { fontSize: 11, color: C.textMut, marginTop: 2 } }, `${(file.size / 1024).toFixed(0)} KB · ${file.type}`),
            React.createElement("input", {
              placeholder: "Alt text (recommended)…",
              value: altInputs[id] || "",
              onChange: e => setAltInputs(prev => ({ ...prev, [id]: e.target.value })),
              style: { marginTop: 6, width: "100%", padding: "5px 8px", fontSize: 12, border: `1px solid ${C.border}`, borderRadius: 6, background: C.bg, color: C.text, outline: "none", boxSizing: "border-box" }
            })
          ),
          React.createElement("button", { onClick: () => removeFromQueue(id), style: { padding: "6px", borderRadius: 6, border: "none", background: "transparent", color: C.textMut, cursor: "pointer", fontSize: 16, lineHeight: 1 } }, "×")
        ))
      ),
      React.createElement("button", {
        onClick: doUpload, disabled: uploading,
        style: { marginTop: 12, padding: "10px 24px", borderRadius: 8, border: "none", background: C.purple, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-ui)", display: "inline-flex", alignItems: "center", gap: 8 }
      },
        React.createElement(Icon, { name: "plus", size: 14 }),
        uploading ? "Uploading…" : `Upload ${queue.length} file${queue.length > 1 ? "s" : ""}`
      )
    )
  );
}

// ── Tab: Google Drive ─────────────────────────────────────────────────────────
function ImagesDriveTab({ onImported, notify }) {
  const [status, setStatus]       = React.useState(null);   // null = loading
  const [files, setFiles]         = React.useState([]);
  const [filesLoading, setFilesLoading] = React.useState(false);
  const [search, setSearch]       = React.useState("");
  const [selected, setSelected]   = React.useState(new Set());
  const [importing, setImporting] = React.useState(false);
  const [nextPageToken, setNextPageToken] = React.useState(null);
  const [disconnecting, setDisconnecting] = React.useState(false);

  const loadStatus = async () => {
    try {
      const res = await fetch("/api/integrations/google-drive/status", { credentials: "include" });
      const d   = await res.json();
      setStatus(d);
    } catch { setStatus({ connected: false }); }
  };

  const loadFiles = async (reset = false) => {
    setFilesLoading(true);
    const params = new URLSearchParams({ pageSize: "30" });
    if (search) params.set("q", search);
    if (!reset && nextPageToken) params.set("pageToken", nextPageToken);
    try {
      const res = await fetch(`/api/integrations/google-drive/files?${params}`, { credentials: "include" });
      const d   = await res.json();
      if (d.ok) {
        setFiles(reset ? d.files : prev => [...prev, ...d.files]);
        setNextPageToken(d.nextPageToken || null);
      } else {
        notify(d.error || "Could not load Drive files", "error");
      }
    } catch { notify("Failed to load Drive files", "error"); }
    setFilesLoading(false);
  };

  React.useEffect(() => { loadStatus(); }, []);
  React.useEffect(() => {
    if (status?.connected) { setFiles([]); setNextPageToken(null); loadFiles(true); }
  }, [status?.connected]);

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const doImport = async () => {
    if (!selected.size) return;
    setImporting(true);
    try {
      const res = await fetch("/api/integrations/google-drive/import", {
        method: "POST", credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fileIds: Array.from(selected) }),
      });
      const d = await res.json();
      if (d.imported > 0) {
        notify(`${d.imported} image${d.imported > 1 ? "s" : ""} imported to R2`);
        setSelected(new Set());
        onImported();
      }
      if (d.errors?.length) notify(`${d.errors.length} file(s) failed to import`, "error");
    } catch { notify("Import failed", "error"); }
    setImporting(false);
  };

  const doDisconnect = async () => {
    if (!confirm("Disconnect Google Drive? Imported R2 assets will not be deleted.")) return;
    setDisconnecting(true);
    try {
      await fetch("/api/integrations/google-drive/disconnect", { method: "POST", credentials: "include" });
      notify("Google Drive disconnected");
      setStatus({ connected: false });
      setFiles([]);
    } catch { notify("Disconnect failed", "error"); }
    setDisconnecting(false);
  };

  // Not connected state
  if (status === null) {
    return React.createElement("div", { style: { color: C.textSec, fontSize: 13, padding: 20 } }, "Checking Google Drive connection…");
  }

  if (!status.connected) {
    return React.createElement(Card, { style: { maxWidth: 480 } },
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 16 } },
        React.createElement("div", { style: { width: 44, height: 44, borderRadius: 10, background: "#1a73e8", display: "flex", alignItems: "center", justifyContent: "center" } },
          React.createElement(Icon, { name: "link", size: 22, style: { color: "#fff" } })
        ),
        React.createElement("div", null,
          React.createElement("div", { style: { fontWeight: 700, fontSize: 15, color: C.text } }, "Connect Google Drive"),
          React.createElement("div", { style: { fontSize: 12, color: C.textMut, marginTop: 2 } }, "Import images directly into the R2 media library")
        )
      ),
      React.createElement("div", { style: { fontSize: 13, color: C.textSec, marginBottom: 20, lineHeight: 1.6 } },
        "Connect your Google Drive account to browse and import images. ",
        React.createElement("strong", null, "Imported images are copied to R2"), " — the website uses R2 URLs, not Drive URLs, so images remain available if Drive is later disconnected."
      ),
      React.createElement("div", { style: { fontSize: 12, color: C.textMut, marginBottom: 16, padding: "8px 12px", background: C.bg2, borderRadius: 8 } },
        "Requested scope: ", React.createElement("code", null, "drive.readonly"), " — browse existing org Drive and Shared drives (read-only)."
      ),
      React.createElement("a", {
        href: "/api/integrations/google-drive/connect",
        style: { display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 22px", borderRadius: 8, background: "#1a73e8", color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none" }
      },
        React.createElement(Icon, { name: "link", size: 14 }), "Connect Google Drive"
      )
    );
  }

  // Connected state
  return React.createElement("div", null,
    // Connected banner
    React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 20, padding: "12px 16px", background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 10 } },
      React.createElement("div", { style: { width: 8, height: 8, borderRadius: "50%", background: "#22c55e", flexShrink: 0 } }),
      React.createElement("div", { style: { flex: 1 } },
        React.createElement("div", { style: { fontSize: 13, fontWeight: 600, color: C.text } }, "Google Drive connected"),
        status.account_email && React.createElement("div", { style: { fontSize: 12, color: C.textMut } }, status.account_email)
      ),
      React.createElement("button", { onClick: doDisconnect, disabled: disconnecting, style: { padding: "6px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.textSec, fontSize: 12, cursor: "pointer" } },
        disconnecting ? "Disconnecting…" : "Disconnect"
      )
    ),
    // Search + Browse toolbar
    React.createElement("div", { style: { display: "flex", gap: 8, marginBottom: 16, alignItems: "center" } },
      React.createElement(Input, { value: search, onChange: setSearch, placeholder: "Search Drive files…", icon: "search", style: { width: 240 }, onKeyDown: e => e.key === "Enter" && loadFiles(true) }),
      React.createElement("button", { onClick: () => loadFiles(true), style: { padding: "8px 16px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.textSec, fontSize: 13, cursor: "pointer" } }, "Refresh"),
      selected.size > 0 && React.createElement("button", {
        onClick: doImport, disabled: importing,
        style: { marginLeft: "auto", padding: "8px 20px", borderRadius: 8, border: "none", background: C.purple, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }
      },
        React.createElement(Icon, { name: "plus", size: 14 }),
        importing ? "Importing…" : `Import ${selected.size} to R2`
      )
    ),
    // Drive file grid
    filesLoading && files.length === 0
      ? React.createElement("div", { style: { color: C.textSec, fontSize: 13, padding: 20 } }, "Loading Drive files…")
      : files.length === 0
        ? React.createElement(EmptyState, { message: "No image files found in Drive", icon: "image" })
        : React.createElement("div", null,
            React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10, marginBottom: 16 } },
              files.map(f => React.createElement("div", {
                key: f.id,
                onClick: () => toggleSelect(f.id),
                style: { background: C.surface, border: `2px solid ${selected.has(f.id) ? C.purple : C.border}`, borderRadius: 10, overflow: "hidden", cursor: "pointer", transition: "border-color .15s", position: "relative" }
              },
                selected.has(f.id) && React.createElement("div", {
                  style: { position: "absolute", top: 6, right: 6, width: 20, height: 20, borderRadius: "50%", background: C.purple, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }
                }, React.createElement("span", { style: { color: "#fff", fontSize: 12, lineHeight: 1 } }, "✓")),
                React.createElement("div", { style: { height: 120, background: C.bg2, overflow: "hidden" } },
                  f.thumbnailLink
                    ? React.createElement("img", { src: f.thumbnailLink, alt: f.name, style: { width: "100%", height: "100%", objectFit: "cover" } })
                    : React.createElement("div", { style: { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" } },
                        React.createElement(Icon, { name: "image", size: 24, style: { opacity: .3 } })
                      )
                ),
                React.createElement("div", { style: { padding: "8px 10px" } },
                  React.createElement("div", { style: { fontSize: 11, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, f.name),
                  React.createElement("div", { style: { fontSize: 10, color: C.textMut, marginTop: 2 } }, f.size ? `${(f.size / 1024).toFixed(0)} KB` : f.mimeType?.split("/")[1])
                )
              ))
            ),
            nextPageToken && React.createElement("button", {
              onClick: () => loadFiles(false), disabled: filesLoading,
              style: { padding: "8px 16px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.textSec, fontSize: 12, cursor: "pointer" }
            }, filesLoading ? "Loading…" : "Load more")
          )
  );
}

// ── Tab: Usage / Cleanup ─────────────────────────────────────────────────────
function ImagesCleanupTab({ assets, stats, loading, onReload, notify }) {
  const driveImports = assets.filter(a => a.source_provider === "google_drive");
  const noAlt = assets.filter(a => !a.alt_text);
  const dupes = React.useMemo(() => {
    const groups = new Map();
    for (const a of assets) {
      const k = String(mediaAssetUrl(a) || a.r2_key || "").toLowerCase();
      if (!k) continue;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(a);
    }
    return Array.from(groups.values()).filter(g => g.length > 1);
  }, [assets]);

  const statCard = (label, count, color) =>
    React.createElement("div", { className: "media-stat-card" },
      React.createElement("div", { style: { fontSize: 28, fontWeight: 700, color } }, count),
      React.createElement("div", { style: { fontSize: 13, color: C.textSec, marginTop: 4 } }, label)
    );

  const deleteAsset = async (asset) => {
    if (!window.confirm(`Delete ${asset.label || asset.filename}?`)) return;
    try {
      const res = await fetch("/api/cms/asset/delete", {
        method: "POST", credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: asset.id }),
      });
      const d = await res.json();
      if (d.success) { notify("Deleted"); onReload(); }
      else notify(d.error || "Delete failed", "error");
    } catch { notify("Delete failed", "error"); }
  };

  return React.createElement("div", null,
    stats && React.createElement(MediaStorageMeter, { stats: stats }),
    React.createElement("div", { style: { display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 } },
      statCard("Tracked files", stats?.asset_count ?? assets.length, C.purple),
      statCard("Storage used", mediaFormatBytes(stats?.total_bytes), C.teal),
      statCard("Drive imports", driveImports.length, "#4285F4"),
      statCard("Missing alt", noAlt.length, noAlt.length > 0 ? "#f59e0b" : "#22c55e"),
      statCard("Duplicate groups", dupes.length, dupes.length ? C.red : C.green),
    ),
    dupes.length > 0 && React.createElement(Card, { style: { marginBottom: 16 } },
      React.createElement("div", { style: { fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 12 } }, "Possible duplicates"),
      React.createElement("div", { style: { fontSize: 12, color: C.textSec, marginBottom: 12 } }, "Same CDN URL tracked more than once. Library view already hides dupes; delete extras here."),
      dupes.slice(0, 10).map((group, i) => React.createElement("div", { key: i, style: { marginBottom: 12, padding: 12, border: `1px solid ${C.border}`, borderRadius: 10 } },
        group.map(a => React.createElement("div", { key: a.id, style: { display: "flex", alignItems: "center", gap: 10, marginTop: 6 } },
          React.createElement("img", { src: mediaAssetUrl(a), style: { width: 36, height: 36, objectFit: "cover", borderRadius: 6 }, onError: e => e.target.style.opacity = 0 }),
          React.createElement("span", { style: { flex: 1, fontSize: 12 } }, a.label || a.filename),
          React.createElement(Btn, { variant: "danger", size: "sm", onClick: () => deleteAsset(a) }, "Delete")
        ))
      ))
    ),
    noAlt.length > 0 && React.createElement(Card, { style: { marginBottom: 16 } },
      React.createElement("div", { style: { fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 12 } }, "Missing alt text"),
      React.createElement("div", { style: { fontSize: 12, color: C.textSec, marginBottom: 12 } }, "These images are missing alt text. Add descriptions in the R2 Library tab."),
      React.createElement(Table, {
        cols: [
          { key: "filename", label: "File", render: (v, row) => React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } }, React.createElement("img", { src: row.cdn_url || row.public_url, style: { width: 32, height: 32, objectFit: "cover", borderRadius: 4 }, onError: e => e.target.style.opacity = 0 }), v) },
          { key: "usage_context", label: "Context", render: v => React.createElement(Badge, { label: v || "general" }) },
        ],
        rows: noAlt.slice(0, 20),
        emptyMsg: "All images have alt text",
      })
    ),
    driveImports.length > 0 && React.createElement(Card, null,
      React.createElement("div", { style: { fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 12 } }, "Google Drive imports"),
      React.createElement("div", { style: { fontSize: 12, color: C.textSec, marginBottom: 12 } }, "These images were imported from Google Drive. They are stored in R2 and remain available even if Drive is disconnected."),
      React.createElement(Table, {
        cols: [
          { key: "filename", label: "File", render: (v, row) => React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } }, React.createElement("img", { src: row.cdn_url || row.public_url, style: { width: 32, height: 32, objectFit: "cover", borderRadius: 4 }, onError: e => e.target.style.opacity = 0 }), v) },
          { key: "source_file_id", label: "Drive ID", render: v => React.createElement("code", { style: { fontSize: 10 } }, v || "—") },
          { key: "imported_at", label: "Imported", render: v => React.createElement("span", { style: { fontSize: 12 } }, v ? v.slice(0, 10) : "—") },
        ],
        rows: driveImports,
        emptyMsg: "No Drive imports",
      })
    ),
    loading && React.createElement("div", { style: { color: C.textSec, fontSize: 13, padding: 20 } }, "Loading…")
  );
}

// ── Brand tweaks helpers ──────────────────────────────────────────────────────
function parseBrandNav(navigationJson) {
  try {
    const links = JSON.parse(navigationJson || "[]");
    return Array.isArray(links) ? links : [];
  } catch {
    return [];
  }
}

function BrandTweakSection({ title, subtitle, defaultOpen = true, children }) {
  const [open, setOpen] = React.useState(defaultOpen);
  return React.createElement("div", {
    style: { borderBottom: `1px solid ${C.border}`, paddingBottom: open ? 14 : 0, marginBottom: 14 },
  },
    React.createElement("button", {
      type: "button",
      onClick: () => setOpen(v => !v),
      style: {
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 8, padding: "0 0 10px", border: "none", background: "transparent",
        cursor: "pointer", fontFamily: "var(--font-ui)", textAlign: "left",
      },
    },
      React.createElement("div", null,
        React.createElement("div", { style: { fontSize: 12, fontWeight: 700, color: C.text, letterSpacing: "0.02em" } }, title),
        subtitle && React.createElement("div", { style: { fontSize: 11, color: C.textMut, marginTop: 2 } }, subtitle)
      ),
      React.createElement(Icon, { name: open ? "chevD" : "chevR", size: 14, style: { color: C.textMut, flexShrink: 0 } })
    ),
    open && React.createElement("div", { style: { display: "grid", gap: 10 } }, children)
  );
}

function BrandLogoDropZone({ label, hint, value, onChange, dropBg, uploading, onUploadFile }) {
  const [dragOver, setDragOver] = React.useState(false);
  const inputRef = React.useRef(null);

  const handleFiles = async (files) => {
    const file = files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    await onUploadFile(file);
  };

  return React.createElement("div", null,
    React.createElement("label", { style: { display: "block", fontSize: 11, fontWeight: 700, color: C.textSec, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" } }, label),
    React.createElement("div", {
      onDragEnter: e => { e.preventDefault(); setDragOver(true); },
      onDragOver: e => { e.preventDefault(); setDragOver(true); },
      onDragLeave: e => { e.preventDefault(); setDragOver(false); },
      onDrop: async e => {
        e.preventDefault();
        setDragOver(false);
        await handleFiles(e.dataTransfer?.files);
      },
      onClick: () => inputRef.current?.click(),
      style: {
        border: `2px dashed ${dragOver ? C.purple : C.border}`,
        borderRadius: 10,
        padding: 12,
        background: dragOver ? C.purpleDim : C.bg2,
        cursor: uploading ? "wait" : "pointer",
        transition: "border-color .15s, background .15s",
      },
    },
      React.createElement("input", {
        ref: inputRef,
        type: "file",
        accept: "image/*",
        style: { display: "none" },
        onChange: async e => { await handleFiles(e.target.files); e.target.value = ""; },
      }),
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12 } },
        React.createElement("div", {
          style: {
            width: 56, height: 44, borderRadius: 8, flexShrink: 0,
            background: dropBg, border: `1px solid ${C.border}`,
            display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
          },
        },
          value
            ? React.createElement("img", { src: value, alt: "", style: { maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }, onError: e => { e.target.style.display = "none"; } })
            : React.createElement(Icon, { name: "image", size: 18, style: { color: C.textMut } })
        ),
        React.createElement("div", { style: { flex: 1, minWidth: 0 } },
          React.createElement("div", { style: { fontSize: 12, fontWeight: 600, color: C.text } }, uploading ? "Uploading..." : "Drop image or click to replace"),
          React.createElement("div", { style: { fontSize: 11, color: C.textMut, marginTop: 2 } }, hint)
        )
      ),
      value && React.createElement("input", {
        value,
        onClick: e => e.stopPropagation(),
        onChange: e => onChange(e.target.value),
        style: {
          width: "100%", marginTop: 10, padding: "7px 10px", border: `1px solid ${C.border}`,
          borderRadius: 8, background: C.surface, color: C.text, fontSize: 11,
          fontFamily: "var(--font-mono)", boxSizing: "border-box",
        },
      })
    )
  );
}

function BrandPreviewCanvas({ brand, socials, previewTheme }) {
  const isDark = previewTheme === "dark";
  const primary = brand.primary_color || "#7c3aed";
  const accent = brand.accent_color || "#ee2336";
  const logoUrl = isDark
    ? (brand.logo_light_url || brand.logo_dark_url || "")
    : (brand.logo_dark_url || brand.logo_light_url || "");
  const logoW = Math.max(48, Math.min(240, Number(brand.logo_width) || 140));
  const navLinks = parseBrandNav(brand.navigation_json)
    .filter(l => l.label && l.href && String(l.style || "") !== "button")
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
  const donateLink = parseBrandNav(brand.navigation_json).find(l => l.style === "button" || l.href === "/donate");
  const canvasBg = isDark ? "#0b0f1a" : "#f5f0eb";
  const headerBg = isDark ? "#111827" : "#ffffff";
  const textColor = isDark ? "#f0ece6" : "#1a1a1a";
  const mutedColor = isDark ? "rgba(255,255,255,0.62)" : "#6b7280";
  const banner = (socials?.banner || "").trim();

  return React.createElement("div", {
    style: {
      borderRadius: 16, overflow: "hidden", border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : C.border}`,
      background: canvasBg, boxShadow: "0 18px 48px rgba(15,23,42,0.08)",
    },
  },
    banner && React.createElement("div", {
      style: {
        background: primary, color: "#fff", fontSize: 12, fontWeight: 600,
        textAlign: "center", padding: "8px 14px",
      },
    }, banner),
    React.createElement("div", {
      style: {
        background: headerBg, color: textColor,
        borderBottom: `3px solid ${primary}`,
        padding: "14px 18px",
      },
    },
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" } },
        logoUrl
          ? React.createElement("img", { src: logoUrl, alt: brand.brand_name || "Logo", style: { width: logoW, height: "auto", maxHeight: 52, objectFit: "contain", display: "block" } })
          : React.createElement("div", { style: { fontWeight: 800, fontSize: 15, color: primary } }, brand.brand_name || "Brand"),
        React.createElement("nav", { style: { display: "flex", gap: 14, flexWrap: "wrap", marginLeft: "auto", alignItems: "center" } },
          navLinks.map((link, i) => React.createElement("span", {
            key: `${link.href}-${i}`,
            style: { fontSize: 13, fontWeight: 600, color: mutedColor },
          }, link.label)),
          React.createElement("span", {
            style: {
              fontSize: 12, fontWeight: 700, padding: "8px 14px", borderRadius: 999,
              background: accent, color: "#fff",
            },
          }, donateLink?.label || "Donate")
        )
      ),
      React.createElement("div", { style: { marginTop: 10, fontSize: 11, color: mutedColor } },
        brand.brand_name || "Companions of CPAS",
        brand.site_domain ? ` · ${brand.site_domain}` : ""
      )
    ),
    React.createElement("div", { style: { padding: "18px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 } },
      [
        { label: "Primary", color: primary },
        { label: "Accent", color: accent },
        { label: "Header", color: headerBg, border: true },
      ].map(sw => React.createElement("div", {
        key: sw.label,
        style: {
          borderRadius: 10, overflow: "hidden",
          border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : C.border}`,
        },
      },
        React.createElement("div", { style: { height: 44, background: sw.color, borderBottom: sw.border ? `1px solid ${C.border}` : "none" } }),
        React.createElement("div", { style: { padding: "8px 10px", background: isDark ? "#111827" : "#fff", fontSize: 11, color: mutedColor } },
          sw.label,
          React.createElement("div", { style: { fontFamily: "var(--font-mono)", fontSize: 10, marginTop: 2, color: textColor } }, sw.border ? (isDark ? "Dark" : "Light") : sw.color)
        )
      ))
    )
  );
}

// ── /dashboard/cms/brand ──────────────────────────────────────────────────────
function CmsBrandView({ onNavigate }) {
  const [brand, setBrand] = React.useState(null);
  const [org, setOrg] = React.useState({});
  const [socials, setSocials] = React.useState({});
  const [saving, setSaving] = React.useState(false);
  const [uploadingLogo, setUploadingLogo] = React.useState(null);
  const [previewTheme, setPreviewTheme] = React.useState("dark");
  const [notice, setNotice] = React.useState({});
  const notify = (t, type) => cmsNotify(setNotice, t, type);

  React.useEffect(() => {
    fetch("/api/cms/brand", { credentials: "include" }).then(r => r.json()).then(d => {
      if (d.brand) {
        setBrand({
          ...d.brand,
          logo_width: Number(d.brand.logo_width) || 140,
          logo_height: Number(d.brand.logo_height) || 0,
        });
        setOrg((() => { try { return JSON.parse(d.brand.organization_json || "{}"); } catch { return {}; } })());
        setSocials((() => { try { return JSON.parse(d.brand.socials_json || "{}"); } catch { return {}; } })());
      }
    }).catch(() => {});
  }, []);

  const uploadLogo = async (file, targetKey) => {
    setUploadingLogo(targetKey);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("usage_context", "brand");
      fd.append("label", `Brand ${targetKey}`);
      const res = await fetch("/api/cms/asset/upload", { method: "POST", credentials: "include", body: fd });
      const d = await res.json();
      const url = d.public_url || d.cdn_url || d.url;
      if (!d.success || !url) {
        notify(d.error || "Upload failed", "error");
        return;
      }
      setBrand(p => ({ ...p, [targetKey]: url }));
      notify("Logo uploaded");
    } catch (e) {
      notify("Upload failed: " + e.message, "error");
    }
    setUploadingLogo(null);
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/cms/brand/save", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          brand: {
            ...brand,
            logo_width: Number(brand.logo_width) || 140,
            logo_height: Number(brand.logo_height) || null,
            organization_json: JSON.stringify(org),
            socials_json: JSON.stringify(socials),
          },
        }),
      });
      const d = await res.json();
      notify(d.success ? "Brand settings saved" : (d.error || "Save failed"), d.success ? "ok" : "error");
    } catch (e) { notify("Save failed: " + e.message, "error"); }
    setSaving(false);
  };

  const fStyle = {
    width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 8,
    background: C.surface, color: C.text, fontSize: 13, outline: "none",
    boxSizing: "border-box", fontFamily: "var(--font-ui)",
  };
  const lStyle = {
    display: "block", fontSize: 10, fontWeight: 700, color: C.textSec,
    marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em",
  };
  const tweakInput = (label, value, onChange, opts = {}) => React.createElement("div", { key: label },
    React.createElement("label", { style: lStyle }, label),
    React.createElement("input", {
      type: opts.type || "text",
      value: value || "",
      placeholder: opts.placeholder || "",
      readOnly: opts.readOnly,
      onChange: e => onChange(e.target.value),
      style: { ...fStyle, ...(opts.readOnly ? { background: C.bg2, color: C.textMut, cursor: "default" } : {}), ...(opts.mono ? { fontFamily: "var(--font-mono)", fontSize: 11 } : {}) },
    })
  );

  const setColor = (key, value) => setBrand(p => ({ ...p, [key]: value }));

  if (!brand) {
    return React.createElement(CmsPageWrapper, null,
      React.createElement("div", { style: { color: C.textSec, fontSize: 13, padding: 20 } }, "Loading brand settings...")
    );
  }

  const navLinks = parseBrandNav(brand.navigation_json);

  return React.createElement(CmsPageWrapper, { padding: "20px 22px 48px" },
    React.createElement(CmsNotice, { n: notice }),
    React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "minmax(0, 1.5fr) minmax(320px, 1fr)",
        gap: 18,
        alignItems: "start",
        background: "#f5f0eb",
        borderRadius: 16,
        padding: 16,
        minHeight: "calc(100vh - 120px)",
      },
    },
      // Live preview canvas
      React.createElement("div", { style: { minWidth: 0 } },
        React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 12 } },
          React.createElement("div", null,
            React.createElement("h2", { style: { margin: 0, fontSize: 18, fontWeight: 800, color: C.text } }, "Brand & Settings"),
            React.createElement("p", { style: { margin: "4px 0 0", fontSize: 12, color: C.textSec } }, "Live preview updates as you edit. Save to publish.")
          ),
          React.createElement("div", { style: { display: "flex", gap: 6, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 4 } },
            ["dark", "light"].map(theme => React.createElement("button", {
              key: theme,
              type: "button",
              onClick: () => setPreviewTheme(theme),
              style: {
                padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                fontSize: 12, fontWeight: 600, fontFamily: "var(--font-ui)",
                background: previewTheme === theme ? C.purple : "transparent",
                color: previewTheme === theme ? "#fff" : C.textSec,
              },
            }, theme === "dark" ? "Dark preview" : "Light preview"))
          )
        ),
        React.createElement(BrandPreviewCanvas, { brand, socials, previewTheme })
      ),

      // Tweaks rail
      React.createElement("div", {
        style: {
          position: "sticky", top: 16, maxHeight: "calc(100vh - 96px)", overflowY: "auto",
          background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14,
          padding: "14px 14px 8px", boxShadow: "0 8px 24px rgba(15,23,42,0.06)",
        },
      },
        React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${C.border}` } },
          React.createElement("div", null,
            React.createElement("div", { style: { fontSize: 13, fontWeight: 800, color: C.text } }, "Tweaks"),
            React.createElement("div", { style: { fontSize: 11, color: C.textMut, marginTop: 2 } }, "Site identity and navigation")
          ),
          React.createElement(Btn, { size: "sm", icon: saving ? undefined : "check2", onClick: save, disabled: saving }, saving ? "Saving..." : "Save Changes")
        ),

        React.createElement(BrandTweakSection, { title: "Identity", defaultOpen: true },
          tweakInput("Brand Name", brand.brand_name, v => setBrand(p => ({ ...p, brand_name: v })), { placeholder: "Companions of CPAS" }),
          tweakInput("Site Domain", brand.site_domain, () => {}, { readOnly: true, mono: true })
        ),

        React.createElement(BrandTweakSection, { title: "Colors", defaultOpen: true },
          ["primary_color", "accent_color"].map(key => {
            const label = key === "primary_color" ? "Primary Color" : "Accent Color";
            const val = brand[key] || (key === "primary_color" ? "#7c3aed" : "#ee2336");
            return React.createElement("div", { key },
              React.createElement("label", { style: lStyle }, label),
              React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } },
                React.createElement("input", {
                  type: "color", value: val,
                  onChange: e => setColor(key, e.target.value),
                  style: { width: 42, height: 34, padding: 2, border: `1px solid ${C.border}`, borderRadius: 8, cursor: "pointer", background: C.surface },
                }),
                React.createElement("input", {
                  value: val,
                  onChange: e => setColor(key, e.target.value),
                  style: { ...fStyle, flex: 1, fontFamily: "var(--font-mono)", fontSize: 11 },
                })
              )
            );
          })
        ),

        React.createElement(BrandTweakSection, { title: "Logos", subtitle: "Drag and drop or click to upload", defaultOpen: true },
          React.createElement(BrandLogoDropZone, {
            label: "Logo Light",
            hint: "Used on dark backgrounds",
            value: brand.logo_light_url || "",
            dropBg: "#111827",
            uploading: uploadingLogo === "logo_light_url",
            onChange: v => setBrand(p => ({ ...p, logo_light_url: v })),
            onUploadFile: file => uploadLogo(file, "logo_light_url"),
          }),
          React.createElement(BrandLogoDropZone, {
            label: "Logo Dark",
            hint: "Used on light backgrounds",
            value: brand.logo_dark_url || "",
            dropBg: "#f5f0eb",
            uploading: uploadingLogo === "logo_dark_url",
            onChange: v => setBrand(p => ({ ...p, logo_dark_url: v })),
            onUploadFile: file => uploadLogo(file, "logo_dark_url"),
          }),
          React.createElement("div", null,
            React.createElement("label", { style: lStyle }, `Header Logo Width (${Number(brand.logo_width) || 140}px)`),
            React.createElement("input", {
              type: "range", min: 48, max: 240, step: 4,
              value: Number(brand.logo_width) || 140,
              onChange: e => setBrand(p => ({ ...p, logo_width: Number(e.target.value) })),
              style: { width: "100%", accentColor: C.purple },
            }),
            React.createElement("div", { style: { display: "flex", justifyContent: "space-between", fontSize: 10, color: C.textMut, marginTop: 2 } },
              React.createElement("span", null, "48px"),
              React.createElement("span", null, "240px")
            )
          )
        ),

        React.createElement(BrandTweakSection, { title: "Org Details", defaultOpen: false },
          tweakInput("Legal Name", org.legal_name || org.name, v => setOrg(p => ({ ...p, legal_name: v, name: v })), { placeholder: "Companions of CPAS" }),
          tweakInput("EIN / Tax ID", org.ein, v => setOrg(p => ({ ...p, ein: v })), { placeholder: "88-4156327", mono: true }),
          tweakInput("Contact Email", org.email, v => setOrg(p => ({ ...p, email: v })), { type: "email", placeholder: "companionsCPAS@gmail.com" }),
          tweakInput("City / Parish", org.city || org.parish, v => setOrg(p => ({ ...p, city: v, parish: v })), { placeholder: "Shreveport" }),
          React.createElement("div", null,
            React.createElement("label", { style: lStyle }, "Mission Statement"),
            React.createElement("textarea", {
              value: org.mission || "",
              rows: 3,
              onChange: e => setOrg(p => ({ ...p, mission: e.target.value })),
              style: { ...fStyle, resize: "vertical", minHeight: 72 },
            })
          )
        ),

        React.createElement(BrandTweakSection, { title: "Links", defaultOpen: false },
          tweakInput("Facebook URL", socials.facebook, v => setSocials(p => ({ ...p, facebook: v })), { type: "url", placeholder: "https://facebook.com/..." }),
          tweakInput("Instagram URL", socials.instagram, v => setSocials(p => ({ ...p, instagram: v })), { type: "url", placeholder: "https://instagram.com/..." }),
          tweakInput("Donation Link", socials.donation_url, v => setSocials(p => ({ ...p, donation_url: v })), { type: "url", placeholder: "https://..." }),
          tweakInput("Announcement Banner", socials.banner, v => setSocials(p => ({ ...p, banner: v })), { placeholder: "Optional header banner text" })
        ),

        React.createElement(BrandTweakSection, { title: "Header Navigation", subtitle: "Saved with brand settings", defaultOpen: true },
          React.createElement("div", { style: { display: "grid", gap: 6 } },
            navLinks.map((link, i) => React.createElement("div", {
              key: i,
              style: { display: "grid", gridTemplateColumns: "1fr 1fr 30px", gap: 6, alignItems: "center" },
            },
              React.createElement("input", {
                value: link.label || "",
                placeholder: "Label",
                onChange: e => {
                  const n = [...navLinks];
                  n[i] = { ...n[i], label: e.target.value };
                  setBrand(p => ({ ...p, navigation_json: JSON.stringify(n) }));
                },
                style: { ...fStyle, padding: "7px 9px", fontSize: 12 },
              }),
              React.createElement("input", {
                value: link.href || "",
                placeholder: "/path",
                onChange: e => {
                  const n = [...navLinks];
                  n[i] = { ...n[i], href: e.target.value };
                  setBrand(p => ({ ...p, navigation_json: JSON.stringify(n) }));
                },
                style: { ...fStyle, padding: "7px 9px", fontSize: 11, fontFamily: "var(--font-mono)" },
              }),
              React.createElement("button", {
                type: "button",
                title: "Remove link",
                onClick: () => {
                  const n = navLinks.filter((_, j) => j !== i);
                  setBrand(p => ({ ...p, navigation_json: JSON.stringify(n) }));
                },
                style: {
                  width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.redDim}`,
                  background: C.redDim, color: C.red, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
                },
              }, React.createElement(Icon, { name: "close", size: 12 }))
            )),
            React.createElement("button", {
              type: "button",
              onClick: () => {
                const n = [...navLinks, { label: "", href: "/", sort_order: (navLinks.length + 1) * 10 }];
                setBrand(p => ({ ...p, navigation_json: JSON.stringify(n) }));
              },
              style: {
                padding: "7px 10px", borderRadius: 8, border: `1px dashed ${C.border}`,
                background: "transparent", color: C.textSec, cursor: "pointer",
                fontSize: 12, fontFamily: "var(--font-ui)", textAlign: "left",
              },
            }, "+ Add Link")
          )
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
            React.createElement(Btn, { size: "sm", variant: "secondary", icon: "plus", onClick: () => onNavigate("cms-pages", { addSection: t.type }) }, "Add to Page")
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
