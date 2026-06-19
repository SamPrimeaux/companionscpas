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

const CTA_ICONS = {
  donate: `<span class="hero-cta-icon" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg></span>`,
  foster: `<span class="hero-cta-icon" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></span>`,
};

function normalizeCtaIntent(href, action) {
  const rawAction = text(action).trim().toLowerCase();
  const rawHref = text(href).trim();

  if (rawAction === "donate" || rawAction === "stripe_checkout" || rawAction === "modal_donate") {
    return { type: "action", value: "donate" };
  }
  if (rawAction === "foster") return { type: "action", value: "foster" };
  if (rawAction === "volunteer") return { type: "modal", value: "volunteer" };
  if (rawAction === "contact") return { type: "modal", value: "contact" };

  if (rawHref.startsWith("modal:")) {
    const key = rawHref.slice(6).replace(/[^a-z0-9_-]/gi, "");
    if (key === "donate") return { type: "action", value: "donate" };
    return { type: "modal", value: key };
  }
  if (rawHref.startsWith("data-action:")) {
    const key = rawHref.slice(12).replace(/[^a-z0-9_-]/gi, "");
    return { type: "action", value: key };
  }
  if (rawHref === "#donate-form" || rawHref === "#donate" || rawHref === "/donate#donate-form") {
    return { type: "action", value: "donate" };
  }

  const safeHref = safeUrl(rawHref, "");
  if (safeHref) return { type: "href", value: safeHref };
  return null;
}

function heroCtaClass(variant = "primary") {
  if (variant === "ghost") return "hero-cta hero-cta-ghost";
  if (variant === "btn btn-ghost") return "hero-cta hero-cta-ghost";
  if (variant === "btn btn-primary") return "hero-cta hero-cta-primary";
  return "hero-cta hero-cta-primary";
}

function renderActionCta(label, href, action = "", variant = "primary", sub = "", opts = {}) {
  const safeLabel = text(label).trim();
  if (!safeLabel) return "";
  const intent = normalizeCtaIntent(href, action);
  if (!intent) return "";

  const cls = heroCtaClass(variant);
  const subHtml = sub ? `<span class="hero-cta-sub">${escapeHtml(sub)}</span>` : "";
  const iconKey = opts.icon === false ? "" : intent.value;
  const icon = CTA_ICONS[iconKey] || "";
  const inner = `${icon}<span class="hero-cta-text"><span class="hero-cta-label">${escapeHtml(safeLabel)}</span>${subHtml}</span>`;

  if (intent.type === "action") {
    return `<button class="${cls}" type="button" data-action="${escapeAttribute(intent.value)}">${inner}</button>`;
  }
  if (intent.type === "modal") {
    return `<button class="${cls}" type="button" data-modal="${escapeAttribute(intent.value)}">${inner}</button>`;
  }
  return `<a class="${cls}" href="${intent.value}">${inner}</a>`;
}

function renderCta(label, url, variant = "primary", action = "") {
  return renderActionCta(label, url, action, variant);
}

function sectionCtaFields(section, config = {}) {
  const cfg = toRecord(config);
  return {
    label: pickText(section, ["cta_label"]) || pickText(cfg, ["cta_label"]),
    href: pickText(section, ["cta_url", "cta_href"]) || pickText(cfg, ["cta_url", "cta_href"]),
    action: pickText(section, ["cta_action"]) || pickText(cfg, ["cta_action"]),
    secondaryLabel: pickText(section, ["secondary_cta_label", "cta_secondary_label"]) || pickText(cfg, ["secondary_cta_label"]),
    secondaryHref: pickText(section, ["secondary_cta_url", "cta_secondary_href"]) || pickText(cfg, ["secondary_cta_url", "cta_secondary_href"]),
    secondaryAction: pickText(section, ["secondary_cta_action"]) || pickText(cfg, ["secondary_cta_action"]),
    secondarySub: pickText(cfg, ["secondary_cta_sub"]) || "",
  };
}

