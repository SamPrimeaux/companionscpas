# Sam TO-DO — Companions of CPAS Final Polish Sprint

Date: Tomorrow
Goal: Finish the Companions of CPAS public brand identity, dashboard CRUD/CMS reliability, and page-by-page live editing pipeline so the site can be confidently managed from the dashboard.

## Sprint Goal

By the end of this pass, Companions should have:

- Stronger public-facing brand copy.
- Cleaner public page layouts.
- Reliable CMS editing for each live page.
- Better dashboard contrast and responsive behavior.
- D1/KV/R2 publish logic verified.
- Real settings replacing placeholder settings.
- Clear ownership boundaries for storage, email, social, and AI usage.

## 0. Prep

### 0.1 Open Working Routes

Public:

- `/`
- `/about`
- `/services`
- `/adopt`
- `/community`
- `/donate`

Auth/admin:

- `/admin/login`
- `/admin/reset-password`

CMS/dashboard:

- `/dashboard/overview`
- `/dashboard/animals`
- `/dashboard/cms/pages`
- `/dashboard/cms/images`
- `/dashboard/cms/brand`
- `/dashboard/cms/templates`
- `/dashboard/reports`
- `/dashboard/settings`
- `/dashboard/email`

### 0.2 Use the No-Guessing Rule

For every page:

- Identify what is live-rendered from D1.
- Identify what is cached in KV.
- Identify what is stored in R2.
- Identify what is hardcoded.
- Identify what is demo/fake data.
- Decide whether to connect, hide, or replace.

Do not polish fake data into production-looking UI.

## 1. Brand Identity Pass

### 1.1 Lock Current Direction

Keep:

- Modern sans heading/body style.
- Clean dark/light public site contrast.
- Purple accent for now.
- Large emotional dog photography.
- Rounded card style.
- Volunteer-powered / second-chance messaging.

Improve:

- Duplicate copy.
- Weak/vague CTAs.
- Low-contrast dashboard text.
- About hero layout issue.
- Dashboard full-screen flex behavior.
- CMS brand/settings usefulness.

### 1.2 Update Brand Source of Truth

Route:

`/dashboard/cms/brand`

Tasks:

- Confirm org name: Companions of CPAS.
- Confirm domain: companionsofcaddo.org.
- Confirm EIN.
- Confirm contact email.
- Confirm location: Caddo Parish / Shreveport.
- Confirm short description.
- Confirm footer description.
- Confirm logo light/dark URLs.
- Confirm accent color and warning/medical color.
- Add fields if missing:
  - Mission statement.
  - Short positioning.
  - Homepage headline.
  - Footer blurb.
  - Facebook URL.
  - Instagram URL.
  - Donation URL.
  - Adoption contact name/email.
  - Rescue contact name/email.

Definition of done:

Brand settings can update the visible website header/footer/basic site identity without manual code edits.

## 2. Public Page-by-Page Refinement

### 2.1 Home Page

Route:

`/`

CMS editor:

`/dashboard/cms/pages/home`

Fixes:

- Remove duplicate hero paragraph.
- Keep headline: Every dog deserves someone in their corner.
- Rewrite body to one strong paragraph.
- Confirm CTA order:
  - Primary: Apply to Foster.
  - Secondary: Support Our Mission.
- Confirm image crop and mobile layout.
- Confirm all section edits publish from CMS.
- Confirm D1 page sections sync to KV/live route.

Suggested hero body:

Companions of CPAS helps dogs at Caddo Parish Animal Services receive medical care, transport support, foster placement, adoption visibility, and a safer path forward.

Definition of done:

Live home page matches CMS page editor after publish.

### 2.2 About Page

Route:

`/about`

Fixes:

- Repair weird hero section spacing/layout.
- Keep large emotional headline but make it cleaner.
- Use team/community photo intentionally.
- Reduce dead space.
- Add stronger what-we-actually-do section.
- Make volunteer-powered identity obvious.
- Add CTA back to Adopt/Foster/Donate.

Suggested hero headline:

Giving Caddo dogs the second chance they might not get otherwise.

Suggested body:

Companions of CPAS is a volunteer-powered nonprofit helping dogs at Caddo Parish Animal Services receive the care, visibility, transport support, and rescue connections they need to move forward.

Definition of done:

About page clearly explains who they are in under 10 seconds.

### 2.3 Foster Page

Route:

`/services`

Fixes:

