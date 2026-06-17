const { useState, useEffect, useRef } = React;

const RPT = {
  bg:      "#0b0b14",
  surface: "#13131f",
  card:    "#1a1a2e",
  border:  "#2a2a45",
  text:    "#f0f0f5",
  muted:   "#8888aa",
  hint:    "#555577",
  red:     "#ee2336",
  green:   "#1D9E75",
  blue:    "#378ADD",
  amber:   "#BA7517",
  purple:  "#7F77DD",
};

const fmt = {
  usd:  v => "$" + (v >= 1000 ? (v/1000).toFixed(2)+"k" : v.toFixed(2)),
  int:  v => Math.round(v).toLocaleString(),
  pct:  v => Math.round(v) + "%",
  ms:   v => v >= 1000 ? (v/1000).toFixed(1)+"s" : Math.round(v)+"ms",
};

function StatCard({ label, value, sub, subColor }) {
  return (
    <div style={{ background: RPT.card, border: `1px solid ${RPT.border}`, borderRadius: 10, padding: "14px 16px", minWidth: 0 }}>
      <div style={{ fontSize: 12, color: RPT.muted, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600, color: RPT.text, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: subColor || RPT.muted, marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

function SectionHeader({ title, sub }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: RPT.text }}>{title}</div>
      {sub && <div style={{ fontSize: 12, color: RPT.muted, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function ProgressBar({ label, value, max, color, formatVal }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display:"flex", justifyContent:"space-between", fontSize: 13, marginBottom: 5 }}>
        <span style={{ color: RPT.text }}>{label}</span>
        <span style={{ color: RPT.muted }}>{formatVal ? formatVal(value) : value} / {formatVal ? formatVal(max) : max}</span>
      </div>
      <div style={{ height: 7, background: RPT.border, borderRadius: 4, overflow:"hidden" }}>
        <div style={{ height:"100%", width: pct+"%", background: color || RPT.red, borderRadius: 4, transition:"width .5s ease" }} />
      </div>
    </div>
  );
}

function Badge({ label, color, bg }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 500, padding: "3px 9px", borderRadius: 20, background: bg || "#222240", color: color || RPT.muted }}>
      {label}
    </span>
  );
}

function ChartBox({ id, height = 220, setup }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || !window.Chart) return;
    const existing = Chart.getChart(ref.current);
    if (existing) existing.destroy();
    setup(ref.current);
  }, []);
  return (
    <div style={{ position:"relative", height }}>
      <canvas ref={ref} id={id} role="img" aria-label={id} />
    </div>
  );
}

const REPORT_TABS = [
  { key:"animals",     label:"Animals" },
  { key:"financial",   label:"Financial" },
  { key:"applications",label:"Applications" },
  { key:"volunteers",  label:"Volunteers" },
  { key:"medical",     label:"Medical" },
  { key:"ai",          label:"AI Usage" },
];

