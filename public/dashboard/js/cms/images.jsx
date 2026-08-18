// CMS Images library — /dashboard/cms/images

// ── /dashboard/cms/images ─────────────────────────────────────────────────────

function mediaFormatBytes(n) {
  const v = Number(n || 0);
  if (!v) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let x = v;
  while (x >= 1024 && i < units.length - 1) { x /= 1024; i += 1; }
  return `${x >= 10 || i === 0 ? Math.round(x) : x.toFixed(1)} ${units[i]}`;
}

function mediaAssetUrl(asset) {
  if (!asset) return "";
  const cdn = String(asset.cdn_url || "").trim();
  const pub = String(asset.public_url || asset.pub_url || "").trim();
  const key = String(asset.r2_key || "").replace(/^\/+/, "").trim();
  const cdnBase = cmsCdnBase();
  const raw = cdn || pub || (key ? `${cdnBase ? cdnBase + "/" : "/"}${key}` : "") || String(asset.url || asset.image_url || "").trim();
  if (!raw) return "";
  return cmsRewriteAssetUrl(raw);
}

function mediaIsImageAsset(asset) {
  return mediaAssetKind(asset) === "image";
}

function mediaPathPrefix(key) {
  const k = String(key || "").replace(/^\/+/, "").toLowerCase();
  const parts = k.split("/").filter(Boolean);
  if (parts.length >= 2) return `${parts[0]}/${parts[1]}`;
  if (parts.length === 1) return parts[0];
  return "";
}

function mediaFolderKey(asset) {
  return mediaPathPrefix(asset?.r2_key || asset?.path || "");
}

function mediaFolderLabel(folderId) {
  const row = MEDIA_FOLDERS.find(f => f.id === folderId);
  return row?.label || folderId || "—";
}

function mediaUploadFolder(folderId) {
  if (!folderId || folderId === "all") return "";
  if (folderId.startsWith("media/")) return folderId;
  return "";
}

function mediaAssetKind(asset) {
  const mime = String(asset?.mime_type || "").toLowerCase();
  const type = String(asset?.asset_type || "").toLowerCase();
  const key = String(asset?.r2_key || "").toLowerCase();
  if (type === "video" || mime.startsWith("video/")) return "video";
  if (type === "document" || mime === "application/pdf" || key.endsWith(".pdf")) return "pdf";
  return "image";
}

function mediaSizeLabel(asset) {
  const v = Number(asset?.size || 0);
  if (v > 0) return mediaFormatBytes(v);
  const kind = mediaAssetKind(asset);
  if (kind === "pdf") return "PDF";
  if (kind === "video") return "Video";
  return "—";
}

function MediaThumbPreview({ asset, compact }) {
  const url = mediaAssetUrl(asset);
  const kind = mediaAssetKind(asset);
  if (!url) {
    return React.createElement("div", { className: "media-card-empty" },
      React.createElement(Icon, { name: "file", size: compact ? 16 : 22 })
    );
  }
  if (kind === "pdf") {
    return React.createElement("iframe", {
      src: url + "#toolbar=0&navpanes=0&view=FitH",
      title: asset.label || asset.filename || "PDF preview",
      className: "media-card-pdf" + (compact ? " is-compact" : ""),
      tabIndex: -1,
    });
  }
  if (kind === "video") {
    return React.createElement("video", {
      src: url,
      muted: true,
      playsInline: true,
      preload: "metadata",
      className: "media-card-video-el" + (compact ? " is-compact" : ""),
    });
  }
  return React.createElement("img", {
    src: url,
    alt: asset.alt_text || asset.label || "",
    loading: "lazy",
    className: "media-card-image" + (compact ? " is-compact" : ""),
    onError: e => { e.target.style.opacity = 0; },
  });
}

const MEDIA_FOLDERS = [
  { id: "all", label: "All media", icon: "image" },
  { id: "media/animals", label: "Animals", icon: "paw", group: "media", path: "media/animals/" },
  { id: "media/campaign", label: "Campaign", icon: "trending", group: "media", path: "media/campaign/" },
  { id: "media/intakes", label: "Intakes", icon: "intake", group: "media", path: "media/intakes/" },
  { id: "media/medical", label: "Medical", icon: "medical", group: "media", path: "media/medical/" },
  { id: "media/team", label: "Team", icon: "people", group: "media", path: "media/team/" },
  { id: "media/videos", label: "Videos", icon: "video", group: "media", path: "media/videos/" },
  { id: "static/pages", label: "Pages", icon: "globe", group: "static", path: "static/pages/" },
  { id: "static/cms", label: "CMS uploads", icon: "upload", group: "static", path: "static/cms/" },
  { id: "static/global", label: "Global", icon: "sparkles", group: "static", path: "static/global/" },
  { id: "static/assets", label: "Site assets", icon: "image", group: "static", path: "static/assets/" },
];

