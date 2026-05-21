window.CPAS_CONFIG = {
  logoUrl: "/logo.png",
  assets: {},
  theme: {},
  brand: {}
};

window.applyCmsTheme = function applyCmsTheme(theme, brand) {
  if (!theme && !brand) return;
  const root = document.documentElement;

  if (theme?.css_vars_json) {
    let vars = theme.css_vars_json;
    if (typeof vars === "string") { try { vars = JSON.parse(vars); } catch { vars = {}; } }
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  }

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
        "/logo.png"
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
