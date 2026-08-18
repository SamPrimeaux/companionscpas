// CMS Brand + section-undo toast — /dashboard/cms/brand

// ── Brand tweaks helpers ──────────────────────────────────────────────────────
function BrandTweakSection({ title, subtitle, defaultOpen = true, children }) {
  const [open, setOpen] = React.useState(defaultOpen);
  return React.createElement("div", {
    style: { borderBottom: `1px solid ${C.border}`, paddingBottom: open ? 14 : 0, marginBottom: 14 },
  },
    React.createElement("button", {
      type: "button",
      onClick: () => setOpen(v => !v),
      style: {
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 8, padding: "0 0 10px", border: "none", background: "transparent",
        cursor: "pointer", fontFamily: "var(--font-ui)", textAlign: "left",
      },
    },
      React.createElement("div", null,
        React.createElement("div", { style: { fontSize: 12, fontWeight: 700, color: C.text, letterSpacing: "0.02em" } }, title),
        subtitle && React.createElement("div", { style: { fontSize: 11, color: C.textMut, marginTop: 2 } }, subtitle)
      ),
      React.createElement(Icon, { name: open ? "chevD" : "chevR", size: 14, style: { color: C.textMut, flexShrink: 0 } })
    ),
    open && React.createElement("div", { style: { display: "grid", gap: 10 } }, children)
  );
}

function BrandLogoDropZone({ label, hint, value, onChange, dropBg, uploading, onUploadFile }) {
  const [dragOver, setDragOver] = React.useState(false);
  const inputRef = React.useRef(null);

  const handleFiles = async (files) => {
    const file = files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    await onUploadFile(file);
  };

  return React.createElement("div", null,
    React.createElement("label", { style: { display: "block", fontSize: 11, fontWeight: 700, color: C.textSec, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" } }, label),
    React.createElement("div", {
      onDragEnter: e => { e.preventDefault(); setDragOver(true); },
      onDragOver: e => { e.preventDefault(); setDragOver(true); },
      onDragLeave: e => { e.preventDefault(); setDragOver(false); },
      onDrop: async e => {
        e.preventDefault();
        setDragOver(false);
        await handleFiles(e.dataTransfer?.files);
      },
      onClick: () => inputRef.current?.click(),
      style: {
        border: `2px dashed ${dragOver ? C.purple : C.border}`,
        borderRadius: 10,
        padding: 12,
        background: dragOver ? C.purpleDim : C.bg2,
        cursor: uploading ? "wait" : "pointer",
        transition: "border-color .15s, background .15s",
      },
    },
      React.createElement("input", {
        ref: inputRef,
        type: "file",
        accept: "image/*",
        style: { display: "none" },
        onChange: async e => { await handleFiles(e.target.files); e.target.value = ""; },
      }),
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12 } },
        React.createElement("div", {
          style: {
            width: 56, height: 44, borderRadius: 8, flexShrink: 0,
            background: dropBg, border: `1px solid ${C.border}`,
            display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
          },
        },
          value
            ? React.createElement("img", { src: value, alt: "", style: { maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }, onError: e => { e.target.style.display = "none"; } })
            : React.createElement(Icon, { name: "image", size: 18, style: { color: C.textMut } })
        ),
        React.createElement("div", { style: { flex: 1, minWidth: 0 } },
          React.createElement("div", { style: { fontSize: 12, fontWeight: 600, color: C.text } }, uploading ? "Uploading..." : "Drop image or click to replace"),
          React.createElement("div", { style: { fontSize: 11, color: C.textMut, marginTop: 2 } }, hint)
        )
      ),
      value && React.createElement("input", {
        value,
        onClick: e => e.stopPropagation(),
        onChange: e => onChange(e.target.value),
        style: {
          width: "100%", marginTop: 10, padding: "7px 10px", border: `1px solid ${C.border}`,
          borderRadius: 8, background: C.surface, color: C.text, fontSize: 11,
          fontFamily: "var(--font-mono)", boxSizing: "border-box",
        },
      })
    )
  );
}

