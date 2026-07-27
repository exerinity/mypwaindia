import { useSyncExternalStore } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let captured: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function store(e: BeforeInstallPromptEvent | null) {
  captured = e;
  listeners.forEach((fn) => fn());
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  store(e as BeforeInstallPromptEvent);
});
window.addEventListener('appinstalled', () => store(null));

export function isInstalled(): boolean {
  return ['standalone', 'fullscreen', 'minimal-ui'].some((mode) => window.matchMedia(`(display-mode: ${mode})`).matches)
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function useInstallPrompt() {
  const available = useSyncExternalStore(
    (fn) => { listeners.add(fn); return () => { listeners.delete(fn); }; },
    () => captured !== null,
  );

  async function trigger(): Promise<'accepted' | 'dismissed' | null> {
    const event = captured;
    if (!event) return null;
    store(null);
    await event.prompt();
    const { outcome } = await event.userChoice;
    return outcome;
  }

  return { available, trigger };
}
