#!/usr/bin/env node
/** Re-sync home/about section fragments from D1 renderers, then republish all public pages. */
import { execFileSync } from "node:child_process";
import { syncAllSectionsToR2 as syncHome } from "../src/api/home_cms_sync.js";
import { syncAllSectionsToR2 as syncAbout } from "../src/api/about_cms_sync.js";

const BUCKET = "companionscpas";
const KV = "0b410337a8494fc982ea04c5bde1eab4";

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
  const { mkdtempSync, readFileSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const tmp = mkdtempSync(join(tmpdir(), "cpas-r2-"));
  const file = join(tmp, "obj");
  try {
    wrangler(["r2", "object", "get", `${BUCKET}/${key}`, "--remote", "--file", file]);
    return readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function makeEnv() {
  const cache = {};
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
            run: async () => ({ success: true }),
          }),
        };
      },
    },
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
      put: async (key, html) => {
        const { writeFileSync, mkdtempSync } = await import("node:fs");
        const { tmpdir } = await import("node:os");
        const { join } = await import("node:path");
        const tmp = mkdtempSync(join(tmpdir(), "cpas-up-"));
        const file = join(tmp, "frag.html");
        writeFileSync(file, html);
        wrangler([
          "r2", "object", "put", `${BUCKET}/${key}`,
          "--remote", "--file", file,
          "--content-type", "text/html; charset=utf-8",
        ]);
        cache[key] = html;
        console.log(`  synced fragment ${key}`);
      },
    },
    CMS_CACHE: {
      get: async () => null,
      put: async () => {},
      delete: async () => {},
    },
  };
}

console.log("Syncing home sections from D1 → R2…");
const env = makeEnv();
await syncHome(env, { ensure: false });
console.log("Syncing about sections from D1 → R2…");
await syncAbout(env, { ensure: false });
console.log("Running republish-shell-pages.mjs…");
execFileSync("node", ["scripts/republish-shell-pages.mjs"], { stdio: "inherit" });
console.log("Running publish-generic-page.mjs…");
execFileSync("node", ["scripts/publish-generic-page.mjs"], { stdio: "inherit" });

console.log("\nSeeding contact page KV…");
wrangler([
  "kv", "key", "put", "page:/contact",
  "--namespace-id", KV, "--remote",
  "--path", "public/static/pages/contact/index.html",
]);

console.log("Salvage resync complete.");
