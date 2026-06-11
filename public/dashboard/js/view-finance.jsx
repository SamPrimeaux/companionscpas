// Finance Views: Fundraising + Donations

const FINANCE_ORG_ID = "tenant_companionscpas";

function financeCentsFromDollars(value) {
  const n = Number(String(value || "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

function financeDollarsFromCents(cents) {
  return Number(cents || 0) / 100;
}

function financeMoney(cents) {
  return "$" + Math.round(financeDollarsFromCents(cents)).toLocaleString();
}

function financeDate(value) {
  return value ? String(value).slice(0, 10) : "Not set";
}

function financeStatus(value) {
  return String(value || "").toLowerCase();
}

function FinanceNotice({ children }) {
  return React.createElement("div", {
    style: {
      border: `1px solid ${C.border}`,
      background: "rgba(127,119,221,.10)",
      color: C.textSec,
      borderRadius: 12,
      padding: "12px 14px",
      fontSize: 13,
      marginBottom: 18
    }
  }, children);
}

function FinanceEmpty({ title, body }) {
  return React.createElement(Card, { style: { padding: 24, textAlign: "center" } },
    React.createElement("div", { style: { color: C.text, fontSize: 16, fontWeight: 700, marginBottom: 6 } }, title),
    React.createElement("div", { style: { color: C.textSec, fontSize: 13, maxWidth: 560, margin: "0 auto" } }, body)
  );
}

function useFinanceData() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [campaigns, setCampaigns] = useState([]);
  const [donations, setDonations] = useState([]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [campaignRes, donationRes] = await Promise.all([
        fetch("/api/dashboard/fundraising", { credentials: "include" }),
        fetch("/api/dashboard/donations", { credentials: "include" })
      ]);
      if (!campaignRes.ok) throw new Error("Campaigns API returned " + campaignRes.status);
      if (!donationRes.ok) throw new Error("Donations API returned " + donationRes.status);
      const campaignJson = await campaignRes.json();
      const donationJson = await donationRes.json();
      setCampaigns((campaignJson.campaigns || []).map(c => ({
        ...c,
        raised_cents: Number(c.raised_amount_cents ?? c.raised_cents ?? 0),
        goal_cents: Number(c.goal_amount_cents ?? c.goal_cents ?? 0),
        donors: Number(c.donor_count || 0),
        category: c.campaign_type || c.category || "fundraiser",
        status: c.status || "draft"
      })));
      setDonations(donationJson.donations || []);
    } catch (err) {
      setError(err.message || "Unable to load finance data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);
  return { loading, error, campaigns, donations, reload: load };
}

function CampaignModal({ open, onClose, onSaved, campaign }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState("");
  const [category, setCategory] = useState("medical");
  const [status, setStatus] = useState("active");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitle(campaign?.title || "");
    setDescription(campaign?.description || campaign?.short_description || "");
    setGoal(campaign ? String(financeDollarsFromCents(campaign.goal_cents ?? campaign.goal_amount_cents)) : "");
    setCategory(campaign?.campaign_type || campaign?.category || "medical");
    setStatus(campaign?.status || "active");
    setStartsAt(financeDate(campaign?.starts_at) === "Not set" ? "" : financeDate(campaign?.starts_at));
    setEndsAt(financeDate(campaign?.ends_at) === "Not set" ? "" : financeDate(campaign?.ends_at));
    setError("");
  }, [open, campaign]);

  async function save() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/dashboard/fundraising", {
        method: campaign?.id ? "PUT" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: campaign?.id,
          title,
          description,
          goal_amount_cents: financeCentsFromDollars(goal),
          campaign_type: category,
          status,
          starts_at: startsAt || null,
          ends_at: endsAt || null,
          is_public: 1
        })
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || payload.ok === false) throw new Error(payload.error || "Campaign save failed");
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message || "Campaign save failed");
    } finally {
      setSaving(false);
    }
  }

  return React.createElement(Modal, { open, onClose, title: campaign?.id ? "Edit Campaign" : "New Campaign", width: 560 },
    React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 14 } },
      error && React.createElement(FinanceNotice, null, error),
      React.createElement("div", null, React.createElement("label", { style: { fontSize: 12, color: C.textSec, display: "block", marginBottom: 6 } }, "Campaign Title"), React.createElement(Input, { value: title, onChange: setTitle, placeholder: "Campaign name" })),
      React.createElement("div", null, React.createElement("label", { style: { fontSize: 12, color: C.textSec, display: "block", marginBottom: 6 } }, "Description"), React.createElement("textarea", { value: description, onChange: e => setDescription(e.target.value), placeholder: "What will this campaign fund?", style: { width: "100%", background: C.raised, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 13, resize: "vertical", minHeight: 84, outline: "none", boxSizing: "border-box" } })),
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } },
        React.createElement("div", null, React.createElement("label", { style: { fontSize: 12, color: C.textSec, display: "block", marginBottom: 6 } }, "Goal Amount"), React.createElement(Input, { value: goal, onChange: setGoal, placeholder: "$0.00" })),
        React.createElement("div", null, React.createElement("label", { style: { fontSize: 12, color: C.textSec, display: "block", marginBottom: 6 } }, "Type"), React.createElement(Select, { value: category, onChange: setCategory, options: ["medical", "transport", "foster", "general", "fundraiser"].map(v => ({ value: v, label: v[0].toUpperCase() + v.slice(1) })) }))
      ),
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } },
        React.createElement("div", null, React.createElement("label", { style: { fontSize: 12, color: C.textSec, display: "block", marginBottom: 6 } }, "Start Date"), React.createElement(Input, { value: startsAt, onChange: setStartsAt, placeholder: "YYYY-MM-DD" })),
        React.createElement("div", null, React.createElement("label", { style: { fontSize: 12, color: C.textSec, display: "block", marginBottom: 6 } }, "End Date"), React.createElement(Input, { value: endsAt, onChange: setEndsAt, placeholder: "YYYY-MM-DD" }))
      ),
      React.createElement("div", null, React.createElement("label", { style: { fontSize: 12, color: C.textSec, display: "block", marginBottom: 6 } }, "Status"), React.createElement(Select, { value: status, onChange: setStatus, options: ["active", "draft", "paused", "completed"].map(v => ({ value: v, label: v[0].toUpperCase() + v.slice(1) })) })),
      React.createElement("div", { style: { display: "flex", gap: 10, justifyContent: "flex-end" } },
        React.createElement(Btn, { variant: "secondary", onClick: onClose }, "Cancel"),
        React.createElement(Btn, { onClick: save, disabled: saving || !title || !goal }, saving ? "Saving..." : "Save Campaign")
      )
    )
  );
}

