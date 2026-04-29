// ─── Overview / Dashboard Home ────────────────────────────────────────────────
const { useState: useState2, useEffect: useEffect2, useRef: useRef2 } = React;

// Bar chart using Chart.js
function BarChart({ data }) {
  const ref = useRef2(null);
  const chartRef = useRef2(null);
  useEffect2(() => {
    if (!ref.current) return;
    if (chartRef.current) chartRef.current.destroy();
    chartRef.current = new Chart(ref.current, {
      type: "bar",
      data: {
        labels: data.labels,
        datasets: [
          { label:"Intakes", data:data.intakes, backgroundColor:"#7c3aed", borderRadius:4, borderSkipped:false },
          { label:"Adoptions", data:data.adoptions, backgroundColor:"#10b981", borderRadius:4, borderSkipped:false }
        ]
      },
      options: {
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ labels:{ color:"#8888aa", font:{size:11}, boxWidth:10, boxHeight:10 } } },
        scales:{
          x:{ grid:{ color:"#282840" }, ticks:{ color:"#8888aa", font:{size:11} } },
          y:{ grid:{ color:"#282840" }, ticks:{ color:"#8888aa", font:{size:11} }, beginAtZero:true }
        }
      }
    });
    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, []);
  return React.createElement("canvas", { ref, style:{ width:"100%", height:"100%" } });
}

