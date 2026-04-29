// ─── Animals List + Animal Profile ───────────────────────────────────────────

function AnimalsView({ onNavigate }) {
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("grid");

  const filterTabs = [
    { value:"All",       label:"All",       count: CPAS.animals.length },
    { value:"Dog",       label:"Dogs",      count: CPAS.animals.filter(a=>a.species==="Dog").length },
    { value:"Cat",       label:"Cats",      count: CPAS.animals.filter(a=>a.species==="Cat").length },
    { value:"Available", label:"Available", count: CPAS.animals.filter(a=>a.status==="Available").length },
    { value:"Foster",    label:"Foster",    count: CPAS.animals.filter(a=>a.status==="Foster").length },
    { value:"Medical",   label:"Medical",   count: CPAS.animals.filter(a=>a.status==="Medical").length },
    { value:"Adopted",   label:"Adopted",   count: CPAS.animals.filter(a=>a.status==="Adopted").length },
  ];

  const filtered = CPAS.animals.filter(a => {
    const matchFilter = filter === "All" || a.status === filter || a.species === filter;
    const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.id.toLowerCase().includes(search.toLowerCase()) || a.breed.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const statusColor = { Available: C.green, Foster: C.purpleL, Medical: C.red, Adopted: C.textSec };

  return React.createElement("div", { style:{ padding:"28px 28px 40px", flex:1, overflowY:"auto" } },
    React.createElement(PageHeader, {
      title:"Animals",
      subtitle:`${CPAS.animals.length} total animals in the system`,
      action: React.createElement("div", { style:{display:"flex",gap:8} },
        React.createElement(Btn, { variant:"secondary", size:"sm", icon:"download" }, "Export"),
        React.createElement(Btn, { icon:"plus", size:"sm" }, "Add Animal")
      )
    }),

    // Filters + search
    React.createElement("div", { style:{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12, marginBottom:4 } },
      React.createElement(Tabs, { tabs:filterTabs, active:filter, onChange:setFilter }),
      React.createElement("div", { style:{ display:"flex", gap:8, alignItems:"center" } },
        React.createElement(Input, { value:search, onChange:setSearch, placeholder:"Search…", icon:"search", style:{ width:200 } }),
        React.createElement("div", { style:{ display:"flex", gap:2, background:C.raised, border:`1px solid ${C.border}`, borderRadius:8, padding:3 } },
          [["grid","⊞"],["list","☰"]].map(([mode,icon]) =>
            React.createElement("button", { key:mode, onClick:()=>setViewMode(mode),
              style:{ padding:"4px 10px", borderRadius:6, border:"none", background: viewMode===mode ? C.purple : "none", color: viewMode===mode ? "#fff" : C.textSec, cursor:"pointer", fontSize:14, transition:"all .12s" }
            }, icon)
          )
        )
      )
    ),

    // Grid
    viewMode === "grid"
      ? React.createElement("div", { style:{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))", gap:14, marginTop:16 } },
          filtered.map(a =>
            React.createElement("div", {
              key:a.id,
              onClick:()=>onNavigate("animal-profile", { animalId:a.id }),
              style:{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden", cursor:"pointer", transition:"all .15s" },
              onMouseEnter:e=>{ e.currentTarget.style.borderColor=C.purple; e.currentTarget.style.transform="translateY(-2px)"; },
              onMouseLeave:e=>{ e.currentTarget.style.borderColor=C.border; e.currentTarget.style.transform="none"; }
            },
              React.createElement("div", { style:{ height:130, background:C.raised, overflow:"hidden", position:"relative" } },
                React.createElement("img", { src:a.photo, alt:a.name, style:{ width:"100%", height:"100%", objectFit:"cover" }, onError:e=>{ e.target.style.opacity=0; } }),
                React.createElement("div", { style:{ position:"absolute", top:8, right:8 } }, React.createElement(Badge, { label:a.status, dot:true }))
              ),
              React.createElement("div", { style:{ padding:"12px 14px 14px" } },
                React.createElement("div", { style:{ fontSize:14, fontWeight:700, color:C.text } }, a.name),
                React.createElement("div", { style:{ fontSize:11, color:C.textSec, marginTop:2 } }, `ID: ${a.id}`),
                React.createElement("div", { style:{ fontSize:11, color:C.textSec } }, `${a.species} · ${a.breed}`),
                React.createElement("div", { style:{ fontSize:11, color:C.textMut, marginTop:4 } }, `${a.age} · ${a.sex === "M" ? "Male" : "Female"} · ${a.weight}`)
              )
            )
          )
        )
      : React.createElement(Card, { style:{ marginTop:16 } },
          React.createElement(Table, {
            cols:[
              { key:"id",      label:"ID",      render: v => React.createElement("span", { style:{ color:C.textSec, fontFamily:"monospace", fontSize:12 } }, v) },
              { key:"name",    label:"Name",    render:(v,row) => React.createElement("div", { style:{display:"flex",alignItems:"center",gap:10} }, React.createElement("img",{src:row.photo,alt:v,style:{width:32,height:32,borderRadius:6,objectFit:"cover"},onError:e=>{e.target.style.display="none"}}), React.createElement("span",{style:{fontWeight:600}},v)) },
              { key:"species", label:"Species" },
              { key:"breed",   label:"Breed",   render:v=>React.createElement("span",{style:{color:C.textSec}},v) },
              { key:"age",     label:"Age" },
              { key:"sex",     label:"Sex",     render:v=>v==="M"?"Male":"Female" },
              { key:"status",  label:"Status",  render:v=>React.createElement(Badge,{label:v,dot:true}) },
              { key:"intake",  label:"Intake",  render:v=>React.createElement("span",{style:{color:C.textSec,fontSize:12}},v) },
            ],
            rows: filtered,
            onRowClick: row => onNavigate("animal-profile", { animalId: row.id })
          })
        )
  );
}

// ─── Animal Profile ───────────────────────────────────────────────────────────
function AnimalProfileView({ animalId, onNavigate }) {
  const animal = CPAS.animals.find(a => a.id === animalId) || CPAS.animals[0];
  const [tab, setTab] = useState("overview");

  const medicalRecords = CPAS.medicalRecords.filter(r => r.animalId === animalId);
  const applications   = CPAS.applications.filter(a => a.animalId === animalId);
  const dailyCare      = CPAS.dailyCare.filter(d => d.animalId === animalId);

  const profileTabs = [
    { value:"overview",  label:"Overview" },
    { value:"medical",   label:"Medical History", count: medicalRecords.length },
    { value:"apps",      label:"Applications",    count: applications.length },
    { value:"care",      label:"Daily Care",      count: dailyCare.length },
    { value:"notes",     label:"Notes" },
  ];

  const infoRow = (label, value) => React.createElement("div", { key:label, style:{ display:"flex", gap:8, padding:"8px 0", borderBottom:`1px solid ${C.border}` } },
    React.createElement("span", { style:{ width:120, fontSize:12, color:C.textSec, flexShrink:0 } }, label),
    React.createElement("span", { style:{ fontSize:12, color:C.text, fontWeight:500 } }, value || "—")
  );

  return React.createElement("div", { style:{ padding:"28px 28px 40px", flex:1, overflowY:"auto" } },
    React.createElement(PageHeader, {
      title: animal.name,
      back:"Back to Animals",
      onBack:()=>onNavigate("animals"),
      action: React.createElement("div", { style:{display:"flex",gap:8} },
        React.createElement(Btn, { variant:"secondary", size:"sm", icon:"edit" }, "Edit"),
        React.createElement(Btn, { size:"sm", icon:"plus" }, "Add Record")
      )
    }),

    // Hero card
    React.createElement(Card, { style:{ padding:24, marginBottom:24 } },
      React.createElement("div", { style:{ display:"flex", gap:24, flexWrap:"wrap" } },
        React.createElement("div", { style:{ width:160, height:160, borderRadius:12, overflow:"hidden", flexShrink:0, border:`2px solid ${C.border}` } },
          React.createElement("img", { src:animal.photo, alt:animal.name, style:{ width:"100%", height:"100%", objectFit:"cover" }, onError:e=>{ e.target.style.background=C.raised; } })
        ),
        React.createElement("div", { style:{ flex:1, minWidth:200 } },
          React.createElement("div", { style:{ display:"flex", alignItems:"center", gap:10, marginBottom:6 } },
            React.createElement("h2", { style:{ margin:0, fontSize:22, fontWeight:700, color:C.text } }, animal.name),
            React.createElement(Badge, { label:animal.status, dot:true })
          ),
          React.createElement("div", { style:{ fontSize:13, color:C.textSec, marginBottom:12 } }, `${animal.species} · ${animal.breed}`),
          React.createElement("div", { style:{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))", gap:10, marginBottom:16 } },
            [
              ["ID",      animal.id],
              ["Age",     animal.age],
              ["Sex",     animal.sex === "M" ? "Male" : "Female"],
              ["Weight",  animal.weight],
              ["Color",   animal.color],
              ["Intake",  animal.intake],
            ].map(([l,v]) => React.createElement("div", { key:l, style:{ background:C.raised, border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 12px" } },
              React.createElement("div", { style:{ fontSize:10, color:C.textMut, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:2 } }, l),
              React.createElement("div", { style:{ fontSize:13, color:C.text, fontWeight:600 } }, v)
            ))
          ),
          animal.fosterName && React.createElement("div", { style:{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", background:C.purpleDim, border:`1px solid ${C.purple}44`, borderRadius:8, width:"fit-content" } },
            React.createElement(Icon, { name:"heart", size:13, style:{ color:C.purpleL } }),
            React.createElement("span", { style:{ fontSize:12, color:C.purpleL } }, `In foster with ${animal.fosterName} since ${animal.fosterSince}`)
          )
        )
      )
    ),

    // Tabs
    React.createElement(Tabs, { tabs:profileTabs, active:tab, onChange:setTab }),

    // Tab content
    tab === "overview" && React.createElement("div", { style:{ display:"grid", gridTemplateColumns:"1.5fr 1fr", gap:16 } },
      React.createElement(Card, { style:{ padding:20 } },
        React.createElement("h3", { style:{ margin:"0 0 14px", fontSize:14, fontWeight:600, color:C.text } }, "About"),
        React.createElement("p", { style:{ margin:0, fontSize:13, color:C.textSec, lineHeight:1.7 } }, animal.description)
      ),
      React.createElement(Card, { style:{ padding:20 } },
        React.createElement("h3", { style:{ margin:"0 0 4px", fontSize:14, fontWeight:600, color:C.text } }, "Details"),
        [
          ["Species",    animal.species],
          ["Breed",      animal.breed],
          ["Age",        animal.age],
          ["Sex",        animal.sex === "M" ? "Male" : "Female"],
          ["Weight",     animal.weight],
          ["Color",      animal.color],
          ["Intake Date",animal.intake],
          ["Foster",     animal.fosterName || "Not fostered"],
        ].map(([l,v]) => infoRow(l,v))
      )
    ),

    tab === "medical" && React.createElement(Card, { style:{ overflow:"hidden" } },
      medicalRecords.length === 0
        ? React.createElement(EmptyState, { message:"No medical records for this animal", icon:"medical" })
        : React.createElement(Table, {
            cols:[
              { key:"id",      label:"ID",     render:v=>React.createElement("span",{style:{color:C.textSec,fontFamily:"monospace",fontSize:12}},v) },
              { key:"date",    label:"Date" },
              { key:"type",    label:"Type" },
              { key:"details", label:"Details", render:v=>React.createElement("span",{style:{color:C.textSec}},v) },
              { key:"vet",     label:"Vet",    render:v=>React.createElement("span",{style:{color:C.textSec}},v) },
              { key:"status",  label:"Status", render:v=>React.createElement(Badge,{label:v,dot:true}) },
              { key:"nextDue", label:"Next Due",render:v=>React.createElement("span",{style:{color:v?C.yellow:C.textMut}},v||"—") },
            ],
            rows: medicalRecords
          })
    ),

    tab === "apps" && React.createElement(Card, { style:{ overflow:"hidden" } },
      applications.length === 0
        ? React.createElement(EmptyState, { message:"No applications for this animal", icon:"docs" })
        : React.createElement(Table, {
            cols:[
              { key:"id",        label:"App ID",    render:v=>React.createElement("span",{style:{color:C.textSec,fontFamily:"monospace",fontSize:12}},v) },
              { key:"applicant", label:"Applicant" },
              { key:"type",      label:"Type",      render:v=>React.createElement(Badge,{label:v}) },
              { key:"status",    label:"Status",    render:v=>React.createElement(Badge,{label:v,dot:true}) },
              { key:"date",      label:"Date" },
            ],
            rows: applications,
            onRowClick: row => onNavigate("application-detail", { appId: row.id })
          })
    ),

    tab === "care" && React.createElement(Card, { style:{ overflow:"hidden" } },
      dailyCare.length === 0
        ? React.createElement(EmptyState, { message:"No daily care tasks", icon:"clipboard" })
        : React.createElement(Table, {
            cols:[
              { key:"task",  label:"Task" },
              { key:"time",  label:"Time" },
              { key:"done",  label:"Status", render:v=>React.createElement(Badge,{label:v?"Completed":"Pending",dot:true}) },
              { key:"notes", label:"Notes",  render:v=>React.createElement("span",{style:{color:C.textSec}},v||"—") },
            ],
            rows: dailyCare
          })
    ),

    tab === "notes" && React.createElement(Card, { style:{ padding:24 } },
      React.createElement("div", { style:{ marginBottom:16, display:"flex", justifyContent:"space-between", alignItems:"center" } },
        React.createElement("h3", { style:{ margin:0, fontSize:14, fontWeight:600, color:C.text } }, "Notes"),
        React.createElement(Btn, { size:"sm", icon:"plus" }, "Add Note")
      ),
      React.createElement("div", { style:{ display:"flex", flexDirection:"column", gap:12 } },
        [
          { author:"Danielle C.", time:"Jun 5, 2025 · 2:30 PM", text: animal.description },
          { author:"Dr. Patel",   time:"May 28, 2025 · 11:00 AM", text:"Wellness check completed. Animal appears healthy. Follow up scheduled." },
        ].map((n, i) =>
          React.createElement("div", { key:i, style:{ background:C.raised, border:`1px solid ${C.border}`, borderRadius:8, padding:14 } },
            React.createElement("div", { style:{ display:"flex", justifyContent:"space-between", marginBottom:8 } },
              React.createElement("span", { style:{ fontSize:12, fontWeight:600, color:C.purpleL } }, n.author),
              React.createElement("span", { style:{ fontSize:11, color:C.textMut } }, n.time)
            ),
            React.createElement("p", { style:{ margin:0, fontSize:13, color:C.textSec, lineHeight:1.6 } }, n.text)
          )
        )
      )
    )
  );
}

// ─── Fosters View ─────────────────────────────────────────────────────────────
function FostersView({ onNavigate }) {
  const fostered = CPAS.animals.filter(a => a.status === "Foster");
  return React.createElement("div", { style:{ padding:"28px 28px 40px", flex:1, overflowY:"auto" } },
    React.createElement(PageHeader, {
      title:"Fosters",
      subtitle:`${fostered.length} animals currently in foster care`,
      action: React.createElement(Btn, { icon:"plus", size:"sm" }, "Place Animal")
    }),
    React.createElement("div", { style:{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:14 } },
      fostered.map(a =>
        React.createElement(Card, { key:a.id, hover:true, onClick:()=>onNavigate("animal-profile",{animalId:a.id}), style:{ padding:16, display:"flex", gap:14, alignItems:"center" } },
          React.createElement("img", { src:a.photo, alt:a.name, style:{ width:64, height:64, borderRadius:10, objectFit:"cover", border:`1px solid ${C.border}` }, onError:e=>{e.target.style.opacity=0;} }),
          React.createElement("div", { style:{ flex:1 } },
            React.createElement("div", { style:{ fontSize:14, fontWeight:700, color:C.text } }, a.name),
            React.createElement("div", { style:{ fontSize:12, color:C.textSec } }, `${a.species} · ${a.breed}`),
            React.createElement("div", { style:{ fontSize:11, color:C.textMut, margin:"4px 0" } }, `ID: ${a.id}`),
            a.fosterName && React.createElement("div", { style:{ fontSize:11, color:C.purpleL } }, `Foster: ${a.fosterName} (since ${a.fosterSince})`)
          ),
          React.createElement(Icon, { name:"chevR", size:16, style:{ color:C.textMut } })
        )
      )
    )
  );
}

// ─── Adoptions View ───────────────────────────────────────────────────────────
function AdoptionsView({ onNavigate }) {
  const adopted = CPAS.animals.filter(a => a.status === "Adopted");
  const approvedApps = CPAS.applications.filter(a => a.type === "Adoption" && a.status === "Approved");
  return React.createElement("div", { style:{ padding:"28px 28px 40px", flex:1, overflowY:"auto" } },
    React.createElement(PageHeader, {
      title:"Adoptions",
      subtitle:"Track adoption outcomes and approved applications",
      action: React.createElement(Btn, { icon:"plus", size:"sm" }, "Record Adoption")
    }),
    React.createElement("div", { style:{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:24 } },
      React.createElement(StatCard, { icon:"🏠", label:"Adopted This Month",   value:CPAS.stats.adoptionsMTD,    sub:"+4 this week", subPositive:true }),
      React.createElement(StatCard, { icon:"✅", label:"Approved Applications",value:approvedApps.length,         sub:"Ready to adopt" }),
      React.createElement(StatCard, { icon:"📊", label:"Total Adoptions (YTD)", value:74,                          sub:"+18% vs last year", subPositive:true }),
    ),
    React.createElement("h3", { style:{ margin:"0 0 14px", fontSize:14, fontWeight:600, color:C.text } }, "Recently Adopted"),
    React.createElement(Card, { style:{ overflow:"hidden" } },
      React.createElement(Table, {
        cols:[
          { key:"name",     label:"Animal", render:(v,row)=>React.createElement("span",{style:{fontWeight:600}},v) },
          { key:"id",       label:"ID",     render:v=>React.createElement("span",{style:{color:C.textSec,fontFamily:"monospace",fontSize:12}},v) },
          { key:"breed",    label:"Breed",  render:v=>React.createElement("span",{style:{color:C.textSec}},v) },
          { key:"status",   label:"Status", render:v=>React.createElement(Badge,{label:v,dot:true}) },
          { key:"intake",   label:"Intake Date" },
        ],
        rows: adopted,
        onRowClick: row => onNavigate("animal-profile", { animalId: row.id })
      })
    )
  );
}

Object.assign(window, { AnimalsView, AnimalProfileView, FostersView, AdoptionsView });
