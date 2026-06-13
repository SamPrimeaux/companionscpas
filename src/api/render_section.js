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

const CDN = "https://assets.companionsofcaddo.org";
function safeUrl(value, fallback = "") {
  const raw = text(value).trim();
  if (!raw) return fallback;
  // Normalise relative /media/* paths to full CDN URL
  if (raw.startsWith("/media/") || raw.startsWith("/static/")) {
    return escapeAttribute(CDN + raw);
  }
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

function renderCta(label, url, className = "btn btn-ghost") {
  const safeLabel = text(label).trim();
  if (!safeLabel) return "";
  const rawUrl = text(url).trim();
  if (rawUrl.startsWith("modal:")) {
    const key = rawUrl.slice(6).replace(/[^a-z0-9_-]/gi, "");
    return `<button class="${className}" data-modal="${key}" type="button">${escapeHtml(safeLabel)}</button>`;
  }
  const href = safeUrl(rawUrl, "");
  if (!href) return "";
  return `<a class="${className}" href="${href}">${escapeHtml(safeLabel)}</a>`;
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
    eyebrow ? `<p class="eyebrow">${escapeHtml(eyebrow)}</p>` : "",
    heading ? `<${headingTag}>${escapeHtml(heading)}</${headingTag}>` : "",
    subheading ? `<p class="text-muted mt-sm">${escapeHtml(subheading)}</p>` : "",
    bodyEnabled && body ? `<p>${escapeHtml(body)}</p>` : "",
  ].join("");
}

// All images get proper contained sizing
function renderImage(url, alt, className) {
  const safeSrc = safeUrl(url, "");
  if (!safeSrc) return "";
  const safeAlt = text(alt).trim() || "Section image";
  const cls = text(className).trim() || "section-img";
  return `<img class="${cls}" src="${safeSrc}" alt="${escapeAttribute(safeAlt)}" loading="lazy">`;
}

function renderImageEager(url, alt, className) {
  const safeSrc = safeUrl(url, "");
  if (!safeSrc) return "";
  const safeAlt = text(alt).trim() || "Hero image";
  const cls = text(className).trim() || "hero-img";
  return `<img class="${cls}" src="${safeSrc}" alt="${escapeAttribute(safeAlt)}" loading="eager" fetchpriority="high" decoding="async">`;
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
    "btn btn-primary"
  );
  const ctaSecondary = renderCta(
    pickText(section, ["secondary_cta_label", "cta_secondary_label"]) || pickText(config, ["secondary_cta_label"]),
    pickText(section, ["secondary_cta_url", "cta_secondary_href"]) || pickText(config, ["secondary_cta_url"]),
    "btn btn-ghost"
  );

  return `
<section class="section section-hero" data-section-key="${escapeAttribute(pickText(section, ["section_key"]))}">
  <div class="container">
    <div class="hero-content">
      ${pickText(section, ["eyebrow"]) ? `<p class="eyebrow">${escapeHtml(pickText(section, ["eyebrow"]))}</p>` : ""}
      ${heading ? `<h1>${escapeHtml(heading)}</h1>` : ""}
      ${subheading ? `<p class="text-muted mt-sm">${escapeHtml(subheading)}</p>` : ""}
      ${body ? `<p>${escapeHtml(body)}</p>` : ""}
      ${ctaPrimary || ctaSecondary ? `<div class="hero-actions">${ctaPrimary}${ctaSecondary}</div>` : ""}
    </div>
    <div class="hero-img-col">
      ${renderImageEager(imageUrl, imageAlt, "hero-img")}
    </div>
  </div>
  <div class="hero-blend-out" aria-hidden="true"></div>
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
    "btn btn-primary"
  );
  const secondaryCta = renderCta(
    pickText(section, ["secondary_cta_label", "cta_secondary_label"]),
    pickText(section, ["secondary_cta_url", "cta_secondary_href"]),
    "btn btn-ghost"
  );

  const textCol = `
    <div class="text-col">
      ${renderSectionHeader(section)}
      ${cta || secondaryCta ? `<div class="hero-actions mt-md">${cta}${secondaryCta}</div>` : ""}
    </div>`;
  const imgCol = `
    <div class="img-col">
      ${renderImage(imageUrl, imageAlt, "section-img")}
    </div>`;

  return `
