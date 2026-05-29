# Companionscpas Platform — Full Remaster Proposal
> Generated: 2026-05-22 01:06  
> Source: Live D1 `companionscpas` (`fd6dd6fb-156b-4b6a-8ff0-505422652391`)  
> Repo: `SamPrimeaux/companionscpas-platform`

---
## Summary

| Metric | Count |
|---|---|
| Total D1 tables | 95 |
| agentsam_* tables | 41 |
| cms_* tables | 15 |
| cpas_* tables | 6 |
| core tables | 33 |
| Tables with 0 rows | 32 |
| Tables in src/api/ | 42 |
| Tables in dashboard views | 10 |
| Files to build/remaster | 11 |
| CMS workflows to seed | 4 |

---
## 1. File inventory

### src/api/
- `_shell.js`
- `agentsam_api.js`
- `agentsam_tools.js`
- `auth_login.js`
- `cms_api.js`
- `cms_api_additions.js`
- `contact_api.js`
- `dashboard_api.js`
- `dashboard_config_api.js`
- `donation_api.js`
- `password_reset.js`
- `payments_email.js`
- `render_home.js`
- `resolveModel.js`
- `session_api.js`
- `social.js`

### public/dashboard/js/
- `agentsam.jsx`
- `app.jsx`
- `config.js`
- `data.js`
- `ui.jsx`
- `view-admin.jsx`
- `view-animals.jsx`
- `view-applications.jsx`
- `view-cms.jsx`
- `view-finance.jsx`
- `view-ops.jsx`
- `view-overview.jsx`
- `view-reports.jsx`

### db/ SQL files
- `agentsam_drawer_bootstrap.sql`
- `agentsam_todo.sql`
- `patch_remove_gpt_oss_20b.sql`
- `patch_sessions_revoked_at.sql`
- `schema.sql`
- `schema_agentsam.sql`
- `schema_agentsam_superdev.sql`
- `schema_agentsam_workflows.sql`
- `schema_auth.sql`
- `schema_cms_content.sql`
- `schema_cms_core.sql`
- `schema_cms_themes.sql`
- `schema_contact_requests_v2.sql`
- `schema_dashboard_demo.sql`
- `schema_donation_intents.sql`
- `schema_payments_email.sql`
- `schema_security_vault.sql`
- `schema_social.sql`
- `seed.sql`
- `seed_agentsam.sql`
- `seed_agentsam_cms_tools.sql`
- `seed_agentsam_superdev.sql`
- `seed_agentsam_workflows.sql`
- `seed_auth.sql`
- `seed_cms_animal_assets.sql`
- `seed_cms_assets.sql`
- `seed_cms_assets_animals_all.sql`
- `seed_cms_blocks.sql`
- `seed_cms_brand_nav_footer_home_truth.sql`
- `seed_cms_core.sql`
- `seed_cms_extra_gallery.sql`
- `seed_cms_sections.sql`
- `seed_cms_themes.sql`
- `seed_cpas_platform_demo_workflows_safe.sql`
- `seed_dashboard_demo.sql`
- `seed_donation_modal_theme.sql`

### scripts/
- `build_dashboard_full.py`
- `build_full_cms_editor_system.py`
- `extract_shell_exact.py`
- `filetree.py`
- `fix_about_header_css_final.py`
- `fix_agentsam_direct_toggle.py`
- `fix_agentsam_mount_toggle.py`
- `fix_cms_route_placement.py`
- `fix_cms_view_crash.py`
- `fix_font_block_guaranteed.py`
- `fix_font_order_final.py`
- `fix_font_root_true_final.py`
- `fix_font_vars_order.py`
- `fix_header_footer_theme.py`
- `fix_public_header_top_alignment.py`
- `force_about_home_shell_css.py`
- `force_sitewide_public_shell.py`
- `hard_fix_public_shell_and_modal.py`
- `inject_exact_shell.py`
- `install_agentsam_drawer.py`
- `install_shell.py`
- `normalize_public_fonts.py`
- `normalize_public_header_footer_from_home.py`
- `nuke_old_shell_conflicts.py`
- `nuke_sync_public_shell_from_about.py`
- `patch_agent_logo_fosters.py`
- `patch_agentsam_db_driven.py`
- `patch_agentsam_global_toggle.py`
- `patch_agentsam_header_composer.py`
- `patch_donation_modal_theme.py`
- `patch_remove_fallback.py`
- `patch_render_home.py`
- `phase1_discover.py`
- `phase2_r2_upload.py`
- `phase3_home.py`
- `phase4_fix_and_push.py`
- `polish_about_client_ready.py`
- `polish_about_demo_layout.py`
- `polish_public_contact.py`
- `populate_asset_metadata.py`
- `primetech_shell.py`
- `purge_about_header_css_conflicts.py`
- `quality_test_1.py`
- `rebrand_static_companions.py`
- `rebuild_about_clean_and_shell_fix.py`
- `rebuild_about_full_schema.py`
- `remaster_adopt_donation.py`
- `repair_about_header_home_style.py`
- `repair_about_safe_from_git.py`
- `repair_agentsam_undefined.py`
- `repair_cms_assets.py`
- `repair_global_public_shell.py`
- `repair_sitewide_nav.py`
- `replace_brand_images_theme.py`
- `reseed_cms_assets.py`
- `resolveModel_tools_patch.py`
- `sync_good_shell_from_about.py`
- `sync_public_shell_from_home.py`
- `wire_cms_dashboard_routes.py`

---
## 2. Dashboard route map

| `?view=` | File | Data | Status |
|---|---|---|---|
| `overview` | `view-overview.jsx` | D1 API | ✅ |
| `animals` | `view-animals.jsx` | D1 API | ✅ |
| `animal-profile` | `view-animals.jsx` | D1 API | ✅ |
| `fosters` | `view-ops.jsx` | ⚠️ CPAS.* mock | 🟡 |
| `adoptions` | `view-ops.jsx` | ⚠️ CPAS.* mock | 🟡 |
| `intakes` | `view-ops.jsx` | ⚠️ CPAS.* mock | 🟡 |
| `medical` | `view-ops.jsx` | ⚠️ CPAS.* mock | 🟡 |
| `daily-care` | `view-ops.jsx` | ⚠️ CPAS.* mock | 🟡 |
| `volunteers` | `view-ops.jsx` | ⚠️ CPAS.* mock | 🟡 |
| `applications` | `view-applications.jsx` | D1 API | ✅ |
| `application-detail` | `view-applications.jsx` | D1 API | ✅ |
| `donations` | `view-finance.jsx` | ⚠️ CPAS.* mock | 🟡 |
| `fundraising` | `view-finance.jsx` | ⚠️ CPAS.* mock | 🟡 |
| `cms` | `view-cms.jsx` | D1 live | ✅ |
| `reports` | `view-reports.jsx` | D1 seed values | 🟢 |
| `settings` | `view-admin.jsx` | ? | ❓ |
| `notifications` | `MISSING` | — | ❌ |

---
## 3. agentsam_* tables (41 tables)

| Table | Rows | Cols | In src/api? | In views? | Status |
|---|---|---|---|---|---|
| `agentsam_agent_run` | 18 | 30 | ✅ agentsam_api.js, resolveModel.js | ❌ | 🟢 LIVE |
| `agentsam_ai_models` | 34 | 12 | ❌ | ❌ | 🟢 SEEDED |
| `agentsam_analytics` | 6 | 24 | ✅ agentsam_api.js | ❌ | 🔴 BROKEN |
| `agentsam_bridge_connections` | 🟡1 | 10 | ❌ | ❌ | 🟡 SEEDED |
| `agentsam_code_index_job` | 🟡2 | 25 | ❌ | ❌ | 🟠 PARTIAL |
| `agentsam_commands` | 10 | 17 | ✅ agentsam_api.js | ❌ | 🟡 SEEDED |
| `agentsam_dev_runs` | 🔴0 | 13 | ❌ | ❌ | 🟡 SCHEMA |
| `agentsam_escalation` | 5 | 12 | ❌ | ❌ | 🟡 SPARSE |
| `agentsam_eval_cases` | 🔴0 | 9 | ❌ | ❌ | 🟡 SCHEMA |
| `agentsam_eval_runs` | 🔴0 | 24 | ❌ | ❌ | 🔴 EMPTY |
| `agentsam_eval_suites` | 🔴0 | 11 | ❌ | ❌ | 🟡 SCHEMA |
| `agentsam_ignore_pattern` | 10 | 8 | ❌ | ❌ | 🟡 SCHEMA |
| `agentsam_intent_rules` | 22 | 11 | ✅ agentsam_api.js | ❌ | 🟡 SEEDED |
| `agentsam_mcp_tools` | 9 | 20 | ❌ | ❌ | 🟢 SEEDED |
| `agentsam_mcp_workflows` | 33 | 17 | ❌ | ❌ | 🟡 SEEDED |
| `agentsam_memory` | 20 | 20 | ❌ | ❌ | 🟡 SEEDED |
| `agentsam_messages` | 42 | 6 | ✅ agentsam_api.js | ❌ | 🟢 LIVE |
| `agentsam_model_catalog` | 28 | 26 | ✅ agentsam_api.js | ❌ | 🟢 SEEDED |
| `agentsam_model_policy` | 14 | 15 | ✅ agentsam_api.js | ❌ | 🟢 SEEDED |
| `agentsam_performance_eto_events` | 🟡3 | 31 | ✅ resolveModel.js | ❌ | 🟡 SPARSE |
| `agentsam_plan_tasks` | 41 | 32 | ❌ | ❌ | 🟢 SEEDED |
| `agentsam_plans` | 5 | 36 | ❌ | ❌ | 🟢 SEEDED |
| `agentsam_project_context` | 🟡2 | 31 | ❌ | ❌ | 🟡 SEEDED |
| `agentsam_reward_events` | 🟡3 | 10 | ✅ agentsam_api.js | ❌ | 🟡 SPARSE |
| `agentsam_routing_arms` | 25 | 25 | ✅ agentsam_api.js, resolveModel.js | ❌ | 🟠 PARTIAL |
| `agentsam_rules_document` | 🟡3 | 12 | ❌ | ❌ | 🟢 WIRED |
| `agentsam_secret_bindings` | 🔴0 | 9 | ❌ | ❌ | 🟡 SEEDED |
| `agentsam_sessions` | 16 | 8 | ✅ agentsam_api.js | ❌ | 🟢 LIVE |
| `agentsam_skill` | 🔴0 | 22 | ❌ | ❌ | 🟡 SEEDED |
| `agentsam_superdev_grants` | 6 | 6 | ❌ | ❌ | 🟡 SEEDED |
| `agentsam_todo` | 15 | 14 | ✅ dashboard_api.js | ❌ | 🟡 SEEDED |
| `agentsam_tool_chain` | 10 | 15 | ✅ agentsam_tools.js | ❌ | 🟢 LIVE |
| `agentsam_tool_result` | 9 | 8 | ✅ agentsam_tools.js | ❌ | 🟢 LIVE |
| `agentsam_tools` | 24 | 15 | ✅ agentsam_api.js, agentsam_tools.js | ❌ | ⚪ UNKNOWN |
| `agentsam_usage_events` | 16 | 20 | ✅ agentsam_api.js | ❌ | 🟢 LIVE |
| `agentsam_usage_rollups_daily` | 🔴0 | 15 | ❌ | ❌ | 🔴 EMPTY |
| `agentsam_workflow_edges` | 19 | 9 | ❌ | ❌ | 🟡 SCHEMA |
| `agentsam_workflow_handlers` | 9 | 14 | ❌ | ❌ | 🟡 SCHEMA |
| `agentsam_workflow_nodes` | 17 | 20 | ❌ | ❌ | 🟡 SCHEMA |
| `agentsam_workflow_runs` | 🟡1 | 28 | ❌ | ❌ | 🔴 EMPTY |
| `agentsam_workflows` | 🟡2 | 19 | ❌ | ❌ | 🟡 SCHEMA |

