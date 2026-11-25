const ORIGIN = "https://origin.monk.monster";
const SPA_ROUTES = new Set([
  "/", "/login", "/signup", "/forgot-password", "/reset-password", "/auth/callback",
  "/about", "/documentation", "/updates", "/faq", "/campus", "/business", "/directory",
  "/contact", "/support/tickets", "/status", "/incidents", "/security-center",
  "/security/vulnerability-disclosure", "/privacy-center", "/cookies/preferences",
  "/data-rights", "/offline", "/maintenance", "/error", "/privacy", "/terms",
  "/cookies", "/refunds", "/disclaimer", "/security", "/accessibility", "/thank-you",
]);

function isSpaRoute(path) {
  return SPA_ROUTES.has(path) || /^\/support\/tickets\/[A-Z0-9-]+$/.test(path);
}

export default {
  async fetch(request) {
    const incoming = new URL(request.url);
    const origin = new URL(ORIGIN);
    const spaRoute = isSpaRoute(incoming.pathname);
    const upstreamPath = spaRoute ? "/" : incoming.pathname;
    const upstream = new URL(upstreamPath + incoming.search, origin);

    const headers = new Headers(request.headers);
    headers.delete("host");
    headers.set("x-forwarded-host", incoming.host);
    headers.set("x-forwarded-proto", incoming.protocol.replace(":", ""));
    const cfConnectingIp = request.headers.get("cf-connecting-ip");
    if (cfConnectingIp) headers.set("CF-Connecting-IP", cfConnectingIp);

    const init = { method: request.method, headers, redirect: "manual" };
    if (request.method !== "GET" && request.method !== "HEAD") init.body = request.body;

    let upstreamResponse;
    try {
      upstreamResponse = await fetch(new Request(upstream, init));
    } catch {
      return new Response("MONK Vercel origin is temporarily unavailable.", {
        status: 502,
        headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
      });
    }

    const contentType = upstreamResponse.headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
      const html = await upstreamResponse.clone().text();
      if (/Vercel Security Checkpoint|Failed to verify your browser|Code\\s*21/i.test(html)) {
        return new Response("Vercel origin challenged the preview proxy request.", { status: 502, headers: { "cache-control": "no-store", "x-monk-proxy-challenge": "detected" } });
      }
    }

    const responseHeaders = new Headers(upstreamResponse.headers);
    const location = responseHeaders.get("location");
    if (location) {
      try {
        const redirect = new URL(location, origin);
        if (redirect.hostname === origin.hostname) {
          redirect.hostname = incoming.hostname;
          redirect.protocol = incoming.protocol;
          redirect.port = incoming.port;
          responseHeaders.set("location", redirect.toString());
        }
      } catch {
        // Preserve non-URL Location values unchanged.
      }
    }

    responseHeaders.set("x-monk-proxy-upstream", "vercel-origin");
    responseHeaders.set("x-monk-proxy-host", incoming.hostname);
    responseHeaders.set("x-monk-proxy-route", spaRoute ? "spa" : "asset");
    responseHeaders.set("x-monk-proxy-cf-ip", cfConnectingIp ? "present" : "missing");
    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  },
};
