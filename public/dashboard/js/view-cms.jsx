// ── CMS VIEW ─────────────────────────────────────────────────────────────────
// Tabs: Pages (section editor) | Settings (font picker, brand colors)
// All API calls are real: /api/cms/bootstrap, /api/cms/section/save,
//   /api/cms/publish, /api/cms/brand/config

const FONT_PRESETS = [
  { key:"fraunces_dm",    label:"Editorial",  sub:"Fraunces + DM Sans",          sample:"Every dog deserves a way out." },
  { key:"playfair_inter", label:"Classic",    sub:"Playfair Display + Inter",     sample:"Every dog deserves a way out." },
  { key:"lora_nunito",    label:"Warm",       sub:"Lora + Nunito",                sample:"Every dog deserves a way out." },
  { key:"dm_only",        label:"Clean Sans", sub:"DM Sans (full)",               sample:"Every dog deserves a way out." },
  { key:"cormorant_jost", label:"Luxury",     sub:"Cormorant Garamond + Jost",    sample:"Every dog deserves a way out." },
];

const FONT_IMPORTS = {
  fraunces_dm:    "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,700;1,9..144,300&family=DM+Sans:opsz,wght@9..40,300;9..40,600&display=swap",
  playfair_inter: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Inter:wght@300;400;500;600&display=swap",
  lora_nunito:    "https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&family=Nunito:wght@300;400;600&display=swap",
  dm_only:        "https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,600;9..40,700&display=swap",
  cormorant_jost: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,600;0,700;1,300&family=Jost:wght@300;400;600&display=swap",
};

const FONT_FAMILIES = {
  fraunces_dm:    { display:"Fraunces, Georgia, serif",        body:"DM Sans, system-ui, sans-serif" },
  playfair_inter: { display:"Playfair Display, Georgia, serif", body:"Inter, system-ui, sans-serif" },
  lora_nunito:    { display:"Lora, Georgia, serif",             body:"Nunito, system-ui, sans-serif" },
  dm_only:        { display:"DM Sans, system-ui, sans-serif",   body:"DM Sans, system-ui, sans-serif" },
  cormorant_jost: { display:"Cormorant Garamond, Georgia, serif", body:"Jost, system-ui, sans-serif" },
};

// Inject Google Fonts link tags into dashboard head so samples render
function ensureFontLoaded(key) {
  const id = "gf-" + key;
  if (document.getElementById(id)) return;
  const url = FONT_IMPORTS[key];
  if (!url) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = url;
  document.head.appendChild(link);
}

// ── helpers ───────────────────────────────────────────────────
function Field(label, value, onChange) {
  return React.createElement("label", { style:{ display:"grid", gap:5, color:C.textSec, fontSize:12, fontWeight:700 }},
    label,
    React.createElement("input", {
      value: value || "",
      onChange: e => onChange(e.target.value),
      style:{ width:"100%", padding:"10px 12px", borderRadius:10, border:`1px solid ${C.border}`, background:C.input, color:C.text, outline:"none", fontSize:13 }
    })
  );
}

function TextArea(label, value, onChange) {
  return React.createElement("label", { style:{ display:"grid", gap:5, color:C.textSec, fontSize:12, fontWeight:700 }},
    label,
    React.createElement("textarea", {
      value: value || "",
      rows: 5,
      onChange: e => onChange(e.target.value),
      style:{ width:"100%", padding:"10px 12px", borderRadius:10, border:`1px solid ${C.border}`, background:C.input, color:C.text, outline:"none", resize:"vertical", fontFamily:"inherit", fontSize:13 }
    })
  );
}

function Notice({ text, type }) {
  if (!text) return null;
  const bg = type === "error" ? "rgba(239,68,68,.1)" : "rgba(0,212,143,.08)";
  const col = type === "error" ? "#f87171" : C.good;
  return React.createElement("div", {
    style:{ padding:"10px 14px", borderRadius:12, border:`1px solid ${col}`, background:bg, color:col, fontSize:13, marginBottom:12 }
  }, text);
}

// ── Section Card (left sidebar) ───────────────────────────────
function SectionCard({ s, selected, onClick }) {
  const active = selected?.section_key === s.section_key;
  return React.createElement("button", {
    onClick,
    style:{
      width:"100%", textAlign:"left", padding:"11px 13px", borderRadius:12,
      border:`1px solid ${active ? C.primary : C.border}`,
      background: active ? "rgba(124,58,237,.18)" : C.card,
      color:C.text, cursor:"pointer", marginBottom:7
    }
  },
    React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}},
      React.createElement("b",{style:{fontSize:13,lineHeight:1.3}}, s.heading || s.title || s.section_key),
      React.createElement("span",{style:{fontSize:10,color:s.is_visible===0?"#f87171":C.good}}, s.is_visible===0?"Hidden":"Visible")
    ),
    React.createElement("div",{style:{color:C.textSec,fontSize:11,marginTop:4}}, `${s.section_type} · ${s.section_key}`)
  );
}

