/**
 * Demo fixtures for CMS section template previews.
 * Approximate sample content — enough to judge layout, not production copy.
 */

const STOCK = {
  dogWater:
    "https://assets.companionsofcaddo.org/static/cms/uploads/2026/07/1784219444043-wet-dog-comp..jpg",
  dogPortrait:
    "https://assets.companionsofcaddo.org/media/campaign/campaign_wet-dog-competition-entry_1782850774741/entries/entry_a991e99e42a945ebbdb243088a4f6824/inbound1060227879772837271.jpg",
  dogPlay:
    "https://assets.companionsofcaddo.org/media/campaign/campaign_wet-dog-competition-entry_1782850774741/entries/entry_7d1b5cf9d1dd487086ffa6d30316061d/IMG_7503.jpeg",
  dogSit:
    "https://assets.companionsofcaddo.org/media/campaign/campaign_wet-dog-competition-entry_1782850774741/entries/entry_fc40e850b73043d7a2d6cf38dcf40878/IMG_6830.jpeg",
};

function block(key, fields = {}, sort = 10) {
  return {
    block_key: key,
    sort_order: sort,
    title: fields.title || "",
    body: fields.body || "",
    image_url: fields.image_url || "",
    image_alt: fields.image_alt || fields.title || "",
    config_json: JSON.stringify(fields.config || {}),
  };
}

function baseSection(type, brand, overrides = {}) {
  const logo = brand?.logo_light_url || brand?.logo_url || "";
  return {
    section_key: `preview_${type}`,
    section_type: type,
    page_route: "/",
    eyebrow: overrides.eyebrow ?? "Companions of CPAS",
    heading: overrides.heading ?? type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    subheading: overrides.subheading ?? "",
    body: overrides.body ?? "",
    image_url: overrides.image_url ?? STOCK.dogWater,
    cta_label: overrides.cta_label ?? "Primary action",
    cta_href: overrides.cta_href ?? "/adopt",
    cta_secondary_label: overrides.cta_secondary_label ?? "Secondary",
    cta_secondary_href: overrides.cta_secondary_href ?? "/donate",
    is_visible: 1,
    config_json:
      typeof overrides.config_json === "string"
        ? overrides.config_json
        : JSON.stringify(overrides.config || {}),
    _logo_fallback: logo,
  };
}

