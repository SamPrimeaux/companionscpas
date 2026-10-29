# Companions CMS — isolated localhost baseline

This keeps Companions of CPAS **as its own website and Worker**. The installed
`@inneranimalmedia/ecommerce-cms-agentsam` and
`@inneranimalmedia/client-cms-editor` are existing packaged applications,
not a second Forms UI. No existing dashboard pages are overwritten.

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

The browser editor and CMS packages were packed from the current
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
- `@inneranimalmedia/client-cms-editor` (underlying engine)
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

Site files were mirrored from `public/` into LOCAL R2 using `--local`.
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
