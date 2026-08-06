import { storageGet, storageSet, storageRemove } from './storage.ts';
import type { AgentRate } from '../api/agent.ts';

export type AgentItemKind = 'user' | 'agent' | 'tool' | 'confirm' | 'error';
export type ConfirmState = 'pending' | 'approved' | 'declined' | 'expired';

export interface AgentItem {
  id: number;
  kind: AgentItemKind;
  text?: string;
  name?: string;
  args?: Record<string, unknown>;
  result?: unknown;
  error?: string;
  phase?: 'call' | 'result';
  actionId?: string;
  summary?: string;
  state?: ConfirmState;
}

export const AGENT_ITEMS_KEY = 'mpi_agent_items';

const MAX_PERSISTED = 120;

let _aid = 0;

let items: AgentItem[] = (() => {
  const saved = storageGet<AgentItem[]>(AGENT_ITEMS_KEY, []);
  if (saved.length > 0) _aid = saved.reduce((max, i) => Math.max(max, i.id), 0) + 1;
  return saved.map((item) => (item.kind === 'confirm' && item.state === 'pending' ? { ...item, state: 'expired' as ConfirmState } : item));
})();

const subscribers = new Set<() => void>();

let rate: AgentRate | null = null;

function notify() {
  for (const fn of subscribers) fn();
}

function emit() {
  items = items.slice(-MAX_PERSISTED);
  storageSet(AGENT_ITEMS_KEY, items);
  notify();
}

export function getRate(): AgentRate | null {
  return rate;
}

export function setRate(next: AgentRate | null): void {
  if (rate === next) return;
  rate = next;
  notify();
}

export const CLANKER_DRAWER_OPEN_EVENT = 'mpi-clanker-drawer-open';

let pendingDrawerOpen = false;

export function requestDrawerOpen(): void {
  pendingDrawerOpen = true;
  window.dispatchEvent(new Event(CLANKER_DRAWER_OPEN_EVENT));
}

export function consumeDrawerOpenRequest(): boolean {
  const pending = pendingDrawerOpen;
  pendingDrawerOpen = false;
  return pending;
}

export function subscribe(fn: () => void): () => void {
  subscribers.add(fn);
  return () => { subscribers.delete(fn); };
}

export function getItems(): AgentItem[] {
  return items;
}

export function pushItem(item: Omit<AgentItem, 'id'>): number {
  const id = _aid++;
  items = [...items, { ...item, id }];
  emit();
  return id;
}

export function patchItem(id: number, patch: Partial<AgentItem>): void {
  items = items.map((item) => (item.id === id ? { ...item, ...patch } : item));
  emit();
}

export function appendText(id: number, delta: string): void {
  items = items.map((item) => (item.id === id ? { ...item, text: (item.text ?? '') + delta } : item));
  emit();
}

export function dropItem(id: number): void {
  items = items.filter((item) => item.id !== id);
  emit();
}

export function clearItems(): void {
  items = [];
  storageRemove(AGENT_ITEMS_KEY);
  for (const fn of subscribers) fn();
}
