import test from "node:test";
import assert from "node:assert/strict";
import { saveCampaignRecord } from "../src/api/dashboard/shared.js";
function mockDb() {
  const calls=[];
  const env={DB:{prepare(sql){return {bind(...args){return {async run(){calls.push({sql,args});return {success:true};}};}};}}};
  return {env,calls};
}
test("omitted goal, dates and cover do not overwrite prior campaign data",async()=>{
  const {env,calls}=mockDb();
  await saveCampaignRecord(env,{title:"Freedom Ride",is_public:0,config_json:{attachments:[]}},"campaign_existing");
  assert.equal(calls.length,1);
  assert.match(calls[0].sql,/goal_amount_cents = COALESCE/);
  assert.match(calls[0].sql,/starts_at = CASE WHEN/);
  assert.match(calls[0].sql,/cover_asset_id = CASE WHEN/);
  assert.equal(calls[0].args[4],null);
  assert.equal(calls[0].args[6],0);
  assert.equal(calls[0].args[8],0);
  assert.equal(calls[0].args[12],0);
});
test("explicit goal, event dates and cover persist",async()=>{
  const {env,calls}=mockDb();
  await saveCampaignRecord(env,{title:"Freedom Ride",is_public:0,goal_amount_cents:250000,starts_at:"2026-11-07",ends_at:"2026-11-07",cover_asset_id:"asset_ride",config_json:{attachments:[{asset_id:"asset_ride"}]}},"campaign_existing");
  assert.ok(calls[0].args.includes(250000));
  assert.ok(calls[0].args.includes("2026-11-07"));
  assert.ok(calls[0].args.includes("asset_ride"));
});
test("creating campaign persists attachment configuration without fallback",async()=>{
  const {env,calls}=mockDb();
  await saveCampaignRecord(env,{title:"Freedom Ride",is_public:0,config_json:{attachments:[{url:"https://example.org/ride.pdf"}]}});
  assert.equal(calls.length,1);
  assert.ok(calls[0].args.some(a=>String(a).includes("ride.pdf")));
});
