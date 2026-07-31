// ── CMS Views — website, pages, page-editor, images, brand, templates ─────────
// Routes: cms-website, cms-pages, cms-page-editor, cms-images, cms-brand
// Removed: cms-navigation (merged into pages), cms-publish (inline Save/Publish buttons)

const R2_CDN_BASE = "https://assets.companionsofcaddo.org";

const CMS_CTA_ACTIONS = [
  { id: "modal_foster", label: "Open Foster Application", href: "modal:foster", formId: "form_foster_application" },
  { id: "modal_volunteer", label: "Open Volunteer modal", href: "modal:volunteer" },
  { id: "modal_contact", label: "Open Contact modal", href: "modal:contact" },
  { id: "donate", label: "Open Donate flow", href: "data-action:donate" },
  { id: "anchor_needs_foster", label: "Scroll to dogs needing foster", href: "#needs-foster" },
  { id: "page_fosters", label: "Go to /fosters", href: "/fosters" },
  { id: "page_adopt", label: "Go to /adopt", href: "/adopt" },
  { id: "page_donate", label: "Go to /donate", href: "/donate" },
  { id: "page_contact", label: "Go to /contact", href: "/contact" },
  { id: "custom", label: "Custom URL…", href: null },
];

function cmsMatchCtaAction(href) {
  const h = String(href || "").trim();
  if (!h) return "custom";
  const found = CMS_CTA_ACTIONS.find((a) => a.href && a.href === h);
  return found ? found.id : "custom";
}

function cmsNotify(setter, text, type = "ok") {
  setter({ text, type });
  setTimeout(() => setter({ text: "", type: "" }), 4000);
}

const DEFAULT_CANDID_TRUST_BADGE = {
  label: "Candid Seal of Transparency",
  href: "https://app.candid.org/profile/14607574/companions-of-cpas-88-4156327/?pkId=ef6a3773-8ef0-42a2-b7df-ad52ac334f0e",
  image_url: "https://widgets.guidestar.org/prod/v1/pdp/transparency-seal/14607574/svg",
  enabled: true,
};

