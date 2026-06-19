// ─── App Router — clean path-based routing, legacy ?view= compat ─────────────
// placeholder
const MOBILE_BP = 900;
const mobileQ   = window.matchMedia(`(max-width: ${MOBILE_BP - 1}px)`);

const ROUTE_REGISTRY = [
  { path: "/dashboard/overview",         view: "overview" },
  { path: "/dashboard/animals/",         view: "animal-profile",     paramKey: "animalId" },
  { path: "/dashboard/animals",          view: "animals" },
  { path: "/dashboard/fosters",          view: "fosters" },
  { path: "/dashboard/adoptions",        view: "adoptions" },
  { path: "/dashboard/intakes",          view: "intakes" },
  { path: "/dashboard/medical",          view: "medical" },
  { path: "/dashboard/daily-care",       view: "daily-care" },
  { path: "/dashboard/volunteers",       view: "volunteers" },
  { path: "/dashboard/applications/",    view: "application-detail", paramKey: "appId" },
  { path: "/dashboard/applications",     view: "applications" },
  { path: "/dashboard/donations",        view: "donations" },
  { path: "/dashboard/fundraising",      view: "fundraising" },
  { path: "/dashboard/cms/website",      view: "cms-website" },
  { path: "/dashboard/cms/pages/",       view: "cms-page-editor",    paramKey: "pageId" },
  { path: "/dashboard/cms/pages",        view: "cms-pages" },
  { path: "/dashboard/cms/images",       view: "cms-images" },
  { path: "/dashboard/cms/brand",        view: "cms-brand" },
  { path: "/dashboard/cms/templates",    view: "cms-templates" },
  { path: "/dashboard/cms",              view: "cms-website" },
  { path: "/dashboard/email",            view: "email" },
  { path: "/dashboard/reports",          view: "reports" },
  { path: "/dashboard/settings",         view: "settings" },
  { path: "/dashboard/notifications",    view: "notifications" },
  { path: "/dashboard",                  view: "overview" },
];

const LEGACY_MAP = {
  "overview":           "/dashboard/overview",
  "animals":            "/dashboard/animals",
  "fosters":            "/dashboard/fosters",
  "adoptions":          "/dashboard/adoptions",
  "intakes":            "/dashboard/intakes",
  "medical":            "/dashboard/medical",
  "daily-care":         "/dashboard/daily-care",
  "volunteers":         "/dashboard/volunteers",
  "applications":       "/dashboard/applications",
  "donations":          "/dashboard/fundraising",
  "fundraising":        "/dashboard/fundraising",
  "cms":                "/dashboard/cms/website",
  "reports":            "/dashboard/reports",
  "settings":           "/dashboard/settings",
  "notifications":      "/dashboard/notifications",
  "animal-profile":     null,
  "application-detail": null,
};

function resolveRoute(pathname, searchParams) {
  const legacyView = searchParams.get("view");
  if (legacyView) {
    const legacyAnimalId = searchParams.get("animalId");
    const legacyAppId    = searchParams.get("appId");
    if (legacyView === "animal-profile" && legacyAnimalId) {
      const p = `/dashboard/animals/${legacyAnimalId}`;
      window.history.replaceState({}, "", p);
      return { view: "animal-profile", params: { animalId: legacyAnimalId } };
    }
    if (legacyView === "application-detail" && legacyAppId) {
      const p = `/dashboard/applications/${legacyAppId}`;
      window.history.replaceState({}, "", p);
      return { view: "application-detail", params: { appId: legacyAppId } };
    }
    const canonical = LEGACY_MAP[legacyView];
    if (canonical) {
      window.history.replaceState({}, "", canonical);
      return resolveRoute(canonical, new URLSearchParams());
    }
  }
  const norm = pathname.replace(/\/$/, "") || "/dashboard";
  if (norm === "/dashboard/donations") {
    window.history.replaceState({}, "", "/dashboard/fundraising");
    return { view: "fundraising", params: { financeTab: "donations" } };
  }
  for (const route of ROUTE_REGISTRY) {
    if (route.paramKey) {
      if (pathname.startsWith(route.path)) {
        const paramVal = pathname.slice(route.path.length).replace(/\/$/, "");
        if (paramVal) return { view: route.view, params: { [route.paramKey]: paramVal } };
      }
    } else {
      const norm = pathname.replace(/\/$/, "") || "/dashboard";
      if (norm === route.path || norm + "/" === route.path) {
        return { view: route.view, params: {} };
      }
    }
  }
  return { view: "overview", params: {} };
}