### `agentsam_agent_run` 🟢 LIVE
**Rows:** 18 · **Columns:** 30 · **Priority:** P3  
**Status note:** Real runs, tokens, costs. 17 rows today.  
**Columns:** `id` TEXT · `tenant_id` TEXT NOT NULL · `workspace_id` TEXT · `user_id` TEXT NOT NULL · `conversation_id` TEXT · `session_id` TEXT · `status` TEXT NOT NULL · `trigger` TEXT · `task_type` TEXT · `mode` TEXT · `model_key` TEXT · `model_catalog_id` TEXT · *+18 more*  
**Referenced in:** src=`agentsam_api.js, resolveModel.js` · views=`none`

### `agentsam_ai_models` 🟢 SEEDED
**Rows:** 34 · **Columns:** 12 · **Priority:** P3  
**Status note:** Active model catalog. gpt-5.4-mini, Workers AI models enabled.  
**Columns:** `id` TEXT · `provider` TEXT NOT NULL · `model_key` TEXT NOT NULL · `display_name` TEXT NOT NULL · `role` TEXT NOT NULL · `runtime` TEXT NOT NULL · `base_url` TEXT · `is_local` INTEGER NOT NULL · `is_enabled` INTEGER NOT NULL · `priority` INTEGER NOT NULL · `notes` TEXT · `updated_at` TEXT NOT NULL  
**Referenced in:** src=`none` · views=`none`

### `agentsam_analytics` 🔴 BROKEN
**Rows:** 6 · **Columns:** 24 · **Priority:** P1 — verify fix  
**Status note:** Write path was missing. patch_analytics_insert.py applied — verify next run.  
**Fix:** Verify patch_analytics_insert.py landed. After next Sam run, check for new row with real tokens/cost.  
**Columns:** `id` TEXT · `tenant_id` TEXT NOT NULL · `user_id` TEXT · `session_id` TEXT · `run_group_id` TEXT · `command_key` TEXT · `tool_key` TEXT · `provider` TEXT NOT NULL · `model_key` TEXT · `runtime_location` TEXT · `mode` TEXT · `status` TEXT NOT NULL · *+12 more*  
**Referenced in:** src=`agentsam_api.js` · views=`none`

### `agentsam_bridge_connections` 🟡 SEEDED
**Rows:** 1 · **Columns:** 10 · **Priority:** P3  
**Status note:** Bridge config present. PTY connection status unknown.  
**Columns:** `id` TEXT · `tenant_id` TEXT NOT NULL · `bridge_key` TEXT NOT NULL · `bridge_name` TEXT NOT NULL · `bridge_type` TEXT NOT NULL · `base_url` TEXT · `auth_secret_name` TEXT · `status` TEXT · `capabilities_json` TEXT · `updated_at` TEXT  
**Referenced in:** src=`none` · views=`none`

### `agentsam_code_index_job` 🟠 PARTIAL
**Rows:** 2 · **Columns:** 25 · **Priority:** P2  
**Status note:** cidx_companionscpas_v1: 94 files, 19 indexed, 0 chunks vectorized. Supabase pgvector not running.  
**Fix:** Re-run indexer after confirming R2 backup keys are current. Wire Supabase embed-on-ingest. Set chunk_count from actual pgvector inserts.  
**Columns:** `id` TEXT · `user_id` TEXT NOT NULL · `workspace_id` TEXT NOT NULL · `status` TEXT NOT NULL · `progress_percent` INTEGER · `source_type` TEXT · `source_path` TEXT · `vector_backend` TEXT · `file_manifest` TEXT · `symbol_summary` TEXT · `dependency_summary` TEXT · `languages` TEXT · *+13 more*  
**Referenced in:** src=`none` · views=`none`

### `agentsam_commands` 🟡 SEEDED
**Rows:** 10 · **Columns:** 17 · **Priority:** P3  
**Status note:** Command registry. resolveAgentCommand() not confirmed wired.  
**Columns:** `id` TEXT · `tenant_id` TEXT NOT NULL · `command_key` TEXT NOT NULL · `command_name` TEXT NOT NULL · `command_category` TEXT NOT NULL · `description` TEXT · `prompt_template` TEXT · `input_schema` TEXT · `output_schema` TEXT · `allowed_roles` TEXT · `allowed_modes` TEXT · `provider_strategy` TEXT · *+5 more*  
**Referenced in:** src=`agentsam_api.js` · views=`none`

### `agentsam_dev_runs` 🟡 SCHEMA
**Rows:** 0 · **Columns:** 13 · **Priority:** P3  
**Status note:** Dev run log. Usage unknown.  
**Columns:** `id` TEXT · `tenant_id` TEXT NOT NULL · `user_id` TEXT · `bridge_key` TEXT · `command_key` TEXT · `requested_command` TEXT · `cwd` TEXT · `status` TEXT · `stdout` TEXT · `stderr` TEXT · `exit_code` INTEGER · `started_at` TEXT · *+1 more*  
**Referenced in:** src=`none` · views=`none`

### `agentsam_escalation` 🟡 SPARSE
**Rows:** 5 · **Columns:** 12 · **Priority:** P3  
**Status note:** 5 rows.  
**Columns:** `id` TEXT · `run_group_id` TEXT NOT NULL · `agent_run_id` TEXT · `chain_index` INTEGER NOT NULL · `model_attempted` TEXT NOT NULL · `succeeded` INTEGER NOT NULL · `input_tokens` INTEGER · `output_tokens` INTEGER · `latency_ms` INTEGER · `error_message` TEXT · `workspace_id` TEXT · `tenant_id` TEXT  
**Referenced in:** src=`none` · views=`none`

### `agentsam_eval_cases` 🟡 SCHEMA
**Rows:** 0 · **Columns:** 9 · **Priority:** P3  
**Status note:** Test cases defined. Not running.  
**Columns:** `id` TEXT · `suite_id` TEXT NOT NULL · `tenant_id` TEXT NOT NULL · `input_prompt` TEXT NOT NULL · `expected_output` TEXT · `grading_criteria` TEXT · `tags` TEXT · `is_edge_case` INTEGER · `sort_order` INTEGER  
**Referenced in:** src=`none` · views=`none`

### `agentsam_eval_runs` 🔴 EMPTY
**Rows:** 0 · **Columns:** 24 · **Priority:** P3  
**Status note:** 0 rows. Eval runner not built.  
**Fix:** Build eval runner after workflow_runner. Feed agentsam_eval_cases through callAI(), score with grader model, write agentsam_eval_runs.  
**Columns:** `id` TEXT · `suite_id` TEXT NOT NULL · `case_id` TEXT · `tenant_id` TEXT NOT NULL · `model_key` TEXT NOT NULL · `provider` TEXT NOT NULL · `routing_arm_id` TEXT · `input_tokens` INTEGER · `output_tokens` INTEGER · `latency_ms` INTEGER · `cost_usd` REAL · `score_quality` REAL · *+12 more*  
**Referenced in:** src=`none` · views=`none`

### `agentsam_eval_suites` 🟡 SCHEMA
**Rows:** 0 · **Columns:** 11 · **Priority:** P3  
**Status note:** Eval framework exists. No runs.  
**Columns:** `id` TEXT · `tenant_id` TEXT NOT NULL · `name` TEXT NOT NULL · `description` TEXT · `provider` TEXT · `mode` TEXT · `task_type` TEXT · `is_active` INTEGER · `run_count` INTEGER · `last_run_at` TEXT · `updated_at` TEXT NOT NULL  
**Referenced in:** src=`none` · views=`none`

### `agentsam_ignore_pattern` 🟡 SCHEMA
**Rows:** 10 · **Columns:** 8 · **Priority:** P3  
**Status note:** Ignore patterns for code indexing.  
**Columns:** `id` TEXT · `user_id` TEXT · `workspace_id` TEXT · `pattern` TEXT NOT NULL · `is_negation` INTEGER NOT NULL · `order_index` INTEGER NOT NULL · `source` TEXT NOT NULL · `updated_at` TEXT NOT NULL  
**Referenced in:** src=`none` · views=`none`

### `agentsam_intent_rules` 🟡 SEEDED
**Rows:** 22 · **Columns:** 11 · **Priority:** P3  
**Status note:** Intent routing rules. classifyIntent() may be hardcoded.  
**Columns:** `id` TEXT · `tenant_id` TEXT NOT NULL · `intent_pattern` TEXT NOT NULL · `task_type` TEXT NOT NULL · `required_tools` TEXT NOT NULL · `optional_tools` TEXT NOT NULL · `min_model_tier` TEXT NOT NULL · `force_tool_model` INTEGER NOT NULL · `description` TEXT · `is_active` INTEGER NOT NULL · `priority` INTEGER NOT NULL  
**Referenced in:** src=`agentsam_api.js` · views=`none`

