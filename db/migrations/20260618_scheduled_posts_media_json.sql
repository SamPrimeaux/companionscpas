-- Multi-attachment support for scheduled social posts
ALTER TABLE scheduled_posts ADD COLUMN media_json TEXT;
