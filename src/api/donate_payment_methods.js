/**
 * D1-driven donate payment methods — fully CMS-editable.
 * SSOT precedence (highest first):
 *   section.config_json.payment_methods_json  →  cms_components  →  DEFAULT_METHODS
 * URLs: method.url → donation_settings[url_field] → component.config.url
 * Colors/logos: method fields → component.config → DEFAULT_STYLES
 * After this ships, button edits are D1/CMS + Publish — no worker redeploy.
 */
import { getComponent, COMPONENT_LOGOS } from "./cms_components.js";
import { escapeHtml } from "./render_section.js";

const TENANT_ID = "tenant_companionscpas";
const CDN = "https://assets.companionsofcaddo.org";

/** Visual defaults — overridden by cms_components / payment_methods_json */
export const DEFAULT_STYLES = {
  zeffy: {
    background: "#141018",
    border_color: "#141018",
    text_color: "#faf7f3",
    note_color: "#49e9d5",
  },
  paypal: {
    background: "#eef5ff",
    border_color: "#9ec0ef",
    text_color: "#003087",
    note_color: "",
  },
  venmo: {
    background: "#eaf6fc",
    border_color: "#7ec0e8",
    text_color: "#008CFF",
    note_color: "",
  },
  amazon_wishlist: {
    background: "#fff6e8",
    border_color: "#f0c078",
    text_color: "#232f3e",
    note_color: "",
  },
  amazon: {
    background: "#fff6e8",
    border_color: "#f0c078",
    text_color: "#232f3e",
    note_color: "",
  },
  stripe: {
    background: "#f3f0ff",
    border_color: "#b8a9ff",
    text_color: "#3d348b",
    note_color: "",
  },
  default: {
    background: "#ffffff",
    border_color: "rgba(26,22,34,0.12)",
    text_color: "#1a1622",
    note_color: "",
  },
};