### `agentsam_mcp_tools` 🟢 SEEDED
**Rows:** 9 · **Columns:** 20 · **Priority:** P3  
**Status note:** MCP tool registry present.  
**Columns:** `id` TEXT · `tenant_id` TEXT NOT NULL · `tool_key` TEXT NOT NULL · `tool_name` TEXT NOT NULL · `display_name` TEXT NOT NULL · `tool_category` TEXT NOT NULL · `description` TEXT · `input_schema` TEXT · `output_schema` TEXT · `intent_tags` TEXT · `modes_json` TEXT · `handler_type` TEXT NOT NULL · *+8 more*  
**Referenced in:** src=`none` · views=`none`

### `agentsam_mcp_workflows` 🟡 SEEDED
**Rows:** 33 · **Columns:** 17 · **Priority:** P3  
**Status note:** Workflow definitions seeded. Not executing.  
**Columns:** `id` TEXT · `tenant_id` TEXT NOT NULL · `workflow_key` TEXT NOT NULL · `workflow_name` TEXT NOT NULL · `description` TEXT · `steps_json` TEXT NOT NULL · `trigger_type` TEXT · `trigger_config` TEXT · `allowed_roles` TEXT · `execution_mode` TEXT · `retry_policy` TEXT · `last_run_at` TEXT · *+5 more*  
**Referenced in:** src=`none` · views=`none`

### `agentsam_memory` 🟡 SEEDED
**Rows:** 20 · **Columns:** 20 · **Priority:** P2  
**Status note:** 20 rows but not injected into system prompt.  
**Fix:** In agentsam_api.js before buildSystemPrompt(): SELECT value FROM agentsam_memory WHERE user_id=? AND confidence>0.7 LIMIT 10. Append as '## Memory' block.  
**Columns:** `id` TEXT · `tenant_id` TEXT NOT NULL · `user_id` TEXT NOT NULL · `workspace_id` TEXT · `memory_type` TEXT · `key` TEXT NOT NULL · `value` TEXT NOT NULL · `source` TEXT · `confidence` REAL · `decay_score` REAL · `recall_count` INTEGER · `last_recalled_at` INTEGER · *+8 more*  
**Referenced in:** src=`none` · views=`none`

### `agentsam_messages` 🟢 LIVE
**Rows:** 42 · **Columns:** 6 · **Priority:** P3  
**Status note:** 40 rows.  
**Columns:** `id` TEXT · `session_id` TEXT NOT NULL · `tenant_id` TEXT NOT NULL · `role` TEXT NOT NULL · `content` TEXT NOT NULL · `metadata_json` TEXT  
**Referenced in:** src=`agentsam_api.js` · views=`none`

### `agentsam_model_catalog` 🟢 SEEDED
**Rows:** 28 · **Columns:** 26 · **Priority:** P3  
**Status note:** Routing catalog with tier/cost/latency metadata.  
**Columns:** `id` TEXT · `model_key` TEXT NOT NULL · `display_name` TEXT NOT NULL · `provider` TEXT NOT NULL · `tier` TEXT NOT NULL · `workers_ai_model_id` TEXT · `openai_model_id` TEXT · `google_model_id` TEXT · `context_window` INTEGER NOT NULL · `max_output_tokens` INTEGER NOT NULL · `cost_per_1k_in` REAL NOT NULL · `cost_per_1k_out` REAL NOT NULL · *+14 more*  
**Referenced in:** src=`agentsam_api.js` · views=`none`

### `agentsam_model_policy` 🟢 SEEDED
**Rows:** 14 · **Columns:** 15 · **Priority:** P3  
**Status note:** 14 task/mode policies defined.  
**Columns:** `id` TEXT · `tenant_id` TEXT NOT NULL · `task_type` TEXT NOT NULL · `mode` TEXT NOT NULL · `min_tier` TEXT NOT NULL · `max_tier` TEXT · `required_caps` TEXT NOT NULL · `preferred_providers` TEXT NOT NULL · `blocked_providers` TEXT NOT NULL · `max_cost_per_call` REAL · `max_latency_ms` INTEGER · `force_tool_capable` INTEGER NOT NULL · *+3 more*  
**Referenced in:** src=`agentsam_api.js` · views=`none`

### `agentsam_performance_eto_events` 🟡 SPARSE
**Rows:** 3 · **Columns:** 31 · **Priority:** P2  
**Status note:** 2 rows. ETO → routing arm feedback loop not active.  
**Fix:** After reward_events INSERT: derive quality_score (1 - latency/sla_ms * 0.5 - cost/max_cost * 0.5). INSERT eto_events. UPDATE routing_arms.avg_quality_score.  
**Columns:** `id` TEXT · `tenant_id` TEXT NOT NULL · `workspace_id` TEXT NOT NULL · `user_id` TEXT · `source_table` TEXT NOT NULL · `source_id` TEXT NOT NULL · `agent_run_id` TEXT · `routing_arm_id` TEXT · `model_catalog_id` TEXT · `task_type` TEXT · `mode` TEXT · `model_key` TEXT · *+19 more*  
**Referenced in:** src=`resolveModel.js` · views=`none`

### `agentsam_plan_tasks` 🟢 SEEDED
**Rows:** 41 · **Columns:** 32 · **Priority:** P3  
**Status note:** 41 tasks across plans.  
**Columns:** `id` TEXT · `tenant_id` TEXT · `workspace_id` TEXT · `plan_id` TEXT NOT NULL · `agent_id` TEXT · `assigned_model` TEXT · `order_index` INTEGER NOT NULL · `title` TEXT NOT NULL · `description` TEXT · `priority` TEXT NOT NULL · `category` TEXT · `status` TEXT NOT NULL · *+20 more*  
**Referenced in:** src=`none` · views=`none`

### `agentsam_plans` 🟢 SEEDED
**Rows:** 5 · **Columns:** 36 · **Priority:** P3  
**Status note:** 5 plans, 41 tasks. Plan runner status unknown.  
**Columns:** `id` TEXT · `tenant_id` TEXT NOT NULL · `workspace_id` TEXT · `session_id` TEXT · `agent_id` TEXT · `client_id` TEXT · `client_name` TEXT · `plan_date` TEXT NOT NULL · `plan_type` TEXT · `title` TEXT NOT NULL · `status` TEXT NOT NULL · `morning_brief` TEXT · *+24 more*  
**Referenced in:** src=`none` · views=`none`

### `agentsam_project_context` 🟡 SEEDED
**Rows:** 2 · **Columns:** 31 · **Priority:** P3  
**Status note:** Project context docs. Not confirmed injected into prompt.  
**Columns:** `id` TEXT · `tenant_id` TEXT NOT NULL · `workspace_id` TEXT · `project_key` TEXT NOT NULL · `project_name` TEXT NOT NULL · `project_type` TEXT · `status` TEXT · `priority` INTEGER · `description` TEXT NOT NULL · `goals` TEXT · `current_blockers` TEXT · `secondary_tables` TEXT · *+19 more*  
**Referenced in:** src=`none` · views=`none`

### `agentsam_reward_events` 🟡 SPARSE
**Rows:** 3 · **Columns:** 10 · **Priority:** P3  
**Status note:** 2 rows only. Thompson reward loop barely firing.  
**Columns:** `id` TEXT · `tenant_id` TEXT NOT NULL · `agent_run_id` TEXT NOT NULL · `routing_arm_id` TEXT · `signal_type` TEXT NOT NULL · `signal_value` REAL NOT NULL · `alpha_delta` REAL NOT NULL · `beta_delta` REAL NOT NULL · `reason` TEXT · `metadata_json` TEXT NOT NULL  
**Referenced in:** src=`agentsam_api.js` · views=`none`

### `agentsam_routing_arms` 🟠 PARTIAL
**Rows:** 25 · **Columns:** 25 · **Priority:** P1  
**Status note:** 25 rows seeded. total_executions=0 for most arms despite 17 runs — UPDATE not matching model_key format.  
**Fix:** In agentsam_api.js completion block: ensure UPDATE WHERE model_key=usedModel matches stored format (strip/add provider prefix consistently).  
**Columns:** `id` TEXT · `workspace_id` TEXT NOT NULL · `task_type` TEXT NOT NULL · `mode` TEXT NOT NULL · `model_key` TEXT NOT NULL · `provider` TEXT NOT NULL · `model_catalog_id` TEXT · `success_alpha` REAL NOT NULL · `success_beta` REAL NOT NULL · `cost_n` INTEGER NOT NULL · `cost_mean` REAL NOT NULL · `latency_n` INTEGER NOT NULL · *+13 more*  
**Referenced in:** src=`agentsam_api.js, resolveModel.js` · views=`none`

### `agentsam_rules_document` 🟢 WIRED
**Rows:** 3 · **Columns:** 12 · **Priority:** P3  
**Status note:** Injected as ## Rules in system prompt.  
**Columns:** `id` TEXT · `user_id` TEXT · `workspace_id` TEXT · `title` TEXT NOT NULL · `body_markdown` TEXT NOT NULL · `version` INTEGER NOT NULL · `is_active` INTEGER NOT NULL · `apply_mode` TEXT NOT NULL · `globs` TEXT · `source` TEXT NOT NULL · `sort_order` INTEGER NOT NULL · `updated_at` TEXT NOT NULL  
**Referenced in:** src=`none` · views=`none`

### `agentsam_secret_bindings` 🟡 SEEDED
**Rows:** 0 · **Columns:** 9 · **Priority:** P3  
**Status note:** Secret bindings registry.  
**Columns:** `id` TEXT · `tenant_id` TEXT NOT NULL · `binding_key` TEXT NOT NULL · `secret_item_id` TEXT · `purpose` TEXT · `allowed_tools_json` TEXT · `allowed_workflows_json` TEXT · `status` TEXT · `updated_at` TEXT  
**Referenced in:** src=`none` · views=`none`

### `agentsam_sessions` 🟢 LIVE
**Rows:** 16 · **Columns:** 8 · **Priority:** P3  
**Status note:** 15 rows.  
**Columns:** `id` TEXT · `tenant_id` TEXT NOT NULL · `user_id` TEXT · `session_title` TEXT · `route_path` TEXT · `mode` TEXT · `status` TEXT · `updated_at` TEXT  
**Referenced in:** src=`agentsam_api.js` · views=`none`

### `agentsam_skill` 🟡 SEEDED
**Rows:** 0 · **Columns:** 22 · **Priority:** P3  
**Status note:** Skills defined. Not confirmed injected into prompt.  
**Columns:** `id` TEXT · `tenant_id` TEXT NOT NULL · `workspace_id` TEXT · `user_id` TEXT NOT NULL · `name` TEXT NOT NULL · `description` TEXT NOT NULL · `content_markdown` TEXT NOT NULL · `scope` TEXT NOT NULL · `slash_trigger` TEXT · `always_apply` INTEGER NOT NULL · `task_types_json` TEXT NOT NULL · `default_model_key` TEXT · *+10 more*  
**Referenced in:** src=`none` · views=`none`

