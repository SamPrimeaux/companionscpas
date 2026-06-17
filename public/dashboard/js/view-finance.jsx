// Finance Views: unified GivingView (Fundraising + Donations)

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
  return value ? String(value).slice(0, 10) : null;
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
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [campaigns, setCampaigns] = React.useState([]);
  const [donations, setDonations] = React.useState([]);

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

  React.useEffect(() => { load(); }, []);
  return { loading, error, campaigns, donations, reload: load };
}

function CampaignModal({ open, onClose, onSaved, campaign }) {
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [goal, setGoal] = React.useState("");
  const [category, setCategory] = React.useState("medical");
  const [status, setStatus] = React.useState("active");
  const [startsAt, setStartsAt] = React.useState("");
  const [endsAt, setEndsAt] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setTitle(campaign?.title || "");
    setDescription(campaign?.description || campaign?.short_description || "");
    setGoal(campaign ? String(financeDollarsFromCents(campaign.goal_cents ?? campaign.goal_amount_cents)) : "");
    setCategory(campaign?.campaign_type || campaign?.category || "medical");
    setStatus(campaign?.status || "active");
    const sd = financeDate(campaign?.starts_at);
    const ed = financeDate(campaign?.ends_at);
    setStartsAt(sd || "");
    setEndsAt(ed || "");
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
      React.createElement("div", null,
        React.createElement("label", { style: { fontSize: 12, color: C.textSec, display: "block", marginBottom: 6 } }, "Campaign Title"),
        React.createElement(Input, { value: title, onChange: setTitle, placeholder: "Campaign name" })
      ),
      React.createElement("div", null,
        React.createElement("label", { style: { fontSize: 12, color: C.textSec, display: "block", marginBottom: 6 } }, "Description"),
        React.createElement("textarea", {
          value: description,
          onChange: e => setDescription(e.target.value),
          placeholder: "What will this campaign fund?",
          style: {
            width: "100%", background: C.raised, border: `1px solid ${C.border}`,
            borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 13,
            resize: "vertical", minHeight: 84, outline: "none", boxSizing: "border-box"
          }
        })
      ),
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } },
        React.createElement("div", null,
          React.createElement("label", { style: { fontSize: 12, color: C.textSec, display: "block", marginBottom: 6 } }, "Goal Amount"),
          React.createElement(Input, { value: goal, onChange: setGoal, placeholder: "$0.00" })
        ),
        React.createElement("div", null,
          React.createElement("label", { style: { fontSize: 12, color: C.textSec, display: "block", marginBottom: 6 } }, "Type"),
          React.createElement(Select, { value: category, onChange: setCategory, options: ["medical", "transport", "foster", "general", "fundraiser"].map(v => ({ value: v, label: v[0].toUpperCase() + v.slice(1) })) })
        )
      ),
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } },
        React.createElement("div", null,
          React.createElement("label", { style: { fontSize: 12, color: C.textSec, display: "block", marginBottom: 6 } }, "Start Date"),
          React.createElement(Input, { value: startsAt, onChange: setStartsAt, placeholder: "YYYY-MM-DD" })
        ),
        React.createElement("div", null,
          React.createElement("label", { style: { fontSize: 12, color: C.textSec, display: "block", marginBottom: 6 } }, "End Date"),
          React.createElement(Input, { value: endsAt, onChange: setEndsAt, placeholder: "YYYY-MM-DD" })
        )
      ),
      React.createElement("div", null,
        React.createElement("label", { style: { fontSize: 12, color: C.textSec, display: "block", marginBottom: 6 } }, "Status"),
        React.createElement(Select, { value: status, onChange: setStatus, options: ["active", "draft", "paused", "completed"].map(v => ({ value: v, label: v[0].toUpperCase() + v.slice(1) })) })
      ),
      React.createElement("div", { style: { display: "flex", gap: 10, justifyContent: "flex-end" } },
        React.createElement(Btn, { variant: "secondary", onClick: onClose }, "Cancel"),
        React.createElement(Btn, { onClick: save, disabled: saving || !title || !goal }, saving ? "Saving..." : "Save Campaign")
      )
    )
  );
}

