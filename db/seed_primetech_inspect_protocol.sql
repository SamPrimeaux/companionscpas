-- ─────────────────────────────────────────────────────────────
-- PrimeTech Inspect Protocol: Agent Sam browser/CMS audit tools
-- ─────────────────────────────────────────────────────────────

INSERT OR REPLACE INTO agentsam_tools
  (tool_key, tool_name, category, description, function_schema, is_enabled, requires_approval, allowed_roles, min_model_tier, sort_order, updated_at)
VALUES
  (
    'playwright_inspect_page',
    'Playwright Inspect Page',
    'browser_inspect',
    'Open a URL with Playwright/CDP-style browser automation, capture rendered HTML, screenshot metadata, viewport info, page title, status, and basic timing.',
    json_object(
      'type','object',
      'required', json_array('url'),
      'properties', json_object(
        'url', json_object('type','string'),
        'viewports', json_object('type','array','items',json_object('type','string'),'default',json_array('desktop','tablet','mobile')),
        'wait_until', json_object('type','string','default','networkidle'),
        'include_screenshot', json_object('type','boolean','default',1),
        'include_html_excerpt', json_object('type','boolean','default',1)
      )
    ),
    1, 0, '["owner","developer","admin"]', 'standard', 10, datetime('now')
  ),
  (
    'browser_console_audit',
    'Browser Console Audit',
    'browser_inspect',
    'Collect browser console errors, warnings, failed script loads, hydration/runtime errors, and source locations for a target URL.',
    json_object(
      'type','object',
      'required', json_array('url'),
      'properties', json_object(
        'url', json_object('type','string'),
        'capture_warnings', json_object('type','boolean','default',1),
        'max_messages', json_object('type','integer','default',100)
      )
    ),
    1, 0, '["owner","developer","admin"]', 'standard', 11, datetime('now')
  ),
  (
    'browser_network_audit',
    'Browser Network Audit',
    'browser_inspect',
    'Inspect network requests for failed assets, 4xx/5xx responses, slow resources, blocked scripts, mixed content, and wrong content types.',
    json_object(
      'type','object',
      'required', json_array('url'),
      'properties', json_object(
        'url', json_object('type','string'),
        'include_assets', json_object('type','boolean','default',1),
        'slow_ms', json_object('type','integer','default',1500)
      )
    ),
    1, 0, '["owner","developer","admin"]', 'standard', 12, datetime('now')
  ),
  (
    'cms_dom_section_map',
    'CMS DOM Section Map',
    'cms_inspect',
    'Map rendered DOM sections back to cms_page_sections by section_key, section_type, headings, images, CTA links, and visible order.',
    json_object(
      'type','object',
      'required', json_array('url','page_route'),
      'properties', json_object(
        'url', json_object('type','string'),
        'page_route', json_object('type','string'),
        'include_text_excerpt', json_object('type','boolean','default',1)
      )
    ),
    1, 0, '["owner","developer","admin"]', 'standard', 13, datetime('now')
  ),
  (
    'cms_visual_snapshot',
    'CMS Visual Snapshot',
    'browser_inspect',
    'Capture desktop, tablet, and mobile visual snapshots for a CMS page and store screenshot/report metadata for review.',
    json_object(
      'type','object',
      'required', json_array('url'),
      'properties', json_object(
        'url', json_object('type','string'),
        'viewports', json_object('type','array','default',json_array('desktop','tablet','mobile')),
        'r2_prefix', json_object('type','string','default','static/inspect/')
      )
    ),
    1, 0, '["owner","developer","admin"]', 'standard', 14, datetime('now')
  ),
  (
    'cms_accessibility_smoke',
    'CMS Accessibility Smoke Test',
    'quality',
    'Check basic accessibility signals: missing alt text, empty buttons, heading order, label issues, landmark presence, color contrast hints, and keyboard focus traps.',
    json_object(
      'type','object',
      'required', json_array('url'),
      'properties', json_object(
        'url', json_object('type','string'),
        'strict', json_object('type','boolean','default',0)
      )
    ),
    1, 0, '["owner","developer","admin"]', 'standard', 15, datetime('now')
  ),
  (
    'cms_asset_resolution_check',
    'CMS Asset Resolution Check',
    'cms_inspect',
    'Compare rendered image/script/style URLs against cms_assets and R2 expected keys to detect missing, stale, or hardcoded assets.',
    json_object(
      'type','object',
      'required', json_array('page_route'),
      'properties', json_object(
        'page_route', json_object('type','string'),
        'url', json_object('type','string'),
        'check_r2_keys', json_object('type','boolean','default',1)
      )
    ),
    1, 0, '["owner","developer","admin"]', 'standard', 16, datetime('now')
  ),
  (
    'cms_cache_probe',
    'CMS Cache Probe',
    'cache',
    'Probe CMS/Agent Sam cache behavior for brand, page, bootstrap, nav, and asset manifest keys. Report hit/miss/stale risk and recommended bust keys.',
    json_object(
      'type','object',
      'required', json_array('scope'),
      'properties', json_object(
        'scope', json_object('type','string','enum',json_array('brand','page','bootstrap','assets','nav','all')),
        'page_route', json_object('type','string'),
        'bust', json_object('type','boolean','default',0),
        'prime', json_object('type','boolean','default',1)
      )
    ),
    1, 0, '["owner","developer","admin"]', 'standard', 17, datetime('now')
  ),
  (
    'script_write_repair_patch',
    'Write Repair Patch Script',
    'code_repair',
    'Generate a targeted Python/bash/JS repair script for inspected issues. Does not execute destructive changes without approval.',
    json_object(
      'type','object',
      'required', json_array('findings_json'),
      'properties', json_object(
        'findings_json', json_object('type','object'),
        'target_files', json_object('type','array','items',json_object('type','string')),
        'language', json_object('type','string','default','python'),
        'execute_after_write', json_object('type','boolean','default',0)
      )
    ),
    1, 1, '["owner","developer"]', 'advanced', 18, datetime('now')
  ),
  (
    'primetech_inspect_report',
    'PrimeTech Inspect Report',
    'reporting',
    'Create a structured inspection report with pass/fail checks, screenshots, console/network errors, CMS mapping, cache status, and recommended repair plan.',
    json_object(
      'type','object',
      'required', json_array('inspection_results'),
      'properties', json_object(
        'inspection_results', json_object('type','object'),
        'format', json_object('type','string','default','json_markdown'),
        'include_repair_plan', json_object('type','boolean','default',1)
      )
    ),
    1, 0, '["owner","developer","admin"]', 'standard', 19, datetime('now')
  );

