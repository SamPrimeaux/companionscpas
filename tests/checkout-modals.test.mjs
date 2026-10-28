import test from "node:test";
import assert from "node:assert/strict";
import { normalizeItems, priceItems, cleanFields, validateParticipantNames, normalizeFieldDefs, itemsCompact, recordEventRegistration, normalizeCheckoutAppearance, planCheckoutSave, loadCheckoutModal } from "../src/api/checkout_modals.js";

const tickets = [
  { key: "driver", label: "Driver", price_cents: 2000 },
  { key: "passenger", label: "Passenger", price_cents: 1000 },
  { key: "extra_hand", label: "Extra hand", price_cents: 500 },
  { key: "bad", label: "Bad", price_cents: 0 },
  { key: "driver", label: "Dup", price_cents: 1 },
];


test("published checkout exposes optional initial selection without raising the minimum", async () => {
  const content = {
    mode: "items", campaign_id: "campaign_test", items_source: "campaign_event_tickets",
    initial_item_key: "driver", auto_prepare_payment: true,
    selected_item_keys: ["driver", "passenger", "extra_hand"],
    fields: [], cover_fees: { enabled: true, default: false },
  };
  const env = { DB: { prepare(sql) {
    return { bind() { return { async first() {
      if (sql.includes("FROM cms_globals")) return {
        global_key: "freedom_ride_checkout", inline_content_json: JSON.stringify(content)
      };
      if (sql.includes("FROM fundraising_campaigns")) return {
        config_json: JSON.stringify({ event: { tickets } })
      };
      return null;
    }}; }};
  }}};
  const modal = await loadCheckoutModal(env, "freedom_ride_checkout");
  assert.equal(modal.public.initial_item_key, "driver");
  assert.equal(modal.public.auto_prepare_payment, true);
  assert.equal(modal.public.items[0].price_cents, 2000);
  assert.equal(modal.public.items[0].min, 0);
  assert.equal(modal.public.items[1].min, 0);
  assert.equal(priceItems(modal.items, [{ key: "passenger", qty: 1 }]).intendedCents, 1000);
  assert.equal(priceItems(modal.items, [{ key: "extra_hand", qty: 1 }]).intendedCents, 500);
  const invalid = { ...content, initial_item_key: "missing" };
  const invalidEnv = { DB: { prepare(sql) {
    return { bind() { return { async first() {
      return sql.includes("FROM cms_globals")
        ? { global_key: "invalid", inline_content_json: JSON.stringify(invalid) }
        : { config_json: JSON.stringify({ event: { tickets } }) };
    }}; }};
  }}};
  assert.equal((await loadCheckoutModal(invalidEnv, "invalid")).public.initial_item_key, null);
});

test("normalizeItems drops invalid and duplicate rows", () => {
  const items = normalizeItems(tickets, { driver: { max: 3 } });
  assert.deepEqual(items.map((i) => i.key), ["driver", "passenger", "extra_hand"]);
  assert.equal(items[0].max, 3);
  assert.equal(items[1].max, 10);
});

test("priceItems computes the total from server prices only", () => {
  const items = normalizeItems(tickets);
  const r = priceItems(items, [{ key: "driver", qty: 1 }, { key: "passenger", qty: 1 }, { key: "extra_hand", qty: 2 }]);
  assert.equal(r.ok, true);
  assert.equal(r.intendedCents, 4000);
  assert.equal(r.hands, 4);
  assert.equal(itemsCompact(r.lines), "driver:1,passenger:1,extra_hand:2");
});

test("priceItems ignores any browser-supplied price", () => {
  const items = normalizeItems(tickets);
  const r = priceItems(items, [{ key: "driver", qty: 1, price_cents: 1 }]);
  assert.equal(r.intendedCents, 2000);
});

test("priceItems rejects unknown keys, negatives, over max and empty carts", () => {
  const items = normalizeItems(tickets, { driver: { max: 2 } });
  assert.equal(priceItems(items, [{ key: "vip", qty: 1 }]).ok, false);
  assert.equal(priceItems(items, [{ key: "driver", qty: -1 }]).ok, false);
  assert.equal(priceItems(items, [{ key: "driver", qty: 3 }]).ok, false);
  assert.equal(priceItems(items, []).ok, false);
  assert.equal(priceItems(items, [{ key: "driver", qty: 0 }]).ok, false);
  assert.equal(priceItems(items, "nope").ok, false);
});

test("cleanFields keeps only defined keys and enforces required", () => {
  const defs = normalizeFieldDefs([
    { key: "name", label: "Name", required: true },
    { key: "phone", label: "Phone", type: "tel" },
  ]);
  assert.equal(cleanFields(defs, { phone: "555" }).ok, false);
  const ok = cleanFields(defs, { name: " Sam ", phone: "555", evil: "x" });
  assert.deepEqual(ok.values, { name: "Sam", phone: "555" });
});