<section class="section" data-section-key="${escapeAttribute(pickText(section, ["section_key"]))}">
  <div class="container">
    <div class="section-text-image${imagePosition === "left" ? " img-left" : ""}">
      ${imagePosition === "left" ? imgCol + textCol : textCol + imgCol}
    </div>
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
<section class="section" data-section-key="${escapeAttribute(pickText(section, ["section_key"]))}">
  <div class="container">
    ${renderSectionHeader(section, { includeBody: false })}
    <div class="card-grid mt-md">
      <article class="card">
        ${leftParts.title ? `<h3>${escapeHtml(leftParts.title)}</h3>` : ""}
        ${leftBody ? `<p class="card-text">${escapeHtml(leftBody)}</p>` : ""}
        ${renderImage(leftParts.imageUrl || pickText(section, ["image_url"]), leftParts.imageAlt || pickText(section, ["image_alt"]) || "Section image", "card-img")}
        ${renderCta(leftParts.ctaLabel, leftParts.ctaUrl, "btn btn-ghost")}
      </article>
      <article class="card">
        ${rightParts.title ? `<h3>${escapeHtml(rightParts.title)}</h3>` : ""}
        ${rightBody ? `<p class="card-text">${escapeHtml(rightBody)}</p>` : ""}
        ${renderImage(rightParts.imageUrl, rightParts.imageAlt || "Section image", "card-img")}
        ${renderCta(rightParts.ctaLabel, rightParts.ctaUrl, "btn btn-ghost")}
      </article>
    </div>
  </div>
</section>`.trim();
}

function renderCardGrid(section, blocks) {
  const cards = sortBlocks(blocks).map((block) => {
    const parts = cardParts(block);
    return `
    <article class="card">
      ${renderImage(parts.imageUrl, parts.imageAlt || parts.title || "Card image", "card-img")}
      <div class="card-body">
        ${parts.icon ? `<p class="card-icon">${escapeHtml(parts.icon)}</p>` : ""}
        ${parts.title ? `<h3 class="card-title">${escapeHtml(parts.title)}</h3>` : ""}
        ${parts.body ? `<p class="card-text">${escapeHtml(parts.body)}</p>` : ""}
        ${renderCta(parts.ctaLabel, parts.ctaUrl, "btn btn-ghost")}
      </div>
    </article>`.trim();
  }).join("");

  return `
<section class="section" data-section-key="${escapeAttribute(pickText(section, ["section_key"]))}">
  <div class="container">
    ${renderSectionHeader(section)}
    <div class="card-grid mt-md">
      ${cards || `<p class="text-muted mt-sm">No cards available.</p>`}
    </div>
  </div>
</section>`.trim();
}

function renderFeatureCards(section, blocks) {
  const cards = sortBlocks(blocks).map((block) => {
    const parts = cardParts(block);
    return `
    <article class="card">
      ${parts.imageUrl ? `<img src="${escapeAttribute(parts.imageUrl)}" alt="${escapeAttribute(parts.imageAlt || parts.title || '')}" class="card-img" loading="lazy">` : ""}
      <div class="card-body">
        ${parts.icon ? `<p class="card-icon">${escapeHtml(parts.icon)}</p>` : ""}
        ${parts.title ? `<h3 class="card-title">${escapeHtml(parts.title)}</h3>` : ""}
        ${parts.body ? `<p class="card-text">${escapeHtml(parts.body)}</p>` : ""}
        ${renderCta(parts.ctaLabel, parts.ctaUrl, "btn btn-ghost")}
      </div>
    </article>`.trim();
  }).join("");

  return `
<section class="section" data-section-key="${escapeAttribute(pickText(section, ["section_key"]))}">
  <div class="container">
    ${renderSectionHeader(section)}
    <div class="card-grid mt-md">
      ${cards || `<p class="text-muted mt-sm">No features available.</p>`}
    </div>
  </div>
</section>`.trim();
}

function renderTestimonial(section, blocks) {
  const firstBlock = toRecord(sortBlocks(blocks)[0]);
  const quote = pickText(section, ["body", "heading"]) || pickText(firstBlock, ["body", "heading", "title"]);
  const author = pickText(section, ["subheading"]) || pickText(firstBlock, ["title", "heading"]);
  const role = pickText(firstBlock, ["subheading"]);

  return `
