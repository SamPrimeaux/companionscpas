// Overview / Dashboard Home
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
          { label:"Intakes",   data:data.intakes,   backgroundColor:"#7c3aed", borderRadius:4, borderSkipped:false },
          { label:"Adoptions", data:data.adoptions, backgroundColor:"#10b981", borderRadius:4, borderSkipped:false }
        ]
      },
      options: {
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ labels:{ color:"#3d3529", font:{size:11}, boxWidth:10, boxHeight:10 } } },
        scales:{
          x:{ grid:{ color:"rgba(26,22,34,0.08)" }, ticks:{ color:"#5a5046", font:{size:11} } },
          y:{ grid:{ color:"rgba(26,22,34,0.08)" }, ticks:{ color:"#5a5046", font:{size:11} }, beginAtZero:true }
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

  // Responsive breakpoints — uses shared hooks from ui.jsx
  const isMobile  = typeof useIsMobile  === "function" ? useIsMobile(900)  : false;
  const isNarrow  = typeof useIsNarrow  === "function" ? useIsNarrow(520)  : false;

  const recentAnimals = animals.slice(0, 5);
  const careItems = [
    { label:"Feed",        completed:32, total:128, color:"#7c3aed" },
    { label:"Walk",        completed:18, total:128, color:"#06b6d4" },
    { label:"Medications", completed:8,  total:34,  color:"#ef4444" },
    { label:"Vaccinations",completed:3,  total:12,  color:"#f59e0b" },
  ];

  // Responsive grid values
  const statsGrid      = isNarrow ? "1fr" : isMobile ? "repeat(2,minmax(0,1fr))" : "repeat(auto-fit,minmax(160px,1fr))";
  const middleGrid     = isMobile ? "1fr" : "1fr 1.6fr";
  const recentGrid     = isNarrow ? "1fr" : isMobile ? "repeat(2,minmax(0,1fr))" : "repeat(5,1fr)";
  const bottomGrid     = isMobile ? "1fr" : "1fr 1fr 1fr";
  const userName = (window.CPAS?.user?.name || window.CPAS_USER?.full_name || "Team").split(" ")[0];

  return React.createElement("div", { style:{ display:"flex", gap:0, minHeight:0, flex:1 } },
    React.createElement("div", { className: "dash-page" },

      React.createElement(PageHeader, {
        title: `Welcome back, ${userName}`,
        subtitle: "Here's what's happening at Companions of CPAS today.",
        meta: !isMobile && React.createElement("span", { className: "dash-page-meta" },
          new Date().toLocaleDateString(undefined, { month:"long", day:"numeric", year:"numeric" })
        )
      }),

      // Stat cards
      React.createElement("div", { style:{ display:"grid", gridTemplateColumns:statsGrid, gap:12, marginBottom:24 } },
        React.createElement(StatCard, { icon:"paw",     label:"Total Animals",    value:stats.totalAnimals, sub:`+${stats.animalsDelta} this week`,  subPositive:true,  sparkData:[108,112,115,118,120,128], sparkColor:"#7c3aed" }),
        React.createElement(StatCard, { icon:"heart",   label:"In Foster Care",   value:stats.inFoster,     sub:`+${stats.fosterDelta} this week`,   subPositive:true,  sparkData:[28,29,31,30,32,34],       sparkColor:"#a78bfa" }),
        React.createElement(StatCard, { icon:"home",    label:"Adoptions (MTD)",  value:stats.adoptionsMTD, sub:`+${stats.adoptionsDelta} this week`,subPositive:true,  sparkData:[12,14,15,15,17,18],       sparkColor:"#10b981" }),
        React.createElement(StatCard, { icon:"medical", label:"Medical Due",      value:stats.medicalDue,   sub:`${stats.medicalOverdue} overdue`,    subPositive:false, sparkData:[5,7,6,8,9,9],             sparkColor:"#ef4444" }),
        React.createElement(StatCard, { icon:"dollar",  label:"Donations (MTD)",  value:`$${stats.donationsMTD.toLocaleString()}`, sub: stats.donationsMtdLabel || `${stats.donationsDeltaPct || 0} Stripe payments this month`, subPositive:true, sparkData:[0,0,0,0,0,stats.donationsMTD || 0], sparkColor:"#10b981" })
      ),

      // Middle row
      React.createElement("div", { style:{ display:"grid", gridTemplateColumns:middleGrid, gap:16, marginBottom:24 } },
        // Daily care
        React.createElement(Card, { style:{ padding:20, minWidth:0 } },
          React.createElement("div", { style:{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 } },
            React.createElement("h3", { className: "dash-section-title" }, "Daily Care Overview"),
            React.createElement("button", { type: "button", className: "dash-link", onClick:()=>onNavigate("medical") }, "View all")
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
        React.createElement(Card, { style:{ padding:20, minWidth:0 } },
          React.createElement("h3", { style:{ margin:"0 0 16px", fontSize:14, fontWeight:600, color:C.text } }, "Intakes & Adoptions"),
          React.createElement("div", { style:{ height: isMobile ? 160 : 180 } },
            React.createElement(BarChart, { data:chartData.intakesAdoptions })
          )
        )
      ),

      // Recent animals
      React.createElement(Card, { style:{ padding:20, marginBottom:24 } },
        React.createElement("div", { style:{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 } },
          React.createElement("h3", { style:{ margin:0, fontSize:14, fontWeight:600, color:C.text } }, "Recent Animals"),
          React.createElement("button", { onClick:()=>onNavigate("animals"), style:{ background:"none", border:"none", color:C.purpleL, fontSize:12, cursor:"pointer" } }, "View all")
        ),
        React.createElement("div", { style:{ display:"grid", gridTemplateColumns:recentGrid, gap:12 } },
          recentAnimals.map(a =>
            React.createElement("div", {
              key: a.id,
              onClick: ()=>onNavigate("animal-profile", { animalId: a.id }),
              style:{ cursor:"pointer", borderRadius:10, overflow:"hidden", border:`1px solid ${C.border}`, transition:"border-color .15s", minWidth:0 },
              onMouseEnter: e=>e.currentTarget.style.borderColor=C.purple,
              onMouseLeave: e=>e.currentTarget.style.borderColor=C.border
            },
              React.createElement("div", { style:{ height:isMobile ? 90 : 110, overflow:"hidden", background:C.raised } },
                React.createElement("img", { src:a.photo, alt:a.name, style:{ width:"100%", height:"100%", objectFit:"contain" }, onError:e=>{ e.target.style.display="none"; } })
              ),
              React.createElement("div", { style:{ padding:"10px 10px 12px" } },
                React.createElement("div", { style:{ fontSize:13, fontWeight:600, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" } }, a.name),
                React.createElement("div", { style:{ fontSize:10, color:C.textSec, margin:"2px 0 6px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" } }, `${a.breed}`),
                React.createElement(Badge, { label:a.status, dot:true })
              )
            )
          )
        )
      ),

      // Bottom row
      React.createElement("div", { style:{ display:"grid", gridTemplateColumns:bottomGrid, gap:16 } },
        // Financial donut
        React.createElement(Card, { style:{ padding:20, minWidth:0 } },
          React.createElement("h3", { style:{ margin:"0 0 16px", fontSize:14, fontWeight:600, color:C.text } }, "Financial Overview (MTD)"),
          React.createElement("div", { style:{ display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" } },
            React.createElement("div", { style:{ width:90, height:90, flexShrink:0 } },
              React.createElement(DonutChart, { labels:chartData.financialBreakdown.labels, values:chartData.financialBreakdown.values, colors:chartData.financialBreakdown.colors })
            ),
            React.createElement("div", { style:{ display:"flex", flexDirection:"column", gap:6, minWidth:0 } },
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
        React.createElement(Card, { style:{ padding:20, minWidth:0 } },
          React.createElement("h3", { style:{ margin:"0 0 16px", fontSize:14, fontWeight:600, color:C.text } }, "Application Status"),
          React.createElement("div", { style:{ display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" } },
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
            React.createElement("div", { style:{ display:"flex", flexDirection:"column", gap:5, minWidth:0 } },
              [["Pending",21,"#fbbf24"],["Approved",12,"#34d399"],["Under Review",6,"#60a5fa"],["Denied",3,"#f87171"]].map(([l,v,co])=>
                React.createElement("div", { key:l, style:{ display:"flex", alignItems:"center", gap:6, fontSize:11 } },
                  React.createElement("span", { style:{ width:8, height:8, borderRadius:2, background:co, flexShrink:0 } }),
                  React.createElement("span", { style:{ color:C.textSec } }, l),
                  React.createElement("span", { style:{ marginLeft:"auto", color:C.text, fontWeight:600 } }, v)
                )
              )
            )
          )
        ),
        // Volunteer hours
        React.createElement(Card, { style:{ padding:20, minWidth:0 } },
          React.createElement("h3", { style:{ margin:"0 0 8px", fontSize:14, fontWeight:600, color:C.text } }, "Volunteer Hours (MTD)"),
          React.createElement("div", { style:{ fontSize:36, fontWeight:700, color:C.text, lineHeight:1 } }, stats.volunteerHoursMTD),
          React.createElement("div", { style:{ fontSize:11, color:C.green, marginTop:4, marginBottom:16 } }, `+${stats.volunteerDeltaPct}% vs last month`),
          React.createElement(Sparkline, { data:[180,195,210,200,225,245], color:C.green, width: isMobile ? 100 : 140, height:40 })
        )
      )
    )
  );
}

Object.assign(window, { OverviewView });
