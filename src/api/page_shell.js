/** Shared public-page asset versions and script tags. */
export const SHELL_VERSION = "2026061502";
export const DONATE_MODAL_VERSION = "donate-p3-20260614";
export const CPAS_MODALS_VERSION = "modals-v2-20260615";

export function publicPageScripts() {
  return `
<script src="/static/js/donate-modal.js?v=${DONATE_MODAL_VERSION}" defer></script>
<script src="/static/global/cpas-modals.js?v=${CPAS_MODALS_VERSION}" defer></script>
<script src="/static/global/shared.js?v=${SHELL_VERSION}" defer></script>`;
}
