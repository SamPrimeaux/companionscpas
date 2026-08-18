/**
 * Sitewide footer chrome — SSOT:
 *   cms_components type=trust_badge  → reusable field catalog
 *   cms_brand_settings.footer_json   → layout (placement, order, enabled, overrides)
 * Renderers must not inject tenant URLs. Empty D1 → empty chrome.
 */

export const FOOTER_PLACEMENTS = ["organization", "follow_us", "footer_bottom"];

/** Schema labels for the four footer columns — not tenant content. Overridden by footer_json.column_labels. */
export const DEFAULT_COLUMN_LABELS = {
  pages: "Pages",
  organization: "Organization",
  follow_us: "Follow Us",
  staff: "Staff",
};

function esc(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseObj(raw, fallback = {}) {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw || "{}");
      return p && typeof p === "object" && !Array.isArray(p) ? p : fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

export function newTrustBadgeId() {
  return `badge_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function normalizeTrustBadge(raw, index = 0) {
  const b = raw && typeof raw === "object" ? raw : {};
  const placement = String(b.placement || "organization").trim().toLowerCase();
  const height = Number(b.height_px);
  return {
    id: String(b.id || "").trim() || newTrustBadgeId(),
    component_id: String(b.component_id || "").trim() || null,
    label: String(b.label || "").trim() || "Trust badge",
    caption: String(b.caption ?? "").trim(),
    href: String(b.href || "").trim(),
    image_url: String(b.image_url || "").trim(),
    enabled: b.enabled !== false && b.enabled !== 0,
    height_px: Number.isFinite(height) && height > 0 ? Math.max(24, Math.min(160, Math.round(height))) : 72,
    placement: FOOTER_PLACEMENTS.includes(placement) ? placement : "organization",
    sort_order: Number.isFinite(Number(b.sort_order)) ? Number(b.sort_order) : (index + 1) * 10,
  };
}

export function trustBadgeFromComponent(component, index = 0) {
  const cfg = component?.config && typeof component.config === "object" ? component.config : {};
  const id = String(component?.id || "").trim() || newTrustBadgeId();
  return normalizeTrustBadge({
    id,
    component_id: id,
    label: cfg.label || component?.label,
    caption: cfg.caption,
    href: cfg.href || cfg.url,
    image_url: cfg.image_url,
    enabled: cfg.enabled !== false && cfg.enabled !== 0,
    height_px: cfg.height_px,
    placement: cfg.placement,
    sort_order: cfg.sort_order ?? component?.sort_order,
  }, index);
}

export function componentConfigFromTrustBadge(badge) {
  const b = normalizeTrustBadge(badge, 0);
  return {
    label: b.label,
    caption: b.caption,
    href: b.href,
    image_url: b.image_url,
    height_px: b.height_px,
    placement: b.placement,
    enabled: b.enabled,
  };
}

/**
 * @param {object|string|null} footerJson
 * @returns {{
 *   col_label_size_px: number,
 *   column_labels: Record<string,string>,
 *   trust_badges: ReturnType<typeof normalizeTrustBadge>[],
 *   has_trust_badge_layout: boolean,
 * }}
 */
export function normalizeFooterChrome(footerJson) {
  const footer = parseObj(footerJson, {});
  const labelsIn = parseObj(footer.column_labels, {});
  const column_labels = {
    pages: String(labelsIn.pages || DEFAULT_COLUMN_LABELS.pages).trim() || DEFAULT_COLUMN_LABELS.pages,
    organization: String(labelsIn.organization || DEFAULT_COLUMN_LABELS.organization).trim() || DEFAULT_COLUMN_LABELS.organization,
    follow_us: String(labelsIn.follow_us || DEFAULT_COLUMN_LABELS.follow_us).trim() || DEFAULT_COLUMN_LABELS.follow_us,
    staff: String(labelsIn.staff || DEFAULT_COLUMN_LABELS.staff).trim() || DEFAULT_COLUMN_LABELS.staff,
  };
  const sizeRaw = Number(footer.col_label_size_px);
  const col_label_size_px = Number.isFinite(sizeRaw) && sizeRaw > 0
    ? Math.max(10, Math.min(28, Math.round(sizeRaw)))
    : 15;

  const has_trust_badge_layout = Object.prototype.hasOwnProperty.call(footer, "trust_badges");
  const trust_badges = has_trust_badge_layout
    ? (Array.isArray(footer.trust_badges) ? footer.trust_badges.map((b, i) => normalizeTrustBadge(b, i)) : [])
    : [];

  trust_badges.sort((a, b) => (a.sort_order - b.sort_order) || a.label.localeCompare(b.label));

  return { col_label_size_px, column_labels, trust_badges, has_trust_badge_layout };
}

/** Merge footer_json layout with cms_components catalog. Never invent tenant URLs in code. */
export function hydrateFooterChrome(footerJson, trustBadgeComponents = []) {
  const footer = parseObj(footerJson, {});
  const chrome = normalizeFooterChrome(footer);
  const catalog = new Map((trustBadgeComponents || []).map((c) => [String(c.id), c]));

  const mergeCatalog = (badge, index) => {
    const cid = String(badge.component_id || (catalog.has(badge.id) ? badge.id : "")).trim();
    const comp = cid ? catalog.get(cid) : null;
    if (!comp) return badge;
    const fromComp = trustBadgeFromComponent(comp, index);
    return normalizeTrustBadge({
      ...fromComp,
      ...badge,
      id: badge.id || fromComp.id,
      component_id: cid,
      label: badge.label || fromComp.label,
      caption: badge.caption || fromComp.caption,
      href: badge.href || fromComp.href,
      image_url: badge.image_url || fromComp.image_url,
    }, index);
  };

  if (chrome.has_trust_badge_layout) {
    chrome.trust_badges = chrome.trust_badges.map(mergeCatalog);
  } else {
    chrome.trust_badges = (trustBadgeComponents || []).map((c, i) => trustBadgeFromComponent(c, i));
  }
  chrome.trust_badges.sort((a, b) => (a.sort_order - b.sort_order) || a.label.localeCompare(b.label));
  return chrome;
}

export function badgesForPlacement(chrome, placement) {
  return (chrome?.trust_badges || []).filter(
    (b) => b.enabled && b.placement === placement && b.image_url && b.href
  );
}

/** HTML for trust badges in one footer slot (preview gets data-cms-* hooks). */
export function renderTrustBadgesHtml(badges, { preview = false } = {}) {
  if (!badges?.length) return "";
  const items = badges.map((b) => {
    const id = esc(b.id);
    const label = esc(b.label || "Trust badge");
    const caption = String(b.caption || "").trim();
    const height = Number(b.height_px) || 72;
    const captionAttr = preview
      ? ` data-cms-chrome="footer" data-cms-badge-id="${id}" data-cms-field="caption"`
      : "";
    const imgAttr = preview
      ? ` data-cms-chrome="footer" data-cms-badge-id="${id}" data-cms-field="image_url"`
      : "";
    const captionHtml = caption
      ? `<p class="footer-trust-caption"${captionAttr}>${esc(caption)}</p>`
      : (preview
        ? `<p class="footer-trust-caption footer-trust-caption--empty"${captionAttr}>Add caption…</p>`
        : "");
    return `<div class="footer-trust-item" data-badge-id="${id}">
      ${captionHtml}
      <a class="footer-trust" href="${esc(b.href)}" target="_blank" rel="noopener" aria-label="${label}"${imgAttr}>
        <img src="${esc(b.image_url)}" alt="${label}" style="height:${height}px;width:auto;max-width:200px;object-fit:contain" />
      </a>
    </div>`;
  }).join("\n");
  return `<div class="footer-trust-badges">${items}</div>`;
}

export function colLabelAttr(key, preview) {
  if (!preview) return "";
  return ` data-cms-chrome="footer" data-cms-field="column_labels.${key}"`;
}