### `agentsam_superdev_grants` 🟡 SEEDED
**Rows:** 6 · **Columns:** 6 · **Priority:** P3  
**Status note:** Superdev grants defined.  
**Columns:** `id` TEXT · `tenant_id` TEXT NOT NULL · `user_id` TEXT NOT NULL · `grant_key` TEXT NOT NULL · `allowed` INTEGER · `expires_at` TEXT  
**Referenced in:** src=`none` · views=`none`

### `agentsam_todo` 🟡 SEEDED
**Rows:** 15 · **Columns:** 14 · **Priority:** P2  
**Status note:** 15 open critical todos. Not surfaced in dashboard.  
**Fix:** Add GET /api/agentsam/todos. Surface as widget in view-overview.jsx. Agent Sam tool: mark_todo_done(id).  
**Columns:** `id` TEXT · `project_key` TEXT NOT NULL · `route_path` TEXT · `title` TEXT NOT NULL · `description` TEXT · `status` TEXT NOT NULL · `priority` TEXT NOT NULL · `category` TEXT · `tool_plan_json` TEXT NOT NULL · `acceptance_criteria_json` TEXT NOT NULL · `linked_table` TEXT · `linked_file` TEXT · *+2 more*  
**Referenced in:** src=`dashboard_api.js` · views=`none`

### `agentsam_tool_chain` 🟢 LIVE
**Rows:** 10 · **Columns:** 15 · **Priority:** P3  
**Status note:** 10 rows. list_tables/query_database tools logging correctly.  
**Columns:** `id` TEXT · `tenant_id` TEXT NOT NULL · `agent_run_id` TEXT NOT NULL · `session_id` TEXT · `chain_index` INTEGER NOT NULL · `tool_key` TEXT NOT NULL · `tool_name` TEXT · `input_args_json` TEXT NOT NULL · `output_json` TEXT · `status` TEXT NOT NULL · `approval_required` INTEGER NOT NULL · `approved_by` TEXT · *+3 more*  
**Referenced in:** src=`agentsam_tools.js` · views=`none`

### `agentsam_tool_result` 🟢 LIVE
**Rows:** 9 · **Columns:** 8 · **Priority:** P3  
**Status note:** 9 rows. Tool results writing.  
**Columns:** `id` TEXT · `tenant_id` TEXT NOT NULL · `chain_id` TEXT NOT NULL · `agent_run_id` TEXT NOT NULL · `tool_key` TEXT NOT NULL · `result_json` TEXT NOT NULL · `row_count` INTEGER · `was_truncated` INTEGER NOT NULL  
**Referenced in:** src=`agentsam_tools.js` · views=`none`

### `agentsam_tools` ⚪
**Rows:** 24 · **Columns:** 15 · **Priority:** P3  
**Status note:** Not audited  
**Columns:** `id` TEXT · `tenant_id` TEXT NOT NULL · `tool_key` TEXT NOT NULL · `tool_name` TEXT NOT NULL · `category` TEXT NOT NULL · `description` TEXT NOT NULL · `function_schema` TEXT NOT NULL · `is_enabled` INTEGER NOT NULL · `requires_approval` INTEGER NOT NULL · `allowed_roles` TEXT NOT NULL · `min_model_tier` TEXT NOT NULL · `usage_count` INTEGER NOT NULL · *+3 more*  
**Referenced in:** src=`agentsam_api.js, agentsam_tools.js` · views=`none`

### `agentsam_usage_events` 🟢 LIVE
**Rows:** 16 · **Columns:** 20 · **Priority:** P3  
**Status note:** 15 rows with real data. Writing correctly.  
**Columns:** `id` TEXT · `tenant_id` TEXT NOT NULL · `workspace_id` TEXT NOT NULL · `user_id` TEXT · `session_id` TEXT · `agent_run_id` TEXT · `routing_arm_id` TEXT · `provider` TEXT NOT NULL · `model_key` TEXT NOT NULL · `task_type` TEXT · `mode` TEXT · `tokens_in` INTEGER NOT NULL · *+8 more*  
**Referenced in:** src=`agentsam_api.js` · views=`none`

### `agentsam_usage_rollups_daily` 🔴 EMPTY
**Rows:** 0 · **Columns:** 15 · **Priority:** P2  
**Status note:** 0 rows. Daily cron not wired. No aggregation running.  
**Fix:** Add wrangler.toml cron: [triggers] crons=['0 0 * * *']. Handler: INSERT INTO agentsam_usage_rollups_daily SELECT from agentsam_usage_events GROUP BY day.  
**Columns:** `tenant_id` TEXT NOT NULL · `workspace_id` TEXT NOT NULL · `day` TEXT NOT NULL · `ai_calls` INTEGER NOT NULL · `tokens_in` INTEGER NOT NULL · `tokens_out` INTEGER NOT NULL · `cost_usd` REAL NOT NULL · `tool_calls` INTEGER NOT NULL · `tool_successes` INTEGER NOT NULL · `tool_failures` INTEGER NOT NULL · `error_count` INTEGER NOT NULL · `provider_breakdown_json` TEXT · *+3 more*  
**Referenced in:** src=`none` · views=`none`

### `agentsam_workflow_edges` 🟡 SCHEMA
**Rows:** 19 · **Columns:** 9 · **Priority:** P3  
**Status note:** Edges defined but no runs.  
**Columns:** `id` TEXT · `workflow_id` TEXT NOT NULL · `from_node_key` TEXT NOT NULL · `to_node_key` TEXT NOT NULL · `condition_json` TEXT · `condition_type` TEXT · `priority` INTEGER · `is_fallback` INTEGER · `label` TEXT  
**Referenced in:** src=`none` · views=`none`

### `agentsam_workflow_handlers` 🟡 SCHEMA
**Rows:** 9 · **Columns:** 14 · **Priority:** P3  
**Status note:** Handler registry exists. Not wired to runner.  
**Columns:** `handler_key` TEXT · `node_type` TEXT NOT NULL · `executor_kind` TEXT NOT NULL · `title` TEXT · `description` TEXT · `handler_config_json` TEXT NOT NULL · `input_schema_json` TEXT NOT NULL · `quality_gate_json` TEXT NOT NULL · `risk_level` TEXT NOT NULL · `requires_approval` INTEGER NOT NULL · `is_active` INTEGER NOT NULL · `tenant_id` TEXT · *+2 more*  
**Referenced in:** src=`none` · views=`none`

### `agentsam_workflow_nodes` 🟡 SCHEMA
**Rows:** 17 · **Columns:** 20 · **Priority:** P3  
**Status note:** Nodes defined but no runs.  
**Columns:** `id` TEXT · `workflow_id` TEXT NOT NULL · `node_key` TEXT NOT NULL · `node_type` TEXT NOT NULL · `title` TEXT NOT NULL · `description` TEXT · `handler_key` TEXT · `input_schema_json` TEXT · `output_schema_json` TEXT · `timeout_ms` INTEGER · `retry_policy_json` TEXT · `quality_gate_json` TEXT · *+8 more*  
**Referenced in:** src=`none` · views=`none`

### `agentsam_workflow_runs` 🔴 EMPTY
**Rows:** 1 · **Columns:** 28 · **Priority:** P1 — high value  
**Status note:** 0 rows. Workflow runner not built.  
**Fix:** Build src/api/workflow_runner.js: load workflow→nodes→edges, execute steps sequentially, write agentsam_workflow_runs + agentsam_plan_tasks.  
**Columns:** `id` TEXT · `workflow_id` TEXT · `workflow_key` TEXT · `display_name` TEXT · `tenant_id` TEXT NOT NULL · `workspace_id` TEXT NOT NULL · `user_id` TEXT · `session_id` TEXT · `trigger_type` TEXT NOT NULL · `status` TEXT NOT NULL · `input_json` TEXT NOT NULL · `output_json` TEXT NOT NULL · *+16 more*  
**Referenced in:** src=`none` · views=`none`

### `agentsam_workflows` 🟡 SCHEMA
**Rows:** 2 · **Columns:** 19 · **Priority:** P3  
**Status note:** Tables exist. No active workflow runs.  
**Columns:** `id` TEXT · `tenant_id` TEXT · `workspace_id` TEXT · `workflow_key` TEXT NOT NULL · `display_name` TEXT NOT NULL · `description` TEXT · `workflow_type` TEXT NOT NULL · `trigger_type` TEXT NOT NULL · `default_mode` TEXT · `default_task_type` TEXT · `risk_level` TEXT · `requires_approval` INTEGER · *+7 more*  
**Referenced in:** src=`none` · views=`none`


---
## 4. cms_* tables (15 tables)

| Table | Rows | Cols | In src/api? | In views? | Status |
|---|---|---|---|---|---|
| `cms_assets` | 53 | 29 | ✅ cms_api.js, dashboard_config_api.js, cms_api_additions.js, dashboard_api.js | ❌ | 🟢 SEEDED |
| `cms_brand_settings` | 🟡3 | 8 | ✅ cms_api.js, dashboard_config_api.js, cms_api_additions.js, render_home.js | ❌ | 🟢 CACHED |
| `cms_editor_events` | 🔴0 | 9 | ❌ | ❌ | 🟡 SCHEMA |
| `cms_editor_sessions` | 🔴0 | 8 | ❌ | ❌ | 🟡 SCHEMA |
| `cms_navigation_items` | 12 | 7 | ✅ cms_api.js, render_home.js, dashboard_api.js | ❌ | 🟢 LIVE |
| `cms_navigation_menus` | 🟡2 | 13 | ❌ | ❌ | 🟢 SEEDED |
| `cms_page_content_blocks` | 9 | 13 | ✅ cms_api.js | ❌ | 🟡 PARTIAL |
| `cms_page_sections` | 11 | 16 | ✅ cms_api_additions.js, agentsam_tools.js, agentsam_api.js, render_home.js, cms_api.js | ✅ view-cms.jsx | 🟢 LIVE |
| `cms_page_versions` | 🔴0 | 9 | ❌ | ❌ | 🔴 EMPTY |
| `cms_pages` | 5 | 11 | ✅ cms_api.js, agentsam_tools.js, dashboard_api.js | ❌ | 🟢 LIVE |
| `cms_publish_artifacts` | 🔴0 | 11 | ❌ | ❌ | 🔴 EMPTY |
| `cms_publish_jobs` | 🔴0 | 14 | ❌ | ❌ | 🔴 EMPTY |
| `cms_revisions` | 🔴0 | 10 | ✅ agentsam_api.js | ❌ | 🔴 EMPTY |
| `cms_section_schemas` | 19 | 13 | ❌ | ❌ | 🟠 SEEDED |
| `cms_themes` | 🟡2 | 9 | ✅ cms_api.js, dashboard_config_api.js, dashboard_api.js | ❌ | 🟢 SEEDED |

