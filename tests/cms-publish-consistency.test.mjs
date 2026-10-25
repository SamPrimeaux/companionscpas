import assert from "node:assert/strict";
import test from "node:test";
import { routesPublish } from "../src/api/cms/routes_publish.js";
import { publishPageRoute } from "../src/api/cms/shared.js";

function mockCmsDatabase(events) {
  const columns = [
    "id", "tenant_id", "route_path", "status", "created_at", "updated_at",
    "triggered_by", "artifact_path", "error", "error_message", "completed_at",
    "failed_at", "result_json",
  ];
  return {
    prepare(sql) {
      const trimmed = sql.trim();
      const entry = (...args) => ({
        async first() {
          if (trimmed.includes("sqlite_master")) return { name: "cms_publish_jobs" };
          return null;
        },
        async all() {
          if (trimmed.startsWith("PRAGMA table_info")) return { results: columns.map(name => ({ name })) };
          return { results: [] };
        },
        async run() {
          if (trimmed.startsWith("UPDATE cms_pages")) events.push({ type: "page.published", args });
          if (trimmed.startsWith("INSERT INTO cms_publish_jobs")) events.push({ type: "job.started", args });
          if (trimmed.startsWith("UPDATE cms_publish_jobs")) events.push({ type: "job.updated", args });
          return { success: true, meta: { changes: 1 } };
        },
        bind(...args) { return entry(...args); },
      });
      return entry();
    },
  };
}

test("publish-all returns a controlled error when D1 is missing instead of crashing on undefined PUBLIC_PAGE_ROUTES", async () => {
  const url = new URL("https://admin.companionsofcaddo.org/api/cms/publish-all");
  const request = new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
  const response = await routesPublish(request, {}, url, url.pathname, "POST", { email: "cms@example.test" });
  assert.equal(response.status, 500);
  assert.equal((await response.json()).error, "DB binding missing");
});

test("failed render leaves draft status unchanged and records a failed publish job", async () => {
  const events = [];
  const env = { DB: mockCmsDatabase(events) };
  const result = await publishPageRoute(env, "/about", "cms@example.test", async () => {
    events.push({ type: "artifact.failed" });
    throw new Error("R2 artifact write failed");
  });
  assert.equal(result.success, false);
  assert.match(result.error, /R2 artifact write failed/);
  assert.deepEqual(events.filter(e => e.type === "page.published"), []);
  assert.equal(events.filter(e => e.type === "job.updated").length, 1);
  assert.equal(events.find(e => e.type === "job.updated").args[0], "failed");
});

test("successful render produces its artifact before publishing D1 status and completes job", async () => {
  const events = [];
  const env = { DB: mockCmsDatabase(events) };
  const result = await publishPageRoute(env, "/about", "cms@example.test", async () => {
    events.push({ type: "artifact.written" });
    return { artifact_key: "static/pages/about/index.html" };
  });
  assert.equal(result.success, true);
  assert.equal(result.artifact_key, "static/pages/about/index.html");
  assert.deepEqual(events.map(e => e.type), [
    "job.started", "artifact.written", "page.published", "job.updated",
  ]);
  assert.equal(events.find(e => e.type === "job.updated").args[0], "done");
});

test("missing output artifact does not mark a page as published", async () => {
  const events = [];
  const result = await publishPageRoute(
    { DB: mockCmsDatabase(events) }, "/about", "cms@example.test",
    async () => ({}),
  );
  assert.equal(result.success, false);
  assert.match(result.error, /did not produce an artifact/);
  assert.equal(events.some(e => e.type === "page.published"), false);
});
