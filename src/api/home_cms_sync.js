import { renderHomeFragment, fragmentKeyForSection } from "./render_home_section.js";
import { publishHomeFromFragments } from "./render_home_fragments.js";
import { safeJson } from "./render_section.js";

const TENANT_ID = "tenant_companionscpas";
const HOME_ROUTE = "/";
const CDN = "https://assets.companionsofcaddo.org";

export const HOME_SECTION_KEYS = [
  "hero",
  "mission",
  "how_it_helps",
  "transport_win",
  "impact_stats",
  "campaigns",
  "newsletter",
];

export const DEFAULT_HOME_SECTIONS = [
  {
    id: "section_home_hero",
    section_key: "hero",
    section_type: "hero",
    sort_order: 10,
    eyebrow: "Caddo Parish · Volunteer Powered",
    heading: "Every dog deserves a way out.",
    subheading: "We move dogs from crisis to care through transport, urgent medical support, foster pathways, and a community that shows up when it matters most.",
    image_url: `${CDN}/media/animals/upclose.webp`,
    cta_label: "Apply to Foster",
    cta_secondary_label: "Support Our Mission",
    config_json: {
      cta_sub: "Open your home",
      cta_action: "foster",
      cta_secondary_sub: "Donate or give supplies",
      cta_secondary_action: "donate",
      image_alt: "A dog at Caddo Parish Animal Services",
    },
  },
  {
    id: "section_home_mission",
    section_key: "mission",
    section_type: "home_mission",
    sort_order: 20,
    eyebrow: "Our Mission",
    heading: "We are the bridge from urgent to safe.",
    body: "Companions of CPAS connects dogs in crisis with the care, transport, and loving foster homes they need — until they find their forever.",
    config_json: {},
  },
  {
    id: "section_home_how_it_helps",
    section_key: "how_it_helps",
    section_type: "home_pillars",
    sort_order: 30,
    eyebrow: "How Your Support Helps",
    heading: "",
    config_json: {},
  },
  {
    id: "section_home_transport_win",
    section_key: "transport_win",
    section_type: "home_story",
    sort_order: 40,
    eyebrow: "Recent Transport Win",
    heading: "A few hours on the road changed everything.",
    body: "Thanks to our transport volunteers and a community that showed up, 13 dogs rolled out on the Freedom Bus toward rescue partners and families waiting for them. Every sponsored seat — $150 — is one more dog that makes it out.",
    image_url: `${CDN}/media/animals/goinhomejustadopted.webp`,
    cta_label: "Sponsor a Transport Seat",
    config_json: { cta_action: "donate", image_alt: "A dog going home" },
  },
  {
    id: "section_home_impact_stats",
    section_key: "impact_stats",
    section_type: "home_stats",
    sort_order: 50,
    heading: "Impact",
    config_json: {},
  },
  {
    id: "section_home_campaigns",
    section_key: "campaigns",
    section_type: "home_campaigns",
    sort_order: 60,
    eyebrow: "Featured Campaigns",
    config_json: {
      campaigns_eyebrow: "Featured Campaigns",
      campaigns_link: "/donate",
      community_eyebrow: "From Our Community",
      community_link: "/community",
    },
  },
  {
    id: "section_home_newsletter",
    section_key: "newsletter",
    section_type: "home_newsletter",
    sort_order: 70,
    heading: "Stay in the loop. Be part of the second chances.",
    subheading: "Rescue stories, urgent needs, and ways to help — straight to your inbox.",
    config_json: { foster_label: "Foster a Dog", donate_label: "Donate Now" },
  },
];

