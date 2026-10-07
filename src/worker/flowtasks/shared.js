export function corsJson(body, status, corsOrigin, upstreamHeaders) {
  const headers = new Headers({
    "Content-Type": "application/json",
    "Cache-Control": "no-store"
  });
  if (corsOrigin) {
    headers.set("Access-Control-Allow-Origin", corsOrigin);
    headers.set("Access-Control-Allow-Credentials", "true");
  }
  if (upstreamHeaders) {
    const setCookies = typeof upstreamHeaders.getSetCookie === "function"
      ? upstreamHeaders.getSetCookie()
      : [upstreamHeaders.get("Set-Cookie")].filter(Boolean);
    for (const cookie of setCookies) headers.append("Set-Cookie", cookie);
  }
  return new Response(JSON.stringify(body), { status, headers });
}

export function flowError(code, message, status, corsOrigin) {
  return corsJson({ success: false, error: code, message }, status, corsOrigin);
}

export function flowToken(prefix = "") {
  return `${prefix}${crypto.randomUUID().replace(/-/g, "")}`;
}

export function text(value) {
  return { text: value, entities: [] };
}

export function decodeTaskParameter(value) {
  try {
    return decodeURIComponent(value);
  } catch (_) {
    return value;
  }
}

export async function request_flow_api({ req, backendBase: backend_base, corsOrigin: cors_origin }, path, { method = "GET", query, body, auth_required = true } = {}) {
  const authorization = req.headers.get("Authorization");
  if (auth_required && (!authorization?.startsWith("Bearer ") || !authorization.slice(7).trim())) {
    return { error: flowError(1001, "Not authenticated", 401, cors_origin) };
  }
  const url = new URL(path, backend_base);
  for (const [key, value] of Object.entries(query ?? {})) url.searchParams.set(key, String(value));
  const headers = new Headers({ Accept: "application/json" });
  if (authorization?.startsWith("Bearer ")) headers.set("Authorization", authorization);
  const cookie = req.headers.get("Cookie");
  if (cookie) headers.set("Cookie", cookie);
  if (body !== undefined) headers.set("Content-Type", "application/json");
  let upstream;
  try {
    upstream = await fetch(url, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }), redirect: "manual" });
  } catch (error) {
    return { error: flowError("upstream_unavailable", error instanceof Error ? error.message : "The service is unavailable", 502, cors_origin) };
  }
  let payload;
  try {
    payload = await upstream.json();
  } catch (_) {
    return { error: flowError("invalid_upstream_response", `The service returned non-JSON (HTTP ${upstream.status})`, 502, cors_origin) };
  }
  if (!upstream.ok || payload?.success !== true) {
    return { error: flowError(payload?.error ?? upstream.status, payload?.message ?? "The request failed", upstream.ok ? 502 : upstream.status, cors_origin) };
  }
  if (!payload.data || typeof payload.data !== "object" || Array.isArray(payload.data)) {
    return { error: flowError("invalid_upstream_response", "The service returned invalid data", 502, cors_origin) };
  }
  return { data: payload.data, headers: upstream.headers };
}

export function flow_response(token, subtasks, cors_origin, upstream_headers) {
  return corsJson({
    success: true,
    data: {
      flow_token: token,
      status: "success",
      presentation: { kind: "modal", animation: "slide", close_behavior: "return_or_dash" },
      subtasks
    }
  }, 200, cors_origin, upstream_headers);
}

/**
 * @param {{
 *   name: string,
 *   match: (taskName: string) => Record<string, string> | null,
 *   get: (context: Record<string, any>) => Response | Promise<Response>,
 *   abortActions?: Record<string, string[]>,
 *   matchesFlowToken?: (flowToken: string) => boolean,
 *   continue?: (context: Record<string, any>) => Response | Promise<Response>
 * }} task
 */
export function defineFlowTask(task) {
  return task;
}
