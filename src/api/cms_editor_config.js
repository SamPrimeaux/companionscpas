/**
 * D1-backed CMS editor config (tenant catalog).
 * Pages/sections/blocks are already dynamic; this is the leftover JS-constant layer.
 */

const TENANT_ID = "tenant_companionscpas";

const CHROME_SECTION_TYPES = new Set(["nav", "footer"]);

export function cdnBaseFromBrand(brand, env = {}) {
  const raw = String(brand?.site_domain || env.APP_DOMAIN || "").trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");
  if (raw) return `https://assets.${raw}`;
  return "https://assets.companionsofcaddo.org";
}

function slugFromRoute(route) {
  const r = String(route || "").trim();
  if (!r || r === "/") return "home";
  return r.replace(/^\//, "").replace(/\//g, "_") || "home";
}

export function buildCtaActions(pages = [], modals = []) {
  const actions = [];
  const seen = new Set();

  for (const modal of modals) {
    const key = String(modal.modal_key || modal.id || "").trim();
    if (!key) continue;
    const href = String(modal.cta_href || "").trim() || `modal:${key}`;
    const id = `modal_${key}`;
    if (seen.has(id)) continue;
    seen.add(id);
    actions.push({
      id,
      label: String(modal.title || key).trim() || key,
      href,
    });
  }

  for (const page of pages) {
    const href = String(page.route_path || "").trim();
    if (!href) continue;
    const id = `page_${slugFromRoute(href)}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const label = String(page.nav_label || page.title || href).trim();
    actions.push({
      id,
      label: href === "/" ? `Go to ${label}` : `Go to ${label}`,
      href,
    });
  }

  actions.push({ id: "custom", label: "Custom URL…", href: null });
  return actions;
}

function parseSchemaJson(raw) {
  if (raw && typeof raw === "object") return raw;
  try {
    const parsed = JSON.parse(String(raw || "{}"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function mapSchemaRowToTemplate(row) {
  const schema = parseSchemaJson(row.schema_json);
  return {
    type: row.section_type,
    label: row.label || String(row.section_type || "").replace(/_/g, " "),
    desc: row.description || "",
    description: row.description || "",
    kind: "section",
    category: row.category || "content",
    schema,
    default_json: parseSchemaJson(row.default_json),
    preview_url: `/api/cms/section/preview?type=${encodeURIComponent(row.section_type)}`,
  };
}

export async function loadEditorCatalog(env) {
  const [pages, brand, nav, themes, assets, schemas, modals, components] = await Promise.all([
    env.DB.prepare("SELECT * FROM cms_pages WHERE tenant_id = ? ORDER BY sort_order, route_path").bind(TENANT_ID).all().catch(() => ({ results: [] })),
    env.DB.prepare("SELECT * FROM cms_brand_settings WHERE tenant_id = ? LIMIT 1").bind(TENANT_ID).first().catch(() => null),
    env.DB.prepare("SELECT * FROM cms_navigation_items WHERE tenant_id = ? ORDER BY sort_order, label").bind(TENANT_ID).all().catch(() => ({ results: [] })),
    env.DB.prepare("SELECT * FROM cms_themes WHERE tenant_id = ? ORDER BY is_active DESC, updated_at DESC LIMIT 20").bind(TENANT_ID).all().catch(() => ({ results: [] })),
    env.DB.prepare("SELECT * FROM cms_assets WHERE tenant_id = ? AND status != 'archived' ORDER BY updated_at DESC, created_at DESC LIMIT 200").bind(TENANT_ID).all().catch(() => ({ results: [] })),
    env.DB.prepare(`
      SELECT * FROM cms_section_schemas
      WHERE tenant_id = ? AND is_active = 1
        AND section_type NOT IN ('nav', 'footer')
      ORDER BY sort_order, label
    `).bind(TENANT_ID).all().catch(() => ({ results: [] })),
    env.DB.prepare("SELECT * FROM cms_modals WHERE tenant_id = ? AND is_active = 1 ORDER BY modal_key").bind(TENANT_ID).all().catch(() => ({ results: [] })),
    env.DB.prepare("SELECT * FROM cms_components WHERE active = 1 ORDER BY sort_order, label").all().catch(() => ({ results: [] })),
  ]);

  const pageRows = pages.results || [];
  const schemaRows = (schemas.results || []).filter((row) => !CHROME_SECTION_TYPES.has(row.section_type));
  const modalRows = modals.results || [];

  return {
    tenant_id: TENANT_ID,
    pages: pageRows,
    assets: assets.results || [],
    brand,
    nav: nav.results || [],
    themes: themes.results || [],
    schemas: schemaRows,
    templates: schemaRows.map(mapSchemaRowToTemplate),
    modals: modalRows,
    components: components.results || [],
    cdn_base: cdnBaseFromBrand(brand, env),
    cta_actions: buildCtaActions(pageRows, modalRows),
    chrome: {
      trust_badges: (components.results || []).filter((row) => row.type === "trust_badge"),
    },
  };
}

export { TENANT_ID, CHROME_SECTION_TYPES };