### `cms_assets` 🟢 SEEDED
**Rows:** 53 · **Columns:** 29 · **Priority:** P2  
**Status note:** Asset library populated. No asset picker in inspector.  
**Fix:** Add asset picker modal to inspector Image URL field. Fetch /api/cms/assets → thumbnail grid → click populates field.  
**Columns:** `id` TEXT · `tenant_id` TEXT NOT NULL · `asset_key` TEXT NOT NULL · `label` TEXT · `filename` TEXT NOT NULL · `original_filename` TEXT NOT NULL · `alt_text` TEXT · `mime_type` TEXT NOT NULL · `size` INTEGER · `category` TEXT NOT NULL · `asset_type` TEXT NOT NULL · `tags` TEXT · *+17 more*  
**Referenced in:** src=`cms_api.js, dashboard_config_api.js, cms_api_additions.js, dashboard_api.js` · views=`none`

### `cms_brand_settings` 🟢 CACHED
**Rows:** 3 · **Columns:** 8 · **Priority:** P1  
**Status note:** KV-cached 60s. Logo URLs still hardcoded in _shell.js.  
**Fix:** Remove LOGO_DARK/LOGO_LIGHT constants from _shell.js. Use orgData.logo_dark_url/logo_light_url from D1 bootstrap.  
**Columns:** `id` TEXT · `tenant_id` TEXT NOT NULL · `brand_name` TEXT NOT NULL · `logo_url` TEXT · `secondary_color` TEXT · `accent_color` TEXT · `config_json` TEXT · `updated_at` TEXT  
**Referenced in:** src=`cms_api.js, dashboard_config_api.js, cms_api_additions.js, render_home.js` · views=`none`

### `cms_editor_events` 🟡 SCHEMA
**Rows:** 0 · **Columns:** 9 · **Priority:** P3  
**Status note:** Event log for editor actions. Not writing.  
**Fix:** On each inspector save/field change: INSERT cms_editor_events with payload_json diff.  
**Columns:** `id` TEXT · `tenant_id` TEXT NOT NULL · `session_id` TEXT NOT NULL · `user_id` TEXT NOT NULL · `page_id` TEXT · `event_type` TEXT NOT NULL · `entity_type` TEXT · `entity_id` TEXT · `payload_json` TEXT  
**Referenced in:** src=`none` · views=`none`

### `cms_editor_sessions` 🟡 SCHEMA
**Rows:** 0 · **Columns:** 8 · **Priority:** P3  
**Status note:** Editor session tracking not confirmed active.  
**Fix:** On editor mount: POST /api/cms/editor/session. On unmount: PATCH with ended_at.  
**Columns:** `id` TEXT · `tenant_id` TEXT NOT NULL · `user_id` TEXT NOT NULL · `page_id` TEXT · `started_at` TEXT · `ended_at` TEXT · `event_count` INTEGER · `device_type` TEXT  
**Referenced in:** src=`none` · views=`none`

### `cms_navigation_items` 🟢 LIVE
**Rows:** 12 · **Columns:** 7 · **Priority:** P3  
**Status note:** Nav items present. Renders in header.  
**Columns:** `id` TEXT · `tenant_id` TEXT NOT NULL · `label` TEXT NOT NULL · `href` TEXT NOT NULL · `sort_order` INTEGER · `is_visible` INTEGER · `updated_at` TEXT  
**Referenced in:** src=`cms_api.js, render_home.js, dashboard_api.js` · views=`none`

### `cms_navigation_menus` 🟢 SEEDED
**Rows:** 2 · **Columns:** 13 · **Priority:** P3  
**Status note:** Menu definitions present.  
**Columns:** `id` TEXT · `project_id` TEXT NOT NULL · `project_slug` TEXT · `tenant_id` TEXT · `menu_name` TEXT NOT NULL · `menu_type` TEXT · `menu_items` TEXT NOT NULL · `is_active` INTEGER · `r2_bucket` TEXT · `r2_key` TEXT · `r2_url` TEXT · `s3_endpoint` TEXT · *+1 more*  
**Referenced in:** src=`none` · views=`none`

### `cms_page_content_blocks` 🟡 PARTIAL
**Rows:** 9 · **Columns:** 13 · **Priority:** P3  
**Status note:** Table exists. Block-level editing not confirmed in view-cms.jsx.  
**Columns:** `id` TEXT · `tenant_id` TEXT NOT NULL · `page_route` TEXT NOT NULL · `section_key` TEXT NOT NULL · `block_key` TEXT NOT NULL · `block_type` TEXT · `title` TEXT · `body` TEXT · `asset_id` TEXT · `href` TEXT · `sort_order` INTEGER · `config_json` TEXT · *+1 more*  
**Referenced in:** src=`cms_api.js` · views=`none`

### `cms_page_sections` 🟢 LIVE
**Rows:** 11 · **Columns:** 16 · **Priority:** P3  
**Status note:** 11 sections across pages. Editor reads/writes correctly.  
**Columns:** `id` TEXT · `tenant_id` TEXT NOT NULL · `page_route` TEXT NOT NULL · `section_key` TEXT NOT NULL · `section_type` TEXT · `eyebrow` TEXT · `heading` TEXT · `subheading` TEXT · `body` TEXT · `secondary_asset_id` TEXT · `cta_label` TEXT · `cta_href` TEXT · *+4 more*  
**Referenced in:** src=`cms_api_additions.js, agentsam_tools.js, agentsam_api.js, render_home.js, cms_api.js` · views=`view-cms.jsx`

### `cms_page_versions` 🔴 EMPTY
**Rows:** 0 · **Columns:** 9 · **Priority:** P2  
**Status note:** 0 rows. No page versioning.  
**Fix:** On publish: INSERT cms_page_versions with snapshot_json of all sections. UPDATE cms_pages.published_version_id.  
**Columns:** `id` TEXT · `tenant_id` TEXT NOT NULL · `page_id` TEXT NOT NULL · `version_num` INTEGER NOT NULL · `status` TEXT NOT NULL · `snapshot_json` TEXT NOT NULL · `sections_json` TEXT NOT NULL · `theme_snapshot_json` TEXT · `published_at` TEXT  
**Referenced in:** src=`none` · views=`none`

### `cms_pages` 🟢 LIVE
**Rows:** 5 · **Columns:** 11 · **Priority:** P3  
**Status note:** 5 pages. 1 published (homepage), 4 drafts.  
**Columns:** `id` TEXT · `tenant_id` TEXT NOT NULL · `route_path` TEXT NOT NULL · `slug` TEXT NOT NULL · `title` TEXT NOT NULL · `status` TEXT NOT NULL · `seo_title` TEXT · `meta_description` TEXT · `og_image_url` TEXT · `published_at` TEXT · `updated_at` TEXT  
**Referenced in:** src=`cms_api.js, agentsam_tools.js, dashboard_api.js` · views=`none`

### `cms_publish_artifacts` 🔴 EMPTY
**Rows:** 0 · **Columns:** 11 · **Priority:** P3  
**Status note:** 0 rows. R2 artifact pipeline not running.  
**Columns:** `id` TEXT · `tenant_id` TEXT NOT NULL · `job_id` TEXT NOT NULL · `page_id` TEXT · `artifact_type` TEXT NOT NULL · `r2_key` TEXT NOT NULL · `r2_bucket` TEXT NOT NULL · `content_hash` TEXT · `size_bytes` INTEGER · `version` INTEGER · `is_current` INTEGER  
**Referenced in:** src=`none` · views=`none`

### `cms_publish_jobs` 🔴 EMPTY
**Rows:** 0 · **Columns:** 14 · **Priority:** P1  
**Status note:** 0 rows. Publish button saves to D1 but never fires a publish job.  
**Fix:** On Publish click in view-cms.jsx: POST /api/cms/publish → INSERT cms_publish_jobs → worker renders HTML → pushes to R2 → SSE status back to editor.  
**Columns:** `id` TEXT · `tenant_id` TEXT NOT NULL · `page_id` TEXT · `job_type` TEXT NOT NULL · `status` TEXT NOT NULL · `scheduled_at` TEXT · `started_at` TEXT · `completed_at` TEXT · `triggered_by` TEXT · `artifacts_json` TEXT · `error_message` TEXT · `r2_prefix` TEXT · *+2 more*  
**Referenced in:** src=`none` · views=`none`

### `cms_revisions` 🔴 EMPTY
**Rows:** 0 · **Columns:** 10 · **Priority:** P1  
**Status note:** 0 rows. No revision trail. Every save overwrites with no history.  
**Fix:** In cms_api.js before every section UPDATE: INSERT cms_revisions (entity_type='section', change_type='update', before_json=old, after_json=new).  
**Columns:** `id` TEXT · `tenant_id` TEXT NOT NULL · `entity_type` TEXT NOT NULL · `entity_id` TEXT NOT NULL · `page_id` TEXT · `change_type` TEXT NOT NULL · `field_changed` TEXT · `before_json` TEXT · `after_json` TEXT · `summary` TEXT  
**Referenced in:** src=`agentsam_api.js` · views=`none`

### `cms_section_schemas` 🟠 SEEDED
**Rows:** 19 · **Columns:** 13 · **Priority:** P1 — big UX win  
**Status note:** 19 schemas. Inspector fields hardcoded — not driven by schema_json.  
**Fix:** In view-cms.jsx inspector: fetch /api/cms/section-schema?type={section_type} → render fields from schema_json instead of hardcoded fields.  
**Columns:** `id` TEXT · `tenant_id` TEXT NOT NULL · `section_type` TEXT NOT NULL · `label` TEXT NOT NULL · `category` TEXT NOT NULL · `description` TEXT · `preview_image_url` TEXT · `schema_json` TEXT NOT NULL · `default_json` TEXT NOT NULL · `max_per_page` INTEGER · `is_active` INTEGER NOT NULL · `sort_order` INTEGER NOT NULL · *+1 more*  
**Referenced in:** src=`none` · views=`none`

