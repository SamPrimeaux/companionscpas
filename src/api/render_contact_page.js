import { SHELL_VERSION, publicPageScripts, brandTokensStylesheetTag } from "./page_shell.js";
import { renderSiteHeader, renderSiteFooter } from "./render_site_nav.js";
import { SHELL_CSS, resolveRouteTheme, themeClassName } from "./render_page.js";

const FB_SVG = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`;
const IG_SVG = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>`;

export function renderContactMainContent() {
  return `<section class="contact-hero section">
  <div class="container contact-hero-grid">
    <div class="contact-hero-copy">
      <p class="eyebrow">Get In Touch</p>
      <h1>We'd love to hear from you.</h1>
      <p>Whether you want to foster, adopt, volunteer, or just cheer us on — our inbox is always open. We're a small but mighty volunteer crew, so give us a day or two to get back to you.</p>
      <div class="contact-social-actions">
        <a class="btn btn-primary contact-social-btn" href="https://www.facebook.com/people/Companions-of-CPAS/100069291576354/" target="_blank" rel="noopener">${FB_SVG} Facebook</a>
        <a class="btn btn-ghost contact-social-btn" href="https://www.instagram.com/companionscpas" target="_blank" rel="noopener">${IG_SVG} Instagram</a>
      </div>
    </div>
    <div class="contact-hero-photo">
      <div class="contact-hero-frame">
        <img
          src="https://assets.companionsofcaddo.org/static/pages/about/theteam.webp"
          alt="The Companions of CPAS volunteer team"
          width="1200"
          height="900"
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
      <p>We're 100% volunteer-powered. Every dollar donated goes directly to the dogs — not overhead.</p>
    </div>
    <div class="team-grid">
      <div class="team-card">
        <div class="team-avatar">L</div>
        <div class="team-name">Lori Musland Sipper</div>
        <div class="team-role">Founder &amp; Director</div>
        <span class="team-badge">Owner</span>
      </div>
      <div class="team-card">
        <div class="team-avatar">M</div>
        <div class="team-name">Michelle Miller</div>
        <div class="team-role">Board Member</div>
        <span class="team-badge">Admin</span>
      </div>
      <div class="team-card">
        <div class="team-avatar">K</div>
        <div class="team-name">Krystal Leboeuf</div>
        <div class="team-role">Board Member</div>
        <span class="team-badge">Admin</span>
      </div>
      <div class="team-card">
        <div class="team-avatar">S</div>
        <div class="team-name">SuzAnne Zort</div>
        <div class="team-role">Board Member</div>
        <span class="team-badge">Admin</span>
      </div>
      <div class="team-card">
        <div class="team-avatar">A</div>
        <div class="team-name">Amanda Norris</div>
        <div class="team-role">Rescue &amp; Foster Coordinator</div>
        <span class="team-badge">Volunteer</span>
      </div>
      <div class="team-card">
        <div class="team-avatar">K</div>
        <div class="team-name">Kim Freeman</div>
        <div class="team-role">Adoption Coordinator</div>
        <span class="team-badge">Volunteer</span>
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
