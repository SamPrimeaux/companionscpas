// Browser proof for the data-driven checkout popup. Mocks every network call + Stripe (no keys, no charges).
// Run: node tests/browser/checkout-modal.browser.mjs
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const js = readFileSync(new URL("../../public/static/js/donate-modal.js", import.meta.url), "utf8");
const CFG = {
  key: "freedom_ride_checkout", mode: "items", campaign_id: "camp_x", eyebrow: "Companions of CPAS",
  title: "The Freedom Ride", subtitle: "Pick your entries.", submit_label: "Pay {total}",
  success_title: "You are in!", success_message: "See you at registration.",
  cover_fees: { enabled: true, default: false },
  items: [
    { key: "driver", label: "Driver", price_cents: 2000, note: "Your vehicle", min: 0, max: 10, default_qty: 0 },
    { key: "passenger", label: "Passenger", price_cents: 1000, note: "", min: 0, max: 10, default_qty: 0 },
    { key: "extra_hand", label: "Extra hand", price_cents: 500, note: "", min: 0, max: 10, default_qty: 0 },
  ],
  fields: [{ key: "name", label: "Name for registration", type: "text", required: true, placeholder: "" }],
};
const html = `<!doctype html><html><body>
<button id="legacy" data-action="donate" data-amount="20">Legacy</button>
<button id="ticket" data-action="donate" data-amount="20" data-campaign-id="camp_x" data-event-ticket="driver" data-modal-key="freedom_ride_checkout">Pay $20</button>
<button id="missing" data-action="donate" data-amount="20" data-modal-key="does_not_exist">Missing</button>
<button id="preselected" data-action="donate" data-modal-key="preselected_checkout">Auto selected</button>
<script>
window.__calls = { intents: [], fields: [], confirms: 0, after: 0 };
window.Stripe = function () { return {
  elements: function () { return { create: function () { const h = {}; return { on: (e, f) => { h[e] = f; if (e === 'ready') setTimeout(f, 10); }, mount: () => {} }; } }; },
  confirmPayment: async function () { window.__calls.confirms++; return { paymentIntent: { id: 'pi_test123' } }; },
}; };
</script>
<script>${js.replace(/<\/script>/g, "<\\/script>")}</script></body></html>`;

// Uses the installed Google Chrome (no browser download); falls back to Playwright's bundled Chromium.
const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());
const page = await browser.newPage();
page.on("pageerror", (e) => { console.error("PAGE ERROR", e.message); process.exitCode = 1; });
await page.route("https://example.test/**", (r) => r.fulfill({ contentType: "text/html", body: html }));
await page.route("**/api/donations/config", (r) => r.fulfill({ json: { publishable_key: "pk_test_x", test_mode: false } }));
await page.route("**/api/donations/tiers", (r) => r.fulfill({ json: { tiers: [{ label: "A Part of the Pack", amount_cents: 2500 }] } }));
await page.route("**/api/checkout/modals/freedom_ride_checkout", (r) => r.fulfill({ json: CFG }));
await page.route("**/api/checkout/modals/does_not_exist", (r) => r.fulfill({ status: 404, json: { error: "Not found" } }));
await page.route("**/api/checkout/modals/preselected_checkout", (r) => r.fulfill({ json: {
  ...CFG, key: "preselected_checkout", initial_item_key: "driver", auto_prepare_payment: true
} }));
await page.route("**/api/donations/intent", async (r) => {
  const body = JSON.parse(r.request().postData());
  await page.evaluate((b) => window.__calls.intents.push(b), body);
  r.fulfill({ json: { client_secret: "pi_test123_secret_abc" } });
});
await page.route("**/api/checkout/intent-fields", async (r) => {
  const body = JSON.parse(r.request().postData());
  await page.evaluate((b) => window.__calls.fields.push(b), body);
  r.fulfill({ json: { ok: true } });
});
await page.route("**/api/donations/after-payment", async (r) => { await page.evaluate(() => window.__calls.after++); r.fulfill({ json: { ok: true } }); });

const visible = (sel) => page.locator(sel).first().isVisible();
const calls = () => page.evaluate(() => window.__calls);

// 1. classic donation modal is untouched
await page.goto("https://example.test/a");
await page.click("#legacy");
await page.waitForSelector("#dm-modal .dm-title");
assert.equal(await page.textContent("#dm-modal .dm-title"), "Support Our Mission");
assert.ok(await visible(".dm-tier"), "legacy shows amount tiers");
assert.equal((await calls()).intents[0].modal_key, undefined);
await page.click("#dm-close");