function renderSectionHeader(section, opts = {}) {
  const options = toRecord(opts);
  const headingTag = pickText(options, ["headingTag"]) || "h2";
  const headingClass = pickText(options, ["headingClass"]) || "mission-heading";
  const bodyClass = pickText(options, ["bodyClass"]) || "mission-body";
  const eyebrow = pickText(section, ["eyebrow"]);
  const heading = pickText(section, ["heading", "title"]);
  const subheading = pickText(section, ["subheading"]);
  const body = pickText(section, ["body"]);
  const bodyEnabled = options.includeBody !== false;

  return [
    eyebrow ? `<div class="ey-purple">${escapeHtml(eyebrow)}</div>` : "",
    heading ? `<${headingTag} class="${headingClass}">${escapeHtml(heading)}</${headingTag}>` : "",
    subheading ? `<p class="${bodyClass}">${escapeHtml(subheading)}</p>` : "",
    bodyEnabled && body ? `<p class="${bodyClass}">${escapeHtml(body)}</p>` : "",
  ].join("");
}

// All images get proper contained sizing
function renderImage(url, alt, className) {
  const safeSrc = safeUrl(url, "");
  if (!safeSrc) return "";
  const safeAlt = text(alt).trim() || "Section image";
  const cls = text(className).trim();
  const classAttr = cls ? ` class="${cls}"` : "";
  return `<img${classAttr} src="${safeSrc}" alt="${escapeAttribute(safeAlt)}" loading="lazy">`;
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
  const ctaLabel =
    pickText(block, ["cta_label", "action_label"]) ||
    pickText(blockConfig, ["cta_label", "action_label"]);
  const ctaUrl =
    pickText(block, ["cta_url", "cta_href", "action_value"]) ||
    pickText(blockConfig, ["cta_url", "cta_href", "action_value"]);
  const ctaAction =
    pickText(block, ["cta_action", "action"]) || pickText(blockConfig, ["cta_action", "action"]);
  return { title, body, imageUrl, imageAlt, icon, ctaLabel, ctaUrl, ctaAction, blockConfig };
}

function renderCardLink(label, href, action = "") {
  const safeLabel = text(label).trim();
  if (!safeLabel) return "";
  const intent = normalizeCtaIntent(href, action);
  if (!intent) return "";

  const inner = `${escapeHtml(safeLabel)}<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`;

  if (intent.type === "action") {
    return `<button class="ways-card-link" type="button" data-action="${escapeAttribute(intent.value)}">${inner}</button>`;
  }
  if (intent.type === "modal") {
    return `<button class="ways-card-link" type="button" data-modal="${escapeAttribute(intent.value)}">${inner}</button>`;
  }
  return `<a class="ways-card-link" href="${intent.value}">${inner}</a>`;
}

function renderSharedHeroCta(label, url, variant = "primary", sub = "", action = "") {
  return renderActionCta(label, url, action, variant, sub);
}

function renderHero(section) {
  const config = safeJson(section.config_json, {});
  const cta = sectionCtaFields(section, config);
  const heading = pickText(section, ["heading", "title"]) || pickText(config, ["heading"]);
  const subheading = pickText(section, ["subheading"]) || pickText(config, ["subheading"]);
  const body = pickText(section, ["body"]) || pickText(config, ["body"]);
  const eyebrow = pickText(section, ["eyebrow"]) || pickText(config, ["eyebrow"]);
  const imageUrl = pickText(section, ["image_url"]) || pickText(config, ["image_url"]);
  const imageAlt = pickText(section, ["image_alt", "heading"]) || pickText(config, ["image_alt"]) || "Hero image";
  const heroSub = subheading || body;
  const ctaPrimary = renderActionCta(cta.label, cta.href, cta.action, "primary");
  const ctaSecondary = renderActionCta(
    cta.secondaryLabel,
    cta.secondaryHref,
    cta.secondaryAction,
    "ghost",
    cta.secondarySub
  );
  const safeImage = imageUrl ? safeUrl(imageUrl, "") : "";

  return `
<section class="hero-split" data-section-key="${escapeAttribute(pickText(section, ["section_key"]))}">
  ${safeImage ? `<div class="hero-media-bg">
    <img src="${safeImage}" alt="${escapeAttribute(imageAlt)}" loading="eager" fetchpriority="high" decoding="async" />
    <div class="hero-scrim"></div>
  </div>` : ""}
  <div class="hero-body">
    <div class="container">
      <div class="hero-content">
        ${eyebrow ? `<div class="hero-badge">${escapeHtml(eyebrow)}</div>` : ""}
        ${heading ? `<h1 class="hero-heading">${escapeHtml(heading)}</h1>` : ""}
        ${heroSub ? `<p class="hero-sub">${escapeHtml(heroSub)}</p>` : ""}
        ${ctaPrimary || ctaSecondary ? `<div class="hero-actions">${ctaPrimary}${ctaSecondary}</div>` : ""}
      </div>
    </div>
  </div>
</section>`.trim();
}

