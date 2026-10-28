import test from "node:test";
import assert from "node:assert/strict";
import { rowToComponent, getComponent, getComponentsByType } from "../src/api/cms_components.js";

test("v2 component canonical URL overrides stale legacy config and preserves style overrides", () => {
  const component = rowToComponent({
    id: "payment_paypal", type: "button", label: "PayPal", sort_order: 10,
    action_type: "href", action_value: "https://example.org/current",
    logo_asset_key: "payment_logo_paypal", provider: "paypal", placement: "donate_options",
    config_json: JSON.stringify({ url: "https://example.org/stale", note: "Donation" }),
    style_json: JSON.stringify({ background: "#eef5ff", logo_height: 22 }),
  });
  assert.equal(component.config.url, "https://example.org/current");
  assert.equal(component.config.logo_asset_key, "payment_logo_paypal");
  assert.equal(component.config.background, "#eef5ff");
  assert.equal(component.config.logo_height, 22);
  assert.equal(component.config.note, "Donation");
});

test("legacy component shape remains readable", () => {
  const component = rowToComponent({
    id: "social_facebook", type: "social_link", label: "Facebook",
    sort_order: 1, config_json: '{"url":"https://example.org/old","icon":"facebook"}',
  });
  assert.equal(component.config.url, "https://example.org/old");
  assert.equal(component.config.icon, "facebook");
});

test("getComponent respects both legacy active and v2 status", async () => {
  const row = { id: "social_facebook", label: "Facebook", type: "social_link", config_json: '{"url":"https://example.org"}' };
  const envFor = (extra) => ({
    DB: { prepare: () => ({ bind: () => ({ first: async () => ({ ...row, ...extra }) }) }) },
  });
  assert.equal((await getComponent(row.id, envFor({ active: 1 })))?.id, row.id);
  assert.equal(await getComponent(row.id, envFor({ active: 0 })), null);
  assert.equal((await getComponent(row.id, envFor({ status: "active" })))?.id, row.id);
  assert.equal(await getComponent(row.id, envFor({ status: "draft" })), null);
});

test("legacy donation lookup still sees active v2 provider buttons", async () => {
  const rows = [
    { id: "payment_paypal", type: "button", provider: "paypal", placement: "donate_options", status: "active", label: "PayPal", config_json: "{}", action_type: "href", action_value: "https://example.org" },
    { id: "footer_button", type: "button", placement: "footer", status: "active", label: "Footer", config_json: "{}" },
    { id: "hidden_venmo", type: "button", placement: "donate_options", status: "draft", label: "Venmo", config_json: "{}" },
  ];
  const env = { DB: { prepare: () => ({ all: async () => ({ results: rows }) }) } };
  const list = await getComponentsByType("payment_button", env);
  assert.deepEqual(list.map((c) => c.id), ["payment_paypal"]);
  assert.equal(list[0].config.url, "https://example.org");
});