function DonationModal({ open, onClose, onSaved, campaigns }) {
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("manual");
  const [campaignId, setCampaignId] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("received");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setDonorName("");
    setDonorEmail("");
    setAmount("");
    setMethod("manual");
    setCampaignId(campaigns[0]?.id || "");
    setMessage("");
    setStatus("received");
    setError("");
  }, [open, campaigns]);

  async function save() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/dashboard/donations", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ donor_name: donorName || "Anonymous", donor_email: donorEmail || null, amount_cents: financeCentsFromDollars(amount), payment_provider: method, campaign_id: campaignId || null, donor_message: message || null, status })
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || payload.ok === false) throw new Error(payload.error || "Donation save failed");
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message || "Donation save failed");
    } finally {
      setSaving(false);
    }
  }

  return React.createElement(Modal, { open, onClose, title: "Record Donation", width: 520 },
    React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 14 } },
      error && React.createElement(FinanceNotice, null, error),
      React.createElement(FinanceNotice, null, "Stripe checkout is not fully connected yet. Manual and imported donation records are stored in D1 and will feed the dashboard, campaigns, and financial reports."),
      React.createElement("div", null, React.createElement("label", { style: { fontSize: 12, color: C.textSec, display: "block", marginBottom: 6 } }, "Donor Name"), React.createElement(Input, { value: donorName, onChange: setDonorName, placeholder: "Full name or Anonymous" })),
      React.createElement("div", null, React.createElement("label", { style: { fontSize: 12, color: C.textSec, display: "block", marginBottom: 6 } }, "Donor Email"), React.createElement(Input, { value: donorEmail, onChange: setDonorEmail, placeholder: "optional@email.com" })),
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } },
        React.createElement("div", null, React.createElement("label", { style: { fontSize: 12, color: C.textSec, display: "block", marginBottom: 6 } }, "Amount"), React.createElement(Input, { value: amount, onChange: setAmount, placeholder: "$0.00" })),
        React.createElement("div", null, React.createElement("label", { style: { fontSize: 12, color: C.textSec, display: "block", marginBottom: 6 } }, "Method"), React.createElement(Select, { value: method, onChange: setMethod, options: ["manual", "check", "cash", "external", "stripe", "card", "wire"].map(v => ({ value: v, label: v[0].toUpperCase() + v.slice(1) })) }))
      ),
      React.createElement("div", null, React.createElement("label", { style: { fontSize: 12, color: C.textSec, display: "block", marginBottom: 6 } }, "Campaign"), React.createElement(Select, { value: campaignId, onChange: setCampaignId, options: [{ value: "", label: "General / No Campaign" }, ...campaigns.map(c => ({ value: c.id, label: c.title }))] })),
      React.createElement("div", null, React.createElement("label", { style: { fontSize: 12, color: C.textSec, display: "block", marginBottom: 6 } }, "Status"), React.createElement(Select, { value: status, onChange: setStatus, options: ["received", "pending", "pledged", "refunded"].map(v => ({ value: v, label: v[0].toUpperCase() + v.slice(1) })) })),
      React.createElement("div", null, React.createElement("label", { style: { fontSize: 12, color: C.textSec, display: "block", marginBottom: 6 } }, "Note"), React.createElement(Input, { value: message, onChange: setMessage, placeholder: "Optional internal/donor note" })),
      React.createElement("div", { style: { display: "flex", gap: 10, justifyContent: "flex-end" } },
        React.createElement(Btn, { variant: "secondary", onClick: onClose }, "Cancel"),
        React.createElement(Btn, { onClick: save, disabled: saving || !amount }, saving ? "Saving..." : "Save Donation")
      )
    )
  );
}

