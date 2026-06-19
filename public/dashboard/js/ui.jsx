// ─── Shared UI Shell — Sidebar, TopBar, MobileDrawer, components ─────────────
const { useState, useEffect, useRef, useCallback } = React;

const C = window.__C_OBJ__ = {
  bg:        "var(--dash-bg)",
  bg2:       "var(--dash-bg2)",
  surface:   "var(--dash-surface)",
  surfaceMut:"var(--dash-surface-muted)",
  raised:    "var(--dash-surface-muted)",
  border:    "var(--dash-border)",
  borderStr: "var(--dash-border-strong)",
  text:      "var(--dash-text)",
  textSec:   "var(--dash-text-sec)",
  textMut:   "var(--dash-text-muted)",
  purple:    "var(--brand-primary)",
  purpleHov: "var(--brand-secondary)",
  purpleL:   "var(--brand-primary-l)",
  purpleDim: "var(--brand-primary-dim)",
  pink:      "var(--brand-accent)",
  green:     "#059669", greenDim:  "#d1fae5",
  red:       "#dc2626", redDim:    "#fee2e2",
  yellow:    "#d97706", yellowDim: "#fef3c7",
  teal:      "#0891b2", tealDim:   "#cffafe",
  navBg:     "var(--nav-bg)",
  navText:   "var(--nav-text)",
  navTextSec:"var(--nav-text-sec)",
  navBorder: "var(--nav-border)",
};

const LOGO_LIGHT = "https://imagedelivery.net/g7wf09fCONpnidkRnR_5vw/b82e15b1-05e1-454c-85ca-a92f8eee2100/avatar";
const LOGO_DARK  = "/static/global/companionsofcpa-newlogo.webp";

// ── CMS sub-nav — swapped navigation/publish for templates ───────────────────
const NAV_STRUCTURE = [
  { group: "Core", items: [
    { key: "overview",  label: "Overview",   icon: "dashboard", path: "/dashboard/overview" }
  ]},
  { group: "Animal Care", items: [
    { key: "animals",    label: "Animals",    icon: "paw",       path: "/dashboard/animals" },
    { key: "intakes",    label: "Intakes",    icon: "intake",    path: "/dashboard/intakes" },
    { key: "medical",    label: "Medical",    icon: "medical",   path: "/dashboard/medical" },
    // daily-care hidden from nav — route /dashboard/daily-care still works if re-enabled
  ]},
  { group: "Placement", items: [
    { key: "fosters",      label: "Fosters",      icon: "heart", path: "/dashboard/fosters" },
    { key: "adoptions",    label: "Adoptions",    icon: "check", path: "/dashboard/adoptions" },
    { key: "applications", label: "Applications", icon: "docs",  path: "/dashboard/applications" },
  ]},
  { group: "Community", items: [
    { key: "volunteers", label: "Volunteers", icon: "people", path: "/dashboard/volunteers" }
  ]},
  { group: "Giving", items: [
    { key: "fundraising", label: "Fundraising", icon: "trending", path: "/dashboard/fundraising" },
  ]},
  { group: "Website", items: [
    { key: "cms-website", label: "CMS Website", icon: "edit", path: "/dashboard/cms/website",
      children: [
        { key: "cms-website",   label: "Website Overview", path: "/dashboard/cms/website" },
        { key: "cms-pages",     label: "Pages",            path: "/dashboard/cms/pages" },
        { key: "cms-images",    label: "Images",           path: "/dashboard/cms/images" },
        { key: "cms-brand",     label: "Brand & Settings", path: "/dashboard/cms/brand" },
        { key: "cms-templates", label: "Templates",        path: "/dashboard/cms/templates" },
      ]
    }
  ]},
  { group: "Admin", items: [
    { key: "email", label: "Email", icon: "mail", path: "/dashboard/email" },
    { key: "reports",  label: "Reports",  icon: "chart", path: "/dashboard/reports" },
    { key: "settings", label: "Settings", icon: "gear",  path: "/dashboard/settings" },
  ]},
];

const NAV_ITEMS = NAV_STRUCTURE.flatMap(g => g.items.flatMap(item => [item, ...(item.children || [])]));

function isActiveCMS(view) { return view.startsWith("cms-"); }

