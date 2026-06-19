// ─── Applications List + Application Detail (live D1 via API) ────────────────

function appFetchJSON(url, options) {
  return fetch(url, Object.assign({
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  }, options || {})).then(function(res) {
    if (!res.ok) throw new Error(res.statusText || "Request failed");
    return res.json();
  });
}

function appReviewLabel(status) {
  const map = {
    new: "Pending",
    under_review: "Under Review",
    approved: "Approved",
    denied: "Denied",
    home_visit: "Home Visit",
  };
  if (!status) return "Pending";
  return map[status] || status.replace(/_/g, " ").replace(/\b\w/g, function(c) { return c.toUpperCase(); });
}

function appReviewApi(label) {
  const map = {
    Pending: "new",
    "Under Review": "under_review",
    Approved: "approved",
    Denied: "denied",
    "Home Visit": "home_visit",
  };
  return map[label] || label;
}

function appParseAnswers(row) {
  if (row && row.answers && typeof row.answers === "object") return row.answers;
  try { return JSON.parse(row.answers_json || "{}"); } catch { return {}; }
}

function appTransformRow(row) {
  const answers = appParseAnswers(row);
  const animalName = answers.interested_animal || answers.preferred_animal || answers.animal_name || "General foster";
  const homeType = answers.home_type || answers.housing || "—";
  const experienceText = (answers.experience || answers.pet_experience || "").toString();
  const hasExperience = /experienced|some|yes|prior|foster/i.test(experienceText);
  const applicant = row.applicant_name || [row.first_name, row.last_name].filter(Boolean).join(" ") || "Applicant";
  const reviewStatus = row.review_status || row.status || "new";

  return {
    id: row.id,
    applicant: applicant,
    email: row.applicant_email || row.email || "—",
    phone: row.applicant_phone || row.phone || "—",
    type: row.form_id === "form_foster_application" ? "Foster" : "Application",
    animalId: answers.animal_id || "—",
    animalName: animalName,
    status: appReviewLabel(reviewStatus),
    reviewStatus: reviewStatus,
    date: (row.submitted_at || row.created_at || "—").slice(0, 10),
    homeType: homeType,
    hasYard: /yard|own home|house/i.test(homeType),
    otherPets: answers.other_pets || answers.pets || "—",
    experience: hasExperience,
    notes: row.internal_notes || "",
    city: row.city || answers.city || "—",
    state: row.state_province || answers.state || "—",
    source: row.source || "website",
    answers: answers,
    raw: row,
  };
}

