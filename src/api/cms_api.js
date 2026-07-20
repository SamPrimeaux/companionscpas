import { renderPage, getBrand } from "./render_page.js";
import {
  isFragmentPageRoute,
  ensureFragmentPageSections,
  syncFragmentPageToR2,
  previewFragmentPageFromCms,
  publishFragmentPageFromCms,
  upsertFragmentPageDefaults,
  getFragmentSectionKeys,
  normalizeFragmentRoute,
} from "./page_cms_registry.js";
import { bootstrapNewCmsPage, archiveAndClearLiveFragment, syncSectionToR2, loadRouteSections } from "./cms_pipeline.js";
import { getAuthUser } from "./session_api.js";
import {
  rebuildCmsAssetUsages,
  loadUsagesByAssetIds,
} from "./cms_asset_usages.js";
const TENANT_ID = "tenant_companionscpas";

const R2_MEDIA_FOLDERS = new Set([
  "media/animals",
  "media/campaign",
  "media/intakes",
  "media/medical",
  "media/team",
  "media/videos",
]);

function resolveUploadR2Key(r2Folder, safeName, opts = {}) {
  const now = new Date();
  const yr = now.getUTCFullYear();
  const mo = String(now.getUTCMonth() + 1).padStart(2, "0");
  const stamp = Date.now();
  let normalized = String(r2Folder || "").replace(/\/+$/, "");
  const animalId = String(opts.animalId || "").trim();
  const forceAnimal =
    opts.forceAnimalFolder === true
    || normalized === "media/animals"
    || String(opts.category || "").toLowerCase() === "animal"
    || String(opts.usageContext || "").toLowerCase() === "animal_profile";

  if (forceAnimal) {
    if (animalId) return `media/animals/${animalId}/${stamp}-${safeName}`;
    return `media/animals/${stamp}-${safeName}`;
  }
  if (R2_MEDIA_FOLDERS.has(normalized)) {
    return `${normalized}/${stamp}-${safeName}`;
  }
  return `static/cms/uploads/${yr}/${mo}/${stamp}-${safeName}`;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

function id(prefix = "cms") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

async function body(request) {
  try { return await request.json(); } catch { return {}; }
}

function safeJson(value, fallback) {
  try { return JSON.parse(value || ""); } catch { return fallback; }
}


async function syncFragmentCmsToR2(env, route) {
  return syncFragmentPageToR2(env, normalizeFragmentRoute(route));
}

async function bustCache(env, ...keys) {
  if (!env.CMS_CACHE) return;
  await Promise.all(keys.map(k => env.CMS_CACHE.delete(k).catch(() => {})));
}

async function requireCmsUser(request, env, sessionUser = null) {
  if (sessionUser) return sessionUser;

  const authHeader = request.headers.get("Authorization") || "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const bridgeKey = env.AGENTSAM_BRIDGE_KEY || env.INTERNAL_PUBLISH_KEY || "";
  if (bridgeKey && bearer && bearer === bridgeKey) {
    const userId = request.headers.get("X-User-Id") || request.headers.get("x-user-id") || "iam_bridge";
    return {
      id: userId,
      email: request.headers.get("X-User-Email") || null,
      role: "operator",
      bridge: true,
    };
  }

  try {
    return await getAuthUser(request, env);
  } catch (err) {
    console.warn("[cms/auth] getAuthUser failed:", err?.message || err);
    return null;
  }
}

function normalizeRouteInput(route) {
  const raw = String(route || "").trim();
  if (!raw) return "";
  let normalized = raw.replace(/\/+/g, "/");
  if (!normalized.startsWith("/")) normalized = `/${normalized}`;
  normalized = normalized.replace(/\/+/g, "/");
  if (normalized.length > 1) normalized = normalized.replace(/\/+$/, "");
  return normalized || "/";
}

async function tableColumns(env, tableName) {
  const exists = await env.DB.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name=? LIMIT 1"
  ).bind(tableName).first().catch(() => null);
  if (!exists) return null;
  const { results } = await env.DB.prepare(`PRAGMA table_info(${tableName})`).all().catch(() => ({ results: [] }));
  const cols = new Set((results || []).map((row) => row?.name).filter(Boolean));
  return cols.size ? cols : null;
}

async function createPublishJob(env, routePath, triggeredBy) {
  const cols = await tableColumns(env, "cms_publish_jobs").catch(() => null);
  if (!cols) return null;

  const jobId = id("pub");
  const now = new Date().toISOString();
  const values = {
    id: jobId,
    tenant_id: TENANT_ID,
    page_id: null,
    route_path: routePath,
    page_route: routePath,
    job_type: "page",
    status: "running",
    triggered_by: triggeredBy,
    created_by: triggeredBy,
    created_at: now,
    updated_at: now,
    started_at: now,
  };

  const insertCols = [];
  const placeholders = [];
  const binds = [];
  for (const [key, value] of Object.entries(values)) {
    if (!cols.has(key)) continue;
    insertCols.push(key);
    placeholders.push("?");
    binds.push(value);
  }
  if (!insertCols.length) return null;

  try {
    await env.DB.prepare(
      `INSERT INTO cms_publish_jobs (${insertCols.join(", ")}) VALUES (${placeholders.join(", ")})`
    ).bind(...binds).run();
    return jobId;
  } catch (err) {
    console.warn("[cms/publish] unable to create cms_publish_jobs row:", err?.message || err);
    return null;
  }
}

const PUBLIC_PAGE_ROUTES = ["/", "/about", "/services", "/adopt", "/community", "/donate", "/contact"];

async function listAllCmsPageRoutes(env) {
  const pages = await env.DB.prepare(
    "SELECT route_path FROM cms_pages WHERE tenant_id = ? ORDER BY sort_order, route_path"
  ).bind(TENANT_ID).all().catch(() => ({ results: [] }));
  const fromDb = (pages.results || []).map((row) => normalizeRouteInput(row.route_path)).filter(Boolean);
  return fromDb.length ? fromDb : PUBLIC_PAGE_ROUTES;
}

function pageArtifactKey(route) {
  const normalized = normalizeRouteInput(route);
  return normalized === "/" ? "static/pages/index.html" : `static/pages${normalized}/index.html`;
}

async function publishPageRoute(env, route, triggeredBy) {
  const normalizedRoute = normalizeRouteInput(route);
  if (!normalizedRoute) {
    return { success: false, route_path: route, error: "Invalid route" };
  }

  await bustCache(env, `page:${normalizedRoute}`);

  const jobId = await createPublishJob(env, normalizedRoute, triggeredBy);
  const artifactKey = pageArtifactKey(normalizedRoute);

  await env.DB.prepare(`
    UPDATE cms_pages
    SET status = 'published',
        published_at = datetime('now'),
        updated_at = datetime('now'),
        published_by = ?
    WHERE tenant_id = ? AND route_path = ?
  `).bind(triggeredBy, TENANT_ID, normalizedRoute).run();

  try {
    // One pipeline for every cms_pages route (home, donate, contact, …)
    const published = await publishFragmentPageFromCms(env, normalizedRoute, jobId || `pub_${Date.now()}`);
    await updatePublishJob(env, jobId, "done", {
      artifactPath: published.artifact_key,
      resultJson: { success: true, route_path: normalizedRoute, artifact_key: published.artifact_key, source: "cms_pipeline" },
    });
    return {
      success: true,
      route_path: normalizedRoute,
      job_id: jobId,
      artifact_key: published.artifact_key,
      source: "cms_pipeline",
    };
  } catch (err) {
    const message = err?.message || String(err);
    await updatePublishJob(env, jobId, "failed", { error: message });
    return {
      success: false,
      route_path: normalizedRoute,
      job_id: jobId,
      error: message,
    };
  }
}

async function updatePublishJob(env, jobId, status, extras = {}) {
  if (!jobId) return;
  const cols = await tableColumns(env, "cms_publish_jobs").catch(() => null);
  if (!cols) return;

  const now = new Date().toISOString();
  const values = {
    status,
    updated_at: now,
    completed_at: status === "done" ? now : null,
    finished_at: status === "done" ? now : null,
    failed_at: status === "failed" ? now : null,
    error: extras.error || null,
    error_message: extras.error || null,
    artifact_path: extras.artifactPath || null,
    result_json: extras.resultJson ? JSON.stringify(extras.resultJson) : null,
  };

  const updates = [];
  const binds = [];
  for (const [key, value] of Object.entries(values)) {
    if (!cols.has(key)) continue;
    updates.push(`${key} = ?`);
    binds.push(value);
  }
  if (!updates.length) return;

  await env.DB.prepare(
    `UPDATE cms_publish_jobs SET ${updates.join(", ")} WHERE id = ?`
  ).bind(...binds, jobId).run().catch((err) => {
    console.warn("[cms/publish] unable to update cms_publish_jobs row:", err?.message || err);
  });
}

