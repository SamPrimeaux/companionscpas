# Companions CMS — isolated localhost baseline

## Ecommerce Theme Studio for Companions Forms (LOCALHOST ONLY)

The route `http://127.0.0.1:4473/dashboard/cms/forms` now mounts the
**actual `@inneranimalmedia/ecommerce-cms-agentsam` Theme Studio chrome**:
toolbar, CMS tree, viewport controls and inspector from the installed
package, not a second hand-built React CMS.

To rebuild and redeploy the *localhost-only* resource assets:

```bash
cd ~/companionscpas
npm run local:cms:rebuild
```

This typechecks the Companions bridge using TypeScript, compiles it with
esbuild, stages the **assembled `dist/assets/admin` assets from the existing
ecommerce package**, updates local R2 and runs the real-form contract smoke.
It does not push to Cloudflare production.

`public/dashboard/sdk/` is generated and gitignored so the editing
UI cannot drift away from its installed SDK package. The installer copies
the unmodified SDK scripts/CSS/brand resources; the only document delta is
the bootstrap script URL to load `forms-theme-boot.mjs`.

**Package repair:** the first `2.6.13` archive was incomplete. The
ecommerce package's own `bin/build-assets.mjs` was run to assemble its
TypeScript authoring engine and all Theme Studio dependencies under
`dist/assets/admin`. The repacked **local development archive** now
supplies these assets entirely; there is NO dependency on local-studio files.
This is an unreleased same-version archive, not a published npm release.
Formal package versioning and an isolated `npm ci` acceptance remain pending.

`scripts/local-cms/theme-studio/forms-theme-boot.ts` is strictly a
**TypeScript** Companions resource adapter. A generated browser ES module
is produced from it, and TS typechecking is mandatory on every rebuild. It maps all existing forms and their fields
from authenticated `/api/cms/forms` into the SDK's own
`createThemeEditorBridge`; it provides a safe preview and saves
**draft forms only**. Published forms cannot be rewritten, and publish is
disabled until safe draft promotion is implemented. The original site's
V1 CMS stays untouched outside localhost.

Visual browser inspection is still outstanding because the Mac's
headless Chrome runtime crashes; tests verify API data, SDK bridge,
assets and read-only guard, not end-to-end visual acceptance.


This keeps Companions of CPAS **as its own website and Worker**. The installed
`@inneranimalmedia/ecommerce-cms-agentsam` is the **only customer-facing
CMS editor package**. The older `client-cms-editor` is no longer a direct
Companions dependency or mounted UI. No existing dashboard pages are overwritten.

## Run on the Mac

```bash
cd ~/companionscpas

# The packages are ALREADY installed on this Mac.
# Do not delete node_modules while DNS is unavailable.
# A clean npm ci requires the registry until the existing undici@7.29.0
# override tarball is cached or the Mac DNS issue is repaired.

# Confirm installed versions and local-only storage.
node scripts/local-cms/preview.mjs doctor

# Refresh code/media assets from THIS checkout into LOCAL R2 only.
node scripts/local-cms/preview.mjs assets

# Start the existing Worker, with no production bindings, on localhost.
node scripts/local-cms/preview.mjs start 4473
```

Open http://127.0.0.1:4473 and http://127.0.0.1:4473/events.
The local dashboard is at http://127.0.0.1:4473/dashboard/cms/forms.

Local-only test credentials are generated in
`.wrangler/companions-local-cms/local-login.txt`. If absent, run:

```bash
python3 scripts/local-cms/create-local-login.py
```

**Never upload the generated credentials, local database, or local login session.**
The local config has no Stripe, Resend or external credentials; public payment
previews cannot process real money here. The login uses the existing
`/api/auth/login` PBKDF2 flow and a synthetic admin account, not an auth bypass.

## What is actually installed

