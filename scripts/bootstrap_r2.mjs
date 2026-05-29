import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { renderSection } from "../src/api/render_section.js";
import { assembleFullPage } from "../src/api/render_page.js";

const TENANT_ID = "tenant_companionscpas";
const ROUTES = ["/about", "/adopt", "/services"];
const GLOBAL_HEADER_URL = "https://assets.meauxxx.com/static/global/header.html";
const GLOBAL_FOOTER_URL = "https://assets.meauxxx.com/static/global/footer.html";

function runWrangler(args) {
  try {
    return execFileSync("wrangler", args, { encoding: "utf8" });
  } catch (err) {
    const stderr = err?.stderr ? String(err.stderr) : "";
    const stdout = err?.stdout ? String(err.stdout) : "";
    const msg = [stderr.trim(), stdout.trim()].filter(Boolean).join("\n");
    throw new Error(`wrangler ${args.join(" ")} failed\n${msg}`);
  }
}

function d1Query(sql) {
  const out = runWrangler([
    "d1",
    "execute",
    "DB",
    "--remote",
    "--command",
    sql,
    "--json",
  ]);
  const parsed = JSON.parse(out);
  const first = Array.isArray(parsed) ? parsed[0] : null;
  return first?.results || [];
}

function jsonValue(value, fallback) {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return fallback;
  }
}

function buildBrand(row) {
  if (!row) return {};
  return {
    ...row,
    config: jsonValue(row.config_json, {}),
    navigation: jsonValue(row.navigation_json, []),
    footer: jsonValue(row.footer_json, {}),
    socials: jsonValue(row.socials_json, {}),
    organization: jsonValue(row.organization_json, {}),
    seoDefaults: jsonValue(row.seo_defaults_json, {}),
  };
}

function routeTmpFile(route) {
  const slug = route.replace(/^\//, "") || "home";
  return `/tmp/${slug}.html`;
}

function routeR2Key(route) {
  const normalized = route === "/" ? "" : route;
  return `static/pages${normalized}/index.html`;
}

function groupBlocksBySection(blocks) {
  const map = new Map();
  for (const block of blocks || []) {
    const key = String(block?.section_key || "");
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(block);
  }
  return map;
}

function buildAdoptAnimalBlocks(rows) {
  return (rows || []).map((row) => ({
    block_key: row?.id || "",
    block_type: "card",
    title: row?.name || "",
    body: row?.bio || "",
    image_url: row?.photo_url || "",
    alt_text: row?.name || "",
  }));
}

function applyGlobalSharedAssets(html) {
  const cssTag = `<link rel="stylesheet" href="https://assets.meauxxx.com/static/global/shared.css">`;
  const preloadJsTag = `<script src="https://assets.meauxxx.com/static/global/shared.js" defer></script>`;
  const scriptTag = `<script src="https://assets.meauxxx.com/static/global/shared.js"></script>`;

  let out = String(html || "");
  out = out.replace(
    '<link rel="stylesheet" href="/_shared.css">',
    `${cssTag}\n  ${preloadJsTag}`
  );
  out = out.replace("</body>", `  ${scriptTag}\n</body>`);
  return out;
}

async function fetchGlobalPartial(url, name) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${name}: ${res.status} ${res.statusText}`);
  return res.text();
}

async function renderRoute(route, brand, partials) {
  const pageRows = d1Query(
    `SELECT * FROM cms_pages WHERE tenant_id='${TENANT_ID}' AND route_path='${route}' LIMIT 1`
  );
  const page = pageRows[0];
  if (!page) throw new Error(`Page not found in D1 for route ${route}`);

  const sections = d1Query(
    `SELECT * FROM cms_page_sections
     WHERE tenant_id='${TENANT_ID}' AND page_route='${route}' AND is_visible=1
     ORDER BY sort_order`
  );
  const blocks = d1Query(
    `SELECT * FROM cms_page_content_blocks
     WHERE tenant_id='${TENANT_ID}' AND page_route='${route}'
     ORDER BY section_key, sort_order`
  );
  let adoptAnimalCount = 0;

  const blocksBySection = groupBlocksBySection(blocks);
  if (route === "/adopt") {
    const animalRows = d1Query(
      `SELECT id, name, breed, sex, age_label, photo_url, bio,
              weight_label, energy_level, foster_needed, featured, sort_order
       FROM animal_profiles
       WHERE tenant_id='tenant_companionscpas'
         AND public_visible=1 AND status IN ('available','foster')
       ORDER BY featured DESC, sort_order ASC`
    );
    const animalBlocks = buildAdoptAnimalBlocks(animalRows);
    blocksBySection.set("adoptable_dogs", animalBlocks);
    adoptAnimalCount = animalBlocks.length;
  }

  const sectionHtmls = sections.map((section) => {
    const sectionKey = String(section?.section_key || "");
    const sectionBlocks = blocksBySection.get(sectionKey) || [];
    return String(renderSection(section, sectionBlocks, brand, null));
  });

  if (!sectionHtmls.length) {
    sectionHtmls.push("<!-- no visible sections found -->");
  }

  return {
    html: applyGlobalSharedAssets(
      assembleFullPage(page, brand, partials.headerHtml, sectionHtmls, partials.footerHtml)
    ),
    adoptAnimalCount,
  };
}

async function uploadRouteHtml(route, html) {
  const file = routeTmpFile(route);
  const key = routeR2Key(route);
  await writeFile(file, html, "utf8");
  runWrangler([
    "r2",
    "object",
    "put",
    `companionscpas/${key}`,
    "--file",
    file,
    "--content-type",
    "text/html;charset=utf-8",
    "--remote",
  ]);
  return { route, key, file };
}

function deleteKvCacheKey(route) {
  const cacheKey = `page:${route}`;
  runWrangler([
    "kv",
    "key",
    "delete",
    cacheKey,
    "--binding=CMS_CACHE",
    "--remote",
  ]);
  return { key: cacheKey, success: true };
}

async function main() {
  const brandRows = d1Query(
    `SELECT * FROM cms_brand_settings WHERE tenant_id='${TENANT_ID}' ORDER BY updated_at DESC, id DESC LIMIT 1`
  );
  const brand = buildBrand(brandRows[0] || null);
  const [headerHtml, footerHtml] = await Promise.all([
    fetchGlobalPartial(GLOBAL_HEADER_URL, "header"),
    fetchGlobalPartial(GLOBAL_FOOTER_URL, "footer"),
  ]);
  const partials = { headerHtml, footerHtml };
  const uploaded = [];

  for (const route of ROUTES) {
    const { html, adoptAnimalCount } = await renderRoute(route, brand, partials);
    const result = await uploadRouteHtml(route, html);
    uploaded.push({
      ...result,
      bytes: Buffer.byteLength(html, "utf8"),
      adoptAnimalCount: route === "/adopt" ? adoptAnimalCount : undefined,
    });
  }

  const deletedKvKeys = ROUTES.map((route) => deleteKvCacheKey(route));

  console.log(JSON.stringify({ uploaded, deletedKvKeys }, null, 2));
}

main().catch((err) => {
  console.error("[bootstrap_r2] failed:", err?.message || err);
  process.exit(1);
});
