import { SHELL_VERSION, publicPageScripts, brandTokensStylesheetTag } from "./page_shell.js";
import { renderSiteHeader, renderSiteFooter } from "./render_site_nav.js";
import { SHELL_CSS, resolveRouteTheme, themeClassName } from "./render_page.js";
import { COMPONENT_ICONS } from "./cms_components.js";

export function renderContactMainContent() {
  return `<section class="contact-hero section">
  <div class="container contact-hero-grid">
    <div class="contact-hero-copy">
      <p class="eyebrow">Get In Touch</p>
      <h1>We'd love to hear from you.</h1>
      <p>Whether you want to foster, adopt, volunteer, or just cheer us on — our inbox is always open. We're a small but mighty volunteer crew, so give us a day or two to get back to you.</p>
      <div class="contact-social-actions">
        <a class="dv2-social-pill dv2-social-pill--fb" href="https://www.facebook.com/people/Companions-of-CPAS/100069291576354/" target="_blank" rel="noopener noreferrer" aria-label="Follow us on Facebook">${COMPONENT_ICONS.facebook}<span>Facebook</span></a>
        <a class="dv2-social-pill dv2-social-pill--ig" href="https://www.instagram.com/companionscpas?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" target="_blank" rel="noopener noreferrer" aria-label="Follow us on Instagram">${COMPONENT_ICONS.instagram}<span>Instagram</span></a>
      </div>
    </div>
    <div class="contact-hero-photo">
      <div class="contact-hero-frame contact-hero-frame--team">
        <img
          src="https://assets.companionsofcaddo.org/static/pages/about/theteam.webp"
          alt="The Companions of CPAS volunteer team"
          loading="eager"
          fetchpriority="high"
          decoding="async"
        />
      </div>
    </div>
  </div>
</section>

<section class="contact-body">
  <div class="container">
    <div class="contact-grid">
      <div class="contact-info">
        <div class="contact-info-card">
          <h3>Email Us</h3>
          <a href="mailto:companionsCPAS@gmail.com">companionsCPAS@gmail.com</a>
          <p style="margin-top:8px;font-size:13px;">We're volunteers — we'll get back to you within 1–2 days.</p>
        </div>
        <div class="contact-info-card">
          <h3>Where We Operate</h3>
          <p>Caddo Parish Animal Services<br>Shreveport, Louisiana</p>
          <p style="margin-top:8px;font-size:13px;color:var(--text-3);">We are not a physical shelter. Dogs are pulled from CPAS and placed in foster homes throughout the region.</p>
        </div>
        <div class="contact-info-card">
          <h3>Organization</h3>
          <p>Companions of CPAS<br>501(c)(3) Tax-Exempt Nonprofit<br>EIN: 88-4156327</p>
        </div>
        <div class="contact-info-card">
          <h3>Want to Help Right Now?</h3>
          <p style="margin-bottom:14px;font-size:14px;">The fastest way to make an impact is to share our animals on social media, donate, or open your home as a foster.</p>
          <a href="/donate" class="btn btn-primary contact-help-cta">Donate Now</a>
        </div>
      </div>
      <div class="contact-form-wrap">
        <h2>Send us a message</h2>
        <p class="form-sub">Interested in fostering, adopting, volunteering, or partnering with us? Tell us a bit about yourself.</p>
        <form class="cf-form" id="contactForm">
          <div class="cf-row">
            <div class="cf-field">
              <label for="cf_name">Your Name</label>
              <input type="text" id="cf_name" name="name" placeholder="Jane Smith" required>
            </div>
            <div class="cf-field">
              <label for="cf_email">Email Address</label>
              <input type="email" id="cf_email" name="email" placeholder="jane@example.com" required>
            </div>
          </div>
          <div class="cf-field">
            <label for="cf_subject">I'm interested in…</label>
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
            <textarea id="cf_message" name="message" placeholder="Tell us a little about yourself and what brings you here…" required></textarea>
          </div>
          <button type="submit" class="btn btn-primary cf-submit" id="cfSubmit">Send Message</button>
        </form>
        <div class="cf-success" id="cfSuccess">
          <div class="cf-success-icon">🐾</div>
          <div class="cf-success-title">Message sent!</div>
          <div class="cf-success-msg">Thank you for reaching out. One of our volunteers will get back to you within 1–2 days. In the meantime, follow us on social media for daily dog updates!</div>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="team-section">
  <div class="container">
    <div class="team-header">
      <p class="eyebrow">The People Behind the Paws</p>
      <h2>Meet Our Team</h2>
      <p>100% volunteer-powered. Every dollar goes directly to the dogs — not overhead.</p>
    </div>
    <div class="team-layout">
      <div class="team-photo-col">
        <img
          src="https://assets.companionsofcaddo.org/static/pages/about/theteam.webp"
          alt="Companions of CPAS volunteers"
          class="team-group-photo"
          loading="lazy"
          decoding="async"
        />
      </div>
      <div class="team-members-col">
        <div class="team-member-list">
          <div class="team-member">
            <span class="team-member-name">Michelle Miller</span>
            <span class="team-member-role">President</span>
          </div>
          <div class="team-member">
            <span class="team-member-name">Suzanne Zortman</span>
            <span class="team-member-role">Treasurer</span>
          </div>
          <div class="team-member">
            <span class="team-member-name">Brittany Ramsey</span>
            <span class="team-member-role">Secretary</span>
          </div>
          <div class="team-member">
            <span class="team-member-name">Lori Sipper</span>
            <span class="team-member-role">Officer</span>
          </div>
          <div class="team-member">
            <span class="team-member-name">Krystal Leboeuf</span>
            <span class="team-member-role">Officer</span>
          </div>
        </div>
        <p class="team-note">Companions of CPAS is an all-volunteer organization. No paid staff — every gift funds animals, not administration.</p>
      </div>
    </div>
  </div>
</section>`;
}