function cmsParseJsonObject(raw, fallback = {}) {
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw || "{}") : (raw || {});
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function cmsNormalizeTrustBadges(footerJson) {
  const footer = footerJson && typeof footerJson === "object" ? footerJson : {};
  if (Object.prototype.hasOwnProperty.call(footer, "trust_badges")) {
    return Array.isArray(footer.trust_badges) ? footer.trust_badges : [];
  }
  return [{ ...DEFAULT_CANDID_TRUST_BADGE }];
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
    loading
      ? React.createElement(PageSkeleton, { title: "website", stats: 4, rows: 4, variant: "cards" })
      : React.createElement(React.Fragment, null,
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
  animal_grid: '#4ade80', content: '#94a3b8', service_cards: '#34d399', donate_tiers: '#fbbf24',
  raw_html: '#64748b', split_info_card: '#7B2FBE',
};

const CMS_DEVICE_FRAMES = { desktop: null, tablet: 834, mobile: 390 };
const CMS_FIELD_LABELS = {
  eyebrow: "Eyebrow",
  heading: "Heading",
  subheading: "Subheading",
  body: "Body",
  image_url: "Image",
  cta_label: "Primary CTA",
  cta_href: "Primary CTA link",
  cta_secondary_label: "Secondary CTA",
  cta_secondary_href: "Secondary CTA link",
  block_title: "Block title",
  block_body: "Block body",
  block_subtitle: "Block subtitle",
  block_image: "Block image",
  card_image: "Card image",
};
const CMS_TEXT_FIELDS = new Set(["eyebrow", "heading", "subheading", "body", "cta_label", "cta_secondary_label", "block_title", "block_body"]);
const CMS_IMAGE_FIELDS = new Set(["image_url", "card_image"]);

function cmsNormalizeSectionKey(key) {
  return String(key || "").replace(/-/g, "_");
}

function cmsParseConfig(section) {
  const raw = section?.config_json;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return { ...raw };
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

/** two_cards / campaign grids store per-item copy in config.cards — not section eyebrow/heading. */
function cmsConfigCards(section) {
  const cfg = cmsParseConfig(section);
  const cards = Array.isArray(cfg.cards) ? cfg.cards.filter((c) => c && typeof c === "object") : [];
  if (!cards.length) return null;
  const type = String(section?.section_type || "");
  const layoutOk = cfg.layout === "two_cards" || type === "donate_campaign_grid" || type === "campaign_grid";
  return layoutOk ? cards : null;
}

/**
 * Preview already gets field-level inspector from /api/cms/preview (injectCmsInspector).
 * Only inject a dashboard fallback when that script is missing — never double-bind,
 * or section-only clicks steal element selection.
 */
function injectPreviewSectionInspector(iframe) {
  try {
    const doc = iframe?.contentDocument;
    if (!doc) return;
    if (doc.body) doc.body.classList.add("cms-preview");
    // API inspector already present — do not overlay a section-only handler.
    if (doc.getElementById("cms-inspector-style") || doc.getElementById("cms-dash-inspector-style")) return;
    if (doc.defaultView && doc.defaultView.__cmsDashInspector) return;

    const style = doc.createElement("style");
    style.id = "cms-dash-inspector-style";
    style.textContent = `
      body.cms-preview [data-section-key], body.cms-preview [data-cpas-section] { position: relative; cursor: pointer; }
      body.cms-preview .cms-sec-hover:not(.cms-sec-active) { outline: 1.5px dashed rgba(124,58,237,0.55); outline-offset: -2px; }
      body.cms-preview .cms-sec-active { outline: 2px solid #7c3aed; outline-offset: -2px; box-shadow: inset 0 0 0 1px rgba(124,58,237,0.25); }
      body.cms-preview [data-cms-field] { cursor: pointer; }
      body.cms-preview [data-cms-field].cms-field-hover { outline: 1.5px solid rgba(124,58,237,0.7); outline-offset: 2px; border-radius: 4px; }
      body.cms-preview [data-cms-field].cms-field-active { outline: 2px solid #7c3aed; outline-offset: 2px; border-radius: 4px; box-shadow: 0 0 0 3px rgba(124,58,237,0.18); }
      #cms-dash-inspector-chip {
        position: fixed; z-index: 2147483646; pointer-events: none; display: none;
        background: #7c3aed; color: #fff; font: 700 11px/1.2 system-ui,sans-serif;
        padding: 4px 9px; border-radius: 4px 4px 4px 0; white-space: nowrap;
        box-shadow: 0 4px 14px rgba(76,29,149,0.35); letter-spacing: 0.02em;
      }
    `;
    (doc.head || doc.documentElement).appendChild(style);

    const script = doc.createElement("script");
    script.id = "cms-dash-inspector-script";
    script.textContent = `
(function(){
  if (window.__cmsDashInspector) return;
  window.__cmsDashInspector = true;
  var activeKey = null, activeField = null, hoverSec = null, chip = null;

  function sectionKey(el){
    if (!el) return '';
    return el.getAttribute('data-section-key') || el.getAttribute('data-cpas-section') || '';
  }
  function findSection(el){
    var cur = el;
    while (cur && cur !== document.body) {
      if (cur.getAttribute && (cur.getAttribute('data-section-key') || cur.getAttribute('data-cpas-section'))) return cur;
      cur = cur.parentElement;
    }
    return null;
  }
  function findField(el){
    var cur = el;
    while (cur && cur !== document.body) {
      if (cur.getAttribute && cur.getAttribute('data-cms-field')) return cur;
      if (cur.getAttribute && (cur.getAttribute('data-section-key') || cur.getAttribute('data-cpas-section'))) break;
      cur = cur.parentElement;
    }
    return null;
  }
  function allSections(){
    return Array.prototype.slice.call(document.querySelectorAll('[data-section-key], [data-cpas-section]'));
  }
  function resolve(key){
    if (!key) return null;
    var el = document.querySelector('[data-section-key=\"' + key + '\"]');
    if (el) return el;
    el = document.querySelector('[data-cpas-section=\"' + key + '\"]');
    if (el) return el;
    var kebab = String(key).replace(/_/g,'-');
    el = document.querySelector('[data-cpas-section=\"' + kebab + '\"]');
    if (el) return el;
    var snake = String(key).replace(/-/g,'_');
    return document.querySelector('[data-section-key=\"' + snake + '\"]');
  }
  function ensureChip(){
    if (chip) return chip;
    chip = document.createElement('div');
    chip.id = 'cms-dash-inspector-chip';
    document.body.appendChild(chip);
    return chip;
  }
  function placeChip(el, text){
    var c = ensureChip();
    if (!el) { c.style.display = 'none'; return; }
    var r = el.getBoundingClientRect();
    c.textContent = text || sectionKey(el);
    c.style.display = 'block';
    c.style.top = Math.max(8, r.top - 26) + 'px';
    c.style.left = Math.max(8, Math.min(r.left, window.innerWidth - 160)) + 'px';
  }
  function clearFieldChrome(){
    document.querySelectorAll('[data-cms-field].cms-field-hover, [data-cms-field].cms-field-active').forEach(function(n){
      n.classList.remove('cms-field-hover', 'cms-field-active');
    });
  }
  function paint(){
    allSections().forEach(function(sec){
      var key = sectionKey(sec);
      var isActive = activeKey && (key === activeKey || key.replace(/-/g,'_') === String(activeKey).replace(/-/g,'_') || key.replace(/_/g,'-') === String(activeKey).replace(/_/g,'-'));
      sec.classList.toggle('cms-sec-active', !!isActive);
      sec.classList.toggle('cms-sec-hover', hoverSec === sec && !isActive);
    });
    var activeEl = activeKey ? resolve(activeKey) : null;
    if (activeEl) placeChip(activeEl, activeField ? (sectionKey(activeEl) + ' / ' + activeField) : sectionKey(activeEl));
    else if (hoverSec) placeChip(hoverSec, sectionKey(hoverSec));
    else { var c = ensureChip(); c.style.display = 'none'; }
  }

  document.addEventListener('mouseover', function(e){
    var field = findField(e.target);
    hoverSec = findSection(e.target);
    clearFieldChrome();
    if (field) field.classList.add('cms-field-hover');
    paint();
  }, true);
  document.addEventListener('mouseout', function(e){
    if (!e.relatedTarget) { hoverSec = null; clearFieldChrome(); paint(); }
  }, true);
  document.addEventListener('click', function(e){
    var sec = findSection(e.target);
    if (!sec) return;
    e.preventDefault();
    e.stopPropagation();
    var key = sectionKey(sec);
    var fieldEl = findField(e.target);
    activeKey = key;
    activeField = fieldEl ? fieldEl.getAttribute('data-cms-field') : null;
    var blockKey = fieldEl ? (fieldEl.getAttribute('data-cms-block') || null) : null;
    clearFieldChrome();
    if (fieldEl) fieldEl.classList.add('cms-field-active');
    paint();
    if (fieldEl && activeField) {
      window.parent.postMessage({ type: 'cms:element-selected', sectionKey: key, field: activeField, blockKey: blockKey, tag: (fieldEl.tagName || '').toLowerCase() }, '*');
    } else {
      window.parent.postMessage({ type: 'cms:section-clicked', key: key }, '*');
    }
  }, true);
  window.addEventListener('scroll', function(){ paint(); }, true);
  window.addEventListener('message', function(e){
    if (!e.data) return;
    if (e.data.type === 'cms:scroll-to-section' || e.data.type === 'cms:highlight-section') {
      activeKey = e.data.key || null;
      activeField = e.data.field || null;
      clearFieldChrome();
      var el = resolve(activeKey);
      if (el && e.data.type === 'cms:scroll-to-section') el.scrollIntoView({ behavior:'smooth', block:'start' });
      if (el && activeField) {
        var f = el.querySelector('[data-cms-field=\"' + activeField + '\"]');
        if (f) f.classList.add('cms-field-active');
      }
      paint();
    }
    if (e.data.type === 'cms:clear-selection') {
      activeKey = null; activeField = null; clearFieldChrome(); paint();
    }
  });
})();`;
    (doc.body || doc.documentElement).appendChild(script);
  } catch (_) {}
}

const CMS_SECTION_TYPES = [
  { type:'campaign_entry_hero', label:'Campaign Entry Hero', desc:'Split campaign opener with image, steps, entry, and sharing actions' },
  { type:'hero', label:'Hero', desc:'Large page opener with headline, image, and CTAs' },
  { type:'text_image', label:'Text + Image', desc:'Balanced story block with optional media' },
  { type:'split_info_card', label:'Split Info Card', desc:'Image + copy with bullet list and contact card' },
  { type:'feature_cards', label:'Feature Cards', desc:'Reusable card grid for services or benefits' },
  { type:'foster_grid', label:'Foster Grid', desc:'Animal/foster focused grid section' },
  { type:'campaign_grid', label:'Campaign Grid', desc:'Donation or fundraising campaign grid' },
  { type:'testimonial', label:'Testimonial', desc:'Quote, story, or social proof block' },
  { type:'cta_banner', label:'CTA Banner', desc:'High-emphasis call to action strip' },
  { type:'animal_grid', label:'Animal Grid', desc:'Adoptable or foster-needed animals' },
  { type:'contact_hero', label:'Contact Hero', desc:'Contact page opener with social pills' },
  { type:'contact_form', label:'Contact Form', desc:'Inline message form for contact pages' },
  { type:'embedded_form', label:'Form (Forms Studio)', desc:'Embed a published Forms Studio form' },
  { type:'contact_socials', label:'Contact Info Cards', desc:'Email, location, org cards' },
  { type:'contact_team', label:'Team', desc:'Group photo + member list' },
  { type:'content', label:'Content', desc:'Simple copy section for flexible text' },
  { type:'raw_html', label:'Custom Code', desc:'Paste HTML or embed from a URL' },
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
  const [selectedField, setSelectedField] = React.useState(null);
  const [selectedBlockKey, setSelectedBlockKey] = React.useState(null);
  const [chromeTarget, setChromeTarget] = React.useState(null); // 'header' | 'footer' | null
  const [chromeBrand, setChromeBrand] = React.useState(null);
  const [chromeOrg, setChromeOrg] = React.useState({});
  const [chromeSocials, setChromeSocials] = React.useState({});
  const [chromeTrustBadges, setChromeTrustBadges] = React.useState([{ ...DEFAULT_CANDID_TRUST_BADGE }]);
  const [chromeFooterLogo, setChromeFooterLogo] = React.useState("");
  const [chromeSaving, setChromeSaving] = React.useState(false);
  const [chromeUploading, setChromeUploading] = React.useState(false);
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
  const pageSwitcherRef = React.useRef(null);
  const notify = (t, type='ok') => cmsNotify(setNotice, t, type);

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
      if (e.data.type === 'cms:element-selected') {
        selectSection(e.data.sectionKey, { field: e.data.field || null, blockKey: e.data.blockKey || null });
        return;
      }
      if (e.data.type !== 'cms:section-clicked') return;
      selectSection(e.data.key);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [selectSection]);

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

  const applyChromeBrand = React.useCallback((row) => {
    if (!row) return;
    const org = cmsParseJsonObject(row.organization_json, {});
    const socials = cmsParseJsonObject(row.socials_json, {});
    const footer = cmsParseJsonObject(row.footer_json, {});
    setChromeBrand(row);
    setChromeOrg(org);
    setChromeSocials(socials);
    setChromeTrustBadges(cmsNormalizeTrustBadges(footer));
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
      ...(isRawHtml ? { config_json: JSON.stringify({ html_source: 'r2', html: '', r2_key: '', source_url: '' }) } : {}),
    };
    setBusy(true);
    try { await saveSectionObject(section, true); setShowAddSection(false); await loadPage(); setSelectedKey(newKey); setMobileTab('edit'); notify('Section added'); }
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
      const pages = (d.pages || []).filter((p) => p.route_path && p.route_path !== route);
      setCopyPages(pages.length ? pages : [
        { route_path: '/', title: 'Home' },
        { route_path: '/donate', title: 'Donate' },
        { route_path: '/adopt', title: 'Adopt' },
        { route_path: '/fosters', title: 'Foster' },
        { route_path: '/contact', title: 'Contact' },
        { route_path: '/about', title: 'About' },
      ].filter((p) => p.route_path !== route));
    } catch {
      setCopyPages([{ route_path: '/', title: 'Home' }, { route_path: '/donate', title: 'Donate' }].filter((p) => p.route_path !== route));
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

  // Track unsaved state when fields change
  const setFieldTracked = (key, val) => { setField(key, val); setHasUnsaved(true); };

  const mode = isMobile ? 'mobile' : previewMode;
  const deviceWidth = CMS_DEVICE_FRAMES[mode]; // null = fill canvas (desktop)

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
              return React.createElement('div', {
                key:s.section_key,
                id:'cms-section-row-' + s.section_key,
                draggable:true,
                onDragStart:()=>setDragKey(s.section_key),
                onDragOver:e=>{ e.preventDefault(); setDragOverKey(s.section_key); },
                onDrop:e=>{ e.preventDefault(); reorderSections(dragKey, s.section_key); },
                onClick:()=>{
                  selectSection(s.section_key, { clearUnsaved: true });
                },
                style:{ display:'grid', gridTemplateColumns:'18px minmax(0,1fr) auto 28px 28px', alignItems:'center', gap:8, padding:'10px 8px', marginBottom:6, borderRadius:12, cursor:'pointer', border:`2px solid ${active ? C.purple : dragOverKey === s.section_key ? C.purple + '55' : C.border}`, borderLeft:`5px solid ${active ? C.purple : color}`, background:active ? C.purpleDim : C.bg, opacity:hidden ? .55 : 1, boxShadow: active ? `0 0 0 2px ${C.purple}44` : 'none', transition:'all 0.12s' }
              },
                React.createElement('span', { style:{ color:C.textMut, fontSize:14, cursor:'grab' } }, '≡'),
                React.createElement('div', { style:{ minWidth:0 } },
                  React.createElement('div', { style:{ color:active ? C.purpleL : C.text, fontSize:12, fontWeight:800, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', textDecoration:hidden ? 'line-through' : 'none' } }, s.heading || s.section_key),
                  active && React.createElement('div', { style:{ fontSize:9, fontWeight:900, color:C.purpleL, letterSpacing:'.1em', textTransform:'uppercase', marginTop:2 } }, 'EDITING'),
                  React.createElement('div', { style:{ color:active ? C.purple : C.textMut, fontSize:10, fontFamily:'var(--font-mono)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' } }, s.section_key)
                ),
                cmsTypeBadge(s.section_type),
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
            }),
        chromeRow('footer', 'Footer', 'Mission · org · socials · trust badges · sitewide')
      )
    );
  }

  async function saveChromeFooter(silent = false) {
    if (!chromeBrand) {
      notify('Brand settings not loaded yet', 'error');
      return;
    }
    setChromeSaving(true);
    try {
      const footer_json = JSON.stringify({
        ...cmsParseJsonObject(chromeBrand.footer_json, {}),
        trust_badges: chromeTrustBadges,
      });
      const res = await fetch('/api/cms/brand/save', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          brand: {
            ...chromeBrand,
            brand_name: chromeOrg.legal_name || chromeOrg.name || chromeBrand.brand_name || 'Companions of CPAS',
            footer_logo_light_url: chromeFooterLogo || chromeBrand.footer_logo_light_url || '',
            footer_logo_dark_url: chromeFooterLogo || chromeBrand.footer_logo_dark_url || '',
            organization_json: JSON.stringify(chromeOrg),
            socials_json: JSON.stringify(chromeSocials),
            footer_json,
            logo_width: Math.max(40, Math.min(88, Number(chromeBrand.logo_width) || 88)),
            logo_height: null,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok && res.status !== 207) throw new Error(data.error || 'Footer save failed');
      setChromeBrand((prev) => prev ? { ...prev, footer_json, organization_json: JSON.stringify(chromeOrg), socials_json: JSON.stringify(chromeSocials), footer_logo_light_url: chromeFooterLogo } : prev);
      bumpPreview();
      setHasUnsaved(false);
      if (!silent) {
        const n = Number(data.republished) || 0;
        notify(data.message || (n ? `Footer saved · ${n} pages republished` : 'Footer saved'));
      }
    } catch (e) {
      notify(e.message || 'Footer save failed', 'error');
      throw e;
    } finally {
      setChromeSaving(false);
    }
  }

  async function uploadChromeFooterLogo(file) {
    if (!file) return;
    setChromeUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('usage_context', 'brand');
      fd.append('label', 'Footer logo');
      const res = await fetch('/api/cms/asset/upload', { method: 'POST', credentials: 'include', body: fd });
      const d = await res.json();
      const url = d.public_url || d.cdn_url || d.url;
      if (!d.success || !url) throw new Error(d.error || 'Upload failed');
      setChromeFooterLogo(url);
      setHasUnsaved(true);
      notify('Footer logo uploaded — save to publish sitewide');
    } catch (e) {
      notify(e.message || 'Upload failed', 'error');
    } finally {
      setChromeUploading(false);
    }
  }

  function renderFooterChromeSettings() {
    const patchOrg = (key, value) => {
      setChromeOrg((prev) => {
        const next = { ...prev, [key]: value };
        if (key === 'legal_name') next.name = value;
        if (key === 'city') next.parish = value;
        return next;
      });
      setHasUnsaved(true);
    };
    const patchSocial = (key, value) => {
      setChromeSocials((prev) => ({ ...prev, [key]: value }));
      setHasUnsaved(true);
    };
    const patchBadge = (idx, patch) => {
      setChromeTrustBadges((prev) => prev.map((b, i) => (i === idx ? { ...b, ...patch } : b)));
      setHasUnsaved(true);
    };

    return React.createElement('div', {
      style: { display: 'grid', gap: 14, padding: 13, borderRadius: 13, border: `1px solid ${C.purple}44`, background: 'rgba(124,58,237,0.06)' }
    },
      React.createElement('div', null,
        React.createElement('div', { style: { fontSize: 11, fontWeight: 900, color: C.purpleL, letterSpacing: '.08em', textTransform: 'uppercase' } }, 'Footer (sitewide)'),
        React.createElement('div', { style: { fontSize: 11, color: C.textMut, lineHeight: 1.45, marginTop: 4 } },
          'Edits mission, org details, socials, and trust badges for every page. Save republishes the whole site footer.'
        )
      ),
      React.createElement('div', null,
        cmsFieldLabel('Mission / tagline'),
        cmsTextArea(chromeOrg.mission || '', (v) => patchOrg('mission', v), () => { saveChromeFooter(true).then(() => setHasUnsaved(false)); }, 4)
      ),
      React.createElement('div', null,
        cmsFieldLabel('Organization name'),
        cmsTextInput(chromeOrg.legal_name || chromeOrg.name || '', (v) => patchOrg('legal_name', v), () => { saveChromeFooter(true).then(() => setHasUnsaved(false)); }, 'Companions of CPAS')
      ),
      React.createElement('div', null,
        cmsFieldLabel('EIN / Tax ID'),
        cmsTextInput(chromeOrg.ein || '', (v) => patchOrg('ein', v), () => { saveChromeFooter(true).then(() => setHasUnsaved(false)); }, '88-4156327', true)
      ),
      React.createElement('div', null,
        cmsFieldLabel('Contact email'),
        cmsTextInput(chromeOrg.email || '', (v) => patchOrg('email', v), () => { saveChromeFooter(true).then(() => setHasUnsaved(false)); }, 'companionsCPAS@gmail.com')
      ),
      React.createElement('div', null,
        cmsFieldLabel('City / Parish'),
        cmsTextInput(chromeOrg.city || chromeOrg.parish || '', (v) => patchOrg('city', v), () => { saveChromeFooter(true).then(() => setHasUnsaved(false)); }, 'Caddo Parish, Louisiana')
      ),
      React.createElement('div', null,
        cmsFieldLabel('Facebook URL'),
        cmsTextInput(chromeSocials.facebook || '', (v) => patchSocial('facebook', v), () => { saveChromeFooter(true).then(() => setHasUnsaved(false)); }, 'https://facebook.com/…', true)
      ),
      React.createElement('div', null,
        cmsFieldLabel('Instagram URL'),
        cmsTextInput(chromeSocials.instagram || '', (v) => patchSocial('instagram', v), () => { saveChromeFooter(true).then(() => setHasUnsaved(false)); }, 'https://instagram.com/…', true)
      ),
      React.createElement('div', null,
        cmsFieldLabel('Footer logo URL'),
        React.createElement('div', { style: { display: 'grid', gap: 8 } },
          cmsTextInput(chromeFooterLogo || '', (v) => { setChromeFooterLogo(v); setHasUnsaved(true); }, () => { saveChromeFooter(true).then(() => setHasUnsaved(false)); }, 'https://assets…', true),
          React.createElement('label', {
            style: {
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 9,
              border: `1px dashed ${C.border}`, background: C.surface, color: C.textSec, fontSize: 12, cursor: chromeUploading ? 'wait' : 'pointer', width: 'fit-content',
            }
          },
            chromeUploading ? 'Uploading…' : 'Upload footer logo',
            React.createElement('input', {
              type: 'file', accept: 'image/*', style: { display: 'none' }, disabled: chromeUploading,
              onChange: (e) => { uploadChromeFooterLogo(e.target.files?.[0]); e.target.value = ''; },
            })
          )
        )
      ),
      React.createElement('div', { style: { display: 'grid', gap: 10 } },
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 } },
          React.createElement('div', null,
            cmsFieldLabel('Trust badges'),
            React.createElement('div', { style: { fontSize: 11, color: C.textMut, marginTop: -4 } }, 'Candid and other seals appear in the footer bottom bar')
          ),
          React.createElement('button', {
            type: 'button',
            onClick: () => {
              setChromeTrustBadges((prev) => [...prev, { label: '', href: '', image_url: '', enabled: true }]);
              setHasUnsaved(true);
            },
            style: {
              padding: '6px 10px', borderRadius: 8, border: `1px dashed ${C.border}`, background: 'transparent',
              color: C.textSec, cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-ui)',
            },
          }, '+ Add badge')
        ),
        chromeTrustBadges.map((badge, idx) => React.createElement('div', {
          key: `trust-${idx}`,
          style: { display: 'grid', gap: 8, padding: 10, borderRadius: 10, border: `1px solid ${C.border}`, background: C.surface },
        },
          React.createElement('label', { style: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: C.text, cursor: 'pointer' } },
            React.createElement('input', {
              type: 'checkbox',
              checked: badge.enabled !== false && badge.enabled !== 0,
              onChange: (e) => patchBadge(idx, { enabled: e.target.checked }),
            }),
            'Enabled on public footer'
          ),
          React.createElement('div', null,
            cmsFieldLabel('Label'),
            cmsTextInput(badge.label || '', (v) => patchBadge(idx, { label: v }), () => { saveChromeFooter(true).then(() => setHasUnsaved(false)); }, 'Candid Seal of Transparency')
          ),
          React.createElement('div', null,
            cmsFieldLabel('Link URL'),
            cmsTextInput(badge.href || '', (v) => patchBadge(idx, { href: v }), () => { saveChromeFooter(true).then(() => setHasUnsaved(false)); }, 'https://…', true)
          ),
          React.createElement('div', null,
            cmsFieldLabel('Image URL'),
            cmsTextInput(badge.image_url || '', (v) => patchBadge(idx, { image_url: v }), () => { saveChromeFooter(true).then(() => setHasUnsaved(false)); }, 'https://widgets.guidestar.org/…', true)
          ),
          badge.image_url ? React.createElement('img', {
            src: badge.image_url, alt: badge.label || 'Trust badge',
            style: { height: 36, width: 'auto', objectFit: 'contain', opacity: 0.9 },
          }) : null,
          React.createElement('button', {
            type: 'button',
            onClick: () => {
              setChromeTrustBadges((prev) => prev.filter((_, i) => i !== idx));
              setHasUnsaved(true);
            },
            style: {
              justifySelf: 'start', padding: '6px 10px', borderRadius: 8, border: `1px solid ${C.red}44`,
              background: C.surface, color: C.red, cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-ui)',
            },
          }, 'Remove badge')
        ))
      ),
      React.createElement(Btn, {
        size: 'sm',
        icon: chromeSaving ? undefined : 'check2',
        disabled: chromeSaving || !chromeBrand,
        onClick: () => { saveChromeFooter(false).catch(() => {}); },
      }, chromeSaving ? 'Saving…' : 'Save footer sitewide')
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
    if (isMobile && mobileTab === 'preview') {
      return React.createElement('div', { className:'cms-canvas-stage', style:{ height:'calc(100vh - 110px)', minHeight:0 } }, iframe);
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
      }, iframe)
    );
  }

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
      { id:'zeffy', enabled:true, label:'', tooltip:'Donate with Zeffy — 100% goes to animals (fee-free)', show_label:false, note:'fee-free', url_field:'zeffy_donate_url', component_id:'payment_zeffy', style:'zeffy', logo_height:22, background:'#141018', border_color:'#141018', text_color:'#faf7f3', note_color:'#49e9d5', logo_url:'https://assets.companionsofcaddo.org/static/assets/zeffy-wordmark.webp' },
      { id:'paypal', enabled:true, label:'', tooltip:'Donate via PayPal', show_label:false, note:'', url_field:'paypal_donate_url', component_id:'payment_paypal', style:'paypal', logo_height:22, background:'#eef5ff', border_color:'#9ec0ef', text_color:'#003087', logo_url:'https://assets.companionsofcaddo.org/static/assets/PayPal.svg.webp' },
      { id:'venmo', enabled:true, label:'', tooltip:'Pay on Venmo', show_label:false, note:'', url_field:'venmo_donate_url', component_id:'payment_venmo', style:'venmo', logo_height:22, background:'#eaf6fc', border_color:'#7ec0e8', text_color:'#008CFF', logo_url:'https://assets.companionsofcaddo.org/static/assets/venmo-official-logo.svg' },
      { id:'amazon_wishlist', enabled:true, label:'', tooltip:'Send supplies via Amazon Wishlist', show_label:false, note:'', url_field:'amazon_wishlist_url', component_id:'wishlist_amazon', style:'amazon', logo_height:28, background:'#fff6e8', border_color:'#f0c078', text_color:'#232f3e', logo_url:'https://assets.companionsofcaddo.org/static/assets/amz-wishlist-bttn.webp' },
      { id:'stripe', enabled:true, label:'', tooltip:'Card or bank donation', show_label:false, note:'', action:'donate', component_id:'payment_stripe_donation_modal', style:'stripe', logo_height:22, background:'#f3f0ff', border_color:'#b8a9ff', text_color:'#3d348b', logo_url:'https://assets.companionsofcaddo.org/static/assets/stripe-wordmark.webp' },
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
    const usesCards = !usesConfigCards && !isRawHtml && (['feature_cards', 'card_grid', 'home_pillars'].includes(selected.section_type) || sectionBlocks.length > 0);
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
            cmsTextInput(selectedConfigCard.image || '', (v) => setConfigCardLocal(cardEditId, { image: v }), () => patchConfigCard(cardEditId, { image: selectedConfigCard.image || '' }), 'https://assets.companionsofcaddo.org/...', true)
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
        cmsTextInput(selectedConfigCard.cta_href || '', (v) => setConfigCardLocal(cardEditId, { cta_href: v }), () => patchConfigCard(cardEditId, { cta_href: selectedConfigCard.cta_href || '' }), 'https://companionsofcaddo.org/#…', true)
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
              cmsTextInput(selectedBlock.image_url, v => setBlockField('image_url', v), () => saveSelectedBlock(true), 'https://assets.companionsofcaddo.org/...', true)
            ),
            selectedBlock.image_url && React.createElement('div', { style:{ width:'100%', maxHeight:220, borderRadius:12, border:`1px solid ${C.border}`, background:C.bg, overflow:'auto', display:'flex', alignItems:'center', justifyContent:'center' } },
              React.createElement('img', { src: selectedBlock.image_url, alt: '', style:{ width:'100%', height:'auto', maxHeight:220, objectFit:'contain', display:'block' } })
            )
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
                'https://assets.companionsofcaddo.org/...',
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
      usesCards && React.createElement('div', { style:{ display:'grid', gap:10 } },
        React.createElement('h4', { style:groupTitleStyle() }, 'Cards in this section'),
        sectionBlocks.length
          ? sectionBlocks.map((b) => React.createElement('button', {
              key: b.id || b.block_key,
              type: 'button',
              onClick: () => {
                setSelectedBlockKey(b.block_key);
                setSelectedField('block_title');
                postHighlight(selected.section_key, 'block_title');
                setMobileTab('edit');
              },
              style: {
                textAlign: 'left',
                padding: '10px 12px',
                borderRadius: 10,
                border: `1px solid ${selectedBlockKey === b.block_key ? C.purple : C.border}`,
                background: selectedBlockKey === b.block_key ? 'rgba(124,58,237,0.08)' : C.bg,
                cursor: 'pointer',
              },
            },
              React.createElement('div', { style:{ fontWeight:800, color:C.text, fontSize:13 } }, b.title || b.block_key || 'Card'),
              React.createElement('div', { style:{ color:C.textMut, fontSize:11, marginTop:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' } }, b.body || 'Edit card copy')
            ))
          : React.createElement('div', { style:{ color:C.textMut, fontSize:12 } }, 'No cards yet — this section uses section fields only.')
      ),
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

  function renderMobileTabs() {
    return React.createElement('div', { style:{ display:'flex', borderBottom:`1px solid ${C.border}`, background:C.surface } }, ['sections','edit','preview'].map(t => React.createElement('button', { key:t, onClick:()=>setMobileTab(t), style:{ flex:1, height:42, border:'none', borderBottom:`2px solid ${mobileTab === t ? C.purple : 'transparent'}`, background:'transparent', color:mobileTab === t ? C.purpleL : C.textSec, fontWeight:900, fontSize:13, textTransform:'capitalize' } }, t)));
  }

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

  function renderCtaFields(labelKey, hrefKey, title) {
    const hrefVal = selected[hrefKey] || '';
    const actionId = cmsMatchCtaAction(hrefVal);
    const action = CMS_CTA_ACTIONS.find((a) => a.id === actionId) || CMS_CTA_ACTIONS[CMS_CTA_ACTIONS.length - 1];
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
            const next = CMS_CTA_ACTIONS.find((a) => a.id === e.target.value);
            if (!next) return;
            if (next.id === 'custom') {
              setField(hrefKey, hrefVal && !CMS_CTA_ACTIONS.some((a) => a.href === hrefVal) ? hrefVal : '');
              setHasUnsaved(true);
              return;
            }
            setFieldAndSave(hrefKey, next.href);
          },
          style: { width:'100%', height:38, borderRadius:10, border:`1px solid ${C.border}`, background:C.surface, color:C.text, padding:'0 10px', fontSize:13 }
        }, CMS_CTA_ACTIONS.map((a) => React.createElement('option', { key: a.id, value: a.id }, a.label)))
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
        React.createElement('div', { style:{ flex:1 } }, cmsTextInput(selected.image_url, v=>setField('image_url', v), ()=>saveSelected(true), 'https://assets.companionsofcaddo.org/...', true)),
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
  if (!asset) return "";
  const cdn = String(asset.cdn_url || "").trim();
  const pub = String(asset.public_url || asset.pub_url || "").trim();
  const key = String(asset.r2_key || "").replace(/^\/+/, "").trim();
  const raw = cdn || pub || (key ? `${R2_CDN_BASE}/${key}` : "") || String(asset.url || asset.image_url || "").trim();
  if (!raw) return "";
  return raw
    .replace(/^https?:\/\/companionscpas\.meauxbility\.workers\.dev\/static\//i, `${R2_CDN_BASE}/`)
    .replace(/^https?:\/\/companionscpas\.meauxbility\.workers\.dev\//i, "https://companionsofcaddo.org/");
}

function mediaIsImageAsset(asset) {
  return mediaAssetKind(asset) === "image";
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

function mediaUsageTags(asset) {
  // Only show tags backed by cms_asset_usages rows (never a bare "Live")
  const live = asset?.live_labels || [];
  if (live.length) return live.slice(0, 3);
  const all = asset?.usage_labels || [];
  return all.slice(0, 2);
}

async function downloadMediaAsset(url, filename, notify) {
  if (!url) return;
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) throw new Error("fetch failed");
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename || "download";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
    if (notify) notify("Download started");
  } catch {
    // CORS fallback — open in new tab so the browser can save
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.download = filename || "download";
    document.body.appendChild(a);
    a.click();
    a.remove();
    if (notify) notify("Opened file — use Save As if download did not start");
  }
}

function MediaPreviewModal({ asset, onClose, onSave, onDelete, copyUrl, notify }) {
  const [altText, setAltText] = React.useState(asset?.alt_text || "");
  const [label, setLabel] = React.useState(asset?.label || asset?.filename || "");
  const [busy, setBusy] = React.useState(false);
  if (!asset) return null;
  const url = mediaAssetUrl(asset);
  const isVideo = String(asset.mime_type || "").startsWith("video/") || asset.asset_type === "video";
  const isPdf = asset.mime_type === "application/pdf" || asset.asset_type === "document";
  const usageTags = mediaUsageTags(asset);

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
          React.createElement("span", null, mediaFolderLabel(mediaFolderKey(asset)) || "Library")
        ),
        usageTags.length > 0
          ? React.createElement("div", { className: "media-usage-tags" },
              usageTags.map((t, i) => React.createElement("span", {
                key: i,
                className: "media-usage-tag" + ((asset.live_labels || []).includes(t) ? " is-live" : ""),
              }, t))
            )
          : React.createElement("div", { className: "media-usage-empty" }, "Not linked to a live page yet"),
        React.createElement("code", { className: "media-preview-url" }, url)
      ),
      React.createElement("div", { className: "media-preview-actions" },
        React.createElement(Btn, { variant: "secondary", size: "sm", icon: "copy", onClick: () => copyUrl(url) }, "Copy URL"),
        React.createElement(Btn, {
          variant: "secondary",
          size: "sm",
          icon: "download",
          onClick: () => downloadMediaAsset(url, label || asset.filename || "asset", notify),
        }, "Download"),
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
      // Keep usage tags current (animals/campaigns → cms_asset_usages)
      await fetch("/api/cms/assets/rebuild-usages", { method: "POST", credentials: "include" }).catch(() => {});
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
                  const tags = mediaUsageTags(a);
                  return React.createElement("div", {
                    key: a.id, className: "media-card",
                  },
                    React.createElement("button", {
                      type: "button",
                      className: "media-card-main",
                      onClick: () => setPreview(a),
                    },
                      React.createElement("div", { className: "media-card-thumb" },
                        React.createElement(MediaThumbPreview, { asset: a }),
                        mediaAssetKind(a) === "pdf" && React.createElement("span", { className: "media-card-badge pdf" }, "PDF"),
                        mediaAssetKind(a) === "video" && React.createElement("span", { className: "media-card-badge video" }, "Video"),
                        a.source_provider === "google_drive" && React.createElement("span", { className: "media-card-badge drive" }, "Drive"),
                        a.is_live_usage && React.createElement("span", { className: "media-card-badge live" }, "Live")
                      ),
                      React.createElement("div", { className: "media-card-meta" },
                        React.createElement("strong", null, a.label || a.filename),
                        React.createElement("span", null, mediaSizeLabel(a)),
                        tags.length > 0 && React.createElement("div", { className: "media-usage-tags compact" },
                          tags.map((t, i) => React.createElement("span", {
                            key: i,
                            className: "media-usage-tag" + (a.is_live_usage ? " is-live" : ""),
                          }, t))
                        )
                      )
                    ),
                    React.createElement("button", {
                      type: "button",
                      className: "media-card-download",
                      title: "Download",
                      onClick: (e) => {
                        e.stopPropagation();
                        downloadMediaAsset(mediaAssetUrl(a), a.label || a.filename || "asset", notify);
                      },
                    }, React.createElement(Icon, { name: "download", size: 14 }), " Download")
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

function BrandThemeSwatches({ brand, previewTheme }) {
  const isDark = previewTheme === "dark";
  const primary = brand.primary_color || "#7c3aed";
  const accent = brand.accent_color || "#ee2336";
  const logoUrl = isDark
    ? (brand.logo_light_url || brand.logo_dark_url || "")
    : (brand.logo_dark_url || brand.logo_light_url || "");
  const logoW = Math.max(40, Math.min(88, Number(brand.logo_width) || 88));
  const headerBg = isDark ? "#111827" : "#ffffff";
  const textColor = isDark ? "#f0ece6" : "#1a1a1a";
  const mutedColor = isDark ? "rgba(255,255,255,0.62)" : "#6b7280";

  return React.createElement("div", {
    style: {
      borderRadius: 16, overflow: "hidden", border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : C.border}`,
      background: isDark ? "#0b0f1a" : "#f5f0eb", boxShadow: "0 18px 48px rgba(15,23,42,0.08)",
    },
  },
    React.createElement("div", {
      style: {
        background: headerBg, color: textColor, borderBottom: `3px solid ${primary}`,
        padding: "0 18px", height: 88, display: "flex", alignItems: "center",
      },
    },
      logoUrl
        ? React.createElement("img", {
            src: logoUrl, alt: brand.brand_name || "Logo",
            style: { height: logoW, width: "auto", maxHeight: 88, objectFit: "contain", display: "block" },
          })
        : React.createElement("div", { style: { fontWeight: 800, fontSize: 15, color: primary } }, brand.brand_name || "Brand")
    ),
    React.createElement("div", { style: { padding: "18px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 } },
      [
        { label: "Primary", color: primary },
        { label: "Accent", color: accent },
        { label: "Header", color: headerBg, border: true },
      ].map((sw) => React.createElement("div", {
        key: sw.label,
        style: { borderRadius: 10, overflow: "hidden", border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : C.border}` },
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
          logo_width: Math.max(40, Math.min(88, Number(d.brand.logo_width) || 88)),
          logo_height: Number(d.brand.logo_height) || 0,
        });
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
            logo_width: Math.max(40, Math.min(88, Number(brand.logo_width) || 88)),
            logo_height: null,
          },
        }),
      });
      const d = await res.json();
      notify(d.success ? (d.message || "Brand settings saved") : (d.error || "Save failed"), d.success ? "ok" : "error");
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
      React.createElement("div", { style: { minWidth: 0 } },
        React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 12 } },
          React.createElement("div", null,
            React.createElement("h2", { style: { margin: 0, fontSize: 18, fontWeight: 800, color: C.text } }, "Brand & Settings"),
            React.createElement("p", { style: { margin: "4px 0 0", fontSize: 12, color: C.textSec } }, "Colors and logos. Footer copy, socials, and trust badges: edit Footer on any page in Pages.")
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
        React.createElement(BrandThemeSwatches, { brand, previewTheme }),
        React.createElement("div", {
          style: {
            marginTop: 14, padding: "12px 14px", borderRadius: 12, fontSize: 12, lineHeight: 1.5,
            background: "rgba(124,58,237,0.08)", border: `1px solid ${C.purple}44`, color: C.textSec,
          },
        },
          "Footer mission, EIN, social links, and Candid/trust badges are edited in ",
          React.createElement("strong", null, "Pages → Footer"),
          " (sitewide). Navigation labels/placement are edited per page under Header."
        )
      ),

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
            React.createElement("div", { style: { fontSize: 11, color: C.textMut, marginTop: 2 } }, "Theme identity only")
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
            React.createElement("label", { style: lStyle }, `Header logo height (${Math.max(40, Math.min(88, Number(brand.logo_width) || 88))}px)`),
            React.createElement("input", {
              type: "range", min: 40, max: 88, step: 2,
              value: Math.max(40, Math.min(88, Number(brand.logo_width) || 88)),
              onChange: e => setBrand(p => ({ ...p, logo_width: Number(e.target.value) })),
              style: { width: "100%", accentColor: C.purple },
            }),
            React.createElement("div", { style: { display: "flex", justifyContent: "space-between", fontSize: 10, color: C.textMut, marginTop: 2 } },
              React.createElement("span", null, "40px"),
              React.createElement("span", null, "88px = full header height")
            ),
            React.createElement("p", { style: { fontSize: 11, color: C.textMut, margin: "6px 0 0", lineHeight: 1.4 } },
              "Header bar is 88px. Logo height applies live via brand tokens CSS after save."
            )
          )
        )
      )
    )
  );
}

