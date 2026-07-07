#!/usr/bin/env node
/** Render contact page with global shell → upload R2 + seed KV cache. */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assembleContactPage } from "../src/api/render_contact_page.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BUCKET = "companionscpas";
const KV = "0b410337a8494fc982ea04c5bde1eab4";
const R2_KEY = "static/pages/contact/index.html";
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

const env = { DB: makeDbShim() };
const html = await assembleContactPage(env);

mkdirSync(path.dirname(OUT_FILE), { recursive: true });
writeFileSync(OUT_FILE, html);

const tmp = path.join(root, ".scratch/contact-upload.html");
mkdirSync(path.dirname(tmp), { recursive: true });
writeFileSync(tmp, html);

console.log(`Uploading contact page (${html.length} bytes)…`);
wrangler([
  "r2", "object", "put", `${BUCKET}/${R2_KEY}`,
  "--remote", "--file", tmp,
  "--content-type", "text/html; charset=utf-8",
], { inherit: true });

console.log("Seeding KV page:/contact …");
wrangler([
  "kv", "key", "put", "page:/contact",
  "--namespace-id", KV, "--remote",
  "--path", OUT_FILE,
], { inherit: true });

console.log("Contact page publish complete.");
