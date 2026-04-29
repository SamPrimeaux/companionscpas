CREATE TABLE IF NOT EXISTS agentsam_todo (
  id TEXT PRIMARY KEY,
  project_key TEXT NOT NULL DEFAULT 'companionscpas-platform',
  route_path TEXT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'high',
  category TEXT,
  tool_plan_json TEXT NOT NULL DEFAULT '[]',
  acceptance_criteria_json TEXT NOT NULL DEFAULT '[]',
  linked_table TEXT,
  linked_file TEXT,
  sort_order INTEGER DEFAULT 100,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR REPLACE INTO agentsam_todo
(id, route_path, title, description, category, priority, linked_table, linked_file, sort_order, tool_plan_json, acceptance_criteria_json)
VALUES

('todo_quality_test_1', '/qa', 'Run Quality Test 1 hard-fail audit', 'Use Playwright to screenshot public pages, inspect scroll length, EIN visibility, theme/font consistency, popup readiness, and dashboard CMS readiness.', 'qa', 'critical', 'agentsam_todo', 'scripts/quality_test_1.py', 10,
'["run_playwright","capture_full_page_screenshots","inspect_dom","write_report_json","hard_fail_on_missing_requirements"]',
'["qa/screenshots generated","qa/quality-test-1-report.json generated","script exits nonzero when pages fail"]'),

('todo_public_ein', '/', 'Add EIN and official nonprofit info sitewide', 'Ensure EIN 88-4156327, Companions of CPAS, Caddo Parish, Shreveport LA, and companionsCPAS@gmail.com are visible in footer/about/donate.', 'public-site', 'critical', 'cms_brand_settings', 'public/_shared.css', 20,
'["inspect_cms_brand_settings","patch_footer","patch_about","patch_donate","verify_with_playwright"]',
'["EIN visible on home/about/donate","footer has official nonprofit info","no outdated placeholder org info"]'),

('todo_theme_consistency', '/', 'Unify theme/font/component system', 'Make public site, login, reset, dashboard, forms, and modals use one shared claymorphic Companions design system.', 'ui-ux', 'critical', 'cms_themes', 'public/_shared.css', 30,
'["audit_css_variables","dedupe_fonts","standardize_buttons","standardize_cards","standardize_modals"]',
'["single primary font stack","consistent purple/orange/blue theme tokens","buttons/cards/forms match across pages"]'),

('todo_storytelling_home', '/', 'Rebuild homepage storytelling depth', 'Current homepage is too generic and short. Build stronger nonprofit story sections, mission proof, adoption CTA, donation CTA, volunteer CTA, and impact narrative.', 'content', 'high', 'cms_pages', 'public/index.html', 40,
'["inspect_existing_html","write_section_plan","patch_homepage","capture_scroll_screenshots"]',
'["scrollHeight above 2400","clear mission narrative","strong adoption/donation/volunteer conversion path"]'),

('todo_storytelling_about', '/about', 'Rebuild about page storytelling', 'Make About page feel credible, local, emotional, and specific to Companions of CPAS instead of generic rescue copy.', 'content', 'high', 'cms_pages', 'public/about.html', 50,
'["inspect_about_html","add_founder_org_story","add_impact_sections","verify_ein"]',
'["official org identity shown","strong local credibility","not generic filler"]'),

('todo_donation_modal', '/donate', 'Rebuild donation modal system', 'Create polished Stripe-ready donation popup with one-time/monthly options, campaign selection, donor info, notes, secure checkout state, and Resend receipt hooks.', 'payments', 'critical', 'donation_intents', 'public/donate.html', 60,
'["inspect_donation_tables","inspect_payment_routes","patch_modal_ui","wire_demo_intent","prepare_stripe_activation"]',
'["modal is visually polished","donation intent saves to D1","Stripe disabled safely until accepted","Resend hooks staged"]'),

('todo_adoption_forms', '/adopt', 'Rebuild adoption application form flow', 'Create polished adoption/foster application modal with validation, animal attachment, email capture, admin dashboard visibility, and Resend-ready notification hooks.', 'forms', 'critical', 'adoption_applications_demo', 'public/adopt.html', 70,
'["inspect_application_tables","patch_adopt_forms","wire_api_submit","add_admin_visibility"]',
'["application can submit","saved in D1","admin dashboard can view applications","email hooks staged"]'),

('todo_admin_login', '/admin/login', 'Polish admin login and fix auth redirect', 'Update demo password to 19371937, improve claymorphic login CTA, make forgot password turn orange on click, and redirect to /admin/dashboard.', 'auth', 'critical', 'users', 'public/admin/login.html', 80,
'["patch_login_html","patch_worker_auth","test_login","capture_screenshot"]',
'["password 19371937 works","redirect is /admin/dashboard","forgot password links to /admin/reset","CTA visually improved"]'),

('todo_admin_reset', '/admin/reset', 'Build /admin/reset password flow', 'Add route compatibility for /admin/reset, password request UI, token flow, password reset UI, D1 reset token handling, and Resend-ready email flow.', 'auth', 'critical', 'password_reset_tokens', 'public/admin/reset-password.html', 90,
'["wire_password_reset_routes","add_admin_reset_alias","patch_ui","test_request_and_reset"]',
'["/admin/reset loads","request endpoint works","reset endpoint works","no secrets exposed"]'),

('todo_worker_route_imports', '/api', 'Wire all existing API modules into src/index.js', 'Current src/index.js ignores existing api modules. Import and call auth, password reset, dashboard, contact, donation, payments/email, and social routes.', 'backend', 'critical', NULL, 'src/index.js', 100,
'["import_api_modules","call_routes_in_order","preserve_static_assets","deploy_worker","curl_test_routes"]',
'["all existing /api routes reachable","no module left orphaned","static public pages still load"]'),

('todo_dashboard_overview', '/admin/dashboard', 'Rebuild admin dashboard overview', 'Create high-quality dashboard overview like the mockups: KPIs, tasks, recent animals, activity, financial overview, applications, volunteer hours.', 'dashboard', 'critical', 'animal_profiles', 'public/admin/dashboard.html', 110,
'["inspect_dashboard_api","patch_overview_view","wire_live_data","screenshot_test"]',
'["dashboard loads real D1 data","cards/charts match design direction","mobile responsive"]'),

('todo_dashboard_animals', '/admin/dashboard/animals', 'Build Animals management page', 'Build full animals table/gallery with status, species, foster, medical, filters, CRUD-ready actions, and image management.', 'dashboard', 'critical', 'animals', 'public/admin/dashboard.html', 120,
'["inspect_animals_tables","build_animals_view","wire_filters","add_crud_stubs"]',
'["animals page loads","filters work","data from D1","actions are staged"]'),

('todo_dashboard_cms', '/admin/dashboard/cms', 'Build Shopify-level CMS editor foundation', 'Create beginner-friendly CMS page editor for content, images, sections, navigation, theme tokens, preview, and publish workflow.', 'cms', 'critical', 'cms_pages', 'public/admin/dashboard.html', 130,
'["inspect_cms_tables","map_pages_sections_assets","build_editor_ui","add_preview_panel","add_publish_stubs"]',
'["CMS route usable","team can edit content/pictures conceptually","D1 CMS tables visibly utilized","preview/publish flow staged"]'),

('todo_dashboard_all_routes', '/admin/dashboard/*', 'Finish all dashboard route pages', 'Build functional route views for fosters, adoptions, intakes, medical, daily-care, volunteers, applications, donations, campaigns, reports, settings, tasks.', 'dashboard', 'critical', 'agentsam_todo', 'public/admin/dashboard.html', 140,
'["build_route_registry","create_page_renderers","wire_each_to_d1","playwright_capture_each_route"]',
'["all listed routes render","no blank/fake pages","each route has relevant data/actions"]'),

('todo_agentsam_bridge', '/admin/dashboard/tasks', 'Prepare AgentSam task execution GUI', 'Use agentsam_todo as the operational backlog for incremental tool calls across Workers AI, OpenAI, and local Ollama later.', 'agentsam', 'high', 'agentsam_todo', 'src/api/dashboard_api.js', 150,
'["add_todo_api","add_tasks_dashboard_view","show_status_priority_tool_plan","prepare_execution_state_fields"]',
'["tasks page reads agentsam_todo","todos are sortable/filterable","tool plans visible","ready for model/tool executor"]');
