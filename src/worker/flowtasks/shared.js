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
