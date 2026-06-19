// Campaign workspace — full-page editor with live /donate sync

const DONATE_PLACEMENTS = [
  { value: "", label: "Not on donate page" },
  { value: "freedom_hero", label: "Donate — Freedom Fest hero" },
  { value: "medical_featured", label: "Donate — Featured medical story" },
  { value: "story_sponsored", label: "Donate — Sponsored story card" },
  { value: "story_card", label: "Donate — Campaign story card" },
];

function campaignPreviewUrl(campaign, config) {
  const placement = config?.donate_placement || "";
  if (placement === "freedom_hero") return "https://companionsofcaddo.org/donate#donate-freedom-hero";
  if (placement === "medical_featured") return "https://companionsofcaddo.org/donate#donate-medical-story";
  if (placement === "story_sponsored" || placement === "story_card") return "https://companionsofcaddo.org/donate#donate-stories-help";
  return "https://companionsofcaddo.org/donate";
}

function CampaignCoverField({ value, onChange, title }) {
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState("");

  async function upload(file) {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("usage_context", "campaign_cover");
      fd.append("category", "campaign");
      fd.append("label", title || file.name);
      const res = await fetch("/api/cms/asset/upload", { method: "POST", credentials: "include", body: fd });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Upload failed");
      onChange(d.public_url || d.cdn_url || d.pub_url || "");
    } catch (e) {
      setError(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return React.createElement("div", { className: "camp-cover-field" },
    React.createElement("div", { className: "camp-cover-preview" },
      value
        ? React.createElement("img", { src: value, alt: "Cover" })
        : React.createElement("div", { className: "camp-cover-empty" }, "No cover image")
    ),
    React.createElement("div", { className: "camp-cover-actions" },
      React.createElement("label", { className: "camp-upload-btn" },
        uploading ? "Uploading..." : "Upload cover",
        React.createElement("input", {
          type: "file", accept: "image/*", disabled: uploading, style: { display: "none" },
          onChange: e => { if (e.target.files?.[0]) upload(e.target.files[0]); e.target.value = ""; }
        })
      ),
      value && React.createElement(Btn, { variant: "secondary", size: "sm", onClick: () => onChange("") }, "Remove")
    ),
    React.createElement(Input, { value: value || "", onChange: onChange, placeholder: "https://assets.companionsofcaddo.org/..." }),
    error && React.createElement("div", { style: { color: C.red, fontSize: 12, marginTop: 6 } }, error)
  );
}

function CampaignWorkspaceView({ campaignId, onNavigate }) {
  const isNew = !campaignId || campaignId === "new";
  const [loading, setLoading] = React.useState(!isNew);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [saveMsg, setSaveMsg] = React.useState("");
  const [tab, setTab] = React.useState("content");
  const [donations, setDonations] = React.useState([]);
  const [form, setForm] = React.useState({
    id: "", title: "", slug: "", description: "", short_description: "",
    goal_amount_cents: 0, status: "draft", campaign_type: "medical",
    starts_at: "", ends_at: "", is_public: 0, cover_url: "",
    config: {
      donate_placement: "", public_eyebrow: "", public_heading: "", public_subheading: "",
      card_eyebrow: "", card_title: "", facebook_reel_url: "", share_url: "",
      donate_cta_primary: "Donate", donate_cta_sidebar: "Help Now",
      cta_label: "Sponsor a Ticket", ticket_amount_cents: 17500,
      footer_tagline: "", footer_note: "", story_thanks: "",
      supports: ["Surgery", "Medication", "Follow-up care", "Recovery expenses"],
    },
    raised_cents: 0, donors: 0,
  });

  const previewUrl = campaignPreviewUrl(form, form.config);

  function setField(k, v) {
    setForm(prev => Object.assign({}, prev, { [k]: v }));
  }
  function setConfig(k, v) {
    setForm(prev => Object.assign({}, prev, { config: Object.assign({}, prev.config, { [k]: v }) }));
  }

  React.useEffect(function() {
    if (isNew) return;
    setLoading(true);
    fetch("/api/dashboard/fundraising/" + encodeURIComponent(campaignId), { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        if (!d.ok && !d.campaign) throw new Error(d.error || "Campaign not found");
        const c = d.campaign;
        const cfg = c.config || {};
        setForm({
          id: c.id, title: c.title || "", slug: c.slug || "", description: c.description || "",
          short_description: c.short_description || "", goal_amount_cents: Number(c.goal_cents || c.goal_amount_cents || 0),
          status: c.status || "draft", campaign_type: c.campaign_type || c.category || "medical",
          starts_at: financeDate(c.starts_at) || "", ends_at: financeDate(c.ends_at) || "",
          is_public: Number(c.is_public) === 1 ? 1 : 0,
          cover_url: c.cover_url || cfg.cover_url || "",
          config: Object.assign({
            donate_placement: "", public_eyebrow: "", public_heading: "", public_subheading: "",
            card_eyebrow: "", card_title: "", facebook_reel_url: "", share_url: "",
            donate_cta_primary: "Donate", donate_cta_sidebar: "Help Now",
            cta_label: "Sponsor a Ticket", ticket_amount_cents: 17500,
            footer_tagline: "", footer_note: "", story_thanks: "",
            supports: [],
          }, cfg),
          raised_cents: Number(c.raised_cents || 0),
          donors: Number(c.donors || c.donor_count || 0),
        });
        setDonations(d.donations || []);
      })
      .catch(e => setError(e.message || "Failed to load campaign"))
      .finally(() => setLoading(false));
  }, [campaignId, isNew]);

  async function save() {
    setSaving(true);
    setError("");
    setSaveMsg("");
    try {
      const payload = {
        id: form.id || undefined,
        title: form.title,
        slug: form.slug,
        description: form.description,
        short_description: form.short_description,
        goal_amount_cents: form.goal_amount_cents,
        status: form.status,
        campaign_type: form.campaign_type,
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
        is_public: form.is_public,
        config_json: Object.assign({}, form.config, { cover_url: form.cover_url || null }),
      };
      const res = await fetch("/api/dashboard/fundraising", {
        method: isNew || !form.id ? "POST" : "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || d.ok === false) throw new Error(d.error || "Save failed");
      setSaveMsg("Saved — live on website after cache refresh (~instant)");
      if (isNew && d.id && onNavigate) {
        onNavigate("campaign-detail", { campaignId: d.id });
      }
    } catch (e) {
      setError(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const pct = form.goal_amount_cents
    ? Math.min(100, Math.round((form.raised_cents / form.goal_amount_cents) * 100)) : 0;
  const previewUrl = campaignPreviewUrl(form, form.config);

  const tabBtn = (key, label) => React.createElement("button", {
    type: "button",
    className: "camp-tab" + (tab === key ? " is-active" : ""),
    onClick: () => setTab(key),
  }, label);

  const field = (label, child) => React.createElement("div", { className: "camp-field" },
    React.createElement("label", { className: "camp-label" }, label),
    child
  );

  const contentTab = React.createElement("div", { className: "camp-tab-panel" },
    field("Campaign title", React.createElement(Input, { value: form.title, onChange: v => setField("title", v) })),
    field("Short description (cards & previews)", React.createElement(Input, { value: form.short_description, onChange: v => setField("short_description", v) })),
    field("Full story (public page body)", React.createElement("textarea", {
      value: form.description,
      onChange: e => setField("description", e.target.value),
      className: "camp-textarea",
      rows: 8,
      placeholder: "Tell donors why this campaign matters...",
    })),
    field("Public eyebrow / kicker", React.createElement(Input, { value: form.config.public_eyebrow, onChange: v => setConfig("public_eyebrow", v) })),
    field("Public headline", React.createElement(Input, { value: form.config.public_heading, onChange: v => setConfig("public_heading", v) })),
    field("Public subheading", React.createElement(Input, { value: form.config.public_subheading, onChange: v => setConfig("public_subheading", v) })),
    field("Sidebar card eyebrow", React.createElement(Input, { value: form.config.card_eyebrow, onChange: v => setConfig("card_eyebrow", v) })),
    field("Sidebar card title", React.createElement(Input, { value: form.config.card_title, onChange: v => setConfig("card_title", v) })),
    field("What donations support (one per line)", React.createElement("textarea", {
      value: (form.config.supports || []).join("\n"),
      onChange: e => setConfig("supports", e.target.value.split("\n").map(s => s.trim()).filter(Boolean)),
      className: "camp-textarea", rows: 5,
    })),
    field("Primary donate button label", React.createElement(Input, { value: form.config.donate_cta_primary, onChange: v => setConfig("donate_cta_primary", v) })),
    field("Sidebar donate button label", React.createElement(Input, { value: form.config.donate_cta_sidebar, onChange: v => setConfig("donate_cta_sidebar", v) })),
  );

  const detailsTab = React.createElement("div", { className: "camp-tab-panel" },
    field("Goal ($)", React.createElement(Input, {
      value: String(financeDollarsFromCents(form.goal_amount_cents) || ""),
      onChange: v => setField("goal_amount_cents", financeCentsFromDollars(v)),
    })),
    field("Campaign type", React.createElement(Select, {
      value: form.campaign_type,
      onChange: v => setField("campaign_type", v),
      options: ["medical", "transport", "foster", "general", "fundraiser"].map(v => ({ value: v, label: v[0].toUpperCase() + v.slice(1) })),
    })),
    field("Donate page placement", React.createElement(Select, {
      value: form.config.donate_placement || "",
      onChange: v => setConfig("donate_placement", v),
      options: DONATE_PLACEMENTS,
    })),
    field("URL slug", React.createElement(Input, { value: form.slug, onChange: v => setField("slug", v), placeholder: "auto-from-title" })),
    React.createElement("div", { className: "camp-grid-2" },
      field("Start date", React.createElement(Input, { type: "date", value: form.starts_at, onChange: v => setField("starts_at", v) })),
      field("End date", React.createElement(Input, { type: "date", value: form.ends_at, onChange: v => setField("ends_at", v) })),
    ),
    field("Status", React.createElement(Select, {
      value: form.status,
      onChange: v => setField("status", v),
      options: ["draft", "active", "paused", "completed"].map(v => ({ value: v, label: v[0].toUpperCase() + v.slice(1) })),
    })),
    field("Ticket amount ($) — Freedom Fest / sponsored stories", React.createElement(Input, {
      value: String((form.config.ticket_amount_cents || 0) / 100 || ""),
      onChange: v => setConfig("ticket_amount_cents", financeCentsFromDollars(v)),
    })),
    field("Sponsor CTA label", React.createElement(Input, { value: form.config.cta_label, onChange: v => setConfig("cta_label", v) })),
  );

  const mediaTab = React.createElement("div", { className: "camp-tab-panel" },
    field("Cover image / thumbnail", React.createElement(CampaignCoverField, {
      value: form.cover_url, onChange: v => setField("cover_url", v), title: form.title,
    })),
    field("Facebook reel URL (embed)", React.createElement(Input, {
      value: form.config.facebook_reel_url || "",
      onChange: v => setConfig("facebook_reel_url", v),
      placeholder: "https://www.facebook.com/reel/...",
    })),
    field("Share link", React.createElement(Input, {
      value: form.config.share_url || "",
      onChange: v => setConfig("share_url", v),
      placeholder: "https://companionsofcaddo.org/donate#...",
    })),
    field("Story thanks line (sponsored cards)", React.createElement(Input, {
      value: form.config.story_thanks || "",
      onChange: v => setConfig("story_thanks", v),
    })),
  );

  const donationsTab = React.createElement("div", { className: "camp-tab-panel" },
    donations.length
      ? React.createElement(Table, {
        cols: [
          { key: "donor_name", label: "Donor", render: (v, row) => row.is_anonymous ? "Anonymous" : (v || "—") },
          { key: "amount_cents", label: "Amount", render: v => financeMoney(v) },
          { key: "status", label: "Status", render: v => React.createElement(Badge, { label: v || "received", dot: true }) },
          { key: "donated_at", label: "Date", render: (v, row) => financeDate(v || row.created_at) || "—" },
        ],
        rows: donations,
      })
      : React.createElement(FinanceEmpty, { title: "No donations yet", body: "Stripe and manual donations tagged to this campaign will appear here." })
  );

  const sidebar = React.createElement("aside", { className: "camp-sidebar" },
    React.createElement(Card, { style: { padding: 18 } },
      React.createElement("h4", { className: "camp-sidebar-title" }, "Publishing"),
      field("Visibility", React.createElement(Select, {
        value: String(form.is_public),
        onChange: v => setField("is_public", Number(v)),
        options: [{ value: "1", label: "Public on website" }, { value: "0", label: "Hidden" }],
      })),
      React.createElement("div", { style: { marginTop: 14 } },
        React.createElement("div", { className: "camp-stat-row" },
          React.createElement("span", null, "Raised"), React.createElement("strong", null, financeMoney(form.raised_cents))),
        React.createElement("div", { className: "camp-stat-row" },
          React.createElement("span", null, "Goal"), React.createElement("strong", null, financeMoney(form.goal_amount_cents))),
        React.createElement("div", { className: "camp-stat-row" },
          React.createElement("span", null, "Donors"), React.createElement("strong", null, form.donors)),
        React.createElement(ProgressBar, {
          value: form.raised_cents, max: Math.max(form.goal_amount_cents, 1), color: C.purple, height: 8,
          style: { marginTop: 10 },
        }),
        React.createElement("div", { style: { fontSize: 12, color: C.textSec, marginTop: 6 } }, pct + "% funded")
      ),
      React.createElement("div", { style: { marginTop: 16, display: "flex", flexDirection: "column", gap: 8 } },
        React.createElement(Btn, {
          variant: "secondary", size: "sm", icon: "arrowR",
          onClick: () => window.open(previewUrl, "_blank", "noopener"),
        }, "Preview on website"),
        form.config.donate_placement
          ? React.createElement("div", { style: { fontSize: 11, color: C.textMut } }, "Placement: " + form.config.donate_placement)
          : null
      )
    )
  );

  if (loading) {
    return React.createElement("div", { className: "dash-page" },
      React.createElement(FinanceEmpty, { title: "Loading campaign", body: "Fetching campaign workspace..." })
    );
  }

  return React.createElement("div", { className: "dash-page camp-workspace" },
    React.createElement("div", { className: "camp-topbar" },
      React.createElement("div", null,
        React.createElement("button", {
          type: "button", className: "camp-back", onClick: () => onNavigate && onNavigate("fundraising"),
        }, "← Giving"),
        React.createElement("h1", { className: "camp-title" }, isNew ? "New Campaign" : (form.title || "Campaign")),
        React.createElement("div", { className: "camp-meta" },
          React.createElement(Badge, { label: form.status, dot: true }),
          saveMsg && React.createElement("span", { style: { color: C.green, fontSize: 12, fontWeight: 700 } }, saveMsg)
        )
      ),
      React.createElement("div", { className: "camp-top-actions" },
        React.createElement(Btn, { variant: "secondary", size: "sm", onClick: () => window.open(previewUrl, "_blank") }, "Preview"),
        React.createElement(Btn, { onClick: save, disabled: saving || !form.title }, saving ? "Saving..." : "Save & publish")
      )
    ),

    error && React.createElement(FinanceNotice, null, error),

    React.createElement("div", { className: "camp-tabs" },
      tabBtn("content", "Content"),
      tabBtn("details", "Details"),
      tabBtn("media", "Media"),
      tabBtn("donations", "Donations" + (donations.length ? " (" + donations.length + ")" : "")),
    ),

    React.createElement("div", { className: "camp-layout" },
      React.createElement("div", { className: "camp-main" },
        tab === "content" && contentTab,
        tab === "details" && detailsTab,
        tab === "media" && mediaTab,
        tab === "donations" && donationsTab,
      ),
      sidebar
    )
  );
}

Object.assign(window, { CampaignWorkspaceView });
