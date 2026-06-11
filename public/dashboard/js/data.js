// ─── Companions CPAS — Data Layer (API-first, mock fallback) ──────────────────
// Fetches from /api/dashboard/* endpoints on load.
// Falls back to rich mock data if API returns empty or errors.

const R2_CDN = "https://assets.companionsofcaddo.org";

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
    { id:"animal_bluepit",          name:"Blue",          species:"Dog", breed:"Pit Mix",            age:"Unknown", sex:"M", weight:"—", color:"Blue",    status:"Foster",        intake:"—", photo:`${R2_CDN}/media/animals/bluepit.webp`,          description:"Blue is a sweet pit mix in foster care." },
    { id:"animal_upclose",          name:"Joy",           species:"Dog", breed:"Mixed Breed",        age:"Unknown", sex:"F", weight:"—", color:"Brown",   status:"Foster",        intake:"—", photo:`${R2_CDN}/media/animals/upclose.webp`,          description:"Joy is curious and loves attention." },
    { id:"animal_pup",              name:"Patches",       species:"Dog", breed:"Mixed Breed Puppy",  age:"Puppy",   sex:"M", weight:"—", color:"Mixed",   status:"Foster",        intake:"—", photo:`${R2_CDN}/media/animals/pup.webp`,              description:"Patches is a playful pup looking for a home." },
    { id:"animal_2cute",            name:"Buddy & Scout", species:"Dog", breed:"Mixed Breed",        age:"Unknown", sex:"M", weight:"—", color:"Mixed",   status:"Available",     intake:"—", photo:`${R2_CDN}/media/animals/2cutepups.webp`,        description:"Two adorable pups available together or separately." },
    { id:"animal_thinboy",          name:"Chance",        species:"Dog", breed:"Mixed Breed",        age:"Unknown", sex:"M", weight:"—", color:"Tan",     status:"Foster",        intake:"—", photo:`${R2_CDN}/media/animals/thinboy.webp`,          description:"Chance came in underweight but is recovering well." },
    { id:"animal_skinnyman",        name:"Hope",          species:"Dog", breed:"Mixed Breed",        age:"Unknown", sex:"F", weight:"—", color:"Mixed",   status:"Medical",       intake:"—", photo:`${R2_CDN}/media/animals/skinnyman.webp`,        description:"Hope is under medical watch and gaining strength." },
    { id:"animal_conehead",         name:"Recover",       species:"Dog", breed:"Mixed Breed",        age:"Unknown", sex:"M", weight:"—", color:"Mixed",   status:"Medical",       intake:"—", photo:`${R2_CDN}/media/animals/conehead.webp`,         description:"Recover is post-surgery and healing up great." },
    { id:"animal_miniscoobydoo",    name:"Scooby",        species:"Dog", breed:"Small Mixed Breed",  age:"Unknown", sex:"M", weight:"—", color:"Brown",   status:"Available",     intake:"—", photo:`${R2_CDN}/media/animals/miniscoobydoo.webp`,    description:"Scooby is a small, lovable goofball." },
    { id:"animal_sus",              name:"Mischief",      species:"Dog", breed:"Mixed Breed",        age:"Unknown", sex:"M", weight:"—", color:"Mixed",   status:"Foster",        intake:"—", photo:`${R2_CDN}/media/animals/sus.webp`,              description:"Mischief lives up to his name — in the best way." },
    { id:"animal_bigsmiles",        name:"Smiley",        species:"Dog", breed:"Mixed Breed",        age:"Unknown", sex:"F", weight:"—", color:"Mixed",   status:"Available",     intake:"—", photo:`${R2_CDN}/media/animals/bigsmiles.webp`,        description:"Smiley greets everyone with pure joy." },
    { id:"animal_happyboy",         name:"Happy",         species:"Dog", breed:"Mixed Breed",        age:"Unknown", sex:"M", weight:"—", color:"Mixed",   status:"Available",     intake:"—", photo:`${R2_CDN}/media/animals/happyboy.webp`,         description:"Happy is exactly what his name says." },
    { id:"animal_brindle",          name:"Brindle",       species:"Dog", breed:"Brindle Mix",        age:"Unknown", sex:"M", weight:"—", color:"Brindle", status:"Available",     intake:"—", photo:`${R2_CDN}/media/animals/brindle.webp`,          description:"Brindle is calm, affectionate, and house-trained." },
    { id:"animal_redeye",           name:"Red",           species:"Dog", breed:"Mixed Breed",        age:"Unknown", sex:"M", weight:"—", color:"Red",     status:"Available",     intake:"—", photo:`${R2_CDN}/media/animals/redeye.webp`,           description:"Red is alert, loyal, and ready for a family." },
    { id:"animal_gimmieabite",      name:"Biscuit",       species:"Dog", breed:"Mixed Breed",        age:"Unknown", sex:"F", weight:"—", color:"Mixed",   status:"Available",     intake:"—", photo:`${R2_CDN}/media/animals/gimmieabite.webp`,      description:"Biscuit is feisty, fun, and full of personality." },
    { id:"animal_hungryboy",        name:"Hungry Boy",    species:"Dog", breed:"Mixed Breed",        age:"Unknown", sex:"M", weight:"—", color:"Mixed",   status:"Medical",       intake:"—", photo:`${R2_CDN}/media/animals/hungryboy.webp`,        description:"Hungry Boy came in severely malnourished. Now recovering." },
    { id:"animal_awwmaaann",        name:"Aww Man",       species:"Dog", breed:"Mixed Breed",        age:"Unknown", sex:"M", weight:"—", color:"Mixed",   status:"Available",     intake:"—", photo:`${R2_CDN}/media/animals/awwmaaann%20(1).webp`,  description:"Aww Man has a face that says it all." },
    { id:"animal_thisismysweater",  name:"Sweater",       species:"Dog", breed:"Mixed Breed",        age:"Unknown", sex:"F", weight:"—", color:"Mixed",   status:"Available",     intake:"—", photo:`${R2_CDN}/media/animals/thisismysweater.webp`,  description:"Sweater is cozy, calm, and ready for her forever home." },
  ],
  applications: [
    { id:"APP-231", applicant:"John D.",    email:"john.d@email.com",  phone:"555-0101", type:"Foster",   animalId:"animal_bluepit",       animalName:"Blue",    status:"Pending",      date:"2025-06-01", homeType:"House",     hasYard:true,  otherPets:"1 dog", experience:true,  notes:"Experienced with large breeds." },
    { id:"APP-230", applicant:"Sarah M.",   email:"sarah.m@email.com", phone:"555-0202", type:"Adoption", animalId:"animal_bigsmiles",     animalName:"Smiley",  status:"Approved",     date:"2025-05-29", homeType:"House",     hasYard:true,  otherPets:"None",  experience:false, notes:"First-time dog owner, attended training class." },
    { id:"APP-229", applicant:"Carlos R.",  email:"carlos.r@email.com",phone:"555-0303", type:"Foster",   animalId:"animal_upclose",       animalName:"Joy",     status:"Under Review", date:"2025-05-27", homeType:"House",     hasYard:true,  otherPets:"None",  experience:true,  notes:"Has experience fostering." },
    { id:"APP-228", applicant:"Emily K.",   email:"emily.k@email.com", phone:"555-0404", type:"Adoption", animalId:"animal_happyboy",      animalName:"Happy",   status:"Denied",       date:"2025-05-24", homeType:"Apartment", hasYard:false, otherPets:"None",  experience:false, notes:"Apartment does not allow large dogs." },
    { id:"APP-227", applicant:"Marcus T.",  email:"marcus.t@email.com",phone:"555-0505", type:"Foster",   animalId:"animal_miniscoobydoo", animalName:"Scooby",  status:"Pending",      date:"2025-05-23", homeType:"Condo",     hasYard:false, otherPets:"None",  experience:true,  notes:"Has fostered small dogs before." },
    { id:"APP-226", applicant:"Priya S.",   email:"priya.s@email.com", phone:"555-0606", type:"Adoption", animalId:"animal_brindle",       animalName:"Brindle", status:"Approved",     date:"2025-05-20", homeType:"House",     hasYard:true,  otherPets:"1 cat", experience:true,  notes:"Approved pending medical clearance." },
    { id:"APP-225", applicant:"Tom B.",     email:"tom.b@email.com",   phone:"555-0707", type:"Adoption", animalId:"animal_redeye",        animalName:"Red",     status:"Approved",     date:"2025-05-15", homeType:"House",     hasYard:true,  otherPets:"None",  experience:true,  notes:"Completed adoption." },
    { id:"APP-224", applicant:"Lisa H.",    email:"lisa.h@email.com",  phone:"555-0808", type:"Foster",   animalId:"animal_conehead",      animalName:"Recover", status:"Under Review", date:"2025-05-12", homeType:"House",     hasYard:true,  otherPets:"None",  experience:false, notes:"Willing to handle medical needs." }
  ],
  intakes: [
    { id:"INT-088", date:"2025-06-05", animalId:"animal_conehead",      animal:"Recover",    species:"Dog", method:"Stray",          location:"Main St & 5th Ave", condition:"Fair", notes:"Post-surgery recovery",          staff:"Sam P." },
    { id:"INT-087", date:"2025-06-03", animalId:"animal_thisismysweater",animal:"Sweater",    species:"Dog", method:"Owner Surrender", location:"Shelter",           condition:"Good", notes:"Owner relocating",               staff:"Danielle C." },
    { id:"INT-086", date:"2025-06-01", animalId:"animal_sus",           animal:"Mischief",   species:"Dog", method:"Transfer",        location:"County Shelter",    condition:"Good", notes:"Transferred due to overcrowding", staff:"Sam P." },
    { id:"INT-085", date:"2025-05-28", animalId:"animal_2cute",         animal:"Buddy & Scout",species:"Dog",method:"Stray",          location:"Park Blvd",         condition:"Good", notes:"Found together, bonded pair",     staff:"Maria L." },
    { id:"INT-084", date:"2025-05-25", animalId:"animal_hungryboy",     animal:"Hungry Boy", species:"Dog", method:"Rescue",          location:"Highway 12",        condition:"Poor", notes:"Found abandoned, malnourished",   staff:"Danielle C." },
    { id:"INT-083", date:"2025-05-20", animalId:"animal_skinnyman",     animal:"Hope",       species:"Dog", method:"Stray",           location:"Oak Street",        condition:"Poor", notes:"Very underweight on intake",      staff:"Maria L." }
  ],
  medicalRecords: [
    { id:"MR-201", animalId:"animal_conehead",   animal:"Recover",    date:"2025-06-01", type:"Surgery",    details:"Post-op cone — healing well",        vet:"Dr. Patel", status:"Ongoing",   nextDue:"2025-06-15" },
    { id:"MR-200", animalId:"animal_skinnyman",  animal:"Hope",       date:"2025-05-28", type:"Treatment",  details:"Nutritional support + dewormer",      vet:"Dr. Kim",   status:"Ongoing",   nextDue:"2025-06-11" },
    { id:"MR-199", animalId:"animal_hungryboy",  animal:"Hungry Boy", date:"2025-06-07", type:"Exam",       details:"Weight check — gaining steadily",     vet:"Dr. Patel", status:"Scheduled", nextDue:null },
    { id:"MR-198", animalId:"animal_thinboy",    animal:"Chance",     date:"2025-05-28", type:"Vaccination",details:"Rabies + distemper combo",            vet:"Dr. Kim",   status:"Completed", nextDue:"2026-05-28" },
    { id:"MR-197", animalId:"animal_bluepit",    animal:"Blue",       date:"2025-05-25", type:"Spay/Neuter",details:"Spay surgery — post-op normal",       vet:"Dr. Patel", status:"Completed", nextDue:null },
    { id:"MR-195", animalId:"animal_pup",        animal:"Patches",    date:"2025-05-30", type:"Vaccination",details:"First puppy series vaccines",         vet:"Dr. Patel", status:"Due",       nextDue:"2025-06-30" }
  ],
  dailyCare: [
    { id:"DC-001", animalId:"animal_bluepit",       animal:"Blue",       task:"Feed",       time:"8:00 AM",  done:true,  notes:"" },
    { id:"DC-002", animalId:"animal_upclose",       animal:"Joy",        task:"Feed",       time:"8:00 AM",  done:true,  notes:"" },
    { id:"DC-003", animalId:"animal_thinboy",       animal:"Chance",     task:"Walk",       time:"9:00 AM",  done:true,  notes:"30 min leash walk" },
    { id:"DC-004", animalId:"animal_bigsmiles",     animal:"Smiley",     task:"Walk",       time:"9:30 AM",  done:false, notes:"20 min leash walk" },
    { id:"DC-005", animalId:"animal_skinnyman",     animal:"Hope",       task:"Medication", time:"10:00 AM", done:false, notes:"Nutritional supplement" },
    { id:"DC-006", animalId:"animal_hungryboy",     animal:"Hungry Boy", task:"Medication", time:"10:00 AM", done:false, notes:"High-calorie supplement" },
    { id:"DC-007", animalId:"animal_conehead",      animal:"Recover",    task:"Medication", time:"10:30 AM", done:false, notes:"Pain relief + cone check" },
    { id:"DC-008", animalId:"animal_pup",           animal:"Patches",    task:"Vaccination",time:"2:00 PM",  done:false, notes:"Second puppy series — Dr. Patel" },
    { id:"DC-009", animalId:"animal_bluepit",       animal:"Blue",       task:"Feed",       time:"5:00 PM",  done:false, notes:"" }
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
    { id:"N-001", type:"urgent",   title:"Medical Watch: Hope",       body:"Hope (animal_skinnyman) needs daily weight check",    time:"10m ago", read:false, link:"medical" },
    { id:"N-002", type:"adoption", title:"New Foster Application",    body:"John D. submitted a foster application for Blue",      time:"1h ago",  read:false, link:"applications" },
    { id:"N-003", type:"donation", title:"Donation Received",         body:"$250 from Sarah Johnson — Medical Support Fund",       time:"3h ago",  read:false, link:"donations" },
    { id:"N-004", type:"volunteer",title:"New Volunteer Joined",      body:"Emily Smith registered as a Dog Walker",               time:"5h ago",  read:true,  link:"volunteers" },
    { id:"N-005", type:"medical",  title:"Vaccine Due: Patches",      body:"Patches puppy series second round due June 30",        time:"9h ago",  read:true,  link:"medical" }
  ],
  tasks: [
    { id:"T-001", title:"Medical Watch",         sub:"Hope · Dog · animal_skinnyman",    urgent:true,  time:null,       link:"medical" },
    { id:"T-002", title:"Medication: Give",       sub:"Hungry Boy · Dog · animal_hungryboy", urgent:false, time:null,   link:"daily-care" },
    { id:"T-003", title:"Walk",                   sub:"Smiley · Dog · animal_bigsmiles",  urgent:false, time:"10:00 AM", link:"daily-care" },
    { id:"T-004", title:"Follow up: Foster App",  sub:"John D. · #APP-231",               urgent:false, time:"11:30 AM", link:"applications" },
    { id:"T-005", title:"Vaccine Appointment",    sub:"Patches · Dog · animal_pup",       urgent:false, time:"2:00 PM",  link:"daily-care" }
  ],
  recentActivity: [
    { id:"RA-001", type:"adoption", text:"Adoption Success — Brindle went home with the Garcia family", time:"2h ago" },
    { id:"RA-002", type:"donation", text:"Donation Received — $250 from Sarah J.",                      time:"3h ago" },
    { id:"RA-003", type:"volunteer",text:"New Volunteer — Emily Smith joined as Dog Walker",             time:"5h ago" },
    { id:"RA-004", type:"medical",  text:"Medical Update — Recover's cone off in 3 days",               time:"9h ago" }
  ],
  chartData: {
    intakesAdoptions: { labels:["Jan","Feb","Mar","Apr","May","Jun"], intakes:[28,35,42,38,45,30], adoptions:[18,22,28,25,32,18] },
    financialBreakdown: { labels:["Donations","Grants","Events","Other"], values:[8432,2450,1236,282], colors:["#7c3aed","#10b981","#06b6d4","#f59e0b"] },
    donationsMonthly: { labels:["Jan","Feb","Mar","Apr","May","Jun"], values:[4200,5800,6100,7200,9800,8432] },
    applicationStatus: { pending:21, approved:12, underReview:6, denied:3 }
  }
};

