/**
 * Public asset URLs for Companions of CPAS.
 * Always use companionsofcaddo.org or assets.companionsofcaddo.org (R2 custom domain).
 * Never emit companionscpas.meauxbility.workers.dev for logos or static assets.
 */

export const ASSETS_CDN = "https://assets.companionsofcaddo.org";
export const SITE_ORIGIN = "https://companionsofcaddo.org";
export const LOGO_WEBP = `${ASSETS_CDN}/companionsofcpa-newlogo.webp`;

const DEAD_WORKER_HOST = "companionscpas.meauxbility.workers.dev";

/**
 * Rewrite legacy workers.dev (and relative /static) asset URLs to the R2 custom domain.
 */
export function sanitizePublicAssetUrls(htmlOrText) {
  if (htmlOrText == null) return htmlOrText;
  let out = String(htmlOrText);
  if (!out) return out;

  out = out.split(`https://${DEAD_WORKER_HOST}/static/`).join(`${ASSETS_CDN}/`);
  out = out.split(`https://${DEAD_WORKER_HOST}/`).join(`${SITE_ORIGIN}/`);
  out = out.split(`http://${DEAD_WORKER_HOST}/`).join(`${SITE_ORIGIN}/`);
  // Relative logo paths in email HTML need an absolute CDN URL for clients
  out = out.replace(
    /(src|href)=(["'])\/static\/global\/companionsofcpa-newlogo\.webp\2/gi,
    `$1=$2${LOGO_WEBP}$2`
  );
  return out;
}