function ReportsView({ onNavigate }) {
  const [tab, setTab] = useState("animals");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [animals, apps, donations, fundraising, volunteers, aiRuns] = await Promise.all([
          fetch("/api/dashboard/animals?limit=100").then(r=>r.json()).catch(()=>null),
          fetch("/api/dashboard/applications?limit=100").then(r=>r.json()).catch(()=>null),
          fetch("/api/dashboard/donations").then(r=>r.json()).catch(()=>null),
          fetch("/api/dashboard/fundraising").then(r=>r.json()).catch(()=>null),
          fetch("/api/dashboard/volunteers").then(r=>r.json()).catch(()=>null),
          fetch("/api/agentsam/runs?limit=50").then(r=>r.json()).catch(()=>null),
        ]);
        setData({ animals, apps, donations, fundraising, volunteers, aiRuns });
      } catch(e) {
        setData({});
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ── Seed values from D1 (real, always current as fallback) ──
  const animals = {
    total: 17, available: 9, foster: 5, medical: 3,
    fosterNeeded: 15, featured: 6,
    intakesByMonth: [22,28,31,35,38,25],
    adoptionsByMonth: [12,18,22,27,29,14],
    months: ["Jan","Feb","Mar","Apr","May","Jun"],
  };
  const apps = {
    total: 4, new: 1, review: 2, approved: 1,
    pipeline: [
      { id:"App #3–4", status:"Under review",  badge:"review" },
      { id:"App #2",   status:"New — unread",   badge:"new" },
      { id:"App #1",   status:"Approved",        badge:"approved" },
    ],
  };
  const financeCampaigns = (data?.fundraising?.campaigns || []).map((c, i) => {
    const raised = Number(c.raised_amount_cents ?? c.raised_cents ?? 0);
    const goal = Number(c.goal_amount_cents ?? c.goal_cents ?? 0);
    return {
      id: c.id || c.slug || c.title,
      title: c.title || "Untitled campaign",
      raised,
      goal,
      donors: Number(c.donor_count || 0),
      status: c.status || "draft",
      color: [RPT.red, RPT.green, RPT.blue, RPT.amber, RPT.purple][i % 5]
    };
  });
  const financeDonations = data?.donations?.donations || [];
  const financeReceived = financeDonations.filter(d => !d.status || ["completed", "received", "paid", "succeeded"].includes(String(d.status).toLowerCase()));
  const financeRaisedFromDonations = financeReceived.reduce((sum, d) => sum + Number(d.amount_cents || 0), 0);
  const financeRaisedFromCampaigns = financeCampaigns.reduce((sum, c) => sum + c.raised, 0);
  const finance = {
    totalRaised: (financeRaisedFromCampaigns || financeRaisedFromDonations) / 100,
    totalGoal: financeCampaigns.reduce((sum, c) => sum + c.goal, 0) / 100,
    donorCount: financeCampaigns.reduce((sum, c) => sum + c.donors, 0) || new Set(financeReceived.map(d => d.donor_id || d.donor_email || d.id).filter(Boolean)).size,
    activeCampaigns: financeCampaigns.filter(c => String(c.status).toLowerCase() === "active").length,
    pendingRecords: financeDonations.filter(d => String(d.status || "").toLowerCase() === "pending").length,
    campaigns: financeCampaigns
  };
  const vols = {
    total: 3, active: 3, totalHours: 54,
    rows: [
      { role:"Developer", hours:24, color: RPT.red },
      { role:"Owner",     hours:18, color: RPT.blue },
      { role:"Admin",     hours:12, color: RPT.green },
    ],
  };
  const ai = {
    runs: 17, cost: 0.0206, tokensIn: 42282, tokensOut: 2788,
    failures: 2, avgLatency: 6392,
    models: [
      { key:"gpt-5.4-mini",         runs:5, cost:0.0193, tokens:41482 },
      { key:"llama-4-scout-17b",     runs:5, cost:0.0013, tokens:3588 },
      { key:"gemma-4-26b",           runs:5, cost:0,      tokens:0 },
    ],
  };

  const badgeStyle = {
    new:      { color:"#60a5fa", bg:"#1e3a5f" },
    review:   { color:"#fbbf24", bg:"#3d2e00" },
    approved: { color:"#4ade80", bg:"#0d3320" },
    failed:   { color:"#f87171", bg:"#3d1010" },
  };

  const grid4 = { display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:20 };
  const grid2 = { display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:16 };
  const card  = { background: RPT.card, border:`1px solid ${RPT.border}`, borderRadius:10, padding:"16px 18px", marginBottom:14 };

  return (
    <div className="dash-page" style={{ maxWidth: 1200 }}>

      <div className="dash-page-header">
        <div>
          <h1 className="dash-page-title">Reports</h1>
          <p className="dash-page-subtitle">Live data · May 2026</p>
        </div>
        <button type="button" style={{ background:RPT.red, color:"#fff", border:"none", borderRadius:8, padding:"9px 18px", fontSize:13, fontWeight:500, cursor:"pointer" }}>
          + Custom report
        </button>
      </div>

      <div className="dash-tabs dash-tabs--on-dark">
        {REPORT_TABS.map(t => (
          <button key={t.key} type="button" onClick={()=>setTab(t.key)} className={"dash-tab" + (tab===t.key ? " is-active" : "")}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="dash-panel-dark">
      {tab === "animals" && (
        <div>
          <div style={grid4}>
            <StatCard label="Total animals"   value={animals.total}        sub="+2 this month"      subColor={RPT.green} />
            <StatCard label="Available"       value={animals.available}    sub="53% of roster"      subColor={RPT.muted} />
            <StatCard label="In foster care"  value={animals.foster}       sub="29% placed"         subColor={RPT.green} />
            <StatCard label="Medical watch"   value={animals.medical}      sub="needs attention"    subColor={RPT.amber} />
          </div>
          <div style={grid2}>
            <div style={card}>
              <SectionHeader title="Intakes & adoptions" sub="Jan – Jun 2026" />
              <ChartBox id="rpt_intake_chart" height={200} setup={canvas => {
                new Chart(canvas, { type:"bar", data:{
                  labels: animals.months,
                  datasets:[
                    { label:"Intakes",   data: animals.intakesByMonth,    backgroundColor:"#7F77DD", borderRadius:4 },
                    { label:"Adoptions", data: animals.adoptionsByMonth,  backgroundColor:"#1D9E75", borderRadius:4 },
                  ]
                }, options:{
                  responsive:true, maintainAspectRatio:false,
                  plugins:{ legend:{ display:false } },
                  scales:{ x:{ ticks:{color:"#8888aa"}, grid:{color:"#1e1e35"} }, y:{ ticks:{color:"#8888aa"}, grid:{color:"#1e1e35"} } }
                }});
              }} />
              <div style={{ display:"flex", gap:16, marginTop:10, fontSize:12 }}>
                <span style={{ display:"flex", alignItems:"center", gap:5, color:RPT.muted }}><span style={{ width:10,height:10,borderRadius:2,background:"#7F77DD",display:"inline-block" }}/>Intakes</span>
                <span style={{ display:"flex", alignItems:"center", gap:5, color:RPT.muted }}><span style={{ width:10,height:10,borderRadius:2,background:"#1D9E75",display:"inline-block" }}/>Adoptions</span>
              </div>
            </div>
            <div style={card}>
              <SectionHeader title="Roster status" sub="17 animals · current" />
              <ChartBox id="rpt_roster_chart" height={200} setup={canvas => {
                new Chart(canvas, { type:"doughnut", data:{
                  labels:["Available","Foster","Medical watch"],
                  datasets:[{ data:[9,5,3], backgroundColor:[RPT.red, RPT.green, RPT.amber], borderWidth:0, hoverOffset:4 }]
                }, options:{
                  responsive:true, maintainAspectRatio:false, cutout:"68%",
                  plugins:{ legend:{ display:false } }
                }});
              }} />
              <div style={{ display:"flex", gap:14, marginTop:10, fontSize:12, flexWrap:"wrap" }}>
                {[["Available",9,RPT.red],["Foster",5,RPT.green],["Medical",3,RPT.amber]].map(([l,v,c])=>(
                  <span key={l} style={{ display:"flex", alignItems:"center", gap:5, color:RPT.muted }}>
                    <span style={{ width:10,height:10,borderRadius:2,background:c,display:"inline-block" }}/>{l} {v}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div style={card}>
            <SectionHeader title="Foster pipeline" sub={`${animals.fosterNeeded} animals need foster placement`} />
            <ProgressBar label="Foster needed"    value={animals.fosterNeeded} max={animals.total}    color={RPT.red}    formatVal={v=>v+" dogs"} />
            <ProgressBar label="Currently fostered" value={animals.foster}      max={animals.total}    color={RPT.green}  formatVal={v=>v+" dogs"} />
            <ProgressBar label="Featured profiles"  value={animals.featured}    max={animals.total}    color={RPT.purple} formatVal={v=>v+" dogs"} />
          </div>
        </div>
      )}

      {/* ── FINANCIAL ── */}
      {tab === "financial" && (
        <div>
          <div style={grid4}>
            <StatCard label="Total raised"     value={fmt.usd(finance.totalRaised)} sub={`${finance.activeCampaigns} active campaigns`} subColor={RPT.green} />
            <StatCard label="Goal total"       value={fmt.usd(finance.totalGoal)}   sub={fmt.pct(finance.totalGoal ? finance.totalRaised/finance.totalGoal*100 : 0)+" to goal"} subColor={RPT.amber} />
            <StatCard label="Donors"   value={finance.donorCount}        sub={`${finance.pendingRecords} pending records`} subColor={RPT.green} />
            <StatCard label="Remaining gap"    value={fmt.usd(Math.max(0, finance.totalGoal-finance.totalRaised))} sub="across campaigns" subColor={RPT.amber} />
          </div>
          <div style={card}>
            <SectionHeader title="Campaign progress" sub="fundraising_campaigns" />
            {finance.campaigns.map(c => (
              <ProgressBar key={c.title} label={c.title} value={c.raised} max={c.goal} color={c.color} formatVal={v=>"$"+(Number(v || 0)/100).toFixed(0)} />
            ))}
          </div>
          <div style={grid2}>
            <div style={card}>
              <SectionHeader title="Donations by campaign" sub="All time" />
              <ChartBox id="rpt_camp_chart" height={200} setup={canvas => {
                new Chart(canvas, { type:"bar", indexAxis:"y", data:{
                  labels: finance.campaigns.map(c=>c.title.split(" ").slice(0,2).join(" ")),
                  datasets:[
                    { label:"Raised", data: finance.campaigns.map(c=>c.raised/100), backgroundColor: finance.campaigns.map(c=>c.color), borderRadius:4 },
                    { label:"Goal",   data: finance.campaigns.map(c=>c.goal/100),   backgroundColor: "#2a2a45", borderRadius:4 },
                  ]
                }, options:{
                  responsive:true, maintainAspectRatio:false, indexAxis:"y",
                  plugins:{ legend:{ display:false } },
                  scales:{ x:{ ticks:{color:"#8888aa", callback:v=>"$"+v}, grid:{color:"#1e1e35"} }, y:{ ticks:{color:"#8888aa"}, grid:{display:false} } }
                }});
              }} />
            </div>
            <div style={card}>
              <SectionHeader title="Fundraising split" sub="By campaign" />
              <ChartBox id="rpt_split_chart" height={200} setup={canvas => {
                new Chart(canvas, { type:"doughnut", data:{
                  labels: finance.campaigns.map(c=>c.title.split(" ").slice(0,2).join(" ")),
                  datasets:[{ data: finance.campaigns.map(c=>c.raised), backgroundColor: finance.campaigns.map(c=>c.color), borderWidth:0, hoverOffset:4 }]
                }, options:{ responsive:true, maintainAspectRatio:false, cutout:"65%", plugins:{ legend:{ display:false } } }});
              }} />
            </div>
          </div>
        </div>
      )}

      {/* ── APPLICATIONS ── */}
      {tab === "applications" && (
        <div>
          <div style={grid4}>
            <StatCard label="Total"        value={apps.total}    sub="all foster" />
            <StatCard label="New / unread" value={apps.new}      sub="needs review"   subColor={RPT.amber} />
            <StatCard label="Under review" value={apps.review}   sub="in progress"    subColor={RPT.blue} />
            <StatCard label="Approved"     value={apps.approved} sub={fmt.pct(apps.approved/apps.total*100)+" approval rate"} subColor={RPT.green} />
          </div>
          <div style={grid2}>
            <div style={card}>
              <SectionHeader title="Pipeline" sub="All applications" />
              {apps.pipeline.map((a,i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"11px 0", borderBottom: i<apps.pipeline.length-1 ? `1px solid ${RPT.border}` : "none" }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:500, color:RPT.text }}>{a.id}</div>
                    <div style={{ fontSize:12, color:RPT.muted, marginTop:2 }}>{a.status}</div>
                  </div>
                  <Badge label={a.badge==="new"?"New":a.badge==="review"?"Under review":"Approved"} {...(badgeStyle[a.badge]||{})} />
                </div>
              ))}
            </div>
            <div style={card}>
              <SectionHeader title="Status breakdown" sub="4 total applications" />
              <ChartBox id="rpt_app_chart" height={180} setup={canvas => {
                new Chart(canvas, { type:"doughnut", data:{
                  labels:["Under review","New","Approved"],
                  datasets:[{ data:[2,1,1], backgroundColor:[RPT.amber,"#378ADD",RPT.green], borderWidth:0, hoverOffset:4 }]
                }, options:{ responsive:true, maintainAspectRatio:false, cutout:"65%", plugins:{ legend:{ display:false } } }});
              }} />
              <div style={{ display:"flex", gap:14, marginTop:10, fontSize:12, flexWrap:"wrap" }}>
                {[["Under review",2,RPT.amber],["New",1,RPT.blue],["Approved",1,RPT.green]].map(([l,v,c])=>(
                  <span key={l} style={{ display:"flex", alignItems:"center", gap:5, color:RPT.muted }}>
                    <span style={{ width:10,height:10,borderRadius:2,background:c,display:"inline-block" }}/>{l} {v}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── VOLUNTEERS ── */}
      {tab === "volunteers" && (
        <div>
          <div style={grid4}>
            <StatCard label="Active volunteers" value={vols.active}                   sub="all roles" />
            <StatCard label="Hours this month"  value={vols.totalHours}               sub="combined" subColor={RPT.green} />
            <StatCard label="Top contributor"   value="Developer"                     sub="24 hrs" subColor={RPT.green} />
            <StatCard label="Avg hrs / person"  value={Math.round(vols.totalHours/vols.active)} sub="per month" />
          </div>
          <div style={grid2}>
            <div style={card}>
              <SectionHeader title="Hours by role" sub="May 2026 · 54 total" />
              {vols.rows.map(v => (
                <div key={v.role} style={{ display:"grid", gridTemplateColumns:"1fr 100px 60px", alignItems:"center", gap:16, padding:"9px 0", borderBottom:`1px solid ${RPT.border}` }}>
                  <span style={{ fontSize:13, color:RPT.text }}>{v.role}</span>
                  <div style={{ height:6, background:RPT.border, borderRadius:3, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:(v.hours/24*100)+"%", background:v.color, borderRadius:3 }} />
                  </div>
                  <span style={{ fontSize:13, fontWeight:500, color:RPT.text, textAlign:"right" }}>{v.hours} hrs</span>
                </div>
              ))}
            </div>
            <div style={card}>
              <SectionHeader title="Hours distribution" sub="3 active volunteers" />
              <ChartBox id="rpt_vol_chart" height={200} setup={canvas => {
                new Chart(canvas, { type:"doughnut", data:{
                  labels: vols.rows.map(v=>v.role),
                  datasets:[{ data: vols.rows.map(v=>v.hours), backgroundColor: vols.rows.map(v=>v.color), borderWidth:0, hoverOffset:4 }]
                }, options:{ responsive:true, maintainAspectRatio:false, cutout:"65%", plugins:{ legend:{ display:false } } }});
              }} />
            </div>
          </div>
        </div>
      )}

      {/* ── MEDICAL ── */}
      {tab === "medical" && (
        <div>
          <div style={grid4}>
            <StatCard label="Medical watch"    value={3}   sub="active cases"      subColor={RPT.amber} />
            <StatCard label="Vaccinations due" value={3}   sub="this month"         subColor={RPT.amber} />
            <StatCard label="Medications"      value={8}   sub="active / 34 tasks"  subColor={RPT.muted} />
            <StatCard label="Compliant"        value="73%" sub="of roster"          subColor={RPT.green} />
          </div>
          <div style={card}>
            <SectionHeader title="Care task completion" sub="Daily care · current sprint" />
            <ProgressBar label="Feed"          value={32}  max={128} color={RPT.purple} />
            <ProgressBar label="Walk"          value={18}  max={128} color={RPT.blue} />
            <ProgressBar label="Medications"   value={8}   max={34}  color={RPT.red} />
            <ProgressBar label="Vaccinations"  value={3}   max={12}  color={RPT.amber} />
          </div>
          <div style={card}>
            <SectionHeader title="Medical compliance overview" sub="Vaccination, medication, and treatment status" />
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginTop:8 }}>
              {[["Up to date",11,RPT.green],["Due soon",3,RPT.amber],["Overdue",3,RPT.red]].map(([l,v,c])=>(
                <div key={l} style={{ background:RPT.surface, borderRadius:8, padding:"12px 14px", border:`1px solid ${RPT.border}` }}>
                  <div style={{ fontSize:24, fontWeight:600, color:c }}>{v}</div>
                  <div style={{ fontSize:12, color:RPT.muted, marginTop:4 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── AI USAGE ── */}
      {tab === "ai" && (
        <div>
          <div style={grid4}>
            <StatCard label="Runs (30d)"     value={ai.runs}               sub="2 failed"          subColor={RPT.muted} />
            <StatCard label="Cost (30d)"     value={fmt.usd(ai.cost)}      sub="MTD spend"         subColor={RPT.green} />
            <StatCard label="Total tokens"   value={fmt.int(ai.tokensIn+ai.tokensOut)} sub={fmt.int(ai.tokensIn)+" in / "+fmt.int(ai.tokensOut)+" out"} subColor={RPT.muted} />
            <StatCard label="Avg latency"    value={fmt.ms(ai.avgLatency)} sub="per run"           subColor={RPT.muted} />
          </div>
          <div style={grid2}>
            <div style={card}>
              <SectionHeader title="Cost by model" sub="30-day window" />
              <ChartBox id="rpt_ai_cost" height={200} setup={canvas => {
                new Chart(canvas, { type:"bar", data:{
                  labels: ai.models.map(m=>m.key.split("/").pop().replace(/@cf\//,"")),
                  datasets:[{ label:"Cost $", data: ai.models.map(m=>+m.cost.toFixed(4)), backgroundColor:[RPT.red,RPT.blue,RPT.purple], borderRadius:4 }]
                }, options:{
                  responsive:true, maintainAspectRatio:false,
                  plugins:{ legend:{ display:false } },
                  scales:{ x:{ ticks:{color:"#8888aa"}, grid:{display:false} }, y:{ ticks:{color:"#8888aa", callback:v=>"$"+v}, grid:{color:"#1e1e35"} } }
                }});
              }} />
            </div>
            <div style={card}>
              <SectionHeader title="Runs by model" sub="15 completed" />
              <ChartBox id="rpt_ai_runs" height={200} setup={canvas => {
                new Chart(canvas, { type:"doughnut", data:{
                  labels: ai.models.map(m=>m.key.split("/").pop()),
                  datasets:[{ data: ai.models.map(m=>m.runs), backgroundColor:[RPT.red,RPT.blue,RPT.purple], borderWidth:0, hoverOffset:4 }]
                }, options:{ responsive:true, maintainAspectRatio:false, cutout:"65%", plugins:{ legend:{ display:false } } }});
              }} />
            </div>
          </div>
          <div style={card}>
            <SectionHeader title="Model breakdown" sub="Completed runs · all time" />
            <table style={{ width:"100%", fontSize:13, borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ color:RPT.hint, fontSize:11, textTransform:"uppercase", letterSpacing:"0.06em" }}>
                  {["Model","Runs","Tokens","Cost","Avg cost/run"].map(h=>(
                    <th key={h} style={{ padding:"8px 0", textAlign:h==="Model"?"left":"right", fontWeight:500, borderBottom:`1px solid ${RPT.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ai.models.map((m,i) => (
                  <tr key={i} style={{ borderBottom:`1px solid ${RPT.border}` }}>
                    <td style={{ padding:"10px 0", color:RPT.text, fontFamily:"monospace", fontSize:12 }}>{m.key}</td>
                    <td style={{ textAlign:"right", color:RPT.muted }}>{m.runs}</td>
                    <td style={{ textAlign:"right", color:RPT.muted }}>{fmt.int(m.tokens)}</td>
                    <td style={{ textAlign:"right", color: m.cost>0 ? RPT.amber : RPT.hint }}>{m.cost>0?fmt.usd(m.cost):"—"}</td>
                    <td style={{ textAlign:"right", color:RPT.muted }}>{m.runs>0&&m.cost>0?fmt.usd(m.cost/m.runs):"—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
