import { escapeHtml, safeJson } from "./render_section.js";

const TENANT_ID = "tenant_companionscpas";
const CDN = "https://assets.companionsofcaddo.org";
const DEFAULT_KITA_FB_REEL = "https://www.facebook.com/reel/1367522045225536/";
const DEFAULT_SUNFLOWER_PHOTO = `${CDN}/media/animals/sunflowercloseup.jpeg`;
const KITA_SHARE_URL = "https://companionsofcaddo.org/donate#donate-medical-story";

const DONATE_V2_TYPES = new Set([
  "donate_freedom_hero",
  "donate_medical_story",
  "donate_stories_help",
  "donate_campaign_grid",
  "donate_contact",
]);

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

function esc(value) {
  return escapeHtml(value);
}

function escAttr(value) {
  return esc(value);
}

function safeUrl(value) {
  const raw = text(value).trim();
  if (!raw) return "";
  if (raw.startsWith("/media/") || raw.startsWith("/static/")) return CDN + raw;
  try {
    const u = new URL(raw);
    if (u.protocol === "http:" || u.protocol === "https:") return u.toString();
  } catch {
    return "";
  }
  return "";
}

function money(cents) {
  const n = Number(cents);
  if (!Number.isFinite(n)) return "$0";
  return "$" + Math.round(n / 100).toLocaleString("en-US");
}

function donateBtn(label, opts = {}) {
  const amount = opts.amount ? ` data-amount="${Number(opts.amount)}"` : "";
  const camp = opts.campaignId ? ` data-campaign-id="${escAttr(opts.campaignId)}"` : "";
  const cls = opts.overlay ? "btn btn-overlay"
    : opts.ghost ? "btn btn-ghost"
    : opts.red ? "btn btn-red"
    : "btn btn-primary";
  return `<button class="${cls}" type="button" data-action="donate"${amount}${camp}>${esc(label)}</button>`;
}

function renderHeroVideoEmbed(reelUrl) {
  const href = encodeURIComponent(safeUrl(reelUrl) || DEFAULT_KITA_FB_REEL);
  return `<div class="dv2-fb-video dv2-fb-video--cover">
    <iframe
      src="https://www.facebook.com/plugins/video.php?height=476&amp;href=${href}&amp;show_text=false&amp;width=267&amp;t=0"
      scrolling="no" frameborder="0"
      allowfullscreen="true"
      allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
      title="Campaign video"></iframe>
  </div>`;
}

function renderStoryHeroCard(opts) {
  const cls = "dv2-hero-card" + (opts.sponsored ? " dv2-hero-card--sponsored" : "");
  const media = opts.videoUrl
    ? `<div class="dv2-hero-card-media dv2-hero-card-media--video">${renderHeroVideoEmbed(opts.videoUrl)}</div>`
    : `<div class="dv2-hero-card-media"><img src="${escAttr(opts.imageUrl)}" alt="${escAttr(opts.imageAlt || opts.title || "")}" loading="lazy" decoding="async" /></div>`;
  const cta = opts.ctaLabel
    ? donateBtn(opts.ctaLabel, Object.assign({ overlay: true }, opts.ctaOpts || {}))
    : "";
  return `
    <article class="${cls}">
      ${media}
      <div class="dv2-hero-card-overlay" aria-hidden="true"></div>
      <div class="dv2-hero-card-content">
        <p class="dv2-card-ey">${esc(opts.eyebrow)}</p>
        <h3 class="dv2-card-title">${esc(opts.title)}</h3>
        <p class="dv2-prose-sm">${esc(opts.body)}</p>
        ${opts.extraHtml || ""}
        ${cta}
      </div>
    </article>`;
}

function renderFosterCardMedia(campaign, alt) {
  const cc = cfg(campaign);
  const fb = pickText(cc, ["facebook_reel_url"]);
  if (fb) {
    return `<div class="foster-img-wrap foster-img-wrap--video">${renderFacebookVideoEmbed(fb)}</div>`;
  }
  const cover = campaignCoverUrl(campaign);
  if (cover) {
    return `<div class="foster-img-wrap"><img class="foster-img foster-img--contain" src="${escAttr(cover)}" alt="${escAttr(alt || campaign?.title || "")}" loading="lazy" decoding="async" /></div>`;
  }
  return `<div class="foster-img-wrap"><div class="foster-img-placeholder">Photo coming soon</div></div>`;
}

