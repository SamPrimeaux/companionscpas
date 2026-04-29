window.CPAS_CONFIG = {
  logoUrl: "https://companionscpas-platform.samprimeauxwork.workers.dev/logo.png",
  assets: {},
  theme: {},
  brand: {}
};

window.loadDashboardConfig = async function loadDashboardConfig() {
  try {
    const res = await fetch("/api/dashboard/config", { credentials: "include" });
    if (!res.ok) return window.CPAS_CONFIG;

    const data = await res.json();
    const assets = {};
    (data.assets || []).forEach(a => {
      assets[a.asset_key] = a;
    });

    window.CPAS_CONFIG = {
      brand: data.brand || {},
      theme: data.theme || {},
      assets,
      logoUrl:
        data.brand?.logo_light_url ||
        data.brand?.logo_url ||
        data.theme?.asset_tokens_json?.logo_light ||
        "https://companionscpas-platform.samprimeauxwork.workers.dev/logo.png"
    };

    document.querySelectorAll("[data-asset]").forEach(el => {
      const key = el.getAttribute("data-asset");
      const asset = assets[key];
      if (asset?.url) {
        el.src = asset.url;
        if (asset.alt_text) el.alt = asset.alt_text;
      }
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