/** Per-type demo section + blocks for preview renders. */
export function buildSectionPreviewFixture(type, brand = {}) {
  const t = String(type || "").trim().toLowerCase();

  switch (t) {
    case "hero":
      return {
        section: baseSection(t, brand, {
          eyebrow: "Adopt · Foster · Give",
          heading: "Every animal deserves a second chance",
          subheading: "Companions of CPAS helps dogs and cats find foster and forever homes in Caddo Parish.",
          body: "",
          image_url: STOCK.dogWater,
          cta_label: "Meet the dogs",
          cta_href: "/adopt",
          cta_secondary_label: "Donate",
          cta_secondary_href: "/donate",
          config: { hero_layout: "contained_split", media_fit: "cover", media_width: 48 },
        }),
        blocks: [],
      };

    case "text_image":
      return {
        section: baseSection(t, brand, {
          heading: "Why fostering matters",
          body: "Foster homes give shelter animals room to decompress, heal, and learn what a family feels like — so they’re ready for adoption.",
          image_url: STOCK.dogPortrait,
          cta_label: "Become a foster",
          cta_href: "/fosters",
          cta_secondary_label: "",
        }),
        blocks: [],
      };

    case "feature_cards":
      return {
        section: baseSection(t, brand, {
          heading: "Ways to help",
          subheading: "Pick the path that fits you — every action moves an animal closer to home.",
          image_url: "",
        }),
        blocks: [
          block("card_adopt", { title: "Adopt", body: "Browse adoptable dogs and start an application.", image_url: STOCK.dogSit }, 10),
          block("card_foster", { title: "Foster", body: "Open your home for a short stay while we find forever.", image_url: STOCK.dogPortrait }, 20),
          block("card_donate", { title: "Donate", body: "Fund medical care, transport, and daily necessities.", image_url: STOCK.dogPlay }, 30),
        ],
      };

    case "cta_banner":
      return {
        section: baseSection(t, brand, {
          heading: "Ready to change a life today?",
          subheading: "Adoption applications and donations take minutes.",
          body: "",
          image_url: "",
          cta_label: "Adopt now",
          cta_href: "/adopt",
          cta_secondary_label: "Give",
          cta_secondary_href: "/donate",
        }),
        blocks: [],
      };

    case "campaign_grid":
    case "fundraising":
      return {
        section: baseSection(t, brand, {
          heading: "Active campaigns",
          subheading: "Sample fundraising cards — live campaigns load from the dashboard.",
          image_url: "",
        }),
        blocks: [
          block("camp_a", { title: "Medical fund", body: "Help cover urgent vet care for intake animals.", image_url: STOCK.dogSit }, 10),
          block("camp_b", { title: "Transport & supplies", body: "Gas, crates, and food for rescue runs.", image_url: STOCK.dogPlay }, 20),
        ],
      };

    case "foster_grid":
      return {
        section: baseSection(t, brand, {
          heading: "Dogs who need a foster",
          subheading: "Sample foster cards — live lists pull from animal profiles.",
          image_url: "",
          cta_label: "Apply to foster",
          cta_href: "/fosters",
        }),
        blocks: [
          block("foster_a", { title: "Biscuit", body: "Friendly · needs quiet home", image_url: STOCK.dogPortrait }, 10),
          block("foster_b", { title: "Maple", body: "Playful · great with kids", image_url: STOCK.dogPlay }, 20),
          block("foster_c", { title: "Scout", body: "Calm · crate trained", image_url: STOCK.dogSit }, 30),
        ],
      };

    case "animal_grid":
      return {
        section: baseSection(t, brand, {
          heading: "Adoptable friends",
          subheading: "Sample grid layout — prefer Live Animal Gallery for real profiles.",
          image_url: "",
        }),
        blocks: [
          block("an_a", { title: "Finn", body: "2 yrs · male · playful", image_url: STOCK.dogPortrait }, 10),
          block("an_b", { title: "Mila", body: "1 yr · female · gentle", image_url: STOCK.dogPlay }, 20),
          block("an_c", { title: "Maddox", body: "3 yrs · male · loyal", image_url: STOCK.dogSit }, 30),
          block("an_d", { title: "Harper", body: "4 yrs · female · calm", image_url: STOCK.dogWater }, 40),
        ],
      };

    case "testimonials":
    case "testimonial":
      return {
        section: baseSection(t, brand, {
          heading: "From our community",
          subheading: "",
          body: "",
          image_url: STOCK.dogPortrait,
        }),
        blocks: [
          block("quote_1", {
            title: "Sarah M.",
            body: "“Fostering with Companions was the best decision we made. Clear support and a happy ending for our pup.”",
            image_url: STOCK.dogSit,
          }, 10),
          block("quote_2", {
            title: "James R.",
            body: "“The adoption process was straightforward and the team actually knew our dog’s personality.”",
            image_url: STOCK.dogPlay,
          }, 20),
        ],
      };

    case "contact_hero":
      return {
        section: baseSection(t, brand, {
          heading: "Get in touch",
          subheading: "Questions about adopting, fostering, or volunteering? We’re here.",
          body: "",
          image_url: STOCK.dogWater,
          cta_label: "Send a message",
          cta_href: "#contact-form",
          cta_secondary_label: "",
        }),
        blocks: [],
      };

    case "contact_form":
      return {
        section: baseSection(t, brand, {
          heading: "Send us a message",
          subheading: "We’ll reply as soon as we can.",
          body: "",
          image_url: "",
        }),
        blocks: [],
      };

    case "contact_team":
      return {
        section: baseSection(t, brand, {
          heading: "Our team",
          subheading: "Volunteers and board members keeping Companions running.",
          image_url: STOCK.dogPlay,
        }),
        blocks: [
          block("tm_a", { title: "Alex", body: "Volunteer coordinator" }, 10),
          block("tm_b", { title: "Jordan", body: "Foster support" }, 20),
          block("tm_c", { title: "Sam", body: "Outreach" }, 30),
        ],
      };

    case "contact_socials":
      return {
        section: baseSection(t, brand, {
          heading: "Find us",
          subheading: "Email, location, and socials.",
          image_url: "",
        }),
        blocks: [
          block("info_email", { title: "Email", body: "companionsCPAS@gmail.com" }, 10),
          block("info_loc", { title: "Location", body: "Caddo Parish, Louisiana" }, 20),
          block("info_org", { title: "Organization", body: "Companions of CPAS" }, 30),
        ],
      };

    case "campaign_entry_hero":
      return {
        section: baseSection(t, brand, {
          heading: "Wet Dog Competition",
          subheading: "Enter your pup, share, and help raise funds for shelter animals.",
          body: "Sample campaign entry hero — live section uses the selected fundraising campaign.",
          image_url: STOCK.dogWater,
          cta_label: "Enter now",
          cta_href: "#enter",
          config: {
            campaign_id: "campaign_wet-dog-competition-entry_1782850774741",
            entry_fee_cents: 1000,
          },
        }),
        blocks: [],
      };

    case "wet_dog_competition":
      return {
        section: baseSection(t, brand, {
          heading: "Vote for your favorite",
          subheading: "Sample gallery layout — live entries load when payment is complete.",
          image_url: "",
          config: { campaign_id: "campaign_wet-dog-competition-entry_1782850774741" },
        }),
        blocks: [],
      };

    case "adopt_live_gallery":
      return {
        section: baseSection(t, brand, {
          heading: "Adoptable dogs",
          subheading: "Live gallery pulls from the Animals dashboard when published on a page.",
          image_url: "",
        }),
        blocks: [],
      };

    case "content":
      return {
        section: baseSection(t, brand, {
          heading: "Flexible content block",
          body: "Use this for simple copy sections — announcements, policies, or short stories without a fixed layout.",
          image_url: "",
          cta_label: "",
          cta_secondary_label: "",
        }),
        blocks: [],
      };

    default:
      return {
        section: baseSection(t, brand, {
          heading: t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          subheading: "Live render of this section template (sample content).",
          body: "Add this section to a page to edit real copy and media.",
          image_url: STOCK.dogWater || brand?.logo_light_url || "",
        }),
        blocks: [],
      };
  }
}