function DonationModal({ open, onClose, onSaved, campaigns }) {
  const [donorName, setDonorName] = React.useState("");
  const [donorEmail, setDonorEmail] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [method, setMethod] = React.useState("manual");
  const [campaignId, setCampaignId] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [status, setStatus] = React.useState("received");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
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
        body: JSON.stringify({
          donor_name: donorName || "Anonymous",
          donor_email: donorEmail || null,
          amount_cents: financeCentsFromDollars(amount),
          payment_provider: method,
          campaign_id: campaignId || null,
          donor_message: message || null,
          status
        })
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
      React.createElement("div", null,
        React.createElement("label", { style: { fontSize: 12, color: C.textSec, display: "block", marginBottom: 6 } }, "Donor Name"),
        React.createElement(Input, { value: donorName, onChange: setDonorName, placeholder: "Full name or Anonymous" })
      ),
      React.createElement("div", null,
        React.createElement("label", { style: { fontSize: 12, color: C.textSec, display: "block", marginBottom: 6 } }, "Donor Email"),
        React.createElement(Input, { value: donorEmail, onChange: setDonorEmail, placeholder: "optional@email.com" })
      ),
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } },
        React.createElement("div", null,
          React.createElement("label", { style: { fontSize: 12, color: C.textSec, display: "block", marginBottom: 6 } }, "Amount"),
          React.createElement(Input, { value: amount, onChange: setAmount, placeholder: "$0.00" })
        ),
        React.createElement("div", null,
          React.createElement("label", { style: { fontSize: 12, color: C.textSec, display: "block", marginBottom: 6 } }, "Method"),
          React.createElement(Select, { value: method, onChange: setMethod, options: ["manual", "check", "cash", "external", "stripe", "card", "wire"].map(v => ({ value: v, label: v[0].toUpperCase() + v.slice(1) })) })
        )
      ),
      React.createElement("div", null,
        React.createElement("label", { style: { fontSize: 12, color: C.textSec, display: "block", marginBottom: 6 } }, "Campaign"),
        React.createElement(Select, { value: campaignId, onChange: setCampaignId, options: [{ value: "", label: "General / No Campaign" }, ...campaigns.map(c => ({ value: c.id, label: c.title }))] })
      ),
      React.createElement("div", null,
        React.createElement("label", { style: { fontSize: 12, color: C.textSec, display: "block", marginBottom: 6 } }, "Status"),
        React.createElement(Select, { value: status, onChange: setStatus, options: ["received", "pending", "pledged", "refunded"].map(v => ({ value: v, label: v[0].toUpperCase() + v.slice(1) })) })
      ),
      React.createElement("div", null,
        React.createElement("label", { style: { fontSize: 12, color: C.textSec, display: "block", marginBottom: 6 } }, "Note"),
        React.createElement(Input, { value: message, onChange: setMessage, placeholder: "Optional internal note" })
      ),
      React.createElement("div", { style: { display: "flex", gap: 10, justifyContent: "flex-end" } },
        React.createElement(Btn, { variant: "secondary", onClick: onClose }, "Cancel"),
        React.createElement(Btn, { onClick: save, disabled: saving || !amount }, saving ? "Saving..." : "Save Donation")
      )
    )
  );
}