function renderTextImage(section) {
  const config = safeJson(section.config_json, {});
  const imagePosition = pickText(config, ["image_position"]).toLowerCase() === "left" ? "left" : "right";
  const imageUrl = pickText(section, ["image_url"]) || pickText(config, ["image_url"]);
  const imageAlt = pickText(section, ["image_alt", "heading"]) || pickText(config, ["image_alt"]) || "Section image";
  const eyebrow = pickText(section, ["eyebrow"]) || pickText(config, ["eyebrow"]);
  const heading = pickText(section, ["heading", "title"]) || pickText(config, ["heading"]);
  const body = pickText(section, ["body"]) || pickText(config, ["body"]);
  const ctaLabel = pickText(section, ["cta_label"]) || pickText(config, ["cta_label"]);
  const ctaHref = pickText(section, ["cta_url", "cta_href"]) || pickText(config, ["cta_url", "cta_href"]);
  const sectionKey = pickText(section, ["section_key"]);
  const imgFirst = imagePosition === "left";

  const bodyCol = `
      <div class="story-block-body">
        ${eyebrow ? `<div class="ey-purple">${escapeHtml(eyebrow)}</div>` : ""}
        ${heading ? `<h2 class="story-heading">${escapeHtml(heading)}</h2>` : ""}
        ${body ? `<p class="story-body">${escapeHtml(body)}</p>` : ""}
        ${ctaLabel ? `<a class="story-cta" href="${safeUrl(ctaHref, "/adopt")}">${escapeHtml(ctaLabel)}<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg></a>` : ""}
      </div>`;
  const imgCol = `
      <div class="story-block-img">
        ${renderImage(imageUrl, imageAlt, "")}
      </div>`;

  return `
<style>[data-cpas-section="${escapeAttribute(sectionKey)}"]{background:#f5f2e9}</style>
<section class="section s-light" data-cpas-section="${escapeAttribute(sectionKey)}" data-section-key="${escapeAttribute(sectionKey)}">
  <div class="container">
    <div class="story-block">
      ${imgFirst ? imgCol + bodyCol : bodyCol + imgCol}
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
  const sectionKey = pickText(section, ["section_key"]);
  const cards = sortBlocks(blocks).map((block) => {
    const parts = cardParts(block);
    const imageSrc = parts.imageUrl ? safeUrl(parts.imageUrl, "") : "";
    return `
    <article class="ways-card">
      ${imageSrc ? `<img src="${imageSrc}" alt="${escapeAttribute(parts.imageAlt || parts.title || "")}" loading="lazy">` : ""}
      <div class="ways-card-body">
        ${parts.title ? `<h3>${escapeHtml(parts.title)}</h3>` : ""}
        ${parts.body ? `<p>${escapeHtml(parts.body)}</p>` : ""}
        ${renderCardLink(parts.ctaLabel, parts.ctaUrl, parts.ctaAction)}
      </div>
    </article>`.trim();
  }).join("");

  const hasSubheading = Boolean(pickText(section, ["subheading"]));
  const includeBody = !hasSubheading;

  return `
<style>[data-cpas-section="${escapeAttribute(sectionKey)}"]{background:#f5f2e9}</style>
<section class="section s-light" data-cpas-section="${escapeAttribute(sectionKey)}" data-section-key="${escapeAttribute(sectionKey)}">
  <div class="container">
    <div class="section-intro-center">
      ${renderSectionHeader(section, { includeBody })}
    </div>
    <div class="ways-grid${blocks.length > 3 ? " ways-grid--auto" : ""}">
      ${cards || `<p class="mission-body">No features available.</p>`}
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
  const cta = sectionCtaFields(section, config);
  const heading = pickText(section, ["heading", "title"]) || pickText(config, ["heading"]);
  const subheading = pickText(section, ["subheading"]) || pickText(config, ["subheading"]);
  const body = pickText(section, ["body"]) || pickText(config, ["body"]);
  const primary = renderActionCta(cta.label, cta.href, cta.action, "primary");
  const secondary = renderActionCta(
    cta.secondaryLabel,
    cta.secondaryHref,
    cta.secondaryAction,
    "ghost",
    cta.secondarySub
  );

  const sectionKey = pickText(section, ["section_key"]);
  const idAttr = sectionKey ? ` id="${escapeAttribute(sectionKey)}"` : "";
  const intro = subheading || body;

  return `
<style>[data-cpas-section="${escapeAttribute(sectionKey)}"]{background:#f5f2e9}</style>
<section class="section s-light"${idAttr} data-cpas-section="${escapeAttribute(sectionKey)}" data-section-key="${escapeAttribute(sectionKey)}">
  <div class="container section-intro-center">
    ${pickText(section, ["eyebrow"]) ? `<div class="ey-purple">${escapeHtml(pickText(section, ["eyebrow"]))}</div>` : ""}
    ${heading ? `<h2 class="mission-heading">${escapeHtml(heading)}</h2>` : ""}
    ${intro ? `<p class="mission-body">${escapeHtml(intro)}</p>` : ""}
    ${primary || secondary ? `<div class="hero-actions" style="justify-content:center;margin-top:2rem">${primary}${secondary}</div>` : ""}
  </div>
</section>`.trim();
}

function renderFacebookEmbeds(section) {
  const config = safeJson(section.config_json, {});
  const heading = pickText(section, ["heading", "title"]) || pickText(config, ["heading"]) || "From Caddo Parish Animal Services";
  const body = pickText(section, ["body"]) || pickText(config, ["body"]) || "";
  const sectionKey = pickText(section, ["section_key"]);
  const embedHtml = pickText(config, ["embed_html"]) || "";

  return `
<style>[data-cpas-section="${escapeAttribute(sectionKey)}"]{background:var(--dark-bg)}</style>
<section class="section s-dark" data-cpas-section="${escapeAttribute(sectionKey)}" data-section-key="${escapeAttribute(sectionKey)}">
  <div class="container section-intro-center">
    <h2 class="mission-heading" style="color:#f0ece6">${escapeHtml(heading)}</h2>
    ${body ? `<p class="mission-body" style="color:var(--dark-muted)">${escapeHtml(body)}</p>` : ""}
    <div class="embed-wrap" style="margin-top:2rem;display:flex;justify-content:center">
      ${embedHtml || `<p class="mission-body" style="color:var(--dark-muted)">Shelter updates embed — configure in CMS.</p>`}
    </div>
  </div>
</section>`.trim();
}

function renderFacebookFeed(section) {
  const config = safeJson(section.config_json, {});
  const heading = pickText(section, ["heading", "title"]) || pickText(config, ["heading"]) || "Latest from Facebook";
  const body = pickText(section, ["body"]) || pickText(config, ["body"]) || "Follow Companions of CPAS on Facebook for rescue updates, transport wins, and adoptable dogs.";
  const sectionKey = pickText(section, ["section_key"]);
  const embedUrl = pickText(config, ["embed_url"]) || pickText(config, ["iframe_src"]) || "";

  return `
<style>[data-cpas-section="${escapeAttribute(sectionKey)}"]{background:#f5f2e9}</style>
<section class="section s-light" data-cpas-section="${escapeAttribute(sectionKey)}" data-section-key="${escapeAttribute(sectionKey)}">
  <div class="container section-intro-center">
    ${pickText(section, ["eyebrow"]) ? `<div class="ey-purple">${escapeHtml(pickText(section, ["eyebrow"]))}</div>` : ""}
    <h2 class="mission-heading">${escapeHtml(heading)}</h2>
    <p class="mission-body">${escapeHtml(body)}</p>
    <div class="embed-wrap" style="margin-top:2rem;display:flex;justify-content:center">
      ${embedUrl
        ? `<iframe src="${escapeAttribute(embedUrl)}" width="500" height="696" style="border:none;overflow:hidden;max-width:100%" scrolling="no" frameborder="0" allowfullscreen="true"></iframe>`
        : `<p class="mission-body">Facebook feed embed will appear here after publish.</p>`}
    </div>
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

  const cta = renderActionCta(
    pickText(section, ["cta_label"]) || "Donate",
    pickText(section, ["cta_url", "cta_href"]) || pickText(config, ["cta_url", "cta_href"]),
    pickText(section, ["cta_action"]) || pickText(config, ["cta_action"]) || "donate",
    "primary"
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
  const sectionKey = pickText(section, ["section_key"]);
  const sorted = sortBlocks(blocks);
  const cards = sorted.map((block, i) => {
    const parts = cardParts(block);
    return [
      `<article class="foster-card${i === 0 ? " foster-card--tall" : ""}">`,
      renderImage(parts.imageUrl, parts.imageAlt || parts.title || "Foster image", "foster-img"),
      '<div class="foster-card-body">',
      parts.title ? `<h3>${escapeHtml(parts.title)}</h3>` : "",
      parts.body ? `<p>${escapeHtml(parts.body)}</p>` : "",
      "</div></article>",
    ].join("");
  }).join("");

  const sectionCta = renderActionCta(
    pickText(section, ["cta_label"]) || "Apply to Foster",
    pickText(section, ["cta_href", "cta_url"]) || "modal:foster",
    pickText(section, ["cta_action"]) || "foster",
    "primary"
  );

  return `
<style>[data-cpas-section="${escapeAttribute(sectionKey)}"]{background:#f5f2e9}</style>
<section class="section s-light" data-cpas-section="${escapeAttribute(sectionKey)}" data-section-key="${escapeAttribute(sectionKey)}">
  <div class="container">
    <div class="foster-header">
      <div>${renderSectionHeader(section)}</div>
      ${sectionCta ? `<div class="foster-header-cta">${sectionCta}</div>` : ""}
    </div>
    <div class="foster-grid">
      ${cards || `<p class="mission-body">No dogs listed right now.</p>`}
    </div>
  </div>
</section>`;
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
      renderCardLink(parts.ctaLabel, parts.ctaUrl, parts.ctaAction),
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
  facebook_feed: renderFacebookFeed,
  facebook_embeds: renderFacebookEmbeds,
  donation_block: renderDonationBlock,
  fundraising: renderDonationBlock,
  org_info: renderOrgInfo,
  faq: renderFaq,
  animal_grid: renderAnimalGrid,
  campaign_grid: renderCampaignGridV2,
  card_grid_foster: renderFosterGrid,
  campaign_transport_hero: () => "<!-- campaign_transport_hero: rendered dynamically at assembly -->",
  donate_freedom_hero: () => "<!-- donate_freedom_hero: rendered dynamically at assembly -->",
  donate_medical_story: () => "<!-- donate_medical_story: rendered dynamically at assembly -->",
  donate_stories_help: () => "<!-- donate_stories_help: rendered dynamically at assembly -->",
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
