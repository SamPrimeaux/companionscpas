// ─── Companions CPAS — Data Layer (API-first, mock fallback) ──────────────────
// Fetches from /api/dashboard/* endpoints on load.
// Falls back to rich mock data if API returns empty or errors.

const MOCK = {
  user: { name: "Danielle Chen", role: "Admin", initials: "DC" },
  stats: {
    totalAnimals: 128, animalsDelta: 12,
    inFoster: 34, fosterDelta: 5,
    adoptionsMTD: 18, adoptionsDelta: 4,
    medicalDue: 9, medicalOverdue: 2,
    donationsMTD: 8432, donationsDeltaPct: 18,
    volunteerHoursMTD: 245, volunteerDeltaPct: 18
  },
  animals: [
    { id:"A1287", name:"Ace",    species:"Dog", breed:"Pit Mix",              age:"3 yr", sex:"M", weight:"52 lbs", color:"Brindle",     status:"Available", intake:"2025-04-10", photo:"https://picsum.photos/seed/ace11/300/300",    description:"Ace is a friendly, energetic pit mix who loves people and toys.", fosterName:null, fosterSince:null },
    { id:"C8921", name:"Luna",   species:"Cat", breed:"Domestic Shorthair",   age:"2 yr", sex:"F", weight:"8 lbs",  color:"Tabby",        status:"Foster",    intake:"2025-03-22", photo:"https://picsum.photos/seed/luna22/300/300",   description:"Luna is a calm, sweet tabby who enjoys quiet homes.", fosterName:"Carlos R.", fosterSince:"2025-04-10" },
    { id:"A1278", name:"Max",    species:"Dog", breed:"Labrador Mix",         age:"5 yr", sex:"M", weight:"68 lbs", color:"Black",        status:"Available", intake:"2025-04-01", photo:"https://picsum.photos/seed/max33/300/300",    description:"Max is a gentle giant, great on leash and house-trained.", fosterName:null, fosterSince:null },
    { id:"A1265", name:"Bella",  species:"Dog", breed:"German Shepherd",      age:"4 yr", sex:"F", weight:"60 lbs", color:"Sable",        status:"Foster",    intake:"2025-02-14", photo:"https://picsum.photos/seed/bella44/300/300", description:"Bella is intelligent and loyal. Needs experienced owner.", fosterName:"John D.", fosterSince:"2025-03-01" },
    { id:"C8912", name:"Milo",   species:"Cat", breed:"Domestic Medium Hair", age:"1 yr", sex:"M", weight:"9 lbs",  color:"Orange",       status:"Available", intake:"2025-05-01", photo:"https://picsum.photos/seed/milo55/300/300",   description:"Milo is playful and curious — a great first cat.", fosterName:null, fosterSince:null },
    { id:"A1301", name:"Daisy",  species:"Dog", breed:"Beagle Mix",           age:"2 yr", sex:"F", weight:"24 lbs", color:"Tricolor",     status:"Medical",   intake:"2025-05-05", photo:"https://picsum.photos/seed/daisy66/300/300", description:"Daisy was found malnourished. Currently recovering.", fosterName:null, fosterSince:null },
    { id:"A1295", name:"Rocky",  species:"Dog", breed:"Boxer",                age:"6 yr", sex:"M", weight:"70 lbs", color:"Fawn",         status:"Adopted",   intake:"2025-01-10", photo:"https://picsum.photos/seed/rocky77/300/300", description:"Rocky found his forever home with the Barton family.", fosterName:null, fosterSince:null },
    { id:"C8935", name:"Cleo",   species:"Cat", breed:"Siamese Mix",          age:"3 yr", sex:"F", weight:"7 lbs",  color:"Seal Point",   status:"Available", intake:"2025-04-18", photo:"https://picsum.photos/seed/cleo88/300/300",  description:"Cleo is vocal, affectionate, and loves attention.", fosterName:null, fosterSince:null },
    { id:"A1310", name:"Bruno",  species:"Dog", breed:"Rottweiler Mix",       age:"2 yr", sex:"M", weight:"80 lbs", color:"Black/Tan",    status:"Available", intake:"2025-05-08", photo:"https://picsum.photos/seed/bruno99/300/300", description:"Bruno is big, gentle, and still learning manners.", fosterName:null, fosterSince:null },
    { id:"C8900", name:"Nala",   species:"Cat", breed:"Bengal Mix",           age:"1 yr", sex:"F", weight:"6 lbs",  color:"Spotted",      status:"Foster",    intake:"2025-03-30", photo:"https://picsum.photos/seed/nala12/300/300",  description:"Nala is energetic, loves to climb and play.", fosterName:"James P.", fosterSince:"2025-04-15" },
    { id:"A1320", name:"Cooper", species:"Dog", breed:"Husky Mix",            age:"3 yr", sex:"M", weight:"48 lbs", color:"Gray/White",   status:"Medical",   intake:"2025-05-10", photo:"https://picsum.photos/seed/cooper13/300/300",description:"Cooper came in with a limp. Under ortho evaluation.", fosterName:null, fosterSince:null },
    { id:"A1288", name:"Remy",   species:"Dog", breed:"Poodle Mix",           age:"4 yr", sex:"M", weight:"30 lbs", color:"Apricot",      status:"Available", intake:"2025-04-20", photo:"https://picsum.photos/seed/remy14/300/300",  description:"Remy is calm, smart, and hypoallergenic-friendly.", fosterName:null, fosterSince:null },
    { id:"C8944", name:"Willow", species:"Cat", breed:"Ragdoll Mix",          age:"5 yr", sex:"F", weight:"10 lbs", color:"White/Gray",   status:"Available", intake:"2025-03-15", photo:"https://picsum.photos/seed/willow15/300/300",description:"Willow is gentle, quiet, and great with children.", fosterName:null, fosterSince:null },
    { id:"A1305", name:"Zeus",   species:"Dog", breed:"Great Dane Mix",       age:"2 yr", sex:"M", weight:"110 lbs",color:"Blue",         status:"Foster",    intake:"2025-04-05", photo:"https://picsum.photos/seed/zeus16/300/300",  description:"Zeus is a gentle giant who doesn't know his own size.", fosterName:"Lisa H.", fosterSince:"2025-04-20" }
  ],
  applications: [
    { id:"APP-231", applicant:"John D.",    email:"john.d@email.com",  phone:"555-0101", type:"Foster",   animalId:"A1265", animalName:"Bella",  status:"Pending",      date:"2025-06-01", homeType:"House",     hasYard:true,  otherPets:"1 dog", experience:true,  notes:"Experienced with large breeds." },
    { id:"APP-230", applicant:"Sarah M.",   email:"sarah.m@email.com", phone:"555-0202", type:"Adoption", animalId:"A1287", animalName:"Ace",    status:"Approved",     date:"2025-05-29", homeType:"House",     hasYard:true,  otherPets:"None",  experience:false, notes:"First-time dog owner, attended training class." },
    { id:"APP-229", applicant:"Carlos R.",  email:"carlos.r@email.com",phone:"555-0303", type:"Foster",   animalId:"C8921", animalName:"Luna",   status:"Under Review", date:"2025-05-27", homeType:"House",     hasYard:true,  otherPets:"2 cats",experience:true,  notes:"Currently fostering Luna." },
    { id:"APP-228", applicant:"Emily K.",   email:"emily.k@email.com", phone:"555-0404", type:"Adoption", animalId:"A1278", animalName:"Max",    status:"Denied",       date:"2025-05-24", homeType:"Apartment", hasYard:false, otherPets:"None",  experience:false, notes:"Apartment does not allow dogs over 50 lbs." },
    { id:"APP-227", applicant:"Marcus T.",  email:"marcus.t@email.com",phone:"555-0505", type:"Foster",   animalId:"C8912", animalName:"Milo",   status:"Pending",      date:"2025-05-23", homeType:"Condo",     hasYard:false, otherPets:"None",  experience:true,  notes:"Has fostered cats before." },
    { id:"APP-226", applicant:"Priya S.",   email:"priya.s@email.com", phone:"555-0606", type:"Adoption", animalId:"A1301", animalName:"Daisy",  status:"Approved",     date:"2025-05-20", homeType:"House",     hasYard:true,  otherPets:"1 cat", experience:true,  notes:"Approved pending medical clearance." },
    { id:"APP-225", applicant:"Tom B.",     email:"tom.b@email.com",   phone:"555-0707", type:"Adoption", animalId:"A1295", animalName:"Rocky",  status:"Approved",     date:"2025-05-15", homeType:"House",     hasYard:true,  otherPets:"None",  experience:true,  notes:"Completed adoption. Rocky went home 5/28." },
    { id:"APP-224", applicant:"Lisa H.",    email:"lisa.h@email.com",  phone:"555-0808", type:"Foster",   animalId:"A1320", animalName:"Cooper", status:"Under Review", date:"2025-05-12", homeType:"House",     hasYard:true,  otherPets:"None",  experience:false, notes:"Willing to handle medical needs." }
  ],
  intakes: [
    { id:"INT-088", date:"2025-06-05", animalId:"A1320", animal:"Cooper", species:"Dog", method:"Stray",           location:"Main St & 5th Ave", condition:"Fair", notes:"Limping, possible leg injury", staff:"Sam P." },
    { id:"INT-087", date:"2025-06-03", animalId:"C8944", animal:"Willow", species:"Cat", method:"Owner Surrender",  location:"Shelter",           condition:"Good", notes:"Owner relocating",              staff:"Danielle C." },
    { id:"INT-086", date:"2025-06-01", animalId:"A1310", animal:"Bruno",  species:"Dog", method:"Transfer",         location:"County Shelter",    condition:"Good", notes:"Transferred due to overcrowding",staff:"Sam P." },
    { id:"INT-085", date:"2025-05-28", animalId:"A1305", animal:"Zeus",   species:"Dog", method:"Stray",            location:"Park Blvd",         condition:"Good", notes:"No chip found",                 staff:"Maria L." },
    { id:"INT-084", date:"2025-05-25", animalId:"A1301", animal:"Daisy",  species:"Dog", method:"Rescue",           location:"Highway 12",        condition:"Poor", notes:"Found abandoned, malnourished", staff:"Danielle C." },
    { id:"INT-083", date:"2025-05-20", animalId:"C8900", animal:"Nala",   species:"Cat", method:"Stray",            location:"Oak Street",        condition:"Good", notes:"Friendly, likely indoor cat",   staff:"Maria L." }
  ],
  medicalRecords: [
    { id:"MR-201", animalId:"A1287", animal:"Ace",    date:"2025-06-01", type:"Vaccination", details:"Rabies booster",                     vet:"Dr. Patel", status:"Overdue",   nextDue:"2025-06-01" },
    { id:"MR-200", animalId:"C8921", animal:"Luna",   date:"2025-05-28", type:"Medication",  details:"Revolution flea/tick treatment",      vet:"Dr. Kim",   status:"Completed", nextDue:"2025-06-28" },
    { id:"MR-199", animalId:"A1320", animal:"Cooper", date:"2025-06-07", type:"Exam",        details:"Orthopedic consult — right front leg",vet:"Dr. Patel", status:"Scheduled", nextDue:null },
    { id:"MR-198", animalId:"A1301", animal:"Daisy",  date:"2025-05-28", type:"Treatment",   details:"Nutritional support + dewormer",       vet:"Dr. Kim",   status:"Ongoing",   nextDue:"2025-06-11" },
    { id:"MR-197", animalId:"A1278", animal:"Max",    date:"2025-05-25", type:"Spay/Neuter", details:"Neuter surgery — post-op normal",      vet:"Dr. Patel", status:"Completed", nextDue:null },
    { id:"MR-195", animalId:"A1265", animal:"Bella",  date:"2025-05-30", type:"Vaccination", details:"Bordetella intranasal",                vet:"Dr. Patel", status:"Due",       nextDue:"2025-06-11" }
  ],
  dailyCare: [
    { id:"DC-001", animalId:"A1287", animal:"Ace",    task:"Feed",       time:"8:00 AM",  done:true,  notes:"" },
    { id:"DC-002", animalId:"C8921", animal:"Luna",   task:"Feed",       time:"8:00 AM",  done:true,  notes:"" },
    { id:"DC-003", animalId:"A1265", animal:"Bella",  task:"Walk",       time:"9:00 AM",  done:true,  notes:"30 min leash walk" },
    { id:"DC-004", animalId:"A1287", animal:"Ace",    task:"Walk",       time:"9:30 AM",  done:false, notes:"20 min leash walk" },
    { id:"DC-005", animalId:"A1301", animal:"Daisy",  task:"Medication", time:"10:00 AM", done:false, notes:"Dewormer + supplement" },
    { id:"DC-006", animalId:"A1320", animal:"Cooper", task:"Medication", time:"10:00 AM", done:false, notes:"Meloxicam pain relief" },
    { id:"DC-007", animalId:"C8921", animal:"Luna",   task:"Medication", time:"10:30 AM", done:false, notes:"Revolution topical" },
    { id:"DC-008", animalId:"A1265", animal:"Bella",  task:"Vaccination",time:"2:00 PM",  done:false, notes:"Bordetella — Dr. Patel" },
    { id:"DC-009", animalId:"A1287", animal:"Ace",    task:"Feed",       time:"5:00 PM",  done:false, notes:"" }
  ],
  volunteers: [
    { id:"V-001", name:"Emily Smith",   email:"emily@email.com",  phone:"555-1101", role:"Dog Walker",       status:"Active",   joinDate:"2024-09-15", hoursMTD:22,  totalHours:180, lastShift:"2025-06-04" },
    { id:"V-002", name:"James Park",    email:"james@email.com",  phone:"555-1202", role:"Foster Parent",    status:"Active",   joinDate:"2024-06-01", hoursMTD:45,  totalHours:320, lastShift:"2025-06-05" },
    { id:"V-003", name:"Sofia Torres",  email:"sofia@email.com",  phone:"555-1303", role:"Event Coordinator",status:"Active",   joinDate:"2025-01-10", hoursMTD:18,  totalHours:90,  lastShift:"2025-06-01" },
    { id:"V-004", name:"Marcus Lee",    email:"marcus@email.com", phone:"555-1404", role:"Photographer",     status:"Active",   joinDate:"2024-11-20", hoursMTD:8,   totalHours:64,  lastShift:"2025-05-28" },
    { id:"V-005", name:"Rachel Green",  email:"rachel@email.com", phone:"555-1505", role:"Dog Walker",       status:"Active",   joinDate:"2025-02-01", hoursMTD:30,  totalHours:140, lastShift:"2025-06-05" },
    { id:"V-006", name:"Tom Harrison",  email:"tom@email.com",    phone:"555-1606", role:"Transport Driver", status:"Active",   joinDate:"2024-08-14", hoursMTD:14,  totalHours:210, lastShift:"2025-06-03" },
    { id:"V-007", name:"Aisha Patel",   email:"aisha@email.com",  phone:"555-1707", role:"Foster Parent",    status:"Inactive", joinDate:"2024-04-22", hoursMTD:0,   totalHours:280, lastShift:"2025-04-10" }
  ],
  campaigns: [
    { id:"CAM-001", title:"Medical Support Fund",  desc:"Covering vet costs for animals in medical care",  goal:5000, raised:3240, donors:42, startDate:"2025-05-01", endDate:"2025-06-30", status:"Active",    category:"Medical",    color:"#ef4444" },
    { id:"CAM-002", title:"Transport Cost Fund",   desc:"Fuel and transport costs for rescue operations",  goal:2000, raised:1456, donors:28, startDate:"2025-05-15", endDate:"2025-07-15", status:"Active",    category:"Operations", color:"#06b6d4" },
    { id:"CAM-003", title:"Summer Adoption Event", desc:"Supplies and venue for our July adoption event",  goal:1500, raised:1500, donors:63, startDate:"2025-04-01", endDate:"2025-05-31", status:"Completed", category:"Events",     color:"#10b981" }
  ],
  donations: [
    { id:"DON-112", donor:"Sarah Johnson",       amount:250,  date:"2025-06-05", method:"Card",  campaign:"Medical Support Fund", recurring:false, status:"Completed" },
    { id:"DON-111", donor:"Anonymous",           amount:50,   date:"2025-06-04", method:"Card",  campaign:"Transport Cost Fund",  recurring:false, status:"Completed" },
    { id:"DON-110", donor:"Robert Chen",         amount:500,  date:"2025-06-03", method:"Check", campaign:"Medical Support Fund", recurring:false, status:"Completed" },
    { id:"DON-109", donor:"The Williams Family", amount:1000, date:"2025-06-02", method:"Card",  campaign:null,                   recurring:true,  status:"Completed" },
    { id:"DON-104", donor:"Tech Co. Inc.",       amount:2500, date:"2025-05-25", method:"Wire",  campaign:null,                   recurring:false, status:"Completed" }
  ],
  notifications: [
    { id:"N-001", type:"urgent",   title:"Overdue: Rabies Vaccine",  body:"Ace (A1287) is overdue for rabies vaccination",  time:"10m ago", read:false, link:"medical" },
    { id:"N-002", type:"adoption", title:"New Foster Application",   body:"John D. submitted a foster application for Bella", time:"1h ago",  read:false, link:"applications" },
    { id:"N-003", type:"donation", title:"Donation Received",        body:"$250 from Sarah Johnson — Medical Support Fund",  time:"3h ago",  read:false, link:"donations" },
    { id:"N-004", type:"volunteer",title:"New Volunteer Joined",     body:"Emily Smith registered as a Dog Walker",          time:"5h ago",  read:true,  link:"volunteers" },
    { id:"N-005", type:"medical",  title:"Medical Record Added",     body:"Luna's Revolution treatment logged by Dr. Kim",   time:"9h ago",  read:true,  link:"medical" }
  ],
  tasks: [
    { id:"T-001", title:"Overdue: Rabies Vaccine", sub:"Ace · Dog · ID #A1287",   urgent:true,  time:null,       link:"medical" },
    { id:"T-002", title:"Medication: Give",         sub:"Luna · Cat · ID #C8921",   urgent:false, time:null,       link:"daily-care" },
    { id:"T-003", title:"Walk",                     sub:"Max · Dog · ID #A1278",    urgent:false, time:"10:00 AM", link:"daily-care" },
    { id:"T-004", title:"Follow up: Adoption App",  sub:"John D. · #APP-231",      urgent:false, time:"11:30 AM", link:"applications" },
    { id:"T-005", title:"Foster Check-in",          sub:"Bella · Dog · ID #A1265",  urgent:false, time:"2:00 PM",  link:"daily-care" }
  ],
  recentActivity: [
    { id:"RA-001", type:"adoption", text:"New Adoption — Charlie (Dog) adopted",      time:"2h ago" },
    { id:"RA-002", type:"donation", text:"Donation Received — $250 from Sarah J.",    time:"3h ago" },
    { id:"RA-003", type:"volunteer",text:"New Volunteer — Emily Smith joined",         time:"5h ago" },
    { id:"RA-004", type:"medical",  text:"Medical Record Added — Luna's vaccination",  time:"9h ago" }
  ],
  chartData: {
    intakesAdoptions: { labels:["Jan","Feb","Mar","Apr","May","Jun"], intakes:[28,35,42,38,45,30], adoptions:[18,22,28,25,32,18] },
    financialBreakdown: { labels:["Donations","Grants","Events","Other"], values:[8432,2450,1236,282], colors:["#7c3aed","#10b981","#06b6d4","#f59e0b"] },
    donationsMonthly: { labels:["Jan","Feb","Mar","Apr","May","Jun"], values:[4200,5800,6100,7200,9800,8432] },
    applicationStatus: { pending:21, approved:12, underReview:6, denied:3 }
  }
};

