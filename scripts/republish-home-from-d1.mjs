#!/usr/bin/env node
/** Sync home sections from remote D1 → R2 fragments → full page HTML + KV bust. */
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { syncAllHomeSectionsToR2 } from "../src/api/home_cms_sync.js";
import { publishHomeFromFragments } from "../src/api/render_home_fragments.js";

const BUCKET = "companionscpas";
const KV = "0b410337a8494fc982ea04c5bde1eab4";

function wrangler(args) {
  return execFileSync("npx", ["wrangler", ...args], { encoding: "utf8" });
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

function r2Put(key, body, contentType) {
  const tmp = mkdtempSync(join(tmpdir(), "cpas-up-"));
  const file = join(tmp, "obj");
  writeFileSync(file, body);
  wrangler([
    "r2", "object", "put", `${BUCKET}/${key}`,
    "--remote", "--file", file,
    "--content-type", contentType,
  ]);
  console.log(`Uploaded ${key} (${body.length} bytes)`);
}

const cache = {};
const env = {
  DB: makeDbShim(),
  WEBSITE_ASSETS: {
    get: async (key) => {
      if (cache[key] !== undefined) {
        const val = cache[key];
        return val ? { text: async () => val } : null;
      }
      const text = await r2Get(key);
      cache[key] = text;
      return text ? { text: async () => text } : null;
    },
    put: async (key, body, opts = {}) => {
      const ct = opts?.httpMetadata?.contentType || "text/html; charset=utf-8";
      r2Put(key, body, ct);
      cache[key] = body;
    },
  },
  CMS_CACHE: {
    put: async () => {},
    delete: async () => {},
  },
};

const sync = await syncAllHomeSectionsToR2(env, { ensure: false });
console.log("Synced sections:", sync.synced.map((s) => s.section_key).join(", ") || "(none)");

const published = await publishHomeFromFragments(env);
if (published?.html) {
  r2Put("static/pages/index.html", published.html, "text/html; charset=utf-8");
}

try {
  wrangler(["kv", "key", "delete", "page:/", "--namespace-id", KV, "--remote"]);
  console.log("Busted KV page:/");
} catch (e) {
  console.warn("KV bust failed:", e.message);
}

console.log("Home republish from D1 complete.");
