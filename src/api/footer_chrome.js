/**
 * Sitewide footer chrome — SSOT shape for cms_brand_settings.footer_json.
 * render_site_nav.js paints from this; CMS page editor Footer panel writes it.
 */

export const FOOTER_PLACEMENTS = ["organization", "follow_us", "footer_bottom"];

export const DEFAULT_COLUMN_LABELS = {
  pages: "Pages",
  organization: "Organization",
  follow_us: "Follow Us",
  staff: "Staff",
};

export const DEFAULT_CANDID_BADGE = {
  id: "badge_candid",
  label: "Candid Seal of Transparency",
  caption: "Visit our Candid Profile",
  href: "https://app.candid.org/profile/14607574/companions-of-cpas-88-4156327/?pkId=ef6a3773-8ef0-42a2-b7df-ad52ac334f0e",
  image_url: "https://widgets.guidestar.org/prod/v1/pdp/transparency-seal/14607574/svg",
  enabled: true,
  height_px: 72,
  placement: "organization",
  sort_order: 10,
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
  const href = String(b.href || "").trim();
  let caption = String(b.caption ?? "").trim();
  // Backfill readable CTA for Candid rows that were saved before caption existed.
  if (!caption && /candid\.org|guidestar\.org/i.test(href + " " + String(b.image_url || ""))) {
    caption = "Visit our Candid Profile";
  }
  return {
    id: String(b.id || "").trim() || newTrustBadgeId(),
    label: String(b.label || "").trim() || "Trust badge",
    caption,
    href,
    image_url: String(b.image_url || "").trim(),
    enabled: b.enabled !== false && b.enabled !== 0,
    height_px: Number.isFinite(height) && height > 0 ? Math.max(24, Math.min(160, Math.round(height))) : 72,
    placement: FOOTER_PLACEMENTS.includes(placement) ? placement : "organization",
    sort_order: Number.isFinite(Number(b.sort_order)) ? Number(b.sort_order) : (index + 1) * 10,
  };
}

/**
 * @param {object|string|null} footerJson
 * @returns {{
 *   col_label_size_px: number,
 *   column_labels: Record<string,string>,
 *   trust_badges: ReturnType<typeof normalizeTrustBadge>[],
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

  let trust_badges;
  if (Object.prototype.hasOwnProperty.call(footer, "trust_badges")) {
    trust_badges = Array.isArray(footer.trust_badges)
      ? footer.trust_badges.map((b, i) => normalizeTrustBadge(b, i))
      : [];
  } else {
    trust_badges = [normalizeTrustBadge(DEFAULT_CANDID_BADGE, 0)];
  }

  trust_badges = [...trust_badges].sort(
    (a, b) => (a.sort_order - b.sort_order) || a.label.localeCompare(b.label)
  );

  return { col_label_size_px, column_labels, trust_badges };
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
