import { socialRoutes } from "./api/social.js";

import { paymentsEmailRoutes } from "./api/payments_email.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/donations/") ||
        url.pathname.startsWith("/api/webhooks/stripe") ||
        url.pathname.startsWith("/api/contact") ||
        url.pathname.startsWith("/api/newsletter/") ||
        url.pathname.startsWith("/api/admin/donations") ||
        url.pathname.startsWith("/api/admin/email/") ||
        url.pathname.startsWith("/api/integrations/status")) {
      const res = await paymentsEmailRoutes(request, env, url);
      if (res) return res;
    }

    if (url.pathname.startsWith("/api/social/")) {
      const res = await socialRoutes(request, env, url);
      if (res) return res;
    }

    if (url.pathname === "/admin/login") {
      return env.ASSETS.fetch(new Request(new URL("/admin/login.html", url), request));
    }

    if (url.pathname === "/dashboard" || url.pathname.startsWith("/dashboard/")) {
      return env.ASSETS.fetch(new Request(new URL("/admin/dashboard.html", url), request));
    }

    return env.ASSETS.fetch(request);
  }
};
