import { renderAboutFragment, fragmentKeyForAboutSection } from "./render_about_section.js";
import { publishAboutFromFragments } from "./render_about_fragments.js";

const TENANT_ID = "tenant_companionscpas";
export const ABOUT_ROUTE = "/about";
const CDN = "https://assets.companionsofcaddo.org";

export const ABOUT_SECTION_KEYS = ["hero", "why_we_exist", "paths", "campaigns", "cta"];

export const DEFAULT_ABOUT_SECTIONS = [
  {
    id: "section_about_hero",
    section_key: "hero",
    section_type: "hero",
    sort_order: 10,
    eyebrow: "Caddo Parish • 100% Volunteer-Based",
    heading: "Giving Caddo dogs the second chance they might not get otherwise.",
    body: "Companions of CPAS helps dogs at Caddo Parish Animal Services leave uncertainty behind through medical care, transport pathways, rescue partnerships, and community support.",
    image_url: `${CDN}/static/pages/about/theteam.webp`,
    cta_label: "Meet Adoptable Dogs",
    cta_href: "/adopt",
    config_json: { image_alt: "Companions of CPAS volunteer team" },
  },
  {
    id: "section_about_why",
    section_key: "why_we_exist",
    section_type: "text_image",
    sort_order: 20,
    eyebrow: "Why Companions Exists",
    heading: "When space is limited, support becomes the difference between fear and a future.",
    body: "Caddo Parish Animal Services is an open-intake shelter, where dogs can be at risk simply because there is not enough space. Companions of CPAS is not here to compete with rescues or claim animals as our own. We step in where support matters most.",
    config_json: {
      media_type: "shelter_map",
      shelter_name: "Caddo Parish Animal Services",
      shelter_address: "1500 Monty Street, Shreveport, LA 71107",
    },
  },
  {
    id: "section_about_paths",
    section_key: "paths",
    section_type: "card_grid",
    sort_order: 30,
    heading: "Two ways we create pathways to safety.",
    config_json: {},
  },
  {
    id: "section_about_campaigns",
    section_key: "campaigns",
    section_type: "campaign_grid",
    sort_order: 40,
    eyebrow: "Featured Campaigns",
    heading: "$10,000 lifesaving goal",
    body: "$465 raised by 7 donors. Every gift fuels medical support, transport, and second chances.",
    config_json: {
      raised: 465,
      goal: 10000,
      donors: 7,
      campaign_title: "$10,000 lifesaving goal",
      campaign_desc: "Every gift fuels medical support, transport, and second chances for dogs at Caddo Parish Animal Services.",
      image_url: `${CDN}/media/animals/goinhomejustadopted.webp`,
      donate_href: "/donate",
    },
  },
  {
    id: "section_about_cta",
    section_key: "cta",
    section_type: "cta_banner",
    sort_order: 50,
    eyebrow: "Give them a way out",
    heading: "Help fund medical care, transport, and second chances.",
    body: "Your gift helps dogs at Caddo Parish Animal Services receive the treatment, visibility, and rescue pathways they need.",
    cta_label: "View Adoptable Dogs",
    cta_href: "/adopt",
    config_json: {},
  },
];

export const DEFAULT_ABOUT_BLOCKS = [
  {
    id: "block_about_path_1",
    section_key: "paths",
    block_key: "path_1",
    block_type: "card",
    title: "Funding critical medical care",
    body: "We help fund surgery, diagnostics, urgent treatment, and heartworm care for dogs whose medical needs would otherwise keep them stuck.",
    sort_order: 10,
  },
  {
    id: "block_about_path_2",
    section_key: "paths",
    block_key: "path_2",
    block_type: "card",
    title: "Transporting dogs to no-kill rescue partners",
    body: "When local options are limited, transport connects Caddo dogs with rescue partners and communities where adoption demand is higher.",
    sort_order: 20,
  },
];

function cfgString(v) {
  return typeof v === "string" ? v : JSON.stringify(v || {});
}

export async function loadAboutPageData(env) {
  const [sectionsRes, blocksRes] = await Promise.all([
    env.DB.prepare("SELECT * FROM cms_page_sections WHERE tenant_id = ? AND page_route = ? ORDER BY sort_order, section_key")
      .bind(TENANT_ID, ABOUT_ROUTE).all(),
    env.DB.prepare("SELECT * FROM cms_page_content_blocks WHERE tenant_id = ? AND page_route = ? ORDER BY sort_order, section_key, block_key")
      .bind(TENANT_ID, ABOUT_ROUTE).all(),
  ]);
  return { sections: sectionsRes.results || [], blocks: blocksRes.results || [] };
}

export async function ensureAboutSections(env) {
  for (const section of DEFAULT_ABOUT_SECTIONS) {
    await env.DB.prepare(`
      INSERT INTO cms_page_sections (id, tenant_id, page_route, section_key, section_type, eyebrow, heading, subheading, body, image_url, cta_label, cta_href, cta_secondary_label, cta_secondary_href, sort_order, is_visible, config_json, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, datetime('now'))
      ON CONFLICT(tenant_id, page_route, section_key) DO NOTHING
    `).bind(
      section.id, TENANT_ID, ABOUT_ROUTE, section.section_key, section.section_type,
      section.eyebrow || "", section.heading || "", section.subheading || "", section.body || "",
      section.image_url || "", section.cta_label || "", section.cta_href || "",
      section.cta_secondary_label || "", section.cta_secondary_href || "", section.sort_order,
      cfgString(section.config_json)
    ).run();
  }
  for (const block of DEFAULT_ABOUT_BLOCKS) {
    await env.DB.prepare(`
      INSERT INTO cms_page_content_blocks (id, tenant_id, page_route, section_key, block_key, block_type, title, subtitle, body, image_url, alt_text, href, sort_order, is_visible, config_json, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, datetime('now'))
      ON CONFLICT(tenant_id, page_route, section_key, block_key) DO NOTHING
    `).bind(
      block.id, TENANT_ID, ABOUT_ROUTE, block.section_key, block.block_key, block.block_type,
      block.title || "", block.subtitle || "", block.body || "", block.image_url || "",
      block.alt_text || "", block.href || "", block.sort_order, cfgString(block.config_json || {})
    ).run();
  }
}

