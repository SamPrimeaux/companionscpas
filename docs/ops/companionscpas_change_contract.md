# CompanionsCPAS Change Contract

This repo is not a basic static website. It is a Cloudflare nonprofit OS with:

- Worker routes
- D1 CMS/content/config truth
- R2-rendered artifacts and global assets
- KV page/brand cache
- static ASSETS fallback
- Agent Sam workflows/tools
- donation, application, email, OAuth, social, and dashboard systems

Every repair/refine/update must preserve sync across those layers.

## Non-Negotiable Pipeline

For any page, section, component, shell, theme, nav, asset, form, donation, OAuth, or Agent Sam CMS change:

1. Inspect first.
   - Identify source files.
   - Check D1 table/row truth.
   - Check R2 key path.
   - Check KV cache keys.
   - Check live route behavior.

2. Patch the source of truth.
   - Prefer D1/CMS/theme/config/renderer source.
   - Avoid one-off generated HTML edits unless explicitly artifact-only.
   - If visual tokens should be editable by users, prefer cms_themes, cms_brand_settings, cms_section_schemas, or section config_json.

3. Validate locally.
   - Run syntax checks.
   - Run route or renderer smoke checks where possible.
   - Do not deploy known broken module syntax.

4. Publish the right layer.
   - Worker code changed: deploy Worker.
   - public asset changed: deploy assets and/or upload to R2.
   - /static/global/shared.css changed: upload to R2 key static/global/shared.css.
   - /static/global/shared.js changed: upload to R2 key static/global/shared.js.
   - page content changed: render/publish static/pages/<route>/index.html to R2.

5. Purge remote KV.
   - Always purge brand key when shell/theme/brand/nav/global changes.
   - Purge affected page keys.
   - Include homepage for global public shell changes.

6. Verify live.
   - Use cache-busted curl.
   - Confirm each affected public route references /static/global/shared.css and /static/global/shared.js.
   - Confirm body data-route, site-main, site-header, and expected section markers.
   - Confirm visual/CSS marker if a CSS patch was added.

7. Commit and push.
   - Commit source files, migrations, seeds, scripts, and docs that represent real project truth.
   - Remove or archive stale scratch files.
   - Push main after deployable state is verified.

8. End clean.
   - `git status --short` should be clean or contain only intentionally ignored/scratch files.
   - `git log --oneline -5` should show the latest project state.

## Default KV Keys

- brand:tenant_companionscpas
- page:/
- page:/home
- page:/about
- page:/adopt
- page:/services
- page:/donate

## Public Route Contract

These routes must stay globally CMS/D1/KV/R2 aware:

- /
- /about
- /adopt
- /services
- /donate

They should share the same public shell contract:

- /static/global/shared.css
- /static/global/shared.js
- .site-header
- .site-main
- body[data-route="..."]

## Rule

No future assistant, agent, script, or manual terminal workflow should treat CompanionsCPAS as a static one-off site. Changes must preserve the database-driven, R2-stored, KV-cached, end-user-editable design.
