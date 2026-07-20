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
  usdCents: v => "$" + (Number(v || 0) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  int:  v => Math.round(v).toLocaleString(),
  pct:  v => Math.round(v) + "%",
  ms:   v => v >= 1000 ? (v/1000).toFixed(1)+"s" : Math.round(v)+"ms",
  date: v => {
    if (!v) return "—";
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? String(v).slice(0, 10) : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  },
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
  { key:"financial",   label:"Financial" },
  { key:"animals",     label:"Animals" },
  { key:"applications",label:"Applications" },
  { key:"medical",     label:"Medical" },
  { key:"ai",          label:"AI Usage" },
];

function ReportsView({ onNavigate }) {
  const [tab, setTab] = useState("financial");
  const [data, setData] = useState(null);
  const [financial, setFinancial] = useState(null);
  const [financialLoading, setFinancialLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [animals, apps, donations, fundraising, aiRuns] = await Promise.all([
          fetch("/api/dashboard/animals?limit=100").then(r=>r.json()).catch(()=>null),
          fetch("/api/dashboard/applications?limit=100").then(r=>r.json()).catch(()=>null),
          fetch("/api/dashboard/donations").then(r=>r.json()).catch(()=>null),
          fetch("/api/dashboard/fundraising").then(r=>r.json()).catch(()=>null),
          fetch("/api/agentsam/runs?limit=50").then(r=>r.json()).catch(()=>null),
        ]);
        setData({ animals, apps, donations, fundraising, aiRuns });
      } catch(e) {
        setData({});
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (tab !== "financial") return;
    setFinancialLoading(true);
    fetch("/api/dashboard/reports/financial", { credentials: "include", headers: { Accept: "application/json" } })
      .then(r => r.json())
      .then(d => setFinancial(d))
      .catch(() => setFinancial({ summary: {}, donations: [] }))
      .finally(() => setFinancialLoading(false));
  }, [tab]);

  // ── Animals from live animal_profiles roster ──
  const animalRows = data?.animals?.animals || [];

  function monthKeyFromDate(value) {
    const s = String(value || "").trim();
    if (/^\d{4}-\d{2}/.test(s)) return s.slice(0, 7);
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return null;
    return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0");
  }

  function lastNMonthKeys(n) {
    const out = [];
    const now = new Date();
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      out.push(d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0"));
    }
    return out;
  }

  const MONTH_LABELS = { "01":"Jan","02":"Feb","03":"Mar","04":"Apr","05":"May","06":"Jun","07":"Jul","08":"Aug","09":"Sep","10":"Oct","11":"Nov","12":"Dec" };
  const monthKeys = lastNMonthKeys(6);
  const intakesByMonth = monthKeys.map((ym) => animalRows.filter((a) => monthKeyFromDate(a.intake_date) === ym).length);
  const adoptionsByMonth = monthKeys.map((ym) => animalRows.filter((a) => {
    if (String(a.status || "").toLowerCase() !== "adopted") return false;
    const meta = a.metadata || (() => {
      try { return typeof a.metadata_json === "string" ? JSON.parse(a.metadata_json || "{}") : (a.metadata_json || {}); } catch (_) { return {}; }
    })();
    const adoptedAt = meta.adopted_at || a.updated_at || a.created_at;
    return monthKeyFromDate(adoptedAt) === ym;
  }).length);
  const months = monthKeys.map((ym) => MONTH_LABELS[ym.slice(5)] || ym.slice(5));
  const intakesWithDate = animalRows.filter((a) => !!monthKeyFromDate(a.intake_date)).length;
  const adoptedCount = animalRows.filter((a) => String(a.status || "").toLowerCase() === "adopted").length;

  const animals = {
    total:        animalRows.length,
    available:    animalRows.filter(a => String(a.status||"").toLowerCase() === "available").length,
    foster:       animalRows.filter(a => /foster/i.test(String(a.status||""))).length,
    medical:      animalRows.filter(a => String(a.status||"").toLowerCase() === "medical").length,
    pending:      animalRows.filter(a => String(a.status||"").toLowerCase() === "pending").length,
    fosterNeeded: animalRows.filter(a => a.foster_needed && !["adopted","deceased","transferred"].includes(String(a.status||"").toLowerCase())).length,
    featured:     animalRows.filter(a => a.featured).length,
    draft:        animalRows.filter(a => String(a.status||"").toLowerCase() === "draft").length,
    adopted:      adoptedCount,
    intakesByMonth,
    adoptionsByMonth,
    months,
    chartNote: intakesWithDate
      ? `From animal profiles · ${intakesWithDate} with intake dates · ${adoptedCount} adopted`
      : "Add intake dates on animal profiles to populate this chart",
  };

  const appRows = data?.apps?.applications || data?.apps?.results || [];
  function appStatus(a) {
    return String(a.review_status || a.status || "").toLowerCase();
  }
  const apps = {
    total: appRows.length,
    new: appRows.filter((a) => ["new", "pending", "submitted", "unread"].includes(appStatus(a))).length,
    review: appRows.filter((a) => ["review", "under_review", "in_review"].includes(appStatus(a))).length,
    approved: appRows.filter((a) => appStatus(a) === "approved").length,
    denied: appRows.filter((a) => ["denied", "rejected"].includes(appStatus(a))).length,
    pipeline: appRows.slice(0, 12).map((a) => ({
      id: a.applicant_name || [a.first_name, a.last_name].filter(Boolean).join(" ") || a.id,
      status: a.review_status || a.status || "pending",
      badge: appStatus(a) === "approved" ? "approved" : (["review", "under_review", "in_review"].includes(appStatus(a)) ? "review" : "new"),
    })),
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
  const financialSummary = financial?.summary || {};
  const financialDonations = financial?.donations || [];
  const paidDonations = financialDonations.filter(d => {
    const status = String(d.status || "").toLowerCase();
    const pi = String(d.stripe_payment_intent_id || "");
    const isDemo = Number(d.is_demo) === 1 || status === "demo" || String(d.payment_provider || "").toLowerCase() === "mock_settle";
    return !isDemo && ["completed", "received", "paid", "succeeded"].includes(status) && pi.startsWith("pi_");
  });
  const demoDonations = financialDonations.filter(d => {
    const status = String(d.status || "").toLowerCase();
    return Number(d.is_demo) === 1 || status === "demo" || String(d.payment_provider || "").toLowerCase() === "mock_settle" || (["completed", "received", "paid", "succeeded"].includes(status) && !String(d.stripe_payment_intent_id || "").startsWith("pi_"));
  });
  const reportDonations = paidDonations.concat(demoDonations);

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
          <p className="dash-page-subtitle">Live data from your roster and Stripe</p>
        </div>
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
            <StatCard label="Total animals"   value={animals.total}        sub={`${animals.available} available · ${animals.pending} pending`} subColor={RPT.muted} />
            <StatCard label="Available"       value={animals.available}    sub={animals.total ? Math.round(animals.available/animals.total*100)+"% of roster" : "—"} subColor={RPT.green} />
            <StatCard label="In foster care"  value={animals.foster}       sub={animals.total ? Math.round(animals.foster/animals.total*100)+"% placed" : "—"} subColor={RPT.green} />
            <StatCard label="Medical watch"   value={animals.medical}      sub={animals.medical > 0 ? "needs attention" : "all clear"} subColor={animals.medical > 0 ? RPT.amber : RPT.green} />
          </div>
          <div style={grid2}>
            <div style={card}>
              <SectionHeader title="Intakes & adoptions" sub={animals.chartNote} />
              <ChartBox key={"intake-"+monthKeys.join("-")+"-"+intakesByMonth.join(".")+"-"+adoptionsByMonth.join(".")} id="rpt_intake_chart" height={200} setup={canvas => {
                new Chart(canvas, { type:"bar", data:{
                  labels: animals.months,
                  datasets:[
                    { label:"Intakes",   data: animals.intakesByMonth,    backgroundColor:"#7F77DD", borderRadius:4 },
                    { label:"Adoptions", data: animals.adoptionsByMonth,  backgroundColor:"#1D9E75", borderRadius:4 },
                  ]
                }, options:{
                  responsive:true, maintainAspectRatio:false,
                  plugins:{ legend:{ display:false } },
                  scales:{ x:{ ticks:{color:"#8888aa"}, grid:{color:"#1e1e35"} }, y:{ ticks:{color:"#8888aa", precision:0}, grid:{color:"#1e1e35"}, beginAtZero:true } }
                }});
              }} />
              <div style={{ display:"flex", gap:16, marginTop:10, fontSize:12 }}>
                <span style={{ display:"flex", alignItems:"center", gap:5, color:RPT.muted }}><span style={{ width:10,height:10,borderRadius:2,background:"#7F77DD",display:"inline-block" }}/>Intakes</span>
                <span style={{ display:"flex", alignItems:"center", gap:5, color:RPT.muted }}><span style={{ width:10,height:10,borderRadius:2,background:"#1D9E75",display:"inline-block" }}/>Adoptions</span>
              </div>
            </div>
            <div style={card}>
              <SectionHeader title="Roster status" sub={`${animals.total} animals · current`} />
              <ChartBox key={"roster-"+animals.available+"-"+animals.foster+"-"+animals.medical} id="rpt_roster_chart" height={200} setup={canvas => {
                new Chart(canvas, { type:"doughnut", data:{
                  labels:["Available","Foster","Medical watch"],
                  datasets:[{ data:[animals.available, animals.foster, animals.medical], backgroundColor:[RPT.red, RPT.green, RPT.amber], borderWidth:0, hoverOffset:4 }]
                }, options:{
                  responsive:true, maintainAspectRatio:false, cutout:"68%",
                  plugins:{ legend:{ display:false } }
                }});
              }} />
              <div style={{ display:"flex", gap:14, marginTop:10, fontSize:12, flexWrap:"wrap" }}>
                {[["Available",animals.available,RPT.red],["Foster",animals.foster,RPT.green],["Medical",animals.medical,RPT.amber]].map(([l,v,c])=>(
                  <span key={l} style={{ display:"flex", alignItems:"center", gap:5, color:RPT.muted }}>
                    <span style={{ width:10,height:10,borderRadius:2,background:c,display:"inline-block" }}/>{l} {v}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div style={card}>
            <SectionHeader title="Foster pipeline" sub={animals.fosterNeeded ? `${animals.fosterNeeded} animals need foster placement` : "Foster placement up to date"} />
            <ProgressBar label="Foster needed"      value={animals.fosterNeeded} max={animals.total || 1} color={RPT.red}    formatVal={v=>v+" animals"} />
            <ProgressBar label="Currently fostered" value={animals.foster}       max={animals.total || 1} color={RPT.green}  formatVal={v=>v+" animals"} />
            <ProgressBar label="Featured profiles"  value={animals.featured}     max={animals.total || 1} color={RPT.purple} formatVal={v=>v+" animals"} />
          </div>
        </div>
      )}

      {/* ── FINANCIAL ── */}
      {tab === "financial" && (
        <div>
          {financialLoading ? (
            <div style={{ ...card, color: RPT.muted }}>Loading Stripe donations…</div>
          ) : (
            <>
              <div style={grid4}>
                <StatCard label="Total Raised" value={financialSummary.total_raised_display || fmt.usdCents(0)} sub={`${financialSummary.total_donations || 0} real Stripe payments`} subColor={RPT.green} />
                <StatCard label="This Month" value={financialSummary.this_month_display || fmt.usdCents(0)} sub={`${financialSummary.this_month_donations || 0} donations in ${new Date().toLocaleString(undefined, { month: "long", year: "numeric" })}`} subColor={RPT.green} />
                <StatCard label="Total Donations" value={financialSummary.total_donations || 0} sub="Stripe succeeded only" subColor={RPT.muted} />
                <StatCard label="Avg Gift" value={financialSummary.avg_gift_display || fmt.usdCents(0)} sub="per real donation" subColor={RPT.muted} />
              </div>
              <div style={card}>
                <SectionHeader title="Donations" sub={`Real Stripe charges · demos excluded from totals${demoDonations.length ? ` · ${demoDonations.length} demo/test row(s) shown below` : ""}`} />
                {!reportDonations.length ? (
                  <div style={{ color: RPT.muted, fontSize: 13, padding: "8px 0" }}>No donations recorded yet.</div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ color: RPT.muted, textAlign: "left", borderBottom: `1px solid ${RPT.border}` }}>
                          {["Date", "Donor", "Raised", "Charged", "Campaign", "Status", "Stripe ID"].map(col => (
                            <th key={col} style={{ padding: "10px 8px", fontWeight: 600 }}>{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {reportDonations.map(row => {
                          const isDemo = Number(row.is_demo) === 1 || String(row.status || "").toLowerCase() === "demo" || String(row.payment_provider || "").toLowerCase() === "mock_settle";
                          const donorLabel = row.is_anonymous ? "Anonymous" : (row.donor_name || row.donor_email || "—");
                          const stripeId = row.stripe_payment_intent_id || "";
                          const raisedCents = Number(row.intended_amount_cents ?? row.amount_cents ?? 0);
                          const chargedCents = Number(row.amount_cents ?? raisedCents);
                          const feeNote = row.cover_fees ? "Fees covered" : null;
                          return (
                            <tr key={row.id} style={{ borderBottom: `1px solid ${RPT.border}`, opacity: isDemo ? 0.72 : 1 }}>
                              <td style={{ padding: "11px 8px", color: RPT.textSec, whiteSpace: "nowrap" }}>{fmt.date(row.donated_at || row.created_at)}</td>
                              <td style={{ padding: "11px 8px", color: RPT.text }}>{donorLabel}</td>
                              <td style={{ padding: "11px 8px", color: isDemo ? RPT.muted : RPT.green, fontWeight: 600 }}>{fmt.usdCents(raisedCents)}</td>
                              <td style={{ padding: "11px 8px", color: RPT.textSec }}>
                                {fmt.usdCents(chargedCents)}
                                {feeNote && <span style={{ display: "block", fontSize: 11, color: RPT.muted, marginTop: 2 }}>{feeNote}</span>}
                              </td>
                              <td style={{ padding: "11px 8px", color: RPT.textSec }}>{row.campaign_title || "General"}</td>
                              <td style={{ padding: "11px 8px" }}>
                                <Badge
                                  label={isDemo ? "demo / not paid" : (row.status || "succeeded")}
                                  color={isDemo ? RPT.muted : RPT.green}
                                  bg={isDemo ? "#1e293b" : "#0d3320"}
                                />
                              </td>
                              <td style={{ padding: "11px 8px" }}>
                                {stripeId && stripeId.startsWith("pi_") ? (
                                  <a href={`https://dashboard.stripe.com/payments/${stripeId}`} target="_blank" rel="noopener noreferrer" style={{ color: RPT.blue, textDecoration: "none", fontFamily: "monospace", fontSize: 12 }}>
                                    {stripeId.slice(0, 18)}…
                                  </a>
                                ) : (isDemo ? "— (demo)" : "—")}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── APPLICATIONS ── */}
      {tab === "applications" && (
        <div>
          <div style={grid4}>
            <StatCard label="Total"        value={apps.total}    sub="foster applications" />
            <StatCard label="New / pending" value={apps.new}     sub="needs review"   subColor={RPT.amber} />
            <StatCard label="Under review" value={apps.review}   sub="in progress"    subColor={RPT.blue} />
            <StatCard label="Approved"     value={apps.approved} sub={apps.total ? fmt.pct(apps.approved/apps.total*100)+" approval rate" : "—"} subColor={RPT.green} />
          </div>
          {!apps.total ? (
            <div style={{ ...card, color: RPT.muted, fontSize: 13 }}>
              No foster applications in D1 yet. Public submissions land here after <code>POST /api/foster/apply</code> succeeds (site foster CTA modal). The dedicated <code>/services</code> and <code>/foster</code> pages are not live — flag for the product call.
            </div>
          ) : (
            <div style={grid2}>
              <div style={card}>
                <SectionHeader title="Pipeline" sub={`${apps.total} applications`} />
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
                <SectionHeader title="Status breakdown" sub={`${apps.total} total`} />
                <ChartBox key={"apps-"+apps.total+"-"+apps.review+"-"+apps.new+"-"+apps.approved} id="rpt_app_chart" height={180} setup={canvas => {
                  new Chart(canvas, { type:"doughnut", data:{
                    labels:["Under review","New","Approved"],
                    datasets:[{ data:[apps.review, apps.new, apps.approved], backgroundColor:[RPT.amber,"#378ADD",RPT.green], borderWidth:0, hoverOffset:4 }]
                  }, options:{ responsive:true, maintainAspectRatio:false, cutout:"65%", plugins:{ legend:{ display:false } } }});
                }} />
                <div style={{ display:"flex", gap:14, marginTop:10, fontSize:12, flexWrap:"wrap" }}>
                  {[["Under review",apps.review,RPT.amber],["New",apps.new,RPT.blue],["Approved",apps.approved,RPT.green]].map(([l,v,c])=>(
                    <span key={l} style={{ display:"flex", alignItems:"center", gap:5, color:RPT.muted }}>
                      <span style={{ width:10,height:10,borderRadius:2,background:c,display:"inline-block" }}/>{l} {v}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MEDICAL ── */}
      {tab === "medical" && (
        <div>
          <div style={{ ...card, borderColor: RPT.amber, marginBottom: 14 }}>
            <SectionHeader title="Not fully client-ready" sub="Vaccination / medication task tracking is not wired to D1 yet. Showing live medical-status roster count only." />
          </div>
          <div style={grid4}>
            <StatCard label="Medical status" value={animals.medical} sub="animals with status = medical" subColor={animals.medical > 0 ? RPT.amber : RPT.green} />
            <StatCard label="Foster needed"  value={animals.fosterNeeded} sub="open foster flags" subColor={RPT.muted} />
            <StatCard label="Vaccinations due" value="—" sub="needs care-task module" subColor={RPT.muted} />
            <StatCard label="Medications"      value="—" sub="needs care-task module" subColor={RPT.muted} />
          </div>
        </div>
      )}

      {/* ── AI USAGE ── */}
      {tab === "ai" && (
        <div>
          {(() => {
            const runs = data?.aiRuns?.runs || data?.aiRuns?.results || [];
            if (!runs.length) {
              return (
                <div style={{ ...card, color: RPT.muted, fontSize: 13 }}>
                  No Agent Sam run history to report yet. This tab stays empty until live runs exist — no mock spend/latency figures.
                </div>
              );
            }
            const cost = runs.reduce((s, r) => s + Number(r.cost_usd || r.cost || 0), 0);
            const tokensIn = runs.reduce((s, r) => s + Number(r.tokens_in || r.input_tokens || 0), 0);
            const tokensOut = runs.reduce((s, r) => s + Number(r.tokens_out || r.output_tokens || 0), 0);
            const failed = runs.filter((r) => String(r.status || "").toLowerCase().includes("fail")).length;
            return (
              <div style={grid4}>
                <StatCard label="Runs" value={runs.length} sub={failed ? failed + " failed" : "completed / logged"} subColor={RPT.muted} />
                <StatCard label="Cost" value={fmt.usd(cost)} sub="from run logs" subColor={RPT.green} />
                <StatCard label="Tokens" value={fmt.int(tokensIn + tokensOut)} sub={fmt.int(tokensIn) + " in / " + fmt.int(tokensOut) + " out"} subColor={RPT.muted} />
                <StatCard label="Models" value={new Set(runs.map((r) => r.model || r.model_key).filter(Boolean)).size} sub="distinct in window" subColor={RPT.muted} />
              </div>
            );
          })()}
        </div>
      )}

      </div>
    </div>
  );
}