// ── Unified GivingView (replaces both FundraisingView and DonationsView) ───────
function GivingView({ initialTab }) {
  const { loading, error, campaigns, donations, reload } = useFinanceData();
  const [tab, setTab] = React.useState(initialTab || "campaigns");
  const [showCampaignModal, setShowCampaignModal] = React.useState(false);
  const [showDonationModal, setShowDonationModal] = React.useState(false);
  const [editing, setEditing] = React.useState(null);
  const [search, setSearch] = React.useState("");
  const [methodFilter, setMethodFilter] = React.useState("All");

  // Cross-cutting metrics
  const stripeTotal = donations.filter(d => ["succeeded","completed","paid","received"].includes(financeStatus(d.status))).reduce((s, d) => s + Number(d.amount_cents || 0), 0);
  const campaignRaised = campaigns.reduce((s, c) => s + Number(c.raised_cents || 0), 0);
  const campaignGoal = campaigns.reduce((s, c) => s + Number(c.goal_cents || 0), 0);
  const totalDonors = campaigns.reduce((s, c) => s + Number(c.donors || 0), 0);
  const progress = campaignGoal ? Math.round((campaignRaised / campaignGoal) * 100) : 0;

  // Donations tab data
  const normalized = donations.map(d => ({
    ...d,
    donor: d.is_anonymous ? "Anonymous" : (d.donor_name || d.full_name || d.email || "Anonymous"),
    amount: Number(d.amount_cents || 0),
    method: d.payment_provider || "manual",
    campaign: d.campaign_title || "General",
    date: financeDate(d.donated_at || d.created_at) || "—",
    recurring: Number(d.is_recurring || 0) === 1
  }));
  const methods = ["All", ...Array.from(new Set(normalized.map(d => d.method).filter(Boolean)))];
  const filtered = normalized.filter(d => {
    const q = search.toLowerCase();
    const matchMethod = methodFilter === "All" || d.method === methodFilter;
    const matchSearch = !q || [d.donor, d.id, d.campaign, d.donor_email].some(v => String(v || "").toLowerCase().includes(q));
    return matchMethod && matchSearch;
  });

  const ACCENT_COLORS = [C.purple, C.green, C.blue, "#ef4444", "#f59e0b"];

  const tabStyle = active => ({
    padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer",
    fontSize: 13, fontWeight: active ? 600 : 400,
    background: active ? C.raised : "transparent",
    color: active ? C.text : C.textSec,
    transition: "background 120ms, color 120ms"
  });

  return React.createElement("div", { style: { padding: "28px 28px 40px", flex: 1, overflowY: "auto" } },

    // Header
    React.createElement(PageHeader, {
      title: "Giving",
      subtitle: "Campaigns, donations, and fundraising goals",
      action: React.createElement("div", { style: { display: "flex", gap: 8 } },
        React.createElement(Btn, { variant: "secondary", size: "sm", icon: "download" }, "Export"),
        React.createElement(Btn, { variant: "secondary", size: "sm", icon: "plus", onClick: () => { setEditing(null); setShowCampaignModal(true); } }, "New Campaign"),
        React.createElement(Btn, { icon: "plus", size: "sm", onClick: () => setShowDonationModal(true) }, "Record Donation")
      )
    }),

    error && React.createElement(FinanceNotice, null, error),

    // Cross-cutting stat row
    React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 } },
      React.createElement(StatCard, { label: "Total Raised", value: financeMoney(campaignRaised), sub: `of ${financeMoney(campaignGoal)} goal`, subPositive: true }),
      React.createElement(StatCard, { label: "Stripe Donations", value: financeMoney(stripeTotal), sub: `${donations.length} payments`, subPositive: true }),
      React.createElement(StatCard, { label: "Total Donors", value: totalDonors, sub: "across campaigns" }),
      React.createElement(StatCard, { label: "Goal Progress", value: `${progress}%`, sub: "of combined goal", subPositive: true })
    ),

    // Tab bar
    React.createElement("div", { style: { display: "flex", gap: 4, marginBottom: 20, background: C.surface, borderRadius: 10, padding: 4, width: "fit-content", border: `1px solid ${C.border}` } },
      React.createElement("button", { style: tabStyle(tab === "campaigns"), onClick: () => setTab("campaigns") }, "Campaigns"),
      React.createElement("button", { style: tabStyle(tab === "donations"), onClick: () => setTab("donations") }, `Donations${donations.length ? ` (${donations.length})` : ""}`)
    ),

    // ── Campaigns tab ──────────────────────────────────────────────────────
    tab === "campaigns" && (
      loading
        ? React.createElement(FinanceEmpty, { title: "Loading campaigns", body: "Reading fundraising_campaigns from D1." })
        : campaigns.length
          ? React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 14 } },
              campaigns.map((campaign, idx) => {
                const pct = campaign.goal_cents ? Math.min(100, Math.round((campaign.raised_cents / campaign.goal_cents) * 100)) : 0;
                const accent = ACCENT_COLORS[idx % ACCENT_COLORS.length];
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
                      React.createElement("span", null, `${pct}% funded`),
                      React.createElement("span", null, `${campaign.donors} donors`),
                      campaign.category && React.createElement("span", null, campaign.category)
                    ),
                    React.createElement("div", { style: { display: "flex", gap: 8 } },
                      React.createElement(Btn, { variant: "secondary", size: "sm", icon: "edit", onClick: () => { setEditing(campaign); setShowCampaignModal(true); } }, "Edit"),
                      React.createElement(Btn, { variant: "secondary", size: "sm", icon: "arrowR", onClick: () => setTab("donations") }, "Donations")
                    )
                  )
                );
              })
            )
          : React.createElement(FinanceEmpty, { title: "No campaigns yet", body: "Create a campaign to get started." })
    ),

    // ── Donations tab ──────────────────────────────────────────────────────
    tab === "donations" && React.createElement("div", null,
      React.createElement("div", { style: { display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" } },
        React.createElement(Input, { value: search, onChange: setSearch, placeholder: "Search donors, campaigns, records...", icon: "search", style: { width: 320 } }),
        React.createElement(Select, { value: methodFilter, onChange: setMethodFilter, options: methods.map(m => ({ value: m, label: m })), style: { minWidth: 150 } })
      ),
      loading
        ? React.createElement(FinanceEmpty, { title: "Loading donations", body: "Reading donations from D1." })
        : React.createElement(Card, { style: { overflow: "hidden" } },
            filtered.length
              ? React.createElement(Table, { cols: [
                  { key: "id", label: "ID", render: v => React.createElement("span", { style: { color: C.textSec, fontFamily: "monospace", fontSize: 12 } }, String(v).slice(0, 18) + "…") },
                  { key: "donor", label: "Donor", render: v => React.createElement("span", { style: { fontWeight: 600 } }, v) },
                  { key: "amount", label: "Amount", render: v => React.createElement("span", { style: { fontWeight: 700, color: C.green } }, financeMoney(v)) },
                  { key: "date", label: "Date", render: v => React.createElement("span", { style: { color: C.textSec, fontSize: 12 } }, v) },
                  { key: "method", label: "Method", render: v => React.createElement(Badge, { label: v }) },
                  { key: "campaign", label: "Campaign", render: v => React.createElement("span", { style: { color: C.textSec, fontSize: 12 } }, v || "General") },
                  { key: "status", label: "Status", render: v => React.createElement(Badge, { label: v || "received", dot: true }) }
                ], rows: filtered })
              : React.createElement(FinanceEmpty, { title: "No donation records yet", body: "Record manual donations or wait for Stripe webhooks to populate this table." })
          )
    ),

    // Modals
    React.createElement(CampaignModal, { open: showCampaignModal, campaign: editing, onClose: () => setShowCampaignModal(false), onSaved: reload }),
    React.createElement(DonationModal, { open: showDonationModal, onClose: () => setShowDonationModal(false), onSaved: reload, campaigns })
  );
}

// ── Legacy route aliases so app.jsx route map keeps working ───────────────────
function FundraisingView(props) {
  return React.createElement(GivingView, { ...props, initialTab: props.initialTab || "campaigns" });
}

function DonationsView(props) {
  return React.createElement(GivingView, { ...props, initialTab: "donations" });
}

Object.assign(window, { GivingView, FundraisingView, DonationsView });
