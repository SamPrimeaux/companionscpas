// ─── Shared UI Components ─────────────────────────────────────────────────────
// Exports to window: Sidebar, TopBar, Badge, StatCard, PageHeader, Modal,
//                    Table, EmptyState, Icon, Avatar, ProgressBar, Sparkline

const { useState, useEffect, useRef, useCallback } = React;

// ── Color tokens ──────────────────────────────────────────────────────────────
const C = {
  bg:        "#0b0b14",
  surface:   "#12121f",
  raised:    "#191928",
  high:      "#20203a",
  border:    "#282840",
  purple:    "#7c3aed",
  purpleHov: "#6d28d9",
  purpleL:   "#a78bfa",
  purpleDim: "#2d1b5e",
  text:      "#f0f0f5",
  textSec:   "#8888aa",
  textMut:   "#55556a",
  green:     "#10b981",
  greenDim:  "#052e20",
  red:       "#ef4444",
  redDim:    "#3b0d0d",
  yellow:    "#f59e0b",
  yellowDim: "#3b2000",
  teal:      "#06b6d4",
  tealDim:   "#052e3a",
  pink:      "#ec4899",
};

// ── Icon set (inline SVG strings) ─────────────────────────────────────────────
const ICONS = {
  dashboard: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="7" height="7" rx="1.5"/><rect x="11" y="2" width="7" height="7" rx="1.5"/><rect x="2" y="11" width="7" height="7" rx="1.5"/><rect x="11" y="11" width="7" height="7" rx="1.5"/></svg>`,
  paw:       `<svg viewBox="0 0 20 20" fill="currentColor"><circle cx="7" cy="4" r="1.5"/><circle cx="13" cy="4" r="1.5"/><circle cx="4" cy="8" r="1.5"/><circle cx="16" cy="8" r="1.5"/><path d="M10 8c-2.5 0-5 2-5 5 0 1.5 1 2.5 2 2.5.6 0 1.5-.5 2-.5h2c.5 0 1.4.5 2 .5 1 0 2-1 2-2.5 0-3-2.5-5-5-5z"/></svg>`,
  heart:     `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 16s-7-4.5-7-9a4 4 0 0 1 7-2.65A4 4 0 0 1 17 7c0 4.5-7 9-7 9z"/></svg>`,
  check:     `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="8"/><path d="M6.5 10l2.5 2.5 4.5-4.5"/></svg>`,
  intake:    `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3v10m0 0l-3-3m3 3l3-3"/><path d="M4 15h12"/></svg>`,
  medical:   `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 4v12M4 10h12"/></svg>`,
  clipboard: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="12" height="14" rx="2"/><path d="M8 4V3a2 2 0 0 1 4 0v1"/><path d="M7 9h6M7 12h4"/></svg>`,
  people:    `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="6" r="3"/><path d="M2 18c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="15" cy="6" r="2.5"/><path d="M18 18c0-2.5-1.5-4.5-3.5-5.2"/></svg>`,
  docs:      `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="12" height="16" rx="2"/><path d="M7 7h6M7 10h6M7 13h4"/></svg>`,
  dollar:    `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3v14M7 6h4.5a2.5 2.5 0 0 1 0 5H7m0 0h5a2.5 2.5 0 0 1 0 5H7"/></svg>`,
  trending:  `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 14l4-4 3 3 5-6"/><path d="M14 7h3v3"/></svg>`,
  edit:      `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M13 3l4 4-9 9H4v-4l9-9z"/></svg>`,
  chart:     `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 16V9m4 7V4m4 12V8m4 8V6"/></svg>`,
  gear:      `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="2.5"/><path d="M10 2.5v1.9m0 11.2v1.9m5.3-3.8-1.3-1.3M5.9 5.9 4.6 4.6m7.6 0-1.3 1.3M5.9 14 4.6 15.4M2.5 10h1.9m11.2 0h1.9"/></svg>`,
  bell:      `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2a6 6 0 0 1 6 6v3l2 3H2l2-3V8a6 6 0 0 1 6-6z"/><path d="M8 17a2 2 0 0 0 4 0"/></svg>`,
  search:    `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="8.5" cy="8.5" r="5.5"/><path d="M17 17l-4-4"/></svg>`,
  plus:      `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 4v12M4 10h12"/></svg>`,
  chevR:     `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 5l6 5-6 5"/></svg>`,
  chevD:     `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 7l5 6 5-6"/></svg>`,
  chevL:     `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13 5l-6 5 6 5"/></svg>`,
  close:     `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 5l10 10M15 5l-10 10"/></svg>`,
  eye:       `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z"/><circle cx="10" cy="10" r="2"/></svg>`,
  trash:     `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h12M8 6V4h4v2m-5 3v6m4-6v6M5 6l1 11h8l1-11"/></svg>`,
  mail:      `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="16" height="13" rx="2"/><path d="M2 7l8 5 8-5"/></svg>`,
  phone:     `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 3h4l2 4-2.5 1.5a10 10 0 0 0 4 4L13 10l4 2v4a2 2 0 0 1-2 2A16 16 0 0 1 2 5a2 2 0 0 1 2-2z"/></svg>`,
  home:      `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l7-6 7 6v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M8 18V12h4v6"/></svg>`,
  download:  `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3v9m0 0l-3-3m3 3l3-3M4 15h12"/></svg>`,
  filter:    `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h14M6 10h8M9 15h2"/></svg>`,
  arrowR:    `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10h12M10 4l6 6-6 6"/></svg>`,
  check2:    `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10l4 4 8-8"/></svg>`,
  warning:   `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3L2 17h16L10 3z"/><path d="M10 8v4M10 14v.5"/></svg>`,
};

