#!/usr/bin/env node
/**
 * Render /adopt + moved /services sections to /tmp for R2 upload.
 * Usage: node scripts/ops/publish_adopt_fragments.mjs
 */
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { renderSection } from "../../src/api/render_section.js";
import { renderShelterHub } from "../../src/api/render_shelter_hub.js";

const OUT = "/tmp/adopt-fragments";
mkdirSync(OUT, { recursive: true });

const adoptHero = {
  section_key: "adopt_hero",
  section_type: "hero",
  eyebrow: "Open Your Home · Caddo Parish",
  heading: "A short-term foster can change everything.",
  subheading:
    "Fostering gives a dog safety, stability, and time. Whether a dog is waiting for transport, recovering from care, or just needs a break from the shelter — a temporary home helps them reach the next step.",
  image_url: "https://assets.companionsofcaddo.org/media/animals/bigsmiles.webp",
  cta_label: "Apply to Foster",
  cta_href: "modal:foster",
  cta_secondary_label: "See Dogs Needing Foster",
  cta_secondary_href: "https://caddo.gov/dogs/",
};

const adoptMission = {
  section_key: "adopt_mission",
  section_type: "text_image",
  eyebrow: "Caddo Parish · Volunteer Powered",
  heading: "We amplify what the shelter needs most.",
  body:
    "Companions of CPAS is not an adoption center. We are the bridge between a dog stuck at Caddo Parish Animal Services and the rescue, foster, or family that can say yes. We fund care, open transport pathways, coordinate fosters, and make sure dogs get seen — because visibility, time, and one person saying yes is often all the difference.",
  image_url: "https://assets.companionsofcaddo.org/media/team/theteam.webp",
  cta_label: "See Dogs Available",
  cta_href: "https://caddo.gov/dogs/",
};

const adoptableDogsBlocks = [
  {
    block_key: "dogs",
    title: "Adoptable Dogs",
    body: "See every dog currently available for adoption at Caddo Parish Animal Services.",
    image_url: "https://assets.companionsofcaddo.org/static/cms/uploads/2026/06/1781746535540-snow-dog-adoption.jpg",
    action_label: "View Dogs",
    action_value: "https://caddo.gov/dogs/",
  },
  {
    block_key: "cats",
    title: "Adoptable Cats",
    body: "See every cat currently available for adoption at Caddo Parish Animal Services.",
    image_url: "https://assets.companionsofcaddo.org/static/cms/uploads/2026/06/1781746305687-dragonfly-male-kitten.jpg",
    action_label: "View Cats",
    action_value: "https://caddo.gov/cats/",
  },
  {
    block_key: "lostfound",
    title: "Lost & Found",
    body: "Missing a pet? Check the shelter's daily intake list to see if they've been found.",
    image_url: "https://assets.companionsofcaddo.org/static/cms/uploads/2026/06/1781746812992-Ruby-lostnfound.jpg",
    action_label: "Search Lost & Found",
    action_value: "https://caddo.gov/lost/",
  },
];

const adoptableDogs = {
  section_key: "adoptable_dogs",
  section_type: "feature_cards",
  eyebrow: "Find Your New Best Friend",
  heading: "Looking to adopt, or missing a pet?",
  subheading:
    "Companions of CPAS does not run the shelter -- Caddo Parish Animal Services does. Browse their adoptable animals directly, or check if your missing pet has been found.",
};

const files = {
  adopt_hero: renderSection(adoptHero),
  adopt_mission: renderSection(adoptMission),
  adoptable_dogs: renderSection(adoptableDogs, adoptableDogsBlocks),
  adoption_next_steps: renderShelterHub({ section_key: "adoption_next_steps" }),
  services_hero: "<!-- cms: section hidden -->",
  services_mission: "<!-- cms: section hidden -->",
};

for (const [key, html] of Object.entries(files)) {
  const path = join(OUT, `${key}.html`);
  writeFileSync(path, html);
  console.log("wrote", path, html.length, "bytes");
}