<section class="section section-testimonial" data-section-key="${escapeAttribute(pickText(section, ["section_key"]))}">
  <div class="container">
    ${pickText(section, ["eyebrow"]) ? `<p class="eyebrow">${escapeHtml(pickText(section, ["eyebrow"]))}</p>` : ""}
    ${quote ? `<blockquote class="testimonial-quote">${escapeHtml(quote)}</blockquote>` : ""}
    ${(author || role) ? `<p class="testimonial-attr">${escapeHtml([author, role].filter(Boolean).join(" • "))}</p>` : ""}
  </div>
</section>`.trim();
}

function renderTestimonials(section, blocks) {
  const items = sortBlocks(blocks).map((block) => {
    const quote = pickText(block, ["body", "heading", "title"]);
    const author = pickText(block, ["title", "heading", "block_key"]);
    const detail = pickText(block, ["subheading"]);
    return `
    <article class="card">
      <div class="card-body">
        ${quote ? `<blockquote class="testimonial-quote">${escapeHtml(quote)}</blockquote>` : ""}
        ${(author || detail) ? `<p class="testimonial-attr mt-sm">${escapeHtml([author, detail].filter(Boolean).join(" • "))}</p>` : ""}
      </div>
    </article>`.trim();
  }).join("");

  return `
<section class="section section-testimonial" data-section-key="${escapeAttribute(pickText(section, ["section_key"]))}">
  <div class="container">
    ${renderSectionHeader(section)}
    <div class="card-grid mt-md">
      ${items || `<p class="text-muted mt-sm">No testimonials available.</p>`}
    </div>
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
    <article class="card stat-card">
      <div class="card-body">
        ${value ? `<p class="stat-value">${escapeHtml(value)}</p>` : ""}
        ${label ? `<h3 class="stat-label">${escapeHtml(label)}</h3>` : ""}
        ${body ? `<p class="card-text">${escapeHtml(body)}</p>` : ""}
      </div>
    </article>`.trim();
  }).join("");

  return `
<section class="section" data-section-key="${escapeAttribute(pickText(section, ["section_key"]))}">
  <div class="container">
    ${renderSectionHeader(section)}
    <div class="card-grid mt-md">
      ${stats || `<p class="text-muted mt-sm">No impact stats available.</p>`}
    </div>
  </div>
</section>`.trim();
}

function renderCtaBanner(section) {
  const config = safeJson(section.config_json, {});
  const primary = renderCta(
    pickText(section, ["cta_label"]) || pickText(config, ["cta_label"]),
    pickText(section, ["cta_url", "cta_href"]) || pickText(config, ["cta_url", "cta_href"]),
    "btn btn-primary"
  );
  const secondary = renderCta(
    pickText(section, ["secondary_cta_label", "cta_secondary_label"]) || pickText(config, ["secondary_cta_label"]),
    pickText(section, ["secondary_cta_url", "cta_secondary_href"]) || pickText(config, ["secondary_cta_url"]),
    "btn btn-ghost"
  );

  const _sectionKey = pickText(section, ["section_key"]);
  const _idAttr = _sectionKey ? ` id="${escapeAttribute(_sectionKey)}"` : "";
  return `
<section class="section section-cta"${_idAttr} data-section-key="${escapeAttribute(_sectionKey)}">
  <div class="container">
    ${renderSectionHeader(section)}
    ${primary || secondary ? `<div class="hero-actions mt-md">${primary}${secondary}</div>` : ""}
  </div>
</section>`.trim();
}

function renderDonationBlock(section, blocks) {
  const config = safeJson(section.config_json, {});
  const amounts = Array.isArray(config.suggested_amounts) ? config.suggested_amounts : [];
  const amountItems = amounts
    .map((amount) => text(amount).trim())
    .filter(Boolean)
    .map((amount) => `<li>${escapeHtml(amount)}</li>`)
    .join("");
  const details = sortBlocks(blocks).map((block) => {
    const title = pickText(block, ["title", "heading"]);
    const body = pickText(block, ["body"]);
    if (!title && !body) return "";
    return `<li>${title ? `<strong>${escapeHtml(title)}</strong>` : ""}${body ? ` ${escapeHtml(body)}` : ""}</li>`;
  }).join("");

  const cta = renderCta(
    pickText(section, ["cta_label"]) || "Donate",
    pickText(section, ["cta_url", "cta_href"]) || pickText(config, ["cta_url", "cta_href"]),
    "btn btn-primary"
  );

  return `
