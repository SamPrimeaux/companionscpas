// Overview / Dashboard Home — quick-launch ops home (not vanity SaaS tiles)
const { useState: useState2, useEffect: useEffect2, useRef: useRef2 } = React;

function DonutChart({ labels, values, colors }) {
  const ref = useRef2(null);
  const chartRef = useRef2(null);
  const sig = JSON.stringify({ labels, values, colors });
  useEffect2(() => {
    if (!ref.current) return;
    if (chartRef.current) chartRef.current.destroy();
    chartRef.current = new Chart(ref.current, {
      type: "doughnut",
      data: { labels, datasets:[{ data:values, backgroundColor:colors, borderWidth:0, hoverOffset:4 }] },
      options: {
        responsive:true, maintainAspectRatio:false, cutout:"68%",
        plugins:{ legend:{ display:false } }
      }
    });
    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [sig]);
  return React.createElement("canvas", { ref, style:{ width:"100%", height:"100%" } });
}

/** Parse D1/SQLite times: "YYYY-MM-DD HH:MM:SS" is UTC (datetime('now')), not local. */
function parseActivityTime(raw) {
  if (!raw) return NaN;
  const s = String(raw).trim();
  if (!s) return NaN;
  // Already has timezone (Z or ±offset)
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(s)) return Date.parse(s);
  // ISO without zone → treat as UTC
  if (/T/.test(s)) return Date.parse(s.endsWith("Z") ? s : s + "Z");
  // "2026-07-20 17:27:01" — SQLite UTC without Z; browsers otherwise treat as local → "just now"
  return Date.parse(s.replace(" ", "T") + "Z");
}

function relativeTime(iso) {
  if (!iso) return "";
  const t = parseActivityTime(iso);
  if (!Number.isFinite(t)) return String(iso).slice(0, 10);
  const diff = Math.max(0, Date.now() - t);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 14) return `${days}d ago`;
  return new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function LaunchCard({ icon, title, description, countLabel, countValue, cta, onOpen }) {
  const [hov, setHov] = useState2(false);
  return React.createElement("div", {
    onMouseEnter: () => setHov(true),
    onMouseLeave: () => setHov(false),
    style: {
      background: C.surface,
      border: `1px solid ${hov ? C.purple + "55" : C.border}`,
      borderRadius: 14,
      padding: "20px 20px 18px",
      display: "flex",
      flexDirection: "column",
      gap: 12,
      minWidth: 0,
      boxShadow: hov ? "0 8px 24px rgba(26,22,34,0.08)" : "0 2px 10px rgba(26,22,34,0.05)",
      transition: "border-color .15s, box-shadow .15s",
    }
  },
    React.createElement("div", { style:{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 } },
      React.createElement("div", {
        style: {
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: C.purpleDim, color: C.purple,
          display: "grid", placeItems: "center",
        }
      }, React.createElement(Icon, { name: icon, size: 20 })),
      countLabel != null && React.createElement("div", { style:{ textAlign:"right" } },
        React.createElement("div", { style:{ fontSize:22, fontWeight:700, color:C.text, lineHeight:1 } }, countValue),
        React.createElement("div", { style:{ fontSize:11, color:C.textMut, marginTop:3, fontWeight:600 } }, countLabel)
      )
    ),
    React.createElement("div", null,
      React.createElement("div", { style:{ fontSize:15, fontWeight:700, color:C.text, marginBottom:4 } }, title),
      React.createElement("div", { style:{ fontSize:13, color:C.textSec, lineHeight:1.45 } }, description)
    ),
    React.createElement("button", {
      type: "button",
      className: "dash-link",
      onClick: onOpen,
      style: {
        marginTop: "auto",
        alignSelf: "flex-start",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 12px",
        borderRadius: 8,
        background: C.purple,
        color: "#fff",
        fontSize: 12,
        fontWeight: 700,
        textDecoration: "none",
        border: "none",
        cursor: "pointer",
      }
    }, cta, React.createElement(Icon, { name: "arrowR", size: 14, style:{ color:"#fff" } }))
  );
}

