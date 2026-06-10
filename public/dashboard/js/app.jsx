// App Router — with live session + API data loading

const MOBILE_BREAKPOINT = 900;
const mobileQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

function App() {
  const [ready,        setReady]        = React.useState(false);
  const [liveUser,     setLiveUser]     = React.useState(null);
  const [isMobile,     setIsMobile]     = React.useState(() => mobileQuery.matches);
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  // Resize listener: update isMobile, close drawer when viewport expands past breakpoint
  React.useEffect(() => {
    const onResize = () => {
      const mobile = mobileQuery.matches;
      setIsMobile(mobile);
      if (!mobile) setMobileNavOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Body scroll lock while mobile drawer is open
  React.useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? "hidden" : "";
    if (mobileNavOpen) {
      document.body.classList.add("cpas-mobile-nav-open");
    } else {
      document.body.classList.remove("cpas-mobile-nav-open");
    }
    return () => {
      document.body.style.overflow = "";
      document.body.classList.remove("cpas-mobile-nav-open");
    };
  }, [mobileNavOpen]);

  // On mount: load session user + hydrate data from API
  React.useEffect(() => {
    async function init() {
      // 1. Fetch session user
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
              initials: (user.full_name || user.email).split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()
            };
          }
        } else if (res.status === 401) {
          window.location.href = "/admin/login";
          return;
        }
      } catch(e) {
        console.warn("[CPAS] Session check failed:", e.message);
      }

      // 2. Hydrate data from API
      if (window.__loadDashboardData) {
        await window.__loadDashboardData();
      }

      setReady(true);
    }
    init();
  }, []);

  const getViewFromURL = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get("view") || "overview";
  };
  const getParamsFromURL = () => {
    const params = new URLSearchParams(window.location.search);
    const result = {};
    params.forEach((v, k) => { if (k !== "view") result[k] = v; });
    return result;
  };

  const [view,   setView]   = React.useState(getViewFromURL);
  const [params, setParams] = React.useState(getParamsFromURL);

  const navigate = React.useCallback((newView, newParams = {}) => {
    const qs = new URLSearchParams({ view: newView, ...newParams }).toString();
    window.history.pushState({}, "", `?${qs}`);
    setView(newView);
    setParams(newParams);
    const main = document.getElementById("main-scroll");
    if (main) main.scrollTop = 0;
  }, []);

  React.useEffect(() => {
    const onPop = () => { setView(getViewFromURL()); setParams(getParamsFromURL()); };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Logout handler
  const handleLogout = React.useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch(e) {}
    window.location.href = "/admin/login";
  }, []);

  // Loading screen
  if (!ready) {
    return React.createElement("div", {
      style:{ height:"100vh", background:"#0b0b14", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16 }
    },
      React.createElement("div", { dangerouslySetInnerHTML:{ __html:`
        <svg width="48" height="48" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="36" height="36" rx="10" fill="#2d1b5e"/>
          <circle cx="14" cy="11" r="2.5" fill="#a78bfa"/>
          <circle cx="22" cy="11" r="2.5" fill="#a78bfa"/>
          <circle cx="10" cy="17" r="2" fill="#a78bfa"/>
          <circle cx="26" cy="17" r="2" fill="#a78bfa"/>
          <path d="M18 15c-4 0-8 3.2-8 8 0 2.4 1.6 4 3.2 4 1 0 2.4-.8 3.2-.8h3.2c.8 0 2.2.8 3.2.8 1.6 0 3.2-1.6 3.2-4 0-4.8-4-8-8-8z" fill="#7c3aed"/>
        </svg>` } }),
      React.createElement("div", { style:{ color:"#8888aa", fontSize:13 } }, "Loading dashboard…")
    );
  }

  const unreadCount = (window.CPAS.notifications || []).filter(n => !n.read).length;

  const renderView = () => {
    switch (view) {
      case "overview":           return React.createElement(OverviewView,         { onNavigate:navigate });
      case "animals":            return React.createElement(AnimalsView,           { onNavigate:navigate });
      case "animal-profile":     return React.createElement(AnimalProfileView,     { animalId:params.animalId, onNavigate:navigate });
      case "fosters":            return React.createElement(FostersView,           { onNavigate:navigate });
      case "adoptions":          return React.createElement(AdoptionsView,         { onNavigate:navigate });
      case "intakes":            return React.createElement(IntakesView,           { onNavigate:navigate });
      case "medical":            return React.createElement(MedicalView,           { onNavigate:navigate });
      case "daily-care":         return React.createElement(DailyCareView,         { onNavigate:navigate });
      case "volunteers":         return React.createElement(VolunteersView,        { onNavigate:navigate });
      case "applications":       return React.createElement(ApplicationsView,      { onNavigate:navigate });
      case "application-detail": return React.createElement(ApplicationDetailView, { appId:params.appId, onNavigate:navigate });
      case "donations":          return React.createElement(DonationsView,         { onNavigate:navigate });
      case "fundraising":        return React.createElement(FundraisingView,       { onNavigate:navigate });
      case "cms":
        return typeof CMSView === "function"
          ? React.createElement(CMSView, { onNavigate:navigate })
          : React.createElement("div", { style:{ padding:28, color:"#f0f0f5" } }, "CMS is loading...");
      case "reports":            return React.createElement(ReportsView,           { onNavigate:navigate });
      case "settings":           return React.createElement(SettingsView,          { onNavigate:navigate });
      case "notifications":      return React.createElement(NotificationsView,     { onNavigate:navigate });
      default:                   return React.createElement(OverviewView,          { onNavigate:navigate });
    }
  };

  // Desktop: flex row with sidebar + main column
  // Mobile: no sidebar, full-width main, mobile drawer overlay
  const shellStyle = isMobile
    ? {
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        background: C.bg,
        color: C.text,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        fontSize: 14,
        overflowX: "hidden",
      }
    : {
        display: "flex",
        height: "100vh",
        background: C.bg,
        color: C.text,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        fontSize: 14,
        overflow: "hidden",
      };

  const mainColStyle = isMobile
    ? {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        overflowX: "hidden",
      }
    : {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        overflow: "hidden",
      };

  const mainScrollStyle = isMobile
    ? {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        overflowX: "hidden",
      }
    : {
        flex: 1,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      };

  return React.createElement("div", {
    className: "cpas-dashboard-shell",
    style: shellStyle
  },
    // Desktop sidebar (hidden on mobile)
    !isMobile && React.createElement(Sidebar, {
      view,
      onNavigate: navigate,
      notifCount: unreadCount,
      onLogout: handleLogout
    }),

    // Main column: TopBar + scrollable content
    React.createElement("div", { className:"cpas-dashboard-main", style: mainColStyle },
      React.createElement(TopBar, {
        view,
        isMobile,
        mobileNavOpen,
        onOpenMobileNav: () => setMobileNavOpen(true),
        onNavigate: navigate,
        notifCount: unreadCount
      }),
      React.createElement("main", {
        id: "main-scroll",
        style: mainScrollStyle
      },
        renderView()
      )
    ),

    // Mobile nav drawer (only rendered on mobile)
    isMobile && React.createElement(MobileNavDrawer, {
      open: mobileNavOpen,
      view,
      onClose: () => setMobileNavOpen(false),
      onNavigate: (nextView, nextParams) => {
        navigate(nextView, nextParams || {});
        setMobileNavOpen(false);
      }
    }),

    React.createElement(AgentSamDrawer, null)
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(React.createElement(App));
