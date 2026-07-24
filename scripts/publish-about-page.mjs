#!/usr/bin/env node
/** Publish /about only — R2 get falls back to assets CDN for authoring HTML. */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { publishRoute } from "../src/api/cms_pipeline.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BUCKET = "companionscpas";
const KV = "0b410337a8494fc982ea04c5bde1eab4";
const CDN = "https://assets.companionsofcaddo.org";

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

class HybridR2 {
  constructor() {
    this.map = new Map();
  }
  async put(key, value) {
    const text = typeof value === "string" ? value : await new Response(value).text();
    this.map.set(key, text);
    return {};
  }
  async get(key) {
    if (this.map.has(key)) {
      const text = this.map.get(key);
      return { text: async () => text, body: text };
    }
    try {
      const res = await fetch(`${CDN}/${key}`);
      if (!res.ok) return null;
      const text = await res.text();
      this.map.set(key, text);
      return { text: async () => text, body: text };
    } catch {
      return null;
    }
  }
  async delete(key) {
    this.map.delete(key);
  }
}

class MemoryKV {
  constructor() {
    this.map = new Map();
  }
  async put(key, value) {
    this.map.set(key, value);
  }
  async delete(key) {
    this.map.delete(key);
  }
  async get(key) {
    return this.map.get(key) ?? null;
  }
}

const r2 = new HybridR2();
const kv = new MemoryKV();
const env = { DB: makeDbShim(), WEBSITE_ASSETS: r2, CMS_CACHE: kv };

console.log("Publishing /about…");
const published = await publishRoute(env, "/about");
const artifact = published.artifact_key;
const tmp = path.join(root, ".scratch/publish-about.html");
mkdirSync(path.dirname(tmp), { recursive: true });
writeFileSync(tmp, published.html);
wrangler(
  ["r2", "object", "put", `${BUCKET}/${artifact}`, "--file", tmp, "--content-type", "text/html; charset=utf-8", "--remote"],
  { inherit: true }
);
wrangler(["kv", "key", "put", "page:/about", "--namespace-id", KV, "--path", tmp, "--remote"], { inherit: true });

for (const [key, text] of r2.map.entries()) {
  if (key.includes("/about/") && key.endsWith(".html") && !key.endsWith("index.html")) {
    const fragTmp = path.join(root, `.scratch/${path.basename(key)}`);
    writeFileSync(fragTmp, text);
    wrangler(
      ["r2", "object", "put", `${BUCKET}/${key}`, "--file", fragTmp, "--content-type", "text/html; charset=utf-8", "--remote"],
      { inherit: true }
    );
  }
}

const hasForm = published.html.includes("data-form-key=\"join_our_team\"") || published.html.includes("cms-embedded-form");
const hasDisabledMock = published.html.includes("disabled>Submit") || /<input[^>]+disabled[^>]*>[\s\S]*Join Our Team/i.test(published.html);
console.log(`  → ${artifact} (${published.html.length} bytes)`);
console.log(`  embedded form present: ${hasForm}`);
console.log(`  disabled mock present: ${hasDisabledMock}`);
if (!hasForm) process.exit(1);
