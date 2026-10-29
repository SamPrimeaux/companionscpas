# AgentSam Form & Modal Studio — Companions integration plan
**Status:** architectural handoff + first reusable checkout behavior in review. This is not a claim that the new Studio is deployed.

## Product decision
Rebuild the **editor experience**, not the database and runtime from scratch. Companions' `/dashboard/cms/forms` becomes the first production customer of an SDK-owned, domain-neutral Form & Modal Studio. Preserve the existing working Forms, checkout, Stripe webhook, subscriptions, and published customer journeys.

**Source of shared chrome:** `agentsam-sdk/apps/ecommerce-cms-agentsam/frontend/theme-editor/`:
- `README.md`: portable workspace contract and styling tokens
- `bridge.mjs`: capability-aware editor bridge
- `cms-adapter.mjs`: CMS adapter precedent
- `mount.mjs`: embedded trusted chrome, isolated customer preview
- `frontend/static/css/theme-editor.css`: existing editor look/layout, reusable tokens
- `frontend/static/js/theme-editor.js`: existing **page** editor runtime, not a ready Form Studio

The Resolve `localhost:4357` showcase is **local preview only**. Its browser-local settings, fake payment state and non-writable routes are not evidence of a backend integration. Do not embed the Resolve storefront, copy its brand styling into a customer tenant, or save to localStorage as the production source of truth. The current Companions Forms Studio is `public/dashboard/js/view-cms-forms.jsx` (1,179 lines, presentation/business concerns mixed); keep the existing route but replace its surface incrementally with a shared SDK module.

## UX shape: one reusable workbench
**Resource list:** compact header and filters `All | Forms | Modals | Checkouts`, search, status, placement and updated time. Cards/rows link to existing records; templates appear in a **Create** menu: Contact, Application, Newsletter, Donation, Event Checkout, Info Popup, Blank. Avoid fabricating forms from template previews or duplicating customers' records.

**Editor shell:** fixed compact top toolbar (breadcrumb, title, status, preview mode, Save draft, Publish), left rail (Structure/Fields/Steps/Elements, ordered and collapsible), center (actual responsive live preview at desktop/tablet/mobile widths), right inspector (selected object, properties, actions, validation), contextual bottom dock (Preview, Undo/Redo, Test, open live, errors), no duplicate side panels on mobile. On small screens center preview gets priority; structure and inspector become tabbed/docked surfaces, no wasted multi-column width.

**Tabs are resource capabilities, not disconnected apps:** Build, Design, Logic, Settings, Delivery. Checkout adds Products/Tickets & Payment; modal adds Trigger & Overlay; form adds Fields & Submissions. Use the same inspector, token system, device controls and saving state. Event checkout preview uses inert PaymentElement placeholder; real Stripe is tested only on the user-facing checkout.

## Storage/ownership contract — no new Companions bespoke CMS
| Responsibility | Current authoritative source | Generic adapter intent |
| --- | --- | --- |
| Standalone form definition, fields, validations | `cpas_application_forms`, `cpas_application_fields` | `FormResourceAdapter` |
| Public contact/application submissions | `cpas_form_submissions` and existing specific endpoints | `FormSubmissionAdapter` |
| Checkout modal content, saved draft and published version | `cms_globals`, `global_type='checkout_modal'` | `ModalResourceAdapter` / `CheckoutResourceAdapter` |
| Campaign ticket catalog, actual amount | `fundraising_campaigns.config_json.event.tickets` | read-only pricing source for hosted checkout |
| Reusable CTA trigger, status, provider, display styling | v2 `cms_components` | `ActionRegistryAdapter` |
| Legacy donation/foster popups | `cms_modals` | read adapters and migration presets **until** references are all resolved |
| Site pages, placement and theme | existing CMS pages, brand/theme records | `PlacementAdapter` and theme tokens |

**Do not create `cms_modals_new`, `forms_v3`, or a second customer-specific checkout UI.** Avoid making `cms_globals` responsible for form *submissions*. Persist modality and placement as typed references; make tenant/account ownership mandatory. `cms_modals.modal_key` is globally unique today and must not be adopted as the multi-tenant contract.

### Proposed SDK-owned normalized resource shape
```ts
type StudioResourceRef = {
  tenantId: string;
  id: string;              // existing canonical ID (not a copied record)
  kind: 'form' | 'modal' | 'checkout';
  title: string;
  status: 'draft' | 'published' | 'archived';
  revision: number;
  presetKey?: string;       // starter template, not a live data SSOT
  formRef?: string;         // existing form ID
  checkoutRef?: string;     // existing global checkout key
  campaignRef?: string;     // campaign's server-owned catalog
  appearance: Record<string, unknown>;
  structure: unknown;      // mapped by the kind-specific adapter
  actionRefs: string[];    // cms_components trigger IDs, never inline script
};
type StudioAdapter = {
  capabilities: Record<string, boolean>;
  listResources(kind?: string): Promise<StudioResourceRef[]>;
  getResource(ref: StudioResourceRef): Promise<StudioResourceRef>;
  saveDraft(ref: StudioResourceRef, expectedRevision: number): Promise<StudioResourceRef>;
  publish(ref: StudioResourceRef, expectedRevision: number): Promise<StudioResourceRef>;
  renderPreview(ref: StudioResourceRef, device: 'mobile'|'tablet'|'desktop'): Promise<string>;
  listPresets(kind: string): Promise<unknown[]>;
  listActions(): Promise<unknown[]>;
  listForms(): Promise<unknown[]>;
};
```
All adapters enforce authentication/tenant scope, version checks, field validation and safe publish. Missing capabilities are disabled visibly, never pretend to save.