// ── Transform API animal_profiles row → dashboard animal shape ────────────────
function transformAnimal(row) {
  return {
    id:          row.id,
    name:        row.name,
    species:     row.species || "Dog",
    breed:       row.breed || "Mixed",
    age:         row.age_label || "Unknown",
    sex:         row.sex || "M",
    weight:      row.weight || "—",
    color:       row.color || "—",
    status:      row.status ? (row.status.charAt(0).toUpperCase() + row.status.slice(1)) : "Available",
    intake:      row.intake_date || row.created_at?.slice(0,10) || "—",
    photo:       row.photo_url || `https://picsum.photos/seed/${row.id}/300/300`,
    description: row.bio || "No description available.",
    fosterName:  null,
    fosterSince: null
  };
}

// ── Transform API adoption_applications_demo row → application shape ──────────
function transformApp(row) {
  return {
    id:          row.id,
    applicant:   row.applicant_name,
    email:       row.applicant_email || "—",
    phone:       row.phone || "—",
    type:        row.app_type || "Adoption",
    animalId:    row.animal_id || "—",
    animalName:  row.animal_name || "—",
    status:      row.status || "Pending",
    date:        row.submitted_at?.slice(0,10) || "—",
    homeType:    row.home_type || "—",
    hasYard:     !!row.has_yard,
    otherPets:   row.other_pets || "None",
    experience:  !!row.has_experience,
    notes:       row.notes || ""
  };
}

