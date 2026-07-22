/**
 * raw_html / "Custom Code" — inject HTML from pasted config.html or fetch config.source_url.
 * Fail soft: never throw; empty comment on missing content / fetch failure.
 * Sync/publish writes the result to the section R2 fragment like every other type.
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

function wrapHtml(sectionKey, html) {
  return `<div class="cms-raw-html" data-section-key="${escapeAttr(sectionKey)}" data-section-type="raw_html" data-cms-raw-html="1">${html}</div>`;
}

function placeholder(sectionKey, title, detail, { error = false } = {}) {
  const border = error ? "2px solid #dc2626" : "2px dashed #64748b";
  const bg = error ? "#fef2f2" : "#f8fafc";
  const color = error ? "#991b1b" : "#334155";
  return `<section class="cms-raw-html-placeholder" data-section-key="${escapeAttr(sectionKey)}" data-section-type="raw_html" style="margin:1rem;padding:1.25rem;border:${border};border-radius:12px;background:${bg};color:${color};font-family:system-ui,sans-serif">
  <strong>${escapeAttr(title)}</strong>
  <div style="margin-top:0.35rem;font-size:0.9rem">${detail}</div>
</section>`;
}

/** Resolve source: explicit html_source, else paste if html set, else url if source_url set. */
export function resolveRawHtmlSource(cfg = {}) {
  const mode = String(cfg.html_source || "").trim().toLowerCase();
  const inline = String(cfg.html || cfg.inline_html || "").trim();
  const sourceUrl = String(cfg.source_url || "").trim();
  if (mode === "paste" || mode === "inline") return { mode: "paste", inline, sourceUrl };
  if (mode === "url") return { mode: "url", inline, sourceUrl };
  if (inline) return { mode: "paste", inline, sourceUrl };
  if (sourceUrl) return { mode: "url", inline, sourceUrl };
  return { mode: "paste", inline: "", sourceUrl: "" };
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
  const sectionKey = String(section?.section_key || "raw_html").trim() || "raw_html";
  const { mode, inline, sourceUrl } = resolveRawHtmlSource(cfg);

  if (mode === "paste") {
    if (inline) return wrapHtml(sectionKey, inline);
    if (preview) {
      return placeholder(
        sectionKey,
        "Custom Code",
        "Paste HTML in the section editor, or switch to From URL. Save/Publish writes the fragment to R2."
      );
    }
    return skipComment("no pasted html");
  }

  // mode === url
  if (!sourceUrl) {
    if (preview) {
      return placeholder(
        sectionKey,
        "Custom Code",
        "Set <code>source_url</code> (https) or switch to Paste HTML."
      );
    }
    return skipComment("no source_url");
  }

  if (!/^https:\/\//i.test(sourceUrl)) {
    console.warn("[cms] raw_html: source_url must be https:", sourceUrl.slice(0, 120));
    if (preview) {
      return placeholder(sectionKey, "Custom Code", "<code>source_url</code> must start with https://", {
        error: true,
      });
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
        return placeholder(sectionKey, "Custom Code fetch failed", `HTTP ${res.status} from source_url`, {
          error: true,
        });
      }
      return skipComment(`fetch HTTP ${res.status}`);
    }

    const html = await res.text();
    return wrapHtml(sectionKey, html);
  } catch (err) {
    const msg = err?.name === "AbortError" ? "timeout" : (err?.message || String(err));
    console.warn("[cms] raw_html fetch error:", msg, sourceUrl.slice(0, 160));
    if (preview) {
      return placeholder(sectionKey, "Custom Code fetch error", escapeAttr(msg), { error: true });
    }
    return skipComment(msg);
  }
}
