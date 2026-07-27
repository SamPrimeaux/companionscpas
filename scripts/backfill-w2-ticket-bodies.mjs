#!/usr/bin/env node
/**
 * Backfill week-2 + collab ticket titles/descriptions for Collaborate Tasks UI.
 * Client-facing wording only (no "Swarm"). Source: docs/plans/CPAS-WEEK2-LORI-BRIEF-2026-07.md
 *
 * Usage:
 *   node scripts/backfill-w2-ticket-bodies.mjs              # CPAS remote
 *   node scripts/backfill-w2-ticket-bodies.mjs --iam        # IAM business D1
 *   node scripts/backfill-w2-ticket-bodies.mjs --both
 */
import { spawnSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const now = Math.floor(Date.now() / 1000);

const FOSTER_FORWARD_COPY = `Title: Creating Pathways to Safety Through Foster Care and Rescue Partnerships

The Foster Forward Program helps dogs and cats at Caddo Parish Animal Services find a second chance by connecting them with dedicated foster families and trusted rescue partners.

Through this program, animals are placed in foster homes where they receive individualized care, attention, and socialization while preparing for their next chapter. Foster families provide a safe and supportive environment where animals can decompress, build confidence, and show their true personalities outside of the shelter setting.

Animals supported through Foster Forward who are matched with rescue partners continue their journey through life-saving partnerships. Each month, a transport van helps move fostered animals from Shreveport, Louisiana, to rescue organizations in northern states that have the space and resources to help provide them with new opportunities. These partnerships allow Caddo Parish Animal Services to save more lives while reducing the challenges faced by an overcrowded municipal shelter.

Every foster home creates space for another animal in need. By opening your home, you provide a dog or cat with the time, care, and support they need while giving them the opportunity for a brighter future.

Together, we are moving animals forward — from shelter to foster, from foster to rescue, and from rescue to forever homes.

Interested in becoming part of the solution? Learn how you can foster, donate, or support the Foster Forward Program today.`;

const MEDICAL_COPY = `Every donation helps give critically injured and medically fragile shelter dogs a second chance. Through our Medical Program, we step in when animals arrive at the shelter with injuries, illnesses, or other conditions requiring emergency or long-term veterinary care. We invest the time, resources, and medical treatment these dogs need to heal, recover, and ultimately find loving homes. Your support helps cover the cost of surgeries, medications, diagnostics, boarding, and ongoing care, allowing us to continue providing life-saving care to animals who otherwise might not have a chance. Together, we can give these deserving animals the opportunity for a brighter future.`;

const IMAGE_LAW = `IMAGE DISPLAY (required): Prefer natural aspect ratio. In a sized card/section use object-fit: contain so the whole image is visible with no crop. Do NOT use object-fit: cover.`;

/** @type {Array<{id:string, title?:string, status?:string, status_reason?:string, description:string}>} */
const UPDATES = [
  {
    id: "tkt_cpas_w2_more_events_subarea_20260726",
    title: "Events page (/events) under More — CMS + campaigns",
    status: "active",
    status_reason: "Operator locked: CMS Events page + campaign mirror; Past Events = Wet Dog",
    description: `Build a public Events page at https://companionsofcaddo.org/events, linked from the More menu.

HARD RULE: This must be a real CMS Website page (cms_pages + sections) so staff can edit 100% in the CMS editor — no hardcoded-only page.

Also wire each event as a Fundraising campaign (Giving → Fundraising) so the same Lori content can be edited there for sanity. A draft campaign already exists for the August 29 5K.

PAGE STRUCTURE
• Upcoming — August events below
• Past Events — Wet Dog Competition (completed) with context, images, setup

UPCOMING (Lori — use these facts)
1) August 7, 2026 — August Northern Transport Leaves
   Fosters drop off dogs at the meeting point.
   OPEN: meeting point address/time/contact; public vs foster-only?

2) August 29, 2026 — 6th Annual Winnie’s Way 5K Rescue Run
   Register: https://runsignup.com/Race/LA/Bossier/WinniesWay5kRescueRun
   When: Saturday, August 29, 2026
   Where: Arthur Ray Teague Boat Launch / Bike Path, 3140 Arthur Ray Teague Parkway, Bossier City
   Time: 5K at 8:00 a.m.; ½-Mile Kids Fun Run at 7:45 a.m. (ages 10 & under, $10; trophies top boy/girl)
   Registration: $25 early through Aug 20; $30 Aug 21–28; $35 race day
   Shirt sizes guaranteed only if registered by midnight Aug 19
   Lazy Dawg sleep-in supporter option (shirt, no run)
   Proceeds / mission: Winnie’s Wish / www.winniesway.org
   Course: out-and-back on ART Bike path from ART Boat Launch

Wet Dog is NOT upcoming — it belongs in Past Events (see paired task).

${IMAGE_LAW}
Campaign card photos: contain, never cover. Add a photo when approved.

ACCEPTANCE
- [ ] https://companionsofcaddo.org/events exists and is linked from More
- [ ] Page fully editable in CMS Website
- [ ] Upcoming lists Transport + 5K with facts/links above
- [ ] Past Events section ready for Wet Dog
- [ ] Matching Fundraising campaigns exist (at least 5K + Wet Dog)
- [ ] https://companionsofcaddo.org/contact reachable from More
- [ ] Event/campaign images use contain / natural ratio`,
  },
  {
    id: "tkt_cpas_w2_nav_wetdog_to_more_20260726",
    title: "Move Wet Dog Contest to Events → Past Events",
    status: "active",
    status_reason: "Wet Dog completed — move to /events Past Events with context + images",
    description: `Wet Dog Contest is COMPLETED. Move it off the homepage live competition treatment into:

More → Events (https://companionsofcaddo.org/events) → Past Events

Include context, images, and setup (preserve gallery/entry history — do not orphan assets). Also keep/wire as a Fundraising campaign for edit sanity.

Donate stays as the header button (unchanged).

${IMAGE_LAW}

ACCEPTANCE
- [ ] Wet Dog no longer featured as a live/upcoming homepage competition
- [ ] Past Events shows Wet Dog with context + images
- [ ] Assets/URLs still resolve
- [ ] “Repurpose as general campaign upload” remains a separate follow-on unless Lori merges it`,
  },
  {
    id: "tkt_cpas_w2_wetdog_remove_repurpose_campaign_20260726",
    title: "Wet Dog: remove live competition; optional general campaign upload",
    status: "backlog",
    status_reason: "Paired with Past Events move — confirm with Lori if archive-only or also general upload",
    description: `After Wet Dog moves to Past Events, remove the live competition treatment from the homepage.

OPEN with Lori: keep Past Events archive only, OR also repurpose the upload flow as a general campaign/fundraiser feature?

Coordinate with: Move Wet Dog Contest to Events → Past Events.

Do not invent scope. Prefer archive-first until Lori answers.`,
  },
  {
    id: "tkt_cpas_w2_more_merch_subarea_20260726",
    title: "More → Merchandise (blocked until Lori answers)",
    status: "blocked",
    status_reason: "Need products, fulfillment, coming-soon vs shop, store URL",
    description: `Client asked for Merchandise under More.

BLOCKED until Lori answers:
1) Any products for sale today, or “coming soon”?
2) Who fulfills orders?
3) Coming-soon page vs full shop?
4) Existing store URL (Etsy, Bonfire, etc.)?

If a placeholder ships later, it MUST be a CMS page (100% editable). Do not build a full shop until answers exist.`,
  },
  {
    id: "tkt_cpas_w2_mainpage_delete_5050_shot_20260726",
    title: "Homepage: delete “Every dog has a 50/50 shot” section",
    status: "backlog",
    description: `Remove the entire homepage band with eyebrow THE REALITY AT CADDO PARISH and headline “Every dog has a 50/50 shot. We work to change those odds.” including the three-step urgent → care → future strip.

Edit via CMS Website (unpublish/delete section) — do not CSS-hide.

ACCEPTANCE
- [ ] Entire section gone from live homepage
- [ ] No orphan CMS section still publishing that block`,
  },
  {
    id: "tkt_cpas_w2_mainpage_delete_volunteer_powered_20260726",
    title: "Homepage: remove Volunteer Powered + Brighter Tomorrow",
    status: "backlog",
    description: `From the homepage hero, remove:
• Pill/badge: Caddo Parish · Volunteer Powered
• H1: Every dog deserves a brighter tomorrow.

Replace with “Saving Lives. Creating Hope.” (see paired task). CMS-editable only.

ACCEPTANCE
- [ ] Both strings gone from homepage hero
- [ ] Layout still coherent (no empty hero)`,
  },
  {
    id: "tkt_cpas_w2_mainpage_saving_lives_hero_20260726",
    title: "Homepage: “Saving Lives. Creating Hope.” hero",
    status: "backlog",
    description: `Add “Saving Lives. Creating Hope.” as the primary homepage hero message (or agreed placement). Prefer CMS typography/section fields. If Lori provided an asset file, use it; otherwise type-only.

ACCEPTANCE
- [ ] Phrase appears as primary homepage hero message
- [ ] Fully editable in CMS Website`,
  },
  {
    id: "tkt_cpas_w2_mainpage_mission_copy_20260726",
    title: "Homepage: replace mission supporting sentence",
    status: "shipped",
    status_reason: "Completed from Collaborate Tasks — verify live still matches",
    description: `Remove:
“We move dogs from crisis to care—providing safe transport, veterinary support, foster connections, and loving homes. Together, we can give every dog the second chance they deserve.”

Replace with (exact):
“Supporting foster families, providing lifesaving medical care, coordinating transports to northern rescue partners, and helping shelter dogs find forever homes.”

CMS-editable homepage section only.

ACCEPTANCE
- [ ] Live homepage shows new sentence only (old sentence gone)`,
  },
  {
    id: "tkt_cpas_w2_mainpage_images_20260726",
    title: "Homepage: Puppies / Kitten / Meadow Medical images",
    status: "backlog",
    status_reason: "OPEN — need Lori file URLs + placement",
    description: `Client asked to put Main Page-Puppies, Main Page Kitten, and Meadow Medical on the main page.

OPEN — need from Lori:
1) Exact file URLs / uploads
2) Which homepage section
3) Captions / alt text

${IMAGE_LAW}
When URLs arrive, record pixel WxH + ratio next to each before placing.

Do not guess placement.`,
  },
  {
    id: "tkt_cpas_w2_donate_medical_copy_photos_20260726",
    title: "Donate page: Medical Program copy + 4 photos",
    status: "backlog",
    description: `Donate HEADER BUTTON stays where it is. This task is Donate PAGE Medical Program content (CMS).

COPY (exact):
${MEDICAL_COPY}

PHOTOS (measured 2026-07-27) — ${IMAGE_LAW}

1) 1125×1301 (~0.86∶1 portrait)
   https://assets.companionsofcaddo.org/static/cms/uploads/2026/07/1785118910707-754949051_1775718083770770_974461303632401639_n.jpg

2) 1125×1373 (~0.82∶1 portrait)
   https://assets.companionsofcaddo.org/static/cms/uploads/2026/07/1785118909628-753471177_874460018745741_428394924235876054_n.jpg

3) 1125×823 (~1.37∶1 landscape)
   https://assets.companionsofcaddo.org/static/cms/uploads/2026/07/1785118911151-753706803_2279464739534993_3506682152008191157_n.jpg

4) 1125×1262 (~0.89∶1 portrait)
   https://assets.companionsofcaddo.org/static/cms/uploads/2026/07/1785118910327-753732945_1432641082030523_4880347642772707730_n.jpg

ACCEPTANCE
- [ ] Medical Program section shows exact copy
- [ ] All four images appear, correctly oriented, contain (not cover)
- [ ] Editable in CMS Website`,
  },
  {
    id: "tkt_cpas_w2_candid_seal_20260726",
    title: "Footer: Candid Silver Seal of Transparency",
    status: "backlog",
    description: `Place Candid Silver Seal at the bottom of the website (footer). Prefer CMS footer / site-wide embed field.

Exact HTML:
<a aria-label="Companions of CPAS" href="https://app.candid.org/profile/14607574/companions-of-cpas-88-4156327/?pkId=ef6a3773-8ef0-42a2-b7df-ad52ac334f0e" target="_blank">
  <img alt="" src="https://widgets.guidestar.org/prod/v1/pdp/transparency-seal/14607574/svg" />
</a>

Toolkit PDF: https://cdn.candid.org/seals-of-transparency/2025/candid-seal-silver-toolkit-2025.pdf

ACCEPTANCE
- [ ] Seal visible in site footer, links to Candid profile, opens in new tab
- [ ] aria-label preserved`,
  },
  {
    id: "tkt_cpas_w2_foster_sunflower_photo_20260726",
    title: "Foster: Sunflower photo on listings",
    status: "backlog",
    description: `Sunflower photo asset:

1281×959 (~1.34∶1 landscape)
https://assets.companionsofcaddo.org/static/cms/uploads/2026/07/1785120531387-Sunflower-Foster.jpg

Animal profile exists in Animals. Ensure Visible / Foster listing shows her on https://companionsofcaddo.org/fosters (see “Animal publish controls” task).

${IMAGE_LAW}

ACCEPTANCE
- [ ] Sunflower appears on Foster page with this photo
- [ ] Image uses contain / natural ratio
- [ ] Visible toggle actually publishes her to Foster`,
  },
  {
    id: "tkt_cpas_w2_foster_supplies_bulletlist_20260726",
    title: "Foster: Foster Forward copy, van photo, supplies bullets",
    status: "backlog",
    description: `Update Foster page (CMS-editable sections only).

VAN PHOTO — 480×640 (3∶4 portrait)
https://assets.companionsofcaddo.org/static/cms/uploads/2026/07/1784662848791-new-transport-hero_image.jpg

SUPPLIES ARTWORK — 1366×768 (~16∶9)
https://assets.companionsofcaddo.org/static/cms/uploads/2026/07/1785120950875-FosterSupplies-Websight.png
Use some icons from this sheet with the list (food, collar, vetting, crate, leash).

SUPPLIES — change to bullet list (exact):
• Crate
• Food
• Vetting
• Collar
• Leash
• and more

Lead-in: “All supplies provided:” then the bullets (not chips-only).

BODY COPY (exact):
${FOSTER_FORWARD_COPY}

${IMAGE_LAW}

ACCEPTANCE
- [ ] Van photo + Foster Forward copy on Foster
- [ ] Supplies as bullet list
- [ ] FosterSupplies icons where appropriate
- [ ] Sunflower still present
- [ ] Fully editable in CMS`,
  },
  {
    id: "tkt_cpas_w2_header_logo_enlarge_20260726",
    title: "Header logo size (Lori approved — keep as live)",
    status: "shipped",
    status_reason: "Lori approved current header logo size 2026-07-27 — do not enlarge further",
    description: `DONE. Lori approved the current header logo size.

Live asset: https://assets.companionsofcaddo.org/static/global/logo-header.png
Measured: 284×200 (~1.42∶1). Keep left alignment.

When rearranging nav (More / Events / Contact), do NOT change logo size — leave as currently live.`,
  },
  {
    id: "tkt_cpas_w2_cms_images_add_folder_20260726",
    title: "CMS Images: Add Folder for media library",
    status: "in_review",
    description: `Add a durable “+ Add Folder” control in CMS Images so staff can organize the media library (not a hardcoded folder list only).

ACCEPTANCE
- [ ] Staff can create a new folder from CMS Images
- [ ] Folders persist (D1 / storage — not session-only)
- [ ] Existing media still reachable`,
  },
  {
    id: "tkt_cpas_w2_animal_publish_visibility_20260727",
    title: "Animals: Visible toggle must update Foster + Adopt (clearer publish UI)",
    status: "active",
    status_reason: "Operator: Visible must drive Foster and Adopt; clarify publish pathways; contain images",
    description: `Problem: Staff toggle Visible / Featured on an animal, but pathways to publish or update who appears on Foster and Adopt feel inconsistent and hard to use. Help text today says Adopt-only. Foster grids must respect the same publish controls. Listing cards currently force square object-fit: cover — wrong.

REQUIREMENTS
1) Visible clearly controls public listing on BOTH https://companionsofcaddo.org/adopt AND https://companionsofcaddo.org/fosters (labels/help text must say so).
2) Featured and “needs foster” behaviors are easy to understand in Animals.
3) After save, live Foster + Adopt update promptly (cache bust both routes).
4) Listing images: object-fit contain — natural ratio, never force a square crop.
5) Staff can complete “show this dog / hide this dog” without hunting through unclear UI.

${IMAGE_LAW}

ACCEPTANCE
- [ ] Toggle Visible on an animal → appears/disappears on Foster and Adopt as expected
- [ ] UI copy makes publish path obvious
- [ ] Images on cards use contain
- [ ] No dead end where Visible is on but Foster still wrong`,
  },
  {
    id: "tkt_cpas_w2_ticket_bodies_backfill_2026_07_27",
    title: "Week-2 task details: fill in Lori’s instructions",
    status: "shipped",
    status_reason: "Descriptions backfilled from CPAS-WEEK2-LORI-BRIEF-2026-07.md for Tasks sign-off",
    description: `Fill each week-2 task description with Lori’s exact instructions so Collaborate → Tasks is reviewable for client sign-off.

Client-facing wording only (no internal sprint jargon).

ACCEPTANCE
- [ ] Week-2 tasks show real instructions in Tasks
- [ ] Operator can verify at https://companionsofcaddo.org/dashboard/collaborate?seg=tasks`,
  },
  // Collaborate suite — rename off Swarm language
  {
    id: "tkt_cpas_cal_upcoming_events_2026_07_27",
    title: "Calendar: Upcoming events list + clearer purple grid",
    description: `Collaborate Calendar: replace the fake “Meet with…” placeholder with a real Upcoming events area staff can use. Soften grey grid lines toward the purple calendar look.

Coordinate with the public Events page (/events) and Fundraising campaigns so event facts stay consistent with Lori’s paste.

ACCEPTANCE
- [ ] Upcoming events can be added/edited for real (not fake UI)
- [ ] Calendar grid reads clearer (less muddy grey)
- [ ] Language is staff-friendly`,
  },
  {
    id: "tkt_cpas_tasks_phases_folders_docs_2026_07_27",
    title: "Tasks: clearer phases, folders, and instructions",
    description: `Collaborate Tasks: make status phases useful (e.g. Incomplete / In progress / Waiting review / Completed), keep folders understandable, and ensure task descriptions show real instructions (not empty titles).

This is client-facing — write labels staff understand. No internal jargon.

ACCEPTANCE
- [ ] Phase filters match how staff track work
- [ ] Folders are clear
- [ ] Task bodies show actionable instructions`,
  },
  {
    id: "tkt_cpas_cms_media_add_folder_2026_07_27",
    title: "CMS Images: durable Add Folder",
    description: `Make “+ Add Folder” in CMS Images create a real, lasting folder staff can use to organize uploads (not a temporary UI list).

Pairs with week-2 CMS Images task.

ACCEPTANCE
- [ ] New folders persist across sessions
- [ ] Staff can organize media without developer help`,
  },
  {
    id: "tkt_cpas_mail_canonical_ux_2026_07_27",
    title: "Mail: one clear email screen + working Quick actions",
    description: `Give staff one clear place for email (/dashboard/mail) instead of confusing duplicate entry points. Fix Quick actions so they work and read clearly.

ACCEPTANCE
- [ ] Mail opens from a single obvious place
- [ ] Quick actions work and make sense
- [ ] No mangled / duplicate mail UI`,
  },
  {
    id: "tkt_cpas_collab_sprint_2026_07_27",
    title: "Collaborate improvements (Calendar, Tasks, Mail, CMS folders)",
    description: `Umbrella for Collaborate dashboard improvements: Calendar upcoming events, Tasks phases/folders/instructions, CMS Add Folder, and Mail clarity.

Public Events page (/events) and week-2 Lori revisions are tracked on their own tasks — keep those facts consistent.`,
  },
];

function sqlString(s) {
  return `'${String(s).replace(/'/g, "''")}'`;
}

function buildSql({ forIam = false } = {}) {
  const lines = [];
  for (const u of UPDATES) {
    const sets = [
      `description = ${sqlString(u.description)}`,
      `updated_at = ${now}`,
    ];
    if (u.title) sets.push(`title = ${sqlString(u.title)}`);
    if (u.status) {
      sets.push(`status = ${sqlString(u.status)}`);
      if (u.status === "shipped") {
        sets.push(`closed_at = COALESCE(closed_at, ${now})`);
      }
    }
    if (u.status_reason) sets.push(`status_reason = ${sqlString(u.status_reason)}`);
    lines.push(`UPDATE agentsam_tickets SET ${sets.join(", ")} WHERE id = ${sqlString(u.id)};`);
  }
  const animal = UPDATES.find((x) => x.id === "tkt_cpas_w2_animal_publish_visibility_20260727");
  if (forIam) {
    lines.push(`INSERT OR IGNORE INTO agentsam_tickets (
      id, title, description, status, status_reason, priority, created_at, updated_at
    ) VALUES (
      'tkt_cpas_w2_animal_publish_visibility_20260727',
      ${sqlString(animal.title)},
      ${sqlString(animal.description)},
      'active',
      ${sqlString(animal.status_reason)},
      'high',
      ${now},
      ${now}
    );`);
  } else {
    lines.push(`INSERT OR IGNORE INTO agentsam_tickets (
      id, title, description, status, status_reason, priority, created_at, updated_at, attachments_json
    ) VALUES (
      'tkt_cpas_w2_animal_publish_visibility_20260727',
      ${sqlString(animal.title)},
      ${sqlString(animal.description)},
      'active',
      ${sqlString(animal.status_reason)},
      'high',
      ${now},
      ${now},
      '[]'
    );`);
  }
  return lines.join("\n");
}

function runWrangler(cwd, dbName, sqlPath) {
  const r = spawnSync(
    "npx",
    ["wrangler", "d1", "execute", dbName, "--remote", `--file=${sqlPath}`],
    { cwd, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 }
  );
  process.stdout.write(r.stdout || "");
  process.stderr.write(r.stderr || "");
  if (r.status !== 0) {
    throw new Error(`wrangler failed for ${dbName} in ${cwd} (exit ${r.status})`);
  }
}

function verify(cwd, dbName) {
  const r = spawnSync(
    "npx",
    [
      "wrangler",
      "d1",
      "execute",
      dbName,
      "--remote",
      "--command",
      "SELECT id, title, status, length(COALESCE(description,'')) AS dlen FROM agentsam_tickets WHERE id LIKE 'tkt_cpas_w2%' OR id LIKE 'tkt_cpas_cal%' OR id LIKE 'tkt_cpas_tasks%' OR id LIKE 'tkt_cpas_cms_media%' OR id LIKE 'tkt_cpas_mail%' OR id LIKE 'tkt_cpas_collab_sprint%' ORDER BY id;",
    ],
    { cwd, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 }
  );
  process.stdout.write(r.stdout || "");
  process.stderr.write(r.stderr || "");
}

const args = new Set(process.argv.slice(2));
const doCpas = args.has("--both") || args.has("--cpas") || (!args.has("--iam") && !args.has("--both"));
const doIam = args.has("--both") || args.has("--iam");

const sql = buildSql({ forIam: doIam && !doCpas });
// When --both, run CPAS then IAM with separate SQL
const sqlPath = join(tmpdir(), `cpas-w2-backfill-${now}.sql`);

try {
  if (doCpas) {
    const cpasSql = buildSql({ forIam: false });
    writeFileSync(sqlPath, cpasSql, "utf8");
    console.log(`Wrote ${sqlPath} (${cpasSql.length} chars, ${UPDATES.length} updates)`);
    console.log("\n=== CPAS companionscpas ===");
    runWrangler("/Users/samprimeaux/companionscpas", "companionscpas", sqlPath);
    verify("/Users/samprimeaux/companionscpas", "companionscpas");
  }
  if (doIam) {
    const iamSql = buildSql({ forIam: true });
    writeFileSync(sqlPath, iamSql, "utf8");
    console.log(`Wrote IAM SQL (${iamSql.length} chars)`);
    console.log("\n=== IAM inneranimalmedia-business ===");
    runWrangler("/Users/samprimeaux/inneranimalmedia", "inneranimalmedia-business", sqlPath);
    verify("/Users/samprimeaux/inneranimalmedia", "inneranimalmedia-business");
  }
} finally {
  try {
    unlinkSync(sqlPath);
  } catch {
    /* ignore */
  }
}

console.log("\nDone. Review: https://companionsofcaddo.org/dashboard/collaborate?seg=tasks");