async function loadCampaign(env, campaignId) {
  if (!env?.DB || !campaignId) return null;
  const row = await env.DB.prepare(`
    SELECT fc.*,
           COALESCE(ca.public_url, ca.cdn_url, ca.pub_url) AS cover_url
    FROM fundraising_campaigns fc
    LEFT JOIN cms_assets ca ON ca.id = fc.cover_asset_id
    WHERE fc.id = ? AND (fc.tenant_id = ? OR fc.organization_id = ?)
    LIMIT 1
  `).bind(campaignId, TENANT_ID, TENANT_ID).first().catch(() => null);
  if (!row) return null;
  return { ...row, config: safeJson(row.config_json, {}) };
}

async function loadCampaignByPlacement(env, placement) {
  if (!env?.DB || !placement) return null;
  const row = await env.DB.prepare(`
    SELECT fc.*,
           COALESCE(ca.public_url, ca.cdn_url, ca.pub_url) AS cover_url
    FROM fundraising_campaigns fc
    LEFT JOIN cms_assets ca ON ca.id = fc.cover_asset_id
    WHERE (fc.tenant_id = ? OR fc.organization_id = ?)
      AND fc.is_public = 1
      AND fc.status = 'active'
      AND json_extract(fc.config_json, '$.donate_placement') = ?
    ORDER BY fc.updated_at DESC
    LIMIT 1
  `).bind(TENANT_ID, TENANT_ID, placement).first().catch(() => null);
  if (!row) return null;
  return { ...row, config: safeJson(row.config_json, {}) };
}

function cfg(campaign) {
  return campaign?.config || safeJson(campaign?.config_json, {});
}

function campaignCoverUrl(campaign) {
  const cc = cfg(campaign);
  const attachments = Array.isArray(cc.attachments) ? cc.attachments : [];
  const img = attachments.find((a) => a.type === "image");
  if (img?.url) return safeUrl(img.url);
  return safeUrl(campaign?.cover_url || cc.cover_url);
}

function campaignVideoUrl(campaign) {
  const cc = cfg(campaign);
  const attachments = Array.isArray(cc.attachments) ? cc.attachments : [];
  const vid = attachments.find((a) => a.type === "video");
  if (vid?.url) return safeUrl(vid.url);
  return safeUrl(cc.facebook_reel_url);
}

function renderCampaignMedia(campaign, alt) {
  const fb = pickText(cfg(campaign), ["facebook_reel_url"]);
  if (fb) return renderFacebookVideoEmbed(fb);
  const cover = campaignCoverUrl(campaign);
  if (cover) {
    return `<img src="${escAttr(cover)}" alt="${escAttr(alt || campaign?.title || "")}" loading="lazy" decoding="async" />`;
  }
  return mediaPlaceholder("Photo coming soon");
}

function showOnDonate(campaign) {
  const cc = cfg(campaign);
  if (cc.show_on_donate === false || cc.show_on_donate === 0) return false;
  if (cc.show_on_donate === true || cc.show_on_donate === 1) return true;
  if (cc.donate_placement) return true;
  return Number(campaign?.is_public) === 1;
}

async function loadDonateGridCampaigns(env, excludeIds = []) {
  if (!env?.DB) return [];
  const exclude = new Set((excludeIds || []).filter(Boolean));
  const rows = await env.DB.prepare(`
    SELECT fc.*,
           COALESCE(ca.public_url, ca.cdn_url, ca.pub_url) AS cover_url
    FROM fundraising_campaigns fc
    LEFT JOIN cms_assets ca ON ca.id = fc.cover_asset_id
    WHERE (fc.tenant_id = ? OR fc.organization_id = ?)
      AND fc.is_public = 1
      AND fc.status = 'active'
    ORDER BY fc.updated_at DESC
  `).bind(TENANT_ID, TENANT_ID).all().catch(() => ({ results: [] }));
  return (rows?.results || [])
    .map((row) => ({ ...row, config: safeJson(row.config_json, {}) }))
    .filter((c) => !exclude.has(c.id) && showOnDonate(c));
}