function mediaDedupeAssets(assets) {
  const seen = new Map();
  for (const a of assets || []) {
    const k = String(mediaAssetUrl(a) || a.r2_key || a.id || "").toLowerCase();
    if (!k) continue;
    const prev = seen.get(k);
    const ts = String(a.updated_at || a.created_at || "");
    const prevTs = String(prev?.updated_at || prev?.created_at || "");
    if (!prev || ts > prevTs) seen.set(k, a);
  }
  return Array.from(seen.values());
}

function MediaStorageMeter({ stats }) {
  if (!stats) return null;
  const used = Number(stats.total_bytes || 0);
  const quota = Number(stats.quota_bytes || 0);
  const pct = quota ? Math.min(100, (used / quota) * 100) : 0;
  const warn = pct >= 85;
  return React.createElement("div", { className: "media-storage-meter" },
    React.createElement("div", { className: "media-storage-meter-head" },
      React.createElement("span", null, `${mediaFormatBytes(used)} used`),
      React.createElement("span", { className: "media-storage-meter-sub" }, `${stats.asset_count || 0} files · ${mediaFormatBytes(quota)} plan`)
    ),
    React.createElement("div", { className: "media-storage-meter-track" },
      React.createElement("div", {
        className: "media-storage-meter-fill" + (warn ? " warn" : ""),
        style: { width: `${pct}%` },
      })
    )
  );
}

function mediaUsageTags(asset) {
  // Only show tags backed by cms_asset_usages rows (never a bare "Live")
  const live = asset?.live_labels || [];
  if (live.length) return live.slice(0, 3);
  const all = asset?.usage_labels || [];
  return all.slice(0, 2);
}

async function downloadMediaAsset(url, filename, notify) {
  if (!url) return;
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) throw new Error("fetch failed");
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename || "download";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
    if (notify) notify("Download started");
  } catch {
    // CORS fallback — open in new tab so the browser can save
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.download = filename || "download";
    document.body.appendChild(a);
    a.click();
    a.remove();
    if (notify) notify("Opened file — use Save As if download did not start");
  }
}

function MediaPreviewModal({ asset, onClose, onSave, onDelete, copyUrl, notify }) {
  const [altText, setAltText] = React.useState(asset?.alt_text || "");
  const [label, setLabel] = React.useState(asset?.label || asset?.filename || "");
  const [busy, setBusy] = React.useState(false);
  if (!asset) return null;
  const url = mediaAssetUrl(asset);
  const isVideo = String(asset.mime_type || "").startsWith("video/") || asset.asset_type === "video";
  const isPdf = asset.mime_type === "application/pdf" || asset.asset_type === "document";
  const usageTags = mediaUsageTags(asset);

  const save = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/cms/asset/save", {
        method: "POST", credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ asset: { ...asset, alt_text: altText, label } }),
      });
      const d = await res.json();
      if (d.success) { notify("Saved"); onSave(); onClose(); }
      else notify(d.error || "Save failed", "error");
    } catch { notify("Save failed", "error"); }
    setBusy(false);
  };

  const del = async () => {
    if (!window.confirm(`Delete ${label || asset.filename}? This removes the R2 file.`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/cms/asset/delete", {
        method: "POST", credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: asset.id }),
      });
      const d = await res.json();
      if (d.success) { notify("Deleted"); onDelete(); onClose(); }
      else notify(d.error || "Delete failed", "error");
    } catch { notify("Delete failed", "error"); }
    setBusy(false);
  };

  return React.createElement(Modal, {
    open: true,
    onClose: onClose,
    title: label || asset.filename || "Preview",
    width: 720,
  },
    React.createElement("div", { className: "media-preview-body" },
      isVideo
        ? React.createElement("video", { src: url, controls: true, className: "media-preview-media" })
        : isPdf
          ? React.createElement("iframe", { src: url, title: label, className: "media-preview-pdf" })
          : React.createElement("img", { src: url, alt: altText || label, className: "media-preview-media" }),
      React.createElement("div", { className: "media-preview-meta" },
        React.createElement("div", { className: "media-preview-row" },
          React.createElement("label", null, "Label"),
          React.createElement("input", { value: label, onChange: e => setLabel(e.target.value) })
        ),
        React.createElement("div", { className: "media-preview-row" },
          React.createElement("label", null, "Alt text"),
          React.createElement("input", { value: altText, onChange: e => setAltText(e.target.value), placeholder: "Describe image for accessibility" })
        ),
        React.createElement("div", { className: "media-preview-kv" },
          React.createElement("span", null, mediaFormatBytes(asset.size)),
          React.createElement("span", null, asset.mime_type || asset.asset_type || "file"),
          React.createElement("span", null, mediaFolderLabel(mediaFolderKey(asset)) || "Library")
        ),
        usageTags.length > 0
          ? React.createElement("div", { className: "media-usage-tags" },
              usageTags.map((t, i) => React.createElement("span", {
                key: i,
                className: "media-usage-tag" + ((asset.live_labels || []).includes(t) ? " is-live" : ""),
              }, t))
            )
          : React.createElement("div", { className: "media-usage-empty" }, "Not linked to a live page yet"),
        React.createElement("code", { className: "media-preview-url" }, url)
      ),
      React.createElement("div", { className: "media-preview-actions" },
        React.createElement(Btn, { variant: "secondary", size: "sm", icon: "copy", onClick: () => copyUrl(url) }, "Copy URL"),
        React.createElement(Btn, {
          variant: "secondary",
          size: "sm",
          icon: "download",
          onClick: () => downloadMediaAsset(url, label || asset.filename || "asset", notify),
        }, "Download"),
        React.createElement("a", { href: url, target: "_blank", rel: "noopener noreferrer", className: "media-preview-open" }, "Open"),
        React.createElement("div", { style: { flex: 1 } }),
        React.createElement(Btn, { variant: "danger", size: "sm", icon: "trash", disabled: busy, onClick: del }, "Delete"),
        React.createElement(Btn, { size: "sm", disabled: busy, onClick: save }, busy ? "Saving…" : "Save")
      )
    )
  );
}

