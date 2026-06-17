window.CPAS_CONFIG = {
  logoUrl: "https://imagedelivery.net/g7wf09fCONpnidkRnR_5vw/b82e15b1-05e1-454c-85ca-a92f8eee2100/avatar",
  assets: {},
  theme: {},
  brand: {}
};

/** Dashboard light palette — never let CMS theme css_vars clobber these. */
const DASH_PALETTE = {
  "--dash-bg":            "#ede8df",
  "--dash-bg2":           "#e5e0d6",
  "--dash-surface":       "#faf7f3",
  "--dash-surface-muted": "#f5f1e8",
  "--dash-border":        "rgba(0,0,0,0.07)",
  "--dash-border-strong": "rgba(26,22,34,0.12)",
  "--dash-text":          "#1a1622",
  "--dash-text-sec":      "#3d3529",
  "--dash-text-muted":    "#5a5046",
};

function pinDashboardPalette(root = document.documentElement) {
  Object.entries(DASH_PALETTE).forEach(([k, v]) => root.style.setProperty(k, v));
}

window.applyCmsTheme = function applyCmsTheme(theme, brand) {
  if (!theme && !brand) return;
  const root = document.documentElement;

  if (theme?.css_vars_json) {
    let vars = theme.css_vars_json;
    if (typeof vars === "string") { try { vars = JSON.parse(vars); } catch { vars = {}; } }
    Object.entries(vars).forEach(([k, v]) => {
      if (k.startsWith("--dash-")) return;
      root.style.setProperty(k, v);
    });
  }

  pinDashboardPalette(root);

  const primaryColor   = brand?.primary_color  || "#8664B7";
  const secondaryColor = brand?.secondary_color || "#172033";
  const accentColor    = brand?.accent_color    || "#F04E65";

  root.style.setProperty("--brand-primary",   primaryColor);
  root.style.setProperty("--brand-secondary", secondaryColor);
  root.style.setProperty("--brand-accent",    accentColor);

  if (window.__C_OBJ__) {
    window.__C_OBJ__.purple    = primaryColor;
    window.__C_OBJ__.purpleHov = secondaryColor;
    window.__C_OBJ__.purpleL   = lightenHex(primaryColor, 0.3);
    window.__C_OBJ__.purpleDim = hexWithOpacity(primaryColor, 0.15);
    window.__C_OBJ__.pink      = accentColor;
  }

  if (theme?.typography_tokens_json) {
    let typo = theme.typography_tokens_json;
    if (typeof typo === "string") { try { typo = JSON.parse(typo); } catch { typo = {}; } }
    if (typo.font_display_family) root.style.setProperty("--font-display", typo.font_display_family);
    if (typo.font_body_family)    root.style.setProperty("--font-body",    typo.font_body_family);
  }
};

function hexWithOpacity(hex, opacity) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${opacity})`;
}

function lightenHex(hex, amount) {
  const r = Math.min(255, parseInt(hex.slice(1,3),16) + Math.round(255*amount));
  const g = Math.min(255, parseInt(hex.slice(3,5),16) + Math.round(255*amount));
  const b = Math.min(255, parseInt(hex.slice(5,7),16) + Math.round(255*amount));
  return "#"+r.toString(16).padStart(2,"0")+g.toString(16).padStart(2,"0")+b.toString(16).padStart(2,"0");
}

window.loadDashboardConfig = async function loadDashboardConfig() {
  try {
    const res = await fetch("/api/dashboard/config", { credentials: "include" });
    if (!res.ok) return window.CPAS_CONFIG;
    const data = await res.json();
    const assets = {};
    (data.assets || []).forEach(a => { assets[a.asset_key] = a; });
    window.CPAS_CONFIG = {
      brand:   data.brand  || {},
      theme:   data.theme  || {},
      assets,
      logoUrl:
        data.brand?.logo_light_url ||
        data.brand?.logo_url       ||
        "https://imagedelivery.net/g7wf09fCONpnidkRnR_5vw/b82e15b1-05e1-454c-85ca-a92f8eee2100/avatar"
    };
    window.applyCmsTheme(data.theme, data.brand);
    document.querySelectorAll("[data-asset]").forEach(el => {
      const asset = assets[el.getAttribute("data-asset")];
      if (asset?.url) { el.src = asset.url; if (asset.alt_text) el.alt = asset.alt_text; }
    });
    document.querySelectorAll("[data-brand-logo]").forEach(el => {
      el.src = window.CPAS_CONFIG.logoUrl;
    });
    return window.CPAS_CONFIG;
  } catch (err) {
    console.warn("Dashboard config unavailable", err);
    return window.CPAS_CONFIG;
  }
};
