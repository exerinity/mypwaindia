export interface ChatStatus {
  enrolled: boolean;
  username: string;
}

export interface ChatMessage {
  id: string;
  from: string;
  to: string;
  text: string;
  ts: number;
  editedAt: number | null;
  deleted: boolean;
  pending?: boolean;
  failed?: boolean;
}

export interface ChatConversation {
  peer: string;
  lastText: string;
  lastAt: number;
  lastFrom: string;
  lastMessageId: string;
  unread: number;
  deleted?: boolean;
  online: boolean;
}

export type ChatEvent =
  | { type: 'message'; message: ChatMessage }
  | { type: 'edit'; peer: string; message: ChatMessage }
  | { type: 'delete'; peer: string; id: string }
  | { type: 'typing'; from: string }
  | { type: 'presence'; username: string; online: boolean };

export class ChatError extends Error {
  code: string;
  status: number;

  constructor(code: string, status: number, message: string) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const MESSAGES: Record<string, string> = {
  unauthorized: 'Your session is no longer valid - log in again',
  not_enrolled: 'You need to enrol in MyChatIndia first',
  rate_limited: 'You are sending messages too fast, slow down a little',
  blocked_by_self: 'Unblock this user before messaging them',
  blocked_by_peer: 'This user has blocked you',
};

async function chatBase(): Promise<string> {
  const { API_BASE } = await import('./config.js');
  return `${API_BASE}/pwa/chat`;
}

async function fail(res: Response): Promise<never> {
  const body = await res.json().catch(() => null) as { error?: string; message?: string } | null;
  const code = body?.error ?? `http_${res.status}`;
  throw new ChatError(code, res.status, MESSAGES[code] ?? body?.message ?? `Chat returned HTTP ${res.status}`);
}

function authed(token: string) {
  return { Authorization: `Bearer ${token}`, Accept: 'application/json' };
}

export async function getChatStatus(token: string): Promise<ChatStatus> {
  const res = await fetch(`${await chatBase()}/status`, { headers: authed(token) });
  if (!res.ok) return fail(res);
  return res.json();
}

export async function enrollChat(token: string): Promise<ChatStatus> {
  const res = await fetch(`${await chatBase()}/enroll`, { method: 'POST', headers: authed(token) });
  if (!res.ok) return fail(res);
  return res.json();
}

export async function unenrollChat(token: string): Promise<void> {
  const res = await fetch(`${await chatBase()}/unenroll`, { method: 'POST', headers: authed(token) });
  if (!res.ok) return fail(res);
}

export async function lookupChatUser(token: string, username: string): Promise<{ username: string; enrolled: boolean }> {
  const res = await fetch(`${await chatBase()}/lookup`, {
    method: 'POST',
    headers: { ...authed(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });
  if (!res.ok) return fail(res);
  return res.json();
}

export async function listConversations(token: string): Promise<ChatConversation[]> {
  const res = await fetch(`${await chatBase()}/conversations`, { headers: authed(token) });
  if (!res.ok) return fail(res);
  const data = await res.json();
  return data.conversations ?? [];
}

export async function listMessages(token: string, peer: string, before?: number): Promise<ChatMessage[]> {
  const qs = new URLSearchParams({ peer, ...(before ? { before: String(before) } : {}) });
  const res = await fetch(`${await chatBase()}/messages?${qs}`, { headers: authed(token) });
  if (!res.ok) return fail(res);
  const data = await res.json();
  return data.messages ?? [];
}

export async function sendChatMessage(token: string, to: string, text: string): Promise<ChatMessage> {
  const res = await fetch(`${await chatBase()}/send`, {
    method: 'POST',
    headers: { ...authed(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, text }),
  });
  if (!res.ok) return fail(res);
  const data = await res.json();
  return data.message;
}

export async function editChatMessage(token: string, id: string, peer: string, text: string): Promise<ChatMessage> {
  const res = await fetch(`${await chatBase()}/edit`, {
    method: 'POST',
    headers: { ...authed(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, peer, text }),
  });
  if (!res.ok) return fail(res);
  const data = await res.json();
  return data.message;
}

export async function deleteChatMessage(token: string, id: string, peer: string): Promise<void> {
  const res = await fetch(`${await chatBase()}/delete`, {
    method: 'POST',
    headers: { ...authed(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, peer }),
  });
  if (!res.ok) return fail(res);
}

export async function markChatRead(token: string, peer: string): Promise<void> {
  const res = await fetch(`${await chatBase()}/read`, {
    method: 'POST',
    headers: { ...authed(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ peer }),
  });
  if (!res.ok) return fail(res);
}

export async function blockChatUser(token: string, username: string): Promise<void> {
  const res = await fetch(`${await chatBase()}/block`, {
    method: 'POST',
    headers: { ...authed(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });
  if (!res.ok) return fail(res);
}

export async function unblockChatUser(token: string, username: string): Promise<void> {
  const res = await fetch(`${await chatBase()}/unblock`, {
    method: 'POST',
    headers: { ...authed(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });
  if (!res.ok) return fail(res);
}

export async function listBlockedUsers(token: string): Promise<string[]> {
  const res = await fetch(`${await chatBase()}/blocked`, { headers: authed(token) });
  if (!res.ok) return fail(res);
  const data = await res.json();
  return data.blocked ?? [];
}

async function chatTicket(token: string): Promise<string> {
  const res = await fetch(`${await chatBase()}/ticket`, { headers: authed(token) });
  if (!res.ok) return fail(res);
  const data = await res.json();
  return data.ticket;
}

export async function openChatSocket(token: string): Promise<WebSocket> {
  const base = await chatBase();
  const ticket = await chatTicket(token);
  const absolute = base.startsWith('http') ? base : `${window.location.origin}${base}`;
  const wsUrl = `${absolute.replace(/^http/, 'ws')}/ws?ticket=${encodeURIComponent(ticket)}`;
  return new WebSocket(wsUrl);
}
