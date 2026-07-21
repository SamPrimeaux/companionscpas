/**
 * D1-driven donate payment methods.
 * SSOT: donation_settings (URLs) + cms_components (logos/labels)
 * + optional section.config_json.payment_methods_json (order / enable / copy).
 * Logos resolve: component.logo_url → cms_assets(logo_asset_key) → COMPONENT_LOGOS.
 */
import { getComponent, COMPONENT_LOGOS } from "./cms_components.js";
import { escapeHtml } from "./render_section.js";

const TENANT_ID = "tenant_companionscpas";
const CDN = "https://assets.companionsofcaddo.org";

const DEFAULT_METHODS = [
  {
    id: "zeffy",
    enabled: true,
    label: "Donate — 100% goes to animals",
    note: "fee-free",
    url_field: "zeffy_donate_url",
    component_id: "payment_zeffy",
    logo_asset_key: "payment_logo_zeffy",
    style: "zeffy",
    logo_height: 22,
  },
  {
    id: "paypal",
    enabled: true,
    label: "Donate via PayPal",
    url_field: "paypal_donate_url",
    component_id: "payment_paypal",
    logo_asset_key: "payment_logo_paypal",
    style: "paypal",
  },
  {
    id: "venmo",
    enabled: true,
    label: "Pay on Venmo",
    url_field: "venmo_donate_url",
    component_id: "payment_venmo",
    logo_asset_key: "payment_logo_venmo",
    style: "venmo",
  },
  {
    id: "amazon_wishlist",
    enabled: true,
    label: "Send supplies",
    url_field: "amazon_wishlist_url",
    component_id: "wishlist_amazon",
    logo_asset_key: "payment_logo_amazon",
    style: "amazon",
    logo_height: 28,
  },
  {
    id: "stripe",
    enabled: true,
    label: "Card or bank",
    action: "donate",
    component_id: "payment_stripe_donation_modal",
    logo_asset_key: "payment_logo_stripe",
    style: "stripe",
    logo_height: 22,
  },
];

function text(v) {
  if (v == null) return "";
  return String(v).trim();
}

function esc(v) {
  return escapeHtml(v);
}

function escAttr(v) {
  return escapeHtml(v);
}

export async function loadDonationSettings(env) {
  if (!env?.DB) return {};
  try {
    const row = await env.DB.prepare(
      `SELECT paypal_donate_url, venmo_donate_url, zeffy_donate_url, amazon_wishlist_url,
              provider, currency, default_amounts_json
       FROM donation_settings
       WHERE tenant_id = ?
       LIMIT 1`
    ).bind(TENANT_ID).first();
    return row || {};
  } catch {
    return {};
  }
}

async function loadAssetUrlByKey(env, assetKey) {
  const key = text(assetKey);
  if (!key || !env?.DB) return "";
  try {
    const row = await env.DB.prepare(
      `SELECT public_url FROM cms_assets
       WHERE tenant_id = ? AND (asset_key = ? OR id = ?)
       LIMIT 1`
    ).bind(TENANT_ID, key, key).first();
    return text(row?.public_url);
  } catch {
    return "";
  }
}

function resolveLogoFromCatalog(method) {
  const key = text(method.logo_key) || text(method.id);
  if (COMPONENT_LOGOS[key]?.src) return COMPONENT_LOGOS[key].src;
  if (key === "amazon_wishlist" || key === "amazon") return COMPONENT_LOGOS.amazon_wishlist?.src || "";
  if (key === "paypal") return COMPONENT_LOGOS.paypal?.src || "";
  if (key === "venmo") return COMPONENT_LOGOS.venmo?.src || "";
  if (key === "zeffy") return COMPONENT_LOGOS.zeffy?.src || "";
  if (key === "stripe") return COMPONENT_LOGOS.stripe?.src || "";
  return "";
}

