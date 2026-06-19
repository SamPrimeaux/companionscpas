# Companions of CPAS — Handoff Reference

Last verified: 2026-06-19 (live D1 + deployed Worker).

Short guide for **which D1 tables to use**, **which to drop**, and **which need a code change first**. Full route map: [`current-file-map.md`](current-file-map.md). Stack detail: [`../ARCHITECTURE.md`](../ARCHITECTURE.md).

Tenant filter for operational tables: `tenant_id = 'tenant_companionscpas'` (or `organization_id` on `care_tasks`).

---

## Canonical tables (use these)

| Domain | Table(s) | Notes |
|---|---|---|
| Animals | `animal_profiles` | SSOT. Not `animals` (already removed from live D1). |
| Foster placements | `foster_records` | `POST/PATCH /api/dashboard/fosters` |
| Applications | `cpas_foster_applications` | Public form + dashboard. Not `applications`. |
| Volunteers | `volunteer_records` | `GET/POST /api/dashboard/volunteers` |
| Care / medical tasks | `care_tasks` | Filter `organization_id = 'tenant_companionscpas'` |
| Fundraising | `fundraising_campaigns` | Not `fundraising_campaigns_demo`. |
| Donations | `donations`, `donors`, `donation_payments`, `donation_intents`, `donation_settings` | Stripe test mode |
| CMS | `cms_pages`, `cms_page_sections`, `cms_page_content_blocks`, `cms_brand_settings`, `cms_assets`, `cms_publish_jobs` | Nav/footer SSOT is `cms_brand_settings.navigation_json` |
| Auth / users | `users`, `user_credentials`, `sessions`, `tenant_memberships`, `tenants`, `organizations` | `admin_users` still used by password login until migrated |
| Integrations OAuth | `social_provider_connections`, `integration_oauth_states` | Drive, Gmail, future Meta |
| Email | `inbound_emails`, `email_folders`, `email_drafts`, `dashboard_notifications` | |
| Contact (public form) | `contact_requests_v2` | `contact_api.js` |
| Agent Sam runtime | `agentsam_sessions`, `agentsam_messages`, `agentsam_usage_events`, `agentsam_usage_rollups_daily`, `agentsam_tool_chain` | Tools are code-defined in `agentsam_tools.js`, not `agentsam_mcp_*` |
| Social (Lane A embed) | `social_embed_settings` | Facebook page embed on `/community` |
| Social (Lane B future) | `social_post_drafts_v2`, `scheduled_posts` | Publishing stubs return 501 until client approval |

---

## Drop now (safe — no Worker references)

These existed only for early demos or a pre-refactor Agent Sam schema. **Zero rows required for safety**; migration `db/migrations/20260623_drop_legacy_unused_tables.sql` removes them from live D1.

| Table | Why drop |
|---|---|
| `applications` | 6-column stub; dashboard uses `cpas_foster_applications` only |
| `agentsam_mcp_tools` | Superseded by code registry + `agentsam_tools` table (IAM-era duplicate) |
| `agentsam_mcp_workflows` | Superseded by `agentsam_workflows` |
| `cms_editor_sessions` | Never written by current CMS |
| `cms_editor_events` | Never written by current CMS |

**Already absent from live D1** (no action): `animals`, `adoption_applications_demo`, `fundraising_campaigns_demo`, `social_connections`.

---

## Defer — drop only after a small code change

| Table | Blocker | Next step |
|---|---|---|
| `contact_requests` | `payments_email.js` still `INSERT`s here on one path | Point insert to `contact_requests_v2`, then drop |
| `social_post_drafts` | `social.js` drafts API still reads/writes this | Migrate drafts handlers to `social_post_drafts_v2`, then drop |
| `cms_navigation_items` | `cms_api.js` / `agentsam_tools.js` still SELECT | Nav SSOT is `cms_brand_settings`; remove dead queries, then drop |
| `cms_themes` | `cms_api.js`, `dashboard_config_api.js` still SELECT | Theme lives on `cms_pages.theme`; consolidate, then drop |
| `admin_users` | `auth_login.js` password login | Migrate to `users` + `user_credentials`, then drop |

---

## Ignore in repo (do not re-seed)

| Path | Reason |
|---|---|
| `db/schema_dashboard_demo.sql` | Defines demo tables not used in production |
| `db/seed_dashboard_demo.sql` | Seeds `fundraising_campaigns_demo` |
| `db/seed_agentsam.sql`, `seed_agentsam_cms_tools.sql`, `seed_agentsam_workflows.sql` | Target dropped `agentsam_mcp_*` tables |
| `db/seed_cpas_platform_demo_workflows_safe.sql` | Demo application inserts (partially commented) |

Keep **migrations** under `db/migrations/` — they are the audit trail.

---

## Apply table cleanup (ops)

```bash
cd /Users/samprimeaux/companionscpas
npx wrangler d1 execute companionscpas --remote \
  --file=db/migrations/20260623_drop_legacy_unused_tables.sql
```

Verify:

```bash
npx wrangler d1 execute companionscpas --remote --command \
  "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('applications','agentsam_mcp_tools','agentsam_mcp_workflows','cms_editor_sessions','cms_editor_events');"
```

Expect **zero rows**.

---

## Future sprints (not handoff blockers)

- **Agent Sam Phase 2** — tool picker, approval queue, staff workflows, live overview stats. [`AGENTSAM_CPAS_ROADMAP.md`](AGENTSAM_CPAS_ROADMAP.md).
- **Lane B** — Meta OAuth + Facebook page publish (`501` until client approval). See README Lane B section.
- **Agent Sam refresh** — Reports AI Usage tab uses hardcoded model stats; chat model capacity errors. See README maintenance backlog.
- **Repo script purge** — See README [Files candidates for removal](../README.md#files-candidates-for-removal-not-deleted-yet).
