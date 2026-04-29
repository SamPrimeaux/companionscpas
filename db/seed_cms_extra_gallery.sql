INSERT OR REPLACE INTO cms_assets
(id, tenant_id, asset_key, asset_type, label, url, alt_text, source_provider, usage_context, metadata_json, updated_at)
VALUES
('asset_gallery_2cute', 'tenant_companionscpas', 'animal.gallery.2cute', 'image', 'Two Cute Dogs', '/assets/animals/2cute.webp', 'Two companion dogs', 'static', 'homepage_gallery', '{"demo":true}', datetime('now')),
('asset_gallery_miniscoobydoo', 'tenant_companionscpas', 'animal.gallery.miniscoobydoo', 'image', 'Mini Scooby Doo', '/assets/animals/miniscoobydoo.webp', 'Small rescue dog outside', 'static', 'homepage_gallery', '{"demo":true}', datetime('now')),
('asset_gallery_sus', 'tenant_companionscpas', 'animal.gallery.sus', 'image', 'Rescue Dog Portrait', '/assets/animals/sus.webp', 'Black rescue dog standing outside', 'static', 'homepage_gallery', '{"demo":true}', datetime('now')),
('asset_gallery_upclose', 'tenant_companionscpas', 'animal.gallery.upclose', 'image', 'Close Up Smile', '/assets/animals/upclose.webp', 'Close up smiling dog', 'static', 'homepage_gallery', '{"demo":true}', datetime('now'));

INSERT OR REPLACE INTO cms_page_content_blocks
(id, tenant_id, page_route, section_key, block_key, block_type, title, body, asset_id, sort_order, config_json, updated_at)
VALUES
('block_home_gallery_4', 'tenant_companionscpas', '/', 'gallery', 'gallery_4', 'image', 'Two Cute Dogs', NULL, 'asset_gallery_2cute', 40, '{}', datetime('now')),
('block_home_gallery_5', 'tenant_companionscpas', '/', 'gallery', 'gallery_5', 'image', 'Mini Scooby Doo', NULL, 'asset_gallery_miniscoobydoo', 50, '{}', datetime('now')),
('block_home_gallery_6', 'tenant_companionscpas', '/', 'gallery', 'gallery_6', 'image', 'Rescue Dog Portrait', NULL, 'asset_gallery_sus', 60, '{}', datetime('now')),
('block_home_gallery_7', 'tenant_companionscpas', '/', 'gallery', 'gallery_7', 'image', 'Close Up Smile', NULL, 'asset_gallery_upclose', 70, '{}', datetime('now'));