// ── Font Picker Card ──────────────────────────────────────────
function FontCard({ preset, active, onSelect, saving }) {
  const { useEffect } = React;
  useEffect(() => { ensureFontLoaded(preset.key); }, [preset.key]);
  const fam = FONT_FAMILIES[preset.key] || {};
  return React.createElement("div", {
    onClick: () => !saving && onSelect(preset.key),
    style:{
      padding:"16px 18px", borderRadius:14, cursor: saving ? "wait" : "pointer",
      border:`2px solid ${active ? C.primary : C.border}`,
      background: active ? "rgba(124,58,237,.12)" : C.card,
      transition:"border-color 150ms, background 150ms",
      position:"relative"
    }
  },
    active && React.createElement("div",{
      style:{ position:"absolute", top:10, right:12, fontSize:11, color:C.primary, fontWeight:700 }
    }, saving ? "Saving…" : "✓ Active"),
    React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:8,marginBottom:8}},
      React.createElement("span",{style:{fontWeight:700,fontSize:13,color:C.text}}, preset.label),
      React.createElement("span",{style:{fontSize:11,color:C.textSec}}, preset.sub)
    ),
    React.createElement("div",{
      style:{ fontFamily:fam.display || "serif", fontSize:22, lineHeight:1.15, color:C.text, letterSpacing:"-0.02em" }
    }, preset.sample),
    React.createElement("div",{
      style:{ fontFamily:fam.body || "sans-serif", fontSize:12, color:C.textSec, marginTop:6 }
    }, "Body text — clear, readable, balanced.")
  );
}