export const DEFAULT_HOME_BLOCKS = [
  { id: "block_mission_1", section_key: "mission", block_key: "step_1", block_type: "mission_step", title: "From urgent\nsituations", sort_order: 10 },
  { id: "block_mission_2", section_key: "mission", block_key: "step_2", block_type: "mission_step", title: "To safe,\nloving care", sort_order: 20 },
  { id: "block_mission_3", section_key: "mission", block_key: "step_3", block_type: "mission_step", title: "To a better\nfuture", sort_order: 30 },
  { id: "block_pillar_1", section_key: "how_it_helps", block_key: "pillar_1", block_type: "home_pillar", title: "Move dogs to safety", body: "We coordinate transport across Louisiana and beyond to get dogs out of high-risk situations and into care.", href: "/services", sort_order: 10, config_json: { column: "pillars" } },
  { id: "block_pillar_2", section_key: "how_it_helps", block_key: "pillar_2", block_type: "home_pillar", title: "Provide urgent care", body: "We fund urgent vet care and life-saving treatments so dogs have the chance to heal and thrive.", href: "/donate", sort_order: 20, config_json: { column: "pillars" } },
  { id: "block_pillar_3", section_key: "how_it_helps", block_key: "pillar_3", block_type: "home_pillar", title: "Build foster pathways", body: "We support our foster network with supplies, resources, and guidance to help every dog feel safe and loved.", href: "/services", sort_order: 30, config_json: { column: "pillars" } },
  { id: "block_stat_1", section_key: "impact_stats", block_key: "stat_1", block_type: "home_stat", title: "13", subtitle: "Dogs Transported", body: "in the last 30 days", sort_order: 10 },
  { id: "block_stat_2", section_key: "impact_stats", block_key: "stat_2", block_type: "home_stat", title: "$150", subtitle: "Sponsors One Seat", body: "to freedom on a transport", sort_order: 20 },
  { id: "block_stat_3", section_key: "impact_stats", block_key: "stat_3", block_type: "home_stat", title: "24 hrs", subtitle: "Can Make a Difference", body: "in urgent medical cases", sort_order: 30 },
  { id: "block_stat_4", section_key: "impact_stats", block_key: "stat_4", block_type: "home_stat", title: "68", subtitle: "Fosters Supported", body: "this month and growing", sort_order: 40 },
  { id: "block_camp_1", section_key: "campaigns", block_key: "camp_1", block_type: "home_campaign", title: "Transport Fuel Fund", body: "Keep the wheels turning for dogs who need a way out.", image_url: `${CDN}/media/animals/goinhomejustadopted.webp`, sort_order: 10, config_json: { column: "campaigns", raised: 2350, goal: 5000 } },
  { id: "block_camp_2", section_key: "campaigns", block_key: "camp_2", block_type: "home_campaign", title: "Urgent Vet Care", body: "Help provide life-saving care for dogs in crisis.", image_url: `${CDN}/media/animals/thinboy.webp`, sort_order: 20, config_json: { column: "campaigns", raised: 3175, goal: 7500 } },
  { id: "block_camp_3", section_key: "campaigns", block_key: "camp_3", block_type: "home_campaign", title: "Foster Care Supplies", body: "Stock our foster homes with the essentials dogs need.", image_url: `${CDN}/media/animals/2cutepups.webp`, sort_order: 30, config_json: { column: "campaigns", raised: 1120, goal: 2500 } },
  { id: "block_comm_1", section_key: "campaigns", block_key: "comm_1", block_type: "home_community", body: "Thank you to our amazing transport team this weekend!", image_url: `${CDN}/media/team/thefounders.webp`, sort_order: 40, config_json: { column: "community", date: "2 days ago" } },
  { id: "block_comm_2", section_key: "campaigns", block_key: "comm_2", block_type: "home_community", body: "Sweet Luna found her forever family today.", image_url: `${CDN}/media/animals/goinhomejustadopted.webp`, sort_order: 50, config_json: { column: "community", date: "5 days ago" } },
  { id: "block_comm_3", section_key: "campaigns", block_key: "comm_3", block_type: "home_community", body: "New foster orientation — welcome to the team!", image_url: `${CDN}/media/team/theteam.webp`, sort_order: 60, config_json: { column: "community", date: "1 week ago" } },
];

function cfgString(value) {
  return typeof value === "string" ? value : JSON.stringify(value || {});
}

export async function loadHomePageData(env) {
  const [sectionsRes, blocksRes] = await Promise.all([
    env.DB.prepare("SELECT * FROM cms_page_sections WHERE tenant_id = ? AND page_route = ? ORDER BY sort_order, section_key")
      .bind(TENANT_ID, HOME_ROUTE).all(),
    env.DB.prepare("SELECT * FROM cms_page_content_blocks WHERE tenant_id = ? AND page_route = ? ORDER BY sort_order, section_key, block_key")
      .bind(TENANT_ID, HOME_ROUTE).all(),
  ]);
  return {
    sections: sectionsRes.results || [],
    blocks: blocksRes.results || [],
  };
}

export async function ensureHomeSections(env) {
  for (const section of DEFAULT_HOME_SECTIONS) {
    await env.DB.prepare(`
      INSERT INTO cms_page_sections
      (id, tenant_id, page_route, section_key, section_type, eyebrow, heading, subheading, body,
       image_url, cta_label, cta_href, cta_secondary_label, cta_secondary_href, sort_order,
       is_visible, config_json, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, datetime('now'))
      ON CONFLICT(tenant_id, page_route, section_key) DO NOTHING
    `).bind(
      section.id,
      TENANT_ID,
      HOME_ROUTE,
      section.section_key,
      section.section_type,
      section.eyebrow || "",
      section.heading || "",
      section.subheading || "",
      section.body || "",
      section.image_url || "",
      section.cta_label || "",
      section.cta_href || "",
      section.cta_secondary_label || "",
      section.cta_secondary_href || "",
      section.sort_order,
      cfgString(section.config_json)
    ).run();
  }

  for (const block of DEFAULT_HOME_BLOCKS) {
    await env.DB.prepare(`
      INSERT INTO cms_page_content_blocks
      (id, tenant_id, page_route, section_key, block_key, block_type, title, subtitle, body,
       image_url, alt_text, href, sort_order, is_visible, config_json, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, datetime('now'))
      ON CONFLICT(tenant_id, page_route, section_key, block_key) DO NOTHING
    `).bind(
      block.id,
      TENANT_ID,
      HOME_ROUTE,
      block.section_key,
      block.block_key,
      block.block_type,
      block.title || "",
      block.subtitle || "",
      block.body || "",
      block.image_url || "",
      block.alt_text || "",
      block.href || "",
      block.sort_order,
      cfgString(block.config_json || {})
    ).run();
  }
}

