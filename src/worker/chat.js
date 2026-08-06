import { verifyUser } from "./button_subscribe.js";

const CHAT_ORIGINS = [
  "https://mypayindia.sbs",
  "https://www.mypayindia.sbs",
  "https://mpi.exerinity.com",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:8787",
  "http://127.0.0.1:8787"
];

const MAX_MSG_LEN = 2000;
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60 * 1000;
const TICKET_TTL = 60;
const HISTORY_PAGE = 50;

function chatCors(origin) {
  const allow = CHAT_ORIGINS.includes(origin) ? origin : CHAT_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

function chatJson(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...chatCors(origin) }
  });
}

async function withCors(response, origin) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(chatCors(origin))) headers.set(key, value);
  return new Response(response.body, { status: response.status, headers });
}

function normUser(username) {
  return String(username ?? "").trim().toLowerCase();
}

function enrolledKey(username) {
  return `chat:enrolled:${normUser(username)}`;
}

function ticketKey(ticket) {
  return `chat:ticket:${ticket}`;
}

function rateKey(username) {
  return `chat:rate:${normUser(username)}`;
}

async function isEnrolled(env, username) {
  const v = await env.MPI_KV.get(enrolledKey(username));
  return v !== null;
}

async function consumeRate(env, username) {
  const now = Date.now();
  const stored = await env.MPI_KV.get(rateKey(username), "json");
  const record = !stored || typeof stored.reset !== "number" || stored.reset <= now
    ? { used: 0, reset: now + RATE_WINDOW_MS }
    : { used: Number(stored.used) || 0, reset: stored.reset };
  if (record.used >= RATE_LIMIT) return { allowed: false };
  record.used += 1;
  await env.MPI_KV.put(rateKey(username), JSON.stringify(record), {
    expirationTtl: Math.max(60, Math.ceil((record.reset - now) / 1000) + 30)
  });
  return { allowed: true };
}

async function authorize(request, env, origin) {
  const userBase = env.MPI_USER_BASE || "https://bastion.mypayindia.sbs";
  const user = await verifyUser(request.headers.get("Authorization"), userBase);
  if (!user) return { error: chatJson({ error: "unauthorized" }, 401, origin) };
  return { user };
}

function mailboxStub(env, username) {
  const id = env.CHAT_MAILBOX.idFromName(normUser(username));
  return env.CHAT_MAILBOX.get(id);
}

function forward(env, username, path, init) {
  const stub = mailboxStub(env, username);
  const headers = new Headers(init?.headers);
  headers.set("X-Chat-User", normUser(username));
  return stub.fetch(`https://chat-do${path}`, { ...init, headers });
}

