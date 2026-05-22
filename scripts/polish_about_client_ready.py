from pathlib import Path
import re

p = Path("public/about.html")
s = p.read_text(errors="ignore")

css = r"""
<style id="about-client-ready-polish-v2">

/* ===== KILL BLACK GAP BEFORE FOOTER ===== */
section:last-of-type,
main > div:last-of-type {
  margin-bottom: 0 !important;
  padding-bottom: 0 !important;
}

body {
  background: #fbf7f1 !important;
}

/* remove any dark separator bars */
div[style*="background:#000"],
div[style*="background: #000"],
div[style*="#020617"],
div[style*="#0b0b14"] {
  display: none !important;
}

/* ensure footer connects cleanly */
.site-footer {
  margin-top: 0 !important;
  border-top: none !important;
}

/* ===== CLEAN CTA AREA ===== */
.connect-section {
  padding: 42px 0 0 !important;
  background: #fbf7f1 !important;
}

.connect-grid {
  display: block !important;
}

.connect-section .org-box {
  display: none !important;
}

.connect-section .action-box {
  max-width: 860px !important;
  margin: 0 auto 48px !important;
  border-radius: 34px !important;
  box-shadow: 0 24px 90px rgba(23,32,51,.12) !important;
}

/* remove ugly highlighted text effect */
::selection {
  background: rgba(124,58,237,.18);
  color: inherit;
}

/* remove dev junk */
.schema-note {
  display: none !important;
}

/* clean typography */
.action-box h3,
.action-box p,
.newsletter-demo p {
  color: #172033 !important;
}

</style>
"""

# inject style cleanly
s = re.sub(r'<style id="about-client-ready-polish-v\d+">[\s\S]*?</style>', '', s, flags=re.I)
s = s.replace("</head>", css + "\n</head>", 1)

# remove dev copy
s = s.replace(
    "Mailchimp replacement path: store subscriber intent now, migrate to owned Resend/email workflow later.",
    "Get rescue updates, campaign progress, and new ways to help."
)

s = re.sub(r'<div class="schema-note">[\s\S]*?</div>', '', s, flags=re.I)

# upgrade CTA messaging
s = s.replace(
    "Built for one-time gifts, monthly support, contact requests, and newsletter growth.",
    "Help fund medical care, transport, and second chances."
)

s = s.replace(
    "This demo is structured so Stripe, Resend, donor records, campaign tracking, and newsletter subscriptions can be fully wired after project approval.",
    "Choose a one-time gift, become a monthly supporter, or help a dog get the care they need."
)

s = s.replace(
    "Newsletter subscription ready",
    "Get rescue updates"
)

p.write_text(s)
print("✅ about page polished + footer gap removed")