function blocksForSection(blocks, sectionKey) {
  return blocks.filter((b) => b.section_key === sectionKey);
}

export async function syncHomeSectionToR2(env, section, blocks) {
  const r2Key = fragmentKeyForSection(section.section_key);
  if (!r2Key) return { skipped: true, section_key: section.section_key };

  const html = renderHomeFragment(section, blocks);
  if (!html) return { skipped: true, section_key: section.section_key };

  await env.WEBSITE_ASSETS.put(r2Key, html, {
    httpMetadata: { contentType: "text/html; charset=utf-8" },
  });

  return { synced: true, section_key: section.section_key, r2_key: r2Key };
}

export async function syncAllHomeSectionsToR2(env, { ensure = true } = {}) {
  if (ensure) await ensureHomeSections(env);

  const { sections, blocks } = await loadHomePageData(env);
  const results = [];

  for (const sectionKey of HOME_SECTION_KEYS) {
    const section = sections.find((s) => s.section_key === sectionKey);
    if (!section) continue;
    const sectionBlocks = blocksForSection(blocks, sectionKey);
    results.push(await syncHomeSectionToR2(env, section, sectionBlocks));
  }

  return { synced: results.filter((r) => r.synced), sections: results };
}

export async function bustHomePageCache(env) {
  if (env.CMS_CACHE) {
    await env.CMS_CACHE.delete("page:/").catch(() => {});
  }
}

export async function syncAndPublishHome(env, jobId = null) {
  await syncAllHomeSectionsToR2(env);
  await bustHomePageCache(env);
  return publishHomeFromFragments(env, jobId);
}

export async function previewHomeFromCms(env) {
  await syncAllHomeSectionsToR2(env);
  const { assembleHomeFromFragments } = await import("./render_home_fragments.js");
  return assembleHomeFromFragments(env);
}

export function isHomeRoute(route) {
  return route === "" || route === "/";
}

export const PAGE_ROUTE = HOME_ROUTE;
export const SECTION_KEYS = HOME_SECTION_KEYS;

export async function ensurePageSections(env) { return ensureHomeSections(env); }
export async function upsertPageDefaults(env, force = false) {
  if (!force) return ensureHomeSections(env);
  for (const section of DEFAULT_HOME_SECTIONS) {
    await env.DB.prepare(`
      INSERT INTO cms_page_sections (id, tenant_id, page_route, section_key, section_type, eyebrow, heading, subheading, body, image_url, cta_label, cta_href, cta_secondary_label, cta_secondary_href, sort_order, is_visible, config_json, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, datetime('now'))
      ON CONFLICT(tenant_id, page_route, section_key) DO UPDATE SET section_type=excluded.section_type, eyebrow=excluded.eyebrow, heading=excluded.heading, subheading=excluded.subheading, body=excluded.body, image_url=excluded.image_url, cta_label=excluded.cta_label, cta_secondary_label=excluded.cta_secondary_label, sort_order=excluded.sort_order, config_json=excluded.config_json, updated_at=datetime('now')
    `).bind(section.id, TENANT_ID, HOME_ROUTE, section.section_key, section.section_type, section.eyebrow || "", section.heading || "", section.subheading || "", section.body || "", section.image_url || "", section.cta_label || "", section.cta_href || "", section.cta_secondary_label || "", section.cta_secondary_href || "", section.sort_order, cfgString(section.config_json)).run();
  }
  for (const block of DEFAULT_HOME_BLOCKS) {
    await env.DB.prepare(`
      INSERT INTO cms_page_content_blocks (id, tenant_id, page_route, section_key, block_key, block_type, title, subtitle, body, image_url, alt_text, href, sort_order, is_visible, config_json, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, datetime('now'))
      ON CONFLICT(tenant_id, page_route, section_key, block_key) DO UPDATE SET block_type=excluded.block_type, title=excluded.title, subtitle=excluded.subtitle, body=excluded.body, image_url=excluded.image_url, href=excluded.href, sort_order=excluded.sort_order, config_json=excluded.config_json, updated_at=datetime('now')
    `).bind(block.id, TENANT_ID, HOME_ROUTE, block.section_key, block.block_key, block.block_type, block.title || "", block.subtitle || "", block.body || "", block.image_url || "", block.alt_text || "", block.href || "", block.sort_order, cfgString(block.config_json || {})).run();
  }
}
export async function syncAllSectionsToR2(env, opts) { return syncAllHomeSectionsToR2(env, opts); }
export async function bustPageCache(env) { return bustHomePageCache(env); }
export async function syncAndPublishPage(env, jobId) { return syncAndPublishHome(env, jobId); }
export async function previewPageFromCms(env) { return previewHomeFromCms(env); }
export const DEFAULT_SECTIONS = DEFAULT_HOME_SECTIONS;
export const DEFAULT_BLOCKS = DEFAULT_HOME_BLOCKS;
