/* Companions data adapter for the installed AgentSam Form & Modal Studio.
 * Site ownership, D1, auth, payment and submissions stay in Companions.
 * Generic visual editing lives in @inneranimalmedia/ecommerce-cms-agentsam.
 */
(function (root) {
  "use strict";
  const resourceKinds = new Set(["form", "modal", "checkout"]);
  const requests = { credentials: "include", cache: "no-store" };
  const capabilities = Object.freeze({
    "forms.create": true, "forms.edit": true, "forms.publish": true,
    "forms.safePublishedDraft": false,
    "modals.create": false, "modals.edit": false, "modals.publish": false,
    "checkouts.create": false, "checkouts.edit": false, "checkouts.publish": false,
    "checkouts.openSource": true,
  });
  const key = (v) => encodeURIComponent(String(v ?? ""));
  const json = async (fetcher, url, options = {}) => {
    const response = await fetcher(url, { ...requests, ...options });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.success) {
      throw Error(body.error || "Studio API unavailable (" + response.status + ")");
    }
    return body;
  };
  function createAdapter({ onNavigate, fetcher = root.fetch.bind(root) } = {}) {
    if (typeof onNavigate !== "function") throw Error("Companions Studio navigation missing");
    let resources = [];
    const adapter = {
      capabilities,
      async listResources() {
        const [forms, catalog] = await Promise.all([
          json(fetcher, "/api/cms/forms"),
          json(fetcher, "/api/cms/studio/catalog"),
        ]);
        resources = [
          ...(forms.forms || []).map(row => ({
            id: row.id, kind: "form", title: row.title,
            key: row.form_key, description: row.description || "",
            status: row.status, placement: row.placement || null,
            field_count: row.field_count, submissions: row.submissions,
          })),
          ...(catalog.modals || []).map(row => ({
            ...row, kind: "modal", placement: "Overlay", legacy: true,
          })),
          ...(catalog.checkouts || []).map(row => ({
            ...row, kind: "checkout", placement: "Campaign",
            campaignRef: row.campaign_ref,
          })),
        ];
        return resources;
      },
      async getResource(reference) {
        if (!reference || !resourceKinds.has(reference.kind)) throw Error("Unknown studio resource");
        if (reference.kind !== "form") {
          const match = resources.find(r => r.id === reference.id && r.kind === reference.kind);
          if (!match) throw Error("Resource does not exist");
          return { ...match, fields: [], settings: {}, intro: {} };
        }
        const data = await json(fetcher, "/api/cms/forms/" + key(reference.id));
        const f = data.form;
        return {
          id: f.id, kind: "form", key: f.form_key, title: f.title,
          description: f.description || "", status: f.status,
          intro: f.intro || {}, settings: f.settings || {},
          fields: data.fields || [], steps: data.steps || [],
        };
      },
      async createFromPreset(preset) {
        if (preset.kind !== "form" || preset.capability !== "forms.create") {
          throw Error("This preset is not installed in the Companions form backend.");
        }
        const created = await json(fetcher, "/api/cms/forms", {
          method: "POST", headers: { "content-type": "application/json", "X-AgentSam-Studio": "form-studio" },
          body: JSON.stringify({ template_key: preset.key, title: preset.title }),
        });
        return adapter.getResource({ id: created.form.id, kind: "form" });
      },
      async saveResource(resource) {
        if (resource.kind !== "form") throw Error("This resource does not have a writable adapter.");
        // Existing Forms API currently saves straight into published records.
        // Keep those read-only until versioned safe-draft support is installed.
        if (resource.status === "active" || resource.status === "published") {
          throw Error("Published form drafts are not yet supported; live form was not changed.");
        }
        const saved = await json(fetcher, "/api/cms/forms/" + key(resource.id) + "/save", {
          method: "POST",
          headers: { "content-type": "application/json", "X-AgentSam-Studio": "form-studio" },
          body: JSON.stringify({
            title: resource.title, description: resource.description || "",
            status: "draft", intro: resource.intro, settings: resource.settings,
            steps: resource.steps, fields: resource.fields,
          }),
        });
        return {
          ...resource, id: saved.form.id, fields: saved.fields || [],
          steps: saved.steps || [], settings: saved.form.settings || resource.settings,
          intro: saved.form.intro || resource.intro, status: saved.form.status,
        };
      },
      async publishResource(resource) {
        if (resource.kind !== "form") throw Error("Publishing is not installed for this resource.");
        if (resource.status === "active") throw Error("This form is already published.");
        await json(fetcher, "/api/cms/forms/" + key(resource.id) + "/publish", {
          method: "POST", headers: { "content-type": "application/json",
            "X-AgentSam-Studio": "form-studio" }, body: JSON.stringify({ status: "active" }),
        });
        return adapter.getResource(resource);
      },
      openSource(resource) {
        if (resource.kind !== "checkout" || !resource.campaignRef) return;
        onNavigate("campaign-detail", { campaignId: resource.campaignRef });
      },
    };
    return adapter;
  }

  async function loadPresets(fetcher = root.fetch.bind(root)) {
    const [presetResponse, available] = await Promise.all([
      fetcher("/dashboard/apps/form-studio/presets.json", requests),
      json(fetcher, "/api/cms/forms"),
    ]);
    if (!presetResponse.ok) throw Error("Installed Form Studio preset registry is unavailable.");
    const catalog = await presetResponse.json();
    const installed = new Set((available.templates || []).map(t => t.key));
    const mapped = (catalog.presets || []).map(p => ({
      ...p,
      capability: p.kind === "form" && installed.has(p.key)
        ? "forms.create" : p.kind + "s.create." + p.key,
    }));
    // Supports newly-added server templates without custom UI code.
    for (const remote of available.templates || []) {
      if (!mapped.some(p => p.key === remote.key && p.kind === "form")) {
        mapped.push({ ...remote, kind: "form", capability: "forms.create",
          description: remote.description || "Reusable form" });
      }
    }
    const formCapabilities = {};
    for (const name of installed) formCapabilities["forms.create." + name] = true;
    return { presets: mapped, capabilities: formCapabilities };
  }

  root.AgentSamCompanionsStudio = { createAdapter, loadPresets, capabilities };
})(window);
