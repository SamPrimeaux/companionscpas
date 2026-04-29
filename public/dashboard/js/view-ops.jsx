// ─── Ops Views: Intakes, Daily Care, Medical Records, Volunteers ──────────────

// ─── Intakes ──────────────────────────────────────────────────────────────────
function IntakesView({ onNavigate }) {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const filtered = CPAS.intakes.filter(i =>
    !search || i.animal.toLowerCase().includes(search.toLowerCase()) || i.id.toLowerCase().includes(search.toLowerCase()) || i.method.toLowerCase().includes(search.toLowerCase())
  );
  const methodCounts = CPAS.intakes.reduce((acc,i)=>{ acc[i.method]=(acc[i.method]||0)+1; return acc; },{});

  return React.createElement("div", { style:{ padding:"28px 28px 40px", flex:1, overflowY:"auto" } },
    React.createElement(PageHeader, {
      title:"Intakes",
      subtitle:"Animal intake records and history",
      action: React.createElement(Btn, { icon:"plus", size:"sm", onClick:()=>setShowModal(true) }, "New Intake")
    }),

    React.createElement("div", { style:{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:24 } },
      React.createElement(StatCard, { icon:"📥", label:"Total Intakes (YTD)", value:88 }),
      React.createElement(StatCard, { icon:"🐾", label:"This Month",          value:6,  sub:"+2 vs last month", subPositive:true }),
      React.createElement(StatCard, { icon:"🛣️", label:"Strays",              value:methodCounts["Stray"]||0 }),
      React.createElement(StatCard, { icon:"🤝", label:"Surrenders",          value:methodCounts["Owner Surrender"]||0 }),
    ),

    React.createElement("div", { style:{ marginBottom:16 } },
      React.createElement(Input, { value:search, onChange:setSearch, placeholder:"Search intakes…", icon:"search", style:{ maxWidth:320 } })
    ),

    React.createElement(Card, { style:{ overflow:"hidden" } },
      React.createElement(Table, {
        cols:[
          { key:"id",       label:"ID",        render:v=>React.createElement("span",{style:{color:C.textSec,fontFamily:"monospace",fontSize:12}},v) },
          { key:"date",     label:"Date" },
          { key:"animal",   label:"Animal",    render:(v,row)=>React.createElement("div",null, React.createElement("div",{style:{fontWeight:600}},v), React.createElement("div",{style:{fontSize:11,color:C.textSec}},row.animalId)) },
          { key:"species",  label:"Species" },
          { key:"method",   label:"Method",    render:v=>React.createElement(Badge,{label:v.replace("Owner Surrender","Surrender")}) },
          { key:"location", label:"Location",  render:v=>React.createElement("span",{style:{color:C.textSec,fontSize:12}},v) },
          { key:"condition",label:"Condition", render:v=>React.createElement(Badge,{label:v,dot:true}) },
          { key:"staff",    label:"Staff",     render:v=>React.createElement("span",{style:{color:C.textSec}},v) },
          { key:"notes",    label:"Notes",     render:v=>React.createElement("span",{style:{color:C.textSec,fontSize:12}},v||"—") },
        ],
        rows: filtered,
        onRowClick: row => onNavigate("animal-profile", { animalId: row.animalId })
      })
    ),

    React.createElement(Modal, { open:showModal, onClose:()=>setShowModal(false), title:"New Intake", width:520 },
      React.createElement("div", { style:{ display:"flex", flexDirection:"column", gap:14 } },
        React.createElement("div", { style:{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 } },
          React.createElement("div", null, React.createElement("label", { style:{ fontSize:12, color:C.textSec, display:"block", marginBottom:6 } }, "Animal Name"), React.createElement(Input, { value:"", onChange:()=>{}, placeholder:"e.g. Buddy" })),
          React.createElement("div", null, React.createElement("label", { style:{ fontSize:12, color:C.textSec, display:"block", marginBottom:6 } }, "Species"), React.createElement(Select, { value:"Dog", onChange:()=>{}, options:[{value:"Dog",label:"Dog"},{value:"Cat",label:"Cat"},{value:"Other",label:"Other"}] }))
        ),
        React.createElement("div", { style:{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 } },
          React.createElement("div", null, React.createElement("label", { style:{ fontSize:12, color:C.textSec, display:"block", marginBottom:6 } }, "Intake Method"), React.createElement(Select, { value:"Stray", onChange:()=>{}, options:["Stray","Owner Surrender","Transfer","Rescue"].map(v=>({value:v,label:v})) })),
          React.createElement("div", null, React.createElement("label", { style:{ fontSize:12, color:C.textSec, display:"block", marginBottom:6 } }, "Condition"), React.createElement(Select, { value:"Good", onChange:()=>{}, options:["Good","Fair","Poor"].map(v=>({value:v,label:v})) }))
        ),
        React.createElement("div", null, React.createElement("label", { style:{ fontSize:12, color:C.textSec, display:"block", marginBottom:6 } }, "Location Found"), React.createElement(Input, { value:"", onChange:()=>{}, placeholder:"Street address or area" })),
        React.createElement("div", null,
          React.createElement("label", { style:{ fontSize:12, color:C.textSec, display:"block", marginBottom:6 } }, "Notes"),
          React.createElement("textarea", { placeholder:"Any additional notes…", style:{ width:"100%", background:C.raised, border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 12px", color:C.text, fontSize:13, resize:"vertical", minHeight:72, outline:"none", boxSizing:"border-box" } })
        ),
        React.createElement("div", { style:{ display:"flex", gap:10, justifyContent:"flex-end" } },
          React.createElement(Btn, { variant:"secondary", onClick:()=>setShowModal(false) }, "Cancel"),
          React.createElement(Btn, { onClick:()=>setShowModal(false) }, "Save Intake")
        )
      )
    )
  );
}

// ─── Daily Care ───────────────────────────────────────────────────────────────
function DailyCareView({ onNavigate }) {
  const [tasks, setTasks] = useState(CPAS.dailyCare);
  const toggleTask = id => setTasks(t => t.map(task => task.id === id ? {...task, done:!task.done} : task));

  const groups = { "Morning (AM)": tasks.filter(t=>t.time.includes("AM")), "Afternoon (PM)": tasks.filter(t=>t.time.includes("PM")) };
  const done = tasks.filter(t=>t.done).length;
  const total = tasks.length;

  const taskIcon = { Feed:"🍽️", Walk:"🦮", Medication:"💊", Vaccination:"💉" };

  return React.createElement("div", { style:{ padding:"28px 28px 40px", flex:1, overflowY:"auto" } },
    React.createElement(PageHeader, {
      title:"Daily Care",
      subtitle:"June 11, 2025 — Today's task list",
      action: React.createElement(Btn, { icon:"plus", size:"sm" }, "Add Task")
    }),

    React.createElement("div", { style:{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:24 } },
      React.createElement(StatCard, { icon:"✅", label:"Completed",  value:`${done}/${total}`,  sub:`${Math.round(done/total*100)}% done`, subPositive:true }),
      React.createElement(StatCard, { icon:"⏳", label:"Remaining",  value:total-done }),
      React.createElement(StatCard, { icon:"💊", label:"Medications",value:tasks.filter(t=>t.task==="Medication").length, sub:`${tasks.filter(t=>t.task==="Medication"&&t.done).length} given`, subPositive:true }),
      React.createElement(StatCard, { icon:"🦮", label:"Walks",      value:tasks.filter(t=>t.task==="Walk").length }),
    ),

    React.createElement("div", { style:{ marginBottom:16 } },
      React.createElement(ProgressBar, { value:done, max:total, color:C.green, height:8 }),
      React.createElement("div", { style:{ fontSize:11, color:C.textSec, marginTop:6 } }, `${done} of ${total} tasks completed today`)
    ),

    Object.entries(groups).map(([group, groupTasks]) =>
      React.createElement("div", { key:group, style:{ marginBottom:24 } },
        React.createElement("h3", { style:{ margin:"0 0 12px", fontSize:12, fontWeight:600, color:C.textSec, textTransform:"uppercase", letterSpacing:"0.08em" } }, group),
        React.createElement("div", { style:{ display:"flex", flexDirection:"column", gap:8 } },
          groupTasks.map(task =>
            React.createElement(Card, { key:task.id, style:{ padding:"12px 16px", display:"flex", alignItems:"center", gap:14, opacity: task.done ? 0.6 : 1 } },
              React.createElement("button", {
                onClick:()=>toggleTask(task.id),
                style:{ width:22, height:22, borderRadius:6, border:`2px solid ${task.done ? C.green : C.border}`, background: task.done ? C.greenDim : "none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all .15s" }
              }, task.done && React.createElement(Icon,{ name:"check2", size:12, style:{ color:C.green } })),
              React.createElement("span", { style:{ fontSize:18, flexShrink:0 } }, taskIcon[task.task] || "•"),
              React.createElement("div", { style:{ flex:1 } },
                React.createElement("div", { style:{ fontSize:13, fontWeight:600, color:C.text, textDecoration: task.done?"line-through":"none" } }, `${task.task} — ${task.animal}`),
                task.notes && React.createElement("div", { style:{ fontSize:11, color:C.textSec } }, task.notes)
              ),
              React.createElement("div", { style:{ textAlign:"right" } },
                React.createElement("div", { style:{ fontSize:12, color:C.purpleL, fontWeight:600 } }, task.time),
                React.createElement("button", { onClick:()=>onNavigate("animal-profile",{animalId:task.animalId}), style:{ fontSize:11, color:C.textMut, background:"none", border:"none", cursor:"pointer", padding:0 } }, task.animalId)
              )
            )
          )
        )
      )
    )
  );
}

// ─── Medical Records ──────────────────────────────────────────────────────────
function MedicalView({ onNavigate }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const types = ["All", ...Array.from(new Set(CPAS.medicalRecords.map(r=>r.type)))];
  const filtered = CPAS.medicalRecords.filter(r => {
    const matchType = typeFilter === "All" || r.type === typeFilter;
    const matchSearch = !search || r.animal.toLowerCase().includes(search.toLowerCase()) || r.id.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  return React.createElement("div", { style:{ padding:"28px 28px 40px", flex:1, overflowY:"auto" } },
    React.createElement(PageHeader, {
      title:"Medical Records",
      subtitle:"Veterinary records across all animals",
      action: React.createElement(Btn, { icon:"plus", size:"sm", onClick:()=>setShowModal(true) }, "Add Record")
    }),

    React.createElement("div", { style:{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:24 } },
      React.createElement(StatCard, { icon:"🩺", label:"Total Records", value:CPAS.medicalRecords.length }),
      React.createElement(StatCard, { icon:"🔴", label:"Overdue",       value:CPAS.medicalRecords.filter(r=>r.status==="Overdue").length,   sub:"Action needed", subPositive:false }),
      React.createElement(StatCard, { icon:"🟡", label:"Due Soon",      value:CPAS.medicalRecords.filter(r=>r.status==="Due").length }),
      React.createElement(StatCard, { icon:"📅", label:"Scheduled",     value:CPAS.medicalRecords.filter(r=>r.status==="Scheduled").length, sub:"Upcoming", subPositive:true }),
    ),

    React.createElement("div", { style:{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" } },
      React.createElement(Input, { value:search, onChange:setSearch, placeholder:"Search records…", icon:"search", style:{ width:260 } }),
      React.createElement(Select, { value:typeFilter, onChange:setTypeFilter, options:types.map(t=>({value:t,label:t})), style:{ minWidth:160 } })
    ),

    React.createElement(Card, { style:{ overflow:"hidden" } },
      React.createElement(Table, {
        cols:[
          { key:"id",      label:"ID",      render:v=>React.createElement("span",{style:{color:C.textSec,fontFamily:"monospace",fontSize:12}},v) },
          { key:"animal",  label:"Animal",  render:(v,row)=>React.createElement("button",{onClick:e=>{e.stopPropagation();onNavigate("animal-profile",{animalId:row.animalId})},style:{background:"none",border:"none",color:C.purpleL,cursor:"pointer",fontSize:13,fontWeight:600,padding:0}},v) },
          { key:"date",    label:"Date" },
          { key:"type",    label:"Type" },
          { key:"details", label:"Details", render:v=>React.createElement("span",{style:{color:C.textSec}},v) },
          { key:"vet",     label:"Vet",     render:v=>React.createElement("span",{style:{color:C.textSec}},v) },
          { key:"status",  label:"Status",  render:v=>React.createElement(Badge,{label:v,dot:true}) },
          { key:"nextDue", label:"Next Due",render:v=>React.createElement("span",{style:{color:v?C.yellow:C.textMut,fontSize:12}},v||"—") },
        ],
        rows: filtered
      })
    ),

    React.createElement(Modal, { open:showModal, onClose:()=>setShowModal(false), title:"Add Medical Record", width:520 },
      React.createElement("div", { style:{ display:"flex", flexDirection:"column", gap:14 } },
        React.createElement("div", { style:{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 } },
          React.createElement("div", null, React.createElement("label",{style:{fontSize:12,color:C.textSec,display:"block",marginBottom:6}},"Animal"), React.createElement(Select,{value:CPAS.animals[0].id,onChange:()=>{},options:CPAS.animals.map(a=>({value:a.id,label:`${a.name} (${a.id})`}))})),
          React.createElement("div", null, React.createElement("label",{style:{fontSize:12,color:C.textSec,display:"block",marginBottom:6}},"Record Type"), React.createElement(Select,{value:"Vaccination",onChange:()=>{},options:["Vaccination","Medication","Exam","Treatment","Spay/Neuter"].map(v=>({value:v,label:v}))}))
        ),
        React.createElement("div", { style:{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 } },
          React.createElement("div", null, React.createElement("label",{style:{fontSize:12,color:C.textSec,display:"block",marginBottom:6}},"Date"), React.createElement(Input,{value:"",onChange:()=>{},placeholder:"2025-06-11"})),
          React.createElement("div", null, React.createElement("label",{style:{fontSize:12,color:C.textSec,display:"block",marginBottom:6}},"Vet"), React.createElement(Select,{value:"Dr. Patel",onChange:()=>{},options:["Dr. Patel","Dr. Kim"].map(v=>({value:v,label:v}))}))
        ),
        React.createElement("div", null, React.createElement("label",{style:{fontSize:12,color:C.textSec,display:"block",marginBottom:6}},"Details"), React.createElement(Input,{value:"",onChange:()=>{},placeholder:"Description of treatment or record"})),
        React.createElement("div", null, React.createElement("label",{style:{fontSize:12,color:C.textSec,display:"block",marginBottom:6}},"Next Due Date"), React.createElement(Input,{value:"",onChange:()=>{},placeholder:"Leave blank if not applicable"})),
        React.createElement("div",{style:{display:"flex",gap:10,justifyContent:"flex-end"}},
          React.createElement(Btn,{variant:"secondary",onClick:()=>setShowModal(false)},"Cancel"),
          React.createElement(Btn,{onClick:()=>setShowModal(false)},"Save Record")
        )
      )
    )
  );
}

// ─── Volunteers ───────────────────────────────────────────────────────────────
function VolunteersView({ onNavigate }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const filtered = CPAS.volunteers.filter(v => {
    const matchFilter = filter === "All" || v.status === filter;
    const matchSearch = !search || v.name.toLowerCase().includes(search.toLowerCase()) || v.role.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });
  const totalHours = CPAS.volunteers.reduce((s,v)=>s+v.hoursMTD,0);
  const active = CPAS.volunteers.filter(v=>v.status==="Active").length;

  return React.createElement("div", { style:{ padding:"28px 28px 40px", flex:1, overflowY:"auto" } },
    React.createElement(PageHeader, {
      title:"Volunteers",
      subtitle:"Team members and hour tracking",
      action: React.createElement(Btn, { icon:"plus", size:"sm" }, "Add Volunteer")
    }),

    React.createElement("div", { style:{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:24 } },
      React.createElement(StatCard, { icon:"👥", label:"Total Volunteers",value:CPAS.volunteers.length }),
      React.createElement(StatCard, { icon:"✅", label:"Active",           value:active,      sub:`${CPAS.volunteers.length-active} inactive` }),
      React.createElement(StatCard, { icon:"⏱️", label:"Hours (MTD)",      value:totalHours,  sub:"+18% vs last month", subPositive:true }),
      React.createElement(StatCard, { icon:"📅", label:"Avg Hours/Person", value:Math.round(totalHours/active), sub:"Active volunteers" }),
    ),

    React.createElement("div", { style:{ display:"flex", gap:10, marginBottom:16 } },
      React.createElement(Input, { value:search, onChange:setSearch, placeholder:"Search volunteers…", icon:"search", style:{ width:260 } }),
      React.createElement(Tabs, { tabs:[{value:"All",label:"All",count:CPAS.volunteers.length},{value:"Active",label:"Active",count:active},{value:"Inactive",label:"Inactive",count:CPAS.volunteers.length-active}], active:filter, onChange:setFilter })
    ),

    React.createElement(Card, { style:{ overflow:"hidden" } },
      React.createElement(Table, {
        cols:[
          { key:"name",       label:"Name",     render:(v,row)=>React.createElement("div",{style:{display:"flex",alignItems:"center",gap:10}}, React.createElement(Avatar,{name:v,size:30}), React.createElement("div",null, React.createElement("div",{style:{fontWeight:600,fontSize:13}},v), React.createElement("div",{style:{fontSize:11,color:C.textSec}},row.email))) },
          { key:"role",       label:"Role",     render:v=>React.createElement("span",{style:{color:C.textSec}},v) },
          { key:"status",     label:"Status",   render:v=>React.createElement(Badge,{label:v,dot:true}) },
          { key:"joinDate",   label:"Joined",   render:v=>React.createElement("span",{style:{color:C.textSec,fontSize:12}},v) },
          { key:"hoursMTD",   label:"Hrs (MTD)",render:v=>React.createElement("span",{style:{fontWeight:600,color:C.purpleL}},v) },
          { key:"totalHours", label:"Total Hrs" },
          { key:"lastShift",  label:"Last Shift",render:v=>React.createElement("span",{style:{color:C.textSec,fontSize:12}},v) },
          { key:"id",         label:"",         render:(v,row)=>React.createElement("div",{style:{display:"flex",gap:6}},
            React.createElement(Btn,{size:"sm",variant:"ghost",icon:"mail"},""),
            React.createElement(Btn,{size:"sm",variant:"ghost",icon:"eye"},"")
          )},
        ],
        rows: filtered
      })
    )
  );
}

Object.assign(window, { IntakesView, DailyCareView, MedicalView, VolunteersView });
