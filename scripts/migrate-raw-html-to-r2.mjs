#!/usr/bin/env node
/**
 * Migrate raw_html paste blobs out of D1 config_json.html → R2 authoring keys.
 * Usage: node scripts/migrate-raw-html-to-r2.mjs
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BUCKET = "companionscpas";
const CDN = "https://assets.companionsofcaddo.org";
const DB = "companionscpas";

function wranglerJson(args) {
  const out = execFileSync("npx", ["wrangler", ...args], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  const start = out.indexOf("[");
  const startObj = out.indexOf("{");
  const i = start >= 0 && (startObj < 0 || start < startObj) ? start : startObj;
  if (i < 0) throw new Error(`No JSON in wrangler output:\n${out.slice(0, 500)}`);
  return JSON.parse(out.slice(i));
}

function sanitizeSeg(value, fallback = "section") {
  const s = String(value || "")
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return s || fallback;
}

function authoringKey(pageRoute, sectionKey) {
  const route = String(pageRoute || "/").trim() || "/";
  const routeSeg = route === "/" ? "home" : sanitizeSeg(route.replace(/^\//, ""), "page");
  const keySeg = sanitizeSeg(sectionKey, "raw_html");
  return `static/cms/raw-html/${routeSeg}/${keySeg}.html`;
}

function sqlEscape(s) {
  return String(s).replace(/'/g, "''");
}

const list = wranglerJson([
  "d1",
  "execute",
  DB,
  "--remote",
  "--json",
  "--command",
  `SELECT id, page_route, section_key, config_json,
          length(coalesce(json_extract(config_json,'$.html'),'')) as html_len
   FROM cms_page_sections
   WHERE section_type = 'raw_html'
     AND length(coalesce(json_extract(config_json,'$.html'),'')) > 0`,
]);

const rows = list?.[0]?.results || list?.results || [];
if (!rows.length) {
  console.log("No paste blobs found — nothing to migrate.");
  process.exit(0);
}

console.log(`Migrating ${rows.length} raw_html row(s)…`);
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cpas-raw-html-"));

for (const row of rows) {
  let cfg = {};
  try {
    cfg = JSON.parse(row.config_json || "{}");
  } catch {
    cfg = {};
  }
  const html = String(cfg.html || cfg.inline_html || "");
  if (!html) {
    console.log(`skip ${row.id} — empty html after parse`);
    continue;
  }
  const r2Key = authoringKey(row.page_route, row.section_key);
  const file = path.join(tmpDir, `${row.section_key}.html`);
  fs.writeFileSync(file, html, "utf8");
  console.log(`PUT ${BUCKET}/${r2Key} (${html.length} chars)…`);
  execFileSync(
    "npx",
    [
      "wrangler",
      "r2",
      "object",
      "put",
      `${BUCKET}/${r2Key}`,
      "--file",
      file,
      "--content-type",
      "text/html; charset=utf-8",
      "--remote",
    ],
    { cwd: root, stdio: "inherit" }
  );

  const lean = {
    html_source: "r2",
    r2_key: r2Key,
    cdn_url: `${CDN}/${r2Key}`,
  };
  const updateSql = `UPDATE cms_page_sections SET config_json = '${sqlEscape(JSON.stringify(lean))}', updated_at = datetime('now') WHERE id = '${sqlEscape(row.id)}'`;
  console.log(`D1 UPDATE ${row.id} (${row.page_route} / ${row.section_key})…`);
  execFileSync(
    "npx",
    ["wrangler", "d1", "execute", DB, "--remote", "--command", updateSql],
    { cwd: root, stdio: "inherit" }
  );
}

fs.rmSync(tmpDir, { recursive: true, force: true });

const verify = wranglerJson([
  "d1",
  "execute",
  DB,
  "--remote",
  "--json",
  "--command",
  `SELECT id, page_route, section_key,
          length(coalesce(json_extract(config_json,'$.html'),'')) as html_len,
          json_extract(config_json,'$.html_source') as html_source,
          json_extract(config_json,'$.r2_key') as r2_key
   FROM cms_page_sections
   WHERE section_type = 'raw_html'
     AND (deleted_at IS NULL OR deleted_at = '')
   ORDER BY page_route, section_key`,
]);
console.log("Verify:", JSON.stringify(verify?.[0]?.results || verify?.results || verify, null, 2));
console.log("Done.");