/** Category + icon metadata for Templates canvas (server SSOT alongside ADDABLE_SECTION_TYPES). */
export const SECTION_TEMPLATE_META = {
  donate_payment_hero: { category: "giving", icon: "dollar" },
  campaign_entry_hero: { category: "giving", icon: "sparkles" },
  wet_dog_competition: { category: "giving", icon: "heart" },
  adopt_live_gallery: { category: "animals", icon: "paw" },
  hero: { category: "structure", icon: "home" },
  text_image: { category: "content", icon: "image" },
  feature_cards: { category: "content", icon: "layers" },
  cta_banner: { category: "structure", icon: "sparkles" },
  campaign_grid: { category: "giving", icon: "dollar" },
  foster_grid: { category: "animals", icon: "heart" },
  testimonials: { category: "social", icon: "people" },
  testimonial: { category: "social", icon: "people" },
  contact_hero: { category: "content", icon: "mail" },
  contact_form: { category: "content", icon: "docs" },
  contact_team: { category: "content", icon: "people" },
  contact_socials: { category: "content", icon: "home" },
  animal_grid: { category: "animals", icon: "paw" },
  content: { category: "content", icon: "docs" },
};

export const FORM_TEMPLATE_ENTRIES = [
  {
    type: "contact",
    label: "Contact Us Modal",
    category: "forms",
    kind: "form",
    icon: "mail",
    desc: "Reusable Get in Touch modal — edit fields in Forms",
    formId: "form_contact_request",
  },
  {
    type: "foster_application",
    label: "Foster Application",
    category: "forms",
    kind: "form",
    icon: "heart",
    desc: "Multi-step foster apply modal — edit in Forms",
    formId: "form_foster_application",
  },
];