function CmsImagesView({ onNavigate }) {
  const [tab, setTab] = React.useState("library");
  const [assets, setAssets] = React.useState([]);
  const [stats, setStats] = React.useState(null);
  const [assetsLoading, setAssetsLoading] = React.useState(true);
  const [libraryFolder, setLibraryFolder] = React.useState("all");
  const [notice, setNotice] = React.useState({});
  const notify = (t, type) => cmsNotify(setNotice, t, type);

  const loadAssets = async () => {
    setAssetsLoading(true);
    try {
      // Keep usage tags current (animals/campaigns → cms_asset_usages)
      await fetch("/api/cms/assets/rebuild-usages", { method: "POST", credentials: "include" }).catch(() => {});
      const [res, statsRes] = await Promise.all([
        fetch("/api/cms/assets", { credentials: "include" }),
        fetch("/api/cms/assets/stats", { credentials: "include" }),
      ]);
      const d = await res.json();
      const s = await statsRes.json();
      if (d.success) setAssets(mediaDedupeAssets(d.assets || []));
      if (s.success) setStats(s);
    } catch {}
    setAssetsLoading(false);
  };
  React.useEffect(() => { loadAssets(); }, []);

  const copyUrl = (url) => navigator.clipboard.writeText(url || "").then(() => notify("URL copied"));

  const tabStyle = (t) => ({
    padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer",
    fontSize: 13, fontWeight: 600, fontFamily: "var(--font-ui)",
    background: tab === t ? C.purple : "transparent",
    color: tab === t ? "#fff" : C.textSec,
  });

  return React.createElement(CmsPageWrapper, { className: "media-workspace" },
    React.createElement(CmsNotice, { n: notice }),
    React.createElement(MediaStorageMeter, { stats: stats }),
    React.createElement("div", { className: "media-toolbar" },
      React.createElement("div", { className: "media-tabs dash-hscroll" },
        React.createElement("button", { type: "button", style: tabStyle("library"), onClick: () => setTab("library") }, "Library"),
        React.createElement("button", { type: "button", style: tabStyle("drive"), onClick: () => setTab("drive") }, "Google Drive"),
        React.createElement("button", { type: "button", style: tabStyle("cleanup"), onClick: () => setTab("cleanup") }, "Cleanup")
      ),
      React.createElement("label", {
        className: "media-upload-btn",
        title: mediaUploadFolder(libraryFolder)
          ? `Upload to ${libraryFolder}/`
          : "Upload to static/cms/uploads/",
      },
        React.createElement(Icon, { name: "upload", size: 14 }),
        mediaUploadFolder(libraryFolder) ? `Upload to ${mediaFolderLabel(libraryFolder)}` : "Upload",
        React.createElement("input", {
          type: "file",
          accept: "image/*,video/mp4,video/webm,video/quicktime,application/pdf",
          multiple: true,
          style: { display: "none" },
          onChange: async e => {
            const files = Array.from(e.target.files || []);
            if (!files.length) return;
            const uploadFolder = mediaUploadFolder(libraryFolder);
            let ok = 0;
            for (const file of files) {
              const fd = new FormData();
              fd.append("file", file);
              fd.append("usage_context", uploadFolder ? uploadFolder.replace("media/", "") : "cms");
              if (uploadFolder) fd.append("r2_folder", uploadFolder);
              try {
                const res = await fetch("/api/cms/asset/upload", { method: "POST", credentials: "include", body: fd });
                const d = await res.json();
                if (d.success) ok += 1;
                else notify(`Failed: ${file.name}`, "error");
              } catch { notify(`Error: ${file.name}`, "error"); }
            }
            if (ok > 0) { notify(`${ok} file${ok > 1 ? "s" : ""} uploaded`); loadAssets(); setTab("library"); }
            e.target.value = "";
          },
        })
      )
    ),
    tab === "library" && React.createElement(ImagesLibraryTab, {
      assets,
      loading: assetsLoading,
      onReload: loadAssets,
      copyUrl,
      notify,
      folder: libraryFolder,
      onFolderChange: setLibraryFolder,
    }),
    tab === "drive" && React.createElement(ImagesDriveTab, { onImported: () => { loadAssets(); setTab("library"); }, notify }),
    tab === "cleanup" && React.createElement(ImagesCleanupTab, { assets, stats, loading: assetsLoading, onReload: loadAssets, notify }),
  );
}

