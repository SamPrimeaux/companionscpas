#!/usr/bin/env node
/** Rebuild cpas-shell.css from base + public surface + donate v2 partials. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const shellPath = path.join(root, "static/global/cpas-shell.css");
const surfacePath = path.join(root, "static/global/cpas-public-surface.css");
const donatePath = path.join(root, "static/global/cpas-donate-v2.css");
const heroWatercolorPath = path.join(root, "static/global/cpas-hero-watercolor.css");
const shelterPath = path.join(root, "static/global/cpas-shelter-hub.css");
const MARKER = "/* ── PUBLIC PAGE SURFACE";

const shell = fs.readFileSync(shellPath, "utf8");
const idx = shell.indexOf(MARKER);
if (idx < 0) {
  console.error("merge-cpas-css: marker not found in cpas-shell.css");
  process.exit(1);
}

const base = shell.slice(0, idx);
const surface = fs.readFileSync(surfacePath, "utf8");
const donate = fs.readFileSync(donatePath, "utf8");
const shelter = fs.readFileSync(shelterPath, "utf8");
const heroWatercolor = fs.readFileSync(heroWatercolorPath, "utf8");
const merged = `${base}${surface}\n\n/* ── HOME HERO WATERCOLOR ───────────────────────────────────── */\n${heroWatercolor}\n\n/* ── DONATE V2 (render_donate_v2.js) ──────────────────────── */\n${donate}\n\n/* ── SHELTER HUB (/adopt) ───────────────────────────────────── */\n${shelter}\n`;

fs.writeFileSync(shellPath, merged);
console.log(`merge-cpas-css: wrote ${merged.length} bytes → static/global/cpas-shell.css`);
