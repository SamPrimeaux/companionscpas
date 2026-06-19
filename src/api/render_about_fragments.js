import { SHELL_VERSION, publicPageScripts } from "./page_shell.js";
import { renderSiteHeader, renderSiteFooter } from "./render_site_nav.js";

const PAGE_CACHE_TTL = 3600;

export const ABOUT_FRAGMENT_KEYS = [
  "static/pages/about/hero.html",
  "static/pages/about/why_we_exist.html",
  "static/pages/about/paths.html",
  "static/pages/about/campaigns.html",
  "static/pages/about/cta.html",
];

async function r2Text(env, key) {
  const obj = await env?.WEBSITE_ASSETS?.get(key).catch(() => null);
  if (!obj) return "";
  return obj.text().catch(() => "");
}

export async function assembleAboutFromFragments(env) {
  const fragments = await Promise.all(ABOUT_FRAGMENT_KEYS.map((key) => r2Text(env, key)));
  if (fragments.some((html) => !html.trim())) return null;

  const [headerHtml, footerHtml] = await Promise.all([
    renderSiteHeader(env),
    renderSiteFooter(env),
  ]);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>About Us • Companions of CPAS</title>
  <meta name="description" content="Meet the people behind Companions of CPAS and learn how we help Caddo Parish dogs receive medical care, transport support, and second chances.">
  <link rel="stylesheet" href="/static/global/shared.css?v=${SHELL_VERSION}">
  <link rel="icon" href="/logo.png">
</head>
<body class="theme-dark" data-theme="dark" data-route="/about">
${headerHtml}
<main>
${fragments.join("\n")}
</main>
${footerHtml}
${publicPageScripts()}
</body>
</html>`;
}

export async function publishAboutFromFragments(env, jobId = null) {
  const html = await assembleAboutFromFragments(env);
  if (!html) {
    throw new Error("About fragments missing in R2 (static/pages/about/*.html)");
  }

  await env.WEBSITE_ASSETS.put("static/pages/about/index.html", html, {
    httpMetadata: { contentType: "text/html; charset=utf-8" },
  });

  if (env.CMS_CACHE) {
    await env.CMS_CACHE.put("page:/about", html, { expirationTtl: PAGE_CACHE_TTL }).catch(() => {});
  }

  return {
    html,
    artifact_key: "static/pages/about/index.html",
    job_id: jobId,
  };
}
