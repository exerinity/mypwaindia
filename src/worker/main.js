import { bastion } from "./proxy.js";
import { subscribe } from "./button_subscribe.js";

const API_ROOTS = ["/api", "/iotm", "/accountservices", "/pwa", "/staging"];
const SUBSCRIBE_PREFIX = "/i/subscribe";

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === "/i/api") {
      return new Response(null, { status: 302, headers: { Location: "/" } });
    }
    if (url.pathname === "/i/api/v0/buttonclick") {
      url.pathname = "/iotm/button/click";
      return bastion.fetch(new Request(url, req), env);
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
