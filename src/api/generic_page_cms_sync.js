import { renderSection } from "./render_section.js";
import {
  isDonateV2SectionType,
  renderDonateV2Section,
} from "./render_donate_v2.js";
import {
  isDynamicSectionType,
  renderCampaignTransportHero,
} from "./render_campaign_transport_hero.js";
import { getBrand, getPageAssetBase, sanitizePathSegment } from "./render_page.js";
import {
  assembleGenericPageFromFragments,
  publishGenericPageFromFragments,
} from "./render_generic_fragments.js";

const TENANT_ID = "tenant_companionscpas";

const PAGE_META = {
  "/services": { id: "page_services", slug: "services", title: "Services", sort_order: 40 },
  "/adopt": { id: "page_adopt", slug: "adopt", title: "Adopt", sort_order: 30 },
  "/donate": { id: "page_donate", slug: "donate", title: "Donate", sort_order: 50 },
  "/community": { id: "page_community", slug: "community", title: "Community", sort_order: 60 },
};

export const GENERIC_FRAGMENT_ROUTES = Object.keys(PAGE_META);

async function loadPageData(env, route) {
  const [sectionsRes, blocksRes] = await Promise.all([
    env.DB.prepare(
      "SELECT * FROM cms_page_sections WHERE tenant_id = ? AND page_route = ? ORDER BY sort_order, section_key"
    ).bind(TENANT_ID, route).all(),
    env.DB.prepare(
      "SELECT * FROM cms_page_content_blocks WHERE tenant_id = ? AND page_route = ? ORDER BY sort_order, section_key, block_key"
    ).bind(TENANT_ID, route).all(),
  ]);
  return { sections: sectionsRes.results || [], blocks: blocksRes.results || [] };
}

export function createGenericPageModule(route) {
  const PAGE_ROUTE = route;
  const meta = PAGE_META[route] || {
    id: `page_${route.replace(/\//g, "") || "home"}`,
    slug: route.replace(/^\//, "") || "home",
    title: route.replace(/^\//, "") || "Home",
    sort_order: 99,
  };

  async function ensurePageSections(env) {
    await env.DB.prepare(`
      INSERT INTO cms_pages (id, tenant_id, route_path, slug, title, status, sort_order, updated_at)
      VALUES (?, ?, ?, ?, ?, 'published', ?, datetime('now'))
      ON CONFLICT(tenant_id, route_path) DO NOTHING
    `).bind(meta.id, TENANT_ID, PAGE_ROUTE, meta.slug, meta.title, meta.sort_order).run().catch(() => {});
  }

  async function upsertPageDefaults(env, force = false) {
    await ensurePageSections(env);
    return { route: PAGE_ROUTE, ensured: true, force, note: "Sections live in D1; bootstrap syncs R2 from current D1 state." };
  }

  async function syncSectionToR2(env, section, blocks, brand) {
    const sectionKeyRaw = String(section?.section_key || "").trim();
    if (!sectionKeyRaw) return { skipped: true };
    const sectionKey = sanitizePathSegment(sectionKeyRaw, "section");
    const sectionType = String(section?.section_type || "").toLowerCase();
    let html = "";
    if (isDonateV2SectionType(sectionType)) {
      html = String(await renderDonateV2Section(section, blocks, brand, env) || "");
    } else if (isDynamicSectionType(sectionType) && sectionType === "campaign_transport_hero") {
      html = String(await renderCampaignTransportHero(section, blocks, brand, env) || "");
    } else {
      html = String(renderSection(section, blocks, brand, env) || "");
    }
    if (Number(section.is_visible) === 0) {
      html = "<!-- cms: section hidden -->";
    }
    const r2Key = `${getPageAssetBase(PAGE_ROUTE)}/${sectionKey}.html`;
    await env.WEBSITE_ASSETS.put(r2Key, html, {
      httpMetadata: { contentType: "text/html; charset=utf-8" },
    });
    return { synced: true, section_key: sectionKeyRaw, r2_key: r2Key };
  }

  async function syncAllSectionsToR2(env, { ensure = true } = {}) {
    if (ensure) await ensurePageSections(env);
    const brand = await getBrand(env);
    const { sections, blocks } = await loadPageData(env, PAGE_ROUTE);
    const results = [];
    for (const section of sections) {
      const sectionBlocks = blocks.filter((b) => b.section_key === section.section_key);
      results.push(await syncSectionToR2(env, section, sectionBlocks, brand));
    }
    return { synced: results.filter((r) => r.synced), sections: results };
  }

  async function bustPageCache(env) {
    if (env.CMS_CACHE) await env.CMS_CACHE.delete(`page:${PAGE_ROUTE}`).catch(() => {});
  }

  async function syncAndPublishPage(env, jobId = null) {
    await syncAllSectionsToR2(env);
    await bustPageCache(env);
    return publishGenericPageFromFragments(env, PAGE_ROUTE, jobId);
  }

  async function previewPageFromCms(env) {
    await syncAllSectionsToR2(env);
    return assembleGenericPageFromFragments(env, PAGE_ROUTE, {
      includeHidden: true,
      preview: true,
    });
  }

  return {
    PAGE_ROUTE,
    SECTION_KEYS: [],
    ensurePageSections,
    upsertPageDefaults,
    syncAllSectionsToR2,
    bustPageCache,
    syncAndPublishPage,
    previewPageFromCms,
  };
}

export const services = createGenericPageModule("/services");
export const adopt = createGenericPageModule("/adopt");
export const donate = createGenericPageModule("/donate");
export const community = createGenericPageModule("/community");