export async function upsertAboutDefaults(env, force = false) {
  if (!force) return ensureAboutSections(env);
  for (const section of DEFAULT_ABOUT_SECTIONS) {
    await env.DB.prepare(`
      INSERT INTO cms_page_sections (id, tenant_id, page_route, section_key, section_type, eyebrow, heading, subheading, body, image_url, cta_label, cta_href, cta_secondary_label, cta_secondary_href, sort_order, is_visible, config_json, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, datetime('now'))
      ON CONFLICT(tenant_id, page_route, section_key) DO UPDATE SET section_type=excluded.section_type, eyebrow=excluded.eyebrow, heading=excluded.heading, body=excluded.body, image_url=excluded.image_url, cta_label=excluded.cta_label, cta_href=excluded.cta_href, sort_order=excluded.sort_order, config_json=excluded.config_json, updated_at=datetime('now')
    `).bind(
      section.id, TENANT_ID, ABOUT_ROUTE, section.section_key, section.section_type,
      section.eyebrow || "", section.heading || "", section.subheading || "", section.body || "",
      section.image_url || "", section.cta_label || "", section.cta_href || "",
      section.cta_secondary_label || "", section.cta_secondary_href || "", section.sort_order,
      cfgString(section.config_json)
    ).run();
  }
  for (const block of DEFAULT_ABOUT_BLOCKS) {
    await env.DB.prepare(`
      INSERT INTO cms_page_content_blocks (id, tenant_id, page_route, section_key, block_key, block_type, title, subtitle, body, image_url, alt_text, href, sort_order, is_visible, config_json, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, datetime('now'))
      ON CONFLICT(tenant_id, page_route, section_key, block_key) DO UPDATE SET block_type=excluded.block_type, title=excluded.title, body=excluded.body, sort_order=excluded.sort_order, updated_at=datetime('now')
    `).bind(
      block.id, TENANT_ID, ABOUT_ROUTE, block.section_key, block.block_key, block.block_type,
      block.title || "", block.subtitle || "", block.body || "", block.image_url || "",
      block.alt_text || "", block.href || "", block.sort_order, cfgString(block.config_json || {})
    ).run();
  }
}

async function syncAboutSectionToR2(env, section, blocks) {
  const r2Key = fragmentKeyForAboutSection(section.section_key);
  if (!r2Key) return { skipped: true, section_key: section.section_key };
  const html = renderAboutFragment(section, blocks);
  if (!html) return { skipped: true, section_key: section.section_key };
  await env.WEBSITE_ASSETS.put(r2Key, html, {
    httpMetadata: { contentType: "text/html; charset=utf-8" },
  });
  return { synced: true, section_key: section.section_key, r2_key: r2Key };
}

export async function syncAllAboutSectionsToR2(env, { ensure = true } = {}) {
  if (ensure) await ensureAboutSections(env);
  const { sections, blocks } = await loadAboutPageData(env);
  const results = [];
  for (const key of ABOUT_SECTION_KEYS) {
    const section = sections.find((s) => s.section_key === key);
    if (!section) continue;
    results.push(await syncAboutSectionToR2(env, section, blocks.filter((b) => b.section_key === key)));
  }
  return { synced: results.filter((r) => r.synced), sections: results };
}

export async function bustAboutPageCache(env) {
  if (env.CMS_CACHE) await env.CMS_CACHE.delete("page:/about").catch(() => {});
}

export async function syncAndPublishAbout(env, jobId = null) {
  await syncAllAboutSectionsToR2(env);
  await bustAboutPageCache(env);
  return publishAboutFromFragments(env, jobId);
}

export async function previewAboutFromCms(env) {
  await syncAllAboutSectionsToR2(env);
  const { assembleAboutFromFragments } = await import("./render_about_fragments.js");
  return assembleAboutFromFragments(env);
}

export const DEFAULT_SECTIONS = DEFAULT_ABOUT_SECTIONS;
export const DEFAULT_BLOCKS = DEFAULT_ABOUT_BLOCKS;
export const SECTION_KEYS = ABOUT_SECTION_KEYS;
export const PAGE_ROUTE = ABOUT_ROUTE;

export async function ensurePageSections(env) { return ensureAboutSections(env); }
export async function upsertPageDefaults(env, force) { return upsertAboutDefaults(env, force); }
export async function syncAllSectionsToR2(env, opts) { return syncAllAboutSectionsToR2(env, opts); }
export async function bustPageCache(env) { return bustAboutPageCache(env); }
export async function syncAndPublishPage(env, jobId) { return syncAndPublishAbout(env, jobId); }
export async function previewPageFromCms(env) { return previewAboutFromCms(env); }