### `cms_themes` 🟢 SEEDED
**Rows:** 2 · **Columns:** 9 · **Priority:** P1  
**Status note:** 2 themes published. css_vars_json not confirmed flowing to render_home.js.  
**Fix:** In render_home.js: SELECT css_vars_json FROM cms_themes WHERE is_active=1. Inject as <style>:root{...}</style> in pageShell().  
**Columns:** `id` TEXT · `tenant_id` TEXT NOT NULL · `theme_key` TEXT NOT NULL · `theme_name` TEXT NOT NULL · `description` TEXT · `mode` TEXT · `is_active` INTEGER · `tokens_json` TEXT NOT NULL · `updated_at` TEXT  
**Referenced in:** src=`cms_api.js, dashboard_config_api.js, dashboard_api.js` · views=`none`


---
## 5. cpas_* tables (6 tables)

| Table | Rows | Cols | In src/api? | In views? | Status |
|---|---|---|---|---|---|
| `cpas_application_email_logs` | 🟡2 | 12 | ❌ | ❌ | ⚪ UNKNOWN |
| `cpas_application_events` | 🟡3 | 5 | ❌ | ❌ | ⚪ UNKNOWN |
| `cpas_application_fields` | 🔴0 | 15 | ❌ | ❌ | ⚪ UNKNOWN |
| `cpas_application_forms` | 🟡1 | 9 | ❌ | ❌ | ⚪ UNKNOWN |
| `cpas_application_steps` | 🔴0 | 8 | ❌ | ❌ | ⚪ UNKNOWN |
| `cpas_foster_applications` | 🟡4 | 26 | ✅ agentsam_api.js, dashboard_api.js | ❌ | ⚪ UNKNOWN |

### `cpas_application_email_logs` ⚪
**Rows:** 2 · **Columns:** 12 · **Priority:** P3  
**Status note:** Not audited  
**Columns:** `id` TEXT · `application_id` TEXT · `email_type` TEXT NOT NULL · `provider` TEXT NOT NULL · `resend_message_id` TEXT · `from_email` TEXT · `to_email` TEXT NOT NULL · `subject` TEXT NOT NULL · `status` TEXT NOT NULL · `payload_json` TEXT · `error_message` TEXT · `sent_at` TEXT  
**Referenced in:** src=`none` · views=`none`

### `cpas_application_events` ⚪
**Rows:** 3 · **Columns:** 5 · **Priority:** P3  
**Status note:** Not audited  
**Columns:** `id` TEXT · `application_id` TEXT NOT NULL · `event_type` TEXT NOT NULL · `event_title` TEXT · `event_json` TEXT  
**Referenced in:** src=`none` · views=`none`

### `cpas_application_fields` ⚪
**Rows:** 0 · **Columns:** 15 · **Priority:** P3  
**Status note:** Not audited  
**Columns:** `id` TEXT · `form_id` TEXT NOT NULL · `step_id` TEXT NOT NULL · `field_key` TEXT NOT NULL · `label` TEXT NOT NULL · `helper_text` TEXT · `placeholder` TEXT · `field_type` TEXT NOT NULL · `is_required` INTEGER NOT NULL · `options_json` TEXT · `validation_json` TEXT · `conditional_json` TEXT · *+3 more*  
**Referenced in:** src=`none` · views=`none`

### `cpas_application_forms` ⚪
**Rows:** 1 · **Columns:** 9 · **Priority:** P3  
**Status note:** Not audited  
**Columns:** `id` TEXT · `tenant_id` TEXT NOT NULL · `form_key` TEXT NOT NULL · `title` TEXT NOT NULL · `description` TEXT · `status` TEXT NOT NULL · `intro_json` TEXT · `settings_json` TEXT · `updated_at` TEXT NOT NULL  
**Referenced in:** src=`none` · views=`none`

### `cpas_application_steps` ⚪
**Rows:** 0 · **Columns:** 8 · **Priority:** P3  
**Status note:** Not audited  
**Columns:** `id` TEXT · `form_id` TEXT NOT NULL · `step_key` TEXT NOT NULL · `title` TEXT NOT NULL · `description` TEXT · `sort_order` INTEGER NOT NULL · `is_active` INTEGER NOT NULL · `updated_at` TEXT NOT NULL  
**Referenced in:** src=`none` · views=`none`

### `cpas_foster_applications` ⚪
**Rows:** 4 · **Columns:** 26 · **Priority:** P3  
**Status note:** Not audited  
**Columns:** `id` TEXT · `form_id` TEXT NOT NULL · `tenant_id` TEXT NOT NULL · `status` TEXT NOT NULL · `review_status` TEXT NOT NULL · `source` TEXT · `first_name` TEXT · `last_name` TEXT · `email` TEXT · `phone` TEXT · `street_address` TEXT · `apartment_suite` TEXT · *+14 more*  
**Referenced in:** src=`agentsam_api.js, dashboard_api.js` · views=`none`


---
## 6. Core tables (33 tables)

| Table | Rows | Cols | In src/api? | In views? | Status |
|---|---|---|---|---|---|
| `admin_users` | 5 | 6 | ❌ | ❌ | ⚪ UNKNOWN |
| `animal_profiles` | 17 | 13 | ✅ agentsam_api.js, dashboard_api.js | ✅ data.js | ⚪ UNKNOWN |
| `animals` | 🔴0 | 5 | ✅ agentsam_tools.js, dashboard_api.js, agentsam_api.js, render_home.js, payments_email.js | ✅ data.js, ui.jsx, view-ops.jsx, app.jsx, view-admin.jsx, view-animals.jsx, view-applications.jsx, view-overview.jsx, view-reports.jsx | ⚪ UNKNOWN |
| `applications` | 🟡4 | 5 | ✅ agentsam_api.js, agentsam_tools.js, dashboard_api.js | ✅ data.js, agentsam.jsx, ui.jsx, app.jsx, view-admin.jsx, view-animals.jsx, view-applications.jsx, view-reports.jsx | ⚪ UNKNOWN |
| `audit_log` | 🔴0 | 8 | ❌ | ❌ | ⚪ UNKNOWN |
| `campaign_updates` | 🔴0 | 9 | ❌ | ❌ | ⚪ UNKNOWN |
| `care_tasks` | 🔴0 | 12 | ✅ dashboard_api.js | ❌ | ⚪ UNKNOWN |
| `contact_requests` | 🔴0 | 5 | ✅ payments_email.js, contact_api.js | ❌ | ⚪ UNKNOWN |
| `context_index` | 6 | 28 | ❌ | ❌ | ⚪ UNKNOWN |
| `dashboard_calendar_events` | 6 | 8 | ✅ dashboard_api.js | ❌ | ⚪ UNKNOWN |
| `donation_intents` | 🟡1 | 15 | ✅ donation_api.js | ❌ | ⚪ UNKNOWN |
| `donation_payments` | 🔴0 | 11 | ❌ | ❌ | ⚪ UNKNOWN |
| `donation_settings` | 🔴0 | 12 | ❌ | ❌ | ⚪ UNKNOWN |
| `donations` | 🔴0 | 12 | ✅ agentsam_tools.js, dashboard_api.js, agentsam_api.js, donation_api.js, payments_email.js | ✅ data.js, ui.jsx, app.jsx, view-admin.jsx, view-overview.jsx, view-reports.jsx, view-finance.jsx | ⚪ UNKNOWN |
| `donors` | 🔴0 | 11 | ❌ | ✅ view-finance.jsx, data.js, view-admin.jsx, view-reports.jsx | ⚪ UNKNOWN |
| `email_events` | 🔴0 | 11 | ❌ | ❌ | ⚪ UNKNOWN |
| `email_templates` | 🟡2 | 9 | ❌ | ❌ | ⚪ UNKNOWN |
| `foster_records` | 5 | 8 | ✅ agentsam_api.js, dashboard_api.js | ❌ | ⚪ UNKNOWN |
| `fundraising_campaigns` | 🔴0 | 13 | ✅ dashboard_api.js | ✅ data.js | ⚪ UNKNOWN |
| `fundraising_campaigns_demo` | 🟡3 | 8 | ✅ dashboard_api.js | ✅ data.js | ⚪ UNKNOWN |
| `oauth_accounts` | 🔴0 | 11 | ❌ | ❌ | ⚪ UNKNOWN |
| `organizations` | 🔴0 | 17 | ❌ | ❌ | ⚪ UNKNOWN |
| `password_reset_tokens` | 🔴0 | 8 | ✅ password_reset.js | ❌ | ⚪ UNKNOWN |
| `role_permissions` | 14 | 3 | ❌ | ❌ | ⚪ UNKNOWN |
| `secret_vault_access_log` | 🔴0 | 9 | ❌ | ❌ | ⚪ UNKNOWN |
| `secret_vault_items` | 🔴0 | 14 | ❌ | ❌ | ⚪ UNKNOWN |
| `sessions` | 37 | 3 | ✅ auth_login.js, agentsam_tools.js, agentsam_api.js, payments_email.js, session_api.js | ❌ | ⚪ UNKNOWN |
| `tenant_memberships` | 5 | 9 | ✅ agentsam_tools.js, session_api.js | ❌ | ⚪ UNKNOWN |
| `tenants` | 🟡1 | 6 | ❌ | ❌ | ⚪ UNKNOWN |
| `user_credentials` | 5 | 8 | ✅ password_reset.js, auth_login.js, agentsam_tools.js | ❌ | ⚪ UNKNOWN |
| `user_security_events` | 🔴0 | 8 | ❌ | ❌ | ⚪ UNKNOWN |
| `users` | 5 | 8 | ✅ password_reset.js, auth_login.js, agentsam_tools.js, agentsam_api.js, session_api.js | ✅ view-admin.jsx | ⚪ UNKNOWN |
| `volunteer_records` | 🟡3 | 7 | ✅ dashboard_api.js | ✅ data.js | ⚪ UNKNOWN |

### `admin_users` ⚪
**Rows:** 5 · **Columns:** 6 · **Priority:** P3  
**Status note:** Not audited  
**Columns:** `id` TEXT · `email` TEXT NOT NULL · `full_name` TEXT · `password_hash` TEXT · `role` TEXT · `is_active` INTEGER  
**Referenced in:** src=`none` · views=`none`

### `animal_profiles` ⚪
**Rows:** 17 · **Columns:** 13 · **Priority:** P3  
**Status note:** Not audited  
**Columns:** `id` TEXT · `tenant_id` TEXT NOT NULL · `name` TEXT NOT NULL · `species` TEXT NOT NULL · `breed` TEXT · `sex` TEXT · `age_label` TEXT · `status` TEXT · `location` TEXT · `intake_date` TEXT · `photo_url` TEXT · `bio` TEXT · *+1 more*  
**Referenced in:** src=`agentsam_api.js, dashboard_api.js` · views=`data.js`

