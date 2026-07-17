// Campaign workspace — minimal editor (title, description, attachments)

function mediaTypeFromUpload(d, file) {
  const mime = String(d?.mime_type || file?.type || "").toLowerCase();
  if (mime.startsWith("video/")) return "video";
  if (mime === "application/pdf") return "pdf";
  return "image";
}

function attachmentsFromCampaign(c, cfg) {
  const list = Array.isArray(cfg.attachments) ? cfg.attachments.slice() : [];
  const cover = c.cover_url || cfg.cover_url || "";
  if (!list.length && cover) {
    list.push({ url: cover, type: "image", name: "Cover" });
  }
  return list;
}

// ── Facebook Share Dialog (Option A — no API key needed) ──────────────────
function fbShareEntry(entry, campaignTitle) {
  const name = entry.dog_name || "this pup";
  const title = campaignTitle || "Wet Dog Competition";
  const text = `🐾 Vote for ${name} in the ${title}! Support local rescue dogs at Companions of CPAS — every vote helps a dog find a home. 🐕`;
  const url = entry.photo_url || "https://companionsofcaddo.org/donate";
  const shareUrl =
    "https://www.facebook.com/sharer/sharer.php?u=" +
    encodeURIComponent(url) +
    "&quote=" +
    encodeURIComponent(text);
  window.open(shareUrl, "fb-share", "width=620,height=460,resizable=yes,scrollbars=yes,noopener");
}

// ── Attachments uploader ───────────────────────────────────────────────────
function CampaignAttachments({ media, onChange, disabled }) {
  const [uploading, setUploading] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const [error, setError] = React.useState("");
  const dragDepth = React.useRef(0);
  const MAX = 10;
  const items = media || [];

  async function uploadFiles(fileList) {
    const files = Array.from(fileList || []).filter(f =>
      f.type.startsWith("image/") || f.type.startsWith("video/") || f.type === "application/pdf"
    );
    if (!files.length || disabled) return;
    if (items.length + files.length > MAX) {
      setError("Maximum " + MAX + " attachments.");
      return;
    }
    setUploading(true);
    setError("");
    let next = items.slice();
    for (const file of files) {
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("usage_context", "campaign_cover");
        fd.append("category", "campaign");
        fd.append("label", file.name);
        const res = await fetch("/api/cms/asset/upload", { method: "POST", credentials: "include", body: fd });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(d.error || "Upload failed");
        const url = d.public_url || d.cdn_url || d.pub_url || d.url;
        if (!url) throw new Error("Upload succeeded but no URL returned.");
        next.push({
          url,
          type: mediaTypeFromUpload(d, file),
          name: file.name,
          mime_type: d.mime_type || file.type,
        });
      } catch (e) {
        setError(e.message || "Upload failed");
        break;
      }
    }
    onChange(next);
    setUploading(false);
  }

  function removeAt(idx) {
    const copy = items.slice();
    copy.splice(idx, 1);
    onChange(copy);
  }

  function onDragEnter(e) { e.preventDefault(); dragDepth.current += 1; if (!disabled && !uploading) setDragging(true); }
  function onDragLeave(e) { e.preventDefault(); dragDepth.current -= 1; if (dragDepth.current <= 0) { dragDepth.current = 0; setDragging(false); } }
  function onDrop(e) { e.preventDefault(); dragDepth.current = 0; setDragging(false); if (!uploading && !disabled) uploadFiles(e.dataTransfer.files); }

  const addTile = items.length < MAX && React.createElement("label", {
    className: "camp-attach-add" + (uploading || disabled ? " is-disabled" : ""),
  },
    React.createElement("span", { className: "camp-attach-plus", "aria-hidden": "true" }, "+"),
    React.createElement("span", { className: "camp-attach-add-label" }, uploading ? "Uploading..." : "Drop files here"),
    React.createElement("span", { className: "camp-attach-add-sub" }, "Images · Videos · PDFs"),
    React.createElement("input", {
      type: "file", multiple: true,
      accept: "image/*,application/pdf,video/mp4,video/quicktime,video/webm",
      disabled: uploading || disabled,
      onChange: e => { uploadFiles(e.target.files); e.target.value = ""; },
    })
  );

  return React.createElement("div", { className: "camp-attach" },
    React.createElement("div", {
      className: "camp-attach-zone" + (dragging ? " is-dragging" : "") + (items.length ? " has-items" : " is-empty"),
      onDragEnter, onDragOver: e => e.preventDefault(), onDragLeave, onDrop,
    },
      dragging && React.createElement("div", { className: "camp-attach-drop-overlay" },
        React.createElement("span", { className: "camp-attach-plus camp-attach-plus--lg" }, "+"),
        React.createElement("span", null, "Drop to add")
      ),
      items.length
        ? React.createElement("div", { className: "camp-attach-grid" },
            items.map((item, idx) =>
              React.createElement("div", {
                key: item.url + idx,
                className: "camp-attach-tile" + (idx === 0 && item.type === "image" ? " is-cover" : ""),
              },
                idx === 0 && item.type === "image" ? React.createElement("span", { className: "camp-attach-badge" }, "Cover") : null,
                item.type === "image"
                  ? React.createElement("img", { src: item.url, alt: item.name || "Attachment" })
                  : React.createElement("div", { className: "camp-attach-file" },
                      React.createElement(Icon, { name: item.type === "video" ? "video" : "file", size: 24 }),
                      React.createElement("span", { className: "camp-attach-filename" }, item.name || item.type)
                    ),
                React.createElement("button", {
                  type: "button", className: "camp-attach-remove",
                  onClick: () => removeAt(idx), "aria-label": "Remove attachment",
                }, "×")
              )
            ),
            addTile
          )
        : addTile
    ),
    React.createElement("p", { className: "camp-attach-hint" },
      items.length
        ? "First image is the card thumbnail · " + items.length + " / " + MAX
        : "Drag and drop or click + to add up to " + MAX + " files"
    ),
    error && React.createElement("div", { className: "camp-attach-error" }, error)
  );
}