function ApplicationsView({ onNavigate }) {
  const [tab, setTab] = useState("All");
  const [search, setSearch] = useState("");
  const [apps, setApps] = useState(null);
  const [error, setError] = useState("");

  useEffect(function() {
    appFetchJSON("/api/dashboard/applications")
      .then(function(data) {
        const rows = (data.applications || []).map(appTransformRow);
        setApps(rows);
        window.CPAS = window.CPAS || {};
        window.CPAS.applications = rows;
      })
      .catch(function(e) {
        setError(e.message || "Failed to load applications.");
        setApps([]);
      });
  }, []);

  const list = apps || [];
  const counts = {
    All: list.length,
    Pending: list.filter(function(a) { return a.status === "Pending"; }).length,
    "Under Review": list.filter(function(a) { return a.status === "Under Review"; }).length,
    Approved: list.filter(function(a) { return a.status === "Approved"; }).length,
    Denied: list.filter(function(a) { return a.status === "Denied"; }).length,
  };

  const filtered = list.filter(function(a) {
    const matchTab = tab === "All" || a.status === tab;
    const q = search.toLowerCase();
    const matchSearch = !search
      || a.applicant.toLowerCase().includes(q)
      || a.id.toLowerCase().includes(q)
      || a.animalName.toLowerCase().includes(q)
      || a.email.toLowerCase().includes(q);
    return matchTab && matchSearch;
  });

  return React.createElement("div", { className: "dash-page" },
    React.createElement(PageHeader, {
      title: "Applications",
      subtitle: "Foster applications from the public site form",
      action: React.createElement(Btn, {
        variant: "secondary",
        size: "sm",
        icon: "external",
        onClick: function() { window.open("https://companionsofcaddo.org/services", "_blank"); },
      }, "Test Foster Form"),
    }),

    error && React.createElement("div", {
      style: { marginBottom: 16, padding: "12px 14px", borderRadius: 10, background: "rgba(239,68,68,.12)", color: "#fca5a5", fontSize: 13 },
    }, error),

    React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 } },
      React.createElement(StatCard, { icon: "📋", label: "Total", value: counts.All }),
      React.createElement(StatCard, { icon: "⏳", label: "Pending", value: counts.Pending, sub: "Needs review", subPositive: false }),
      React.createElement(StatCard, { icon: "✅", label: "Approved", value: counts.Approved, sub: "All time", subPositive: true }),
      React.createElement(StatCard, { icon: "🔍", label: "Under Review", value: counts["Under Review"] }),
    ),

    React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 4 } },
      React.createElement(Tabs, {
        tabs: Object.entries(counts).map(function(entry) { return { value: entry[0], label: entry[0], count: entry[1] }; }),
        active: tab,
        onChange: setTab,
      }),
      React.createElement(Input, { value: search, onChange: setSearch, placeholder: "Search…", icon: "search", style: { width: 220 } }),
    ),

    apps === null
      ? React.createElement(Card, { style: { padding: 40, textAlign: "center", marginTop: 16 } },
          React.createElement("div", { style: { color: C.textSec, fontSize: 14 } }, "Loading applications…"))
      : filtered.length === 0
        ? React.createElement(Card, { style: { padding: 40, textAlign: "center", marginTop: 16 } },
            React.createElement("div", { style: { fontSize: 32, marginBottom: 12 } }, "📋"),
            React.createElement("div", { style: { fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 8 } }, "No applications yet"),
            React.createElement("p", { style: { margin: 0, color: C.textSec, fontSize: 13, lineHeight: 1.6, maxWidth: 420, marginInline: "auto" } },
              "Submissions from the public foster form (Apply to Foster on /services) appear here automatically after POST /api/foster/apply succeeds."),
          )
        : React.createElement(Card, { style: { overflow: "hidden", marginTop: 16 } },
            React.createElement(Table, {
              cols: [
                { key: "id", label: "ID", render: function(v) { return React.createElement("span", { style: { color: C.textSec, fontFamily: "monospace", fontSize: 12 } }, v); } },
                { key: "applicant", label: "Applicant", render: function(v) { return React.createElement("span", { style: { fontWeight: 600 } }, v); } },
                { key: "type", label: "Type", render: function(v) { return React.createElement(Badge, { label: v }); } },
                { key: "animalName", label: "Interest" },
                { key: "status", label: "Status", render: function(v) { return React.createElement(Badge, { label: v, dot: true }); } },
                { key: "date", label: "Submitted", render: function(v) { return React.createElement("span", { style: { color: C.textSec, fontSize: 12 } }, v); } },
                { key: "homeType", label: "Home", render: function(v) { return React.createElement("span", { style: { color: C.textSec } }, v); } },
                { key: "id", label: "", render: function(v, row) {
                  return React.createElement(Btn, {
                    size: "sm", variant: "ghost", icon: "eye",
                    onClick: function(e) { e.stopPropagation(); onNavigate("application-detail", { appId: row.id }); },
                  }, "Review");
                } },
              ],
              rows: filtered,
              onRowClick: function(row) { onNavigate("application-detail", { appId: row.id }); },
            }),
          ),
  );
}

