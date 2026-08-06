import {
  type ChatConversation,
  type ChatMessage,
  type ChatEvent,
  openChatSocket,
  listConversations,
  listMessages,
  sendChatMessage,
  editChatMessage,
  deleteChatMessage,
  markChatRead,
} from '../api/converse.ts';

export interface ChatState {
  connected: boolean;
  conversations: ChatConversation[];
  activePeer: string | null;
  messages: ChatMessage[];
  loadingMessages: boolean;
  typing: Record<string, boolean>;
  lastSeen: Record<string, number>;
}

let state: ChatState = {
  connected: false,
  conversations: [],
  activePeer: null,
  messages: [],
  loadingMessages: false,
  typing: {},
  lastSeen: {},
};

const subscribers = new Set<() => void>();
let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let currentToken: string | null = null;
const typingTimers = new Map<string, ReturnType<typeof setTimeout>>();

function set(patch: Partial<ChatState>): void {
  state = { ...state, ...patch };
  for (const fn of subscribers) fn();
}

export function subscribeChat(fn: () => void): () => void {
  subscribers.add(fn);
  return () => { subscribers.delete(fn); };
}

export function getChatState(): ChatState {
  return state;
}

function upsertConversation(peer: string, patch: Partial<ChatConversation>): void {
  const list = state.conversations.slice();
  const idx = list.findIndex((c) => c.peer === peer);
  if (idx === -1) {
    list.push({
      peer, lastText: '', lastAt: Date.now(), lastFrom: '', lastMessageId: '', unread: 0, online: false,
      ...patch,
    });
  } else {
    list[idx] = { ...list[idx], ...patch };
  }
  list.sort((a, b) => (b.lastAt || 0) - (a.lastAt || 0));
  set({ conversations: list });
}

function onEvent(event: ChatEvent): void {
  if (event.type === 'message') {
    const { message } = event;
    const fromSelf = message.from === currentUsername();
    const other = fromSelf ? message.to : message.from;
    const isIncoming = message.to === currentUsername();
    if (!fromSelf && other === state.activePeer) {
      set({ messages: [...state.messages, message] });
    }
    upsertConversation(other, {
      lastText: message.text,
      lastAt: message.ts,
      lastFrom: message.from,
      lastMessageId: message.id,
      deleted: false,
      unread: isIncoming && other !== state.activePeer
        ? (state.conversations.find((c) => c.peer === other)?.unread ?? 0) + 1
        : (state.conversations.find((c) => c.peer === other)?.unread ?? 0),
    });
    return;
  }
  if (event.type === 'edit') {
    if (event.peer === state.activePeer) {
      set({ messages: state.messages.map((m) => (m.id === event.message.id ? event.message : m)) });
    }
    const existing = state.conversations.find((c) => c.peer === event.peer);
    if (existing?.lastMessageId === event.message.id) {
      upsertConversation(event.peer, { lastText: event.message.text });
    }
    return;
  }
  if (event.type === 'delete') {
    if (event.peer === state.activePeer) {
      set({ messages: state.messages.map((m) => (m.id === event.id ? { ...m, deleted: true, text: '' } : m)) });
    }
    const existing = state.conversations.find((c) => c.peer === event.peer);
    if (existing?.lastMessageId === event.id) {
      upsertConversation(event.peer, { lastText: '', deleted: true });
    }
    return;
  }
  if (event.type === 'typing') {
    set({ typing: { ...state.typing, [event.from]: true } });
    const existing = typingTimers.get(event.from);
    if (existing) clearTimeout(existing);
    typingTimers.set(event.from, setTimeout(() => {
      const next = { ...state.typing };
      delete next[event.from];
      set({ typing: next });
    }, 3000));
    return;
  }
  if (event.type === 'presence') {
    const existing = state.conversations.find((c) => c.peer === event.username);
    if (existing) upsertConversation(event.username, { online: event.online });
    if (!event.online) set({ lastSeen: { ...state.lastSeen, [event.username]: Date.now() } });
  }
}

let username: string | null = null;
function currentUsername(): string | null {
  return username;
}

let refCount = 0;

export async function connectChat(token: string, selfUsername: string): Promise<void> {
  refCount += 1;
  if (socket && currentToken === token) return;
  currentToken = token;
  username = selfUsername;
  await openSocket();
}

