// bom.best and bom.best/audio: serves the Bombest Audio home page at the root
// (dist/bom-best/index.html) and the store under /audio (dist/bom-best/audio)
// from Workers static assets. The route is bom.best/*, so the Worker sees every
// bom.best request; everything except the root and /audio, /beats included, is
// passed straight through to the S3/CloudFront origin.
//
// The asset directory is dist/bom-best, so a request for /audio/black-bottom/
// maps straight to dist/bom-best/audio/black-bottom/index.html. Unknown /audio
// paths get /audio/404.html with a 404 status (not_found_handling in
// wrangler.jsonc).

const PREFIX = "/audio";

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "Content-Security-Policy":
    "default-src 'none'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
};

function cacheControl(pathname, status, contentType) {
  if (status === 404) return "public, max-age=60";
  if (status !== 200) return "no-store";
  // Fingerprinted by the build: the name changes whenever the content does.
  if (pathname.startsWith(`${PREFIX}/assets/`)) return "public, max-age=31536000, immutable";
  // Pages revalidate every time, so a new deploy shows up at once (ETag keeps it cheap).
  if (contentType.startsWith("text/html")) return "public, max-age=0, must-revalidate";
  return "public, max-age=86400";
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;

    // Anything that isn't the root or /audio (/beats, /audiobooks and the like)
    // belongs to the origin, so pass it through untouched.
    const isHome = pathname === "/";
    if (!isHome && pathname !== PREFIX && !pathname.startsWith(`${PREFIX}/`)) {
      return fetch(request);
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
    }

    if (pathname === PREFIX) {
      url.pathname = `${PREFIX}/`;
      return Response.redirect(url.toString(), 301);
    }

    const res = await env.ASSETS.fetch(request);
    const headers = new Headers(res.headers);
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) headers.set(k, v);
    headers.set("Cache-Control", cacheControl(pathname, res.status, headers.get("Content-Type") || ""));
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
  },
};
