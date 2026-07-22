/**
 * Single section-type catalog for the CMS pipeline.
 * Shared types are the default; Home and About keep approved branded HTML
 * via section_key overrides, with data-cms-field hooks for editor isolation.
 */
import { renderSection } from "./render_section.js";
import { renderHomeFragment } from "./render_home_section.js";
import { renderAboutFragment } from "./render_about_section.js";
import { renderDonateV2Section, isDonateV2SectionType } from "./render_donate_v2.js";
import { renderCampaignTransportHero } from "./render_campaign_transport_hero.js";
import { renderCampaignEntryHero } from "./render_campaign_entry_hero.js";
import { renderWetDogGallery } from "./render_wet_dog_gallery.js";
import { renderAdoptAnimalGallery } from "./render_adopt_gallery.js";
import {
  renderContactHero,
  renderContactSocials,
  renderContactForm,
  renderContactTeam,
  CONTACT_FORM_SCRIPT,
} from "./render_contact_sections.js";
import { renderRawHtml } from "./render_raw_html.js";

const TENANT_ID = "tenant_companionscpas";

/** D1 DISTINCT section_type values (2026-07-10) — every key must resolve. */
export const D1_SECTION_TYPES = [
  "animal_grid",
  "campaign_entry_hero",
  "campaign_grid",
  "campaign_transport_hero",
  "contact_form",
  "contact_hero",
  "contact_socials",
  "contact_team",
  "content",
  "cta_banner",
  "donate_campaign_grid",
  "donate_contact",
  "donate_freedom_hero",
  "donate_medical_story",
  "donate_stories_help",
  "facebook_embeds",
  "feature_cards",
  "footer",
  "foster_grid",
  "fundraising",
  "hero",
  "home_newsletter",
  "home_pillars",
  "home_stats",
  "home_story",
  "nav",
  "org_info",
  "raw_html",
  "shelter_hub",
  "testimonial",
  "testimonials",
  "text_image",
  "wet_dog_competition",
  "adopt_live_gallery",
];

function normalizeRoute(route) {
  const raw = String(route || "").trim();
  if (!raw || raw === "/") return "/";
  let n = raw.startsWith("/") ? raw : `/${raw}`;
  if (n.length > 1) n = n.replace(/\/+$/, "");
  return n;
}