- Keep nav label Foster.
- Decide whether route remains `/services` for now.
- Make short-term fostering feel approachable.
- Add you-do-not-have-to-do-this-alone reassurance.
- Add foster-needed content pattern.
- Confirm any forms/applications route correctly.

Suggested hero headline:

A short-term foster can change everything.

Suggested body:

Fostering gives a dog safety, stability, and time. Whether a dog is waiting for transport, recovering from medical care, or needing a break from the shelter, a temporary home can help them reach the next step.

Definition of done:

A visitor understands what fostering means, why it matters, and how to apply.

### 2.4 Adopt Page

Route:

`/adopt`

Fixes:

- Confirm animal grid is D1-backed.
- Confirm image URLs are R2-backed.
- Confirm filters: All, Available, Foster Needed, Medical Watch, Adopted/Placed.
- Confirm empty states.
- Confirm animal profile clicks or inquiry CTAs.
- Confirm status labels are readable.
- Confirm no fake/demo-only animals appear as real unless intended.

Animal card must show:

- Photo.
- Name.
- Status.
- Age if available.
- Sex/fixed status if available.
- Weight if available.
- CTA.

Definition of done:

Animal changes in dashboard reflect on Adopt page reliably.

### 2.5 Community Page

Route:

`/community`

Fixes:

- Do not recreate Facebook feed.
- Use curated stories, rescue wins, foster highlights, and social proof.
- Add section pattern for recurring community story formats.
- Add CTA to foster/donate/share.
- Pull from story/update records if already built; otherwise create a simple CMS section type.

Definition of done:

Community page captures their Facebook warmth without becoming maintenance chaos.

### 2.6 Donate Page

Route:

`/donate`

Fixes:

- Make donation purpose specific.
- Separate giving lanes:
  - Medical care.
  - Transport support.
  - Foster support.
  - General mission.
- Confirm donation button destination.
- Confirm EIN/nonprofit info.
- Avoid fake live fundraising totals unless backed by data.

Suggested hero headline:

Your gift helps dogs get care, transport, and a path forward.

Definition of done:

A donor understands exactly what their gift helps make possible.

## 3. CMS Pages / Publish Pipeline

Routes:

- `/dashboard/cms/pages`
- `/dashboard/cms/pages/home`
- Relevant page editors.

Tasks:

- Verify page list loads from D1.
- Verify each page has stable slug.
- Verify section order saves.
- Verify hidden sections stay hidden.
- Verify draft state vs live state.
- Verify publish writes to correct storage/cache layer.
- Verify live public route updates after publish.
- Verify image fields use R2 URLs.
- Verify mobile/tablet/desktop preview uses the same content fields as live render.
- Verify no duplicated body fields in hero sections.

Definition of done:

For each public page, editing in CMS and pressing Publish updates the public page without manual deploy.

## 4. Media Library / R2

Route:

`/dashboard/cms/images`

Tasks:

- Fix low-contrast labels/buttons.
- Confirm upload works.
- Confirm copy URL works.
- Confirm alt text can be added/edited.
- Confirm image tags work:
  - animals
  - team
  - fundraising
  - global
  - page-home
  - page-about
  - page-foster
  - page-adopt
  - page-community
  - page-donate
  - shared
- Confirm delete/cleanup protection.
- Confirm thumbnails are optimized.
- Confirm no broken R2/public asset URLs.

Definition of done:

Images can be uploaded, tagged, copied, selected in CMS, and rendered publicly.

## 5. Animals CRUD

Route:

`/dashboard/animals`

Tasks:

- Test Add Animal.
- Test Edit Animal.
- Test Delete or archive behavior.
- Test public visibility toggle.
- Test status changes:
  - Available.
  - Foster Needed.
  - Medical Watch.
  - Adopted.
  - Rescue/transport if available.
- Test image selection from media library.
- Test animal card rendering on dashboard.
- Test animal card rendering on public Adopt page.
- Confirm animal records do not duplicate image data unnecessarily.

Definition of done:

Animal roster is reliable enough for client/admin use.

## 6. Dashboard Layout / Contrast Pass

Routes:

- `/dashboard/overview`
- `/dashboard/animals`
- `/dashboard/cms/images`
- `/dashboard/cms/templates`
- `/dashboard/reports`
- `/dashboard/settings`

Tasks:

- Fix faint white text on light background.
- Ensure cards use full available width.
- Ensure grids flex correctly on desktop/tablet/mobile.
- Ensure sidebar does not crush content.
- Ensure sticky/top bars behave.
- Ensure buttons have accessible contrast.
- Ensure active tabs are visible.
- Ensure empty states look intentional.
- Ensure no chart/table overflows.