// ── Transform API volunteer_records row → volunteer shape ─────────────────────
function transformVolunteer(row) {
  return {
    id:         row.id,
    name:       row.full_name,
    email:      row.email || "—",
    phone:      row.phone || "—",
    role:       row.role || "Volunteer",
    status:     row.status === "active" ? "Active" : "Inactive",
    joinDate:   row.created_at?.slice(0,10) || "—",
    hoursMTD:   row.hours_month || 0,
    totalHours: row.hours_total || 0,
    lastShift:  row.last_shift || "—"
  };
}

// ── Transform API fundraising_campaigns_demo row → campaign shape ─────────────
function transformCampaign(row) {
  return {
    id:        row.id,
    title:     row.title,
    desc:      row.description || "",
    goal:      Math.round((row.goal_cents || 0) / 100),
    raised:    Math.round((row.raised_cents || 0) / 100),
    donors:    row.donor_count || 0,
    startDate: row.starts_at?.slice(0,10) || "—",
    endDate:   row.ends_at?.slice(0,10) || "—",
    status:    row.status === "active" ? "Active" : "Completed",
    category:  row.category || "General",
    color:     "#7c3aed"
  };
}

// ── Initialize CPAS global with mock data, then hydrate from API ──────────────
window.CPAS = { ...MOCK };

