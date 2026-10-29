/**
 * Installs GENERATED static frontend assets from the canonical AgentSam
 * ecommerce CMS package. Companions retains its backend and data.
 * Usage:
 *   node scripts/install-agent-form-studio.mjs --source /path/to/apps/ecommerce-cms-agentsam
 *   node scripts/install-agent-form-studio.mjs   (after npm package install)
 *
 * An installation fails if the selected package does not actually bundle the
 * Form Studio app. No network request or copy/paste source fork is permitted.
 */
import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile, rename } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ownRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const idx = args.indexOf("--source");
if (idx >= 0 && !args[idx + 1]) throw Error("--source requires an absolute package path");
const require = createRequire(import.meta.url);
const root = idx >= 0
  ? resolve(args[idx + 1])
  : dirname(require.resolve("@inneranimalmedia/ecommerce-cms-agentsam/manifest"));
const files = {
  "index.mjs": "frontend/form-studio/index.mjs",
  "styles.css": "frontend/form-studio/styles.css",
  "presets.json": "apps/form-studio/presets.json",
};
const [pkg, manifest] = await Promise.all([
  readFile(join(root, "package.json"), "utf8").then(JSON.parse),
  readFile(join(root, "agentsam.app.json"), "utf8").then(JSON.parse),
]);
if (pkg.name !== "@inneranimalmedia/ecommerce-cms-agentsam" ||
    !manifest.apps?.bundled?.includes("form-studio")) {
  throw Error("Installed Ecommerce CMS package does not include canonical Form Studio app");
}
const dest = join(ownRoot, "public/dashboard/apps/form-studio");
await mkdir(dest, { recursive: true });
const hashes = {};
for (const [file, relative] of Object.entries(files)) {
  const content = await readFile(join(root, relative));
  const target = join(dest, file);
  const temp = target + ".tmp";
  await writeFile(temp, content);
  await rename(temp, target);
  hashes[file] = createHash("sha256").update(content).digest("hex");
}
const proof = {
  schema: "agentsam.installed-app.v1",
  id: "form-studio",
  package: pkg.name,
  package_version: pkg.version,
  files: hashes,
};
await writeFile(join(dest, "installation.json"), JSON.stringify(proof, null, 2) + "\n");
console.log("Installed "+pkg.name+"@"+pkg.version+" Form Studio assets from " + root);
console.log("Source hash: " + hashes["index.mjs"]);