function DonutChart({ labels, values, colors }) {
  const ref = useRef2(null);
  const chartRef = useRef2(null);
  useEffect2(() => {
    if (!ref.current) return;
    if (chartRef.current) chartRef.current.destroy();
    chartRef.current = new Chart(ref.current, {
      type: "doughnut",
      data: { labels, datasets:[{ data:values, backgroundColor:colors, borderWidth:0, hoverOffset:4 }] },
      options: {
        responsive:true, maintainAspectRatio:false, cutout:"68%",
        plugins:{ legend:{ display:false } }
      }
    });
    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, []);
  return React.createElement("canvas", { ref, style:{ width:"100%", height:"100%" } });
}

function OverviewView({ onNavigate }) {
  const { stats, animals, tasks, recentActivity, chartData, campaigns, donations } = CPAS;
  const [tasksDone, setTasksDone] = useState2({});

  const recentAnimals = animals.slice(0,5);
  const careItems = [
    { label:"Feed",        completed:32, total:128, color:"#7c3aed" },
    { label:"Walk",        completed:18, total:128, color:"#06b6d4" },
    { label:"Medications", completed:8,  total:34,  color:"#ef4444" },
    { label:"Vaccinations",completed:3,  total:12,  color:"#f59e0b" },
  ];

  const activityIcon = { adoption:"🐾", donation:"💸", volunteer:"👤", medical:"💉", intake:"📥" };

  return React.createElement("div", { style:{ display:"flex", gap:0, minHeight:0, flex:1 } },
    // Main content
    React.createElement("div", { style:{ flex:1, overflowY:"auto", padding:"28px 28px 40px" } },
      // Header
      React.createElement("div", { style:{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24, flexWrap:"wrap", gap:12 } },
        React.createElement("div", null,
          React.createElement("h1", { style:{ fontSize:26, fontWeight:700, color:C.text, margin:0 } }, `Welcome back, ${(window.CPAS_USER?.full_name || "Team").split(" ")[0]}`),
          React.createElement("p", { style:{ fontSize:13, color:C.textSec, margin:"4px 0 0" } }, "Here's what's happening at Companions of CPAS today.")
        ),
        React.createElement("div", { style:{ display:"flex", alignItems:"center", gap:8 } },
          React.createElement("span", { style:{ fontSize:12, color:C.textSec } },
            new Date().toLocaleDateString(undefined, { month:"long", day:"numeric", year:"numeric" })
          ),
          React.createElement(Btn, { variant:"secondary", size:"sm", icon:"gear" }, "Customize")
        )
      ),

      // Stat cards
      React.createElement("div", { style:{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12, marginBottom:24 } },
        React.createElement(StatCard, { icon:"🐾", label:"Total Animals",    value:stats.totalAnimals, sub:`+${stats.animalsDelta} this week`,  subPositive:true,  sparkData:[108,112,115,118,120,128], sparkColor:"#7c3aed" }),
        React.createElement(StatCard, { icon:"💜", label:"In Foster Care",   value:stats.inFoster,     sub:`+${stats.fosterDelta} this week`,   subPositive:true,  sparkData:[28,29,31,30,32,34],       sparkColor:"#a78bfa" }),
        React.createElement(StatCard, { icon:"🏠", label:"Adoptions (MTD)",  value:stats.adoptionsMTD, sub:`+${stats.adoptionsDelta} this week`,subPositive:true,  sparkData:[12,14,15,15,17,18],       sparkColor:"#10b981" }),
        React.createElement(StatCard, { icon:"🩺", label:"Medical Due",      value:stats.medicalDue,   sub:`${stats.medicalOverdue} overdue`,    subPositive:false, sparkData:[5,7,6,8,9,9],             sparkColor:"#ef4444" }),
        React.createElement(StatCard, { icon:"💵", label:"Donations (MTD)",  value:`$${stats.donationsMTD.toLocaleString()}`, sub:`+${stats.donationsDeltaPct}% vs last month`, subPositive:true, sparkData:[4200,5800,6100,7200,9800,8432], sparkColor:"#10b981" })
      ),

      // Middle row
      React.createElement("div", { style:{ display:"grid", gridTemplateColumns:"1fr 1.6fr", gap:16, marginBottom:24 } },
        // Daily care
        React.createElement(Card, { style:{ padding:20 } },
          React.createElement("div", { style:{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 } },
            React.createElement("h3", { style:{ margin:0, fontSize:14, fontWeight:600, color:C.text } }, "Daily Care Overview"),
            React.createElement("button", { onClick:()=>onNavigate("daily-care"), style:{ background:"none", border:"none", color:C.purpleL, fontSize:12, cursor:"pointer" } }, "View all →")
          ),
          React.createElement("div", { style:{ display:"flex", flexDirection:"column", gap:14 } },
            careItems.map(item =>
              React.createElement("div", { key:item.label },
                React.createElement("div", { style:{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:5 } },
                  React.createElement("span", { style:{ color:C.text, fontWeight:500 } }, item.label),
                  React.createElement("span", { style:{ color:C.textSec } }, `${item.completed}/${item.total}`)
                ),
                React.createElement(ProgressBar, { value:item.completed, max:item.total, color:item.color })
              )
            )
          )
        ),
        // Bar chart
        React.createElement(Card, { style:{ padding:20 } },
          React.createElement("h3", { style:{ margin:"0 0 16px", fontSize:14, fontWeight:600, color:C.text } }, "Intakes & Adoptions Overview"),
          React.createElement("div", { style:{ height:180 } },
            React.createElement(BarChart, { data:chartData.intakesAdoptions })
          )
        )
      ),

      // Recent animals
      React.createElement(Card, { style:{ padding:20, marginBottom:24 } },
        React.createElement("div", { style:{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 } },
          React.createElement("h3", { style:{ margin:0, fontSize:14, fontWeight:600, color:C.text } }, "Recent Animals"),
          React.createElement("button", { onClick:()=>onNavigate("animals"), style:{ background:"none", border:"none", color:C.purpleL, fontSize:12, cursor:"pointer" } }, "View all animals →")
        ),
        React.createElement("div", { style:{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12 } },
          recentAnimals.map(a =>
            React.createElement("div", {
              key:a.id,
              onClick:()=>onNavigate("animal-profile", { animalId: a.id }),
              style:{ cursor:"pointer", borderRadius:10, overflow:"hidden", border:`1px solid ${C.border}`, transition:"border-color .15s" },
              onMouseEnter:e=>e.currentTarget.style.borderColor=C.purple,
              onMouseLeave:e=>e.currentTarget.style.borderColor=C.border
            },
              React.createElement("div", { style:{ height:110, overflow:"hidden", background:C.raised } },
                React.createElement("img", { src:a.photo, alt:a.name, style:{ width:"100%", height:"100%", objectFit:"contain" }, onError:e=>{ e.target.style.display="none"; } })
              ),
              React.createElement("div", { style:{ padding:"10px 10px 12px" } },
                React.createElement("div", { style:{ fontSize:13, fontWeight:600, color:C.text } }, a.name),
                React.createElement("div", { style:{ fontSize:10, color:C.textSec, margin:"2px 0 6px" } }, `ID: ${a.id} · ${a.breed}`),
                React.createElement(Badge, { label:a.status, dot:true })
              )
            )
          )
        )
      ),

      // Bottom row
      React.createElement("div", { style:{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16 } },
        // Financial donut
        React.createElement(Card, { style:{ padding:20 } },
          React.createElement("h3", { style:{ margin:"0 0 16px", fontSize:14, fontWeight:600, color:C.text } }, "Financial Overview (MTD)"),
          React.createElement("div", { style:{ display:"flex", alignItems:"center", gap:16 } },
            React.createElement("div", { style:{ width:90, height:90, flexShrink:0 } },
              React.createElement(DonutChart, { labels:chartData.financialBreakdown.labels, values:chartData.financialBreakdown.values, colors:chartData.financialBreakdown.colors })
            ),
            React.createElement("div", { style:{ display:"flex", flexDirection:"column", gap:6 } },
              chartData.financialBreakdown.labels.map((l,i) =>
                React.createElement("div", { key:l, style:{ display:"flex", alignItems:"center", gap:6, fontSize:11 } },
                  React.createElement("span", { style:{ width:8, height:8, borderRadius:2, background:chartData.financialBreakdown.colors[i], flexShrink:0 } }),
                  React.createElement("span", { style:{ color:C.textSec } }, l),
                  React.createElement("span", { style:{ marginLeft:"auto", color:C.text, fontWeight:600 } }, `$${chartData.financialBreakdown.values[i].toLocaleString()}`)
                )
              )
            )
          )
        ),
        // App status donut
        React.createElement(Card, { style:{ padding:20 } },
          React.createElement("h3", { style:{ margin:"0 0 16px", fontSize:14, fontWeight:600, color:C.text } }, "Application Status"),
          React.createElement("div", { style:{ display:"flex", alignItems:"center", gap:16 } },
            React.createElement("div", { style:{ position:"relative", width:90, height:90, flexShrink:0 } },
              React.createElement(DonutChart, {
                labels:["Pending","Approved","Under Review","Denied"],
                values:[chartData.applicationStatus.pending, chartData.applicationStatus.approved, chartData.applicationStatus.underReview, chartData.applicationStatus.denied],
                colors:["#f59e0b","#10b981","#60a5fa","#ef4444"]
              }),
              React.createElement("div", { style:{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column" } },
                React.createElement("span", { style:{ fontSize:20, fontWeight:700, color:C.text } }, "42"),
                React.createElement("span", { style:{ fontSize:9, color:C.textSec } }, "Total")
              )
            ),
            React.createElement("div", { style:{ display:"flex", flexDirection:"column", gap:5 } },
              [["Pending",21,"#fbbf24"],["Approved",12,"#34d399"],["Under Review",6,"#60a5fa"],["Denied",3,"#f87171"]].map(([l,v,c])=>
                React.createElement("div", { key:l, style:{ display:"flex", alignItems:"center", gap:6, fontSize:11 } },
                  React.createElement("span", { style:{ width:8, height:8, borderRadius:2, background:c, flexShrink:0 } }),
                  React.createElement("span", { style:{ color:C.textSec } }, l),
                  React.createElement("span", { style:{ marginLeft:"auto", color:C.text, fontWeight:600 } }, v)
                )
              )
            )
          )
        ),
        // Volunteer hours
        React.createElement(Card, { style:{ padding:20 } },
          React.createElement("h3", { style:{ margin:"0 0 8px", fontSize:14, fontWeight:600, color:C.text } }, "Volunteer Hours (MTD)"),
          React.createElement("div", { style:{ fontSize:36, fontWeight:700, color:C.text, lineHeight:1 } }, stats.volunteerHoursMTD),
          React.createElement("div", { style:{ fontSize:11, color:C.green, marginTop:4, marginBottom:16 } }, `+${stats.volunteerDeltaPct}% vs last month`),
          React.createElement(Sparkline, { data:[180,195,210,200,225,245], color:C.green, width:140, height:40 })
        )
      )
    ),

    // Right panel
    React.createElement("aside", { style:{ width:280, flexShrink:0, borderLeft:`1px solid ${C.border}`, display:"flex", flexDirection:"column", overflowY:"auto" } },
      // Tasks
      React.createElement("div", { style:{ padding:"20px 20px 4px", borderBottom:`1px solid ${C.border}` } },
        React.createElement("div", { style:{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 } },
          React.createElement("h3", { style:{ margin:0, fontSize:14, fontWeight:600, color:C.text } }, "My Tasks"),
          React.createElement("button", { style:{ background:"none", border:"none", color:C.purpleL, fontSize:12, cursor:"pointer" } }, "View all")
        ),
        tasks.map(t =>
          React.createElement("div", {
            key:t.id,
            onClick:()=>onNavigate(t.link),
            style:{ display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderBottom:`1px solid ${C.border}`, cursor:"pointer" }
          },
            React.createElement("div", { style:{ width:28, height:28, borderRadius:"50%", background: t.urgent ? C.redDim : C.raised, border:`1px solid ${t.urgent ? "#7f1d1d" : C.border}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 } },
              React.createElement(Icon, { name: t.urgent ? "warning" : "check", size:13, style:{ color: t.urgent ? "#f87171" : C.textSec } })
            ),
            React.createElement("div", { style:{ flex:1, minWidth:0 } },
              React.createElement("div", { style:{ fontSize:12, fontWeight:600, color: t.urgent ? "#f87171" : C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" } }, t.title),
              React.createElement("div", { style:{ fontSize:10, color:C.textSec, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" } }, t.sub)
            ),
            t.time && React.createElement("span", { style:{ fontSize:10, color:C.purpleL, whiteSpace:"nowrap" } }, t.time)
          )
        )
      ),
      // Recent activity
      React.createElement("div", { style:{ padding:"16px 20px 4px", borderBottom:`1px solid ${C.border}` } },
        React.createElement("div", { style:{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 } },
          React.createElement("h3", { style:{ margin:0, fontSize:14, fontWeight:600, color:C.text } }, "Recent Activity"),
          React.createElement("button", { onClick:()=>onNavigate("notifications"), style:{ background:"none", border:"none", color:C.purpleL, fontSize:12, cursor:"pointer" } }, "View all")
        ),
        recentActivity.map(a =>
          React.createElement("div", { key:a.id, style:{ display:"flex", alignItems:"flex-start", gap:10, padding:"8px 0", borderBottom:`1px solid ${C.border}` } },
            React.createElement("div", { style:{ width:28, height:28, borderRadius:"50%", background:C.raised, border:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, flexShrink:0 } }, activityIcon[a.type] || "•"),
            React.createElement("div", { style:{ flex:1 } },
              React.createElement("div", { style:{ fontSize:11, color:C.text } }, a.text),
              React.createElement("div", { style:{ fontSize:10, color:C.textMut, marginTop:2 } }, a.time)
            )
          )
        )
      ),
      // Quick actions
      React.createElement("div", { style:{ padding:"16px 20px" } },
        React.createElement("h3", { style:{ margin:"0 0 12px", fontSize:14, fontWeight:600, color:C.text } }, "Quick Actions"),
        [
          { label:"Add New Animal",   icon:"paw",   view:"animals" },
          { label:"New Intake",        icon:"intake",view:"intakes" },
          { label:"New Application",   icon:"docs",  view:"applications" },
          { label:"Record Donation",   icon:"dollar",view:"donations" },
        ].map(q =>
          React.createElement("button", {
            key:q.label, onClick:()=>onNavigate(q.view),
            style:{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:8, border:`1px solid ${C.border}`, background:"none", color:C.text, fontSize:13, cursor:"pointer", marginBottom:6, transition:"background .12s", textAlign:"left" },
            onMouseEnter:e=>e.currentTarget.style.background=C.raised,
            onMouseLeave:e=>e.currentTarget.style.background="none"
          },
            React.createElement(Icon, { name:q.icon, size:15, style:{ color:C.purpleL } }),
            q.label,
            React.createElement(Icon, { name:"chevR", size:14, style:{ marginLeft:"auto", color:C.textMut } })
          )
        )
      )
    )
  );
}

Object.assign(window, { OverviewView });