/** Session-scoped 30s undo toast — progress bar (no ticking digits); restores from D1 only. */
function CmsSectionUndoToast() {
  const [pending, setPending] = React.useState(null);
  const [busy, setBusy] = React.useState(false);

  const readPending = React.useCallback(() => {
    try {
      const raw = sessionStorage.getItem("cpas.sectionUndo");
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data?.section_key || !data?.page_route || !data?.expires_at) {
        sessionStorage.removeItem("cpas.sectionUndo");
        return null;
      }
      if (Date.now() > Number(data.expires_at)) {
        sessionStorage.removeItem("cpas.sectionUndo");
        return null;
      }
      if (!data.duration_ms) data.duration_ms = 30000;
      if (!data.started_at) data.started_at = Number(data.expires_at) - Number(data.duration_ms);
      return data;
    } catch {
      return null;
    }
  }, []);

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById("cpas-undo-toast-css")) return;
    const style = document.createElement("style");
    style.id = "cpas-undo-toast-css";
    style.textContent = `
      @keyframes cpasUndoDrain {
        to { transform: scaleX(0); }
      }
    `;
    document.head.appendChild(style);
  }, []);

  React.useEffect(() => {
    setPending(readPending());
    const onEvt = () => setPending(readPending());
    window.addEventListener("cpas:section-undo", onEvt);
    window.addEventListener("storage", onEvt);
    const id = setInterval(() => setPending(readPending()), 500);
    return () => {
      window.removeEventListener("cpas:section-undo", onEvt);
      window.removeEventListener("storage", onEvt);
      clearInterval(id);
    };
  }, [readPending]);

  // Freeze bar timing when this undo payload appears so re-renders don't restart the drain.
  const barTiming = React.useMemo(() => {
    if (!pending) return null;
    const durationMs = Number(pending.duration_ms) || 30000;
    const remainingMs = Math.max(0, Number(pending.expires_at) - Date.now());
    if (remainingMs <= 0) return null;
    return {
      key: `${pending.section_key}:${pending.expires_at}`,
      remainingMs,
      startScale: Math.min(1, Math.max(0, remainingMs / durationMs)),
    };
  }, [pending?.section_key, pending?.expires_at, pending?.duration_ms]);

  if (!pending || !barTiming) return null;

  const undo = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/cms/section/restore", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          page_route: pending.page_route,
          section_key: pending.section_key,
        }),
      });
      const d = await res.json().catch(() => ({}));
      sessionStorage.removeItem("cpas.sectionUndo");
      setPending(null);
      if (!d.success) {
        alert(d.error || "Could not restore section");
        setBusy(false);
        return;
      }
      window.dispatchEvent(new CustomEvent("cpas:section-restored", {
        detail: { page_route: pending.page_route, section_key: pending.section_key },
      }));
    } catch (e) {
      alert(String(e?.message || e));
    }
    setBusy(false);
  };

  const label = pending.label || pending.section_key;

  return React.createElement("div", {
    role: "status",
    "aria-live": "polite",
    style: {
      position: "fixed",
      bottom: 24,
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 9999,
      width: "min(440px, calc(100vw - 24px))",
      background: "#f7f5f2",
      color: "#2a2430",
      borderRadius: 12,
      border: "1px solid #e4dfd8",
      boxShadow: "0 10px 32px rgba(26,20,32,.12)",
      fontFamily: "var(--font-ui)",
      fontSize: 13,
      overflow: "hidden",
    },
  },
    React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 12px 12px 16px",
      },
    },
      React.createElement("span", {
        style: { flex: 1, lineHeight: 1.4, color: "#3d3648", fontWeight: 500 },
      }, `Section removed — “${label}”`),
      React.createElement("button", {
        type: "button",
        disabled: busy,
        onClick: undo,
        style: {
          padding: "7px 14px",
          borderRadius: 8,
          border: 0,
          cursor: busy ? "wait" : "pointer",
          background: "#6f2270",
          color: "#fff",
          fontWeight: 700,
          fontSize: 12,
          letterSpacing: "0.01em",
          flexShrink: 0,
        },
      }, busy ? "Restoring…" : "Undo"),
      React.createElement("button", {
        type: "button",
        "aria-label": "Dismiss",
        onClick: () => {
          try { sessionStorage.removeItem("cpas.sectionUndo"); } catch (_) {}
          setPending(null);
        },
        style: {
          width: 28,
          height: 28,
          border: 0,
          borderRadius: 8,
          background: "transparent",
          color: "#8a8294",
          cursor: "pointer",
          fontSize: 18,
          lineHeight: 1,
          flexShrink: 0,
        },
      }, "×")
    ),
    React.createElement("div", {
      "aria-hidden": "true",
      style: {
        height: 3,
        background: "#e8e3dc",
        width: "100%",
      },
    },
      React.createElement("div", {
        key: barTiming.key,
        style: {
          height: "100%",
          width: "100%",
          background: "#6f2270",
          transformOrigin: "left center",
          transform: `scaleX(${barTiming.startScale})`,
          animation: `cpasUndoDrain ${barTiming.remainingMs}ms linear forwards`,
        },
      })
    )
  );
}

Object.assign(window, {
  CMSView: CmsWebsiteView,
  CmsWebsiteView, CmsPagesView, CmsPageEditorView,
  CmsImagesView, CmsBrandView, CmsSectionUndoToast,
});
