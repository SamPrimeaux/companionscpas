# Companions of CPAS — Brand Pack
> SSOT for all design, CMS, and agent decisions on companionsofcaddo.org.
> Last updated: 2026-07-07 · Maintained by Inner Animal Media

---

## Identity

| Field | Value |
|-------|-------|
| Legal name | Companions of CPAS |
| DBA | Companions of Caddo |
| Type | 501(c)(3) Nonprofit |
| EIN | 88-4156327 |
| Parish | Caddo Parish, Louisiana |
| City | Shreveport, LA |
| Email | companionsCPAS@gmail.com |
| Mailing | PO Box — pending (no private home address on site) |
| Website | https://companionsofcaddo.org |
| Facebook | https://www.facebook.com/people/Companions-of-CPAS/100069291576354 |
| Instagram | https://www.instagram.com/companionscpas |
| Facebook handle | @companionscpas |

---

## Mission Statement
> Official bylaw text confirmed by Lori (board):

"To promote, educate, and advocate the animals at Caddo Parish Animal Services (CPAS) in order to achieve a positive outcome. Our organization works to achieve this by heavily networking the animals, providing medical care for emergency cases, raising donations, educating the public, assisting in transports conducted by shelter staff, enrichment, and other needs where the shelter needs assistance to positively help all animals at the CPAS open-intake shelter to the best of our abilities."

**Short form (for hero sub / footer):**
"Volunteer-powered rescue support helping dogs at Caddo Parish Animal Services receive medical care, transport pathways, and second chances."

**⚠ Do not describe Companions of CPAS as the shelter.** They are a support org — they do not own or claim animals.

---

## Nondiscrimination Policy
> Pending — Lori to provide text. Placeholder section on /about page.

---

## Core Activities (mission pillars)
1. **Networking** — sharing animals across rescue networks to find placements
2. **Medical care** — emergency vet funding for at-risk animals
3. **Transport** — coordinating shelter-to-rescue transports (recurring Friday runs)
4. **Fundraising** — donations, events (poker run, wet dog contest)
5. **Education** — public awareness about CPAS open-intake shelter
6. **Enrichment** — shelter enrichment support

---

## Logo

**Files in repo:**
- `logos/companionsofcpa-newlogo.webp` — primary logo (light bg)
- `logos/companionsofcpa-newlogo-512x512.png` — square PNG
- `public/assets/branding/logo-dark.webp` — dark bg version

**CDN (Cloudflare Images):**
- Light bg: `https://imagedelivery.net/g7wf09fCONpnidkRnR_5vw/9a00de35-fa41-49da-e431-a5f004cf5e00/avatar`
- Dark bg: `https://imagedelivery.net/g7wf09fCONpnidkRnR_5vw/b82e15b1-05e1-454c-85ca-a92f8eee2100/avatar`

**Logo anatomy:**
- Dog silhouette — purple `#7B2FBE`
- Cat silhouette — red `#C8373A`
- Wordmark — black script "Companions" + spaced sans "OF CPAS"
- Stars strip — red `#C8373A` (11 stars)
- Frame — thin black border rectangle
- Background gradient (brand color identity) — purple `#7B2FBE` → pink/mauve `#C47DB0` → red-coral `#C8373A`

**Logo width on site:** 140px header / 120px footer

---

## Color System

### Primary Palette

| Role | Name | Hex | Usage |
|------|------|-----|-------|
| Primary | Dog Purple | `#7B2FBE` | CTAs, active nav, section headings, badges |
| Accent | Cat Red | `#C8373A` | Stars, secondary CTAs, alerts, highlights |
| Deep | Near-Black Plum | `#1a0a24` | Dark header bg, contrast text |
| Soft | Lavender Cream | `#f7f2f9` | Page backgrounds, hero bg, card fills |
| Warm | Blush Pink | `#f0e6fa` | Badge backgrounds, tag fills |
| Muted | Dusty Mauve | `#C47DB0` | Gradient midpoint, decorative |

### Extended / Gradient
```
Brand gradient: #7B2FBE → #C47DB0 → #C8373A
Facebook cover gradient: left-purple → center-mauve → right-coral
```

### D1 Current Values (cms_brand_settings)
```
primary_color:   #7c3aed  ← needs update to #7B2FBE
secondary_color: #172033
accent_color:    #ee2336  ← needs update to #C8373A
```
> Run migration to update primary/accent to exact logo values.

---

## Typography

### Current font (active_font_preset: playfair_inter)
| Role | Font | Weight |
|------|------|--------|
| Display / Headlines | Playfair Display | 700, 900 |
| Body | Inter | 300, 400, 500, 600 |

### Recommended direction
| Option | Headline | Body | Feel |
|--------|----------|------|------|
| **A — Warmest** | Lora | Nunito | Community, approachable, elderly-friendly |
| **B — Editorial** | Fraunces | DM Sans | Impact, nonprofit urgency, modern |
| **C — Current** | Playfair Display | Inter | Classic, grant-ready, formal |

