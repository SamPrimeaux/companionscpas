import { COMPONENT_ICONS } from "./cms_components.js";
import { safeJson } from "./render_section.js";

const CDN = "https://assets.companionsofcaddo.org";
const DEFAULT_TEAM_PHOTO = `${CDN}/static/pages/about/theteam.webp`;
const DEFAULT_MEMBERS = [
  { name: "Michelle Miller", role: "President" },
  { name: "Suzanne Zortman", role: "Treasurer" },
  { name: "Brittany Ramsey", role: "Secretary" },
  { name: "Lori Sipper", role: "Officer" },
  { name: "Krystal Leboeuf", role: "Officer" },
];

function esc(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function pick(obj, keys) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return "";
}

function cfg(section) {
  return safeJson(section?.config_json, {});
}

export function renderContactHero(section) {
  const c = cfg(section);
  const eyebrow = pick(section, ["eyebrow"]) || pick(c, ["eyebrow"]) || "Get In Touch";
  const heading = pick(section, ["heading"]) || pick(c, ["heading"]) || "We'd love to hear from you.";
  const body =
    pick(section, ["subheading"]) ||
    pick(section, ["body"]) ||
    pick(c, ["subheading"]) ||
    "Whether you want to foster, adopt, volunteer, or cheer us on — reach out. We're a small volunteer crew and we'll get back to you.";
  const image = pick(section, ["image_url"]) || pick(c, ["image_url"]) || DEFAULT_TEAM_PHOTO;
  const alt = pick(c, ["image_alt"]) || "The Companions of CPAS volunteer team";
  const fb = pick(c, ["facebook_url"]) || "https://www.facebook.com/people/Companions-of-CPAS/100069291576354/";
  const ig = pick(c, ["instagram_url"]) || "https://www.instagram.com/companionscpas";
  const fbLabel = pick(c, ["facebook_label"]) || "Facebook";
  const igLabel = pick(c, ["instagram_label"]) || "Instagram";
  const key = esc(pick(section, ["section_key"]) || "contact_hero");

  return `<section class="contact-hero section" data-section-key="${key}" data-cpas-section="contact-hero">
  <div class="container contact-hero-grid">
    <div class="contact-hero-copy">
      <p class="eyebrow" data-cms-field="eyebrow">${esc(eyebrow)}</p>
      <h1 data-cms-field="heading">${esc(heading)}</h1>
      <p data-cms-field="subheading">${esc(body)}</p>
      <div class="contact-social-actions">
        <a class="dv2-social-pill dv2-social-pill--fb" href="${esc(fb)}" target="_blank" rel="noopener noreferrer" aria-label="Follow us on Facebook">${COMPONENT_ICONS.facebook}<span>${esc(fbLabel)}</span></a>
        <a class="dv2-social-pill dv2-social-pill--ig" href="${esc(ig)}" target="_blank" rel="noopener noreferrer" aria-label="Follow us on Instagram">${COMPONENT_ICONS.instagram}<span>${esc(igLabel)}</span></a>
      </div>
    </div>
    <div class="contact-hero-photo" data-cms-field="image_url">
      <div class="contact-hero-frame contact-hero-frame--team">
        <img src="${esc(image)}" alt="${esc(alt)}" loading="eager" fetchpriority="high" decoding="async" />
      </div>
    </div>
  </div>
</section>`;
}

export function renderContactSocials(section) {
  const c = cfg(section);
  const key = esc(pick(section, ["section_key"]) || "contact_socials");
  const email = pick(c, ["email"]) || "companionsCPAS@gmail.com";
  const locationBody = pick(c, ["location_body"]) || "Caddo Parish Animal Services<br>Shreveport, Louisiana";
  const orgBody = pick(c, ["org_body"]) || "Companions of CPAS<br>501(c)(3) Tax-Exempt Nonprofit<br>EIN: 88-4156327";

  return `<section class="contact-info-section section" data-section-key="${key}" data-cpas-section="contact-socials">
  <div class="container">
    <div class="contact-info" style="display:grid;gap:1.5rem;max-width:36rem">
      <div class="contact-info-card">
        <h3>Email</h3>
        <a href="mailto:${esc(email)}">${esc(email)}</a>
      </div>
      <div class="contact-info-card">
        <h3>Where we operate</h3>
        <p>${locationBody}</p>
      </div>
      <div class="contact-info-card">
        <h3>Organization</h3>
        <p>${orgBody}</p>
      </div>
    </div>
  </div>
</section>`;
}