async function resolveLogoUrl(env, method, component) {
  const fromComponent = text(component?.config?.logo_url);
  if (fromComponent) return fromComponent;
  const assetKey = text(method.logo_asset_key) || text(component?.config?.logo_asset_key);
  if (assetKey) {
    const fromAsset = await loadAssetUrlByKey(env, assetKey);
    if (fromAsset) return fromAsset;
  }
  return resolveLogoFromCatalog(method);
}

function resolveHref(method, settings, component) {
  if (text(method.action) === "donate" || text(method.id) === "stripe") return "";
  const field = text(method.url_field);
  if (field && text(settings[field])) return text(settings[field]);
  if (text(method.url)) return text(method.url);
  if (text(component?.config?.url)) return text(component.config.url);
  return "";
}

function parseMethodsConfig(sectionConfig = {}) {
  const raw = sectionConfig.payment_methods_json ?? sectionConfig.payment_methods;
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch { /* keep defaults */ }
  } else if (Array.isArray(raw) && raw.length) {
    return raw;
  }
  return DEFAULT_METHODS;
}

/**
 * Build ordered payment method rows for rendering.
 */
export async function resolvePaymentMethods(env, sectionConfig = {}) {
  const settings = await loadDonationSettings(env);
  const methods = parseMethodsConfig(sectionConfig || {});

  const componentIds = [...new Set(
    methods.map((m) => text(m.component_id)).filter(Boolean)
  )];
  const byId = {};
  await Promise.all(componentIds.map(async (id) => {
    const component = await getComponent(id, env);
    if (component) byId[id] = component;
  }));

  const resolved = [];
  for (let index = 0; index < methods.length; index++) {
    const m = methods[index];
    if (!m || m.enabled === false || m.enabled === 0 || m.enabled === "0") continue;
    const component = byId[text(m.component_id)] || null;
    const href = resolveHref(m, settings, component);
    const isStripe = text(m.action) === "donate" || text(m.id) === "stripe";
    if (!isStripe && !href) continue;
    const logoUrl = await resolveLogoUrl(env, m, component);
    const label = text(m.label) || text(component?.config?.label) || text(component?.label) || text(m.id);
    const note = text(m.note) || text(component?.config?.note);
    const logoHeight = Number(m.logo_height || component?.config?.logo_height) || 22;
    resolved.push({
      id: text(m.id) || `pay_${index}`,
      label,
      note,
      href,
      isStripe,
      logoUrl,
      logoHeight,
      style: text(m.style) || text(m.id) || "default",
      brandColor: text(m.brand_color) || text(component?.config?.brand_color),
      background: text(m.background) || text(component?.config?.background) || "",
    });
  }
  return resolved;
}

/**
 * Render the reusable payment method button stack (D1-driven).
 */
export function renderPaymentMethodButtonsHtml(methods, opts = {}) {
  if (!methods?.length) return "";
  const className = opts.className || "dpay-methods";
  const buttons = methods.map((m) => {
    const logo = m.logoUrl
      ? `<img class="dpay-logo" src="${escAttr(m.logoUrl)}" alt="" height="${m.logoHeight}" style="height:${m.logoHeight}px;width:auto" loading="lazy" decoding="async" />`
      : "";
    const note = m.note ? `<span class="dpay-note">${esc(m.note)}</span>` : "";
    const label = `<span class="dpay-label">${esc(m.label)}</span>`;
    const inner = `${logo}<span class="dpay-copy">${label}${note}</span>`;
    const styleMod = ` dpay-btn--${escAttr(m.style || "default")}`;
    if (m.isStripe) {
      return `<button type="button" class="dpay-btn${styleMod}" data-action="donate" aria-label="${escAttr(m.label)}">${inner}</button>`;
    }
    return `<a class="dpay-btn${styleMod}" href="${escAttr(m.href)}" target="_blank" rel="noopener noreferrer" aria-label="${escAttr(m.label)}">${inner}</a>`;
  }).join("\n");

  return `<div class="${escAttr(className)}" role="group" aria-label="Ways to give">${buttons}</div>`;
}

export { DEFAULT_METHODS, CDN };
