import test from "node:test";
import assert from "node:assert/strict";
import { routesAssets } from "../src/api/cms/routes_assets.js";

const BASE = "https://companionsofcaddo.org/api/cms/asset/multipart";
const TENANT = "tenant_companionscpas";
function makeEnv({ failInsert = false } = {}) {
  const rows = new Map();
  const sessions = new Map();
  const stored = new Map();
  let starts = 0, aborts = 0;
  return {
    state: { rows, sessions, stored, get starts() { return starts; }, get aborts() { return aborts; } },
    env: {
      DB: { prepare(sql) {
        return { bind(...params) {
          return {
            async first() {
              const a = rows.get(params[0]);
              return a?.tenant_id === params[1] && a?.status === "uploading" ? a : null;
            },
            async run() {
              if (sql.includes("INSERT INTO cms_assets")) {
                if (failInsert) throw Error("test insert fail");
                const [id, tenant_id, asset_key, label, filename, original_filename, mime_type,
                  size, r2_key, pub_url, cdn_url, public_url, created_by, metadata_json] = params;
                rows.set(id, { id, tenant_id, asset_key, label, filename, original_filename, mime_type,
                  size, r2_key, pub_url, cdn_url, public_url, created_by, metadata_json, status: "uploading" });
              } else if (sql.includes("UPDATE cms_assets")) {
                const id = sql.includes("status = 'active'") ? params[1] : params[0];
                const row = rows.get(id);
                if (row) row.status = sql.includes("status = 'active'") ? "active" : "archived";
              }
              return { success: true };
            },
          };
        } };
      } },
      WEBSITE_ASSETS: {
        async createMultipartUpload(key) {
          starts++;
          const uploadId = "mock-upload-" + starts;
          sessions.set(key, { uploadId, parts: new Map() });
          return { uploadId, async abort() { aborts++; sessions.delete(key); } };
        },
        resumeMultipartUpload(key, uploadId) {
          const session = sessions.get(key);
          if (!session || session.uploadId !== uploadId) throw Error("Unknown multipart session");
          return {
            async uploadPart(number, value) {
              session.parts.set(number, value.byteLength);
              return { partNumber: number, etag: "etag-" + number };
            },
            async complete(parts) {
              assert.deepEqual(parts.map(p => p.etag),
                parts.map((_, i) => "etag-" + (i + 1)));
              stored.set(key, [...session.parts.values()].reduce((a,b)=>a+b,0));
              sessions.delete(key);
            },
            async abort() { aborts++; sessions.delete(key); },
          };
        },
        async head(key) { return stored.has(key) ? { size: stored.get(key) } : null; },
        async delete(key) { stored.delete(key); },
      },
    },
  };
}
async function call(env, path, method, data, user = { id: "admin" }) {
  const url = BASE + path;
  const headers = data instanceof ArrayBuffer
    ? { "Content-Type": "application/octet-stream" }
    : { "Content-Type": "application/json" };
  const request = new Request(url, {
    method, headers, body: method === "GET" ? undefined : (data instanceof ArrayBuffer ? data : JSON.stringify(data || {})),
  });
  const response = await routesAssets(request, env, new URL(url), new URL(url).pathname, method, user);
  return { status: response.status, data: await response.json() };
}
test("reject unsupported large media and leave R2 untouched", async () => {
  const { env, state } = makeEnv();
  const r = await call(env, "/start", "POST", { filename:"bad.exe", mime_type:"application/x-msdownload",size:30000000 });
  assert.equal(r.status, 400);
  assert.equal(state.starts, 0);
});
test("large video end-to-end: start, upload chunks, finalize D1 asset", async () => {
  const { env, state } = makeEnv();
  const bytes = 25 * 1024 * 1024 + 1;
  const started = await call(env, "/start", "POST", { filename:"freedom-ride.mp4", mime_type:"video/mp4",size:bytes });
  assert.equal(started.status, 200);
  const id = started.data.id;
  const piece = started.data.part_size;
  assert.equal(piece, 8 * 1024 * 1024);
  const parts = [];
  for (let i=0; i<Math.ceil(bytes/piece); i++) {
    const chunk = new ArrayBuffer(Math.min(piece,bytes-i*piece));
    const res = await call(env, "/" + id + "/part?number=" + (i+1), "PUT", chunk);
    assert.equal(res.status, 200);
    parts.push({ partNumber:i+1,etag:res.data.etag });
  }
  const finished = await call(env,"/"+id+"/complete","POST",{parts});
  assert.equal(finished.status, 200);
  assert.equal(finished.data.asset_type,"video");
  assert.equal(state.rows.get(id).status,"active");
  assert.equal(state.stored.size,1);
});
test("part upload checks authenticated operator and byte length",async()=>{
  const {env}=makeEnv();
  const start=await call(env,"/start","POST",{filename:"ride.mov",mime_type:"video/quicktime",size:30*1024*1024});
  const id=start.data.id;
  const stolen=await call(env,"/"+id+"/part?number=1","PUT",new ArrayBuffer(8*1024*1024),{id:"different-user"});
  assert.equal(stolen.status,404);
  const short=await call(env,"/"+id+"/part?number=1","PUT",new ArrayBuffer(2));
  assert.equal(short.status,400);
});
test("abort archives an unfinished asset and cancels R2 session",async()=>{
  const {env,state}=makeEnv();
  const start=await call(env,"/start","POST",{filename:"ride.webm",mime_type:"video/webm",size:30*1024*1024});
  const r=await call(env,"/"+start.data.id+"/abort","POST",{});
  assert.equal(r.status,200);
  assert.equal(state.rows.get(start.data.id).status,"archived");
  assert.equal(state.aborts,1);
});
test("D1 upload-session insert failure aborts multipart",async()=>{
  const {env,state}=makeEnv({failInsert:true});
  const r=await call(env,"/start","POST",{filename:"ride.webm",mime_type:"video/webm",size:30*1024*1024});
  assert.equal(r.status,500);
  assert.equal(state.aborts,1);
  assert.equal(state.sessions.size,0);
});
test("unauthenticated upload session is rejected",async()=>{
  const {env,state}=makeEnv();
  const r=await call(env,"/start","POST",{filename:"ride.mp4",mime_type:"video/mp4",size:30*1024*1024},null);
  assert.equal(r.status,401);
  assert.equal(state.starts,0);
});
