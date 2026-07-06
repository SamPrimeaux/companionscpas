-- Hero copy refresh + accent phrase for mockup alignment

UPDATE cms_page_sections
SET heading = 'Every dog deserves a brighter tomorrow.',
    subheading = 'We move dogs from crisis to care—providing safe transport, veterinary support, foster connections, and loving homes. Together, we can give every dog the second chance they deserve.',
    config_json = json_set(
      COALESCE(NULLIF(config_json, ''), '{}'),
      '$.accent_phrase', 'a brighter tomorrow.',
      '$.cta_sub', 'Let''s work together',
      '$.cta_action', 'contact',
      '$.cta_secondary_sub', 'Donate or give supplies',
      '$.cta_secondary_action', 'donate'
    ),
    updated_at = datetime('now')
WHERE tenant_id = 'tenant_companionscpas'
  AND page_route = '/'
  AND section_key = 'hero';
