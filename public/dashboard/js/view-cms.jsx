function CMSPageShell({ children }) {
  return React.createElement("div", { style:{ minHeight:"100%", width:"100%" } }, children);
}

function CMSView({ onNavigate }) {
  const { useEffect, useMemo, useState } = React;
  const [boot, setBoot] = useState({ pages:[], assets:[], nav:[], themes:[], brand:null });
  const [route, setRoute] = useState("/");
  const [pageData, setPageData] = useState({ page:null, sections:[], blocks:[] });
  const [selectedKey, setSelectedKey] = useState(null);
  const [mode, setMode] = useState("desktop");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const loadBoot = async () => {
    const res = await fetch("/api/cms/bootstrap", { credentials:"include" });
    const data = await res.json();
    if (data.success) setBoot(data);
  };

  const loadPage = async (nextRoute = route) => {
    const res = await fetch(`/api/cms/page?route=${encodeURIComponent(nextRoute)}`, { credentials:"include" });
    const data = await res.json();
    if (data.success) {
      setPageData(data);
      setSelectedKey((data.sections || [])[0]?.section_key || null);
    }
  };

  useEffect(() => { loadBoot(); }, []);
  useEffect(() => { loadPage(route); }, [route]);

  const pages = boot.pages?.length ? boot.pages : [
    { route_path:"/", title:"Homepage", status:"published" },
    { route_path:"/about", title:"About", status:"published" },
    { route_path:"/adopt", title:"Adopt", status:"published" },
    { route_path:"/services", title:"Services", status:"published" },
    { route_path:"/donate", title:"Donate", status:"published" },
  ];

  const selected = useMemo(
    () => (pageData.sections || []).find(s => s.section_key === selectedKey) || (pageData.sections || [])[0] || null,
    [pageData, selectedKey]
  );

  const setSelectedField = (key, val) => {
    if (!selected) return;
    setPageData(prev => ({
      ...prev,
      sections: prev.sections.map(s => s.section_key === selected.section_key ? { ...s, [key]: val } : s)
    }));
  };

  const saveSection = async () => {
    if (!selected) return;
    setBusy(true);
    setNotice("");
    try {
      const res = await fetch("/api/cms/section/save", {
        method:"POST",
        credentials:"include",
        headers:{ "content-type":"application/json" },
        body: JSON.stringify({ section:selected })
      });
      const data = await res.json();
      setNotice(data.success ? "Saved draft section." : (data.error || "Save failed."));
      await loadBoot();
      await loadPage(route);
    } catch(e) {
      setNotice("Save failed: " + e.message);
    }
    setBusy(false);
  };

  const publishPage = async () => {
    setBusy(true);
    setNotice("");
    try {
      const res = await fetch("/api/cms/publish", {
        method:"POST",
        credentials:"include",
        headers:{ "content-type":"application/json" },
        body: JSON.stringify({ route_path:route })
      });
      const data = await res.json();
      setNotice(data.success ? "Published page status." : (data.error || "Publish failed."));
      await loadBoot();
      await loadPage(route);
    } catch(e) {
      setNotice("Publish failed: " + e.message);
    }
    setBusy(false);
  };

  const openPreview = () => window.open(route === "/" ? "/" : route, "_blank");

  const previewWidth = mode === "mobile" ? 390 : mode === "tablet" ? 760 : "100%";

  const pageTitle = pageData.page?.title || pages.find(p => p.route_path === route)?.title || "Page";

  const sectionCard = (s) => React.createElement("button", {
    key:s.section_key,
    onClick:()=>setSelectedKey(s.section_key),
    style:{
      width:"100%", textAlign:"left", padding:"12px 13px", borderRadius:14,
      border:`1px solid ${selectedKey===s.section_key ? C.primary : C.border}`,
      background:selectedKey===s.section_key ? "rgba(124,58,237,.22)" : C.card,
      color:C.text, cursor:"pointer", marginBottom:8
    }
  },
    React.createElement("div", { style:{ display:"flex", justifyContent:"space-between", gap:10, alignItems:"center" }},
      React.createElement("b", { style:{ fontSize:13 } }, s.heading || s.title || s.section_key),
      React.createElement("span", { style:{ color:s.is_visible===0 ? C.textSec : C.good, fontSize:11 } }, s.is_visible===0 ? "Hidden" : "Visible")
    ),
    React.createElement("div", { style:{ color:C.textSec, fontSize:11, marginTop:5 } }, `${s.section_type || "section"} · ${s.section_key}`)
  );

  const emptyState = React.createElement(Card, { style:{ padding:30, textAlign:"center" }},
    React.createElement("h3", { style:{ margin:"0 0 8px" } }, "No sections yet"),
    React.createElement("p", { style:{ color:C.textSec, margin:0 } }, "Seed cms_page_sections or add a section template next.")
  );

  return React.createElement(CMSPageShell, {
    title:"CMS Website",
    subtitle:"Shopify-style no-code editor for public pages, sections, assets, and publishing.",
    action: React.createElement("div", { style:{ display:"flex", gap:10 }},
      React.createElement(Btn,{variant:"secondary",size:"sm",icon:"eye",onClick:openPreview},"Preview Site"),
      React.createElement(Btn,{size:"sm",icon:"check2",onClick:publishPage,disabled:busy},"Publish Changes")
    )
  },
    notice && React.createElement("div", {
      style:{ marginBottom:14, padding:"10px 12px", border:`1px solid ${C.border}`, borderRadius:14, color:C.good, background:"rgba(0,212,143,.08)" }
    }, notice),

    React.createElement("div", { style:{ display:"grid", gridTemplateColumns:"260px minmax(420px, 1fr) 340px", gap:16, alignItems:"start" }},

      React.createElement(Card, { style:{ padding:12, position:"sticky", top:12 }},
        React.createElement("div",{style:{fontSize:11,letterSpacing:".12em",textTransform:"uppercase",color:C.textSec,fontWeight:800,margin:"6px 8px 12px"}},"Pages"),
        pages.map(p => React.createElement("button", {
          key:p.route_path,
          onClick:()=>setRoute(p.route_path),
          style:{
            width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center",
            padding:"12px 11px", borderRadius:12, marginBottom:6,
            border:"1px solid transparent",
            background:p.route_path===route ? "rgba(124,58,237,.28)" : "transparent",
            color:p.route_path===route ? C.text : C.textSec,
            cursor:"pointer", fontWeight:700
          }
        },
          React.createElement("span", null, p.title),
          React.createElement("span", { style:{ fontSize:10, padding:"3px 7px", borderRadius:99, background:C.pill, color:C.textSec } }, p.status || "draft")
        )),

        React.createElement("div",{style:{height:1,background:C.border,margin:"14px 0"}}),
        React.createElement("div",{style:{fontSize:11,letterSpacing:".12em",textTransform:"uppercase",color:C.textSec,fontWeight:800,margin:"6px 8px 12px"}},"Sections"),
        (pageData.sections || []).length ? pageData.sections.map(sectionCard) : React.createElement("p",{style:{color:C.textSec,fontSize:12,padding:8}},"No editable sections found.")
      ),

      React.createElement("div", null,
        React.createElement(Card, { style:{ padding:14, marginBottom:12, display:"flex", justifyContent:"space-between", alignItems:"center" }},
          React.createElement("div", null,
            React.createElement("div",{style:{fontSize:12,color:C.textSec}},"Currently editing"),
            React.createElement("h2",{style:{margin:"2px 0 0",fontSize:22}}, pageTitle)
          ),
          React.createElement("div",{style:{display:"flex",gap:8}},
            ["desktop","tablet","mobile"].map(m => React.createElement(Btn,{
              key:m, size:"sm", variant:mode===m ? "primary" : "secondary", onClick:()=>setMode(m)
            }, m[0].toUpperCase()+m.slice(1)))
          )
        ),

        React.createElement(Card, { style:{ padding:14, minHeight:560, overflow:"hidden" }},
          React.createElement("div", {
            style:{
              width:previewWidth, maxWidth:"100%", margin:"0 auto", minHeight:520,
              border:`1px solid ${C.border}`, borderRadius:22, overflow:"hidden",
              background:"linear-gradient(135deg,#090d16,#121b2b 55%,#102b34)"
            }
          },
            React.createElement("div",{style:{padding:18,borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}},
              React.createElement("img",{src:"https://imagedelivery.net/g7wf09fCONpnidkRnR_5vw/b82e15b1-05e1-454c-85ca-a92f8eee2100/avatar",style:{width:84,height:50,objectFit:"contain"}}),
              React.createElement("div",{style:{display:"flex",gap:16,color:C.textSec,fontWeight:800,fontSize:12}}, "Home", "About", "Adopt", "Donate")
            ),
            (pageData.sections || []).length ? pageData.sections.map(s => React.createElement("section", {
              key:s.section_key,
              onClick:()=>setSelectedKey(s.section_key),
              style:{
                padding:24, borderBottom:`1px solid ${C.border}`, cursor:"pointer",
                outline:selectedKey===s.section_key ? `2px solid ${C.primary}` : "none",
                background:selectedKey===s.section_key ? "rgba(124,58,237,.08)" : "transparent"
              }
            },
              s.eyebrow && React.createElement("div",{style:{color:"#ff4d5e",fontSize:11,fontWeight:900,letterSpacing:".18em",textTransform:"uppercase",marginBottom:10}},s.eyebrow),
              React.createElement("h1",{style:{fontSize:mode==="mobile"?32:46,lineHeight:".95",letterSpacing:"-.055em",margin:"0 0 12px"}},s.heading || s.title || s.section_key),
              s.subheading && React.createElement("p",{style:{fontSize:18,color:"#c7c6d6",lineHeight:1.5,maxWidth:720}},s.subheading),
              s.body && React.createElement("p",{style:{color:"#a9a7bd",lineHeight:1.6,maxWidth:740}},s.body),
              s.image_url && React.createElement("img",{src:s.image_url,style:{width:"100%",maxHeight:260,objectFit:"cover",borderRadius:20,marginTop:14}}),
              (s.cta_label || s.cta_secondary_label) && React.createElement("div",{style:{display:"flex",gap:10,marginTop:16}},
                s.cta_label && React.createElement("span",{style:{padding:"10px 14px",borderRadius:12,background:C.primary,color:"#fff",fontWeight:800}},s.cta_label),
                s.cta_secondary_label && React.createElement("span",{style:{padding:"10px 14px",borderRadius:12,background:C.card,border:`1px solid ${C.border}`,fontWeight:800}},s.cta_secondary_label)
              )
            )) : emptyState
          )
        )
      ),

      React.createElement(Card, { style:{ padding:16, position:"sticky", top:12 }},
        React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}},
          React.createElement("div", null,
            React.createElement("div",{style:{fontSize:11,color:C.textSec,textTransform:"uppercase",letterSpacing:".12em",fontWeight:900}},"Inspector"),
            React.createElement("h3",{style:{margin:"4px 0 0"}}, selected ? (selected.heading || selected.section_key) : "Select section")
          ),
          selected && React.createElement("label",{style:{fontSize:12,color:C.textSec,display:"flex",gap:6,alignItems:"center"}},
            React.createElement("input",{type:"checkbox",checked:selected.is_visible!==0,onChange:e=>setSelectedField("is_visible",e.target.checked?1:0)}),
            "Visible"
          )
        ),

        selected ? React.createElement("div", { style:{ display:"grid", gap:10 }},
          Field("Eyebrow", selected.eyebrow || "", v=>setSelectedField("eyebrow",v)),
          Field("Heading", selected.heading || selected.title || "", v=>setSelectedField("heading",v)),
          Field("Subheading", selected.subheading || "", v=>setSelectedField("subheading",v)),
          TextArea("Body", selected.body || "", v=>setSelectedField("body",v)),
          Field("Image URL", selected.image_url || "", v=>setSelectedField("image_url",v)),
          Field("Primary CTA Label", selected.cta_label || "", v=>setSelectedField("cta_label",v)),
          Field("Primary CTA Link", selected.cta_href || "", v=>setSelectedField("cta_href",v)),
          Field("Secondary CTA Label", selected.cta_secondary_label || "", v=>setSelectedField("cta_secondary_label",v)),
          Field("Secondary CTA Link", selected.cta_secondary_href || "", v=>setSelectedField("cta_secondary_href",v)),
          React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:6}},
            React.createElement(Btn,{variant:"secondary",icon:"eye",onClick:openPreview},"Preview"),
            React.createElement(Btn,{icon:"check2",onClick:saveSection,disabled:busy},busy?"Saving...":"Save Draft")
          ),
          React.createElement("button",{
            onClick:()=>window.dispatchEvent(new Event("agentsam:open")),
            style:{marginTop:8,padding:12,borderRadius:14,border:`1px solid ${C.border}`,background:"rgba(124,58,237,.12)",color:C.text,fontWeight:800,cursor:"pointer"}
          },"Ask Agent Sam to improve this section")
        ) : React.createElement("p",{style:{color:C.textSec}},"Select a section from the left or center preview.")
      )
    )
  );
}

function Field(label, value, onChange) {
  return React.createElement("label", { style:{ display:"grid", gap:6, color:C.textSec, fontSize:12, fontWeight:800 }},
    label,
    React.createElement("input", {
      value:value || "",
      onChange:e=>onChange(e.target.value),
      style:{ width:"100%", padding:"11px 12px", borderRadius:12, border:`1px solid ${C.border}`, background:C.input, color:C.text, outline:"none" }
    })
  );
}

function TextArea(label, value, onChange) {
  return React.createElement("label", { style:{ display:"grid", gap:6, color:C.textSec, fontSize:12, fontWeight:800 }},
    label,
    React.createElement("textarea", {
      value:value || "",
      rows:5,
      onChange:e=>onChange(e.target.value),
      style:{ width:"100%", padding:"11px 12px", borderRadius:12, border:`1px solid ${C.border}`, background:C.input, color:C.text, outline:"none", resize:"vertical", fontFamily:"inherit" }
    })
  );
}

window.CMSView = CMSView;