export function renderContactForm(section) {
  const c = cfg(section);
  const key = esc(pick(section, ["section_key"]) || "contact_form");
  const heading = pick(section, ["heading"]) || pick(c, ["heading"]) || "Send a message";
  const sub = pick(section, ["subheading"]) || pick(c, ["subheading"]) || "Tell us what brings you here and we'll follow up by email.";

  return `<section class="contact-body" data-section-key="${key}" data-cpas-section="contact-form">
  <div class="container">
    <div class="contact-form-wrap" style="max-width:40rem;margin:0 auto">
      <h2 data-cms-field="heading">${esc(heading)}</h2>
      <p class="form-sub" data-cms-field="subheading">${esc(sub)}</p>
      <form class="cf-form" id="contactForm">
        <div class="cf-row">
          <div class="cf-field">
            <label for="cf_name">Name</label>
            <input type="text" id="cf_name" name="name" placeholder="Jane Smith" required>
          </div>
          <div class="cf-field">
            <label for="cf_email">Email</label>
            <input type="email" id="cf_email" name="email" placeholder="jane@example.com" required>
          </div>
        </div>
        <div class="cf-field">
          <label for="cf_subject">I'm interested in</label>
          <select id="cf_subject" name="subject" required>
            <option value="" disabled selected>Choose a topic</option>
            <option value="fostering">Fostering a dog</option>
            <option value="adopting">Adopting a dog</option>
            <option value="volunteering">Volunteering</option>
            <option value="donating">Donations / Fundraising</option>
            <option value="media">Press / Media inquiry</option>
            <option value="other">Something else</option>
          </select>
        </div>
        <div class="cf-field">
          <label for="cf_message">Message</label>
          <textarea id="cf_message" name="message" placeholder="Tell us a bit about yourself and what brings you here…" required></textarea>
        </div>
        <button type="submit" class="btn btn-primary cf-submit" id="cfSubmit">Send message</button>
      </form>
      <div class="cf-success" id="cfSuccess">
        <div class="cf-success-icon">🐾</div>
        <div class="cf-success-title">Message sent.</div>
        <div class="cf-success-msg">A volunteer will follow up by email. Follow us on Facebook and Instagram for daily updates from the shelter.</div>
      </div>
    </div>
  </div>
</section>`;
}

export function renderContactTeam(section, blocks = []) {
  const c = cfg(section);
  const key = esc(pick(section, ["section_key"]) || "contact_team");
  const eyebrow = pick(section, ["eyebrow"]) || pick(c, ["eyebrow"]) || "The People Behind the Paws";
  const heading = pick(section, ["heading"]) || pick(c, ["heading"]) || "Meet Our Team";
  const sub = pick(section, ["subheading"]) || pick(section, ["body"]) || pick(c, ["subheading"]) || "100% volunteer-powered. Every dollar goes directly to the dogs — not overhead.";
  const image = pick(section, ["image_url"]) || pick(c, ["image_url"]) || DEFAULT_TEAM_PHOTO;
  const alt = pick(c, ["image_alt"]) || "Companions of CPAS volunteers";
  const note = pick(c, ["note"]) || "All-volunteer. Every gift funds animals, not administration.";

  let members = Array.isArray(c.members) ? c.members : null;
  if (!members?.length && blocks?.length) {
    members = [...blocks]
      .filter((b) => Number(b.is_visible) !== 0)
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
      .map((b) => ({ name: pick(b, ["title", "name"]) || "", role: pick(b, ["subtitle", "role"]) || "" }))
      .filter((m) => m.name);
  }
  if (!members?.length) members = DEFAULT_MEMBERS;

  const rows = members.map((m) => `<div class="team-member">
            <span class="team-member-name">${esc(m.name)}</span>
            <span class="team-member-role">${esc(m.role || "")}</span>
          </div>`).join("\n          ");

  return `<section class="team-section" data-section-key="${key}" data-cpas-section="contact-team">
  <div class="container">
    <div class="team-header">
      <p class="eyebrow" data-cms-field="eyebrow">${esc(eyebrow)}</p>
      <h2 data-cms-field="heading">${esc(heading)}</h2>
      <p data-cms-field="subheading">${esc(sub)}</p>
    </div>
    <div class="team-layout">
      <div class="team-photo-col" data-cms-field="image_url">
        <img src="${esc(image)}" alt="${esc(alt)}" class="team-group-photo" loading="lazy" decoding="async" />
      </div>
      <div class="team-members-col">
        <div class="team-member-list">
          ${rows}
        </div>
        <p class="team-note">${esc(note)}</p>
      </div>
    </div>
  </div>
</section>`;
}

export const CONTACT_FORM_SCRIPT = `<script>
(function() {
  var form = document.getElementById('contactForm');
  var btn = document.getElementById('cfSubmit');
  var success = document.getElementById('cfSuccess');
  if (!form) return;
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    btn.disabled = true;
    btn.textContent = 'Sending\u2026';
    var data = {
      name: form.querySelector('[name=name]').value,
      email: form.querySelector('[name=email]').value,
      subject: form.querySelector('[name=subject]').value,
      message: form.querySelector('[name=message]').value,
      source: 'contact_page'
    };
    fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    .then(function(r) { return r.json().then(function(body) { return { ok: r.ok, status: r.status, body: body }; }); })
    .then(function(res) {
      if (!res.body || res.body.error) throw new Error(res.body && res.body.error || 'Request failed');
      form.style.display = 'none';
      success.style.display = 'block';
    })
    .catch(function() {
      btn.disabled = false;
      btn.textContent = 'Send message';
      alert('Something went wrong. Email us directly at companionsCPAS@gmail.com');
    });
  });
})();
</script>`;
