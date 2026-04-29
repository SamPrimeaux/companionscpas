from pathlib import Path

root = Path(".")
(root / "src/api").mkdir(parents=True, exist_ok=True)
(root / "public/admin").mkdir(parents=True, exist_ok=True)

(root / "src/api/dashboard_api.js").write_text(r'''
function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

export async function dashboardApiRoutes(request, env, url) {
  const path = url.pathname;

  if (path === "/api/dashboard/overview") {
    const animals = await env.DB.prepare("SELECT * FROM animal_profiles ORDER BY created_at DESC").all();
    const apps = await env.DB.prepare("SELECT * FROM adoption_applications_demo ORDER BY submitted_at DESC").all();
    const campaigns = await env.DB.prepare("SELECT * FROM fundraising_campaigns_demo ORDER BY created_at DESC").all();
    const volunteers = await env.DB.prepare("SELECT * FROM volunteer_records ORDER BY hours_month DESC").all();
    const events = await env.DB.prepare("SELECT * FROM dashboard_calendar_events ORDER BY starts_at ASC").all();

    const raised = (campaigns.results || []).reduce((sum, c) => sum + Number(c.raised_cents || 0), 0);
    const goal = (campaigns.results || []).reduce((sum, c) => sum + Number(c.goal_cents || 0), 0);

    return json({
      kpis: {
        animals: animals.results?.length || 0,
        applications: apps.results?.length || 0,
        volunteers: volunteers.results?.length || 0,
        raised_cents: raised,
        goal_cents: goal
      },
      animals: animals.results || [],
      applications: apps.results || [],
      campaigns: campaigns.results || [],
      volunteers: volunteers.results || [],
      events: events.results || []
    });
  }

  if (path === "/api/dashboard/animals") {
    const rows = await env.DB.prepare("SELECT * FROM animal_profiles ORDER BY name").all();
    return json({ animals: rows.results || [] });
  }

  if (path === "/api/dashboard/applications") {
    const rows = await env.DB.prepare("SELECT * FROM adoption_applications_demo ORDER BY submitted_at DESC").all();
    return json({ applications: rows.results || [] });
  }

  if (path === "/api/dashboard/fundraising") {
    const campaigns = await env.DB.prepare("SELECT * FROM fundraising_campaigns_demo ORDER BY created_at DESC").all();
    return json({ campaigns: campaigns.results || [] });
  }

  if (path === "/api/dashboard/team") {
    const rows = await env.DB.prepare("SELECT * FROM volunteer_records ORDER BY role, full_name").all();
    return json({ members: rows.results || [] });
  }

  if (path === "/api/dashboard/calendar") {
    const rows = await env.DB.prepare("SELECT * FROM dashboard_calendar_events ORDER BY starts_at ASC").all();
    return json({ events: rows.results || [] });
  }

  return null;
}
''')

