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
  const cls = opts.ghost ? "dv2-btn dv2-btn-ghost" : opts.red ? "dv2-btn dv2-btn-red" : "dv2-btn dv2-btn-primary";
  return `<button class="${cls}" type="button" data-action="donate"${amount}${camp}>${esc(label)}</button>`;
}

async function loadCampaign(env, campaignId) {
  if (!env?.DB || !campaignId) return null;
  return env.DB.prepare(
    `SELECT * FROM fundraising_campaigns WHERE id = ? AND tenant_id = ? LIMIT 1`
  ).bind(campaignId, TENANT_ID).first().catch(() => null);
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
  return `<button class="dv2-btn dv2-btn-ghost" type="button" data-action="share-campaign" data-share-url="${url}" data-share-title="${title}" data-share-text="${text}">Share This Campaign</button>`;
}

async function renderFreedomHero(section, blocks, brand, env) {
  const config = safeJson(section?.config_json, {});
  const campaignId = pickText(config, ["campaign_id"]) || "camp_freedom_fest_2026";
  const ticketDollars = Math.round((Number(config.ticket_amount_cents) || 17500) / 100);
  const title = pickText(section, ["eyebrow"]) || "FREEDOM FEST 2026";
  const ribbon = pickText(section, ["heading"]) || "RED, WHITE & RESCUED";
  const tagline = pickText(section, ["subheading"]) || "Celebrate Freedom. Change a Life.";
  const body = pickText(section, ["body"]) || [
    "Sponsor a ticket and help rescue dogs travel to a brighter, better future.",
    "Every sponsored passenger gives an animal the chance to leave the shelter behind and move toward safety, rescue, foster, or a forever home.",
  ].join(" ");
  const ctaLabel = pickText(section, ["cta_label"]) || "Sponsor a Ticket";
  const footerL = pickText(config, ["footer_tagline"]) || "ONE TICKET. ONE LIFE. FOREVER.";
  const footerR = pickText(config, ["footer_note"]) || "Thank you for helping us celebrate freedom and second chances.";
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
  const campaignId = pickText(config, ["campaign_id"]) || "camp_kita_amputation";
  const campaign = await loadCampaign(env, campaignId);
  const eyebrow = pickText(section, ["eyebrow"]) || "Featured Medical Need: Kita";
  const heading = pickText(section, ["heading"]) || "A Sweet Cat Deserves a Second Chance";
  const body = pickText(section, ["body"]) || [
    "Kita first arrived as a routine TNR case, but shelter staff quickly realized she was not feral at all. She was sweet, friendly, and clearly deserving of a life beyond the streets.",
    "After a veterinary evaluation, Kita was diagnosed with a fractured back leg that cannot be repaired. She will need an amputation, follow-up care, recovery support, and boarding while she heals.",
    "The good news: a foster has already stepped forward to care for her during recovery.",
  ].join("\n\n");
  const cardTitle = pickText(config, ["card_title"]) || campaign?.title || "Kita's Amputation Care";
  const cardEyebrow = pickText(config, ["card_eyebrow"]) || "CURRENT MEDICAL NEED";
  const raised = await loadCampaignRaisedCents(env, campaignId, campaign?.raised_amount_cents ?? Number(config.raised_amount_cents) ?? 22500);
  const goal = campaign?.goal_amount_cents ?? Number(config.goal_amount_cents) ?? 60000;
  const supports = Array.isArray(config.supports) ? config.supports : [
    "Surgery", "Medication", "Follow-up care", "Recovery expenses",
  ];
  const fbReelUrl = pickText(config, ["facebook_reel_url", "video_embed_url"]) || DEFAULT_KITA_FB_REEL;
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
        ${donateBtn("Donate Toward Kita's Care", { campaignId })}
        ${shareCampaignBtn()}
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
      ${donateBtn("Help Kita Heal", { red: true, campaignId })}
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
  const kitaCamp = await loadCampaign(env, kitaCampaign);
  const kitaRaised = await loadCampaignRaisedCents(env, kitaCampaign, kitaCamp?.raised_amount_cents ?? 22500);
  const kitaGoal = kitaCamp?.goal_amount_cents ?? 60000;

  const sunflower = config.sunflower || {};
  const kita = config.kita || {};
  const sunflowerPhoto = sunflower.photo_url || DEFAULT_SUNFLOWER_PHOTO;
  const kitaProgress = kita.progress_label
    || `${money(kitaRaised)} donated toward ${money(kitaGoal)}`;
  const introParts = intro.split(/\n/).filter(Boolean).map((line) => `<p>${esc(line.trim())}</p>`).join("");

  return `
<section class="dv2 dv2-stories" data-section-key="${escAttr(sectionKey)}" id="donate-stories-help">
  <div class="dv2-wrap">
    <header class="dv2-stories-head">
      <h2 class="dv2-h2">${esc(heading)}</h2>
      <div class="dv2-prose dv2-prose-center">${introParts}</div>
    </header>
    <div class="dv2-story-grid dv2-story-grid--two">
      <article class="dv2-story-card dv2-story-card--sponsored">
        <p class="dv2-card-ey">SPONSORED STORY</p>
        <h3 class="dv2-card-title">${esc(sunflower.name || "Sunflower")}</h3>
        <div class="dv2-pass-media dv2-pass-media--featured">${renderMedia(sunflowerPhoto, sunflower.name, "Sunflower photo")}</div>
        <p class="dv2-prose-sm">${esc(sunflower.body || "Sunflower's ticket to Freedom Fest has already been sponsored. That means her ride to a brighter, better future is covered.")}</p>
        <p class="dv2-prose-sm dv2-muted">${esc(sunflower.thanks || "Thank you for giving Sunflower a real chance at freedom and a future.")}</p>
        ${donateBtn("Sponsor Another Ticket", { red: true, amount: ticketDollars, campaignId: festCampaign })}
      </article>
      <article class="dv2-story-card">
        <p class="dv2-card-ey">NEXT ANIMAL / CAMPAIGN</p>
        <h3 class="dv2-card-title">${esc(kita.name || "Kita")}</h3>
        <div class="dv2-pass-media dv2-media-video">${renderFacebookVideoEmbed(pickText(kita, ["facebook_reel_url"]) || DEFAULT_KITA_FB_REEL)}</div>
        <p class="dv2-prose-sm">${esc(kita.body || "Help cover her amputation, medication, follow-up care, and recovery support.")}</p>
        <p class="dv2-card-stat">${esc(kitaProgress)}</p>
        ${donateBtn("Help Kita Heal", { campaignId: kitaCampaign })}
      </article>
    </div>
    <p class="dv2-trust">${esc(config.trust_strip || "Volunteer-led nonprofit • Medical care • Foster support • Transport help")}</p>
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
  return `<!-- unknown donate v2 section: ${esc(type)} -->`;
}

export const DONATE_V2_DYNAMIC_TYPES = DONATE_V2_TYPES;
