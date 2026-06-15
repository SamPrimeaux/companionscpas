# /community Page — Full Specification

**Route:** `companionsofcaddo.org/community`  
**Nav label:** Community  
**Theme:** `dark` (hero + footer); light cream sections below  
**Last major rebuild:** 2026-06-15  
**Purpose:** Curated community warmth — social links, rescue wins, social proof — without maintaining a raw Facebook feed.

---

## How this page renders

Same pipeline as `/services` (generic fragment CMS):

1. D1 `cms_page_sections` + `cms_page_content_blocks` (source of truth)
2. `render_section.js` renders each section by `section_type`
3. HTML fragments → R2 `static/pages/community/{section_key}.html`
4. Worker assembles header + sections + footer → KV `page:/community`

**Publish:** Dashboard → CMS Website → Pages → Community → **Publish Live**  
**CLI sync:** `node scripts/sync-page-fragments.mjs /community`  
**Cache bust:** `npx wrangler kv key delete --binding=CMS_CACHE "page:/community" --remote`

---

## Section map (live, ordered by sort_order)

| sort | section_key | type | visible | Role |
|------|-------------|------|---------|------|
| 10 | `community_hero` | `hero` | yes | Opening statement + CTAs |
| 20 | `community_connect` | `feature_cards` | yes | 4 social/action cards |
| 28 | `community_stories` | `feature_cards` | yes | 3 curated story cards |
| 40 | `community_testimonial` | `text_image` | yes | Quote + founders photo |
| 50 | `community_cta` | `cta_banner` | yes | Closing adopt/foster CTAs |
| 25 | `community_fb_posts` | `facebook_embeds` | **hidden** | Enable when embed configured |
| 30 | `community_volunteer` | `cta_banner` | **hidden** | Duplicate of services volunteer |

---

## Section details

### `community_hero` — type: `hero`

| Field | Value |
|-------|-------|
| eyebrow | Get Involved |
| heading | You're part of this. |
| body | Every share, every foster inquiry… |
| image_url | `https://assets.companionsofcaddo.org/media/animals/2cutepups.webp` |
| cta_label | Meet the Dogs → `/adopt` |
| cta_secondary_label | Donate → `/donate` |

---

### `community_connect` — type: `feature_cards`

Section fields: eyebrow **Stay Connected**, heading **Follow the mission in real time.**, subheading = intro paragraph.

| block_key | title | image | action_label | action_value |
|-----------|-------|-------|--------------|--------------|
| `facebook` | Facebook | `media/animals/bigsmiles.webp` | Follow on Facebook | Facebook page URL |
| `instagram` | Instagram | `media/animals/sus.webp` | Follow on Instagram | Instagram URL |
| `email_updates` | Email Updates | `media/team/theteam.webp` | Get in Touch | `modal:contact` |
| `volunteer_card` | Volunteer | `media/animals/tansportfundraiserdogimage.webp` | Volunteer With Us | `modal:volunteer` |

**D1 block IDs:** `pcb_community_fb`, `pcb_community_ig`, `pcb_community_email`, `pcb_community_vol`

---

### `community_stories` — type: `feature_cards`

Section fields: eyebrow **Community Wins**, heading **Stories from the mission.**, subheading = intro.

| block_key | title | image | action |
|-----------|-------|-------|--------|
| `story_transport` | 13 dogs on the Freedom Bus | `goinhomejustadopted.webp` | Support a transport seat → `/donate` |
| `story_luna` | Sweet Luna found her family | `happyboy.webp` | Meet adoptable dogs → `/adopt` |
| `story_chopper` | Chopper needs a foster home | `chopper.webp` | Apply to foster → `modal:foster` |

**D1 block IDs:** `pcb_comm_story_transport`, `pcb_comm_story_luna`, `pcb_comm_story_chopper`  
**Section ID:** `ps_community_stories`

To add a story: insert row in `cms_page_content_blocks` with `section_key = 'community_stories'`, then Publish Live.

---

### `community_testimonial` — type: `text_image`

| Field | Value |
|-------|-------|
| eyebrow | Real Impact |
| heading | Quote (full sentence) |
| body | Attribution line |
| image_url | `https://assets.companionsofcaddo.org/media/team/thefounders.webp` |

**Section ID:** `ps_community_testimonial`

---

### `community_cta` — type: `cta_banner`

| Field | Value |
|-------|-------|
| eyebrow | Get Involved |
| heading | There's a role for everyone. |
| subheading | Whether you foster, donate, share, or volunteer… |
| cta_label | See Available Dogs → `/adopt` |
| cta_secondary_label | Apply to Foster → `modal:foster` |

---

### Hidden: `community_fb_posts`

Set `is_visible = 1` and add `config_json.embed_html` with Facebook Page Plugin when ready.  
Block `blk_comm_fb_intake_20260611` exists for future curated embed fallback.

---

## D1 tables

| Table | Role |
|-------|------|
| `cms_pages` | Row `page_community`, route `/community` |
| `cms_page_sections` | One row per section (`ps_community_*`) |
| `cms_page_content_blocks` | Cards within connect + stories sections (`pcb_community_*`, `pcb_comm_story_*`) |
| `cms_assets` | Image registry for dashboard picker |

**Tenant:** always `tenant_companionscpas`

---

## R2 paths

| Asset | R2 key |
|-------|--------|
| Page HTML artifact | `static/pages/community/index.html` |
| Section fragments | `static/pages/community/{section_key}.html` |
| Global CSS | `static/global/shared.css` (source: `public/_shared.css`) |
| Global JS | `static/global/cpas-modals.js`, `static/global/shared.js` |
| Images (CDN) | `https://assets.companionsofcaddo.org/media/...` |

**Bucket:** `companionscpas`  
**KV cache key:** `page:/community`

---

## Content edit workflow (for agents)

```bash
# 1. Edit D1 (example)
npx wrangler d1 execute companionscpas --remote --command "UPDATE cms_page_content_blocks SET image_url='https://assets.companionsofcaddo.org/media/animals/pup.webp' WHERE id='pcb_comm_story_luna'"

# 2. Regenerate fragments + bust cache
node scripts/sync-page-fragments.mjs /community

# 3. Or use Dashboard → Community → Publish Live
```

**Image rule:** Use full CDN URLs `https://assets.companionsofcaddo.org/media/...` or upload via Dashboard → CMS → Images.

**CTA rule:** Use `modal:foster`, `modal:volunteer`, `modal:contact` for popups; `/adopt`, `/donate` for page links.

---

## Migration reference

Initial refresh: `db/migrations/20260615_community_page_refresh.sql`
