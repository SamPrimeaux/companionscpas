/* Companions route host for the installed SDK app.
 * Never duplicate the editor, its presets or CSS inside this file.
 * Existing V1 route is a rollback fallback until SDK release is verified.
 */
function CmsInstalledFormStudioView({ onNavigate, formId = null }) {
  const [module, setModule] = React.useState(() => window.AgentSamFormStudio || null);
  const [presets, setPresets] = React.useState([]);
  const [error, setError] = React.useState("");
  const adapter = React.useMemo(() =>
    window.AgentSamCompanionsStudio?.createAdapter({ onNavigate }) || null, [onNavigate]);

  React.useEffect(() => {
    const ready = () => setModule(window.AgentSamFormStudio || null);
    window.addEventListener("agentsam-form-studio-ready", ready);
    ready();
    return () => window.removeEventListener("agentsam-form-studio-ready", ready);
  }, []);

  React.useEffect(() => {
    if (!module || !adapter) return;
    let active = true;
    window.AgentSamCompanionsStudio.loadPresets()
      .then(result => {
        if (active) setPresets(result.presets || []);
      })
      .catch(e => { if (active) setError(e.message || "Could not load Studio preset catalog."); });
    return () => { active = false; };
  }, [module, adapter]);

  const Studio = React.useMemo(
    () => module?.createFormStudioComponent?.(React) || null, [module]);
  if (!Studio || !adapter) {
    return formId
      ? React.createElement(CmsFormEditorView, { formId, onNavigate })
      : React.createElement(CmsFormsView, { onNavigate });
  }
  return React.createElement("div", {
    className: "cms-installed-form-studio",
    style: { flex: 1, display: "flex", flexDirection: "column", minHeight: 0, minWidth: 0 },
  },
    error ? React.createElement("p", { role: "alert", style: { padding: 10, color: "#a02020" } }, error) : null,
    React.createElement(Studio, {
      adapter, presets, initialResourceId: formId,
      onExit: () => onNavigate("cms-website"),
      title: "Forms, Modals & Checkouts",
    })
  );
}
