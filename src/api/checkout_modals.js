/**
 * checkout_modals.js — data-driven checkout popups.
 *
 * A popup is a cms_modals configuration row; its copy, fields and ticket lines are
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
const TENANT_ID = "tenant_companionscpas";

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
  if (!lines.length || intendedCents < 100 || intendedCents > 10000000) return { ok: false, error: "Invalid checkout total" };
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
    theme: { accent: /^#[0-9a-f]{6}$/i.test(content.theme?.accent || '') ? content.theme.accent : '#7c3aed', radius: Math.min(24, Math.max(6, Number(content.theme?.radius) || 14)), compact: content.theme?.compact === true },
  };
}

export async function loadCheckoutModal(env, key) {
  const k = str(key, 64);
  if (!env?.DB || !KEY_RE.test(k)) return null;
  const row = await env.DB.prepare(`
    SELECT modal_key, config_json FROM cms_modals WHERE tenant_id = ? AND modal_key = ? AND is_active = 1
    LIMIT 1
  `).bind(TENANT_ID, k).first().catch(() => null);
  if (!row) return null;
  const content = parse(row.config_json, {});
  if (content.checkout_kind !== 'registration') return null;
  let rawItems = content.items;
  if (content.items_source === "campaign_event_tickets" && content.campaign_id) {
    const camp = await env.DB.prepare(
      `SELECT config_json FROM fundraising_campaigns WHERE id = ? LIMIT 1`
    ).bind(String(content.campaign_id)).first().catch(() => null);
    rawItems = parse(camp?.config_json, {})?.event?.tickets;
    if (Array.isArray(content.allowed_item_keys)) {
      const allowed = new Set(content.allowed_item_keys.map(k => str(k, 64)));
      rawItems = (rawItems || []).filter(t => allowed.has(t.key));
    }
  }
  const items = normalizeItems(rawItems, content.item_limits || {});
  const fields = normalizeFieldDefs(content.fields);
  return { key: k, content, items, fields, public: toPublic(k, content, items, fields) };
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
  };
}

async function attachFields(env, data) {
  const piId = str(data?.payment_intent_id, 80);
  if (!/^pi_[A-Za-z0-9]+$/.test(piId)) return json({ error: "Invalid payment reference" }, 400);
  const clientSecret = str(data?.client_secret, 250);
  if (!clientSecret.startsWith(piId + '_secret_') || !env.STRIPE_SECRET_KEY) return json({error:'Invalid payment authorization'},403);
  const stripeRes = await fetch('https://api.stripe.com/v1/payment_intents/' + encodeURIComponent(piId), {
    headers: { Authorization: 'Bearer ' + env.STRIPE_SECRET_KEY }
  });
  const stripeIntent = await stripeRes.json().catch(() => ({}));
  if (!stripeRes.ok || stripeIntent.client_secret !== clientSecret) return json({error:'Payment authorization failed'},403);
  if (!['requires_payment_method','requires_confirmation'].includes(stripeIntent.status)) return json({error:'Payment no longer editable'},409);
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
  if ((meta.modal.lines || []).some(line => line.key === "passenger" && line.qty > 0) && !cleaned.values.passenger_name) return json({ error: "Passenger name is required" }, 400);
  meta.modal.fields = cleaned.values;
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
       attendee_name, attendee_email, attendee_phone, lines_json, participant_count, total_cents, fields_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    rid("reg"), TENANT_ID, modal.campaign_id || intentRecord?.campaign_id || null, modal.key, paymentIntentId,
    donationId || null, intentRecord?.id || null,
    str(fields.name || donorName, 200) || null, str(donorEmail, 200) || null, str(fields.phone, 60) || null,
    JSON.stringify(modal.lines || []), Number(modal.hands) || 0, Number(totalCents) || 0, JSON.stringify(fields)
  ).run();
  return { recorded: true };
}


import { requireCmsUser } from './cms/shared.js';

const ADMIN_PATH = '/api/cms/checkout-modals';
const checkoutRow = row => row.modal_key === 'donate_cta' || parse(row.config_json,{}).checkout_kind === 'registration';
function normalizeAdminConfig(raw) {
  const c = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const items = normalizeItems(c.items);
  const fields = normalizeFieldDefs(c.fields);
  if (!items.length) return {error:'Add at least one priced admission'};
  if (!fields.some(f=>f.key==='name' && f.required)) return {error:'A required participant name field is needed'};
  const theme = c.theme || {};
  const accent = str(theme.accent,9);
  return { config: {
    checkout_kind:'registration',mode:'items',campaign_id:str(c.campaign_id,120)||null,
    eyebrow:str(c.eyebrow,80),title:str(c.title,120),subtitle:str(c.subtitle,400),
    items_title:str(c.items_title,80)||'Select entries',details_title:str(c.details_title,80)||'Participant details',
    submit_label:str(c.submit_label,60)||'Pay {total}',success_title:str(c.success_title,120)||'Registration received',
    success_message:str(c.success_message,600)||'Thank you for registering',
    note_prefix:str(c.note_prefix,80)||'Event registration',
    cover_fees:{enabled:c.cover_fees?.enabled!==false,default:c.cover_fees?.default===true},
    theme:{accent:/^#[0-9a-f]{6}$/i.test(accent)?accent:'#7c3aed',
      radius:Math.max(6,Math.min(24,Number(theme.radius)||14)),compact:theme.compact===true},
    items,fields
  }};
}
async function adminRoutes(request,env,url) {
  const user=await requireCmsUser(request,env);
  if (!user) return json({error:'Authentication required'},401);
  const origin=request.headers.get('Origin');
  if (origin) {
    try {if(new URL(origin).host!==url.host)return json({error:'Origin mismatch'},403);}
    catch {return json({error:'Invalid origin'},403);}
  }
  const rawKey=url.pathname.slice(ADMIN_PATH.length).replace(/^\//,'');
  let key='';
  try {key=decodeURIComponent(rawKey);}catch {return json({error:'Invalid checkout key'},400);}
  if(key&&!KEY_RE.test(key))return json({error:'Invalid checkout key'},400);
  if(!key&&request.method==='GET'){
    const [rows,campaigns]=await Promise.all([
      env.DB.prepare('SELECT id,modal_key,title,subtitle,is_active,config_json,updated_at FROM cms_modals WHERE tenant_id=? ORDER BY updated_at DESC').bind(TENANT_ID).all(),
      env.DB.prepare('SELECT id,title,status,is_public FROM fundraising_campaigns WHERE tenant_id=? ORDER BY updated_at DESC LIMIT 100').bind(TENANT_ID).all()
    ]);
    return json({modals:(rows.results||[]).filter(checkoutRow).map(r=>({id:r.id,modal_key:r.modal_key,title:r.title,subtitle:r.subtitle,is_active:Boolean(r.is_active),updated_at:r.updated_at,config:parse(r.config_json,{})})),campaigns:campaigns.results||[]},200,{'Cache-Control':'no-store'});
  }
  if(key&&request.method==='GET'){
    const row=await env.DB.prepare('SELECT id,modal_key,title,subtitle,is_active,config_json,updated_at FROM cms_modals WHERE tenant_id=? AND modal_key=? LIMIT 1').bind(TENANT_ID,key).first();
    if(!row||!checkoutRow(row))return json({error:'Not found'},404);
    return json({modal:{id:row.id,modal_key:key,title:row.title,subtitle:row.subtitle,is_active:Boolean(row.is_active),updated_at:row.updated_at,config:parse(row.config_json,{})}},200,{'Cache-Control':'no-store'});
  }
  if(!key&&request.method==='POST'){
    const body=await request.json().catch(()=>({}));
    const modalKey=str(body.modal_key,64);
    if(!KEY_RE.test(modalKey)||modalKey==='donate_cta')return json({error:'A unique checkout key is required'},400);
    const valid=normalizeAdminConfig(body.config);
    if(valid.error)return json({error:valid.error},400);
    try{
      const id=rid('modal');
      await env.DB.prepare('INSERT INTO cms_modals(id,tenant_id,modal_key,title,subtitle,is_active,config_json) VALUES(?,?,?,?,?,0,?)')
        .bind(id,TENANT_ID,modalKey,str(body.title,120)||modalKey,str(body.subtitle,400),JSON.stringify(valid.config)).run();
      return json({ok:true,modal_key:modalKey,id},201);
    }catch(e){return json({error:'Key already exists or checkout cannot be created'},409);}
  }
  if(!key)return json({error:'Unsupported method'},405);
  const row=await env.DB.prepare('SELECT id,modal_key,config_json FROM cms_modals WHERE tenant_id=? AND modal_key=? LIMIT 1').bind(TENANT_ID,key).first();
  if(!row||!checkoutRow(row)||key==='donate_cta')return json({error:'This modal is managed separately or does not exist'},404);
  if(request.method==='DELETE'){
    await env.DB.prepare("UPDATE cms_modals SET is_active=0,updated_at=datetime('now') WHERE id=? AND tenant_id=?").bind(row.id,TENANT_ID).run();
    return json({ok:true,archived:true});
  }
  if(request.method==='PUT'){
    const body=await request.json().catch(()=>({}));
    const valid=normalizeAdminConfig(body.config);
    if(valid.error)return json({error:valid.error},400);
    if(valid.config.campaign_id){
      const campaign=await env.DB.prepare('SELECT id FROM fundraising_campaigns WHERE id=? AND tenant_id=? LIMIT 1').bind(valid.config.campaign_id,TENANT_ID).first();
      if(!campaign)return json({error:'Campaign not found'},400);
    }
    await env.DB.prepare("UPDATE cms_modals SET title=?,subtitle=?,config_json=?,is_active=?,updated_at=datetime('now') WHERE id=? AND tenant_id=?")
      .bind(str(body.title,120)||key,str(body.subtitle,400),JSON.stringify(valid.config),body.is_active===true?1:0,row.id,TENANT_ID).run();
    return json({ok:true,modal_key:key,is_active:body.is_active===true});
  }
  return json({error:'Method not allowed'},405);
}

export async function checkoutModalRoutes(request, env, url) {
  if (url.pathname===ADMIN_PATH || url.pathname.startsWith(ADMIN_PATH+'/'))return adminRoutes(request,env,url);
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
