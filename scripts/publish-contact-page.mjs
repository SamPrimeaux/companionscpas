#!/usr/bin/env node
/** Publish /contact via unified CMS pipeline → R2 section fragments + index + KV. */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { publishRoute, syncRouteSectionsToR2, fragmentR2Key } from "../src/api/cms_pipeline.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BUCKET = "companionscpas";
const KV = "0b410337a8494fc982ea04c5bde1eab4";
const OUT_FILE = path.join(root, "public/static/pages/contact/index.html");

function wrangler(args, { inherit = false } = {}) {
  return execFileSync("npx", ["wrangler", ...args], {
    stdio: inherit ? "inherit" : "pipe",
    encoding: inherit ? undefined : "utf8",
  });
}

function makeDbShim() {
  const run = (sql, params = []) => {
    let i = 0;
    const command = sql.replace(/\?/g, () => {
      const v = params[i++];
      if (v === null || v === undefined) return "NULL";
      return `'${String(v).replace(/'/g, "''")}'`;
    });
    try {
      const raw = wrangler(["d1", "execute", "companionscpas", "--remote", "--command", command, "--json"]);
      const parsed = JSON.parse(raw);
      const results = parsed?.[0]?.results ?? parsed?.results ?? [];
      return Array.isArray(results) ? results : [];
    } catch {
      return [];
    }
  };
  return {
    prepare(sql) {
      return {
        bind(...params) {
          return {
            first: async () => run(sql, params)[0] ?? null,
            all: async () => ({ results: run(sql, params) }),
            run: async () => ({ success: true }),
          };
        },
      };
    },
  };
}

class MemoryR2 {
  constructor() { this.map = new Map(); }
  async put(key, value, _opts) {
    const text = typeof value === "string" ? value : await new Response(value).text();
    this.map.set(key, text);
    return {};
  }
  async get(key) {
    if (!this.map.has(key)) return null;
    const text = this.map.get(key);
    return { text: async () => text, body: text };
  }
}

class MemoryKV {
  constructor() { this.map = new Map(); }
  async put(key, value) { this.map.set(key, value); }
  async delete(key) { this.map.delete(key); }
  async get(key) { return this.map.get(key) ?? null; }
}

const r2 = new MemoryR2();
const kv = new MemoryKV();
const env = { DB: makeDbShim(), WEBSITE_ASSETS: r2, CMS_CACHE: kv };

console.log("Syncing /contact section fragments…");
const sync = await syncRouteSectionsToR2(env, "/contact");
console.log(JSON.stringify(sync.sections, null, 2));

console.log("Publishing /contact…");
const published = await publishRoute(env, "/contact");
mkdirSync(path.dirname(OUT_FILE), { recursive: true });
writeFileSync(OUT_FILE, published.html);

const tmp = path.join(root, ".scratch/contact-upload.html");
mkdirSync(path.dirname(tmp), { recursive: true });
writeFileSync(tmp, published.html);

// Upload each fragment
for (const row of sync.sections) {
  if (!row.r2_key || !r2.map.has(row.r2_key)) continue;
  const fragTmp = path.join(root, ".scratch", row.r2_key.replace(/\//g, "__"));
  writeFileSync(fragTmp, r2.map.get(row.r2_key));
  console.log(`Uploading ${row.r2_key}…`);
  wrangler([
    "r2", "object", "put", `${BUCKET}/${row.r2_key}`,
    "--remote", "--file", fragTmp,
    "--content-type", "text/html; charset=utf-8",
  ], { inherit: true });
}

console.log(`Uploading contact index (${published.html.length} bytes)…`);
wrangler([
  "r2", "object", "put", `${BUCKET}/static/pages/contact/index.html`,
  "--remote", "--file", tmp,
  "--content-type", "text/html; charset=utf-8",
], { inherit: true });

console.log("Seeding KV page:/contact …");
wrangler([
  "kv", "key", "put", "page:/contact",
  "--namespace-id", KV, "--remote",
  "--path", OUT_FILE,
], { inherit: true });

console.log("Contact page publish complete.", {
  artifact: published.artifact_key,
  fragments: sync.sections.map((s) => s.r2_key).filter(Boolean),
});