test("participant names match each purchased driver/passenger seat, never extra hands", () => {
  const lines = priceItems(normalizeItems(tickets), [
    { key: "driver", qty: 1 }, { key: "passenger", qty: 2 }, { key: "extra_hand", qty: 1 },
  ]).lines;
  const expected = [
    { key: "driver", index: 1, name: "Sam" },
    { key: "passenger", index: 1, name: "Taylor" },
    { key: "passenger", index: 2, name: "Alex" },
  ];
  assert.deepEqual(validateParticipantNames(lines, ["driver", "passenger"], expected), { ok: true, values: expected });
  assert.equal(validateParticipantNames(lines, ["driver", "passenger"], expected.slice(0, 2)).ok, false);
  assert.equal(validateParticipantNames(lines, ["driver", "passenger"], [...expected.slice(0, 2), { ...expected[2], name: "" }]).ok, false);
  assert.equal(validateParticipantNames(lines, ["driver", "passenger"], [...expected.slice(0, 2), { ...expected[2], key: "driver" }]).ok, false);
  assert.equal(validateParticipantNames(lines, [], []).ok, true);
});


test("default Freedom Ride popup seed excludes chance-based add-ons and duplicated names", async () => {
  const { readFileSync } = await import("node:fs");
  const seed = readFileSync(new URL("../db/migrations/20261027_checkout_modals.sql", import.meta.url), "utf8");
  assert.match(seed, /selected_item_keys/);
  assert.match(seed, /participant_items/);
  assert.match(seed, /"driver","passenger"/);
  assert.doesNotMatch(seed, /\"key\":\"name\"/);
});

test("event registration can be retried after a D1 failure without duplicating its PaymentIntent", async () => {
  let failOnce = true;
  const registrations = new Map();
  const env = { DB: { prepare(sql) {
    assert.match(sql, /INSERT OR IGNORE INTO event_registrations/);
    return { bind(...values) { return { async run() {
      if (failOnce) { failOnce = false; throw Error("transient D1 error"); }
      if (!registrations.has(values[4])) registrations.set(values[4], values);
      return { success: true };
    }}; }};
  }}};
  const payload = {
    paymentIntentId: "pi_test_retry",
    intentRecord: { id: "intent_test", campaign_id: "campaign_test", metadata_json: JSON.stringify({
      modal: { key: "freedom_ride_checkout", lines: [{ key: "driver", qty: 1, price_cents: 2000 }], hands: 1,
        fields: { participant_names: [{ key: "driver", index: 1, name: "Test Guest" }], phone: "555-0100" } },
    }) },
    donationId: "donation_test", donorEmail: "test@example.com", donorName: "Test Guest", totalCents: 2000,
  };
  await assert.rejects(recordEventRegistration(env, payload), /transient D1 error/);
  assert.equal(registrations.size, 0);
  await recordEventRegistration(env, payload);
  await recordEventRegistration(env, payload);
  assert.equal(registrations.size, 1);
  const row = registrations.get("pi_test_retry");
  assert.equal(row[3], "freedom_ride_checkout");
  assert.equal(row[12], 2000);
  assert.equal(JSON.parse(row[13]).participant_names[0].name, "Test Guest");
});

test("payment-success webhook retries registration on duplicate delivery", async () => {
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("../src/api/payments_email.js", import.meta.url), "utf8");
  assert.match(src, /if \(meta\.modal_key \|\| intentMeta\.modal\)/);
  assert.doesNotMatch(src, /!result\.duplicate && \(meta\.modal_key/);
  assert.doesNotMatch(src, /event_registrations insert skipped/);
});

test("checkout appearance normalizes valid settings without accepting arbitrary CSS", () => {
  assert.deepEqual(normalizeCheckoutAppearance({
    accent: "#AAbbCC", surface: "dark", radius: 60, compact: true,
  }), { accent: "#aabbcc", surface: "dark", radius: 24, compact: true });
  assert.deepEqual(normalizeCheckoutAppearance({
    accent: "url(fake)", surface: "unexpected", radius: -10, compact: "true",
  }), { accent: "#7c3aed", surface: "light", radius: 6, compact: false });
});

test("saving an editor draft stages private metadata while published content remains active", () => {
  const live = { title: "Live configuration" };
  const draft = { title: "Editable draft", appearance: { accent: "#123abc" } };
  const staged = planCheckoutSave("draft", "published", { saved_by: "operator" }, draft);
  assert.equal(staged.publishedDraft, true);
  assert.deepEqual(staged.nextMetadata.checkout_draft, draft);
  assert.equal(staged.nextMetadata.saved_by, "operator");
  assert.ok(staged.nextMetadata.checkout_draft_saved_at);
  assert.equal(live.title, "Live configuration");
  const published = planCheckoutSave("published", "published", staged.nextMetadata, draft);
  assert.equal(published.publishedDraft, false);
  assert.equal(published.nextMetadata.checkout_draft, undefined);
  assert.equal(published.nextMetadata.saved_by, "operator");
  const fresh = planCheckoutSave("draft", "draft", {}, draft);
  assert.equal(fresh.publishedDraft, false);
});

test("stage update never unpublishes or unlinks a published checkout", async () => {
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("../src/api/checkout_modals.js", import.meta.url), "utf8");
  assert.match(src, /UPDATE cms_globals SET metadata_json = \?, content_version = content_version \+ 1/);
  assert.match(src, /!publishedDraft && campaignCfg\.event\?\.checkout_modal === key/);
  assert.match(src, /has_draft: Boolean\(staged\)/);
});