function escapeHtml(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Preview-visible stub — never silent blank on live (comment only when not preview). */
export function renderMissingTypeStub(sectionType, { preview = false } = {}) {
  const type = escapeHtml(sectionType || "unknown");
  if (preview) {
    return `<section class="cms-missing-section" data-section-type="${type}" style="margin:1rem;padding:1.25rem;border:2px dashed #c026d3;border-radius:12px;background:#fdf4ff;color:#86198f;font-family:system-ui,sans-serif">
  <strong>Missing renderer:</strong> <code>${type}</code>
  <div style="margin-top:0.35rem;font-size:0.9rem">This section type is in D1 but has no catalog renderer yet.</div>
</section>`;
  }
  return `<!-- cms: missing renderer for section_type=${type} -->`;
}

async function renderViaHomeKey(section, blocks, env) {
  const html = await renderHomeFragment(env, section, blocks);
  return html || null;
}

function renderViaAboutKey(section, blocks) {
  return renderAboutFragment(section, blocks);
}

async function renderGeneric(section, blocks, brand, env) {
  return String(renderSection(section, blocks, brand, env) || "");
}

/**
 * Resolve renderer for a section row.
 * Order: contact → donate v2 → campaign specials → home key overrides →
 * about key overrides (approved HTML) → typed home_* → generic → stub.
 */
export async function renderSectionByType(section, blocks = [], brand = {}, env = null, opts = {}) {
  const preview = opts.preview === true;
  const type = String(section?.section_type || "").trim().toLowerCase();
  const key = String(section?.section_key || "").trim();
  const route = normalizeRoute(section?.page_route || opts.route || "/");

  if (!type) return renderMissingTypeStub("unknown", { preview });

  // Global chrome rows are not page body sections
  if (type === "nav" || type === "footer" || route === "global") {
    return "<!-- cms: global partial skipped in page body -->";
  }

  if (Number(section?.is_visible) === 0 && !opts.includeHidden) {
    return "<!-- cms: section hidden -->";
  }

  try {
    // Custom Code — fetch remote HTML by config.source_url (any page route)
    if (type === "raw_html") {
      return String(await renderRawHtml(section, blocks, brand, env, { preview }) || "");
    }

    // Plain content (non-About). About mission_statement uses branded fragment below.
    if (type === "content" && !(route === "/about" && key === "mission_statement")) {
      const eyebrow = String(section?.eyebrow || "").trim();
      const heading = String(section?.heading || "").trim().replace(/<[^>]+>/g, "");
      const body = String(section?.body || section?.subheading || "").trim().replace(/<[^>]+>/g, "");
      const sk = escapeHtml(String(section?.section_key || "content"));
      return `<section class="section s-light" data-section-key="${sk}" data-cpas-section="${sk}">
  <div class="container" style="max-width:42rem">
    ${eyebrow ? `<div class="ey-purple" data-cms-field="eyebrow">${escapeHtml(eyebrow)}</div>` : ""}
    ${heading ? `<h2 class="mission-heading" data-cms-field="heading">${escapeHtml(heading)}</h2>` : ""}
    ${body ? `<p class="mission-body" data-cms-field="body" style="line-height:1.7;color:var(--text-2)">${escapeHtml(body)}</p>` : ""}
  </div>
</section>`;
    }
    if (type === "contact_hero") return renderContactHero(section, blocks, brand, env);
    if (type === "contact_socials") return renderContactSocials(section, blocks, brand, env);
    if (type === "contact_form") return renderContactForm(section, blocks, brand, env);
    if (type === "contact_team") return renderContactTeam(section, blocks, brand, env);

    if (isDonateV2SectionType(type)) {
      return String(await renderDonateV2Section(section, blocks, brand, env) || "");
    }
    if (type === "campaign_transport_hero") {
      return String(await renderCampaignTransportHero(section, blocks, brand, env) || "");
    }
    if (type === "campaign_entry_hero") {
      return String(await renderCampaignEntryHero(section, blocks, brand, env) || "");
    }
    if (type === "wet_dog_competition") {
      return String(await renderWetDogGallery(section, blocks, brand, env) || "");
    }
    if (type === "adopt_live_gallery") {
      return String(await renderAdoptAnimalGallery(section, blocks, brand, env) || "");
    }

    // Home: custom fragments keyed by section_key
    if (route === "/") {
      const homeKeys = new Set([
        "hero", "mission", "how_it_helps", "transport_win",
        "impact_stats", "campaigns", "newsletter",
      ]);
      if (homeKeys.has(key)) {
        const html = await renderViaHomeKey(section, blocks, env);
        if (html) return html;
      }
      if (type === "home_pillars" || type === "home_story" || type === "home_stats" || type === "home_newsletter") {
        const html = await renderViaHomeKey(section, blocks, env);
        if (html) return html;
      }
    }

    // About: approved branded HTML by section_key (editable via data-cms-field)
    if (route === "/about") {
      const aboutKeys = new Set([
        "mission_statement", "hero", "why_we_exist", "paths", "campaigns", "cta",
      ]);
      if (aboutKeys.has(key)) {
        const html = renderViaAboutKey(section, blocks);
        if (html) return html;
      }
    }

    // Typed home_* even if somehow on another route
    if (type === "home_pillars" || type === "home_story" || type === "home_stats" || type === "home_newsletter") {
      const html = await renderViaHomeKey(section, blocks, env);
      if (html) return html;
    }

    const generic = await renderGeneric(section, blocks, brand, env);
    if (generic && !generic.includes("Unsupported section type")) return generic;

    return renderMissingTypeStub(type, { preview });
  } catch (err) {
    const msg = escapeHtml(err?.message || String(err));
    if (preview) {
      return `<section class="cms-missing-section" style="margin:1rem;padding:1.25rem;border:2px solid #dc2626;border-radius:12px;background:#fef2f2;color:#991b1b;font-family:system-ui,sans-serif">
  <strong>Render error:</strong> <code>${escapeHtml(type)}</code>
  <div style="margin-top:0.35rem;font-size:0.9rem">${msg}</div>
</section>`;
    }
    return `<!-- cms: render error section_type=${escapeHtml(type)} ${msg} -->`;
  }
}

/** Types shown in dashboard Add Section (safe generic + contact + common). */
export const ADDABLE_SECTION_TYPES = [
  { type: "donate_payment_hero", label: "Donate Payment Hero", desc: "Split give hero — D1 payment methods (Zeffy, PayPal, Venmo, Amazon, Stripe)" },
  { type: "campaign_entry_hero", label: "Campaign Entry Hero", desc: "Split campaign hero with entry and sharing actions" },
  { type: "wet_dog_competition", label: "Competition Vote Gallery", desc: "Side-by-side entry gallery with public voting and sharing" },
  { type: "adopt_live_gallery", label: "Live Animal Gallery", desc: "Adoptable dogs pulled live from the Animals dashboard" },
  { type: "hero", label: "Hero", desc: "Headline, image, and CTAs" },
  { type: "text_image", label: "Text + Image", desc: "Story block with optional media" },
  { type: "feature_cards", label: "Feature Cards", desc: "Card grid for services or benefits" },
  { type: "cta_banner", label: "CTA Banner", desc: "High-emphasis call to action" },
  { type: "campaign_grid", label: "Campaign Grid", desc: "Fundraising campaign cards" },
  { type: "foster_grid", label: "Foster Grid", desc: "Foster / animal focused grid" },
  { type: "testimonials", label: "Testimonials", desc: "Quotes and social proof" },
  { type: "contact_hero", label: "Contact Hero", desc: "Contact page opener with social pills" },
  { type: "contact_form", label: "Contact Form", desc: "Message form" },
  { type: "contact_team", label: "Team", desc: "Group photo + member list" },
  { type: "contact_socials", label: "Contact Info Cards", desc: "Email, location, org cards" },
  { type: "raw_html", label: "Custom Code", desc: "Paste HTML or embed from a URL" },
];

export function pageNeedsContactFormScript(sections = []) {
  return (sections || []).some((s) => String(s.section_type || "").toLowerCase() === "contact_form" && Number(s.is_visible) !== 0);
}

export { CONTACT_FORM_SCRIPT, TENANT_ID };