function BrandThemeSwatches({ brand, previewTheme }) {
  const isDark = previewTheme === "dark";
  const primary = brand.primary_color || "#7c3aed";
  const accent = brand.accent_color || "#ee2336";
  const logoUrl = isDark
    ? (brand.logo_light_url || brand.logo_dark_url || "")
    : (brand.logo_dark_url || brand.logo_light_url || "");
  const logoW = Math.max(40, Math.min(88, Number(brand.logo_width) || 88));
  const headerBg = isDark ? "#111827" : "#ffffff";
  const textColor = isDark ? "#f0ece6" : "#1a1a1a";
  const mutedColor = isDark ? "rgba(255,255,255,0.62)" : "#6b7280";

  return React.createElement("div", {
    style: {
      borderRadius: 16, overflow: "hidden", border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : C.border}`,
      background: isDark ? "#0b0f1a" : "#f5f0eb", boxShadow: "0 18px 48px rgba(15,23,42,0.08)",
    },
  },
    React.createElement("div", {
      style: {
        background: headerBg, color: textColor, borderBottom: `3px solid ${primary}`,
        padding: "0 18px", height: 88, display: "flex", alignItems: "center",
      },
    },
      logoUrl
        ? React.createElement("img", {
            src: logoUrl, alt: brand.brand_name || "Logo",
            style: { height: logoW, width: "auto", maxHeight: 88, objectFit: "contain", display: "block" },
          })
        : React.createElement("div", { style: { fontWeight: 800, fontSize: 15, color: primary } }, brand.brand_name || "Brand")
    ),
    React.createElement("div", { style: { padding: "18px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 } },
      [
        { label: "Primary", color: primary },
        { label: "Accent", color: accent },
        { label: "Header", color: headerBg, border: true },
      ].map((sw) => React.createElement("div", {
        key: sw.label,
        style: { borderRadius: 10, overflow: "hidden", border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : C.border}` },
      },
        React.createElement("div", { style: { height: 44, background: sw.color, borderBottom: sw.border ? `1px solid ${C.border}` : "none" } }),
        React.createElement("div", { style: { padding: "8px 10px", background: isDark ? "#111827" : "#fff", fontSize: 11, color: mutedColor } },
          sw.label,
          React.createElement("div", { style: { fontFamily: "var(--font-mono)", fontSize: 10, marginTop: 2, color: textColor } }, sw.border ? (isDark ? "Dark" : "Light") : sw.color)
        )
      ))
    )
  );
}

