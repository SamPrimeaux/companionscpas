function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const MAP_EMBED =
  "https://maps.google.com/maps?q=1500+Monty+Street,+Shreveport,+LA+71107&hl=en&z=15&output=embed";

export function renderShelterHub(section) {
  const sectionKey = String(section?.section_key || "adoption_next_steps").trim();

  return `
<style>[data-cpas-section="${esc(sectionKey)}"]{display:block;background:#ede8df;padding:0}</style>
<section class="shelter-hub" data-cpas-section="${esc(sectionKey)}" data-section-key="${esc(sectionKey)}" id="${esc(sectionKey)}">

  <div class="shelter-hub__intro">
    <div class="container shelter-hub__intro-inner">
      <img
        src="https://caddo.gov/wp-content/uploads/2022/03/cropped-Parish-Crest-Converted-1024x791-1.png"
        alt="Caddo Parish crest"
        class="shelter-hub__crest"
        loading="lazy"
        decoding="async"
      />
      <p class="shelter-hub__eyebrow">Partner shelter</p>
      <h2 class="shelter-hub__title">Caddo Parish Animal Services</h2>
      <p class="shelter-hub__lede">Companions works directly with CPAS to pull animals, fund transport, and find fosters. Here&rsquo;s everything you need to adopt, visit, or report a lost pet.</p>
    </div>
  </div>

  <div class="shelter-hub__panel">
    <div class="container shelter-hub__narrow">
      <p class="shelter-hub__eyebrow shelter-hub__eyebrow--dark">Find us</p>
      <h3 class="shelter-hub__heading">Visit the shelter</h3>

      <div class="shelter-hub__location">
        <div class="shelter-hub__location-info">
          <div class="shelter-hub__info">
            <div class="shelter-hub__info-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
            <div>
              <p class="shelter-hub__info-label">Address</p>
              <p class="shelter-hub__info-value">1500 Monty Street<br>Shreveport, LA 71107</p>
            </div>
          </div>

          <div class="shelter-hub__info">
            <div class="shelter-hub__info-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <div>
              <p class="shelter-hub__info-label">Hours</p>
              <table class="shelter-hub__hours">
                <tbody>
                  <tr><td>Mon – Fri</td><td>10:00 am – 5:00 pm</td></tr>
                  <tr><td>Saturday</td><td>11:00 am – 2:00 pm <span class="shelter-hub__badge">adoptions only</span></td></tr>
                  <tr><td>Sunday</td><td class="shelter-hub__closed">Closed</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="shelter-hub__info">
            <div class="shelter-hub__info-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.58 1.21h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.76a16 16 0 0 0 6.29 6.29l1.91-1.91a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            </div>
            <div>
              <p class="shelter-hub__info-label">Phone</p>
              <a href="tel:3182266624" class="shelter-hub__info-link">(318) 226-6624</a>
            </div>
          </div>

          <div class="shelter-hub__btn-stack">
            <a href="https://www.google.com/maps/dir/?api=1&amp;destination=1500+Monty+Street+Shreveport+LA+71107" target="_blank" rel="noopener noreferrer" class="shelter-hub__btn shelter-hub__btn--primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
              Get directions
            </a>
            <a href="https://www.facebook.com/CaddoParishASMC/" target="_blank" rel="noopener noreferrer" class="shelter-hub__btn shelter-hub__btn--secondary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
              Follow on Facebook
            </a>
          </div>
        </div>

        <div class="shelter-hub__map">
          <iframe
            title="Caddo Parish Animal Services location"
            src="${MAP_EMBED}"
            width="100%"
            height="100%"
            style="border:0;"
            allowfullscreen=""
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade"></iframe>
        </div>
      </div>
    </div>
  </div>

  <div class="shelter-hub__panel shelter-hub__panel--alt">
    <div class="container shelter-hub__narrow">
      <p class="shelter-hub__eyebrow shelter-hub__eyebrow--dark">Adoption</p>
      <h3 class="shelter-hub__heading">Find your next best friend.</h3>
      <p class="shelter-hub__body shelter-hub__body--center">No residency requirement. Every animal is health-examined, vaccinated, and spayed or neutered before going home. Staff will help you find the right match.</p>

      <div class="shelter-hub__cards">
        <div class="shelter-hub__card">
          <div class="shelter-hub__card-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </div>
          <h4 class="shelter-hub__card-title">Health &amp; vaccines</h4>
          <p class="shelter-hub__card-body">Every pet receives a full health exam and is current on all vaccinations. Adults come home with a rabies tag.</p>
        </div>
        <div class="shelter-hub__card">
          <div class="shelter-hub__card-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>
          </div>
          <h4 class="shelter-hub__card-title">Spay / neuter included</h4>
          <p class="shelter-hub__card-body">All adults and appropriately sized puppies and kittens are spayed or neutered before going home.</p>
        </div>
        <div class="shelter-hub__card">
          <div class="shelter-hub__card-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          </div>
          <h4 class="shelter-hub__card-title">Simple process</h4>
          <p class="shelter-hub__card-body">Fill out an application and contract. Our friendly staff will guide you through every step.</p>
        </div>
        <div class="shelter-hub__card">
          <div class="shelter-hub__card-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
          </div>
          <h4 class="shelter-hub__card-title">Starter perks</h4>
          <p class="shelter-hub__card-body">Take home a starter kit with coupons and discounts at local pet stores and grooming shops.</p>
        </div>
      </div>

      <div class="shelter-hub__policy">
        <p class="shelter-hub__eyebrow shelter-hub__eyebrow--dark shelter-hub__eyebrow--left">Adoption policy &amp; procedure</p>
        <ul class="shelter-hub__list">
          <li>Must be at least 18 years old with valid photo ID.</li>
          <li>All adopted animals must be spayed or neutered — required by Caddo Parish ordinance.</li>
          <li>Adoption fee is <strong>$75</strong>, accepted by cash or card.</li>
          <li>Once approved, transport your pet to a vet promptly for a thorough exam. Animals may incubate illness while at the shelter without showing signs.</li>
          <li>A refund is available only if your vet identifies a physical, medical, or behavioral problem.</li>
          <li>CPAS reserves the right to decline any adoption at its discretion.</li>
        </ul>
      </div>

      <div class="shelter-hub__cta-row">
        <a href="https://caddo.gov/adoption-information/" target="_blank" rel="noopener noreferrer" class="shelter-hub__btn shelter-hub__btn--primary">View animals available for adoption</a>
        <a href="tel:3182266624" class="shelter-hub__btn shelter-hub__btn--secondary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.58 1.21h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.76a16 16 0 0 0 6.29 6.29l1.91-1.91a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          (318) 226-6624
        </a>
      </div>
    </div>
  </div>

  <div class="shelter-hub__panel">
    <div class="container shelter-hub__narrow">
      <p class="shelter-hub__eyebrow shelter-hub__eyebrow--dark">Lost &amp; Found</p>
      <h3 class="shelter-hub__heading">Lost your pet? Start here.</h3>
      <p class="shelter-hub__body shelter-hub__body--center">CPAS receives over 100 dogs and cats every week. Animals are held a minimum of four days per parish ordinance — visit daily and follow these steps.</p>

      <div class="shelter-hub__steps">
        <div class="shelter-hub__step">
          <div class="shelter-hub__step-num" aria-hidden="true">1</div>
          <div>
            <h4 class="shelter-hub__step-title">Visit the shelter every day</h4>
            <p class="shelter-hub__step-body">Walk the stray section with a staff member. With 100+ animals arriving weekly, your pet may show up after your first visit.</p>
          </div>
        </div>
        <div class="shelter-hub__step">
          <div class="shelter-hub__step-num" aria-hidden="true">2</div>
          <div>
            <h4 class="shelter-hub__step-title">Post a missing pet report</h4>
            <p class="shelter-hub__step-body">Bring a photo to post on the shelter bulletin board and fill out a missing pet report form with staff.</p>
          </div>
        </div>
        <div class="shelter-hub__step">
          <div class="shelter-hub__step-num" aria-hidden="true">3</div>
          <div>
            <h4 class="shelter-hub__step-title">Search online too</h4>
            <p class="shelter-hub__step-body">Check Craigslist, Shreveport Times pet classifieds, and local rescue group pages alongside your shelter visits.</p>
          </div>
        </div>
        <div class="shelter-hub__step">
          <div class="shelter-hub__step-num" aria-hidden="true">4</div>
          <div>
            <h4 class="shelter-hub__step-title">Bring your rabies certificate</h4>
            <p class="shelter-hub__step-body">Required to reclaim your pet. If unavailable, purchase a rabies voucher at the shelter. A redemption fee applies — <a href="http://library.municode.com/index.aspx?clientId=10151" target="_blank" rel="noopener noreferrer" class="shelter-hub__inline-link">view fee schedule</a>.</p>
          </div>
        </div>
      </div>

      <div class="shelter-hub__cta-row">
        <a href="tel:3182266624" class="shelter-hub__btn shelter-hub__btn--primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.58 1.21h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.76a16 16 0 0 0 6.29 6.29l1.91-1.91a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          Call the shelter
        </a>
        <a href="https://caddo.gov/lost/" target="_blank" rel="noopener noreferrer" class="shelter-hub__btn shelter-hub__btn--secondary">View lost &amp; found animals</a>
      </div>
    </div>
  </div>

</section>`.trim();
}
