#!/usr/bin/env node
/** Upload merged cpas-shell.css + public shared.js to R2. */
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cssFile = path.join(root, "static/global/cpas-shell.css");
const jsFile = path.join(root, "public/_shared.js");
const BUCKET = "companionscpas";

function wrangler(args) {
  execFileSync("npx", ["wrangler", ...args], { stdio: "inherit" });
}

for (const key of ["static/global/cpas-shell.css", "static/global/shared.css"]) {
  console.log(`Uploading ${key}…`);
  wrangler([
    "r2", "object", "put", `${BUCKET}/${key}`,
    "--file", cssFile,
    "--content-type", "text/css; charset=utf-8",
    "--remote",
  ]);
}

console.log("Uploading static/global/shared.js…");
wrangler([
  "r2", "object", "put", `${BUCKET}/static/global/shared.js`,
  "--file", jsFile,
  "--content-type", "application/javascript; charset=utf-8",
  "--remote",
]);

const modalsFile = path.join(root, "static/global/cpas-modals.js");
console.log("Uploading static/global/cpas-modals.js…");
wrangler([
  "r2", "object", "put", `${BUCKET}/static/global/cpas-modals.js`,
  "--file", modalsFile,
  "--content-type", "application/javascript; charset=utf-8",
  "--remote",
]);

console.log("Global CSS + shared.js + cpas-modals.js publish complete.");
