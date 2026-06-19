-- Campaign workspace: cover image, config_json, live donate page sync
ALTER TABLE fundraising_campaigns ADD COLUMN cover_asset_id TEXT;
ALTER TABLE fundraising_campaigns ADD COLUMN config_json TEXT;

UPDATE fundraising_campaigns SET config_json = json_object(
  'donate_placement', 'medical_featured',
  'public_eyebrow', 'Featured Medical Need: Kita',
  'public_heading', 'A Sweet Cat Deserves a Second Chance',
  'card_eyebrow', 'CURRENT MEDICAL NEED',
  'card_title', 'Kita''s Amputation Care',
  'facebook_reel_url', 'https://www.facebook.com/reel/1367522045225536/',
  'share_url', 'https://companionsofcaddo.org/donate#donate-medical-story',
  'donate_cta_primary', 'Donate Toward Kita''s Care',
  'donate_cta_sidebar', 'Help Kita Heal',
  'supports', json('["Surgery","Medication","Follow-up care","Recovery expenses"]')
) WHERE id = 'camp_kita_amputation';

UPDATE fundraising_campaigns SET config_json = json_object(
  'donate_placement', 'freedom_hero',
  'public_eyebrow', 'FREEDOM FEST 2026',
  'public_heading', 'RED, WHITE & RESCUED',
  'public_subheading', 'Celebrate Freedom. Change a Life.',
  'cta_label', 'Sponsor a Ticket',
  'ticket_amount_cents', 17500,
  'footer_tagline', 'ONE TICKET. ONE LIFE. FOREVER.',
  'footer_note', 'Thank you for helping us celebrate freedom and second chances.'
) WHERE id = 'camp_freedom_fest_2026';
