/**
 * Serves the static site, proxies the release manifest (the bucket does not
 * send CORS headers), and redirects www.goalward.dev to the apex.
 */
const RELEASES_LATEST = "https://releases.goalward.dev/latest.json";

export default {
  /**
   * @param {Request} request
   * @param {{ ASSETS: { fetch: (request: Request) => Promise<Response> } }} env
   */
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.hostname === "www.goalward.dev") {
      url.hostname = "goalward.dev";
      url.protocol = "https:";
      return Response.redirect(url.toString(), 301);
    }

    if (url.pathname === "/api/latest.json") {
      return proxyLatest();
    }

    const response = await env.ASSETS.fetch(request);
    return withAssetCache(url.pathname, response);
  },
};

/**
 * Hashed Vite files can be cached for a year. HTML must revalidate so a new
 * deploy is visible on the next load. `_headers` sets the same policy; this
 * copy wins when the Worker handles the request first.
 * @param {string} pathname
 * @param {Response} response
 */
function withAssetCache(pathname, response) {
  const headers = new Headers(response.headers);
  if (pathname.startsWith("/assets/")) {
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
  } else if (isHtml(pathname, headers)) {
    headers.set("Cache-Control", "public, max-age=0, must-revalidate");
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * @param {string} pathname
 * @param {Headers} headers
 */
function isHtml(pathname, headers) {
  const type = headers.get("content-type") || "";
  return type.includes("text/html") || pathname === "/" || pathname.endsWith(".html");
}

async function proxyLatest() {
  try {
    const upstream = await fetch(RELEASES_LATEST, {
      headers: { Accept: "application/json" },
      cf: { cacheTtl: 60, cacheEverything: true },
    });
    const body = await upstream.arrayBuffer();
    return new Response(body, {
      status: upstream.ok ? 200 : upstream.status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=60",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: "latest.json unavailable" }), {
      status: 502,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }
}
