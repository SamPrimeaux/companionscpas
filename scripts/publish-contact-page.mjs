#!/usr/bin/env node
/** Upload contact page HTML to R2 + seed KV cache. */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BUCKET = "companionscpas";
const KV = "0b410337a8494fc982ea04c5bde1eab4";
const CONTACT_FILE = path.join(root, "public/static/pages/contact/index.html");
const R2_KEY = "static/pages/contact/index.html";

function wrangler(args) {
  execFileSync("npx", ["wrangler", ...args], { stdio: "inherit" });
}

const html = readFileSync(CONTACT_FILE, "utf8");
const tmp = path.join(root, ".scratch/contact-upload.html");
import { mkdirSync, writeFileSync } from "node:fs";
mkdirSync(path.dirname(tmp), { recursive: true });
writeFileSync(tmp, html);

console.log(`Uploading contact page (${html.length} bytes)…`);
wrangler([
  "r2", "object", "put", `${BUCKET}/${R2_KEY}`,
  "--remote", "--file", tmp,
  "--content-type", "text/html; charset=utf-8",
]);

console.log("Seeding KV page:/contact …");
wrangler([
  "kv", "key", "put", "page:/contact",
  "--namespace-id", KV, "--remote",
  "--path", CONTACT_FILE,
]);

console.log("Contact page publish complete.");
