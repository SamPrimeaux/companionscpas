import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { renderSection } from "../src/api/render_section.js";
import { assembleFullPage, getGlobalPartial } from "../src/api/render_page.js";

const TENANT_ID = "tenant_companionscpas";
const ROUTES = ["/about", "/adopt", "/services"];

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

async function renderRoute(route, brand) {
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

  const blocksBySection = groupBlocksBySection(blocks);
  const sectionHtmls = sections.map((section) => {
    const sectionKey = String(section?.section_key || "");
    const sectionBlocks = blocksBySection.get(sectionKey) || [];
    return String(renderSection(section, sectionBlocks, brand, null));
  });

  if (!sectionHtmls.length) {
    sectionHtmls.push("<!-- no visible sections found -->");
  }

  const partialEnv = {};
  const headerHtml = await getGlobalPartial("header", brand, partialEnv);
  const footerHtml = await getGlobalPartial("footer", brand, partialEnv);
  return assembleFullPage(page, brand, headerHtml, sectionHtmls, footerHtml);
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

async function main() {
  const brandRows = d1Query(
    `SELECT * FROM cms_brand_settings WHERE tenant_id='${TENANT_ID}' ORDER BY updated_at DESC, id DESC LIMIT 1`
  );
  const brand = buildBrand(brandRows[0] || null);
  const uploaded = [];

  for (const route of ROUTES) {
    const html = await renderRoute(route, brand);
    const result = await uploadRouteHtml(route, html);
    uploaded.push(result);
  }

  console.log(JSON.stringify({ uploaded }, null, 2));
}

main().catch((err) => {
  console.error("[bootstrap_r2] failed:", err?.message || err);
  process.exit(1);
});
