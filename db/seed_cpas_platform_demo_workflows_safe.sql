PRAGMA foreign_keys = OFF;

INSERT OR REPLACE INTO cpas_application_forms
(id, tenant_id, form_key, title, description, status, intro_json, settings_json)
VALUES
('form_foster_application','tenant_companionscpas','foster_application','Foster Application','Public foster application form.','active','{}','{}');

DELETE FROM animal_profiles
WHERE id IN ('animal_rocky','animal_luna','animal_bella')
   OR lower(name) IN ('rocky','luna','bella');

-- Board demo workflow seed (disabled — use public /api/foster/apply for real submissions)
-- See db/migrations/20260619_clear_demo_applications.sql

/*
INSERT OR REPLACE INTO cpas_foster_applications
...
*/

/*
INSERT OR REPLACE INTO cpas_application_events
...
INSERT OR REPLACE INTO foster_records
...
INSERT OR REPLACE INTO dashboard_calendar_events
...
*/

DELETE FROM adoption_applications_demo
WHERE animal_id IN ('animal_rocky','animal_luna','animal_bella')
   OR lower(animal_name) IN ('rocky','luna','bella');

/*
INSERT OR REPLACE INTO applications
...
*/

/*
INSERT OR REPLACE INTO foster_records
...
*/

/*
INSERT OR REPLACE INTO dashboard_calendar_events
...
*/

INSERT OR REPLACE INTO email_templates
(id, tenant_id, provider, template_key, subject, body_text, body_html, status)
VALUES
('tpl_foster_received','tenant_companionscpas','resend','foster_application_received','We received your foster application','Thank you for applying to foster with Companions of CPAS. Our team will review your application and follow up soon.','<p>Thank you for applying to foster with <strong>Companions of CPAS</strong>. Our team will review your application and follow up soon.</p>','active'),
('tpl_home_visit','tenant_companionscpas','resend','home_visit_followup','Next step for your foster application','Your foster application is moving forward. Our team would like to schedule a home visit or virtual visit.','<p>Your foster application is moving forward. Our team would like to schedule a home visit or virtual visit.</p>','active');

PRAGMA foreign_keys = ON;
