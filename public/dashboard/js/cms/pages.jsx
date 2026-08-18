// CMS Pages list — /dashboard/cms/pages

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
      if (boot.success) cmsRememberCatalog(boot);

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
      const res = await fetch("/api/cms/page/save", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          page: {
            title: newPage.title,
            route_path: `/${slug}`,
            slug,
            template_key: newPage.template_key,
            status: "draft",
          },
          seed_sections: true,
          add_to_nav: true,
        }),
      });
      const d = await res.json();
      if (d.success) {
        const seeded = d.bootstrap?.sections?.seeded;
        notify(
          seeded
            ? `Page "${newPage.title}" created with starter sections + nav. Publish Live to go public.`
            : `Page "${newPage.title}" created.`
        );
        setShowAdd(false);
        setNewPage({ title: "", slug: "", template_key: "default" });
        await load();
        const pageId = d.editor_page_id || slug;
        if (typeof onNavigate === "function") onNavigate("cms-page-editor", { pageId });
      } else notify(d.error || "Failed to create page", "error");
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
              React.createElement("a", { href: `${cmsPublicOrigin() || ""}${row.route_path}`, target: "_blank", onClick: e => e.stopPropagation(), style: { color: C.textMut, display: "inline-flex", lineHeight: 1 } },
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
      ? React.createElement(PageSkeleton, { title: "pages", stats: 0, rows: 6 })
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


Object.assign(window, {
  PAGE_TEMPLATES,
  CmsPagesView,
});