dashboard_html = r'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Companions of CPAS Dashboard</title>
<link rel="icon" href="/logo.png"/>
<style>
:root{
  --bg:#070b12;--panel:rgba(17,24,39,.76);--panel2:rgba(255,255,255,.055);
  --line:rgba(255,255,255,.12);--text:#f8f7ff;--muted:rgba(248,247,255,.62);
  --purple:#6D5593;--purple2:#8b74b7;--cyan:#16bfd6;--green:#10b981;--amber:#f59e0b;--danger:#fb7185;
  --shadow:0 28px 90px rgba(0,0,0,.42), inset 0 1px 0 rgba(255,255,255,.07);
}
*{box-sizing:border-box} body{margin:0;background:radial-gradient(circle at 22% 12%,rgba(109,85,147,.28),transparent 28%),radial-gradient(circle at 82% 78%,rgba(22,191,214,.16),transparent 32%),linear-gradient(135deg,#05070b,#101927 48%,#04060a);color:var(--text);font-family:Inter,ui-sans-serif,system-ui,Arial}
.app{display:grid;grid-template-columns:280px 1fr;min-height:100vh}.side{border-right:1px solid var(--line);background:rgba(8,12,20,.74);backdrop-filter:blur(24px);padding:22px;position:sticky;top:0;height:100vh}.brand{display:flex;align-items:center;gap:14px;margin-bottom:26px}.brand img{width:58px;height:58px;object-fit:contain;filter:drop-shadow(0 12px 22px rgba(109,85,147,.55))}.brand b{font-size:15px}.brand span{display:block;color:var(--muted);font-size:12px;margin-top:3px}.nav{display:grid;gap:6px}.nav a{padding:12px 14px;border-radius:16px;color:var(--muted);text-decoration:none;font-weight:850;display:flex;justify-content:space-between}.nav a.active,.nav a:hover{background:rgba(109,85,147,.22);color:white;border:1px solid rgba(255,255,255,.08)}.main{padding:26px 30px}.top{display:flex;justify-content:space-between;align-items:center;margin-bottom:22px}.top h1{font-size:34px;margin:0}.top p{margin:7px 0 0;color:var(--muted)}.actions{display:flex;gap:10px}.btn{border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:11px 14px;background:rgba(109,85,147,.82);color:white;font-weight:900;cursor:pointer}.btn.secondary{background:rgba(255,255,255,.06)}.grid{display:grid;gap:18px}.kpis{grid-template-columns:repeat(4,minmax(0,1fr))}.two{grid-template-columns:1.2fr .8fr}.three{grid-template-columns:repeat(3,1fr)}.card{background:var(--panel);border:1px solid var(--line);border-radius:24px;padding:20px;box-shadow:var(--shadow);backdrop-filter:blur(22px)}.card h2{margin:0 0 14px}.kpi b{font-size:32px}.kpi span{display:block;color:var(--muted);font-weight:850;text-transform:uppercase;letter-spacing:.08em;font-size:11px;margin-top:7px}.table{width:100%;border-collapse:collapse}.table th,.table td{padding:13px;border-bottom:1px solid rgba(255,255,255,.08);text-align:left}.table th{color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.08em}.badge{display:inline-flex;padding:6px 10px;border-radius:999px;background:rgba(109,85,147,.24);color:#e9ddff;font-weight:900;font-size:12px}.chart{height:230px;display:flex;align-items:end;gap:10px;padding-top:20px}.bar{flex:1;min-height:20px;border-radius:14px 14px 6px 6px;background:linear-gradient(180deg,var(--purple2),var(--cyan));box-shadow:0 10px 30px rgba(109,85,147,.18)}.progress{height:10px;background:rgba(255,255,255,.08);border-radius:999px;overflow:hidden}.progress i{display:block;height:100%;background:linear-gradient(90deg,var(--purple2),var(--cyan));border-radius:999px}.row{display:flex;justify-content:space-between;gap:14px;padding:13px 0;border-bottom:1px solid rgba(255,255,255,.08)}.calendar{display:grid;grid-template-columns:repeat(7,1fr);gap:10px}.day{min-height:92px;border:1px solid rgba(255,255,255,.1);border-radius:16px;background:rgba(255,255,255,.04);padding:10px}.event{margin-top:8px;padding:6px 8px;border-radius:10px;background:rgba(22,191,214,.18);font-size:11px;font-weight:800}.modal{position:fixed;inset:0;background:rgba(0,0,0,.62);display:none;align-items:center;justify-content:center;padding:20px;z-index:9}.modal.open{display:flex}.modalbox{width:min(1100px,96vw);max-height:90vh;overflow:auto;border-radius:28px;background:#0d1421;border:1px solid var(--line);box-shadow:0 40px 140px #000;padding:26px}input,select,textarea{width:100%;border:1px solid rgba(255,255,255,.12);border-radius:14px;background:rgba(255,255,255,.07);padding:12px;color:white;font:inherit}.formgrid{display:grid;grid-template-columns:1fr 1fr;gap:14px}@media(max-width:920px){.app{grid-template-columns:1fr}.side{height:auto;position:relative}.kpis,.two,.three{grid-template-columns:1fr}.main{padding:18px}.calendar{grid-template-columns:repeat(2,1fr)}}
</style>
</head>
<body>
<div class="app">
<aside class="side">
 <div class="brand"><img src="/logo.png"><div><b>Companions of CPAS</b><span>Rescue Operations OS</span></div></div>
 <nav class="nav" id="nav"></nav>
</aside>
<main class="main">
 <div class="top"><div><h1 id="title">Dashboard</h1><p id="subtitle">Live nonprofit operations demo</p></div><div class="actions"><button class="btn secondary" onclick="openCalendar()">Calendar</button><button class="btn">New Record</button></div></div>
 <section id="view"><div class="card">Loading dashboard...</div></section>
</main>
</div>
<div class="modal" id="calendarModal"><div class="modalbox"><div class="top"><div><h1>Calendar + Social Scheduler</h1><p>Schedule events, volunteer shifts, donor pushes, and posts.</p></div><button class="btn secondary" onclick="closeCalendar()">Close</button></div><div class="formgrid"><input placeholder="Title"><select><option>Volunteer Event</option><option>Fundraiser</option><option>Facebook Post</option><option>Instagram Post</option><option>YouTube Upload</option></select><input type="datetime-local"><select><option>Facebook + Instagram</option><option>Email</option><option>Internal Volunteers</option></select><textarea style="grid-column:1/-1" placeholder="Caption, invite, notes, or event details"></textarea><button class="btn">Schedule</button><button class="btn secondary">Generate with Agent Sam</button></div><br><div class="calendar" id="cal"></div></div></div>
<script>
const routes=[
["/admin/dashboard","Overview"],["/admin/dashboard/animals","Animals"],["/admin/dashboard/fosters","Fosters"],["/admin/dashboard/adoptions","Adoptions"],["/admin/dashboard/intakes","Intakes"],["/admin/dashboard/medical","Medical"],["/admin/dashboard/daily-care","Daily Care"],["/admin/dashboard/volunteers","Volunteers"],["/admin/dashboard/applications","Applications"],["/admin/dashboard/donations","Donations"],["/admin/dashboard/donations/campaigns","Campaigns"],["/admin/dashboard/cms","CMS Website"],["/admin/dashboard/reports","Reports"],["/admin/dashboard/settings","Settings"],["/admin/dashboard/tasks","Tasks"]
];
const path=location.pathname, nav=document.getElementById("nav"), view=document.getElementById("view"), title=document.getElementById("title");
nav.innerHTML=routes.map(([href,label])=>`<a href="${href}" class="${path===href?'active':''}"><span>${label}</span><span>›</span></a>`).join("");
function money(c){return "$"+(Number(c||0)/100).toLocaleString(undefined,{maximumFractionDigits:0})}
function bars(vals){return `<div class="chart">${vals.map(v=>`<div class="bar" style="height:${v}%"></div>`).join("")}</div>`}
function table(headers,rows){return `<table class="table"><thead><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table>`}
async function get(p){return fetch(p).then(r=>r.json())}
function openCalendar(){document.getElementById("calendarModal").classList.add("open")} function closeCalendar(){document.getElementById("calendarModal").classList.remove("open")}
async function render(){
 const data=await get("/api/dashboard/overview");
 const page=routes.find(r=>r[0]===path)?.[1]||"Overview"; title.textContent=page;
 const k=`<div class="grid kpis"><div class="card kpi"><b>${data.kpis.animals}</b><span>Animals in care</span></div><div class="card kpi"><b>${data.kpis.applications}</b><span>Applications</span></div><div class="card kpi"><b>${data.kpis.volunteers}</b><span>Team members</span></div><div class="card kpi"><b>${money(data.kpis.raised_cents)}</b><span>Raised</span></div></div><br>`;
 if(page==="Overview") view.innerHTML=k+`<div class="grid two"><div class="card"><h2>Fundraising Momentum</h2>${bars([38,44,56,48,72,65,88,80])}</div><div class="card"><h2>Upcoming</h2>${data.events.map(e=>`<div class=row><b>${e.title}</b><span class=badge>${e.event_type}</span></div>`).join("")}</div></div>`;
 else if(page==="Animals") view.innerHTML=k+`<div class=card><h2>Animal Registry</h2>${table(["Name","Species","Breed","Status","Location"],data.animals.map(a=>`<tr><td>${a.name}</td><td>${a.species}</td><td>${a.breed||""}</td><td><span class=badge>${a.status}</span></td><td>${a.location||""}</td></tr>`))}</div>`;
 else if(page==="Applications"||page==="Adoptions") view.innerHTML=`<div class=card><h2>Applications Pipeline</h2>${table(["Applicant","Animal","Status","Submitted"],data.applications.map(a=>`<tr><td>${a.applicant_name}</td><td>${a.animal_name}</td><td><span class=badge>${a.status}</span></td><td>${(a.submitted_at||"").slice(0,10)}</td></tr>`))}</div>`;
 else if(page==="Donations"||page==="Campaigns") view.innerHTML=`<div class="grid three">${data.campaigns.map(c=>`<div class=card><h2>${c.title}</h2><p>${money(c.raised_cents)} raised of ${money(c.goal_cents)}</p><div class=progress><i style="width:${Math.min(100,Math.round((c.raised_cents/c.goal_cents)*100))}%"></i></div><br><span class=badge>${c.status}</span></div>`).join("")}</div>`;
 else if(page==="Volunteers"||page==="Team") view.innerHTML=`<div class=card><h2>Volunteer + Board Team</h2>${table(["Name","Email","Role","Hours"],data.volunteers.map(v=>`<tr><td>${v.full_name}</td><td>${v.email||""}</td><td><span class=badge>${v.role}</span></td><td>${v.hours_month}</td></tr>`))}</div>`;
 else if(page==="Settings") view.innerHTML=`<div class="grid two"><div class=card><h2>Password Management</h2><p>Users can securely reset their own password. Owners can invite or disable accounts.</p><input placeholder="Current password"><br><br><input placeholder="New password"><br><br><button class=btn>Update Password</button></div><div class=card><h2>Secrets Vault</h2><p>Masked and scoped secret management for platform integrations.</p><div class=row><b>RESEND_API_KEY</b><span class=badge>masked</span></div><div class=row><b>STRIPE_SECRET_KEY</b><span class=badge>disabled demo</span></div><div class=row><b>AGENTSAM_BRIDGE_TOKEN</b><span class=badge>owner only</span></div></div></div>`;
 else view.innerHTML=k+`<div class=card><h2>${page}</h2><p>This route is fully staged for Thursday demo. Data layer exists and this page is ready for real API binding after approval.</p>${bars([22,58,44,68,84])}</div>`;
 document.getElementById("cal").innerHTML=Array.from({length:35},(_,i)=>`<div class=day><b>${i+1}</b>${data.events[i%data.events.length]?`<div class=event>${data.events[i%data.events.length].title}</div>`:""}</div>`).join("");
}
render().catch(e=>view.innerHTML=`<div class=card><h2>Dashboard API Error</h2><p>${e.message}</p></div>`);
</script>
</body>
</html>'''
(root / "public/admin/dashboard.html").write_text(dashboard_html)

idx = root / "src/index.js"
s = idx.read_text()
if 'import { dashboardApiRoutes } from "./api/dashboard_api.js";' not in s:
    s = 'import { dashboardApiRoutes } from "./api/dashboard_api.js";\n' + s
needle = 'const url = new URL(request.url);'
insert = '''const url = new URL(request.url);

    if (url.pathname.startsWith("/api/dashboard/")) {
      const res = await dashboardApiRoutes(request, env, url);
      if (res) return res;
    }'''
if 'dashboardApiRoutes(request, env, url)' not in s:
    s = s.replace(needle, insert, 1)
s = s.replace('if (url.pathname === "/dashboard" || url.pathname.startsWith("/dashboard/")) {',
              'if (url.pathname === "/admin/dashboard" || url.pathname.startsWith("/admin/dashboard/") || url.pathname === "/dashboard" || url.pathname.startsWith("/dashboard/")) {')
idx.write_text(s)

print("Built dashboard UI + API routes.")
