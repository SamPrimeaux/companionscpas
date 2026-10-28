/**
 * checkout_modals.js — data-driven checkout popups.
 *
 * A popup is a cms_globals row (global_type = 'checkout_modal'); its copy, fields and ticket lines are
 * DATA, so changing them never needs a deploy. Modes:
 *   "items"    quantity lines (event tickets). Prices are ALWAYS resolved server-side — from the row's
 *              items[] or, with items_source = "campaign_event_tickets", from the same tickets the event
 *              page renders (fundraising_campaigns.config_json.event.tickets). The browser only sends
 *              {key, qty}; it can never set a price.
 *   "donation" reserved for amount-tier popups (the legacy modal path keeps handling those today).
 *
 * Routes:
 *   GET  /api/checkout/modals/:key        public, sanitized config the modal renders from
 *   POST /api/checkout/intent-fields      attach validated attendee fields to a pending PaymentIntent
 */
import { getAuthUser } from "./session_api.js";
import { publishRoute } from "./cms_pipeline.js";

const TENANT_ID = "tenant_companionscpas";
const GLOBAL_TYPE = "checkout_modal";
const DEFAULT_MAX_QTY = 10;
const KEY_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/i;
const FIELD_TYPES = new Set(["text", "tel", "email", "number"]);

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function parse(value, fallback) {
  if (value && typeof value === "object") return value;
  try { const p = JSON.parse(value); return p ?? fallback; } catch { return fallback; }
}

function str(value, max = 200) {
  return value == null ? "" : String(value).trim().slice(0, max);
}

