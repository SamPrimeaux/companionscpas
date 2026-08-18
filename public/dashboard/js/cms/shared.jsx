// CMS shared helpers (Babel global). Loaded before cms view modules.
// Tenant URLs: cmsCdnBase / cmsPublicOrigin from bootstrap (cms/feature-cards.jsx).

const CMS_CTA_ACTIONS = [
  { id: "modal_foster", label: "Open Foster Application", href: "modal:foster", formId: "form_foster_application" },
  { id: "modal_volunteer", label: "Open Volunteer modal", href: "modal:volunteer" },
  { id: "modal_contact", label: "Open Contact modal", href: "modal:contact" },
  { id: "donate", label: "Open Donate flow", href: "data-action:donate" },
  { id: "anchor_needs_foster", label: "Scroll to dogs needing foster", href: "#needs-foster" },
  { id: "page_fosters", label: "Go to /fosters", href: "/fosters" },
  { id: "page_adopt", label: "Go to /adopt", href: "/adopt" },
  { id: "page_donate", label: "Go to /donate", href: "/donate" },
  { id: "page_contact", label: "Go to /contact", href: "/contact" },
  { id: "custom", label: "Custom URL…", href: null },
];

function cmsMatchCtaAction(href, actions = CMS_CTA_ACTIONS) {
  const h = String(href || "").trim();
  if (!h) return "custom";
  const found = (actions || CMS_CTA_ACTIONS).find((a) => a.href && a.href === h);
  return found ? found.id : "custom";
}

function cmsNotify(setter, text, type = "ok") {
  setter({ text, type });
  setTimeout(() => setter({ text: "", type: "" }), 4000);
}

const FOOTER_BADGE_PLACEMENTS = [
  { value: "organization", label: "Organization column" },
  { value: "follow_us", label: "Follow Us column" },
  { value: "footer_bottom", label: "Bottom bar" },
];

const DEFAULT_FOOTER_COLUMN_LABELS = {
  pages: "Pages",
  organization: "Organization",
  follow_us: "Follow Us",
  staff: "Staff",
};

const DEFAULT_CANDID_TRUST_BADGE = {
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

function cmsParseJsonObject(raw, fallback = {}) {
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw || "{}") : (raw || {});
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function cmsNewBadgeId() {
  return `badge_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function cmsNormalizeTrustBadge(raw, index = 0) {
  const b = raw && typeof raw === "object" ? raw : {};
  const placement = String(b.placement || "organization").trim().toLowerCase();
  const height = Number(b.height_px);
  const allowed = FOOTER_BADGE_PLACEMENTS.map((p) => p.value);
  const href = String(b.href || "").trim();
  let caption = String(b.caption ?? "").trim();
  if (!caption && /candid\.org|guidestar\.org/i.test(href + " " + String(b.image_url || ""))) {
    caption = "Visit our Candid Profile";
  }
  return {
    id: String(b.id || "").trim() || cmsNewBadgeId(),
    label: String(b.label || "").trim() || "Trust badge",
    caption,
    href,
    image_url: String(b.image_url || "").trim(),
    enabled: b.enabled !== false && b.enabled !== 0,
    height_px: Number.isFinite(height) && height > 0 ? Math.max(24, Math.min(160, Math.round(height))) : 72,
    placement: allowed.includes(placement) ? placement : "organization",
    sort_order: Number.isFinite(Number(b.sort_order)) ? Number(b.sort_order) : (index + 1) * 10,
  };
}

function cmsNormalizeFooterChrome(footerJson) {
  const footer = footerJson && typeof footerJson === "object" ? footerJson : {};
  const labelsIn = cmsParseJsonObject(footer.column_labels, {});
  const column_labels = {
    pages: String(labelsIn.pages || DEFAULT_FOOTER_COLUMN_LABELS.pages).trim() || DEFAULT_FOOTER_COLUMN_LABELS.pages,
    organization: String(labelsIn.organization || DEFAULT_FOOTER_COLUMN_LABELS.organization).trim() || DEFAULT_FOOTER_COLUMN_LABELS.organization,
    follow_us: String(labelsIn.follow_us || DEFAULT_FOOTER_COLUMN_LABELS.follow_us).trim() || DEFAULT_FOOTER_COLUMN_LABELS.follow_us,
    staff: String(labelsIn.staff || DEFAULT_FOOTER_COLUMN_LABELS.staff).trim() || DEFAULT_FOOTER_COLUMN_LABELS.staff,
  };
  const sizeRaw = Number(footer.col_label_size_px);
  const col_label_size_px = Number.isFinite(sizeRaw) && sizeRaw > 0
    ? Math.max(10, Math.min(28, Math.round(sizeRaw)))
    : 15;
  let trust_badges;
  if (Object.prototype.hasOwnProperty.call(footer, "trust_badges")) {
    trust_badges = Array.isArray(footer.trust_badges)
      ? footer.trust_badges.map((b, i) => cmsNormalizeTrustBadge(b, i))
      : [];
  } else {
    trust_badges = [cmsNormalizeTrustBadge(DEFAULT_CANDID_TRUST_BADGE, 0)];
  }
  trust_badges = [...trust_badges].sort((a, b) => (a.sort_order - b.sort_order) || a.label.localeCompare(b.label));
  return { column_labels, col_label_size_px, trust_badges };
}

function CmsNotice({ n }) {
  if (!n?.text) return null;
  const isErr = n.type === "error";
  return React.createElement("div", {
    style: {
      padding: "10px 16px", borderRadius: 10, marginBottom: 16,
      background: isErr ? C.redDim : C.greenDim,
      border: `1px solid ${isErr ? C.red + "66" : C.green + "66"}`,
      color: isErr ? C.red : C.green, fontSize: 13, fontWeight: 500
    }
  }, n.text);
}

function CmsPageWrapper({ children, padding = "28px 28px 60px", className = "" }) {
  return React.createElement("div", { className: ("dash-page" + (className ? " " + className : "")), style: { padding, flex: 1 } }, children);
}

function PageStatusBadge({ status, navVisible }) {
  const map = {
    published: { bg: "#d1fae5", color: "#065f46", border: "#6ee7b7", label: "Published" },
    draft:     { bg: "#fef3c7", color: "#92400e", border: "#fcd34d", label: "Draft" },
    archived:  { bg: "#f3f4f6", color: "#4b5563", border: "#d1d5db", label: "Archived" },
  };
  const s = map[status] || map.draft;
  return React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 } },
    React.createElement("span", {
      style: { display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color, border: `1px solid ${s.border}`, whiteSpace: "nowrap" }
    },
      React.createElement("span", { style: { width: 5, height: 5, borderRadius: "50%", background: s.color } }),
      s.label
    ),
    navVisible === false && React.createElement("span", {
      style: { display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 600, background: "#f3f4f6", color: "#6b7280", border: "1px solid #d1d5db", whiteSpace: "nowrap" }
    }, "Hidden from nav")
  );
}

function pageNavVisible(page) {
  return page?.nav_visible !== 0 && page?.nav_visible !== false;
}

Object.assign(window, {
  CMS_CTA_ACTIONS,
  cmsMatchCtaAction,
  cmsNotify,
  FOOTER_BADGE_PLACEMENTS,
  DEFAULT_FOOTER_COLUMN_LABELS,
  DEFAULT_CANDID_TRUST_BADGE,
  cmsParseJsonObject,
  cmsNewBadgeId,
  cmsNormalizeTrustBadge,
  cmsNormalizeFooterChrome,
  CmsNotice,
  CmsPageWrapper,
  PageStatusBadge,
  pageNavVisible,
});
