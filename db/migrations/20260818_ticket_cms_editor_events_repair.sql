-- Ticket: CMS editor D1 catalog + Events reorder/crop/single-card
-- Collaborate Tasks spine: agentsam_tickets + agentsam_ticket_events
-- Related: tkt_cpas_w2_more_events_subarea_20260726 (Events page already exists; this repairs the editor)

INSERT OR REPLACE INTO agentsam_tickets (
  id, title, description, status, status_reason, project, subsystem,
  tags, priority, requested_by, doc_path, due_at, attachments_json,
  created_at, updated_at, closed_at, blocked_by
) VALUES (
  'tkt_cpas_cms_editor_events_repair_20260818',
  'CMS editor: D1 catalog + Events reorder, crop ratios, single-card Upcoming',
  'Public /events is already a CMS page. Staff cannot reliably reorder sections, pick image crop ratios, or run Upcoming Events with one flyer. Wire the editor to live D1 catalogs instead of JS constants.

RELATED
• Extends tkt_cpas_w2_more_events_subarea_20260726 (Events page under More — already live).
• Image display law (Week-2 brief): prefer natural / object-fit contain; do not force cover crop.
• Winnie''s Way flyer: 1296×1728 JPEG — exact 3:4. URL:
  https://assets.companionsofcaddo.org/static/cms/uploads/2026/08/1787086868613-7ab2b4c6e17854791407f874c9464c72.JPEG
• D1 already has upcoming_events.config_json image_display=natural. CSS ignores it.
• Both upcoming cards currently share that same 5K JPEG (transport_aug7 + winnies_way_5k).

HARD RULE
Content, nav, brand, and section copy already live in D1. Do not add a hardcoded companionscpas.ts adapter. Tenant config = GET /api/cms/bootstrap from D1.

ACCEPTANCE
1) Add Section list comes from cms_section_schemas (is_active=1), not ADDABLE_SECTION_TYPES as SSOT.
2) CTA dropdown built from published cms_pages + active cms_modals (+ custom URL). Drop CMS_CTA_ACTIONS as SSOT.
3) CDN base derived from cms_brand_settings.site_domain (assets.{domain}), not R2_CDN_BASE constant as SSOT.
4) feature_cards schema matches real block columns (title, body, image_url); min 1 card; columns 1/auto/2/3/4; image_display presets natural / 4:3 / 1:1 / 3:4 / 4:5 / 9:16.
5) Section rail drag persists sort_order (dataTransfer + ref). Reorder busts KV page:{route}. section/save does not clobber sort_order.
6) Upcoming Events can show a single card centered (auto-fit grid). No 3-column empty tracks.
7) Card add / delete / reorder in the editor. Staff can remove or re-image the duplicate flyer.
8) Video URLs on cards render as <video>, not broken <img>.
9) Editor split out of the 4.9k view-cms.jsx into reusable cms/ units that consume bootstrap JSON.

OUT OF SCOPE
Vite-migrate the whole dashboard. Multi-tenant Worker routing. Filling every stub schema. cms_page_versions.

SURFACES
• /dashboard/cms/pages/events
• https://companionsofcaddo.org/events
• Worker: cms_api.js, cms_section_catalog.js, render_section.js
• Public CSS: static/global/cpas-shell.css',
  'active',
  'Operator requested D1-backed editor + Events UX repair 2026-08-18',
  'cms-website',
  'cms',
  '["cms","events","editor","d1","crop","reorder","week2-revisions"]',
  'high',
  'operator',
  'docs/features/cms-live-editor.md',
  NULL,
  '[]',
  strftime('%s','now'),
  strftime('%s','now'),
  NULL,
  'tkt_cpas_w2_more_events_subarea_20260726'
);

INSERT INTO agentsam_ticket_events (
  id, ticket_id, event_type, from_status, to_status, detail,
  commit_sha, actor_type, actor_id, created_at
) VALUES (
  'tktevt_cpas_cms_editor_events_repair_created',
  'tkt_cpas_cms_editor_events_repair_20260818',
  'created',
  NULL,
  'active',
  'Ticket created from CMS audit. Events page is live; editor catalog still JS-hardcoded. Begin D1-first repair.',
  NULL,
  'user',
  'operator',
  strftime('%s','now')
);
