const PUBLIC_ROUTES = new Set([
  "/", "/login", "/about", "/documentation", "/updates", "/faq", "/campus", "/business",
  "/contact", "/support/tickets", "/status", "/incidents", "/security-center",
  "/security/vulnerability-disclosure", "/privacy-center", "/cookies/preferences",
  "/data-rights", "/offline", "/maintenance", "/error", "/privacy", "/terms",
  "/cookies", "/refunds", "/disclaimer", "/security", "/accessibility", "/thank-you"
]);

const PAGE_METADATA = {
  "/": {
    "title": "MONK — Campus & Business Workspaces",
    "description": "MONK brings college operations and business workflows into focused, connected workspaces. Explore Campus and Business."
  },
  "/about": {
    "title": "About MONK — Independent Workspace Platform",
    "description": "Learn about MONK, its independent development, product direction and current preview availability."
  },
  "/documentation": {
    "title": "MONK Documentation — Product Guide",
    "description": "Explore MONK product guidance, workspace concepts and available workflows for Campus and Business."
  },
  "/updates": {
    "title": "MONK Updates — Product Progress",
    "description": "Read product updates and development notes for the MONK Campus and Business workspaces."
  },
  "/faq": {
    "title": "MONK FAQ — Accounts, Workspaces & Access",
    "description": "Find answers about MONK accounts, Campus and Business workspaces, previews, access and support."
  },
  "/campus": {
    "title": "MONK Campus — College & Institution Workspaces",
    "description": "Explore a connected workspace concept for colleges, polytechnics, students, faculty and institution teams."
  },
  "/business": {
    "title": "MONK Business — Business Operations Workspace",
    "description": "Explore customer, inventory, orders and team workflows in the MONK Business workspace."
  },
  "/contact": {
    "title": "Contact MONK — Support & Enquiries",
    "description": "Contact the MONK team about account access, product questions, technical issues or privacy requests."
  },
  "/support/tickets": {
    "title": "Support Tickets — MONK",
    "description": "Submit a support request to MONK or review the local reference details available in this browser."
  },
  "/status": {
    "title": "MONK Service Status",
    "description": "View the current service status information published by MONK."
  },
  "/incidents": {
    "title": "MONK Incident History",
    "description": "Review service incident information and updates published by MONK."
  },
  "/security-center": {
    "title": "MONK Security Center",
    "description": "Read about MONK security practices, responsible use and security contact information."
  },
  "/security/vulnerability-disclosure": {
    "title": "Vulnerability Disclosure — MONK",
    "description": "Read how to report a suspected security vulnerability to MONK responsibly."
  },
  "/privacy-center": {
    "title": "Privacy Center — MONK",
    "description": "Find privacy information and ways to contact MONK about personal information requests."
  },
  "/cookies/preferences": {
    "title": "Cookie Preferences — MONK",
    "description": "Review and update optional cookie preferences for the MONK website."
  },
  "/data-rights": {
    "title": "Data Rights Requests — MONK",
    "description": "Contact MONK to request access, correction or deletion of personal information."
  },
  "/offline": {
    "title": "MONK — Offline",
    "description": "MONK is currently unavailable offline. Reconnect to the internet and try again."
  },
  "/maintenance": {
    "title": "MONK — Maintenance",
    "description": "MONK is temporarily unavailable while maintenance is in progress."
  },
  "/error": {
    "title": "MONK — Something Went Wrong",
    "description": "An unexpected error occurred. Return to MONK or contact support if the issue continues."
  },
  "/privacy": {
    "title": "Privacy Policy — MONK",
    "description": "Read how MONK processes account, workspace, support and technical information."
  },
  "/terms": {
    "title": "Terms of Service — MONK",
    "description": "Read the terms governing access to the MONK website and workspaces."
  },
  "/cookies": {
    "title": "Cookie Policy — MONK",
    "description": "Learn how cookies and browser storage are used by the MONK website."
  },
  "/refunds": {
    "title": "Refund Policy — MONK",
    "description": "Read the MONK refund and cancellation information."
  },
  "/disclaimer": {
    "title": "Disclaimer — MONK",
    "description": "Read important limitations and product-preview information for MONK."
  },
  "/security": {
    "title": "Security Overview — MONK",
    "description": "Read the security overview and responsible access information for MONK."
  },
  "/accessibility": {
    "title": "Accessibility — MONK",
    "description": "Read the MONK accessibility statement and ways to report an accessibility issue."
  },
  "/thank-you": {
    "title": "Submission received — MONK",
    "description": "Your MONK submission has been received. Review the next steps and keep your reference number if one was provided."
  },
  "/login": {
    "title": "Log in or Sign up — MONK",
    "description": "Sign in or create a MONK workspace account for your organization."
  }
};

