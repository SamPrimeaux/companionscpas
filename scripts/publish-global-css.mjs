#!/usr/bin/env node
/** Upload merged cpas-shell.css to R2 (canonical + shared.css alias). */
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cssFile = path.join(root, "static/global/cpas-shell.css");
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

console.log("Global CSS publish complete.");