// ── /dashboard/cms/brand ──────────────────────────────────────────────────────
function CmsBrandView({ onNavigate }) {
  const [brand, setBrand] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [uploadingLogo, setUploadingLogo] = React.useState(null);
  const [previewTheme, setPreviewTheme] = React.useState("dark");
  const [notice, setNotice] = React.useState({});
  const notify = (t, type) => cmsNotify(setNotice, t, type);

  React.useEffect(() => {
    fetch("/api/cms/brand", { credentials: "include" }).then(r => r.json()).then(d => {
      if (d.brand) {
        setBrand({
          ...d.brand,
          logo_width: Math.max(40, Math.min(88, Number(d.brand.logo_width) || 88)),
          logo_height: Number(d.brand.logo_height) || 0,
        });
      }
    }).catch(() => {});
  }, []);

  const uploadLogo = async (file, targetKey) => {
    setUploadingLogo(targetKey);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("usage_context", "brand");
      fd.append("label", `Brand ${targetKey}`);
      const res = await fetch("/api/cms/asset/upload", { method: "POST", credentials: "include", body: fd });
      const d = await res.json();
      const url = d.public_url || d.cdn_url || d.url;
      if (!d.success || !url) {
        notify(d.error || "Upload failed", "error");
        return;
      }
      setBrand(p => ({ ...p, [targetKey]: url }));
      notify("Logo uploaded");
    } catch (e) {
      notify("Upload failed: " + e.message, "error");
    }
    setUploadingLogo(null);
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/cms/brand/save", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          brand: {
            ...brand,
            logo_width: Math.max(40, Math.min(88, Number(brand.logo_width) || 88)),
            logo_height: null,
          },
        }),
      });
      const d = await res.json();
      notify(d.success ? (d.message || "Brand settings saved") : (d.error || "Save failed"), d.success ? "ok" : "error");
    } catch (e) { notify("Save failed: " + e.message, "error"); }
    setSaving(false);
  };

  const fStyle = {
    width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 8,
    background: C.surface, color: C.text, fontSize: 13, outline: "none",
    boxSizing: "border-box", fontFamily: "var(--font-ui)",
  };
  const lStyle = {
    display: "block", fontSize: 10, fontWeight: 700, color: C.textSec,
    marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em",
  };
  const tweakInput = (label, value, onChange, opts = {}) => React.createElement("div", { key: label },
    React.createElement("label", { style: lStyle }, label),
    React.createElement("input", {
      type: opts.type || "text",
      value: value || "",
      placeholder: opts.placeholder || "",
      readOnly: opts.readOnly,
      onChange: e => onChange(e.target.value),
      style: { ...fStyle, ...(opts.readOnly ? { background: C.bg2, color: C.textMut, cursor: "default" } : {}), ...(opts.mono ? { fontFamily: "var(--font-mono)", fontSize: 11 } : {}) },
    })
  );

  const setColor = (key, value) => setBrand(p => ({ ...p, [key]: value }));

  if (!brand) {
    return React.createElement(CmsPageWrapper, null,
      React.createElement("div", { style: { color: C.textSec, fontSize: 13, padding: 20 } }, "Loading brand settings...")
    );
  }

  return React.createElement(CmsPageWrapper, { padding: "20px 22px 48px" },
    React.createElement(CmsNotice, { n: notice }),
    React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "minmax(0, 1.5fr) minmax(320px, 1fr)",
        gap: 18,
        alignItems: "start",
        background: "#f5f0eb",
        borderRadius: 16,
        padding: 16,
        minHeight: "calc(100vh - 120px)",
      },
    },
      React.createElement("div", { style: { minWidth: 0 } },
        React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 12 } },
          React.createElement("div", null,
            React.createElement("h2", { style: { margin: 0, fontSize: 18, fontWeight: 800, color: C.text } }, "Brand & Settings"),
            React.createElement("p", { style: { margin: "4px 0 0", fontSize: 12, color: C.textSec } }, "Colors and logos. Footer copy, socials, and trust badges: edit Footer on any page in Pages.")
          ),
          React.createElement("div", { style: { display: "flex", gap: 6, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 4 } },
            ["dark", "light"].map(theme => React.createElement("button", {
              key: theme,
              type: "button",
              onClick: () => setPreviewTheme(theme),
              style: {
                padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                fontSize: 12, fontWeight: 600, fontFamily: "var(--font-ui)",
                background: previewTheme === theme ? C.purple : "transparent",
                color: previewTheme === theme ? "#fff" : C.textSec,
              },
            }, theme === "dark" ? "Dark preview" : "Light preview"))
          )
        ),
        React.createElement(BrandThemeSwatches, { brand, previewTheme }),
        React.createElement("div", {
          style: {
            marginTop: 14, padding: "12px 14px", borderRadius: 12, fontSize: 12, lineHeight: 1.5,
            background: "rgba(124,58,237,0.08)", border: `1px solid ${C.purple}44`, color: C.textSec,
          },
        },
          "Footer mission, EIN, social links, and Candid/trust badges are edited in ",
          React.createElement("strong", null, "Pages → Footer"),
          " (sitewide). Navigation labels/placement are edited per page under Header."
        )
      ),

      React.createElement("div", {
        style: {
          position: "sticky", top: 16, maxHeight: "calc(100vh - 96px)", overflowY: "auto",
          background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14,
          padding: "14px 14px 8px", boxShadow: "0 8px 24px rgba(15,23,42,0.06)",
        },
      },
        React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${C.border}` } },
          React.createElement("div", null,
            React.createElement("div", { style: { fontSize: 13, fontWeight: 800, color: C.text } }, "Tweaks"),
            React.createElement("div", { style: { fontSize: 11, color: C.textMut, marginTop: 2 } }, "Theme identity only")
          ),
          React.createElement(Btn, { size: "sm", icon: saving ? undefined : "check2", onClick: save, disabled: saving }, saving ? "Saving..." : "Save Changes")
        ),

        React.createElement(BrandTweakSection, { title: "Identity", defaultOpen: true },
          tweakInput("Brand Name", brand.brand_name, v => setBrand(p => ({ ...p, brand_name: v })), { placeholder: "Companions of CPAS" }),
          tweakInput("Site Domain", brand.site_domain, () => {}, { readOnly: true, mono: true })
        ),

        React.createElement(BrandTweakSection, { title: "Colors", defaultOpen: true },
          ["primary_color", "accent_color"].map(key => {
            const label = key === "primary_color" ? "Primary Color" : "Accent Color";
            const val = brand[key] || (key === "primary_color" ? "#7c3aed" : "#ee2336");
            return React.createElement("div", { key },
              React.createElement("label", { style: lStyle }, label),
              React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } },
                React.createElement("input", {
                  type: "color", value: val,
                  onChange: e => setColor(key, e.target.value),
                  style: { width: 42, height: 34, padding: 2, border: `1px solid ${C.border}`, borderRadius: 8, cursor: "pointer", background: C.surface },
                }),
                React.createElement("input", {
                  value: val,
                  onChange: e => setColor(key, e.target.value),
                  style: { ...fStyle, flex: 1, fontFamily: "var(--font-mono)", fontSize: 11 },
                })
              )
            );
          })
        ),

        React.createElement(BrandTweakSection, { title: "Logos", subtitle: "Drag and drop or click to upload", defaultOpen: true },
          React.createElement(BrandLogoDropZone, {
            label: "Logo Light",
            hint: "Used on dark backgrounds",
            value: brand.logo_light_url || "",
            dropBg: "#111827",
            uploading: uploadingLogo === "logo_light_url",
            onChange: v => setBrand(p => ({ ...p, logo_light_url: v })),
            onUploadFile: file => uploadLogo(file, "logo_light_url"),
          }),
          React.createElement(BrandLogoDropZone, {
            label: "Logo Dark",
            hint: "Used on light backgrounds",
            value: brand.logo_dark_url || "",
            dropBg: "#f5f0eb",
            uploading: uploadingLogo === "logo_dark_url",
            onChange: v => setBrand(p => ({ ...p, logo_dark_url: v })),
            onUploadFile: file => uploadLogo(file, "logo_dark_url"),
          }),
          React.createElement("div", null,
            React.createElement("label", { style: lStyle }, `Header logo height (${Math.max(40, Math.min(88, Number(brand.logo_width) || 88))}px)`),
            React.createElement("input", {
              type: "range", min: 40, max: 88, step: 2,
              value: Math.max(40, Math.min(88, Number(brand.logo_width) || 88)),
              onChange: e => setBrand(p => ({ ...p, logo_width: Number(e.target.value) })),
              style: { width: "100%", accentColor: C.purple },
            }),
            React.createElement("div", { style: { display: "flex", justifyContent: "space-between", fontSize: 10, color: C.textMut, marginTop: 2 } },
              React.createElement("span", null, "40px"),
              React.createElement("span", null, "88px = full header height")
            ),
            React.createElement("p", { style: { fontSize: 11, color: C.textMut, margin: "6px 0 0", lineHeight: 1.4 } },
              "Header bar is 88px. Logo height applies live via brand tokens CSS after save."
            )
          )
        )
      )
    )
  );
}

/** Session-scoped 30s undo toast — progress bar (no ticking digits); restores from D1 only. */
function CmsSectionUndoToast() {
  const [pending, setPending] = React.useState(null);
  const [busy, setBusy] = React.useState(false);

  const readPending = React.useCallback(() => {
    try {
      const raw = sessionStorage.getItem("cpas.sectionUndo");
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data?.section_key || !data?.page_route || !data?.expires_at) {
        sessionStorage.removeItem("cpas.sectionUndo");
        return null;
      }
      if (Date.now() > Number(data.expires_at)) {
        sessionStorage.removeItem("cpas.sectionUndo");
        return null;
      }
      if (!data.duration_ms) data.duration_ms = 30000;
      if (!data.started_at) data.started_at = Number(data.expires_at) - Number(data.duration_ms);
      return data;
    } catch {
      return null;
    }
  }, []);

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById("cpas-undo-toast-css")) return;
    const style = document.createElement("style");
    style.id = "cpas-undo-toast-css";
    style.textContent = `
      @keyframes cpasUndoDrain {
        to { transform: scaleX(0); }
      }
    `;
    document.head.appendChild(style);
  }, []);

  React.useEffect(() => {
    setPending(readPending());
    const onEvt = () => setPending(readPending());
    window.addEventListener("cpas:section-undo", onEvt);
    window.addEventListener("storage", onEvt);
    const id = setInterval(() => setPending(readPending()), 500);
    return () => {
      window.removeEventListener("cpas:section-undo", onEvt);
      window.removeEventListener("storage", onEvt);
      clearInterval(id);
    };
  }, [readPending]);

  // Freeze bar timing when this undo payload appears so re-renders don't restart the drain.
  const barTiming = React.useMemo(() => {
    if (!pending) return null;
    const durationMs = Number(pending.duration_ms) || 30000;
    const remainingMs = Math.max(0, Number(pending.expires_at) - Date.now());
    if (remainingMs <= 0) return null;
    return {
      key: `${pending.section_key}:${pending.expires_at}`,
      remainingMs,
      startScale: Math.min(1, Math.max(0, remainingMs / durationMs)),
    };
  }, [pending?.section_key, pending?.expires_at, pending?.duration_ms]);

  if (!pending || !barTiming) return null;

  const undo = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/cms/section/restore", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          page_route: pending.page_route,
          section_key: pending.section_key,
        }),
      });
      const d = await res.json().catch(() => ({}));
      sessionStorage.removeItem("cpas.sectionUndo");
      setPending(null);
      if (!d.success) {
        alert(d.error || "Could not restore section");
        setBusy(false);
        return;
      }
      window.dispatchEvent(new CustomEvent("cpas:section-restored", {
        detail: { page_route: pending.page_route, section_key: pending.section_key },
      }));
    } catch (e) {
      alert(String(e?.message || e));
    }
    setBusy(false);
  };

  const label = pending.label || pending.section_key;

  return React.createElement("div", {
    role: "status",
    "aria-live": "polite",
    style: {
      position: "fixed",
      bottom: 24,
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 9999,
      width: "min(440px, calc(100vw - 24px))",
      background: "#f7f5f2",
      color: "#2a2430",
      borderRadius: 12,
      border: "1px solid #e4dfd8",
      boxShadow: "0 10px 32px rgba(26,20,32,.12)",
      fontFamily: "var(--font-ui)",
      fontSize: 13,
      overflow: "hidden",
    },
  },
    React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 12px 12px 16px",
      },
    },
      React.createElement("span", {
        style: { flex: 1, lineHeight: 1.4, color: "#3d3648", fontWeight: 500 },
      }, `Section removed — “${label}”`),
      React.createElement("button", {
        type: "button",
        disabled: busy,
        onClick: undo,
        style: {
          padding: "7px 14px",
          borderRadius: 8,
          border: 0,
          cursor: busy ? "wait" : "pointer",
          background: "#6f2270",
          color: "#fff",
          fontWeight: 700,
          fontSize: 12,
          letterSpacing: "0.01em",
          flexShrink: 0,
        },
      }, busy ? "Restoring…" : "Undo"),
      React.createElement("button", {
        type: "button",
        "aria-label": "Dismiss",
        onClick: () => {
          try { sessionStorage.removeItem("cpas.sectionUndo"); } catch (_) {}
          setPending(null);
        },
        style: {
          width: 28,
          height: 28,
          border: 0,
          borderRadius: 8,
          background: "transparent",
          color: "#8a8294",
          cursor: "pointer",
          fontSize: 18,
          lineHeight: 1,
          flexShrink: 0,
        },
      }, "×")
    ),
    React.createElement("div", {
      "aria-hidden": "true",
      style: {
        height: 3,
        background: "#e8e3dc",
        width: "100%",
      },
    },
      React.createElement("div", {
        key: barTiming.key,
        style: {
          height: "100%",
          width: "100%",
          background: "#6f2270",
          transformOrigin: "left center",
          transform: `scaleX(${barTiming.startScale})`,
          animation: `cpasUndoDrain ${barTiming.remainingMs}ms linear forwards`,
        },
      })
    )
  );
}

Object.assign(window, {
  BrandTweakSection,
  BrandLogoDropZone,
  BrandThemeSwatches,
  CmsBrandView,
  CmsSectionUndoToast,
});