function normalizedPath(pathname) {
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.replace(/\/+$/, "");
  return pathname || "/";
}

function isApplicationRoute(pathname) {
  const path = normalizedPath(pathname);
  return PUBLIC_ROUTES.has(path) || /^\/support\/tickets\/[^/]+$/.test(path);
}

function escapeHtml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function routeMetadata(path) {
  if (PAGE_METADATA[path]) return PAGE_METADATA[path];
  if (/^\/support\/tickets\/[^/]+$/.test(path)) {
    return { title: "Support Ticket Reference — MONK", description: "View the support ticket reference information available in this browser." };
  }
  return { title: "MONK — Campus & Business Workspaces", description: PAGE_METADATA["/"].description };
}

function withRouteMetadata(response, path) {
  if (!response.ok) return response;
  const metadata = routeMetadata(path);
  const title = escapeHtml(metadata.title);
  const description = escapeHtml(metadata.description);
  const canonical = "https://monk.monster" + (path === "/" ? "/" : path);
  const noindex = ["/login", "/thank-you", "/support/tickets", "/privacy-center", "/cookies/preferences", "/status", "/offline", "/maintenance", "/error"].includes(path) || /^\/support\/tickets\//.test(path);
  return response.text().then(html => {
    const patched = html
      .replace(/<title>[\s\S]*?<\/title>/i, "<title>" + title + "</title>")
      .replace(/<meta name="description" content="[^"]*"\s*\/?>/i, '<meta name="description" content="' + description + '" />')
      .replace(/<meta name="robots" content="[^"]*"\s*\/?>/i, '<meta name="robots" content="' + (noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large") + '" />')
      .replace(/<link rel="canonical" href="[^"]*"\s*\/?>/i, '<link rel="canonical" href="' + canonical + '" />')
      .replace(/<meta property="og:title" content="[^"]*"\s*\/?>/i, '<meta property="og:title" content="' + title + '" />')
      .replace(/<meta property="og:description" content="[^"]*"\s*\/?>/i, '<meta property="og:description" content="' + description + '" />')
      .replace(/<meta property="og:url" content="[^"]*"\s*\/?>/i, '<meta property="og:url" content="' + canonical + '" />')
      .replace(/<meta name="twitter:title" content="[^"]*"\s*\/?>/i, '<meta name="twitter:title" content="' + title + '" />')
      .replace(/<meta name="twitter:description" content="[^"]*"\s*\/?>/i, '<meta name="twitter:description" content="' + description + '" />')
      .replace(/<meta name="twitter:card" content="[^"]*"\s*\/?>/i, '<meta name="twitter:card" content="summary_large_image" />');
    const headers = new Headers(response.headers);
    headers.set("Cache-Control", "public, max-age=0, s-maxage=300");
    headers.delete("Content-Length");
    headers.delete("Content-Encoding");
    headers.delete("ETag");
    return new Response(patched, { status: response.status, statusText: response.statusText, headers });
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = normalizedPath(url.pathname);
    if ((request.method === "GET" || request.method === "HEAD") && path === "/signup") {
      return Response.redirect(new URL("/login?mode=signup", url), 302);
    }
    if (request.method === "GET" && isApplicationRoute(path)) {
      const appUrl = new URL("/", url);
      const response = await env.ASSETS.fetch(new Request(appUrl, request));
      return withRouteMetadata(response, path);
    }
    if (request.method === "HEAD" && isApplicationRoute(path)) {
      return env.ASSETS.fetch(new Request(new URL("/", url), request));
    }
    return env.ASSETS.fetch(request);
  }
};
export { isApplicationRoute, PUBLIC_ROUTES, PAGE_METADATA };
