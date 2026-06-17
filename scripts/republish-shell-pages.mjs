#!/usr/bin/env node
/** Republish home + about full HTML artifacts with current fragment assembler. */
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assembleHomeFromFragments } from "../src/api/render_home_fragments.js";
import { assembleAboutFromFragments } from "../src/api/render_about_fragments.js";
import { assembleGenericPageFromFragments } from "../src/api/render_generic_fragments.js";
import { getPageAssetBase } from "../src/api/render_page.js";

const BUCKET = "companionscpas";
const KV = "0b410337a8494fc982ea04c5bde1eab4";

function wrangler(args) {
  return execFileSync("npx", ["wrangler", ...args], { encoding: "utf8" });
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

function makeEnv(keys) {
  const cache = {};
  return {
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
      put: async () => {},
    },
    CMS_CACHE: {
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
const home = await assembleHomeFromFragments(env);
if (home) {
  upload("static/pages/index.html", home);
  bustKv("/");
}

const about = await assembleAboutFromFragments(env);
if (about) {
  upload("static/pages/about/index.html", about);
  bustKv("/about");
}

for (const route of ["/services", "/adopt", "/donate", "/community"]) {
  bustKv(route);
}

console.log("Republish complete.");