async function loadCampaignRaisedCents(env, campaignId, fallbackCents = 0) {
  if (!env?.DB || !campaignId) return fallbackCents;
  const sumRow = await env.DB.prepare(
    `SELECT COALESCE(SUM(amount_cents), 0) AS total
     FROM donations
     WHERE campaign_id = ? AND status = 'succeeded'`
  ).bind(campaignId).first().catch(() => null);
  const fromDonations = Number(sumRow?.total) || 0;
  if (fromDonations > 0) return fromDonations;
  const campaign = await loadCampaign(env, campaignId);
  return Number(campaign?.raised_amount_cents) || fallbackCents;
}

async function loadCampaignAnimals(env, campaignId, limit = 3) {
  if (!env?.DB || !campaignId) return [];
  const rows = await env.DB.prepare(
    `SELECT ap.id, ap.name, ap.campaign_tickets_sponsored,
            COALESCE(ca.cdn_url, ca.public_url, ap.photo_url) AS photo_url
     FROM animal_profiles ap
     LEFT JOIN cms_assets ca ON ca.asset_key = ap.id AND ca.tenant_id = ?
     WHERE ap.tenant_id = ? AND ap.campaign_id = ?
     ORDER BY ap.campaign_sort_order ASC, ap.name ASC
     LIMIT ?`
  ).bind(TENANT_ID, TENANT_ID, campaignId, limit).all().catch(() => ({ results: [] }));
  return rows?.results || [];
}

function progressBar(raisedCents, goalCents) {
  const goal = Number(goalCents) || 0;
  const raised = Number(raisedCents) || 0;
  const pct = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;
  return `
    <div class="dv2-progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
      <div class="dv2-progress-fill" style="width:${pct}%"></div>
    </div>`;
}

function mediaPlaceholder(label = "Image coming soon") {
  return `<div class="dv2-ph" aria-hidden="true"><span>${esc(label)}</span></div>`;
}

function renderMedia(url, alt, placeholderLabel) {
  const src = safeUrl(url);
  if (!src) return mediaPlaceholder(placeholderLabel);
  return `<img src="${escAttr(src)}" alt="${escAttr(alt || "")}" loading="lazy" decoding="async" />`;
}

function renderFacebookVideoEmbed(reelUrl) {
  const href = encodeURIComponent(safeUrl(reelUrl) || DEFAULT_KITA_FB_REEL);
  return `<div class="dv2-fb-video">
    <iframe
      src="https://www.facebook.com/plugins/video.php?height=476&amp;href=${href}&amp;show_text=false&amp;width=267&amp;t=0"
      width="267" height="476"
      style="border:none;overflow:hidden"
      scrolling="no" frameborder="0"
      allowfullscreen="true"
      allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
      title="Campaign video"></iframe>
  </div>`;
}

function shareCampaignBtn(opts = {}) {
  const url = escAttr(opts.url || KITA_SHARE_URL);
  const title = escAttr(opts.title || "Help Kita Heal — Companions of Caddo");
  const text = escAttr(opts.text || "Kita needs amputation surgery and recovery care. Please help if you can.");
  return `<button class="btn btn-ghost" type="button" data-action="share-campaign" data-share-url="${url}" data-share-title="${title}" data-share-text="${text}">Share This Campaign</button>`;
}