const DEFAULT_METHODS = [
  {
    id: "zeffy",
    enabled: true,
    label: "",
    tooltip: "Donate with Zeffy — 100% goes to animals (fee-free)",
    show_label: false,
    note: "fee-free",
    url_field: "zeffy_donate_url",
    component_id: "payment_zeffy",
    logo_asset_key: "payment_logo_zeffy",
    style: "zeffy",
    logo_height: 22,
    ...DEFAULT_STYLES.zeffy,
  },
  {
    id: "paypal",
    enabled: true,
    label: "",
    tooltip: "Donate via PayPal",
    show_label: false,
    note: "",
    url_field: "paypal_donate_url",
    component_id: "payment_paypal",
    logo_asset_key: "payment_logo_paypal",
    style: "paypal",
    logo_height: 22,
    ...DEFAULT_STYLES.paypal,
  },
  {
    id: "venmo",
    enabled: true,
    label: "",
    tooltip: "Pay on Venmo",
    show_label: false,
    note: "",
    url_field: "venmo_donate_url",
    component_id: "payment_venmo",
    logo_asset_key: "payment_logo_venmo",
    style: "venmo",
    logo_height: 22,
    ...DEFAULT_STYLES.venmo,
  },
  {
    id: "amazon_wishlist",
    enabled: true,
    label: "",
    tooltip: "Send supplies via Amazon Wishlist",
    show_label: false,
    note: "",
    url_field: "amazon_wishlist_url",
    component_id: "wishlist_amazon",
    logo_asset_key: "payment_logo_amazon",
    style: "amazon",
    logo_height: 28,
    ...DEFAULT_STYLES.amazon_wishlist,
  },
  {
    id: "stripe",
    enabled: true,
    label: "",
    tooltip: "Card or bank donation",
    show_label: false,
    note: "",
    action: "donate",
    component_id: "payment_stripe_donation_modal",
    logo_asset_key: "payment_logo_stripe",
    style: "stripe",
    logo_height: 22,
    ...DEFAULT_STYLES.stripe,
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

function cssColor(v) {
  const s = text(v);
  if (!s) return "";
  if (/[;"'<>\\]/.test(s)) return "";
  return s;
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
  const fromMethod = text(method.logo_url);
  if (fromMethod) return fromMethod;
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
  if (text(method.url)) return text(method.url);
  const field = text(method.url_field);
  if (field && text(settings[field])) return text(settings[field]);
  if (text(component?.config?.url)) return text(component.config.url);
  return "";
}

function pickStyle(method, component) {
  const id = text(method.style) || text(method.id) || "default";
  const base = DEFAULT_STYLES[id] || DEFAULT_STYLES.default;
  const c = component?.config || {};
  return {
    background: cssColor(method.background) || cssColor(c.background) || base.background,
    borderColor: cssColor(method.border_color || method.borderColor)
      || cssColor(c.border_color)
      || base.border_color,
    textColor: cssColor(method.text_color || method.textColor || method.brand_color)
      || cssColor(c.text_color)
      || cssColor(c.brand_color)
      || base.text_color,
    noteColor: cssColor(method.note_color || method.noteColor)
      || cssColor(c.note_color)
      || base.note_color,
  };
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

/** Layout tokens from section config — CMS editable, no deploy. */
export function resolvePaymentLayout(sectionConfig = {}) {
  const gap = text(sectionConfig.button_gap) || "1rem";
  const minH = text(sectionConfig.button_min_height) || "5.25rem";
  const maxW = text(sectionConfig.buttons_max_width) || "22rem";
  const safe = (v) => (/[;"'<>\\]/.test(v) ? "" : v);
  return {
    gap: safe(gap) || "1rem",
    minHeight: safe(minH) || "3.75rem",
    maxWidth: safe(maxW) || "22rem",
  };
}

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
    // label is optional on-button text (off by default). tooltip drives hover + a11y.
    // Do NOT fall back to cms_components.label — empty means intentionally hidden.
    const showLabel = m.show_label === true || m.show_label === 1 || m.show_label === "1";
    const label = text(m.label);
    const tooltip = text(m.tooltip) || label || text(component?.config?.label) || text(component?.label) || text(m.id);
    const note = Object.prototype.hasOwnProperty.call(m, "note")
      ? text(m.note)
      : text(component?.config?.note);
    const logoHeight = Number(m.logo_height || component?.config?.logo_height) || 22;
    const colors = pickStyle(m, component);
    resolved.push({
      id: text(m.id) || `pay_${index}`,
      label,
      showLabel,
      tooltip,
      note,
      href,
      isStripe,
      logoUrl,
      logoHeight,
      style: text(m.style) || text(m.id) || "default",
      ...colors,
      urlField: text(m.url_field),
      componentId: text(m.component_id),
    });
  }
  return resolved;
}

function buttonInlineStyle(m) {
  const parts = [];
  if (m.background) parts.push(`background:${m.background}`);
  if (m.borderColor) parts.push(`border-color:${m.borderColor}`);
  if (m.textColor) parts.push(`color:${m.textColor}`);
  return parts.join(";");
}

export function renderPaymentMethodButtonsHtml(methods, opts = {}) {
  if (!methods?.length) return "";
  const layout = opts.layout || {};
  const className = opts.className || "dpay-methods";
  const styleVars = [
    layout.gap ? `--dpay-gap:${layout.gap}` : "",
    layout.minHeight ? `--dpay-btn-min-h:${layout.minHeight}` : "",
    layout.maxWidth ? `--dpay-max-w:${layout.maxWidth}` : "",
  ].filter(Boolean).join(";");

  const buttons = methods.map((m) => {
    const tip = m.tooltip || m.label || m.id;
    const logo = m.logoUrl
      ? `<img class="dpay-logo" src="${escAttr(m.logoUrl)}" alt="" height="${m.logoHeight}" style="height:${m.logoHeight}px;width:auto" loading="lazy" decoding="async" />`
      : "";
    const noteStyle = m.noteColor ? ` style="color:${escAttr(m.noteColor)}"` : "";
    const note = m.note ? `<span class="dpay-note"${noteStyle}>${esc(m.note)}</span>` : "";
    const label = m.showLabel && m.label
      ? `<span class="dpay-label">${esc(m.label)}</span>`
      : "";
    const copy = (label || note)
      ? `<span class="dpay-copy">${label}${note}</span>`
      : "";
    const inner = `${logo}${copy}`;
    const btnStyle = buttonInlineStyle(m);
    const styleAttr = btnStyle ? ` style="${escAttr(btnStyle)}"` : "";
    const styleMod = ` dpay-btn--${escAttr(m.style || "default")}`;
    const tipAttr = ` title="${escAttr(tip)}" aria-label="${escAttr(tip)}"`;
    if (m.isStripe) {
      return `<button type="button" class="dpay-btn${styleMod}"${styleAttr}${tipAttr} data-action="donate" data-pay-id="${escAttr(m.id)}">${inner}</button>`;
    }
    return `<a class="dpay-btn${styleMod}"${styleAttr}${tipAttr} href="${escAttr(m.href)}" target="_blank" rel="noopener noreferrer" data-pay-id="${escAttr(m.id)}">${inner}</a>`;
  }).join("\n");

  const wrapStyle = styleVars ? ` style="${escAttr(styleVars)}"` : "";
  return `<div class="${escAttr(className)}"${wrapStyle} role="group" aria-label="Ways to give">${buttons}</div>`;
}

export function getEditablePaymentMethodsDefaults() {
  return DEFAULT_METHODS.map((m) => ({ ...m }));
}

export { DEFAULT_METHODS, CDN };
