INSERT OR IGNORE INTO agentsam_mcp_workflows
(id, workflow_key, workflow_name, description, steps_json, trigger_type, execution_mode, safety_level)
VALUES
('wf_social_post','social.post.full','Generate + Post Social Content',
'Creates caption, then stages posts to Facebook, Instagram, and YouTube.',
'[{"step":1,"tool":"workersai.run"},{"step":2,"tool":"resend.email.send"},{"step":3,"tool":"analytics.log"}]',
'manual','sequential','standard');

INSERT OR IGNORE INTO agentsam_mcp_workflows
(id, workflow_key, workflow_name, description, steps_json, trigger_type, execution_mode, safety_level)
VALUES
('wf_donation_process','donation.process.full','Handle Donation + Receipt + Analytics',
'Tracks donation, sends receipt, logs analytics.',
'[{"step":1,"tool":"stripe.checkout.create"},{"step":2,"tool":"resend.email.send"},{"step":3,"tool":"analytics.log"}]',
'event','sequential','elevated');

INSERT OR IGNORE INTO agentsam_mcp_workflows
(id, workflow_key, workflow_name, description, steps_json, trigger_type, execution_mode, safety_level)
VALUES
('wf_adoption_review','adoption.review.pipeline','Review Adoption Application',
'Summarizes application, notifies admin, logs analytics.',
'[{"step":1,"tool":"workersai.run"},{"step":2,"tool":"resend.email.send"},{"step":3,"tool":"analytics.log"}]',
'manual','sequential','standard');

INSERT OR IGNORE INTO agentsam_mcp_workflows
(id, workflow_key, workflow_name, description, steps_json, trigger_type, execution_mode, safety_level)
VALUES
('wf_deploy_site','deploy.site.pipeline','Deploy Site + Notify',
'Deploys Worker/static assets and notifies admin.',
'[{"step":1,"tool":"wrangler.deploy"},{"step":2,"tool":"resend.email.send"},{"step":3,"tool":"analytics.log"}]',
'manual','sequential','elevated');

INSERT OR IGNORE INTO agentsam_mcp_workflows
(id, workflow_key, workflow_name, description, steps_json, trigger_type, execution_mode, safety_level)
VALUES
('wf_ai_auto','ai.auto.router','AI Auto Router',
'Routes simple work to local llama and fallback cloud AI when configured.',
'[{"step":1,"tool":"local.llama.run"},{"step":2,"tool":"workersai.run"}]',
'manual','fallback','standard');
