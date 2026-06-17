// ─── Admin Views: CMS, Reports, Settings, Notifications ──────────────────────

// ─── CMS ─────────────────────────────────────────────────────────────────────
function AdminCMSView() {
  const [activePage, setActivePage] = useState("homepage");
  const [editing, setEditing] = useState(null);
  const pages = [
    { key:"homepage",    label:"Homepage",         lastEdited:"Jun 8, 2025",  status:"Published" },
    { key:"adopt",       label:"Adopt a Pet",      lastEdited:"Jun 2, 2025",  status:"Published" },
    { key:"foster",      label:"Foster a Pet",     lastEdited:"May 28, 2025", status:"Published" },
    { key:"about",       label:"About Us",         lastEdited:"May 15, 2025", status:"Published" },
    { key:"donate",      label:"Donate",           lastEdited:"Jun 1, 2025",  status:"Published" },
    { key:"events",      label:"Events",           lastEdited:"Jun 5, 2025",  status:"Draft" },
  ];

  const pageContent = {
    homepage: {
      hero_heading:    "Every animal deserves a loving home.",
      hero_subheading: "We rescue, rehabilitate, and rehome animals in need across the region.",
      hero_cta:        "Meet Our Animals",
      about_blurb:     "Companions of CPAS is a 501(c)(3) nonprofit dedicated to animal rescue and welfare. We work with fosters, volunteers, and donors to give every animal a second chance.",
      featured_heading:"Currently Available",
    },
    about: {
      mission:         "To rescue, rehabilitate, and rehome animals in need while educating the public on responsible pet ownership.",
      founded:         "2018",
      team_blurb:      "Our team of dedicated staff and volunteers works tirelessly to improve the lives of animals in our care.",
    }
  };

  const content = pageContent[activePage] || pageContent.homepage;

  return React.createElement("div", { className: "dash-page" },
    React.createElement(PageHeader, {
      title:"CMS Website",
      subtitle:"Edit and manage your public-facing website content",
      action: React.createElement("div",{style:{display:"flex",gap:8}},
        React.createElement(Btn,{variant:"secondary",size:"sm",icon:"eye"},"Preview Site"),
        React.createElement(Btn,{size:"sm"},"Publish Changes")
      )
    }),

    React.createElement("div", { style:{ display:"grid", gridTemplateColumns:"220px 1fr", gap:16 } },
      // Page list
      React.createElement(Card, { style:{ padding:10, alignSelf:"start" } },
        React.createElement("div", { style:{ fontSize:11, fontWeight:600, color:C.textMut, textTransform:"uppercase", letterSpacing:"0.08em", padding:"6px 8px 10px" } }, "Pages"),
        pages.map(p =>
          React.createElement("button", {
            key:p.key, onClick:()=>setActivePage(p.key),
            style:{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 10px", borderRadius:8, border:"none", background: activePage===p.key ? C.purpleDim : "none", cursor:"pointer", transition:"background .12s", marginBottom:2 }
          },
            React.createElement("span", { style:{ fontSize:13, color: activePage===p.key ? C.purpleL : C.text, fontWeight: activePage===p.key ? 600 : 400 } }, p.label),
            React.createElement(Badge, { label:p.status })
          )
        )
      ),

      // Editor
      React.createElement("div", null,
        React.createElement(Card, { style:{ padding:24, marginBottom:16 } },
          React.createElement("div", { style:{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 } },
            React.createElement("div", null,
              React.createElement("h3", { style:{ margin:0, fontSize:16, fontWeight:700, color:C.text } }, pages.find(p=>p.key===activePage)?.label),
              React.createElement("div", { style:{ fontSize:12, color:C.textSec, marginTop:2 } }, `Last edited: ${pages.find(p=>p.key===activePage)?.lastEdited}`)
            ),
            React.createElement(Badge, { label:pages.find(p=>p.key===activePage)?.status, dot:true })
          ),
          React.createElement("div", { style:{ display:"flex", flexDirection:"column", gap:16 } },
            Object.entries(content).map(([key, val]) =>
              React.createElement("div", { key },
                React.createElement("label", { style:{ fontSize:12, fontWeight:600, color:C.textSec, textTransform:"capitalize", display:"block", marginBottom:6 } },
                  key.replace(/_/g," ")
                ),
                val.length > 80
                  ? React.createElement("textarea", {
                      defaultValue:val, onFocus:()=>setEditing(key), onBlur:()=>setEditing(null),
                      style:{ width:"100%", background:C.raised, border:`1px solid ${editing===key ? C.purple : C.border}`, borderRadius:8, padding:"10px 12px", color:C.text, fontSize:13, resize:"vertical", minHeight:80, outline:"none", lineHeight:1.6, boxSizing:"border-box", transition:"border-color .15s" }
                    })
                  : React.createElement(Input, { value:val, onChange:()=>{}, style:{ width:"100%" } })
              )
            )
          )
        ),
        React.createElement("div", { style:{ display:"flex", gap:10, justifyContent:"flex-end" } },
          React.createElement(Btn, { variant:"secondary", icon:"eye" }, "Preview"),
          React.createElement(Btn, { icon:"check2" }, "Save Changes")
        )
      )
    )
  );
}

// ─── Reports ─────────────────────────────────────────────────────────────────
function ReportsView() {
  const reports = [
    { title:"Monthly Animals Report",    desc:"Intakes, adoptions, foster placements, outcomes",       icon:"paw",     period:"June 2025",    updated:"Jun 10" },
    { title:"Financial Summary",         desc:"Donations, grants, campaign performance, expenses",      icon:"dollar",  period:"June 2025",    updated:"Jun 10" },
    { title:"Application Pipeline",      desc:"Foster and adoption applications by status and type",    icon:"docs",    period:"YTD 2025",     updated:"Jun 9" },
    { title:"Volunteer Hours Report",    desc:"Hours logged by volunteer, role, and time period",       icon:"people",  period:"May 2025",     updated:"Jun 1" },
    { title:"Medical Compliance Report", desc:"Vaccination, medication, and treatment compliance",      icon:"medical", period:"June 2025",    updated:"Jun 8" },
    { title:"Annual Impact Report",      desc:"Full-year outcomes, financials, and program highlights", icon:"chart",   period:"2024 Annual",  updated:"Jan 2025" },
  ];

  return React.createElement("div", { className: "dash-page" },
    React.createElement(PageHeader, {
      title:"Reports",
      subtitle:"Generate and download reports",
      action: React.createElement(Btn, { icon:"plus", size:"sm" }, "Custom Report")
    }),

    React.createElement("div", { style:{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:14 } },
      reports.map(r =>
        React.createElement(Card, { key:r.title, hover:true, style:{ padding:20, display:"flex", flexDirection:"column", gap:14 } },
          React.createElement("div", { style:{ display:"flex", alignItems:"flex-start", gap:12 } },
            React.createElement("div", { style:{ width:40, height:40, borderRadius:10, background:C.purpleDim, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 } },
              React.createElement(Icon, { name:r.icon, size:18, style:{ color:C.purpleL } })
            ),
            React.createElement("div", null,
              React.createElement("div", { style:{ fontSize:14, fontWeight:700, color:C.text, marginBottom:3 } }, r.title),
              React.createElement("div", { style:{ fontSize:12, color:C.textSec } }, r.desc)
            )
          ),
          React.createElement("div", { style:{ display:"flex", alignItems:"center", justifyContent:"space-between" } },
            React.createElement("div", null,
              React.createElement("div", { style:{ fontSize:11, color:C.textSec } }, `Period: ${r.period}`),
              React.createElement("div", { style:{ fontSize:11, color:C.textMut } }, `Updated: ${r.updated}`)
            ),
            React.createElement("div", { style:{ display:"flex", gap:6 } },
              React.createElement(Btn, { variant:"secondary", size:"sm", icon:"eye" }, "View"),
              React.createElement(Btn, { variant:"ghost", size:"sm", icon:"download" }, "PDF")
            )
          )
        )
      )
    )
  );
}

// ─── Settings ─────────────────────────────────────────────────────────────────
function SettingsView() {
  const [tab, setTab] = useState("org");
  const [saved, setSaved] = useState(false);
  const save = () => { setSaved(true); setTimeout(()=>setSaved(false), 2000); };

  const field = (label, defaultVal, type="text") => React.createElement("div", { key:label, style:{ marginBottom:16 } },
    React.createElement("label", { style:{ fontSize:12, fontWeight:600, color:C.textSec, display:"block", marginBottom:6 } }, label),
    type === "textarea"
      ? React.createElement("textarea", { defaultValue:defaultVal, style:{ width:"100%", background:C.raised, border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 12px", color:C.text, fontSize:13, resize:"vertical", minHeight:72, outline:"none", boxSizing:"border-box" } })
      : React.createElement(Input, { value:defaultVal, onChange:()=>{} })
  );

  const users = [
    { name:"Danielle Chen",  email:"danielle@companionscpas.org", role:"Admin",  status:"Active" },
    { name:"Sam Primeaux",   email:"sam@companionscpas.org",      role:"Staff",  status:"Active" },
    { name:"Maria Lopez",    email:"maria@companionscpas.org",    role:"Staff",  status:"Active" },
    { name:"Guest User",     email:"guest@companionscpas.org",    role:"Viewer", status:"Inactive" },
  ];

  const integrations = [
    { name:"Stripe",    desc:"Payment processing for donations",     connected:true,  icon:"💳" },
    { name:"Mailchimp", desc:"Email marketing and donor newsletters", connected:false, icon:"📧" },
    { name:"Google Drive", desc:"Document storage and backups",      connected:true,  icon:"☁️" },
    { name:"PetFinder", desc:"Sync adoptable animals to PetFinder",  connected:false, icon:"🐾" },
  ];

  return React.createElement("div", { className: "dash-page" },
    React.createElement(PageHeader, {
      title:"Settings",
      subtitle:"Organization, users, and integrations",
      action: saved
        ? React.createElement(Btn, { variant:"success", icon:"check2" }, "Saved!")
        : React.createElement(Btn, { icon:"check2", onClick:save }, "Save Changes")
    }),

    React.createElement(Tabs, {
      tabs:[{value:"org",label:"Organization"},{value:"users",label:"Users"},{value:"integrations",label:"Integrations"},{value:"notifications",label:"Notifications"}],
      active:tab, onChange:setTab
    }),

    tab === "org" && React.createElement(Card, { style:{ padding:24, maxWidth:600 } },
      field("Organization Name", "Companions of CPAS"),
      field("Website URL", "https://companionscpas.org"),
      field("Email Address", "info@companionscpas.org"),
      field("Phone Number", "(555) 000-1234"),
      field("Mailing Address", "123 Rescue Lane, Austin, TX 78701"),
      field("Mission Statement", "To rescue, rehabilitate, and rehome animals in need.", "textarea"),
      field("EIN / Tax ID", "12-3456789"),
    ),

    tab === "users" && React.createElement("div", null,
      React.createElement("div", { style:{ display:"flex", justifyContent:"flex-end", marginBottom:14 } },
        React.createElement(Btn, { icon:"plus", size:"sm" }, "Invite User")
      ),
      React.createElement(Card, { style:{ overflow:"hidden" } },
        React.createElement(Table, {
          cols:[
            { key:"name",   label:"Name",   render:(v,row)=>React.createElement("div",{style:{display:"flex",alignItems:"center",gap:10}}, React.createElement(Avatar,{name:v,size:30}), React.createElement("div",null, React.createElement("div",{style:{fontWeight:600,fontSize:13}},v), React.createElement("div",{style:{fontSize:11,color:C.textSec}},row.email))) },
            { key:"role",   label:"Role",   render:v=>React.createElement(Badge,{label:v}) },
            { key:"status", label:"Status", render:v=>React.createElement(Badge,{label:v,dot:true}) },
            { key:"name",   label:"",       render:()=>React.createElement("div",{style:{display:"flex",gap:6}}, React.createElement(Btn,{size:"sm",variant:"ghost",icon:"edit"},""), React.createElement(Btn,{size:"sm",variant:"ghost",icon:"trash","style":{color:C.red}},"")) },
          ],
          rows:users
        })
      )
    ),

    tab === "integrations" && React.createElement("div", { style:{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:12 } },
      integrations.map(i =>
        React.createElement(Card, { key:i.name, style:{ padding:20 } },
          React.createElement("div", { style:{ display:"flex", alignItems:"center", gap:12, marginBottom:12 } },
            React.createElement("span", { style:{ fontSize:28 } }, i.icon),
            React.createElement("div", null,
              React.createElement("div", { style:{ fontSize:14, fontWeight:700, color:C.text } }, i.name),
              React.createElement("div", { style:{ fontSize:12, color:C.textSec } }, i.desc)
            )
          ),
          React.createElement("div", { style:{ display:"flex", alignItems:"center", justifyContent:"space-between" } },
            React.createElement(Badge, { label:i.connected ? "Connected" : "Not Connected", dot:true }),
            React.createElement(Btn, { variant: i.connected ? "danger" : "secondary", size:"sm" }, i.connected ? "Disconnect" : "Connect")
          )
        )
      )
    ),

    tab === "notifications" && React.createElement(Card, { style:{ padding:24, maxWidth:560 } },
      React.createElement("h3", { style:{ margin:"0 0 16px", fontSize:14, fontWeight:600, color:C.text } }, "Email Notifications"),
      [
        ["New application submitted",           true],
        ["Application status changed",           true],
        ["New donation received",                true],
        ["Medical record overdue",               true],
        ["Daily care tasks incomplete at EOD",   false],
        ["New intake logged",                    true],
        ["Campaign goal reached",                true],
        ["Weekly summary digest",                false],
      ].map(([label, defaultOn]) =>
        React.createElement("div", { key:label, style:{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 0", borderBottom:`1px solid ${C.border}` } },
          React.createElement("span", { style:{ fontSize:13, color:C.text } }, label),
          React.createElement("button", {
            style:{ width:40, height:22, borderRadius:99, background: defaultOn ? C.purple : C.border, border:"none", cursor:"pointer", position:"relative", transition:"background .2s", flexShrink:0 }
          },
            React.createElement("span", { style:{ position:"absolute", top:3, left: defaultOn ? 20 : 3, width:16, height:16, borderRadius:"50%", background:"#fff", transition:"left .2s" } })
          )
        )
      )
    )
  );
}

// ─── Notifications ────────────────────────────────────────────────────────────
function NotificationsView({ onNavigate }) {
  const [notifs, setNotifs] = useState(CPAS.notifications);
  const unread = notifs.filter(n=>!n.read).length;
  const markAll = () => setNotifs(n => n.map(x=>({...x,read:true})));
  const markOne = id => setNotifs(n => n.map(x=>x.id===id?{...x,read:true}:x));

  const typeIcon = { urgent:"⚠️", adoption:"🐾", donation:"💸", volunteer:"👤", medical:"💉", intake:"📥" };
  const typeColor = { urgent:C.red, adoption:C.green, donation:C.purpleL, volunteer:C.teal, medical:C.red, intake:C.teal };

  return React.createElement("div", { className: "dash-page" },
    React.createElement(PageHeader, {
      title:"Notifications",
      subtitle: unread > 0 ? `${unread} unread notification${unread>1?"s":""}` : "All caught up!",
      action: unread > 0 && React.createElement(Btn, { variant:"secondary", size:"sm", onClick:markAll }, "Mark all read")
    }),

    React.createElement("div", { style:{ display:"flex", flexDirection:"column", gap:8, maxWidth:700 } },
      notifs.map(n =>
        React.createElement("div", {
          key:n.id,
          onClick:()=>{ markOne(n.id); onNavigate(n.link); },
          style:{ background: n.read ? C.surface : C.raised, border:`1px solid ${n.read ? C.border : typeColor[n.type]+"44"}`, borderRadius:12, padding:"14px 16px", display:"flex", alignItems:"flex-start", gap:14, cursor:"pointer", transition:"all .15s" },
          onMouseEnter:e=>e.currentTarget.style.borderColor=C.purple,
          onMouseLeave:e=>e.currentTarget.style.borderColor=n.read?C.border:typeColor[n.type]+"44"
        },
          React.createElement("div", { style:{ width:36, height:36, borderRadius:"50%", background:typeColor[n.type]+"22", border:`1px solid ${typeColor[n.type]}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 } }, typeIcon[n.type]||"•"),
          React.createElement("div", { style:{ flex:1 } },
            React.createElement("div", { style:{ display:"flex", alignItems:"center", gap:8, marginBottom:3 } },
              React.createElement("span", { style:{ fontSize:13, fontWeight: n.read ? 500 : 700, color:C.text } }, n.title),
              !n.read && React.createElement("span", { style:{ width:7, height:7, borderRadius:"50%", background:C.purple, flexShrink:0 } })
            ),
            React.createElement("div", { style:{ fontSize:12, color:C.textSec } }, n.body),
            React.createElement("div", { style:{ fontSize:11, color:C.textMut, marginTop:4 } }, n.time)
          ),
          React.createElement(Icon, { name:"chevR", size:14, style:{ color:C.textMut, marginTop:3, flexShrink:0 } })
        )
      )
    )
  );
}

Object.assign(window, { CMSView: AdminCMSView, ReportsView, SettingsView, NotificationsView });
