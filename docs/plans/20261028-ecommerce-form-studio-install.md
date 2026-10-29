# Companions CMS — Ecommerce Form & Modal Studio installation
**Purpose:** keep Companions as its own site, D1 database and Cloudflare Worker while its customer CMS moves to the versioned editor/apps in \`@inneranimalmedia/ecommerce-cms-agentsam\`.

## Ownership
- **SDK / ecommerce-cms-agentsam:** Form & Modal Studio app, responsive UI, app manifest, presets, capability contract, theme tokens. One reusable source for every customer.
- **Companions:** authenticated APIs, existing forms, site pages, brand tokens, R2 asset delivery, Stripe, Resend, submissions and publish processes.
- **Bridge:** \`public/dashboard/js/cms/agent-form-studio-adapter.js\` maps the site APIs onto the SDK studio contract; it has no React render code or duplicated field/preset schema.

## Implemented in this first rollout slice
1. Shared SDK app from \`SamPrimeaux/agentsam-sdk\`: \`apps/ecommerce-cms-agentsam/apps/form-studio/\` and \`frontend/form-studio/\`. Registered in the canonical ecommerce app registry and export map.
2. Versioned SDK **preview** assets installed under \`public/dashboard/apps/form-studio/\` with \`installation.json\` source provenance. \`scripts/install-agent-form-studio.mjs\` regenerates them from an installed SDK package or a trusted local package path.
3. Existing Companions routes \`/dashboard/cms/forms\` and \`/dashboard/cms/forms/:id\` mount the SDK renderer. The old editor remains a rollback fallback until browser acceptance and SDK release.
4. SDK Studio loads **real** Companions form data and exposes draft-only form field editing, design and publishing through the existing endpoints. No new form DB tables.
5. Authenticated \`GET /api/cms/studio/catalog\` lists original \`cms_modals\` and published/draft \`cms_globals\` checkouts as references. Existing Stripe and form endpoints remain authoritative. No copied modal/checkout data.
6. SDK preset catalog is versioned and compared against the backend's supported starters. Unsupported preset creation is visible but disabled, not mocked.

## Release/process contract
The committed preview files are an exact-source **pre-release integration**, not a claim that a new npm package version is published or that the feature is deployed. SDK app and Companions adapter must pass tests and browser QA. Then release a new package version, pin that version in the customer build, run:

\`\`\`bash
node scripts/install-agent-form-studio.mjs \
  --source /path/to/verified/agentsam-sdk/apps/ecommerce-cms-agentsam
\`\`\`

Or after package installation:
\`\`\`bash
node scripts/install-agent-form-studio.mjs
\`\`\`

Installer refuses any package whose canonical \`agentsam.app.json\` does not include \`form-studio\`. A release build must verify \`installation.json\` file SHA-256 hashes against the installed published package. Do not hand-edit the generated browser module, styles or presets.

Deploy static files with the site's existing R2 sync, then deploy Worker. Never change Companions' D1 schema merely to mount a new UI.

## Current safety limitations (intentional)
- **Published forms** still save directly to live D1 through the original API. The new Studio treats them as read-only until an explicit versioned-draft/publish contract is added; draft forms can be edited and published.
- **Legacy donor/foster modal presets** are listed and kept intact; they are not yet freely editable through the new Studio.
- **Existing event checkouts** are listed and link to their current campaign editor; Stripe pricing, PaymentIntent logic and webhook receipts remain untouched by this integration.
- The standalone **Page/Theme editor** has not yet been switched to the portable ecommerce Theme Studio. That is the next sitewide CMS migration after this initial Forms Studio proves stable.
- PR #22's initial $20/Stripe-preload checkout behavior is a separate draft; this installation does not merge or deploy it.

## Acceptance checklist
1. Verify Companions screen loads the SDK Form Studio instead of V1 (check source installation hash and full-screen three-panel UI).
2. Exactly the live form count, two legacy modals and current checkout records appear (no duplicate rows, no invented customer presets).
3. Open a **draft form**, edit label, add an optional field and theme accent, Save, reload and verify actual D1 round-trip; Publish and verify public form loads.
4. Published Foster, Contact and Join Our Team forms remain intact, not silently overwritten.
5. SDK supplied presets: supported starter creates a real form, unsupported modal/checkout creation disabled.
6. Verify modal list displays Donate and Foster references, checkout list displays Freedom Ride and routes to its current editing workflow.
7. Check mobile/desktop interactions, keyboard focus, zoom, preview responsiveness and no nested scroll traps.
8. Test production site donor/Stripe/event path separately, using approved Stripe test environment rather than a live card.
9. Fix any missing asset MIME type, stale R2 cache or misleading publish state before enabling this app for customers.
10. Once verified, remove V1 source imports in a separate PR with rollback artifact and tests; migrate the remaining Site/Theme UI next.

This integration does **not** install the ecommerce Product Studio, Completeful or Growth apps into Companions without an explicit need. Those remain bundled in the source Ecommerce app but are not relevant to the Companions nonprofit site authoring workflow. Resend integration must remain scoped to the existing email provider; no extra credential copies.