function ApplicationDetailView({ appId, onNavigate }) {
  const [app, setApp] = useState(null);
  const [status, setStatus] = useState("Pending");
  const [note, setNote] = useState("");
  const [notes, setNotes] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(function() {
    appFetchJSON("/api/dashboard/applications/" + encodeURIComponent(appId))
      .then(function(data) {
        const row = appTransformRow(data.application || {});
        setApp(row);
        setStatus(row.status);
        setNotes(row.notes ? [{ author: "Internal", time: "On file", text: row.notes }] : []);
      })
      .catch(function() {
        const fallback = (window.CPAS && window.CPAS.applications || []).find(function(a) { return a.id === appId; });
        if (fallback) {
          setApp(fallback);
          setStatus(fallback.status);
          setNotes(fallback.notes ? [{ author: "Internal", time: "On file", text: fallback.notes }] : []);
        }
      });
  }, [appId]);

  if (!app) {
    return React.createElement("div", { className: "dash-page" },
      React.createElement(PageHeader, { title: "Application", back: "Back to Applications", onBack: function() { onNavigate("applications"); } }),
      React.createElement(Card, { style: { padding: 40, textAlign: "center" } }, "Loading application…"),
    );
  }

  const animal = (window.CPAS && window.CPAS.animals || []).find(function(a) {
    return a.id === app.animalId || a.name === app.animalName;
  });

  function patchApplication(payload) {
    setSaving(true);
    return appFetchJSON("/api/dashboard/applications/" + encodeURIComponent(app.id), {
      method: "PATCH",
      body: JSON.stringify(payload),
    }).finally(function() { setSaving(false); });
  }

  function changeStatus(newStatus) {
    const apiStatus = appReviewApi(newStatus);
    patchApplication({ review_status: apiStatus }).then(function() {
      setStatus(newStatus);
      setApp(Object.assign({}, app, { status: newStatus, reviewStatus: apiStatus }));
    }).catch(function() {});
  }

  const statusActions = [
    { label: "Approve", variant: "success", newStatus: "Approved" },
    { label: "Deny", variant: "danger", newStatus: "Denied" },
    { label: "Move to Review", variant: "secondary", newStatus: "Under Review" },
    { label: "Mark Pending", variant: "secondary", newStatus: "Pending" },
  ].filter(function(a) { return a.newStatus !== status; });

  const row = function(label, value) {
    return React.createElement("div", { key: label,
      style: { display: "flex", gap: 8, padding: "9px 0", borderBottom: "1px solid " + C.border } },
      React.createElement("span", { style: { width: 130, fontSize: 12, color: C.textSec, flexShrink: 0 } }, label),
      React.createElement("span", { style: { fontSize: 12, color: C.text, fontWeight: 500 } }, value ?? "—"),
    );
  };

  const answerRows = Object.entries(app.answers || {}).filter(function(entry) {
    return entry[1] && !/^(first_name|last_name|email|phone|city|state|postal_code)$/i.test(entry[0]);
  });

  return React.createElement("div", { className: "dash-page" },
    React.createElement(PageHeader, {
      title: app.id,
      back: "Back to Applications",
      onBack: function() { onNavigate("applications"); },
      action: React.createElement("div", { style: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" } },
        React.createElement(Badge, { label: status, dot: true }),
        saving && React.createElement("span", { style: { fontSize: 12, color: C.textMut } }, "Saving…"),
        statusActions.map(function(a) {
          return React.createElement(Btn, { key: a.label, variant: a.variant, size: "sm", onClick: function() { changeStatus(a.newStatus); } }, a.label);
        }),
      ),
    }),

    React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 } },
      React.createElement(Card, { style: { padding: 20 } },
        React.createElement("h3", { style: { margin: "0 0 14px", fontSize: 14, fontWeight: 600, color: C.text } }, "Applicant Information"),
        React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, padding: "12px 0 14px", borderBottom: "1px solid " + C.border, marginBottom: 4 } },
          React.createElement(Avatar, { name: app.applicant, size: 44 }),
          React.createElement("div", null,
            React.createElement("div", { style: { fontSize: 15, fontWeight: 700, color: C.text } }, app.applicant),
            React.createElement("div", { style: { fontSize: 12, color: C.textSec } }, "Application " + app.id + " · Submitted " + app.date),
          ),
        ),
        row("Email", app.email),
        row("Phone", app.phone),
        row("City", app.city),
        row("State", app.state),
        row("Home Type", app.homeType),
        row("Source", app.source),
      ),

      React.createElement(Card, { style: { padding: 20 } },
        React.createElement("h3", { style: { margin: "0 0 14px", fontSize: 14, fontWeight: 600, color: C.text } }, "Foster Interest"),
        animal && React.createElement("div", {
          style: { display: "flex", alignItems: "center", gap: 12, padding: "0 0 14px", borderBottom: "1px solid " + C.border, marginBottom: 4, cursor: "pointer" },
          onClick: function() { onNavigate("animal-profile", { animalId: animal.id }); },
        },
          React.createElement("img", { src: animal.photo, alt: animal.name, style: { width: 56, height: 56, borderRadius: 10, objectFit: "cover", border: "1px solid " + C.border }, onError: function(e) { e.target.style.opacity = 0; } }),
          React.createElement("div", null,
            React.createElement("div", { style: { fontSize: 15, fontWeight: 700, color: C.text } }, animal.name),
            React.createElement("div", { style: { fontSize: 12, color: C.textSec } }, animal.species + " · " + animal.breed),
            React.createElement("div", { style: { marginTop: 4 } }, React.createElement(Badge, { label: animal.status, dot: true })),
          ),
        ),
        row("Interest", app.animalName),
        row("App Type", app.type),
        row("Status", status),
        row("Submitted", app.date),
        answerRows.length > 0 && React.createElement("div", { style: { marginTop: 12 } },
          React.createElement("div", { style: { fontSize: 12, fontWeight: 600, color: C.textSec, marginBottom: 8 } }, "Form answers"),
          answerRows.map(function(entry) {
            return row(entry[0].replace(/_/g, " "), String(entry[1]));
          }),
        ),
      ),
    ),

    React.createElement(Card, { style: { padding: 20 } },
      React.createElement("h3", { style: { margin: "0 0 14px", fontSize: 14, fontWeight: 600, color: C.text } }, "Notes & Communication"),
      notes.length > 0 && React.createElement("div", { style: { marginBottom: 16, display: "flex", flexDirection: "column", gap: 10 } },
        notes.map(function(n, i) {
          return React.createElement("div", { key: i, style: { background: C.raised, border: "1px solid " + C.border, borderRadius: 8, padding: 12 } },
            React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 6 } },
              React.createElement("span", { style: { fontSize: 12, fontWeight: 600, color: C.purpleL } }, n.author),
              React.createElement("span", { style: { fontSize: 11, color: C.textMut } }, n.time),
            ),
            React.createElement("p", { style: { margin: 0, fontSize: 13, color: C.textSec, lineHeight: 1.6 } }, n.text),
          );
        }),
      ),
      React.createElement("div", { style: { display: "flex", gap: 10 } },
        React.createElement("textarea", {
          value: note,
          onChange: function(e) { setNote(e.target.value); },
          placeholder: "Add an internal note…",
          style: { flex: 1, background: C.raised, border: "1px solid " + C.border, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 13, resize: "vertical", minHeight: 72, outline: "none" },
        }),
        React.createElement(Btn, {
          icon: "plus",
          onClick: function() {
            if (!note.trim()) return;
            patchApplication({ internal_notes: note.trim() }).then(function() {
              setNotes([].concat(notes, [{ author: "Staff", time: "Just now", text: note.trim() }]));
              setNote("");
            }).catch(function() {});
          },
        }, "Save Note"),
      ),
    ),
  );
}

Object.assign(window, { ApplicationsView, ApplicationDetailView });