### `animals` ⚪
**Rows:** 0 · **Columns:** 5 · **Priority:** P3  
**Status note:** Not audited  
**Columns:** `id` TEXT · `name` TEXT · `breed` TEXT · `age` TEXT · `status` TEXT  
**Referenced in:** src=`agentsam_tools.js, dashboard_api.js, agentsam_api.js, render_home.js, payments_email.js` · views=`data.js, ui.jsx, view-ops.jsx, app.jsx, view-admin.jsx, view-animals.jsx, view-applications.jsx, view-overview.jsx, view-reports.jsx`

### `applications` ⚪
**Rows:** 4 · **Columns:** 5 · **Priority:** P3  
**Status note:** Not audited  
**Columns:** `id` TEXT · `applicant_name` TEXT · `applicant_email` TEXT · `animal_name` TEXT · `status` TEXT  
**Referenced in:** src=`agentsam_api.js, agentsam_tools.js, dashboard_api.js` · views=`data.js, agentsam.jsx, ui.jsx, app.jsx, view-admin.jsx, view-animals.jsx, view-applications.jsx, view-reports.jsx`

### `audit_log` ⚪
**Rows:** 0 · **Columns:** 8 · **Priority:** P3  
**Status note:** Not audited  
**Columns:** `id` TEXT · `tenant_id` TEXT · `actor_user_id` TEXT · `action` TEXT NOT NULL · `entity_type` TEXT · `entity_id` TEXT · `metadata_json` TEXT · `ip_address` TEXT  
**Referenced in:** src=`none` · views=`none`

### `campaign_updates` ⚪
**Rows:** 0 · **Columns:** 9 · **Priority:** P3  
**Status note:** Not audited  
**Columns:** `id` TEXT · `tenant_id` TEXT NOT NULL · `campaign_id` TEXT NOT NULL · `title` TEXT NOT NULL · `body` TEXT · `image_asset_id` TEXT · `is_public` INTEGER · `published_at` TEXT · `updated_at` TEXT  
**Referenced in:** src=`none` · views=`none`

### `care_tasks` ⚪
**Rows:** 0 · **Columns:** 12 · **Priority:** P3  
**Status note:** Not audited  
**Columns:** `id` TEXT · `organization_id` TEXT NOT NULL · `animal_id` TEXT NOT NULL · `task_type` TEXT NOT NULL · `title` TEXT NOT NULL · `description` TEXT · `status` TEXT · `priority` TEXT · `due_at` TEXT · `completed_at` TEXT · `assigned_to_user_id` TEXT · `updated_at` TEXT  
**Referenced in:** src=`dashboard_api.js` · views=`none`

### `contact_requests` ⚪
**Rows:** 0 · **Columns:** 5 · **Priority:** P3  
**Status note:** Not audited  
**Columns:** `id` TEXT · `name` TEXT · `email` TEXT · `message` TEXT · `status` TEXT  
**Referenced in:** src=`payments_email.js, contact_api.js` · views=`none`

### `context_index` ⚪
**Rows:** 6 · **Columns:** 28 · **Priority:** P3  
**Status note:** Not audited  
**Columns:** `id` TEXT · `tenant_id` TEXT NOT NULL · `title` TEXT NOT NULL · `slug` TEXT NOT NULL · `doc_type` TEXT NOT NULL · `category` TEXT · `tags` TEXT · `storage_type` TEXT NOT NULL · `r2_bucket` TEXT · `r2_key` TEXT · `external_url` TEXT · `d1_table` TEXT · *+16 more*  
**Referenced in:** src=`none` · views=`none`

### `dashboard_calendar_events` ⚪
**Rows:** 6 · **Columns:** 8 · **Priority:** P3  
**Status note:** Not audited  
**Columns:** `id` TEXT · `tenant_id` TEXT NOT NULL · `title` TEXT NOT NULL · `event_type` TEXT · `starts_at` TEXT · `platform` TEXT · `content` TEXT · `status` TEXT  
**Referenced in:** src=`dashboard_api.js` · views=`none`

### `donation_intents` ⚪
**Rows:** 1 · **Columns:** 15 · **Priority:** P3  
**Status note:** Not audited  
**Columns:** `id` TEXT · `tenant_id` TEXT NOT NULL · `donor_name` TEXT NOT NULL · `donor_email` TEXT NOT NULL · `amount_cents` INTEGER NOT NULL · `frequency` TEXT NOT NULL · `campaign_id` TEXT · `note` TEXT · `provider` TEXT · `provider_checkout_id` TEXT · `provider_checkout_url` TEXT · `status` TEXT · *+3 more*  
**Referenced in:** src=`donation_api.js` · views=`none`

### `donation_payments` ⚪
**Rows:** 0 · **Columns:** 11 · **Priority:** P3  
**Status note:** Not audited  
**Columns:** `id` TEXT · `tenant_id` TEXT NOT NULL · `donation_id` TEXT NOT NULL · `provider` TEXT NOT NULL · `provider_payment_id` TEXT · `provider_checkout_session_id` TEXT · `amount_cents` INTEGER NOT NULL · `currency` TEXT · `status` TEXT · `raw_json` TEXT · `updated_at` TEXT  
**Referenced in:** src=`none` · views=`none`

### `donation_settings` ⚪
**Rows:** 0 · **Columns:** 12 · **Priority:** P3  
**Status note:** Not audited  
**Columns:** `id` TEXT · `tenant_id` TEXT NOT NULL · `provider` TEXT NOT NULL · `currency` TEXT NOT NULL · `default_amounts_json` TEXT · `allow_custom_amount` INTEGER · `enable_donor_message` INTEGER · `enable_anonymous_gifts` INTEGER · `success_redirect_path` TEXT · `cancel_redirect_path` TEXT · `thank_you_email_template_id` TEXT · `updated_at` TEXT  
**Referenced in:** src=`none` · views=`none`

### `donations` ⚪
**Rows:** 0 · **Columns:** 12 · **Priority:** P3  
**Status note:** Not audited  
**Columns:** `id` TEXT · `organization_id` TEXT NOT NULL · `donor_id` TEXT · `campaign_id` TEXT · `amount_cents` INTEGER NOT NULL · `currency` TEXT · `status` TEXT · `payment_provider` TEXT · `stripe_payment_intent_id` TEXT · `donor_message` TEXT · `is_anonymous` INTEGER · `donated_at` TEXT  
**Referenced in:** src=`agentsam_tools.js, dashboard_api.js, agentsam_api.js, donation_api.js, payments_email.js` · views=`data.js, ui.jsx, app.jsx, view-admin.jsx, view-overview.jsx, view-reports.jsx, view-finance.jsx`

### `donors` ⚪
**Rows:** 0 · **Columns:** 11 · **Priority:** P3  
**Status note:** Not audited  
**Columns:** `id` TEXT · `tenant_id` TEXT NOT NULL · `full_name` TEXT · `email` TEXT · `phone` TEXT · `stripe_customer_id` TEXT · `total_given_cents` INTEGER · `donation_count` INTEGER · `last_donated_at` TEXT · `notes` TEXT · `updated_at` TEXT  
**Referenced in:** src=`none` · views=`view-finance.jsx, data.js, view-admin.jsx, view-reports.jsx`

### `email_events` ⚪
**Rows:** 0 · **Columns:** 11 · **Priority:** P3  
**Status note:** Not audited  
**Columns:** `id` TEXT · `tenant_id` TEXT NOT NULL · `template_id` TEXT · `recipient_email` TEXT NOT NULL · `subject` TEXT · `provider` TEXT · `provider_message_id` TEXT · `status` TEXT · `related_type` TEXT · `related_id` TEXT · `sent_at` TEXT  
**Referenced in:** src=`none` · views=`none`

### `email_templates` ⚪
**Rows:** 2 · **Columns:** 9 · **Priority:** P3  
**Status note:** Not audited  
**Columns:** `id` TEXT · `tenant_id` TEXT NOT NULL · `provider` TEXT · `template_key` TEXT NOT NULL · `subject` TEXT NOT NULL · `body_text` TEXT · `body_html` TEXT · `status` TEXT · `updated_at` TEXT  
**Referenced in:** src=`none` · views=`none`

### `foster_records` ⚪
**Rows:** 5 · **Columns:** 8 · **Priority:** P3  
**Status note:** Not audited  
**Columns:** `id` TEXT · `tenant_id` TEXT NOT NULL · `animal_id` TEXT · `foster_name` TEXT · `foster_email` TEXT · `status` TEXT · `start_date` TEXT · `notes` TEXT  
**Referenced in:** src=`agentsam_api.js, dashboard_api.js` · views=`none`

### `fundraising_campaigns` ⚪
**Rows:** 0 · **Columns:** 13 · **Priority:** P3  
**Status note:** Not audited  
**Columns:** `id` TEXT · `organization_id` TEXT NOT NULL · `title` TEXT NOT NULL · `slug` TEXT NOT NULL · `description` TEXT · `goal_amount_cents` INTEGER · `raised_amount_cents` INTEGER · `status` TEXT · `cover_asset_id` TEXT · `starts_at` TEXT · `ends_at` TEXT · `is_public` INTEGER · *+1 more*  
**Referenced in:** src=`dashboard_api.js` · views=`data.js`

### `fundraising_campaigns_demo` ⚪
**Rows:** 3 · **Columns:** 8 · **Priority:** P3  
**Status note:** Not audited  
**Columns:** `id` TEXT · `tenant_id` TEXT NOT NULL · `title` TEXT NOT NULL · `goal_cents` INTEGER · `raised_cents` INTEGER · `status` TEXT · `starts_at` TEXT · `ends_at` TEXT  
**Referenced in:** src=`dashboard_api.js` · views=`data.js`

### `oauth_accounts` ⚪
**Rows:** 0 · **Columns:** 11 · **Priority:** P3  
**Status note:** Not audited  
**Columns:** `id` TEXT · `user_id` TEXT NOT NULL · `provider` TEXT NOT NULL · `provider_user_id` TEXT NOT NULL · `email` TEXT · `access_token_encrypted` TEXT · `refresh_token_encrypted` TEXT · `token_expires_at` TEXT · `scopes` TEXT · `raw_profile_json` TEXT · `updated_at` TEXT  
**Referenced in:** src=`none` · views=`none`