function OverviewView({ onNavigate }) {
  const seed = window.CPAS || {};
  const [stats, setStats] = React.useState(() => seed.stats || {});
  const [animals, setAnimals] = React.useState(() => seed.animals || []);
  const [recentActivity, setRecentActivity] = React.useState(() => seed.recentActivity || []);
  const [chartData, setChartData] = React.useState(() => seed.chartData || {});

  const isMobile  = typeof useIsMobile  === "function" ? useIsMobile(900)  : false;
  const isNarrow  = typeof useIsNarrow  === "function" ? useIsNarrow(520)  : false;

  const recentAnimals = (animals || []).slice(0, 5);
  const activity = (recentActivity || []).slice(0, 8);

  const launchGrid = isNarrow ? "1fr" : isMobile ? "repeat(2, minmax(0, 1fr))" : "repeat(auto-fit, minmax(220px, 1fr))";
  const recentGrid = isNarrow ? "1fr" : isMobile ? "repeat(2, minmax(0, 1fr))" : "repeat(auto-fit, minmax(160px, 1fr))";
  const bottomGrid = isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))";
  const userName = (window.CPAS?.user?.name || window.CPAS_USER?.full_name || "Team").split(" ")[0];

  const emptyAppStatus = { pending:0, approved:0, underReview:0, denied:0 };
  const [appStatus, setAppStatus] = React.useState(
    () => chartData?.applicationStatus || emptyAppStatus
  );

  function syncFromCpas() {
    const c = window.CPAS || {};
    setStats({ ...(c.stats || {}) });
    setAnimals([...(c.animals || [])]);
    setRecentActivity([...(c.recentActivity || [])]);
    setChartData({ ...(c.chartData || {}) });
    if (c.chartData?.applicationStatus) {
      setAppStatus({ ...c.chartData.applicationStatus });
    }
  }

  React.useEffect(() => {
    let cancelled = false;
    async function refreshOverview() {
      try {
        if (window.__loadDashboardData) await window.__loadDashboardData();
        if (!cancelled) syncFromCpas();
      } catch (_) {
        /* keep last good snapshot */
      }
    }

    refreshOverview();
    const interval = setInterval(refreshOverview, 45000);
    function onVis() {
      if (document.visibilityState === "visible") refreshOverview();
    }
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    function bucket(reviewStatus) {
      const s = String(reviewStatus || "new").toLowerCase();
      if (s === "approved") return "approved";
      if (s === "denied" || s === "rejected") return "denied";
      if (s === "under_review" || s === "in_review" || s === "review" || s === "home_visit") return "underReview";
      return "pending";
    }
    fetch("/api/dashboard/applications?limit=200", { credentials: "include", headers: { Accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const rows = data.applications || data.results || [];
        const next = { pending: 0, approved: 0, underReview: 0, denied: 0 };
        for (const row of rows) {
          next[bucket(row.review_status || row.status)] += 1;
        }
        setAppStatus(next);
        if (window.CPAS?.chartData) {
          window.CPAS.chartData = { ...window.CPAS.chartData, applicationStatus: next };
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const appTotal = (appStatus.pending || 0) + (appStatus.approved || 0) + (appStatus.underReview || 0) + (appStatus.denied || 0);
  const financial = chartData?.financialBreakdown || { labels:[], values:[], colors:[] };

  const activityIcon = (type) => {
    if (type === "donation") return "dollar";
    if (type === "application") return "docs";
    if (type === "animal") return "paw";
    if (type === "volunteer") return "people";
    return "sparkles";
  };

  return React.createElement("div", { style:{ display:"flex", gap:0, minHeight:0, flex:1, width:"100%" } },
    React.createElement("div", { className: "dash-page" },

      React.createElement(PageHeader, {
        title: `Welcome back, ${userName}`,
        subtitle: "Jump into the work that matters — website, animals, media, and fundraising.",
        meta: !isMobile && React.createElement("span", { className: "dash-page-meta" },
          new Date().toLocaleDateString(undefined, { month:"long", day:"numeric", year:"numeric" })
        )
      }),

      // Quick-launch cards
      React.createElement("div", { style:{ display:"grid", gridTemplateColumns:launchGrid, gap:14, marginBottom:24 } },
        React.createElement(LaunchCard, {
          icon: "globe",
          title: "Manage Website",
          description: "Edit pages, publish changes",
          countLabel: "pages",
          countValue: stats.pagesCount ?? 0,
          cta: "Open website",
          onOpen: () => onNavigate("cms-website"),
        }),
        React.createElement(LaunchCard, {
          icon: "image",
          title: "Image Library",
          description: "Upload photos, manage media",
          countLabel: "assets",
          countValue: stats.mediaCount ?? 0,
          cta: "Open library",
          onOpen: () => onNavigate("cms-images"),
        }),
        React.createElement(LaunchCard, {
          icon: "paw",
          title: "Animals",
          description: "Add, update, and track your dogs",
          countLabel: "animals",
          countValue: stats.totalAnimals ?? 0,
          cta: "Open animals",
          onOpen: () => onNavigate("animals"),
        }),
        React.createElement(LaunchCard, {
          icon: "trending",
          title: "Fundraising",
          description: "Campaigns, donations, and goals",
          countLabel: "MTD",
          countValue: `$${(stats.donationsMTD || 0).toLocaleString()}`,
          cta: "Open fundraising",
          onOpen: () => onNavigate("fundraising"),
        })
      ),

      // Financial / Applications / Volunteer — above Recent Activity
      React.createElement("div", { style:{ display:"grid", gridTemplateColumns:bottomGrid, gap:16, marginBottom:24 } },
        React.createElement(Card, { style:{ padding:20, minWidth:0 } },
          React.createElement("div", { style:{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 } },
            React.createElement("h3", { className:"dash-section-title", style:{ margin:0 } }, "Financial Overview (MTD)"),
            React.createElement("button", { type:"button", className:"dash-link", onClick:()=>onNavigate("reports") }, "View all →")
          ),
          React.createElement("div", { style:{ display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" } },
            React.createElement("div", { style:{ width:90, height:90, flexShrink:0 } },
              React.createElement(DonutChart, { labels:financial.labels, values:financial.values, colors:financial.colors })
            ),
            React.createElement("div", { style:{ display:"flex", flexDirection:"column", gap:6, minWidth:0 } },
              (financial.labels || []).map((l,i) =>
                React.createElement("div", { key:l, style:{ display:"flex", alignItems:"center", gap:6, fontSize:11 } },
                  React.createElement("span", { style:{ width:8, height:8, borderRadius:2, background:financial.colors[i], flexShrink:0 } }),
                  React.createElement("span", { style:{ color:C.textSec } }, l),
                  React.createElement("span", { style:{ marginLeft:"auto", color:C.text, fontWeight:600 } }, `$${(financial.values[i] || 0).toLocaleString()}`)
                )
              )
            )
          )
        ),
        React.createElement(Card, { style:{ padding:20, minWidth:0 } },
          React.createElement("div", { style:{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 } },
            React.createElement("h3", { className:"dash-section-title", style:{ margin:0 } }, "Application Status"),
            React.createElement("button", { type:"button", className:"dash-link", onClick:()=>onNavigate("applications") }, "View all →")
          ),
          React.createElement("div", { style:{ display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" } },
            React.createElement("div", { style:{ position:"relative", width:90, height:90, flexShrink:0 } },
              React.createElement(DonutChart, {
                labels:["Pending","Approved","Under Review","Denied"],
                values:[appStatus.pending, appStatus.approved, appStatus.underReview, appStatus.denied],
                colors:["#f59e0b","#10b981","#60a5fa","#ef4444"]
              }),
              React.createElement("div", { style:{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column" } },
                React.createElement("span", { style:{ fontSize:20, fontWeight:700, color:C.text } }, appTotal || "0"),
                React.createElement("span", { style:{ fontSize:9, color:C.textSec } }, "Total")
              )
            ),
            React.createElement("div", { style:{ display:"flex", flexDirection:"column", gap:5, minWidth:0 } },
              [["Pending", appStatus.pending, "#fbbf24"],["Approved", appStatus.approved, "#34d399"],["Under Review", appStatus.underReview, "#60a5fa"],["Denied", appStatus.denied, "#f87171"]].map(([l,v,co])=>
                React.createElement("div", { key:l, style:{ display:"flex", alignItems:"center", gap:6, fontSize:11 } },
                  React.createElement("span", { style:{ width:8, height:8, borderRadius:2, background:co, flexShrink:0 } }),
                  React.createElement("span", { style:{ color:C.textSec } }, l),
                  React.createElement("span", { style:{ marginLeft:"auto", color:C.text, fontWeight:600 } }, v || 0)
                )
              )
            )
          )
        ),
        React.createElement(Card, { style:{ padding:20, minWidth:0 } },
          React.createElement("div", { style:{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 } },
            React.createElement("h3", { className:"dash-section-title", style:{ margin:0 } }, "Inbox"),
            React.createElement("button", { type:"button", className:"dash-link", onClick:()=>onNavigate("email") }, "Open inbox →")
          ),
          React.createElement("div", { style:{ display:"flex", alignItems:"flex-end", gap:16, flexWrap:"wrap" } },
            React.createElement("div", { style:{ minWidth:0 } },
              React.createElement("div", { style:{ fontSize:36, fontWeight:700, color:C.text, lineHeight:1 } }, stats.inboxUnread ?? 0),
              React.createElement("div", { style:{ fontSize:12, color:C.textSec, marginTop:6 } },
                (stats.inboxUnread ?? 0) === 1 ? "1 unread message" : `${stats.inboxUnread ?? 0} unread messages`
              ),
              React.createElement("div", { style:{ fontSize:11, color:C.textMut, marginTop:4 } },
                `${stats.inboxTotal ?? 0} in inbox`
              )
            ),
            React.createElement("div", {
              style: {
                marginLeft: "auto",
                width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                background: (stats.inboxUnread ?? 0) > 0 ? C.purpleDim : C.bg2,
                color: C.purple,
                display: "grid", placeItems: "center",
              }
            }, React.createElement(Icon, { name: "mail", size: 22 }))
          )
        )
      ),

      // Recent animals
      React.createElement(Card, { style:{ padding:20, marginBottom:8 } },
        React.createElement("div", { style:{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 } },
          React.createElement("h3", { className:"dash-section-title", style:{ margin:0 } }, "Recent Animals"),
          React.createElement("button", { type:"button", className:"dash-link", onClick:()=>onNavigate("animals") }, "View all")
        ),
        React.createElement("div", { style:{ display:"grid", gridTemplateColumns:recentGrid, gap:12 } },
          recentAnimals.map(a =>
            React.createElement("div", {
              key: a.id,
              onClick: ()=>onNavigate("animal-profile", { animalId: a.id }),
              style:{ cursor:"pointer", borderRadius:10, overflow:"hidden", border:`1px solid ${C.border}`, transition:"border-color .15s", minWidth:0 },
              onMouseEnter: e=>e.currentTarget.style.borderColor=C.purple,
              onMouseLeave: e=>e.currentTarget.style.borderColor=C.border
            },
              React.createElement("div", { style:{ height:isMobile ? 90 : 110, overflow:"hidden", background:C.raised } },
                React.createElement("img", { src:a.photo, alt:a.name, style:{ width:"100%", height:"100%", objectFit:"contain" }, onError:e=>{ e.target.style.display="none"; } })
              ),
              React.createElement("div", { style:{ padding:"10px 10px 12px" } },
                React.createElement("div", { style:{ fontSize:13, fontWeight:600, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" } }, a.name),
                React.createElement("div", { style:{ fontSize:10, color:C.textSec, margin:"2px 0 6px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" } }, `${a.breed}`),
                React.createElement(Badge, { label:a.status, dot:true })
              )
            )
          )
        )
      ),

      // Recent activity (live D1-backed feed)
      React.createElement(Card, { style:{ padding:20, minWidth:0, marginBottom:24 } },
        React.createElement("div", { style:{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 } },
          React.createElement("h3", { className: "dash-section-title", style:{ margin:0 } }, "Recent Activity")
        ),
        activity.length
          ? React.createElement("div", { style:{ display:"flex", flexDirection:"column", gap:0 } },
              activity.map((ev) =>
                React.createElement("button", {
                  key: ev.id,
                  type: "button",
                  onClick: () => ev.link && onNavigate(ev.link),
                  style: {
                    display: "flex", alignItems: "flex-start", gap: 12,
                    padding: "12px 0",
                    border: "none", borderBottom: `1px solid ${C.border}`,
                    background: "transparent", cursor: ev.link ? "pointer" : "default",
                    textAlign: "left", width: "100%", fontFamily: "inherit",
                  }
                },
                  React.createElement("div", {
                    style: {
                      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                      background: C.bg2, color: C.purple,
                      display: "grid", placeItems: "center",
                    }
                  }, React.createElement(Icon, { name: activityIcon(ev.type), size: 15 })),
                  React.createElement("div", { style:{ minWidth:0, flex:1 } },
                    React.createElement("div", { style:{ fontSize:13, fontWeight:600, color:C.text, lineHeight:1.4 } }, ev.text),
                    React.createElement("div", { style:{ fontSize:11, color:C.textMut, marginTop:3 } },
                      ev.time || relativeTime(ev.at)
                    )
                  )
                )
              )
            )
          : React.createElement("div", { style:{ fontSize:13, color:C.textSec, padding:"8px 0" } },
              "No recent changes yet. Updates to animals, applications, and donations will show up here."
            )
      ),


    )
  );
}

Object.assign(window, { OverviewView });