function injectCmsInspector(html) {
  const style = `
<style id="cms-inspector-style">
  body.cms-preview [data-cpas-section],
  body.cms-preview [data-section-key] { position: relative; }
  body.cms-preview .cms-sec-dim { opacity: 0.42; transition: opacity 120ms ease; }
  body.cms-preview .cms-sec-active { opacity: 1 !important; outline: 2px solid #7c3aed; outline-offset: -2px; box-shadow: inset 0 0 0 1px rgba(124,58,237,0.25); }
  body.cms-preview .cms-sec-hover:not(.cms-sec-active) { outline: 1.5px dashed rgba(124,58,237,0.55); outline-offset: -2px; }
  body.cms-preview [data-cms-field] { cursor: pointer; }
  body.cms-preview [data-cms-field].cms-field-hover { outline: 1.5px solid rgba(124,58,237,0.7); outline-offset: 2px; border-radius: 4px; }
  body.cms-preview [data-cms-field].cms-field-active { outline: 2px solid #7c3aed; outline-offset: 2px; border-radius: 4px; box-shadow: 0 0 0 3px rgba(124,58,237,0.18); }

  /* Let clicks reach hero photos under the full-width text column */
  body.cms-preview .hero-split > .hero-body { pointer-events: none; }
  body.cms-preview .hero-split .hero-content { pointer-events: auto; }
  body.cms-preview .hero-split .hero-media-bg[data-cms-field="image_url"] {
    pointer-events: auto;
    cursor: grab;
    z-index: 1;
  }
  body.cms-preview .hero-split .hero-media-bg[data-cms-field="image_url"]:active { cursor: grabbing; }
  body.cms-preview [data-cms-field="image_url"] { position: relative; }
  body.cms-preview [data-cms-field="image_url"].cms-field-hover,
  body.cms-preview [data-cms-field="image_url"].cms-field-active {
    outline: none;
  }
  body.cms-preview [data-cms-field="image_url"].cms-field-hover::after,
  body.cms-preview [data-cms-field="image_url"].cms-field-active::after {
    content: "";
    position: absolute;
    inset: 10px;
    border: 2px solid #7c3aed;
    border-radius: 10px;
    pointer-events: none;
    z-index: 6;
    box-shadow: 0 0 0 3px rgba(124,58,237,0.2);
  }
  body.cms-preview [data-cms-field="image_url"].cms-field-active::before {
    content: "Image · drag to reposition";
    position: absolute;
    top: 16px;
    left: 16px;
    z-index: 7;
    pointer-events: none;
    background: #7c3aed;
    color: #fff;
    font: 700 11px/1.2 system-ui, sans-serif;
    padding: 5px 10px;
    border-radius: 6px;
    box-shadow: 0 4px 14px rgba(76,29,149,0.35);
  }
  body.cms-preview .cms-focal-dot {
    position: absolute;
    width: 16px;
    height: 16px;
    margin: -8px 0 0 -8px;
    border-radius: 50%;
    border: 2px solid #fff;
    background: rgba(124,58,237,0.45);
    box-shadow: 0 0 0 2px rgba(124,58,237,0.85);
    pointer-events: none;
    z-index: 8;
    display: none;
  }
  body.cms-preview [data-cms-field="image_url"].cms-field-active .cms-focal-dot { display: block; }

  #cms-inspector-chip {
    position: fixed; z-index: 100000; pointer-events: none; display: none;
    background: #7c3aed; color: #fff; font-size: 11px; font-weight: 700;
    padding: 3px 9px; border-radius: 4px 4px 4px 0; white-space: nowrap;
    font-family: system-ui, sans-serif; letter-spacing: 0.02em;
    box-shadow: 0 4px 14px rgba(76,29,149,0.35);
  }
</style>`;
  const script = `
<script>
(function() {
  var activeKey = null;
  var activeField = null;
  var hoverSec = null;
  var chip = null;
  var drag = null;
  var suppressClick = false;

  function ensureChip() {
    if (chip) return chip;
    chip = document.createElement('div');
    chip.id = 'cms-inspector-chip';
    document.body.appendChild(chip);
    return chip;
  }

  function sectionKey(el) {
    if (!el) return '';
    return el.getAttribute('data-section-key') || el.getAttribute('data-cpas-section') || '';
  }

  function findSection(el) {
    var cur = el;
    while (cur && cur !== document.body) {
      if (cur.hasAttribute && (cur.hasAttribute('data-section-key') || cur.hasAttribute('data-cpas-section'))) return cur;
      cur = cur.parentElement;
    }
    return null;
  }

  function findField(el) {
    var cur = el;
    while (cur && cur !== document.body) {
      if (cur.hasAttribute && cur.hasAttribute('data-cms-field')) return cur;
      if (cur.hasAttribute && (cur.hasAttribute('data-section-key') || cur.hasAttribute('data-cpas-section'))) break;
      cur = cur.parentElement;
    }
    return null;
  }

  function allSections() {
    return Array.prototype.slice.call(document.querySelectorAll('[data-section-key], [data-cpas-section]'));
  }

  function resolveSection(key) {
    if (!key) return null;
    var el = document.querySelector('[data-section-key="' + key + '"]');
    if (el) return el;
    el = document.querySelector('[data-cpas-section="' + key + '"]');
    if (el) return el;
    var kebab = String(key).replace(/_/g, '-');
    el = document.querySelector('[data-cpas-section="' + kebab + '"]');
    if (el) return el;
    var snake = String(key).replace(/-/g, '_');
    return document.querySelector('[data-section-key="' + snake + '"]');
  }

  function fieldLabel(name) {
    if (name === 'image_url') return 'Image';
    return name || '';
  }

  function placeChip(el, text) {
    var c = ensureChip();
    if (!el) { c.style.display = 'none'; return; }
    var r = el.getBoundingClientRect();
    c.textContent = text || sectionKey(el);
    c.style.display = 'block';
    var top = Math.max(8, r.top - 26);
    var left = Math.max(8, Math.min(r.left, window.innerWidth - c.offsetWidth - 8));
    c.style.top = top + 'px';
    c.style.left = left + 'px';
  }

  function applySectionChrome() {
    allSections().forEach(function(sec) {
      var key = sectionKey(sec);
      var isActive = activeKey && key === activeKey;
      var isHover = hoverSec === sec && !isActive;
      sec.classList.toggle('cms-sec-active', !!isActive);
      sec.classList.toggle('cms-sec-hover', !!isHover);
      sec.classList.toggle('cms-sec-dim', !!(activeKey && !isActive));
    });
    var activeEl = activeKey ? resolveSection(activeKey) : null;
    if (activeEl) {
      var label = activeField
        ? (activeKey + ' / ' + fieldLabel(activeField) + (activeField === 'image_url' ? ' · drag to pan' : ''))
        : activeKey;
      placeChip(activeEl, label);
    } else if (hoverSec) placeChip(hoverSec, sectionKey(hoverSec));
    else { var c = ensureChip(); c.style.display = 'none'; }
  }

  function clearFieldChrome() {
    document.querySelectorAll('[data-cms-field].cms-field-hover, [data-cms-field].cms-field-active').forEach(function(n) {
      n.classList.remove('cms-field-hover', 'cms-field-active');
    });
  }

  function clampPct(n) {
    n = Math.round(n);
    if (n < 0) return 0;
    if (n > 100) return 100;
    return n;
  }

  function readObjectPos(img) {
    try {
      var raw = (window.getComputedStyle(img).objectPosition || '50% 50%').trim().split(/\\s+/);
      var x = parseFloat(raw[0]);
      var y = parseFloat(raw[1] != null ? raw[1] : raw[0]);
      if (!isFinite(x)) x = 50;
      if (!isFinite(y)) y = 50;
      return { x: x, y: y };
    } catch (_) {
      return { x: 50, y: 50 };
    }
  }

  function ensureFocalDot(field) {
    var dot = field.querySelector('.cms-focal-dot');
    if (dot) return dot;
    dot = document.createElement('div');
    dot.className = 'cms-focal-dot';
    field.appendChild(dot);
    return dot;
  }

  function placeFocalDot(field, x, y) {
    var dot = ensureFocalDot(field);
    dot.style.left = x + '%';
    dot.style.top = y + '%';
  }

  function applyLiveFocal(field, x, y) {
    var img = field.tagName === 'IMG' ? field : field.querySelector('img');
    if (img) {
      img.style.objectPosition = x + '% ' + y + '%';
      img.style.transformOrigin = x + '% ' + y + '%';
    }
    placeFocalDot(field, x, y);
  }

  function postFocal(secKey, x, y, live) {
    window.parent.postMessage({
      type: 'cms:image-focal',
      sectionKey: secKey,
      field: 'image_url',
      focalX: x,
      focalY: y,
      live: !!live
    }, '*');
  }

  function selectImageField(field, sec) {
    var key = sectionKey(sec);
    activeKey = key;
    activeField = 'image_url';
    clearFieldChrome();
    field.classList.add('cms-field-active');
    var img = field.tagName === 'IMG' ? field : field.querySelector('img');
    if (img) {
      var pos = readObjectPos(img);
      placeFocalDot(field, pos.x, pos.y);
    }
    applySectionChrome();
    window.parent.postMessage({
      type: 'cms:element-selected',
      sectionKey: key,
      field: 'image_url',
      blockKey: field.getAttribute('data-cms-block') || null,
      tag: (field.tagName || '').toLowerCase()
    }, '*');
  }

  document.addEventListener('mouseover', function(e) {
    if (drag) return;
    var field = findField(e.target);
    var sec = findSection(e.target);
    hoverSec = sec;
    clearFieldChrome();
    if (field) {
      field.classList.add('cms-field-hover');
      if (activeField === 'image_url' && field.getAttribute('data-cms-field') === 'image_url') {
        field.classList.add('cms-field-active');
      }
    } else if (activeKey && activeField) {
      var activeSec = resolveSection(activeKey);
      if (activeSec) {
        var f = activeSec.querySelector('[data-cms-field="' + activeField + '"]');
        if (f) f.classList.add('cms-field-active');
      }
    }
    applySectionChrome();
  }, true);

  document.addEventListener('mouseout', function(e) {
    if (drag) return;
    if (!e.relatedTarget || e.relatedTarget === document.documentElement) {
      hoverSec = null;
      clearFieldChrome();
      if (activeKey && activeField) {
        var activeSec = resolveSection(activeKey);
        if (activeSec) {
          var f = activeSec.querySelector('[data-cms-field="' + activeField + '"]');
          if (f) f.classList.add('cms-field-active');
        }
      }
      applySectionChrome();
    }
  }, true);

  document.addEventListener('pointerdown', function(e) {
    if (e.button != null && e.button !== 0) return;
    var field = findField(e.target);
    if (!field || field.getAttribute('data-cms-field') !== 'image_url') return;
    var sec = findSection(field);
    if (!sec) return;
    e.preventDefault();
    e.stopPropagation();
    selectImageField(field, sec);
    var img = field.tagName === 'IMG' ? field : field.querySelector('img');
    var startPos = img ? readObjectPos(img) : { x: 50, y: 50 };
    var rect = field.getBoundingClientRect();
    drag = {
      field: field,
      secKey: sectionKey(sec),
      startX: e.clientX,
      startY: e.clientY,
      startFocalX: startPos.x,
      startFocalY: startPos.y,
      width: Math.max(1, rect.width),
      height: Math.max(1, rect.height),
      moved: false,
      pointerId: e.pointerId
    };
    try { field.setPointerCapture(e.pointerId); } catch (_) {}
  }, true);

  document.addEventListener('pointermove', function(e) {
    if (!drag) return;
    var dx = e.clientX - drag.startX;
    var dy = e.clientY - drag.startY;
    if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 5) return;
    drag.moved = true;
    suppressClick = true;
    // Drag image content with the pointer (pan): drag right → focal left
    var x = clampPct(drag.startFocalX - (dx / drag.width) * 100);
    var y = clampPct(drag.startFocalY - (dy / drag.height) * 100);
    applyLiveFocal(drag.field, x, y);
    postFocal(drag.secKey, x, y, true);
  }, true);

  function endDrag(e) {
    if (!drag) return;
    var d = drag;
    drag = null;
    try { d.field.releasePointerCapture(d.pointerId); } catch (_) {}
    if (d.moved) {
      var img = d.field.tagName === 'IMG' ? d.field : d.field.querySelector('img');
      var pos = img ? readObjectPos(img) : { x: d.startFocalX, y: d.startFocalY };
      postFocal(d.secKey, clampPct(pos.x), clampPct(pos.y), false);
      setTimeout(function() { suppressClick = false; }, 0);
    } else {
      // Tap without drag: set focal to tap point (same as inspector preview)
      var rect = d.field.getBoundingClientRect();
      var x = clampPct(((e.clientX - rect.left) / Math.max(1, rect.width)) * 100);
      var y = clampPct(((e.clientY - rect.top) / Math.max(1, rect.height)) * 100);
      applyLiveFocal(d.field, x, y);
      postFocal(d.secKey, x, y, false);
      suppressClick = false;
    }
  }

  document.addEventListener('pointerup', endDrag, true);
  document.addEventListener('pointercancel', endDrag, true);

  document.addEventListener('click', function(e) {
    if (suppressClick) {
      e.preventDefault();
      e.stopPropagation();
      suppressClick = false;
      return;
    }
    var sec = findSection(e.target);
    if (!sec) return;
    e.preventDefault();
    e.stopPropagation();
    var key = sectionKey(sec);
    var fieldEl = findField(e.target);
    activeKey = key;
    activeField = fieldEl ? fieldEl.getAttribute('data-cms-field') : null;
    var blockKey = fieldEl ? (fieldEl.getAttribute('data-cms-block') || null) : null;
    clearFieldChrome();
    if (fieldEl) {
      fieldEl.classList.add('cms-field-active');
      if (activeField === 'image_url') {
        var img = fieldEl.tagName === 'IMG' ? fieldEl : fieldEl.querySelector('img');
        if (img) {
          var pos = readObjectPos(img);
          placeFocalDot(fieldEl, pos.x, pos.y);
        }
      }
    }
    applySectionChrome();
    if (fieldEl && activeField) {
      window.parent.postMessage({
        type: 'cms:element-selected',
        sectionKey: key,
        field: activeField,
        blockKey: blockKey,
        tag: (fieldEl.tagName || '').toLowerCase()
      }, '*');
    } else {
      window.parent.postMessage({
        type: 'cms:section-clicked',
        key: key,
        rect: { top: sec.getBoundingClientRect().top, height: sec.getBoundingClientRect().height }
      }, '*');
    }
  }, true);

  window.addEventListener('scroll', function() { applySectionChrome(); }, true);
  window.addEventListener('resize', function() { applySectionChrome(); });

  window.addEventListener('message', function(e) {
    if (!e.data) return;
    if (e.data.type === 'cms:scroll-to-section') {
      var key = e.data.key;
      var el = resolveSection(key);
      if (!el) return;
      activeKey = sectionKey(el);
      activeField = null;
      clearFieldChrome();
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      applySectionChrome();
      return;
    }
    if (e.data.type === 'cms:highlight-section') {
      activeKey = e.data.key || null;
      activeField = e.data.field || null;
      clearFieldChrome();
      if (activeKey && activeField) {
        var sec = resolveSection(activeKey);
        if (sec) {
          var f = sec.querySelector('[data-cms-field="' + activeField + '"]');
          if (f) {
            f.classList.add('cms-field-active');
            if (activeField === 'image_url') {
              var img = f.tagName === 'IMG' ? f : f.querySelector('img');
              if (img) {
                var pos = readObjectPos(img);
                placeFocalDot(f, pos.x, pos.y);
              }
            }
          }
        }
      }
      applySectionChrome();
    }
  });

  document.documentElement.classList.add('cms-preview-ready');
  if (document.body) document.body.classList.add('cms-preview');
})();
</script>`;
  let out = html;
  if (out.includes("</head>")) out = out.replace("</head>", style + "</head>");
  else out = style + out;
  if (out.includes("</body>")) return out.replace("</body>", script + "</body>");
  return out + script;
}

