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
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [editing, setEditing] = useState(null);
  const [inviteForm, setInviteForm] = useState({ email: "", full_name: "", role: "volunteer" });
  const [editForm, setEditForm] = useState({ full_name: "", role: "volunteer", status: "active" });
  const [actionMsg, setActionMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const currentUserId = (window.CPAS_USER && (window.CPAS_USER.id || window.CPAS_USER.user_id)) || null;

  const save = () => { setSaved(true); setTimeout(()=>setSaved(false), 2000); };

  function membersApi(url, options) {
    return fetch(url, Object.assign({ credentials: "include", headers: { "Content-Type": "application/json" } }, options || {}))
      .then(function(r) { return r.json().then(function(d) { if (!r.ok) throw new Error(d.error || "Request failed"); return d; }); });
  }

  function loadMembers() {
    setMembersLoading(true);
    setMembersError("");
    membersApi("/api/dashboard/members")
      .then(function(d) { setMembers(d.members || []); setMembersLoading(false); })
      .catch(function(e) { setMembersError(e.message || "Failed to load members."); setMembersLoading(false); });
  }

  useEffect(function() {
    if (tab === "users") loadMembers();
  }, [tab]);

  function roleLabel(role) {
    if (!role) return "Member";
    return role.charAt(0).toUpperCase() + role.slice(1);
  }

  function statusLabel(status) {
    if (!status) return "Unknown";
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  function submitInvite() {
    if (!inviteForm.email.trim()) return;
    setSaving(true);
    setActionMsg("");
    membersApi("/api/dashboard/members/invite", {
      method: "POST",
      body: JSON.stringify({ email: inviteForm.email.trim(), full_name: inviteForm.full_name.trim(), role: inviteForm.role })
    })
      .then(function(d) {
        setShowInvite(false);
        setInviteForm({ email: "", full_name: "", role: "volunteer" });
        setActionMsg(d.email_sent ? "Invite sent." : "Member invited (email not sent).");
        loadMembers();
      })
      .catch(function(e) { setActionMsg(e.message || "Invite failed."); })
      .finally(function() { setSaving(false); });
  }

  function openEdit(member) {
    setEditing(member);
    setEditForm({ full_name: member.full_name || "", role: member.role || "volunteer", status: member.status || "active" });
  }

  function submitEdit() {
    if (!editing) return;
    setSaving(true);
    setActionMsg("");
    membersApi("/api/dashboard/members/" + encodeURIComponent(editing.membership_id), {
      method: "PATCH",
      body: JSON.stringify(editForm)
    })
      .then(function() {
        setEditing(null);
        setActionMsg("Member updated.");
        loadMembers();
      })
      .catch(function(e) { setActionMsg(e.message || "Update failed."); })
      .finally(function() { setSaving(false); });
  }

  function deactivateMember(member) {
    if (!member || !member.membership_id) return;
    if (!confirm("Deactivate " + (member.full_name || member.email) + "? They will lose dashboard access.")) return;
    setSaving(true);
    setActionMsg("");
    membersApi("/api/dashboard/members/" + encodeURIComponent(member.membership_id), { method: "DELETE" })
      .then(function() { setActionMsg("Member deactivated."); loadMembers(); })
      .catch(function(e) { setActionMsg(e.message || "Deactivate failed."); })
      .finally(function() { setSaving(false); });
  }

  const field = (label, defaultVal, type="text") => React.createElement("div", { key:label, style:{ marginBottom:16 } },
    React.createElement("label", { style:{ fontSize:12, fontWeight:600, color:C.textSec, display:"block", marginBottom:6 } }, label),
    type === "textarea"
      ? React.createElement("textarea", { defaultValue:defaultVal, style:{ width:"100%", background:C.raised, border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 12px", color:C.text, fontSize:13, resize:"vertical", minHeight:72, outline:"none", boxSizing:"border-box" } })
      : React.createElement(Input, { value:defaultVal, onChange:()=>{} })
  );

  const roleOptions = [
    { value: "admin", label: "Admin" },
    { value: "volunteer", label: "Volunteer" },
    { value: "viewer", label: "Viewer" },
  ];
  const statusOptions = [
    { value: "active", label: "Active" },
    { value: "invited", label: "Invited" },
    { value: "inactive", label: "Inactive" },
  ];

  return React.createElement("div", { className: "dash-page" },
    React.createElement(PageHeader, {
      title:"Settings",
      subtitle:"Organization, team members, and notifications",
      action: saved
        ? React.createElement(Btn, { variant:"success", icon:"check2" }, "Saved!")
        : React.createElement(Btn, { icon:"check2", onClick:save }, "Save Changes")
    }),

    React.createElement(Tabs, {
      tabs:[{value:"org",label:"Organization"},{value:"users",label:"Users"},{value:"notifications",label:"Notifications"}],
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
      React.createElement("p", { style:{ marginTop:8, fontSize:12, color:C.textSec, lineHeight:1.5 } },
        "Google Drive and CMS assets are managed under ",
        React.createElement("a", { href:"/dashboard/cms/images", style:{ color:C.purpleL } }, "CMS → Images"),
        "."
      )
    ),

    tab === "users" && React.createElement("div", null,
      actionMsg && React.createElement("div", { style:{ marginBottom:12, fontSize:13, color:C.teal } }, actionMsg),
      membersError && React.createElement("div", { style:{ marginBottom:12, fontSize:13, color:C.red } }, membersError),
      React.createElement("div", { style:{ display:"flex", justifyContent:"flex-end", marginBottom:14 } },
        React.createElement(Btn, { icon:"plus", size:"sm", onClick:function(){ setShowInvite(true); setActionMsg(""); } }, "Invite User")
      ),
      membersLoading
        ? React.createElement(Card, { style:{ padding:32, textAlign:"center", color:C.textSec } }, "Loading team members…")
        : React.createElement(Card, { style:{ overflow:"hidden" } },
            React.createElement(Table, {
              cols:[
                { key:"full_name", label:"Name", render:function(v,row){ return React.createElement("div",{style:{display:"flex",alignItems:"center",gap:10}}, React.createElement(Avatar,{name:v||row.email,size:30}), React.createElement("div",null, React.createElement("div",{style:{fontWeight:600,fontSize:13}},v||row.email), React.createElement("div",{style:{fontSize:11,color:C.textSec}},row.email))); } },
                { key:"role", label:"Role", render:function(v){ return React.createElement(Badge,{label:roleLabel(v)}); } },
                { key:"status", label:"Status", render:function(v){ return React.createElement(Badge,{label:statusLabel(v),dot:true}); } },
                { key:"membership_id", label:"", render:function(v,row){
                  const isSelf = currentUserId && row.user_id === currentUserId;
                  return React.createElement("div",{style:{display:"flex",gap:6}},
                    React.createElement(Btn,{size:"sm",variant:"ghost",icon:"edit",onClick:function(){ openEdit(row); }}, ""),
                    !isSelf && row.status !== "inactive" && React.createElement(Btn,{size:"sm",variant:"ghost",icon:"trash",style:{color:C.red},onClick:function(){ deactivateMember(row); }}, "")
                  );
                } },
              ],
              rows: members
            })
          ),
      React.createElement(Modal, { open:showInvite, onClose:function(){ setShowInvite(false); }, title:"Invite team member", width:480 },
        React.createElement("div", { style:{ display:"flex", flexDirection:"column", gap:14 } },
          React.createElement("div", null,
            React.createElement("label", { style:{ fontSize:12, fontWeight:600, color:C.textSec, display:"block", marginBottom:6 } }, "Email"),
            React.createElement(Input, { value:inviteForm.email, onChange:function(v){ setInviteForm(function(f){ return Object.assign({}, f, { email:v }); }); }, placeholder:"name@example.com" })
          ),
          React.createElement("div", null,
            React.createElement("label", { style:{ fontSize:12, fontWeight:600, color:C.textSec, display:"block", marginBottom:6 } }, "Full name"),
            React.createElement(Input, { value:inviteForm.full_name, onChange:function(v){ setInviteForm(function(f){ return Object.assign({}, f, { full_name:v }); }); }, placeholder:"Jane Doe" })
          ),
          React.createElement("div", null,
            React.createElement("label", { style:{ fontSize:12, fontWeight:600, color:C.textSec, display:"block", marginBottom:6 } }, "Role"),
            React.createElement(Select, { value:inviteForm.role, onChange:function(v){ setInviteForm(function(f){ return Object.assign({}, f, { role:v }); }); }, options:roleOptions })
          ),
          React.createElement("div", { style:{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:8 } },
            React.createElement(Btn, { variant:"secondary", onClick:function(){ setShowInvite(false); } }, "Cancel"),
            React.createElement(Btn, { onClick:submitInvite, disabled:saving || !inviteForm.email.trim() }, saving ? "Sending…" : "Send invite")
          )
        )
      ),
      React.createElement(Modal, { open:!!editing, onClose:function(){ setEditing(null); }, title:"Edit team member", width:480 },
        editing && React.createElement("div", { style:{ display:"flex", flexDirection:"column", gap:14 } },
          React.createElement("div", { style:{ fontSize:12, color:C.textSec, marginBottom:4 } }, editing.email),
          React.createElement("div", null,
            React.createElement("label", { style:{ fontSize:12, fontWeight:600, color:C.textSec, display:"block", marginBottom:6 } }, "Full name"),
            React.createElement(Input, { value:editForm.full_name, onChange:function(v){ setEditForm(function(f){ return Object.assign({}, f, { full_name:v }); }); } })
          ),
          React.createElement("div", null,
            React.createElement("label", { style:{ fontSize:12, fontWeight:600, color:C.textSec, display:"block", marginBottom:6 } }, "Role"),
            React.createElement(Select, { value:editForm.role, onChange:function(v){ setEditForm(function(f){ return Object.assign({}, f, { role:v }); }); }, options:roleOptions, style: editing.user_id === currentUserId ? { opacity:0.6, pointerEvents:"none" } : {} })
          ),
          React.createElement("div", null,
            React.createElement("label", { style:{ fontSize:12, fontWeight:600, color:C.textSec, display:"block", marginBottom:6 } }, "Status"),
            React.createElement(Select, { value:editForm.status, onChange:function(v){ setEditForm(function(f){ return Object.assign({}, f, { status:v }); }); }, options:statusOptions, style: editing.user_id === currentUserId ? { opacity:0.6, pointerEvents:"none" } : {} })
          ),
          React.createElement("div", { style:{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:8 } },
            React.createElement(Btn, { variant:"secondary", onClick:function(){ setEditing(null); } }, "Cancel"),
            React.createElement(Btn, { onClick:submitEdit, disabled:saving }, saving ? "Saving…" : "Save changes")
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