The ecommerce editor and its installed support packages were packed from the current
`~/agentsam-sdk` checkout at the source commit in
`packages/sdk-artifacts/manifest.json`, verified with SHA-256, then installed
through npm into Companions' normal `node_modules`.
They are **offline development archives**, not a claim of a published registry
release. The current working installation passed import and authenticated
localhost smoke tests. A fresh offline `npm ci` has **not** passed because
the inherited `undici@7.29.0` override tarball is absent from npm's cache.
Run a normal `npm ci --ignore-scripts --no-audit --no-fund` only once registry
connectivity is restored. Until then, keep the validated local node_modules. Supporting transitive dependencies are explicitly pinned as local
archives because DNS/registry access was unavailable on the Mac.

The latest ecommerce package resolves:
- `@inneranimalmedia/ecommerce-cms-agentsam/cms` (full CMS editor exports)
- The original product Theme Studio source/compiled TypeScript
  authoring engine from `dist/assets/admin`
- Package manifest, Theme Studio bridge and capability contract

The package doctor currently reports **two external showcase imports** under
`scripts/preview-sdk-showcase.mjs`, so a fully standalone production install
is **not** certified yet. Repair/verify that upstream before releasing and
switching Companions' production editor.

## Local data provenance and production safety

The current localhost uses **dedicated state**:
`.wrangler/companions-local-cms/` (gitignored). Its baseline combines the
August repository D1 schema with current read-only extracts of 16 site-authoring
tables, including 9 pages, 66 sections, 151 asset metadata records, 10 forms,
2 legacy modals and the published checkout configuration. Only website/CMS
definitions were copied. **No subscribers, donor/payment transactions, personal
form submissions, or live login credentials were copied.**

Site files were mirrored from `public/` **and `static/global/`** into
LOCAL R2 using `--local`. This also repairs the missing 122 KB
`/static/global/cpas-shell.css` stylesheet responsible for the prior
unstyled homepage.
The preview uses `scripts/local-cms/wrangler.local.toml` without production
routes or secrets. Public images hosted on remote URLs may need a valid network
connection. The snapshot is a local workspace baseline, not an automated
production-content sync; future refreshes should use read-only exports.

Production Wrangler config, production D1, public CMS publishing and R2 were
**not written**.

## Migration acceptance sequence

1. Show full site and resources on localhost using current V1 editors.
2. Verify installed Ecommerce package integrity and repair upstream package
   boundary issues.
3. Build a **single** adapter from the existing Companions resources to the
   existing ecommerce CMS/Theme Studio. No customer-specific editor fork.
4. Replace routes gradually, first preview-only, then real draft/save/publish
   after data-contract and rollback testing. Verify multiple customer sites.
5. Promote a published, version-pinned SDK release after clean archive doctor,
   standalone install and browser tests. Remove temporary offline vendor
   archives and stale V1 editing code only after acceptance.

Do not run `npm run deploy`, `npm run deploy:full`, `npm run sync` or any
Wrangler command with `--remote` as part of this localhost workflow.

## TypeScript stabilization boundary

Companions' source adapter is `scripts/local-cms/theme-studio/forms-theme-boot.ts`.
`npm run local:cms:typecheck` enforces strict TS checking. Its compiler emits
`public/dashboard/sdk/forms-theme-boot.mjs` from the typechecked source.
The 251KB Theme Studio runtime remains owned by the ecommerce CMS package;
**do not hand-port/copy this UI into Companions TSX**. Migrate that
product-owned runtime toward its own TS/TSX source as a separate SDK change.

**Honest current scope:** only Forms' customer-facing editor uses the
ecommerce Theme Studio. The original Companions public pages, Worker, campaign
checkout and unrelated dashboard views still use their existing implementations.
Future routes should consume the same packaged editor and be converted
gradually with rollback tests, not switched to fake previews.
The current ecommerce `./cms` compatibility export still references the older
client-cms-editor and needs to be consolidated upstream; it is not imported
by this local Theme Studio integration.

## Canonical ecommerce CMS Pages workspace (localhost migration wave)

The same **installed** `@inneranimalmedia/ecommerce-cms-agentsam` Theme Studio
now owns the visual editing chrome for all these existing Companions routes:

- `http://127.0.0.1:4473/dashboard/cms/website` → full-screen Ecommerce Online Store hub with the actual Companions site preview, page/draft counts, and saved page-draft list
- `http://127.0.0.1:4473/dashboard/cms/website/editor?surface=pages&slug=home` → canonical Pages Theme Studio, opened only after choosing to edit
- `http://127.0.0.1:4473/dashboard/cms/pages` → legacy route adapter to the same canonical Pages Studio
- `http://127.0.0.1:4473/dashboard/cms/pages/home` → real Home page in the canonical Studio
- `http://127.0.0.1:4473/dashboard/cms/forms` → real Forms workspace

The website landing route is now a standalone Ecommerce surface: it does not mount inside the old CPAS dashboard sidebar/header or jump straight into the editor. The landing page reuses the package-owned Online Store overview and its preview layout; its local adapter supplies actual Companions page counts and private draft records. Selecting **Open editor**, **Edit website**, or **Open draft** opens the same canonical Theme Studio.
`studio-boot.ts` selects a typed tenant-data adapter based on the resource
surface. `pages-theme-adapter.ts` loads the existing 9 D1 pages, their
ordered sections, editor fields, brand/theme identity, and the genuine
Companions server-rendered CMS preview through `/api/cms/preview`.
The package supplies the navigation tree, inspectors, theme controls,
viewports, and styling. Generated JS assets are gitignored and rebuildable.

Run `npm run local:cms:rebuild` to typecheck, assemble the installed
ecommerce GUI, copy assets to local R2 and run both Forms and Pages smoke
tests. Published-page and published-form writes remain blocked until a
versioned draft/publishing adapter is implemented. Draft page section
writes use the existing Companions CMS API. This is NOT a full writable
CMS migration yet: some globals, media and block creation still need their
SDK contract adapters and browser-level visual acceptance. Production V1
routes and publishing behavior are untouched.

## Shared dashboard shell — packaged navigation + workbench

Companions' entire `/dashboard/*` shell now uses the canonical **SDK
navigation and AgentSam workbench components on localhost only**. The
app-owned business pages, D1 resources, forms, routes, checkout and existing
backend `/api/agentsam/chat` streaming transport remain in Companions.
This is a shell adoption—not a second implementation of its apps.

- Source: immutable `@inneranimalmedia/agentsam-nav@2.6.13` and
  `@inneranimalmedia/agentsam-workbench@2.6.13` packed archives.
- `scripts/local-cms/dashboard-shell/host.tsx` maps Companions' existing
  `NAV_STRUCTURE` onto the real SDK Nav, without inventing different routes.
- MiniAgentSam now uses the SDK's actual `AgentComposer` and
  `MiniAgentSam` element-selection component.
- The slide-in assistant uses the SDK `AgentPanel`, preserving the existing
  host session, SSE endpoint, cancellation and message state.
- `host.css` only sets theme/layout tokens to match the ecommerce admin
  shell; the SDK owns navigation behavior, message rendering, focus state and
  editor code.
- On production, the original shell, mini composer and AgentSam panel still
  run; **no production changes** are enabled here.
- Legacy AgentSam file/Drive attachment controls are not yet available in
  the new SDK panel; restore those through the shared workbench adapter before
  switching production. Cross-iframe annotations also need an explicit bridge.

The SDK archive installs through offline npm are currently blocked by
unavailable `@radix-ui/react-dialog` registry data. Instead, the local
bundle extracts the actual SDK package archives into ignored local
`.wrangler` state and bundles their published modules against the SDK
checkout's installed build dependencies. This is a repeatable **Mac localdev
workflow, not a clean-room npm installation guarantee**. The separate
upstream publishing/registry task remains.

Use `npm run local:cms:rebuild` for the complete typed CMS + shell build,
local R2 sync, and all smoke tests. Use
`npm run local:cms:shell:smoke` for shell-only QA.

**Violet theme:** Violet is currently a *showcase* with example nonprofit
content, not an authoritative Companions theme installation. Reuse Violet
as a design preset or token bundle only after mapping it to actual Companions
brand values, real site assets and editable templates. Do not publish the
Violet demo content (including its invented organization) as Companions.
