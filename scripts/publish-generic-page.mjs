#!/usr/bin/env node
/**
 * Assemble + upload full HTML for generic CMS routes (/community, /services, …).
 * Usage: node scripts/publish-generic-page.mjs [/community] [/services]
 */
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assembleGenericPageFromFragments } from "../src/api/render_generic_fragments.js";
import { getPageAssetBase } from "../src/api/render_page.js";

const TENANT_ID = "tenant_companionscpas";
const BUCKET = "companionscpas";
const KV = "0b410337a8494fc982ea04c5bde1eab4";
const DEFAULT_ROUTES = ["/services", "/adopt", "/donate", "/community"];

function wrangler(args) {
  return execFileSync("npx", ["wrangler", ...args], { encoding: "utf8" });
}

function d1Query(sql) {
  const out = wrangler(["d1", "execute", "DB", "--remote", "--command", sql, "--json"]);
  return JSON.parse(out)[0]?.results || [];
}

function d1First(sql) {
  return d1Query(sql)[0] || null;
}

async function r2Get(key) {
  const tmp = mkdtempSync(join(tmpdir(), "cpas-r2-"));
  const file = join(tmp, "obj");
  try {
    wrangler(["r2", "object", "get", `${BUCKET}/${key}`, "--remote", "--file", file]);
    const { readFileSync } = await import("node:fs");
    return readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function makeEnv() {
  const r2Cache = {};
  return {
    DB: {
      prepare: (sql) => {
        const run = (binds = []) => {
          let q = sql;
          for (const b of binds) {
            const val = b === null || b === undefined ? "NULL" : `'${String(b).replace(/'/g, "''")}'`;
            q = q.replace("?", val);
          }
          return q;
        };
        return {
          bind: (...binds) => ({
            first: async () => d1First(run(binds)),
            all: async () => ({ results: d1Query(run(binds)) }),
          }),
        };
      },
    },
    WEBSITE_ASSETS: {
      get: async (key) => {
        if (r2Cache[key] !== undefined) {
          const val = r2Cache[key];
          return val ? { text: async () => val } : null;
        }
        const text = await r2Get(key);
        r2Cache[key] = text;
        return text ? { text: async () => text } : null;
      },
      put: async () => {},
    },
    CMS_CACHE: {
      get: async () => null,
      put: async () => {},
      delete: async () => {},
    },
  };
}

function upload(key, html) {
  const tmp = mkdtempSync(join(tmpdir(), "cpas-up-"));
  const file = join(tmp, "page.html");
  writeFileSync(file, html);
  wrangler([
    "r2", "object", "put", `${BUCKET}/${key}`,
    "--remote", "--file", file,
    "--content-type", "text/html; charset=utf-8",
  ]);
  console.log(`Uploaded ${key} (${html.length} bytes)`);
}

function bustKv(route) {
  try {
    wrangler(["kv", "key", "delete", `page:${route}`, "--namespace-id", KV, "--remote"]);
    console.log(`Busted KV page:${route}`);
  } catch (e) {
    console.warn(`KV bust failed for ${route}:`, e.message);
  }
}

const env = makeEnv();
const routes = process.argv.slice(2).length
  ? process.argv.slice(2).map((r) => (r.startsWith("/") ? r : `/${r}`))
  : DEFAULT_ROUTES;

for (const route of routes) {
  console.log(`\nPublishing ${route}…`);
  const html = await assembleGenericPageFromFragments(env, route);
  if (!html) {
    console.error(`  ✗ assembly failed for ${route}`);
    continue;
  }
  if (!html.includes("/static/global/shared.css")) {
    console.error(`  ✗ missing shared.css in assembled HTML for ${route}`);
    process.exitCode = 1;
    continue;
  }
  const artifactKey = `${getPageAssetBase(route)}/index.html`;
  upload(artifactKey, html);
  bustKv(route);
  console.log(`  ✓ ${route} published`);
}

console.log("\nGeneric page publish complete.");