window.__loadDashboardData = async function() {
  try {
    const [overviewRes, teamsRes] = await Promise.all([
      fetch("/api/dashboard/overview", { credentials: "include" }),
      fetch("/api/dashboard/team",     { credentials: "include" })
    ]);

    if (!overviewRes.ok) return; // stay on mock

    const overview = await overviewRes.json();
    const teamsData = teamsRes.ok ? await teamsRes.json() : {};

    // Animals
    if (overview.animals?.length) {
      window.CPAS.animals = overview.animals.map(transformAnimal);
    }

    // Applications
    if (overview.applications?.length) {
      window.CPAS.applications = overview.applications.map(transformApp);
    }

    // Campaigns
    if (overview.campaigns?.length) {
      window.CPAS.campaigns = overview.campaigns.map(transformCampaign);
    }

    // Volunteers
    const vols = teamsData.members || overview.volunteers || [];
    if (vols.length) {
      window.CPAS.volunteers = vols.map(transformVolunteer);
    }

    // KPIs
    if (overview.kpis) {
      const k = overview.kpis;
      window.CPAS.stats = {
        ...MOCK.stats,
        totalAnimals:     k.animals    || MOCK.stats.totalAnimals,
        donationsMTD:     Math.round((k.raised_cents || 0) / 100) || MOCK.stats.donationsMTD,
      };
    }

  } catch (e) {
    console.warn("[CPAS] API fetch failed, using mock data:", e.message);
  }
};
