import { bastion } from "./proxy.js";
import { subscribe } from "./button_subscribe.js";
import { handle_news } from "./news.js";
import { BEAM_PATH, BEAM_COMPLETE_PATH, handle_beam_callback, redeem_beam_session } from "./beam.js";

const API_ROOTS = ["/api", "/iotm", "/accountservices", "/api/pwa", "/staging"];
const SUBSCRIBE_PREFIX = "/i/api/buttonac";
const NEWS_PATH = "/i/api/pwa/meta/news";

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === BEAM_PATH && (url.searchParams.has("code") || (url.searchParams.has("error") && (url.searchParams.has("state") || url.searchParams.has("iss"))))) {
      return handle_beam_callback(req, env);
    }
    if (url.pathname === BEAM_COMPLETE_PATH) {
      return redeem_beam_session(req, env);
    }
    if (url.pathname === "/i/api") {
      return new Response(null, { status: 302, headers: { Location: "/" } });
    }
    if (url.pathname === NEWS_PATH) {
      return handle_news();
    }
    if (url.pathname === SUBSCRIBE_PREFIX || url.pathname.startsWith(SUBSCRIBE_PREFIX + "/")) {
      url.pathname = url.pathname.slice(SUBSCRIBE_PREFIX.length) || "/";
      return subscribe.fetch(new Request(url, req), env);
    }
    if (url.pathname.startsWith("/i/")) {
      const rest = url.pathname.slice(2);
      if (API_ROOTS.some((root) => rest === root || rest.startsWith(root + "/"))) {
        url.pathname = rest;
        return bastion.fetch(new Request(url, req), env);
      }
    }
    return env.ASSETS.fetch(req);
  }
};