function FundraisingView({ onNavigate }) {
  const { loading, error, campaigns, donations, reload } = useFinanceData();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  const totalRaised = campaigns.reduce((s, c) => s + Number(c.raised_cents || 0), 0);
  const totalGoal = campaigns.reduce((s, c) => s + Number(c.goal_cents || 0), 0);
  const totalDonors = campaigns.reduce((s, c) => s + Number(c.donors || 0), 0);
  const activeCount = campaigns.filter(c => financeStatus(c.status) === "active").length;
  const progress = totalGoal ? Math.round((totalRaised / totalGoal) * 100) : 0;

  return React.createElement("div", { style: { padding: "28px 28px 40px", flex: 1, overflowY: "auto" } },
    React.createElement(PageHeader, { title: "Fundraising", subtitle: "Live campaigns, goals, and manual donation tracking", action: React.createElement(Btn, { icon: "plus", size: "sm", onClick: () => { setEditing(null); setShowModal(true); } }, "New Campaign") }),
    React.createElement(FinanceNotice, null, "Production source: fundraising_campaigns. Demo campaigns are not used. Stripe can be connected later without changing this dashboard flow."),
    error && React.createElement(FinanceNotice, null, error),
    React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 28 } },
      React.createElement(StatCard, { label: "Total Raised", value: financeMoney(totalRaised), sub: `of ${financeMoney(totalGoal)} goal`, subPositive: true }),
      React.createElement(StatCard, { label: "Active Campaigns", value: activeCount }),
      React.createElement(StatCard, { label: "Total Donors", value: totalDonors }),
      React.createElement(StatCard, { label: "Overall Progress", value: `${progress}%`, sub: "of all-time goal", subPositive: true })
    ),
    loading ? React.createElement(FinanceEmpty, { title: "Loading campaigns", body: "Reading fundraising_campaigns from D1." }) :
      campaigns.length ? React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 14 } }, campaigns.map((campaign, idx) => {
        const pct = campaign.goal_cents ? Math.min(100, Math.round((campaign.raised_cents / campaign.goal_cents) * 100)) : 0;
        const accent = [C.purple, C.green, C.blue, "#ef4444", "#f59e0b"][idx % 5];
        return React.createElement(Card, { key: campaign.id, style: { padding: 24 } },
          React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 12 } },
            React.createElement("div", { style: { minWidth: 0, flex: 1 } },
              React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 6 } },
                React.createElement("div", { style: { width: 10, height: 10, borderRadius: 3, background: accent, flexShrink: 0 } }),
                React.createElement("h3", { style: { margin: 0, fontSize: 16, fontWeight: 700, color: C.text } }, campaign.title),
                React.createElement(Badge, { label: campaign.status, dot: true })
              ),
              React.createElement("p", { style: { margin: 0, fontSize: 13, color: C.textSec, maxWidth: 920 } }, campaign.short_description || campaign.description || "No description yet.")
            ),
            React.createElement("div", { style: { textAlign: "right" } },
              React.createElement("div", { style: { fontSize: 22, fontWeight: 700, color: C.text } }, financeMoney(campaign.raised_cents)),
              React.createElement("div", { style: { fontSize: 12, color: C.textSec } }, `of ${financeMoney(campaign.goal_cents)} goal`)
            )
          ),
          React.createElement(ProgressBar, { value: campaign.raised_cents, max: Math.max(campaign.goal_cents, 1), color: accent, height: 8 }),
          React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginTop: 10 } },
            React.createElement("div", { style: { display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12, color: C.textSec } },
              React.createElement("span", null, `Dates: ${financeDate(campaign.starts_at)} to ${financeDate(campaign.ends_at)}`),
              React.createElement("span", null, `Type: ${campaign.category}`),
              React.createElement("span", null, `${pct}% funded`),
              React.createElement("span", null, `${campaign.donors} donors`)
            ),
            React.createElement("div", { style: { display: "flex", gap: 8 } },
              React.createElement(Btn, { variant: "secondary", size: "sm", icon: "edit", onClick: () => { setEditing(campaign); setShowModal(true); } }, "Edit"),
              React.createElement(Btn, { variant: "secondary", size: "sm", icon: "arrowR", onClick: () => onNavigate("donations") }, "View Donations")
            )
          )
        );
      })) : React.createElement(FinanceEmpty, { title: "No campaigns yet", body: "Create a campaign to populate fundraising_campaigns and power the financial reports." }),
    React.createElement(CampaignModal, { open: showModal, campaign: editing, onClose: () => setShowModal(false), onSaved: reload })
  );
}

