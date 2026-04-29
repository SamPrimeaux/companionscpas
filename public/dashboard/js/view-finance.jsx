// ─── Finance Views: Fundraising + Donations ───────────────────────────────────

function FundraisingView({ onNavigate }) {
  const [showModal, setShowModal] = useState(false);
  const totalRaised = CPAS.campaigns.reduce((s,c)=>s+c.raised,0);
  const totalGoal   = CPAS.campaigns.reduce((s,c)=>s+c.goal,0);
  const totalDonors = CPAS.campaigns.reduce((s,c)=>s+c.donors,0);

  const catColor = { Medical:"#ef4444", Operations:"#06b6d4", Events:"#10b981" };

  return React.createElement("div", { style:{ padding:"28px 28px 40px", flex:1, overflowY:"auto" } },
    React.createElement(PageHeader, {
      title:"Fundraising",
      subtitle:"Active campaigns and donation goals",
      action: React.createElement(Btn, { icon:"plus", size:"sm", onClick:()=>setShowModal(true) }, "New Campaign")
    }),

    React.createElement("div", { style:{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:28 } },
      React.createElement(StatCard, { icon:"💰", label:"Total Raised",    value:`$${totalRaised.toLocaleString()}`, sub:`of $${totalGoal.toLocaleString()} goal`, subPositive:true }),
      React.createElement(StatCard, { icon:"📊", label:"Active Campaigns", value:CPAS.campaigns.filter(c=>c.status==="Active").length }),
      React.createElement(StatCard, { icon:"👥", label:"Total Donors",     value:totalDonors }),
      React.createElement(StatCard, { icon:"🎯", label:"Overall Progress", value:`${Math.round(totalRaised/totalGoal*100)}%`, sub:"of all-time goal", subPositive:true }),
    ),

    React.createElement("h3", { style:{ margin:"0 0 14px", fontSize:14, fontWeight:600, color:C.text } }, "Campaigns"),
    React.createElement("div", { style:{ display:"flex", flexDirection:"column", gap:14 } },
      CPAS.campaigns.map(campaign => {
        const pct = Math.min(100, Math.round((campaign.raised / campaign.goal) * 100));
        const accent = catColor[campaign.category] || C.purple;
        return React.createElement(Card, { key:campaign.id, style:{ padding:24 } },
          React.createElement("div", { style:{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12, flexWrap:"wrap", gap:8 } },
            React.createElement("div", null,
              React.createElement("div", { style:{ display:"flex", alignItems:"center", gap:10, marginBottom:4 } },
                React.createElement("div", { style:{ width:10, height:10, borderRadius:3, background:accent, flexShrink:0 } }),
                React.createElement("h3", { style:{ margin:0, fontSize:16, fontWeight:700, color:C.text } }, campaign.title),
                React.createElement(Badge, { label:campaign.status, dot:true })
              ),
              React.createElement("p", { style:{ margin:0, fontSize:13, color:C.textSec } }, campaign.desc)
            ),
            React.createElement("div", { style:{ textAlign:"right" } },
              React.createElement("div", { style:{ fontSize:22, fontWeight:700, color:C.text } }, `$${campaign.raised.toLocaleString()}`),
              React.createElement("div", { style:{ fontSize:12, color:C.textSec } }, `of $${campaign.goal.toLocaleString()} goal`)
            )
          ),
          React.createElement("div", { style:{ marginBottom:12 } },
            React.createElement(ProgressBar, { value:campaign.raised, max:campaign.goal, color:accent, height:8 }),
            React.createElement("div", { style:{ display:"flex", justifyContent:"space-between", marginTop:6, fontSize:11, color:C.textSec } },
              React.createElement("span", null, `${pct}% funded`),
              React.createElement("span", null, `${campaign.donors} donors`)
            )
          ),
          React.createElement("div", { style:{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8 } },
            React.createElement("div", { style:{ display:"flex", gap:16 } },
              React.createElement("div", { style:{ fontSize:12, color:C.textSec } }, `📅 ${campaign.startDate} → ${campaign.endDate}`),
              React.createElement("div", { style:{ fontSize:12, color:C.textSec } }, `🏷️ ${campaign.category}`)
            ),
            React.createElement("div", { style:{ display:"flex", gap:8 } },
              React.createElement(Btn, { variant:"secondary", size:"sm", icon:"edit" }, "Edit"),
              React.createElement(Btn, { variant:"secondary", size:"sm", icon:"arrowR", onClick:()=>onNavigate("donations") }, "View Donations")
            )
          )
        );
      })
    ),

    React.createElement(Modal, { open:showModal, onClose:()=>setShowModal(false), title:"New Campaign", width:520 },
      React.createElement("div", { style:{ display:"flex", flexDirection:"column", gap:14 } },
        React.createElement("div", null, React.createElement("label",{style:{fontSize:12,color:C.textSec,display:"block",marginBottom:6}},"Campaign Title"), React.createElement(Input,{value:"",onChange:()=>{},placeholder:"e.g. Emergency Medical Fund"})),
        React.createElement("div", null, React.createElement("label",{style:{fontSize:12,color:C.textSec,display:"block",marginBottom:6}},"Description"), React.createElement("textarea",{placeholder:"What is this campaign for?",style:{width:"100%",background:C.raised,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",color:C.text,fontSize:13,resize:"vertical",minHeight:64,outline:"none",boxSizing:"border-box"}})),
        React.createElement("div", { style:{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 } },
          React.createElement("div", null, React.createElement("label",{style:{fontSize:12,color:C.textSec,display:"block",marginBottom:6}},"Goal Amount"), React.createElement(Input,{value:"",onChange:()=>{},placeholder:"$0.00"})),
          React.createElement("div", null, React.createElement("label",{style:{fontSize:12,color:C.textSec,display:"block",marginBottom:6}},"Category"), React.createElement(Select,{value:"Medical",onChange:()=>{},options:["Medical","Operations","Events","Other"].map(v=>({value:v,label:v}))}))
        ),
        React.createElement("div", { style:{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 } },
          React.createElement("div", null, React.createElement("label",{style:{fontSize:12,color:C.textSec,display:"block",marginBottom:6}},"Start Date"), React.createElement(Input,{value:"",onChange:()=>{},placeholder:"2025-06-11"})),
          React.createElement("div", null, React.createElement("label",{style:{fontSize:12,color:C.textSec,display:"block",marginBottom:6}},"End Date"), React.createElement(Input,{value:"",onChange:()=>{},placeholder:"2025-07-31"}))
        ),
        React.createElement("div",{style:{display:"flex",gap:10,justifyContent:"flex-end"}},
          React.createElement(Btn,{variant:"secondary",onClick:()=>setShowModal(false)},"Cancel"),
          React.createElement(Btn,{onClick:()=>setShowModal(false)},"Create Campaign")
        )
      )
    )
  );
}

// ─── Donations ────────────────────────────────────────────────────────────────
function DonationsView({ onNavigate }) {
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);

  const methods = ["All", ...Array.from(new Set(CPAS.donations.map(d=>d.method)))];
  const filtered = CPAS.donations.filter(d => {
    const matchMethod = methodFilter === "All" || d.method === methodFilter;
    const matchSearch = !search || d.donor.toLowerCase().includes(search.toLowerCase()) || d.id.toLowerCase().includes(search.toLowerCase());
    return matchMethod && matchSearch;
  });

  const totalMTD   = CPAS.donations.reduce((s,d)=>s+d.amount,0);
  const avgAmount  = Math.round(totalMTD / CPAS.donations.length);
  const recurring  = CPAS.donations.filter(d=>d.recurring).length;
  const largest    = Math.max(...CPAS.donations.map(d=>d.amount));

  return React.createElement("div", { style:{ padding:"28px 28px 40px", flex:1, overflowY:"auto" } },
    React.createElement(PageHeader, {
      title:"Donations",
      subtitle:"Donation records and financial tracking",
      action: React.createElement("div",{style:{display:"flex",gap:8}},
        React.createElement(Btn, { variant:"secondary", size:"sm", icon:"download" }, "Export"),
        React.createElement(Btn, { icon:"plus", size:"sm", onClick:()=>setShowModal(true) }, "Record Donation")
      )
    }),

    React.createElement("div", { style:{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:24 } },
      React.createElement(StatCard, { icon:"💵", label:"Total (MTD)",    value:`$${totalMTD.toLocaleString()}`,  sub:"+18% vs last month", subPositive:true, sparkData:[4200,5800,6100,7200,9800,totalMTD], sparkColor:C.green }),
      React.createElement(StatCard, { icon:"📊", label:"Avg Donation",   value:`$${avgAmount}` }),
      React.createElement(StatCard, { icon:"🔁", label:"Recurring",       value:recurring, sub:"active recurring donors", subPositive:true }),
      React.createElement(StatCard, { icon:"🏆", label:"Largest Gift",    value:`$${largest.toLocaleString()}` }),
    ),

    React.createElement("div", { style:{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" } },
      React.createElement(Input, { value:search, onChange:setSearch, placeholder:"Search donors…", icon:"search", style:{ width:260 } }),
      React.createElement(Select, { value:methodFilter, onChange:setMethodFilter, options:methods.map(m=>({value:m,label:m})), style:{ minWidth:140 } })
    ),

    React.createElement(Card, { style:{ overflow:"hidden" } },
      React.createElement(Table, {
        cols:[
          { key:"id",       label:"ID",       render:v=>React.createElement("span",{style:{color:C.textSec,fontFamily:"monospace",fontSize:12}},v) },
          { key:"donor",    label:"Donor",    render:v=>React.createElement("span",{style:{fontWeight:600}},v) },
          { key:"amount",   label:"Amount",   render:v=>React.createElement("span",{style:{fontWeight:700,color:C.green}},"$"+v.toLocaleString()) },
          { key:"date",     label:"Date",     render:v=>React.createElement("span",{style:{color:C.textSec,fontSize:12}},v) },
          { key:"method",   label:"Method",   render:v=>React.createElement(Badge,{label:v}) },
          { key:"campaign", label:"Campaign", render:v=>React.createElement("span",{style:{color:C.textSec,fontSize:12}},v||"General") },
          { key:"recurring",label:"Recurring",render:v=>v?React.createElement(Badge,{label:"Recurring",dot:true}):React.createElement("span",{style:{color:C.textMut,fontSize:12}},"One-time") },
          { key:"status",   label:"Status",   render:v=>React.createElement(Badge,{label:v,dot:true}) },
        ],
        rows: filtered
      })
    ),

    React.createElement(Modal, { open:showModal, onClose:()=>setShowModal(false), title:"Record Donation", width:480 },
      React.createElement("div", { style:{ display:"flex", flexDirection:"column", gap:14 } },
        React.createElement("div", null, React.createElement("label",{style:{fontSize:12,color:C.textSec,display:"block",marginBottom:6}},"Donor Name"), React.createElement(Input,{value:"",onChange:()=>{},placeholder:"Full name or Anonymous"})),
        React.createElement("div", { style:{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 } },
          React.createElement("div", null, React.createElement("label",{style:{fontSize:12,color:C.textSec,display:"block",marginBottom:6}},"Amount"), React.createElement(Input,{value:"",onChange:()=>{},placeholder:"$0.00"})),
          React.createElement("div", null, React.createElement("label",{style:{fontSize:12,color:C.textSec,display:"block",marginBottom:6}},"Method"), React.createElement(Select,{value:"Card",onChange:()=>{},options:["Card","Check","Wire","Cash","Other"].map(v=>({value:v,label:v}))}))
        ),
        React.createElement("div", null, React.createElement("label",{style:{fontSize:12,color:C.textSec,display:"block",marginBottom:6}},"Campaign (Optional)"), React.createElement(Select,{value:"",onChange:()=>{},options:[{value:"",label:"General / No Campaign"},...CPAS.campaigns.map(c=>({value:c.id,label:c.title}))]})),
        React.createElement("div",{style:{display:"flex",gap:10,justifyContent:"flex-end"}},
          React.createElement(Btn,{variant:"secondary",onClick:()=>setShowModal(false)},"Cancel"),
          React.createElement(Btn,{onClick:()=>setShowModal(false)},"Save Donation")
        )
      )
    )
  );
}

Object.assign(window, { FundraisingView, DonationsView });
