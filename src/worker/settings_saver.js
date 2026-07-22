const MAX_SETTINGS_BYTES = 64 * 1024;

export const SETTINGS_PATH = "/pwa/settings";

function corsJson(body, status, corsOrigin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: new Headers({
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...(corsOrigin && {
        "Access-Control-Allow-Origin": corsOrigin,
        "Access-Control-Allow-Credentials": "true"
      })
    })
  });
}

function bearerToken(req) {
  const raw = (req.headers.get("Authorization") || "").trim();
  const match = /^Bearer\s+(.+)$/i.exec(raw);
  return match ? match[1].trim() : null;
}

async function resolveIdentity(token, backendBase) {
  let res;
  try {
    res = await fetch(backendBase + "/api/v2/user/info", {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
    });
  } catch (_) {
    return { status: 502, error: "Could not reach MyPayIndia to verify your session" };
  }
  let payload = null;
  try {
    payload = await res.json();
  } catch (_) {}
  if (!res.ok || !payload || payload.success !== true) {
    return { status: 401, error: "Session is not valid" };
  }
  const data = payload.data || {};
  const identity = data.id ?? data.user_id ?? data.username;
  if (identity === undefined || identity === null || identity === "") {
    return { status: 500, error: "Could not determine account identity" };
  }
  return { identity: String(identity) };
}

export async function handleSettings(req, env, corsOrigin, isStaging, backendBase) {
  if (req.method === "OPTIONS") {
    if (!corsOrigin) return new Response(null, { status: 403 });
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": corsOrigin,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400"
      }
    });
  }

  if (!env || !env.MPI_KV) {
    return corsJson({ success: false, message: "Settings storage is not configured" }, 503, corsOrigin);
  }

  if (req.method !== "GET" && req.method !== "PUT" && req.method !== "DELETE") {
    return corsJson({ success: false, message: "Method not allowed" }, 405, corsOrigin);
  }

  const token = bearerToken(req);
  if (!token) {
    return corsJson({ success: false, message: "Log in to sync settings" }, 401, corsOrigin);
  }

  const resolved = await resolveIdentity(token, backendBase);
  if (resolved.error) {
    return corsJson({ success: false, message: resolved.error }, resolved.status, corsOrigin);
  }

  const key = `settings:${isStaging ? "staging" : "prod"}:${resolved.identity}`;

  if (req.method === "GET") {
    const stored = await env.MPI_KV.get(key);
    if (stored === null) {
      return corsJson({ success: true, data: { payload: null, savedAt: null } }, 200, corsOrigin);
    }
    let parsed;
    try {
      parsed = JSON.parse(stored);
    } catch (_) {
      return corsJson({ success: true, data: { payload: null, savedAt: null } }, 200, corsOrigin);
    }
    return corsJson({ success: true, data: parsed }, 200, corsOrigin);
  }

  if (req.method === "DELETE") {
    await env.MPI_KV.delete(key);
    return corsJson({ success: true, data: { deleted: true } }, 200, corsOrigin);
  }

  const raw = await req.text();
  if (raw.length > MAX_SETTINGS_BYTES) {
    return corsJson({ success: false, message: "Settings payload is too large" }, 413, corsOrigin);
  }
  let incoming;
  try {
    incoming = JSON.parse(raw);
  } catch (_) {
    return corsJson({ success: false, message: "Settings payload is not valid JSON" }, 400, corsOrigin);
  }
  if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
    return corsJson({ success: false, message: "Settings payload must be an object" }, 400, corsOrigin);
  }

  const record = { payload: incoming, savedAt: new Date().toISOString() };
  await env.MPI_KV.put(key, JSON.stringify(record));
  return corsJson({ success: true, data: { savedAt: record.savedAt } }, 200, corsOrigin);
}
