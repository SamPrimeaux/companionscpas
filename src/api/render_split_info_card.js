/**
 * Split info card — image + copy with editable bullet list and nested contact card.
 * Used for Foster supplies (and reusable elsewhere).
 */

function text(value) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function escapeHtml(value) {
  return text(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeJson(value, fallback = {}) {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    const parsed = JSON.parse(String(value));
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch {
    return fallback;
  }
}

function pickText(source, keys) {
  for (const key of keys) {
    const value = source?.[key];
    if (value === null || value === undefined) continue;
    const normalized = String(value).trim();
    if (normalized) return normalized;
  }
  return "";
}

function escapeAttr(value) {
  return escapeHtml(value);
}

const CDN = "https://assets.companionsofcaddo.org";

function safeUrl(value, fallback = "") {
  const raw = text(value).trim();
  if (!raw) return fallback;
  if (raw.startsWith("/media/") || raw.startsWith("/static/") || raw.startsWith("/assets/")) {
    return escapeAttr(CDN + raw);
  }
  if (raw.startsWith("/") || raw.startsWith("#")) return escapeAttr(raw);
  try {
    const parsed = new URL(raw);
    const protocol = parsed.protocol.toLowerCase();
    if (protocol === "http:" || protocol === "https:" || protocol === "mailto:" || protocol === "tel:") {
      return escapeAttr(parsed.toString());
    }
    return fallback;
  } catch {
    return fallback;
  }
}

function parseSupplies(config) {
  const raw = config?.supplies;
  if (Array.isArray(raw)) {
    return raw.map((item) => text(item).trim()).filter(Boolean);
  }
  if (typeof raw === "string") {
    return raw
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function digitsOnly(value) {
  return text(value).replace(/\D+/g, "");
}

function formatPhoneDisplay(value) {
  const digits = digitsOnly(value);
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return text(value).trim();
}

/**
 * @param {object} section
 * @returns {string}
 */
export function renderSplitInfoCard(section) {
  const config = safeJson(section?.config_json, {});
  const contact = config?.contact && typeof config.contact === "object" ? config.contact : {};
  const sectionKey = pickText(section, ["section_key"]) || "split_info_card";
  const imagePosition = pickText(config, ["image_position"]).toLowerCase() === "right" ? "right" : "left";
  const imageUrl = pickText(section, ["image_url"]) || pickText(config, ["image_url"]);
  const imageAlt = pickText(config, ["image_alt"]) || pickText(section, ["heading"]) || "Section image";
  const eyebrow = pickText(section, ["eyebrow"]) || pickText(config, ["eyebrow"]);
  const heading = pickText(section, ["heading", "title"]) || pickText(config, ["heading"]);
  const body = pickText(section, ["body"]) || pickText(config, ["body"]);
  const supplies = parseSupplies(config);
  const contactEyebrow = pickText(contact, ["eyebrow"]) || pickText(config, ["contact_eyebrow"]);
  const contactName = pickText(contact, ["name"]) || pickText(config, ["contact_name"]);
  const contactEmail = pickText(contact, ["email"]) || pickText(config, ["contact_email"]);
  const contactPhone = pickText(contact, ["phone"]) || pickText(config, ["contact_phone"]);
  const phoneDigits = digitsOnly(contactPhone);
  const phoneDisplay = formatPhoneDisplay(contactPhone);

  const suppliesHtml = supplies.length
    ? `<ul class="cpas-sic-list" data-cms-field="supplies">${supplies
        .map((item) => `<li>${escapeHtml(item)}</li>`)
        .join("")}</ul>`
    : "";

  const contactHtml =
    contactEyebrow || contactName || contactEmail || contactPhone
      ? `<div class="cpas-sic-contact" data-cms-field="contact">
        ${contactEyebrow ? `<p class="cpas-sic-contact-ey">${escapeHtml(contactEyebrow)}</p>` : ""}
        ${contactName ? `<p class="cpas-sic-contact-name">${escapeHtml(contactName)}</p>` : ""}
        <div class="cpas-sic-contact-actions">
          ${
            contactEmail
              ? `<a class="cpas-sic-btn cpas-sic-btn-email" href="mailto:${escapeAttr(contactEmail)}">${escapeHtml(contactEmail)}</a>`
              : ""
          }
          ${
            phoneDigits
              ? `<a class="cpas-sic-btn cpas-sic-btn-phone" href="tel:${escapeAttr(phoneDigits)}">${escapeHtml(phoneDisplay)}</a>`
              : ""
          }
        </div>
      </div>`
      : "";

  const imgCol = imageUrl
    ? `<div class="cpas-sic-media" data-cms-field="image_url">
        <img src="${safeUrl(imageUrl)}" alt="${escapeAttr(imageAlt)}" loading="lazy" />
      </div>`
    : `<div class="cpas-sic-media cpas-sic-media--empty" data-cms-field="image_url" aria-hidden="true"></div>`;

  const bodyCol = `<div class="cpas-sic-body">
      ${eyebrow ? `<p class="cpas-sic-eyebrow" data-cms-field="eyebrow">${escapeHtml(eyebrow)}</p>` : ""}
      ${heading ? `<h2 class="cpas-sic-heading" data-cms-field="heading">${escapeHtml(heading)}</h2>` : ""}
      ${body ? `<p class="cpas-sic-copy" data-cms-field="body">${escapeHtml(body)}</p>` : ""}
      ${suppliesHtml}
      ${contactHtml}
    </div>`;

  const row = imagePosition === "right" ? `${bodyCol}${imgCol}` : `${imgCol}${bodyCol}`;

  return `
<style>
[data-cpas-section="${escapeAttr(sectionKey)}"].cpas-sic {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem 1rem;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
[data-cpas-section="${escapeAttr(sectionKey)}"] .cpas-sic-card {
  background: #ffffff;
  border: 1px solid #e8e6e0;
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-wrap: wrap;
}
[data-cpas-section="${escapeAttr(sectionKey)}"] .cpas-sic-media {
  flex: 1 1 320px;
  min-height: 280px;
  background: #f3eef8;
}
[data-cpas-section="${escapeAttr(sectionKey)}"] .cpas-sic-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  min-height: 280px;
}
[data-cpas-section="${escapeAttr(sectionKey)}"] .cpas-sic-body {
  flex: 1 1 320px;
  padding: 2rem 2.25rem;
}
[data-cpas-section="${escapeAttr(sectionKey)}"] .cpas-sic-eyebrow {
  font-size: 12px;
  font-weight: 600;
  color: #7B2FBE;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 0 0 10px;
}
[data-cpas-section="${escapeAttr(sectionKey)}"] .cpas-sic-heading {
  font-family: Georgia, "Times New Roman", serif;
  font-size: 28px;
  font-weight: 400;
  color: #1a1a1a;
  margin: 0 0 14px;
  line-height: 1.25;
}
[data-cpas-section="${escapeAttr(sectionKey)}"] .cpas-sic-copy {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  margin: 0 0 18px;
}
[data-cpas-section="${escapeAttr(sectionKey)}"] .cpas-sic-list {
  margin: 0 0 1.75rem;
  padding: 0 0 0 1.15rem;
  list-style: disc;
  color: #7B2FBE;
}
[data-cpas-section="${escapeAttr(sectionKey)}"] .cpas-sic-list li {
  font-size: 14px;
  font-weight: 500;
  color: #3b2a52;
  line-height: 1.55;
  margin: 0 0 6px;
  padding-left: 2px;
}
[data-cpas-section="${escapeAttr(sectionKey)}"] .cpas-sic-contact {
  border: 1px solid #e8e6e0;
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
}
[data-cpas-section="${escapeAttr(sectionKey)}"] .cpas-sic-contact-ey {
  font-size: 12px;
  font-weight: 600;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 0 0 10px;
}
[data-cpas-section="${escapeAttr(sectionKey)}"] .cpas-sic-contact-name {
  font-weight: 600;
  font-size: 17px;
  margin: 0 0 12px;
  color: #1a1a1a;
}
[data-cpas-section="${escapeAttr(sectionKey)}"] .cpas-sic-contact-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
[data-cpas-section="${escapeAttr(sectionKey)}"] .cpas-sic-btn {
  display: inline-flex;
  align-items: center;
  background: #ffffff;
  border: 1px solid #d8d2e6;
  font-size: 14px;
  font-weight: 500;
  padding: 10px 18px;
  border-radius: 8px;
  text-decoration: none;
}
[data-cpas-section="${escapeAttr(sectionKey)}"] .cpas-sic-btn-email { color: #7B2FBE; }
[data-cpas-section="${escapeAttr(sectionKey)}"] .cpas-sic-btn-phone { color: #1a1a1a; }
</style>
<section class="cpas-sic" data-cpas-section="${escapeAttr(sectionKey)}" data-section-key="${escapeAttr(sectionKey)}" data-section-type="split_info_card">
  <div class="cpas-sic-card">
    ${row}
  </div>
</section>`.trim();
}
