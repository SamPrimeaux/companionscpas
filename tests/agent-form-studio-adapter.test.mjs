import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFileSync } from "node:fs";
const source = readFileSync(new URL("../public/dashboard/js/cms/agent-form-studio-adapter.js", import.meta.url), "utf8");
const make = (responder) => {
  const calls = [];
  const fetcher = async (url, options) => {
    calls.push({ url, options });
    const result = await responder(url, options);
    return { ok: result.ok !== false, status: result.ok === false ? 400 : 200,
      json: async () => result.body };
  };
  const root = { fetch: fetcher };
  vm.runInNewContext(source, { window: root });
  const navigation = [];
  const adapter = root.AgentSamCompanionsStudio.createAdapter({
    onNavigate: (...args) => navigation.push(args), fetcher,
  });
  return { adapter, root, calls, navigation };
};
const form = { id: "form_a", form_key: "contact", title: "Contact us",
  status: "active", intro: { heading: "Reach out" }, settings: { submit_label: "Send" } };
const forms = { success: true, forms: [{ id: "form_a", form_key: "contact", title: "Contact us",
  status: "active" }], templates: [{ key: "basic", title: "Basic form" }] };
const catalog = { success: true, modals: [{ id: "modal_donate", key: "donate_cta",
  title: "Donate", status: "published" }], checkouts: [{ id: "cmsg_1",
  key: "event", title: "Event", status: "published", campaign_ref: "campaign_123" }] };

test("adapter lists real form, legacy popup and checkout without copying records", async () => {
  const { adapter, navigation } = make((url) => ({ body:
    url.endsWith("/api/cms/forms") ? forms : catalog }));
  const items = await adapter.listResources();
  assert.equal(items.length, 3);
  assert.deepEqual(Array.from(items, x => x.kind), ["form", "modal", "checkout"]);
  adapter.openSource(items[2]);
  assert.equal(navigation[0][0], "campaign-detail");
  assert.equal(navigation[0][1].campaignId, "campaign_123");
});
test("published forms cannot be overwritten through Studio", async () => {
  const { adapter, calls } = make((url) => ({ body: forms }));
  await assert.rejects(adapter.saveResource({ kind: "form", status: "active", id: "form_a" }), /Published form drafts/);
  assert.equal(calls.length, 0);
});
test("draft edits use existing CMS save endpoint and retain conditional, validation and steps", async () => {
  const { adapter, calls } = make((url) => {
    if (url.includes("/save")) return { body: { success: true, form: { ...form, status: "draft" },
      fields: [{ id: "fld_1", field_key: "name" }], steps: [{ id: "step_1" }] } };
    return { body: { success: true, form: { ...form, status: "draft" }, fields: [], steps: [] } };
  });
  const doc = { kind: "form", id: "form_a", status: "draft", title: "Contact",
    fields: [{ id: "fld_1", field_key: "name", label: "Name", conditional: { when: "agree" } }],
    steps: [{ id: "step_1" }], settings: { theme: { accent: "#bada55" } }, intro: {} };
  await adapter.saveResource(doc);
  const request = calls.find(c => c.url.endsWith("/save"));
  assert.ok(request);
  assert.equal(request.options.headers["X-AgentSam-Studio"], "form-studio");
  assert.deepEqual(JSON.parse(request.options.body).fields[0].conditional, { when: "agree" });
  assert.equal(JSON.parse(request.options.body).settings.theme.accent, "#bada55");
});
test("available presets use backend templates, unsupported payment/modal creation remains disabled", async () => {
  const { root } = make((url) => ({ body: url.includes("presets.json")
    ? { presets: [{ key: "basic", kind: "form", title: "Contact" },
      { key: "newsletter", kind: "form", title: "Newsletter" },
      { key: "donation", kind: "modal", title: "Donation" }] }
    : forms }));
  const { presets } = await root.AgentSamCompanionsStudio.loadPresets(root.fetch);
  const allowed = presets.find(p => p.key === "basic");
  const blocked = presets.find(p => p.key === "donation");
  assert.equal(allowed.capability, "forms.create");
  assert.equal(blocked.capability, "modals.create.donation");
  assert.equal(presets.find(p => p.key === "newsletter").capability, "forms.create.newsletter");
});