function ImagesLibraryTab({ assets, loading, onReload, copyUrl, notify, folder, onFolderChange }) {
  const [search, setSearch] = React.useState("");
  const [viewMode, setViewMode] = React.useState("grid");
  const [preview, setPreview] = React.useState(null);

  const folderCounts = React.useMemo(() => {
    const counts = { all: assets.length };
    for (const a of assets) {
      const k = mediaFolderKey(a);
      if (!k) continue;
      counts[k] = (counts[k] || 0) + 1;
    }
    return counts;
  }, [assets]);

  const filtered = assets.filter(a => {
    const inFolder = folder === "all" || mediaFolderKey(a) === folder;
    const q = search.trim().toLowerCase();
    const matchQ = !q || [a.label, a.filename, a.alt_text, a.r2_key, a.usage_context].some(v => String(v || "").toLowerCase().includes(q));
    return inFolder && matchQ;
  });

  const folders = MEDIA_FOLDERS.filter(f => {
    if (f.id === "all") return true;
    if (f.group === "media") return true;
    return (folderCounts[f.id] || 0) > 0;
  });

  return React.createElement("div", { className: "media-library-layout" },
    React.createElement("aside", { className: "media-folder-rail" },
      folders.map(f => React.createElement("button", {
        key: f.id,
        type: "button",
        className: "media-folder-btn" + (folder === f.id ? " is-active" : ""),
        onClick: () => onFolderChange(f.id),
      },
        React.createElement(Icon, { name: f.icon, size: 16 }),
        React.createElement("span", { className: "media-folder-label", title: f.path || f.label }, f.label),
        React.createElement("span", { className: "media-folder-count" }, folderCounts[f.id] || 0)
      ))
    ),
    React.createElement("div", { className: "media-library-main" },
      React.createElement("div", { className: "media-library-toolbar" },
        React.createElement(Input, { value: search, onChange: setSearch, placeholder: "Search media…", icon: "search", style: { flex: "1 1 180px", maxWidth: 280 } }),
        React.createElement("div", { className: "media-view-toggle" },
          [["grid", "image"], ["list", "docs"]].map(([m, icon]) => React.createElement("button", {
            key: m, type: "button", className: viewMode === m ? "is-active" : "", onClick: () => setViewMode(m),
          }, React.createElement(Icon, { name: icon, size: 14 })))
        )
      ),
      loading
        ? React.createElement("div", { className: "media-empty-msg" }, "Loading…")
        : filtered.length === 0
          ? React.createElement(EmptyState, { message: "No media in this folder", icon: "folder" })
          : viewMode === "grid"
            ? React.createElement("div", { className: "media-grid" },
                filtered.map(a => {
                  const tags = mediaUsageTags(a);
                  return React.createElement("div", {
                    key: a.id, className: "media-card",
                  },
                    React.createElement("button", {
                      type: "button",
                      className: "media-card-main",
                      onClick: () => setPreview(a),
                    },
                      React.createElement("div", { className: "media-card-thumb" },
                        React.createElement(MediaThumbPreview, { asset: a }),
                        mediaAssetKind(a) === "pdf" && React.createElement("span", { className: "media-card-badge pdf" }, "PDF"),
                        mediaAssetKind(a) === "video" && React.createElement("span", { className: "media-card-badge video" }, "Video"),
                        a.source_provider === "google_drive" && React.createElement("span", { className: "media-card-badge drive" }, "Drive"),
                        a.is_live_usage && React.createElement("span", { className: "media-card-badge live" }, "Live")
                      ),
                      React.createElement("div", { className: "media-card-meta" },
                        React.createElement("strong", null, a.label || a.filename),
                        React.createElement("span", null, mediaSizeLabel(a)),
                        tags.length > 0 && React.createElement("div", { className: "media-usage-tags compact" },
                          tags.map((t, i) => React.createElement("span", {
                            key: i,
                            className: "media-usage-tag" + (a.is_live_usage ? " is-live" : ""),
                          }, t))
                        )
                      )
                    ),
                    React.createElement("button", {
                      type: "button",
                      className: "media-card-download",
                      title: "Download",
                      onClick: (e) => {
                        e.stopPropagation();
                        downloadMediaAsset(mediaAssetUrl(a), a.label || a.filename || "asset", notify);
                      },
                    }, React.createElement(Icon, { name: "download", size: 14 }), " Download")
                  );
                })
              )
            : React.createElement(Card, { style: { overflow: "hidden" } },
                React.createElement(Table, {
                  cols: [
                    { key: "filename", label: "File", render: (v, row) => React.createElement("button", {
                      type: "button", className: "media-list-name", onClick: () => setPreview(row),
                    },
                      React.createElement("span", { className: "media-list-thumb" },
                        React.createElement(MediaThumbPreview, { asset: row, compact: true })
                      ),
                      React.createElement("span", null, row.label || v)
                    ) },
                    { key: "size", label: "Size", render: (v, row) => mediaSizeLabel(row) },
                    { key: "r2_key", label: "Folder", render: (v, row) => mediaFolderLabel(mediaFolderKey(row)) },
                    { key: "cdn_url", label: "", render: (v, row) => React.createElement(Btn, { variant: "ghost", size: "sm", onClick: () => setPreview(row) }, "Open") },
                  ],
                  rows: filtered,
                  emptyMsg: "No media",
                })
              )
    ),
    preview && React.createElement(MediaPreviewModal, {
      asset: preview,
      onClose: () => setPreview(null),
      onSave: onReload,
      onDelete: onReload,
      copyUrl,
      notify,
    })
  );
}