// ── Card preview sidebar ───────────────────────────────────────────────────
function CampaignLivePreview({ title, description, attachments }) {
  const cover = (attachments || []).find(a => a.type === "image");
  const excerpt = String(description || "").trim().slice(0, 160);
  return React.createElement("div", { className: "camp-preview" },
    React.createElement("p", { className: "camp-preview-label" }, "Card preview"),
    React.createElement("article", { className: "camp-preview-card" },
      React.createElement("div", { className: "camp-preview-media" },
        cover
          ? React.createElement("img", { src: cover.url, alt: title || "Preview" })
          : React.createElement("div", { className: "camp-preview-ph" }, "Add a photo")
      ),
      React.createElement("div", { className: "camp-preview-body" },
        React.createElement("h3", null, title || "Campaign title"),
        React.createElement("p", null, excerpt || "Description will appear here on the website card.")
      )
    )
  );
}

// ── Entry photo card ───────────────────────────────────────────────────────
function EntryCard({ entry, busy, votes, onVote, onAction, campaignTitle }) {
  const voteCount = votes[entry.id] || 0;
  const hasVoted = votes["__voted_" + entry.id] || false;
  const isPaid = entry.payment_status === "paid";
  const isApproved = Number(entry.is_approved) === 1;
  const isRejected = entry.moderation_status === "rejected";
  const isArchived = !!entry.archived_at;

  function money(cents) { return "$" + (Number(cents || 0) / 100).toFixed(2); }

  const statusColor = isApproved ? "#16a34a" : isRejected ? "#dc2626" : "#7c3aed";
  const statusLabel = isApproved ? "approved" : isRejected ? "rejected" : entry.moderation_status || "pending";

  return React.createElement("div", {
    style: {
      borderRadius: 14,
      border: "1px solid rgba(0,0,0,0.09)",
      background: "var(--dash-surface, #faf7f3)",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      boxShadow: "0 2px 8px rgba(26,22,34,0.05)",
      transition: "box-shadow 0.15s",
    },
  },
    // Photo
    React.createElement("div", {
      style: { position: "relative", aspectRatio: "4/3", background: "#e8e4de", overflow: "hidden" },
    },
      entry.photo_url
        ? React.createElement("img", {
            src: entry.photo_url,
            alt: entry.dog_name || "Entry",
            style: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
          })
        : React.createElement("div", {
            style: { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, color: "#999", flexDirection: "column", gap: 6 },
          },
            React.createElement("svg", { width: 32, height: 32, viewBox: "0 0 24 24", fill: "none", stroke: "#ccc", strokeWidth: 1.5 },
              React.createElement("rect", { x: 3, y: 3, width: 18, height: 18, rx: 3 }),
              React.createElement("circle", { cx: 8.5, cy: 8.5, r: 1.5 }),
              React.createElement("polyline", { points: "21,15 16,10 5,21" })
            ),
            "No photo"
          ),
      // Payment status badge
      isPaid && React.createElement("span", {
        style: {
          position: "absolute", top: 8, left: 8,
          background: isApproved ? "#16a34a" : "#7c3aed",
          color: "#fff", fontSize: 10, fontWeight: 700,
          padding: "3px 8px", borderRadius: 999, letterSpacing: "0.04em", textTransform: "uppercase",
        },
      }, isApproved ? "✓ Approved" : "Paid"),
      // Share button — top right
      React.createElement("button", {
        type: "button",
        title: "Share to Facebook",
        onClick: () => fbShareEntry(entry, campaignTitle),
        style: {
          position: "absolute", top: 8, right: 8,
          width: 32, height: 32, borderRadius: "50%",
          background: "rgba(24,119,242,0.92)", border: "none",
          color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
          transition: "transform 0.12s, background 0.12s",
        },
      },
        // Facebook f icon
        React.createElement("svg", { width: 14, height: 14, viewBox: "0 0 24 24", fill: "currentColor" },
          React.createElement("path", { d: "M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" })
        )
      )
    ),

    // Body
    React.createElement("div", { style: { padding: "12px 14px 0", flex: 1 } },
      React.createElement("div", { style: { fontWeight: 700, fontSize: 15, marginBottom: 2 } },
        entry.dog_name || "Untitled pet"
      ),
      React.createElement("div", { style: { fontSize: 11, opacity: 0.65, marginBottom: 6 } },
        (entry.owner_name || "") + (entry.owner_email ? " · " + entry.owner_email : "") +
        (entry.owner_phone ? " · " + entry.owner_phone : "")
      ),
      entry.caption && React.createElement("div", {
        style: { fontSize: 12, fontStyle: "italic", color: "var(--dash-text-sec)", marginBottom: 8,
          lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" },
      }, "\"" + entry.caption + "\""),

      // Status chips
      React.createElement("div", { style: { display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 } },
        React.createElement("span", {
          style: { fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 999,
            background: isPaid ? "#dcfce7" : "#fef3c7", color: isPaid ? "#15803d" : "#92400e",
            textTransform: "uppercase", letterSpacing: "0.04em" },
        }, entry.payment_status || "pending"),
        React.createElement("span", {
          style: { fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 999,
            background: isApproved ? "#dcfce7" : isRejected ? "#fee2e2" : "#ede9fe",
            color: statusColor, textTransform: "uppercase", letterSpacing: "0.04em" },
        }, statusLabel),
        entry.milestone_amount_cents != null && React.createElement("span", {
          style: { fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 999,
            background: "#f0fdf4", color: "#166534", textTransform: "uppercase", letterSpacing: "0.04em" },
        }, money(entry.milestone_amount_cents))
      )
    ),

    // Vote + Action footer
    React.createElement("div", {
      style: { padding: "10px 14px 14px", borderTop: "1px solid rgba(0,0,0,0.06)", marginTop: "auto",
        display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
    },
      // Internal vote button
      React.createElement("button", {
        type: "button",
        onClick: () => onVote(entry.id),
        title: hasVoted ? "You voted!" : "Cast internal vote",
        style: {
          display: "flex", alignItems: "center", gap: 5,
          padding: "6px 12px", borderRadius: 999,
          border: hasVoted ? "1.5px solid #7c3aed" : "1.5px solid rgba(0,0,0,0.12)",
          background: hasVoted ? "rgba(124,58,237,0.08)" : "transparent",
          color: hasVoted ? "#7c3aed" : "var(--dash-text-sec)",
          fontSize: 13, fontWeight: 700, cursor: "pointer",
          transition: "all 0.15s", fontFamily: "var(--font-ui)",
        },
      },
        React.createElement("span", null, hasVoted ? "🐾" : "🩶"),
        React.createElement("span", null, voteCount)
      ),

      // Spacer
      React.createElement("div", { style: { flex: 1 } }),

      // Approve / Reject (only for paid+unreviewed)
      isPaid && !isApproved && !isRejected && React.createElement(Btn, {
        size: "sm",
        disabled: busy,
        onClick: () => onAction(entry.id, "approve"),
      }, "Approve"),
      isPaid && !isRejected && React.createElement(Btn, {
        size: "sm", variant: "secondary",
        disabled: busy,
        onClick: () => onAction(entry.id, "reject", { reason: "Needs a clearer photo or details." }),
        style: { display: isApproved ? "block" : undefined },
      }, "Reject"),
      !isArchived && React.createElement(Btn, {
        size: "sm", variant: "secondary",
        disabled: busy,
        onClick: () => onAction(entry.id, "archive"),
      }, "Archive"),
    )
  );
}

// ── Main campaign workspace ────────────────────────────────────────────────
function CampaignWorkspaceView({ campaignId, onNavigate }) {
  const isNew = !campaignId || campaignId === "new";
  const [loading, setLoading] = React.useState(!isNew);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [saveMsg, setSaveMsg] = React.useState("");
  const [entries, setEntries] = React.useState([]);
  const [entryBusy, setEntryBusy] = React.useState("");
  // votes: { [entryId]: count, __voted_[entryId]: bool }
  const [votes, setVotes] = React.useState({});
  const [entryFilter, setEntryFilter] = React.useState("all");
  const [form, setForm] = React.useState({
    id: "", title: "", description: "",
    is_public: 0, status: "draft",
    attachments: [],
    config: { show_on_donate: false, show_on_services: false },
  });

  function setField(k, v) { setForm(prev => Object.assign({}, prev, { [k]: v })); }
  function setSurface(k, v) { setForm(prev => Object.assign({}, prev, { config: Object.assign({}, prev.config, { [k]: v }) })); }
  function money(cents) { return "$" + (Number(cents || 0) / 100).toFixed(2); }

  async function loadCampaign() {
    if (isNew) return;
    setLoading(true);
    try {
      const r = await fetch("/api/dashboard/fundraising/" + encodeURIComponent(campaignId), { credentials: "include" });
      const d = await r.json();
      if (!d.ok && !d.campaign) throw new Error(d.error || "Campaign not found");
      const c = d.campaign;
      const cfg = c.config || {};
      setForm({
        id: c.id,
        title: c.title || "",
        description: c.description || c.short_description || "",
        is_public: Number(c.is_public) === 1 ? 1 : 0,
        status: c.status || "draft",
        attachments: attachmentsFromCampaign(c, cfg),
        config: Object.assign({ show_on_donate: false, show_on_services: false }, cfg),
      });
      const rawEntries = Array.isArray(d.entries) ? d.entries : [];
      setEntries(rawEntries);
      // Seed vote counts from existing data (votes field if available)
      setVotes(prev => {
        const next = Object.assign({}, prev);
        rawEntries.forEach(e => {
          if (next[e.id] == null) next[e.id] = Number(e.internal_votes || 0);
        });
        return next;
      });
    } catch (e) {
      setError(e.message || "Failed to load campaign");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(function() { loadCampaign(); }, [campaignId, isNew]);

  async function entryAction(entryId, action, body) {
    setEntryBusy(entryId + ":" + action);
    setError("");
    try {
      const res = await fetch(
        "/api/dashboard/fundraising/" + encodeURIComponent(campaignId) +
        "/entries/" + encodeURIComponent(entryId) + "/" + action,
        { method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body || {}) }
      );
      const d = await res.json().catch(() => ({}));
      if (!res.ok || d.ok === false) throw new Error(d.error || "Action failed");
      await loadCampaign();
    } catch (e) {
      setError(e.message || "Entry action failed");
    } finally {
      setEntryBusy("");
    }
  }

  function handleVote(entryId) {
    setVotes(prev => {
      const alreadyVoted = prev["__voted_" + entryId];
      const current = prev[entryId] || 0;
      return Object.assign({}, prev, {
        [entryId]: alreadyVoted ? Math.max(0, current - 1) : current + 1,
        ["__voted_" + entryId]: !alreadyVoted,
      });
    });
    // Fire-and-forget API call — wire up the endpoint later today
    fetch(
      "/api/dashboard/fundraising/" + encodeURIComponent(campaignId) +
      "/entries/" + encodeURIComponent(entryId) + "/vote",
      { method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" } }
    ).catch(() => {}); // silent — UI is already updated optimistically
  }

  async function save() {
    if (!form.title.trim()) { setError("Title is required."); return; }
    setSaving(true); setError(""); setSaveMsg("");
    try {
      const isPublic = form.is_public === 1;
      const firstImage = (form.attachments || []).find(a => a.type === "image");
      const coverUrl = firstImage?.url || null;
      const configJson = Object.assign({}, form.config, {
        attachments: form.attachments || [], cover_url: coverUrl,
      });
      if (isPublic && configJson.show_on_donate && !configJson.donate_placement)
        configJson.donate_placement = "story_card";
      if (!isPublic || !configJson.show_on_donate)
        configJson.donate_placement = configJson.show_on_donate ? configJson.donate_placement : "";
      const payload = {
        id: form.id || undefined,
        title: form.title.trim(),
        description: form.description.trim(),
        short_description: form.description.trim().slice(0, 240),
        is_public: isPublic ? 1 : 0,
        status: isPublic ? "active" : "draft",
        goal_amount_cents: 0,
        campaign_type: "fundraiser",
        config_json: configJson,
      };
      const res = await fetch("/api/dashboard/fundraising", {
        method: isNew || !form.id ? "POST" : "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || d.ok === false) throw new Error(d.error || "Save failed");
      setSaveMsg(isPublic ? "Published — visible on site after cache refresh." : "Saved as draft.");
      if (isNew && d.id && onNavigate) { onNavigate("campaign-detail", { campaignId: d.id }); return; }
      if (d.id) setField("id", d.id);
    } catch (e) {
      setError(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const field = (label, child, opts) => React.createElement("div", { className: "camp-field" + (opts?.large ? " camp-field--large" : "") },
    React.createElement("label", { className: "camp-label" }, label),
    child
  );

  // ── Entry counts ────────────────────────────────────────────────────────
  const entryCounts = entries.reduce(function(acc, e) {
    if (e.archived_at) acc.archived += 1;
    else if (e.payment_status === "paid") acc.paid += 1;
    else if (e.payment_status === "failed" || e.payment_status === "abandoned") acc.failed += 1;
    else acc.pending += 1;
    if (e.payment_status === "paid" && Number(e.is_approved) !== 1 && e.moderation_status !== "rejected") acc.unreviewed += 1;
    return acc;
  }, { pending: 0, paid: 0, failed: 0, archived: 0, unreviewed: 0 });

  // ── Filter entries ──────────────────────────────────────────────────────
  const filteredEntries = entries.filter(e => {
    if (entryFilter === "approved") return e.payment_status === "paid" && Number(e.is_approved) === 1;
    if (entryFilter === "review") return e.payment_status === "paid" && Number(e.is_approved) !== 1 && e.moderation_status !== "rejected";
    if (entryFilter === "pending") return e.payment_status !== "paid" && !e.archived_at;
    if (entryFilter === "archived") return !!e.archived_at;
    return !e.archived_at; // "all" hides archived by default
  });

  const totalVotes = Object.keys(votes).filter(k => !k.startsWith("__")).reduce((s, k) => s + (votes[k] || 0), 0);

  // ── Filter tab button ───────────────────────────────────────────────────
  const filterTab = (label, key, count) => React.createElement("button", {
    type: "button",
    onClick: () => setEntryFilter(key),
    style: {
      padding: "6px 12px", borderRadius: 999, border: "none", cursor: "pointer",
      fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 700,
      background: entryFilter === key ? "var(--brand-primary)" : "var(--dash-bg2)",
      color: entryFilter === key ? "#fff" : "var(--dash-text-sec)",
      transition: "all 0.12s",
    },
  }, label + (count > 0 ? " (" + count + ")" : ""));

  // ── Entries panel ───────────────────────────────────────────────────────
  const entriesPanel = !isNew && React.createElement(Card, { className: "camp-form-card", style: { marginTop: 16 } },
    // Header
    React.createElement("div", { style: { display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 } },
      React.createElement("div", null,
        React.createElement("h3", { style: { margin: 0, fontSize: 16 } }, "Competition entries"),
        React.createElement("p", { style: { margin: "4px 0 0", fontSize: 12, opacity: 0.7 } },
          entryCounts.paid + " paid · " + entryCounts.unreviewed + " awaiting review · " + entryCounts.pending + " pending payment" +
          (totalVotes > 0 ? " · " + totalVotes + " internal votes" : "")
        )
      ),
      React.createElement(Btn, { variant: "secondary", size: "sm", onClick: loadCampaign, disabled: !!entryBusy }, "Refresh")
    ),

    // Filter tabs
    entries.length > 0 && React.createElement("div", { style: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 } },
      filterTab("All", "all", entries.filter(e => !e.archived_at).length),
      filterTab("✓ Approved", "approved", entries.filter(e => e.payment_status === "paid" && Number(e.is_approved) === 1).length),
      filterTab("⏳ Review", "review", entryCounts.unreviewed),
      filterTab("Pending", "pending", entryCounts.pending),
      filterTab("Archived", "archived", entryCounts.archived),
    ),

    // Photo card grid
    entries.length === 0
      ? React.createElement("p", { style: { margin: 0, fontSize: 13, opacity: 0.7 } },
          "No entries yet. Paid submissions appear here with photo + campaign total.")
      : filteredEntries.length === 0
        ? React.createElement("p", { style: { margin: 0, fontSize: 13, opacity: 0.7 } }, "No entries in this category.")
        : React.createElement("div", {
            style: {
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 16,
            },
          },
            filteredEntries.map(entry =>
              React.createElement(EntryCard, {
                key: entry.id,
                entry,
                busy: entryBusy.indexOf(entry.id) === 0,
                votes,
                onVote: handleVote,
                onAction: entryAction,
                campaignTitle: form.title,
              })
            )
          )
  );

  // ── Publish sidebar ─────────────────────────────────────────────────────
  const publishPanel = React.createElement("aside", { className: "camp-sidebar" },
    React.createElement(Card, { className: "camp-publish-card" },
      React.createElement(CampaignLivePreview, {
        title: form.title, description: form.description, attachments: form.attachments,
      }),
      React.createElement("h4", { className: "camp-sidebar-title" }, "Publish"),
      field("Visibility", React.createElement(Select, {
        value: String(form.is_public),
        onChange: v => setField("is_public", Number(v)),
        options: [
          { value: "0", label: "Draft — hidden" },
          { value: "1", label: "Live on website" },
        ],
      })),
      form.is_public === 1 && React.createElement("div", { className: "camp-surfaces" },
        React.createElement("p", { className: "camp-surfaces-label" }, "Show on"),
        React.createElement("label", { className: "camp-check" },
          React.createElement("input", {
            type: "checkbox", checked: !!form.config.show_on_donate,
            onChange: e => setSurface("show_on_donate", e.target.checked),
          }),
          " Donate page"
        ),
        React.createElement("label", { className: "camp-check" },
          React.createElement("input", {
            type: "checkbox", checked: !!form.config.show_on_services,
            onChange: e => setSurface("show_on_services", e.target.checked),
          }),
          " Foster / Services page"
        )
      ),
      React.createElement("div", { className: "camp-publish-actions" },
        React.createElement(Btn, {
          onClick: save, disabled: saving || !form.title.trim(), style: { width: "100%" },
        }, saving ? "Saving..." : (form.is_public ? "Save & publish" : "Save draft")),
        form.is_public === 1 && React.createElement(Btn, {
          variant: "secondary", size: "sm", icon: "arrowR",
          onClick: () => window.open("https://companionsofcaddo.org/donate", "_blank", "noopener"),
          style: { width: "100%" },
        }, "Preview website")
      )
    )
  );

  if (loading) {
    return React.createElement("div", { className: "dash-page" },
      React.createElement(FinanceEmpty, { title: "Loading campaign", body: "One moment..." })
    );
  }

  return React.createElement("div", { className: "dash-page camp-workspace camp-workspace--simple" },
    React.createElement("div", { className: "camp-topbar" },
      React.createElement("div", null,
        React.createElement("button", {
          type: "button", className: "camp-back",
          onClick: () => onNavigate && onNavigate("fundraising"),
        }, "← Giving"),
        React.createElement("h1", { className: "camp-title" }, isNew ? "New Campaign" : (form.title || "Campaign")),
        !isNew && React.createElement(Badge, { label: form.status, dot: true }),
        saveMsg && React.createElement("div", { className: "camp-save-msg" }, saveMsg)
      ),
      React.createElement("div", { className: "camp-top-actions" },
        React.createElement(Btn, {
          onClick: save, disabled: saving || !form.title.trim(),
        }, saving ? "Saving..." : (form.is_public ? "Save & publish" : "Save draft"))
      )
    ),

    error && React.createElement(FinanceNotice, null, error),

    React.createElement("div", { className: "camp-layout camp-layout--simple" },
      React.createElement("div", { className: "camp-main camp-main--simple" },
        React.createElement(Card, { className: "camp-form-card" },
          field("Title", React.createElement("input", {
            type: "text", className: "camp-title-input",
            value: form.title, onChange: e => setField("title", e.target.value),
            placeholder: "Summer Rescue Fundraiser",
          }), { large: true }),
          field("Description", React.createElement("textarea", {
            value: form.description, onChange: e => setField("description", e.target.value),
            className: "camp-textarea camp-textarea--lg", rows: 8,
            placeholder: "Tell people why this campaign matters...",
          })),
          field("Attachments", React.createElement(CampaignAttachments, {
            media: form.attachments,
            onChange: v => setField("attachments", v),
            disabled: saving,
          }))
        ),
        entriesPanel
      ),
      publishPanel
    )
  );
}

Object.assign(window, { CampaignWorkspaceView });