function rid(prefix) {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return `${prefix}_${[...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

/** tickets / items -> [{key,label,price_cents,note,min,max,default_qty}] (invalid rows dropped). */
export function normalizeItems(raw, limits = {}) {
  const out = [];
  const seen = new Set();
  for (const t of Array.isArray(raw) ? raw.slice(0, 12) : []) {
    const key = str(t?.key, 64);
    const price = Math.round(Number(t?.price_cents));
    if (!KEY_RE.test(key) || seen.has(key) || !Number.isFinite(price) || price <= 0) continue;
    seen.add(key);
    const lim = limits?.[key] || {};
    const max = Math.max(1, Math.min(100, Math.floor(Number(lim.max ?? t?.max ?? DEFAULT_MAX_QTY)) || DEFAULT_MAX_QTY));
    const min = Math.max(0, Math.min(max, Math.floor(Number(lim.min ?? t?.min ?? 0)) || 0));
    out.push({
      key,
      label: str(t?.label, 80) || key,
      price_cents: price,
      note: str(t?.note, 240),
      min,
      max,
      default_qty: Math.max(min, Math.min(max, Math.floor(Number(t?.default_qty ?? 0)) || 0)),
    });
  }
  return out;
}

/** requested [{key,qty}] against server items -> authoritative lines + total. */
export function priceItems(items, requested) {
  const byKey = new Map((items || []).map((i) => [i.key, i]));
  const qtyByKey = new Map();
  for (const r of Array.isArray(requested) ? requested.slice(0, 24) : []) {
    const key = str(r?.key, 64);
    if (!byKey.has(key)) return { ok: false, error: `Unknown ticket: ${key || "(missing)"}` };
    const qty = Math.floor(Number(r?.qty));
    if (!Number.isFinite(qty) || qty < 0) return { ok: false, error: `Invalid quantity for ${key}` };
    qtyByKey.set(key, (qtyByKey.get(key) || 0) + qty);
  }
  const lines = [];
  let intendedCents = 0;
  let hands = 0;
  for (const item of items || []) {
    const qty = qtyByKey.get(item.key) || 0;
    if (qty <= 0) continue;
    if (qty > item.max) return { ok: false, error: `${item.label}: maximum ${item.max}` };
    if (qty < item.min) return { ok: false, error: `${item.label}: minimum ${item.min}` };
    lines.push({ key: item.key, label: item.label, qty, price_cents: item.price_cents });
    intendedCents += qty * item.price_cents;
    hands += qty;
  }
  if (!lines.length || intendedCents < 100) return { ok: false, error: "Choose at least one entry" };
  return { ok: true, lines, intendedCents, hands };
}

export function itemsSummary(lines) {
  return (lines || []).map((l) => `${l.label} x${l.qty}`).join(", ");
}

/** Stripe metadata-safe compact form: "driver:1,passenger:2" */
export function itemsCompact(lines) {
  return (lines || []).map((l) => `${l.key}:${l.qty}`).join(",").slice(0, 480);
}

export function normalizeFieldDefs(raw) {
  const out = [];
  const seen = new Set();
  for (const f of Array.isArray(raw) ? raw.slice(0, 8) : []) {
    const key = str(f?.key, 40);
    if (!KEY_RE.test(key) || seen.has(key)) continue;
    seen.add(key);
    out.push({
      key,
      label: str(f?.label, 80) || key,
      type: FIELD_TYPES.has(f?.type) ? f.type : "text",
      required: Boolean(f?.required),
      placeholder: str(f?.placeholder, 80),
    });
  }
  return out;
}

/** Only keys defined by the popup are kept; required fields enforced. */
export function cleanFields(defs, input) {
  const values = {};
  const src = input && typeof input === "object" ? input : {};
  for (const d of defs || []) {
    const v = str(src[d.key], 200);
    if (d.required && !v) return { ok: false, error: `${d.label} is required` };
    if (v) values[d.key] = v;
  }
  return { ok: true, values };
}

function toPublic(key, content, items, fields) {
  return {
    key,
    mode: content.mode === "donation" ? "donation" : "items",
    campaign_id: str(content.campaign_id, 120) || null,
    eyebrow: str(content.eyebrow, 80),
    title: str(content.title, 120),
    subtitle: str(content.subtitle, 400),
    items_title: str(content.items_title, 80),
    details_title: str(content.details_title, 80),
    submit_label: str(content.submit_label, 60) || "Pay {total}",
    success_title: str(content.success_title, 120),
    success_message: str(content.success_message, 600),
    cover_fees: {
      enabled: content.cover_fees?.enabled !== false,
      default: content.cover_fees?.default !== false,
    },
    items,
    fields,
    participant_items: Array.isArray(content.participant_items) ? content.participant_items.filter((k) => items.some((i) => i.key === k)).slice(0, 12) : [],
  };
}

export async function loadCheckoutModal(env, key) {
  const k = str(key, 64);
  if (!env?.DB || !KEY_RE.test(k)) return null;
  const row = await env.DB.prepare(`
    SELECT global_key, inline_content_json
    FROM cms_globals
    WHERE account_id = ? AND global_key = ? AND global_type = ? AND status = 'published'
    LIMIT 1
  `).bind(TENANT_ID, k, GLOBAL_TYPE).first().catch(() => null);
  if (!row) return null;
  const content = parse(row.inline_content_json, {});
  let rawItems = content.items;
  if (content.items_source === "campaign_event_tickets" && content.campaign_id) {
    const camp = await env.DB.prepare(
      `SELECT config_json FROM fundraising_campaigns WHERE id = ? LIMIT 1`
    ).bind(String(content.campaign_id)).first().catch(() => null);
    rawItems = parse(camp?.config_json, {})?.event?.tickets;
    if (Array.isArray(content.selected_item_keys)) {
      const selected = new Set(content.selected_item_keys);
      rawItems = (Array.isArray(rawItems) ? rawItems : []).filter((item) => selected.has(item.key));
    }
  }
  const items = normalizeItems(rawItems, content.item_limits || {});
  const fields = normalizeFieldDefs(content.fields);
  return { key: k, content, items, fields, public: toPublic(k, content, items, fields) };
}

/** Names for each ticket needing an actual attendee. Extra hands need not be people. */
export function validateParticipantNames(lines, participantItems, submitted) {
  const required = new Set(Array.isArray(participantItems) ? participantItems : []);
  const input = Array.isArray(submitted) ? submitted : [];
  const expected = [];
  for (const line of lines || []) {
    if (!required.has(line.key)) continue;
    for (let i = 0; i < line.qty; i++) expected.push({ key: line.key, index: i + 1 });
  }
  if (expected.length > 40) return { ok: false, error: "Too many participants" };
  if (input.length !== expected.length) return { ok: false, error: "Enter a name for each participant" };
  const values = [];
  for (let i = 0; i < expected.length; i++) {
    const row = input[i];
    const name = str(row?.name, 100);
    if (!name || row?.key !== expected[i].key || Number(row?.index) !== expected[i].index)
      return { ok: false, error: `Participant ${i + 1} needs a name` };
    values.push({ ...expected[i], name });
  }
  return { ok: true, values };
}

async function checkoutAdmin(request, env, url) {
  const match = url.pathname.match(/^\/api\/checkout\/admin\/campaign\/([^/]+)$/);
  if (!match || !["GET", "PUT"].includes(request.method)) return null;
  const user = await getAuthUser(request, env);
  if (!user) return json({ error: "Not authenticated" }, 401);
  const campaignId = decodeURIComponent(match[1]);
  const campaign = await env.DB.prepare(
    "SELECT id, title, config_json FROM fundraising_campaigns WHERE id = ? LIMIT 1"
  ).bind(campaignId).first();
  if (!campaign) return json({ error: "Campaign not found" }, 404);
  const campaignCfg = parse(campaign.config_json, {});
  const row = await env.DB.prepare(`
    SELECT global_key, status, inline_content_json FROM cms_globals
    WHERE account_id = ? AND global_type = ?
      AND json_extract(inline_content_json, '$.campaign_id') = ?
    ORDER BY CASE WHEN status = 'published' THEN 0 ELSE 1 END, updated_at DESC LIMIT 1
  `).bind(TENANT_ID, GLOBAL_TYPE, campaignId).first();
  const content = parse(row?.inline_content_json, {});
  if (request.method === "GET") return json({
    ok: true, key: row?.global_key || null, status: row?.status || "draft",
    content: { mode: "items", eyebrow: "Companions of CPAS", title: campaign.title || "Event registration",
      subtitle: "Choose your entries and pay securely.", items_title: "Choose your entries",
      details_title: "Your details", submit_label: "Pay {total}",
      success_title: "Registration received", success_message: "Thank you for supporting the animals.",
      cover_fees: { enabled: true, default: false }, fields: [],
      participant_items: ["driver", "passenger"], ...content,
      items: Array.isArray(content.items) ? content.items : (campaignCfg.event?.tickets || []),
    },
  });
  let input;
  try { input = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const raw = input?.content;
  if (!raw || typeof raw !== "object" || raw.mode !== "items") return json({ error: "Invalid checkout configuration" }, 400);
  const status = input.status === "published" ? "published" : "draft";
  if (!Array.isArray(raw.items) || raw.items.length < 1 || raw.items.length > 12)
    return json({ error: "Add 1 to 12 valid ticket options" }, 400);
  const items = normalizeItems(raw.items);
  if (items.length !== raw.items.length) return json({ error: "Every ticket needs a unique key, name and positive price" }, 400);
  const fields = normalizeFieldDefs(raw.fields);
  if (!Array.isArray(raw.fields) || fields.length !== raw.fields.length)
    return json({ error: "Invalid checkout fields" }, 400);
  const itemKeys = new Set(items.map((it) => it.key));
  const participantItems = [...new Set(Array.isArray(raw.participant_items) ? raw.participant_items : [])];
  if (participantItems.some((key) => !itemKeys.has(key))) return json({ error: "Unknown participant ticket" }, 400);
  const key = row?.global_key || `checkout_${campaignId.replace(/[^a-z0-9_-]/gi, "_").slice(0, 50)}`;
  const next = {
    mode: "items", campaign_id: campaignId, items_source: "campaign_event_tickets",
    eyebrow: str(raw.eyebrow, 80), title: str(raw.title, 120) || campaign.title,
    subtitle: str(raw.subtitle, 400), items_title: str(raw.items_title, 80),
    details_title: str(raw.details_title, 80), submit_label: str(raw.submit_label, 60) || "Pay {total}",
    success_title: str(raw.success_title, 120), success_message: str(raw.success_message, 600),
    note_prefix: str(raw.note_prefix, 80), selected_item_keys: items.map((it) => it.key), cover_fees: {
      enabled: raw.cover_fees?.enabled !== false, default: raw.cover_fees?.default === true,
    }, participant_items: participantItems, fields, items,
  };
  const changes = [env.DB.prepare(`
    INSERT INTO cms_globals (id, account_id, global_key, global_type, status, inline_content_json, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(account_id, global_key) DO UPDATE SET status=excluded.status,
      inline_content_json=excluded.inline_content_json, content_version=content_version+1,
      updated_at=datetime('now')
  `).bind(`cmsg_${crypto.randomUUID()}`, TENANT_ID, key, GLOBAL_TYPE, status, JSON.stringify(next))];
  if (status === "published") {
    const event = { ...(campaignCfg.event || {}), tickets: items, checkout_modal: key };
    changes.push(env.DB.prepare("UPDATE fundraising_campaigns SET config_json = ? WHERE id = ?")
      .bind(JSON.stringify({ ...campaignCfg, event }), campaignId));
  } else if (campaignCfg.event?.checkout_modal === key) {
    // Draft/unpublished popups must not leave live event buttons invoking a 404.
    const event = { ...campaignCfg.event }; delete event.checkout_modal;
    changes.push(env.DB.prepare("UPDATE fundraising_campaigns SET config_json = ? WHERE id = ?")
      .bind(JSON.stringify({ ...campaignCfg, event }), campaignId));
  }
  await env.DB.batch(changes);
  const publishedRoutes = [], warnings = [];
  if (status === "published") {
    // event_landing sections are published HTML artifacts, not live database templates.
    // Re-publish every published page referencing this campaign so data-modal-key
    // reaches the real page immediately (not just the admin preview).
    const pages = await env.DB.prepare(`
      SELECT DISTINCT p.route_path FROM cms_page_sections s
      JOIN cms_pages p ON p.route_path = s.page_route AND p.tenant_id = s.tenant_id
      WHERE s.tenant_id = ? AND s.section_type = 'event_landing' AND p.status = 'published'
        AND json_extract(s.config_json, '$.campaign_id') = ?
    `).bind(TENANT_ID, campaignId).all();
    for (const page of pages.results || []) {
      try {
        await publishRoute(env, page.route_path, `checkout_${Date.now()}`);
        publishedRoutes.push(page.route_path);
      } catch (error) { warnings.push(`${page.route_path}: ${str(error?.message, 160)}`); }
    }
  }
  return json({ ok: true, key, status, content: next, published_routes: publishedRoutes, warnings,
    notice: status === "published"
      ? (warnings.length ? "Checkout saved; some event pages need republishing." : "Checkout and event pages published.")
      : "Checkout draft saved." });
}

/** Called by /api/donations/intent when the browser sent modal_key. Never trusts browser prices. */
export async function resolveCheckoutIntent(env, data) {
  const modal = await loadCheckoutModal(env, data?.modal_key);
  if (!modal) return { error: "Checkout popup not found", status: 404 };
  if (modal.public.mode !== "items") return { error: "This popup does not take item orders", status: 400 };
  const priced = priceItems(modal.items, data.items);
  if (!priced.ok) return { error: priced.error, status: 400 };
  return {
    modalKey: modal.key,
    campaignId: modal.public.campaign_id,
    lines: priced.lines,
    intendedCents: priced.intendedCents,
    hands: priced.hands,
    summary: itemsSummary(priced.lines),
    compact: itemsCompact(priced.lines),
    notePrefix: str(modal.content.note_prefix, 80),
    coverFeesAllowed: modal.public.cover_fees.enabled,
    participantItems: modal.public.participant_items,
  };
}

async function attachFields(env, data) {
  const piId = str(data?.payment_intent_id, 80);
  if (!/^pi_[A-Za-z0-9]+$/.test(piId)) return json({ error: "Invalid payment reference" }, 400);
  const modal = await loadCheckoutModal(env, data?.modal_key);
  if (!modal) return json({ error: "Checkout popup not found" }, 404);
  const cleaned = cleanFields(modal.fields, data.fields);
  if (!cleaned.ok) return json({ error: cleaned.error }, 400);
  const row = await env.DB.prepare(`
    SELECT id, status, metadata_json FROM donation_intents
    WHERE provider_checkout_id = ? AND tenant_id = ? LIMIT 1
  `).bind(piId, TENANT_ID).first().catch(() => null);
  if (!row?.id) return json({ error: "Payment not found" }, 404);
  if (row.status !== "pending_payment") return json({ error: "Payment is no longer open" }, 409);
  const meta = parse(row.metadata_json, {});
  if (!meta.modal || meta.modal.key !== modal.key) return json({ error: "Popup mismatch" }, 400);
  const names = validateParticipantNames(meta.modal.lines || [], meta.modal.participant_items || modal.public.participant_items, data.participant_names);
  if (!names.ok) return json({ error: names.error }, 400);
  meta.modal.fields = { ...cleaned.values, participant_names: names.values };
  await env.DB.prepare(
    `UPDATE donation_intents SET metadata_json = ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(JSON.stringify(meta), row.id).run();
  return json({ ok: true });
}

/** Webhook side: idempotent on the PaymentIntent. Non-fatal by design. */
export async function recordEventRegistration(env, { paymentIntentId, intentRecord, donationId, donorEmail, donorName, totalCents }) {
  const meta = parse(intentRecord?.metadata_json, {});
  const modal = meta.modal;
  if (!modal?.key || !paymentIntentId) return { skipped: true };
  const fields = modal.fields && typeof modal.fields === "object" ? modal.fields : {};
  await env.DB.prepare(`
    INSERT OR IGNORE INTO event_registrations
      (id, tenant_id, campaign_id, modal_key, stripe_payment_intent_id, donation_id, donation_intent_id,
       attendee_name, attendee_email, attendee_phone, lines_json, hands, total_cents, fields_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    rid("reg"), TENANT_ID, modal.campaign_id || intentRecord?.campaign_id || null, modal.key, paymentIntentId,
    donationId || null, intentRecord?.id || null,
    str(fields.participant_names?.[0]?.name || fields.name || donorName, 200) || null, str(donorEmail, 200) || null, str(fields.phone, 60) || null,
    JSON.stringify(modal.lines || []), Number(modal.hands) || 0, Number(totalCents) || 0, JSON.stringify(fields)
  ).run();
  return { recorded: true };
}

export async function checkoutModalRoutes(request, env, url) {
  const adminResponse = await checkoutAdmin(request, env, url);
  if (adminResponse) return adminResponse;
  const path = url.pathname;
  const m = path.match(/^\/api\/checkout\/modals\/([^/]+)$/);
  if (m && request.method === "GET") {
    const modal = await loadCheckoutModal(env, decodeURIComponent(m[1]));
    if (!modal) return json({ error: "Not found" }, 404);
    return json(modal.public, 200, { "Cache-Control": "public, max-age=30" });
  }
  if (path === "/api/checkout/intent-fields" && request.method === "POST") {
    const data = await request.json().catch(() => ({}));
    return attachFields(env, data);
  }
  return null;
}
