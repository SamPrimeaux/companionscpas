// ── CMS Forms Studio — list + builder (lives under Website CMS nav) ───────────
// Routes: /dashboard/cms/forms · /dashboard/cms/forms/:formId

const FORM_FIELD_TYPES = [
  { type: "text", label: "Short text", group: "Contact" },
  { type: "email", label: "Email", group: "Contact" },
  { type: "tel", label: "Phone", group: "Contact" },
  { type: "number", label: "Number", group: "Contact" },
  { type: "select", label: "Dropdown", group: "Choices" },
  { type: "radio", label: "Multiple choice", group: "Choices" },
  { type: "checkbox", label: "Checkbox", group: "Choices" },
  { type: "multiselect", label: "Multi-select", group: "Choices" },
  { type: "textarea", label: "Long answer", group: "Application" },
];

const FIELD_DEFAULTS = {
  text: { label: "Short answer", placeholder: "Enter your answer", is_required: false },
  email: { label: "Email address", placeholder: "you@example.com", is_required: true },
  tel: { label: "Phone number", placeholder: "(000) 000-0000", is_required: false },
  number: { label: "Number", placeholder: "0", is_required: false },
  select: { label: "Choose an option", placeholder: "Select…", is_required: false, options: ["Option one", "Option two"] },
  radio: { label: "Select one", placeholder: "", is_required: false, options: ["Yes", "No"] },
  checkbox: { label: "I agree", placeholder: "", is_required: false, options: [] },
  multiselect: { label: "Select all that apply", placeholder: "", is_required: false, options: ["Option one", "Option two"] },
  textarea: { label: "Long answer", placeholder: "Enter your response", is_required: false },
};

function formsNotify(setter, text, type = "ok") {
  setter({ text, type });
  setTimeout(() => setter({ text: "", type: "" }), 4000);
}

function FormsNotice({ n }) {
  if (!n?.text) return null;
  const isErr = n.type === "error";
  return React.createElement("div", {
    style: {
      padding: "10px 16px", borderRadius: 10, marginBottom: 14,
      background: isErr ? C.redDim : C.greenDim,
      border: `1px solid ${isErr ? C.red + "66" : C.green + "66"}`,
      color: isErr ? C.red : C.green, fontSize: 13, fontWeight: 500,
    },
  }, n.text);
}

function statusPill(statusUi) {
  const map = {
    published: { bg: "rgba(5,150,105,.1)", color: "#059669", label: "Published" },
    draft: { bg: "rgba(107,114,128,.1)", color: "#6b7280", label: "Draft" },
    paused: { bg: "rgba(217,119,6,.1)", color: "#d97706", label: "Paused" },
  };
  const s = map[statusUi] || map.draft;
  return React.createElement("span", {
    style: {
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "4px 10px", borderRadius: 99, fontSize: 11, fontWeight: 650,
      background: s.bg, color: s.color,
    },
  },
    React.createElement("span", { style: { width: 6, height: 6, borderRadius: "50%", background: s.color } }),
    s.label
  );
}

function relativeUpdated(iso) {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";
  const diff = Date.now() - t;
  if (diff < 3600000) return "Today";
  if (diff < 86400000 * 2) return "Yesterday";
  return new Date(iso).toLocaleDateString();
}