<section class="section" data-section-key="${escapeAttribute(pickText(section, ["section_key"]))}">
  <div class="container">
    ${renderSectionHeader(section)}
    ${amountItems ? `<ul class="donation-amounts mt-md">${amountItems}</ul>` : ""}
    ${details ? `<ul class="donation-details mt-sm">${details}</ul>` : ""}
    ${cta ? `<div class="hero-actions mt-md">${cta}</div>` : ""}
  </div>
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
  const rowHtml = rows.map(([label, value]) => `<div class="org-row"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("");
  const contactLines = [
    pickText(contact, ["email"]),
    pickText(contact, ["phone"]),
    pickText(contact, ["city"]),
    pickText(contact, ["address"]),
  ].filter(Boolean);

  return `
<section class="section" data-section-key="${escapeAttribute(pickText(section, ["section_key"]))}">
  <div class="container">
    ${renderSectionHeader(section)}
    ${rowHtml ? `<dl class="org-info mt-md">${rowHtml}</dl>` : ""}
    ${contactLines.length ? `<p class="text-muted mt-sm">${escapeHtml(contactLines.join(" • "))}</p>` : ""}
  </div>
</section>`.trim();
}

function renderFaq(section, blocks) {
  const items = sortBlocks(blocks).map((block) => {
    const question = pickText(block, ["title", "heading", "block_key"]);
    const answer = pickText(block, ["body"]);
    if (!question && !answer) return "";
    return `
    <details class="faq-item">
      ${question ? `<summary class="faq-q">${escapeHtml(question)}</summary>` : "<summary>Question</summary>"}
      ${answer ? `<p class="faq-a">${escapeHtml(answer)}</p>` : ""}
    </details>`.trim();
  }).join("");

  return `
<section class="section section-faq" data-section-key="${escapeAttribute(pickText(section, ["section_key"]))}">
  <div class="container">
    ${renderSectionHeader(section)}
    <div class="mt-md">
      ${items || `<p class="text-muted mt-sm">${escapeHtml(pickText(section, ["body"]) || "No FAQs available.")}</p>`}
    </div>
  </div>
</section>`.trim();
}

function renderAnimalGrid(section, blocks) {
  function sanitizeAnimalImageUrl(value) {
    const raw = text(value).trim();
    if (!raw) return "";
    if (
      raw.startsWith("https://assets.companionsofcaddo.org/") ||
      raw.startsWith("https://imagedelivery.net/") ||
      raw.startsWith("/static/") ||
      raw.startsWith("/assets/")
    ) {
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
    <article class="card animal-card">
      ${imageUrl ? `<img class="card-img" src="${imageUrl}" alt="${escapeAttribute(altText)}" loading="lazy">` : ""}
      <div class="card-body">
        ${name ? `<h3 class="animal-name">${escapeHtml(name)}</h3>` : ""}
        ${meta ? `<p class="text-muted">${escapeHtml(meta)}</p>` : ""}
        ${bio ? `<p class="card-text">${escapeHtml(bio)}</p>` : ""}
        <a href="${escapeAttribute(mailto)}" class="btn btn-ghost">Ask about ${escapeHtml(labelName)}</a>
      </div>
    </article>`.trim();
  }).join("");

  return `
<section class="section" data-section-key="${escapeAttribute(pickText(section, ["section_key"]))}">
  <div class="container">
    ${renderSectionHeader(section)}
    <div class="card-grid mt-md">
      ${cards || `<p class="text-muted mt-sm">Adoptable dogs will appear here. Check back soon.</p>`}
    </div>
  </div>
</section>`.trim();
}