export const chat = {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: chatCors(origin) });
    }

    if (!env.CHAT_MAILBOX) {
      return chatJson({ error: "chat is not wired up on this deployment" }, 503, origin);
    }

    if (path === "/ws") {
      const ticket = url.searchParams.get("ticket") || "";
      if (!ticket) return chatJson({ error: "missing ticket" }, 401, origin);
      const username = await env.MPI_KV.get(ticketKey(ticket));
      if (!username) return chatJson({ error: "ticket expired" }, 401, origin);
      await env.MPI_KV.delete(ticketKey(ticket));
      if (!(await isEnrolled(env, username))) return chatJson({ error: "not enrolled" }, 403, origin);
      const headers = new Headers(request.headers);
      headers.set("X-Chat-User", normUser(username));
      return mailboxStub(env, username).fetch("https://chat-do/self/ws", { method: "GET", headers });
    }

    const auth = await authorize(request, env, origin);
    if (auth.error) return auth.error;
    const { user } = auth;

    if (path === "/status" && request.method === "GET") {
      const enrolled = await isEnrolled(env, user.username);
      return chatJson({ enrolled, username: user.username }, 200, origin);
    }

    if (path === "/enroll" && request.method === "POST") {
      await env.MPI_KV.put(enrolledKey(user.username), JSON.stringify({ username: user.username, enrolledAt: Date.now() }));
      return chatJson({ enrolled: true, username: user.username }, 200, origin);
    }

    if (path === "/unenroll" && request.method === "POST") {
      await env.MPI_KV.delete(enrolledKey(user.username));
      return chatJson({ enrolled: false }, 200, origin);
    }

    if (path === "/ticket" && request.method === "GET") {
      if (!(await isEnrolled(env, user.username))) return chatJson({ error: "not_enrolled" }, 403, origin);
      const ticket = crypto.randomUUID();
      await env.MPI_KV.put(ticketKey(ticket), user.username, { expirationTtl: TICKET_TTL });
      return chatJson({ ticket }, 200, origin);
    }

    if (path === "/lookup" && request.method === "POST") {
      const body = await request.json().catch(() => null);
      const target = normUser(body?.username);
      if (!target) return chatJson({ error: "missing username" }, 400, origin);
      const enrolled = await isEnrolled(env, target);
      return chatJson({ username: target, enrolled }, 200, origin);
    }

    if (!(await isEnrolled(env, user.username))) {
      return chatJson({ error: "not_enrolled" }, 403, origin);
    }

    if (path === "/conversations" && request.method === "GET") {
      const res = await forward(env, user.username, "/self/conversations", { method: "GET" });
      return withCors(res, origin);
    }

    if (path === "/messages" && request.method === "GET") {
      const peer = url.searchParams.get("peer") || "";
      const before = url.searchParams.get("before") || "";
      const res = await forward(env, user.username, `/self/messages?peer=${encodeURIComponent(peer)}&before=${encodeURIComponent(before)}`, { method: "GET" });
      return withCors(res, origin);
    }

    if (path === "/send" && request.method === "POST") {
      const body = await request.json().catch(() => null);
      const to = normUser(body?.to);
      const text = typeof body?.text === "string" ? body.text.trim() : "";
      if (!to || to === user.username.toLowerCase()) return chatJson({ error: "invalid recipient" }, 400, origin);
      if (!text) return chatJson({ error: "empty message" }, 400, origin);
      if (text.length > MAX_MSG_LEN) return chatJson({ error: "that message is too long" }, 413, origin);
      if (!(await isEnrolled(env, to))) return chatJson({ error: "recipient not enrolled" }, 404, origin);

      const rate = await consumeRate(env, user.username);
      if (!rate.allowed) return chatJson({ error: "rate_limited" }, 429, origin);

      const res = await forward(env, user.username, "/self/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, text })
      });
      return withCors(res, origin);
    }

    if (path === "/edit" && request.method === "POST") {
      const body = await request.json().catch(() => null);
      const text = typeof body?.text === "string" ? body.text.trim() : "";
      if (!body?.id || !body?.peer) return chatJson({ error: "missing id/peer" }, 400, origin);
      if (!text) return chatJson({ error: "empty message" }, 400, origin);
      if (text.length > MAX_MSG_LEN) return chatJson({ error: "that message is too long" }, 413, origin);
      const res = await forward(env, user.username, "/self/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: body.id, peer: normUser(body.peer), text })
      });
      return withCors(res, origin);
    }

    if (path === "/delete" && request.method === "POST") {
      const body = await request.json().catch(() => null);
      if (!body?.id || !body?.peer) return chatJson({ error: "missing id/peer" }, 400, origin);
      const res = await forward(env, user.username, "/self/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: body.id, peer: normUser(body.peer) })
      });
      return withCors(res, origin);
    }

    if (path === "/read" && request.method === "POST") {
      const body = await request.json().catch(() => null);
      if (!body?.peer) return chatJson({ error: "missing peer" }, 400, origin);
      const res = await forward(env, user.username, "/self/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ peer: normUser(body.peer) })
      });
      return withCors(res, origin);
    }

    if (path === "/block" && request.method === "POST") {
      const body = await request.json().catch(() => null);
      if (!body?.username) return chatJson({ error: "missing username" }, 400, origin);
      const res = await forward(env, user.username, "/self/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: normUser(body.username) })
      });
      return withCors(res, origin);
    }

    if (path === "/unblock" && request.method === "POST") {
      const body = await request.json().catch(() => null);
      if (!body?.username) return chatJson({ error: "missing username" }, 400, origin);
      const res = await forward(env, user.username, "/self/unblock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: normUser(body.username) })
      });
      return withCors(res, origin);
    }

    if (path === "/blocked" && request.method === "GET") {
      const res = await forward(env, user.username, "/self/blocked", { method: "GET" });
      return withCors(res, origin);
    }

    return chatJson({ error: "not found" }, 404, origin);
  }
};