async function renderFreedomHero(section, blocks, brand, env) {
  const config = safeJson(section?.config_json, {});
  const campaignId = pickText(config, ["campaign_id"]) || "camp_freedom_fest_2026";
  const campaign = await loadCampaign(env, campaignId);
  const cc = cfg(campaign);
  const ticketCents = Number(cc.ticket_amount_cents || config.ticket_amount_cents) || 17500;
  const ticketDollars = Math.round(ticketCents / 100);
  const title = pickText(cc, ["public_eyebrow"]) || pickText(section, ["eyebrow"]) || "FREEDOM FEST 2026";
  const ribbon = pickText(cc, ["public_heading"]) || pickText(section, ["heading"]) || "RED, WHITE & RESCUED";
  const tagline = pickText(cc, ["public_subheading"]) || pickText(section, ["subheading"]) || "Celebrate Freedom. Change a Life.";
  const body = pickText(campaign, ["description", "short_description"]) || pickText(section, ["body"]) || [
    "Sponsor a ticket and help rescue dogs travel to a brighter, better future.",
    "Every sponsored passenger gives an animal the chance to leave the shelter behind and move toward safety, rescue, foster, or a forever home.",
  ].join(" ");
  const ctaLabel = pickText(cc, ["cta_label"]) || pickText(section, ["cta_label"]) || "Sponsor a Ticket";
  const footerL = pickText(cc, ["footer_tagline"]) || pickText(config, ["footer_tagline"]) || "ONE TICKET. ONE LIFE. FOREVER.";
  const footerR = pickText(cc, ["footer_note"]) || pickText(config, ["footer_note"]) || "Thank you for helping us celebrate freedom and second chances.";
  const sectionKey = pickText(section, ["section_key"]);

  const animals = await loadCampaignAnimals(env, campaignId, 3);
  const cards = animals.map((a) => {
    const sponsored = Number(a.campaign_tickets_sponsored) > 0;
    const status = sponsored ? "Ticket sponsored" : "Needs ticket";
    return `
      <article class="dv2-pass">
        <h3 class="dv2-pass-name">${esc(a.name || "Guest")}</h3>
        <div class="dv2-pass-media">${renderMedia(a.photo_url, a.name, "Animal photo")}</div>
        <p class="dv2-pass-status${sponsored ? " is-sponsored" : ""}">${esc(status)}</p>
      </article>`;
  }).join("");

  return `
<section class="dv2 dv2-hero" data-section-key="${escAttr(sectionKey)}" id="donate-freedom-hero">
  <div class="dv2-wrap">
    <header class="dv2-hero-head">
      <p class="dv2-kicker">${esc(title)}</p>
      <h1 class="dv2-ribbon">${esc(ribbon)}</h1>
      <p class="dv2-tagline">${esc(tagline)}</p>
      <p class="dv2-lead">${esc(body)}</p>
      ${donateBtn(ctaLabel, { red: true, amount: ticketDollars, campaignId })}
    </header>
    <div class="dv2-pass-row" aria-label="Freedom Fest passengers">${cards || mediaPlaceholder("VIP passengers coming soon")}</div>
  </div>
  <footer class="dv2-bar">
    <p class="dv2-bar-strong">${esc(footerL)}</p>
    <p class="dv2-bar-note">${esc(footerR)}</p>
  </footer>
</section>`;
}

