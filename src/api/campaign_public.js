import { safeJson } from "./render_section.js";

const TENANT_ID = "tenant_companionscpas";
const CDN = "https://assets.companionsofcaddo.org";

function text(value) {
  if (value == null) return "";
  return String(value);
}

function safeUrl(value, fallback = "") {
  const raw = text(value).trim();
  if (!raw) return fallback;
  if (raw.startsWith("/media/") || raw.startsWith("/static/")) return CDN + raw;
  try {
    const u = new URL(raw);
    if (u.protocol === "http:" || u.protocol === "https:") return u.toString();
  } catch {}
  return fallback;
}

export function campaignConfig(campaign) {
  return campaign?.config || safeJson(campaign?.config_json, {});
}

export function campaignCoverUrl(campaign, fallback = `${CDN}/media/animals/goinhomejustadopted.webp`) {
  const cc = campaignConfig(campaign);
  const attachments = Array.isArray(cc.attachments) ? cc.attachments : [];
  const img = attachments.find((a) => a?.type === "image" && a?.url);
  if (img?.url) return safeUrl(img.url, fallback);
  if (cc.cover_url) return safeUrl(cc.cover_url, fallback);
  if (campaign?.cover_url) return safeUrl(campaign.cover_url, fallback);
  return fallback;
}

export function campaignSummary(campaign) {
  return text(campaign?.short_description || campaign?.description || campaignConfig(campaign).card_body || "").trim();
}

export function showCampaignOnHome(campaign) {
  const cc = campaignConfig(campaign);
  const flag = cc.show_on_home;
  if (flag === false || flag === 0 || flag === "false" || flag === "0") return false;
  return Number(campaign?.is_public) === 1 && String(campaign?.status || "").toLowerCase() === "active";
}

export async function loadCampaignRaisedCents(env, campaignId, fallbackCents = 0) {
  if (!env?.DB || !campaignId) return fallbackCents;
  const sumRow = await env.DB.prepare(
    `SELECT COALESCE(SUM(amount_cents), 0) AS total
     FROM donations
     WHERE campaign_id = ? AND status = 'succeeded'`
  ).bind(campaignId).first().catch(() => null);
  const fromDonations = Number(sumRow?.total) || 0;
  if (fromDonations > 0) return fromDonations;
  return Number(fallbackCents) || 0;
}

export async function loadHomeFeaturedCampaigns(env, { limit = 3 } = {}) {
  if (!env?.DB) return [];
  const rows = await env.DB.prepare(
    `SELECT fc.*,
            COALESCE(ca.public_url, ca.cdn_url, ca.pub_url) AS cover_url
     FROM fundraising_campaigns fc
     LEFT JOIN cms_assets ca ON ca.id = fc.cover_asset_id
     WHERE (fc.tenant_id = ? OR fc.organization_id = ?)
       AND fc.is_public = 1
       AND fc.status = 'active'
     ORDER BY fc.updated_at DESC`
  ).bind(TENANT_ID, TENANT_ID).all().catch(() => ({ results: [] }));

  const campaigns = (rows?.results || [])
    .map((row) => ({ ...row, config: safeJson(row.config_json, {}) }))
    .filter(showCampaignOnHome);

  campaigns.sort((a, b) => {
    const af = campaignConfig(a).home_featured ? 1 : 0;
    const bf = campaignConfig(b).home_featured ? 1 : 0;
    if (bf !== af) return bf - af;
    const ar = Number(a.raised_amount_cents) || 0;
    const br = Number(b.raised_amount_cents) || 0;
    if (br !== ar) return br - ar;
    return String(b.updated_at || "").localeCompare(String(a.updated_at || ""));
  });

  const picked = campaigns.slice(0, Math.max(1, Number(limit) || 3));
  return Promise.all(picked.map(async (campaign) => ({
    ...campaign,
    raised_cents: await loadCampaignRaisedCents(env, campaign.id, campaign.raised_amount_cents),
  })));
}

export function formatCampaignMoney(cents) {
  const n = Number(cents) || 0;
  return "$" + Math.round(n / 100).toLocaleString("en-US");
}