// ── Main CMS View ─────────────────────────────────────────────
function CMSView({ onNavigate }) {
  const { useEffect, useMemo, useState } = React;

  // shared state
  const [boot, setBoot] = useState({ pages:[], brand:null });
  const [tab, setTab] = useState("pages"); // "pages" | "settings"
  const [notice, setNotice] = useState({ text:"", type:"" });
  const [busy, setBusy] = useState(false);

  // pages tab
  const [route, setRoute] = useState("/");
  const [pageData, setPageData] = useState({ page:null, sections:[], blocks:[] });
  const [selectedKey, setSelectedKey] = useState(null);
  const [mode, setMode] = useState("desktop");

  // settings tab
  const [activeFont, setActiveFont] = useState("fraunces_dm");
  const [fontSaving, setFontSaving] = useState(false);

  const notify = (text, type="success") => {
    setNotice({ text, type });
    setTimeout(() => setNotice({ text:"", type:"" }), 4000);
  };

  // ── Load bootstrap ──
  const loadBoot = async () => {
    try {
      const res = await fetch("/api/cms/bootstrap", { credentials:"include" });
      const data = await res.json();
      if (data.success) {
        setBoot(data);
        // parse active font from brand config_json
        const cfg = (() => { try { return JSON.parse(data.brand?.config_json || "{}"); } catch { return {}; } })();
        setActiveFont(cfg.active_font_preset || "fraunces_dm");
      }
    } catch(e) { notify("Failed to load CMS data: " + e.message, "error"); }
  };

  // ── Load page sections ──
  const loadPage = async (r = route) => {
    try {
      const res = await fetch(`/api/cms/page?route=${encodeURIComponent(r)}`, { credentials:"include" });
      const data = await res.json();
      if (data.success) {
        setPageData(data);
        setSelectedKey((data.sections || [])[0]?.section_key || null);
      }
    } catch {}
  };

  useEffect(() => { loadBoot(); }, []);
  useEffect(() => { if (tab === "pages") loadPage(route); }, [route, tab]);

  const pages = boot.pages?.length ? boot.pages : [
    { route_path:"/", title:"Home", status:"published" },
    { route_path:"/about", title:"About", status:"published" },
    { route_path:"/adopt", title:"Adopt", status:"published" },
    { route_path:"/services", title:"Foster", status:"published" },
    { route_path:"/donate", title:"Donate", status:"published" },
    { route_path:"/community", title:"Community", status:"published" },
  ];

  const selected = useMemo(
    () => (pageData.sections || []).find(s => s.section_key === selectedKey) || null,
    [pageData, selectedKey]
  );

  const setField = (key, val) => {
    if (!selected) return;
    setPageData(prev => ({
      ...prev,
      sections: prev.sections.map(s => s.section_key === selected.section_key ? { ...s, [key]: val } : s)
    }));
  };

  // ── Save section draft ──
  const saveSection = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const res = await fetch("/api/cms/section/save", {
        method:"POST", credentials:"include",
        headers:{ "content-type":"application/json" },
        body: JSON.stringify({ section: selected })
      });
      const data = await res.json();
      notify(data.success ? "Section saved." : (data.error || "Save failed."), data.success ? "success" : "error");
      if (data.success) { await loadBoot(); await loadPage(route); }
    } catch(e) { notify("Save failed: " + e.message, "error"); }
    setBusy(false);
  };

  // ── Publish page ──
  const publishPage = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/cms/publish", {
        method:"POST", credentials:"include",
        headers:{ "content-type":"application/json" },
        body: JSON.stringify({ route_path: route })
      });
      const data = await res.json();
      notify(data.success ? `Published ${route} — live in ~5s.` : (data.error || "Publish failed."), data.success ? "success" : "error");
      if (data.success) await loadBoot();
    } catch(e) { notify("Publish failed: " + e.message, "error"); }
    setBusy(false);
  };

  // ── Save font preset ──
  const saveFont = async (key) => {
    setFontSaving(true);
    setActiveFont(key); // optimistic
    try {
      const res = await fetch("/api/cms/brand/config", {
        method:"POST", credentials:"include",
        headers:{ "content-type":"application/json" },
        body: JSON.stringify({ active_font_preset: key })
      });
      const data = await res.json();
      if (data.success) {
        notify(`Font set to "${FONT_PRESETS.find(p=>p.key===key)?.label}". Re-publish pages to apply.`);
      } else {
        notify(data.error || "Font save failed.", "error");
        setActiveFont(activeFont); // rollback
      }
    } catch(e) { notify("Font save failed: " + e.message, "error"); }
    setFontSaving(false);
  };

  const previewWidth = mode === "mobile" ? 390 : mode === "tablet" ? 768 : "100%";
  const pageTitle = pageData.page?.title || pages.find(p => p.route_path === route)?.title || "Page";

  // ── Tab bar ──
  const tabBar = React.createElement("div",{style:{display:"flex",gap:6,marginBottom:16}},
    ["pages","settings"].map(t =>
      React.createElement("button",{
        key:t, onClick:()=>setTab(t),
        style:{
          padding:"8px 18px", borderRadius:10, fontSize:13, fontWeight:700, cursor:"pointer",
          border:`1px solid ${tab===t ? C.primary : C.border}`,
          background: tab===t ? "rgba(124,58,237,.18)" : C.card,
          color: tab===t ? C.text : C.textSec
        }
      }, t === "pages" ? "Pages" : "Site Settings")
    )
  );

  // ── PAGES TAB ──────────────────────────────────────────────
  const pagesTab = React.createElement("div",{style:{display:"grid",gridTemplateColumns:"240px minmax(400px,1fr) 320px",gap:14,alignItems:"start"}},

    // Left: page list + section list
    React.createElement(Card,{style:{padding:10,position:"sticky",top:12}},
      React.createElement("div",{style:{fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:C.textSec,fontWeight:800,margin:"4px 6px 10px"}},"Pages"),
      pages.map(p => React.createElement("button",{
        key:p.route_path, onClick:()=>setRoute(p.route_path),
        style:{
          width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center",
          padding:"10px 10px", borderRadius:10, marginBottom:4,
          border:"1px solid transparent",
          background: p.route_path===route ? "rgba(124,58,237,.22)" : "transparent",
          color: p.route_path===route ? C.text : C.textSec,
          cursor:"pointer", fontWeight:700, fontSize:13
        }
      },
        React.createElement("span",null, p.title || p.route_path),
        React.createElement("span",{style:{fontSize:10,padding:"2px 6px",borderRadius:99,background:C.pill,color:C.textSec}}, p.status||"draft")
      )),

      React.createElement("div",{style:{height:1,background:C.border,margin:"12px 0"}}),
      React.createElement("div",{style:{fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:C.textSec,fontWeight:800,margin:"4px 6px 10px"}},"Sections"),
      pageData.sections?.length
        ? pageData.sections.map(s => React.createElement(SectionCard,{key:s.section_key,s,selected,onClick:()=>setSelectedKey(s.section_key)}))
        : React.createElement("p",{style:{color:C.textSec,fontSize:12,padding:6}},"No sections.")
    ),

    // Center: preview
    React.createElement("div",null,
      React.createElement(Card,{style:{padding:12,marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center"}},
        React.createElement("div",null,
          React.createElement("div",{style:{fontSize:11,color:C.textSec}},"Editing"),
          React.createElement("h2",{style:{margin:"2px 0 0",fontSize:20}}, pageTitle)
        ),
        React.createElement("div",{style:{display:"flex",gap:6}},
          ["desktop","tablet","mobile"].map(m => React.createElement(Btn,{
            key:m, size:"sm", variant:mode===m?"primary":"secondary", onClick:()=>setMode(m)
          }, m[0].toUpperCase()+m.slice(1))),
          React.createElement(Btn,{size:"sm",variant:"secondary",onClick:()=>window.open(route==="/"?"/":route,"_blank")},"Preview"),
          React.createElement(Btn,{size:"sm",onClick:publishPage,disabled:busy},"Publish")
        )
      ),
      React.createElement(Card,{style:{padding:10,minHeight:500,overflow:"auto"}},
        React.createElement("div",{style:{
          width:previewWidth, maxWidth:"100%", margin:"0 auto",
          border:`1px solid ${C.border}`, borderRadius:18, overflow:"hidden",
          background:"#090d18", minHeight:480
        }},
          // Mock header
          React.createElement("div",{style:{padding:"14px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(255,255,255,.03)"}},
            React.createElement("img",{src:"https://imagedelivery.net/g7wf09fCONpnidkRnR_5vw/b82e15b1-05e1-454c-85ca-a92f8eee2100/avatar",style:{height:36,objectFit:"contain"}}),
            React.createElement("div",{style:{display:"flex",gap:14,fontSize:12,color:C.textSec,fontWeight:600}},
              "Home","About","Foster","Adopt","Donate"
            )
          ),
          // Sections
          pageData.sections?.length ? pageData.sections.map(s =>
            React.createElement("div",{
              key:s.section_key, onClick:()=>setSelectedKey(s.section_key),
              style:{
                padding:"20px 24px", borderBottom:`1px solid ${C.border}`, cursor:"pointer",
                outline:selectedKey===s.section_key?`2px solid ${C.primary}`:"none",
                background:selectedKey===s.section_key?"rgba(124,58,237,.07)":"transparent"
              }
            },
              s.eyebrow && React.createElement("div",{style:{color:"#a78bfa",fontSize:10,fontWeight:800,letterSpacing:".15em",textTransform:"uppercase",marginBottom:6}}, s.eyebrow),
              React.createElement("div",{style:{fontSize:mode==="mobile"?20:28,fontWeight:800,letterSpacing:"-.03em",lineHeight:1.1,color:"#f0ece6",marginBottom:8}}, s.heading||s.title||s.section_key),
              s.body && React.createElement("p",{style:{fontSize:12,color:"#9ca3af",lineHeight:1.6,maxWidth:640,margin:0}}, s.body.slice(0,160)+(s.body.length>160?"…":"")),
              s.image_url && React.createElement("img",{src:s.image_url,style:{width:"100%",maxHeight:180,objectFit:"cover",borderRadius:12,marginTop:10}}),
              (s.cta_label||s.cta_secondary_label) && React.createElement("div",{style:{display:"flex",gap:8,marginTop:12}},
                s.cta_label && React.createElement("span",{style:{padding:"7px 14px",borderRadius:9,background:"#7c3aed",color:"#fff",fontSize:12,fontWeight:700}},s.cta_label),
                s.cta_secondary_label && React.createElement("span",{style:{padding:"7px 14px",borderRadius:9,border:`1px solid ${C.border}`,fontSize:12,fontWeight:700,color:C.textSec}},s.cta_secondary_label)
              )
            )
          ) : React.createElement("div",{style:{padding:40,textAlign:"center",color:C.textSec}},"No sections")
        )
      )
    ),

    // Right: inspector
    React.createElement(Card,{style:{padding:14,position:"sticky",top:12}},
      React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}},
        React.createElement("div",null,
          React.createElement("div",{style:{fontSize:10,color:C.textSec,textTransform:"uppercase",letterSpacing:".14em",fontWeight:800}},"Inspector"),
          React.createElement("h3",{style:{margin:"4px 0 0",fontSize:15}}, selected ? (selected.heading||selected.section_key) : "Select section")
        ),
        selected && React.createElement("label",{style:{fontSize:12,color:C.textSec,display:"flex",gap:6,alignItems:"center",cursor:"pointer"}},
          React.createElement("input",{type:"checkbox",checked:selected.is_visible!==0,onChange:e=>setField("is_visible",e.target.checked?1:0)}),
          "Visible"
        )
      ),

      selected ? React.createElement("div",{style:{display:"grid",gap:9}},
        Field("Eyebrow", selected.eyebrow||"", v=>setField("eyebrow",v)),
        Field("Heading", selected.heading||selected.title||"", v=>setField("heading",v)),
        Field("Subheading", selected.subheading||"", v=>setField("subheading",v)),
        TextArea("Body", selected.body||"", v=>setField("body",v)),
        Field("Image URL", selected.image_url||"", v=>setField("image_url",v)),
        Field("Primary CTA Label", selected.cta_label||"", v=>setField("cta_label",v)),
        Field("Primary CTA Link", selected.cta_href||"", v=>setField("cta_href",v)),
        Field("Secondary CTA Label", selected.cta_secondary_label||"", v=>setField("cta_secondary_label",v)),
        Field("Secondary CTA Link", selected.cta_secondary_href||"", v=>setField("cta_secondary_href",v)),
        React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:4}},
          React.createElement(Btn,{variant:"secondary",onClick:()=>window.open(route==="/"?"/":route,"_blank")},"Preview"),
          React.createElement(Btn,{onClick:saveSection,disabled:busy},busy?"Saving…":"Save Draft")
        ),
        React.createElement("button",{
          onClick:()=>window.dispatchEvent(new Event("agentsam:open")),
          style:{marginTop:6,padding:"10px 12px",borderRadius:12,border:`1px solid ${C.border}`,background:"rgba(124,58,237,.1)",color:C.text,fontWeight:700,cursor:"pointer",fontSize:13,width:"100%"}
        },"Ask Agent Sam to improve this section")
      ) : React.createElement("p",{style:{color:C.textSec,fontSize:13}},"Click a section to edit.")
    )
  );

  // ── SETTINGS TAB ───────────────────────────────────────────
  const settingsTab = React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr",gap:16,maxWidth:800}},

    React.createElement(Card,{style:{padding:20}},
      React.createElement("div",{style:{marginBottom:16}},
        React.createElement("h3",{style:{margin:"0 0 4px",fontSize:17}},"Font Preset"),
        React.createElement("p",{style:{color:C.textSec,fontSize:13,margin:0}},
          "Choose the display + body font pair for the public site. Click to apply — then re-publish any pages to push the change live."
        )
      ),
      React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}},
        FONT_PRESETS.map(preset =>
          React.createElement(FontCard,{
            key:preset.key, preset, active:activeFont===preset.key,
            onSelect:saveFont, saving:fontSaving && activeFont===preset.key
          })
        )
      ),
      activeFont !== "fraunces_dm" && React.createElement("div",{style:{marginTop:14,padding:"10px 14px",borderRadius:10,background:"rgba(124,58,237,.1)",border:`1px solid ${C.primary}`,fontSize:13,color:C.textSec}},
        "⚡ Font changed. Go to Pages tab → select each page → click ",
        React.createElement("strong",{style:{color:C.text}},"Publish"),
        " to push font to the live site."
      )
    ),

    React.createElement(Card,{style:{padding:20}},
      React.createElement("h3",{style:{margin:"0 0 12px",fontSize:17}},"Quick Publish All"),
      React.createElement("p",{style:{color:C.textSec,fontSize:13,marginBottom:14}},"Re-render and publish all pages at once — useful after font or global changes."),
      React.createElement("div",{style:{display:"flex",gap:10,flexWrap:"wrap"}},
        ["/","/about","/adopt","/services","/donate","/community"].map(r =>
          React.createElement(Btn,{
            key:r, size:"sm", variant:"secondary", disabled:busy,
            onClick:async ()=>{
              setBusy(true);
              const res = await fetch("/api/cms/publish",{method:"POST",credentials:"include",headers:{"content-type":"application/json"},body:JSON.stringify({route_path:r})});
              const d = await res.json();
              notify(d.success ? `Published ${r}` : (d.error||"Failed"), d.success?"success":"error");
              setBusy(false);
            }
          }, r === "/" ? "Home" : r.slice(1)[0].toUpperCase()+r.slice(2))
        )
      )
    )
  );

  return React.createElement("div",{style:{padding:"4px 0"}},
    React.createElement(Notice,{text:notice.text, type:notice.type}),
    tabBar,
    tab === "pages" ? pagesTab : settingsTab
  );
}

window.CMSView = CMSView;