## Existing customer presets to keep
- **Legacy Donate CTA** (`cms_modals.modal_key='donate_cta'`): template content and theme only; connect to live donation runtime and per-method processors.
- **Legacy Foster CTA** (`cms_modals.modal_key='foster_cta'`): template containing a `form_ref`, uses canonical Foster Application form.
- **Freedom Ride Checkout** (`cms_globals.global_key='freedom_ride_checkout'`): working real checkout, Stripe payment, participant names and server-priced item catalog. Existing design becomes first checkout preset with editable fields, theme, initial selection and payment readiness. The template is **not** a duplicate live checkout.
- **Contact/Newsletter**: existing form fields + provider consent pipeline, use CMS embed/action manifests. No direct new Resend flow in the editor.

## Immediate Freedom Ride behavior
- Generic runtime fields `initial_item_key` (optional, one selected item) and `auto_prepare_payment` (boolean, explicit opt-in). The starting key comes from saved content, NEVER a hardcoded `$20` lookup or an increased `min`.
- Initial selection sets quantity 1 only when no explicit ticket trigger/default quantities already selected. An explicit CTA ticket wins. All tickets still have `min=0`; a customer can decrement to 0 and pick cheaper tickets.
- `auto_prepare_payment=true` displays Stripe PaymentElement on open and creates an **unpaid** PaymentIntent from server-priced items. It does not auto-confirm/payment. Normal checkouts retain **Continue to secure payment** and defer intent until that click. Avoid using auto-preparation for high-traffic generic modal by default.
- The `CampaignCheckoutEditor` now exposes both settings. Both are stored through the **existing** checkout API into `cms_globals`.
- A one-off, reviewed tenant data migration `db/migrations/20261028_freedom_ride_checkout_initial_selection.sql` seeds the existing Freedom Ride published row with `driver` and `auto_prepare_payment=true`, only after the compatible Worker/static JS are deployed. This does not alter prices or the published ticket list.

## Engineering waves and acceptance gates
**P0 — Current checkout proof:** merge/deploy tested generic initial-selection changes and static bundle, capture D1 Time Travel bookmark, apply guarded tenant data seed, perform live browser test (starts at Driver $20; Stripe appears; decrement to zero, select $5, successful mock payment and real sandbox transaction only with approved test mode). Check webhook idempotency and Stripe PaymentIntent cleanup/recreation. Never use a live card to QA.

**P1 — SDK shared shell:** extract a Form & Modal Studio module under `agentsam-sdk/apps/ecommerce-cms-agentsam/frontend/` using the existing portable workspace bridge/tokens, typed capabilities and preview isolation. Begin with **real Companions Forms List and Form Builder** by implementing a Companions adapter to existing APIs; do not change those data endpoints. Desktop and narrow viewport visual QA. Save, reload, preview and publish remain real.

**P2 — Modular modal/checkout authoring:** mount current `CampaignCheckoutEditor` functionality under the shared Studio checkout resource. Campaign screen changes to **Select existing checkout / Edit in Studio / Preview**. Add generic modal action registry and reusable presets; form reference binding uses canonical form IDs. Drive donor/foster dialogs from new adapters while retaining legacy routes until audited.

**P3 — One SSOT and customer handoff:** reconcile/retire `cms_modals` only after all readers/writers/triggers point to new source, and finish `cms_components_new` cutover separately before relying on v2 component actions. Test no dead links, existing forms submissions, donor receipts, event tickets, editor permissions, draft/publish isolation and per-tenant access. Then run the same SDK module in another tenant to prove no customer-specific UI assumptions.

## Non-negotiable QA
- Published Freedom Ride checkout remains usable throughout; no lost attendee names, wrong amount, hidden Stripe failure, duplicate completed payment or client-priced items.
- The live source must not show a stale "testing" ticket unintentionally (the campaign data now labels that $5 option "Freedom Ride"; confirm public render and intended pricing).
- Form Builder remains capable of editing the existing Foster (25 fields), Join Our Team (6) and Contact (5), including their submission endpoints.
- WCAG keyboard trap/escape/return focus, accessible labels and a fully usable small viewport.
- Cross-tenant data, publication and asset controls are enforced in the API, not merely hidden in JS.
- Avoid releasing a shared SDK package until its import/exports are proven in a clean consumer build.

## Review/ownership
- `agentsam-sdk` owns the reusable Studio, adapters interfaces, preview isolation, UI tokens, presets and tests.
- `companionscpas` owns only tenant adapter, existing data APIs, the original customer records, brand assets, route shell and rollout migrations.
- No domain names, hardcoded Companions fonts, custom event keys or campaign IDs in SDK components.