function buildPath(view, params = {}) {
  const route = ROUTE_REGISTRY.find(r => r.view === view);
  if (!route) return "/dashboard/overview";
  if (route.paramKey && params[route.paramKey]) return `${route.path}${params[route.paramKey]}`;
  return route.path;
}

function App() {
  const [ready,    setReady]    = React.useState(false);
  const [liveUser, setLiveUser] = React.useState(null);
  const [isMobile, setIsMobile] = React.useState(() => mobileQ.matches);
  const [navOpen,  setNavOpen]  = React.useState(false);

  const initRoute = () => resolveRoute(window.location.pathname, new URLSearchParams(window.location.search));
  const [view,   setView]   = React.useState(() => initRoute().view);
  const [params, setParams] = React.useState(() => initRoute().params);

  React.useEffect(() => {
    const onResize = () => { const m = mobileQ.matches; setIsMobile(m); if (!m) setNavOpen(false); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  React.useEffect(() => {
    if (navOpen) document.body.classList.add("cpas-nav-open");
    else document.body.classList.remove("cpas-nav-open");
    return () => document.body.classList.remove("cpas-nav-open");
  }, [navOpen]);

  React.useEffect(() => {
    async function init() {
      if (window.loadDashboardConfig) await window.loadDashboardConfig();
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (res.ok) {
          const { user } = await res.json();
          setLiveUser(user);
          if (user) {
            window.CPAS_USER = user;
            window.CPAS.user = {
              name:     user.full_name || user.email,
              role:     user.role ? (user.role.charAt(0).toUpperCase() + user.role.slice(1)) : "Staff",
              initials: (user.full_name || user.email).split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
            };
          }
        } else if (res.status === 401) {
          window.location.href = "/admin/login"; return;
        }
      } catch(e) { console.warn("[CPAS] Session check failed:", e.message); }
      if (window.__loadDashboardData) await window.__loadDashboardData();
      setReady(true);
    }
    init();
  }, []);

  React.useEffect(() => {
    const onPop = () => {
      const { view: v, params: p } = resolveRoute(window.location.pathname, new URLSearchParams(window.location.search));
      setView(v); setParams(p);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = React.useCallback((newView, newParams = {}) => {
    const path = buildPath(newView, newParams);
    window.history.pushState({}, "", path);
    setView(newView); setParams(newParams); setNavOpen(false);
    const el = document.getElementById("main-scroll");
    if (el) el.scrollTop = 0;
  }, []);

  React.useEffect(() => { window.__navigate = navigate; }, [navigate]);

  const handleLogout = React.useCallback(async () => {
    try { await fetch("/api/auth/logout", { method: "POST", credentials: "include" }); } catch {}
    window.location.href = "/admin/login";
  }, []);

  if (!ready) {
    return React.createElement("div", { className: "cpas-loading" },
      React.createElement("div", { dangerouslySetInnerHTML: { __html: `
        <svg width="44" height="44" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="36" height="36" rx="10" fill="#1a0f2e"/>
          <circle cx="14" cy="11" r="2.5" fill="#8664B7"/>
          <circle cx="22" cy="11" r="2.5" fill="#8664B7"/>
          <circle cx="10" cy="17" r="2" fill="#8664B7"/>
          <circle cx="26" cy="17" r="2" fill="#8664B7"/>
          <path d="M18 15c-4 0-8 3.2-8 8 0 2.4 1.6 4 3.2 4 1 0 2.4-.8 3.2-.8h3.2c.8 0 2.2.8 3.2.8 1.6 0 3.2-1.6 3.2-4 0-4.8-4-8-8-8z" fill="#6a30b0"/>
        </svg>` } }),
      React.createElement("div", { className: "cpas-loading-text" }, "Loading dashboard…")
    );
  }

  const unreadCount = (window.CPAS.notifications || []).filter(n => !n.read).length;

  // ── CMS sub-views are full-screen (no scroll padding) ─────────────────────
  const isCmsEditor = view === "cms-page-editor";
  const isEmailWorkspace = view === "email";

  const renderView = () => {
    switch (view) {
      case "overview":            return React.createElement(OverviewView,          { onNavigate: navigate });
      case "animals":             return React.createElement(AnimalsView,            { onNavigate: navigate });
      case "animal-profile":      return React.createElement(AnimalProfileView,      { animalId: params.animalId, onNavigate: navigate });
      case "fosters":             return React.createElement(FostersView,            { onNavigate: navigate });
      case "adoptions":           return React.createElement(AdoptionsView,          { onNavigate: navigate });
      case "intakes":             return React.createElement(IntakesView,            { onNavigate: navigate });
      case "medical":             return React.createElement(MedicalView,            { onNavigate: navigate });
      case "daily-care":          return React.createElement(DailyCareView,          { onNavigate: navigate });
      case "volunteers":          return React.createElement(VolunteersView,         { onNavigate: navigate });
      case "applications":        return React.createElement(ApplicationsView,       { onNavigate: navigate });
      case "application-detail":  return React.createElement(ApplicationDetailView,  { appId: params.appId, onNavigate: navigate });
      case "donations":           return React.createElement(DonationsView,          { onNavigate: navigate });
      case "fundraising":         return React.createElement(FundraisingView,        { onNavigate: navigate, initialTab: params.financeTab });

      // CMS sub-views
      case "cms-website":
        return typeof CmsWebsiteView === "function"
          ? React.createElement(CmsWebsiteView,   { onNavigate: navigate })
          : React.createElement(CMSView,          { onNavigate: navigate });
      case "cms-pages":
        return typeof CmsPagesView === "function"
          ? React.createElement(CmsPagesView,     { onNavigate: navigate })
          : cmsShell("Pages", "Loading…");
      case "cms-page-editor":
        return typeof CmsPageEditorView === "function"
          ? React.createElement(CmsPageEditorView, { pageId: params.pageId, onNavigate: navigate })
          : cmsShell("Page Editor", "Loading…");
      case "cms-images":
        return typeof CmsImagesView === "function"
          ? React.createElement(CmsImagesView,    { onNavigate: navigate })
          : cmsShell("Images", "Loading…");
      case "cms-brand":
        return typeof CmsBrandView === "function"
          ? React.createElement(CmsBrandView,     { onNavigate: navigate })
          : cmsShell("Brand & Settings", "Loading…");
      case "cms-templates":
        return typeof CmsTemplatesView === "function"
          ? React.createElement(CmsTemplatesView, { onNavigate: navigate })
          : cmsShell("Templates", "Loading…");

      // Email inbox
      case "email":
        return typeof EmailView === "function"
          ? React.createElement(EmailView)
          : cmsShell("Email", "Loading…");

      case "reports":             return React.createElement(ReportsView,            { onNavigate: navigate });
      case "settings":            return React.createElement(SettingsView,           { onNavigate: navigate });
      case "notifications":       return React.createElement(NotificationsView,      { onNavigate: navigate });
      default:                    return React.createElement(OverviewView,           { onNavigate: navigate });
    }
  };

  // CMS page editor gets full height with no scroll padding
  const mainScrollStyle = (isCmsEditor || isEmailWorkspace)
    ? { flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }
    : { flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", minHeight: 0 };

  return React.createElement("div", { className: "cpas-shell" },
    React.createElement("div", { className: "cpas-desktop-only" },
      React.createElement(Sidebar, { view, navigate, notifCount: unreadCount, onLogout: handleLogout })
    ),
    React.createElement("div", { className: "cpas-main-col" },
      React.createElement(TopBar, { view, isMobile, navOpen, onOpenNav: () => setNavOpen(true), navigate, notifCount: unreadCount }),
      React.createElement("main", { id: "main-scroll", className: "cpas-dash-content", style: mainScrollStyle }, renderView())
    ),
    isMobile && React.createElement("div", {
      className: `cpas-drawer-backdrop ${navOpen ? "open" : ""}`,
      onClick: () => setNavOpen(false),
      "aria-hidden": "true"
    }),
    isMobile && React.createElement(MobileDrawer, {
      open: navOpen, view, navigate,
      onClose: () => setNavOpen(false),
      onLogout: handleLogout
    }),
    React.createElement(AgentSamDrawer, null)
  );
}

function cmsShell(title, desc) {
  return React.createElement("div", { style: { padding: "40px 32px", flex: 1 } },
    React.createElement("div", { style: { maxWidth: 520, background: "var(--dash-surface)", border: "1px solid var(--dash-border)", borderRadius: 14, padding: "32px 28px" } },
      React.createElement("div", { style: { fontSize: 22, fontWeight: 700, marginBottom: 8, color: "var(--dash-text)" } }, title),
      React.createElement("div", { style: { fontSize: 14, color: "var(--dash-text-sec)", lineHeight: 1.6 } }, desc)
    )
  );
}

const _root = ReactDOM.createRoot(document.getElementById("root"));
_root.render(React.createElement(App));