function renderCampaignGrid(section, blocks) {
  const cards = sortBlocks(blocks).map((block) => {
    const parts = cardParts(block);
    return `
    <article class="card">
      ${renderImage(parts.imageUrl, parts.imageAlt || parts.title || "Campaign image", "card-img")}
      <div class="card-body">
        ${parts.title ? `<h3 class="card-title">${escapeHtml(parts.title)}</h3>` : ""}
        ${parts.body ? `<p class="card-text">${escapeHtml(parts.body)}</p>` : ""}
        ${renderCta(parts.ctaLabel, parts.ctaUrl, "btn btn-ghost")}
      </div>
    </article>`.trim();
  }).join("");

  return `
<section class="section" data-section-key="${escapeAttribute(pickText(section, ["section_key"]))}">
  <div class="container">
    ${renderSectionHeader(section)}
    <div class="card-grid mt-md">
      ${cards || `<p class="text-muted mt-sm">Campaign content will appear here.</p>`}
    </div>
  </div>
</section>`.trim();
}


function renderFosterGrid(section, blocks) {
  const sorted = sortBlocks(blocks);
  const cards = sorted.map((block, i) => {
    const parts = cardParts(block);
    return [
      '<article class="foster-card' + (i === 0 ? ' foster-card--tall' : '') + '">',
      renderImage(parts.imageUrl, parts.imageAlt || parts.title || 'Foster image', 'foster-img'),
      '<div class="foster-card-body">',
      parts.title ? '<h3>' + escapeHtml(parts.title) + '</h3>' : '',
      parts.body  ? '<p>'  + escapeHtml(parts.body)  + '</p>'  : '',
      '</div></article>',
    ].join('');
  }).join('');

  const sectionCta = renderCta(
    pickText(section, ['cta_label']) || 'Apply to Foster',
    pickText(section, ['cta_href', 'cta_url']) || '/services',
    'btn btn-primary'
  );

  return [
    '<section class="section" data-section-key="' + escapeAttribute(pickText(section, ['section_key'])) + '">',
    '<div class="container">',
    '<div class="foster-header">',
    '<div>' + renderSectionHeader(section) + '</div>',
    sectionCta ? '<div class="foster-header-cta">' + sectionCta + '</div>' : '',
    '</div>',
    '<div class="foster-grid mt-md">',
    cards || '<p class="text-muted mt-sm">No cards available.</p>',
    '</div></div></section>',
  ].join('');
}

function renderCampaignGridV2(section, blocks) {
  const cards = sortBlocks(blocks).map((block) => {
    const parts = cardParts(block);
    return [
      '<article class="campaign-card">',
      '<div class="campaign-img-wrap">',
      renderImage(parts.imageUrl, parts.imageAlt || parts.title || 'Campaign image', 'campaign-img'),
      '<div class="campaign-img-overlay"></div>',
      '</div>',
      '<div class="campaign-body">',
      parts.title ? '<h3 class="campaign-title">' + escapeHtml(parts.title) + '</h3>' : '',
      parts.body  ? '<p class="campaign-text">'  + escapeHtml(parts.body)  + '</p>'  : '',
      renderCta(parts.ctaLabel, parts.ctaUrl, 'btn btn-primary'),
      '</div></article>',
    ].join('');
  }).join('');

  return [
    '<section class="section section-campaigns" data-section-key="' + escapeAttribute(pickText(section, ['section_key'])) + '">',
    '<div class="container">',
    renderSectionHeader(section),
    '<div class="campaign-grid mt-md">',
    cards || '<p class="text-muted mt-sm">Campaign content will appear here.</p>',
    '</div></div></section>',
  ].join('');
}

const SECTION_RENDERERS = {
  hero: renderHero,
  text_image: renderTextImage,
  text_image_split: renderTextImageSplit,
  card_grid: renderCardGrid,
  foster_grid: renderFosterGrid,
  feature_cards: renderFeatureCards,
  testimonial: renderTestimonial,
  testimonials: renderTestimonials,
  impact_stats: renderImpactStats,
  cta_banner: renderCtaBanner,
  donation_block: renderDonationBlock,
  fundraising: renderDonationBlock,
  org_info: renderOrgInfo,
  faq: renderFaq,
  animal_grid: renderAnimalGrid,
  campaign_grid: renderCampaignGridV2,
  card_grid_foster: renderFosterGrid,
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
