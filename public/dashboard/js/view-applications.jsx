// ─── Applications List + Application Detail ──────────────────────────────────

function ApplicationsView({ onNavigate }) {
  const [tab, setTab] = useState("All");
  const [search, setSearch] = useState("");

  const counts = {
    All: CPAS.applications.length,
    Pending: CPAS.applications.filter(a=>a.status==="Pending").length,
    "Under Review": CPAS.applications.filter(a=>a.status==="Under Review").length,
    Approved: CPAS.applications.filter(a=>a.status==="Approved").length,
    Denied: CPAS.applications.filter(a=>a.status==="Denied").length,
  };

  const filtered = CPAS.applications.filter(a => {
    const matchTab = tab === "All" || a.status === tab;
    const matchSearch = !search || a.applicant.toLowerCase().includes(search.toLowerCase()) || a.id.toLowerCase().includes(search.toLowerCase()) || a.animalName.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  return React.createElement("div", { className: "dash-page" },
    React.createElement(PageHeader, {
      title:"Applications",
      subtitle:"Foster and adoption applications",
      action: React.createElement("div", { style:{display:"flex",gap:8} },
        React.createElement(Btn, { variant:"secondary", size:"sm", icon:"download" }, "Export"),
        React.createElement(Btn, { icon:"plus", size:"sm" }, "New Application")
      )
    }),

    React.createElement("div", { style:{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:24 } },
      React.createElement(StatCard, { icon:"📋", label:"Total",       value:counts.All }),
      React.createElement(StatCard, { icon:"⏳", label:"Pending",     value:counts.Pending,         sub:"Needs review", subPositive:false }),
      React.createElement(StatCard, { icon:"✅", label:"Approved",    value:counts.Approved,        sub:"This month",  subPositive:true }),
      React.createElement(StatCard, { icon:"🔍", label:"Under Review",value:counts["Under Review"] }),
    ),

    React.createElement("div", { style:{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12, marginBottom:4 } },
      React.createElement(Tabs, {
        tabs: Object.entries(counts).map(([k,v])=>({ value:k, label:k, count:v })),
        active:tab, onChange:setTab
      }),
      React.createElement(Input, { value:search, onChange:setSearch, placeholder:"Search…", icon:"search", style:{ width:220 } })
    ),

    React.createElement(Card, { style:{ overflow:"hidden", marginTop:16 } },
      React.createElement(Table, {
        cols:[
          { key:"id",        label:"ID",        render:v=>React.createElement("span",{style:{color:C.textSec,fontFamily:"monospace",fontSize:12}},v) },
          { key:"applicant", label:"Applicant",  render:v=>React.createElement("span",{style:{fontWeight:600}},v) },
          { key:"type",      label:"Type",       render:v=>React.createElement(Badge,{label:v}) },
          { key:"animalName",label:"Animal" },
          { key:"status",    label:"Status",     render:v=>React.createElement(Badge,{label:v,dot:true}) },
          { key:"date",      label:"Submitted",  render:v=>React.createElement("span",{style:{color:C.textSec,fontSize:12}},v) },
          { key:"homeType",  label:"Home",       render:v=>React.createElement("span",{style:{color:C.textSec}},v) },
          { key:"id",        label:"",           render:(v,row)=>React.createElement(Btn,{size:"sm",variant:"ghost",icon:"eye",onClick:e=>{e.stopPropagation();onNavigate("application-detail",{appId:row.id});}},"Review") },
        ],
        rows: filtered,
        onRowClick: row => onNavigate("application-detail", { appId: row.id })
      })
    )
  );
}

// ─── Application Detail ───────────────────────────────────────────────────────
function ApplicationDetailView({ appId, onNavigate }) {
  const app = CPAS.applications.find(a => a.id === appId) || CPAS.applications[0];
  const animal = CPAS.animals.find(a => a.id === app.animalId);
  const [status, setStatus] = useState(app.status);
  const [note, setNote] = useState("");
  const [notes, setNotes] = useState(app.notes ? [{ author:"System", time:"On submission", text:app.notes }] : []);

  const statusActions = [
    { label:"Approve",        variant:"success", newStatus:"Approved" },
    { label:"Deny",           variant:"danger",  newStatus:"Denied" },
    { label:"Move to Review", variant:"secondary",newStatus:"Under Review" },
  ].filter(a => a.newStatus !== status);

  const row = (label, value) => React.createElement("div", { key:label,
    style:{ display:"flex", gap:8, padding:"9px 0", borderBottom:`1px solid ${C.border}` } },
    React.createElement("span", { style:{ width:130, fontSize:12, color:C.textSec, flexShrink:0 } }, label),
    React.createElement("span", { style:{ fontSize:12, color:C.text, fontWeight:500 } }, value ?? "—")
  );

  return React.createElement("div", { className: "dash-page" },
    React.createElement(PageHeader, {
      title: app.id,
      back:"Back to Applications",
      onBack:()=>onNavigate("applications"),
      action: React.createElement("div", { style:{display:"flex",gap:8,alignItems:"center"} },
        React.createElement(Badge, { label:status, dot:true }),
        ...statusActions.map(a =>
          React.createElement(Btn, { key:a.label, variant:a.variant, size:"sm", onClick:()=>setStatus(a.newStatus) }, a.label)
        )
      )
    }),

    React.createElement("div", { style:{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 } },
      // Applicant info
      React.createElement(Card, { style:{ padding:20 } },
        React.createElement("h3", { style:{ margin:"0 0 14px", fontSize:14, fontWeight:600, color:C.text } }, "Applicant Information"),
        React.createElement("div", { style:{ display:"flex", alignItems:"center", gap:12, padding:"12px 0 14px", borderBottom:`1px solid ${C.border}`, marginBottom:4 } },
          React.createElement(Avatar, { name:app.applicant, size:44 }),
          React.createElement("div", null,
            React.createElement("div", { style:{ fontSize:15, fontWeight:700, color:C.text } }, app.applicant),
            React.createElement("div", { style:{ fontSize:12, color:C.textSec } }, `Application ${app.id} · Submitted ${app.date}`)
          )
        ),
        row("Email",      app.email),
        row("Phone",      app.phone),
        row("Home Type",  app.homeType),
        row("Has Yard",   app.hasYard ? "Yes" : "No"),
        row("Other Pets", app.otherPets),
        row("Experience", app.experience ? "Yes — has experience" : "No prior experience"),
      ),

      // Animal info
      React.createElement(Card, { style:{ padding:20 } },
        React.createElement("h3", { style:{ margin:"0 0 14px", fontSize:14, fontWeight:600, color:C.text } }, "Animal Requested"),
        animal && React.createElement("div", { style:{ display:"flex", alignItems:"center", gap:12, padding:"0 0 14px", borderBottom:`1px solid ${C.border}`, marginBottom:4, cursor:"pointer" }, onClick:()=>onNavigate("animal-profile",{animalId:animal.id}) },
          React.createElement("img", { src:animal.photo, alt:animal.name, style:{ width:56, height:56, borderRadius:10, objectFit:"cover", border:`1px solid ${C.border}` }, onError:e=>{e.target.style.opacity=0;} }),
          React.createElement("div", null,
            React.createElement("div", { style:{ fontSize:15, fontWeight:700, color:C.text } }, animal.name),
            React.createElement("div", { style:{ fontSize:12, color:C.textSec } }, `${animal.species} · ${animal.breed}`),
            React.createElement("div", { style:{ marginTop:4 } }, React.createElement(Badge, { label:animal.status, dot:true }))
          )
        ),
        row("Animal ID",  app.animalId),
        row("App Type",   app.type),
        row("Status",     status),
        row("Submitted",  app.date),
      )
    ),

    // Notes
    React.createElement(Card, { style:{ padding:20 } },
      React.createElement("h3", { style:{ margin:"0 0 14px", fontSize:14, fontWeight:600, color:C.text } }, "Notes & Communication"),
      notes.length > 0 && React.createElement("div", { style:{ marginBottom:16, display:"flex", flexDirection:"column", gap:10 } },
        notes.map((n,i) =>
          React.createElement("div", { key:i, style:{ background:C.raised, border:`1px solid ${C.border}`, borderRadius:8, padding:12 } },
            React.createElement("div", { style:{ display:"flex", justifyContent:"space-between", marginBottom:6 } },
              React.createElement("span", { style:{ fontSize:12, fontWeight:600, color:C.purpleL } }, n.author),
              React.createElement("span", { style:{ fontSize:11, color:C.textMut } }, n.time)
            ),
            React.createElement("p", { style:{ margin:0, fontSize:13, color:C.textSec, lineHeight:1.6 } }, n.text)
          )
        )
      ),
      React.createElement("div", { style:{ display:"flex", gap:10 } },
        React.createElement("textarea", {
          value:note, onChange:e=>setNote(e.target.value),
          placeholder:"Add a note or comment…",
          style:{ flex:1, background:C.raised, border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 12px", color:C.text, fontSize:13, resize:"vertical", minHeight:72, outline:"none" }
        }),
        React.createElement(Btn, { icon:"plus", onClick:()=>{ if(note.trim()){setNotes([...notes,{author:"Danielle C.",time:"Just now",text:note}]);setNote("");} } }, "Add")
      )
    )
  );
}

Object.assign(window, { ApplicationsView, ApplicationDetailView });
