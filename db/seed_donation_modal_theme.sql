INSERT OR REPLACE INTO cms_themes
(id, tenant_id, theme_key, theme_name, description, mode, is_active, tokens_json, updated_at)
VALUES
(
  'theme_donation_modal_glass',
  'tenant_companionscpas',
  'donation_modal_glass',
  'Donation Modal Glass',
  'High-contrast light donation modal on dark glass overlay, prepared for Stripe Checkout.',
  'mixed',
  1,
  '{
    "donationModal": {
      "overlay": "rgba(0,0,0,0.72)",
      "panelBg": "#F8F7FF",
      "panelText": "#111827",
      "panelMuted": "#475569",
      "labelText": "#111827",
      "inputBg": "#FFFFFF",
      "inputText": "#111827",
      "inputBorder": "rgba(15,23,42,0.14)",
      "buttonBg": "#6D5593",
      "buttonBgHover": "#7B63A3",
      "buttonText": "#FFFFFF",
      "amountActiveBg": "#6D5593",
      "amountActiveText": "#FFFFFF",
      "amountInactiveBg": "#FFFFFF",
      "amountInactiveText": "#111827",
      "purpleSoft": "#C7A7FF",
      "danger": "#DC2626"
    }
  }',
  datetime('now')
);