function msgKey(peer, ts, id) {
  return `msg:${normUser(peer)}:${String(ts).padStart(13, "0")}:${id}`;
}

function idxKey(id) {
  return `msgid:${id}`;
}

function peerKey(peer) {
  return `peer:${normUser(peer)}`;
}

function blockedKey(username) {
  return `blocked:${normUser(username)}`;
}

function doJson(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

export class ChatMailbox {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.sockets = new Set();
  }

  broadcast(payload) {
    const data = JSON.stringify(payload);
    for (const ws of this.sockets) {
      try { ws.send(data); } catch (_) { this.sockets.delete(ws); }
    }
  }

  async notifyPeers(online) {
    const list = await this.ctx.storage.list({ prefix: "peer:" });
    for (const key of list.keys()) {
      const peer = key.slice("peer:".length);
      this.ctx.waitUntil(
        this.env.CHAT_MAILBOX.get(this.env.CHAT_MAILBOX.idFromName(peer))
          .fetch("https://chat-do/peer/presence", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Chat-User": peer },
            body: JSON.stringify({ username: this.self, online })
          })
          .catch(() => {})
      );
    }
  }

  async handleWs(request) {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("expected websocket", { status: 426 });
    }
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.accept();
    this.sockets.add(server);
    const wasOnline = this.sockets.size > 1;

    server.addEventListener("message", async (event) => {
      let msg;
      try { msg = JSON.parse(event.data); } catch (_) { return; }
      if (msg?.type === "typing" && typeof msg.to === "string") {
        const peer = normUser(msg.to);
        this.ctx.waitUntil(
          this.env.CHAT_MAILBOX.get(this.env.CHAT_MAILBOX.idFromName(peer))
            .fetch("https://chat-do/peer/typing", {
              method: "POST",
              headers: { "Content-Type": "application/json", "X-Chat-User": peer },
              body: JSON.stringify({ from: this.self })
            })
            .catch(() => {})
        );
      }
    });

    const onClose = () => {
      this.sockets.delete(server);
      if (this.sockets.size === 0) this.ctx.waitUntil(this.notifyPeers(false));
    };
    server.addEventListener("close", onClose);
    server.addEventListener("error", onClose);

    if (!wasOnline) this.ctx.waitUntil(this.notifyPeers(true));

    return new Response(null, { status: 101, webSocket: client });
  }

  async listConversations() {
    const list = await this.ctx.storage.list({ prefix: "peer:" });
    const out = [];
    for (const [key, value] of list) {
      const peer = key.slice("peer:".length);
      const stub = this.env.CHAT_MAILBOX.get(this.env.CHAT_MAILBOX.idFromName(peer));
      let online = false;
      try {
        const res = await stub.fetch("https://chat-do/peer/isonline", { headers: { "X-Chat-User": peer } });
        online = (await res.json())?.online === true;
      } catch (_) {}
      out.push({ peer, ...value, online });
    }
    out.sort((a, b) => (b.lastAt || 0) - (a.lastAt || 0));
    return doJson({ conversations: out });
  }

  async listMessages(peer, before) {
    if (!peer) return doJson({ error: "missing peer" }, 400);
    const prefix = `msg:${normUser(peer)}:`;
    const end = before ? `msg:${normUser(peer)}:${String(before).padStart(13, "0")}` : undefined;
    const list = await this.ctx.storage.list({ prefix, end, reverse: true, limit: HISTORY_PAGE });
    const messages = Array.from(list.values()).reverse();
    return doJson({ messages });
  }

  async send(body) {
    const to = normUser(body?.to);
    const text = String(body?.text || "");

    if (await this.ctx.storage.get(blockedKey(to))) {
      return doJson({ error: "blocked_by_self", message: "Unblock this user before messaging them" }, 403);
    }
    try {
      const res = await this.env.CHAT_MAILBOX.get(this.env.CHAT_MAILBOX.idFromName(to))
        .fetch("https://chat-do/peer/isblocked", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Chat-User": to },
          body: JSON.stringify({ username: this.self })
        });
      const { blocked } = await res.json();
      if (blocked) return doJson({ error: "blocked_by_peer", message: "This user has blocked you" }, 403);
    } catch (_) {}

    const id = crypto.randomUUID();
    const ts = Date.now();
    const message = { id, from: this.self, to, text, ts, editedAt: null, deleted: false };

    await this.ctx.storage.put(msgKey(to, ts, id), message);
    await this.ctx.storage.put(idxKey(id), msgKey(to, ts, id));
    const existing = (await this.ctx.storage.get(peerKey(to))) || { unread: 0 };
    await this.ctx.storage.put(peerKey(to), { ...existing, lastText: text, lastAt: ts, lastFrom: this.self, lastMessageId: id, deleted: false });

    this.broadcast({ type: "message", message });

    this.ctx.waitUntil(
      this.env.CHAT_MAILBOX.get(this.env.CHAT_MAILBOX.idFromName(to))
        .fetch("https://chat-do/peer/deliver", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Chat-User": to },
          body: JSON.stringify({ from: this.self, message })
        })
        .catch(() => {})
    );

    return doJson({ message });
  }

  async receive(body) {
    const from = normUser(body?.from);
    const message = body?.message;
    if (!from || !message?.id) return doJson({ ok: true });

    const blocked = await this.ctx.storage.get(blockedKey(from));
    if (blocked) return doJson({ dropped: true });

    await this.ctx.storage.put(msgKey(from, message.ts, message.id), message);
    await this.ctx.storage.put(idxKey(message.id), msgKey(from, message.ts, message.id));
    const existing = (await this.ctx.storage.get(peerKey(from))) || { unread: 0 };
    await this.ctx.storage.put(peerKey(from), {
      ...existing,
      lastText: message.text,
      lastAt: message.ts,
      lastFrom: from,
      lastMessageId: message.id,
      deleted: false,
      unread: (existing.unread || 0) + 1
    });

    this.broadcast({ type: "message", message });
    return doJson({ ok: true });
  }

  async edit(body) {
    const id = body?.id;
    const peer = normUser(body?.peer);
    const text = String(body?.text || "");
    const key = await this.ctx.storage.get(idxKey(id));
    if (!key) return doJson({ error: "not found" }, 404);
    const message = await this.ctx.storage.get(key);
    if (!message || message.from !== this.self || message.to !== peer) return doJson({ error: "not found" }, 404);

    message.text = text;
    message.editedAt = Date.now();
    await this.ctx.storage.put(key, message);

    const summary = await this.ctx.storage.get(peerKey(peer));
    if (summary?.lastMessageId === id) {
      await this.ctx.storage.put(peerKey(peer), { ...summary, lastText: text });
    }

    this.broadcast({ type: "edit", peer, message });

    this.ctx.waitUntil(
      this.env.CHAT_MAILBOX.get(this.env.CHAT_MAILBOX.idFromName(peer))
        .fetch("https://chat-do/peer/edit", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Chat-User": peer },
          body: JSON.stringify({ id, from: this.self, text, editedAt: message.editedAt })
        })
        .catch(() => {})
    );

    return doJson({ message });
  }

  async receiveEdit(body) {
    const id = body?.id;
    const from = normUser(body?.from);
    const key = await this.ctx.storage.get(idxKey(id));
    if (!key) return doJson({ ok: true });
    const message = await this.ctx.storage.get(key);
    if (!message || message.from !== from) return doJson({ ok: true });

    message.text = String(body?.text || "");
    message.editedAt = body?.editedAt || Date.now();
    await this.ctx.storage.put(key, message);

    const summary = await this.ctx.storage.get(peerKey(from));
    if (summary?.lastMessageId === id) {
      await this.ctx.storage.put(peerKey(from), { ...summary, lastText: message.text });
    }

    this.broadcast({ type: "edit", peer: from, message });
    return doJson({ ok: true });
  }

  async deleteMsg(body) {
    const id = body?.id;
    const peer = normUser(body?.peer);
    const key = await this.ctx.storage.get(idxKey(id));
    if (!key) return doJson({ error: "not found" }, 404);
    const message = await this.ctx.storage.get(key);
    if (!message || message.from !== this.self || message.to !== peer) return doJson({ error: "not found" }, 404);

    message.text = "";
    message.deleted = true;
    await this.ctx.storage.put(key, message);

    const summary = await this.ctx.storage.get(peerKey(peer));
    if (summary?.lastMessageId === id) {
      await this.ctx.storage.put(peerKey(peer), { ...summary, lastText: "", deleted: true });
    }

    this.broadcast({ type: "delete", peer, id });

    this.ctx.waitUntil(
      this.env.CHAT_MAILBOX.get(this.env.CHAT_MAILBOX.idFromName(peer))
        .fetch("https://chat-do/peer/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Chat-User": peer },
          body: JSON.stringify({ id, from: this.self })
        })
        .catch(() => {})
    );

    return doJson({ ok: true });
  }

  async receiveDelete(body) {
    const id = body?.id;
    const from = normUser(body?.from);
    const key = await this.ctx.storage.get(idxKey(id));
    if (!key) return doJson({ ok: true });
    const message = await this.ctx.storage.get(key);
    if (!message || message.from !== from) return doJson({ ok: true });

    message.text = "";
    message.deleted = true;
    await this.ctx.storage.put(key, message);

    const summary = await this.ctx.storage.get(peerKey(from));
    if (summary?.lastMessageId === id) {
      await this.ctx.storage.put(peerKey(from), { ...summary, lastText: "", deleted: true });
    }

    this.broadcast({ type: "delete", peer: from, id });
    return doJson({ ok: true });
  }

  async markRead(body) {
    const peer = normUser(body?.peer);
    const summary = await this.ctx.storage.get(peerKey(peer));
    if (summary) await this.ctx.storage.put(peerKey(peer), { ...summary, unread: 0 });
    return doJson({ ok: true });
  }

  async block(body) {
    await this.ctx.storage.put(blockedKey(body?.username), true);
    return doJson({ ok: true });
  }

  async unblock(body) {
    await this.ctx.storage.delete(blockedKey(body?.username));
    return doJson({ ok: true });
  }

  async listBlocked() {
    const list = await this.ctx.storage.list({ prefix: "blocked:" });
    return doJson({ blocked: Array.from(list.keys()).map((k) => k.slice("blocked:".length)) });
  }

  async receiveTyping(body) {
    this.broadcast({ type: "typing", from: normUser(body?.from) });
    return doJson({ ok: true });
  }

  async receivePresence(body) {
    this.broadcast({ type: "presence", username: normUser(body?.username), online: body?.online === true });
    return doJson({ ok: true });
  }

  async isOnline() {
    return doJson({ online: this.sockets.size > 0 });
  }

  async isBlockedBy(body) {
    const blocked = await this.ctx.storage.get(blockedKey(body?.username));
    return doJson({ blocked: !!blocked });
  }

  async fetch(request) {
    const url = new URL(request.url);
    this.self = request.headers.get("X-Chat-User") || this.self || "";
    const path = url.pathname;

    if (path === "/self/ws") return this.handleWs(request);
    if (path === "/self/conversations") return this.listConversations();
    if (path === "/self/messages") return this.listMessages(url.searchParams.get("peer"), url.searchParams.get("before"));

    if (request.method === "POST") {
      const body = await request.json().catch(() => null);
      if (path === "/self/send") return this.send(body);
      if (path === "/self/edit") return this.edit(body);
      if (path === "/self/delete") return this.deleteMsg(body);
      if (path === "/self/read") return this.markRead(body);
      if (path === "/self/block") return this.block(body);
      if (path === "/self/unblock") return this.unblock(body);
      if (path === "/peer/deliver") return this.receive(body);
      if (path === "/peer/edit") return this.receiveEdit(body);
      if (path === "/peer/delete") return this.receiveDelete(body);
      if (path === "/peer/typing") return this.receiveTyping(body);
      if (path === "/peer/presence") return this.receivePresence(body);
      if (path === "/peer/isblocked") return this.isBlockedBy(body);
    }

    if (path === "/self/blocked") return this.listBlocked();
    if (path === "/peer/isonline") return this.isOnline();

    return new Response("not found", { status: 404 });
  }
}
