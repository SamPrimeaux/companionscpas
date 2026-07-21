/**
 * raw_html / "Custom Code" — fetch HTML from config.source_url and inject verbatim.
 * Fail soft: never throw; empty comment on missing URL / fetch failure.
 */

const FETCH_TIMEOUT_MS = 8000;

function parseConfig(section) {
  const raw = section?.config_json;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return { ...raw };
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

function escapeAttr(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function skipComment(reason) {
  return `<!-- cms: raw_html skipped — ${reason} -->`;
}

/**
 * @param {object} section
 * @param {object[]} [_blocks]
 * @param {object} [_brand]
 * @param {object|null} [_env]
 * @param {{ preview?: boolean }} [opts]
 */
export async function renderRawHtml(section, _blocks = [], _brand = {}, _env = null, opts = {}) {
  const preview = opts.preview === true;
  const cfg = parseConfig(section);
  const sourceUrl = String(cfg.source_url || "").trim();
  const sectionKey = String(section?.section_key || "raw_html").trim() || "raw_html";

  if (!sourceUrl) {
    if (preview) {
      return `<section class="cms-raw-html-placeholder" data-section-key="${escapeAttr(sectionKey)}" data-section-type="raw_html" style="margin:1rem;padding:1.25rem;border:2px dashed #64748b;border-radius:12px;background:#f8fafc;color:#334155;font-family:system-ui,sans-serif">
  <strong>Custom Code</strong>
  <div style="margin-top:0.35rem;font-size:0.9rem">Set <code>source_url</code> in the section editor to embed HTML from a URL.</div>
</section>`;
    }
    return skipComment("no source_url");
  }

  if (!/^https:\/\//i.test(sourceUrl)) {
    console.warn("[cms] raw_html: source_url must be https:", sourceUrl.slice(0, 120));
    if (preview) {
      return `<section class="cms-raw-html-placeholder" data-section-key="${escapeAttr(sectionKey)}" data-section-type="raw_html" style="margin:1rem;padding:1.25rem;border:2px solid #dc2626;border-radius:12px;background:#fef2f2;color:#991b1b;font-family:system-ui,sans-serif">
  <strong>Custom Code</strong>
  <div style="margin-top:0.35rem;font-size:0.9rem"><code>source_url</code> must start with https://</div>
</section>`;
    }
    return skipComment("source_url must be https");
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let res;
    try {
      res = await fetch(sourceUrl, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: { accept: "text/html,application/xhtml+xml,*/*;q=0.8" },
      });
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      console.warn("[cms] raw_html fetch failed:", res.status, sourceUrl.slice(0, 160));
      if (preview) {
        return `<section class="cms-raw-html-placeholder" data-section-key="${escapeAttr(sectionKey)}" data-section-type="raw_html" style="margin:1rem;padding:1.25rem;border:2px solid #dc2626;border-radius:12px;background:#fef2f2;color:#991b1b;font-family:system-ui,sans-serif">
  <strong>Custom Code fetch failed</strong>
  <div style="margin-top:0.35rem;font-size:0.9rem">HTTP ${res.status} from source_url</div>
</section>`;
      }
      return skipComment(`fetch HTTP ${res.status}`);
    }

    const html = await res.text();
    return `<div class="cms-raw-html" data-section-key="${escapeAttr(sectionKey)}" data-section-type="raw_html" data-cms-raw-html="1">${html}</div>`;
  } catch (err) {
    const msg = err?.name === "AbortError" ? "timeout" : (err?.message || String(err));
    console.warn("[cms] raw_html fetch error:", msg, sourceUrl.slice(0, 160));
    if (preview) {
      return `<section class="cms-raw-html-placeholder" data-section-key="${escapeAttr(sectionKey)}" data-section-type="raw_html" style="margin:1rem;padding:1.25rem;border:2px solid #dc2626;border-radius:12px;background:#fef2f2;color:#991b1b;font-family:system-ui,sans-serif">
  <strong>Custom Code fetch error</strong>
  <div style="margin-top:0.35rem;font-size:0.9rem">${escapeAttr(msg)}</div>
</section>`;
    }
    return skipComment(msg);
  }
}
