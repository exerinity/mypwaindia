export type DrawerId = 'cli' | 'clanker' | 'chat';

const DRAWER_STATE_EVENT = 'mpi-drawer-state';

let openId: DrawerId | null = null;
const subscribers = new Set<() => void>();

function apply(next: DrawerId | null) {
  if (openId === next) return;
  openId = next;
  for (const fn of subscribers) fn();
}

if (typeof window !== 'undefined') {
  window.addEventListener(DRAWER_STATE_EVENT, (event) => {
    apply((event as CustomEvent<DrawerId | null>).detail ?? null);
  });
}

export function subscribeDrawers(fn: () => void): () => void {
  subscribers.add(fn);
  return () => { subscribers.delete(fn); };
}

export function getOpenDrawer(): DrawerId | null {
  return openId;
}

export function announceDrawerOpen(id: DrawerId): void {
  window.dispatchEvent(new CustomEvent<DrawerId | null>(DRAWER_STATE_EVENT, { detail: id }));
}

export function announceDrawerClosed(id: DrawerId): void {
  if (openId !== id) return;
  window.dispatchEvent(new CustomEvent<DrawerId | null>(DRAWER_STATE_EVENT, { detail: null }));
}