async function renderMedicalStory(section, blocks, brand, env) {
  const config = safeJson(section?.config_json, {});
  const fallbackId = pickText(config, ["campaign_id"]) || "camp_kita_amputation";
  const campaign = (await loadCampaignByPlacement(env, "medical_featured"))
    || (await loadCampaign(env, fallbackId));
  const campaignId = campaign?.id || fallbackId;
  const cc = cfg(campaign);
  const eyebrow = pickText(cc, ["public_eyebrow"]) || pickText(section, ["eyebrow"]) || "Featured Medical Need: Kita";
  const heading = pickText(cc, ["public_heading"]) || pickText(section, ["heading"]) || "A Sweet Cat Deserves a Second Chance";
  const body = pickText(campaign, ["description"]) || pickText(section, ["body"]) || [
    "Kita first arrived as a routine TNR case, but shelter staff quickly realized she was not feral at all. She was sweet, friendly, and clearly deserving of a life beyond the streets.",
    "After a veterinary evaluation, Kita was diagnosed with a fractured back leg that cannot be repaired. She will need an amputation, follow-up care, recovery support, and boarding while she heals.",
    "The good news: a foster has already stepped forward to care for her during recovery.",
  ].join("\n\n");
  const cardTitle = pickText(cc, ["card_title"]) || campaign?.title || pickText(config, ["card_title"]) || "Kita's Amputation Care";
  const cardEyebrow = pickText(cc, ["card_eyebrow"]) || pickText(config, ["card_eyebrow"]) || "CURRENT MEDICAL NEED";
  const raised = await loadCampaignRaisedCents(env, campaignId, campaign?.raised_amount_cents ?? Number(config.raised_amount_cents) ?? 22500);
  const goal = campaign?.goal_amount_cents ?? Number(config.goal_amount_cents) ?? 60000;
  const supports = Array.isArray(cc.supports) ? cc.supports
    : Array.isArray(config.supports) ? config.supports : [
    "Surgery", "Medication", "Follow-up care", "Recovery expenses",
  ];
  const fbReelUrl = pickText(cc, ["facebook_reel_url", "video_embed_url"])
    || pickText(config, ["facebook_reel_url", "video_embed_url"]) || DEFAULT_KITA_FB_REEL;
  const primaryCta = pickText(cc, ["donate_cta_primary"]) || "Donate Toward Kita's Care";
  const sidebarCta = pickText(cc, ["donate_cta_sidebar"]) || "Help Kita Heal";
  const shareUrl = pickText(cc, ["share_url"]) || KITA_SHARE_URL;
  const sectionKey = pickText(section, ["section_key"]);

  const supportList = supports.map((s) => `<li>${esc(s)}</li>`).join("");
  const paragraphs = body.split(/\n\n+/).map((p) => `<p>${esc(p.trim())}</p>`).join("");

  return `
<section class="dv2 dv2-split" data-section-key="${escAttr(sectionKey)}" id="donate-medical-story">
  <div class="dv2-wrap dv2-split-grid">
    <div class="dv2-split-text">
      <p class="dv2-ey">${esc(eyebrow)}</p>
      <h2 class="dv2-h2">${esc(heading)}</h2>
      <div class="dv2-prose">${paragraphs}</div>
      <div class="dv2-media-slot dv2-media-video">
        ${renderFacebookVideoEmbed(fbReelUrl)}
      </div>
      <div class="dv2-btn-row">
        ${donateBtn(primaryCta, { campaignId })}
        ${shareCampaignBtn({ url: shareUrl, title: cardTitle + " — Companions of Caddo", text: campaign?.short_description || "" })}
      </div>
    </div>
    <aside class="dv2-campaign-card" data-campaign-id="${escAttr(campaignId)}" data-campaign-raised="${raised}" data-campaign-goal="${goal}">
      <p class="dv2-card-ey">${esc(cardEyebrow)}</p>
      <h3 class="dv2-card-title">${esc(cardTitle)}</h3>
      <p class="dv2-card-stat"><strong>${esc(money(raised))}</strong> donated so far</p>
      <p class="dv2-card-stat">${esc(money(goal))} estimated goal</p>
      ${progressBar(raised, goal)}
      <p class="dv2-card-label">What donations support:</p>
      <ul class="dv2-list">${supportList}</ul>
      ${donateBtn(sidebarCta, { red: true, campaignId })}
    </aside>
  </div>
</section>`;
}