// ── Resolve photo URL — always returns a full https:// URL ────────────────────
function resolvePhoto(url, fallbackId) {
  if (!url) return `${R2_CDN}/media/animals/happyboy.webp`;
  if (url.startsWith("http")) return url;
  if (url.startsWith("/")) return `${R2_CDN}${url}`;
  return `${R2_CDN}/${url}`;
}

// ── Transform API animal_profiles row → dashboard animal shape ────────────────
function transformAnimal(row) {
  // Priority: asset_cdn_url (from JOIN) > photo_url > fallback
  const rawPhoto = row.asset_cdn_url || row.cdn_url || row.photo_url || null;
  return {
    id:          row.id,
    name:        row.name,
    species:     row.species || "Dog",
    breed:       row.breed || "Mixed",
    age:         row.age_label || "Unknown",
    sex:         row.sex || "M",
    weight:      row.weight_label || row.weight || "—",
    color:       row.color || "—",
    status:      row.status
      ? (row.status.charAt(0).toUpperCase() + row.status.slice(1)).replace("_", " ")
      : "Available",
    intake:      row.intake_date || row.created_at?.slice(0,10) || "—",
    photo:       resolvePhoto(rawPhoto, row.id),
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

// ── Transform API fundraising_campaigns row → campaign shape ─────────────
function transformCampaign(row) {
  return {
    id:        row.id,
    title:     row.title,
    desc:      row.description || "",
    goal:      Math.round((row.goal_amount_cents ?? row.goal_cents ?? 0) / 100),
    raised:    Math.round((row.raised_amount_cents ?? row.raised_cents ?? 0) / 100),
    donors:    row.donor_count || 0,
    startDate: row.starts_at?.slice(0,10) || "—",
    endDate:   row.ends_at?.slice(0,10) || "—",
    status:    row.status === "active" ? "Active" : "Completed",
    category:  row.campaign_type || row.category || "General",
    color:     "#7c3aed"
  };
}

// ── Initialize CPAS global with mock data, then hydrate from API ──────────────
window.CPAS = { ...MOCK };

window.__loadDashboardData = async function() {
  try {
    const [overviewRes, teamsRes] = await Promise.all([
      fetch("/api/dashboard/overview", { credentials: "include" }),
      fetch("/api/dashboard/team",     { credentials: "include" }),
    ]);

    if (!overviewRes.ok) return; // stay on mock

    const overview = await overviewRes.json();
    const teamsData = teamsRes.ok ? await teamsRes.json() : {};

    // Animals — hydrate with real R2 images
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
        totalAnimals: k.animals    || MOCK.stats.totalAnimals,
        donationsMTD: Math.round((k.raised_cents || 0) / 100) || MOCK.stats.donationsMTD,
      };
    }

  } catch (e) {
    console.warn("[CPAS] API fetch failed, using mock data:", e.message);
  }
};
