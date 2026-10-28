/* Companions CMS Checkout Editor.
 * Edits the existing cms_globals checkout_modal; previews are inert.
 * Save draft stages changes without replacing the published configuration. */
function CampaignCheckoutEditor({ campaignId, canPublish = true, onPublished }) {
  const [working, setWorking] = React.useState(null);
  const [key, setKey] = React.useState("");
  const [status, setStatus] = React.useState("draft");
  const [hasDraft, setHasDraft] = React.useState(false);
  const [version, setVersion] = React.useState(0);
  const [busy, setBusy] = React.useState("");
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const [activeTab, setActiveTab] = React.useState("options");
  const [previewDevice, setPreviewDevice] = React.useState("mobile");
  const [previewExpanded, setPreviewExpanded] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const [previewSelected, setPreviewSelected] = React.useState({});
  const root = "/api/checkout/admin/campaign/" + encodeURIComponent(campaignId || "");
  React.useEffect(() => {
    if (!campaignId || campaignId === "new") return;
    let live = true;
    setBusy("load");
    fetch(root, { credentials: "include", cache: "no-store" }).then(async response => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw Error(data.error || "Unable to load modal");
      if (!live) return;
      const content = data.content || {};
      // Checkout editing does not add chance-based tickets or rewards.
      const items = (content.items || []).filter(it => !/(extra[_ -]?hand|raffle|50\/50|chance)/i.test([it.key,it.label].join(" ")));
      setWorking({ ...content, items, fields: content.fields || [],
        appearance: { accent: "#7c3aed", surface: "light", radius: 14, compact: false, ...(content.appearance || {}) },
        participant_items: content.participant_items || [] });
      setKey(data.key || ""); setStatus(data.status || "draft"); setHasDraft(!!data.has_draft);
      setVersion(Number(data.content_version || 0));
      setDirty(false); setError(""); setNotice(""); setPreviewSelected({});
    }).catch(e => { if (live) setError(e.message); })
      .finally(() => { if (live) setBusy(""); });
    return () => { live = false; };
  }, [campaignId]);
  function edit(k, value) {
    setWorking(prev => ({ ...prev, [k]: value }));
    setDirty(true); setNotice(""); setError("");
  }
  function editAppearance(k, value) { edit("appearance", { ...working.appearance, [k]: value }); }
  function changeItem(index, k, value) { edit("items", working.items.map((it, i) => i === index ? { ...it, [k]: value } : it)); }
  function changeField(index, k, value) { edit("fields", working.fields.map((it, i) => i === index ? { ...it, [k]: value } : it)); }
  function move(type, index, offset) {
    const rows = [...working[type]], next = index + offset;
    if (next < 0 || next >= rows.length) return;
    [rows[index], rows[next]] = [rows[next], rows[index]];
    edit(type, rows);
  }
  function addItem() {
    const keys = new Set(working.items.map(it => it.key));
    let i = 1; while (keys.has("entry_" + i)) i++;
    edit("items", [...working.items, { key: "entry_" + i, label: "New item", price_cents: 2000, note: "", min: 0, max: 10 }]);
  }
  function removeItem(index) {
    const target = working.items[index];
    setWorking(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index),
      participant_items: prev.participant_items.filter(k => k !== target.key) }));
    setDirty(true); setNotice("");
  }
  function addField() {
    const keys = new Set(working.fields.map(f => f.key));
    let i = 1; while (keys.has("field_" + i)) i++;
    edit("fields", [...working.fields, { key: "field_" + i, label: "New field", type: "text", required: false, placeholder: "" }]);
  }
  function toggleParticipant(itemKey, enabled) {
    const names = new Set(working.participant_items);
    if (enabled) names.add(itemKey); else names.delete(itemKey);
    edit("participant_items", [...names]);
  }
  async function save(nextStatus) {
    if (!working || busy) return;
    if (nextStatus === "published" && !canPublish) { setError("Save the campaign changes before publishing its modal."); return; }
    if (!working.items.length) { setError("At least one item is required."); return; }
    if (working.items.some(it => !it.label.trim() || !Number.isInteger(Number(it.price_cents)) || Number(it.price_cents) < 100)) {
      setError("Every item needs a name and a valid amount of at least $1."); return;
    }
    setBusy("save"); setError(""); setNotice("");
    try {
      const response = await fetch(root, { method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, content_version: version,
          content: { ...working, mode: "items" } }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw Error(result.error || "Unable to save modal");
      setKey(result.key); setStatus(result.status); setHasDraft(!!result.has_draft);
      setVersion(Number(result.content_version || 0));
      setWorking(result.content); setDirty(false);
      setNotice((result.notice || "Saved.") +
        (result.published_routes?.length ? " Updated: " + result.published_routes.join(", ") : "") +
        (result.warnings?.length ? " Warning: " + result.warnings.join("; ") : ""));
      if (nextStatus === "published" && typeof onPublished === "function") onPublished();
    } catch (e) { setError(e.message); } finally { setBusy(""); }
  }
  if (!campaignId || campaignId === "new") return <p className="ccs-info">Save this campaign first to edit its modal.</p>;
  if (!working) return <section className="ccs-wrap"><h3>Modal editor</h3><p role="status">{error || "Loading saved configuration…"}</p></section>;

  const money = cents => "$" + (Number(cents || 0) / 100).toFixed(2);
  const appearance = working.appearance || {};
  const previewTotal = working.items.reduce((sum, row) => sum + Number(row.price_cents || 0) * (previewSelected[row.key] || 0), 0);
  const previewStyle = { "--ccs-accent": appearance.accent, "--ccs-radius": (Number(appearance.radius) || 14) + "px" };
  const field = (label, child) => <label className="ccs-field"><span>{label}</span>{child}</label>;
  const nav = [["options", "Items"], ["fields", "Fields"], ["appearance", "Design"], ["delivery", "Publishing"]];
  const preview = <div className={"ccs-preview is-" + (appearance.surface || "light") +
    (appearance.compact ? " is-compact" : "") + " ccs-preview--" + previewDevice} style={previewStyle}>
    <div className="ccs-preview-head"><span className="ccs-overline">{working.eyebrow || "COMPANIONS OF CPAS"}</span>
      <h2>{working.title || "Untitled modal"}</h2><p>{working.subtitle}</p></div>
    <div className="ccs-preview-body">
      <div className="ccs-preview-panel"><strong>{working.items_title || "Choose your entries"}</strong>
        {working.items.map(item => <div className="ccs-preview-item" key={item.key}>
          <div><b>{item.label}</b><small>{money(item.price_cents)}</small>{item.note && <em>{item.note}</em>}</div>
          <div className="ccs-preview-step"><button type="button" aria-label={"Reduce " + item.label}
            onClick={() => setPreviewSelected(a => ({ ...a, [item.key]: Math.max(item.min || 0, (a[item.key] || 0) - 1) }))}>−</button>
            <span>{previewSelected[item.key] || 0}</span>
            <button type="button" aria-label={"Add " + item.label}
              onClick={() => setPreviewSelected(a => ({ ...a, [item.key]: Math.min(item.max || 10, (a[item.key] || 0) + 1) }))}>+</button>
          </div>
        </div>)}</div>
      <div className="ccs-preview-panel"><strong>{working.details_title || "Your details"}</strong>
        <input placeholder="Email for receipt *" disabled />
        {working.items.flatMap(item => (working.participant_items || []).includes(item.key)
          ? Array.from({ length: previewSelected[item.key] || 0 }, (_, i) =>
            <input key={item.key + i} placeholder={item.label + " " + (i + 1) + " · Full name *"} disabled />)
          : [])}
        {(working.fields || []).map(f => <input key={f.key} placeholder={f.label + (f.required ? " *" : "")} disabled />)}
      </div>
      <div className="ccs-preview-panel ccs-preview-security"><strong>Secure payment</strong>
        <p>Payment fields appear only on the published customer checkout.</p></div>
    </div>
    <div className="ccs-preview-bottom"><div>Selected total <strong>{money(previewTotal)}</strong></div>
      <button type="button" disabled>{(working.submit_label || "Pay {total}").replace("{total}", money(previewTotal))} · Preview</button>
      <small>Visual preview only — no payment or registration.</small></div>
  </div>;
  return <section className="ccs-wrap" aria-label="Companions modal editor">
    <header className="ccs-head"><div><span className="ccs-overline">COMPANIONS · CMS</span><h3>Checkout modal editor</h3>
      <p>Edit the existing customer modal with a live visual preview.</p></div>
      <div className="ccs-status-group"><span className={"ccs-status is-" + status}>{status === "published" ? "Live checkout" : "Not published"}</span>
        {(dirty || hasDraft) && <span className="ccs-status is-draft">{dirty ? "Unsaved changes" : "Saved draft available"}</span>}</div>
    </header>
    <div className="ccs-toolbar">
      <div className="ccs-actions">
        <button type="button" onClick={() => setPreviewExpanded(true)}>Full preview</button>
        <button type="button" disabled={!!busy || (!dirty && !hasDraft)} onClick={() => save("draft")}>{busy === "save" ? "Saving…" : "Save draft"}</button>
        <button type="button" className="ccs-primary" disabled={!!busy || !canPublish} onClick={() => save("published")}>Publish changes</button>
      </div>
      <div className="ccs-device-switch" aria-label="Preview device">
        {["desktop", "mobile"].map(device => <button key={device} type="button"
          aria-pressed={previewDevice === device} className={previewDevice === device ? "is-active" : ""}
          onClick={() => setPreviewDevice(device)}>{device === "desktop" ? "Desktop" : "Mobile"}</button>)}
      </div>
    </div>
    {status === "published" && <p className="ccs-live-note">Drafts stay private until Publish. The public modal remains unchanged while you edit.</p>}
    {error && <p className="ccs-error" role="alert">{error}</p>}
    {notice && <p className="ccs-notice" role="status">{notice}</p>}
    <div className="ccs-workspace">
      <div className="ccs-edit-pane">
        <nav className="ccs-tabs" aria-label="Modal editor panels">{nav.map(([id, label]) =>
          <button key={id} type="button" className={activeTab === id ? "is-active" : ""}
            aria-current={activeTab === id ? "page" : undefined} onClick={() => setActiveTab(id)}>{label}</button>)}</nav>
        {activeTab === "options" && <div className="ccs-stack">
          <p className="ccs-hint">Edit item names, descriptions and limits. The server remains authoritative for published amounts.</p>
          {working.items.map((row, i) => <div className="ccs-item" key={row.key}>
            <div className="ccs-item-head"><strong>{i + 1}. {row.label || "Untitled item"}</strong>
              <span><button type="button" disabled={i === 0} aria-label="Move item up" onClick={() => move("items", i, -1)}>↑</button>
              <button type="button" disabled={i === working.items.length - 1} aria-label="Move item down" onClick={() => move("items", i, 1)}>↓</button>
              <button type="button" disabled={working.items.length === 1} onClick={() => removeItem(i)}>Remove</button></span></div>
            <div className="ccs-cols">
              {field("Display name", <input value={row.label} maxLength={80} onChange={e => changeItem(i, "label", e.target.value)} />)}
              {field("Amount (USD)", <input type="number" min="1" step=".01"
                value={(Number(row.price_cents || 0) / 100).toFixed(2)}
                onChange={e => changeItem(i, "price_cents", Math.round(Number(e.target.value) * 100))} />)}
              {field("Maximum quantity", <input type="number" min="1" max="100" value={row.max || 10}
                onChange={e => changeItem(i, "max", Number(e.target.value))} />)}
              {field("Description", <input value={row.note || ""} maxLength={240} onChange={e => changeItem(i, "note", e.target.value)} />)}
            </div>
            <label className="ccs-check"><input type="checkbox" checked={working.participant_items.includes(row.key)}
              onChange={e => toggleParticipant(row.key, e.target.checked)} />Collect a name for each person</label>
          </div>)}
          <button type="button" className="ccs-add" disabled={working.items.length >= 12} onClick={addItem}>+ Add item</button>
        </div>}
        {activeTab === "fields" && <div className="ccs-stack">
          <p className="ccs-hint">Customer email is included automatically. Add other information without editing source code.</p>
          {working.fields.map((row, i) => <div className="ccs-item" key={row.key}>
            <div className="ccs-item-head"><strong>{row.label || "Untitled field"}</strong><span>
              <button type="button" disabled={i === 0} onClick={() => move("fields", i, -1)}>↑</button>
              <button type="button" disabled={i === working.fields.length - 1} onClick={() => move("fields", i, 1)}>↓</button>
              <button type="button" onClick={() => edit("fields", working.fields.filter((_, j) => i !== j))}>Remove</button>
            </span></div><div className="ccs-cols">
              {field("Label", <input value={row.label} onChange={e => changeField(i, "label", e.target.value)} />)}
              {field("Type", <select value={row.type} onChange={e => changeField(i, "type", e.target.value)}>
                {["text", "email", "tel", "number"].map(t => <option key={t} value={t}>{t}</option>)}</select>)}
              {field("Placeholder", <input value={row.placeholder || ""} onChange={e => changeField(i, "placeholder", e.target.value)} />)}
              <label className="ccs-check"><input type="checkbox" checked={!!row.required} onChange={e => changeField(i, "required", e.target.checked)} />Required</label>
            </div></div>)}
          <button type="button" className="ccs-add" disabled={working.fields.length >= 8} onClick={addField}>+ Add field</button>
        </div>}
        {activeTab === "appearance" && <div className="ccs-stack">
          <div className="ccs-item"><strong className="ccs-section-label">Appearance</strong>
            <div className="ccs-cols">
              {field("Accent color", <div className="ccs-color"><input type="color" value={appearance.accent}
                onChange={e => editAppearance("accent", e.target.value)} /><input value={appearance.accent}
                  maxLength={7} onChange={e => editAppearance("accent", e.target.value)} /></div>)}
              {field("Theme", <select value={appearance.surface} onChange={e => editAppearance("surface", e.target.value)}>
                <option value="light">Light</option><option value="dark">Dark</option></select>)}
              {field("Corner radius · " + appearance.radius + "px", <input type="range" min="6" max="24" step="1"
                value={appearance.radius} onChange={e => editAppearance("radius", Number(e.target.value))} />)}
              <label className="ccs-check"><input type="checkbox" checked={!!appearance.compact}
                onChange={e => editAppearance("compact", e.target.checked)} />Compact spacing</label>
            </div></div>
          <div className="ccs-item"><strong className="ccs-section-label">Text</strong><div className="ccs-stack">
            {[["eyebrow", "Eyebrow"], ["title", "Modal title"], ["subtitle", "Description"],
              ["items_title", "Items heading"], ["details_title", "Customer details heading"],
              ["submit_label", "Button label ({total} for amount)"],
              ["success_title", "Confirmation title"], ["success_message", "Confirmation message"]]
              .map(([k, label]) => field(label, (k === "subtitle" || k === "success_message")
                ? <textarea key={k} rows={2} value={working[k] || ""} onChange={e => edit(k, e.target.value)} />
                : <input key={k} value={working[k] || ""} onChange={e => edit(k, e.target.value)} />))}
          </div></div>
        </div>}
        {activeTab === "delivery" && <div className="ccs-stack">
          <div className="ccs-item"><strong className="ccs-section-label">Publishing & visibility</strong>
            <p className="ccs-hint">Checkout configuration is stored in Companions D1. Save draft never replaces the currently published modal.</p>
            <dl className="ccs-meta"><dt>Configuration</dt><dd>{key || "Not saved"}</dd><dt>Live status</dt>
              <dd>{status === "published" ? "Published" : "Not published"}</dd>
              <dt>Pending changes</dt><dd>{dirty ? "Not saved" : hasDraft ? "Saved privately" : "None"}</dd></dl>
          </div>
          <div className="ccs-item"><strong className="ccs-section-label">Customer preferences</strong>
            <label className="ccs-check"><input type="checkbox" checked={working.cover_fees?.enabled !== false}
              onChange={e => edit("cover_fees", { ...working.cover_fees, enabled: e.target.checked })} />Offer optional processing-fee coverage</label>
            <label className="ccs-check"><input type="checkbox" disabled={working.cover_fees?.enabled === false}
              checked={working.cover_fees?.default === true}
              onChange={e => edit("cover_fees", { ...working.cover_fees, default: e.target.checked })} />Default fee-coverage selection</label>
          </div>
          <p className="ccs-hint">Payment confirmations are recorded separately in the payment and registration tables. This editor changes only modal configuration.</p>
        </div>}
      </div>
      <aside className="ccs-preview-stage"><div className="ccs-preview-stage-head"><strong>Live design preview</strong><span>{previewDevice} · unsent</span></div>{preview}</aside>
    </div>
    {previewExpanded && <div className="ccs-preview-overlay" onMouseDown={e => { if (e.target === e.currentTarget) setPreviewExpanded(false); }}>
      <section className="ccs-preview-dialog" role="dialog" aria-modal="true" aria-label="Modal preview">
        <button type="button" className="ccs-preview-close" onClick={() => setPreviewExpanded(false)}>Close preview ×</button>
        {preview}</section></div>}
  </section>;
}
window.CampaignCheckoutEditor = CampaignCheckoutEditor;
