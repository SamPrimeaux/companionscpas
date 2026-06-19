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

  function onDragEnter(e) {
    e.preventDefault();
    dragDepth.current += 1;
    if (!disabled && !uploading) setDragging(true);
  }
  function onDragLeave(e) {
    e.preventDefault();
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setDragging(false);
    }
  }
  function onDrop(e) {
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    if (!uploading && !disabled) uploadFiles(e.dataTransfer.files);
  }

  const addTile = items.length < MAX && React.createElement("label", {
    className: "camp-attach-add" + (uploading || disabled ? " is-disabled" : ""),
  },
    React.createElement("span", { className: "camp-attach-plus", "aria-hidden": "true" }, "+"),
    React.createElement("span", { className: "camp-attach-add-label" },
      uploading ? "Uploading..." : "Drop files here"
    ),
    React.createElement("span", { className: "camp-attach-add-sub" }, "Images · Videos · PDFs"),
    React.createElement("input", {
      type: "file",
      multiple: true,
      accept: "image/*,application/pdf,video/mp4,video/quicktime,video/webm",
      disabled: uploading || disabled,
      onChange: e => { uploadFiles(e.target.files); e.target.value = ""; },
    })
  );

  return React.createElement("div", { className: "camp-attach" },
    React.createElement("div", {
      className: "camp-attach-zone" + (dragging ? " is-dragging" : "") + (items.length ? " has-items" : " is-empty"),
      onDragEnter: onDragEnter,
      onDragOver: e => e.preventDefault(),
      onDragLeave: onDragLeave,
      onDrop: onDrop,
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
                idx === 0 && item.type === "image"
                  ? React.createElement("span", { className: "camp-attach-badge" }, "Cover")
                  : null,
                item.type === "image"
                  ? React.createElement("img", { src: item.url, alt: item.name || "Attachment" })
                  : item.type === "video"
                    ? React.createElement("div", { className: "camp-attach-file" },
                        React.createElement(Icon, { name: "video", size: 24 }),
                        React.createElement("span", { className: "camp-attach-filename" }, item.name || "Video")
                      )
                    : React.createElement("div", { className: "camp-attach-file" },
                        React.createElement(Icon, { name: "file", size: 24 }),
                        React.createElement("span", { className: "camp-attach-filename" }, item.name || "PDF")
                      ),
                React.createElement("button", {
                  type: "button",
                  className: "camp-attach-remove",
                  onClick: () => removeAt(idx),
                  "aria-label": "Remove attachment",
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

function CampaignWorkspaceView({ campaignId, onNavigate }) {
  const isNew = !campaignId || campaignId === "new";
  const [loading, setLoading] = React.useState(!isNew);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [saveMsg, setSaveMsg] = React.useState("");
  const [form, setForm] = React.useState({
    id: "",
    title: "",
    description: "",
    is_public: 0,
    status: "draft",
    attachments: [],
    config: { show_on_donate: false, show_on_services: false },
  });

  function setField(k, v) {
    setForm(prev => Object.assign({}, prev, { [k]: v }));
  }
  function setSurface(k, v) {
    setForm(prev => Object.assign({}, prev, {
      config: Object.assign({}, prev.config, { [k]: v }),
    }));
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
          id: c.id,
          title: c.title || "",
          description: c.description || c.short_description || "",
          is_public: Number(c.is_public) === 1 ? 1 : 0,
          status: c.status || "draft",
          attachments: attachmentsFromCampaign(c, cfg),
          config: Object.assign({ show_on_donate: false, show_on_services: false }, cfg),
        });
      })
      .catch(e => setError(e.message || "Failed to load campaign"))
      .finally(() => setLoading(false));
  }, [campaignId, isNew]);

  async function save() {
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    setSaving(true);
    setError("");
    setSaveMsg("");
    try {
      const firstImage = (form.attachments || []).find(a => a.type === "image");
      const coverUrl = firstImage?.url || null;
      const configJson = Object.assign({}, form.config, {
        attachments: form.attachments || [],
        cover_url: coverUrl,
      });
      if (isPublic && configJson.show_on_donate && !configJson.donate_placement) {
        configJson.donate_placement = "story_card";
      }
      if (!isPublic || !configJson.show_on_donate) {
        configJson.donate_placement = configJson.show_on_donate ? configJson.donate_placement : "";
      }
      const isPublic = form.is_public === 1;
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
      if (isNew && d.id && onNavigate) {
        onNavigate("campaign-detail", { campaignId: d.id });
        return;
      }
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

  const publishPanel = React.createElement("aside", { className: "camp-sidebar" },
    React.createElement(Card, { className: "camp-publish-card" },
      React.createElement(CampaignLivePreview, {
        title: form.title,
        description: form.description,
        attachments: form.attachments,
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
            type: "checkbox",
            checked: !!form.config.show_on_donate,
            onChange: e => setSurface("show_on_donate", e.target.checked),
          }),
          " Donate page"
        ),
        React.createElement("label", { className: "camp-check" },
          React.createElement("input", {
            type: "checkbox",
            checked: !!form.config.show_on_services,
            onChange: e => setSurface("show_on_services", e.target.checked),
          }),
          " Foster / Services page"
        )
      ),
      React.createElement("div", { className: "camp-publish-actions" },
        React.createElement(Btn, {
          onClick: save,
          disabled: saving || !form.title.trim(),
          style: { width: "100%" },
        }, saving ? "Saving..." : (form.is_public ? "Save & publish" : "Save draft")),
        form.is_public === 1 && React.createElement(Btn, {
          variant: "secondary",
          size: "sm",
          icon: "arrowR",
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
          type: "button", className: "camp-back", onClick: () => onNavigate && onNavigate("fundraising"),
        }, "← Giving"),
        React.createElement("h1", { className: "camp-title" }, isNew ? "New Campaign" : (form.title || "Campaign")),
        !isNew && React.createElement(Badge, { label: form.status, dot: true }),
        saveMsg && React.createElement("div", { className: "camp-save-msg" }, saveMsg)
      ),
      React.createElement("div", { className: "camp-top-actions" },
        React.createElement(Btn, {
          onClick: save,
          disabled: saving || !form.title.trim(),
        }, saving ? "Saving..." : (form.is_public ? "Save & publish" : "Save draft"))
      )
    ),

    error && React.createElement(FinanceNotice, null, error),

    React.createElement("div", { className: "camp-layout camp-layout--simple" },
      React.createElement("div", { className: "camp-main camp-main--simple" },
        React.createElement(Card, { className: "camp-form-card" },
          field("Title", React.createElement("input", {
            type: "text",
            className: "camp-title-input",
            value: form.title,
            onChange: e => setField("title", e.target.value),
            placeholder: "Summer Rescue Fundraiser",
          }), { large: true }),
          field("Description", React.createElement("textarea", {
            value: form.description,
            onChange: e => setField("description", e.target.value),
            className: "camp-textarea camp-textarea--lg",
            rows: 8,
            placeholder: "Tell people why this campaign matters...",
          })),
          field("Attachments", React.createElement(CampaignAttachments, {
            media: form.attachments,
            onChange: v => setField("attachments", v),
            disabled: saving,
          }))
        )
      ),
      publishPanel
    )
  );
}

Object.assign(window, { CampaignWorkspaceView });
