const DRIVE_PREFIX = "/i/pwa/drive";
const DRIVE_API = "https://drive.mypayindia.com/api";
const ALLOWED_METHODS = new Set(["GET", "HEAD", "POST", "DELETE"]);
const ALLOWED_ORIGINS = new Set([
  "https://mypayindia.sbs",
  "https://mpi.exerinity.com",
  "http://localhost:5173",
  "http://localhost:4173"
]);

function applyCors(headers, origin) {
  if (!origin) return;
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Credentials", "true");
  headers.set("Vary", "Origin");
}

function jsonError(message, status, origin) {
  const headers = new Headers({ "Content-Type": "application/json" });
  applyCors(headers, origin);
  return new Response(JSON.stringify({ success: false, message }), { status, headers });
}

export async function handleDrive(req) {
  const url = new URL(req.url);
  const path = url.pathname.slice(DRIVE_PREFIX.length) || "/";
  const requestOrigin = req.headers.get("Origin");
  const corsOrigin = requestOrigin && ALLOWED_ORIGINS.has(requestOrigin) ? requestOrigin : null;

  if (requestOrigin && !corsOrigin) return jsonError("Origin not allowed", 403, null);
  if (req.method === "OPTIONS") {
    if (!corsOrigin) return jsonError("Origin not allowed", 403, null);
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": corsOrigin,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "GET, HEAD, POST, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Accept, Authorization, Content-Type, Range, If-Range, If-None-Match, If-Modified-Since",
        "Access-Control-Max-Age": "86400",
        "Vary": "Origin"
      }
    });
  }

  if (!ALLOWED_METHODS.has(req.method)) {
    return jsonError("Method not allowed", 405, corsOrigin);
  }
  if (
    path !== "/auth/me" &&
    path !== "/files" &&
    !path.startsWith("/files/") &&
    path !== "/share" &&
    !path.startsWith("/share/")
  ) {
    return jsonError("Not found", 404, corsOrigin);
  }

  const upstreamUrl = new URL(DRIVE_API + path);
  for (const [key, value] of url.searchParams) {
    if (key !== "view" && key !== "download") upstreamUrl.searchParams.append(key, value);
  }

  const headers = new Headers();
  for (const name of ["Accept", "Authorization", "Content-Type", "Range", "If-Range", "If-None-Match", "If-Modified-Since"]) {
    const value = req.headers.get(name);
    if (value) headers.set(name, value);
  }

  try {
    const upstream = await fetch(upstreamUrl, {
      method: req.method,
      headers,
      body: req.method === "GET" || req.method === "HEAD" ? null : req.body,
      redirect: "follow"
    });

    const responseHeaders = new Headers();
    for (const name of [
      "Content-Type",
      "Content-Length",
      "Content-Disposition",
      "Accept-Ranges",
      "Content-Range",
      "Cache-Control",
      "ETag",
      "Last-Modified"
    ]) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    const contentType = responseHeaders.get("Content-Type")?.split(";", 1)[0].trim().toLowerCase() || "";
    const inlineType = /^(audio\/(aac|flac|mpeg|mp4|ogg|wav|webm|x-m4a|x-wav)|image\/(avif|bmp|gif|jpeg|png|vnd\.microsoft\.icon|webp|x-icon)|video\/(mp4|ogg|quicktime|webm|x-m4v))$/.test(contentType);
    const fileResponse = path.startsWith("/files/download_token/");
    responseHeaders.set("X-Content-Type-Options", "nosniff");
    if (fileResponse) responseHeaders.set("Content-Security-Policy", "sandbox; default-src 'none'");
    if (url.searchParams.get("download") === "1" && fileResponse) {
      const disposition = responseHeaders.get("Content-Disposition");
      responseHeaders.set(
        "Content-Disposition",
        disposition ? disposition.replace(/^inline/i, "attachment") : "attachment"
      );
    } else if (url.searchParams.get("view") === "1" && inlineType) {
      const disposition = responseHeaders.get("Content-Disposition");
      responseHeaders.set(
        "Content-Disposition",
        disposition ? disposition.replace(/^attachment/i, "inline") : "inline"
      );
    } else if (fileResponse && !inlineType) {
      const disposition = responseHeaders.get("Content-Disposition");
      responseHeaders.set(
        "Content-Disposition",
        disposition ? disposition.replace(/^inline/i, "attachment") : "attachment"
      );
    }
    applyCors(responseHeaders, corsOrigin);
    if (corsOrigin) responseHeaders.set("Access-Control-Expose-Headers", "Content-Disposition, Content-Length, Content-Range, Accept-Ranges, ETag, Last-Modified");

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Drive request failed", 502, corsOrigin);
  }
}