// ── Icon component ────────────────────────────────────────────────────────────
function Icon({ name, size = 16, style = {} }) {
  const svg = ICONS[name] || ICONS.docs;
  return React.createElement("span", {
    style: { display:"inline-flex", alignItems:"center", justifyContent:"center", width:size, height:size, flexShrink:0, ...style },
    dangerouslySetInnerHTML: { __html: svg }
  });
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ name, size = 32, photo }) {
  const initials = name ? name.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase() : "??";
  if (photo) return React.createElement("img", { src:photo, style:{ width:size, height:size, borderRadius:"50%", objectFit:"cover", border:`2px solid ${C.border}` } });
  return React.createElement("div", {
    style: { width:size, height:size, borderRadius:"50%", background:C.purpleDim, border:`2px solid ${C.purple}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.36, fontWeight:600, color:C.purpleL, flexShrink:0 }
  }, initials);
}

// ── Badge ─────────────────────────────────────────────────────────────────────
const BADGE_COLORS = {
  Available:    { bg:"#052e20", color:"#34d399", border:"#065f46" },
  Foster:       { bg:"#1e1b4b", color:"#818cf8", border:"#3730a3" },
  Medical:      { bg:"#3b0d0d", color:"#f87171", border:"#7f1d1d" },
  Adopted:      { bg:"#1a2e1a", color:"#86efac", border:"#166534" },
  Pending:      { bg:"#3b2000", color:"#fbbf24", border:"#92400e" },
  Approved:     { bg:"#052e20", color:"#34d399", border:"#065f46" },
  Denied:       { bg:"#3b0d0d", color:"#f87171", border:"#7f1d1d" },
  "Under Review":{ bg:"#172554", color:"#60a5fa", border:"#1d4ed8" },
  Completed:    { bg:"#052e20", color:"#34d399", border:"#065f46" },
  Scheduled:    { bg:"#1e1b4b", color:"#818cf8", border:"#3730a3" },
  Overdue:      { bg:"#3b0d0d", color:"#f87171", border:"#7f1d1d" },
  Due:          { bg:"#3b2000", color:"#fbbf24", border:"#92400e" },
  Ongoing:      { bg:"#172554", color:"#60a5fa", border:"#1d4ed8" },
  Active:       { bg:"#052e20", color:"#34d399", border:"#065f46" },
  Inactive:     { bg:"#1f1f2e", color:"#9ca3af", border:"#374151" },
  Adoption:     { bg:"#052e20", color:"#34d399", border:"#065f46" },
  Foster2:      { bg:"#1e1b4b", color:"#818cf8", border:"#3730a3" },
  urgent:       { bg:"#3b0d0d", color:"#f87171", border:"#7f1d1d" },
  donation:     { bg:"#1e1b4b", color:"#a78bfa", border:"#4c1d95" },
  volunteer:    { bg:"#052e20", color:"#34d399", border:"#065f46" },
  medical:      { bg:"#3b0d0d", color:"#f87171", border:"#7f1d1d" },
  intake:       { bg:"#172554", color:"#60a5fa", border:"#1d4ed8" },
  adoption:     { bg:"#052e20", color:"#34d399", border:"#065f46" },
  Poor:         { bg:"#3b0d0d", color:"#f87171", border:"#7f1d1d" },
  Fair:         { bg:"#3b2000", color:"#fbbf24", border:"#92400e" },
  Good:         { bg:"#052e20", color:"#34d399", border:"#065f46" },
};

function Badge({ label, dot = false }) {
  const col = BADGE_COLORS[label] || { bg: C.high, color: C.textSec, border: C.border };
  return React.createElement("span", {
    style: { display:"inline-flex", alignItems:"center", gap:4, padding:"2px 8px", borderRadius:99, fontSize:11, fontWeight:600, letterSpacing:"0.04em", background:col.bg, color:col.color, border:`1px solid ${col.border}`, whiteSpace:"nowrap" }
  },
    dot && React.createElement("span", { style:{ width:5, height:5, borderRadius:"50%", background:col.color, flexShrink:0 } }),
    label
  );
}

// ── ProgressBar ───────────────────────────────────────────────────────────────
function ProgressBar({ value, max, color = C.purple, height = 5 }) {
  const pct = Math.min(100, (value / max) * 100);
  return React.createElement("div", { style:{ width:"100%", height, borderRadius:99, background:C.border, overflow:"hidden" } },
    React.createElement("div", { style:{ width:`${pct}%`, height:"100%", borderRadius:99, background:color, transition:"width .3s ease" } })
  );
}

// ── Sparkline (simple SVG) ────────────────────────────────────────────────────
function Sparkline({ data, color = C.purple, width = 80, height = 28 }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  return React.createElement("svg", { width, height, viewBox:`0 0 ${width} ${height}`, style:{ overflow:"visible" } },
    React.createElement("polyline", { points:pts, fill:"none", stroke:color, strokeWidth:1.8, strokeLinecap:"round", strokeLinejoin:"round" })
  );
}

// ── StatCard ──────────────────────────────────────────────────────────────────
function StatCard({ icon, iconColor, label, value, sub, subPositive, sparkData, sparkColor, onClick }) {
  const [hov, setHov] = useState(false);
  return React.createElement("div", {
    onClick, onMouseEnter:()=>setHov(true), onMouseLeave:()=>setHov(false),
    style:{ background: hov ? C.raised : C.surface, border:`1px solid ${hov ? C.purple+"44" : C.border}`, borderRadius:12, padding:"18px 20px", display:"flex", flexDirection:"column", gap:10, transition:"all .15s", cursor: onClick ? "pointer" : "default", flex:1, minWidth:0 }
  },
    React.createElement("div", { style:{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" } },
      React.createElement("div", { style:{ display:"flex", alignItems:"center", gap:8 } },
        React.createElement("span", { style:{ fontSize:18 } }, icon),
        React.createElement("span", { style:{ fontSize:12, color:C.textSec, fontWeight:500 } }, label)
      ),
      sparkData && React.createElement(Sparkline, { data:sparkData, color:sparkColor || C.purple })
    ),
    React.createElement("div", { style:{ fontSize:30, fontWeight:700, color:C.text, lineHeight:1 } }, value),
    sub && React.createElement("div", { style:{ fontSize:11, color: subPositive ? C.green : C.red, fontWeight:500 } }, sub)
  );
}

// ── PageHeader ────────────────────────────────────────────────────────────────
function PageHeader({ title, subtitle, action, back, onBack }) {
  return React.createElement("div", { style:{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:24, flexWrap:"wrap", gap:12 } },
    React.createElement("div", null,
      back && React.createElement("button", {
        onClick: onBack,
        style:{ display:"flex", alignItems:"center", gap:4, background:"none", border:"none", color:C.textSec, cursor:"pointer", fontSize:13, padding:"0 0 8px", transition:"color .15s" }
      }, React.createElement(Icon, { name:"chevL", size:14 }), back),
      React.createElement("h1", { style:{ fontSize:24, fontWeight:700, color:C.text, margin:0 } }, title),
      subtitle && React.createElement("p", { style:{ margin:"4px 0 0", fontSize:13, color:C.textSec } }, subtitle)
    ),
    action
  );
}

// ── Btn ───────────────────────────────────────────────────────────────────────
function Btn({ children, onClick, variant = "primary", size = "md", icon, style: extraStyle = {} }) {
  const [hov, setHov] = useState(false);
  const pad = size === "sm" ? "6px 12px" : "9px 18px";
  const fs = size === "sm" ? 12 : 13;
  const styles = {
    primary: { bg: hov ? C.purpleHov : C.purple, color:"#fff", border:`1px solid ${C.purple}` },
    secondary:{ bg: hov ? C.raised : C.surface, color:C.text, border:`1px solid ${C.border}` },
    ghost:   { bg: hov ? C.raised : "transparent", color:C.textSec, border:"1px solid transparent" },
    danger:  { bg: hov ? "#b91c1c" : C.redDim, color:"#f87171", border:`1px solid #7f1d1d` },
    success: { bg: hov ? "#065f46" : C.greenDim, color:"#34d399", border:`1px solid #065f46` },
  };
  const s = styles[variant] || styles.primary;
  return React.createElement("button", {
    onClick, onMouseEnter:()=>setHov(true), onMouseLeave:()=>setHov(false),
    style:{ display:"inline-flex", alignItems:"center", gap:6, padding:pad, borderRadius:8, border:s.border, background:s.bg, color:s.color, fontSize:fs, fontWeight:600, cursor:"pointer", transition:"all .15s", whiteSpace:"nowrap", ...extraStyle }
  }, icon && React.createElement(Icon, { name:icon, size:14 }), children);
}

// ── Modal ────────────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children, width = 560 }) {
  if (!open) return null;
  return React.createElement("div", {
    onClick: onClose,
    style:{ position:"fixed", inset:0, background:"rgba(0,0,0,.7)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }
  },
    React.createElement("div", {
      onClick: e => e.stopPropagation(),
      style:{ background:C.raised, border:`1px solid ${C.border}`, borderRadius:16, width:"100%", maxWidth:width, maxHeight:"90vh", overflow:"auto", boxShadow:"0 24px 60px rgba(0,0,0,.6)" }
    },
      React.createElement("div", { style:{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"20px 24px", borderBottom:`1px solid ${C.border}` } },
        React.createElement("h2", { style:{ margin:0, fontSize:18, fontWeight:700, color:C.text } }, title),
        React.createElement("button", { onClick:onClose, style:{ background:"none", border:"none", color:C.textSec, cursor:"pointer", display:"flex" } }, React.createElement(Icon, { name:"close", size:20 }))
      ),
      React.createElement("div", { style:{ padding:24 } }, children)
    )
  );
}

// ── Table ────────────────────────────────────────────────────────────────────
function Table({ cols, rows, onRowClick, emptyMsg = "No records found" }) {
  if (!rows || rows.length === 0) return React.createElement(EmptyState, { message: emptyMsg });
  return React.createElement("div", { style:{ overflowX:"auto" } },
    React.createElement("table", { style:{ width:"100%", borderCollapse:"collapse", fontSize:13 } },
      React.createElement("thead", null,
        React.createElement("tr", null,
          cols.map(col =>
            React.createElement("th", { key:col.key, style:{ textAlign:"left", padding:"10px 16px", color:C.textSec, fontWeight:600, fontSize:11, letterSpacing:"0.06em", textTransform:"uppercase", borderBottom:`1px solid ${C.border}`, whiteSpace:"nowrap" } },
              col.label
            )
          )
        )
      ),
      React.createElement("tbody", null,
        rows.map((row, i) =>
          React.createElement("tr", {
            key: row.id || i,
            onClick: onRowClick ? () => onRowClick(row) : undefined,
            style:{ borderBottom:`1px solid ${C.border}`, cursor: onRowClick ? "pointer" : "default", transition:"background .1s" },
            onMouseEnter: e => { if (onRowClick) e.currentTarget.style.background = C.raised; },
            onMouseLeave: e => { e.currentTarget.style.background = "transparent"; }
          },
            cols.map(col =>
              React.createElement("td", { key:col.key, style:{ padding:"12px 16px", color:C.text, verticalAlign:"middle" } },
                col.render ? col.render(row[col.key], row) : row[col.key]
              )
            )
          )
        )
      )
    )
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────
function EmptyState({ message, icon = "docs" }) {
  return React.createElement("div", { style:{ display:"flex", flexDirection:"column", alignItems:"center", gap:12, padding:"48px 24px", color:C.textMut } },
    React.createElement(Icon, { name:icon, size:36, style:{ opacity:.4 } }),
    React.createElement("p", { style:{ margin:0, fontSize:14 } }, message)
  );
}

// ── Tabs ─────────────────────────────────────────────────────────────────────
function Tabs({ tabs, active, onChange }) {
  return React.createElement("div", { style:{ display:"flex", gap:2, borderBottom:`1px solid ${C.border}`, marginBottom:24 } },
    tabs.map(tab =>
      React.createElement("button", {
        key: tab.value,
        onClick: () => onChange(tab.value),
        style:{ padding:"10px 16px", background:"none", border:"none", borderBottom: active === tab.value ? `2px solid ${C.purple}` : "2px solid transparent", color: active === tab.value ? C.purpleL : C.textSec, fontWeight: active === tab.value ? 600 : 400, fontSize:13, cursor:"pointer", transition:"all .15s", marginBottom:-1, whiteSpace:"nowrap" }
      }, tab.label, tab.count !== undefined && React.createElement("span", { style:{ marginLeft:6, background: active === tab.value ? C.purpleDim : C.high, color: active === tab.value ? C.purpleL : C.textMut, borderRadius:99, padding:"1px 7px", fontSize:11 } }, tab.count))
    )
  );
}

// ── Card wrapper ──────────────────────────────────────────────────────────────
function Card({ children, style: extra = {}, onClick, hover = false }) {
  const [hov, setHov] = useState(false);
  return React.createElement("div", {
    onClick, onMouseEnter:()=>setHov(true), onMouseLeave:()=>setHov(false),
    style:{ background: (hover && hov) ? C.raised : C.surface, border:`1px solid ${(hover && hov) ? C.purple+"44" : C.border}`, borderRadius:12, transition:"all .15s", cursor: onClick ? "pointer" : "default", ...extra }
  }, children);
}

// ── Input ─────────────────────────────────────────────────────────────────────
function Input({ value, onChange, placeholder, icon, style: extra = {} }) {
  const [focus, setFocus] = useState(false);
  return React.createElement("div", { style:{ position:"relative", ...extra } },
    icon && React.createElement("span", { style:{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:C.textMut, pointerEvents:"none", display:"flex" } }, React.createElement(Icon, { name:icon, size:15 })),
    React.createElement("input", {
      value, onChange: e => onChange(e.target.value),
      onFocus:()=>setFocus(true), onBlur:()=>setFocus(false),
      placeholder,
      style:{ width:"100%", background:C.raised, border:`1px solid ${focus ? C.purple : C.border}`, borderRadius:8, padding: icon ? "9px 12px 9px 34px" : "9px 12px", color:C.text, fontSize:13, outline:"none", transition:"border-color .15s", boxSizing:"border-box" }
    })
  );
}

// ── Select ────────────────────────────────────────────────────────────────────
function Select({ value, onChange, options, style: extra = {} }) {
  return React.createElement("select", {
    value, onChange: e => onChange(e.target.value),
    style:{ background:C.raised, border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 12px", color:C.text, fontSize:13, outline:"none", cursor:"pointer", ...extra }
  }, options.map(o => React.createElement("option", { key:o.value||o, value:o.value||o }, o.label||o)));
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { key:"overview",    label:"Dashboard",    icon:"dashboard" },
  { key:"animals",     label:"Animals",      icon:"paw" },
  { key:"fosters",     label:"Fosters",      icon:"heart" },
  { key:"adoptions",   label:"Adoptions",    icon:"check" },
  { key:"intakes",     label:"Intakes",      icon:"intake" },
  { key:"medical",     label:"Medical",      icon:"medical" },
  { key:"daily-care",  label:"Daily Care",   icon:"clipboard" },
  { key:"volunteers",  label:"Volunteers",   icon:"people" },
  { key:"applications",label:"Applications", icon:"docs" },
  { key:"donations",   label:"Donations",    icon:"dollar" },
  { key:"fundraising", label:"Fundraising",  icon:"trending" },
  { key:"cms",         label:"CMS Website",  icon:"edit" },
  { key:"reports",     label:"Reports",      icon:"chart" },
  { key:"settings",    label:"Settings",     icon:"gear" },
];

function Sidebar({ view, onNavigate, notifCount }) {
  const [hov, setHov] = useState(null);
  return React.createElement("aside", {
    style:{ width:220, flexShrink:0, background:C.surface, borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column", height:"100vh", position:"sticky", top:0, overflow:"hidden" }
  },
    // Logo
    React.createElement("div", { style:{ padding:"20px 20px 16px", borderBottom:`1px solid ${C.border}`, flexShrink:0 } },
      React.createElement("div", { style:{ display:"flex", alignItems:"center", gap:10 } },
        React.createElement("div", { dangerouslySetInnerHTML:{ __html:`<svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="36" height="36" rx="10" fill="#2d1b5e"/><circle cx="14" cy="11" r="2.5" fill="#a78bfa"/><circle cx="22" cy="11" r="2.5" fill="#a78bfa"/><circle cx="10" cy="17" r="2" fill="#a78bfa"/><circle cx="26" cy="17" r="2" fill="#a78bfa"/><path d="M18 15c-4 0-8 3.2-8 8 0 2.4 1.6 4 3.2 4 1 0 2.4-.8 3.2-.8h3.2c.8 0 2.2.8 3.2.8 1.6 0 3.2-1.6 3.2-4 0-4.8-4-8-8-8z" fill="#7c3aed"/></svg>` } }),
        React.createElement("div", null,
          React.createElement("div", { style:{ fontSize:13, fontWeight:700, color:"#f0f0f5", lineHeight:1 } }, "Companions"),
          React.createElement("div", { style:{ fontSize:10, color:"#a78bfa", letterSpacing:"0.08em", textTransform:"uppercase" } }, "of CPAS")
        )
      )
    ),
    // Nav
    React.createElement("nav", { style:{ flex:1, overflowY:"auto", padding:"12px 10px" } },
      NAV_ITEMS.map(item => {
        const active = view === item.key;
        const isHov = hov === item.key;
        return React.createElement("button", {
          key: item.key,
          onClick: () => onNavigate(item.key),
          onMouseEnter: () => setHov(item.key),
          onMouseLeave: () => setHov(null),
          style:{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"9px 12px", borderRadius:8, border:"none", background: active ? C.purple : (isHov ? C.raised : "transparent"), color: active ? "#fff" : (isHov ? C.text : C.textSec), fontSize:13, fontWeight: active ? 600 : 400, cursor:"pointer", transition:"all .12s", textAlign:"left" }
        },
          React.createElement(Icon, { name:item.icon, size:16 }),
          item.label,
          item.key === "notifications" && notifCount > 0 && React.createElement("span", { style:{ marginLeft:"auto", background:C.red, color:"#fff", borderRadius:99, padding:"1px 6px", fontSize:10, fontWeight:700 } }, notifCount)
        );
      })
    ),
    // User
    React.createElement("div", {
      style:{ padding:"16px 20px", borderTop:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:10, cursor:"pointer" },
      onClick: () => onNavigate("settings")
    },
      React.createElement(Avatar, { name:CPAS.user.name, size:34 }),
      React.createElement("div", { style:{ flex:1, minWidth:0 } },
        React.createElement("div", { style:{ fontSize:13, fontWeight:600, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" } }, CPAS.user.name),
        React.createElement("div", { style:{ fontSize:11, color:C.textSec } }, CPAS.user.role)
      ),
      React.createElement(Icon, { name:"gear", size:15, style:{ color:C.textMut } })
    )
  );
}

// ── TopBar ────────────────────────────────────────────────────────────────────
function TopBar({ onNavigate, notifCount }) {
  const [search, setSearch] = useState("");
  return React.createElement("header", {
    style:{ height:56, background:C.surface, borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", padding:"0 24px", gap:16, position:"sticky", top:0, zIndex:100 }
  },
    React.createElement(Input, { value:search, onChange:setSearch, placeholder:"Search animals, people, records…", icon:"search", style:{ flex:1, maxWidth:420 } }),
    React.createElement("div", { style:{ display:"flex", alignItems:"center", gap:8, marginLeft:"auto" } },
      React.createElement("button", {
        onClick:()=>onNavigate("notifications"),
        style:{ position:"relative", background:"none", border:"none", color:C.textSec, cursor:"pointer", display:"flex", padding:8, borderRadius:8 }
      },
        React.createElement(Icon, { name:"bell", size:20 }),
        notifCount > 0 && React.createElement("span", { style:{ position:"absolute", top:4, right:4, width:8, height:8, borderRadius:"50%", background:C.red, border:`2px solid ${C.surface}` } })
      ),
      React.createElement("button", {
        onClick:()=>onNavigate("notifications"),
        style:{ background:"none", border:"none", color:C.textSec, cursor:"pointer", display:"flex", padding:8, borderRadius:8 }
      }, React.createElement(Icon, { name:"mail", size:20 })),
      React.createElement(Btn, { icon:"plus", onClick:()=>{} }, "Add New")
    )
  );
}

Object.assign(window, { Icon, Avatar, Badge, ProgressBar, Sparkline, StatCard, PageHeader, Btn, Modal, Table, EmptyState, Tabs, Card, Input, Select, Sidebar, TopBar, C, CPAS });
