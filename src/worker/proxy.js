import { SETTINGS_PATH, handleSettings } from "./settings_saver.js";
import { parseButtonPage, parseLeaderboard } from "./button_parse.js";
import { FLOW_TASK_PATH, handleFlowTask } from "./flow.js";

function jsonResponse(body, corsOrigin) {
  const headers = { "Content-Type": "application/json" };
  if (corsOrigin) {
    headers["Access-Control-Allow-Origin"] = corsOrigin;
    headers["Access-Control-Allow-Credentials"] = "true";
  }
  return new Response(JSON.stringify(body), { status: 200, headers });
}

function passthrough(upstream, corsOrigin) {
  const headers = new Headers();
  if (corsOrigin) {
    headers.set("Access-Control-Allow-Origin", corsOrigin);
    headers.set("Access-Control-Allow-Credentials", "true");
  }
  return new Response(upstream.body, { status: upstream.status, headers });
}

const APP_ORIGIN = "https://mypayindia.sbs";
const APP_HOST = "mypayindia.sbs";
const ALLOWED_ORIGINS = [
  "https://mypayindia.sbs",
  "https://mpi.exerinity.com",
  "http://localhost:5173","http://localhost:4173"
];
const BACKENDS = {
  staging: "https://staging.mypayindia.com",
  prod: "https://mypayindia.com"
};

export const bastion = {
  async fetch(req, env) {
    const url = new URL(req.url);
    const origin = req.headers.get("Origin");
    const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : null;

    if (url.pathname === "/") {
      return new Response("This is the gateway for the MyPayIndia PWA. It bridges requests from MyPayIndia.com to MyPayIndia.sbs. Now turn back, this is a dead end...");
    }

    const isStaging = url.pathname.startsWith("/staging/");
    const backendBase = isStaging ? BACKENDS.staging : BACKENDS.prod;
    const strippedPath = isStaging
      ? url.pathname.replace(/^\/staging/, "")
      : url.pathname;

    if (origin && !corsOrigin) {
      return new Response(" ", { status: 403 });
    }

    if (strippedPath === "/api/logout" && req.method === "POST") {
      const gibberishId =
        (typeof crypto !== "undefined" &&
          typeof crypto.randomUUID === "function" &&
          crypto.randomUUID().replace(/-/g, "")) ||
        Math.random().toString(36).slice(2);

      const headers = new Headers({
        "Content-Type": "application/json",
        ...(corsOrigin && {
          "Access-Control-Allow-Origin": corsOrigin,
          "Access-Control-Allow-Credentials": "true"
        })
      });
      headers.append(
        "Set-Cookie",
        "auth_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 UTC; HttpOnly; Secure; SameSite=Strict"
      );
      headers.append(
        "Set-Cookie",
        `PHPSESSID=${gibberishId}; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 UTC; HttpOnly; Secure; SameSite=Strict`
      );
      return new Response(
        JSON.stringify({ success: true, message: "Done, refresh!" }),
        { status: 200, headers }
      );
    }

    if (strippedPath === SETTINGS_PATH) {
      return handleSettings(req, env, corsOrigin, isStaging, backendBase);
    }

    if (
      !strippedPath.startsWith("/api/") &&
      !strippedPath.startsWith("/accountservices") &&
      !strippedPath.startsWith("/iotm/")
    ) {
      return new Response("Not found", { status: 404 });
    }

    if (req.method === "OPTIONS") {
      if (!corsOrigin) {
        return new Response(null, { status: 403 });
      }
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": corsOrigin,
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Max-Age": "86400"
        }
      });
    }
    if (strippedPath === FLOW_TASK_PATH) {
      return handleFlowTask(req, backendBase, corsOrigin);
    }
    if (
      req.method === "POST" &&
      strippedPath === "/accountservices/iotm/intelligenceid/"
    ) {
      const body = await req.text();
      if (body.includes("cf-turnstile-response=bypassed-by-pwa")) {
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...(corsOrigin && {
              "Access-Control-Allow-Origin": corsOrigin,
              "Access-Control-Allow-Credentials": "true"
            })
          }
        });
      }
      req = new Request(req, { body });
    }

    if (req.method === "GET" && strippedPath === "/api/pwa/button/gist") {
      const upstream = await fetch(backendBase + "/iotm/button?minimal", {
        method: "GET",
        headers: req.headers,
        redirect: "manual"
      });
      if (!upstream.ok) return passthrough(upstream, corsOrigin);
      return jsonResponse(parseButtonPage(await upstream.text()), corsOrigin);
    }

    if (req.method === "POST" && strippedPath === "/api/pwa/button/click") {
      const upstream = await fetch(backendBase + "/iotm/button/click", {
        method: "POST",
        headers: req.headers,
        body: req.body,
        redirect: "manual"
      });
      const contentType = upstream.headers.get("content-type") || "";
      if (!upstream.ok || !contentType.includes("application/json")) {
        return passthrough(upstream, corsOrigin);
      }
      const payload = await upstream.json();
      if (payload && payload.data && typeof payload.data.leaderboard === "string") {
        payload.data.leaderboard = parseLeaderboard(payload.data.leaderboard);
      }
      return jsonResponse(payload, corsOrigin);
    }

    const back = backendBase + strippedPath + url.search;
    const upstream = await fetch(back, {
      method: req.method,
      headers: req.headers,
      body: req.method !== "GET" && req.method !== "HEAD" ? req.body : null,
      redirect: "manual"
    });

    const headers = new Headers(upstream.headers);

    headers.delete("access-control-allow-origin");
    headers.delete("access-control-allow-credentials");
    headers.delete("access-control-allow-methods");
    headers.delete("access-control-allow-headers");

    const isTrustedEmbedder = (() => {
      const checkUrl = (value) => {
        if (!value) return false;
        try {
          const parsed = new URL(value);
          return (
            parsed.hostname === APP_HOST ||
            parsed.hostname === "mpi.exerinity.com"
          );
        } catch (_) {
          return false;
        }
      };
      return (
        checkUrl(req.headers.get("Referer")) ||
        checkUrl(req.headers.get("Origin"))
      );
    })();

    if (corsOrigin) {
      headers.set("Access-Control-Allow-Origin", corsOrigin);
      headers.set("Access-Control-Allow-Credentials", "true");
    }

    if (isTrustedEmbedder) {
      headers.delete("x-frame-options");
      const csp = headers.get("content-security-policy");
      if (csp) {
        const sanitized = csp
          .split(";")
          .map((d) => d.trim())
          .filter((d) => d && !d.toLowerCase().startsWith("frame-ancestors"));
        sanitized.length
          ? headers.set("Content-Security-Policy", sanitized.join("; "))
          : headers.delete("content-security-policy");
      }
    } else {
      headers.set("X-Frame-Options", "DENY");
      const csp = headers.get("content-security-policy");
      if (!csp) {
        headers.set("Content-Security-Policy", "frame-ancestors 'none'");
      } else if (!csp.toLowerCase().includes("frame-ancestors")) {
        headers.set(
          "Content-Security-Policy",
          `${csp.trim().replace(/;$/, "")}; frame-ancestors 'none'`
        );
      }
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers
    });
  }
};