export async function cmsRoutes(request, env, url, sessionUser = null) {
  const path = url.pathname;
  const method = request.method;

  if (path === "/api/cms/brand/tokens.css" && method === "GET") {
    const { getBrand } = await import("./render_page.js");
    const { buildBrandTokensCss } = await import("./brand_tokens.js");
    const brand = await getBrand(env);
    return new Response(buildBrandTokensCss(brand), {
      headers: {
        "content-type": "text/css; charset=utf-8",
        "cache-control": "public, max-age=120, stale-while-revalidate=300",
      },
    });
  }

  if (path === "/api/cms/modal/foster_cta" && method === "GET") {
    const row = await env.DB.prepare(`
      SELECT modal_key, title, subtitle, body, cta_label, cta_href, cta_action, image_url, config_json
      FROM cms_modals
      WHERE tenant_id = ? AND modal_key IN ('foster_cta', 'modal_foster_cta') AND is_active = 1
      ORDER BY CASE modal_key WHEN 'foster_cta' THEN 0 ELSE 1 END
      LIMIT 1
    `).bind(TENANT_ID).first().catch(() => null);

    if (!row) return json({ success: false, error: "Foster modal not found" }, 404);
    return json({
      success: true,
      modal: {
        modal_key: row.modal_key,
        title: row.title || "",
        subtitle: row.subtitle || "",
        body: row.body || "",
        cta_label: row.cta_label || "Start Application",
        cta_href: row.cta_href || "/services",
        cta_action: row.cta_action || "href",
        image_url: row.image_url || "",
        config: safeJson(row.config_json, {}),
      }
    });
  }

  if (!env.DB) return json({ error: "DB binding missing" }, 500);

  if (path === "/api/cms/bootstrap" && method === "GET") {
    const [pages, assets, brand, nav, themes] = await Promise.all([
      env.DB.prepare("SELECT * FROM cms_pages WHERE tenant_id = ? ORDER BY sort_order, route_path").bind(TENANT_ID).all().catch(() => ({ results: [] })),
      env.DB.prepare("SELECT * FROM cms_assets WHERE tenant_id = ? AND status != 'archived' ORDER BY updated_at DESC, created_at DESC LIMIT 200").bind(TENANT_ID).all().catch(() => ({ results: [] })),
      env.DB.prepare("SELECT * FROM cms_brand_settings WHERE tenant_id = ? LIMIT 1").bind(TENANT_ID).first().catch(() => null),
      env.DB.prepare("SELECT * FROM cms_navigation_items WHERE tenant_id = ? ORDER BY sort_order, label").bind(TENANT_ID).all().catch(() => ({ results: [] })),
      env.DB.prepare("SELECT * FROM cms_themes WHERE tenant_id = ? ORDER BY is_active DESC, updated_at DESC LIMIT 20").bind(TENANT_ID).all().catch(() => ({ results: [] })),
    ]);

    return json({
      success: true,
      tenant_id: TENANT_ID,
      pages: pages.results || [],
      assets: assets.results || [],
      brand,
      nav: nav.results || [],
      themes: themes.results || []
    });
  }

  if (path === "/api/cms/page" && method === "GET") {
    const route = url.searchParams.get("route") || "/";
    if (isFragmentPageRoute(route)) await ensureFragmentPageSections(env, route);

    const page = await env.DB.prepare("SELECT * FROM cms_pages WHERE tenant_id = ? AND route_path = ? LIMIT 1")
      .bind(TENANT_ID, route).first();

    if (!page) return json({ error: "Page not found", route }, 404);

    const sections = await env.DB.prepare(
      `SELECT * FROM cms_page_sections
       WHERE tenant_id = ? AND page_route = ?
         AND (deleted_at IS NULL OR deleted_at = '')
       ORDER BY sort_order, section_key`
    )
      .bind(TENANT_ID, route).all().catch(() => ({ results: [] }));

    const blocks = await env.DB.prepare("SELECT * FROM cms_page_content_blocks WHERE tenant_id = ? AND page_route = ? ORDER BY sort_order, section_key, block_key")
      .bind(TENANT_ID, route).all().catch(() => ({ results: [] }));

    // Drop blocks whose section was soft-deleted (and thus omitted above)
    const activeKeys = new Set((sections.results || []).map((s) => s.section_key));
    const blockResults = (blocks.results || []).filter((b) => activeKeys.has(b.section_key));

    let sectionResults = sections.results || [];
    const fragmentKeys = getFragmentSectionKeys(route);
    if (fragmentKeys.length) {
      sectionResults = sectionResults.filter((s) => fragmentKeys.includes(s.section_key));
    }

    return json({ success: true, page, sections: sectionResults, blocks: blockResults });
  }

  if (path === "/api/cms/page/bootstrap" && method === "POST") {
    const cmsUser = await requireCmsUser(request, env, sessionUser);
    if (!cmsUser) return json({ success: false, error: "Not authenticated" }, 401);

    const data = await body(request);
    const route = normalizeFragmentRoute(data.route_path || "/");
    const force = data.force === true;

    await upsertFragmentPageDefaults(env, route, force);
    const fragmentSync = await syncFragmentCmsToR2(env, route);
    return json({ success: true, route_path: route, force, fragment_sync: fragmentSync });
  }

  if (path === "/api/cms/home/bootstrap" && method === "POST") {
    const cmsUser = await requireCmsUser(request, env, sessionUser);
    if (!cmsUser) return json({ success: false, error: "Not authenticated" }, 401);
    const data = await body(request);
    const force = data.force === true;
    await upsertFragmentPageDefaults(env, "/", force);
    const fragmentSync = await syncFragmentCmsToR2(env, "/");
    return json({ success: true, route_path: "/", force, fragment_sync: fragmentSync });
  }

  if (path === "/api/cms/preview" && method === "GET") {
    const cmsUser = await requireCmsUser(request, env, sessionUser);
    if (!cmsUser) return json({ success: false, error: "Not authenticated" }, 401);

    const route = normalizeRouteInput(url.searchParams.get("route") || "/");
    if (!route) return json({ success: false, error: "route required" }, 400);

    try {
      const raw = await previewFragmentPageFromCms(env, route);
      if (!raw) {
        // Fallback for pages without sections yet
        const fallback = await renderPage(route, `preview_${Date.now()}`, env, {
          persist: false,
          includeHidden: true,
        }).catch(() => null);
        if (!fallback) return json({ success: false, error: "Preview assembly failed", route }, 500);
        const html = injectCmsInspector(fallback);
        return new Response(html, {
          status: 200,
          headers: {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "no-store",
          },
        });
      }
      const html = injectCmsInspector(raw);
      return new Response(html, {
        status: 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
        },
      });
    } catch (err) {
      return json({ success: false, error: err?.message || "Preview render failed" }, 500);
    }
  }

  // GET /api/cms/section/templates — addable section + form catalog (editor Add SSOT)
  if (path === "/api/cms/section/templates" && method === "GET") {
    const cmsUser = await requireCmsUser(request, env, sessionUser);
    if (!cmsUser) return json({ success: false, error: "Not authenticated" }, 401);
    const { ADDABLE_SECTION_TYPES } = await import("./cms_section_catalog.js");
    const {
      SECTION_TEMPLATE_META,
      FORM_TEMPLATE_ENTRIES,
    } = await import("./cms_section_preview_fixtures.js");
    const sections = (ADDABLE_SECTION_TYPES || []).map((row) => {
      const meta = SECTION_TEMPLATE_META[row.type] || { category: "content", icon: "layers" };
      return {
        type: row.type,
        label: row.label,
        desc: row.desc,
        kind: "section",
        category: meta.category,
        icon: meta.icon,
        preview_url: `/api/cms/section/preview?type=${encodeURIComponent(row.type)}`,
      };
    });
    return json({
      success: true,
      sections,
      forms: FORM_TEMPLATE_ENTRIES,
      templates: [...sections, ...FORM_TEMPLATE_ENTRIES],
    });
  }

  // GET /api/cms/section/preview?type=hero — isolated template preview HTML
  if (path === "/api/cms/section/preview" && method === "GET") {
    const cmsUser = await requireCmsUser(request, env, sessionUser);
    if (!cmsUser) return json({ success: false, error: "Not authenticated" }, 401);
    const type = String(url.searchParams.get("type") || "").trim().toLowerCase();
    if (!type) return json({ success: false, error: "type required" }, 400);

    try {
      const { getBrand } = await import("./render_page.js");
      const { renderSectionByType } = await import("./cms_section_catalog.js");
      const { buildSectionPreviewFixture } = await import("./cms_section_preview_fixtures.js");
      const brand = await getBrand(env).catch(() => ({}));
      const { section: demo, blocks } = buildSectionPreviewFixture(type, brand);
      if (!demo.image_url && demo._logo_fallback) demo.image_url = demo._logo_fallback;
      delete demo._logo_fallback;
      const fragment = await renderSectionByType(demo, blocks || [], brand, env, {
        preview: true,
        includeHidden: true,
      });
      const html = `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Preview · ${type.replace(/</g, "")}</title>
<link rel="stylesheet" href="/static/global/cpas-shell.css"/>
<link rel="stylesheet" href="/api/cms/brand/tokens.css"/>
<style>
  html,body{margin:0;background:#f4efe8}
  body{padding:0}
  .tpl-artboard{width:1200px;min-height:420px;margin:0;background:#f4efe8}
  .tpl-artboard > *{max-width:100%}
</style>
</head><body><div class="tpl-artboard" data-preview-type="${type.replace(/"/g, "")}">${fragment || "<p style='padding:24px;font-family:system-ui'>No preview available for this type.</p>"}</div></body></html>`;
      return new Response(html, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
      });
    } catch (err) {
      return json({ success: false, error: err?.message || "Section preview failed" }, 500);
    }
  }

  if (path === "/api/cms/section/save" && method === "POST") {
    const cmsUser = await requireCmsUser(request, env, sessionUser);
    if (!cmsUser) return json({ success: false, error: "Not authenticated" }, 401);

    const data = await body(request);
    const section = data.section || data;

    const page_route = section.page_route || data.page_route || "/";
    const section_key = section.section_key || data.section_key || id("section");

    await env.DB.prepare(`
      INSERT INTO cms_page_sections
      (id, tenant_id, page_route, section_key, section_type, eyebrow, heading, subheading, body,
       image_url, cta_label, cta_href, cta_secondary_label, cta_secondary_href, sort_order,
       is_visible, config_json, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(tenant_id, page_route, section_key) DO UPDATE SET
        section_type = excluded.section_type,
        eyebrow = excluded.eyebrow,
        heading = excluded.heading,
        subheading = excluded.subheading,
        body = excluded.body,
        image_url = excluded.image_url,
        cta_label = excluded.cta_label,
        cta_href = excluded.cta_href,
        cta_secondary_label = excluded.cta_secondary_label,
        cta_secondary_href = excluded.cta_secondary_href,
        sort_order = excluded.sort_order,
        is_visible = excluded.is_visible,
        config_json = excluded.config_json,
        updated_at = datetime('now')
    `).bind(
      section.id || id("section"),
      TENANT_ID,
      page_route,
      section_key,
      section.section_type || "content",
      section.eyebrow || "",
      section.heading || section.title || "",
      section.subheading || "",
      section.body || "",
      section.image_url || "",
      section.cta_label || "",
      section.cta_href || "",
      section.cta_secondary_label || "",
      section.cta_secondary_href || "",
      Number(section.sort_order || 50),
      section.is_visible === 0 ? 0 : 1,
      typeof section.config_json === "string" ? section.config_json : JSON.stringify(section.config_json || {})
    ).run();

    await env.DB.prepare("UPDATE cms_pages SET status = 'draft', updated_at = datetime('now') WHERE tenant_id = ? AND route_path = ?")
      .bind(TENANT_ID, page_route).run().catch(() => {});

    await bustCache(env, `sections:${TENANT_ID}:${page_route}`, `bootstrap:${TENANT_ID}`);

    let fragmentSync = null;
    try {
      if (isFragmentPageRoute(page_route)) {
        fragmentSync = await syncFragmentCmsToR2(env, page_route);
      }
    } catch (err) {
      console.warn("[cms/section/save] R2 sync failed:", err?.message || err);
      fragmentSync = { error: String(err?.message || err) };
    }

    return json({ success: true, page_route, section_key, fragment_sync: fragmentSync });
  }

  // POST /api/cms/sections/reorder — batch sort_order only, one R2 sync
  if (path === "/api/cms/sections/reorder" && method === "POST") {
    const cmsUser = await requireCmsUser(request, env, sessionUser);
    if (!cmsUser) return json({ success: false, error: "Not authenticated" }, 401);

    const data = await body(request);
    const page_route = normalizeRouteInput(data.page_route || "/");
    const keys = Array.isArray(data.section_keys)
      ? data.section_keys.map((k) => String(k || "").trim()).filter(Boolean)
      : [];
    if (!page_route) return json({ success: false, error: "page_route required" }, 400);
    if (!keys.length) return json({ success: false, error: "section_keys required" }, 400);

    for (let i = 0; i < keys.length; i++) {
      await env.DB.prepare(
        `UPDATE cms_page_sections
         SET sort_order = ?, updated_at = datetime('now')
         WHERE tenant_id = ? AND page_route = ? AND section_key = ?`
      )
        .bind((i + 1) * 10, TENANT_ID, page_route, keys[i])
        .run();
    }

    await env.DB.prepare(
      "UPDATE cms_pages SET status = 'draft', updated_at = datetime('now') WHERE tenant_id = ? AND route_path = ?"
    )
      .bind(TENANT_ID, page_route)
      .run()
      .catch(() => {});

    await bustCache(env, `sections:${TENANT_ID}:${page_route}`, `bootstrap:${TENANT_ID}`);

    let fragmentSync = null;
    try {
      if (isFragmentPageRoute(page_route)) {
        fragmentSync = await syncFragmentCmsToR2(env, page_route);
      }
    } catch (err) {
      console.warn("[cms/sections/reorder] R2 sync failed:", err?.message || err);
      fragmentSync = { error: String(err?.message || err) };
    }

    return json({
      success: true,
      page_route,
      section_keys: keys,
      fragment_sync: fragmentSync,
    });
  }

  if (path === "/api/cms/block/save" && method === "POST") {
    const cmsUser = await requireCmsUser(request, env, sessionUser);
    if (!cmsUser) return json({ success: false, error: "Not authenticated" }, 401);

    const data = await body(request);
    const block = data.block || data;

    const page_route = block.page_route || data.page_route || "/";
    const section_key = block.section_key || data.section_key || "main";
    const block_key = block.block_key || data.block_key || id("block");

    await env.DB.prepare(`
      INSERT INTO cms_page_content_blocks
      (id, tenant_id, page_route, section_key, block_key, block_type, eyebrow, title, subtitle, body,
       image_url, alt_text, href, action_label, action_type, action_value, sort_order, is_visible,
       config_json, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(tenant_id, page_route, section_key, block_key) DO UPDATE SET
        block_type = excluded.block_type,
        eyebrow = excluded.eyebrow,
        title = excluded.title,
        subtitle = excluded.subtitle,
        body = excluded.body,
        image_url = excluded.image_url,
        alt_text = excluded.alt_text,
        href = excluded.href,
        action_label = excluded.action_label,
        action_type = excluded.action_type,
        action_value = excluded.action_value,
        sort_order = excluded.sort_order,
        is_visible = excluded.is_visible,
        config_json = excluded.config_json,
        updated_at = datetime('now')
    `).bind(
      block.id || id("block"),
      TENANT_ID,
      page_route,
      section_key,
      block_key,
      block.block_type || "text",
      block.eyebrow || "",
      block.title || "",
      block.subtitle || "",
      block.body || "",
      block.image_url || "",
      block.alt_text || "",
      block.href || "",
      block.action_label || "",
      block.action_type || "",
      block.action_value || "",
      Number(block.sort_order || 50),
      block.is_visible === 0 ? 0 : 1,
      typeof block.config_json === "string" ? block.config_json : JSON.stringify(block.config_json || {})
    ).run();

    await env.DB.prepare("UPDATE cms_pages SET status = 'draft', updated_at = datetime('now') WHERE tenant_id = ? AND route_path = ?")
      .bind(TENANT_ID, page_route).run().catch(() => {});

    await bustCache(env, `sections:${TENANT_ID}:${page_route}`, `bootstrap:${TENANT_ID}`);

    let fragmentSync = null;
    try {
      if (isFragmentPageRoute(page_route)) {
        fragmentSync = await syncFragmentCmsToR2(env, page_route);
      }
    } catch (err) {
      console.warn("[cms/block/save] R2 sync failed:", err?.message || err);
      fragmentSync = { error: String(err?.message || err) };
    }

    return json({ success: true, page_route, section_key, block_key, fragment_sync: fragmentSync });
  }

  if (path === "/api/cms/page/save" && method === "POST") {
    const cmsUser = await requireCmsUser(request, env, sessionUser);
    if (!cmsUser) return json({ success: false, error: "Not authenticated" }, 401);

    const data = await body(request);
    const page = data.page || data;
    const route_path = normalizeRouteInput(page.route_path || "/");
    if (!route_path) return json({ success: false, error: "route_path required" }, 400);
    const slug = page.slug || (route_path === "/" ? "home" : route_path.replace(/^\//, "").replace(/\//g, "-"));
    const title = page.title || "Untitled Page";
    const addToNav = data.add_to_nav !== false && page.add_to_nav !== false;
    const seedSections = data.seed_sections !== false && page.seed_sections !== false;

    const existing = await env.DB.prepare(
      "SELECT id FROM cms_pages WHERE tenant_id = ? AND route_path = ? LIMIT 1"
    ).bind(TENANT_ID, route_path).first().catch(() => null);
    const isNew = !existing;

    await env.DB.prepare(`
      INSERT INTO cms_pages
      (id, tenant_id, route_path, slug, title, status, seo_title, meta_description, og_image_url,
       page_type, template_key, sort_order, is_homepage, show_header, show_footer, nav_visible, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(tenant_id, route_path) DO UPDATE SET
        slug = excluded.slug,
        title = excluded.title,
        status = excluded.status,
        seo_title = excluded.seo_title,
        meta_description = excluded.meta_description,
        og_image_url = excluded.og_image_url,
        page_type = excluded.page_type,
        template_key = excluded.template_key,
        sort_order = excluded.sort_order,
        is_homepage = excluded.is_homepage,
        show_header = excluded.show_header,
        show_footer = excluded.show_footer,
        updated_at = datetime('now')
    `).bind(
      page.id || existing?.id || id("page"),
      TENANT_ID,
      route_path,
      slug,
      title,
      page.status || (isNew ? "draft" : "draft"),
      page.seo_title || title || "",
      page.meta_description || "",
      page.og_image_url || "",
      page.page_type || "standard",
      page.template_key || "default",
      Number(page.sort_order || 50),
      page.is_homepage ? 1 : 0,
      page.show_header === 0 ? 0 : 1,
      page.show_footer === 0 ? 0 : 1,
      addToNav ? 1 : 0
    ).run();

    let bootstrap = null;
    if (isNew) {
      bootstrap = await bootstrapNewCmsPage(env, {
        route: route_path,
        title,
        add_to_nav: addToNav,
      });
    }

    await bustCache(env, `bootstrap:${TENANT_ID}`, `brand:${TENANT_ID}`);

    return json({
      success: true,
      route_path,
      created: isNew,
      bootstrap,
      editor_page_id: route_path === "/" ? "home" : route_path.replace(/^\//, "").replace(/\//g, "_"),
      message: isNew
        ? "Page created with starter sections. Publish Live to make the URL public."
        : "Page saved.",
    });
  }

  if (path === "/api/cms/publish" && method === "POST") {
    const cmsUser = await requireCmsUser(request, env, sessionUser);
    if (!cmsUser) return json({ success: false, error: "Not authenticated" }, 401);

    const data = await body(request);
    const routeInput = data.route_path ?? data.page_route ?? data.route ?? "";
    const route = normalizeRouteInput(routeInput);
    if (!route) {
      return json({ error: "route_path (or page_route/route) is required" }, 400);
    }

    const triggeredBy = cmsUser?.email || cmsUser?.id || "dashboard";
    const result = await publishPageRoute(env, route, triggeredBy);

    if (!result.success) {
      return json({
        success: false,
        error: "Failed to render published page artifacts",
        route_path: result.route_path,
        job_id: result.job_id,
        details: result.error,
      }, 500);
    }

    return json({
      success: true,
      job_id: result.job_id,
      route_path: result.route_path,
      artifact_key: result.artifact_key,
      preview_url: result.route_path === "/" ? "/" : result.route_path,
      message: "Page marked published and rendered to artifacts.",
    });
  }

  if (path === "/api/cms/publish-all" && method === "POST") {
    const cmsUser = await requireCmsUser(request, env, sessionUser);
    if (!cmsUser) return json({ success: false, error: "Not authenticated" }, 401);

    const data = await body(request);
    const triggeredBy = cmsUser?.email || cmsUser?.id || "dashboard";

    let routes = PUBLIC_PAGE_ROUTES;
    if (Array.isArray(data.routes) && data.routes.length) {
      routes = data.routes.map((r) => normalizeRouteInput(r)).filter(Boolean);
    } else if (!env.DB) {
      return json({ success: false, error: "DB binding missing" }, 500);
    } else {
      routes = await listAllCmsPageRoutes(env);
    }

    const results = [];
    for (const route of routes) {
      results.push(await publishPageRoute(env, route, triggeredBy));
    }

    const failed = results.filter((r) => !r.success);
    const succeeded = results.filter((r) => r.success);

    return json({
      success: failed.length === 0,
      published: succeeded.length,
      failed: failed.length,
      routes: results,
      message: failed.length
        ? `Published ${succeeded.length}/${results.length} pages. ${failed.length} failed.`
        : `Published all ${results.length} pages.`,
    }, failed.length ? 207 : 200);
  }

  // GET /api/cms/sections — all sections for this tenant, keyed for the pages view
  if (path === "/api/cms/sections" && method === "GET") {
    const pageRoute = url.searchParams.get("route") || null;
    let q = `SELECT id, page_route, section_key, section_type, heading, subheading,
                     eyebrow, body, image_url, cta_label, cta_href,
                     sort_order, is_visible, config_json, created_at, updated_at
              FROM cms_page_sections
              WHERE tenant_id = ?`;
    const binds = [TENANT_ID];
    if (pageRoute) { q += " AND page_route = ?"; binds.push(pageRoute); }
    q += " ORDER BY page_route, sort_order";
    const { results } = await env.DB.prepare(q).bind(...binds).all().catch(() => ({ results: [] }));
    return json({ success: true, sections: results || [] });
  }

  // PATCH /api/cms/section/:id — update a single section field (inline editing)
  if (path.match(/^\/api\/cms\/section\/[^/]+$/) && method === "PATCH") {
    const sectionId = path.split("/")[4];
    const data = await body(request);
    const allowed = ["heading","subheading","eyebrow","body","image_url","cta_label","cta_href","cta_secondary_label","cta_secondary_href","is_visible","sort_order","config_json"];
    const updates = Object.keys(data).filter(k => allowed.includes(k));
    if (!updates.length) return json({ success: false, error: "No valid fields" }, 400);
    const setClauses = updates.map(k => `${k} = ?`).join(", ");
    const vals = updates.map(k => data[k]);
    await env.DB.prepare(
      `UPDATE cms_page_sections SET ${setClauses}, updated_at = datetime('now') WHERE id = ? AND tenant_id = ?`
    ).bind(...vals, sectionId, TENANT_ID).run();
    if (env.CMS_CACHE) {
      // Bust cache for the page this section belongs to
      const sec = await env.DB.prepare("SELECT page_route FROM cms_page_sections WHERE id = ?").bind(sectionId).first().catch(() => null);
      if (sec?.page_route) await bustCache(env, `page:${sec.page_route}`);
    }
    return json({ success: true, id: sectionId });
  }

    // GET /api/cms/assets/stats
  if (path === "/api/cms/assets/stats" && method === "GET") {
    const summary = await env.DB.prepare(
      `SELECT COUNT(*) AS asset_count, COALESCE(SUM(size), 0) AS total_bytes
       FROM cms_assets WHERE tenant_id = ? AND status != 'archived'`
    ).bind(TENANT_ID).first().catch(() => ({ asset_count: 0, total_bytes: 0 }));

    const byType = await env.DB.prepare(
      `SELECT COALESCE(asset_type, 'image') AS asset_type, COUNT(*) AS n, COALESCE(SUM(size), 0) AS bytes
       FROM cms_assets WHERE tenant_id = ? AND status != 'archived'
       GROUP BY COALESCE(asset_type, 'image')`
    ).bind(TENANT_ID).all().catch(() => ({ results: [] }));

    const quotaBytes = Number(env.R2_STORAGE_QUOTA_BYTES || 10 * 1024 * 1024 * 1024);
    const totalBytes = Number(summary?.total_bytes || 0);
    return json({
      success: true,
      asset_count: Number(summary?.asset_count || 0),
      total_bytes: totalBytes,
      quota_bytes: quotaBytes,
      used_pct: quotaBytes ? Math.min(100, Math.round((totalBytes / quotaBytes) * 1000) / 10) : 0,
      by_type: byType?.results || [],
      cdn_origin: "https://assets.companionsofcaddo.org",
    });
  }

  // POST /api/cms/assets/rebuild-usages — scan animals/campaigns into cms_asset_usages
  if (path === "/api/cms/assets/rebuild-usages" && method === "POST") {
    const result = await rebuildCmsAssetUsages(env);
    return json({ success: true, ...result });
  }

    // GET /api/cms/assets
  if (path === "/api/cms/assets" && method === "GET") {
    const context = url.searchParams.get("context") || null;
    const category = url.searchParams.get("category") || null;
    let q = "SELECT * FROM cms_assets WHERE tenant_id = ? AND status != 'archived'";
    const binds = [TENANT_ID];
    if (context) { q += " AND usage_context = ?"; binds.push(context); }
    if (category) { q += " AND category = ?"; binds.push(category); }
    q += " ORDER BY updated_at DESC, created_at DESC LIMIT 500";
    const { results } = await env.DB.prepare(q).bind(...binds).all().catch(() => ({ results: [] }));
    const assets = results || [];
    const usageMap = await loadUsagesByAssetIds(env, assets.map((a) => a.id));
    const enriched = assets.map((a) => {
      const usages = usageMap.get(a.id) || [];
      const liveUsages = usages.filter((u) => u.is_live);
      // Trust only cms_asset_usages — ignore legacy cms_assets.is_live flags
      return {
        ...a,
        usages,
        usage_labels: usages.map((u) => u.label),
        is_live_usage: liveUsages.length > 0,
        live_labels: liveUsages.map((u) => u.label),
      };
    });
    return json({ success: true, assets: enriched });
  }

  // POST /api/cms/asset/upload — multipart file upload → R2 → cms_assets
  if (path === "/api/cms/asset/upload" && method === "POST") {
    const cmsUser = await requireCmsUser(request, env, sessionUser);
    if (!cmsUser) return json({ success: false, error: "Not authenticated" }, 401);

    const CDN_ORIGIN = "https://assets.companionsofcaddo.org";
    const ALLOWED_UPLOAD_MIME = new Set([
      "image/jpeg","image/jpg","image/png","image/webp",
      "image/gif","image/svg+xml","image/avif",
      "application/pdf",
      "video/mp4","video/quicktime","video/webm",
    ]);
    const MAX_SIZE = 25 * 1024 * 1024; // 25 MB (video/PDF)

    let formData;
    try { formData = await request.formData(); }
    catch { return json({ success: false, error: "Invalid multipart body" }, 400); }

    const file     = formData.get("file");
    const altText  = formData.get("alt_text")      || "";
    const label    = formData.get("label")         || "";
    const r2Folder = formData.get("r2_folder")     || "";
    const context  = formData.get("usage_context") || "cms";
    const category = formData.get("category")      || "image";
    const animalId = String(formData.get("animal_id") || formData.get("animalId") || "").trim();

    if (!file || typeof file.arrayBuffer !== "function") {
      return json({ success: false, error: "No file provided" }, 400);
    }
    if (!ALLOWED_UPLOAD_MIME.has(file.type)) {
      return json({ success: false, error: `MIME type not allowed: ${file.type}` }, 400);
    }

    const fileBytes = await file.arrayBuffer();
    if (fileBytes.byteLength > MAX_SIZE) {
      return json({ success: false, error: "File exceeds 10 MB limit" }, 400);
    }

    const safeName = file.name
      .normalize("NFC")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(0, 120);
    const r2Key  = resolveUploadR2Key(r2Folder, safeName, {
      animalId,
      category,
      usageContext: context,
      forceAnimalFolder: String(r2Folder || "").replace(/\/+$/, "") === "media/animals",
    });
    const pubUrl = `${CDN_ORIGIN}/${r2Key}`;
    const isAnimalPath = r2Key.startsWith("media/animals/");
    const usageContext = isAnimalPath
      ? "animals"
      : (R2_MEDIA_FOLDERS.has(String(r2Folder || "").replace(/\/+$/, ""))
        ? String(r2Folder).replace(/^media\//, "")
        : context);
    const resolvedCategory = isAnimalPath ? "animal" : category;

    // Write to R2
    try {
      const meta = { tenant_id: TENANT_ID, uploaded_by: cmsUser.id || "unknown" };
      if (animalId) meta.animal_id = animalId;
      await env.WEBSITE_ASSETS.put(r2Key, fileBytes, {
        httpMetadata: {
          contentType:  file.type,
          cacheControl: "public, max-age=31536000, immutable",
        },
        customMetadata: meta,
      });
    } catch (err) {
      console.error("[cms-upload] R2 put failed:", err?.message);
      return json({ success: false, error: "R2 upload failed" }, 500);
    }

    // Insert cms_assets row
    const assetId  = id("asset");
    const assetKey = animalId
      ? `animal_${animalId}_${Date.now().toString(36).slice(2, 8)}`
      : `upload_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`;
    const assetType = file.type.startsWith("video/") ? "video"
      : file.type === "application/pdf" ? "document"
      : "image";
    await env.DB.prepare(
      `INSERT INTO cms_assets
         (id, tenant_id, project_id, asset_key, label, filename, original_filename,
          mime_type, size, category, asset_type, r2_key, r2_bucket,
          pub_url, cdn_url, public_url, alt_text,
          usage_context, status, is_live, created_by, created_at, updated_at)
       VALUES (?, ?, 'proj_companionscpas', ?, ?, ?, ?,
               ?, ?, ?, ?, ?, 'companionscpas',
               ?, ?, ?, ?,
               ?, 'active', 1, ?, datetime('now'), datetime('now'))`
    ).bind(
      assetId, TENANT_ID, assetKey,
      label || safeName, safeName, file.name,
      file.type, fileBytes.byteLength,
      resolvedCategory, assetType,
      r2Key,
      pubUrl, pubUrl, pubUrl,
      altText,
      usageContext,
      cmsUser.id || "unknown"
    ).run();

    return json({
      success: true,
      asset_key: assetKey,
      public_url: pubUrl,
      r2_key: r2Key,
      id: assetId,
      mime_type: file.type,
      asset_type: assetType,
      filename: file.name,
      category: resolvedCategory,
    });
  }

    // POST /api/cms/asset/save
  if (path === "/api/cms/asset/save" && method === "POST") {
    const cmsUser = await requireCmsUser(request, env, sessionUser);
    if (!cmsUser) return json({ success: false, error: "Not authenticated" }, 401);

    const data = await body(request);
    const asset = data.asset || data;
    const asset_key = asset.asset_key || id("asset");

    await env.DB.prepare(`
      INSERT INTO cms_assets
      (id, tenant_id, project_id, asset_key, label, filename, original_filename,
       mime_type, size, category, asset_type, r2_key, r2_bucket,
       pub_url, cdn_url, public_url, usage_context, path, status, is_live,
       alt_text, notes, created_by, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))
      ON CONFLICT(tenant_id, asset_key) DO UPDATE SET
        label = excluded.label,
        cdn_url = excluded.cdn_url,
        pub_url = excluded.pub_url,
        public_url = excluded.public_url,
        alt_text = excluded.alt_text,
        status = excluded.status,
        is_live = excluded.is_live,
        usage_context = excluded.usage_context,
        notes = excluded.notes,
        updated_at = datetime('now')
    `).bind(
      asset.id || id("asset"),
      TENANT_ID,
      asset.project_id || "proj_companionscpas",
      asset_key,
      asset.label || asset.filename || "",
      asset.filename || "",
      asset.original_filename || asset.filename || "",
      asset.mime_type || "image/webp",
      asset.size || 0,
      asset.category || "image",
      asset.asset_type || "image",
      asset.r2_key || "",
      asset.r2_bucket || "companionscpas",
      asset.pub_url || "",
      asset.cdn_url || "",
      asset.cdn_url || asset.pub_url || "",
      asset.usage_context || "general",
      asset.r2_key || "",
      asset.status || "active",
      asset.is_live === 0 ? 0 : 1,
      asset.alt_text || "",
      asset.notes || "",
      asset.created_by || "dashboard"
    ).run();

    await bustCache(env, `bootstrap:${TENANT_ID}`);
    return json({ success: true, asset_key });
  }

  // POST /api/cms/asset/delete — archive row + remove R2 object
  if (path === "/api/cms/asset/delete" && method === "POST") {
    const cmsUser = await requireCmsUser(request, env, sessionUser);
    if (!cmsUser) return json({ success: false, error: "Not authenticated" }, 401);

    const data = await body(request);
    const assetId = data.id || null;
    const assetKey = data.asset_key || null;
    if (!assetId && !assetKey) return json({ success: false, error: "id or asset_key required" }, 400);

    const row = assetId
      ? await env.DB.prepare("SELECT * FROM cms_assets WHERE tenant_id = ? AND id = ? LIMIT 1").bind(TENANT_ID, assetId).first()
      : await env.DB.prepare("SELECT * FROM cms_assets WHERE tenant_id = ? AND asset_key = ? LIMIT 1").bind(TENANT_ID, assetKey).first();
    if (!row) return json({ success: false, error: "Asset not found" }, 404);

    if (row.r2_key) {
      try { await env.WEBSITE_ASSETS.delete(row.r2_key); } catch (err) {
        console.warn("[cms-delete] R2 delete failed:", row.r2_key, err?.message);
      }
    }

    await env.DB.prepare(
      `UPDATE cms_assets SET status = 'archived', is_live = 0, updated_at = datetime('now')
       WHERE tenant_id = ? AND id = ?`
    ).bind(TENANT_ID, row.id).run();

    await bustCache(env, `bootstrap:${TENANT_ID}`);
    return json({ success: true, id: row.id });
  }

  // GET /api/cms/brand
  if (path === "/api/cms/brand" && method === "GET") {
    // KV first
    if (env.CMS_CACHE) {
      const cached = await env.CMS_CACHE.get(`brand:${TENANT_ID}`, { type: "json" }).catch(() => null);
      if (cached) return json({ success: true, brand: cached, source: "kv" });
    }
    const brand = await env.DB.prepare(
      "SELECT * FROM cms_brand_settings WHERE tenant_id = ? ORDER BY id LIMIT 1"
    ).bind(TENANT_ID).first().catch(() => null);

    if (brand && env.CMS_CACHE) {
      await env.CMS_CACHE.put(`brand:${TENANT_ID}`, JSON.stringify(brand), { expirationTtl: 60 }).catch(() => {});
    }
    return json({ success: true, brand, source: "d1" });
  }

  // POST /api/cms/brand/save
  if (path === "/api/cms/brand/save" && method === "POST") {
    const cmsUser = await requireCmsUser(request, env, sessionUser);
    if (!cmsUser) return json({ success: false, error: "Not authenticated" }, 401);

    const data = await body(request);
    const brand = data.brand || data;

    await env.DB.prepare(`
      UPDATE cms_brand_settings SET
        brand_name            = ?,
        logo_url              = ?,
        logo_dark_url         = ?,
        logo_light_url        = ?,
        favicon_url           = ?,
        footer_logo_dark_url  = ?,
        footer_logo_light_url = ?,
        primary_color         = ?,
        secondary_color       = ?,
        accent_color          = ?,
        site_domain           = ?,
        navigation_json       = ?,
        footer_json           = ?,
        socials_json          = ?,
        organization_json     = ?,
        seo_defaults_json     = ?,
        logo_width            = ?,
        logo_height           = ?,
        updated_at            = datetime('now')
      WHERE tenant_id = ? AND id = 'brand_companionscpas'
    `).bind(
      brand.brand_name       || "Companions of CPAS",
      brand.logo_url         || "",
      brand.logo_dark_url    || "",
      brand.logo_light_url   || "",
      brand.favicon_url      || "",
      brand.footer_logo_dark_url  || "",
      brand.footer_logo_light_url || "",
      brand.primary_color    || "#7c3aed",
      brand.secondary_color  || "#172033",
      brand.accent_color     || "#ee2336",
      brand.site_domain      || "",
      typeof brand.navigation_json === "string" ? brand.navigation_json : JSON.stringify(brand.navigation_json || []),
      typeof brand.footer_json === "string"     ? brand.footer_json     : JSON.stringify(brand.footer_json || {}),
      typeof brand.socials_json === "string"    ? brand.socials_json    : JSON.stringify(brand.socials_json || {}),
      typeof brand.organization_json === "string" ? brand.organization_json : JSON.stringify(brand.organization_json || {}),
      typeof brand.seo_defaults_json === "string" ? brand.seo_defaults_json : JSON.stringify(brand.seo_defaults_json || {}),
      Number(brand.logo_width) > 0 ? Number(brand.logo_width) : 140,
      Number(brand.logo_height) > 0 ? Number(brand.logo_height) : null,
      TENANT_ID
    ).run();

    // Bust KV — next request re-hydrates from D1
    await bustCache(env,
      `brand:${TENANT_ID}`,
      `bootstrap:${TENANT_ID}`
    );

    return json({ success: true, message: "Brand updated. KV cache invalidated." });
  }

  // POST /api/cms/section/delete — soft-delete (D1 deleted_at + R2 archive). Undo restores from D1 only.
  if (path === "/api/cms/section/delete" && method === "POST") {
    const cmsUser = await requireCmsUser(request, env, sessionUser);
    if (!cmsUser) return json({ success: false, error: "Not authenticated" }, 401);

    const data = await body(request);
    const { page_route, section_key } = data;
    if (!page_route || !section_key) return json({ error: "page_route and section_key required" }, 400);

    const existing = await env.DB.prepare(
      `SELECT section_key, heading FROM cms_page_sections
       WHERE tenant_id = ? AND page_route = ? AND section_key = ?
         AND (deleted_at IS NULL OR deleted_at = '')
       LIMIT 1`
    ).bind(TENANT_ID, page_route, section_key).first().catch(() => null);
    if (!existing) return json({ success: false, error: "Section not found" }, 404);

    await env.DB.prepare(
      `UPDATE cms_page_sections
       SET deleted_at = datetime('now'), updated_at = datetime('now')
       WHERE tenant_id = ? AND page_route = ? AND section_key = ?`
    ).bind(TENANT_ID, page_route, section_key).run();

    const archive = await archiveAndClearLiveFragment(env, page_route, section_key);

    await bustCache(env,
      `sections:${TENANT_ID}:${page_route}`,
      `bootstrap:${TENANT_ID}`,
      `page:${page_route}`
    );

    let fragmentSync = null;
    if (isFragmentPageRoute(page_route)) {
      fragmentSync = await syncFragmentCmsToR2(env, page_route);
    }

    return json({
      success: true,
      soft_deleted: true,
      deleted: { page_route, section_key, heading: existing.heading || section_key },
      archive,
      fragment_sync: fragmentSync,
      undo_window_seconds: 30,
    });
  }

  // POST /api/cms/section/restore — clear deleted_at and re-render live fragment from D1 (never from R2 trash).
  if (path === "/api/cms/section/restore" && method === "POST") {
    const cmsUser = await requireCmsUser(request, env, sessionUser);
    if (!cmsUser) return json({ success: false, error: "Not authenticated" }, 401);

    const data = await body(request);
    const { page_route, section_key } = data;
    if (!page_route || !section_key) return json({ error: "page_route and section_key required" }, 400);

    const row = await env.DB.prepare(
      `SELECT * FROM cms_page_sections
       WHERE tenant_id = ? AND page_route = ? AND section_key = ?
         AND deleted_at IS NOT NULL AND deleted_at != ''
       LIMIT 1`
    ).bind(TENANT_ID, page_route, section_key).first().catch(() => null);
    if (!row) return json({ success: false, error: "Nothing to restore (expired or already restored)" }, 404);

    await env.DB.prepare(
      `UPDATE cms_page_sections
       SET deleted_at = NULL, updated_at = datetime('now')
       WHERE tenant_id = ? AND page_route = ? AND section_key = ?`
    ).bind(TENANT_ID, page_route, section_key).run();

    const brand = await getBrand(env);
    const { blocksBySection } = await loadRouteSections(env, page_route, { includeHidden: true });
    const sectionBlocks = blocksBySection.get(section_key) || [];
    const restored = { ...row, deleted_at: null };
    const sync = await syncSectionToR2(env, page_route, restored, sectionBlocks, brand, {});

    await bustCache(env,
      `sections:${TENANT_ID}:${page_route}`,
      `bootstrap:${TENANT_ID}`,
      `page:${page_route}`
    );

    let fragmentSync = null;
    if (isFragmentPageRoute(page_route)) {
      fragmentSync = await syncFragmentCmsToR2(env, page_route);
    }

    return json({
      success: true,
      restored: { page_route, section_key },
      sync,
      fragment_sync: fragmentSync,
    });
  }


  // PATCH /api/cms/brand/config — write active_font_preset or any config_json key
  if (path === '/api/cms/brand/config' && (method === 'POST' || method === 'PATCH')) {
    const cmsUser = await requireCmsUser(request, env, sessionUser);
    if (!cmsUser) return json({ success: false, error: 'Not authenticated' }, 401);
    const data = await body(request);
    // data: { active_font_preset: 'playfair_inter' } or any flat config key
    // Read current config_json, merge, write back
    const row = await env.DB.prepare(
      'SELECT config_json FROM cms_brand_settings WHERE tenant_id = ? LIMIT 1'
    ).bind(TENANT_ID).first().catch(() => null);
    const current = (() => { try { return JSON.parse(row?.config_json || '{}'); } catch { return {}; } })();
    const merged = { ...current, ...data };
    await env.DB.prepare(
      `UPDATE cms_brand_settings SET config_json = ?, updated_at = datetime("now") WHERE tenant_id = ?`
    ).bind(JSON.stringify(merged), TENANT_ID).run();
    await bustCache(env, 'brand:' + TENANT_ID, 'bootstrap:' + TENANT_ID);
    // Bust all page KV cache so re-render picks up new font
    const PUBLIC_ROUTES = ['/', '/about', '/adopt', '/fosters', '/contact', '/donate', '/community'];
    for (const r of PUBLIC_ROUTES) {
      await env.CMS_CACHE.delete('page:' + r).catch(() => {});
    }
    return json({ success: true, config: merged });
  }

  if (path === "/api/cms/page/nav-visible" && method === "POST") {
    const cmsUser = await requireCmsUser(request, env, sessionUser);
    if (!cmsUser) return json({ success: false, error: "Not authenticated" }, 401);

    const data = await body(request);
    const route = normalizeRouteInput(data.route_path || data.route || "");
    if (!route) return json({ success: false, error: "route_path is required" }, 400);

    const navVisible = data.nav_visible === 0 || data.nav_visible === false ? 0 : 1;
    const triggeredBy = cmsUser?.email || cmsUser?.id || "dashboard";

    try {
      await env.DB.prepare(
        `UPDATE cms_pages
         SET nav_visible = ?, updated_at = datetime('now')
         WHERE tenant_id = ? AND route_path = ?`
      ).bind(navVisible, TENANT_ID, route).run();
    } catch (err) {
      console.error("[cms/nav-visible] update failed:", err?.message || err);
      return json({ success: false, error: "Could not update page navigation visibility" }, 500);
    }

    await env.DB.prepare(
      `UPDATE cms_navigation_items
       SET is_visible = ?, updated_at = datetime('now')
       WHERE tenant_id = ? AND href = ?`
    ).bind(navVisible, TENANT_ID, route).run().catch(() => {});

    await bustCache(env, `brand:${TENANT_ID}`, `bootstrap:${TENANT_ID}`);

    const republishResults = [];
    const routesToRepublish = await listAllCmsPageRoutes(env);
    for (const pageRoute of routesToRepublish) {
      republishResults.push(await publishPageRoute(env, pageRoute, triggeredBy));
    }

    const failed = republishResults.filter((r) => !r.success);
    return json({
      success: failed.length === 0,
      route_path: route,
      nav_visible: navVisible,
      republished: republishResults.filter((r) => r.success).length,
      failed: failed.length,
      message: navVisible
        ? "Page is visible in site navigation."
        : "Page hidden from site navigation. Direct URL still works for editing.",
    }, failed.length ? 207 : 200);
  }

  if (path === "/api/cms/page/theme" && method === "POST") {
    const cmsUser = await requireCmsUser(request, env, sessionUser);
    if (!cmsUser) return json({ success: false, error: "Not authenticated" }, 401);

    const data = await body(request);
    const route = normalizeRouteInput(data.route_path || data.route || "");
    if (!route) return json({ success: false, error: "route_path is required" }, 400);

    const allowed = new Set(["plum_glass", "light", "dark"]);
    const themeRaw = String(data.theme || "").trim().toLowerCase().replace(/-/g, "_");
    const theme = themeRaw === "plum" || themeRaw === "cream" ? "plum_glass" : themeRaw;
    if (!allowed.has(theme)) {
      return json({ success: false, error: "theme must be plum_glass, light, or dark" }, 400);
    }

    const triggeredBy = cmsUser?.email || cmsUser?.id || "dashboard";
    try {
      await env.DB.prepare(
        `UPDATE cms_pages
         SET theme = ?, updated_at = datetime('now')
         WHERE tenant_id = ? AND route_path = ?`
      ).bind(theme, TENANT_ID, route).run();
    } catch (err) {
      console.error("[cms/page/theme] update failed:", err?.message || err);
      return json({ success: false, error: "Could not update page theme" }, 500);
    }

    await bustCache(env, `page:${route}`, `brand:${TENANT_ID}`);
    const published = await publishPageRoute(env, route, triggeredBy).catch((err) => ({
      success: false,
      error: err?.message || String(err),
    }));

    return json({
      success: Boolean(published?.success !== false),
      route_path: route,
      theme,
      published: Boolean(published?.success !== false),
      message: theme === "dark"
        ? "Page theme set to Dark (legacy)."
        : theme === "light"
          ? "Page theme set to Light."
          : "Page theme set to Light plum / cream (recommended).",
    }, published?.success === false ? 207 : 200);
  }

  return null;
}