function DonationsView({ onNavigate }) {
  const { loading, error, campaigns, donations, reload } = useFinanceData();
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);

  const normalized = donations.map(d => ({
    ...d,
    donor: d.is_anonymous ? "Anonymous" : (d.donor_name || d.full_name || d.email || "Anonymous"),
    amount: Number(d.amount_cents || 0),
    method: d.payment_provider || "manual",
    campaign: d.campaign_title || "General",
    date: financeDate(d.donated_at || d.created_at),
    recurring: Number(d.is_recurring || 0) === 1
  }));
  const methods = ["All", ...Array.from(new Set(normalized.map(d => d.method).filter(Boolean)))];
  const filtered = normalized.filter(d => {
    const q = search.toLowerCase();
    const matchMethod = methodFilter === "All" || d.method === methodFilter;
    const matchSearch = !q || [d.donor, d.id, d.campaign, d.donor_email].some(v => String(v || "").toLowerCase().includes(q));
    return matchMethod && matchSearch;
  });
  const received = normalized.filter(d => !d.status || ["received", "completed", "paid", "succeeded"].includes(financeStatus(d.status)));
  const total = received.reduce((s, d) => s + d.amount, 0);
  const avgAmount = received.length ? Math.round(total / received.length) : 0;
  const recurring = normalized.filter(d => d.recurring).length;
  const largest = received.length ? Math.max(...received.map(d => d.amount)) : 0;

  return React.createElement("div", { style: { padding: "28px 28px 40px", flex: 1, overflowY: "auto" } },
    React.createElement(PageHeader, { title: "Donations", subtitle: "Manual, imported, and future Stripe donation records", action: React.createElement("div", { style: { display: "flex", gap: 8 } }, React.createElement(Btn, { variant: "secondary", size: "sm", icon: "download" }, "Export"), React.createElement(Btn, { icon: "plus", size: "sm", onClick: () => setShowModal(true) }, "Record Donation")) }),
    React.createElement(FinanceNotice, null, "Stripe checkout is pending. This page is live for manual/offline tracking now and uses donations, donors, donation_payments, and fundraising_campaigns-compatible records."),
    error && React.createElement(FinanceNotice, null, error),
    React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 } },
      React.createElement(StatCard, { label: "Total Recorded", value: financeMoney(total), sub: `${received.length} received records`, subPositive: true }),
      React.createElement(StatCard, { label: "Avg Donation", value: financeMoney(avgAmount) }),
      React.createElement(StatCard, { label: "Recurring", value: recurring, sub: "active recurring donors", subPositive: true }),
      React.createElement(StatCard, { label: "Largest Gift", value: financeMoney(largest) })
    ),
    React.createElement("div", { style: { display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" } },
      React.createElement(Input, { value: search, onChange: setSearch, placeholder: "Search donors, campaigns, records...", icon: "search", style: { width: 320 } }),
      React.createElement(Select, { value: methodFilter, onChange: setMethodFilter, options: methods.map(m => ({ value: m, label: m })), style: { minWidth: 150 } })
    ),
    loading ? React.createElement(FinanceEmpty, { title: "Loading donations", body: "Reading donations from D1." }) :
      React.createElement(Card, { style: { overflow: "hidden" } },
        filtered.length ? React.createElement(Table, { cols: [
          { key: "id", label: "ID", render: v => React.createElement("span", { style: { color: C.textSec, fontFamily: "monospace", fontSize: 12 } }, v) },
          { key: "donor", label: "Donor", render: v => React.createElement("span", { style: { fontWeight: 600 } }, v) },
          { key: "amount", label: "Amount", render: v => React.createElement("span", { style: { fontWeight: 700, color: C.green } }, financeMoney(v)) },
          { key: "date", label: "Date", render: v => React.createElement("span", { style: { color: C.textSec, fontSize: 12 } }, v) },
          { key: "method", label: "Method", render: v => React.createElement(Badge, { label: v }) },
          { key: "campaign", label: "Campaign", render: v => React.createElement("span", { style: { color: C.textSec, fontSize: 12 } }, v || "General") },
          { key: "status", label: "Status", render: v => React.createElement(Badge, { label: v || "received", dot: true }) }
        ], rows: filtered }) : React.createElement(FinanceEmpty, { title: "No donation records yet", body: "Use Record Donation for checks, cash, external gifts, or imported donations while Stripe setup is pending." })
      ),
    React.createElement(DonationModal, { open: showModal, onClose: () => setShowModal(false), onSaved: reload, campaigns })
  );
}

Object.assign(window, { FundraisingView, DonationsView });
