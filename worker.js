const PUBLIC_ROUTES = new Set([
  "/", "/login", "/about", "/documentation", "/updates", "/faq", "/campus", "/business",
  "/contact", "/support/tickets", "/status", "/incidents", "/security-center",
  "/security/vulnerability-disclosure", "/privacy-center", "/cookies/preferences",
  "/data-rights", "/offline", "/maintenance", "/error", "/privacy", "/terms",
  "/cookies", "/refunds", "/disclaimer", "/security", "/accessibility"
]);

function normalizedPath(pathname) {
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.replace(/\/+$/, "");
  return pathname || "/";
}

function isApplicationRoute(pathname) {
  const path = normalizedPath(pathname);
  return PUBLIC_ROUTES.has(path) || /^\/support\/tickets\/[^/]+$/.test(path);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = normalizedPath(url.pathname);
    if ((request.method === "GET" || request.method === "HEAD") && isApplicationRoute(path)) {
      const appUrl = new URL("/", url);
      return env.ASSETS.fetch(new Request(appUrl, request));
    }
    return env.ASSETS.fetch(request);
  }
};
export { isApplicationRoute, PUBLIC_ROUTES };
