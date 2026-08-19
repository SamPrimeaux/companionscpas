// preview_inspector.js — injectCmsInspector extracted from cms_api.js
// (tkt_cpas_mod_cms_api_20260818) Verbatim; preview iframe field chrome.

export function injectCmsInspector(html) {
  const style = `
<style id="cms-inspector-style">
  body.cms-preview [data-cpas-section],
  body.cms-preview [data-section-key] { position: relative; }
  body.cms-preview .cms-sec-dim { opacity: 0.42; transition: opacity 120ms ease; }
  body.cms-preview .cms-sec-active { opacity: 1 !important; outline: 2px solid #7c3aed; outline-offset: -2px; box-shadow: inset 0 0 0 1px rgba(124,58,237,0.25); }
  body.cms-preview .cms-sec-hover:not(.cms-sec-active) { outline: 1.5px dashed rgba(124,58,237,0.55); outline-offset: -2px; }
  body.cms-preview [data-cms-field],
  body.cms-preview [data-cms-chrome="footer"] { cursor: pointer; }
  body.cms-preview [data-cms-field].cms-field-hover,
  body.cms-preview [data-cms-chrome="footer"].cms-field-hover { outline: 1.5px solid rgba(124,58,237,0.7); outline-offset: 2px; border-radius: 4px; }
  body.cms-preview [data-cms-field].cms-field-active,
  body.cms-preview [data-cms-chrome="footer"].cms-field-active { outline: 2px solid #7c3aed; outline-offset: 2px; border-radius: 4px; box-shadow: 0 0 0 3px rgba(124,58,237,0.18); }

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
    document.querySelectorAll('[data-cms-field].cms-field-hover, [data-cms-field].cms-field-active, [data-cms-chrome].cms-field-hover, [data-cms-chrome].cms-field-active').forEach(function(n) {
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

  function findChromeField(el) {
    var cur = el;
    while (cur && cur !== document.body) {
      if (cur.getAttribute && cur.getAttribute('data-cms-chrome') === 'footer') return cur;
      cur = cur.parentElement;
    }
    return null;
  }

  document.addEventListener('click', function(e) {
    if (suppressClick) {
      e.preventDefault();
      e.stopPropagation();
      suppressClick = false;
      return;
    }
    var chromeEl = findChromeField(e.target);
    if (chromeEl) {
      e.preventDefault();
      e.stopPropagation();
      clearFieldChrome();
      chromeEl.classList.add('cms-field-active');
      window.parent.postMessage({
        type: 'cms:chrome-selected',
        chrome: 'footer',
        badgeId: chromeEl.getAttribute('data-cms-badge-id') || null,
        field: chromeEl.getAttribute('data-cms-field') || null
      }, '*');
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
          var f = null;
          if (e.data.blockKey) {
            f = sec.querySelector('[data-cms-field="' + activeField + '"][data-cms-block="' + e.data.blockKey + '"]');
          }
          if (!f) f = sec.querySelector('[data-cms-field="' + activeField + '"]');
          if (f) {
            f.classList.add('cms-field-active');
            if (activeField === 'image_url' || activeField === 'card_image') {
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
