/** Shared public-page asset versions and script tags. */
export const SHELL_VERSION = "footer-logo-90-builtby-20260719b";
export const DONATE_MODAL_VERSION = "campaign-entry-20260716";
export const COMPETITION_PAYMENT_MODAL_VERSION = "wet-dog-fixed-fee-20260716b";
export const CPAS_MODALS_VERSION = "modals-v3-20260706";

export { brandTokensStylesheetTag } from "./brand_tokens.js";

export function publicPageScripts() {
  return `
<script src="/static/js/donate-modal.js?v=${DONATE_MODAL_VERSION}" defer></script>
<script src="/static/js/competition-entry-payment-modal.js?v=${COMPETITION_PAYMENT_MODAL_VERSION}" defer></script>
<script src="/static/global/cpas-modals.js?v=${CPAS_MODALS_VERSION}" defer></script>
<script src="/static/global/shared.js?v=${SHELL_VERSION}" defer></script>`;
}
