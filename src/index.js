import { socialRoutes } from "./api/social.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

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