### `organizations` ⚪
**Rows:** 0 · **Columns:** 17 · **Priority:** P3  
**Status note:** Not audited  
**Columns:** `id` TEXT · `name` TEXT NOT NULL · `legal_name` TEXT · `organization_type` TEXT · `ein` TEXT · `sector` TEXT · `parish` TEXT · `parishes_served` TEXT · `operating_budget_label` TEXT · `email` TEXT · `website_url` TEXT · `city` TEXT · *+5 more*  
**Referenced in:** src=`none` · views=`none`

### `password_reset_tokens` ⚪
**Rows:** 0 · **Columns:** 8 · **Priority:** P3  
**Status note:** Not audited  
**Columns:** `id` TEXT · `tenant_id` TEXT NOT NULL · `user_id` TEXT NOT NULL · `token_hash` TEXT NOT NULL · `requested_by_ip` TEXT · `user_agent` TEXT · `expires_at` TEXT NOT NULL · `used_at` TEXT  
**Referenced in:** src=`password_reset.js` · views=`none`

### `role_permissions` ⚪
**Rows:** 14 · **Columns:** 3 · **Priority:** P3  
**Status note:** Not audited  
**Columns:** `id` TEXT · `role` TEXT NOT NULL · `permission` TEXT NOT NULL  
**Referenced in:** src=`none` · views=`none`

### `secret_vault_access_log` ⚪
**Rows:** 0 · **Columns:** 9 · **Priority:** P3  
**Status note:** Not audited  
**Columns:** `id` TEXT · `tenant_id` TEXT NOT NULL · `secret_item_id` TEXT · `actor_user_id` TEXT · `action` TEXT NOT NULL · `allowed` INTEGER · `ip_address` TEXT · `user_agent` TEXT · `metadata_json` TEXT  
**Referenced in:** src=`none` · views=`none`

### `secret_vault_items` ⚪
**Rows:** 0 · **Columns:** 14 · **Priority:** P3  
**Status note:** Not audited  
**Columns:** `id` TEXT · `tenant_id` TEXT NOT NULL · `owner_user_id` TEXT · `secret_key` TEXT NOT NULL · `display_name` TEXT NOT NULL · `secret_type` TEXT NOT NULL · `provider` TEXT · `encrypted_value` TEXT NOT NULL · `encryption_key_version` TEXT · `masked_preview` TEXT · `status` TEXT · `last_used_at` TEXT · *+2 more*  
**Referenced in:** src=`none` · views=`none`

### `sessions` ⚪
**Rows:** 37 · **Columns:** 3 · **Priority:** P3  
**Status note:** Not audited  
**Columns:** `id` TEXT · `user_id` TEXT · `expires_at` TEXT  
**Referenced in:** src=`auth_login.js, agentsam_tools.js, agentsam_api.js, payments_email.js, session_api.js` · views=`none`

### `tenant_memberships` ⚪
**Rows:** 5 · **Columns:** 9 · **Priority:** P3  
**Status note:** Not audited  
**Columns:** `id` TEXT · `tenant_id` TEXT NOT NULL · `user_id` TEXT NOT NULL · `role` TEXT NOT NULL · `status` TEXT NOT NULL · `invited_by` TEXT · `invited_at` TEXT · `accepted_at` TEXT · `updated_at` TEXT  
**Referenced in:** src=`agentsam_tools.js, session_api.js` · views=`none`

### `tenants` ⚪
**Rows:** 1 · **Columns:** 6 · **Priority:** P3  
**Status note:** Not audited  
**Columns:** `id` TEXT · `slug` TEXT NOT NULL · `name` TEXT NOT NULL · `domain` TEXT · `status` TEXT NOT NULL · `updated_at` TEXT  
**Referenced in:** src=`none` · views=`none`

### `user_credentials` ⚪
**Rows:** 5 · **Columns:** 8 · **Priority:** P3  
**Status note:** Not audited  
**Columns:** `id` TEXT · `user_id` TEXT NOT NULL · `provider` TEXT NOT NULL · `provider_user_id` TEXT · `password_hash` TEXT · `password_salt` TEXT · `password_algo` TEXT · `updated_at` TEXT  
**Referenced in:** src=`password_reset.js, auth_login.js, agentsam_tools.js` · views=`none`

### `user_security_events` ⚪
**Rows:** 0 · **Columns:** 8 · **Priority:** P3  
**Status note:** Not audited  
**Columns:** `id` TEXT · `tenant_id` TEXT NOT NULL · `user_id` TEXT · `event_type` TEXT NOT NULL · `severity` TEXT · `ip_address` TEXT · `user_agent` TEXT · `metadata_json` TEXT  
**Referenced in:** src=`none` · views=`none`

### `users` ⚪
**Rows:** 5 · **Columns:** 8 · **Priority:** P3  
**Status note:** Not audited  
**Columns:** `id` TEXT · `email` TEXT NOT NULL · `full_name` TEXT · `display_name` TEXT · `avatar_url` TEXT · `status` TEXT NOT NULL · `updated_at` TEXT · `last_login_at` TEXT  
**Referenced in:** src=`password_reset.js, auth_login.js, agentsam_tools.js, agentsam_api.js, session_api.js` · views=`view-admin.jsx`

### `volunteer_records` ⚪
**Rows:** 3 · **Columns:** 7 · **Priority:** P3  
**Status note:** Not audited  
**Columns:** `id` TEXT · `tenant_id` TEXT NOT NULL · `full_name` TEXT NOT NULL · `email` TEXT · `role` TEXT · `status` TEXT · `hours_month` INTEGER  
**Referenced in:** src=`dashboard_api.js` · views=`data.js`


---
## 7. Files to build / remaster

| File | Action |
|---|---|
| `src/api/agentsam_api.js` | Fix routing_arms UPDATE model_key format. Inject agentsam_memory into system prompt. Wire agentsam_todo read. |
| `src/api/workflow_runner.js` | NEW — minimal sequential workflow executor. Reads agentsam_workflows+nodes+edges. Writes agentsam_workflow_runs. |
| `src/api/cms_api.js` | Add cms_revisions INSERT before every UPDATE. Add /api/cms/publish endpoint firing cms_publish_jobs. Wire css_vars_json from cms_themes into render. |
| `src/api/render_home.js` | Remove hardcoded LOGO_DARK/LOGO_LIGHT. Read logo_dark_url/logo_light_url from cms_brand_settings orgData. |
| `src/api/dashboard_api.js` | Add GET /api/dashboard/reports returning aggregate stats: animals, applications, donations, volunteers, ai_usage from D1. |
| `public/dashboard/js/view-cms.jsx` | Dynamic inspector fields from cms_section_schemas. Asset picker modal. Revision trail sidebar. Publish pipeline SSE. |
| `public/dashboard/js/view-ops.jsx` | Wire all 6 views to real D1 API endpoints. Remove CPAS.* mock data dependency entirely. |
| `public/dashboard/js/view-finance.jsx` | Wire donations + fundraising to donation_intents / fundraising_campaigns_demo. Remove CPAS.* mock. |
| `public/dashboard/js/view-overview.jsx` | Add Agent Sam cost card: runs MTD, cost MTD, avg latency, failure rate from agentsam_agent_run. |
| `public/dashboard/js/_core.js` | NEW — shared constants: C colors, fmt helpers, StatCard, Badge, ProgressBar, ChartBox. Load once, global to all views. |
| `wrangler.toml` | Add cron trigger for daily usage rollup: [triggers] crons = ['0 0 * * *'] |

---
## 8. AgentSam CMS workflow proposals

### `cms_animal_status_sync` — Animal status → CMS sync
**Trigger:** manual or on animal_profiles UPDATE  
**Steps:**
1. `query_database: featured available animals`
2. `agent_llm: rewrite foster_grid section content`
3. `d1_write: UPDATE cms_page_sections WHERE section_key=foster_grid`
4. `approval_gate: Sam reviews diff`
5. `d1_write: INSERT cms_publish_jobs`

### `cms_campaign_refresh` — Campaign progress → donate page
**Trigger:** manual or on donation INSERT  
**Steps:**
1. `query_database: fundraising_campaigns_demo totals`
2. `agent_llm: rewrite donate_intro body with live totals`
3. `d1_write: UPDATE cms_page_sections WHERE section_key=donate_intro`
4. `d1_write: INSERT cms_publish_jobs`

### `cms_homepage_refresh` — Homepage full refresh
**Trigger:** manual  
**Steps:**
1. `query_database: available animals + current sections`
2. `agent_llm: propose hero heading + mission body`
3. `approval_gate: Sam approves`
4. `d1_write: UPDATE cms_page_sections batch`
5. `d1_write: INSERT cms_publish_jobs type=page`

### `cms_application_backlog` — Application backlog → site notice
**Trigger:** on cpas_foster_applications INSERT  
**Steps:**
1. `query_database: COUNT applications WHERE review_status=new`
2. `branch: count > 3 → add notice / else skip`
3. `agent_llm: generate response-time notice`
4. `d1_write: UPDATE cms_page_content_blocks WHERE block_key=application_notice`


---
## 9. ChatGPT build prompt

Copy this into a ChatGPT session to build any file in section 7:

```
You are a senior Cloudflare Workers + React developer.
Project: companionscpas-platform — rescue org SaaS admin dashboard.

STACK:
- Backend: Cloudflare Workers, D1 SQLite (env.DB), R2 (env.WEBSITE_ASSETS),
  KV (env.CMS_CACHE), Workers AI (env.AGENTSAM_WAI)
- Entry: src/index.js routes to src/api/*.js handlers
- Handler signature: export async function handler(request, env, url)
- D1 pattern: await env.DB.prepare(sql).bind(...args).run() / .all() / .first()
- Frontend: React 18 UMD + Babel standalone — NO build step, NO npm imports
- JSX loaded via <script type='text/babel'> — all components are globals
- Chart.js 4.4 loaded via CDN, window.Chart global
- Dark theme: bg=#0b0b14, surface=#13131f, card=#1a1a2e, border=#2a2a45,
  text=#f0f0f5, muted=#8888aa, accent=#ee2336

CONVENTIONS:
- No TypeScript, no JSX imports, no bundler
- All D1 table/column names exactly as in live schema (see section 3-6 of this doc)
- API responses: return new Response(JSON.stringify(data), {headers:{'Content-Type':'application/json'}})
- Auth: session validated via getSession(request, env) before protected routes
- Never hardcode tenant_id — always 'tenant_companionscpas'
- Never hardcode user_id — always from session

Build the file described. Make it complete and production-ready.
Follow existing patterns from agentsam_api.js and cms_api.js.
```