const CONTACT_FORM_SCRIPT = `<script>
(function() {
  var form = document.getElementById('contactForm');
  var btn = document.getElementById('cfSubmit');
  var success = document.getElementById('cfSuccess');
  if (!form) return;
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    btn.disabled = true;
    btn.textContent = 'Sending\\u2026';
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
      btn.textContent = 'Send Message';
      alert('Something went wrong. Please email us directly at companionsCPAS@gmail.com');
    });
  });
})();
</script>`;

export async function assembleContactPage(env) {
  const [headerHtml, footerHtml, theme] = await Promise.all([
    renderSiteHeader(env),
    renderSiteFooter(env),
    resolveRouteTheme(env, "/contact"),
  ]);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Get in touch with Companions of CPAS. We're a volunteer-run nonprofit helping dogs at Caddo Parish Animal Services.">
  <title>Contact Us — Companions of CPAS</title>
  <link rel="stylesheet" href="${SHELL_CSS}?v=${SHELL_VERSION}">
  ${brandTokensStylesheetTag()}
  <link rel="icon" href="/logo.png">
</head>
<body class="theme-${themeClassName(theme)}" data-theme="${theme}" data-route="/contact">
${headerHtml}
<main>
${renderContactMainContent()}
</main>
${footerHtml}
${publicPageScripts()}
${CONTACT_FORM_SCRIPT}
</body>
</html>`;
}

export async function publishContactPage(env) {
  const html = await assembleContactPage(env);
  const key = "static/pages/contact/index.html";
  await env.WEBSITE_ASSETS.put(key, html, {
    httpMetadata: { contentType: "text/html; charset=utf-8" },
  }).catch(() => {});
  if (env.CMS_CACHE) {
    await env.CMS_CACHE.put("page:/contact", html, { expirationTtl: 3600 }).catch(() => {});
  }
  return { html, key };
}