// ── Tab: Upload ──────────────────────────────────────────────────────────────
function ImagesUploadTab({ onUploaded, notify }) {
  const [uploading, setUploading] = React.useState(false);
  const [queue, setQueue]         = React.useState([]);
  const [altInputs, setAltInputs] = React.useState({});
  const fileInputRef = React.useRef(null);

  const addFiles = (fileList) => {
    const newFiles = Array.from(fileList || []).map(f => ({ file: f, id: `${f.name}-${Date.now()}` }));
    setQueue(q => [...q, ...newFiles]);
  };

  const removeFromQueue = (id) => setQueue(q => q.filter(f => f.id !== id));

  const doUpload = async () => {
    if (!queue.length) return;
    setUploading(true);
    let ok = 0;
    for (const { file, id } of queue) {
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("alt_text", altInputs[id] || "");
        fd.append("usage_context", "cms");
        const res = await fetch("/api/cms/asset/upload", { method: "POST", credentials: "include", body: fd });
        const d   = await res.json();
        if (d.success) ok++;
        else notify(`Failed: ${file.name} — ${d.error || "unknown error"}`, "error");
      } catch { notify(`Error uploading ${file.name}`, "error"); }
    }
    setUploading(false);
    if (ok > 0) {
      notify(`${ok} image${ok > 1 ? "s" : ""} uploaded`);
      setQueue([]);
      setAltInputs({});
      onUploaded();
    }
  };

  return React.createElement("div", null,
    // Drop zone
    React.createElement("div", {
      onDragOver: e => { e.preventDefault(); e.currentTarget.style.borderColor = C.purple; },
      onDragLeave: e => { e.currentTarget.style.borderColor = C.border; },
      onDrop: e => { e.preventDefault(); e.currentTarget.style.borderColor = C.border; addFiles(e.dataTransfer.files); },
      onClick: () => fileInputRef.current?.click(),
      style: { border: `2px dashed ${C.border}`, borderRadius: 12, padding: 36, textAlign: "center", marginBottom: 20, color: C.textMut, fontSize: 13, cursor: "pointer", transition: "border-color .15s" }
    },
      React.createElement(Icon, { name: "image", size: 28, style: { opacity: .35, display: "block", margin: "0 auto 10px" } }),
      React.createElement("div", { style: { fontWeight: 600, color: C.text, marginBottom: 4 } }, "Drag images here or click to browse"),
      React.createElement("div", { style: { fontSize: 12 } }, `JPG, PNG, WebP, GIF, SVG, AVIF · Max 10 MB · Saves to ${cmsCdnBase() ? cmsCdnBase().replace(/^https?:\/\//, "") : "your media library"}`),
      React.createElement("input", { ref: fileInputRef, type: "file", accept: "image/*", multiple: true, style: { display: "none" }, onChange: e => addFiles(e.target.files) })
    ),
    // Queue
    queue.length > 0 && React.createElement("div", { style: { marginBottom: 16 } },
      React.createElement("div", { style: { fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 10 } }, `${queue.length} file${queue.length > 1 ? "s" : ""} ready to upload`),
      React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8 } },
        queue.map(({ file, id }) => React.createElement("div", { key: id, style: { display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 } },
          React.createElement("div", { style: { width: 48, height: 48, borderRadius: 8, overflow: "hidden", background: C.bg2, flexShrink: 0 } },
            React.createElement("img", { src: URL.createObjectURL(file), style: { width: "100%", height: "100%", objectFit: "cover" } })
          ),
          React.createElement("div", { style: { flex: 1, minWidth: 0 } },
            React.createElement("div", { style: { fontSize: 13, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, file.name),
            React.createElement("div", { style: { fontSize: 11, color: C.textMut, marginTop: 2 } }, `${(file.size / 1024).toFixed(0)} KB · ${file.type}`),
            React.createElement("input", {
              placeholder: "Alt text (recommended)…",
              value: altInputs[id] || "",
              onChange: e => setAltInputs(prev => ({ ...prev, [id]: e.target.value })),
              style: { marginTop: 6, width: "100%", padding: "5px 8px", fontSize: 12, border: `1px solid ${C.border}`, borderRadius: 6, background: C.bg, color: C.text, outline: "none", boxSizing: "border-box" }
            })
          ),
          React.createElement("button", { onClick: () => removeFromQueue(id), style: { padding: "6px", borderRadius: 6, border: "none", background: "transparent", color: C.textMut, cursor: "pointer", fontSize: 16, lineHeight: 1 } }, "×")
        ))
      ),
      React.createElement("button", {
        onClick: doUpload, disabled: uploading,
        style: { marginTop: 12, padding: "10px 24px", borderRadius: 8, border: "none", background: C.purple, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-ui)", display: "inline-flex", alignItems: "center", gap: 8 }
      },
        React.createElement(Icon, { name: "plus", size: 14 }),
        uploading ? "Uploading…" : `Upload ${queue.length} file${queue.length > 1 ? "s" : ""}`
      )
    )
  );
}