Definition of done:

Dashboard feels intentionally designed, not like a dark card system dropped onto a light page.

## 7. Templates Library

Route:

`/dashboard/cms/templates`

Tasks:

- Improve page to use full screen.
- Add real previews instead of simple dark cards only.
- Add categories:
  - Structure.
  - Content.
  - Animals.
  - Giving.
  - Social.
- Template cards should show:
  - Template name.
  - Short description.
  - Preview thumbnail/mini layout.
  - Best-use label.
  - Use on Page button.
- Add templates:
  - Hero.
  - Text + Image.
  - Animal Grid.
  - Foster CTA.
  - Donation Block.
  - Impact Stats.
  - Community Story.
  - FAQ.
  - Contact Block.
  - Footer CTA.

Definition of done:

Templates are useful enough to build/refine pages without hand-coding every section.

## 8. Reports

Route:

`/dashboard/reports`

Tasks:

- Confirm each tab source:
  - Animals.
  - Financial.
  - Applications.
  - Volunteers.
  - Medical.
  - AI Usage.
- Remove or label fake/demo data.
- Make charts responsive.
- Use full screen width better.
- Confirm AI usage tab only reflects real AI/API runs.
- Confirm cost numbers are real or hidden.
- Add empty state if no data.

Definition of done:

Reports are trustworthy and visually stable.

## 9. Settings Overhaul

Route:

`/dashboard/settings`

Tasks:

- Replace placeholder settings with real sections:
  - Organization.
  - Users.
  - Roles & Permissions.
  - Integrations.
  - Notifications.
  - Email.
  - Billing / Usage Boundaries.
- Verify users table.
- Verify invite flow.
- Verify role updates.
- Verify integration settings save to D1/secrets pattern properly.
- Do not expose secrets in UI.
- Add clear disabled states for integrations not configured.

Definition of done:

Settings become operational, not decorative.

## 10. Email / Resend Inbound

Route:

`/dashboard/email`

Tasks:

- Set up Resend inbound domain/route.
- Configure inbound webhook to `/api/email/inbound` or the final implemented route.
- Verify inbound message storage.
- Verify attachments handling or safe ignore.
- Verify dashboard email list.
- Verify message detail view.
- Verify reply workflow if planned.
- Label incoming categories if possible:
  - Adoption inquiry.
  - Foster inquiry.
  - Volunteer.
  - Donation.
  - General.
- Confirm spam/security handling.

Definition of done:

Emails/applications can be received and viewed in the dashboard.

## 11. Client Ownership / Cost Boundaries

Tasks:

- Confirm Cloudflare resources are client-owned or explicitly scoped.
- Confirm R2 storage policy.
- Confirm Meta/Facebook integration is client-owned before enabling posting.
- Confirm Resend account/domain ownership.
- Confirm AI usage is opt-in and usage-visible.
- Confirm dashboard AI usage/cost reporting works before giving them AI generation access.
- Avoid unlimited post freely / store freely / generate freely behavior without a plan.

Definition of done:

No surprise bills land on Sam or Inner Animal Media.

## 12. Final QA Checklist

For each public page:

- Desktop looks good.
- Mobile looks good.
- Header works.
- Footer works.
- CTA links work.
- Images load.
- Copy is clean.
- CMS edit reflects after publish.
- No duplicate text.
- No placeholder content.
- No broken route.

For each dashboard section:

- Auth required.
- Data loads.
- Create works where expected.
- Edit works where expected.
- Save persists.
- Delete/archive behavior is safe.
- Empty state exists.
- Contrast is readable.
- Mobile/tablet does not break.

## Recommended Work Order

1. Brand settings source of truth.
2. Home page CMS publish reliability.
3. About page hero/copy/layout repair.
4. Adopt page animal grid and D1/R2 verification.
5. Foster page copy and CTA refinement.
6. Donate page outcome-based copy.
7. Community page curated story system.
8. Media library polish.
9. Templates page enhancement.
10. Reports real-data audit.
11. Settings overhaul.
12. Resend inbound email setup.

## End-of-Day Target

By the end of tomorrow, the goal is not to add more pages.

The goal is to make the existing pages and dashboard routes feel intentional, connected, editable, and trustworthy.

## Strategic Call

Keep the current theme for now. It is good enough to become great.

The problem is not the overall visual direction. The problem is final copy, contrast, real data plumbing, CMS publish reliability, and making settings/templates/reports feel finished instead of mocked.
