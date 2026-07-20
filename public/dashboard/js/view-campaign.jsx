// Campaign workspace — editor + competition entry gallery

function mediaTypeFromUpload(d, file) {
  const mime = String(d?.mime_type || file?.type || "").toLowerCase();
  if (mime.startsWith("video/")) return "video";
  if (mime === "application/pdf") return "pdf";
  return "image";
}

function attachmentsFromCampaign(c, cfg) {
  const list = Array.isArray(cfg.attachments) ? cfg.attachments.slice() : [];
  const cover = c.cover_url || cfg.cover_url || "";
  if (!list.length && cover) list.push({ url: cover, type: "image", name: "Cover" });
  return list;
}

// ── Facebook Share Dialog ─────────────────────────────────────────────────
function fbShareEntry(entry, campaignTitle) {
  const name = entry.dog_name || "this pup";
  const title = campaignTitle || "Wet Dog Competition";
  const url = entry?.id
    ? ("https://companionsofcaddo.org/wet-dog/" + encodeURIComponent(entry.id))
    : "https://companionsofcaddo.org/donate#wdg-donate_wetdog";
  const caption = "Vote for " + name + " in the " + title + "! " + url;
  const shareUrl = "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(url) + "&quote=" + encodeURIComponent(caption);
  window.open(shareUrl, "fb-share", "width=620,height=460,resizable=yes,scrollbars=yes,noopener");
}

// ── SVG icons ─────────────────────────────────────────────────────────────
const HeartIcon = ({ filled, size = 14 }) =>
  React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24",
    fill: filled ? "currentColor" : "none", stroke: "currentColor", strokeWidth: 2,
    style: { flexShrink: 0 } },
    React.createElement("path", { d: "M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" })
  );

const FbIcon = ({ size = 13 }) =>
  React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "currentColor" },
    React.createElement("path", { d: "M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" })
  );

const GridIcon = () =>
  React.createElement("svg", { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2 },
    React.createElement("rect", { x: 3, y: 3, width: 7, height: 7 }),
    React.createElement("rect", { x: 14, y: 3, width: 7, height: 7 }),
    React.createElement("rect", { x: 3, y: 14, width: 7, height: 7 }),
    React.createElement("rect", { x: 14, y: 14, width: 7, height: 7 })
  );

const MasonryIcon = () =>
  React.createElement("svg", { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2 },
    React.createElement("rect", { x: 3, y: 3, width: 7, height: 10 }),
    React.createElement("rect", { x: 14, y: 3, width: 7, height: 6 }),
    React.createElement("rect", { x: 14, y: 13, width: 7, height: 8 }),
    React.createElement("rect", { x: 3, y: 17, width: 7, height: 4 })
  );

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
    if (items.length + files.length > MAX) { setError("Maximum " + MAX + " attachments."); return; }
    setUploading(true); setError("");
    let next = items.slice();
    for (const file of files) {
      try {
        const fd = new FormData();
        fd.append("file", file); fd.append("usage_context", "campaign_cover");
        fd.append("category", "campaign"); fd.append("label", file.name);
        const res = await fetch("/api/cms/asset/upload", { method: "POST", credentials: "include", body: fd });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(d.error || "Upload failed");
        const url = d.public_url || d.cdn_url || d.pub_url || d.url;
        if (!url) throw new Error("Upload succeeded but no URL returned.");
        next.push({ url, type: mediaTypeFromUpload(d, file), name: file.name, mime_type: d.mime_type || file.type });
      } catch (e) { setError(e.message || "Upload failed"); break; }
    }
    onChange(next); setUploading(false);
  }

  function removeAt(idx) { const copy = items.slice(); copy.splice(idx, 1); onChange(copy); }
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
                  onClick: () => removeAt(idx), "aria-label": "Remove",
                }, "×")
              )
            ),
            addTile
          )
        : addTile
    ),
    React.createElement("p", { className: "camp-attach-hint" },
      items.length ? "First image is the card thumbnail · " + items.length + " / " + MAX
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
        cover ? React.createElement("img", { src: cover.url, alt: title || "Preview" })
          : React.createElement("div", { className: "camp-preview-ph" }, "Add a photo")
      ),
      React.createElement("div", { className: "camp-preview-body" },
        React.createElement("h3", null, title || "Campaign title"),
        React.createElement("p", null, excerpt || "Description will appear here on the website card.")
      )
    )
  );
}