async function renderStoriesHelp(section, blocks, brand, env) {
  const config = safeJson(section?.config_json, {});
  const heading = pickText(section, ["heading"]) || "Every Sponsorship Moves a Life Forward";
  const intro = pickText(section, ["body"]) || [
    "Some animals need medical care. Some need transport. Some need a foster.",
    "Some simply need one person to say, \"I'll help.\"",
  ].join(" ");
  const ticketDollars = Math.round((Number(config.ticket_amount_cents) || 17500) / 100);
  const festCampaign = pickText(config, ["freedom_campaign_id"]) || "camp_freedom_fest_2026";
  const kitaCampaign = pickText(config, ["kita_campaign_id"]) || "camp_kita_amputation";
  const sectionKey = pickText(section, ["section_key"]);
  const kitaCamp = (await loadCampaignByPlacement(env, "story_card"))
    || (await loadCampaign(env, kitaCampaign));
  const kitaCc = cfg(kitaCamp);
  const kitaId = kitaCamp?.id || kitaCampaign;
  const kitaRaised = await loadCampaignRaisedCents(env, kitaId, kitaCamp?.raised_amount_cents ?? 22500);
  const kitaGoal = kitaCamp?.goal_amount_cents ?? 60000;
  const sponsoredId = pickText(config, ["sponsored_campaign_id"]);
  const sponsoredCamp = (await loadCampaignByPlacement(env, "story_sponsored"))
    || (sponsoredId ? await loadCampaign(env, sponsoredId) : null);
  const sponsoredCfg = cfg(sponsoredCamp);

  const sunflower = config.sunflower || {};
  const kita = config.kita || {};
  const sunflowerName = sponsoredCamp?.title || sunflower.name || "Sunflower";
  const sunflowerPhoto = campaignCoverUrl(sponsoredCamp) || sunflower.photo_url || DEFAULT_SUNFLOWER_PHOTO;
  const sunflowerBody = sponsoredCamp?.short_description || sponsoredCamp?.description || sunflower.body || "Sunflower's ticket to Freedom Fest has already been sponsored. That means her ride to a brighter, better future is covered.";
  const sunflowerThanks = pickText(sponsoredCfg, ["story_thanks"]) || sunflower.thanks || "Thank you for giving Sunflower a real chance at freedom and a future.";
  const kitaName = kitaCamp?.title || kita.name || "Kita";
  const kitaBody = kitaCamp?.short_description || kita.body || "Help cover her amputation, medication, follow-up care, and recovery support.";
  const kitaFb = pickText(kitaCc, ["facebook_reel_url"]) || pickText(kita, ["facebook_reel_url"]) || DEFAULT_KITA_FB_REEL;
  const kitaSidebarCta = pickText(kitaCc, ["donate_cta_sidebar"]) || "Help Kita Heal";
  const kitaProgress = `${money(kitaRaised)} donated toward ${money(kitaGoal)}`;
  const introParts = intro.split(/\n/).filter(Boolean).map((line) => `<p>${esc(line.trim())}</p>`).join("");

  return `
<section class="dv2 dv2-stories" data-section-key="${escAttr(sectionKey)}" id="donate-stories-help">
  <div class="dv2-wrap">
    <header class="dv2-stories-head">
      <h2 class="dv2-h2">${esc(heading)}</h2>
      <div class="dv2-prose dv2-prose-center">${introParts}</div>
    </header>
    <div class="dv2-story-grid dv2-story-grid--two">
      ${renderStoryHeroCard({
        sponsored: true,
        eyebrow: "SPONSORED STORY",
        title: sunflowerName,
        body: sunflowerBody,
        imageUrl: sunflowerPhoto,
        imageAlt: sunflowerName,
        extraHtml: `<p class="dv2-prose-sm dv2-muted">${esc(sunflowerThanks)}</p>`,
        ctaLabel: "Sponsor Another Ticket",
        ctaOpts: { amount: ticketDollars, campaignId: festCampaign },
      })}
      ${renderStoryHeroCard({
        eyebrow: "NEXT ANIMAL / CAMPAIGN",
        title: kitaName,
        body: kitaBody,
        videoUrl: kitaFb,
        extraHtml: `<p class="dv2-card-stat">${esc(kitaProgress)}</p>`,
        ctaLabel: kitaSidebarCta,
        ctaOpts: { campaignId: kitaId },
      })}
    </div>
    <p class="dv2-trust">${esc(config.trust_strip || "Volunteer-led nonprofit • Medical care • Foster support • Transport help")}</p>
  </div>
</section>`;
}

