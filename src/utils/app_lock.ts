import { storageGet, storageSet, storageRemove, KEYS } from './storage.ts';

export type AppLockMethod = 'pin' | 'pattern' | 'password';

export interface AppLockConfig {
  enabled: boolean;
  method: AppLockMethod;
  hash: string;
  salt: string;
  requireAfterMs: number;
}

export const REQUIRE_AFTER_OPTIONS: { label: string; value: number }[] = [
  { label: 'Every load', value: 0 },
  { label: '5 minutes', value: 5 * 60_000 },
  { label: '15 minutes', value: 15 * 60_000 },
  { label: '30 minutes', value: 30 * 60_000 },
  { label: '1 hour', value: 60 * 60_000 },
  { label: '2 hours', value: 2 * 60 * 60_000 },
  { label: '5 hours', value: 5 * 60 * 60_000 },
  { label: '12 hours', value: 12 * 60 * 60_000 },
  { label: '24 hours', value: 24 * 60 * 60_000 },
  { label: '48 hours', value: 48 * 60 * 60_000 },
];

const MIN_LENGTH: Record<AppLockMethod, number> = {
  pin: 4,
  pattern: 4,
  password: 4,
};

export function minLength(method: AppLockMethod): number {
  return MIN_LENGTH[method];
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function digest(secret: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${secret}`);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return bytesToHex(new Uint8Array(buf));
}

function randomSalt(): string {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
}

export function getAppLockConfig(): AppLockConfig | null {
  return storageGet<AppLockConfig | null>(KEYS.APP_LOCK, null);
}

export function isAppLockEnabled(): boolean {
  return getAppLockConfig()?.enabled ?? false;
}

export async function setAppLock(method: AppLockMethod, secret: string): Promise<void> {
  const salt = randomSalt();
  const hash = await digest(secret, salt);
  const requireAfterMs = getAppLockConfig()?.requireAfterMs ?? 0;
  storageSet(KEYS.APP_LOCK, { enabled: true, method, hash, salt, requireAfterMs } satisfies AppLockConfig);
}

export function setAppLockRequireAfter(requireAfterMs: number): void {
  const config = getAppLockConfig();
  if (!config) return;
  storageSet(KEYS.APP_LOCK, { ...config, requireAfterMs } satisfies AppLockConfig);
}

export function disableAppLock(): void {
  storageRemove(KEYS.APP_LOCK);
  storageRemove(KEYS.APP_LOCK_LAST_UNLOCK);
}

export async function verifyAppLock(secret: string): Promise<boolean> {
  const config = getAppLockConfig();
  if (!config) return true;
  const attempt = await digest(secret, config.salt);
  return attempt === config.hash;
}

export function recordAppLockUnlock(): void {
  storageSet(KEYS.APP_LOCK_LAST_UNLOCK, Date.now());
}

export function shouldShowAppLock(): boolean {
  const config = getAppLockConfig();
  if (!config?.enabled) return false;
  if (config.requireAfterMs <= 0) return true;
  const lastUnlock = storageGet<number>(KEYS.APP_LOCK_LAST_UNLOCK, 0);
  return Date.now() - lastUnlock >= config.requireAfterMs;
}