// ── Tab: Google Drive ─────────────────────────────────────────────────────────
function ImagesDriveTab({ onImported, notify }) {
  const [status, setStatus]       = React.useState(null);   // null = loading
  const [files, setFiles]         = React.useState([]);
  const [filesLoading, setFilesLoading] = React.useState(false);
  const [search, setSearch]       = React.useState("");
  const [selected, setSelected]   = React.useState(new Set());
  const [importing, setImporting] = React.useState(false);
  const [nextPageToken, setNextPageToken] = React.useState(null);
  const [disconnecting, setDisconnecting] = React.useState(false);

  const loadStatus = async () => {
    try {
      const res = await fetch("/api/integrations/google-drive/status", { credentials: "include" });
      const d   = await res.json();
      setStatus(d);
    } catch { setStatus({ connected: false }); }
  };

  const loadFiles = async (reset = false) => {
    setFilesLoading(true);
    const params = new URLSearchParams({ pageSize: "30" });
    if (search) params.set("q", search);
    if (!reset && nextPageToken) params.set("pageToken", nextPageToken);
    try {
      const res = await fetch(`/api/integrations/google-drive/files?${params}`, { credentials: "include" });
      const d   = await res.json();
      if (d.ok) {
        setFiles(reset ? d.files : prev => [...prev, ...d.files]);
        setNextPageToken(d.nextPageToken || null);
      } else {
        notify(d.error || "Could not load Drive files", "error");
      }
    } catch { notify("Failed to load Drive files", "error"); }
    setFilesLoading(false);
  };

  React.useEffect(() => { loadStatus(); }, []);
  React.useEffect(() => {
    if (status?.connected) { setFiles([]); setNextPageToken(null); loadFiles(true); }
  }, [status?.connected]);

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const doImport = async () => {
    if (!selected.size) return;
    setImporting(true);
    try {
      const res = await fetch("/api/integrations/google-drive/import", {
        method: "POST", credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fileIds: Array.from(selected) }),
      });
      const d = await res.json();
      if (d.imported > 0) {
        notify(`${d.imported} image${d.imported > 1 ? "s" : ""} imported to R2`);
        setSelected(new Set());
        onImported();
      }
      if (d.errors?.length) notify(`${d.errors.length} file(s) failed to import`, "error");
    } catch { notify("Import failed", "error"); }
    setImporting(false);
  };

  const doDisconnect = async () => {
    if (!confirm("Disconnect Google Drive? Imported R2 assets will not be deleted.")) return;
    setDisconnecting(true);
    try {
      await fetch("/api/integrations/google-drive/disconnect", { method: "POST", credentials: "include" });
      notify("Google Drive disconnected");
      setStatus({ connected: false });
      setFiles([]);
    } catch { notify("Disconnect failed", "error"); }
    setDisconnecting(false);
  };

  // Not connected state
  if (status === null) {
    return React.createElement("div", { style: { color: C.textSec, fontSize: 13, padding: 20 } }, "Checking Google Drive connection…");
  }

  if (!status.connected) {
    return React.createElement(Card, { style: { maxWidth: 480 } },
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 16 } },
        React.createElement("div", { style: { width: 44, height: 44, borderRadius: 10, background: "#1a73e8", display: "flex", alignItems: "center", justifyContent: "center" } },
          React.createElement(Icon, { name: "link", size: 22, style: { color: "#fff" } })
        ),
        React.createElement("div", null,
          React.createElement("div", { style: { fontWeight: 700, fontSize: 15, color: C.text } }, "Connect Google Drive"),
          React.createElement("div", { style: { fontSize: 12, color: C.textMut, marginTop: 2 } }, "Import images directly into the R2 media library")
        )
      ),
      React.createElement("div", { style: { fontSize: 13, color: C.textSec, marginBottom: 20, lineHeight: 1.6 } },
        "Connect your Google Drive account to browse and import images. ",
        React.createElement("strong", null, "Imported images are copied to R2"), " — the website uses R2 URLs, not Drive URLs, so images remain available if Drive is later disconnected."
      ),
      React.createElement("div", { style: { fontSize: 12, color: C.textMut, marginBottom: 16, padding: "8px 12px", background: C.bg2, borderRadius: 8 } },
        "Requested scope: ", React.createElement("code", null, "drive.readonly"), " — browse existing org Drive and Shared drives (read-only)."
      ),
      React.createElement("a", {
        href: "/api/integrations/google-drive/connect",
        style: { display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 22px", borderRadius: 8, background: "#1a73e8", color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none" }
      },
        React.createElement(Icon, { name: "link", size: 14 }), "Connect Google Drive"
      )
    );
  }

  // Connected state
  return React.createElement("div", null,
    // Connected banner
    React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 20, padding: "12px 16px", background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 10 } },
      React.createElement("div", { style: { width: 8, height: 8, borderRadius: "50%", background: "#22c55e", flexShrink: 0 } }),
      React.createElement("div", { style: { flex: 1 } },
        React.createElement("div", { style: { fontSize: 13, fontWeight: 600, color: C.text } }, "Google Drive connected"),
        status.account_email && React.createElement("div", { style: { fontSize: 12, color: C.textMut } }, status.account_email)
      ),
      React.createElement("button", { onClick: doDisconnect, disabled: disconnecting, style: { padding: "6px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.textSec, fontSize: 12, cursor: "pointer" } },
        disconnecting ? "Disconnecting…" : "Disconnect"
      )
    ),
    // Search + Browse toolbar
    React.createElement("div", { style: { display: "flex", gap: 8, marginBottom: 16, alignItems: "center" } },
      React.createElement(Input, { value: search, onChange: setSearch, placeholder: "Search Drive files…", icon: "search", style: { width: 240 }, onKeyDown: e => e.key === "Enter" && loadFiles(true) }),
      React.createElement("button", { onClick: () => loadFiles(true), style: { padding: "8px 16px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.textSec, fontSize: 13, cursor: "pointer" } }, "Refresh"),
      selected.size > 0 && React.createElement("button", {
        onClick: doImport, disabled: importing,
        style: { marginLeft: "auto", padding: "8px 20px", borderRadius: 8, border: "none", background: C.purple, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }
      },
        React.createElement(Icon, { name: "plus", size: 14 }),
        importing ? "Importing…" : `Import ${selected.size} to R2`
      )
    ),
    // Drive file grid
    filesLoading && files.length === 0
      ? React.createElement("div", { style: { color: C.textSec, fontSize: 13, padding: 20 } }, "Loading Drive files…")
      : files.length === 0
        ? React.createElement(EmptyState, { message: "No image files found in Drive", icon: "image" })
        : React.createElement("div", null,
            React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10, marginBottom: 16 } },
              files.map(f => React.createElement("div", {
                key: f.id,
                onClick: () => toggleSelect(f.id),
                style: { background: C.surface, border: `2px solid ${selected.has(f.id) ? C.purple : C.border}`, borderRadius: 10, overflow: "hidden", cursor: "pointer", transition: "border-color .15s", position: "relative" }
              },
                selected.has(f.id) && React.createElement("div", {
                  style: { position: "absolute", top: 6, right: 6, width: 20, height: 20, borderRadius: "50%", background: C.purple, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }
                }, React.createElement("span", { style: { color: "#fff", fontSize: 12, lineHeight: 1 } }, "✓")),
                React.createElement("div", { style: { height: 120, background: C.bg2, overflow: "hidden" } },
                  f.thumbnailLink
                    ? React.createElement("img", { src: f.thumbnailLink, alt: f.name, style: { width: "100%", height: "100%", objectFit: "cover" } })
                    : React.createElement("div", { style: { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" } },
                        React.createElement(Icon, { name: "image", size: 24, style: { opacity: .3 } })
                      )
                ),
                React.createElement("div", { style: { padding: "8px 10px" } },
                  React.createElement("div", { style: { fontSize: 11, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, f.name),
                  React.createElement("div", { style: { fontSize: 10, color: C.textMut, marginTop: 2 } }, f.size ? `${(f.size / 1024).toFixed(0)} KB` : f.mimeType?.split("/")[1])
                )
              ))
            ),
            nextPageToken && React.createElement("button", {
              onClick: () => loadFiles(false), disabled: filesLoading,
              style: { padding: "8px 16px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.textSec, fontSize: 12, cursor: "pointer" }
            }, filesLoading ? "Loading…" : "Load more")
          )
  );
}

// ── Tab: Usage / Cleanup ─────────────────────────────────────────────────────
function ImagesCleanupTab({ assets, stats, loading, onReload, notify }) {
  const driveImports = assets.filter(a => a.source_provider === "google_drive");
  const noAlt = assets.filter(a => !a.alt_text);
  const dupes = React.useMemo(() => {
    const groups = new Map();
    for (const a of assets) {
      const k = String(mediaAssetUrl(a) || a.r2_key || "").toLowerCase();
      if (!k) continue;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(a);
    }
    return Array.from(groups.values()).filter(g => g.length > 1);
  }, [assets]);

  const statCard = (label, count, color) =>
    React.createElement("div", { className: "media-stat-card" },
      React.createElement("div", { style: { fontSize: 28, fontWeight: 700, color } }, count),
      React.createElement("div", { style: { fontSize: 13, color: C.textSec, marginTop: 4 } }, label)
    );

  const deleteAsset = async (asset) => {
    if (!window.confirm(`Delete ${asset.label || asset.filename}?`)) return;
    try {
      const res = await fetch("/api/cms/asset/delete", {
        method: "POST", credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: asset.id }),
      });
      const d = await res.json();
      if (d.success) { notify("Deleted"); onReload(); }
      else notify(d.error || "Delete failed", "error");
    } catch { notify("Delete failed", "error"); }
  };

  return React.createElement("div", null,
    stats && React.createElement(MediaStorageMeter, { stats: stats }),
    React.createElement("div", { style: { display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 } },
      statCard("Tracked files", stats?.asset_count ?? assets.length, C.purple),
      statCard("Storage used", mediaFormatBytes(stats?.total_bytes), C.teal),
      statCard("Drive imports", driveImports.length, "#4285F4"),
      statCard("Missing alt", noAlt.length, noAlt.length > 0 ? "#f59e0b" : "#22c55e"),
      statCard("Duplicate groups", dupes.length, dupes.length ? C.red : C.green),
    ),
    dupes.length > 0 && React.createElement(Card, { style: { marginBottom: 16 } },
      React.createElement("div", { style: { fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 12 } }, "Possible duplicates"),
      React.createElement("div", { style: { fontSize: 12, color: C.textSec, marginBottom: 12 } }, "Same CDN URL tracked more than once. Library view already hides dupes; delete extras here."),
      dupes.slice(0, 10).map((group, i) => React.createElement("div", { key: i, style: { marginBottom: 12, padding: 12, border: `1px solid ${C.border}`, borderRadius: 10 } },
        group.map(a => React.createElement("div", { key: a.id, style: { display: "flex", alignItems: "center", gap: 10, marginTop: 6 } },
          React.createElement("img", { src: mediaAssetUrl(a), style: { width: 36, height: 36, objectFit: "cover", borderRadius: 6 }, onError: e => e.target.style.opacity = 0 }),
          React.createElement("span", { style: { flex: 1, fontSize: 12 } }, a.label || a.filename),
          React.createElement(Btn, { variant: "danger", size: "sm", onClick: () => deleteAsset(a) }, "Delete")
        ))
      ))
    ),
    noAlt.length > 0 && React.createElement(Card, { style: { marginBottom: 16 } },
      React.createElement("div", { style: { fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 12 } }, "Missing alt text"),
      React.createElement("div", { style: { fontSize: 12, color: C.textSec, marginBottom: 12 } }, "These images are missing alt text. Add descriptions in the R2 Library tab."),
      React.createElement(Table, {
        cols: [
          { key: "filename", label: "File", render: (v, row) => React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } }, React.createElement("img", { src: row.cdn_url || row.public_url, style: { width: 32, height: 32, objectFit: "cover", borderRadius: 4 }, onError: e => e.target.style.opacity = 0 }), v) },
          { key: "usage_context", label: "Context", render: v => React.createElement(Badge, { label: v || "general" }) },
        ],
        rows: noAlt.slice(0, 20),
        emptyMsg: "All images have alt text",
      })
    ),
    driveImports.length > 0 && React.createElement(Card, null,
      React.createElement("div", { style: { fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 12 } }, "Google Drive imports"),
      React.createElement("div", { style: { fontSize: 12, color: C.textSec, marginBottom: 12 } }, "These images were imported from Google Drive. They are stored in R2 and remain available even if Drive is disconnected."),
      React.createElement(Table, {
        cols: [
          { key: "filename", label: "File", render: (v, row) => React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } }, React.createElement("img", { src: row.cdn_url || row.public_url, style: { width: 32, height: 32, objectFit: "cover", borderRadius: 4 }, onError: e => e.target.style.opacity = 0 }), v) },
          { key: "source_file_id", label: "Drive ID", render: v => React.createElement("code", { style: { fontSize: 10 } }, v || "—") },
          { key: "imported_at", label: "Imported", render: v => React.createElement("span", { style: { fontSize: 12 } }, v ? v.slice(0, 10) : "—") },
        ],
        rows: driveImports,
        emptyMsg: "No Drive imports",
      })
    ),
    loading && React.createElement("div", { style: { color: C.textSec, fontSize: 13, padding: 20 } }, "Loading…")
  );
}


Object.assign(window, {
  mediaFormatBytes,
  mediaAssetUrl,
  mediaIsImageAsset,
  mediaPathPrefix,
  mediaFolderKey,
  mediaFolderLabel,
  mediaUploadFolder,
  mediaAssetKind,
  mediaSizeLabel,
  MediaThumbPreview,
  MEDIA_FOLDERS,
  mediaDedupeAssets,
  MediaStorageMeter,
  mediaUsageTags,
  downloadMediaAsset,
  MediaPreviewModal,
  CmsImagesView,
  ImagesLibraryTab,
  ImagesUploadTab,
  ImagesDriveTab,
  ImagesCleanupTab,
});