// 2. unknown popup key falls back to the classic modal
await page.click("#missing");
await page.waitForSelector("#dm-modal .dm-title");
assert.equal(await page.textContent("#dm-modal .dm-title"), "Support Our Mission");
await page.click("#dm-close");

// 3. data-driven popup: Driver button preselects 1 driver
await page.click("#ticket");
await page.waitForSelector("#dm-modal .dm-item");
assert.equal(await page.textContent("#dm-modal .dm-title"), "The Freedom Ride");
assert.equal(await page.textContent("#dm-qty-driver"), "1");
assert.equal(await page.locator(".dm-tier").count(), 0, "no donation tiers in ticket mode");
await page.waitForFunction(() => document.getElementById("dm-submit")?.textContent.includes("$20.00"));
// add 1 passenger + 2 extra hands => $20 + $10 + $10 = $40
await page.click('.dm-step[data-key="passenger"][data-step="1"]');
await page.click('.dm-step[data-key="extra_hand"][data-step="1"]');
await page.click('.dm-step[data-key="extra_hand"][data-step="1"]');
await page.waitForFunction(() => document.getElementById("dm-submit")?.textContent.includes("$40.00"));
assert.equal(await page.textContent("#dm-hands"), "4 selected entries");
// Selecting or toggling tickets must never create a Stripe PaymentIntent.
const preContinue = (await calls()).intents.length;
await page.waitForTimeout(650); // longer than the debounce
assert.equal((await calls()).intents.length, preContinue);
assert.match(await page.textContent("#dm-submit"), /Continue to secure payment/);

// 4. required field blocks payment
await page.fill("#receipt-email", "rider@example.com");
await page.waitForFunction(() => !document.getElementById("dm-submit").disabled);
await page.click("#dm-submit");
assert.match(await page.textContent("#dm-error"), /Name for registration is required/);
assert.equal((await calls()).confirms, 0);
assert.equal((await calls()).intents.length, preContinue);

// 5. Continue creates exactly one server-priced intent; Pay confirms it.
await page.fill("#dmf-name", "Sam Rider");
await page.click("#dm-submit");
await page.waitForFunction(() => window.__calls.intents.length > 0 && document.getElementById("dm-submit")?.textContent.includes("Pay $40.00"));
const paymentIntents = (await calls()).intents;
assert.equal(paymentIntents.length, preContinue + 1);
const last = paymentIntents.at(-1);
assert.equal(last.modal_key, "freedom_ride_checkout");
assert.deepEqual(last.items, [{ key: "driver", qty: 1 }, { key: "passenger", qty: 1 }, { key: "extra_hand", qty: 2 }]);
await page.click("#dm-submit");
await page.waitForSelector("#dm-success", { state: "visible" });
const c = await calls();
assert.equal(c.confirms, 1);
assert.equal(c.fields.length, 1);
assert.equal(c.fields[0].payment_intent_id, "pi_test123");
assert.deepEqual(c.fields[0].fields, { name: "Sam Rider" });
assert.equal(await page.textContent("#dm-success h3"), "You are in!");
assert.equal(await page.textContent("#dm-success-msg"), "See you at registration.");

// 6. Config-driven initial selection preloads payment but never forces a
// minimum: the $20 option can be removed in favor of a lower-priced entry.
const confirmsBeforePreselect = (await calls()).confirms;
const intentsBeforePreselect = (await calls()).intents.length;
await page.click("#preselected");
await page.waitForSelector("#dm-qty-driver");
assert.equal(await page.textContent("#dm-qty-driver"), "1");
assert.equal(await page.textContent("#dm-qty-passenger"), "0");
await page.waitForFunction(() => window.__calls.intents.some(intent => intent.modal_key === "preselected_checkout"));
assert.equal((await calls()).confirms, confirmsBeforePreselect, "opening payment does not charge");
assert.equal((await calls()).intents.length, intentsBeforePreselect + 1);
await page.waitForFunction(() => document.getElementById("dm-submit")?.textContent.includes("Pay $20.00"));
await page.click('.dm-step[data-key="driver"][data-step="-1"]');
assert.equal(await page.textContent("#dm-qty-driver"), "0", "initial option is not a minimum");
await page.click('.dm-step[data-key="passenger"][data-step="1"]');
await page.waitForFunction(() => document.getElementById("dm-submit")?.textContent.includes("$10.00"));
assert.equal((await calls()).confirms, confirmsBeforePreselect);
await page.click("#dm-close");

await browser.close();
console.log("checkout-modal browser proof: all assertions passed");
