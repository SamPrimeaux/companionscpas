// CMS Website view — /dashboard/cms/website

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
        if (d.success) {
          cmsRememberCatalog(d);
          setData(d);
        }
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
        React.createElement(Btn, { variant: "secondary", size: "sm", icon: "eye", onClick: () => window.open(cmsPublicOrigin(data) || "/", "_blank") }, "Preview Site"),
        React.createElement(Btn, { size: "sm", icon: "edit", onClick: () => onNavigate("cms-pages") }, "Manage Pages")
      )
    }),
    React.createElement(CmsNotice, { n: notice }),
    loading
      ? React.createElement(PageSkeleton, { title: "website", stats: 4, rows: 4, variant: "cards" })
      : React.createElement(React.Fragment, null,
    React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 12, marginBottom: 28 } },
      React.createElement(StatCard, { icon: "globe", iconColor: C.green, label: "Site Status", value: "Live", sub: cmsBrandDomain(data) || "Live", subPositive: true }),
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
        { key: "cms-forms",     icon: "docs",     color: C.blueDim || C.purpleDim, iconColor: C.blue || C.purpleL, label: "Forms", sub: "Applications & form studio" },
        { key: "cms-brand",     icon: "tag",      color: C.yellowDim, iconColor: C.yellow,  label: "Brand & Settings", sub: "Colors, logos, org info" },
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
    )
  );
}


Object.assign(window, {
  CmsWebsiteView,
});
