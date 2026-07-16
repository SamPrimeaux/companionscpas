/** Shared public-page asset versions and script tags. */
export const SHELL_VERSION = "contact-team-live-20260710";
export const DONATE_MODAL_VERSION = "campaign-entry-20260716";
export const CPAS_MODALS_VERSION = "modals-v3-20260706";

export { brandTokensStylesheetTag } from "./brand_tokens.js";

export function publicPageScripts() {
  return `
<script src="/static/js/donate-modal.js?v=${DONATE_MODAL_VERSION}" defer></script>
<script src="/static/global/cpas-modals.js?v=${CPAS_MODALS_VERSION}" defer></script>
<script src="/static/global/shared.js?v=${SHELL_VERSION}" defer></script>`;
}
