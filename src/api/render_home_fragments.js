import { SHELL_VERSION, publicPageScripts, brandTokensStylesheetTag } from "./page_shell.js";
import { renderSiteHeader, renderSiteFooter } from "./render_site_nav.js";
import { SHELL_CSS, resolveRouteTheme, themeClassName } from "./render_page.js";

const PAGE_CACHE_TTL = 3600;

export const HOME_FRAGMENT_KEYS = [
  'static/pages/home/hero.html',
  'static/pages/home/mission.html',
  'static/pages/home/how-it-helps.html',
  'static/pages/home/newsletter.html',
  'static/pages/home/transport-win.html',
  'static/pages/home/campaigns.html',
];

async function r2Text(env, key) {
  const obj = await env?.WEBSITE_ASSETS?.get(key).catch(() => null);
  if (!obj) return "";
  return obj.text().catch(() => "");
}

export async function assembleHomeFromFragments(env) {
  const fragments = await Promise.all(HOME_FRAGMENT_KEYS.map((key) => r2Text(env, key)));
  if (fragments.some((html) => !html.trim())) return null;

  const [headerHtml, footerHtml, theme] = await Promise.all([
    renderSiteHeader(env),
    renderSiteFooter(env),
    resolveRouteTheme(env, "/"),
  ]);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Companions of CPAS moves dogs from crisis to care through transport, urgent medical support, foster pathways, and a community that shows up when it matters most.">
  <title>Companions of CPAS — Second Chances for Caddo Dogs</title>
  <link rel="stylesheet" href="${SHELL_CSS}?v=${SHELL_VERSION}">
  ${brandTokensStylesheetTag()}
  <link rel="icon" href="/logo.png">
</head>
<body class="theme-${themeClassName(theme)}" data-theme="${theme}" data-route="/">
${headerHtml}
<main>
${fragments.join("\n")}
</main>
${footerHtml}
${publicPageScripts()}
</body>
</html>`;
}

export async function publishHomeFromFragments(env, jobId = null) {
  const html = await assembleHomeFromFragments(env);
  if (!html) {
    throw new Error("Home fragments missing in R2 (static/pages/home/*.html)");
  }

  await env.WEBSITE_ASSETS.put("static/pages/index.html", html, {
    httpMetadata: { contentType: "text/html; charset=utf-8" },
  });

  if (env.CMS_CACHE) {
    await env.CMS_CACHE.put("page:/", html, { expirationTtl: PAGE_CACHE_TTL }).catch(() => {});
  }

  return {
    html,
    artifact_key: "static/pages/index.html",
    job_id: jobId,
  };
}
