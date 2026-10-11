import * as oidc from "openid-client";
import { corsJson } from "./flowtasks/shared.js";

export const BEAM_PATH = "/i/flow/beam";
export const BEAM_COMPLETE_PATH = "/i/api/pwa/beam/complete";

const ISSUER = "https://mypayindia.com";
const PENDING_COOKIE = "mpi_beam_pending";
const RESULT_COOKIE = "mpi_beam_result";
const PENDING_SECONDS = 600;
const RESULT_SECONDS = 120;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function encode_base64url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decode_base64url(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")), (char) => char.charCodeAt(0));
}

async function cookie_key(secret) {
  const material = await crypto.subtle.importKey("raw", encoder.encode(secret), "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: encoder.encode("mypwaindia-beam-v1"), info: encoder.encode("cookie") },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function seal(value, secret) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await cookie_key(secret), encoder.encode(JSON.stringify(value)));
  return `${encode_base64url(iv)}.${encode_base64url(new Uint8Array(ciphertext))}`;
}

async function unseal(value, secret) {
  try {
    const [iv, ciphertext] = value.split(".");
    if (!iv || !ciphertext) return null;
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: decode_base64url(iv) },
      await cookie_key(secret),
      decode_base64url(ciphertext)
    );
    return JSON.parse(decoder.decode(plaintext));
  } catch {
    return null;
  }
}

function read_cookie(request, name) {
  const cookies = request.headers.get("Cookie") ?? "";
  const match = cookies.split(";").map((entry) => entry.trim()).find((entry) => entry.startsWith(`${name}=`));
  return match ? match.slice(name.length + 1) : null;
}

function cookie_header(name, value, path, request, max_age) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${name}=${value}; Path=${path}; Max-Age=${max_age}; HttpOnly; SameSite=Lax${secure}`;
}

function redirect_uri(request) {
  const origin = new URL(request.url).origin;
  if (origin !== "https://mypayindia.sbs" && origin !== "http://localhost:5173") {
    throw new Error("Unsupported beam origin");
  }
  return `${origin}${BEAM_PATH}`;
}

function safe_return_to(value) {
  return typeof value === "string" && value.length <= 1024 && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")
    ? value
    : "/dash";
}

async function configuration(env) {
  if (!env.MYPAYINDIA_CLIENT_ID || !env.MYPAYINDIA_CLIENT_SECRET) {
    throw new Error("MyPayIndia Identity credentials are missing");
  }
  return oidc.discovery(new URL(ISSUER), env.MYPAYINDIA_CLIENT_ID, env.MYPAYINDIA_CLIENT_SECRET, undefined, {
    execute: [oidc.enableNonRepudiationChecks]
  });
}

export async function start_beam(request, env) {
  const callback = redirect_uri(request);
  const return_to = safe_return_to(new URL(request.url).searchParams.get("goto"));
  const config = await configuration(env);
  const verifier = oidc.randomPKCECodeVerifier();
  const state = oidc.randomState();
  const nonce = oidc.randomNonce();
  const pending = await seal({ verifier, state, nonce, callback, return_to, expires: Date.now() + PENDING_SECONDS * 1000 }, env.MYPAYINDIA_CLIENT_SECRET);
  const url = oidc.buildAuthorizationUrl(config, {
    response_type: "code",
    redirect_uri: callback,
    scope: "openid session",
    code_challenge: await oidc.calculatePKCECodeChallenge(verifier),
    code_challenge_method: "S256",
    state,
    nonce
  });
  const headers = new Headers();
  headers.append("Set-Cookie", cookie_header(PENDING_COOKIE, pending, BEAM_PATH, request, PENDING_SECONDS));
  return { url: url.href, headers };
}

function callback_redirect(request, status, cookies = []) {
  const location = new URL(BEAM_PATH, request.url);
  location.searchParams.set(status === "complete" ? "complete" : "beam_error", status === "complete" ? "1" : status);
  const headers = new Headers({ Location: location.href, "Cache-Control": "no-store" });
  for (const cookie of cookies) headers.append("Set-Cookie", cookie);
  return new Response(null, { status: 303, headers });
}

export async function handle_beam_callback(request, env) {
  const url = new URL(request.url);
  const clear_pending = cookie_header(PENDING_COOKIE, "", BEAM_PATH, request, 0);
  const pending_value = read_cookie(request, PENDING_COOKIE);
  const pending = pending_value && env.MYPAYINDIA_CLIENT_SECRET
    ? await unseal(pending_value, env.MYPAYINDIA_CLIENT_SECRET)
    : null;

  if (!pending || pending.expires < Date.now() || pending.callback !== redirect_uri(request) || !pending.state || !pending.nonce || !pending.verifier) {
    return callback_redirect(request, "expired", [clear_pending]);
  }
  if (url.searchParams.get("state") !== pending.state || url.searchParams.get("iss") !== ISSUER) {
    return callback_redirect(request, "invalid_response", [clear_pending]);
  }
  if (url.searchParams.has("error")) {
    return callback_redirect(request, url.searchParams.get("error") === "access_denied" ? "access_denied" : "provider_error", [clear_pending]);
  }
  if (!url.searchParams.get("code")) {
    return callback_redirect(request, "invalid_response", [clear_pending]);
  }

  try {
    const config = await configuration(env);
    const tokens = await oidc.authorizationCodeGrant(config, url, {
      pkceCodeVerifier: pending.verifier,
      expectedState: pending.state,
      expectedNonce: pending.nonce
    });
    const sub = tokens.claims()?.sub;
    if (!sub || !tokens.access_token) throw new Error("The identity response is incomplete");
    const upstream = await fetch(`${ISSUER}/api/v2/auth/oauth`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json", "X-Client-Type": "pwa" },
      body: JSON.stringify({ access_token: tokens.access_token }),
      redirect: "manual"
    });
    const payload = await upstream.json();
    const session_id = payload?.data?.session_id;
    if (!upstream.ok || payload?.success !== true || typeof session_id !== "string" || !session_id) {
      throw new Error("The account session exchange failed");
    }
    const result = await seal({ session_id, sub, return_to: safe_return_to(pending.return_to), expires: Date.now() + RESULT_SECONDS * 1000 }, env.MYPAYINDIA_CLIENT_SECRET);
    const result_cookie = cookie_header(RESULT_COOKIE, result, BEAM_COMPLETE_PATH, request, RESULT_SECONDS);
    return callback_redirect(request, "complete", [clear_pending, result_cookie]);
  } catch {
    return callback_redirect(request, "exchange_failed", [clear_pending]);
  }
}

export async function redeem_beam_session(request, env) {
  if (request.method !== "POST") return new Response(null, { status: 405 });
  const url = new URL(request.url);
  if (request.headers.get("Origin") !== url.origin) return new Response(null, { status: 403 });
  const result_value = read_cookie(request, RESULT_COOKIE);
  const result = result_value && env.MYPAYINDIA_CLIENT_SECRET
    ? await unseal(result_value, env.MYPAYINDIA_CLIENT_SECRET)
    : null;
  const response = result && result.expires >= Date.now() && typeof result.session_id === "string" && typeof result.sub === "string"
    ? corsJson({ success: true, data: { session_id: result.session_id, sub: result.sub, return_to: safe_return_to(result.return_to) } }, 200)
    : corsJson({ success: false, error: "expired", message: "The sign-in result has expired" }, 400);
  response.headers.append("Set-Cookie", cookie_header(RESULT_COOKIE, "", BEAM_COMPLETE_PATH, request, 0));
  return response;
}