// ── Entry card: admin grid view ────────────────────────────────────────────
function entryIsDemo(entry) {
  if (!entry) return false;
  if (entry.payment_status === "demo" || entry.moderation_status === "demo") return true;
  const pi = String(entry.stripe_payment_intent_id || "");
  if (pi.startsWith("mock_pi_")) return true;
  try {
    const meta = typeof entry.metadata_json === "string" ? JSON.parse(entry.metadata_json || "{}") : (entry.metadata_json || {});
    return Number(meta.is_demo) === 1 || meta.is_demo === true;
  } catch (_) { return false; }
}

function EntryCard({ entry, busy, votes, onVote, onAction, campaignTitle }) {
  const voteCount = votes[entry.id] || 0;
  const hasVoted = votes["__voted_" + entry.id] || false;
  const isDemo = entryIsDemo(entry);
  const isPaid = !isDemo && entry.payment_status === "paid";
  const isApproved = !isDemo && Number(entry.is_approved) === 1;
  const isRejected = entry.moderation_status === "rejected";
  const isArchived = !!entry.archived_at;
  function money(c) { return "$" + (Number(c || 0) / 100).toFixed(2); }

  const payChip = { fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 999, textTransform: "uppercase", letterSpacing: "0.04em",
    background: isDemo ? "#e2e8f0" : isPaid ? "#dcfce7" : "#fef3c7",
    color: isDemo ? "#475569" : isPaid ? "#15803d" : "#92400e" };
  const modChip = { fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 999, textTransform: "uppercase", letterSpacing: "0.04em",
    background: isDemo ? "#e2e8f0" : isApproved ? "#dcfce7" : isRejected ? "#fee2e2" : "#ede9fe",
    color: isDemo ? "#475569" : isApproved ? "#15803d" : isRejected ? "#dc2626" : "#7c3aed" };
  const dollarChip = { fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 999, textTransform: "uppercase", letterSpacing: "0.04em",
    background: "#f0fdf4", color: "#166534" };
  const demoChip = { fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 999, textTransform: "uppercase", letterSpacing: "0.04em",
    background: "#334155", color: "#f8fafc" };

  return React.createElement("div", {
    style: { borderRadius: 12, border: "1px solid rgba(0,0,0,0.09)",
      background: "var(--dash-surface, #faf7f3)", overflow: "hidden",
      display: "flex", flexDirection: "column",
      boxShadow: "0 1px 4px rgba(26,22,34,0.06)" },
  },
    // Photo
    React.createElement("div", { style: { aspectRatio: "4/3", background: "#e8e4de", overflow: "hidden", flexShrink: 0 } },
      entry.photo_url
        ? React.createElement("img", { src: entry.photo_url, alt: entry.dog_name || "Entry",
            style: { width: "100%", height: "100%", objectFit: "cover", display: "block" } })
        : React.createElement("div", { style: { width: "100%", height: "100%", display: "flex", alignItems: "center",
            justifyContent: "center", color: "#bbb", fontSize: 12, flexDirection: "column", gap: 6 } },
            React.createElement("svg", { width: 28, height: 28, viewBox: "0 0 24 24", fill: "none", stroke: "#ddd", strokeWidth: 1.5 },
              React.createElement("rect", { x: 3, y: 3, width: 18, height: 18, rx: 2 }),
              React.createElement("circle", { cx: 8.5, cy: 8.5, r: 1.5 }),
              React.createElement("polyline", { points: "21,15 16,10 5,21" })
            ), "No photo"
          )
    ),

    // Info
    React.createElement("div", { style: { padding: "11px 13px", flex: 1 } },
      React.createElement("div", { style: { fontWeight: 700, fontSize: 14, marginBottom: 1 } }, entry.dog_name || "Untitled"),
      React.createElement("div", { style: { fontSize: 11, color: "var(--dash-text-muted)", marginBottom: 7,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } },
        [entry.owner_name, entry.owner_email].filter(Boolean).join(" · ")
      ),
      entry.caption && React.createElement("div", { style: { fontSize: 11, fontStyle: "italic",
        color: "var(--dash-text-sec)", marginBottom: 8, lineHeight: 1.4,
        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } },
        "\"" + entry.caption + "\""
      ),
      React.createElement("div", { style: { display: "flex", gap: 4, flexWrap: "wrap" } },
        isDemo ? React.createElement("span", { style: demoChip, title: "Trial/QA — not a real Stripe payment" }, "Demo / test") : null,
        React.createElement("span", { style: payChip }, isDemo ? "not paid" : (entry.payment_status || "pending")),
        React.createElement("span", { style: modChip }, isDemo ? "demo" : (isApproved ? "approved" : isRejected ? "rejected" : entry.moderation_status || "pending")),
        !isDemo && entry.payment_status === "paid" && React.createElement("span", { style: dollarChip, title: "Entry gift amount" }, money(entry.expected_amount_cents ?? 1000))
      )
    ),

    // Footer — row 1: votes + share
    React.createElement("div", { style: { padding: "9px 13px", borderTop: "1px solid rgba(0,0,0,0.06)",
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 } },
      // Vote button
      React.createElement("button", { type: "button", onClick: () => onVote(entry.id),
        title: hasVoted ? "Remove vote" : "Cast internal vote",
        style: { display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 999,
          border: hasVoted ? "1.5px solid #7c3aed" : "1.5px solid rgba(0,0,0,0.12)",
          background: hasVoted ? "rgba(124,58,237,0.08)" : "transparent",
          color: hasVoted ? "#7c3aed" : "var(--dash-text-sec)",
          fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-ui)",
          transition: "all 0.15s" } },
        React.createElement(HeartIcon, { filled: hasVoted, size: 13 }),
        React.createElement("span", null, voteCount)
      ),
      // FB share
      React.createElement("button", { type: "button", onClick: () => fbShareEntry(entry, campaignTitle),
        title: "Share to Facebook",
        style: { display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 999,
          border: "1.5px solid rgba(24,119,242,0.3)", background: "rgba(24,119,242,0.06)",
          color: "#1877f2", fontSize: 12, fontWeight: 700, cursor: "pointer",
          fontFamily: "var(--font-ui)", transition: "all 0.12s" } },
        React.createElement(FbIcon, { size: 12 }),
        React.createElement("span", null, "Share")
      )
    ),

    // Footer — row 2: admin actions (only when needed)
    (isPaid || !isArchived) && React.createElement("div", {
      style: { padding: "0 13px 11px", display: "flex", gap: 6, flexWrap: "wrap" },
    },
      isPaid && !isApproved && !isRejected && React.createElement(Btn, {
        size: "sm", disabled: busy, onClick: () => onAction(entry.id, "approve"),
      }, "Approve"),
      isPaid && !isRejected && React.createElement(Btn, {
        size: "sm", variant: "secondary", disabled: busy,
        onClick: () => onAction(entry.id, "reject", { reason: "Needs a clearer photo or details." }),
      }, "Reject"),
      !isArchived && React.createElement(Btn, {
        size: "sm", variant: "secondary", disabled: busy,
        onClick: () => onAction(entry.id, "archive"),
      }, "Archive")
    )
  );
}