const ICONS = {
  dashboard:`<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="7" height="7" rx="1.5"/><rect x="11" y="2" width="7" height="7" rx="1.5"/><rect x="2" y="11" width="7" height="7" rx="1.5"/><rect x="11" y="11" width="7" height="7" rx="1.5"/></svg>`,
  paw:      `<svg viewBox="0 0 20 20" fill="currentColor"><circle cx="7" cy="4" r="1.5"/><circle cx="13" cy="4" r="1.5"/><circle cx="4" cy="8" r="1.5"/><circle cx="16" cy="8" r="1.5"/><path d="M10 8c-2.5 0-5 2-5 5 0 1.5 1 2.5 2 2.5.6 0 1.5-.5 2-.5h2c.5 0 1.4.5 2 .5 1 0 2-1 2-2.5 0-3-2.5-5-5-5z"/></svg>`,
  heart:    `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 16s-7-4.5-7-9a4 4 0 0 1 7-2.65A4 4 0 0 1 17 7c0 4.5-7 9-7 9z"/></svg>`,
  check:    `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="8"/><path d="M6.5 10l2.5 2.5 4.5-4.5"/></svg>`,
  intake:   `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3v10m0 0l-3-3m3 3l3-3"/><path d="M4 15h12"/></svg>`,
  medical:  `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 4v12M4 10h12"/></svg>`,
  clipboard:`<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="12" height="14" rx="2"/><path d="M8 4V3a2 2 0 0 1 4 0v1"/><path d="M7 9h6M7 12h4"/></svg>`,
  people:   `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="6" r="3"/><path d="M2 18c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="15" cy="6" r="2.5"/><path d="M18 18c0-2.5-1.5-4.5-3.5-5.2"/></svg>`,
  docs:     `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="12" height="16" rx="2"/><path d="M7 7h6M7 10h6M7 13h4"/></svg>`,
  dollar:   `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3v14M7 6h4.5a2.5 2.5 0 0 1 0 5H7m0 0h5a2.5 2.5 0 0 1 0 5H7"/></svg>`,
  trending: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 14l4-4 3 3 5-6"/><path d="M14 7h3v3"/></svg>`,
  edit:     `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M13 3l4 4-9 9H4v-4l9-9z"/></svg>`,
  chart:    `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 16V9m4 7V4m4 12V8m4 8V6"/></svg>`,
  gear:     `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="2.5"/><path d="M10 2.5v1.9m0 11.2v1.9m5.3-3.8-1.3-1.3M5.9 5.9 4.6 4.6m7.6 0-1.3 1.3M5.9 14 4.6 15.4M2.5 10h1.9m11.2 0h1.9"/></svg>`,
  bell:     `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2a6 6 0 0 1 6 6v3l2 3H2l2-3V8a6 6 0 0 1 6-6z"/><path d="M8 17a2 2 0 0 0 4 0"/></svg>`,
  search:   `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="8.5" cy="8.5" r="5.5"/><path d="M17 17l-4-4"/></svg>`,
  plus:     `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 4v12M4 10h12"/></svg>`,
  chevR:    `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 5l6 5-6 5"/></svg>`,
  chevD:    `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 7l5 6 5-6"/></svg>`,
  chevL:    `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13 5l-6 5 6 5"/></svg>`,
  close:    `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 5l10 10M15 5l-10 10"/></svg>`,
  eye:      `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z"/><circle cx="10" cy="10" r="2"/></svg>`,
  eyeOff:   `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l14 14"/><path d="M8.5 8.7A2.5 2.5 0 0 0 10 13a2.5 2.5 0 0 0 2.1-1.1"/><path d="M6.7 6.8C4.6 8 3 10 3 10s3 6 8 6c1.2 0 2.3-.4 3.2-.9"/><path d="M12.4 6.5C11.6 6.2 10.8 6 10 6 7 6 4.5 8.5 4.5 8.5"/></svg>`,
  trash:    `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h12M8 6V4h4v2m-5 3v6m4-6v6M5 6l1 11h8l1-11"/></svg>`,
  mail:     `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="16" height="13" rx="2"/><path d="M2 7l8 5 8-5"/></svg>`,
  phone:    `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 3h4l2 4-2.5 1.5a10 10 0 0 0 4 4L13 10l4 2v4a2 2 0 0 1-2 2A16 16 0 0 1 2 5a2 2 0 0 1 2-2z"/></svg>`,
  home:     `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l7-6 7 6v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M8 18V12h4v6"/></svg>`,
  download: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3v9m0 0l-3-3m3 3l3-3M4 15h12"/></svg>`,
  filter:   `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h14M6 10h8M9 15h2"/></svg>`,
  arrowR:   `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10h12M10 4l6 6-6 6"/></svg>`,
  check2:   `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10l4 4 8-8"/></svg>`,
  warning:  `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3L2 17h16L10 3z"/><path d="M10 8v4M10 14v.5"/></svg>`,
  bot:      `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="6" width="12" height="10" rx="3"/><path d="M10 3v3"/><circle cx="8" cy="11" r="1"/><circle cx="12" cy="11" r="1"/><path d="M7.5 14h5"/></svg>`,
  sparkles: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2l1.6 4.4L16 8l-4.4 1.6L10 14l-1.6-4.4L4 8l4.4-1.6L10 2z"/><path d="M16 12l.8 2.2L19 15l-2.2.8L16 18l-.8-2.2L13 15l2.2-.8L16 12z"/></svg>`,
  arrowUp:  `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 16V4"/><path d="M5 9l5-5 5 5"/></svg>`,
  stop:     `<svg viewBox="0 0 20 20" fill="currentColor"><rect x="6" y="6" width="8" height="8" rx="1.5"/></svg>`,
  paperclip:`<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M16 9l-7 7a4 4 0 0 1-5.7-5.7l8-8a3 3 0 0 1 4.2 4.2l-8 8a2 2 0 0 1-2.8-2.8l7-7"/></svg>`,
  image:    `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="14" height="12" rx="2"/><circle cx="8" cy="9" r="1.5"/><path d="M17 13l-3.5-3.5L6 16"/></svg>`,
  menu:     `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 5h14M3 10h14M3 15h14"/></svg>`,
  panelRightClose:`<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="14" height="14" rx="2"/><path d="M13 3v14"/><path d="M9 7l-3 3 3 3"/></svg>`,
  globe:    `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="8"/><path d="M2 10h16M10 2a12 12 0 0 1 0 16A12 12 0 0 1 10 2z"/></svg>`,
  publish:  `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13V4m-4 5l4-5 4 5"/><path d="M4 17h12"/></svg>`,
  tag:      `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3h6l8 8a2 2 0 0 1 0 2.83l-4.17 4.17a2 2 0 0 1-2.83 0L2 9V3z"/><circle cx="7" cy="7" r="1"/></svg>`,
  link:     `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 11a4 4 0 0 0 5.66.01l2-2a4 4 0 0 0-5.66-5.66l-1 1"/><path d="M12 9a4 4 0 0 0-5.66 0l-2 2a4 4 0 0 0 5.66 5.66l1-1"/></svg>`,
  layers:   `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2l8 4-8 4-8-4 8-4z"/><path d="M2 10l8 4 8-4"/><path d="M2 14l8 4 8-4"/></svg>`,
  star:     `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3.5l2.1 4.3 4.7.7-3.4 3.3.8 4.7L10 14.8 5.8 16.5l.8-4.7-3.4-3.3 4.7-.7L10 3.5z"/></svg>`,
  refresh:  `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10a6 6 0 0 1 10.2-4.2L16 4"/><path d="M16 4v4h-4"/><path d="M16 10a6 6 0 0 1-10.2 4.2L4 16"/><path d="M4 16v-4h4"/></svg>`,
};

