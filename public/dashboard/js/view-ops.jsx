// ─── Ops Views: Intakes, Daily Care, Medical Records, Volunteers ──────────────

function fetchDashboardJSON(path) {
  return fetch(path, { credentials: 'include', headers: { Accept: 'application/json' } })
    .then(function(res) { return res.json().then(function(data) { if (!res.ok) throw new Error(data.error || 'Request failed'); return data; }); });
}

function PdfPreview(props) {
  var url = props.url;
  var height = props.height || 180;
  if (!url) return null;
  return React.createElement('div', {
    style: {
      height: height,
      background: '#f5f4f1',
      borderBottom: '1px solid ' + C.border,
      overflow: 'hidden',
      position: 'relative'
    }
  },
    React.createElement('iframe', {
      src: url + '#toolbar=0&navpanes=0&view=FitH',
      title: props.title || 'PDF preview',
      style: { width: '100%', height: '100%', border: 'none', pointerEvents: 'none' }
    })
  );
}

// ─── Intakes ──────────────────────────────────────────────────────────────────
function IntakesView({ onNavigate }) {
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState(null);
  const [stats, setStats] = useState({ total: 0, this_month: 0, linked_animals: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(function() {
    setLoading(true);
    fetchDashboardJSON('/api/dashboard/intakes')
      .then(function(data) {
        setRows(data.intakes || []);
        setStats(data.stats || { total: (data.intakes || []).length, this_month: 0, linked_animals: 0 });
        setError("");
      })
      .catch(function(e) {
        setRows([]);
        setError(e.message || 'Failed to load intake records.');
      })
      .finally(function() { setLoading(false); });
  }, []);

  const filtered = (rows || []).filter(function(i) {
    if (!search) return true;
    const q = search.toLowerCase();
    return [i.animal_name, i.filename, i.label, i.animal_id].filter(Boolean).join(' ').toLowerCase().includes(q);
  });

  return React.createElement("div", { className: "dash-page" },
    React.createElement(PageHeader, {
      title: "Intakes",
      subtitle: "Kennel card intake forms stored in media/intakes",
      action: React.createElement(Btn, { icon: "plus", size: "sm", onClick: function() { if (onNavigate) onNavigate('animals'); } }, "View Animals")
    }),

    React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 } },
      React.createElement(StatCard, { icon: "📥", label: "Intake Forms", value: stats.total || 0 }),
      React.createElement(StatCard, { icon: "🐾", label: "Linked Animals", value: stats.linked_animals || 0, sub: "matched to profiles", subPositive: true }),
      React.createElement(StatCard, { icon: "📅", label: "Added This Month", value: stats.this_month || 0 })
    ),

    React.createElement("div", { style: { marginBottom: 16 } },
      React.createElement(Input, { value: search, onChange: setSearch, placeholder: "Search intakes…", icon: "search", style: { maxWidth: 320 } })
    ),

    error ? React.createElement("div", { style: { color: C.red, marginBottom: 16, fontSize: 13, fontWeight: 600 } }, error) : null,

    loading ? React.createElement(Card, { style: { padding: 28, color: C.textSec } }, "Loading intake forms…") :
    !filtered.length ? React.createElement(Card, { style: { padding: 28, color: C.textSec } }, "No intake forms found in media/intakes.") :
    React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 16 } },
      filtered.map(function(row) {
        return React.createElement(Card, { key: row.id || row.url, style: { overflow: "hidden", padding: 0 } },
          React.createElement(PdfPreview, { url: row.url, title: row.label, height: 200 }),
          React.createElement("div", { style: { padding: 16 } },
            React.createElement("div", { style: { display: "flex", alignItems: "flex-start", gap: 12 } },
              row.photo_url ? React.createElement("img", {
                src: row.photo_url,
                alt: row.animal_name || "Animal",
                style: { width: 48, height: 48, borderRadius: 10, objectFit: "cover", flexShrink: 0 }
              }) : React.createElement("div", {
                style: { width: 48, height: 48, borderRadius: 10, background: C.raised, display: "flex", alignItems: "center", justifyContent: "center", color: C.textMut, fontSize: 18 }
              }, "📄"),
              React.createElement("div", { style: { flex: 1, minWidth: 0 } },
                React.createElement("div", { style: { fontWeight: 800, fontSize: 15, color: C.text } }, row.animal_name || "Unlinked intake"),
                React.createElement("div", { style: { color: C.textSec, fontSize: 12, marginTop: 2 } }, [row.species, row.intake_date ? "Intake " + row.intake_date : null].filter(Boolean).join(" · ") || "No linked profile"),
                React.createElement("div", { style: { color: C.textMut, fontSize: 11, marginTop: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, row.filename)
              )
            ),
            React.createElement("div", { style: { display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" } },
              React.createElement(Btn, { size: "sm", variant: "secondary", onClick: function() { window.open(row.url, "_blank", "noopener,noreferrer"); } }, "Open PDF"),
              row.animal_id ? React.createElement(Btn, { size: "sm", onClick: function() { onNavigate("animal-profile", { animalId: row.animal_id }); } }, "View Animal") : null
            )
          )
        );
      })
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

  return React.createElement("div", { className: "dash-page" },
    React.createElement(PageHeader, {
      title:"Daily Care",
      subtitle:`${new Date().toLocaleDateString(undefined, { month:"long", day:"numeric", year:"numeric" })} — Today’s task list`,
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
  const [rows, setRows] = useState(null);
  const [stats, setStats] = useState({ total: 0, vaccination_certs: 0, linked_animals: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(function() {
    setLoading(true);
    fetchDashboardJSON('/api/dashboard/medical')
      .then(function(data) {
        setRows(data.medical || []);
        setStats(data.stats || { total: (data.medical || []).length, vaccination_certs: 0, linked_animals: 0 });
        setError("");
      })
      .catch(function(e) {
        setRows([]);
        setError(e.message || 'Failed to load medical documents.');
      })
      .finally(function() { setLoading(false); });
  }, []);

  const types = ["All", ...Array.from(new Set((rows || []).map(function(r) { return r.type; }).filter(Boolean)))];
  const filtered = (rows || []).filter(function(r) {
    const matchType = typeFilter === "All" || r.type === typeFilter;
    const q = search.toLowerCase();
    const matchSearch = !search || [r.animal_name, r.filename, r.label, r.type].filter(Boolean).join(' ').toLowerCase().includes(q);
    return matchType && matchSearch;
  });

  return React.createElement("div", { className: "dash-page" },
    React.createElement(PageHeader, {
      title: "Medical Records",
      subtitle: "Vaccination certificates and medical PDFs from media/medical",
      action: React.createElement(Btn, { icon: "plus", size: "sm", onClick: function() { if (onNavigate) onNavigate('animals'); } }, "View Animals")
    }),

    React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 } },
      React.createElement(StatCard, { icon: "🩺", label: "Medical Documents", value: stats.total || 0 }),
      React.createElement(StatCard, { icon: "💉", label: "Vaccination Certs", value: stats.vaccination_certs || 0, sub: "on file", subPositive: true }),
      React.createElement(StatCard, { icon: "🐾", label: "Linked Animals", value: stats.linked_animals || 0 })
    ),

    React.createElement("div", { style: { display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" } },
      React.createElement(Input, { value: search, onChange: setSearch, placeholder: "Search records…", icon: "search", style: { width: 260 } }),
      React.createElement(Select, { value: typeFilter, onChange: setTypeFilter, options: types.map(function(t) { return { value: t, label: t }; }), style: { minWidth: 180 } })
    ),

    error ? React.createElement("div", { style: { color: C.red, marginBottom: 16, fontSize: 13, fontWeight: 600 } }, error) : null,

    loading ? React.createElement(Card, { style: { padding: 28, color: C.textSec } }, "Loading medical documents…") :
    !filtered.length ? React.createElement(Card, { style: { padding: 28, color: C.textSec } }, "No medical documents found in media/medical.") :
    React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 16 } },
      filtered.map(function(row) {
        return React.createElement(Card, { key: row.id || row.url, style: { overflow: "hidden", padding: 0 } },
          React.createElement(PdfPreview, { url: row.url, title: row.label, height: 200 }),
          React.createElement("div", { style: { padding: 16 } },
            React.createElement("div", { style: { display: "flex", alignItems: "flex-start", gap: 12 } },
              row.photo_url ? React.createElement("img", {
                src: row.photo_url,
                alt: row.animal_name || "Animal",
                style: { width: 48, height: 48, borderRadius: 10, objectFit: "cover", flexShrink: 0 }
              }) : React.createElement("div", {
                style: { width: 48, height: 48, borderRadius: 10, background: C.raised, display: "flex", alignItems: "center", justifyContent: "center", color: C.textMut, fontSize: 18 }
              }, "💉"),
              React.createElement("div", { style: { flex: 1, minWidth: 0 } },
                React.createElement("div", { style: { fontWeight: 800, fontSize: 15, color: C.text } }, row.animal_name || "Unlinked document"),
                React.createElement("div", { style: { marginTop: 4 } }, React.createElement(Badge, { label: row.type || "Medical Document" })),
                React.createElement("div", { style: { color: C.textMut, fontSize: 11, marginTop: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, row.filename)
              )
            ),
            row.medical_notes ? React.createElement("div", { style: { color: C.textSec, fontSize: 12, marginTop: 12, lineHeight: 1.5 } }, row.medical_notes) : null,
            React.createElement("div", { style: { display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" } },
              React.createElement(Btn, { size: "sm", variant: "secondary", onClick: function() { window.open(row.url, "_blank", "noopener,noreferrer"); } }, "Open PDF"),
              row.animal_id ? React.createElement(Btn, { size: "sm", onClick: function() { onNavigate("animal-profile", { animalId: row.animal_id }); } }, "View Animal") : null
            )
          )
        );
      })
    )
  );
}

// ─── Volunteers ───────────────────────────────────────────────────────────────
function VolunteersView({ onNavigate }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", role: "Volunteer" });
  const [error, setError] = useState("");

  const loadVolunteers = React.useCallback(function() {
    setLoading(true);
    fetchDashboardJSON("/api/dashboard/volunteers")
      .then(function(data) {
        const rows = (data.volunteers || data.members || []).map(function(row) {
          return {
            id: row.id,
            name: row.full_name,
            email: row.email || "—",
            phone: row.phone || "—",
            role: row.role || "Volunteer",
            status: row.status === "active" ? "Active" : "Inactive",
            joinDate: (row.created_at || "—").slice(0, 10),
            hoursMTD: row.hours_month || 0,
            totalHours: row.hours_total || 0,
            lastShift: row.last_shift || "—"
          };
        });
        setVolunteers(rows);
        window.CPAS = window.CPAS || {};
        window.CPAS.volunteers = rows;
      })
      .catch(function() { setVolunteers(window.CPAS?.volunteers || []); })
      .finally(function() { setLoading(false); });
  }, []);

  useEffect(function() { loadVolunteers(); }, [loadVolunteers]);

  const filtered = volunteers.filter(v => {
    const matchFilter = filter === "All" || v.status === filter;
    const matchSearch = !search || v.name.toLowerCase().includes(search.toLowerCase()) || v.role.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });
  const totalHours = volunteers.reduce((s,v)=>s+v.hoursMTD,0);
  const active = volunteers.filter(v=>v.status==="Active").length;

  function addVolunteer() {
    if (!form.full_name.trim()) { setError("Name is required."); return; }
    setSaving(true); setError("");
    fetch("/api/dashboard/volunteers", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: form.full_name.trim(),
        email: form.email || null,
        role: form.role || "Volunteer",
        status: "active"
      })
    })
      .then(function(res) { return res.json().then(function(data) { if (!res.ok) throw new Error(data.error || "Failed"); return data; }); })
      .then(function() {
        setShowAdd(false);
        setForm({ full_name: "", email: "", role: "Volunteer" });
        loadVolunteers();
      })
      .catch(function(e) { setError(e.message || "Could not add volunteer."); })
      .finally(function() { setSaving(false); });
  }

  return React.createElement("div", { className: "dash-page" },
    React.createElement(PageHeader, {
      title:"Volunteers",
      subtitle:"Team members and hour tracking",
      action: React.createElement(Btn, { icon:"plus", size:"sm", onClick: function() { setShowAdd(true); setError(""); } }, "Add Volunteer")
    }),

    React.createElement("div", { style:{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:24 } },
      React.createElement(StatCard, { icon:"👥", label:"Total Volunteers",value:volunteers.length }),
      React.createElement(StatCard, { icon:"✅", label:"Active",           value:active,      sub:`${volunteers.length-active} inactive` }),
      React.createElement(StatCard, { icon:"⏱️", label:"Hours (MTD)",      value:totalHours,  sub:"+18% vs last month", subPositive:true }),
      React.createElement(StatCard, { icon:"📅", label:"Avg Hours/Person", value:active ? Math.round(totalHours/active) : 0, sub:"Active volunteers" }),
    ),

    React.createElement("div", { style:{ display:"flex", gap:10, marginBottom:16 } },
      React.createElement(Input, { value:search, onChange:setSearch, placeholder:"Search volunteers…", icon:"search", style:{ width:260 } }),
      React.createElement(Tabs, { tabs:[{value:"All",label:"All",count:volunteers.length},{value:"Active",label:"Active",count:active},{value:"Inactive",label:"Inactive",count:volunteers.length-active}], active:filter, onChange:setFilter })
    ),

    loading
      ? React.createElement(Card, { style:{ padding:40, textAlign:"center" } }, "Loading volunteers…")
      : React.createElement(Card, { style:{ overflow:"hidden" } },
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
            rows: filtered,
            emptyMsg: "No volunteers found"
          })
        ),

    React.createElement(Modal, { open: showAdd, onClose: function() { setShowAdd(false); setError(""); }, title: "Add Volunteer", width: 480 },
      React.createElement("div", { style: { display: "grid", gap: 14 } },
        React.createElement("div", null,
          React.createElement("label", { style: { display: "block", fontSize: 12, fontWeight: 600, color: C.textSec, marginBottom: 6 } }, "Full name *"),
          React.createElement(Input, { value: form.full_name, onChange: function(v) { setForm(function(f) { return Object.assign({}, f, { full_name: v }); }); }, placeholder: "e.g. Amanda Norris" })
        ),
        React.createElement("div", null,
          React.createElement("label", { style: { display: "block", fontSize: 12, fontWeight: 600, color: C.textSec, marginBottom: 6 } }, "Email"),
          React.createElement(Input, { value: form.email, onChange: function(v) { setForm(function(f) { return Object.assign({}, f, { email: v }); }); }, placeholder: "email@example.com" })
        ),
        React.createElement("div", null,
          React.createElement("label", { style: { display: "block", fontSize: 12, fontWeight: 600, color: C.textSec, marginBottom: 6 } }, "Role"),
          React.createElement(Input, { value: form.role, onChange: function(v) { setForm(function(f) { return Object.assign({}, f, { role: v }); }); }, placeholder: "e.g. Rescue & Foster Coordinator" })
        ),
        error && React.createElement("div", { style: { color: C.red, fontSize: 12 } }, error),
        React.createElement("div", { style: { display: "flex", gap: 8, justifyContent: "flex-end" } },
          React.createElement(Btn, { variant: "secondary", onClick: function() { setShowAdd(false); setError(""); } }, "Cancel"),
          React.createElement(Btn, { onClick: addVolunteer, disabled: saving }, saving ? "Saving…" : "Add Volunteer")
        )
      )
    )
  );
}

Object.assign(window, { IntakesView, DailyCareView, MedicalView, VolunteersView });