async function openSocket(): Promise<void> {
  if (!currentToken) return;
  try {
    const ws = await openChatSocket(currentToken);
    socket = ws;
    ws.addEventListener('open', () => set({ connected: true }));
    ws.addEventListener('message', (ev) => {
      try {
        onEvent(JSON.parse(ev.data));
      } catch (_) { /* ignore malformed frame */ }
    });
    ws.addEventListener('close', () => {
      set({ connected: false });
      socket = null;
      if (currentToken) reconnectTimer = setTimeout(openSocket, 3000);
    });
    ws.addEventListener('error', () => ws.close());
  } catch (_) {
    if (currentToken) reconnectTimer = setTimeout(openSocket, 3000);
  }
}

export function disconnectChat(): void {
  refCount = Math.max(0, refCount - 1);
  if (refCount > 0) return;
  currentToken = null;
  username = null;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (socket) socket.close();
  socket = null;
  state = { connected: false, conversations: [], activePeer: null, messages: [], loadingMessages: false, typing: {}, lastSeen: {} };
  for (const fn of subscribers) fn();
}

export async function refreshConversations(token: string): Promise<void> {
  const conversations = await listConversations(token);
  set({ conversations });
}

export async function openConversation(token: string, peer: string): Promise<void> {
  set({ activePeer: peer, loadingMessages: true, messages: [] });
  const messages = await listMessages(token, peer);
  set({ messages, loadingMessages: false });
  const existing = state.conversations.find((c) => c.peer === peer);
  if (existing && existing.unread > 0) {
    upsertConversation(peer, { unread: 0 });
    markChatRead(token, peer).catch(() => {});
  }
}

export function closeConversation(): void {
  set({ activePeer: null, messages: [] });
}

export async function sendMessage(token: string, to: string, text: string): Promise<void> {
  const tempId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const optimistic: ChatMessage = {
    id: tempId, from: currentUsername() ?? '', to, text, ts: Date.now(), editedAt: null, deleted: false, pending: true,
  };
  if (state.activePeer === to) set({ messages: [...state.messages, optimistic] });

  try {
    const message = await sendChatMessage(token, to, text);
    if (state.activePeer === to) {
      const hasTemp = state.messages.some((m) => m.id === tempId);
      const hasReal = state.messages.some((m) => m.id === message.id);
      if (hasTemp) {
        set({ messages: state.messages.map((m) => (m.id === tempId ? message : m)) });
      } else if (!hasReal) {
        set({ messages: [...state.messages, message] });
      }
    }
    upsertConversation(to, { lastText: message.text, lastAt: message.ts, lastFrom: message.from, lastMessageId: message.id, deleted: false });
  } catch (err) {
    if (state.activePeer === to) {
      set({ messages: state.messages.map((m) => (m.id === tempId ? { ...m, pending: false, failed: true } : m)) });
    }
    throw err;
  }
}

export async function editMessage(token: string, id: string, peer: string, text: string): Promise<void> {
  const message = await editChatMessage(token, id, peer, text);
  set({ messages: state.messages.map((m) => (m.id === id ? message : m)) });
  const existing = state.conversations.find((c) => c.peer === peer);
  if (existing?.lastMessageId === id) upsertConversation(peer, { lastText: message.text });
}

export async function deleteMessage(token: string, id: string, peer: string): Promise<void> {
  await deleteChatMessage(token, id, peer);
  set({ messages: state.messages.map((m) => (m.id === id ? { ...m, deleted: true, text: '' } : m)) });
  const existing = state.conversations.find((c) => c.peer === peer);
  if (existing?.lastMessageId === id) upsertConversation(peer, { lastText: '', deleted: true });
}

export function sendTyping(peer: string): void {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: 'typing', to: peer }));
  }
}

export function totalUnread(): number {
  return state.conversations.reduce((sum, c) => sum + (c.unread || 0), 0);
}

export function getUnreadSnapshot(): number {
  return totalUnread();
}

export const CHAT_DRAWER_OPEN_EVENT = 'mpi-chat-drawer-open';

let pendingDrawerOpen = false;

export function requestDrawerOpen(): void {
  pendingDrawerOpen = true;
  window.dispatchEvent(new Event(CHAT_DRAWER_OPEN_EVENT));
}

export function consumeDrawerOpenRequest(): boolean {
  const pending = pendingDrawerOpen;
  pendingDrawerOpen = false;
  return pending;
}
