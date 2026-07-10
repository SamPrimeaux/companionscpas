#!/usr/bin/env node
/** Republish public CMS pages so header/footer + about mission land in R2/KV. */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { publishRoute } from "../src/api/cms_pipeline.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BUCKET = "companionscpas";
const KV = "0b410337a8494fc982ea04c5bde1eab4";
const ROUTES = ["/", "/about", "/adopt", "/community", "/contact", "/donate", "/services"];

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
  async put(key, value) {
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

for (const route of ROUTES) {
  console.log(`Publishing ${route}…`);
  const published = await publishRoute(env, route);
  const artifact = published.artifact_key;
  const tmp = path.join(root, `.scratch/publish-${route.replace(/\//g, "_") || "home"}.html`);
  mkdirSync(path.dirname(tmp), { recursive: true });
  writeFileSync(tmp, published.html);
  wrangler(["r2", "object", "put", `${BUCKET}/${artifact}`, "--file", tmp, "--content-type", "text/html; charset=utf-8", "--remote"], { inherit: true });
  wrangler(["kv", "key", "put", `page:${route}`, "--namespace-id", KV, "--path", tmp, "--remote"], { inherit: true });
  if (route === "/about") {
    const localAbout = path.join(root, "public/static/pages/about/index.html");
    mkdirSync(path.dirname(localAbout), { recursive: true });
    writeFileSync(localAbout, published.html);
    // Also upload mission fragment if present in memory map
    for (const [key, text] of r2.map.entries()) {
      if (key.includes("/about/") && key.endsWith(".html") && !key.endsWith("index.html")) {
        const fragTmp = path.join(root, `.scratch/${path.basename(key)}`);
        writeFileSync(fragTmp, text);
        wrangler(["r2", "object", "put", `${BUCKET}/${key}`, "--file", fragTmp, "--content-type", "text/html; charset=utf-8", "--remote"], { inherit: true });
      }
    }
  }
  console.log(`  → ${artifact} (${published.html.length} bytes)`);
}

console.log("Done.");
