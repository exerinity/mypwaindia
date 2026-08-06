import { bastion } from "./proxy.js";
import { subscribe } from "./button_subscribe.js";
import { agent } from "./agent.js";
import { chat, ChatMailbox } from "./chat.js";
import { handle_news } from "./news.js";

export { ChatMailbox };

const API_ROOTS = ["/api", "/iotm", "/accountservices", "/api/pwa", "/staging"];
const SUBSCRIBE_PREFIX = "/i/subscribe";
const AGENT_PREFIX = "/i/api/pwa/clanker";
const CHAT_PREFIX = "/i/api/pwa/converse";
const NEWS_PATH = "/i/api/pwa/meta/news";

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === "/i/api") {
      return new Response(null, { status: 302, headers: { Location: "/" } });
    }
    if (url.pathname === NEWS_PATH) {
      return handle_news();
    }
    if (url.pathname === AGENT_PREFIX || url.pathname.startsWith(AGENT_PREFIX + "/")) {
      url.pathname = url.pathname.slice(AGENT_PREFIX.length) || "/";
      return agent.fetch(new Request(url, req), env);
    }
    if (url.pathname === CHAT_PREFIX || url.pathname.startsWith(CHAT_PREFIX + "/")) {
      url.pathname = url.pathname.slice(CHAT_PREFIX.length) || "/";
      return chat.fetch(new Request(url, req), env);
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