Recommendation: **Lora + Nunito** for client-managed CMS (most readable at all sizes, warm, not corporate). Switch via Brand & Settings → Font in dashboard.

---

## Three Brand Concept Directions

### Concept A — Deep Plum (Classic & Trustworthy)
- Primary bg: `#f7f2f9` lavender cream
- Hero heading color: `#2a0a36`
- CTA primary: `#6b2d8b` solid pill
- CTA ghost: white + `#c9a0dc` border
- Stats bar: solid `#6b2d8b` background
- Font: Playfair Display + Inter
- Best for: grant applications, older donor base, formal communications

### Concept B — Bold Contrast (Modern & Urgent)
- Primary bg: `#fff8f5` warm white
- Header/strip: `#1a0a24` near-black
- Accent: `#C8373A` red on dark strip
- CTA primary: `#1a0a24` dark solid
- Font: Fraunces + DM Sans
- Best for: social sharing, transport announcements, fundraising pushes, younger audience
- Includes event announcement strip (transport dates, wet dog contest, poker run)

### Concept C — Warm Lavender (Community & Heart) ⭐ Recommended
- Primary bg: `#fdf6ff` soft lavender
- Badge/pill fills: `#f0e6fa`
- CTA primary: `#7B2FBE` rounded pill
- CTA ghost: transparent + `#c9a0dc` border
- Mission text visible above fold as italic pull quote
- Activity pills: Medical · Transport · Rescue Network · Enrichment
- Photo card with rotating seal badge
- Font: Lora + Nunito
- Best for: elderly client self-management, warmest feel, mission-first layout

---

## Navigation

| Label | Route | Notes |
|-------|-------|-------|
| Home | `/` | |
| About | `/about` | Mission + team photo |
| Adopt | `/adopt` | Animal grid |
| Foster | `/services` | Label is Foster, route is /services |
| Community | `/community` | Hidden from nav — pending content |
| Donate | `/donate` | CTA button style |
| Contact | `/contact` | |

---

## CMS Section Map (current)

### Home (`/`)
`hero` → `mission` → `how_it_helps` → `newsletter` → `transport_win` → `campaigns`

### About (`/about`)
`hero` → `why_we_exist` → `paths` → `campaigns` → `cta`
> Needs: mission statement section between hero and why_we_exist

### Pages needing content pass
| Page | Status | Notes |
|------|--------|-------|
| `/about` | 🟡 In progress | Add mission section, update hero image layout |
| `/adopt` | 🟡 In progress | Replace Apply to Foster → Contact Us modal |
| `/contact` | 🟡 In progress | |
| `/donate` | 🔴 Sections mismatch live site | Needs audit |
| `/community` | 🔴 Hidden | Hide from nav, redirect CTAs |

---

## Upcoming Events (add to calendar)
- Transport run — this Friday at 8:30am (recurring)
- Wet dog contest — TBD
- Poker run fundraiser — TBD

---

## Tone & Voice

| Do | Don't |
|----|-------|
| "We step in where support matters most" | "We rescue dogs" (they are not a rescue) |
| "Giving dogs a second chance" | "Saving dogs" (overstates their role) |
| "Volunteer-powered" | "Staff" (100% volunteer) |
| "Caddo Parish Animal Services" | "the pound" or "the kill shelter" |
| Warm, community language | Corporate, clinical language |

**Key phrases confirmed by board:**
- "Giving Caddo dogs the second chance they might not get otherwise"
- "Every dog deserves a way out"
- "100% Volunteer-Based"
- "Caddo Parish · Volunteer-Powered"

---

## Dev Notes (IAM)

```
Worker:        companionscpas
D1:            companionscpas (fd6dd6fb-156b-4b6a-8ff0-505422652391)
R2:            companionscpas
KV:            CMS_CACHE (0b410337a8494fc982ea04c5bde1eab4)
CDN:           https://assets.companionsofcaddo.org
CF Images CDN: https://imagedelivery.net/g7wf09fCONpnidkRnR_5vw/
Tenant ID:     tenant_companionscpas
Deploy:        cd ~/companionscpas && npm run deploy:full
Remote deploy: GCP lane — git pull + npm run deploy:full (fixed sed cross-platform issue 2026-07-07)
```

**Content change pipeline:**
Edit in dashboard → Save Draft → Publish Live → D1 → R2 fragment bake → KV bust → live in ~5s

**Never:** hand-edit R2 HTML artifacts, hardcode Stripe keys, deploy from IAM platform worker

---

*Brand pack created 2026-07-07 by Inner Animal Media (Sam Primeaux)*
*Pending: Lori's nondiscrimination policy text, PO Box address, Stripe live key sign-off*
