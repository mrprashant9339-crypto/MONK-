const ORIGIN = "https://origin.monk.monster";

export default {
  async fetch(request) {
    const incoming = new URL(request.url);
    const origin = new URL(ORIGIN);
    const upstream = new URL(incoming.pathname + incoming.search, origin);

    const headers = new Headers(request.headers);
    headers.delete("host");
    headers.set("x-forwarded-host", incoming.host);
    headers.set("x-forwarded-proto", incoming.protocol.replace(":", ""));

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
    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  },
};
