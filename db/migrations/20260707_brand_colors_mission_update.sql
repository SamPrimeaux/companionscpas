-- Migration: 20260707_brand_colors_mission_update.sql
-- Updates primary/accent colors to exact logo values + Lori's official mission text
-- Run: wrangler d1 execute companionscpas --remote --file db/migrations/20260707_brand_colors_mission_update.sql

UPDATE cms_brand_settings SET
  primary_color     = '#7B2FBE',
  accent_color      = '#C8373A',
  organization_json = '{"name":"Companions of CPAS","legal_name":"Companions of CPAS","ein":"88-4156327","tax_status":"501(c)(3)","parish":"Caddo Parish","city":"Shreveport","state":"LA","email":"companionsCPAS@gmail.com","mailing_address":"PO Box — pending","mission":"To promote, educate, and advocate the animals at Caddo Parish Animal Services (CPAS) in order to achieve a positive outcome. Our organization works to achieve this by heavily networking the animals, providing medical care for emergency cases, raising donations, educating the public, assisting in transports conducted by shelter staff, enrichment, and other needs where the shelter needs assistance to positively help all animals at the CPAS open-intake shelter to the best of our abilities."}',
  updated_at        = datetime('now')
WHERE tenant_id = 'tenant_companionscpas'
  AND id        = 'brand_companionscpas';
