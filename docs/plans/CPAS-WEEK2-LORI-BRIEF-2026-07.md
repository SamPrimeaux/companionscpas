# Companions of CPAS — Week-2 Client Revision Brief

**Source:** Lori / client spreadsheet + operator notes (2026-07)  
**Status:** Ready for Tasks sign-off — IA + Events + logo LOCKED; remaining OPEN in §F  
**Repos:** `companionscpas` · tickets `tkt_cpas_w2_*` (also mirrored on IAM for coordination)  
**Rule:** Do not invent Lori copy. Items marked **OPEN** need an answer before build.  
**Hard rule:** Every public page or section added in this batch must be editable in **CMS Website** (100% — no hardcoded-only pages).

---

## How to use this document

1. Read each work item.  
2. Confirm **Acceptance** matches Lori’s intent.  
3. Sign off from [Collaborate → Tasks](https://companionsofcaddo.org/dashboard/collaborate?seg=tasks).  
4. Ticket IDs below are the D1 rows whose `description` should match this brief.

---

## Image display law (LOCKED — all public surfaces)

| Prefer | Avoid |
|--------|--------|
| Natural aspect ratio preserved | `object-fit: cover` (crops) |
| Whole image always visible | Fixed square/box that forces a crop |
| In a sized card/section: **`object-fit: contain`** | Stretching (`fill`) |

**Quick reference**

| value | crops? | distorts? | fills box? |
|-------|--------|-----------|------------|
| cover | yes | no | yes |
| **contain** | **no** | **no** | no (may letterbox) |
| fill | no | yes | yes |
| none | no (natural px) | no | only if it matches |

Agents must record **pixel size + ratio** next to every image URL in the task body.

---

## A. Navigation & information architecture

### A1. Primary menu — **LOCKED**

**Top nav:** Home · Foster · Adopt · About Us · More  

| Item | Decision |
|------|----------|
| Donate | Stays as header CTA (not under More) |
| Contact | Under **More** → live URL [https://companionsofcaddo.org/contact](https://companionsofcaddo.org/contact) |
| Events | Under **More** → live URL [https://companionsofcaddo.org/events](https://companionsofcaddo.org/events) (new CMS page) |
| Merchandise | Under More when unblocked (see A3) |

---

### A2. Events page (CMS + campaign) — `tkt_cpas_w2_more_events_subarea_20260726`

**Intent:** Create a real public **Events** page at `/events`, fully editable in CMS. For operator sanity, also wire each event as a **Fundraising campaign** (same content you can edit in Giving → Fundraising) so drafts aren’t lost when agents drift from Lori’s paste.

**Page structure**

| Section | Contents |
|---------|----------|
| **Upcoming** | August events below |
| **Past Events** | Wet Dog Competition (completed) — context, images, setup |

**Upcoming (Lori-provided — use verbatim facts):**

1. **August 7, 2026 — August Northern Transport Leaves**  
   - Fosters drop off dogs at the meeting point.  
   - **OPEN:** meeting point address / time / contact; public vs foster-only?

2. **August 29, 2026 — 6th Annual Winnie’s Way 5K Rescue Run**  
   - Register: https://runsignup.com/Race/LA/Bossier/WinniesWay5kRescueRun  
   - When: Saturday, August 29, 2026  
   - Where: Arthur Ray Teague Boat Launch / Bike Path, 3140 Arthur Ray Teague Parkway, Bossier City  
   - Time: 5K at 8:00 a.m.; ½-Mile Kids Fun Run at 7:45 a.m. (ages 10 & under, $10; trophies top boy/girl)  
   - Registration: $25 early through Aug 20; $30 Aug 21–28; $35 race day  
   - Shirt sizes guaranteed only if registered by midnight Aug 19  
   - Lazy Dawg sleep-in supporter option (shirt, no run)  
   - Proceeds / mission: Winnie’s Wish / www.winniesway.org  
   - Course: out-and-back on ART Bike path from ART Boat Launch  
   - **Campaign draft exists** in Fundraising (title matches). Add photo when approved; card preview must use **contain**, not cover.

**Wet Dog is NOT upcoming** — completed → Past Events (A4).

**Acceptance:**
- [ ] https://companionsofcaddo.org/events exists and is linked from **More**.  
- [ ] Page is a CMS page (`cms_pages` / sections) — 100% editable in CMS Website.  
- [ ] Upcoming lists Transport + 5K with the facts/links above.  
- [ ] Past Events section holds Wet Dog (context + images).  
- [ ] Matching Fundraising **campaign** rows exist for mental/edit sanity (at least 5K + Wet Dog past).  
- [ ] https://companionsofcaddo.org/contact reachable from More (same parent IA).  
- [ ] Event/campaign images use **contain** / natural ratio (no forced cover crop).

---

### A3. More → Merchandise — `tkt_cpas_w2_more_merch_subarea_20260726` (**blocked**)

Still need Lori: products? fulfillment? coming-soon vs shop? store URL?  
Do not build a full shop until answered. Any placeholder page must still be CMS-editable.

---

### A4. Wet Dog → Past Events — **LOCKED**  
`tkt_cpas_w2_nav_wetdog_to_more_20260726` (+ related `tkt_cpas_w2_wetdog_remove_repurpose_campaign_20260726`)

Wet Dog Contest is **finished**. Move into **Events → Past Events** with context, images, and setup. Preserve assets (no orphans). Also keep/wire as a campaign for edit sanity.

| Surface | Action |
|---------|--------|
| Homepage Wet Dog block | Remove when Past Events is live (or short “See Past Events” — OPEN) |
| `/events` Past Events | Wet Dog with context + images |
| Fundraising campaign | Mirror for editing |

**Acceptance:**
- [ ] Wet Dog not featured as a live/upcoming homepage competition.  
- [ ] Past Events shows Wet Dog with context + images.  
- [ ] Assets still resolve.  
- [ ] “Repurpose as general campaign upload” stays a **separate** follow-on unless Lori merges it.

---

## B. Homepage (Main)

### B1. Delete “Every dog has a 50/50 shot” — `tkt_cpas_w2_mainpage_delete_5050_shot_20260726`

Remove entire section (eyebrow THE REALITY AT CADDO PARISH + headline + three-step strip). Edit via CMS — not CSS-hide.

### B2. Delete Volunteer Powered / Brighter Tomorrow — `tkt_cpas_w2_mainpage_delete_volunteer_powered_20260726`

Remove pill **Caddo Parish · Volunteer Powered** and H1 **Every dog deserves a brighter tomorrow.** Replace per B3.

### B3. “Saving Lives. Creating Hope.” — `tkt_cpas_w2_mainpage_saving_lives_hero_20260726`

Primary homepage hero message (CMS-editable).

### B4. Mission sentence — `tkt_cpas_w2_mainpage_mission_copy_20260726`

**Replace with (exact):**  
> Supporting foster families, providing lifesaving medical care, coordinating transports to northern rescue partners, and helping shelter dogs find forever homes.

### B5. Main page images — `tkt_cpas_w2_mainpage_images_20260726` (**OPEN**)

Puppies / Kitten / Meadow Medical — need file URLs + placement from Lori. When placed: **contain**, record WxH.

---

## C. Donate

### C1. Medical Program copy + 4 photos — `tkt_cpas_w2_donate_medical_copy_photos_20260726`

**Copy (exact):**  
> Every donation helps give critically injured and medically fragile shelter dogs a second chance. Through our Medical Program, we step in when animals arrive at the shelter with injuries, illnesses, or other conditions requiring emergency or long-term veterinary care. We invest the time, resources, and medical treatment these dogs need to heal, recover, and ultimately find loving homes. Your support helps cover the cost of surgeries, medications, diagnostics, boarding, and ongoing care, allowing us to continue providing life-saving care to animals who otherwise might not have a chance. Together, we can give these deserving animals the opportunity for a brighter future.

**Photos (measured 2026-07-27) — use contain, never cover:**

| # | Size | Ratio | Orientation | URL |
|---|------|-------|-------------|-----|
| 1 | 1125×1301 | ~0.86∶1 | Portrait | https://assets.companionsofcaddo.org/static/cms/uploads/2026/07/1785118910707-754949051_1775718083770770_974461303632401639_n.jpg |
| 2 | 1125×1373 | ~0.82∶1 | Portrait | https://assets.companionsofcaddo.org/static/cms/uploads/2026/07/1785118909628-753471177_874460018745741_428394924235876054_n.jpg |
| 3 | 1125×823 | ~1.37∶1 | Landscape | https://assets.companionsofcaddo.org/static/cms/uploads/2026/07/1785118911151-753706803_2279464739534993_3506682152008191157_n.jpg |
| 4 | 1125×1262 | ~0.89∶1 | Portrait | https://assets.companionsofcaddo.org/static/cms/uploads/2026/07/1785118910327-753732945_1432641082030523_4880347642772707730_n.jpg |

Donate stays as the header button; this work is Donate **page** Medical Program content (CMS).

### C2. Candid Silver Seal — `tkt_cpas_w2_candid_seal_20260726`

Footer embed (exact HTML in ticket body). Toolkit: https://cdn.candid.org/seals-of-transparency/2025/candid-seal-silver-toolkit-2025.pdf

---

## D. Foster + animal publishing

### D0. Visible / publish animals on Foster & Adopt — `tkt_cpas_w2_animal_publish_visibility_20260727` (**NEW**)

**Problem:** Members flip Visible / Featured on an animal, but pathways to show/update listings on **Foster** and **Adopt** feel inconsistent or ineffective. Help text today says Adopt-only; Foster grids must respect the same publish controls. Animal card CSS currently forces square `object-fit: cover` — wrong per image law.

**Acceptance:**
- [ ] Visible toggle clearly controls public listing on **both** `/adopt` and `/fosters` (and labels say so).  
- [ ] Featured / foster-needed behaviors are easy to understand in Animals UI.  
- [ ] Toggle changes appear on live Foster/Adopt after save (cache bust both routes).  
- [ ] Listing images use **contain** (natural ratio; no forced square crop).  
- [ ] Staff can complete “show this dog / hide this dog” without hunting.

### D1. Sunflower photo — `tkt_cpas_w2_foster_sunflower_photo_20260726`

| Size | Ratio | Orientation | URL |
|------|-------|-------------|-----|
| 1281×959 | ~1.34∶1 | Landscape | https://assets.companionsofcaddo.org/static/cms/uploads/2026/07/1785120531387-Sunflower-Foster.jpg |

Animal profile exists; ensure Visible works for Foster (see D0). Display with **contain**.

### D2. Foster Forward + supplies — `tkt_cpas_w2_foster_supplies_bulletlist_20260726`

| Asset | Size | Ratio | Notes |
|-------|------|-------|-------|
| Transport van | 480×640 | 3∶4 portrait | https://assets.companionsofcaddo.org/static/cms/uploads/2026/07/1784662848791-new-transport-hero_image.jpg |
| FosterSupplies sheet | 1366×768 | ~16∶9 | https://assets.companionsofcaddo.org/static/cms/uploads/2026/07/1785120950875-FosterSupplies-Websight.png |

**Supplies bullets (exact):** Crate · Food · Vetting · Collar · Leash · and more  

Lead-in: **All supplies provided:** then bullets (not chips-only). Full Foster Forward copy remains in the ticket description (verbatim from Lori). CMS-editable Foster page sections only.

---

## E. Done / related

| Item | Ticket | Status |
|------|--------|--------|
| Header logo size | `tkt_cpas_w2_header_logo_enlarge_20260726` | **DONE — Lori approved.** Keep current live size (logo-header.png **284×200**, ~1.42∶1) when rearranging nav. Do not enlarge further. |
| CMS Add Folder | `tkt_cpas_w2_cms_images_add_folder_20260726` | In progress / review |
| Wet Dog remove/repurpose | `tkt_cpas_w2_wetdog_remove_repurpose_campaign_20260726` | Separate from Past Events move |

---

## F. Still need Lori

**Already decided — do not re-ask:**
- Nav: Home · Foster · Adopt · About Us · More  
- Contact under More → `/contact`  
- Events under More → `/events` (CMS + campaign mirror)  
- Donate stays header CTA  
- Wet Dog completed → Past Events  
- Logo size approved as live  
- Images: contain / natural ratio (never cover)

**Still open:**
1. Merchandise scope  
2. Confirm delete 50/50 + Volunteer Powered / Brighter Tomorrow  
3. Confirm Saving Lives hero + mission sentence live  
4. Puppies / Kitten / Meadow Medical URLs + placement  
5. August 7 transport drop-off details  
6. Wet Dog: archive only vs also “repurpose as general campaign upload”?  
7. Homepage after Wet Dog move: hard remove vs “See Past Events” teaser?  
8. Candid seal HTML as-is?

---

## G. Decision log

| Date | Decision | By |
|------|----------|-----|
| 2026-07-27 | Wet Dog → Past Events; Contact under More; Donate stays | Operator |
| 2026-07-27 | `/events` CMS page + campaign mirror; `/contact` under More | Operator |
| 2026-07-27 | Image law = contain / natural ratio (no cover) | Operator |
| 2026-07-27 | Header logo size approved — leave as live | Lori |
| 2026-07-27 | Animal Visible must drive Foster + Adopt; clearer publish UX | Operator |

## H. Sign-off checklist

- [ ] Review task titles + descriptions in Collaborate → Tasks (client-friendly wording).  
- [ ] Confirm §§A–D match intent.  
- [ ] Mark remaining §F items answered or deferred.  
- [ ] Approve implementers to build from these task bodies.
