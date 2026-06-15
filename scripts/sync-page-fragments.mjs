#!/usr/bin/env node
/**
 * Sync D1 page sections → R2 fragments for generic CMS routes.
 * Usage: node scripts/sync-page-fragments.mjs [/services] [/adopt] ...
 */
import { execFileSync } from "node:child_process";
import { renderSection } from "../src/api/render_section.js";
import { getPageAssetBase, sanitizePathSegment } from "../src/api/render_page.js";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const TENANT_ID = "tenant_companionscpas";
const BUCKET = "companionscpas";
const DEFAULT_ROUTES = ["/services", "/adopt", "/donate", "/community"];

function wrangler(args) {
  return execFileSync("npx", ["wrangler", ...args], { encoding: "utf8" });
}

function d1Query(sql) {
  const out = wrangler(["d1", "execute", "DB", "--remote", "--command", sql, "--json"]);
  const parsed = JSON.parse(out);
  return parsed[0]?.results || [];
}

function buildBrand(row) {
  if (!row) return {};
  const parse = (v, fb = {}) => {
    if (!v) return fb;
    try { return JSON.parse(v); } catch { return fb; }
  };
  return {
    ...row,
    config: parse(row.config_json),
    navigation: parse(row.navigation_json, []),
    footer: parse(row.footer_json),
    socials: parse(row.socials_json),
    organization: parse(row.organization_json),
    seoDefaults: parse(row.seo_defaults_json),
  };
}

function uploadR2(key, filePath, contentType) {
  wrangler([
    "r2", "object", "put", `${BUCKET}/${key}`,
    "--remote", "--file", filePath,
    "--content-type", contentType,
  ]);
}

async function syncRoute(route) {
  const sections = d1Query(
    `SELECT * FROM cms_page_sections WHERE tenant_id='${TENANT_ID}' AND page_route='${route}' ORDER BY sort_order, section_key`
  );
  const blocks = d1Query(
    `SELECT * FROM cms_page_content_blocks WHERE tenant_id='${TENANT_ID}' AND page_route='${route}' ORDER BY sort_order, section_key, block_key`
  );
  const brandRow = d1Query(
    `SELECT * FROM cms_brand_settings WHERE tenant_id='${TENANT_ID}' ORDER BY updated_at DESC LIMIT 1`
  )[0];
  const brand = buildBrand(brandRow);
  const base = getPageAssetBase(route);
  const tmp = mkdtempSync(join(tmpdir(), "cpas-sync-"));

  console.log(`\n${route}: ${sections.length} sections`);
  for (const section of sections) {
    const key = String(section.section_key || "").trim();
    const fileKey = sanitizePathSegment(key);
    const sectionBlocks = blocks.filter((b) => b.section_key === key);
    const html = String(renderSection(section, sectionBlocks, brand, {}) || "");
    const localPath = join(tmp, `${fileKey}.html`);
    writeFileSync(localPath, html);
    const r2Key = `${base}/${fileKey}.html`;
    uploadR2(r2Key, localPath, "text/html; charset=utf-8");
    console.log(`  → ${r2Key} (${html.length} bytes)`);
  }

  try {
    wrangler(["kv", "key", "delete", `page:${route}`, "--namespace-id", "0b410337a8494fc982ea04c5bde1eab4", "--remote"]);
  } catch {}
}

const routes = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_ROUTES;
for (const route of routes) {
  await syncRoute(route.startsWith("/") ? route : `/${route}`);
}
console.log("\nDone. Fragment sync complete — next request assembles from R2.");