function newFieldId() {
  return `fld_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function slugKey(label) {
  return String(label || "field")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40) || "field";
}

// ── List ─────────────────────────────────────────────────────────────────────

function CmsFormsView({ onNavigate }) {
  const [forms, setForms] = React.useState([]);
  const [stats, setStats] = React.useState({});
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const [notice, setNotice] = React.useState({});
  const [creating, setCreating] = React.useState(false);
  const notify = (t, type) => formsNotify(setNotice, t, type);

  const load = React.useCallback(() => {
    setLoading(true);
    fetch("/api/cms/forms", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        setForms(d.forms || []);
        setStats(d.stats || {});
      })
      .catch(() => notify("Could not load forms", "error"))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const createForm = async (title) => {
    setCreating(true);
    try {
      const res = await fetch("/api/cms/forms", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: title || "New form" }),
      });
      const d = await res.json();
      if (!d.success || !d.form) {
        notify(d.error || "Create failed", "error");
        return;
      }
      onNavigate("cms-form-editor", { formId: d.form.id });
    } catch (e) {
      notify(e.message || "Create failed", "error");
    } finally {
      setCreating(false);
    }
  };

  const filtered = forms.filter((f) => {
    if (filter === "published" && f.status_ui !== "published") return false;
    if (filter === "drafts" && f.status_ui !== "draft") return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(f.title || "").toLowerCase().includes(q) && !(f.form_key || "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const cell = { color: C.textMut, fontSize: 12 };
  const rowStyle = {
    display: "grid",
    gridTemplateColumns: "minmax(220px,1.7fr) .7fr 1fr .65fr .8fr",
    alignItems: "center",
    minHeight: 58,
    padding: "0 16px",
    borderTop: `1px solid ${C.border}`,
    cursor: "pointer",
  };

  return React.createElement("div", { className: "dash-page", style: { padding: "28px 28px 60px", flex: 1 } },
    React.createElement(FormsNotice, { n: notice }),
    React.createElement("div", { style: { display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 22, flexWrap: "wrap" } },
      React.createElement("div", { style: { flex: 1, minWidth: 200 } },
        React.createElement("div", { style: { color: C.purpleL, fontSize: 10, fontWeight: 760, letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 6 } }, "Content operations"),
        React.createElement("h1", { style: { margin: 0, fontSize: 26, fontWeight: 800, color: C.text, letterSpacing: "-.03em" } }, "Forms and applications"),
        React.createElement("p", { style: { margin: "8px 0 0", maxWidth: 560, color: C.textSec, fontSize: 13, lineHeight: 1.5 } },
          "Create, publish, and manage how people apply and get in touch — no code required. Appearance follows Brand & Settings.")
      ),
      React.createElement(Btn, {
        variant: "primary",
        icon: "plus",
        disabled: creating,
        onClick: () => createForm("New form"),
      }, creating ? "Creating…" : "Create form")
    ),

    React.createElement("div", {
      style: {
        display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
        border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden",
        background: C.surface, marginBottom: 18,
      },
    },
      [
        [stats.total ?? forms.length, "Total forms"],
        [stats.published ?? 0, "Published"],
        [stats.awaiting_review ?? 0, "Submissions"],
      ].map(([val, label], i) =>
        React.createElement("div", {
          key: label,
          style: { padding: "16px 18px", borderLeft: i ? `1px solid ${C.border}` : "none" },
        },
          React.createElement("strong", { style: { display: "block", fontSize: 20, color: C.text } }, val),
          React.createElement("span", { style: { fontSize: 11, color: C.textMut } }, label)
        )
      )
    ),

    React.createElement("div", { style: { display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap", alignItems: "center" } },
      React.createElement("div", {
        style: { display: "flex", gap: 3, padding: 3, background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 9 },
      },
        [["all", "All"], ["published", "Published"], ["drafts", "Drafts"]].map(([k, label]) =>
          React.createElement("button", {
            key: k,
            type: "button",
            onClick: () => setFilter(k),
            style: {
              border: 0, borderRadius: 6, padding: "7px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600,
              background: filter === k ? C.surface : "transparent",
              color: filter === k ? C.text : C.textMut,
              boxShadow: filter === k ? `inset 0 0 0 1px ${C.border}` : "none",
              fontFamily: "var(--font-ui)",
            },
          }, label)
        )
      ),
      React.createElement("input", {
        value: search,
        onChange: (e) => setSearch(e.target.value),
        placeholder: "Search forms",
        style: {
          marginLeft: "auto", width: 220, maxWidth: "100%", height: 34,
          padding: "0 12px", borderRadius: 9, border: `1px solid ${C.border}`,
          background: C.surface, color: C.text, fontSize: 13, fontFamily: "var(--font-ui)",
        },
      })
    ),

    React.createElement("div", {
      style: { border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", background: C.surface },
    },
      React.createElement("div", {
        style: { ...rowStyle, minHeight: 40, cursor: "default", borderTop: 0, background: C.bg2, color: C.textMut, fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" },
      },
        React.createElement("div", null, "Form"),
        React.createElement("div", null, "Status"),
        React.createElement("div", null, "Placement"),
        React.createElement("div", null, "Submissions"),
        React.createElement("div", null, "Updated")
      ),
      loading && React.createElement("div", { style: { padding: 28, color: C.textMut, fontSize: 13 } }, "Loading forms…"),
      !loading && !filtered.length && React.createElement("div", { style: { padding: 28, color: C.textMut, fontSize: 13 } }, "No forms match."),
      !loading && filtered.map((f) =>
        React.createElement("div", {
          key: f.id,
          style: rowStyle,
          onClick: () => onNavigate("cms-form-editor", { formId: f.id }),
          onMouseEnter: (e) => { e.currentTarget.style.background = C.bg2; },
          onMouseLeave: (e) => { e.currentTarget.style.background = "transparent"; },
        },
          React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, minWidth: 0 } },
            React.createElement("div", {
              style: {
                width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                display: "grid", placeItems: "center",
                background: C.purpleDim, color: C.purpleL, border: `1px solid ${C.border}`,
              },
            }, React.createElement(Icon, { name: "docs", size: 15 })),
            React.createElement("div", { style: { minWidth: 0 } },
              React.createElement("strong", { style: { display: "block", fontSize: 13, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, f.title),
              React.createElement("small", { style: { color: C.textMut, fontSize: 11 } }, `${f.field_count || 0} fields · ${f.form_key || f.id}`)
            )
          ),
          React.createElement("div", null, statusPill(f.status_ui)),
          React.createElement("div", { style: cell }, f.placement || "Not placed"),
          React.createElement("div", { style: { ...cell, fontVariantNumeric: "tabular-nums" } }, f.submissions ?? 0),
          React.createElement("div", { style: cell }, relativeUpdated(f.updated_at))
        )
      )
    )
  );
}

// ── Builder ──────────────────────────────────────────────────────────────────

function FakeControl({ field }) {
  const type = field.field_type || field.type;
  const box = {
    minHeight: 40, display: "flex", alignItems: "center", padding: "0 12px",
    color: "#9ca3af", border: "1px solid #e5e7eb", borderRadius: 10, background: "#fff", fontSize: 12,
  };
  if (type === "textarea") return React.createElement("div", { style: { ...box, minHeight: 72, alignItems: "flex-start", paddingTop: 10 } }, field.placeholder || "…");
  if (type === "select" || type === "radio" || type === "multiselect") {
    return React.createElement("div", { style: { ...box, justifyContent: "space-between" } },
      field.placeholder || "Select an answer",
      React.createElement("span", null, "⌄")
    );
  }
  if (type === "checkbox") {
    return React.createElement("div", { style: { display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12, color: "#4b5563", lineHeight: 1.4 } },
      React.createElement("span", { style: { width: 15, height: 15, border: "1px solid #d1d5db", borderRadius: 4, background: "#fff", flexShrink: 0, marginTop: 1 } }),
      field.label
    );
  }
  return React.createElement("div", { style: box }, field.placeholder || "Enter an answer");
}

function CmsFormEditorView({ formId, onNavigate }) {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [saveState, setSaveState] = React.useState("Saved");
  const [tab, setTab] = React.useState("build");
  const [notice, setNotice] = React.useState({});
  const [form, setForm] = React.useState(null);
  const [steps, setSteps] = React.useState([]);
  const [fields, setFields] = React.useState([]);
  const [selectedId, setSelectedId] = React.useState(null);
  const [device, setDevice] = React.useState("desktop");
  const [fieldSearch, setFieldSearch] = React.useState("");
  const [dragId, setDragId] = React.useState(null);
  const notify = (t, type) => formsNotify(setNotice, t, type);

  const load = React.useCallback(() => {
    if (!formId) return;
    setLoading(true);
    fetch(`/api/cms/forms/${encodeURIComponent(formId)}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) {
          notify(d.error || "Form not found", "error");
          return;
        }
        setForm(d.form);
        setSteps(d.steps || []);
        setFields(d.fields || []);
        setSelectedId((d.fields || [])[0]?.id || null);
      })
      .catch((e) => notify(e.message || "Load failed", "error"))
      .finally(() => setLoading(false));
  }, [formId]);

  React.useEffect(() => { load(); }, [load]);

  const markDirty = () => setSaveState("Unsaved changes");

  const updateField = (id, patch) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
    markDirty();
  };

  const addField = (type) => {
    const defaults = FIELD_DEFAULTS[type] || FIELD_DEFAULTS.text;
    const id = newFieldId();
    const stepId = steps[0]?.id || null;
    const field = {
      id,
      step_id: stepId,
      field_key: slugKey(defaults.label) + "_" + Math.random().toString(36).slice(2, 5),
      label: defaults.label,
      placeholder: defaults.placeholder || "",
      field_type: type,
      is_required: !!defaults.is_required,
      options: defaults.options || [],
      validation: {},
      sort_order: (fields.length + 1) * 10,
      is_system: false,
    };
    const idx = fields.findIndex((f) => f.id === selectedId);
    const next = [...fields];
    next.splice(idx >= 0 ? idx + 1 : next.length, 0, field);
    setFields(next);
    setSelectedId(id);
    markDirty();
    notify(`${defaults.label} added`);
  };

  const deleteField = (id) => {
    const f = fields.find((x) => x.id === id);
    if (f?.is_system) {
      notify("System fields cannot be deleted — uncheck required or relabel instead.", "error");
      return;
    }
    const idx = fields.findIndex((x) => x.id === id);
    const next = fields.filter((x) => x.id !== id);
    setFields(next);
    setSelectedId(next[Math.max(0, idx - 1)]?.id || null);
    markDirty();
  };

  const duplicateField = (id) => {
    const f = fields.find((x) => x.id === id);
    if (!f) return;
    const copy = {
      ...f,
      id: newFieldId(),
      field_key: slugKey(f.label) + "_copy_" + Math.random().toString(36).slice(2, 4),
      label: f.label + " copy",
      is_system: false,
    };
    const idx = fields.findIndex((x) => x.id === id);
    const next = [...fields];
    next.splice(idx + 1, 0, copy);
    setFields(next);
    setSelectedId(copy.id);
    markDirty();
  };

  const reorder = (sourceId, targetId) => {
    if (!sourceId || sourceId === targetId) return;
    const next = [...fields];
    const from = next.findIndex((f) => f.id === sourceId);
    const to = next.findIndex((f) => f.id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setFields(next);
    markDirty();
  };

  const save = async (andPublish = false) => {
    if (!form) return;
    setSaving(true);
    setSaveState("Saving…");
    try {
      const payload = {
        title: form.title,
        description: form.description,
        status: andPublish ? "active" : (form.status_ui === "published" ? "active" : form.status),
        intro: form.intro || {},
        settings: {
          ...(form.settings || {}),
          submit_label: form.settings?.submit_label || "Submit Application",
          success_message: form.settings?.success_message || form.settings?.success_message,
        },
        steps: steps.map((s, i) => ({ ...s, sort_order: (i + 1) * 10 })),
        fields: fields.map((f, i) => ({
          id: f.id,
          step_id: f.step_id || steps[0]?.id,
          field_key: f.field_key,
          label: f.label,
          placeholder: f.placeholder,
          field_type: f.field_type,
          is_required: !!f.is_required,
          options: f.options || [],
          validation: f.validation || {},
          sort_order: (i + 1) * 10,
        })),
      };
      const res = await fetch(`/api/cms/forms/${encodeURIComponent(form.id)}/save`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!d.success) {
        notify(d.error || "Save failed", "error");
        setSaveState("Save failed");
        return;
      }
      setForm(d.form);
      setSteps(d.steps || []);
      setFields(d.fields || []);
      if (andPublish) {
        const pub = await fetch(`/api/cms/forms/${encodeURIComponent(form.id)}/publish`, {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status: "active" }),
        }).then((r) => r.json());
        if (pub.success) {
          setForm((p) => ({ ...p, status: "active", status_ui: "published" }));
          notify("Form published");
        } else notify(pub.error || "Publish failed", "error");
      } else {
        notify("Form saved");
      }
      setSaveState("Saved just now");
    } catch (e) {
      notify(e.message || "Save failed", "error");
      setSaveState("Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form) {
    return React.createElement("div", { style: { padding: 28, color: C.textMut } }, loading ? "Loading form…" : "Form not found.");
  }

  const selected = fields.find((f) => f.id === selectedId);
  const groups = {};
  FORM_FIELD_TYPES.forEach((t) => {
    if (fieldSearch && !t.label.toLowerCase().includes(fieldSearch.toLowerCase())) return;
    (groups[t.group] = groups[t.group] || []).push(t);
  });

  const intro = form.intro || {};
  const settings = form.settings || {};

  const toolbarBtn = (label, active, onClick) =>
    React.createElement("button", {
      type: "button",
      onClick,
      style: {
        height: 45, padding: "0 14px", border: 0, cursor: "pointer",
        background: "transparent", fontSize: 12, fontWeight: 650,
        color: active ? C.text : C.textMut,
        borderBottom: active ? `2px solid ${C.purple}` : "2px solid transparent",
        fontFamily: "var(--font-ui)",
      },
    }, label);

  return React.createElement("div", {
    className: "cms-form-studio",
    style: { display: "flex", flexDirection: "column", flex: 1, minHeight: 0, background: C.bg },
  },
    React.createElement(FormsNotice, { n: notice }),

    // Top bar
    React.createElement("div", {
      style: {
        display: "flex", alignItems: "center", gap: 10, padding: "10px 16px",
        borderBottom: `1px solid ${C.border}`, background: C.surface, flexShrink: 0,
      },
    },
      React.createElement("button", {
        type: "button",
        onClick: () => onNavigate("cms-forms"),
        style: { border: 0, background: "transparent", color: C.textMut, cursor: "pointer", fontSize: 12, fontFamily: "var(--font-ui)" },
      }, "Forms"),
      React.createElement("span", { style: { color: C.textMut } }, "/"),
      React.createElement("strong", { style: { fontSize: 13, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, form.title),
      statusPill(form.status_ui),
      React.createElement("span", { style: { marginLeft: "auto", fontSize: 11, color: C.textMut } }, saveState),
      React.createElement(Btn, { size: "sm", variant: "secondary", disabled: saving, onClick: () => save(false) }, saving ? "Saving…" : "Save"),
      React.createElement(Btn, { size: "sm", variant: "primary", disabled: saving, onClick: () => save(true) }, "Publish")
    ),

    // Tabs
    React.createElement("div", {
      style: { display: "flex", gap: 2, padding: "0 12px", borderBottom: `1px solid ${C.border}`, background: C.surface, flexShrink: 0 },
    },
      toolbarBtn("Build", tab === "build", () => setTab("build")),
      toolbarBtn("Settings", tab === "settings", () => setTab("settings")),
      toolbarBtn("Delivery", tab === "delivery", () => setTab("delivery"))
    ),

    tab === "build" && React.createElement("div", {
      style: {
        flex: 1, minHeight: 0, display: "grid",
        gridTemplateColumns: "240px minmax(0,1fr) 280px",
      },
    },
      // Left: add fields
      React.createElement("aside", {
        style: { borderRight: `1px solid ${C.border}`, overflow: "auto", background: C.surface },
      },
        React.createElement("div", { style: { padding: "14px 14px 10px", borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, background: C.surface, zIndex: 1 } },
          React.createElement("strong", { style: { display: "block", fontSize: 12, color: C.text } }, "Add fields"),
          React.createElement("span", { style: { fontSize: 11, color: C.textMut } }, "Click a type to insert it.")
        ),
        React.createElement("div", { style: { padding: "10px 12px" } },
          React.createElement("input", {
            value: fieldSearch,
            onChange: (e) => setFieldSearch(e.target.value),
            placeholder: "Find a field",
            style: {
              width: "100%", height: 32, padding: "0 10px", boxSizing: "border-box",
              border: `1px solid ${C.border}`, borderRadius: 8, background: C.bg2, color: C.text, fontSize: 12,
            },
          })
        ),
        Object.keys(groups).map((g) =>
          React.createElement("div", { key: g, style: { padding: "8px 12px 12px" } },
            React.createElement("div", { style: { fontSize: 10, fontWeight: 760, color: C.textMut, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 8 } }, g),
            React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 } },
              groups[g].map((t) =>
                React.createElement("button", {
                  key: t.type,
                  type: "button",
                  onClick: () => addField(t.type),
                  style: {
                    minHeight: 52, padding: "8px 9px", textAlign: "left", cursor: "pointer",
                    border: `1px solid ${C.border}`, borderRadius: 9, background: C.bg2,
                    color: C.text, fontSize: 11, fontFamily: "var(--font-ui)",
                  },
                }, t.label)
              )
            )
          )
        )
      ),

      // Center: canvas
      React.createElement("div", {
        style: {
          overflow: "auto",
          background: `
            linear-gradient(${C.border} 1px, transparent 1px),
            linear-gradient(90deg, ${C.border} 1px, transparent 1px),
            ${C.bg2}`,
          backgroundSize: "24px 24px, 24px 24px, auto",
          padding: "20px 16px 48px",
        },
      },
        React.createElement("div", { style: { display: "flex", justifyContent: "center", gap: 4, marginBottom: 14 } },
          ["desktop", "mobile"].map((d) =>
            React.createElement("button", {
              key: d,
              type: "button",
              onClick: () => setDevice(d),
              style: {
                height: 30, padding: "0 12px", borderRadius: 8, cursor: "pointer", fontSize: 11, fontWeight: 650,
                border: `1px solid ${device === d ? C.purple : C.border}`,
                background: device === d ? C.purpleDim : C.surface,
                color: device === d ? C.purpleL : C.textMut,
                textTransform: "capitalize", fontFamily: "var(--font-ui)",
              },
            }, d)
          )
        ),
        React.createElement("div", {
          style: {
            width: device === "mobile" ? 390 : "min(100%, 720px)",
            margin: "0 auto",
            borderRadius: 14,
            border: `1px solid ${C.borderStr}`,
            background: "#f8f8fa",
            color: "#16171c",
            boxShadow: "0 20px 60px rgba(0,0,0,.12)",
            overflow: "hidden",
            transition: "width .2s ease",
          },
        },
          React.createElement("div", {
            style: {
              height: 52, display: "flex", alignItems: "center", padding: "0 20px",
              borderBottom: "1px solid #e5e7eb", background: "rgba(255,255,255,.9)", fontWeight: 700, fontSize: 12,
            },
          }, "Companions of CPAS"),
          React.createElement("div", { style: { padding: device === "mobile" ? "28px 18px 40px" : "40px 28px 48px" } },
            React.createElement("div", { style: { color: C.purple, fontSize: 10, fontWeight: 780, letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 8 } },
              intro.eyebrow || "Get involved"),
            React.createElement("h2", { style: { margin: 0, fontSize: device === "mobile" ? 24 : 28, letterSpacing: "-.03em", color: "#15161a" } },
              intro.heading || form.title),
            React.createElement("p", { style: { color: "#6b7280", fontSize: 13, lineHeight: 1.5, margin: "10px 0 22px", maxWidth: 520 } },
              intro.subheading || form.description || ""),
            React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } },
              fields.map((f) => {
                const half = ["text", "email", "tel", "number", "select"].includes(f.field_type) && fields.length > 2;
                const selectedStyle = f.id === selectedId;
                return React.createElement("div", {
                  key: f.id,
                  draggable: true,
                  onDragStart: () => setDragId(f.id),
                  onDragOver: (e) => e.preventDefault(),
                  onDrop: () => { reorder(dragId, f.id); setDragId(null); },
                  onClick: () => setSelectedId(f.id),
                  style: {
                    gridColumn: half ? "span 1" : "span 2",
                    padding: 8, margin: -4, borderRadius: 12, cursor: "pointer",
                    border: `1px solid ${selectedStyle ? C.purple : "transparent"}`,
                    background: selectedStyle ? "rgba(123,47,190,.06)" : "transparent",
                    boxShadow: selectedStyle ? `0 0 0 3px ${C.purpleDim}` : "none",
                  },
                },
                  f.field_type !== "checkbox" && React.createElement("div", {
                    style: { display: "flex", gap: 4, marginBottom: 6, fontSize: 11, fontWeight: 680, color: "#292b31" },
                  }, f.label, f.is_required ? React.createElement("span", { style: { color: "#e44e5e" } }, "*") : null),
                  React.createElement(FakeControl, { field: f })
                );
              })
            ),
            React.createElement("button", {
              type: "button",
              style: {
                marginTop: 22, height: 42, padding: "0 20px", border: 0, borderRadius: 10,
                background: C.purple, color: "#fff", fontWeight: 700, fontSize: 12, cursor: "default",
              },
            }, settings.submit_label || "Continue application")
          )
        )
      ),

      // Right: inspector
      React.createElement("aside", {
        style: { borderLeft: `1px solid ${C.border}`, overflow: "auto", background: C.surface },
      },
        React.createElement("div", { style: { padding: "14px 14px 10px", borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, background: C.surface, zIndex: 1 } },
          React.createElement("strong", { style: { display: "block", fontSize: 12 } }, "Field settings"),
          React.createElement("span", { style: { fontSize: 11, color: C.textMut } },
            selected ? (selected.field_type || "field") : "Select a field to customize it.")
        ),
        React.createElement("div", { style: { padding: 14 } },
          !selected && React.createElement("div", { style: { color: C.textMut, fontSize: 12, lineHeight: 1.5 } },
            "Choose any question in the live preview to edit wording, validation, and options."),
          selected && React.createElement(React.Fragment, null,
            React.createElement("label", { style: { display: "block", fontSize: 10, fontWeight: 650, color: C.textSec, marginBottom: 6, textTransform: "uppercase" } }, "Question label"),
            React.createElement("textarea", {
              value: selected.label || "",
              onChange: (e) => updateField(selected.id, { label: e.target.value }),
              style: {
                width: "100%", minHeight: 64, boxSizing: "border-box", marginBottom: 12,
                padding: 10, borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg2, color: C.text, fontSize: 12,
              },
            }),
            selected.field_type !== "checkbox" && React.createElement(React.Fragment, null,
              React.createElement("label", { style: { display: "block", fontSize: 10, fontWeight: 650, color: C.textSec, marginBottom: 6, textTransform: "uppercase" } }, "Placeholder"),
              React.createElement("input", {
                value: selected.placeholder || "",
                onChange: (e) => updateField(selected.id, { placeholder: e.target.value }),
                style: {
                  width: "100%", height: 34, boxSizing: "border-box", marginBottom: 12,
                  padding: "0 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg2, color: C.text, fontSize: 12,
                },
              })
            ),
            ["select", "radio", "multiselect"].includes(selected.field_type) && React.createElement(React.Fragment, null,
              React.createElement("label", { style: { display: "block", fontSize: 10, fontWeight: 650, color: C.textSec, marginBottom: 6, textTransform: "uppercase" } }, "Options (one per line)"),
              React.createElement("textarea", {
                value: (selected.options || []).join("\n"),
                onChange: (e) => updateField(selected.id, {
                  options: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                }),
                style: {
                  width: "100%", minHeight: 90, boxSizing: "border-box", marginBottom: 12,
                  padding: 10, borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg2, color: C.text, fontSize: 12,
                },
              })
            ),
            React.createElement("label", {
              style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, fontSize: 12, color: C.text },
            },
              "Required field",
              React.createElement("input", {
                type: "checkbox",
                checked: !!selected.is_required,
                onChange: (e) => updateField(selected.id, { is_required: e.target.checked }),
              })
            ),
            selected.is_system && React.createElement("div", {
              style: { fontSize: 11, color: C.textMut, marginBottom: 12, padding: 10, borderRadius: 8, background: C.bg2 },
            }, "System field — required for submissions. You can relabel it but not delete it."),
            React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 } },
              React.createElement(Btn, { size: "sm", variant: "secondary", onClick: () => duplicateField(selected.id) }, "Duplicate"),
              React.createElement(Btn, {
                size: "sm",
                variant: "ghost",
                disabled: selected.is_system,
                onClick: () => deleteField(selected.id),
              }, "Delete")
            )
          )
        )
      )
    ),

    tab === "settings" && React.createElement("div", { style: { flex: 1, overflow: "auto", padding: "28px clamp(18px,4vw,48px)" } },
      React.createElement("h2", { style: { margin: "0 0 6px", fontSize: 20, color: C.text } }, "Form settings"),
      React.createElement("p", { style: { margin: "0 0 20px", color: C.textSec, fontSize: 13 } },
        "Copy and publish state. Colors and logos come from Brand & Settings — not a separate form theme."),
      React.createElement("div", {
        style: { maxWidth: 520, display: "grid", gap: 14, padding: 18, border: `1px solid ${C.border}`, borderRadius: 12, background: C.surface },
      },
        [["Title", "title", form.title], ["Description", "description", form.description || ""]].map(([label, key, val]) =>
          React.createElement("div", { key: key },
            React.createElement("label", { style: { display: "block", fontSize: 10, fontWeight: 700, color: C.textSec, marginBottom: 6, textTransform: "uppercase" } }, label),
            key === "description"
              ? React.createElement("textarea", {
                value: val,
                onChange: (e) => { setForm((p) => ({ ...p, description: e.target.value })); markDirty(); },
                style: { width: "100%", minHeight: 70, boxSizing: "border-box", padding: 10, borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg2, color: C.text },
              })
              : React.createElement("input", {
                value: val,
                onChange: (e) => { setForm((p) => ({ ...p, title: e.target.value })); markDirty(); },
                style: { width: "100%", height: 36, boxSizing: "border-box", padding: "0 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg2, color: C.text },
              })
          )
        ),
        React.createElement("div", null,
          React.createElement("label", { style: { display: "block", fontSize: 10, fontWeight: 700, color: C.textSec, marginBottom: 6, textTransform: "uppercase" } }, "Intro heading"),
          React.createElement("input", {
            value: intro.heading || "",
            onChange: (e) => { setForm((p) => ({ ...p, intro: { ...(p.intro || {}), heading: e.target.value } })); markDirty(); },
            style: { width: "100%", height: 36, boxSizing: "border-box", padding: "0 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg2, color: C.text },
          })
        ),
        React.createElement("div", null,
          React.createElement("label", { style: { display: "block", fontSize: 10, fontWeight: 700, color: C.textSec, marginBottom: 6, textTransform: "uppercase" } }, "Intro subheading"),
          React.createElement("textarea", {
            value: intro.subheading || "",
            onChange: (e) => { setForm((p) => ({ ...p, intro: { ...(p.intro || {}), subheading: e.target.value } })); markDirty(); },
            style: { width: "100%", minHeight: 70, boxSizing: "border-box", padding: 10, borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg2, color: C.text },
          })
        ),
        React.createElement("div", null,
          React.createElement("label", { style: { display: "block", fontSize: 10, fontWeight: 700, color: C.textSec, marginBottom: 6, textTransform: "uppercase" } }, "Submit button label"),
          React.createElement("input", {
            value: settings.submit_label || "",
            onChange: (e) => { setForm((p) => ({ ...p, settings: { ...(p.settings || {}), submit_label: e.target.value } })); markDirty(); },
            style: { width: "100%", height: 36, boxSizing: "border-box", padding: "0 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg2, color: C.text },
          })
        ),
        React.createElement("div", null,
          React.createElement("label", { style: { display: "block", fontSize: 10, fontWeight: 700, color: C.textSec, marginBottom: 6, textTransform: "uppercase" } }, "Success message"),
          React.createElement("textarea", {
            value: settings.success_message || "",
            onChange: (e) => { setForm((p) => ({ ...p, settings: { ...(p.settings || {}), success_message: e.target.value } })); markDirty(); },
            style: { width: "100%", minHeight: 70, boxSizing: "border-box", padding: 10, borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg2, color: C.text },
          })
        ),
        React.createElement("div", {
          style: { padding: 12, borderRadius: 10, background: C.purpleDim, color: C.purpleL, fontSize: 12, lineHeight: 1.45 },
        },
          "Brand colors and logos are managed in ",
          React.createElement("button", {
            type: "button",
            onClick: () => onNavigate("cms-brand"),
            style: { border: 0, background: "transparent", color: C.purple, fontWeight: 700, cursor: "pointer", padding: 0, fontFamily: "var(--font-ui)" },
          }, "Brand & Settings"),
          "."
        )
      )
    ),

    tab === "delivery" && React.createElement("div", { style: { flex: 1, overflow: "auto", padding: "28px clamp(18px,4vw,48px)" } },
      React.createElement("h2", { style: { margin: "0 0 6px", fontSize: 20, color: C.text } }, "Delivery"),
      React.createElement("p", { style: { margin: "0 0 20px", color: C.textSec, fontSize: 13 } },
        "Publish makes this schema available to the public foster modal and page CTAs."),
      React.createElement("div", {
        style: { maxWidth: 640, display: "grid", gap: 12 },
      },
        React.createElement("div", {
          style: { display: "flex", alignItems: "center", gap: 12, padding: 16, border: `1px solid ${C.border}`, borderRadius: 12, background: C.surface },
        },
          React.createElement("div", { style: { flex: 1 } },
            React.createElement("strong", { style: { display: "block", fontSize: 13 } }, "Public schema"),
            React.createElement("span", { style: { fontSize: 12, color: C.textMut } }, `/api/public/forms/${form.form_key}`)
          ),
          statusPill(form.status_ui)
        ),
        React.createElement("div", {
          style: { display: "flex", alignItems: "center", gap: 12, padding: 16, border: `1px solid ${C.border}`, borderRadius: 12, background: C.surface },
        },
          React.createElement("div", { style: { flex: 1 } },
            React.createElement("strong", { style: { display: "block", fontSize: 13 } }, "Submissions inbox"),
            React.createElement("span", { style: { fontSize: 12, color: C.textMut } }, "Foster applications appear under Applications")
          ),
          React.createElement(Btn, { size: "sm", variant: "secondary", onClick: () => onNavigate("applications") }, "Open Applications")
        ),
        React.createElement("div", { style: { display: "flex", gap: 8, marginTop: 8 } },
          React.createElement(Btn, { variant: "primary", disabled: saving, onClick: () => save(true) }, "Save & publish"),
          form.status_ui === "published" && React.createElement(Btn, {
            variant: "secondary",
            disabled: saving,
            onClick: async () => {
              const pub = await fetch(`/api/cms/forms/${encodeURIComponent(form.id)}/publish`, {
                method: "POST",
                credentials: "include",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ status: "paused" }),
              }).then((r) => r.json());
              if (pub.success) {
                setForm((p) => ({ ...p, status: "paused", status_ui: "paused" }));
                notify("Form paused");
              }
            },
          }, "Pause form")
        )
      )
    )
  );
}

Object.assign(window, { CmsFormsView, CmsFormEditorView });