// ── Gallery card: staggered vote leaderboard view ─────────────────────────
function GalleryCard({ entry, rank, votes, onVote, campaignTitle }) {
  const voteCount = votes[entry.id] || 0;
  const hasVoted = votes["__voted_" + entry.id] || false;
  const isApproved = Number(entry.is_approved) === 1;
  const rankColors = ["#f59e0b", "#94a3b8", "#b45309"];
  const rankBg = rank <= 3 ? rankColors[rank - 1] : "rgba(0,0,0,0.45)";

  return React.createElement("div", {
    style: { borderRadius: 12, overflow: "hidden", background: "var(--dash-surface)",
      border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 2px 10px rgba(26,22,34,0.06)",
      display: "inline-block", width: "100%", breakInside: "avoid",
      marginBottom: 16, verticalAlign: "top" },
  },
    // Photo — natural height
    React.createElement("div", { style: { position: "relative", background: "#e8e4de", overflow: "hidden" } },
      entry.photo_url
        ? React.createElement("img", { src: entry.photo_url, alt: entry.dog_name || "Entry",
            style: { width: "100%", height: "auto", display: "block", minHeight: 120 } })
        : React.createElement("div", { style: { height: 160, display: "flex", alignItems: "center",
            justifyContent: "center", color: "#bbb", fontSize: 12 } }, "No photo"),
      // Rank badge — top left
      React.createElement("div", { style: { position: "absolute", top: 8, left: 8,
        background: rankBg, color: "#fff",
        fontSize: 11, fontWeight: 800, padding: "3px 9px", borderRadius: 999,
        letterSpacing: "0.06em", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" } },
        rank <= 3 ? "#" + rank : "#" + rank
      ),
      // Vote count overlay — top right
      React.createElement("div", { style: { position: "absolute", top: 8, right: 8,
        background: "rgba(0,0,0,0.55)", color: "#fff", backdropFilter: "blur(4px)",
        fontSize: 12, fontWeight: 700, padding: "3px 9px", borderRadius: 999,
        display: "flex", alignItems: "center", gap: 4 } },
        React.createElement(HeartIcon, { filled: true, size: 11 }),
        voteCount
      )
    ),
    // Info
    React.createElement("div", { style: { padding: "10px 12px 12px" } },
      React.createElement("div", { style: { fontWeight: 700, fontSize: 14, marginBottom: 3 } },
        entry.dog_name || "Untitled"),
      entry.caption && React.createElement("div", { style: { fontSize: 11, color: "var(--dash-text-sec)",
        fontStyle: "italic", marginBottom: 10, lineHeight: 1.4,
        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } },
        "\"" + entry.caption + "\""
      ),
      !entry.caption && React.createElement("div", { style: { marginBottom: 8 } }),
      // Footer actions
      React.createElement("div", { style: { display: "flex", gap: 6, alignItems: "center" } },
        React.createElement("button", { type: "button", onClick: () => onVote(entry.id),
          style: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
            padding: "7px 12px", borderRadius: 8,
            border: hasVoted ? "1.5px solid #7c3aed" : "1.5px solid rgba(0,0,0,0.12)",
            background: hasVoted ? "rgba(124,58,237,0.1)" : "transparent",
            color: hasVoted ? "#7c3aed" : "var(--dash-text-sec)",
            fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-ui)" } },
          React.createElement(HeartIcon, { filled: hasVoted, size: 13 }),
          React.createElement("span", null, hasVoted ? "Voted" : "Vote")
        ),
        React.createElement("button", { type: "button", onClick: () => fbShareEntry(entry, campaignTitle),
          style: { width: 34, height: 34, borderRadius: 8, border: "1.5px solid rgba(24,119,242,0.25)",
            background: "rgba(24,119,242,0.07)", color: "#1877f2",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", flexShrink: 0 } },
          React.createElement(FbIcon, { size: 14 })
        )
      )
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
  const [votes, setVotes] = React.useState({});
  const [entryFilter, setEntryFilter] = React.useState("all");
  const [entryView, setEntryView] = React.useState("grid"); // 'grid' | 'gallery'
  const [form, setForm] = React.useState({
    id: "", title: "", description: "",
    is_public: 0, status: "draft",
    attachments: [],
    config: { show_on_donate: false, show_on_services: false },
  });

  function setField(k, v) { setForm(prev => Object.assign({}, prev, { [k]: v })); }
  function setSurface(k, v) { setForm(prev => Object.assign({}, prev, { config: Object.assign({}, prev.config, { [k]: v }) })); }

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
        id: c.id, title: c.title || "",
        description: c.description || c.short_description || "",
        is_public: Number(c.is_public) === 1 ? 1 : 0,
        status: c.status || "draft",
        attachments: attachmentsFromCampaign(c, cfg),
        config: Object.assign({ show_on_donate: false, show_on_services: false }, cfg),
      });
      const rawEntries = Array.isArray(d.entries) ? d.entries : [];
      setEntries(rawEntries);
      setVotes(prev => {
        const next = Object.assign({}, prev);
        rawEntries.forEach(e => { if (next[e.id] == null) next[e.id] = Number(e.internal_votes || 0); });
        return next;
      });
    } catch (e) { setError(e.message || "Failed to load campaign"); }
    finally { setLoading(false); }
  }

  React.useEffect(function() { loadCampaign(); }, [campaignId, isNew]);

  async function entryAction(entryId, action, body) {
    setEntryBusy(entryId + ":" + action); setError("");
    try {
      const res = await fetch(
        "/api/dashboard/fundraising/" + encodeURIComponent(campaignId) +
        "/entries/" + encodeURIComponent(entryId) + "/" + action,
        { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}) }
      );
      const d = await res.json().catch(() => ({}));
      if (!res.ok || d.ok === false) throw new Error(d.error || "Action failed");
      await loadCampaign();
    } catch (e) { setError(e.message || "Entry action failed"); }
    finally { setEntryBusy(""); }
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
    fetch(
      "/api/dashboard/fundraising/" + encodeURIComponent(campaignId) +
      "/entries/" + encodeURIComponent(entryId) + "/vote",
      { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" } }
    ).catch(() => {});
  }

  async function save() {
    if (!form.title.trim()) { setError("Title is required."); return; }
    setSaving(true); setError(""); setSaveMsg("");
    try {
      const isPublic = form.is_public === 1;
      const firstImage = (form.attachments || []).find(a => a.type === "image");
      const coverUrl = firstImage?.url || null;
      const configJson = Object.assign({}, form.config, { attachments: form.attachments || [], cover_url: coverUrl });
      if (isPublic && configJson.show_on_donate && !configJson.donate_placement) configJson.donate_placement = "story_card";
      if (!isPublic || !configJson.show_on_donate) configJson.donate_placement = configJson.show_on_donate ? configJson.donate_placement : "";
      const payload = {
        id: form.id || undefined, title: form.title.trim(),
        description: form.description.trim(),
        short_description: form.description.trim().slice(0, 240),
        is_public: isPublic ? 1 : 0, status: isPublic ? "active" : "draft",
        goal_amount_cents: 0, campaign_type: "fundraiser", config_json: configJson,
      };
      const res = await fetch("/api/dashboard/fundraising", {
        method: isNew || !form.id ? "POST" : "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || d.ok === false) throw new Error(d.error || "Save failed");
      setSaveMsg(isPublic ? "Published — visible on site after cache refresh." : "Saved as draft.");
      if (isNew && d.id && onNavigate) { onNavigate("campaign-detail", { campaignId: d.id }); return; }
      if (d.id) setField("id", d.id);
    } catch (e) { setError(e.message || "Save failed"); }
    finally { setSaving(false); }
  }

  const field = (label, child, opts) => React.createElement("div", { className: "camp-field" + (opts?.large ? " camp-field--large" : "") },
    React.createElement("label", { className: "camp-label" }, label), child);

  const entryCounts = entries.reduce(function(acc, e) {
    const demo = entryIsDemo(e);
    if (e.archived_at) acc.archived += 1;
    else if (demo) acc.demo += 1;
    else if (e.payment_status === "paid") acc.paid += 1;
    else if (e.payment_status === "failed" || e.payment_status === "abandoned") acc.failed += 1;
    else acc.pending += 1;
    if (!demo && e.payment_status === "paid" && Number(e.is_approved) !== 1 && e.moderation_status !== "rejected") acc.unreviewed += 1;
    return acc;
  }, { pending: 0, paid: 0, failed: 0, archived: 0, unreviewed: 0, demo: 0 });

  const filteredEntries = entries.filter(e => {
    const demo = entryIsDemo(e);
    if (entryFilter === "approved") return !demo && e.payment_status === "paid" && Number(e.is_approved) === 1;
    if (entryFilter === "review") return !demo && e.payment_status === "paid" && Number(e.is_approved) !== 1 && e.moderation_status !== "rejected";
    if (entryFilter === "pending") return !demo && e.payment_status !== "paid" && !e.archived_at;
    if (entryFilter === "archived") return !!e.archived_at;
    return !e.archived_at;
  });

  // Gallery: real paid+approved only, sorted by votes desc
  const galleryEntries = entries
    .filter(e => !entryIsDemo(e) && e.payment_status === "paid" && Number(e.is_approved) === 1 && !e.archived_at)
    .slice()
    .sort((a, b) => (votes[b.id] || 0) - (votes[a.id] || 0));

  const totalVotes = Object.keys(votes).filter(k => !k.startsWith("__")).reduce((s, k) => s + (votes[k] || 0), 0);

  const filterBtn = (label, key, count) => React.createElement("button", {
    type: "button", onClick: () => setEntryFilter(key),
    style: { padding: "5px 11px", borderRadius: 999, border: "none", cursor: "pointer",
      fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 600,
      background: entryFilter === key ? "var(--brand-primary)" : "var(--dash-bg2)",
      color: entryFilter === key ? "#fff" : "var(--dash-text-sec)", transition: "all 0.12s" },
  }, label + (count > 0 ? " (" + count + ")" : ""));

  const viewBtn = (label, key, Icon) => React.createElement("button", {
    type: "button", onClick: () => setEntryView(key),
    title: label,
    style: { width: 30, height: 30, border: "1px solid",
      borderColor: entryView === key ? "var(--brand-primary)" : "rgba(0,0,0,0.12)",
      borderRadius: 7, background: entryView === key ? "var(--brand-primary-dim)" : "transparent",
      color: entryView === key ? "var(--brand-primary)" : "var(--dash-text-muted)",
      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  }, React.createElement(Icon));

  const entriesPanel = !isNew && React.createElement(Card, { className: "camp-form-card", style: { marginTop: 16 } },
    // Header
    React.createElement("div", { style: { display: "flex", alignItems: "flex-start", justifyContent: "space-between",
      gap: 12, flexWrap: "wrap", marginBottom: 14 } },
      React.createElement("div", null,
        React.createElement("h3", { style: { margin: 0, fontSize: 15, fontWeight: 700 } }, "Competition entries"),
        React.createElement("p", { style: { margin: "3px 0 0", fontSize: 12, color: "var(--dash-text-muted)" } },
          entryCounts.paid + " paid · " + entryCounts.unreviewed + " awaiting review · " + entryCounts.pending + " pending" +
          (entryCounts.demo ? " · " + entryCounts.demo + " demo/test" : "") +
          (totalVotes > 0 ? " · " + totalVotes + " votes cast" : "")
        )
      ),
      React.createElement("div", { style: { display: "flex", gap: 6, alignItems: "center" } },
        viewBtn("Grid", "grid", GridIcon),
        viewBtn("Gallery", "gallery", MasonryIcon),
        React.createElement(Btn, { variant: "secondary", size: "sm", onClick: loadCampaign, disabled: !!entryBusy }, "Refresh")
      )
    ),

    // Filter tabs (grid view only)
    entryView === "grid" && entries.length > 0 && React.createElement("div", {
      style: { display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 14 } },
      filterBtn("All", "all", entries.filter(e => !e.archived_at).length),
      filterBtn("Approved", "approved", entries.filter(e => e.payment_status === "paid" && Number(e.is_approved) === 1).length),
      filterBtn("Review", "review", entryCounts.unreviewed),
      filterBtn("Pending", "pending", entryCounts.pending),
      filterBtn("Archived", "archived", entryCounts.archived)
    ),

    // Gallery header
    entryView === "gallery" && React.createElement("div", { style: { marginBottom: 14, padding: "10px 14px", borderRadius: 8,
      background: "var(--dash-bg2)", fontSize: 12, color: "var(--dash-text-sec)" } },
      "Showing " + galleryEntries.length + " approved entries, ranked by internal votes. Use this view to preview the public gallery before it goes live."
    ),

    // Content
    entries.length === 0
      ? React.createElement("p", { style: { margin: 0, fontSize: 13, color: "var(--dash-text-muted)" } },
          "No entries yet. Paid submissions appear here.")

      // Grid view
      : entryView === "grid"
        ? filteredEntries.length === 0
          ? React.createElement("p", { style: { margin: 0, fontSize: 13, color: "var(--dash-text-muted)" } }, "No entries in this category.")
          : React.createElement("div", {
              style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 14 },
            },
              filteredEntries.map(entry =>
                React.createElement(EntryCard, {
                  key: entry.id, entry,
                  busy: entryBusy.indexOf(entry.id) === 0,
                  votes, onVote: handleVote, onAction: entryAction,
                  campaignTitle: form.title,
                })
              )
            )

        // Gallery / staggered masonry view
        : galleryEntries.length === 0
          ? React.createElement("p", { style: { margin: 0, fontSize: 13, color: "var(--dash-text-muted)" } },
              "No approved entries yet. Approve entries in Grid view to see them here.")
          : React.createElement("div", {
              style: { columns: "3 180px", columnGap: 14, orphans: 1, widows: 1 },
            },
              galleryEntries.map((entry, i) =>
                React.createElement(GalleryCard, {
                  key: entry.id, entry, rank: i + 1,
                  votes, onVote: handleVote,
                  campaignTitle: form.title,
                })
              )
            )
  );

  const publishPanel = React.createElement("aside", { className: "camp-sidebar" },
    React.createElement(Card, { className: "camp-publish-card" },
      React.createElement(CampaignLivePreview, { title: form.title, description: form.description, attachments: form.attachments }),
      React.createElement("h4", { className: "camp-sidebar-title" }, "Publish"),
      field("Visibility", React.createElement(Select, {
        value: String(form.is_public),
        onChange: v => setField("is_public", Number(v)),
        options: [{ value: "0", label: "Draft — hidden" }, { value: "1", label: "Live on website" }],
      })),
      form.is_public === 1 && React.createElement("div", { className: "camp-surfaces" },
        React.createElement("p", { className: "camp-surfaces-label" }, "Show on"),
        React.createElement("label", { className: "camp-check" },
          React.createElement("input", { type: "checkbox", checked: !!form.config.show_on_donate, onChange: e => setSurface("show_on_donate", e.target.checked) }),
          " Donate page"
        ),
        React.createElement("label", { className: "camp-check" },
          React.createElement("input", { type: "checkbox", checked: !!form.config.show_on_services, onChange: e => setSurface("show_on_services", e.target.checked) }),
          " Foster / Services page"
        )
      ),
      React.createElement("div", { className: "camp-publish-actions" },
        React.createElement(Btn, { onClick: save, disabled: saving || !form.title.trim(), style: { width: "100%" } },
          saving ? "Saving..." : (form.is_public ? "Save & publish" : "Save draft")),
        form.is_public === 1 && React.createElement(Btn, {
          variant: "secondary", size: "sm", icon: "arrowR",
          onClick: () => window.open("https://companionsofcaddo.org/donate", "_blank", "noopener"),
          style: { width: "100%" },
        }, "Preview website")
      )
    )
  );

  if (loading) return React.createElement("div", { className: "dash-page" },
    React.createElement(FinanceEmpty, { title: "Loading campaign", body: "One moment..." }));

  return React.createElement("div", { className: "dash-page camp-workspace camp-workspace--simple" },
    React.createElement("div", { className: "camp-topbar" },
      React.createElement("div", null,
        React.createElement("button", { type: "button", className: "camp-back",
          onClick: () => onNavigate && onNavigate("fundraising") }, "← Giving"),
        React.createElement("h1", { className: "camp-title" }, isNew ? "New Campaign" : (form.title || "Campaign")),
        !isNew && React.createElement(Badge, { label: form.status, dot: true }),
        saveMsg && React.createElement("div", { className: "camp-save-msg" }, saveMsg)
      ),
      React.createElement("div", { className: "camp-top-actions" },
        React.createElement(Btn, { onClick: save, disabled: saving || !form.title.trim() },
          saving ? "Saving..." : (form.is_public ? "Save & publish" : "Save draft"))
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
            media: form.attachments, onChange: v => setField("attachments", v), disabled: saving,
          }))
        ),
        entriesPanel
      ),
      publishPanel
    )
  );
}

Object.assign(window, { CampaignWorkspaceView });
