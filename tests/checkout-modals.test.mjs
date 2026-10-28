import test from "node:test";
import assert from "node:assert/strict";
import { normalizeItems, priceItems, cleanFields, validateParticipantNames, normalizeFieldDefs, itemsCompact } from "../src/api/checkout_modals.js";

const tickets = [
  { key: "driver", label: "Driver", price_cents: 2000 },
  { key: "passenger", label: "Passenger", price_cents: 1000 },
  { key: "extra_hand", label: "Extra hand", price_cents: 500 },
  { key: "bad", label: "Bad", price_cents: 0 },
  { key: "driver", label: "Dup", price_cents: 1 },
];

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