function Icon({ name, size = 16, style: extra = {} }) {
  const aliases = { "arrow-up":"arrowUp", "panel-right-close":"panelRightClose", "check-circle":"check", "x":"close" };
  const svg = ICONS[aliases[name] || name] || ICONS.docs;
  return React.createElement("span", {
    style: { display:"inline-flex", alignItems:"center", justifyContent:"center", width:size, height:size, flexShrink:0, ...extra },
    dangerouslySetInnerHTML: { __html: svg }
  });
}

function useIsMobile(bp = 900) {
  const [m, setM] = useState(() => window.innerWidth < bp);
  useEffect(() => { const h = () => setM(window.innerWidth < bp); window.addEventListener("resize",h); return ()=>window.removeEventListener("resize",h); }, [bp]);
  return m;
}
function useIsNarrow(bp = 520) { return useIsMobile(bp); }

function Avatar({ name, size = 32, photo }) {
  const initials = name ? name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase() : "??";
  if (photo) return React.createElement("img", { src:photo, style:{ width:size, height:size, borderRadius:"50%", objectFit:"cover", border:`2px solid ${C.border}` } });
  return React.createElement("div", { style:{ width:size, height:size, borderRadius:"50%", background:C.purpleDim, border:`2px solid ${C.purple}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.36, fontWeight:600, color:C.purpleL, flexShrink:0 } }, initials);
}

const BADGE_MAP = {
  Available:     {bg:"#d1fae5",color:"#065f46",border:"#6ee7b7"},
  Foster:        {bg:"#ede9fe",color:"#5b21b6",border:"#c4b5fd"},
  Medical:       {bg:"#fee2e2",color:"#991b1b",border:"#fca5a5"},
  Adopted:       {bg:"#d1fae5",color:"#065f46",border:"#6ee7b7"},
  Pending:       {bg:"#fef3c7",color:"#92400e",border:"#fcd34d"},
  Approved:      {bg:"#d1fae5",color:"#065f46",border:"#6ee7b7"},
  Denied:        {bg:"#fee2e2",color:"#991b1b",border:"#fca5a5"},
  "Under Review":{bg:"#dbeafe",color:"#1e40af",border:"#93c5fd"},
  Completed:     {bg:"#d1fae5",color:"#065f46",border:"#6ee7b7"},
  Scheduled:     {bg:"#ede9fe",color:"#5b21b6",border:"#c4b5fd"},
  Overdue:       {bg:"#fee2e2",color:"#991b1b",border:"#fca5a5"},
  Due:           {bg:"#fef3c7",color:"#92400e",border:"#fcd34d"},
  Ongoing:       {bg:"#dbeafe",color:"#1e40af",border:"#93c5fd"},
  Active:        {bg:"#d1fae5",color:"#065f46",border:"#6ee7b7"},
  Inactive:      {bg:"#f3f4f6",color:"#4b5563",border:"#d1d5db"},
  Published:     {bg:"#d1fae5",color:"#065f46",border:"#6ee7b7"},
  Draft:         {bg:"#fef3c7",color:"#92400e",border:"#fcd34d"},
  Poor:          {bg:"#fee2e2",color:"#991b1b",border:"#fca5a5"},
  Fair:          {bg:"#fef3c7",color:"#92400e",border:"#fcd34d"},
  Good:          {bg:"#d1fae5",color:"#065f46",border:"#6ee7b7"},
  "Medical Watch":{bg:"#fee2e2",color:"#991b1b",border:"#fca5a5"},
  "Medical watch":{bg:"#fee2e2",color:"#991b1b",border:"#fca5a5"},
};

function Badge({ label, dot = false }) {
  const col = BADGE_MAP[label] || { bg:C.bg2, color:C.textSec, border:C.border };
  return React.createElement("span", { style:{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 8px", borderRadius:99, fontSize:11, fontWeight:600, letterSpacing:"0.04em", background:col.bg, color:col.color, border:`1px solid ${col.border}`, whiteSpace:"nowrap" } },
    dot && React.createElement("span", { style:{ width:5, height:5, borderRadius:"50%", background:col.color, flexShrink:0 } }),
    label
  );
}

function ProgressBar({ value, max, color, height = 5 }) {
  const pct = Math.min(100, Math.max(0, (value / (max||1)) * 100));
  return React.createElement("div", { style:{ width:"100%", height, borderRadius:99, background:C.bg2, overflow:"hidden" } },
    React.createElement("div", { style:{ width:`${pct}%`, height:"100%", borderRadius:99, background:color||C.purple, transition:"width .3s ease" } })
  );
}

function Sparkline({ data, color, width = 80, height = 28 }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data), range = max-min||1;
  const pts = data.map((v,i) => `${(i/(data.length-1))*width},${height-((v-min)/range)*(height-4)-2}`).join(" ");
  return React.createElement("svg", { width, height, viewBox:`0 0 ${width} ${height}`, style:{ overflow:"visible" } },
    React.createElement("polyline", { points:pts, fill:"none", stroke:color||C.purple, strokeWidth:1.8, strokeLinecap:"round", strokeLinejoin:"round" })
  );
}

function StatCard({ icon, iconColor, label, value, sub, subPositive, sparkData, sparkColor, onClick }) {
  const [hov, setHov] = useState(false);
  const subColor = subPositive === true ? C.green : subPositive === false ? C.red : C.textSec;
  return React.createElement("div", { onClick, onMouseEnter:()=>setHov(true), onMouseLeave:()=>setHov(false),
    style:{ background:hov?C.bg2:C.surface, border:`1px solid ${hov?C.purple+"44":C.borderStr}`, borderRadius:12, padding:"18px 20px", display:"flex", flexDirection:"column", gap:10, transition:"all .15s", cursor:onClick?"pointer":"default", flex:1, minWidth:0, boxShadow:"0 2px 10px rgba(26,22,34,0.06)" } },
    React.createElement("div", { style:{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" } },
      React.createElement("div", { style:{ display:"flex", alignItems:"center", gap:8 } },
        React.createElement(Icon, { name:icon, size:18, style:{ color:iconColor||C.purple } }),
        React.createElement("span", { style:{ fontSize:12, color:C.textSec, fontWeight:600, letterSpacing:"0.02em" } }, label)
      ),
      sparkData && React.createElement(Sparkline, { data:sparkData, color:sparkColor||C.purple })
    ),
    React.createElement("div", { style:{ fontSize:30, fontWeight:700, color:C.text, lineHeight:1 } }, value),
    sub && React.createElement("div", { style:{ fontSize:12, color:subColor, fontWeight:500 } }, sub)
  );
}

function PageHeader({ title, subtitle, action, back, onBack, meta }) {
  return React.createElement("div", { className: "dash-page-header" },
    React.createElement("div", null,
      back && React.createElement("button", { type: "button", className: "dash-page-back", onClick: onBack },
        React.createElement(Icon, { name: "chevL", size: 14 }), back),
      React.createElement("h1", { className: "dash-page-title" }, title),
      subtitle && React.createElement("p", { className: "dash-page-subtitle" }, subtitle)
    ),
    meta || action
  );
}

function DashPage({ children, className = "" }) {
  return React.createElement("div", { className: "dash-page" + (className ? " " + className : "") }, children);
}

function Btn({ children, onClick, variant="primary", size="md", icon, style:extra={}, disabled }) {
  const [hov, setHov] = useState(false);
  const pad = size==="sm"?"6px 12px":"9px 18px", fs = size==="sm"?12:13;
  const styles = {
    primary:  {bg:hov?C.purpleHov:C.purple,color:"#fff",border:`1px solid ${C.purple}`},
    secondary:{bg:hov?C.bg2:C.surface,color:C.text,border:`1px solid ${C.border}`},
    ghost:    {bg:hov?C.bg2:"transparent",color:C.textSec,border:"1px solid transparent"},
    danger:   {bg:hov?"#b91c1c":C.redDim,color:C.red,border:`1px solid ${C.red}44`},
    success:  {bg:hov?"#065f46":C.greenDim,color:C.green,border:`1px solid ${C.green}44`},
  };
  const s = styles[variant]||styles.primary;
  return React.createElement("button", { onClick, disabled, onMouseEnter:()=>setHov(true), onMouseLeave:()=>setHov(false),
    style:{ display:"inline-flex", alignItems:"center", gap:6, padding:pad, borderRadius:8, border:s.border, background:s.bg, color:s.color, fontSize:fs, fontWeight:600, cursor:disabled?"not-allowed":"pointer", opacity:disabled?0.5:1, transition:"all .15s", whiteSpace:"nowrap", fontFamily:"var(--font-ui)", ...extra } },
    icon && React.createElement(Icon, { name:icon, size:14 }), children
  );
}

function Modal({ open, onClose, title, children, width=560 }) {
  useEffect(() => {
    if (!open) return;
    const h = e => { if(e.key==="Escape") onClose(); };
    document.addEventListener("keydown",h); return ()=>document.removeEventListener("keydown",h);
  }, [open, onClose]);
  if (!open) return null;
  return React.createElement("div", { onClick:onClose, style:{ position:"fixed", inset:0, background:"rgba(0,0,0,.4)", backdropFilter:"blur(4px)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:20 } },
    React.createElement("div", { onClick:e=>e.stopPropagation(), style:{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, width:"100%", maxWidth:width, maxHeight:"90vh", overflow:"auto", boxShadow:"0 24px 60px rgba(0,0,0,.15)" } },
      React.createElement("div", { style:{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"20px 24px", borderBottom:`1px solid ${C.border}` } },
        React.createElement("h2", { style:{ margin:0, fontSize:17, fontWeight:700, color:C.text } }, title),
        React.createElement("button", { onClick:onClose, style:{ background:"none", border:"none", color:C.textSec, cursor:"pointer", display:"flex" } }, React.createElement(Icon, { name:"close", size:20 }))
      ),
      React.createElement("div", { style:{ padding:24 } }, children)
    )
  );
}

function Table({ cols, rows, onRowClick, emptyMsg="No records found" }) {
  if (!rows||rows.length===0) return React.createElement(EmptyState, { message:emptyMsg });
  return React.createElement("div", { style:{ overflowX:"auto" } },
    React.createElement("table", { style:{ width:"100%", borderCollapse:"collapse", fontSize:13 } },
      React.createElement("thead", null, React.createElement("tr", null,
        cols.map(col => React.createElement("th", { key:col.key, style:{ textAlign:"left", padding:"10px 16px", color:C.textSec, fontWeight:700, fontSize:11, letterSpacing:"0.06em", textTransform:"uppercase", borderBottom:`1px solid ${C.borderStr}`, whiteSpace:"nowrap", background:C.surface } }, col.label))
      )),
      React.createElement("tbody", null,
        rows.map((row,i) => React.createElement("tr", { key:row.id||i, onClick:onRowClick?()=>onRowClick(row):undefined, style:{ borderBottom:`1px solid ${C.border}`, cursor:onRowClick?"pointer":"default", transition:"background .1s" }, onMouseEnter:e=>{ if(onRowClick) e.currentTarget.style.background=C.bg2; }, onMouseLeave:e=>{ e.currentTarget.style.background="transparent"; } },
          cols.map(col => React.createElement("td", { key:col.key, style:{ padding:"12px 16px", color:C.text, verticalAlign:"middle" } }, col.render?col.render(row[col.key],row):row[col.key]))
        ))
      )
    )
  );
}

function EmptyState({ message, icon="docs" }) {
  return React.createElement("div", { style:{ display:"flex", flexDirection:"column", alignItems:"center", gap:12, padding:"48px 24px", color:C.textMut } },
    React.createElement(Icon, { name:icon, size:36, style:{ opacity:.35 } }),
    React.createElement("p", { style:{ margin:0, fontSize:14 } }, message)
  );
}

function Tabs({ tabs, active, onChange }) {
  return React.createElement("div", { style:{ display:"flex", gap:2, borderBottom:`1px solid ${C.border}`, marginBottom:24 } },
    tabs.map(tab => React.createElement("button", { key:tab.value, onClick:()=>onChange(tab.value),
      style:{ padding:"10px 16px", background:"none", border:"none", borderBottom:active===tab.value?`2px solid ${C.purple}`:"2px solid transparent", color:active===tab.value?C.purple:C.textSec, fontWeight:active===tab.value?700:500, fontSize:13, cursor:"pointer", transition:"all .15s", marginBottom:-1, whiteSpace:"nowrap", fontFamily:"var(--font-ui)" } },
      tab.label, tab.count!==undefined && React.createElement("span", { style:{ marginLeft:6, background:active===tab.value?C.purpleDim:C.bg2, color:active===tab.value?C.purple:C.textMut, borderRadius:99, padding:"1px 7px", fontSize:11 } }, tab.count)
    ))
  );
}

function Card({ children, style:extra={}, className="", onClick, hover=false }) {
  const [hov, setHov] = useState(false);
  return React.createElement("div", {
    className: className || undefined,
    onClick, onMouseEnter:()=>setHov(true), onMouseLeave:()=>setHov(false),
    style:{ background:(hover&&hov)?C.bg2:C.surface, border:`1px solid ${(hover&&hov)?C.purple+"44":C.borderStr}`, borderRadius:12, transition:"all .15s", cursor:onClick?"pointer":"default", boxShadow:"0 2px 10px rgba(26,22,34,0.06)", ...extra } },
    children
  );
}

function Input({ value, onChange, placeholder, icon, style:extra={}, type="text" }) {
  const [focus, setFocus] = useState(false);
  return React.createElement("div", { style:{ position:"relative", ...extra } },
    icon && React.createElement("span", { style:{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:C.textMut, pointerEvents:"none", display:"flex" } }, React.createElement(Icon, { name:icon, size:15 })),
    React.createElement("input", { type, value, onChange:e=>onChange(e.target.value), onFocus:()=>setFocus(true), onBlur:()=>setFocus(false), placeholder,
      style:{ width:"100%", background:C.surface, border:`1px solid ${focus?C.purple:C.border}`, borderRadius:8, padding:icon?"9px 12px 9px 34px":"9px 12px", color:C.text, fontSize:13, outline:"none", transition:"border-color .15s", boxSizing:"border-box", fontFamily:"var(--font-ui)" } })
  );
}

function Select({ value, onChange, options, style:extra={} }) {
  return React.createElement("select", { value, onChange:e=>onChange(e.target.value),
    style:{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 12px", color:C.text, fontSize:13, outline:"none", cursor:"pointer", fontFamily:"var(--font-ui)", ...extra } },
    options.map(o => React.createElement("option", { key:o.value||o, value:o.value||o }, o.label||o))
  );
}

function Sidebar({ view, navigate, onLogout }) {
  const [hovItem, setHovItem] = useState(null);
  const user = window.CPAS?.user || { name:"Admin", role:"Staff" };
  const logoUrl = window.CPAS_CONFIG?.logoUrl || LOGO_LIGHT;

  return React.createElement("aside", { className:"cpas-sidebar" },
    React.createElement("div", { style:{ padding:"16px 16px 14px", borderBottom:"1px solid var(--nav-border)", flexShrink:0 } },
      React.createElement("a", { href:"/dashboard/overview", onClick:e=>{ e.preventDefault(); navigate("overview"); }, style:{ display:"flex", alignItems:"center", textDecoration:"none" } },
        React.createElement("img", { src:logoUrl, alt:"Companions of CPAS", style:{ width:100, height:"auto", display:"block", objectFit:"contain" } })
      )
    ),
    React.createElement("nav", { style:{ flex:1, overflowY:"auto", padding:"8px 10px 12px" }, "aria-label":"Main navigation" },
      NAV_STRUCTURE.map(group => React.createElement("div", { key:group.group },
        React.createElement("div", { className:"cpas-nav-group-label" }, group.group),
        group.items.map(item => {
          const active = view===item.key||(item.children&&item.children.some(c=>c.key===view));
          const hasKids = item.children&&item.children.length;
          const childOpen = hasKids&&isActiveCMS(view);
          return React.createElement("div", { key:item.key },
            React.createElement("button", { onClick:()=>navigate(item.key), onMouseEnter:()=>setHovItem(item.key), onMouseLeave:()=>setHovItem(null),
              className:`cpas-nav-item ${active&&!hasKids?"active":""} ${active&&hasKids?"active-parent":""}`, "aria-current":active?"page":undefined },
              React.createElement(Icon, { name:item.icon, size:16 }), item.label,
              hasKids && React.createElement("span", { style:{ marginLeft:"auto", transition:"transform 200ms", transform:childOpen?"rotate(90deg)":"none", display:"flex" } },
                React.createElement(Icon, { name:"chevR", size:13, style:{ color:"var(--nav-text-muted)" } }))
            ),
            hasKids && React.createElement("div", { className:`cpas-nav-children ${childOpen?"open":""}` },
              item.children.map(child => React.createElement("button", { key:child.key, onClick:()=>navigate(child.key),
                className:`cpas-nav-item cpas-nav-child ${view===child.key?"active":""}`, "aria-current":view===child.key?"page":undefined }, child.label))
            )
          );
        })
      ))
    ),
    React.createElement("div", { className:"cpas-sidebar-footer", onClick:()=>navigate("settings"), title:"Settings" },
      React.createElement(Avatar, { name:user.name, size:30 }),
      React.createElement("div", { style:{ flex:1, minWidth:0 } },
        React.createElement("div", { style:{ fontSize:13, fontWeight:600, color:"var(--nav-text)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" } }, user.name),
        React.createElement("div", { style:{ fontSize:11, color:"var(--nav-text-sec)" } }, user.role)
      ),
      React.createElement(Icon, { name:"gear", size:14, style:{ color:"var(--nav-text-muted)", flexShrink:0 } })
    )
  );
}

// TopBar — desktop light, mobile dark (matches nav)
// Mail icon now routes to /dashboard/email
function TopBar({ view, isMobile, navOpen, onOpenNav, navigate }) {
  const [search, setSearch] = useState("");
  if (isMobile) {
    const label = NAV_ITEMS.find(n=>n.key===view)?.label||"Dashboard";
    return React.createElement("header", { className:"cpas-topbar mobile", style:{ display:"flex" } },
      React.createElement("button", { className:"cpas-hamburger", onClick:onOpenNav, "aria-label":"Open navigation", "aria-expanded":String(navOpen), "aria-controls":"cpas-mobile-drawer" },
        React.createElement("span", { style:{ width:18 } }),
        React.createElement("span", { style:{ width:navOpen?18:12 } }),
        React.createElement("span", { style:{ width:navOpen?18:15 } })
      ),
      React.createElement("span", { style:{ flex:1, fontSize:15, fontWeight:600, color:"rgba(255,255,255,0.92)", textAlign:"center", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" } }, label),
      React.createElement("button", {
        onClick:()=>{ if(typeof window.__toggleAgentSam==="function") window.__toggleAgentSam(); else window.dispatchEvent(new Event("agentsam:toggle")); },
        className:"agentsam-launcher", style:{ color:"rgba(255,255,255,0.6)" }, title:"Toggle Agent Sam"
      }, React.createElement(Icon, { name:"bot", size:20 }))
    );
  }
  return React.createElement("header", { className:"cpas-topbar" },
    React.createElement("div", { style:{ flex:1, maxWidth:420, "--inp-bg":"rgba(255,255,255,0.07)", "--inp-border":"rgba(255,255,255,0.12)", "--inp-text":"rgba(255,255,255,0.85)", "--inp-placeholder":"rgba(255,255,255,0.38)" } },
      React.createElement(Input, { value:search, onChange:setSearch, placeholder:"Search animals, people, records…", icon:"search",
        style:{ width:"100%", background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", color:"rgba(255,255,255,0.85)", borderRadius:10 } })
    ),
    React.createElement("div", { style:{ display:"flex", alignItems:"center", gap:6, marginLeft:"auto" } },
      // Mail → /dashboard/email (notifications live under Email → Smart Views)
      React.createElement("button", {
        onClick:()=>navigate("email"),
        "aria-label": "Email inbox",
        style:{ background:"none", border:"none", color:"var(--nav-text-sec)", cursor:"pointer", display:"flex", padding:8, borderRadius:8, transition:"background .12s" },
        onMouseEnter:e=>e.currentTarget.style.background="rgba(255,255,255,0.08)",
        onMouseLeave:e=>e.currentTarget.style.background="none"
      }, React.createElement(Icon, { name:"mail", size:20 })),
      // Agent Sam
      React.createElement("button", {
        className:"agentsam-launcher",
        onClick:()=>{ if(typeof window.__toggleAgentSam==="function") window.__toggleAgentSam(); else window.dispatchEvent(new Event("agentsam:toggle")); },
        title:"Toggle Agent Sam"
      }, React.createElement(Icon, { name:"bot", size:20 }))
    )
  );
}

function MobileDrawer({ open, view, navigate, onClose, onLogout }) {
  const logoUrl = window.CPAS_CONFIG?.logoUrl||LOGO_LIGHT;
  const user = window.CPAS?.user||{ name:"Admin", role:"Staff" };
  const cmsChildOpen = isActiveCMS(view);
  useEffect(() => {
    if (!open) return;
    const h = e => { if(e.key==="Escape") onClose(); };
    document.addEventListener("keydown",h); return ()=>document.removeEventListener("keydown",h);
  }, [open, onClose]);
  return React.createElement("div", { id:"cpas-mobile-drawer", className:`cpas-mobile-drawer ${open?"open":""}`, role:"dialog", "aria-modal":"true", "aria-label":"Navigation menu" },
    React.createElement("div", { style:{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 16px 12px", borderBottom:"1px solid var(--nav-border)", flexShrink:0 } },
      React.createElement("img", { src:logoUrl, alt:"Companions of CPAS", style:{ width:88, height:"auto", objectFit:"contain" } }),
      React.createElement("button", { onClick:onClose, "aria-label":"Close navigation", style:{ background:"none", border:"none", color:"var(--nav-text-sec)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", padding:6, borderRadius:8 } },
        React.createElement(Icon, { name:"close", size:20 }))
    ),
    React.createElement("nav", { style:{ flex:1, padding:"8px 10px 16px", overflowY:"auto" }, "aria-label":"Mobile navigation" },
      NAV_STRUCTURE.map(group => React.createElement("div", { key:group.group, style:{ marginBottom:4 } },
        React.createElement("div", { className:"cpas-nav-group-label" }, group.group),
        group.items.map(item => {
          const active = view===item.key||(item.children&&item.children.some(c=>c.key===view));
          const hasKids = item.children&&item.children.length;
          return React.createElement("div", { key:item.key },
            React.createElement("button", { onClick:()=>{ navigate(item.key); if(!hasKids) onClose(); },
              className:`cpas-nav-item ${active&&!hasKids?"active":""} ${active&&hasKids?"active-parent":""}`,
              "aria-current":(active&&!hasKids)?"page":undefined, "aria-expanded":hasKids?String(cmsChildOpen):undefined },
              React.createElement(Icon, { name:item.icon, size:17 }), item.label,
              hasKids && React.createElement("span", { style:{ marginLeft:"auto", transition:"transform 200ms", transform:cmsChildOpen?"rotate(90deg)":"none", display:"flex" } },
                React.createElement(Icon, { name:"chevR", size:13, style:{ color:"var(--nav-text-muted)" } }))
            ),
            hasKids && React.createElement("div", { className:`cpas-nav-children ${cmsChildOpen?"open":""}` },
              item.children.map(child => React.createElement("button", { key:child.key, onClick:()=>{ navigate(child.key); onClose(); },
                className:`cpas-nav-item cpas-nav-child ${view===child.key?"active":""}`, "aria-current":view===child.key?"page":undefined }, child.label))
            )
          );
        })
      ))
    ),
    React.createElement("div", { style:{ padding:"12px 16px", borderTop:"1px solid var(--nav-border)", display:"flex", alignItems:"center", gap:10, flexShrink:0 } },
      React.createElement(Avatar, { name:user.name, size:30 }),
      React.createElement("div", { style:{ flex:1, minWidth:0 } },
        React.createElement("div", { style:{ fontSize:13, fontWeight:600, color:"var(--nav-text)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" } }, user.name),
        React.createElement("div", { style:{ fontSize:11, color:"var(--nav-text-sec)" } }, user.role)
      ),
      React.createElement("button", { onClick:onLogout, style:{ background:"none", border:"none", cursor:"pointer", color:"var(--nav-text-sec)", fontSize:11, display:"flex", alignItems:"center", gap:4 } }, "Sign out")
    )
  );
}

Object.assign(window, {
  Icon, Avatar, Badge, ProgressBar, Sparkline, StatCard, PageHeader, DashPage, Btn,
  Modal, Table, EmptyState, Tabs, Card, Input, Select,
  Sidebar, TopBar, MobileDrawer,
  NAV_STRUCTURE, NAV_ITEMS,
  useIsMobile, useIsNarrow,
  C, CPAS: window.CPAS
});