async function renderDonateCampaignGrid(section, blocks, brand, env) {
  const config = safeJson(section?.config_json, {});
  const heading = pickText(section, ["heading"]) || "More ways to give";
  const intro = pickText(section, ["body"]) || "Every gift goes directly toward medical care, transport, and second chances.";
  const sectionKey = pickText(section, ["section_key"]);
  const featured = await Promise.all([
    loadCampaign(env, pickText(config, ["freedom_campaign_id"]) || "camp_freedom_fest_2026"),
    loadCampaignByPlacement(env, "medical_featured"),
    loadCampaignByPlacement(env, "story_card"),
    loadCampaignByPlacement(env, "story_sponsored"),
    pickText(config, ["sponsored_campaign_id"]) ? loadCampaign(env, pickText(config, ["sponsored_campaign_id"])) : null,
    loadCampaign(env, pickText(config, ["kita_campaign_id"]) || "camp_kita_amputation"),
  ]);
  const exclude = [
    pickText(config, ["freedom_campaign_id"]) || "camp_freedom_fest_2026",
    pickText(config, ["kita_campaign_id"]) || "camp_kita_amputation",
    pickText(config, ["medical_campaign_id"]) || "camp_kita_amputation",
    pickText(config, ["sponsored_campaign_id"]),
    ...featured.filter(Boolean).map((c) => c.id),
  ];
  const campaigns = await loadDonateGridCampaigns(env, exclude);
  if (!campaigns.length) return "";

  const cards = await Promise.all(campaigns.map(async (c) => {
    const cc = cfg(c);
    const raised = await loadCampaignRaisedCents(env, c.id, c.raised_amount_cents || 0);
    const goal = Number(c.goal_amount_cents) || 0;
    const body = pickText(c, ["short_description", "description"]);
    const cta = pickText(cc, ["donate_cta_sidebar", "donate_cta_primary"]) || "Donate";
    const stat = goal > 0
      ? `<p class="dv2-card-stat">${esc(money(raised))} donated toward ${esc(money(goal))}</p>${progressBar(raised, goal)}`
      : raised > 0
        ? `<p class="dv2-card-stat"><strong>${esc(money(raised))}</strong> raised</p>`
        : "";
    return `
      <article class="foster-card dv2-foster-card" data-campaign-id="${escAttr(c.id)}">
        ${renderFosterCardMedia(c, c.title)}
        <div class="foster-card-body">
          <p class="foster-card-ey">${esc((c.campaign_type || "campaign").toUpperCase())}</p>
          <h3>${esc(c.title || "Campaign")}</h3>
          <p>${esc(body)}</p>
          ${stat}
          ${donateBtn(cta, { campaignId: c.id, red: false })}
        </div>
      </article>`;
  }));

  return `
<section class="section s-light dv2-campaigns-grid" data-section-key="${escAttr(sectionKey)}" id="donate-campaign-grid">
  <div class="container">
    <div class="foster-header">
      <div class="section-intro-center" style="margin-bottom:0;text-align:left;max-width:none;">
        <h2 class="mission-heading">${esc(heading)}</h2>
        <p class="mission-body">${esc(intro)}</p>
      </div>
    </div>
    <div class="foster-grid dv2-foster-grid">${cards.join("")}</div>
  </div>
</section>`;
}

function renderDonateContact(section, blocks, brand, env) {
  const config = safeJson(section?.config_json, {});
  const heading = pickText(section, ["heading"]) || "Questions before you give?";
  const body = pickText(section, ["body"]) || "Reach out anytime — a volunteer will follow up by email.";
  const ctaLabel = pickText(section, ["cta_label"]) || "Get in Touch";
  const sectionKey = pickText(section, ["section_key"]);
  return `
<section class="dv2 dv2-contact" data-section-key="${escAttr(sectionKey)}" id="donate-contact">
  <div class="dv2-wrap">
    <div class="dv2-contact-card">
      <div class="dv2-contact-copy">
        <h2 class="dv2-h2">${esc(heading)}</h2>
        <p class="dv2-prose-sm">${esc(body)}</p>
      </div>
      <button class="btn btn-primary" type="button" data-modal="contact">${esc(ctaLabel)}</button>
    </div>
  </div>
</section>`;
}

export function isDonateV2SectionType(type) {
  return DONATE_V2_TYPES.has(String(type || "").toLowerCase());
}

export function isDynamicDonateSectionType(type) {
  const t = String(type || "").toLowerCase();
  return DONATE_V2_TYPES.has(t) || t === "donate_medical_story" || t === "donate_freedom_hero";
}

export async function renderDonateV2Section(section, blocks = [], brand = {}, env = null) {
  const type = pickText(section, ["section_type"]).toLowerCase();
  if (type === "donate_freedom_hero") return renderFreedomHero(section, blocks, brand, env);
  if (type === "donate_medical_story") return renderMedicalStory(section, blocks, brand, env);
  if (type === "donate_stories_help") return renderStoriesHelp(section, blocks, brand, env);
  if (type === "donate_campaign_grid") return renderDonateCampaignGrid(section, blocks, brand, env);
  if (type === "donate_contact") return renderDonateContact(section, blocks, brand, env);
  return `<!-- unknown donate v2 section: ${esc(type)} -->`;
}

export const DONATE_V2_DYNAMIC_TYPES = DONATE_V2_TYPES;
