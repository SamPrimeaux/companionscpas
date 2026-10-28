/* Campaign Checkout Studio — edits the same cms_globals checkout_modal contract
 * used by the public Stripe PaymentElement. No event-specific markup or prices. */
function CampaignCheckoutEditor({ campaignId, canPublish = true, onPublished }) {
  const [working, setWorking] = React.useState(null);
  const [key, setKey] = React.useState("");
  const [status, setStatus] = React.useState("draft");
  const [busy, setBusy] = React.useState("");
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const [activeTab, setActiveTab] = React.useState("options");
  const [preview, setPreview] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const [previewSelected, setPreviewSelected] = React.useState({});
  const root = "/api/checkout/admin/campaign/" + encodeURIComponent(campaignId || "");
  React.useEffect(() => {
    if (!campaignId || campaignId === "new") return;
    let live = true;
    setBusy("load");
    fetch(root, { credentials: "include", cache: "no-store" }).then(async response => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw Error(data.error || "Unable to load checkout settings");
      if (!live) return;
      const content = data.content || {};
      // Chance-based entries are not offered by this registration editor.
      const items = (content.items || []).filter(it => !/(extra[_ -]?hand|raffle|50\/50|chance)/i.test([it.key,it.label].join(" ")));
      setWorking({ ...content, items, fields: content.fields || [], participant_items: content.participant_items || [] });
      setKey(data.key || ""); setStatus(data.status || "draft"); setDirty(false); setError("");
    }).catch(e => { if (live) setError(e.message); })
      .finally(() => { if (live) setBusy(""); });
    return () => { live = false; };
  }, [campaignId]);
  function edit(k, value) { setWorking(prev => ({ ...prev, [k]: value })); setDirty(true); setNotice(""); }
  function changeItem(index, k, value) {
    edit("items", working.items.map((row, i) => i === index ? { ...row, [k]: value } : row));
  }
  function changeField(index, k, value) {
    edit("fields", working.fields.map((row, i) => i === index ? { ...row, [k]: value } : row));
  }
  function move(type, index, offset) {
    const arr = [...working[type]], next = index + offset;
    if (next < 0 || next >= arr.length) return;
    [arr[index], arr[next]] = [arr[next], arr[index]];
    edit(type, arr);
  }
  function addTicket() {
    let i = 1;
    const keys = new Set(working.items.map(x => x.key));
    while (keys.has("entry_" + i)) i++;
    edit("items", [...working.items, { key: "entry_" + i, label: "New entry", price_cents: 2000, note: "", max: 10 }]);
  }
  function addField() {
    let i = 1;
    const keys = new Set(working.fields.map(x => x.key));
    while (keys.has("field_" + i)) i++;
    edit("fields", [...working.fields, { key: "field_" + i, label: "New field", type: "text", required: false, placeholder: "" }]);
  }
  function toggleParticipant(key, enabled) {
    const names = new Set(working.participant_items || []);
    if (enabled) names.add(key); else names.delete(key);
    edit("participant_items", [...names]);
  }
  async function save(nextStatus) {
    if (!working || busy) return;
    if (nextStatus === "published" && !canPublish) { setError("Save campaign edits before publishing checkout."); return; }
    if (!working.items.length) { setError("Add an entry before saving."); return; }
    if (working.items.some(row => !row.label.trim() || !Number.isInteger(Number(row.price_cents)) || Number(row.price_cents) < 100)) {
      setError("Each entry needs a name and a valid price of at least $1."); return;
    }
    setBusy("save"); setError(""); setNotice("");
    try {
      const response = await fetch(root, { method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, content: { ...working, mode: "items" } }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw Error(result.error || "Could not save checkout");
      setKey(result.key); setStatus(result.status); setWorking(result.content); setDirty(false);
      setNotice((result.notice || "Checkout saved.") + ((result.published_routes || []).length ? " Updated: " + result.published_routes.join(", ") : "") + ((result.warnings || []).length ? " Note: " + result.warnings.join("; ") : ""));
      if (result.status === "published" && typeof onPublished === "function") onPublished();
    } catch (e) { setError(e.message); } finally { setBusy(""); }
  }
  if (!campaignId || campaignId === "new") return <div className="ccs-info">Save this campaign first to configure a secure checkout.</div>;
  if (!working) return <section className="ccs-wrap"><h3>Checkout Studio</h3><p>{error || "Loading checkout settings…"}</p></section>;
  const money = cents => "$" + (Number(cents || 0) / 100).toFixed(2);
  const previewItems = working.items || [];
  const previewTotal = previewItems.reduce((sum, row) => sum + Number(row.price_cents || 0) * (previewSelected[row.key] || 0), 0);
  const field = (label, child) => <label className="ccs-field"><span>{label}</span>{child}</label>;
  return <section className="ccs-wrap" aria-label="Campaign checkout editor">
    <header className="ccs-head"><div><span className="ccs-overline">COMPANIONS · CHECKOUT</span><h3>Checkout Studio</h3><p>Edit ticket options, attendee details, and the live popup without rebuilding the event.</p></div>
      <span className={"ccs-status is-" + status}>{status === "published" ? "Published" : "Draft"}{dirty ? " · unsaved" : ""}</span></header>
    <div className="ccs-actions">
      <button type="button" onClick={() => setPreview(true)}>Preview mobile popup</button>
      <button type="button" disabled={!!busy} onClick={() => save("draft")}>{busy === "save" ? "Saving…" : "Save draft"}</button>
      <button type="button" className="ccs-primary" disabled={!!busy || !canPublish} onClick={() => save("published")}>Publish checkout</button>
    </div>
    {error && <p className="ccs-error" role="alert">{error}</p>}{notice && <p className="ccs-notice" role="status">{notice}</p>}
    <nav className="ccs-tabs" aria-label="Checkout sections">{[
      ["options", "Tickets & add-ons"], ["fields", "Registration fields"], ["appearance", "Words & appearance"]
    ].map(([id, label]) => <button key={id} type="button" className={activeTab === id ? "is-active" : ""} onClick={() => setActiveTab(id)}>{label}</button>)}</nav>
    {activeTab === "options" && <div className="ccs-stack"><p className="ccs-hint">Prices are authoritative on the server. Publishing synchronizes the live event ticket prices and checkout.</p>
      {working.items.map((row, i) => <div className="ccs-item" key={row.key}><div className="ccs-item-head"><strong>{i + 1}. {row.label || "Untitled entry"}</strong><span>
        <button type="button" disabled={i === 0} title="Move earlier" onClick={() => move("items", i, -1)}>↑</button>
        <button type="button" disabled={i === working.items.length - 1} title="Move later" onClick={() => move("items", i, 1)}>↓</button>
        <button type="button" title="Remove entry" disabled={working.items.length === 1} onClick={() => { edit("items", working.items.filter((_, n) => n !== i)); toggleParticipant(row.key, false); }}>Remove</button>
      </span></div><div className="ccs-cols">
        {field("Display name", <input value={row.label} maxLength={80} onChange={e => changeItem(i, "label", e.target.value)} />)}
        {field("Price (USD)", <input type="number" min="1" step="0.01" value={(Number(row.price_cents) / 100).toFixed(2)} onChange={e => changeItem(i, "price_cents", Math.round(Number(e.target.value) * 100))} />)}
        {field("Maximum quantity", <input type="number" min="1" max="40" value={row.max || 10} onChange={e => changeItem(i, "max", Number(e.target.value))} />)}
        {field("Description", <input value={row.note || ""} maxLength={240} onChange={e => changeItem(i, "note", e.target.value)} />)}
      </div><label className="ccs-check"><input type="checkbox" checked={(working.participant_items || []).includes(row.key)} onChange={e => toggleParticipant(row.key, e.target.checked)} />Collect a full name for each ticket of this type</label></div>)}
      <button type="button" className="ccs-add" disabled={working.items.length >= 12} onClick={addTicket}>+ Add entry or add-on</button>
    </div>}
    {activeTab === "fields" && <div className="ccs-stack"><p className="ccs-hint">Participant names are automatically repeated for each selected ticket when enabled above. Add other details here, such as vehicle or contact phone.</p>
      {working.fields.map((row, i) => <div className="ccs-item" key={row.key}><div className="ccs-item-head"><strong>{row.label}</strong><span><button type="button" disabled={i === 0} onClick={() => move("fields", i, -1)}>↑</button><button type="button" disabled={i === working.fields.length - 1} onClick={() => move("fields", i, 1)}>↓</button><button type="button" onClick={() => edit("fields", working.fields.filter((_, j) => i !== j))}>Remove</button></span></div><div className="ccs-cols">
        {field("Field label", <input value={row.label} onChange={e => changeField(i, "label", e.target.value)} />)}
        {field("Input type", <select value={row.type} onChange={e => changeField(i, "type", e.target.value)}>{["text", "email", "tel", "number"].map(t => <option key={t} value={t}>{t}</option>)}</select>)}
        {field("Placeholder", <input value={row.placeholder || ""} onChange={e => changeField(i, "placeholder", e.target.value)} />)}
        <label className="ccs-check"><input type="checkbox" checked={!!row.required} onChange={e => changeField(i, "required", e.target.checked)} />Required</label>
      </div></div>)}
      <button type="button" className="ccs-add" disabled={working.fields.length >= 8} onClick={addField}>+ Add registration field</button>
    </div>}
    {activeTab === "appearance" && <div className="ccs-stack ccs-cols">
      {[["eyebrow", "Eyebrow"], ["title", "Modal title"], ["subtitle", "Description"], ["items_title", "Ticket section heading"], ["details_title", "Details section heading"], ["submit_label", "Payment button label"], ["success_title", "Success title"], ["success_message", "Confirmation message"]].map(([k, label]) => field(label,
        k === "subtitle" || k === "success_message" ? <textarea rows="2" value={working[k] || ""} onChange={e => edit(k, e.target.value)} /> :
        <input value={working[k] || ""} onChange={e => edit(k, e.target.value)} />))}
      <label className="ccs-check"><input type="checkbox" checked={working.cover_fees?.enabled !== false} onChange={e => edit("cover_fees", { ...working.cover_fees, enabled: e.target.checked })} />Offer processing-fee coverage</label>
    </div>}
    {preview && <div className="ccs-preview-overlay" onMouseDown={e => { if (e.target === e.currentTarget) setPreview(false); }}><section className="ccs-preview" role="dialog" aria-modal="true" aria-label="Mobile checkout preview"><button className="ccs-preview-close" type="button" onClick={() => setPreview(false)} aria-label="Close preview">×</button>
      <span className="ccs-overline">{working.eyebrow || "COMPANIONS OF CPAS"}</span><h2>{working.title}</h2><p>{working.subtitle}</p>
      <div className="ccs-preview-panel"><strong>{working.items_title || "Choose your entries"}</strong>{previewItems.map(item => <div className="ccs-preview-item" key={item.key}><div><b>{item.label}</b><small>{money(item.price_cents)}</small></div><div className="ccs-preview-step"><button type="button" onClick={() => setPreviewSelected(a => ({ ...a, [item.key]: Math.max(0,(a[item.key] || 0) - 1) }))}>−</button><span>{previewSelected[item.key] || 0}</span><button type="button" onClick={() => setPreviewSelected(a => ({ ...a, [item.key]: (a[item.key] || 0) + 1 }))}>+</button></div></div>)}</div>
      <div className="ccs-preview-panel"><strong>{working.details_title || "Your details"}</strong><input placeholder="Email for receipt" disabled />{previewItems.flatMap(item => (working.participant_items || []).includes(item.key) ? Array.from({ length: previewSelected[item.key] || 0 }, (_, i) => <input key={item.key+i} placeholder={item.label + " " + (i+1) + " full name"} disabled />) : [])}{working.fields.map(f => <input key={f.key} placeholder={f.label + (f.required ? " *" : "")} disabled />)}</div>
      <div className="ccs-preview-panel"><strong>Payment details</strong><p className="ccs-preview-stripe">Stripe secure card / bank fields appear here on the live checkout.</p></div>
      <button className="ccs-preview-pay" disabled>Pay {money(previewTotal)} · preview only</button>
      <small className="ccs-preview-disclaimer">This preview never creates a payment or registration.</small>
    </section></div>}
  </section>;
}
window.CampaignCheckoutEditor = CampaignCheckoutEditor;
