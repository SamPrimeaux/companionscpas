import test from "node:test";
import assert from "node:assert/strict";
import { routesAssets } from "../src/api/cms/routes_assets.js";

async function upload({ name = "freedom-ride.pdf", mime = "application/pdf", bytes = new Uint8Array([37,80,68,70]), failInsert = false } = {}) {
  const writes = [], deletes = [];
  const data = new FormData();
  data.append("file", new Blob([bytes], { type: mime }), name);
  data.append("r2_folder", "media/campaign");
  data.append("category", "campaign");
  data.append("usage_context", "campaign_cover");
  const request = new Request("https://companionsofcaddo.org/api/cms/asset/upload", { method: "POST", body: data });
  const env = {
    WEBSITE_ASSETS: {
      async put(key, bytes, opts) { writes.push({ key, size: bytes.byteLength, type: opts.httpMetadata.contentType }); },
      async delete(key) { deletes.push(key); },
    },
    DB: { prepare() { return { bind() { return { async run() {
      if (failInsert) throw Error("simulated D1 failure");
      return { success: true };
    } }; } }; } },
  };
  const response = await routesAssets(request, env, new URL(request.url), "/api/cms/asset/upload", "POST", { id: "test-operator" });
  return { response, data: await response.json(), writes, deletes };
}

test("PDF registers in D1 and is stored under campaign R2 folder", async () => {
  const r = await upload();
  assert.equal(r.response.status, 200);
  assert.equal(r.data.success, true);
  assert.equal(r.data.mime_type, "application/pdf");
  assert.equal(r.writes.length, 1);
  assert.ok(r.writes[0].key.startsWith("media/campaign/"));
  assert.equal(r.deletes.length, 0);
});

test("MP4 video uploads successfully", async () => {
  const r = await upload({ name: "ride.mp4", mime: "video/mp4" });
  assert.equal(r.data.success, true);
  assert.equal(r.data.asset_type, "video");
});

test("HTML files are rejected before storage", async () => {
  const r = await upload({ name: "unsafe.html", mime: "text/html" });
  assert.equal(r.response.status, 400);
  assert.equal(r.writes.length, 0);
});

test("files above 25 MB are rejected before storage", async () => {
  const r = await upload({ bytes: new Uint8Array(25 * 1024 * 1024 + 1) });
  assert.equal(r.response.status, 413);
  assert.match(r.data.error, /25 MB/);
  assert.equal(r.writes.length, 0);
});

test("D1 insert failures trigger R2 compensation", async () => {
  const r = await upload({ failInsert: true });
  assert.equal(r.response.status, 500);
  assert.equal(r.writes.length, 1);
  assert.deepEqual(r.deletes, [r.writes[0].key]);
});
