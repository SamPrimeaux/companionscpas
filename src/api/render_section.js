function toRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function text(value) {
  if (value === null || value === undefined) return "";
  return String(value);
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

function sortBlocks(blocks) {
  if (!Array.isArray(blocks)) return [];
  return [...blocks]
    .map((block) => toRecord(block))
    .sort((a, b) => {
      const aOrder = Number.isFinite(Number(a.sort_order)) ? Number(a.sort_order) : 0;
      const bOrder = Number.isFinite(Number(b.sort_order)) ? Number(b.sort_order) : 0;
      return aOrder - bOrder;
    });
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function safeUrl(value, fallback = "") {
  const raw = text(value).trim();
  if (!raw) return fallback;
  if (raw.startsWith("/") || raw.startsWith("#") || raw.startsWith("./") || raw.startsWith("../")) {
    return escapeAttribute(raw);
  }
  try {
    const parsed = new URL(raw);
    const protocol = parsed.protocol.toLowerCase();
    if (protocol === "http:" || protocol === "https:" || protocol === "mailto:" || protocol === "tel:") {
      return escapeAttribute(parsed.toString());
    }
    return fallback;
  } catch {
    return fallback;
  }
}

function renderCta(label, url, className = "cpas-btn") {
  const safeLabel = text(label).trim();
  const safeHref = safeUrl(url, "");
  if (!safeLabel || !safeHref) return "";
  return `<a class="${className}" href="${safeHref}">${escapeHtml(safeLabel)}</a>`;
}

function renderSectionHeader(section, opts = {}) {
  const options = toRecord(opts);
  const headingTag = pickText(options, ["headingTag"]) || "h2";
  const eyebrow = pickText(section, ["eyebrow"]);
  const heading = pickText(section, ["heading", "title"]);
  const subheading = pickText(section, ["subheading"]);
  const body = pickText(section, ["body"]);
  const bodyEnabled = options.includeBody !== false;

  return [
    eyebrow ? `<p class="cpas-eyebrow">${escapeHtml(eyebrow)}</p>` : "",
    heading ? `<${headingTag} class="cpas-heading">${escapeHtml(heading)}</${headingTag}>` : "",
    subheading ? `<p class="cpas-subheading">${escapeHtml(subheading)}</p>` : "",
    bodyEnabled && body ? `<p class="cpas-body">${escapeHtml(body)}</p>` : "",
  ].join("");
}

function renderImage(url, alt, className) {
  const safeSrc = safeUrl(url, "");
  if (!safeSrc) return "";
  const safeAlt = pickText({ alt }, ["alt"]) || "Section image";
  return `<img class="${className}" src="${safeSrc}" alt="${escapeAttribute(safeAlt)}" loading="lazy">`;
}

function cardParts(block) {
  const blockConfig = safeJson(block?.config_json, {});
  const title = pickText(block, ["title", "heading", "block_key"]) || pickText(blockConfig, ["title", "heading"]);
  const body = pickText(block, ["body"]) || pickText(blockConfig, ["body", "description"]);
  const imageUrl = pickText(block, ["image_url"]) || pickText(blockConfig, ["image_url"]);
  const imageAlt = pickText(block, ["image_alt", "title", "heading"]) || pickText(blockConfig, ["image_alt"]);
  const icon = pickText(block, ["icon"]) || pickText(blockConfig, ["icon"]);
  const ctaLabel = pickText(block, ["cta_label"]) || pickText(blockConfig, ["cta_label"]);
  const ctaUrl = pickText(block, ["cta_url", "cta_href"]) || pickText(blockConfig, ["cta_url", "cta_href"]);
  return { title, body, imageUrl, imageAlt, icon, ctaLabel, ctaUrl, blockConfig };
}

function renderHero(section) {
  const config = safeJson(section.config_json, {});
  const heading = pickText(section, ["heading", "title"]) || pickText(config, ["heading"]);
  const subheading = pickText(section, ["subheading"]) || pickText(config, ["subheading"]);
  const body = pickText(section, ["body"]) || pickText(config, ["body"]);
  const imageUrl = pickText(section, ["image_url"]) || pickText(config, ["image_url"]);
  const imageAlt = pickText(section, ["image_alt", "heading"]) || pickText(config, ["image_alt"]) || "Hero image";
  const ctaPrimary = renderCta(
    pickText(section, ["cta_label"]) || pickText(config, ["cta_label"]),
    pickText(section, ["cta_url", "cta_href"]) || pickText(config, ["cta_url", "cta_href"]),
    "cpas-btn cpas-btn-primary"
  );
  const ctaSecondary = renderCta(
    pickText(section, ["secondary_cta_label", "cta_secondary_label"]) || pickText(config, ["secondary_cta_label"]),
    pickText(section, ["secondary_cta_url", "cta_secondary_href"]) || pickText(config, ["secondary_cta_url"]),
    "cpas-btn cpas-btn-secondary"
  );

  return `
<section class="cpas-section cpas-hero" data-section-key="${escapeAttribute(pickText(section, ["section_key"]))}">
  <div class="cpas-hero-content">
    ${pickText(section, ["eyebrow"]) ? `<p class="cpas-eyebrow">${escapeHtml(pickText(section, ["eyebrow"]))}</p>` : ""}
    ${heading ? `<h1 class="cpas-heading">${escapeHtml(heading)}</h1>` : ""}
    ${subheading ? `<p class="cpas-subheading">${escapeHtml(subheading)}</p>` : ""}
    ${body ? `<p class="cpas-body">${escapeHtml(body)}</p>` : ""}
    ${ctaPrimary || ctaSecondary ? `<div class="cpas-actions">${ctaPrimary}${ctaSecondary}</div>` : ""}
  </div>
  <div class="cpas-hero-media">
    ${renderImage(imageUrl, imageAlt, "cpas-image")}
  </div>
</section>`.trim();
}

function renderTextImage(section) {
  const config = safeJson(section.config_json, {});
  const imagePosition = pickText(config, ["image_position"]).toLowerCase() === "left" ? "left" : "right";
  const imageUrl = pickText(section, ["image_url"]) || pickText(config, ["image_url"]);
  const imageAlt = pickText(section, ["image_alt", "heading"]) || pickText(config, ["image_alt"]) || "Section image";
  const cta = renderCta(
    pickText(section, ["cta_label"]) || pickText(config, ["cta_label"]),
    pickText(section, ["cta_url", "cta_href"]) || pickText(config, ["cta_url", "cta_href"]),
    "cpas-btn cpas-btn-primary"
  );
  const secondaryCta = renderCta(
    pickText(section, ["secondary_cta_label", "cta_secondary_label"]),
    pickText(section, ["secondary_cta_url", "cta_secondary_href"]),
    "cpas-btn cpas-btn-secondary"
  );

  return `
<section class="cpas-section cpas-text-image cpas-text-image--${escapeAttribute(imagePosition)}" data-section-key="${escapeAttribute(pickText(section, ["section_key"]))}">
  <div class="cpas-text-image-content">
    ${renderSectionHeader(section)}
    ${cta || secondaryCta ? `<div class="cpas-actions">${cta}${secondaryCta}</div>` : ""}
  </div>
  <div class="cpas-text-image-media">
    ${renderImage(imageUrl, imageAlt, "cpas-image")}
  </div>
</section>`.trim();
}

function renderTextImageSplit(section, blocks) {
  const normalizedBlocks = sortBlocks(blocks);
  const left = toRecord(normalizedBlocks[0]);
  const right = toRecord(normalizedBlocks[1]);
  const leftParts = cardParts(left);
  const rightParts = cardParts(right);
  const fallbackBody = pickText(section, ["body"]);
  const leftBody = leftParts.body || fallbackBody;
  const rightBody = rightParts.body;

  return `
<section class="cpas-section cpas-text-image-split" data-section-key="${escapeAttribute(pickText(section, ["section_key"]))}">
  ${renderSectionHeader(section, { includeBody: false })}
  <div class="cpas-split-grid">
    <article class="cpas-split-panel">
      ${leftParts.title ? `<h3 class="cpas-card-title">${escapeHtml(leftParts.title)}</h3>` : ""}
      ${leftBody ? `<p class="cpas-card-body">${escapeHtml(leftBody)}</p>` : ""}
      ${renderImage(leftParts.imageUrl || pickText(section, ["image_url"]), leftParts.imageAlt || pickText(section, ["image_alt"]) || "Section image", "cpas-image")}
      ${renderCta(leftParts.ctaLabel, leftParts.ctaUrl, "cpas-btn cpas-btn-secondary")}
    </article>
    <article class="cpas-split-panel">
      ${rightParts.title ? `<h3 class="cpas-card-title">${escapeHtml(rightParts.title)}</h3>` : ""}
      ${rightBody ? `<p class="cpas-card-body">${escapeHtml(rightBody)}</p>` : ""}
      ${renderImage(rightParts.imageUrl, rightParts.imageAlt || "Section image", "cpas-image")}
      ${renderCta(rightParts.ctaLabel, rightParts.ctaUrl, "cpas-btn cpas-btn-secondary")}
    </article>
  </div>
</section>`.trim();
}

function renderCardGrid(section, blocks) {
  const cards = sortBlocks(blocks).map((block) => {
    const parts = cardParts(block);
    return `
    <article class="cpas-card">
      ${parts.icon ? `<p class="cpas-card-icon">${escapeHtml(parts.icon)}</p>` : ""}
      ${renderImage(parts.imageUrl, parts.imageAlt || parts.title || "Card image", "cpas-card-image")}
      ${parts.title ? `<h3 class="cpas-card-title">${escapeHtml(parts.title)}</h3>` : ""}
      ${parts.body ? `<p class="cpas-card-body">${escapeHtml(parts.body)}</p>` : ""}
      ${renderCta(parts.ctaLabel, parts.ctaUrl, "cpas-btn cpas-btn-secondary")}
    </article>`.trim();
  }).join("");

  return `
<section class="cpas-section cpas-card-grid" data-section-key="${escapeAttribute(pickText(section, ["section_key"]))}">
  ${renderSectionHeader(section)}
  <div class="cpas-cards">
    ${cards || `<p class="cpas-empty">No cards available.</p>`}
  </div>
</section>`.trim();
}

function renderFeatureCards(section, blocks) {
  const cards = sortBlocks(blocks).map((block) => {
    const parts = cardParts(block);
    return `
    <article class="cpas-card cpas-feature-card">
      ${parts.icon ? `<p class="cpas-card-icon">${escapeHtml(parts.icon)}</p>` : ""}
      ${parts.title ? `<h3 class="cpas-card-title">${escapeHtml(parts.title)}</h3>` : ""}
      ${parts.body ? `<p class="cpas-card-body">${escapeHtml(parts.body)}</p>` : ""}
      ${renderCta(parts.ctaLabel, parts.ctaUrl, "cpas-btn cpas-btn-secondary")}
    </article>`.trim();
  }).join("");

  return `
<section class="cpas-section cpas-feature-cards" data-section-key="${escapeAttribute(pickText(section, ["section_key"]))}">
  ${renderSectionHeader(section)}
  <div class="cpas-cards">
    ${cards || `<p class="cpas-empty">No features available.</p>`}
  </div>
</section>`.trim();
}

function renderTestimonial(section, blocks) {
  const firstBlock = toRecord(sortBlocks(blocks)[0]);
  const quote = pickText(section, ["body", "heading"]) || pickText(firstBlock, ["body", "heading", "title"]);
  const author = pickText(section, ["subheading"]) || pickText(firstBlock, ["title", "heading"]);
  const role = pickText(firstBlock, ["subheading"]);

  return `
<section class="cpas-section cpas-testimonial" data-section-key="${escapeAttribute(pickText(section, ["section_key"]))}">
  ${pickText(section, ["eyebrow"]) ? `<p class="cpas-eyebrow">${escapeHtml(pickText(section, ["eyebrow"]))}</p>` : ""}
  ${quote ? `<blockquote class="cpas-quote">${escapeHtml(quote)}</blockquote>` : ""}
  ${(author || role) ? `<p class="cpas-attribution">${escapeHtml([author, role].filter(Boolean).join(" • "))}</p>` : ""}
</section>`.trim();
}

function renderTestimonials(section, blocks) {
  const items = sortBlocks(blocks).map((block) => {
    const quote = pickText(block, ["body", "heading", "title"]);
    const author = pickText(block, ["title", "heading", "block_key"]);
    const detail = pickText(block, ["subheading"]);
    return `
    <article class="cpas-card cpas-testimonial-card">
      ${quote ? `<blockquote class="cpas-quote">${escapeHtml(quote)}</blockquote>` : ""}
      ${(author || detail) ? `<p class="cpas-attribution">${escapeHtml([author, detail].filter(Boolean).join(" • "))}</p>` : ""}
    </article>`.trim();
  }).join("");

  return `
<section class="cpas-section cpas-testimonials" data-section-key="${escapeAttribute(pickText(section, ["section_key"]))}">
  ${renderSectionHeader(section)}
  <div class="cpas-cards">
    ${items || `<p class="cpas-empty">No testimonials available.</p>`}
  </div>
</section>`.trim();
}

function renderImpactStats(section, blocks) {
  const stats = sortBlocks(blocks).map((block) => {
    const config = safeJson(block.config_json, {});
    const value = pickText(block, ["heading", "title"]) || pickText(config, ["value"]);
    const label = pickText(block, ["title", "block_key"]) || pickText(config, ["label"]);
    const body = pickText(block, ["body"]) || pickText(config, ["description"]);
    return `
    <article class="cpas-stat">
      ${value ? `<p class="cpas-stat-value">${escapeHtml(value)}</p>` : ""}
      ${label ? `<h3 class="cpas-stat-label">${escapeHtml(label)}</h3>` : ""}
      ${body ? `<p class="cpas-stat-body">${escapeHtml(body)}</p>` : ""}
    </article>`.trim();
  }).join("");

  return `
<section class="cpas-section cpas-impact-stats" data-section-key="${escapeAttribute(pickText(section, ["section_key"]))}">
  ${renderSectionHeader(section)}
  <div class="cpas-stats-grid">
    ${stats || `<p class="cpas-empty">No impact stats available.</p>`}
  </div>
</section>`.trim();
}

function renderCtaBanner(section) {
  const config = safeJson(section.config_json, {});
  const primary = renderCta(
    pickText(section, ["cta_label"]) || pickText(config, ["cta_label"]),
    pickText(section, ["cta_url", "cta_href"]) || pickText(config, ["cta_url", "cta_href"]),
    "cpas-btn cpas-btn-primary"
  );
  const secondary = renderCta(
    pickText(section, ["secondary_cta_label", "cta_secondary_label"]) || pickText(config, ["secondary_cta_label"]),
    pickText(section, ["secondary_cta_url", "cta_secondary_href"]) || pickText(config, ["secondary_cta_url"]),
    "cpas-btn cpas-btn-secondary"
  );

  return `
<section class="cpas-section cpas-cta cpas-cta-banner" data-section-key="${escapeAttribute(pickText(section, ["section_key"]))}">
  <div class="cpas-cta-content">
    ${renderSectionHeader(section)}
  </div>
  ${primary || secondary ? `<div class="cpas-actions">${primary}${secondary}</div>` : ""}
</section>`.trim();
}

function renderDonationBlock(section, blocks) {
  const config = safeJson(section.config_json, {});
  const amounts = Array.isArray(config.suggested_amounts) ? config.suggested_amounts : [];
  const amountItems = amounts
    .map((amount) => text(amount).trim())
    .filter(Boolean)
    .map((amount) => `<li class="cpas-donation-amount">${escapeHtml(amount)}</li>`)
    .join("");
  const details = sortBlocks(blocks).map((block) => {
    const title = pickText(block, ["title", "heading"]);
    const body = pickText(block, ["body"]);
    if (!title && !body) return "";
    return `<li class="cpas-donation-detail">${title ? `<strong>${escapeHtml(title)}</strong>` : ""}${body ? ` ${escapeHtml(body)}` : ""}</li>`;
  }).join("");

  const cta = renderCta(
    pickText(section, ["cta_label"]) || "Donate",
    pickText(section, ["cta_url", "cta_href"]) || pickText(config, ["cta_url", "cta_href"]),
    "cpas-btn cpas-btn-primary"
  );

  return `
<section class="cpas-section cpas-donation-block" data-section-key="${escapeAttribute(pickText(section, ["section_key"]))}">
  ${renderSectionHeader(section)}
  ${amountItems ? `<ul class="cpas-donation-amounts">${amountItems}</ul>` : ""}
  ${details ? `<ul class="cpas-donation-details">${details}</ul>` : ""}
  ${cta ? `<div class="cpas-actions">${cta}</div>` : ""}
</section>`.trim();
}

function renderOrgInfo(section, _blocks, brand) {
  const config = safeJson(section.config_json, {});
  const orgData = toRecord(config.org_data || config.organization || brand?.orgData || brand?.organization);
  const contact = toRecord(config.contact || orgData.contact);
  const rows = [
    ["Organization", pickText(orgData, ["name"])],
    ["Tax Status", pickText(orgData, ["tax_status"])],
    ["EIN", pickText(orgData, ["ein"])],
    ["Service Area", pickText(orgData, ["parish", "service_area"])],
    ["Budget", pickText(orgData, ["budget"])],
    ["Sector", pickText(orgData, ["sector"])],
  ].filter(([, value]) => value);
  const rowHtml = rows.map(([label, value]) => `<div class="cpas-org-row"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("");
  const contactLines = [
    pickText(contact, ["email"]),
    pickText(contact, ["phone"]),
    pickText(contact, ["city"]),
    pickText(contact, ["address"]),
  ].filter(Boolean);

  return `
<section class="cpas-section cpas-org-info" data-section-key="${escapeAttribute(pickText(section, ["section_key"]))}">
  ${renderSectionHeader(section)}
  ${rowHtml ? `<dl class="cpas-org-grid">${rowHtml}</dl>` : ""}
  ${contactLines.length ? `<p class="cpas-contact">${escapeHtml(contactLines.join(" • "))}</p>` : ""}
</section>`.trim();
}

function renderFaq(section, blocks) {
  const items = sortBlocks(blocks).map((block) => {
    const question = pickText(block, ["title", "heading", "block_key"]);
    const answer = pickText(block, ["body"]);
    if (!question && !answer) return "";
    return `
    <details class="cpas-faq-item">
      ${question ? `<summary>${escapeHtml(question)}</summary>` : "<summary>Question</summary>"}
      ${answer ? `<p>${escapeHtml(answer)}</p>` : ""}
    </details>`.trim();
  }).join("");

  return `
<section class="cpas-section cpas-faq" data-section-key="${escapeAttribute(pickText(section, ["section_key"]))}">
  ${renderSectionHeader(section)}
  <div class="cpas-faq-list">
    ${items || `<p class="cpas-empty">${escapeHtml(pickText(section, ["body"]) || "No FAQs available.")}</p>`}
  </div>
</section>`.trim();
}

function renderAnimalGrid(section, blocks) {
  function sanitizeAnimalImageUrl(value) {
    const raw = text(value).trim();
    if (!raw) return "";
    if (raw.startsWith("https://assets.meauxxx.com/") || raw.startsWith("/assets/")) {
      return escapeAttribute(raw);
    }
    return "";
  }

  function truncateText(value, max = 120) {
    const raw = text(value).trim();
    if (!raw) return "";
    if (raw.length <= max) return raw;
    return `${raw.slice(0, max - 1).trimEnd()}…`;
  }

  const cardBlocks = sortBlocks(blocks).filter((block) => {
    const blockType = pickText(block, ["block_type"]).toLowerCase();
    return !blockType || blockType === "card";
  });

  const cards = cardBlocks.map((block) => {
    const config = safeJson(block.config_json, {});
    const name = pickText(block, ["title", "heading", "block_key"]) || pickText(config, ["name"]);
    const breed = pickText(block, ["breed"]) || pickText(config, ["breed"]);
    const sex = pickText(block, ["sex"]) || pickText(config, ["sex"]);
    const ageLabel = pickText(block, ["age_label"]) || pickText(config, ["age_label"]);
    const meta = [breed, sex, ageLabel].filter(Boolean).join(" · ");
    const bio = truncateText(pickText(block, ["body"]) || pickText(config, ["bio", "description"]), 120);

    const rawImage = pickText(block, ["image_url"]) || pickText(config, ["photo_url", "image_url"]);
    const imageUrl = sanitizeAnimalImageUrl(rawImage);
    const altText = pickText(block, ["alt_text", "title"]) || pickText(config, ["alt_text"]) || (name ? `${name} photo` : "Adoptable dog photo");

    const labelName = name || "this dog";
    const mailto = `mailto:companionsCPAS@gmail.com?subject=${encodeURIComponent(`Inquiry about ${labelName}`)}`;

    return `
    <article class="cpas-animal-card">
      ${imageUrl ? `<img src="${imageUrl}" alt="${escapeAttribute(altText)}" loading="lazy">` : ""}
      <div class="cpas-animal-card__body">
        ${name ? `<h3>${escapeHtml(name)}</h3>` : ""}
        ${meta ? `<p class="cpas-animal-meta">${escapeHtml(meta)}</p>` : ""}
        ${bio ? `<p class="cpas-animal-bio">${escapeHtml(bio)}</p>` : ""}
        <a href="${escapeAttribute(mailto)}" class="cpas-btn">Ask about ${escapeHtml(labelName)}</a>
      </div>
    </article>`.trim();
  }).join("");

  return `
<section class="cpas-section cpas-animal-grid" data-section-key="${escapeAttribute(pickText(section, ["section_key"]))}">
  ${renderSectionHeader(section)}
  <div class="cpas-cards">
    ${cards || `<p class="cpas-empty">Adoptable dogs will appear here. Check back soon.</p>`}
  </div>
</section>`.trim();
}

function renderCampaignGrid(section, blocks) {
  const cards = sortBlocks(blocks).map((block) => {
    const parts = cardParts(block);
    return `
    <article class="cpas-card cpas-campaign-card">
      ${renderImage(parts.imageUrl, parts.imageAlt || parts.title || "Campaign image", "cpas-card-image")}
      ${parts.title ? `<h3 class="cpas-card-title">${escapeHtml(parts.title)}</h3>` : ""}
      ${parts.body ? `<p class="cpas-card-body">${escapeHtml(parts.body)}</p>` : ""}
      ${renderCta(parts.ctaLabel, parts.ctaUrl, "cpas-btn cpas-btn-secondary")}
    </article>`.trim();
  }).join("");

  return `
<section class="cpas-section cpas-campaign-grid" data-section-key="${escapeAttribute(pickText(section, ["section_key"]))}">
  ${renderSectionHeader(section)}
  <div class="cpas-cards">
    ${cards || `<p class="cpas-empty">Campaign content will appear here.</p>`}
  </div>
</section>`.trim();
}

const SECTION_RENDERERS = {
  hero: renderHero,
  text_image: renderTextImage,
  text_image_split: renderTextImageSplit,
  card_grid: renderCardGrid,
  feature_cards: renderFeatureCards,
  testimonial: renderTestimonial,
  testimonials: renderTestimonials,
  impact_stats: renderImpactStats,
  cta_banner: renderCtaBanner,
  donation_block: renderDonationBlock,
  org_info: renderOrgInfo,
  faq: renderFaq,
  animal_grid: renderAnimalGrid,
  campaign_grid: renderCampaignGrid,
};

export function escapeHtml(value) {
  return text(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function safeJson(value, fallback = {}) {
  const safeFallback = fallback === undefined ? {} : fallback;
  if (value === null || value === undefined || value === "") return safeFallback;
  if (typeof value === "object") return value;
  try {
    const parsed = JSON.parse(String(value));
    return parsed === null || parsed === undefined ? safeFallback : parsed;
  } catch {
    return safeFallback;
  }
}

export function renderSection(section, blocks = [], brand = {}, env = null) {
  const safeSection = toRecord(section);
  const type = pickText(safeSection, ["section_type"]).toLowerCase();
  if (!type) return "<!-- Unsupported section type: unknown -->";

  const renderer = SECTION_RENDERERS[type];
  if (!renderer) return `<!-- Unsupported section type: ${escapeHtml(type)} -->`;

  try {
    const html = renderer(safeSection, sortBlocks(blocks), toRecord(brand), env);
    return typeof html === "string" ? html : text(html);
  } catch {
    return `<!-- Unsupported section type: ${escapeHtml(type)} -->`;
  }
}