-- ─────────────────────────────────────────────────────────────
-- Shared workflow handlers
-- ─────────────────────────────────────────────────────────────

INSERT OR REPLACE INTO agentsam_workflow_handlers
  (handler_key, node_type, executor_kind, title, description, handler_config_json, input_schema_json, quality_gate_json, risk_level, requires_approval, is_active, tenant_id, workspace_id, updated_at)
VALUES
  ('primetech.inspect.playwright', 'mcp_tool', 'mcp_tool', 'Playwright Page Inspection', 'Browser-render target URL and collect DOM/screenshot/page state.', '{"tool_key":"playwright_inspect_page"}', '{}', '{"require_url":true}', 'low', 0, 1, 'tenant_companionscpas', 'ws_companionscpas', strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('primetech.inspect.console', 'mcp_tool', 'mcp_tool', 'Console Audit', 'Collect browser console errors and warnings.', '{"tool_key":"browser_console_audit"}', '{}', '{"fail_on_uncaught_error":false}', 'low', 0, 1, 'tenant_companionscpas', 'ws_companionscpas', strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('primetech.inspect.network', 'mcp_tool', 'mcp_tool', 'Network Audit', 'Collect failed/slow/bad-content-type network requests.', '{"tool_key":"browser_network_audit"}', '{}', '{"flag_4xx":true,"flag_5xx":true}', 'low', 0, 1, 'tenant_companionscpas', 'ws_companionscpas', strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('primetech.inspect.dom_sections', 'builtin_tool', 'builtin_tool', 'CMS DOM Section Mapping', 'Map rendered DOM back to CMS sections.', '{"tool_key":"cms_dom_section_map"}', '{}', '{"require_section_count_match":false}', 'low', 0, 1, 'tenant_companionscpas', 'ws_companionscpas', strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('primetech.inspect.visual_snapshot', 'mcp_tool', 'mcp_tool', 'Responsive Visual Snapshot', 'Capture desktop/tablet/mobile screenshots.', '{"tool_key":"cms_visual_snapshot"}', '{}', '{"require_all_viewports":true}', 'low', 0, 1, 'tenant_companionscpas', 'ws_companionscpas', strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('primetech.inspect.accessibility', 'builtin_tool', 'builtin_tool', 'Accessibility Smoke Test', 'Run basic accessibility checks.', '{"tool_key":"cms_accessibility_smoke"}', '{}', '{"warn_missing_alt":true}', 'low', 0, 1, 'tenant_companionscpas', 'ws_companionscpas', strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('primetech.inspect.assets', 'builtin_tool', 'builtin_tool', 'Asset Resolution Check', 'Compare rendered assets to R2/cms_assets truth.', '{"tool_key":"cms_asset_resolution_check"}', '{}', '{"flag_missing_assets":true}', 'medium', 0, 1, 'tenant_companionscpas', 'ws_companionscpas', strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('primetech.inspect.cache', 'builtin_tool', 'builtin_tool', 'CMS Cache Probe', 'Check KV/cache freshness and recommended bust keys.', '{"tool_key":"cms_cache_probe"}', '{}', '{"require_cache_report":true}', 'medium', 0, 1, 'tenant_companionscpas', 'ws_companionscpas', strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('primetech.inspect.report', 'builtin_tool', 'builtin_tool', 'PrimeTech Inspect Report', 'Compile all inspection results into a structured report.', '{"tool_key":"primetech_inspect_report"}', '{}', '{"require_summary":true,"require_findings":true}', 'low', 0, 1, 'tenant_companionscpas', 'ws_companionscpas', strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('primetech.repair.patch_writer', 'script', 'agent_llm', 'Repair Patch Writer', 'Generate targeted repair scripts from inspection findings.', '{"tool_key":"script_write_repair_patch"}', '{}', '{"approval_required_before_execute":true}', 'high', 1, 1, 'tenant_companionscpas', 'ws_companionscpas', strftime('%Y-%m-%dT%H:%M:%fZ','now'));

-- ─────────────────────────────────────────────────────────────
-- Workflow definition
-- ─────────────────────────────────────────────────────────────

INSERT OR REPLACE INTO agentsam_workflows
  (id, tenant_id, workspace_id, workflow_key, display_name, description, workflow_type, trigger_type, default_mode, default_task_type, risk_level, requires_approval, max_concurrent_nodes, timeout_ms, quality_gate_json, metadata_json, is_active, is_platform_global, updated_at)
VALUES
  (
    'wf_primetech_inspect_protocol',
    'tenant_companionscpas',
    'ws_companionscpas',
    'primetech_inspect_protocol',
    'PrimeTech Inspect Protocol',
    'End-to-end browser/CDP/CMS inspection protocol for auditing any page Agent Sam is asked to review. Captures rendered state, console errors, network failures, responsive screenshots, CMS section mapping, R2 asset checks, KV cache probes, accessibility smoke checks, and optional repair patch recommendations.',
    'agentic',
    'manual',
    'agent',
    'primetech_inspect',
    'medium',
    0,
    4,
    600000,
    json_object(
      'require_url', true,
      'require_browser_render', true,
      'require_console_audit', true,
      'require_network_audit', true,
      'require_report', true,
      'repair_requires_approval', true
    ),
    json_object(
      'protocol_version','1.0.0',
      'primary_goal','Make Agent Sam able to intensively audit any CMS/live page before editing or publishing.',
      'default_url','https://companionscpas.meauxbility.workers.dev/',
      'recommended_viewports',json_array('desktop','tablet','mobile'),
      'cache_strategy','Probe KV but keep D1 workflow/run/reward writes live.'
    ),
    1,
    0,
    datetime('now')
  );

-- Clear old graph for idempotent reseed
DELETE FROM agentsam_workflow_edges WHERE workflow_id = 'wf_primetech_inspect_protocol';
DELETE FROM agentsam_workflow_nodes WHERE workflow_id = 'wf_primetech_inspect_protocol';

-- Nodes
INSERT INTO agentsam_workflow_nodes
  (workflow_id, node_key, node_type, title, description, handler_key, input_schema_json, output_schema_json, timeout_ms, retry_policy_json, quality_gate_json, risk_level, requires_approval, is_active, sort_order, pos_x, pos_y, handler_config_json)
VALUES
  ('wf_primetech_inspect_protocol','start','trigger','Start Inspection','Accept URL/page route/viewports/inspection depth.',NULL,'{"url":"string","page_route":"string","viewports":"array","depth":"standard|deep"}','{}',10000,'{"max_retries":0}', '{}','low',0,1,0,0,0,'{}'),

  ('wf_primetech_inspect_protocol','load_cms_truth','db_query','Load CMS Truth','Load page, sections, brand, nav, assets, and theme records from D1 for comparison against the rendered page.','cms.db.load_page','{}','{}',30000,'{"max_retries":2,"backoff_ms":1000}','{"allow_empty_page":true}','low',0,1,10,220,0,'{"tables":["cms_pages","cms_page_sections","cms_assets","cms_brand_settings","cms_nav_menus","cms_themes"]}'),

  ('wf_primetech_inspect_protocol','browser_render','mcp_tool','Browser Render Audit','Open page in browser automation and capture rendered state.','primetech.inspect.playwright','{}','{}',90000,'{"max_retries":2,"backoff_ms":1500}','{"require_http_ok":true}','low',0,1,20,440,0,'{"tool_key":"playwright_inspect_page"}'),

  ('wf_primetech_inspect_protocol','console_audit','mcp_tool','Console Error Audit','Collect console errors and warnings.','primetech.inspect.console','{}','{}',60000,'{"max_retries":1,"backoff_ms":1000}','{"flag_uncaught_errors":true}','low',0,1,30,660,-120,'{"tool_key":"browser_console_audit"}'),

  ('wf_primetech_inspect_protocol','network_audit','mcp_tool','Network Request Audit','Find failed assets, slow requests, wrong content types, and blocked resources.','primetech.inspect.network','{}','{}',60000,'{"max_retries":1,"backoff_ms":1000}','{"flag_4xx":true,"flag_5xx":true}','low',0,1,40,660,120,'{"tool_key":"browser_network_audit"}'),

  ('wf_primetech_inspect_protocol','visual_snapshot','mcp_tool','Responsive Visual Snapshot','Capture desktop/tablet/mobile screenshots and viewport metrics.','primetech.inspect.visual_snapshot','{}','{}',120000,'{"max_retries":1,"backoff_ms":1500}','{"require_all_viewports":true}','low',0,1,50,880,-180,'{"tool_key":"cms_visual_snapshot"}'),

  ('wf_primetech_inspect_protocol','dom_section_map','process','DOM to CMS Section Map','Map rendered sections/headings/assets/CTAs back to cms_page_sections.','primetech.inspect.dom_sections','{}','{}',45000,'{"max_retries":1,"backoff_ms":1000}','{"flag_unmapped_sections":true}','low',0,1,60,880,0,'{"tool_key":"cms_dom_section_map"}'),

  ('wf_primetech_inspect_protocol','accessibility_smoke','eval','Accessibility Smoke Test','Check alt text, heading order, empty buttons, labels, landmarks, and focus hints.','primetech.inspect.accessibility','{}','{}',45000,'{"max_retries":1,"backoff_ms":1000}','{"warn_only":true}','low',0,1,70,880,180,'{"tool_key":"cms_accessibility_smoke"}'),

  ('wf_primetech_inspect_protocol','asset_resolution','process','R2/CMS Asset Resolution','Compare rendered images/scripts/styles with cms_assets and R2 expected keys.','primetech.inspect.assets','{}','{}',60000,'{"max_retries":1,"backoff_ms":1000}','{"flag_missing_assets":true}','medium',0,1,80,1100,-90,'{"tool_key":"cms_asset_resolution_check"}'),

  ('wf_primetech_inspect_protocol','cache_probe','process','KV Cache Probe','Check CMS/Agent Sam cache freshness and recommend exact KV bust/prime keys.','primetech.inspect.cache','{}','{}',45000,'{"max_retries":1,"backoff_ms":1000}','{"require_cache_status":true}','medium',0,1,90,1100,90,'{"tool_key":"cms_cache_probe"}'),

  ('wf_primetech_inspect_protocol','compile_report','output','Compile Inspect Report','Compile structured findings, screenshots, failed checks, CMS mismatches, cache status, and recommended fixes.','primetech.inspect.report','{}','{}',60000,'{"max_retries":1,"backoff_ms":1000}','{"require_summary":true,"require_findings":true}','low',0,1,100,1320,0,'{"tool_key":"primetech_inspect_report"}'),

  ('wf_primetech_inspect_protocol','branch_repair_needed','branch','Repair Needed?','Branch to repair patch generation if findings are actionable and user requests repair.',NULL,'{}','{}',10000,'{"max_retries":0}','{}','medium',0,1,110,1540,0,'{"condition":"findings.actionable_count > 0 && input.generate_repair_patch == true"}'),

  ('wf_primetech_inspect_protocol','write_repair_patch','script','Write Repair Patch','Generate targeted repair script from findings. Requires approval before execution.','primetech.repair.patch_writer','{}','{}',120000,'{"max_retries":1,"backoff_ms":1500}','{"approval_required_before_execute":true}','high',1,1,120,1760,-80,'{"tool_key":"script_write_repair_patch","execute_after_write":false}'),

  ('wf_primetech_inspect_protocol','final_output','output','Final Output','Return inspection report, repair patch if generated, and next recommended actions.',NULL,'{}','{}',10000,'{"max_retries":0}','{}','low',0,1,130,1980,0,'{}');

-- Edges
INSERT INTO agentsam_workflow_edges
  (workflow_id, from_node_key, to_node_key, condition_type, priority, is_fallback, label)
VALUES
  ('wf_primetech_inspect_protocol','start','load_cms_truth','always',0,0,'Load D1 CMS truth'),
  ('wf_primetech_inspect_protocol','load_cms_truth','browser_render','always',0,0,'Render page'),
  ('wf_primetech_inspect_protocol','browser_render','console_audit','always',0,0,'Check console'),
  ('wf_primetech_inspect_protocol','browser_render','network_audit','always',1,0,'Check network'),
  ('wf_primetech_inspect_protocol','console_audit','visual_snapshot','always',0,0,'Capture visuals'),
  ('wf_primetech_inspect_protocol','network_audit','dom_section_map','always',0,0,'Map DOM/CMS'),
  ('wf_primetech_inspect_protocol','visual_snapshot','accessibility_smoke','always',0,0,'A11y smoke'),
  ('wf_primetech_inspect_protocol','dom_section_map','asset_resolution','always',0,0,'Check assets'),
  ('wf_primetech_inspect_protocol','accessibility_smoke','cache_probe','always',0,0,'Check cache'),
  ('wf_primetech_inspect_protocol','asset_resolution','compile_report','always',0,0,'Compile report'),
  ('wf_primetech_inspect_protocol','cache_probe','compile_report','always',1,0,'Include cache status'),
  ('wf_primetech_inspect_protocol','compile_report','branch_repair_needed','always',0,0,'Decide repair'),
  ('wf_primetech_inspect_protocol','branch_repair_needed','write_repair_patch','field',0,0,'Generate repair patch if requested'),
  ('wf_primetech_inspect_protocol','branch_repair_needed','final_output','always',10,1,'No repair requested'),
  ('wf_primetech_inspect_protocol','write_repair_patch','final_output','always',0,0,'Return patch and report');

